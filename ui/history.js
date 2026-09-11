/* ui/history.js — undo/redo stack + copy log.

   Undo/redo (Ctrl+Z / Ctrl+Y or Ctrl+Shift+Z) walks whole state snapshots,
   so it rewinds any change: a roll, a MAX, a manual pick, a lock, a hide,
   a toggle. Snapshots are structural clones capped at MAX_STEPS.

   The copy log records a full snapshot every time you hit Copy, so a prompt
   you liked enough to paste into Suno is always recoverable — click it in
   the History panel to restore that exact state (and its seed). */

const MAX_STEPS = 100;
const MAX_COPIES = 40;
const LS_KEY = "neonforge.copies.v1";

const clone = s => JSON.parse(JSON.stringify(s));

export class History {
  constructor(initial) {
    this.past = [];
    this.future = [];
    this.present = clone(initial);
    this.copies = loadCopies();
    this.listeners = [];
  }

  onChange(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach(f => f(this)); }

  /* Record a new state as the current one. `label` shows up in the toast. */
  push(state, label) {
    const snap = clone(state);
    if (JSON.stringify(snap) === JSON.stringify(this.present)) return false;
    this.past.push({ state: this.present, label: this.presentLabel || "start" });
    if (this.past.length > MAX_STEPS) this.past.shift();
    this.present = snap;
    this.presentLabel = label || "change";
    this.future.length = 0;
    this.emit();
    return true;
  }

  /* Replace the present without creating an undo step (e.g. after undo). */
  sync(state) { this.present = clone(state); }

  canUndo() { return this.past.length > 0; }
  canRedo() { return this.future.length > 0; }

  undo() {
    if (!this.past.length) return null;
    const prev = this.past.pop();
    this.future.push({ state: this.present, label: this.presentLabel || "change" });
    this.present = prev.state;
    const label = this.presentLabel;
    this.presentLabel = prev.label;
    this.emit();
    return { state: clone(this.present), label };
  }

  redo() {
    if (!this.future.length) return null;
    const nxt = this.future.pop();
    this.past.push({ state: this.present, label: this.presentLabel || "change" });
    this.present = nxt.state;
    this.presentLabel = nxt.label;
    this.emit();
    return { state: clone(this.present), label: nxt.label };
  }

  /* ---------------- copy log ---------------- */
  recordCopy(state, kind, text) {
    const entry = {
      at: Date.now(),
      kind,                                   // "Style Prompt" | "Full Brief" | "Share link"
      seed: state.seed,
      style: state.primaryStyle || "(unrolled)",
      bpm: state.bpm,
      preview: String(text).slice(0, 120),
      chars: String(text).length,
      state: clone(state)
    };
    this.copies.unshift(entry);
    if (this.copies.length > MAX_COPIES) this.copies.length = MAX_COPIES;
    saveCopies(this.copies);
    this.emit();
    return entry;
  }

  clearCopies() { this.copies = []; saveCopies(this.copies); this.emit(); }
}

function loadCopies() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function saveCopies(list) {
  try { globalThis.localStorage && localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) { }
}

/* Ctrl/Cmd+Z = undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z = redo.
   Ignored while typing in a field so text inputs keep native undo. */
export function bindUndoKeys(doc, { undo, redo }) {
  doc.addEventListener("keydown", e => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const t = e.target;
    if (t && t.matches && t.matches("input:not([type=range]),textarea,select")) return;
    const k = (e.key || "").toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
  });
}
