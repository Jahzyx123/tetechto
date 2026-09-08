/* engine/roll.js — THE roll engine.
   One entry point replaces the legacy app's six overlapping reroll
   subsystems (Idea Engine, MORE MAGIC, MEGA BATCH, Anthem Builder,
   Genetic Lab, Quantum Lab):

       roll(state, scope, { mode, tries })

   - scope: a single atom key ("kick"), a section group ("drums"),
     or "everything".
   - mode "random"  : one seeded roll of every unlocked key in scope.
   - mode "max"     : roll the scope N times, score each candidate with
     scorePrompt(), keep the best (never worse than where you started).

   Locks are always respected; genre-affecting scopes trigger the
   style-fit auto-curation exactly like the legacy engine did. */
import { ROLL_FN, GROUPS, HIDE_BEATS_KEYS } from "./state.js";
import { newSeed, setSeed, random } from "./prng.js";
import { scorePrompt } from "./prompt.js";
import { styleFitCards, ELECTRONIC_LEAN_CARDS, FIT_GROUPS, SOUND_LITE_CARDS, SOUND_LITE_LAYERS_KEEP, HIDE_BEATS_CARDS, HIDE_BEATS_LAYERS_KEEP } from "./world.js";
import { LAYERS } from "../data/safety.js";

export function resolveScope(scope) {
  if (scope === "everything" || scope === "power") return Object.keys(ROLL_FN).slice();
  if (GROUPS[scope]) return GROUPS[scope].slice();
  if (ROLL_FN[scope]) return [scope];
  throw new Error("Unknown roll scope: " + scope);
}

/* scopes that change the genre and therefore re-trigger style-fit */
const GENRE_SCOPES = new Set(["genre", "primary", "secondary", "everything", "power"]);

export function rollKeys(state, keys) {
  for (const k of keys) { if (!state.locks[k]) ROLL_FN[k](state); }
}

function rollOnce(state, scope, keys) {
  state.seed = newSeed();
  setSeed(state.seed);
  rollKeys(state, keys);
  if (GENRE_SCOPES.has(scope)) {
    autoFitSounds(state, { reRoll: scope !== "everything" && scope !== "power" });
  }
  return state;
}

export function roll(state, scope, opts = {}) {
  const mode = opts.mode || "random";
  const keys = resolveScope(scope);
  if (mode === "max") return rollMax(state, scope, keys, opts);
  rollOnce(state, scope, keys);
  return { state, score: scorePrompt(state).total, improved: true, tries: 1 };
}

/* Keys MAX must never touch: the style identity you already chose.
   Clicking MAX optimises the production around your genre, it does not
   swap the genre out from under you. */
const IDENTITY_KEYS = ["primary", "secondary", "genre"];

/* maximize-score-over-N-tries.

   Two behaviours the plain hill-climb didn't have:
   1. Primary/secondary style are pinned for the duration (IDENTITY_KEYS).
   2. Re-clicking MAX when you're already at the ceiling doesn't sit still:
      candidates that TIE the current best are collected, and one that
      differs from the current state is adopted. So every click gives you
      another equally-max-scoring variation instead of a dead button. */
function rollMax(state, scope, keys, opts) {
  const tries = opts.tries || 24;
  const keepStyle = opts.keepStyle !== false;
  const rollable = keepStyle ? keys.filter(k => !IDENTITY_KEYS.includes(k)) : keys.slice();
  const startScore = scorePrompt(state).total;
  const startSig = signature(state);

  /* Every candidate is a full reroll of everything in scope except the
     style identity. We keep the best; if nothing beats the current score
     we still adopt the best EQUAL-scoring candidate that differs from what
     you have. MAX therefore always gives you a new set — it just never
     gives you a worse one. */
  let best = null, bestScore = -Infinity;
  const ties = [];
  /* Every candidate that is not WORSE than the current set is kept as the
     freshness pool. Repeated clicks at the scoring ceiling then still hand
     back a new set (an exact-score-match pool was too thin once scoring
     became fine-grained, leaving MAX dead on ~40% of repeat clicks). */
  const equals = [];
  for (let i = 0; i < tries; i++) {
    const cand = clone(state);
    rollOnce(cand, keepStyle ? "sounds" : scope, rollable);
    const sc = scorePrompt(cand).total;
    if (signature(cand) === startSig) continue;          // identical set, useless
    if (sc === startScore) equals.push(cand);  // freshness pool: equal, not worse
    if (sc > bestScore) { best = cand; bestScore = sc; ties.length = 0; ties.push(cand); }
    else if (sc === bestScore) ties.push(cand);
  }

  /* MAX must never hand back a worse prompt. Freshness at the ceiling is
     already covered by the tie pool below (equal-scoring candidates that
     differ from the current set), so no downgrade tolerance is needed.
     This used to be 2, which let a click cost you up to 2 points. */
  let improved = false, variation = false, converged = false;
  if (best && bestScore > startScore) {
    /* a genuine improvement: pick randomly among the equally-best so
       repeat clicks at the same score still vary */
    const winner = ties.length ? ties[Math.floor(random() * ties.length)] : best;
    improved = true;
    for (const k of Object.keys(winner)) state[k] = winner[k];
  } else if (equals.length) {
    /* nothing beat the current set, but something equalled it: adopt a
       fresh equal-scoring variation. Never worse, never a dead click. */
    const winner = equals[Math.floor(random() * equals.length)];
    variation = true;
    bestScore = startScore;
    for (const k of Object.keys(winner)) state[k] = winner[k];
  } else {
    /* Every candidate scored strictly worse, so the current set stands.
       This is real convergence, not a dead button: MAX has hill-climbed to
       a local optimum and the honest answer is "can't do better". The UI
       surfaces it rather than pretending something changed. (The previous
       code faked freshness by accepting a downgrade of up to 2 points.) */
    bestScore = startScore;
    converged = true;
  }
  setSeed(state.seed);
  return {
    state,
    score: improved || variation ? bestScore : startScore,
    tries, improved, variation, converged,
    changed: improved || variation
  };
}

function clone(s) { return JSON.parse(JSON.stringify(s)); }
/* cheap identity of a rolled set, used to detect "actually different" */
function signature(s) {
  let out = "";
  for (const k of Object.keys(ROLL_FN)) {
    const v = s[k];
    out += typeof v === "string" || typeof v === "number" ? "|" + v : "";
  }
  return out + "|" + s.bpm + "|" + s.rootPc + "|" + s.scaleId;
}

/* ---------------------------- STYLE-FIT (no-techno auto-curation) ----------------------------
   Ported from the legacy engine. When a no-techno style is rolled, sound
   cards whose content only makes sense for electronic/techno productions
   are auto-hidden, and (on a genre-world change) the remaining fitting
   sound groups are re-rolled so the sounds match the new genre. Locks
   are always respected; the whole behaviour is gated by state.styleFit. */
export function autoFitSounds(state, opts) {
  opts = opts || {};
  const reRoll = opts.reRoll !== false;
  if (state.techOnly || !state.styleFit) return { hid: 0, restored: 0, rolled: false, skipped: true };
  const genre = state.primaryGenre || state.primaryStyle || "this style";
  const toHide = styleFitCards(state);
  const worldChanged = genre !== state.lastFitGenre;
  let hid = 0, restored = 0;
  if (worldChanged) {
    /* genre world changed — reconcile the electronic-lean cards to exactly
       what fits now, so going Jazz → House brings the techno cards back.
       Cards parked by SOUND-LITE / NO-STOP are exempt: those toggles win
       over style-fit so a genre roll can't silently resurrect the FX
       sections. */
    ELECTRONIC_LEAN_CARDS.forEach(c => {
      const forced = (state.soundLite || state.noStop || state.hideBeats) && SOUND_LITE_CARDS.includes(c);
      const shouldHide = toHide.includes(c) || forced;
      if (shouldHide) { if (!state.hidden[c]) { state.hidden[c] = true; hid++; } }
      else if (state.hidden[c]) { state.hidden[c] = false; restored++; }
    });
    /* HIDE-BEATS also keeps the beat cards parked across genre rolls. */
    if (state.hideBeats) HIDE_BEATS_CARDS.forEach(c => { if (!state.hidden[c]) { state.hidden[c] = true; hid++; } });
  } else {
    toHide.forEach(c => { if (!state.hidden[c]) { state.hidden[c] = true; hid++; } });
    if (state.soundLite || state.noStop) SOUND_LITE_CARDS.forEach(c => { if (!state.hidden[c]) { state.hidden[c] = true; hid++; } });
    if (state.hideBeats) HIDE_BEATS_CARDS.forEach(c => { if (!state.hidden[c]) { state.hidden[c] = true; hid++; } });
  }
  let rolled = false;
  if (reRoll && worldChanged) {
    FIT_GROUPS.forEach(pair => {
      const g = pair[0], card = pair[1];
      if (!state.hidden[card]) rollKeys(state, GROUPS[g]);
    });
    rolled = true;
  }
  state.lastFitGenre = genre;
  return { hid, restored, rolled, skipped: false };
}

export function unhideAllSoundCards(state, SOUND_CARDS) {
  let n = 0;
  SOUND_CARDS.forEach(c => { if (state.hidden[c]) { state.hidden[c] = false; n++; } });
  return n;
}

/* ---------------------------- SOUND-LITE ----------------------------
   One-click "style-first" prompt: hide the sections that describe the
   sound rather than the music (sound design / FX / mix / spatial /
   ensemble), and switch off the Detail-layer chips that do the same
   ("ping-pong delay feedback" …). Melody, bass, drums, harmony, rhythm,
   groove and arrangement cards keep rolling. The prompt deps on
   densify() to still spend every leftover character on those parked
   sound values ONLY when there is room — style content always wins. */
export function setSoundLite(state, on) {
  state.soundLite = !!on;
  let hid = 0, restored = 0;
  if (state.soundLite) {
    SOUND_LITE_CARDS.forEach(c => { if (!state.hidden[c]) { state.hidden[c] = true; hid++; } });
    if (!state.layers) state.layers = {};
    LAYERS.forEach(l => { if (!SOUND_LITE_LAYERS_KEEP.includes(l.id)) state.layers[l.id] = false; });
  } else {
    /* Restore only what is not pinned by style-fit for the current genre
       (styleFitCards is genre-based, so gate it on the toggle itself) and
       never what HIDE-BEATS / NO-STOP are parking. */
    const pinned = state.styleFit ? styleFitCards(state) : [];
    SOUND_LITE_CARDS.forEach(c => {
      if (state.hidden[c] && !pinned.includes(c) && !state.hideBeats && !state.noStop) {
        state.hidden[c] = false; restored++;
      }
    });
  }
  return { hid, restored };
}
export function soundLiteOn(state) { return !!(state && state.soundLite); }

/* ---------------------------- NO-STOP BEAT ----------------------------
   One-click "continuous beat" mode: arrangement and energy-arc content
   are rolled from no-break pools, arc/structure tags drop the breakdown,
   and every builder appends an explicit non-stop policy so Suno keeps
   the groove running. `noStop` also makes future arrangement rolls stay
   no-stop until the toggle is cleared.

   Appearance hygiene: while NO-STOP is on the sound-appearance sections
   (Ensemble / Tone / Mix / Space / Texture / FX) are parked like
   SOUND-LITE does, the counter & second lines — the "counter-bass" — are
   hidden, and every rolled pool value carrying an appearance cue
   (half-time, lazy, samba rolls, ocean-drum swells, broken beat, fills,
   open-ride, drops, risers, edits…) is filtered at roll time. */
const NO_STOP_PARK_CARDS = SOUND_LITE_CARDS;
export function setNoStop(state, on) {
  const was = !!state.noStop;
  state.noStop = !!on;
  if (!was && on) {
    /* park the sections that produce appearance vocabulary */
    NO_STOP_PARK_CARDS.forEach(c => { if (!state.hidden[c]) state.hidden[c] = true; });
    /* hide counter / second lines immediately (roll functions also
       blank them, but the current values must go now) */
    state.counterMelody = { voice: "", direction: "", perf: "", contour: "", rhythm: "" };
    state.voiceConcept = { voice: "", movement: "" };
  } else if (was && !on) {
    /* unpark only what nothing else is pinning (sound-lite / style-fit) */
    const pinned = state.styleFit ? styleFitCards(state) : [];
    NO_STOP_PARK_CARDS.forEach(c => {
      if (state.hidden[c] && !state.soundLite && !pinned.includes(c)) state.hidden[c] = false;
    });
  }
  /* rollKeys respects locks; arrangement roll routes through ROLL_FN which
     picks the no-stop pool while state.noStop is on. The extra arc/beat
     atoms are refreshed so the new shape reads peak-to-peak and the
     intensity knob lands on ultra delivery. On the way OFF the counter
     lines are re-rolled so the second voice comes back. On the way ON the
     drum/sound pools are re-rolled through the no-stop filter so no stale
     appearance value survives. */
  state.seed = newSeed();
  setSeed(state.seed);
  const scopes = on
    ? ["arrangement", "energyCurve", "buildType", "dropType", "sectionDensity", "transitionType",
       "feel-melody", "drums", "bass", "harmony", "rhythm", "grooveMelodic",
       "soundDesign", "mixMaster", "spatialMod", "textureFx"]
    : ["arrangement", "counter-melody", "counter-relation", "voice-concept", "voice-relation"];
  const flat = [];
  for (const k of scopes) {
    if (ROLL_FN[k]) flat.push(k);
    else if (GROUPS[k]) flat.push(...GROUPS[k]);
  }
  rollKeys(state, flat);
  return state;
}

/* ---------------------------- HIDE-BEATS ----------------------------
   One-click "melody-only" prompt: park the drums & bass beats and every
   sound-appearance section, blank the counter/second lines and the
   beat/percussion detail layers, and skip every beat/sound atom at roll
   time — nothing can make a sound appear except the melody & pattern
   command text itself. Off restores whatever the other modes aren't
   pinning. */
export function setHideBeats(state, on) {
  const was = !!state.hideBeats;
  state.hideBeats = !!on;
  let hid = 0, restored = 0;
  if (!was && on) {
    HIDE_BEATS_CARDS.forEach(c => { if (!state.hidden[c]) { state.hidden[c] = true; hid++; } });
    if (!state.layers) state.layers = {};
    LAYERS.forEach(l => { if (!HIDE_BEATS_LAYERS_KEEP.includes(l.id)) state.layers[l.id] = false; });
    state.counterMelody = { voice: "", direction: "", perf: "", contour: "", rhythm: "" };
    state.voiceConcept = { voice: "", movement: "" };
  } else if (was && !on) {
    const pinnedLite = state.soundLite || state.noStop;
    const pinned = state.styleFit ? styleFitCards(state) : [];
    HIDE_BEATS_CARDS.forEach(c => {
      if (state.hidden[c] && !pinnedLite && !pinned.includes(c)) { state.hidden[c] = false; restored++; }
    });
  }
  /* Blank every beat / sound atom immediately (the UI cards go clean and
     nothing can dodge the packer), then re-roll the melody pattern atoms
     so the prompt is filled with command text. */
  HIDE_BEATS_KEYS.forEach(k => { if (typeof state[k] === "string") state[k] = ""; });
  state.counterMelody = { voice: "", direction: "", perf: "", contour: "", rhythm: "" };
  state.voiceConcept = { voice: "", movement: "" };
  state.seed = newSeed();
  setSeed(state.seed);
  const scopeFlat = [];
  if (on) for (const g of ["feel-melody", "harmony", "rhythm"]) scopeFlat.push(...GROUPS[g]);
  rollKeys(state, scopeFlat);
  return { hid, restored };
}
export function noStopOn(state) { return !!(state && state.noStop); }
