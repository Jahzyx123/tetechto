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
