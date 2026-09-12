/* engine/harmony.js — diatonic chord concretization.
   The rolled chord progression is written in roman numerals
   ("i – VI – III – VII") which tells a producer the FUNCTION of every
   chord but not the NOTES. Suno (and the human at a keyboard) benefits
   enormously from the actual chords in the rolled key/scale:

       A natural minor + i – VI – III – VII → Am – F – C – G

   Triad qualities (major / minor / diminished / augmented / suspended)
   are derived from the scale's own interval stack, so exotic modes come
   out correct: phrygian II is major, locrian v is diminished, and so on.
   Non-heptatonic scales (pentatonic, whole-tone, 12-tone clusters) have
   no diatonic 3rds-and-5ths stack, so concretization politely yields ""
   and the roman numerals stay in the prompt unchanged. Pure logic, no
   DOM, deterministic, fully testable. */
import { scaleOf } from "./music.js";
import { NOTE_NAMES } from "../data/scales.js";

const NUM = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
/* Borrowed / altered degrees get conventional qualities: flatted scale
   degrees in minor/modal pop are major chords (bII Neapolitan, bIII, bVI,
   bVII), #iv is the classic diminished passing chord. */
const ALTERED_QUALITY = { "-2": "maj", "-3": "maj", "-6": "maj", "-7": "maj", "+4": "dim" };

/* Case-aware roman-numeral parse: upper-case = major triad, lower-case =
   minor, ° = diminished, ø = half-diminished, + = augmented; leading or
   trailing b/# shift the diatonic root by a semitone (e.g. "bVI", "VIIb"). */
export function parseRoman(raw) {
  const t = String(raw).trim();
  if (!t) return null;
  let accidental = 0;
  const lead = t.match(/^[b#♭♯]+/);
  const tail = t.match(/[b#♭♯]+$/);
  if (lead) for (const ch of lead[0]) accidental += (ch === "#" || ch === "♯") ? 1 : -1;
  if (tail) for (const ch of tail[0]) accidental += (ch === "#" || ch === "♯") ? 1 : -1;
  const core = t.replace(/^[b#♭♯]+/, "").replace(/[b#♭♯°ø+]+$/, "");
  const degree = NUM[core.toLowerCase()];
  if (!degree) return null;
  let quality;
  if (/°/.test(t)) quality = "dim";
  else if (/ø/.test(t)) quality = "halfdim";
  else if (/\+/.test(t) || /aug/i.test(t)) quality = "aug";
  else quality = /^[IV]/.test(core) ? "maj" : "min";
  return { degree, accidental, quality };
}

function norm12(x) { return ((x % 12) + 12) % 12; }

/* Altered numerals (bII, bIII, bVI, bVII, #iv) are written against the
   MAJOR scale (modal-mixture convention), not the current mode: bII is
   the root +1 semitone even in phrygian, where it happens to be in-scale. */
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

/* Triad quality by stacking scale thirds for heptatonic scales. */
function diatonicTriadAt(iv, idx) {
  const n = iv.length;
  const at = d => iv[((d % n) + n) % n] + 12 * Math.floor(d / n);
  const root = at(idx);
  const third = at(idx + 2) - root;
  const fifth = at(idx + 4) - root;
  let quality;
  if (third === 3 && fifth === 6) quality = "dim";
  else if (third === 3 && fifth === 7) quality = "min";
  else if (third === 4 && fifth === 7) quality = "maj";
  else if (third === 4 && fifth === 8) quality = "aug";
  else if (third === 5) quality = "sus4";
  else if (third === 2) quality = "sus2";
  else quality = fifth === 7 ? "maj" : "min";
  return { root, quality };
}

export function chordName(rootPc, quality) {
  const note = NOTE_NAMES[norm12(rootPc)];
  switch (quality) {
    case "min": return note + "m";
    case "dim": return note + "dim";
    case "halfdim": return note + "m7b5";
    case "aug": return note + "aug";
    case "sus2": return note + "sus2";
    case "sus4": return note + "sus4";
    case "power": return note + "5";
    default: return note;
  }
}

/* One roman token → concrete chord name in the state's key, or "". */
export function concreteChord(s, token) {
  const sc = scaleOf(s);
  if (!sc.iv || sc.iv.length !== 7) return "";
  const p = parseRoman(token);
  if (!p) return "";
  const idx = p.degree - 1;
  const rootPc = (s.rootPc | 0) + (p.accidental ? MAJOR_STEPS[idx] + p.accidental : diatonicTriadAt(sc.iv, idx).root);
  let quality = p.quality;
  if (p.accidental) quality = ALTERED_QUALITY[(p.accidental > 0 ? "+" : "-") + p.degree] || quality;
  return chordName(rootPc, quality);
}

/* "i – VI – III – VII" → "Am – F – C – G" (or "" when not concretizable).
   Splits on en dash, hyphen, slash and comma, ignores the "(phrygian)"
   gloss and any unparsable tokens. */
export function concreteProgression(s) {
  const sc = scaleOf(s);
  if (!sc.iv || sc.iv.length !== 7 || !s.chordProg) return "";
  const tokens = String(s.chordProg).replace(/\([^)]*\)/g, "").split(/\s*[–\-—/,]\s*/).filter(Boolean);
  const names = [];
  for (const t of tokens) {
    const c = concreteChord(s, t);
    if (c) names.push(c);
  }
  if (names.length < 2) return "";
  return names.join(" – ");
}

/* All seven diatonic triads with their roman labels, e.g. for A minor:
   ["Am (i)", "Bdim (ii°)", "C (III)", "Dm (iv)", "Em (v)", "F (VI)", "G (VII)"].
   Returns [] for non-heptatonic scales. */
export function diatonicTriads(s) {
  const sc = scaleOf(s);
  if (!sc.iv || sc.iv.length !== 7) return [];
  const lowerLabels = ["i", "ii", "iii", "iv", "v", "vi", "vii"];
  const out = [];
  for (let i = 0; i < 7; i++) {
    const triad = diatonicTriadAt(sc.iv, i);
    const rootPc = (s.rootPc | 0) + triad.root;
    const name = chordName(rootPc, triad.quality);
    let label = lowerLabels[i];
    if (triad.quality === "maj") label = label.toUpperCase();
    if (triad.quality === "dim") label = lowerLabels[i] + "°";
    if (triad.quality === "aug") label = lowerLabels[i] + "+";
    out.push(name + " (" + label + ")");
  }
  return out;
}

/* Convenience: full progression line for the Full Brief. */
export function progressionText(s) {
  const roman = String(s.chordProg || "").replace(/\s+/g, " ").trim();
  const concrete = concreteProgression(s);
  if (!roman) return "";
  return concrete ? roman + "  →  " + concrete : roman;
}
