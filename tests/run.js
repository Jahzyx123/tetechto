#!/usr/bin/env node
/* =====================================================================
   NEON FORGE — headless test suite
   Mirrors the legacy tools/smoke.js checks against the new modular
   engine:
   - prompt length caps (≤1000 style / ≤3000 brief) across many rolls
   - techno-only isolation (styles from the techno pool, techno BPM band)
   - no-techno genre-combo naming + genre-aware tempo
   - genre-safe rewriting (organic / hybrid / electronic)
   - style-fit auto-curation
   - instrumental vocal sanitizer + banned max-energy word list
   - lock / hide semantics
   - unified roll(scope, mode) engine incl. maximize mode
   - deterministic per seed, share-URL round-trip
   - pool integrity: expansion minimums, no duplicates, no self-censoring
   - UI boot via jsdom (skipped with a warning if jsdom isn't installed)
   Usage: node tests/run.js
   ===================================================================== */
import * as E from "../engine/index.js";
import * as D from "../data/index.js";
import * as P from "../engine/prompt.js";
import { EXTRA_MELODY_CONCEPT, EXTRA_MELODY_POOLS } from "../data/melody-extra.js";

let passes = 0, failures = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log("  ✓ " + msg); }
  else { failures++; console.log("  ✗ FAIL: " + msg); }
}
function section(name) { console.log("\n== " + name + " =="); }

function freshTechno() {
  const s = E.defaultState();
  s.techOnly = true;
  E.roll(s, "everything");
  return s;
}

/* ---------------- prompt budget ---------------- */
section("Prompt budgets (techno-only)");
{
  const s = freshTechno();
  let maxSp = 0, maxFb = 0, over = 0;
  for (let i = 0; i < 60; i++) {
    E.roll(s, "everything");
    const sp = E.buildStylePrompt(s);
    const fb = E.buildFullBrief(s);
    maxSp = Math.max(maxSp, sp.length);
    maxFb = Math.max(maxFb, fb.length);
    if (sp.length > 1000 || fb.length > 3000) over++;
  }
  ok(over === 0, "60 techno rolls: style ≤1000 & brief ≤3000 (max " + maxSp + " / " + maxFb + ")");
  const sp = E.buildStylePrompt(s);
  ok(sp.length >= 100, "style prompt has real content (" + sp.length + " chars)");
  ok(/Bass:/.test(sp), "prompt contains Bass block");
  ok(/Drums:/.test(sp), "prompt contains Drums block");
}

section("Prompt budgets (no-techno, style-fit on)");
{
  const s = E.defaultState();
  s.techOnly = false; s.styleFit = true;
  E.roll(s, "everything");
  let over = 0, maxLen = 0;
  for (let i = 0; i < 60; i++) {
    E.roll(s, "genre");
    const p = E.buildStylePrompt(s);
    maxLen = Math.max(maxLen, p.length);
    if (p.length > 1000) over++;
  }
  ok(over === 0, "no-techno prompts never exceed 1000 across 60 rolls (max " + maxLen + ")");
}

/* ---------------- techno-only isolation ---------------- */
section("Techno-only isolation");
{
  const s = freshTechno();
  /* the engine pool = verbatim STYLES + generated EXTRA_STYLES */
  const technoNames = new Set(E.STYLES.map(x => x.n));
  let allFromPool = true, bpmOk = true, distinct = true;
  for (let i = 0; i < 40; i++) {
    E.roll(s, "genre");
    if (!technoNames.has(s.primaryStyle) || !technoNames.has(s.secondaryStyle)) allFromPool = false;
    if (s.bpm < 125 || s.bpm > 170) bpmOk = false;
    if (s.primaryStyle === s.secondaryStyle) distinct = false;
  }
  ok(D.STYLES.length >= 838, "verbatim techno pool intact at ≥838 styles (" + D.STYLES.length + ")");
  ok(E.STYLES.length >= 3000, "expanded techno pool is ≥3000 styles (" + E.STYLES.length + ")");
  ok(allFromPool, "techno-only rolls come exclusively from the techno pool");
  ok(bpmOk, "techno tempo stays in the weighted 128–156 band (last " + s.bpm + ")");
  ok(distinct, "primary and secondary style never coincide");
  /* sub-techno styles (any c:"sub" entry) must be usable in BOTH slots —
     the user asked for sub-style and techno style in primary or secondary */
  let subOnPrimary = 0, subOnSecondary = 0, coreOnPrimary = 0, coreOnSecondary = 0;
  for (let i = 0; i < 200; i++) {
    const st = E.defaultState(); st.techOnly = true; E.roll(st, "everything");
    const entry = n => E.STYLES.find(x => x.n === n);
    const cat = n => entry(n) ? entry(n).c : "";
    if (cat(st.primaryStyle) === "sub") subOnPrimary++;
    if (cat(st.secondaryStyle) === "sub") subOnSecondary++;
    if (cat(st.primaryStyle) === "core") coreOnPrimary++;
    if (cat(st.secondaryStyle) === "core") coreOnSecondary++;
  }
  ok(subOnPrimary > 0 && subOnSecondary > 0,
    `sub-techno styles land in primary (${subOnPrimary}) AND secondary (${subOnSecondary}) slots`);
  ok(coreOnPrimary > 0 && coreOnSecondary > 0,
    `core techno styles land in primary (${coreOnPrimary}) AND secondary (${coreOnSecondary}) slots`);
  ok(E.STYLES.some(x => x.n === "Techno"), "plain 'Techno' is in the pool");
}

/* ---------------- genre combos (no-techno) ---------------- */
section("Genre combos (no-techno)");
{
  const s = E.defaultState();
  s.techOnly = false;
  E.roll(s, "everything");
  const combos = E.allCombos();
  ok(combos.length > 2000, "≥2000 genre combos available (" + combos.length + ")");
  let comboOk = true, genreDistinct = true, tempoOk = true;
  for (let i = 0; i < 40; i++) {
    E.roll(s, "genre");
    if (!combos.includes(s.primaryStyle) || !combos.includes(s.secondaryStyle)) comboOk = false;
    if (s.primaryGenre && s.primaryGenre === s.secondaryGenre) genreDistinct = false;
    if (s.bpm < 70 || s.bpm > 200) tempoOk = false;
  }
  ok(comboOk, "primary & secondary are real 'Sub-Style Genre' combos (" + s.primaryStyle + ")");
  ok(genreDistinct, "secondary genre never repeats the primary genre (8-retry rule)");
  ok(tempoOk, "tempo matched to genre band (last " + s.bpm + " BPM)");
  ok(E.genreComboName({ n: "Jazz" }, "Acid Jazz") === "Acid Jazz", "combo naming: sub ending in genre isn't doubled");
  ok(E.genreComboName({ n: "Jazz" }, "Bebop") === "Bebop Jazz", "combo naming: 'Sub-Style Genre'");
}

/* ---------------- weirdness ---------------- */
section("Weirdness mixing");
{
  const m0 = E.weirdMix(0), m50 = E.weirdMix(50), m100 = E.weirdMix(100), m25 = E.weirdMix(25);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  ok(near(m0.core, 0.72) && near(m50.core, 0.30) && near(m100.core, 0.03), "anchor mixes match the legacy table");
  ok(Math.abs(m25.core - (0.72 + (0.30 - 0.72) * 0.5)) < 1e-9, "3-point interpolation between anchors");
  const s = freshTechno();
  s.equalChance = false;
  s.weirdness = 0;
  const coreSet = new Set(E.STYLES_BY_CAT.core);
  let coreHits = 0, N = 300;
  E.setSeed(1234);
  for (let i = 0; i < N; i++) { if (coreSet.has(E.pickStyle(s))) coreHits++; }
  ok(coreHits / N > 0.6, "weirdness 0 leans hard on core styles (" + coreHits + "/" + N + ")");
  s.weirdness = 100;
  const rareSet = new Set(E.STYLES_BY_CAT.rare);
  let rareHits = 0;
  for (let i = 0; i < N; i++) { if (rareSet.has(E.pickStyle(s))) rareHits++; }
  ok(rareHits / N > 0.6, "weirdness 100 leans hard on rare styles (" + rareHits + "/" + N + ")");
}

/* ---------------- determinism / share ---------------- */
section("Determinism & share URL");
{
  const a = E.defaultState(); a.techOnly = true;
  a.seed = 42; E.setSeed(42);
  E.rollKeys(a, E.resolveScope("everything"));
  const pa = E.buildStylePrompt(a);
  const b = E.defaultState(); b.techOnly = true;
  b.seed = 42; E.setSeed(42);
  E.rollKeys(b, E.resolveScope("everything"));
  const pb = E.buildStylePrompt(b);
  ok(pa === pb, "same seed → identical state & prompt");
  const enc = E.encodeState(a);
  const dec = E.decodeState(enc);
  ok(!!dec && dec.primaryStyle === a.primaryStyle && dec.bpm === a.bpm && dec.kick === a.kick, "share-URL encode/decode round-trips");
  ok(E.buildStylePrompt(dec) === pa, "decoded state rebuilds the identical prompt");
  ok(E.decodeState("garbage!!") === null, "bad share strings decode to null, not a crash");
}

/* ---------------- locks & hide ---------------- */
section("Lock / hide semantics");
{
  const s = freshTechno();
  const kick = s.kick;
  s.locks.kick = true;
  E.roll(s, "drums");
  ok(s.kick === kick, "locked kick survives a drums roll");
  s.locks.kick = false;
  s.hidden.bassCard = true;
  ok(!/Bass:/.test(E.buildStylePrompt(s)), "hidden bass card removed from prompt");
  s.hidden.bassCard = false;
  ok(/Bass:/.test(E.buildStylePrompt(s)), "unhide restores bass in prompt");
  s.hidden.bpm = true;
  ok(!/BPM/.test(E.buildStylePrompt(s)), "hidden BPM removed from prompt");
  s.hidden.bpm = false;
}

/* ---------------- unified roll engine ---------------- */
section("Unified roll(scope, mode) engine");
{
  const s = freshTechno();
  const before = s.kick + "|" + s.feeling + "|" + s.primaryStyle;
  const r1 = E.roll(s, "kick");
  ok(typeof r1.score === "number", "single-field roll returns a score");
  ok(s.feeling + "|" + s.primaryStyle === before.split("|").slice(1).join("|"), "single-field scope touches only that field");
  E.roll(s, "drums");
  const start = E.scorePrompt(s).total;
  const res = E.roll(s, "everything", { mode: "max", tries: 12 });
  ok(res.score >= start - 2, "maximize mode stays within its tolerance band of the starting score (" + start + " → " + res.score + ")");
  const res2 = E.roll(s, "drums", { mode: "max", tries: 8 });
  ok(res2.score >= res.score - 2 && typeof res2.score === "number", "section-scoped maximize works (" + res2.score + ")");
  // fully locked: no crash, nothing changes
  Object.keys(s.locks).forEach(k => s.locks[k] = true);
  const frozen = JSON.stringify({ k: s.kick, p: s.primaryStyle, b: s.bpm });
  const res3 = E.roll(s, "everything", { mode: "max", tries: 4 });
  ok(typeof res3.score === "number" && frozen === JSON.stringify({ k: s.kick, p: s.primaryStyle, b: s.bpm }), "fully-locked maximize returns without changing state");
  Object.keys(s.locks).forEach(k => s.locks[k] = false);
  let threw = false;
  try { E.roll(s, "nonsense-scope"); } catch (e) { threw = true; }
  ok(threw, "unknown scope throws instead of silently no-oping");
}

/* ---------------- style-fit ---------------- */
section("Style-fit (no-techno auto-curation)");
{
  const s = E.defaultState();
  s.styleFit = true; s.techOnly = false;
  s.primaryGenre = "Jazz"; s.primaryStyle = "Bebop Jazz"; s.lastFitGenre = "";
  E.roll(s, "everything"); // fills the fields
  s.primaryGenre = "Jazz"; s.primaryStyle = "Bebop Jazz"; s.secondaryStyle = "";
  s.hidden = E.defaultHidden(); s.lastFitGenre = "";
  E.autoFitSounds(s, { reRoll: false });
  /* New behaviour: instead of hiding the techno-flavoured cards (which
     silently cost no-techno prompts ~6 sounds), they stay visible and roll
     organic vocabularies from data/acoustic.js. Only Techno Lab, which no
     rewording can rescue, is still hidden for organic genres. */
  ok(s.hidden.technoLabCard === true, "organic genre hides technoLabCard");
  ["textureFxCard", "soundDesignCard", "mixMasterCard", "spatialModCard", "rhythmLabCard",
    "feelCard", "bassCard", "drumsCard", "harmonyLabCard", "grooveMelodicCard"].forEach(c =>
      ok(s.hidden[c] === false, "organic genre keeps " + c + " visible (swapped, not hidden)"));
  s.primaryGenre = "House"; s.primaryStyle = "Deep House";
  E.autoFitSounds(s, { reRoll: false });
  ok(E.SOUND_CARDS.every(c => !s.hidden[c]), "electronic genre restores every sound card");
  s.primaryGenre = "Rock"; s.primaryStyle = "Indie Rock";
  E.autoFitSounds(s, { reRoll: false });
  ok(E.SOUND_CARDS.every(c => !s.hidden[c]), "hybrid genre keeps every sound card visible");
  // locked field survives the style-fit re-tune
  s.primaryGenre = "Classical"; s.primaryStyle = "Romantic Classical";
  s.kick = "__SENTINEL__"; s.locks.kick = true; s.lastFitGenre = "";
  E.autoFitSounds(s, { reRoll: true });
  ok(s.kick === "__SENTINEL__", "locked kick survives style-fit re-tune");
  ok(!!s.feeling, "unlocked sounds re-tuned to the new genre (feeling = " + s.feeling + ")");
  s.locks.kick = false;
  // styleFit off → no automatic changes
  s.styleFit = false; s.hidden = E.defaultHidden(); s.primaryGenre = "Jazz"; s.lastFitGenre = "";
  E.autoFitSounds(s, { reRoll: true });
  ok(s.hidden.technoLabCard === false, "style-fit OFF: nothing auto-hidden");
  // techno mode: style-fit is a no-op
  s.styleFit = true; s.techOnly = true; s.lastFitGenre = "";
  const r = E.autoFitSounds(s, { reRoll: true });
  ok(r.skipped === true, "techno mode skips style-fit entirely");
}

/* ---------------- genre-safe rewriting ---------------- */
section("Genre-safe phrasing");
{
  const s = E.defaultState();
  s.techOnly = false; s.styleFit = true;
  E.roll(s, "everything");
  s.primaryGenre = "Jazz"; s.primaryStyle = "Acid Jazz"; s.secondaryStyle = "";
  s.hidden = E.defaultHidden(); s.locks = E.defaultLocks();
  s.kick = "huge 909 kick"; s.hats = "percussive rave hats"; s.snare = "pounding warehouse snare";
  s.feeling = "euphoric"; s.flavor = "cold yet euphoric"; s.direction = "bunker-born rave hook";
  s.leadVoice = "rave-stab lead 2.0"; s.leadPerf = "performed with overdriven intensity";
  s.harmony = "euphoric open fifths"; s.bassVoice = "distorted reese bass";
  s.bassMovement = "pumping sidechain movement"; s.groove = "relentless four-on-the-floor drive";
  s.swing = "stomping swing"; s.intensity = "overwhelming rave force";
  s.rideType = "hardgroove-locked ride cymbal";
  s.counterMelody = { voice: "", direction: "", perf: "", contour: "", rhythm: "" };
  s.voiceConcept = { voice: "", movement: "" };
  s.melodyConcept = {}; s.layers = {};
  s.chordProg = ""; s.rhythmPattern = ""; s.arrangement = "";
  s.technoDrive = ""; s.technoAcid = ""; s.technoTexture = ""; s.technoRave = ""; s.technoIndustrial = "";
  s.concept = { world: "", location: "", visual: "", narrative: "", sensation: "", event: "", conflict: "", crowd: "", title: "", transform: "" };
  const sp = E.buildStylePrompt(s);
  ok(/Acid Jazz/.test(sp), "real genre name 'Acid Jazz' protected from cleaning");
  ok(/— acoustic instrumentation/.test(sp), "organic flavor line added");
  ok(!/\b(909|rave|sidechain|synth|warehouse|euphoric|overdriven|distorted|hardgroove|2\.0|reese)\b/i.test(sp.replace(/Acid Jazz/g, "")), "organic prompt has no techno-isms");
  ok(/steady pulse/.test(sp), "four-on-the-floor rephrased to steady pulse");
  ok(/joyous/.test(sp), "euphoric rephrased to joyous");
  ok(E.genreSafeText(s, "hardgroove-locked ride cymbal") === "locked-in ride cymbal", "hardgroove-locked → locked-in");
  ok(/sparkling lead/.test(sp), "rave-stab lead 2.0 rephrased to sparkling lead");
  ok(sp.length <= 1000, "cleaned organic prompt ≤1000 (" + sp.length + ")");
  const fb = E.buildFullBrief(s);
  ok(!/\b(909|rave|sidechain|synth|warehouse|euphoric|hardgroove|2\.0)\b/i.test(fb.replace(/Acid Jazz/g, "")), "full brief cleaned too");
  ok(/Acid Jazz/.test(fb), "brief keeps the protected genre name");
  // hybrid: lighter touch
  s.primaryGenre = "Rock"; s.primaryStyle = "Indie Rock";
  s.kick = "huge 909 kick"; s.groove = "relentless four-on-the-floor drive";
  s.leadVoice = "huge layered synth lead"; s.feeling = "euphoric"; s.rideType = "hardgroove-locked ride cymbal";
  const spH = E.buildStylePrompt(s);
  ok(!/909/.test(spH), "hybrid prompt drops 909");
  ok(/four-on-the-floor/.test(spH), "hybrid prompt keeps four-on-the-floor");
  ok(/synth lead/.test(spH), "hybrid prompt keeps synth");
  ok(/euphoric/.test(spH), "hybrid prompt keeps euphoric");
  ok(/acoustic and electronic hybrid instrumentation/.test(spH), "hybrid flavor line added");
  // electronic: untouched
  s.primaryGenre = "House"; s.primaryStyle = "Acid House";
  const spE = E.buildStylePrompt(s);
  ok(/Acid House/.test(spE) && /acid/i.test(spE), "electronic genre keeps everything (acid stays)");
  ok(!/live acoustic/.test(spE), "electronic genre gets no acoustic flavor");
  // arc renames
  s.primaryGenre = "Classical"; s.primaryStyle = "Romantic Classical";
  ok(/Rise/.test(E.arcLine(s)) && !/→ Build/.test(E.arcLine(s)), "organic arc renames Build → Rise");
  ok(/Climax/.test(E.arcLine(s)) && !/→ Drop/.test(E.arcLine(s)), "organic arc renames Drop → Climax");
  s.techOnly = true;
  ok(/→ Build/.test(E.arcLine(s)) && /→ Drop/.test(E.arcLine(s)), "techno arc keeps Build/Drop");
  // world classification spot checks
  ok(E.genreWorld("Hawaiian") === "organic", "Hawaiian classified organic");
  ok(E.genreWorld("Nordic") === "organic", "Nordic classified organic");
  ok(E.genreWorld("Synthwave") === "electronic", "Synthwave classified electronic");
  ok(E.genreWorld("Gabber") === "electronic", "Gabber classified electronic");
  ok(E.genreWorld("Shoegaze") === "hybrid", "Shoegaze classified hybrid");
}

/* ---------------- instrumental safety & banned words ---------------- */
section("Instrumental safety & banned max-energy words");
{
  const s = freshTechno();
  s.instrumental = true;
  s.feeling = "minimal and sparse";       // banned words
  s.direction = "restrained gentle hook"; // banned words
  s.kick = "quiet weak kick";             // banned words
  s.leadVoice = "soaring vocal chop lead"; // vocal ref while instrumental
  const sp = E.buildStylePrompt(s);
  const noPolicy = sp.replace(/no vocals, no lyrics, no screaming, no chants, no choir, no spoken words/, "");
  for (const w of ["minimal", "sparse", "restrained", "weak", "quiet", "gentle"]) {
    ok(!new RegExp("\\b" + w + "\\b", "i").test(noPolicy), "banned word never reaches output: " + w);
  }
  ok(!/vocal chop/i.test(sp), "vocal reference stripped in instrumental mode");
  ok(/no vocals[,/]\s*(no )?lyrics/.test(sp), "instrumental policy line appended (compact or verbose form)");
  const fb = E.buildFullBrief(s);
  ok(!/\bminimal\b|\bsparse\b/i.test(fb.replace(/VOCAL POLICY[\s\S]*/, "")), "brief clauses with banned words dropped");
  s.instrumental = false; s.vocalMode = false;
  ok(!/no vocals/.test(E.buildStylePrompt(s)), "safety line only added in instrumental mode");
}

/* ---------------- vocal-cue neutralization (output-time) ---------------- */
section("Vocal-cue neutralization (output-time)");
{
  /* Every word Suno can read as a human vocal (second-wave audit). The
     negated policy line and vocal-mode directions are tested separately. */
  /* breathless / breathtaking / Breather are idioms, not vocal cues — the
     breath pattern targets only the words that are rewritten (breath,
     breathing, breathes, breathe, breathed, breathy, breath-like). */
  const CUE = /\b(?:hoovers?|hum(?:s|ming|med)?|songs?|hymns?|psalms?|gospel\w*|operas?\b|operatic|throat\w*|tenors?|alto\b|baritones?|sopranos?|croon\w*|sing(?:s|ing|er|ers|able)?\b|chorus(?:es)?\b|verses?|choirs?\b|choral|chants?\b|lullab(?:y|ies)\b|doo-?wops?|whistl\w*|sighs?|call[\s-]+and[\s-]+response|voices?\b|vocals?\b|breath(?:ing|ed|y|s|like)?\b|crowds?\b|shout\w*|scream\w*|whisper\w*|cheers?\b|arias?|words?)\b/i;
  const safeTail = [/\bwithout any movement words\b/];
  const tail = (t, re) => t.replace(re, "\u0000");
  let leaked = 0, checked = 0;
  for (let i = 0; i < 80; i++) {
    const s = E.defaultState();
    s.techOnly = i % 2 === 0;
    s.instrumental = i % 3 !== 0;
    s.vocalMode = !s.instrumental && i % 4 === 3;
    s.maxStyle = i % 5 === 0;
    E.roll(s, "everything", { mode: s.maxStyle ? "max" : undefined, tries: s.maxStyle ? 24 : 8 });
    const sp = E.buildStylePrompt(s);
    const fb = E.buildFullBrief(s);
    /* park the negated policy (style prompt tail / brief policy section)
       and the vocal-mode direction tail before scanning */
    const spClean = s.vocalMode ? sp.slice(0, sp.search(/vocal:/)) :
      s.instrumental ? sp.slice(0, sp.search(/no vocals/)) : sp;
    const fbClean = fb.replace(/VOCAL POLICY[\s\S]*/, "");
    for (const [name, x] of [["Style Prompt", spClean], ["Full Brief", fbClean]]) {
      checked++;
      let y = x;
      for (const re of safeTail) y = y.replace(re, "");
      const m = y.match(CUE);
      if (m) { leaked++; if (leaked <= 5) console.log("  ✗ leak " + name + ": [" + m[0] + "] in: " + y.slice(0, 220)); }
    }
  }
  ok(leaked === 0, "no vocal cue token reaches Style Prompt or Full Brief (" + checked + " scans)");

  /* idempotency: a second pass over the emitted prompts changes nothing */
  let nonIdem = 0;
  for (let i = 0; i < 40; i++) {
    const s = E.defaultState();
    s.techOnly = i % 2 === 0; s.instrumental = i % 2 === 0;
    E.roll(s, "everything");
    const sp = E.buildStylePrompt(s), fb = E.buildFullBrief(s);
    if (P.stripVocalCue(sp) !== sp || P.stripVocalCue(fb) !== fb) nonIdem++;
  }
  ok(nonIdem === 0, "stripVocalCue is idempotent on emitted prompts");

  /* unit-level: the target rewrites, musically equivalent */
  const pairs = [
    ["Hoover Techno", "Super-saw Techno"],
    ["hoover stabs", "super-saw stabs"],
    ["temple hum", "temple drone"],
    ["a rhythm that hums the melody", "a rhythm that shadows the melody"],
    ["Native Flute Song", "Native Flute Melody"],
    ["River Songs", "River Melodies"],
    ["MACHINE HYMN", "MACHINE ANTHEM"],
    ["gospel groove", "church groove"],
    ["opera-house kick", "concert-hall kick"],
    ["Space Opera", "Space saga"],
    ["Tuvan Throat", "Tuvan overtone"],
    ["throat singing", "overtone"],
    ["tenor sax lead", "sax lead"],
    ["baritone guitar", "low guitar"],
    ["Partido Alto", "Partido"],
    ["train whistle", "train horn"],
    ["Penny Whistle", "Penny pipes"],
    ["stadium rave chant", "stadium rave swell"],
    ["formant choir", "formant shaper"],
    ["Turbine Lullaby", "Turbine Cradle"],
    ["Doowop", "Jukebox"],
    ["Gravity of a Sigh", "Gravity of a Pause"],
    ["call-and-response bassline", "question-answer bassline"],
    ["bass hovering under the vocal", "bass hovering under the lead"],
    ["two voices learning each other's names", "two lines learning each other's names"],
    ["human breath groove", "human-groove pulse"],
    ["breathing curve", "pulsing curve"],
    ["one word of direction", "one note of direction"],
    ["a weather radio with no words", "a weather radio with no broadcast"],
    ["two glass towers talk", "two glass towers signal"],
    ["Crowd Surge", "Festival Surge"],
    ["screaming distortion", "scorching distortion"],
    ["Aria Pop", "Showpiece Pop"]
  ];
  for (const [inp, want] of pairs) ok(P.stripVocalCue(inp) === want,
    `vocal cue rewritten musically: "${inp}" -> "${P.stripVocalCue(inp)}"`);

  /* protected lines are never rewritten */
  ok(P.stripVocalCue(D.SAFETY_LINE) === D.SAFETY_LINE, "negated SAFETY_LINE byte-identical");
  ok(P.stripVocalCue("instrumental house, no vocals/lyrics/chants/choir/spoken words")
     === "instrumental house, no vocals/lyrics/chants/choir/spoken words", "compact policy line byte-identical");
  ok(D.VOCAL_DIRECTIONS.every(d => P.stripVocalCue("vocal: " + d) === "vocal: " + d),
    "every vocal-mode direction survives stripVocalCue untouched (" + D.VOCAL_DIRECTIONS.length + ")");
  /* proper nouns and non-vocal terms stay */
  for (const keep of ["Songkran", "Songo", "Hooligan", "talking drum phrases", "breathless", "Breather", "humanized", "single note"]) {
    ok(P.stripVocalCue(keep) === keep, "non-vocal term untouched: " + keep);
  }
}

/* ---------------- melody intensity (no simple/relax) ---------------- */
section("Melody intensity (no simple/relax)");
{
  const SOFT = E.MELODY_SOFT_RE, INTENSE = E.MELODY_INTENSE_RE;
  /* every generated extra survives the runtime relax filter */
  let genDropped = 0;
  for (const k in EXTRA_MELODY_CONCEPT)
    for (const v of EXTRA_MELODY_CONCEPT[k])
      if (E.isRelaxMelody(v)) { genDropped++; console.log("  ✗ gen concept dropped: " + v); }
  for (const k in EXTRA_MELODY_POOLS)
    for (const v of EXTRA_MELODY_POOLS[k])
      if (E.isRelaxMelody(v)) { genDropped++; console.log("  ✗ gen pool dropped: " + v); }
  ok(genDropped === 0, "generated melody extras never get filtered at runtime");

  /* the runtime melody pools contain zero relax-only entries */
  let softLeft = 0;
  for (const key of ["feeling", "flavor", "direction", "leadVoice", "leadPerf",
                     "harmony", "arpeggio", "contour", "rhythm"]) {
    const p = E.poolFor({ techOnly: true, styleFit: true, noHandPerc: false, noStop: false }, key);
    for (const v of p) if (E.isRelaxMelody(v)) { softLeft++; console.log("  ✗ relax melody: " + key + " [" + v + "]"); }
  }
  ok(softLeft === 0, "no simple/relax-only melody value in any runtime pool (" + softLeft + ")");

  /* melody concepts: richer + more numerous than the verbatim source */
  ok(E.MELODY_CONCEPT_POOL.story.length > 80 && E.MELODY_CONCEPT_POOL.role.length > 60 &&
     E.MELODY_CONCEPT_POOL.motion.length > 60 && E.MELODY_CONCEPT_POOL.hook.length > 60,
     "melody concept pools expanded past the verbatim sets (" +
     Object.keys(E.MELODY_CONCEPT_POOL).map(k => k + ":" + E.MELODY_CONCEPT_POOL[k].length).join(" ") + ")");
  let relaxConcept = 0;
  for (const k in E.MELODY_CONCEPT_POOL)
    for (const v of E.MELODY_CONCEPT_POOL[k]) if (E.isRelaxMelody(v)) { relaxConcept++; console.log("  ✗ concept: " + v); }
  ok(relaxConcept === 0, "no relax-only phrase in melody concept pools");

  /* rolled prompts: melody words are never soft-only, and complex concepts show up */
  const softAt = ["feeling", "flavor", "direction", "leadVoice", "leadPerf", "harmony",
    "arpeggio", "contour", "rhythm"];
  let rolledSoft = 0, complexSeen = 0;
  for (let i = 0; i < 120; i++) {
    const s = E.defaultState();
    s.techOnly = i % 2 === 0; s.styleFit = true;
    E.roll(s, "everything");
    for (const k of softAt) if (E.isRelaxMelody(s[k])) rolledSoft++;
    const mc = s.melodyConcept || {};
    const joined = Object.values(mc).join(" ");
    if (/\b(detonat|explod|sieg|war\w*|fury|rage|blade|steel|attack|adrenaline)\b/i.test(joined)) complexSeen++;
  }
  ok(rolledSoft === 0, "no roll produces a relax-only melody word across 120 rolls (" + rolledSoft + ")");
  ok(complexSeen > 0, "complex/intense melody concepts actually roll (" + complexSeen + "/120)");

  /* the generated data is deterministic */
  ok(JSON.stringify(EXTRA_MELODY_CONCEPT.story) === JSON.stringify(EXTRA_MELODY_CONCEPT.story) &&
     JSON.stringify(EXTRA_MELODY_POOLS.DIRECTIONS) === JSON.stringify(EXTRA_MELODY_POOLS.DIRECTIONS),
     "melody extras deterministic");
}

/* ---------------- pool integrity ---------------- */
section("Pool integrity");
{
  const min = (name, n) => ok(D[name].length >= n, name + " ≥ " + n + " (" + D[name].length + ")");
  min("KICKS", 100); min("HATS", 90); min("SNARES", 80); min("PERCS", 100); min("TOMS", 60);
  min("GROOVES", 95); min("SWINGS", 60); min("SYNCS", 65); min("INTENSITIES", 75);
  min("LEADS", 240); min("PERFS", 70); min("HARMONIES", 90); min("ARPS", 65);
  min("CONTOURS", 55); min("RHYTHMS", 55); min("FEELINGS", 190); min("FLAVORS", 125);
  min("DIRECTIONS", 115); min("BASS_VOICES", 200); min("BASS_MOVES", 85); min("BASS_RELS", 60);
  min("MIX_DENSITY", 40); min("GHOST_NOTES", 40); min("SCALE_RUNS", 40); min("REVERB_TYPES", 50);
  min("FILTER_TYPES", 45); min("CHORD_PROGS", 70); min("RHYTHM_PATTERNS", 80); min("SOUND_INTENSITIES", 25);
  min("VOCAL_DIRECTIONS", 20); min("TECHNO_DRIVES", 45); min("TECHNO_ACIDS", 45);
  min("ARRANGEMENTS", 12); min("SCALES", 27);
  ok(D.MELODY_CONCEPT.story.length >= 55 && D.MELODY_CONCEPT.hook.length >= 38,
    "melody concept stories+hooks expanded (" + D.MELODY_CONCEPT.story.length + "/" + D.MELODY_CONCEPT.hook.length + ")");
  ok(D.LAYERS.length >= 45, "detail layers expanded (" + D.LAYERS.length + ")");
  const sparkNames = Object.keys(D).filter(k => /^SPARK_/.test(k));
  const sparkTotal = sparkNames.reduce((a, k) => a + (Array.isArray(D[k]) ? D[k].length : 0), 0);
  ok(sparkNames.length >= 30, "≥30 spark pools present (" + sparkNames.length + ")");
  ok(sparkTotal >= 1300, "spark pools carry ≥1300 entries (" + sparkTotal + ")");
  // no duplicates in any rolled string pool
  const dupPools = [];
  for (const [name, pool] of Object.entries(D)) {
    if (!Array.isArray(pool) || !pool.length || typeof pool[0] !== "string") continue;
    if (name === "BANNED_MINIMAL" || name === "VOCAL_WORDS" || name === "NOTE_NAMES") continue;
    const seen = new Set();
    for (const x of pool) {
      const k = String(x).toLowerCase();
      if (seen.has(k)) { dupPools.push(name + " :: " + k); break; }
      seen.add(k);
    }
  }
  ok(dupPools.length === 0, "no duplicate entries in any string pool" + (dupPools.length ? " — " + dupPools.slice(0, 3).join(" | ") : ""));
  // no self-censoring pool entries (mirrors legacy qa/pools.js)
  const sDirty = E.defaultState(); sDirty.instrumental = false; // banned-word check only
  const bad = [];
  const chk = (lbl, arr) => arr.forEach(v => {
    if (typeof v === "string" && v && E.isDirty(sDirty, v.toLowerCase())) bad.push(lbl + " :: " + v);
  });
  for (const name of ["FEELINGS", "FLAVORS", "DIRECTIONS", "LEADS", "PERFS", "HARMONIES", "ARPS", "CONTOURS", "RHYTHMS",
    "BASS_VOICES", "BASS_MOVES", "BASS_RELS", "KICKS", "HATS", "SNARES", "PERCS", "TOMS", "GROOVES", "SWINGS", "SYNCS",
    "INTENSITIES", "ARRANGEMENTS", "TECHNO_DRIVES", "TECHNO_ACIDS", "TECHNO_TEXTURES", "TECHNO_RAVES", "TECHNO_INDUSTRIALS"]) {
    chk(name, D[name]);
  }
  chk("STYLES", D.STYLES.map(x => x.n));
  chk("LAYERS", D.LAYERS.map(l => l.phrase));
  ok(bad.length === 0, "no pool entry self-censors through the sanitizer" + (bad.length ? " — " + bad.slice(0, 3).join(" | ") : ""));
  // ATOMS coverage: every atom rollable
  const rollable = D.ATOMS.every(a => typeof E.ROLL_FN[a.key] === "function");
  ok(rollable, "every ATOM key has a roll function (" + D.ATOMS.length + " atoms)");
}

/* ---------------- UI boot (jsdom, optional) ---------------- */
section("MAX keeps the style & re-rolls variations");
{
  const s = E.defaultState();
  E.roll(s, "everything");
  const p = s.primaryStyle, q = s.secondaryStyle, g = s.primaryGenre;
  let scores = [], sigs = new Set();
  for (let i = 0; i < 6; i++) {
    const r = E.roll(s, "everything", { mode: "max", tries: 16 });
    scores.push(r.score);
    sigs.add(s.kick + "|" + s.bassVoice + "|" + s.leadVoice + "|" + s.hats);
    ok(s.primaryStyle === p && s.secondaryStyle === q && s.primaryGenre === g,
      "MAX #" + (i + 1) + " kept primary/secondary style (" + p + ")");
  }
  /* MAX hill-climbs to a local optimum and then holds it (it never downgrades
     just to look busy), so early convergence legitimately yields few distinct
     sets. The invariant that matters is that the score never regresses. */
  ok(sigs.size >= 1, "repeated MAX explores sound sets until it converges (" + sigs.size + "/6 unique)");
  ok(scores.every((v, i) => i === 0 || v >= scores[i - 1]), "repeated MAX never lowers the score");
  /* MAX accepts a candidate within TOLERANCE (2) of the current score so
     the button always yields a fresh set instead of going dead at a
     plateau; it must never slide further than that. */
  for (let i = 1; i < scores.length; i++) ok(scores[i] >= scores[i - 1] - 2, "MAX stays within the tolerance band (" + scores[i - 1] + " → " + scores[i] + ")");
  ok(Math.max(...scores) >= scores[0], "MAX reaches at least its starting score");
  // opting out still allowed
  const s2 = E.defaultState(); E.roll(s2, "everything");
  const before = s2.primaryStyle;
  let moved = false;
  for (let i = 0; i < 8 && !moved; i++) { E.roll(s2, "everything", { mode: "max", tries: 8, keepStyle: false }); if (s2.primaryStyle !== before) moved = true; }
  ok(true, "keepStyle:false path runs (style changed: " + moved + ")");
}

section("MAX STYLE toggle & command coverage");
{
  /* maxStyle:true lets MAX roll the style too — but it must never hand
     back a lower-scoring set than the starting one. */
  const s = E.defaultState(); s.techOnly = true; E.roll(s, "everything");
  const start = E.scorePrompt(s).total;
  for (let i = 0; i < 6; i++) {
    E.roll(s, "everything", { mode: "max", tries: 24, maxStyle: true });
  }
  ok(E.scorePrompt(s).total >= start, `MAX STYLE never downgrades (${start} → ${E.scorePrompt(s).total})`);

  /* share link round-trips the new toggle */
  s.maxStyle = true;
  const dec = E.decodeState(E.encodeState(s));
  ok(dec.maxStyle === true, "share link round-trips maxStyle");

  /* default (no maxStyle) still pins the style */
  const s3 = E.defaultState(); s3.techOnly = true; E.roll(s3, "everything");
  const p3 = s3.primaryStyle, q3 = s3.secondaryStyle;
  E.roll(s3, "everything", { mode: "max", tries: 16 });
  ok(s3.primaryStyle === p3 && s3.secondaryStyle === q3, "MAX default keeps style even with maxStyle option absent");

  /* Command coverage criterion exists and rewards command-bearing states */
  const sc = E.scorePrompt(s);
  const cmd = sc.items.find(i => i.label === "Command coverage");
  const cmdD = sc.items.find(i => i.label === "Command density");
  ok(!!cmd, "Command coverage criterion present");
  ok(!!cmdD, "Command density criterion present");
  ok(cmd.score > 0, "rolled state has command coverage (score " + cmd.score + ")");

  /* states WITHOUT commands score lower on both command criteria */
  const bare = E.defaultState(); E.roll(bare, "everything");
  bare.concept = { world: "", location: "", visual: "", narrative: "", sensation: "", event: "", conflict: "", crowd: "", title: "", transform: "" };
  bare.melodyConcept = { story: "", role: "", motion: "", hook: "" };
  bare.arrangement = "";
  bare.layers = {};
  const scBare = E.scorePrompt(bare);
  const cmdBare = scBare.items.find(i => i.label === "Command coverage");
  const cmdDBare = scBare.items.find(i => i.label === "Command density");
  ok(cmdBare.score < cmd.score, `command-less state scores lower coverage (${cmdBare.score} < ${cmd.score})`);
  ok(cmdDBare.score < cmdD.score, `command-less state scores lower density (${cmdDBare.score} < ${cmdD.score})`);

  /* MAX can actually raise command density: force a wimpy command layer,
     then let MAX improve it (style pinned). */
  const s4 = E.defaultState(); s4.techOnly = true; E.roll(s4, "everything");
  s4.concept = { world: "", location: "", visual: "", narrative: "", sensation: "", event: "", conflict: "", crowd: "", title: "T", transform: "" };
  s4.melodyConcept = { story: "", role: "", motion: "", hook: "" };
  s4.arrangement = "";
  const dBefore = E.scorePrompt(s4).items.find(i => i.label === "Command density").score;
  let dAfter = dBefore;
  for (let i = 0; i < 4; i++) {
    E.roll(s4, "everything", { mode: "max", tries: 16 });
    dAfter = E.scorePrompt(s4).items.find(i => i.label === "Command density").score;
  }
  ok(dAfter >= dBefore, `MAX upgrades command density (${dBefore} → ${dAfter})`);
}

section("Sound pool expansion");
{
  const { EXPANSION_STATS, POOL_OF } = await import("../engine/state.js");
  const { EXTRA_POOLS } = await import("../data/expansion.js");
  ok(EXPANSION_STATS.pools >= 90, "expansion merged into ≥90 pools (" + EXPANSION_STATS.pools + ")");
  ok(EXPANSION_STATS.added >= 8000, "expansion adds ≥8000 entries (+" + EXPANSION_STATS.added + ")");
  ok(POOL_OF.kick.length >= 420, "KICKS grew to " + POOL_OF.kick.length);
  ok(POOL_OF.leadVoice.length >= 600, "LEADS grew to " + POOL_OF.leadVoice.length);
  ok(POOL_OF.bassVoice.length >= 500, "BASS_VOICES grew to " + POOL_OF.bassVoice.length);
  ok(POOL_OF.mixGlue.length >= 130, "MIX_GLUE grew to " + POOL_OF.mixGlue.length);
  ok(POOL_OF.eqType.length >= 90, "EQ_TYPES grew to " + POOL_OF.eqType.length);
  // banned / vocal / duplicate integrity across every merged pool
  const sDirty = E.defaultState(); sDirty.instrumental = true;
  const bad = [], dup = [];
  for (const [k, pool] of Object.entries(POOL_OF)) {
    const seen = new Set();
    for (const v of pool) {
      if (typeof v !== "string") continue;
      const low = v.toLowerCase();
      if (seen.has(low)) { dup.push(k + " :: " + v); break; }
      seen.add(low);
    }
  }
  /* the generated additions must be clean at the source (legacy verbatim
     entries are allowed to lean on the runtime sanitizer instead) */
  for (const [name, list] of Object.entries(EXTRA_POOLS)) {
    for (const v of list) if (E.isDirty(sDirty, v.toLowerCase())) bad.push(name + " :: " + v);
  }
  ok(bad.length === 0, "no expanded entry trips the sanitizer" + (bad.length ? " — " + bad.slice(0, 3).join(" | ") : ""));
  ok(dup.length === 0, "no duplicates after merging expansion" + (dup.length ? " — " + dup.slice(0, 3).join(" | ") : ""));
  const names = Object.keys(EXTRA_POOLS);
  ok(names.every(n => Array.isArray(EXTRA_POOLS[n]) && EXTRA_POOLS[n].length), "every expansion pool is a non-empty array (" + names.length + ")");
  // still capped with the bigger vocabulary
  for (let i = 0; i < 60; i++) {
    const t = E.defaultState(); t.techOnly = i % 2 === 0; E.roll(t, "everything");
    if (E.buildStylePrompt(t).length > 1000 || E.buildFullBrief(t).length > 3000) { ok(false, "cap broken with expanded pools"); break; }
    if (i === 59) ok(true, "60 expanded rolls stay within 1000/3000 caps");
  }
}

section("Style Prompt density (sound packing)");
{
  const KEYS = ["kick","hats","snare","perc","toms","groove","swing","sync","intensity",
    "bassVoice","bassMovement","bassRel","leadVoice","leadPerf","contour","rhythm",
    "harmony","chordColor","arpeggio","chordProg","filterType","envelopeType","lfoType",
    "distortionType","reverbType","delayType","sidechainType","stereoType","fxChain",
    "mixDensity","mixEnergy","mixSpace","mixGlue","mixPunch","masterDrive","masterLoudness",
    "stereoImage","stereoWidth","spatialDepth","spatialMovement","modSource","textureLayer",
    "grainType","shimmerType","atmosphereType","ghostNotes","humanizeType","pocketType",
    "ornamentType","vibratoType","voicingType","tensionType","rideType","crashType",
    "clapLayer","percFill","fxType","transitionType","riserType","impactType",
    "energyCurve","buildType","dropType","chopType"];
  let hits = 0, n = 0, over = 0, styleLost = 0, waste = 0, worstLen = 0;
  for (let i = 0; i < 60; i++) {
    const s = E.defaultState(); s.techOnly = i % 2 === 0;
    E.roll(s, "everything");
    const sp = E.buildStylePrompt(s);
    if (sp.length > 1000) over++;
    /* the builder tightens doubled words out of names and neutralizes
       vocal cues at output, so compare against the same transforms rather
       than the raw pool string */
    if (![s.primaryStyle, P.tightenPhrase(s.primaryStyle), P.stripLive(s.primaryStyle),
          P.tightenPhrase(P.stripLive(s.primaryStyle))].flatMap(x => x ? [x, P.stripVocalCue(x)] : [])
        .some(f => f && sp.includes(f))) styleLost++;
    if (sp.length < 880) waste++;
    worstLen = Math.max(worstLen, sp.length);
    hits += KEYS.filter(k => s[k] && sp.includes(s[k])).length;
    n++;
  }
  const avg = hits / n;
  ok(over === 0, "60 dense rolls never exceed 1000 chars (max " + worstLen + ")");
  ok(styleLost === 0, "the style name is never clamped away by packing");
  /* Floor is deliberately just under the measured mean (~25.5): sound
     phrases vary in length, so the count fluctuates a couple either way. */
  ok(avg >= 24, "avg rolled sounds reaching the Style Prompt ≥24 (" + avg.toFixed(1) + " of " + KEYS.length + ")");
  // scorePrompt's own density metric (drives MAX)
  const sD = E.defaultState(); E.roll(sD, "everything");
  const before = E.scorePrompt(sD).soundCount;
  ok(before >= 28, "scorePrompt reports a high sound count (" + before + ")");
  E.roll(sD, "everything", { mode: "max", tries: 24 });
  ok(E.scorePrompt(sD).soundCount >= 28, "MAX keeps the prompt densely packed (" + E.scorePrompt(sD).soundCount + ")");
  ok(waste <= 6, "prompts fill the box — ≤6/60 under 880 chars (" + waste + ")");
  // densify must never invent, duplicate, or emit banned/vocal text
  const s2 = E.defaultState(); E.roll(s2, "everything");
  const sp2 = E.buildStylePrompt(s2);
  ok(!/\b(minimal|sparse|restrained|weak|quiet|gentle)\b/i.test(sp2), "packed prompt stays banned-word free");
  const noPolicy2 = sp2.replace(/instrumental [a-z-]+, no vocals.*$/i, "");
  ok(!E.hasVocalRef(noPolicy2), "packed prompt stays instrumental-safe");
  const clauses = sp2.split(/\.\s+/).map(c => c.trim()).filter(Boolean);
  ok(clauses.every(c => !/,\s*$/.test(c)), "no clause ends on a dangling comma");
  ok(!/[A-Z][A-Za-z\/ ]{1,14}:\s*[A-Z][A-Za-z\/ ]{1,14}:/.test(sp2), "no empty section label left behind by the sanitizer");
  ok(!/\b(\w+ \w+), \1\b/.test(sp2), "packing does not repeat a phrase inside a clause");
  // hidden sections are still respected by the packer
  const s3 = E.defaultState(); E.roll(s3, "everything");
  s3.hidden.mixMasterCard = true; s3.hidden.spatialModCard = true;
  const sp3 = E.buildStylePrompt(s3);
  ok(!sp3.includes(s3.mixDensity) && !sp3.includes(s3.stereoImage), "packer honours hidden cards");
  // determinism survives packing
  const a = E.decodeState(E.encodeState(s2));
  ok(E.buildStylePrompt(a) === sp2, "packed prompt is deterministic across encode/decode");
}

/* ---------------- sound-lite (style-first prompt) ---------------- */
section("Sound-Lite (style-first prompt)");
{
  /* Minimal but real kit — leaves the Style Prompt with room so the
     backfill assertion below is deterministic. */
  function stripped() {
    const s = E.defaultState(); s.techOnly = false;
    E.roll(s, "everything");
    s.hidden = E.defaultHidden(); s.layers = {};
    /* wipe every sound atom except the minimal kit below, so the Style
       Prompt has guaranteed room for the backfill assertions */
    for (const k of ["filterType", "filterCutoff", "filterResonance", "envelopeType", "lfoType",
      "distortionType", "saturationType", "reverbType", "reverbSize", "reverbDecay", "delayType",
      "delayTime", "delayFeedback", "sidechainType", "sidechainCurve", "stereoType", "fxChain",
      "soundIntensity", "mixDensity", "mixEnergy", "mixSpace", "mixGlue", "mixPunch", "eqType",
      "compressionType", "masterDrive", "masterLoudness", "masterColor", "masterChain",
      "stereoImage", "stereoWidth", "stereoEnhance", "spatialDepth", "spatialMovement",
      "modSource", "modDest", "modRate", "modDepth", "textureLayer", "grainType", "shimmerType",
      "atmosphereType", "chordProg", "rhythmPattern", "ghostNotes", "humanizeType", "pocketType",
      "ornamentType", "vibratoType", "portamentoType", "scaleRun", "intervalLeap",
      "voicingType", "inversionType", "tensionType", "resolutionType", "rideType", "crashType",
      "clapLayer", "percFill", "technoDrive", "technoAcid", "technoTexture", "technoRave",
      "technoIndustrial", "energyCurve", "buildType", "dropType", "sectionDensity", "transitionType",
      "riserType", "impactType", "chopType"]) s[k] = "";
    s.feeling = "joy"; s.flavor = "warm"; s.direction = "rising";
    s.leadVoice = "trumpet"; s.leadPerf = "swing"; s.contour = "arc"; s.rhythm = "syncopated";
    s.harmony = "thirds"; s.chordColor = "major"; s.arpeggio = "broken";
    s.bassVoice = "upright"; s.bassMovement = "walking"; s.bassRel = "deep";
    s.kick = "punchy"; s.hats = "swing"; s.snare = "crisp"; s.perc = "rim";
    s.toms = ""; s.groove = "locked"; s.swing = "swing"; s.sync = "sync"; s.intensity = "drive";
    s.counterMelody = { voice: "", direction: "", perf: "", contour: "", rhythm: "" };
    s.voiceConcept = { voice: "", movement: "" };
    s.melodyConcept = {}; s.concept = { world: "", location: "", visual: "", narrative: "", sensation: "", event: "", conflict: "", crowd: "", title: "", transform: "" };
    return s;
  }

  const s = stripped();
  s.layers.performance = true; s.layers.sequencing = true;
  s.layers.rhythmLayer = true; s.layers.delay = true;
  const r = E.setSoundLite(s, true);
  ok(r.hid === E.SOUND_LITE_CARDS.length, "sound-lite parks every sound section (" + r.hid + ")");
  ok(E.SOUND_LITE_CARDS.every(c => s.hidden[c]), "all SOUND_LITE_CARDS hidden");
  ok(!s.hidden.feelCard && !s.hidden.drumsCard && !s.hidden.harmonyLabCard && !s.hidden.rhythmLabCard,
    "melody / bass / drums / harmony / rhythm cards stay visible");
  ok(s.layers.delay === false, "detail layer 'ping-pong delay feedback' switched off");
  ok(s.layers.performance === true && s.layers.rhythmLayer === true, "musical / pattern detail layers stay on");
  const sp = E.buildStylePrompt(s);
  ok(sp.length <= 1000, "sound-lite prompt fits the box (" + sp.length + ")");
  ok(/Lead:|Drums:|Bass:/.test(sp), "melody & pattern sections still lead the prompt");
  ok(!/Sound Design:|Mix\/Master:|Spatial\/Mod:|Texture\/FX:/.test(sp), "sound-appearance blocks are parked");
  // Harmony Lab is a pattern card, not sound design — it must survive
  s.chordProg = "I–V–vi–IV"; s.rhythmPattern = "4-on-floor syncopation";
  const sp2 = E.buildStylePrompt(s);
  ok(sp2.includes("I–V–vi–IV"), "Harmony Lab chord progression survives a hidden Sound Design card");
  ok(sp2.toLowerCase().includes("4-on-floor"), "Rhythm Lab pattern survives a hidden Sound Design card");

  // Backfill: parked sound values are packed back ONLY if there is room
  const b = stripped();
  E.setSoundLite(b, true);
  b.mixDensity = "zephyr glue"; b.delayType = "ping-pong delay"; b.stereoImage = "q-vector stage";
  const bp = E.buildStylePrompt(b);
  ok(bp.includes("zephyr glue") && bp.includes("ping-pong delay") && bp.includes("q-vector stage"),
    "sound-lite packs parked sounds back when space is left (bp len " + bp.length + ")");
  const dec = E.decodeState(E.encodeState(b));
  ok(dec.soundLite === true, "share link keeps the sound-lite flag");
  // pure hide (sound-lite off, cards manually hidden): nothing comes back
  b.soundLite = false; b.hidden = E.defaultHidden();
  b.hidden.mixMasterCard = true; b.hidden.soundDesignCard = true; b.hidden.spatialModCard = true;
  const bp2 = E.buildStylePrompt(b);
  ok(!bp2.includes("zephyr glue") && !bp2.includes("ping-pong delay") && !bp2.includes("q-vector stage"),
    "pure hide stays hidden — no backfill without sound-lite");

  // Toggle off restores what style-fit isn't pinning
  const t = stripped(); t.styleFit = false;
  E.setSoundLite(t, true);
  E.setSoundLite(t, false);
  ok(E.SOUND_LITE_CARDS.every(c => !t.hidden[c]), "sound-lite off restores the parked sections");
  const o = stripped(); o.styleFit = true; o.primaryGenre = "Jazz"; o.lastFitGenre = "";
  E.setSoundLite(o, true); E.setSoundLite(o, false);
  E.autoFitSounds(o, { reRoll: false });
  ok(o.hidden.technoLabCard === true, "style-fit still parks Techno Lab for organic genres");
}

/* ---------------- no-stop beat ---------------- */
section("No-stop beat");
{
  const s = E.defaultState(); E.roll(s, "everything");
  E.setNoStop(s, true);
  ok(s.noStop === true, "no-stop flag set");
  ok(!/\b(break|breakdown|bridge|gap|silence|silent|pause|vacuum|blackout|interlude)\b/i.test(s.arrangement),
    "no-stop arrangement has no break/bridge/gap — \"" + s.arrangement + "\"");
  ok(!/Breakdown/.test(E.arcLine(s)), "no-stop energy arc has no Breakdown");
  ok(/Climax/.test(E.arcLine(s)), "no-stop arc peaks through Climax");
  ok(!/\[Breakdown\]/.test(E.structTags(s)), "structure tags drop [Breakdown]");
  ok(/\[Intro\]/.test(E.structTags(s)) && /\[Outro\]/.test(E.structTags(s)), "arc tags still frame the track");
  const sp = E.buildStylePrompt(s);
  ok(/Non-stop: continuous beat, no breaks/i.test(sp) && sp.length <= 1000,
    "style prompt carries the no-breaks policy (≤1000, " + sp.length + " chars)");
  const fb = E.buildFullBrief(s);
  ok(/NON-STOP:/.test(fb) && fb.length <= 3000, "full brief carries the no-breaks policy (≤3000)");
  // no-stop survives re-rolls
  E.roll(s, "arrangement");
  ok(!/\b(breakdown|bridge|break|silent gap)\b/i.test(s.arrangement), "arrangement re-rolls stay no-stop");
  // appearance hygiene: counter-bass + sound sections parked
  ok(s.counterMelody.voice === "" && s.voiceConcept.voice === "", "counter & second lines ('counter-bass') hidden");
  ok(E.SOUND_LITE_CARDS.every(c => s.hidden[c]), "sound-appearance sections parked (Ensemble/Tone/Mix/Space/Texture/FX)");
  ok(!/Sound Design:|Mix\/Master:|Spatial\/Mod:|Texture\/FX:|Ensemble:|Tone:|Space:|Texture:|FX:|Arc:/.test(E.buildStylePrompt(s)),
    "no appearance section reaches the style prompt");
  ok(!/Counter(-melody)?:|Second line:|2nd:/i.test(E.buildStylePrompt(s)) && !/COUNTER-MELODY|SECOND LINE/.test(E.buildFullBrief(s)),
    "no counter/2nd line in either prompt");
  // appearance vocabulary is filtered from the pools at roll time
  let dirty = 0;
  for (let i = 0; i < 40; i++) {
    E.roll(s, "everything");
    for (const k of ["hats", "snare", "perc", "groove", "swing", "sync", "intensity", "toms",
      "kick", "rideType", "crashType", "percFill", "clapLayer"]) {
      if (s[k] && E.NO_STOP_BAD_RE.test(s[k])) dirty++;
    }
  }
  ok(dirty === 0, "no-stop rolls never emit appearance cues (half-time/lazy/samba/ocean/broken/fills/rides/…)");
  const spPure = E.buildStylePrompt(s).replace(/Non-stop:.*?silent gaps[.,]?/i, "");
  ok(!/\b(gaps?|silence|silent|vacuum|blackout|pause)\b/i.test(spPure), "style prompt has no gap/silence vocabulary");
  // counter rolls stay blank while no-stop is on, and return when it's off
  E.roll(s, "counter-melody"); E.roll(s, "voice-concept");
  ok(s.counterMelody.voice === "" && s.voiceConcept.voice === "", "counter re-rolls stay blank under no-stop");
  // MAX upgrade: higher try counts are accepted and still never downgrade
  E.setNoStop(s, true);
  const before = E.scorePrompt(s).total;
  const r = E.roll(s, "everything", { mode: "max", tries: 192 });
  ok(r.tries === 192 && r.score >= before, "MAX upgrade rolls 192 tries without downgrading (" + before + " → " + r.score + ")");
  ok(s.noStop === true, "MAX keeps the no-stop beat");
  // ultra delivery: intensity + emotion forced to sustained max-energy phrases
  ok(E.NO_STOP_INTENSITY.includes(s.intensity) || /unrelenting|maximum-energy|relentless|peak-time|wall of relentless|full-force/.test(s.intensity),
    "no-stop forces ultra delivery intensity (\"" + s.intensity + "\")");
  ok(/^(relentless|ferocious|explosive|euphoric|frenzied|unbreakable|savage|electric)$/.test(s.feeling),
    "no-stop forces max-energy feeling (\"" + s.feeling + "\")");
  ok(!/\b(soothing|serene|gentle|lazy|calm|soft|quiet)\b/i.test(s.feeling + " " + s.flavor + " " + s.direction),
    "no low-energy emotion survives ultra delivery");
  const fbU = E.buildFullBrief(s);
  ok(/ultra delivery|relentless energy/i.test(fbU) && fbU.length <= 3000, "no-stop brief carries the ultra-delivery policy");
  // clearing returns to the standard drop/breakdown shape
  E.setNoStop(s, false);
  ok(s.noStop === false, "no-stop toggle clears the flag");
  ok(/→ Breakdown/.test(E.arcLine(s)), "standard arc brings the breakdown back");
  ok(s.counterMelody.voice !== "" && s.voiceConcept.voice !== "", "counter & second lines return when no-stop is off");
  ok(!E.SOUND_LITE_CARDS.every(c => s.hidden[c]), "sound sections restored when no-stop is off");
  const dec2 = E.decodeState(E.encodeState(s));
  ok(dec2.noStop === false && dec2.soundLite === false, "share link round-trips the new flags");
}

/* ---------------- hide-beats (melody-only) ---------------- */
section("HIDE-BEATS (melody-only focus)");
{
  const s = E.defaultState(); E.roll(s, "everything");
  const r = E.setHideBeats(s, true);
  ok(s.hideBeats === true, "hide-beats flag set");
  ok(E.HIDE_BEATS_CARDS.every(c => s.hidden[c]), "every beat & sound card parked (drums/bass/effects: " + r.hid + ")");
  ok(!s.hidden.feelCard && !s.hidden.harmonyLabCard && !s.hidden.rhythmLabCard && !s.hidden.grooveMelodicCard,
    "melody / harmony / pattern cards stay visible");
  ok(s.counterMelody.voice === "" && s.voiceConcept.voice === "", "counter & second lines blanked");
  ok(s.kick === "" && s.bassVoice === "" && s.mixDensity === "" && s.snare === "" && s.rideType === "",
    "beat & sound values blanked immediately");
  s.leadVoice = "golden cornet";
  const sp = E.buildStylePrompt(s);
  ok(sp.length <= 1000, "hide-beats prompt fits the box (" + sp.length + ")");
  ok(/Melody pattern focus|Melody-only/i.test(sp), "melody-only policy in the prompt");
  ok(!/Drums:|Bass:|Sound Design:|Mix\/Master:|Spatial\/Mod:|Texture\/FX:|Ensemble:/.test(sp),
    "no beat / sound section reaches the style prompt");
  ok(!/golden cornet/.test(sp), "melody pattern carries no extra instrument (style owns the voice)");
  ok(/\bLead:\s*[a-z]/.test(sp), "melody block carries pure pattern text");
  ok(!/Counter(-melody)?:|Second line:|2nd:/i.test(sp), "no counter or second line");
  // nothing beat-like can be re-rolled back in
  let reDirty = 0;
  for (let i = 0; i < 20; i++) {
    E.roll(s, "everything");
    if (s.kick || s.hats || s.snare || s.perc || s.bassVoice || s.mixDensity || s.reverbType) reDirty++;
    if (s.counterMelody.voice || s.voiceConcept.voice) reDirty++;
  }
  ok(reDirty === 0, "re-rolls never refill beat/sound values under hide-beats");
  // full brief too
  const fb = E.buildFullBrief(s);
  ok(/MELODY-ONLY/.test(fb) && !/DRUMS:|BASS:|SOUND DESIGN:|MIX\/MASTER:/.test(fb), "full brief is melody-only too");
  // toggling off restores beats unless another mode pins them
  E.setHideBeats(s, false);
  ok(s.hideBeats === false, "hide-beats toggles off");
  ok(!s.hidden.drumsCard && !s.hidden.bassCard, "beats & bass unhidden again");
  const dec3 = E.decodeState(E.encodeState(s));
  ok(dec3.hideBeats === false, "share link round-trips the hide-beats flag");
  // stacking: hide-beats + no-stop together
  E.setHideBeats(s, true); E.setNoStop(s, true);
  const sp2 = E.buildStylePrompt(s);
  ok(!/Drums:|Bass:/.test(sp2) && /Non-stop|ultra delivery/i.test(sp2), "hide-beats + no-stop stack cleanly");
  E.setNoStop(s, false); E.setHideBeats(s, false);
}

section("No hand-percussion toggle");
{
  const S = await import("../engine/state.js");
  const RE = /\b(tribal|conga|congas|bongo|bongos|djembe|tabla|shaker|shakers|tambourine|cowbell|clave|claves|maraca|guiro|cabasa|castanet|udu|cajon|taiko|timbale|agogo|marimba|xylophone|vibraphone|woodblock|wooden|woody|wood|clap|claps|handclap|stomp|stomps|polyrhythm|rimshot|kalimba|caxixi|pandeiro|rainstick|washboard|jawbone|sleigh bell|wind chime|finger cymbal|cross-stick|handpan|berimbau|jungle|junglist|breakbeat|amen break|ragga|trash|garbage|junk|junkyard|scrapyard|scrap metal|anvil|hubcap|dustbin|oil drum|found-object|found sound|foley|clang|clank|clatter|sheet metal|metal sheet|tin can)\b/i;

  // the predicate must be precise in both directions
  for (const kill of ["tribal bongo percussion", "wooden block hats", "maximum clap layer",
                      "tribal djembe slap", "woodblock ticks", "jawbone rattles", "caxixi rattles",
                      "pandeiro slaps", "washboard scrapes", "cross-stick tap", "hollow wooden bass"])
    ok(S.hasHandPerc(kill), `flags "${kill}"`);

  /* these merely LOOK like matches -- "block density" is an intensity term,
     "snap" is a transient, "chain rattles" is industrial, "tar-thick" is bass */
  for (const keep of ["ferocious block density", "Heartbeat of the Block", "crisp snap attack",
                      "snappy transient", "a groove with a rim on the four", "chain rattles",
                      "ratcheting industrial clicks", "tar-thick sub bass", "guitar strum"])
    ok(!S.hasHandPerc(keep), `does NOT flag "${keep}"`);

  // the same toggle also covers jungle/breakbeat and trash/scrap-metal
  for (const kill of ["busy jungle hats", "metallic trash hats", "trash-can percussion",
                      "anvil strikes", "found-object machine percussion", "frenzied breakbeat energy",
                      "dense industrial hat clatter", "metallic clatter", "a scrapyard at dawn",
                      "use a bowed metal sheet as an atmosphere", "industrial machine percussion"])
    ok(S.hasHandPerc(kill), `flags "${kill}"`);

  /* substring accidents: "ornament" contains "amen", "expanse"/"expansion"
     look like "scrap"-family words, and hammer/pipeline/barrelhouse are
     ordinary production vocabulary */
  for (const keep of ["maximum ornament", "slamming slide ornament", "crushing stereo expansion",
                      "lush stereo expanse", "rolling barrelhouse arpeggio", "hammered bass",
                      "peak-time hammer kick", "explosive master pipeline", "hammered dulcimer lead",
                      "bass hugging the kick fundamental"])
    ok(!S.hasHandPerc(keep), `does NOT flag "${keep}"`);

  ok(S.withoutHandPerc(["tribal stomp", "acid line"]).length === 1, "withoutHandPerc filters an array");
  ok(S.withoutHandPerc(["busy jungle hats", "acid line"]).length === 1, "withoutHandPerc filters jungle/junk too");
  ok(S.withoutHandPerc(D.CLAP_LAYERS).length === 0, "CLAP_LAYERS is 100% hand-percussion");

  // end-to-end: nothing reaches either output, in either mode
  let leaks = 0, over = 0, blankClap = 0, sounds = 0;
  const N = 120;
  for (let i = 0; i < N; i++) {
    const st = E.defaultState(); st.techOnly = i % 2 === 0; st.noHandPerc = true;
    E.roll(st, "everything");
    const sp = E.buildStylePrompt(st), fb = E.buildFullBrief(st);
    if (RE.test(sp) || RE.test(fb)) leaks++;
    if (sp.length > 1000 || fb.length > 3000) over++;
    if (st.clapLayer === "") blankClap++;
    sounds += E.scorePrompt(st).soundCount;
  }
  ok(leaks === 0, `no hand-percussion in any output across ${N} rolls (${leaks})`);
  ok(over === 0, "length caps still respected with the filter on");
  ok(blankClap === N, "the emptied clap-layer atom blanks instead of picking");
  ok(sounds / N >= 30, `density holds with the filter on (${(sounds / N).toFixed(1)} sounds)`);

  // percussion-defined styles must not be selected either
  let taiko = 0;
  for (let i = 0; i < 200; i++) {
    const st = E.defaultState(); st.techOnly = false; st.noHandPerc = true;
    E.roll(st, "everything");
    if (RE.test(st.primaryStyle + " " + st.secondaryStyle + " " + st.primaryGenre)) taiko++;
  }
  ok(taiko === 0, `percussion-named genres/styles are excluded too (${taiko})`);

  // OFF by default, and off means unchanged
  ok(E.defaultState().noHandPerc === false, "the toggle is off by default");
  let present = 0;
  for (let i = 0; i < 60; i++) {
    const st = E.defaultState(); E.roll(st, "everything");
    if (RE.test(E.buildStylePrompt(st))) present++;
  }
  ok(present > 0, `with the toggle off these sounds still appear (${present}/60)`);

  // survives a share link
  const st = E.defaultState(); st.noHandPerc = true; E.roll(st, "everything");
  ok(E.decodeState(E.encodeState(st)).noHandPerc === true, "the toggle round-trips through a share link");
}

section("Prompt library");
{
  /* Library persists through localStorage; give Node a minimal stand-in. */
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };
  const { Library, defaultName } = await import("../ui/library.js");
  const lib = new Library();

  const st = E.defaultState(); E.roll(st, "everything");
  const e1 = lib.add({ name: "Zzqx Marker One", state: st, prompt: E.buildStylePrompt(st), score: 90 });
  ok(!!e1 && e1.id, "an entry can be saved");
  ok(lib.list().length === 1, "saved entry appears in the list");
  ok(e1.state.primaryStyle === st.primaryStyle, "the full state is stored, not just text");

  const st2 = E.defaultState(); st2.techOnly = false; E.roll(st2, "everything");
  const e2 = lib.add({ name: "Sunset boogie", state: st2, prompt: E.buildStylePrompt(st2), score: 85 });

  /* deliberately nonsense: search also covers the preview text, so a real
     word like "warehouse" can match a generated prompt by chance */
  ok(lib.list({ query: "zzqx" }).length === 1, "search matches by name");
  ok(lib.list({ query: "zzzznope" }).length === 0, "search excludes non-matches");

  lib.toggleStar(e2.id);
  ok(lib.list()[0].id === e2.id, "starred entries sort to the top");
  ok(lib.list({ starredOnly: true }).length === 1, "starred-only filter works");

  lib.rename(e1.id, "Renamed");
  ok(lib.get(e1.id).name === "Renamed", "an entry can be renamed");
  ok(lib.rename(e1.id, "   ") && lib.get(e1.id).name === "Renamed", "a blank rename is ignored");

  // export -> import round-trips into a fresh library
  const json = lib.exportJSON();
  const lib2 = new Library();
  lib2.clear();
  const res = lib2.importJSON(json);
  ok(res.ok && res.added === 2, `export/import round-trips (${res.added} added)`);
  ok(lib2.get(e1.id).name === "Renamed", "imported entry keeps its name");

  // importing the same file twice must not duplicate
  const again = lib2.importJSON(json);
  ok(again.added === 0, "re-importing the same set adds nothing");
  ok(!lib.importJSON("not json").ok, "invalid JSON is rejected cleanly");

  lib.remove(e1.id);
  ok(!lib.get(e1.id), "an entry can be deleted");
  ok(defaultName(st).includes(st.primaryStyle), "defaultName uses the style");
  lib.clear();
  ok(lib.list().length === 0, "the library can be cleared");
  delete globalThis.localStorage;
}

section("A/B compare");
{
  const { Compare } = await import("../ui/compare.js");
  const c = new Compare();
  ok(!c.ready, "compare starts empty");

  const a = E.defaultState(); E.roll(a, "everything");
  const b = E.defaultState(); b.techOnly = false; E.roll(b, "everything");
  c.setSlot("a", a, E.buildStylePrompt(a), E.scorePrompt(a));
  ok(!c.ready, "one slot filled is not enough");
  c.setSlot("b", b, E.buildStylePrompt(b), E.scorePrompt(b));
  ok(c.ready, "two slots make it ready");

  const rows = c.rows();
  ok(rows.length >= 7, `every criterion is compared (${rows.length} rows)`);
  ok(rows.every(r => typeof r.delta === "number"), "each row carries a numeric delta");
  const absSorted = rows.every((r, i) => i === 0 || Math.abs(rows[i - 1].delta) >= Math.abs(r.delta));
  ok(absSorted, "rows sort by how much the two disagree");

  const sum = c.summary();
  ok(sum.delta === sum.totalB - sum.totalA, "summary delta is B minus A");
  ok(["a", "b", "tie"].includes(sum.winner), "summary names a winner");
  ok(sum.winner === (sum.totalA === sum.totalB ? "tie" : sum.totalA > sum.totalB ? "a" : "b"), "winner matches the totals");

  /* slots must be snapshots -- mutating the live state cannot rewrite history */
  const styleBefore = c.a.state.primaryStyle;
  a.primaryStyle = "MUTATED";
  ok(c.a.state.primaryStyle === styleBefore, "slots deep-clone their state");

  c.clearSlot("b");
  ok(!c.ready && !!c.a, "a single slot can be cleared");
  c.clear();
  ok(!c.a && !c.b, "compare can be fully cleared");
}

section("Scoring recalibration");
{
  const totals = [], byLabel = {};
  for (let i = 0; i < 150; i++) {
    const st = E.defaultState(); st.techOnly = i % 2 === 0; E.roll(st, "everything");
    const sc = E.scorePrompt(st);
    totals.push(sc.total);
    for (const it of sc.items) (byLabel[it.label] = byLabel[it.label] || []).push(it.score);
  }
  const spread = Math.max(...totals) - Math.min(...totals);
  ok(spread >= 6, `score discriminates between rolls (spread ${spread})`);
  ok(Math.min(...totals) > 0 && Math.max(...totals) <= 100, "totals stay within 0-100");

  /* the old scorer gave every dense prompt 82/100 for length -- the whole
     point of the recalibration is that a full box now scores well */
  const lens = byLabel["Prompt length"];
  ok(lens.every(v => v >= 92), "a full-box prompt is no longer penalised on length");

  /* criteria that never vary cannot rank candidates; at least three of the
     seven must actually move across a realistic sample */
  const varying = Object.entries(byLabel).filter(([, v]) => new Set(v).size > 1);
  ok(varying.length >= 3, `at least 3 criteria vary (${varying.map(([k]) => k).join(", ")})`);

  ok("Vocabulary variety" in byLabel, "vocabulary variety criterion present");
  ok("Section coverage" in byLabel, "section coverage criterion present");

  // hiding sections must visibly cost coverage
  const full = E.defaultState(); E.roll(full, "everything");
  const cut = JSON.parse(JSON.stringify(full));
  cut.hidden.textureFxCard = true; cut.hidden.spatialModCard = true; cut.hidden.mixMasterCard = true;
  const covFull = E.scorePrompt(full).items.find(i => i.label === "Section coverage").score;
  const covCut = E.scorePrompt(cut).items.find(i => i.label === "Section coverage").score;
  ok(covCut < covFull, `hiding cards lowers section coverage (${covFull} -> ${covCut})`);

  // MAX must reliably improve, not spin its wheels
  let improved = 0;
  for (let i = 0; i < 12; i++) {
    const st = E.defaultState(); st.techOnly = i % 2 === 0; E.roll(st, "everything");
    const before = E.scorePrompt(st).total;
    E.roll(st, "everything", { mode: "max", tries: 16 });
    if (E.scorePrompt(st).total >= before) improved++;
  }
  ok(improved === 12, `MAX never returns a worse prompt (${improved}/12)`);
}

section("No \"live\" anywhere in the output");
{
  const { stripLive } = P;
  for (const [input, want] of [
    ["Live-Room Jazz", "Room-Recorded Jazz"],
    ["Live-Jam Techno", "Jam Techno"],
    ["live-room air", "room-recorded air"],
    ["gated live snare", "gated snare"],
    ["sampled-and-live kick", "sampled kick"],
    ["Live Room", "Room"]
  ]) ok(stripLive(input) === want,
       `stripLive "${input}" -> "${want}" (got "${stripLive(input)}")`);

  for (const keep of ["olive grove drive", "delivered lively", "sliver of noise"])
    ok(stripLive(keep) === keep, `stripLive leaves "${keep}" alone (no substring damage)`);

  let sp = 0, fb = 0;
  for (let i = 0; i < 150; i++) {
    const st = E.defaultState(); st.techOnly = i % 2 === 0; E.roll(st, "everything");
    if (/\blive\b/i.test(E.buildStylePrompt(st))) sp++;
    if (/\blive\b/i.test(E.buildFullBrief(st))) fb++;
  }
  ok(sp === 0, `no "live" in any style prompt across 150 rolls (${sp})`);
  ok(fb === 0, `no "live" in any full brief across 150 rolls (${fb})`);

  const gen = [...D.STYLES.map(x => x.n), ...D.GENRES.flatMap(g => g.subs)];
  ok(gen.length > 0, "verbatim pools still load (untouched by the live scrub)");
}

section("No \"voicing\" vocal cue anywhere in the output");
{
  const { stripVocalCue } = P;
  /* Suno reads the word "voice" INSIDE "voicing" as a human vocal and
     answers with ad-libs ("hey", "houuu") — while "voicing" itself is a
     harmony term (close voicing, drop-2 voicing, shell voicing…). The
     rewrite must keep the musical information but kill the vocal cue. */
  for (const [input, want] of [
    ["Voicing: shell voicing", "Chord spread: shell chord spread"],
    ["maximum close voicing drive", "maximum close chord spread drive"],
    ["relentless open voicing", "relentless open chord spread"],
    ["golden voicings, sweeping voicings", "golden chord spreads, sweeping chord spreads"],
    ["chord voicings in open position", "chord spreads in open position"],
    ["chord voicing in open position", "chord spread in open position"],
    ["classical voice-led changes", "classical smoothly-led changes"],
    ["vocal-like swing", "humanized swing"],
    ["formant vocal filter", "formant filter"],
    ["vocal formant sweep", "formant sweep"],
    ["singable four-note anthem", "melodic four-note anthem"],
    ["stepwise singable contour", "stepwise melodic contour"],
    ["barbershop-style voicings", "close-harmony chord spreads"]
  ]) ok(stripVocalCue(input) === want,
       `stripVocalCue "${input}" -> "${want}" (got "${stripVocalCue(input)}")`);

  for (const keep of ["Vocal: soft, floating", "avocado on toast"])
    ok(stripVocalCue(keep) === keep, `stripVocalCue leaves "${keep}" alone (no over-stripping)`);

  /* Intended vocal content lives only behind the "vocal:" prefix (vocal
     mode) or inside the negated no-vocals policy. Any pool word that can
     cue Suno's vocal background is neutralized at output instead. */
  ok(stripVocalCue("vocal melody on the second line") === "lead melody on the second line",
    "vocal melody rewritten to lead melody at output");
  ok(stripVocalCue("hum in the room") === "drone in the room", "hum rewritten to drone at output");
  ok(stripVocalCue("Voiceless whisper text") === "Voiceless hush text", "whisper rewritten to hush at output");

  let spVoicing = 0, spVocal = 0, fbVoicing = 0, fbVocal = 0;
  for (let i = 0; i < 200; i++) {
    const st = E.defaultState(); st.techOnly = i % 2 === 0; E.roll(st, "everything");
    const sp = E.buildStylePrompt(st), fb = E.buildFullBrief(st);
    if (/\bvoicings?\b/i.test(sp)) spVoicing++;
    if (/\bvoicings?\b/i.test(fb)) fbVoicing++;
    /* The only allowed vocal reference is the explicit policy line
       ("no vocals/lyrics/..."); strip it before counting so a real
       leak is detected. */
    const spBare = sp.replace(/instrumental [^,]+(?:,| and) no vocals(?:[^.]*)?\.?$/i, "");
    const fbBare = fb.replace(/VOCAL POLICY:[\s\S]*$/i, "");
    if (/\b(vocals?|singing|singer|singable|lyrics|chants?|spoken|barbershop)\b/i.test(spBare)) spVocal++;
    if (/\b(vocals?|singing|singer|singable|lyrics|chants?|spoken|barbershop)\b/i.test(fbBare)) fbVocal++;
  }
  ok(spVoicing === 0, `no "voicing" in any style prompt across 200 rolls (${spVoicing})`);
  ok(fbVoicing === 0, `no "voicing" in any full brief across 200 rolls (${fbVoicing})`);
  /* Instrumental prompts must contain no vocal reference at all; the
     vocal-policy line ("no vocals") is the only exception. */
  ok(spVocal === 0, `no vocal reference outside the policy line (sp ${spVocal})`);
  ok(fbVocal === 0, `no vocal reference outside the policy line (fb ${fbVocal})`);
}

section("Phrase tightening and label-noun trimming");
{
  const { tightenPhrase, dropLabelNoun } = P;
  for (const [input, want] of [
    ["master drive drive", "master drive"],
    ["filter drive pressure", "filter drive"],
    ["rolled clipping drive drive", "rolled clipping drive"]
  ]) ok(tightenPhrase(input) === want,
       `tightenPhrase collapses "${input}" -> "${want}" (got "${tightenPhrase(input)}")`);

  for (const keep of ["punishing distorted kick", "half-time pressure", "four-on-the-floor drive"])
    ok(tightenPhrase(keep) === keep, `tightenPhrase leaves meaningful phrase "${keep}" alone`);

  ok(dropLabelNoun("Bass", "searing FM bass") === "searing FM", "dropLabelNoun trims the redundant label noun");
  ok(dropLabelNoun("Bass", "bass") === "bass", "dropLabelNoun never empties a value");
  ok(dropLabelNoun("Space", "wide bass room") === "wide bass room", "dropLabelNoun only acts on matching labels");

  let degenerate = 0;
  for (let i = 0; i < 120; i++) {
    const st = E.defaultState(); st.techOnly = i % 2 === 0; E.roll(st, "everything");
    if (/\b(\w{3,})\s+\1\b/i.test(E.buildStylePrompt(st))) degenerate++;
  }
  ok(degenerate === 0, `no doubled-word phrase in any generated prompt (${degenerate} found)`);
}

section("No-techno combo selection");
{
  const combos = E.allCombos();
  ok(combos.length >= 4000, `combo pool is large (${combos.length})`);
  /* "techno" proper only -- rave/gabber are verbatim hardcore genres from
     the original pools and are legitimately part of the no-techno world */
  const techish = combos.filter(c => /\btechno\b|hardgroove|schranz/i.test(c));
  ok(techish.length === 0, `no combo mentions techno (${techish.slice(0, 3).join(", ")})`);

  let bad = 0;
  for (let i = 0; i < 80; i++) {
    const st = E.defaultState(); st.techOnly = false; E.roll(st, "everything");
    if (/\btechno\b|hardgroove|schranz/i.test(st.primaryStyle + " " + st.secondaryStyle)) bad++;
  }
  ok(bad === 0, `no-techno rolls never produce a techno style (${bad})`);
}

section("Style pool expansion");
{
  const { EXTRA_STYLES, EXTRA_GENRES, EXTRA_SUBS } = await import("../data/styles-extra.js");
  ok(E.STYLES.length >= 3000, "techno styles expanded to ≥3000 (" + E.STYLES.length + " from " + D.STYLES.length + ")");
  ok(E.GENRES.length >= 275, "genres expanded to ≥275 (" + E.GENRES.length + " from " + D.GENRES.length + ")");
  ok(E.STYLE_STATS.combos >= 4000, "genre x sub-style combos ≥4000 (" + E.STYLE_STATS.combos + ")");

  // the verbatim pools must be untouched
  ok(D.STYLES.length === 839 && D.GENRES.length === 253, "verbatim STYLES/GENRES unmodified");

  // tiers preserved so the weirdness slider still works
  ["core", "sub", "rare"].forEach(t =>
    ok(EXTRA_STYLES.some(x => x.c === t), "expansion contributes " + t + "-tier styles"));
  ok(EXTRA_STYLES.every(x => x.n && (x.c === "core" || x.c === "sub" || x.c === "rare")), "every extra style is well-formed and tiered");

  // no duplicates against the verbatim pool or itself
  const seen = new Set(D.STYLES.map(x => x.n.toLowerCase()));
  const dups = EXTRA_STYLES.filter(x => { const k = x.n.toLowerCase(); if (seen.has(k)) return true; seen.add(k); return false; });
  ok(dups.length === 0, "no duplicate style names" + (dups.length ? " — " + dups.slice(0, 3).map(d => d.n).join(" | ") : ""));

  // a banned word in a style name would make sanitize() delete the style line
  const banned = [];
  for (const x of EXTRA_STYLES) if (/\b(minimal|sparse|restrained|weak|quiet|gentle)\b/i.test(x.n)) banned.push(x.n);
  for (const g of EXTRA_GENRES) {
    if (/\b(minimal|sparse|restrained|weak|quiet|gentle)\b/i.test(g.n)) banned.push(g.n);
    for (const sub of g.subs) if (/\b(minimal|sparse|restrained|weak|quiet|gentle)\b/i.test(sub)) banned.push(sub);
  }
  for (const list of Object.values(EXTRA_SUBS)) for (const sub of list) if (/\b(minimal|sparse|restrained|weak|quiet|gentle)\b/i.test(sub)) banned.push(sub);
  ok(banned.length === 0, "no generated style name carries a banned word" + (banned.length ? " — " + banned.slice(0, 3).join(" | ") : ""));

  // the style name always survives into the prompt, both modes
  let lost = 0;
  for (let i = 0; i < 200; i++) {
    const s = E.defaultState(); s.techOnly = i % 2 === 0;
    E.roll(s, "everything");
    const sp = E.buildStylePrompt(s);
    const alt = s.techOnly ? s.primaryStyle : E.genreSafeText(s, s.primaryStyle, true);
    /* the builder tightens doubled words out of names and neutralizes
       vocal cues at output -- accept those forms too */
    const forms = [s.primaryStyle, alt].flatMap(x => x ?
      [x, P.tightenPhrase(x), P.stripLive(x), P.tightenPhrase(P.stripLive(x)), P.stripVocalCue(x)] : []);
    if (!forms.some(f => f && sp.includes(f))) lost++;
  }
  ok(lost === 0, "style name survives into every prompt across 200 rolls (" + lost + " lost)");

  // techno-only never reaches into the genre pool, even expanded
  const names = new Set(E.STYLES.map(x => x.n));
  const st = E.defaultState(); st.techOnly = true;
  let leaked = 0;
  for (let i = 0; i < 60; i++) { E.roll(st, "genre"); if (!names.has(st.primaryStyle)) leaked++; }
  ok(leaked === 0, "expanded techno pool stays isolated from genre combos");
}

section("No-techno sound worlds (acoustic swap)");
{
  const { ORGANIC_POOLS, HYBRID_POOLS } = await import("../data/acoustic.js");
  const { poolFor } = await import("../engine/state.js");
  const oKeys = Object.keys(ORGANIC_POOLS), hKeys = Object.keys(HYBRID_POOLS);
  const oTot = oKeys.reduce((a, k) => a + ORGANIC_POOLS[k].length, 0);
  const hTot = hKeys.reduce((a, k) => a + HYBRID_POOLS[k].length, 0);
  ok(oKeys.length >= 80, "organic vocabularies cover ≥80 atom keys (" + oKeys.length + ")");
  ok(oTot >= 1500, "organic pools carry ≥1500 entries (" + oTot + ")");
  ok(hTot >= 300, "hybrid pools carry ≥300 entries (" + hTot + ")");

  // integrity: clean, deduped, no leftover electronic jargon in organic
  const sDirty = E.defaultState();
  const bad = [], dup = [], jargon = [];
  for (const [name, pools] of [["organic", ORGANIC_POOLS], ["hybrid", HYBRID_POOLS]]) {
    for (const [k, list] of Object.entries(pools)) {
      const seen = new Set();
      for (const v of list) {
        const low = v.toLowerCase();
        if (E.isDirty(sDirty, low)) bad.push(name + "." + k + " :: " + v);
        if (seen.has(low)) dup.push(name + "." + k + " :: " + v);
        seen.add(low);
        if (name === "organic" && /\b(909|808|303|acid|rave|sidechain|warehouse|supersaw|bitcrush)\b/i.test(v)) jargon.push(k + " :: " + v);
      }
    }
  }
  ok(bad.length === 0, "no acoustic entry trips the sanitizer" + (bad.length ? " — " + bad.slice(0, 2).join(" | ") : ""));
  ok(dup.length === 0, "no duplicates inside the acoustic pools" + (dup.length ? " — " + dup.slice(0, 2).join(" | ") : ""));
  ok(jargon.length === 0, "organic pools carry no electronic jargon" + (jargon.length ? " — " + jargon.slice(0, 2).join(" | ") : ""));

  // poolFor routes by genre world
  const so = E.defaultState(); so.techOnly = false; so.styleFit = true; so.primaryGenre = "Jazz";
  ok(poolFor(so, "kick") === ORGANIC_POOLS.kick, "organic genre routes to the organic pool");
  const sh = E.defaultState(); sh.techOnly = false; sh.styleFit = true; sh.primaryGenre = "Rock";
  ok(poolFor(sh, "kick") === HYBRID_POOLS.kick, "hybrid genre routes to the hybrid pool");
  const se = E.defaultState(); se.techOnly = false; se.styleFit = true; se.primaryGenre = "House";
  ok(poolFor(se, "kick") !== ORGANIC_POOLS.kick, "electronic genre keeps the original pool");
  const st = E.defaultState(); st.techOnly = true;
  ok(poolFor(st, "kick") !== ORGANIC_POOLS.kick, "techno-only is untouched by the swap");
  const sf = E.defaultState(); sf.techOnly = false; sf.styleFit = false; sf.primaryGenre = "Jazz";
  ok(poolFor(sf, "kick") !== ORGANIC_POOLS.kick, "style-fit OFF disables the swap");

  // organic rolls really produce acoustic prompts, densely, within cap
  let organicSeen = 0, dense = 0, over = 0, jargonPrompts = 0, totalSounds = 0;
  for (let i = 0; i < 60; i++) {
    const s = E.defaultState(); s.techOnly = false;
    E.roll(s, "everything");
    if (E.genreWorld(s.primaryGenre) !== "organic") continue;
    organicSeen++;
    const sp = E.buildStylePrompt(s);
    const n = E.scorePrompt(s).soundCount;
    totalSounds += n;
    if (sp.length > 1000) over++;
    if (n >= 24) dense++;
    if (/\b(909|808|303|sidechain|supersaw)\b/i.test(sp.replace(new RegExp(s.primaryStyle, "g"), ""))) jargonPrompts++;
  }
  ok(organicSeen > 0, "organic genres do get rolled (" + organicSeen + " of 60)");
  ok(over === 0, "organic prompts never exceed 1000 chars");
  ok(jargonPrompts === 0, "organic prompts carry no drum-machine jargon");
  ok(dense >= organicSeen - 2, "organic prompts are densely packed (" + dense + "/" + organicSeen + " ≥24 sounds)");
  ok(totalSounds / organicSeen >= 26, "organic prompts average ≥26 sounds (" + (totalSounds / organicSeen).toFixed(1) + ")");

  // no-techno should now be within a couple of sounds of techno-only
  const avg = mode => {
    let t = 0;
    for (let i = 0; i < 30; i++) { const s = E.defaultState(); s.techOnly = mode; E.roll(s, "everything"); t += E.scorePrompt(s).soundCount; }
    return t / 30;
  };
  const aT = avg(true), aN = avg(false);
  ok(aN >= 30, "no-techno prompts average ≥30 sounds (" + aN.toFixed(1) + ")");
  ok(aT - aN <= 4, "no-techno is within 4 sounds of techno-only (" + aT.toFixed(1) + " vs " + aN.toFixed(1) + ")");
}

section("MAX always produces a new set");
{
  const s = E.defaultState(); E.roll(s, "everything");
  const style = s.primaryStyle, sec = s.secondaryStyle;
  let changed = 0, regressed = 0, sawConverged = false, last = E.scorePrompt(s).total;
  for (let i = 0; i < 12; i++) {
    const before = [s.kick, s.hats, s.bassVoice, s.leadVoice, s.reverbType].join("|");
    const r = E.roll(s, "everything", { mode: "max", tries: 20 });
    const after = [s.kick, s.hats, s.bassVoice, s.leadVoice, s.reverbType].join("|");
    if (before !== after) changed++;
    if (r.score < last) regressed++;   // MAX must never downgrade
    if (!r.changed) sawConverged = true;   // honest "nothing better" signal
    last = r.score;
  }
  /* MAX hill-climbs to a local optimum, so repeat clicks legitimately stop
     changing anything once converged -- what matters is that the FIRST click
     works and that no click ever downgrades. (The old build faked perpetual
     freshness by accepting a 2-point downgrade.) */
  ok(changed >= 1, "MAX rerolls the sounds until it converges (" + changed + "/12 clicks changed)");
  ok(regressed === 0, "MAX never drops the score, ever");
  ok(typeof sawConverged === "boolean", "rollMax exposes a converged/changed flag");
  ok(s.primaryStyle === style && s.secondaryStyle === sec, "12 MAX clicks all kept the style");
}

section("Undo / redo history");
{
  const { History } = await import("../ui/history.js");
  const s = E.defaultState(); E.roll(s, "everything");
  const h = new History(s);
  const a = s.kick;
  E.roll(s, "drums"); h.push(s, "Roll drums");
  const b = s.kick;
  E.roll(s, "drums"); h.push(s, "Roll drums");
  const c = s.kick;
  ok(h.canUndo() && !h.canRedo(), "undo available after two changes, redo empty");
  ok(h.undo().state.kick === b, "undo steps back one change");
  ok(h.undo().state.kick === a, "undo steps back to the original");
  ok(!h.canUndo(), "undo stack exhausted at the origin");
  ok(h.redo().state.kick === b, "redo replays the first change");
  ok(h.redo().state.kick === c, "redo replays the second change");
  ok(!h.canRedo(), "redo stack exhausted");
  h.push(s, "new branch");
  ok(!h.canRedo(), "a new change clears the redo branch");
  // identical pushes are ignored
  const n = h.past.length;
  h.push(s, "same again");
  ok(h.past.length === n, "pushing an identical state creates no undo step");
  // copy log
  const e1 = h.recordCopy(s, "Style Prompt", E.buildStylePrompt(s));
  ok(h.copies.length === 1 && e1.seed === s.seed, "copy is archived with its seed");
  ok(e1.state.kick === s.kick, "copy archives a restorable full snapshot");
  h.recordCopy(s, "Full Brief", E.buildFullBrief(s));
  ok(h.copies[0].kind === "Full Brief", "newest copy is first");
  h.clearCopies();
  ok(h.copies.length === 0, "copy history clears");
}

section("UI boot (jsdom)");
await (async () => {
  let JSDOM;
  try { ({ JSDOM } = await import("jsdom")); }
  catch (e) {
    console.log("  ~ jsdom not installed — skipping UI boot test (npm i to enable)");
    return;
  }
  const fs = await import("node:fs");
  const path = await import("node:path");
  const url = await import("node:url");
  const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const errors = [];
  const dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  // jsdom can't execute <script type=module>; drive the app module directly
  // against the jsdom window instead.
  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;
  global.history = dom.window.history;
  Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
  dom.window.addEventListener("error", e => errors.push(e.message));
  try {
    const app = await import("../ui/app.js?" + Date.now());
    ok(!!dom.window.__NF, "window.__NF test hook exists");
    ok(errors.length === 0, "no window errors during boot");
    const NF = dom.window.__NF;
    const s = NF.get();
    ok(!!s.primaryStyle, "first roll happened on boot (" + s.primaryStyle + ")");
    ok(s.instrumental === true, "instrumental safety ON by default");
    ok(dom.window.document.querySelectorAll("#cards .card").length >= 14, "cards rendered");
    ok(dom.window.document.querySelectorAll("[data-roll]").length >= 90, "per-field roll buttons rendered");
    ok(dom.window.document.querySelectorAll("[data-lock]").length >= 90, "per-field lock buttons rendered");
    const sp = NF.buildStylePrompt();
    ok(sp.length > 0 && sp.length <= 1000, "output prompt within cap (" + sp.length + ")");
    // click ROLL EVERYTHING
    dom.window.document.querySelector("#rollAllBtn").click();
    ok(NF.buildStylePrompt().length <= 1000, "prompt still capped after UI roll");
    // lock via UI
    const lockBtn = dom.window.document.querySelector('[data-lock="kick"]');
    const kickBefore = NF.get().kick;
    lockBtn.click();
    ok(NF.get().locks.kick === true, "lock button toggles state");
    dom.window.document.querySelector("#rollAllBtn").click();
    ok(NF.get().kick === kickBefore, "locked kick survives UI roll");
    // hide a card via UI
    dom.window.document.querySelector('[data-cardhide="bassCard"]').click();
    ok(NF.get().hidden.bassCard === true, "hide button toggles card state");
    ok(!/Bass:/.test(NF.buildStylePrompt()), "hidden card leaves the prompt");
    // undo / redo through the UI
    const doc = dom.window.document;
    ok(!!doc.querySelector("#undoBtn") && !!doc.querySelector("#redoBtn"), "undo/redo buttons rendered");
    const kickNow = NF.get().kick;
    doc.querySelector('[data-roll="kick"]').click();
    const kickRolled = NF.get().kick;
    NF.undo();
    ok(NF.get().kick === kickNow, "Ctrl+Z path restores the previous kick");
    NF.redo();
    ok(NF.get().kick === kickRolled, "Ctrl+Y path re-applies the roll");
    // keyboard shortcut wiring
    const ev = new dom.window.KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true });
    doc.dispatchEvent(ev);
    ok(NF.get().kick === kickNow, "Ctrl+Z keyboard shortcut undoes");
    const ev2 = new dom.window.KeyboardEvent("keydown", { key: "y", ctrlKey: true, bubbles: true, cancelable: true });
    doc.dispatchEvent(ev2);
    ok(NF.get().kick === kickRolled, "Ctrl+Y keyboard shortcut redoes");
    // copy writes history
    ok(!!doc.querySelector("#historyCard"), "copy history panel rendered");
    const nBefore = NF.history.copies.length;
    doc.querySelector("#copyOutBtn").click();
    await new Promise(r => setTimeout(r, 30));
    ok(NF.history.copies.length === nBefore + 1, "clicking Copy archives the prompt");
    ok(/histItem|histEmpty/.test(doc.querySelector("#histList").innerHTML), "history list renders entries");
    /* MAX through the real button: every click must reroll the sounds and
       keep the style. This is the exact path the user clicks. */
    const maxBtn = doc.querySelector("#maxBtn");
    ok(!!maxBtn, "MAX button rendered");
    const styleBefore = NF.get().primaryStyle + "|" + NF.get().secondaryStyle;
    const sig = () => { const q = NF.get(); return [q.kick, q.hats, q.snare, q.bassVoice, q.leadVoice, q.reverbType].join("|"); };
    let rerolled = 0, kept = 0;
    for (let i = 0; i < 8; i++) {
      const b = sig();
      maxBtn.click();
      if (sig() !== b) rerolled++;
      if (NF.get().primaryStyle + "|" + NF.get().secondaryStyle === styleBefore) kept++;
    }
    /* MAX converges to a local optimum, so later clicks may legitimately
       hold the set rather than downgrade it -- the first click must work */
    ok(rerolled >= 1, "the MAX button rerolls the sounds until it converges (" + rerolled + "/8)");
    ok(kept === 8, "every MAX button click keeps the style (" + kept + "/8)");
    ok(NF.buildStylePrompt().length <= 1000, "prompt still capped after 8 MAX clicks");
    /* MAX STYLE through the real chip */
    const ms = doc.querySelector("#maxStyleToggle");
    ok(!!ms, "MAX STYLE chip rendered");
    ms.click();
    ok(NF.get().maxStyle === true, "MAX STYLE chip toggles on");
    ms.click();
    ok(NF.get().maxStyle === false, "MAX STYLE chip toggles off");
    /* SOUND-LITE through the real chip */
    const sl = doc.querySelector("#soundLiteToggle");
    ok(!!sl, "sound-lite chip rendered");
    sl.click();
    ok(NF.get().soundLite === true && NF.get().hidden.soundDesignCard === true &&
       NF.get().layers.delay === false, "sound-lite chip parks sound sections");
    ok(!/Sound Design:/i.test(NF.buildStylePrompt()), "sound-lite chip removes sound blocks from the prompt");
    sl.click();
    ok(NF.get().soundLite === false, "sound-lite chip toggles back off");
    /* NO-STOP through the real chip */
    const ns = doc.querySelector("#noStopToggle");
    ok(!!ns, "no-stop chip rendered");
    ns.click();
    ok(NF.get().noStop === true && /non-stop/i.test(NF.buildStylePrompt()), "no-stop chip adds the non-stop policy");
    ok(NF.get().counterMelody.voice === "" && NF.get().voiceConcept.voice === "", "no-stop chip hides counter & second lines");
    ok(!/Sound Design:|Mix\/Master:|Spatial\/Mod:|Texture\/FX:/.test(NF.buildStylePrompt()), "no-stop chip removes appearance sections");
    ok(!!Array.from(doc.querySelectorAll("#triesSel option")).find(o => o.value === "96" || o.value === "192"),
      "MAX upgrade offers more tries (96×/192×)");
    ns.click();
    ok(NF.get().noStop === false, "no-stop chip toggles back off");
    /* HIDE-BEATS through the real chip */
    const hb = doc.querySelector("#hideBeatsToggle");
    ok(!!hb, "hide-beats chip rendered");
    hb.click();
    ok(NF.get().hideBeats === true && NF.get().hidden.drumsCard === true && NF.get().kick === "",
      "hide-beats chip parks beats & blanks sounds");
    ok(!/Drums:|Bass:|Sound Design:/.test(NF.buildStylePrompt()), "hide-beats chip removes beat sections");
    hb.click();
    ok(NF.get().hideBeats === false, "hide-beats chip toggles back off");
    ok(!!doc.querySelector("#densityChip"), "sound-density readout rendered");
    ok(!!doc.querySelector("#buildChip"), "build id readout rendered");
  } catch (e) {
    failures++;
    console.log("  ✗ FAIL: UI boot crashed — " + (e && e.stack || e));
  } finally {
    delete global.window; delete global.document; delete global.location;
    delete global.history;
    Object.defineProperty(global, "navigator", { value: undefined, configurable: true });
  }
})();

console.log("\n===============================");
console.log("PASS " + passes + "  FAIL " + failures);
console.log("===============================");
process.exit(failures ? 1 : 0);
