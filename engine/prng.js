/* engine/prng.js — seeded PRNG.
   mulberry32 + pick, ported verbatim from the legacy engine: rolls are
   deterministic per seed, so any state (and its URL share link) can be
   reproduced exactly. */

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let rng = mulberry32(Math.floor(Math.random() * 4294967296));

export function newSeed() { return Math.floor(Math.random() * 4294967296); }
export function setSeed(seed) { rng = mulberry32(seed); }
export function random() { return rng(); }
export function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

/* A self-contained RNG bundle for subsystems (lyrics, batch) that need a
   deterministic stream WITHOUT advancing the global roll stream. Mixing
   several integers gives each section/nonce its own independent stream. */
export function hash32(a, b, c) {
  let h = 2166136261 >>> 0;
  for (const v of [a | 0, b | 0, c | 0]) { h ^= (v & 0xff); h = Math.imul(h, 16777619); h ^= (v >>> 8) & 0xff; h = Math.imul(h, 16777619); h ^= (v >>> 16) & 0xff; h = Math.imul(h, 16777619); h ^= (v >>> 24); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function makeRng(seed, a, b) {
  const fn = mulberry32(a === undefined ? (seed | 0) : hash32(seed, a || 0, b || 0));
  return { random: fn, pick: arr => arr[Math.floor(fn() * arr.length)] };
}
