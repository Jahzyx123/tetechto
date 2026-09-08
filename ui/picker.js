/* ui/picker.js — manual pick modal.
   Lists the pool behind a field (from PICKER_POOLS) with live search;
   clicking an option writes it into the state. Handles the special
   types: style (mode-aware full style list), bpm, root, scale,
   scaleName and key (two-step root → scale). */
import { PICKER_POOLS } from "../data/atoms.js";
import { STYLES } from "../data/styles.js";
import { NOTE_NAMES, SCALES } from "../data/scales.js";
import { allCombos, genreOfStyle } from "../engine/genre.js";
import { scaleOf } from "../engine/music.js";

const $ = sel => document.querySelector(sel);

function setPath(obj, dotted, val) {
  const parts = dotted.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { o = o[parts[i]] = o[parts[i]] || {}; }
  o[parts[parts.length - 1]] = val;
}
function getPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function escapeHtml(x) { return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

export function openPicker(key, state, onChange) {
  const entry = PICKER_POOLS[key];
  if (!entry) return;

  if (entry.type === "key") return openKeyPicker(state, onChange);

  let options, current, apply;
  if (entry.type === "style") {
    options = state.techOnly ? STYLES.map(s => s.n) : allCombos();
    current = state[entry.field];
    apply = v => {
      state[entry.field] = v;
      const g = state.techOnly ? "Techno" : genreOfStyle(v);
      if (entry.field === "primaryStyle") state.primaryGenre = g;
      if (entry.field === "secondaryStyle") state.secondaryGenre = g;
    };
  } else if (entry.type === "root") {
    options = NOTE_NAMES;
    current = NOTE_NAMES[((state.rootPc | 0) % 12 + 12) % 12];
    apply = v => { state.rootPc = NOTE_NAMES.indexOf(v); };
  } else if (entry.type === "scale") {
    options = SCALES.map(s => s.id + " — " + s.n);
    current = state.scaleId + " — " + scaleOf(state).n;
    apply = v => { state.scaleId = v.split(" — ")[0]; state.chordColor = scaleOf(state).n; };
  } else if (entry.type === "scaleName") {
    options = SCALES.map(s => s.n);
    current = scaleOf(state).n;
    apply = v => { const sc = SCALES.find(s => s.n === v); if (sc) { state.scaleId = sc.id; state.chordColor = sc.n; } };
  } else if (entry.type === "bpm") {
    options = entry.arr().map(String);
    current = String(state.bpm);
    apply = v => { state.bpm = +v; };
  } else if (entry.arr) {
    options = entry.arr().map(String);
    current = String(getPath(state, entry.field) ?? "");
    apply = v => setPath(state, entry.field, v);
  } else return;

  showModal(entry.label, options, current, v => { apply(v); onChange(); });
}

function openKeyPicker(state, onChange) {
  // step 1: root, step 2: scale
  showModal("Key — pick a root note", NOTE_NAMES, NOTE_NAMES[((state.rootPc | 0) % 12 + 12) % 12], root => {
    state.rootPc = NOTE_NAMES.indexOf(root);
    showModal("Key — pick a scale", SCALES.map(s => s.n + "  ·  " + s.mood), scaleOf(state).n, v => {
      const name = v.split("  ·  ")[0];
      const sc = SCALES.find(s => s.n === name);
      if (sc) { state.scaleId = sc.id; state.chordColor = sc.n; }
      onChange();
    });
    onChange();
  });
}

function showModal(label, options, current, onPick) {
  const modal = $("#pickerModal");
  modal.hidden = false;
  const renderList = (filter) => {
    const f = (filter || "").toLowerCase();
    const list = f ? options.filter(o => String(o).toLowerCase().includes(f)) : options;
    const capped = list.slice(0, 600);
    return capped.map(o =>
      `<button class="popt ${String(o) === String(current) ? "cur" : ""}" data-val="${escapeHtml(o)}">${escapeHtml(o)}</button>`
    ).join("") + (list.length > 600 ? `<span class="readout">…${list.length - 600} more — refine the search</span>` : "");
  };
  modal.innerHTML = `
    <div class="box">
      <header>
        <h3>${escapeHtml(label)} <span class="readout">(${options.length} options)</span></h3>
        <input type="search" id="pickerSearch" placeholder="search…">
        <button class="btn small" id="pickerClose">✕</button>
      </header>
      <div class="grid" id="pickerGrid">${renderList("")}</div>
    </div>`;
  const close = () => { modal.hidden = true; modal.innerHTML = ""; };
  modal.querySelector("#pickerClose").addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); }, { once: true });
  modal.querySelector("#pickerSearch").addEventListener("input", e => {
    modal.querySelector("#pickerGrid").innerHTML = renderList(e.target.value);
  });
  modal.querySelector("#pickerGrid").addEventListener("click", e => {
    const b = e.target.closest(".popt"); if (!b) return;
    close();
    onPick(b.getAttribute("data-val"));
  });
  const s = modal.querySelector("#pickerSearch");
  try { s.focus(); } catch (e) { }
}
