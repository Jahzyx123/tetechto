/* ui/app.js — NEON FORGE shell.
   One roll-button family driving the unified engine roll(scope, mode):
   - per-field roll / lock / manual pick (from ATOMS + PICKER_POOLS)
   - per-section roll + hide
   - global ROLL (everything) and MAX (maximize score over N tries)
   - SUNO 6.0 output tabs, one per Suno field:
     Style Prompt (≤1000) / Exclude Styles / Structure (Lyrics) / Full Brief
   - shareable state via ?s= URL param, deterministic per seed. */
import { ATOMS, PICKER_POOLS } from "../data/atoms.js";
import { LAYERS } from "../data/safety.js";
import {
  defaultState, roll, buildStylePrompt, buildFullBrief, scorePrompt,
  buildExcludeStyles, sectionCues,
  encodeState, decodeState, setSeed, weirdMix,
  SOUND_CARDS, unhideAllSoundCards, autoFitSounds, setSoundLite, setNoStop, setHideBeats, STYLE_STATS
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
function commit(label) { history.push(state, label); }
function applySnapshot(snap) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, snap);
  setSeed(state.seed);
  render(); updateURL();
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
  const q = new URLSearchParams(location.search).get("s");
  if (q) { const s = decodeState(q); if (s) return s; }
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
  catch (e) { toast("Clipboard blocked — but it's saved in history"); }
  ta.remove();
}
function updateURL() {
  try { history.replaceState(null, "", location.pathname + "?s=" + encodeState(state)); } catch (e) { }
}
export function afterChange() { render(); updateURL(); }

function atomValue(a) {
  if (a.display) { try { return a.display(state); } catch (e) { return ""; } }
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

/* ---------------------------- top bar ---------------------------- */
function renderTopbar() {
  const el = $("#topbar");
  const m = weirdMix(state.weirdness);
  const pct = x => Math.round(x * 100);
  el.innerHTML = `
    <span class="logo">NEON FORGE</span>
    <span class="seg" id="modeSeg">
      <button data-mode="techno" class="${state.techOnly ? "on" : ""}" title="${STYLE_STATS.styles} techno styles">TECHNO-ONLY</button>
      <button data-mode="all" class="${!state.techOnly ? "on" : ""}" title="${STYLE_STATS.genres} genres · ${STYLE_STATS.combos} sub-style combos">NO-TECHNO</button>
    </span>
    <button class="btn" id="libBtn" title="Saved prompt library (L)">📚 LIBRARY</button>
    <button class="btn" id="cmpBtn" title="A/B compare two candidates (C)">⚖ COMPARE</button>
    <button class="btn" id="noTechnoBtn" title="Switch to No-Techno and roll a fresh genre + sub-style combo (${STYLE_STATS.combos} combos, zero techno)">🚫 NO-TECHNO COMBO</button>
    <button class="btn primary" id="rollAllBtn" title="Roll every unlocked field (R)">🎲 ROLL EVERYTHING</button>
    <button class="btn" id="maxBtn" title="Reroll production N times keeping your primary/secondary style; re-click for another top-score variation">⭐ MAX</button>
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
    <span class="chip ${state.instrumental ? "on" : ""}" id="instToggle" title="Keep every vocal reference out of the output">Instrumental</span>
    <span class="chip ${state.equalChance ? "on" : ""}" id="eqToggle" title="Every style equally likely (ignores weirdness tiers)">Equal chance</span>
    <span class="chip ${state.noHandPerc ? "on" : ""}" id="handPercToggle" title="Remove tribal &amp; hand percussion, woodblocks, claps, shakers, stomps, jungle/breakbeat drums and trash-can / scrap-metal percussion from every roll">No hand-perc</span>
    <span class="chip ${state.styleFit ? "on" : ""}" id="fitToggle" title="Auto-hide electronic-only cards for organic genres">Style-fit</span>
    <span class="chip ${state.soundLite ? "on" : ""}" id="soundLiteToggle" title="Hide every sound-appearance section (delay, FX, mix, spatial, ensemble) so the Style Prompt fills with melody &amp; pattern; parked sounds are packed back ONLY if there is room left (H)">🔇 SOUND-LITE</span>
    <span class="chip ${state.noStop ? "on" : ""}" id="noStopToggle" title="Non-stop beat: no-break arrangement &amp; energy arc, no [Breakdown] tag, ultra delivery start-to-finish — and it hides the counter/2nd line plus every appearance section &amp; sound (half-time, lazy, samba rolls, fills, open-ride, drops, risers, Ensemble/Tone/Mix/Space/Texture/FX) (N)">⛓ NO-STOP</span>
    <span class="chip ${state.hideBeats ? "on" : ""}" id="hideBeatsToggle" title="Melody-only: remove all drums, beats, bass &amp; every sound-maker across the whole prompt — only the style, melody and pattern command text remains, so nothing extra appears in the song (B)">🥁 HIDE BEATS</span>
    <span class="chip ${state.maxStyle ? "on" : ""}" id="maxStyleToggle" title="Let MAX also swap Primary/Secondary style for a higher-scoring combination — off by default, so MAX keeps your style">⭐ MAX STYLE</span>
    <span class="chip ${state.structure ? "on" : ""}" id="structToggle" title="Include the [Intro | cue] per-section performance skeleton in the Full Brief — Suno 6 reads these cues in the Lyrics field; brackets never go in the style box">Structure</span>
    <label class="inline">Influence <select id="influenceSel">
      ${["subtle", "balanced", "strong"].map(v => `<option ${state.influence === v ? "selected" : ""}>${v}</option>`).join("")}
    </select></label>
    <label class="inline">Length <select id="durationSel">
      ${["compact", "standard", "extended"].map(v => `<option ${state.duration === v ? "selected" : ""}>${v}</option>`).join("")}
    </select></label>
    <label class="inline">Melody <select id="forceSel">
      ${["light", "balanced", "strong", "dominant"].map(v => `<option ${state.melodicForce === v ? "selected" : ""}>${v}</option>`).join("")}
    </select></label>
    <span class="chip" id="seedChip" title="Click to copy share link">seed ${state.seed}</span>
    <span class="readout" id="densityChip" title="How many rolled sounds reached the Style Prompt">sounds <b>${scorePrompt(state).soundCount}</b></span>
    <span class="readout" id="poolChip" title="Style pool in play">${state.techOnly ? STYLE_STATS.styles + " styles" : STYLE_STATS.combos + " combos"}</span>
    <span class="readout" id="buildChip" title="Build id — confirms which code your browser is running">build ${BUILD}</span>
  `;
  el.querySelector("#modeSeg").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    setMode(b.dataset.mode === "techno");
  });
  el.querySelector("#libBtn").addEventListener("click", () => { showLibrary = !showLibrary; renderOutput(); });
  el.querySelector("#cmpBtn").addEventListener("click", () => { showCompare = !showCompare; renderOutput(); });
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
function cardHtml(def) {
  const hidden = !!state.hidden[def.id];
  const head = `
    <div class="head">
      <h2>${def.title}</h2>
      ${def.scope ? `<button class="iconbtn" data-cardroll="${def.scope}" title="Roll this section">🎲</button>
      <button class="iconbtn" data-cardmax="${def.scope}" title="Maximize this section">⭐</button>` : ""}
      <button class="iconbtn ${hidden ? "on" : ""}" data-cardhide="${def.id}" title="${hidden ? "Show in prompt" : "Hide from prompt"}">${hidden ? "🙈" : "👁"}</button>
    </div>`;
  if (def.id === "layersCard") {
    return `<div class="card ${hidden ? "hiddenCard" : ""}" id="${def.id}">${head}
      <div id="layersWrap">${LAYERS.map(l =>
        `<span class="chip ${state.layers[l.id] ? "on" : ""}" data-layer="${l.id}" title="${escapeHtml(l.phrase)}">${escapeHtml(l.label)}</span>`).join("")}
      </div></div>`;
  }
  const rows = (ATOMS_BY_CARD[def.id] || []).map(a => {
    const locked = !!state.locks[a.key];
    const pickable = !!a.pickEntry;
    const rowHide = (a.key === "bpm" || a.key === "key")
      ? `<button class="iconbtn ${state.hidden[a.key] ? "on" : ""}" data-rowhide="${a.key}" title="Hide ${a.key} from prompt">${state.hidden[a.key] ? "🙈" : "👁"}</button>` : "";
    return `<div class="row ${locked ? "locked" : ""}">
      <span class="lab">${escapeHtml(a.label)}</span>
      <span class="val">${escapeHtml(atomValue(a) ?? "")}</span>
      <span class="ops">
        <button class="iconbtn" data-roll="${a.key}" title="Roll">🎲</button>
        <button class="iconbtn ${locked ? "on" : ""}" data-lock="${a.key}" title="${locked ? "Unlock" : "Lock"}">${locked ? "🔒" : "🔓"}</button>
        ${pickable ? `<button class="iconbtn" data-pick="${a.key}" title="Pick manually">☰</button>` : ""}
        ${rowHide}
      </span>
    </div>`;
  }).join("");
  return `<div class="card ${hidden ? "hiddenCard" : ""}" id="${def.id}">${head}<div class="rows">${rows}</div></div>`;
}

function renderCards() {
  $("#cards").innerHTML = CARD_DEFS.map(cardHtml).join("");
}

/* ---------------------------- output ---------------------------- */
/* SUNO 6.0 — four outputs, one per Suno field. The style box stays under
   its measured 1000-char cap and positive-only, Exclude Styles collects
   every negative (inline negatives read as inclusion requests on v6),
   the Lyrics Skeleton carries per-section performance cues (v6 reads
   them), and the Full Brief bundles everything field-routed. */
let currentTab = "style";
const TABS = [
  { id: "style", label: "Style Prompt", cap: 1000, build: s => buildStylePrompt(s),
    tip: "Paste into the Styles box (1000 chars, positive tags only)" },
  { id: "exclude", label: "Exclude Styles", cap: 1000, build: s => buildExcludeStyles(s),
    tip: "Paste into Suno 6's Exclude Styles field — never inline these in the style box" },
  { id: "cues", label: "Structure (Lyrics)", cap: 5000, build: s => sectionCues(s),
    tip: "Paste into the Lyrics field — bracket tags on their own line, parenthetical cues below (bar counts = duration hints), [End] closes; no sung lyrics needed" },
  { id: "brief", label: "Full Brief", cap: 3000, build: s => buildFullBrief(s),
    tip: "Everything, routed per Suno field" }
];
function renderOutput() {
  const host = $("#output");
  const tab = TABS.find(t => t.id === currentTab) || TABS[0];
  const text = tab.build(state);
  const cap = tab.cap;
  const score = scorePrompt(state);
  host.innerHTML = `
    <div class="card">
      <div id="outTabs">
        ${TABS.map(t => `<button data-tab="${t.id}" class="${t.id === tab.id ? "on" : ""}" title="${t.tip}">${t.label}</button>`).join("")}
      </div>
      <div id="outbox">${escapeHtml(text) || "Nothing to exclude yet — turn on Instrumental or a mode chip."}</div>
      <div id="v6tips" title="Suno 6.0 prompting rules">SUNO 6 — style box: positive tags, front-loaded · lyrics field: [tags] own line + (cues) below, [End] closes · negatives → Exclude Styles · Style Influence ≥ 70% · judge BOTH takes</div>
      <div id="outmeta">
        <button class="btn small" id="copyOutBtn">📋 Copy</button>
        <button class="btn small" id="shareBtn">🔗 Share link</button>
        <button class="btn small" id="saveLibBtn" title="Save this prompt to your library (S)">⭐ Save</button>
        <button class="btn small" id="dlBtn" title="Download as a .txt file">⬇ Download</button>
        <button class="btn small" id="toABtn" title="Send current prompt to compare slot A">A</button>
        <button class="btn small" id="toBBtn" title="Send current prompt to compare slot B">B</button>
        <span id="charCount" class="${text.length > cap ? "warn" : ""}">${text.length} / ${cap}</span>
        <span id="scoreChip" title="${score.items.map(i => i.label + " " + i.score).join(" · ")}">score ${score.total}</span>
      </div>
    </div>
    ${showLibrary ? libraryHtml() : ""}
    ${showCompare ? compareHtml() : ""}
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
  host.querySelector("#copyOutBtn").addEventListener("click", () => copyText(text, tab.label));
  host.querySelector("#shareBtn").addEventListener("click", () =>
    copyText(location.origin + location.pathname + "?s=" + encodeState(state), "Share link"));
  host.querySelector("#saveLibBtn").addEventListener("click", saveToLibrary);
  host.querySelector("#dlBtn").addEventListener("click", () => downloadText(text));
  host.querySelector("#toABtn").addEventListener("click", () => sendToCompare("a"));
  host.querySelector("#toBBtn").addEventListener("click", () => sendToCompare("b"));
  if (showLibrary) wireLibrary(host);
  if (showCompare) wireCompare(host);
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
  const slug = (TABS.find(t => t.id === currentTab) || TABS[0]).id;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = stamp + "-" + slug + ".txt";
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
      const saved = JSON.parse(JSON.stringify(entry.state));
      compare.setSlot("b", saved, previewOf(saved), scoreOf(saved));
      showCompare = true; renderOutput(); toast("Comparing against “" + entry.name + "”");
    } else if (act === "load") {
      applySnapshot(JSON.parse(JSON.stringify(entry.state)));
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
    const cand = JSON.parse(JSON.stringify(state));
    roll(cand, "everything");
    compare.setSlot("b", cand, previewOf(cand), scoreOf(cand));
    renderOutput(); toast("Challenger rolled into B");
  });
  host.querySelector("#cmpMaxB").addEventListener("click", () => {
    if (!compare.a) compare.setSlot("a", state, buildStylePrompt(state), scorePrompt(state));
    const cand = JSON.parse(JSON.stringify(state));
    roll(cand, "everything", { mode: "max", tries: +($("#triesSel") || {}).value || 24 });
    compare.setSlot("b", cand, previewOf(cand), scoreOf(cand));
    renderOutput(); toast("MAX candidate in B");
  });
  host.querySelectorAll("[data-keep]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.keep, snap = k === "a" ? compare.a : compare.b;
    if (!snap) return;
    applySnapshot(JSON.parse(JSON.stringify(snap.state)));
    commit("Keep " + k.toUpperCase());
    toast("Kept " + k.toUpperCase());
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

/* ---------------------------- events ---------------------------- */
function initEvents() {
  $("#cards").addEventListener("click", e => {
    const t = e.target.closest("[data-roll],[data-lock],[data-pick],[data-cardroll],[data-cardmax],[data-cardhide],[data-rowhide],[data-layer]");
    if (!t) return;
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
    const tgt = e.target;
    if (tgt && tgt.matches && tgt.matches("input,textarea,select")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = (e.key || "").toLowerCase();
    if (k === "r") doRoll("everything");
    else if (k === "m") doRoll("everything", "max");
    else if (k === "l") { showLibrary = !showLibrary; renderOutput(); }
    else if (k === "c") { showCompare = !showCompare; renderOutput(); }
    else if (k === "s") { e.preventDefault(); saveToLibrary(); }
    else if (k === "h") toggleSoundLite();
    else if (k === "n") toggleNoStop();
    else if (k === "b") toggleHideBeats();
    else if (k === "1") { currentTab = "style"; renderOutput(); }
    else if (k === "2") { currentTab = "brief"; renderOutput(); }
    else if (k === "?") toast("R roll · M max · B hide-beats · H sound-lite · N no-stop · L library · C compare · S save · 1-4 tabs");
  });
}

/* ---------------------------- boot ---------------------------- */
ATOMS.forEach(a => {
  const entry = PICKER_POOLS[a.pick || a.key];
  if (entry && (entry.arr || ["style", "key"].includes(entry.type))) a.pickEntry = entry;
});

initEvents();
bindUndoKeys(document, { undo: doUndo, redo: doRedo });
render();
updateURL();

/* test hook (mirrors the legacy __NF hook, engine-level) */
window.__NF = {
  get: () => state,
  set: s => { state = s; setSeed(state.seed); render(); },
  roll: (scope, opts) => { const r = roll(state, scope, opts); afterChange(); return r; },
  buildStylePrompt: () => buildStylePrompt(state),
  buildFullBrief: () => buildFullBrief(state),
  buildExcludeStyles: () => buildExcludeStyles(state),
  sectionCues: () => sectionCues(state),
  scorePrompt: () => scorePrompt(state),
  encodeState, decodeState, defaultState,
  history, undo: doUndo, redo: doRedo
};
