/* engine/density.js — information density for the Suno style box.

   The base prompt is exactly 1000 characters of signal, and every
   character spent repeating something already said is a character that
   cannot carry a new detail. This module is the measuring tape and the
   squeeze for that box:

   - contentWords()   : the words that actually carry information
                        (labels, glue words and BPM/format words don't).
   - freshWords()     : how many NEW content words a candidate adds to
                        text that already exists.
   - fillerSqueeze()  : collapses filler-word runs (drive/force/pressure
                        chains the generated pools love) beyond a small
                        per-prompt allowance, freeing characters for
                        real details. Deterministic and meaning-preserving.
   - variety()        : unique-word ratio, the repetition readout.
   - coverage()       : which rolled values made it into the box, which
                        didn't, and what one more character would buy.

   Nothing here touches the DOM, and nothing here is random: the same
   text always squeezes to the same text (idempotent), so share links
   keep reproducing exactly. */

/* Structural words: section labels, glue, tempo/format vocabulary.
   They are deliberately NOT counted as information — "Bass:" repeating in
   five clauses tells Suno nothing new, while "wobble" or "tribal" does. */
export const CONTENT_STOP = new Set([
  "with", "and", "the", "that", "then", "into", "over", "under", "from",
  "this", "a", "an", "of", "in", "on", "at", "to", "for", "no", "not",
  "bpm", "instrumental", "vocals", "lyrics", "chants", "choir", "spoken",
  "words", "screaming", "screams", "noise", "sound", "sounds",
  "emotion", "lead", "leads", "harmony", "counter", "bass", "drums",
  "ensemble", "tone", "mix", "space", "texture", "arc", "second", "line",
  "melody", "melodic", "chords", "rhythm", "concept", "played", "using",
  "very", "its", "it", "is", "are", "as", "by", "or", "per", "plus",
  "non-stop", "continuous", "delivery", "ultra", "track", "section",
  "sections", "part", "parts", "each", "every", "all", "any", "more"
]);

export function contentWords(text) {
  const out = [];
  const m = String(text || "").toLowerCase().match(/[a-z][a-z-]{2,}/g);
  if (!m) return out;
  for (const w of m) if (!CONTENT_STOP.has(w)) out.push(w);
  return out;
}

export function wordSet(text) { return new Set(contentWords(text)); }

/* How many content words in `words` are not yet in `cur` (a Set). */
export function freshWords(words, cur) {
  let n = 0;
  for (const w of words) if (!cur.has(w)) n++;
  return n;
}

/* Insert every word of `text` into the running Set. Mutates and returns
   `cur` so callers can keep a cheap "what has been said" index alive
   across a whole packing pass instead of re-scanning the prompt. */
export function addWords(cur, words) { for (const w of words) cur.add(w); return cur; }

/* ---------------------------- FILLER SQUEEZE ----------------------------
   The generated pools append force-words to phrases that already carry
   one: "perc colour drive", "swing push drive", "cross-rhythm web drive",
   "pounding drop drive" … Four "drive"s in one prompt cost ~24 characters
   and say the same thing four times.

   squeezeWord() keeps the first `cap` occurrences of each filler word and
   deletes the rest — but only when the phrase survives as real language:
     * never inside a hyphenated compound (mega-drive, overdrive stays),
     * never when removing it would leave fewer than 2 words in the clause,
     * never in the trailing safety line (it is restored/parked by the
       caller before this runs, but the guard keeps it safe anywhere). */

export const FILLER_WORDS = ["drive", "force", "pressure"];
const FILLER_DEFAULT_CAP = 2;

/* count occurrences of a filler word outside hyphenated compounds */
function fillerRe(w) { return new RegExp("(?<![-\\w])" + w + "\\b", "gi"); }

export function fillerCounts(text) {
  const counts = {};
  for (const w of FILLER_WORDS) {
    const m = String(text || "").match(fillerRe(w));
    if (m) counts[w] = m.length;
  }
  return counts;
}

export function fillerSqueeze(text, cap = FILLER_DEFAULT_CAP) {
  let t = String(text || "");
  let saved = 0;
  for (const w of FILLER_WORDS) {
    let seen = 0;
    /* Walk clauses so a deletion can be judged against its own phrase. */
    t = t.replace(fillerRe(w), (m, off) => {
      seen++;
      if (seen <= cap) return m;
      /* the clause this occurrence sits in (bounded by . ; , or start/end) */
      const start = Math.max(t.lastIndexOf(". ", off), t.lastIndexOf("; ", off), t.lastIndexOf(", ", off)) + 1;
      let end = t.length;
      for (const sep of [". ", "; ", ", "]) {
        const i = t.indexOf(sep, off);
        if (i >= 0 && i < end) end = i;
      }
      const clause = t.slice(start, end).trim();
      const words = clause.split(/\s+/).filter(Boolean);
      /* keep the phrase grammatical: the filler must not be load-bearing.
         Two words left after the cut ("swing push") still read as a
         descriptor; one would not ("colour"). */
      if (words.length < 3) return m;
      saved += m.length + 1;
      return "";
    });
    /* tidy the hole a deletion can leave ("colour  ,") */
    t = t.replace(/\s+([,;.])/g, "$1").replace(/([,;])\s*\1/g, "$1").replace(/\s{2,}/g, " ");
  }
  return { text: t, saved };
}

/* ---------------------------- READOUTS ---------------------------- */

export function variety(text) {
  const words = contentWords(text);
  const uniq = new Set(words).size;
  return { words: words.length, unique: uniq, ratio: words.length ? uniq / words.length : 1 };
}

/* Coverage of a list of rolled values inside a prompt.
   `items` = [{ key, label, value, group }] — the caller (prompt.js) owns
   the packing order, this only measures. Returns everything the meter
   needs: what is in, what is missing (best-first by how much it would
   add), and the free characters left in the box. */
export function coverage(items, text, budget = 1000) {
  const has = v => v && text.toLowerCase().includes(String(v).toLowerCase());
  const cur = wordSet(text);
  const inBox = [], missing = [];
  for (const it of items) {
    if (!it.value) continue;
    if (has(it.value)) inBox.push(it);
    else missing.push(Object.assign({}, it, {
      fresh: freshWords(contentWords(it.value), cur),
      cost: String(it.value).length + 2
    }));
  }
  missing.sort((a, b) => (b.fresh - a.fresh) || (a.cost - b.cost));
  return {
    budget,
    chars: text.length,
    free: Math.max(0, budget - text.length),
    inBox, missing,
    inCount: inBox.length,
    rolledCount: inBox.length + missing.length
  };
}

/* ---------------------------- SCORING HELPERS ----------------------------
   One number per candidate detail: new information bought per character
   spent. The constant term keeps short, tidy details (a bare "tribal
   percussion") from losing to a long sentence that happens to contain one
   new word, and the penalty term pushes back on details that mostly
   repeat what is already in the box. */
export function densityScore(fresh, cost, repeat) {
  /* Tuned on a 40-roll deterministic sweep against the two readouts the
     box is judged by — details packed and unique-word ratio — and checked
     again on 120 rolls. Short details win the last characters (the
     quadratic cost term), a fresh word outbids a restatement (the fresh
     term), and a detail made only of words already in the box is pushed
     to the back of the queue (the repeat term). */
  return (1 + fresh * 0.2 - repeat * 0.1) / Math.max(cost * cost / 16, 6);
}
