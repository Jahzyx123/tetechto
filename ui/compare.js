/* ui/compare.js — A/B candidate comparison.

   Rolling is cheap but judging is not: two good prompts differ in ways
   the single "score 89" chip cannot show. Compare holds two full states
   side by side and diffs them per scoring criterion, so you can see
   *why* one wins before committing to it.

   Slot A is normally "what I have now"; B is a challenger (a fresh roll,
   a MAX run, or a library entry). Keeping either one just swaps that
   state back into the app. */

export class Compare {
  constructor() { this.a = null; this.b = null; }

  clone(state) { return JSON.parse(JSON.stringify(state)); }

  setSlot(slot, state, prompt, score) {
    const snap = {
      state: this.clone(state),
      prompt: String(prompt || ""),
      score: score || { total: 0, items: [] }
    };
    if (slot === "a") this.a = snap; else this.b = snap;
    return snap;
  }
  clearSlot(slot) { if (slot === "a") this.a = null; else this.b = null; }
  clear() { this.a = null; this.b = null; }
  get ready() { return !!(this.a && this.b); }

  /* Per-criterion diff, ordered by how much they disagree so the
     decisive differences sit at the top. */
  rows() {
    if (!this.ready) return [];
    const byLabel = s => {
      const m = {};
      for (const i of (s.score.items || [])) m[i.label] = i;
      return m;
    };
    const A = byLabel(this.a), B = byLabel(this.b);
    const labels = [...new Set([...Object.keys(A), ...Object.keys(B)])];
    return labels.map(label => {
      const a = A[label] ? A[label].score : 0;
      const b = B[label] ? B[label].score : 0;
      return {
        label, a, b, delta: b - a,
        winner: a === b ? "tie" : (a > b ? "a" : "b"),
        noteA: A[label] ? A[label].note : "",
        noteB: B[label] ? B[label].note : ""
      };
    }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  }

  summary() {
    if (!this.ready) return null;
    const ta = this.a.score.total, tb = this.b.score.total;
    const rows = this.rows();
    return {
      totalA: ta, totalB: tb, delta: tb - ta,
      winner: ta === tb ? "tie" : (ta > tb ? "a" : "b"),
      lenA: this.a.prompt.length, lenB: this.b.prompt.length,
      biggest: rows.find(r => r.delta !== 0) || null
    };
  }
}
