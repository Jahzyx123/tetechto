/* ui/app.js — NEON FORGE shell.
   One roll-button family driving the unified engine roll(scope, mode):
   - per-field roll / lock / manual pick (from ATOMS + PICKER_POOLS)
   - per-section roll + hide
   - global ROLL (everything) and MAX (maximize score over N tries)
   - output tabs: Style Prompt (≤1000) / Full Brief (≤3000)
   - shareable state via ?s= URL param, deterministic per seed. */
import { ATOMS, PICKER_POOLS } from "../data/atoms.js";
import { LAYERS } from "../data/safety.js";
import {
  defaultState, roll, rollBatch, buildStylePrompt, buildFullBrief, scorePrompt,
  encodeState, decodeState, setSeed, weirdMix, clone,
  SOUND_CARDS, unhideAllSoundCards, autoFitSounds, setSoundLite, setNoStop, setHideBeats, STYLE_STATS,
  CONCEPT_POOL, MELODY_CONCEPT_POOL, ARRANGEMENTS_FULL,
  SPARK_KINDS, EXTRA_KINDS, MAGIC2_KINDS, SPARK_STATS, rollSpark, kindPool,
  applyTitle, applyMashup, applyTransform, applyChallenge,
  megaChaos, luckyDip, timeMachine, randomFocus, anthemIdea, maxAnthemIdea, keyName
} from "../engine/index.js";
import { openPicker } from "./picker.js";
import { History, bindUndoKeys } from "./history.js";
import { Library, defaultName } from "./library.js";
import { Compare } from "./compare.js";
import { BUILD } from "./version.js";

/* ---------------------------- state ---------------------------- */
export let state = loadInitialState();
setSeed(state.seed);

/* undo/redo + copy log (Ctrl+Z / Ctrl+Y, and every Copy is archived) */
export const history = new History(state);
export const library = new Library();
export const compare = new Compare();
let libQuery = "", libStarred = false, showLibrary = false, showCompare = false;

/* ------------------------ batch lab + session ------------------------ */
let showBatch = false, batch = [], batchSize = 8;

/* Session autosave: the whole state is persisted shortly after every
   change, and restored when you come back without a ?s= share link.
   Share links always win so a pasted URL is never clobbered. */
const SESSION_KEY = "neonforge.session.v1";
let sessionTimer = null;
export function persistSessionNow() {
  try {
    if (globalThis.localStorage) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ v: 1, at: Date.now(), state }));
    }
  } catch { /* quota / privacy mode — autosave is best-effort */ }
}
function persistSessionSoon() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(persistSessionNow, 250);
}
export function loadPersistedSession() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !data.state || typeof data.state.seed !== "number") return null;
    /* defaultState() fills in any keys a future/older version lacks */
    const s = defaultState();
    Object.assign(s, clone(data.state));
    return s;
  } catch { return null; }
}
function commit(label) { history.push(state, label); }
function applySnapshot(snap) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, snap);
  setSeed(state.seed);
  render(); updateURL(); persistSessionSoon();
}
function doUndo() {
  const r = history.undo();
  if (!r) return toast("Nothing to undo");
  applySnapshot(r.state);
  toast("↩ Undo — " + (r.label || "change") + (history.canUndo() ? "" : " (oldest)"));
}
function doRedo() {
  const r = history.redo();
  if (!r) return toast("Nothing to redo");
  applySnapshot(r.state);
  toast("↪ Redo — " + (r.label || "change"));
}

function loadInitialState() {
  /* priority: ?s= share link > autosaved session > fresh roll */
  const q = new URLSearchParams(location.search).get("s");
  if (q) { const s = decodeState(q); if (s) return s; }
  const saved = loadPersistedSession();
  if (saved) return saved;
  const s = defaultState();
  roll(s, "everything");
  return s;
}

/* ---------------------------- card atlas ---------------------------- */
const CARD_DEFS = [
  { id: "styleCard", title: "Style", scope: "genre" },
  { id: "feelCard", title: "Feeling & Melody", scope: "feel-melody" },
  { id: "bassCard", title: "Bass", scope: "bass" },
  { id: "drumsCard", title: "Drums", scope: "drums" },
  { id: "technoLabCard", title: "Techno Lab", scope: "technoLab" },
  { id: "harmonyLabCard", title: "Harmony Lab", scope: "harmony" },
  { id: "rhythmLabCard", title: "Rhythm Lab", scope: "rhythm" },
  { id: "soundDesignCard", title: "Sound Design", scope: "soundDesign" },
  { id: "mixMasterCard", title: "Mix & Master", scope: "mixMaster" },
  { id: "spatialModCard", title: "Spatial & Mod", scope: "spatialMod" },
  { id: "grooveMelodicCard", title: "Groove & Melodic", scope: "grooveMelodic" },
  { id: "textureFxCard", title: "Texture & FX", scope: "textureFx" },
  { id: "conceptCard", title: "Concept", scope: "concept" },
  { id: "arrangementCard", title: "Arrangement", scope: "arrangement" },
  { id: "layersCard", title: "Detail Layers", scope: null }
];
const ATOMS_BY_CARD = {};
ATOMS.forEach(a => { (ATOMS_BY_CARD[a.card] = ATOMS_BY_CARD[a.card] || []).push(a); });

/* ---------------------------- helpers ---------------------------- */
const $ = sel => document.querySelector(sel);
export function escapeHtml(x) { return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
let toastTimer;
export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}
function copyText(text, label) {
  /* Archive first: the snapshot is worth keeping even if the clipboard
     write is blocked (insecure origin, permissions, headless). */
  history.recordCopy(state, label || "Copied", text);
  renderHistory();
  const done = () => toast("📋 " + (label || "Copied") + " — saved to history");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); }
  catch { toast("Clipboard blocked — but it's saved in history"); }
  ta.remove();
}
function updateURL() {
  /* window.history — NOT the local History instance, which shadows the
     global name. (Calling history.replaceState here used to throw inside
     the try/catch, so the ?s= share URL silently never updated.) */
  try { window.history.replaceState(null, "", location.pathname + "?s=" + encodeState(state)); } catch { }
}
export function afterChange() { render(); updateURL(); persistSessionSoon(); }

function atomValue(a) {
  if (a.display) { try { return a.display(state); } catch { return ""; } }
  if (a.key === "melodyConcept") { const mc = state.melodyConcept || {}; return mc.hook || mc.story || ""; }
  if (a.key === "concept") { const c = state.concept || {}; return c.title ? c.title + (c.world ? " — " + c.world : "") : ""; }
  if (a.field) return state[a.field];
  return "";
}

/* ---------------------------- actions ---------------------------- */
let maxClicks = 0;
function doRoll(scope, mode) {
  const tries = +($("#triesSel") ? $("#triesSel").value : 24);
  /* The Style card's own MAX is the one place style is always in scope —
     that's its whole job (the card rolls the style). Everywhere else the
     chip decides: keep style by default, or optimize style too. */
  const keepStyle = scope === "genre" ? false : !state.maxStyle;
  const res = roll(state, scope, { mode: mode || "random", tries, keepStyle });
  if (mode === "max") {
    const styleNote = keepStyle ? "style kept" : "style optimized";
    toast(res.improved
      ? "⭐ Improved to " + res.score + " in " + res.tries + " tries — " + styleNote
      : res.variation
        ? "⭐ Fresh set #" + (++maxClicks) + " at the same top score (" + res.score + ") — " + styleNote
        : "⭐ Peak reached (" + res.score + ") — " + res.tries + " tries found nothing better. Reroll or tweak a field to escape it.");
  }
  commit((mode === "max" ? "MAX " : "Roll ") + scope);
  afterChange();
}
function toggleLock(key) { state.locks[key] = !state.locks[key]; commit((state.locks[key] ? "Lock " : "Unlock ") + key); afterChange(); }
function toggleHide(id) { state.hidden[id] = !state.hidden[id]; commit((state.hidden[id] ? "Hide " : "Show ") + id); afterChange(); }
function setMode(techOnly) {
  state.techOnly = techOnly;
  if (techOnly) {
    unhideAllSoundCards(state, SOUND_CARDS);
    /* SOUND-LITE / NO-STOP / HIDE-BEATS win over the mode switch: bring
       back any sections they had parked so a mode change can't silently
       resurrect them. */
    if (state.soundLite) setSoundLite(state, true);
    if (state.noStop) setNoStop(state, true);
    if (state.hideBeats) setHideBeats(state, true);
    state.lastFitGenre = "";
  }
  doRoll("genre");
}

/* 🔇 SOUND-LITE — park every "sound appearance" section (delay, FX, mix,
   spatial, ensemble) and let melody / pattern / harmony fill the prompt;
   the parked values are still packed afterwards if there is room left. */
function toggleSoundLite() {
  const on = !state.soundLite;
  const r = setSoundLite(state, on);
  commit("Sound-lite " + (on ? "on" : "off"));
  afterChange();
  toast(on
    ? "🔇 Sound sections parked (" + r.hid + ") — melody & pattern first"
    : "🔊 Sound sections restored (" + r.restored + ")");
}

/* ⛓ NO-STOP — non-stop beat: no break, no bridge, no gap. Sets a no-break
   arrangement/arc, drops [Breakdown] from the tags and adds the explicit
   "no breaks" policy to every prompt. */
function toggleNoStop() {
  const on = !state.noStop;
  setNoStop(state, on);
  commit("No-stop beat " + (on ? "on" : "off"));
  afterChange();
  toast(on
    ? "⛓ Non-stop — ultra delivery, zero breaks, beat never stops"
    : "▶ Standard arrangement restored — counter & sounds back");
}

/* 🥁 HIDE-BEATS — melody-only. Removes every drum, beat, bass and sound
   atom; only the style / melody / pattern command text reaches the
   prompt, so nothing extra appears in the song. */
function toggleHideBeats() {
  const on = !state.hideBeats;
  const r = setHideBeats(state, on);
  commit("Hide-beats " + (on ? "on" : "off"));
  afterChange();
  toast(on
    ? "🥁 Beats & sounds hidden — melody pattern only (" + r.hid + " sections parked)"
    : "🥁 Beats, bass & sounds restored");
}

/* One-click "give me a combo with no techno in it": force No-Techno mode
   and roll a fresh genre + sub-style combo, whatever mode we were in. The
   combo pool is already techno-free, so switching modes is the whole job. */
function rollNoTechnoCombo() {
  const wasTechno = state.techOnly;
  state.techOnly = false;
  if (wasTechno) { state.primaryStyle = ""; state.secondaryStyle = ""; }
  for (const k of ["primaryStyle", "secondaryStyle", "primaryGenre", "secondaryGenre"]) {
    if (state.locks) state.locks[k] = false;
  }
  doRoll("genre");
}

/* 🆕 New — a clean-slate roll. Mode, weirdness and the output toggles are
   carried over (that's "your" setup); everything rolled is re-rolled and
   every lock/hidden card is reset so nothing stale survives. */
function startFresh() {
  const keep = {
    techOnly: state.techOnly, weirdness: state.weirdness, equalChance: state.equalChance,
    instrumental: state.instrumental, styleFit: state.styleFit, noHandPerc: state.noHandPerc,
    influence: state.influence, duration: state.duration, melodicForce: state.melodicForce,
    structure: state.structure, maxStyle: state.maxStyle
  };
  const s = defaultState();
  Object.assign(s, keep);
  roll(s, "everything");
  applySnapshot(s);
  commit("New prompt");
  toast("🆕 Fresh prompt — settings kept, everything re-rolled");
}

/* ---------------------------- top bar ---------------------------- */
/* a11y pattern for every mode chip: a real <button> (keyboard-operable,
   focusable) with aria-pressed reflecting on/off, instead of a clickable
   <span> that assistive tech can't see or reach. */
const chipBtn = (id, on, title, label) =>
  `<button type="button" class="chip ${on ? "on" : ""}" id="${id}" aria-pressed="${on ? "true" : "false"}" title="${title}">${label}</button>`;

function renderTopbar() {
  const el = $("#topbar");
  const m = weirdMix(state.weirdness);
  const pct = x => Math.round(x * 100);
  /* Remember which control had focus: the topbar is rebuilt on every
     render, and losing focus after each toggle is hostile to keyboard
     users. We restore it by id right after the rebuild. */
  const active = document.activeElement;
  const focusId = active && active.id && el.contains(active) ? active.id : "";
  el.innerHTML = `
    <span class="logo">NEON FORGE</span>
    <span class="seg" id="modeSeg">
      <button data-mode="techno" class="${state.techOnly ? "on" : ""}" title="${STYLE_STATS.styles} techno styles">TECHNO-ONLY</button>
      <button data-mode="all" class="${!state.techOnly ? "on" : ""}" title="${STYLE_STATS.genres} genres · ${STYLE_STATS.combos} sub-style combos">NO-TECHNO</button>
    </span>
    <button class="btn" id="libBtn" title="Saved prompt library (L)">📚 LIBRARY</button>
    <button class="btn" id="cmpBtn" title="A/B compare two candidates (C)">⚖ COMPARE</button>
    <button class="btn" id="batchBtn" title="Batch lab — roll ranked candidate prompts (G)">⚡ BATCH</button>
    <button class="btn" id="noTechnoBtn" title="Switch to No-Techno and roll a fresh genre + sub-style combo (${STYLE_STATS.combos} combos, zero techno)">🚫 NO-TECHNO COMBO</button>
    <button class="btn primary" id="rollAllBtn" title="Roll every unlocked field (R)">🎲 ROLL EVERYTHING</button>
    <button class="btn" id="maxBtn" title="Reroll production N times keeping your primary/secondary style; re-click for another top-score variation">⭐ MAX</button>
    <button class="btn" id="keysBtn" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">⌨ KEYS</button>
    <span class="seg" id="undoSeg">
      <button id="undoBtn" title="Undo (Ctrl+Z)" ${history.canUndo() ? "" : "disabled"}>↩</button>
      <button id="redoBtn" title="Redo (Ctrl+Y)" ${history.canRedo() ? "" : "disabled"}>↪</button>
    </span>
    <select id="triesSel" title="Max tries — more tries = better MAX rolls">
      <option value="12">12×</option><option value="24" selected>24×</option><option value="48">48×</option>
      <option value="96">96×</option><option value="192">192×</option>
    </select>
    <label class="inline">Weird <input type="range" id="weirdRange" min="0" max="100" value="${state.weirdness}">
      <span class="readout"><b>${state.weirdness}</b> · core ${pct(m.core)}% / sub ${pct(m.sub)}% / rare ${pct(m.rare)}%</span></label>
    ${chipBtn("instToggle", state.instrumental, "Keep every vocal reference out of the output", "Instrumental")}
    ${chipBtn("eqToggle", state.equalChance, "Every style equally likely (ignores weirdness tiers)", "Equal chance")}
    ${chipBtn("handPercToggle", state.noHandPerc, "Remove tribal &amp; hand percussion, woodblocks, claps, shakers, stomps, jungle/breakbeat drums and trash-can / scrap-metal percussion from every roll", "No hand-perc")}
    ${chipBtn("fitToggle", state.styleFit, "Auto-hide electronic-only cards for organic genres", "Style-fit")}
    ${chipBtn("soundLiteToggle", state.soundLite, "Hide every sound-appearance section (delay, FX, mix, spatial, ensemble) so the Style Prompt fills with melody &amp; pattern; parked sounds are packed back ONLY if there is room left (H)", "🔇 SOUND-LITE")}
    ${chipBtn("noStopToggle", state.noStop, "Non-stop beat: no-break arrangement &amp; energy arc, no [Breakdown] tag, ultra delivery start-to-finish — and it hides the counter/2nd line plus every appearance section &amp; sound (half-time, lazy, samba rolls, fills, open-ride, drops, risers, Ensemble/Tone/Mix/Space/Texture/FX) (N)", "⛓ NO-STOP")}
    ${chipBtn("hideBeatsToggle", state.hideBeats, "Melody-only: remove all drums, beats, bass &amp; every sound-maker across the whole prompt — only the style, melody and pattern command text remains, so nothing extra appears in the song (B)", "🥁 HIDE BEATS")}
    ${chipBtn("maxStyleToggle", state.maxStyle, "Let MAX also swap Primary/Secondary style for a higher-scoring combination — off by default, so MAX keeps your style", "⭐ MAX STYLE")}
    ${chipBtn("structToggle", state.structure, "Append [Intro][Build][Drop]… tags", "Structure")}
    <label class="inline">Influence <select id="influenceSel">
      ${["subtle", "balanced", "strong"].map(v => `<option ${state.influence === v ? "selected" : ""}>${v}</option>`).join("")}
    </select></label>
    <label class="inline">Length <select id="durationSel">
      ${["compact", "standard", "extended"].map(v => `<option ${state.duration === v ? "selected" : ""}>${v}</option>`).join("")}
    </select></label>
    <label class="inline">Melody <select id="forceSel">
      ${["light", "balanced", "strong", "dominant"].map(v => `<option ${state.melodicForce === v ? "selected" : ""}>${v}</option>`).join("")}
    </select></label>
    <button type="button" class="chip" id="seedChip" title="Click to copy share link">seed ${state.seed}</button>
    <span class="readout" id="densityChip" title="How many rolled sounds reached the Style Prompt">sounds <b>${scorePrompt(state).soundCount}</b></span>
    <span class="readout" id="poolChip" title="Style pool in play">${state.techOnly ? STYLE_STATS.styles + " styles" : STYLE_STATS.combos + " combos"}</span>
    <span class="readout" id="buildChip" title="Build id — confirms which code your browser is running">build ${BUILD}</span>
  `;
  if (focusId) { const f = document.getElementById(focusId); if (f && !f.disabled && f.focus) f.focus(); }
  el.querySelector("#modeSeg").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    setMode(b.dataset.mode === "techno");
  });
  el.querySelector("#libBtn").addEventListener("click", () => { showLibrary = !showLibrary; renderOutput(); });
  el.querySelector("#cmpBtn").addEventListener("click", () => { showCompare = !showCompare; renderOutput(); });
  el.querySelector("#batchBtn").addEventListener("click", () => { showBatch = !showBatch; renderOutput(); });
  el.querySelector("#keysBtn").addEventListener("click", openShortcuts);
  el.querySelector("#noTechnoBtn").addEventListener("click", rollNoTechnoCombo);
  el.querySelector("#undoBtn").addEventListener("click", doUndo);
  el.querySelector("#redoBtn").addEventListener("click", doRedo);
  el.querySelector("#rollAllBtn").addEventListener("click", () => doRoll("everything"));
  el.querySelector("#maxBtn").addEventListener("click", () => doRoll("everything", "max"));
  el.querySelector("#weirdRange").addEventListener("change", e => { state.weirdness = +e.target.value; commit("Weirdness " + state.weirdness); afterChange(); });
  el.querySelector("#instToggle").addEventListener("click", () => { state.instrumental = !state.instrumental; commit("Instrumental " + (state.instrumental ? "on" : "off")); afterChange(); });
  el.querySelector("#eqToggle").addEventListener("click", () => { state.equalChance = !state.equalChance; commit("Equal chance " + (state.equalChance ? "on" : "off")); afterChange(); });
  el.querySelector("#handPercToggle").addEventListener("click", () => {
    state.noHandPerc = !state.noHandPerc;
    /* reroll so the change is visible immediately rather than only on the
       next roll -- and so any offending values already in state are replaced */
    if (state.noHandPerc) roll(state, "everything");
    commit("No hand-perc " + (state.noHandPerc ? "on" : "off"));
    afterChange();
    toast(state.noHandPerc ? "Hand percussion removed" : "Hand percussion allowed");
  });
  el.querySelector("#fitToggle").addEventListener("click", () => {
    state.styleFit = !state.styleFit;
    if (state.styleFit) { state.lastFitGenre = ""; autoFitSounds(state, { reRoll: false }); }
    else unhideAllSoundCards(state, SOUND_CARDS);
    if (state.soundLite) setSoundLite(state, true);
    commit("Style-fit " + (state.styleFit ? "on" : "off"));
    afterChange();
  });
  el.querySelector("#soundLiteToggle").addEventListener("click", toggleSoundLite);
  el.querySelector("#noStopToggle").addEventListener("click", toggleNoStop);
  el.querySelector("#hideBeatsToggle").addEventListener("click", toggleHideBeats);
  el.querySelector("#structToggle").addEventListener("click", () => { state.structure = !state.structure; commit("Structure " + (state.structure ? "on" : "off")); afterChange(); });
  el.querySelector("#maxStyleToggle").addEventListener("click", () => { state.maxStyle = !state.maxStyle; commit("MAX style " + (state.maxStyle ? "on" : "off")); afterChange(); });
  el.querySelector("#influenceSel").addEventListener("change", e => { state.influence = e.target.value; commit("Influence " + state.influence); afterChange(); });
  el.querySelector("#durationSel").addEventListener("change", e => { state.duration = e.target.value; commit("Length " + state.duration); afterChange(); });
  el.querySelector("#forceSel").addEventListener("change", e => { state.melodicForce = e.target.value; commit("Melody " + state.melodicForce); afterChange(); });
  el.querySelector("#seedChip").addEventListener("click", () => {
    copyText(location.origin + location.pathname + "?s=" + encodeState(state), "Share link");
  });
}

/* ---------------------------- cards ---------------------------- */
/* View-only collapse state (not part of the shared/rolled state): lets
   you shrink the 15-card wall down to the sections you care about. */
const collapsedCards = new Set();
function toggleCollapse(id) {
  if (collapsedCards.has(id)) collapsedCards.delete(id); else collapsedCards.add(id);
  render();
}
function collapseAll(on) {
  CARD_DEFS.concat({ id: "sparkCard" }).forEach(d => {
    if (on) collapsedCards.add(d.id); else collapsedCards.delete(d.id);
  });
  render();
}

function cardHtml(def) {
  const hidden = !!state.hidden[def.id];
  const collapsed = collapsedCards.has(def.id);
  const head = `
    <div class="head">
      <button type="button" class="collapse" data-collapse="${def.id}"
        aria-expanded="${collapsed ? "false" : "true"}"
        aria-label="${collapsed ? "Expand" : "Collapse"} ${def.title} card"
        title="${collapsed ? "Expand card" : "Collapse card"}">${collapsed ? "▸" : "▾"}</button>
      <h2>${def.title}</h2>
      ${def.scope ? `<button class="iconbtn" data-cardroll="${def.scope}" aria-label="Roll ${def.title} section" title="Roll this section">🎲</button>
      <button class="iconbtn" data-cardmax="${def.scope}" aria-label="Maximize ${def.title} section" title="Maximize this section">⭐</button>` : ""}
      <button class="iconbtn ${hidden ? "on" : ""}" data-cardhide="${def.id}" aria-pressed="${hidden ? "true" : "false"}" aria-label="${hidden ? "Show" : "Hide"} ${def.title} in prompt" title="${hidden ? "Show in prompt" : "Hide from prompt"}">${hidden ? "🙈" : "👁"}</button>
    </div>`;
  if (def.id === "layersCard") {
    return `<div class="card ${hidden ? "hiddenCard" : ""} ${collapsed ? "collapsed" : ""}" id="${def.id}">${head}
      <div id="layersWrap">${LAYERS.map(l => {
        const on = !!state.layers[l.id];
        return `<button type="button" class="chip ${on ? "on" : ""}" data-layer="${l.id}" aria-pressed="${on ? "true" : "false"}" title="${escapeHtml(l.phrase)}">${escapeHtml(l.label)}</button>`;
      }).join("")}
      </div></div>`;
  }
  const rows = (ATOMS_BY_CARD[def.id] || []).map(a => {
    const locked = !!state.locks[a.key];
    const pickable = !!a.pickEntry;
    const rowHide = (a.key === "bpm" || a.key === "key")
      ? `<button class="iconbtn ${state.hidden[a.key] ? "on" : ""}" data-rowhide="${a.key}" aria-pressed="${state.hidden[a.key] ? "true" : "false"}" aria-label="${state.hidden[a.key] ? "Show" : "Hide"} ${a.key} in prompt" title="Hide ${a.key} from prompt">${state.hidden[a.key] ? "🙈" : "👁"}</button>` : "";
    return `<div class="row ${locked ? "locked" : ""}">
      <span class="lab">${escapeHtml(a.label)}</span>
      <span class="val">${escapeHtml(atomValue(a) ?? "")}</span>
      <span class="ops">
        <button class="iconbtn" data-roll="${a.key}" aria-label="Roll ${escapeHtml(a.label)}" title="Roll">🎲</button>
        <button class="iconbtn ${locked ? "on" : ""}" data-lock="${a.key}" aria-pressed="${locked ? "true" : "false"}" aria-label="${locked ? "Unlock" : "Lock"} ${escapeHtml(a.label)}" title="${locked ? "Unlock" : "Lock"}">${locked ? "🔒" : "🔓"}</button>
        ${pickable ? `<button class="iconbtn" data-pick="${a.key}" aria-label="Manually pick ${escapeHtml(a.label)}" title="Pick manually">☰</button>` : ""}
        ${rowHide}
      </span>
    </div>`;
  }).join("");
  return `<div class="card ${hidden ? "hiddenCard" : ""} ${collapsed ? "collapsed" : ""}" id="${def.id}">${head}<div class="rows">${rows}</div></div>`;
}

function renderCards() {
  /* Collapse-all toolbar spans the grid (grid-column: 1 / -1 in CSS). */
  const toolbar = `
    <div id="cardsToolbar">
      <span class="readout">${CARD_DEFS.length} sections · ${collapsedCards.size} collapsed</span>
      <button type="button" class="btn small" id="collapseAllBtn" aria-label="Collapse all cards">▸ Collapse all</button>
      <button type="button" class="btn small" id="expandAllBtn" aria-label="Expand all cards">▾ Expand all</button>
    </div>`;
  $("#cards").innerHTML = toolbar + sparkHtml() + CARD_DEFS.map(cardHtml).join("");
}

/* ---------------------------- Idea Engine (sparks) ----------------------------
   Ported from the legacy Spark card: wildcards drawn from the 32 Spark
   pools (now alive — see engine/spark.js). Sparks never enter the prompt
   on their own; copy them as fuel or apply them into concept / style. */
let lastSparkText = "", lastSparkKindLabel = "", lastSparkMeta = "";
let extraSparkIdx = 0, magicSparkIdx = 0;
function setSpark(text, kindLabel, meta) {
  lastSparkText = text; lastSparkKindLabel = kindLabel; lastSparkMeta = meta || "";
  renderSparkReadout();
}
function renderSparkReadout() {
  const v = document.getElementById("sparkView");
  const m = document.getElementById("sparkMeta");
  if (v) v.textContent = lastSparkText || "— press any button for a random spark —";
  if (m) m.textContent = lastSparkMeta;
}
function sparkCtx() { return " · " + (state.bpm || 140) + " BPM · " + keyName(state); }
function showSpark(kind, text) {
  setSpark(text, kind.label, kind.emoji + " Random " + kind.label + " · " +
    kindPool(kind).length + " options in pool" + sparkCtx());
}
function doSpark(i) {
  const kind = SPARK_KINDS[i];
  if (!kind) return;
  showSpark(kind, rollSpark(kind));
}
function doSparkExtra() {
  const kind = EXTRA_KINDS[extraSparkIdx % EXTRA_KINDS.length];
  extraSparkIdx++;
  showSpark(kind, rollSpark(kind));
}
function doSparkMagic() {
  const kind = MAGIC2_KINDS[magicSparkIdx % MAGIC2_KINDS.length];
  magicSparkIdx++;
  showSpark(kind, rollSpark(kind));
}
const SPARK_APPLY = {
  title: { kind: "Title", fn: applyTitle, emoji: "🏷", label: "title", lockMsg: "Title is locked" },
  mashup: { kind: "Mash-up", fn: applyMashup, emoji: "🧬", label: "mash-up", lockMsg: "Primary style is locked" },
  transform: { kind: "Transform", fn: applyTransform, emoji: "🪄", label: "transform", lockMsg: "Transform is locked" },
  challenge: { kind: "Challenge", fn: applyChallenge, emoji: "🎯", label: "challenge", lockMsg: "Narrative is locked" }
};
function doSparkApply(which) {
  const a = SPARK_APPLY[which];
  if (!a) return;
  if (lastSparkKindLabel !== a.kind) { toast("Roll a " + a.kind.toLowerCase() + " spark first"); return; }
  if (!a.fn(state, lastSparkText)) { toast("🔒 " + a.lockMsg); return; }
  commit("Spark " + a.label);
  afterChange();
  toast(a.emoji + " " + a.kind + " applied to the concept");
}
function doSparkWild(which) {
  if (which === "mega") {
    commit("Mega chaos");
    const r = megaChaos(state);
    afterChange();
    setSpark("🔥 " + r.line, "Mega", "Mega Chaos Roll · score " + r.score + "/100" + sparkCtx());
    toast("🔥 Mega Chaos Roll — check the cards");
  } else if (which === "lucky") {
    commit("Lucky dip");
    const r = luckyDip(state);
    afterChange();
    setSpark("🎰 " + r.vibe, "Lucky Dip", "Lucky Dip · score " + r.score + "/100" + sparkCtx() +
      " · " + (state.primaryStyle || ""));
    toast("🎰 Lucky Dip rolled a whole fresh track");
  } else if (which === "time") {
    commit("Time machine");
    timeMachine(state);
    afterChange();
    setSpark("🕰 Time Machine: " + state.bpm + " BPM · " + keyName(state) + " · " +
      (state.duration || "standard"), "Time Machine",
      "Fresh tempo + key + duration + arrangement + energy shape");
    toast("🕰 Time Machine → " + state.bpm + " BPM · " + (state.duration || "standard"));
  } else if (which === "focus") {
    commit("Random focus");
    const r = randomFocus(state, 12);
    afterChange();
    setSpark("🧠 Random Focus optimized " + r.category + " → " + r.score + "/100",
      "Random Focus", r.category + " · maximize over 12 tries" + sparkCtx());
    toast("🧠 Random Focus → " + r.category + " best " + r.score + "/100");
  } else if (which === "anthem") {
    commit("Anthem idea");
    const out = anthemIdea(state);
    afterChange();
    setSpark("💥 " + out, "Anthem Idea", "Anthem Builder · Melody-Dominant" + sparkCtx());
    toast("💥 Anthem Idea forged");
  } else if (which === "maxanthem") {
    commit("Max anthem idea");
    const r = maxAnthemIdea(state, 20);
    afterChange();
    setSpark("⚡ " + r.out, "Anthem Idea", "Max Anthem Idea · melody maximized over 20 tries · score " +
      r.score + "/100" + sparkCtx());
    toast("⚡ Max Anthem Idea → " + r.score + "/100");
  }
}
function doSparkCopy() {
  if (!lastSparkText) { toast("Nothing to copy — roll a spark first"); return; }
  copyText("🎲 " + lastSparkKindLabel + "\n" + lastSparkText +
    "\n\nNEON FORGE · " + (state.primaryStyle || "") + " · " + (state.bpm || 140) + " BPM · " +
    keyName(state), "Spark");
}
function sparkHtml() {
  const collapsed = collapsedCards.has("sparkCard");
  const coreBtns = SPARK_KINDS.map((k, i) =>
    `<button type="button" class="btn small" data-spark="${i}" title="Roll a random ${k.label.toLowerCase()}">${k.emoji} ${k.label}</button>`).join("");
  const wildBtns = [
    ["mega", "🔥 Mega Chaos Roll", "Re-roll the whole production + spark title & transform"],
    ["lucky", "🎰 Lucky Dip", "Roll a whole surprise track — melody-dominant"],
    ["time", "🕰 Time Machine", "Fresh tempo / key / duration / arrangement / energy"],
    ["focus", "🧠 Random Focus", "MAX a random production category (keeps styles)"],
    ["anthem", "💥 Anthem Idea", "Title + vibe + transform, melody-dominant"],
    ["maxanthem", "⚡ Max Anthem Idea", "Maximize the melody, then forge the anthem"]
  ].map(([id, label, title]) =>
    `<button type="button" class="btn small" data-sparkwild="${id}" title="${title}">${label}</button>`).join("");
  const utilityBtns = [
    `<button type="button" class="btn small" data-sparkextra="1" title="Cycle the extra spark pools — weather / light / sounds / futures / anthem names">🎲 More spark</button>`,
    `<button type="button" class="btn small" data-sparkmagic="1" title="Cycle the second wave of spark pools — hooks, basslines, drum lines, Suno cues…">✨ Magic II</button>`,
    `<button type="button" class="btn small" data-sparkapply="title" title="Put the current title spark into the Concept title">🏷 Apply title</button>`,
    `<button type="button" class="btn small" data-sparkapply="mashup" title="Put the current mash-up into the Primary style">🧬 Apply mash-up</button>`,
    `<button type="button" class="btn small" data-sparkapply="transform" title="Put the current transform into the Concept transformation">🪄 Apply transform</button>`,
    `<button type="button" class="btn small" data-sparkapply="challenge" title="Put the current challenge into the Concept narrative">🎯 Apply challenge</button>`,
    `<button type="button" class="btn small" data-sparkcopy="1" title="Copy the current spark">📋 Copy spark</button>`
  ].join("");
  return `
  <div class="card sparkCard ${collapsed ? "collapsed" : ""}" id="sparkCard">
    <div class="head">
      <button type="button" class="collapse" data-collapse="sparkCard"
        aria-expanded="${collapsed ? "false" : "true"}"
        aria-label="${collapsed ? "Expand" : "Collapse"} Idea Engine card"
        title="${collapsed ? "Expand card" : "Collapse card"}">${collapsed ? "▸" : "▾"}</button>
      <h2>Idea Engine — Sparks &amp; Wildcards</h2>
      <span class="readout">${SPARK_STATS.entries} sparks loaded</span>
    </div>
    ${collapsed ? "" : `<div class="rows sparkbody">
      <div class="sparkView" id="sparkView">${escapeHtml(lastSparkText || "— press any button for a random spark —")}</div>
      <div class="readout sparkMeta" id="sparkMeta">${escapeHtml(lastSparkMeta)}</div>
      <div class="sparkrow">${coreBtns}</div>
      <div class="sparkrow">${wildBtns}</div>
      <div class="sparkrow">${utilityBtns}</div>
    </div>`}
  </div>`;
}

/* ---------------------------- output ---------------------------- */
let currentTab = "style";
function renderOutput() {
  const host = $("#output");
  const sp = buildStylePrompt(state);
  const fb = buildFullBrief(state);
  const text = currentTab === "style" ? sp : fb;
  const cap = currentTab === "style" ? 1000 : 3000;
  const score = scorePrompt(state);
  host.innerHTML = `
    <div class="card">
      <div id="outTabs" role="tablist" aria-label="Prompt output">
        <button data-tab="style" role="tab" aria-selected="${currentTab === "style" ? "true" : "false"}" class="${currentTab === "style" ? "on" : ""}">Style Prompt</button>
        <button data-tab="brief" role="tab" aria-selected="${currentTab === "brief" ? "true" : "false"}" class="${currentTab === "brief" ? "on" : ""}">Full Brief</button>
      </div>
      <div id="outbox">${escapeHtml(text)}</div>
      <div id="outmeta">
        <button class="btn small" id="copyOutBtn">📋 Copy</button>
        <button class="btn small" id="shareBtn">🔗 Share link</button>
        <button class="btn small" id="saveLibBtn" title="Save this prompt to your library (S)">⭐ Save</button>
        <button class="btn small" id="dlBtn" title="Download as a .txt file">⬇ Download</button>
        <button class="btn small" id="newBtn" title="Start a fresh prompt (your library & history are kept)">🆕 New</button>
        <button class="btn small" id="toABtn" title="Send current prompt to compare slot A">A</button>
        <button class="btn small" id="toBBtn" title="Send current prompt to compare slot B">B</button>
        <span id="charCount" class="${text.length > cap ? "warn" : ""}">${text.length} / ${cap}</span>
        <span id="scoreChip" title="${score.items.map(i => i.label + " " + i.score).join(" · ")}">score ${score.total}</span>
      </div>
    </div>
    ${showLibrary ? libraryHtml() : ""}
    ${showCompare ? compareHtml() : ""}
    ${showBatch ? batchHtml() : ""}
    <div class="card" id="historyCard">
      <div class="head">
        <h2>Copy history</h2>
        <span class="readout" id="undoState"></span>
        <button class="btn small" id="clearHistBtn" title="Forget every saved copy">Clear</button>
      </div>
      <div id="histList"></div>
    </div>`;
  host.querySelector("#outTabs").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    currentTab = b.dataset.tab; renderOutput();
  });
  host.querySelector("#copyOutBtn").addEventListener("click", () => copyText(text, currentTab === "style" ? "Style Prompt" : "Full Brief"));
  host.querySelector("#shareBtn").addEventListener("click", () =>
    copyText(location.origin + location.pathname + "?s=" + encodeState(state), "Share link"));
  host.querySelector("#saveLibBtn").addEventListener("click", saveToLibrary);
  host.querySelector("#dlBtn").addEventListener("click", () => downloadText(text));
  host.querySelector("#newBtn").addEventListener("click", startFresh);
  host.querySelector("#toABtn").addEventListener("click", () => sendToCompare("a"));
  host.querySelector("#toBBtn").addEventListener("click", () => sendToCompare("b"));
  if (showLibrary) wireLibrary(host);
  if (showCompare) wireCompare(host);
  if (showBatch) wireBatch(host);
  host.querySelector("#clearHistBtn").addEventListener("click", () => { history.clearCopies(); renderHistory(); toast("History cleared"); });
  renderHistory();
}

/* ------------------------ library + compare ------------------------ */
function saveToLibrary() {
  const name = prompt("Name this prompt:", defaultName(state));
  if (name === null) return;                       /* cancelled */
  const entry = library.add({
    name, state,
    prompt: buildStylePrompt(state),
    score: scorePrompt(state).total
  });
  if (!entry) return toast("Could not save — browser storage is full");
  showLibrary = true;
  renderOutput();
  toast("Saved “" + entry.name + "”");
}

function downloadText(text) {
  const stamp = (state.primaryStyle || "neon-forge").replace(/[^\w-]+/g, "-").toLowerCase();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = stamp + "-" + (currentTab === "style" ? "style-prompt" : "full-brief") + ".txt";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Downloaded");
}

function sendToCompare(slot) {
  compare.setSlot(slot, state, buildStylePrompt(state), scorePrompt(state));
  showCompare = true;
  renderOutput();
  toast("Sent to slot " + slot.toUpperCase());
}

function libraryHtml() {
  const rows = library.list({ query: libQuery, starredOnly: libStarred });
  const total = library.entries.length;
  return `
    <div class="card" id="libraryCard">
      <div class="head">
        <h2>Library</h2>
        <span class="readout">${rows.length} of ${total}</span>
        <button class="btn small ${libStarred ? "on" : ""}" id="libStarFilter" title="Show starred only">★</button>
        <button class="btn small" id="libExport" title="Export the whole library as JSON">⬇ Export</button>
        <button class="btn small" id="libImport" title="Merge a library JSON file into yours">⬆ Import</button>
        <input type="file" id="libFile" accept="application/json,.json" hidden>
      </div>
      <input type="text" id="libSearch" placeholder="Search saved prompts…" value="${escapeHtml(libQuery)}">
      <div id="libList">
        ${rows.length ? rows.map(e => `
          <div class="libRow" data-id="${e.id}">
            <button class="star ${e.starred ? "on" : ""}" data-act="star" title="Star">${e.starred ? "★" : "☆"}</button>
            <div class="libMain" data-act="load" title="Load this prompt">
              <div class="libName">${escapeHtml(e.name)}</div>
              <div class="libMeta">score ${e.score} · ${escapeHtml(e.style || "—")}${e.bpm ? " · " + e.bpm + " BPM" : ""} · ${new Date(e.at).toLocaleDateString()}</div>
              <div class="libPrev">${escapeHtml(e.preview)}…</div>
            </div>
            <div class="libBtns">
              <button class="btn small" data-act="rename" title="Rename">✎</button>
              <button class="btn small" data-act="tob" title="Compare against current (slot B)">⚖</button>
              <button class="btn small" data-act="del" title="Delete">✕</button>
            </div>
          </div>`).join("")
        : `<div class="empty">Nothing saved yet — hit ⭐ Save on a prompt you like.</div>`}
      </div>
    </div>`;
}

function wireLibrary(host) {
  const search = host.querySelector("#libSearch");
  search.addEventListener("input", e => {
    libQuery = e.target.value;
    const list = host.querySelector("#libList");
    const open = document.activeElement === search;
    renderOutput();
    if (open) { const el = $("#libSearch"); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    void list;
  });
  host.querySelector("#libStarFilter").addEventListener("click", () => { libStarred = !libStarred; renderOutput(); });
  host.querySelector("#libExport").addEventListener("click", () => {
    const blob = new Blob([library.exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "neon-forge-library.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Exported " + library.entries.length + " prompts");
  });
  host.querySelector("#libImport").addEventListener("click", () => host.querySelector("#libFile").click());
  host.querySelector("#libFile").addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const res = library.importJSON(String(fr.result));
      renderOutput();
      toast(res.ok ? "Imported " + res.added + " prompts" : "Import failed — " + res.error);
    };
    fr.readAsText(file);
  });
  host.querySelector("#libList").addEventListener("click", e => {
    const btn = e.target.closest("[data-act]");
    const row = e.target.closest(".libRow");
    if (!btn || !row) return;
    const id = row.dataset.id, entry = library.get(id);
    if (!entry) return;
    const act = btn.dataset.act;
    if (act === "star") { library.toggleStar(id); renderOutput(); }
    else if (act === "del") {
      if (confirm("Delete “" + entry.name + "”?")) { library.remove(id); renderOutput(); toast("Deleted"); }
    } else if (act === "rename") {
      const n = prompt("Rename:", entry.name);
      if (n !== null) { library.rename(id, n); renderOutput(); }
    } else if (act === "tob") {
      compare.setSlot("a", state, buildStylePrompt(state), scorePrompt(state));
      const saved = clone(entry.state);
      compare.setSlot("b", saved, previewOf(saved), scoreOf(saved));
      showCompare = true; renderOutput(); toast("Comparing against “" + entry.name + "”");
    } else if (act === "load") {
      applySnapshot(clone(entry.state));
      commit("Load “" + entry.name + "”");
      toast("Loaded “" + entry.name + "”");
    }
  });
}

/* Score/render an arbitrary state without disturbing the live one. */
function scoreOf(snap) { return scorePrompt(snap); }
function previewOf(snap) { return buildStylePrompt(snap); }

function compareHtml() {
  const sum = compare.summary();
  const slot = (k, snap) => {
    if (!snap) return `<div class="cmpSlot empty"><b>${k.toUpperCase()}</b><div class="empty">Empty — press ${k.toUpperCase()} in the output bar.</div></div>`;
    const win = sum && sum.winner === k;
    return `<div class="cmpSlot ${win ? "win" : ""}">
      <b>${k.toUpperCase()}${win ? " · winner" : ""}</b>
      <div class="cmpScore">${snap.score.total}</div>
      <div class="cmpMeta">${escapeHtml(snap.state.primaryStyle || "—")} · ${snap.prompt.length} chars</div>
      <div class="cmpPrev">${escapeHtml(snap.prompt.slice(0, 180))}…</div>
      <button class="btn small" data-keep="${k}">Keep ${k.toUpperCase()}</button>
    </div>`;
  };
  const rows = compare.rows();
  return `
    <div class="card" id="compareCard">
      <div class="head">
        <h2>A / B compare</h2>
        ${sum ? `<span class="readout">${sum.winner === "tie" ? "Dead heat" : sum.winner.toUpperCase() + " wins by " + Math.abs(sum.delta)}</span>` : ""}
        <button class="btn small" id="cmpRollB" title="Roll a fresh challenger into slot B">🎲 Challenger → B</button>
        <button class="btn small" id="cmpMaxB" title="MAX the current prompt into slot B">⭐ MAX → B</button>
        <button class="btn small" id="cmpClear">Clear</button>
      </div>
      <div class="cmpSlots">${slot("a", compare.a)}${slot("b", compare.b)}</div>
      ${rows.length ? `<table class="cmpTable">
        <tr><th>Criterion</th><th>A</th><th>B</th><th>Δ</th></tr>
        ${rows.map(r => `<tr class="${r.winner === "tie" ? "" : "w-" + r.winner}">
          <td>${escapeHtml(r.label)}</td><td>${r.a}</td><td>${r.b}</td>
          <td class="${r.delta > 0 ? "up" : r.delta < 0 ? "down" : ""}">${r.delta > 0 ? "+" : ""}${r.delta}</td></tr>`).join("")}
      </table>` : `<div class="empty">Fill both slots to see a per-criterion breakdown.</div>`}
    </div>`;
}

function wireCompare(host) {
  host.querySelector("#cmpClear").addEventListener("click", () => { compare.clear(); renderOutput(); });
  host.querySelector("#cmpRollB").addEventListener("click", () => {
    if (!compare.a) compare.setSlot("a", state, buildStylePrompt(state), scorePrompt(state));
    const cand = clone(state);
    roll(cand, "everything");
    compare.setSlot("b", cand, previewOf(cand), scoreOf(cand));
    renderOutput(); toast("Challenger rolled into B");
  });
  host.querySelector("#cmpMaxB").addEventListener("click", () => {
    if (!compare.a) compare.setSlot("a", state, buildStylePrompt(state), scorePrompt(state));
    const cand = clone(state);
    roll(cand, "everything", { mode: "max", tries: +($("#triesSel") || {}).value || 24 });
    compare.setSlot("b", cand, previewOf(cand), scoreOf(cand));
    renderOutput(); toast("MAX candidate in B");
  });
  host.querySelectorAll("[data-keep]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.keep, snap = k === "a" ? compare.a : compare.b;
    if (!snap) return;
    applySnapshot(clone(snap.state));
    commit("Keep " + k.toUpperCase());
    toast("Kept " + k.toUpperCase());
  }));
}

/* ------------------------ batch lab ------------------------ */
function batchHtml() {
  const sizes = [4, 8, 12, 16];
  const rows = batch.map((c, i) => `
    <div class="batchRow" data-bi="${i}">
      <div class="batchTop">
        <span class="batchRank">#${i + 1}</span>
        <span class="batchScore" title="score">${c.score.total}</span>
        <span class="batchStyle">${escapeHtml(c.state.primaryStyle || "—")}</span>
        <span class="batchLen">${c.prompt.length} ch · ${c.state.bpm} BPM</span>
      </div>
      <div class="batchPrompt">${escapeHtml(c.prompt)}</div>
      <div class="batchOps">
        <button class="btn small" data-bcopy="${i}">📋 Copy</button>
        <button class="btn small" data-bload="${i}" title="Load this candidate as the current state">Load</button>
        <button class="btn small" data-ba="${i}" title="Send to compare slot A">→A</button>
        <button class="btn small" data-bb="${i}" title="Send to compare slot B">→B</button>
      </div>
    </div>`).join("");
  return `
    <div class="card" id="batchCard">
      <div class="head">
        <h2>Batch lab</h2>
        <select id="batchSize" title="How many candidates to roll">${sizes.map(n =>
          `<option value="${n}" ${batchSize === n ? "selected" : ""}>${n}×</option>`).join("")}</select>
        <button class="btn small primary" id="batchGo" title="Roll a fresh ranked batch from the current state (locks kept)">⚡ Roll batch</button>
        <button class="btn small" id="batchClear">Clear</button>
      </div>
      <div class="readout batchHint">Ranked best-first from your current settings. Locked fields carry into every candidate.</div>
      <div id="batchList">${rows || `<div class="empty">No batch yet — hit ⚡ Roll batch to generate ${batchSize} ranked candidates.</div>`}</div>
    </div>`;
}

function wireBatch(host) {
  host.querySelector("#batchSize").addEventListener("change", e => { batchSize = +e.target.value; });
  host.querySelector("#batchGo").addEventListener("click", () => {
    batch = rollBatch(state, batchSize);
    renderOutput();
    toast("⚡ Rolled " + batch.length + " candidates — best scores " + (batch[0] ? batch[0].score.total : "—"));
  });
  host.querySelector("#batchClear").addEventListener("click", () => { batch = []; renderOutput(); });
  host.querySelectorAll("[data-bcopy]").forEach(b => b.addEventListener("click", () => {
    const c = batch[+b.dataset.bcopy]; if (!c) return;
    copyText(c.prompt, "Batch #" + (+b.dataset.bcopy + 1));
  }));
  host.querySelectorAll("[data-bload]").forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.bload, c = batch[i]; if (!c) return;
    applySnapshot(clone(c.state));
    commit("Load batch #" + (i + 1));
    toast("Loaded batch candidate #" + (i + 1));
  }));
  host.querySelectorAll("[data-ba],[data-bb]").forEach(b => b.addEventListener("click", () => {
    const slot = b.dataset.ba !== undefined ? "a" : "b";
    const i = +(slot === "a" ? b.dataset.ba : b.dataset.bb);
    const c = batch[i]; if (!c) return;
    compare.setSlot(slot, c.state, c.prompt, c.score);
    showCompare = true; renderOutput();
    toast("Batch #" + (i + 1) + " → compare slot " + slot.toUpperCase());
  }));
}

/* Every Copy click is archived with its full state — click an entry to
   restore that exact prompt (seed, styles, locks, hidden sections). */
function renderHistory() {
  const list = $("#histList"); if (!list) return;
  const u = $("#undoState");
  if (u) u.textContent = history.past.length + " undo · " + history.future.length + " redo";
  if (!history.copies.length) {
    list.innerHTML = `<div class="histEmpty">No copies yet — hit 📋 Copy and every prompt you paste into Suno is saved here.</div>`;
    return;
  }
  list.innerHTML = history.copies.map((c, i) => `
    <div class="histItem" data-hist="${i}" title="Restore this prompt">
      <div class="histTop"><b>${escapeHtml(c.style)}</b><span>${c.kind} · ${c.chars} ch · ${c.bpm} BPM</span></div>
      <div class="histPrev">${escapeHtml(c.preview)}${c.chars > 120 ? "…" : ""}</div>
      <div class="histMeta">seed ${c.seed} · ${new Date(c.at).toLocaleTimeString()}</div>
    </div>`).join("");
  list.addEventListener("click", e => {
    const it = e.target.closest("[data-hist]"); if (!it) return;
    const entry = history.copies[+it.dataset.hist]; if (!entry) return;
    commit("Restore copy");
    applySnapshot(entry.state);
    history.sync(state);
    toast("⟲ Restored " + entry.kind + " — " + entry.style);
  }, { once: true });
}

export function render() {
  renderTopbar();
  renderCards();
  renderOutput();
}

/* ------------------------ shortcuts dialog ------------------------ */
/* The old help was a single toast line you couldn't read twice. This is a
   proper modal: keyboard-reachable, Escape/backdrop dismissible, with
   focus moved in on open and restored on close. */
const SHORTCUTS = [
  ["R", "Roll everything"],
  ["M", "MAX — maximize score over N tries"],
  ["B", "🥁 Hide beats (melody-only)"],
  ["H", "🔇 Sound-lite (style-first prompt)"],
  ["N", "⛓ No-stop beat"],
  ["L", "Toggle library"],
  ["C", "Toggle A/B compare"],
  ["G", "Toggle batch lab"],
  ["S", "Save prompt to library"],
  ["1 / 2", "Style Prompt / Full Brief tab"],
  ["?", "Open this dialog"],
  ["Esc", "Close dialog"],
  ["Ctrl+Z / Ctrl+Y", "Undo / redo"]
];
let shortcutsOpen = false, shortcutsReturnFocus = null;

function openShortcuts() {
  if (shortcutsOpen) return;
  shortcutsOpen = true;
  shortcutsReturnFocus = document.activeElement;
  const modal = $("#shortcutsModal");
  modal.hidden = false;
  modal.innerHTML = `
    <div class="box" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <header>
        <h3>Keyboard shortcuts</h3>
        <button type="button" class="btn small" id="shortcutsClose" aria-label="Close shortcuts dialog">✕</button>
      </header>
      <div class="scList">
        ${SHORTCUTS.map(([k, d]) => `<div class="scRow"><kbd>${escapeHtml(k)}</kbd><span>${d}</span></div>`).join("")}
      </div>
    </div>`;
  modal.querySelector("#shortcutsClose").addEventListener("click", closeShortcuts);
  modal.addEventListener("click", e => { if (e.target === modal) closeShortcuts(); }, { once: true });
  try { modal.querySelector("#shortcutsClose").focus(); } catch { }
}
function closeShortcuts() {
  if (!shortcutsOpen) return;
  shortcutsOpen = false;
  const modal = $("#shortcutsModal");
  modal.hidden = true;
  modal.innerHTML = "";
  if (shortcutsReturnFocus && shortcutsReturnFocus.focus) {
    try { shortcutsReturnFocus.focus(); } catch { }
  }
  shortcutsReturnFocus = null;
}

/* ---------------------------- events ---------------------------- */
function initEvents() {
  $("#cards").addEventListener("click", e => {
    const t = e.target.closest("[data-roll],[data-lock],[data-pick],[data-cardroll],[data-cardmax],[data-cardhide],[data-rowhide],[data-layer],[data-collapse],[data-spark],[data-sparkextra],[data-sparkmagic],[data-sparkapply],[data-sparkwild],[data-sparkcopy],#collapseAllBtn,#expandAllBtn");
    if (!t) return;
    if (t.dataset.collapse) return toggleCollapse(t.dataset.collapse);
    if (t.dataset.spark !== undefined) return doSpark(parseInt(t.dataset.spark, 10));
    if (t.dataset.sparkextra !== undefined) return doSparkExtra();
    if (t.dataset.sparkmagic !== undefined) return doSparkMagic();
    if (t.dataset.sparkapply) return doSparkApply(t.dataset.sparkapply);
    if (t.dataset.sparkwild) return doSparkWild(t.dataset.sparkwild);
    if (t.dataset.sparkcopy !== undefined) return doSparkCopy();
    if (t.id === "collapseAllBtn") return collapseAll(true);
    if (t.id === "expandAllBtn") return collapseAll(false);
    if (t.dataset.roll) return doRoll(t.dataset.roll);
    if (t.dataset.lock) return toggleLock(t.dataset.lock);
    if (t.dataset.pick) return openPicker(t.dataset.pick, state, () => { commit("Pick " + t.dataset.pick); afterChange(); });
    if (t.dataset.cardroll) return doRoll(t.dataset.cardroll);
    if (t.dataset.cardmax) return doRoll(t.dataset.cardmax, "max");
    if (t.dataset.cardhide) return toggleHide(t.dataset.cardhide);
    if (t.dataset.rowhide) return toggleHide(t.dataset.rowhide);
    if (t.dataset.layer) { state.layers[t.dataset.layer] = !state.layers[t.dataset.layer]; commit("Layer " + t.dataset.layer); afterChange(); }
  });
  document.addEventListener("keydown", e => {
    const k = e.key || "";
    if (shortcutsOpen) { if (k === "Escape") { e.preventDefault(); closeShortcuts(); } return; }
    const tgt = e.target;
    if (tgt && tgt.matches && tgt.matches("input,textarea,select")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = k.toLowerCase();
    if (key === "r") doRoll("everything");
    else if (key === "m") doRoll("everything", "max");
    else if (key === "l") { showLibrary = !showLibrary; renderOutput(); }
    else if (key === "c") { showCompare = !showCompare; renderOutput(); }
    else if (key === "g") { showBatch = !showBatch; renderOutput(); }
    else if (key === "s") { e.preventDefault(); saveToLibrary(); }
    else if (key === "h") toggleSoundLite();
    else if (key === "n") toggleNoStop();
    else if (key === "b") toggleHideBeats();
    else if (key === "1") { currentTab = "style"; renderOutput(); }
    else if (key === "2") { currentTab = "brief"; renderOutput(); }
    else if (key === "?" || k === "F1") { e.preventDefault(); openShortcuts(); }
  });
}

/* ---------------------------- boot ---------------------------- */
/* Point the concept & melody-concept manual pickers at the EXPANDED pools
   (verbatim + generated extras), so hand-picking sees the same richness
   the rolls do. Done here (not in /data) to keep the data layer free of
   an engine import cycle. */
for (const k of Object.keys(CONCEPT_POOL)) {
  const e = PICKER_POOLS["concept-" + k];
  if (e && e.arr) e.arr = () => CONCEPT_POOL[k];
}
for (const k of Object.keys(MELODY_CONCEPT_POOL)) {
  const e = PICKER_POOLS["melodyConcept-" + k];
  if (e && e.arr) e.arr = () => MELODY_CONCEPT_POOL[k];
}
{ /* arrangement picker → full merged pool */
  const e = PICKER_POOLS["arrangement"];
  if (e && e.arr) e.arr = () => ARRANGEMENTS_FULL;
}

ATOMS.forEach(a => {
  const entry = PICKER_POOLS[a.pick || a.key];
  if (entry && (entry.arr || ["style", "key"].includes(entry.type))) a.pickEntry = entry;
});

initEvents();
bindUndoKeys(document, { undo: doUndo, redo: doRedo });
render();
updateURL();
persistSessionSoon();

/* Offline / installable (PWA). Registered only on real http(s) origins
   over a secure context — the dev preview, the static server and any
   deployed host. Best-effort: a registration failure never breaks the app. */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => { });
}

/* test hook (mirrors the legacy __NF hook, engine-level) */
window.__NF = {
  get: () => state,
  set: s => { state = s; setSeed(state.seed); render(); },
  roll: (scope, opts) => { const r = roll(state, scope, opts); afterChange(); return r; },
  buildStylePrompt: () => buildStylePrompt(state),
  buildFullBrief: () => buildFullBrief(state),
  scorePrompt: () => scorePrompt(state),
  encodeState, decodeState, defaultState, clone, rollBatch,
  persistSessionNow, loadPersistedSession,
  startFresh, getBatch: () => batch.slice(),
  history, library, compare, undo: doUndo, redo: doRedo
};
