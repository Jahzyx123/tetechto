/* ui/library.js — saved prompt library.

   The copy log in history.js is a flat append-only trail: useful for
   "what did I just copy", useless for "keep this one, I like it".
   The library is the deliberate half — you name an entry, star it,
   reload it months later, and move the whole set between browsers as
   JSON.

   Entries store the full engine state, not the rendered text, so a
   reloaded prompt is fully editable and re-rollable rather than frozen.
   A snapshot of the text is kept alongside purely for the preview line
   and for search. */

const LS_KEY = "neonforge.library.v1";
const MAX_ENTRIES = 500;

function load() {
  try {
    const raw = globalThis.localStorage && localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function save(list) {
  try { globalThis.localStorage && localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; }
  catch (e) { return false; }  /* quota exceeded — caller surfaces a toast */
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export class Library {
  constructor() {
    this.entries = load();
    this.listeners = [];
  }
  onChange(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach(f => f(this)); }
  persist() { const ok = save(this.entries); this.emit(); return ok; }

  /* Newest first, starred pinned above the rest. */
  list({ query = "", starredOnly = false } = {}) {
    const q = query.trim().toLowerCase();
    return this.entries
      .filter(e => !starredOnly || e.starred)
      .filter(e => !q || (e.name + " " + e.style + " " + e.preview).toLowerCase().includes(q))
      .sort((a, b) => (b.starred - a.starred) || (b.at - a.at));
  }

  get(id) { return this.entries.find(e => e.id === id) || null; }

  add({ name, state, prompt, score }) {
    const entry = {
      id: uid(),
      name: (name || "").trim() || defaultName(state),
      at: Date.now(),
      starred: false,
      style: state.primaryStyle || "",
      bpm: state.bpm || 0,
      score: score || 0,
      preview: String(prompt || "").slice(0, 160),
      state: JSON.parse(JSON.stringify(state))
    };
    this.entries.unshift(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES;
    return this.persist() ? entry : null;
  }

  rename(id, name) {
    const e = this.get(id);
    if (!e) return false;
    e.name = String(name || "").trim() || e.name;
    return this.persist();
  }
  toggleStar(id) {
    const e = this.get(id);
    if (!e) return false;
    e.starred = !e.starred;
    return this.persist();
  }
  remove(id) {
    const i = this.entries.findIndex(e => e.id === id);
    if (i < 0) return false;
    this.entries.splice(i, 1);
    return this.persist();
  }
  clear() { this.entries = []; return this.persist(); }

  exportJSON() {
    return JSON.stringify({ app: "NEON FORGE", kind: "library", v: 1, entries: this.entries }, null, 2);
  }

  /* Merge rather than replace: importing a friend's set should not wipe
     yours. Entries already present (same id) are skipped. */
  importJSON(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, added: 0, error: "Not valid JSON" }; }
    const incoming = Array.isArray(data) ? data : (data && data.entries);
    if (!Array.isArray(incoming)) return { ok: false, added: 0, error: "No entries found" };
    const have = new Set(this.entries.map(e => e.id));
    let added = 0;
    for (const raw of incoming) {
      if (!raw || typeof raw !== "object" || !raw.state) continue;
      /* already have this exact entry -> skip, so importing the same file
         twice is a no-op instead of duplicating the whole library */
      if (raw.id && have.has(raw.id)) continue;
      const e = {
        id: raw.id || uid(),
        name: String(raw.name || "Imported"),
        at: Number(raw.at) || Date.now(),
        starred: !!raw.starred,
        style: String(raw.style || ""),
        bpm: Number(raw.bpm) || 0,
        score: Number(raw.score) || 0,
        preview: String(raw.preview || ""),
        state: raw.state
      };
      if (have.has(e.id)) continue;
      have.add(e.id);
      this.entries.push(e);
      added++;
    }
    if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES;
    this.persist();
    return { ok: true, added };
  }
}

export function defaultName(state) {
  const st = state.primaryStyle || "Untitled";
  return st + (state.bpm ? " · " + state.bpm + " BPM" : "");
}
