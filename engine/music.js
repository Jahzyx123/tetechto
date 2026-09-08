/* engine/music.js — musical key helpers (scales, key names, Camelot).
   Ported 1:1 from the legacy engine. All functions take the app state
   (or a state-shaped object with rootPc / scaleId) explicitly. */
import { NOTE_NAMES, SCALES, MICRO_MODES } from "../data/scales.js";

export const SCALE_BY_ID = {}; SCALES.forEach(s => SCALE_BY_ID[s.id] = s);
export const MICRO_BY_ID = {}; MICRO_MODES.forEach(m => MICRO_BY_ID[m.id] = m);

export function scaleOf(s) { return SCALE_BY_ID[s.scaleId] || SCALES[0]; }
export function keyName(s) { return NOTE_NAMES[((s.rootPc | 0) % 12 + 12) % 12] + " " + scaleOf(s).n; }
/* Single source of harmonic truth: colour always mirrors the chosen scale. */
export function syncHarmonicColor(s) { s.chordColor = scaleOf(s).n; return s; }
/* Camelot wheel position — so this track can be matched into a DJ set. */
export function camelot(s) {
  const sc = scaleOf(s);
  const minorish = sc.iv.indexOf(4) === -1;      // no major third → treat as minor
  const order = minorish ? [9, 4, 11, 6, 1, 8, 3, 10, 5, 0, 7, 2] : [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  const idx = order.indexOf(((s.rootPc | 0) % 12 + 12) % 12);
  return (idx < 0 ? 1 : idx + 1) + (minorish ? "A" : "B");
}
export function freqOf(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
export function microOf(id) { return MICRO_BY_ID[id] || MICRO_MODES[0]; }
export function scaleNote(s, degree, octave) {
  const iv = scaleOf(s).iv, len = iv.length;
  const oct = octave + Math.floor(degree / len);
  const d = ((degree % len) + len) % len;
  return 12 * (oct + 1) + (((s.rootPc | 0) % 12 + 12) % 12) + iv[d];
}
