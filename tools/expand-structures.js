/* tools/expand-structures.js — GENERATES data/structure-extra.js
   The "structure wave": deterministic expansion of the arrangement pools.

   The verbatim ARRANGEMENTS pool has 40 entries and every single roll of
   the Arrangement atom draws from it — the thinnest pool per roll in the
   app. This adds hundreds of generated section-chains (intro → build →
   drop → breakdown → climax → outro shapes), plus a second wave of
   no-break arrangements for NO-STOP mode (the hand-written pool had 18).

   Same guarantees as the other generators: deterministic (seeded), no
   banned low-energy words, no vocal references, deduped against the
   verbatim pools. The no-stop wave additionally refuses every break-word
   (break/breakdown/bridge/gap/pause/silence…) so a no-stop track can
   never grow a break by re-roll.

   Run: node tools/expand-structures.js */
import { writeFileSync } from "node:fs";
import { ARRANGEMENTS } from "../data/concept.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
const BANNED_RE = /\b(minimal|minimalist|minimalism|sparse|restrained|low[- ]?energy|weak|tiny|gentle|quiet|soft|thin|calm|subdued|delicate|faint|mellow)\b/i;
const VOCAL_RE = /\b(vox|chorus|refrain|verse|vocal|vocals|voice|voices|sing|singing|singer|choir|chant|chants|lyric|lyrics|spoken|acapella|scream|screaming|whisper|whispers|rap|rapping|hum|humming)\b/i;
/* break-words a no-stop arrangement must never contain */
const NOBREAK_RE = /\b(break|breaks|breakdown|breakdowns|breakbeat|bridge|bridges|gap|gaps|pause|pauses|silence|silent|vacuum|blackout|rest|breather|lull|stutter|stutters)\b/i;

function cleanText(t, noBreak) {
  if (!t || t.length > 160) return false;
  if (BANNED_RE.test(t) || VOCAL_RE.test(t)) return false;
  if (noBreak && NOBREAK_RE.test(t)) return false;
  return true;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260914);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ------------------------------------------------ standard arrangements ------------------------------------------------
   Every word below survives genreSafeText() for organic AND hybrid worlds
   (no stripped nouns/adjectives), so generated chains never degrade — they
   read as-written in any rolled genre. */
const INTROS = [
  "cinematic intro", "hypnotic loop intro", "rolling groove intro", "tension-building intro",
  "atmospheric intro", "drum-first intro", "bass-led intro", "arpeggio intro",
  "ambient swell intro", "stripped intro", "signal-led intro", "percussion-stack intro",
  "loop-tease intro", "sub-rumble intro", "strobe-paced intro", "signal-static intro",
  "countdown intro", "low-end tease intro", "melodic tease intro", "engine-hum intro"
];
const BUILDS = [
  "driving build", "layered build", "rising-tension build", "snare-march build",
  "noise-sweep build", "riser-driven build", "accelerating build", "sixteen-bar build",
  "pressure build", "turbo build", "layer-by-layer build", "white-noise climb",
  "percussion build", "strobe build", "double-time build", "tension-coil build",
  "alarm-led build", "pitch-climb build", "drum-stack build", "momentum build"
];
const DROPS = [
  "devastating drop", "floor-igniting drop", "power drop", "earth-shaking drop",
  "rolling drop", "double drop", "peak drop", "hypnotic drop",
  "maximum-impact drop", "sub-heavy drop", "razor-cut drop", "floor-filling drop",
  "concussive drop", "euphoric drop", "concrete drop",
  "nitro drop", "weightless-then-heavy drop", "full-system drop",
  "sky-cracking drop", "seismic drop"
];
const BREAKDOWNS = [
  "stripped breakdown", "dark breakdown", "emotional breakdown", "tension breakdown",
  "half-time breakdown", "melodic breakdown", "dub-echo breakdown", "ghostly breakdown",
  "sub-only breakdown", "cavernous breakdown", "detuned breakdown", "signal-lost breakdown",
  "clockwork breakdown", "aftermath breakdown", "mirage breakdown", "pressure-valve breakdown"
];
const CLIMAXES = [
  "euphoric climax", "maximum climax", "triumphant climax", "wall-of-sound climax",
  "towering climax", "explosive climax", "final-peak climax", "seismic climax",
  "blinding climax", "white-knuckle climax", "all-lights climax", "full-force climax",
  "supernova climax", "ceiling-lift climax", "avalanche climax", "encore climax"
];
const OUTROS = [
  "explosive outro", "fading outro", "abrupt outro", "locked-groove outro",
  "echo-out outro", "tape-delay outro", "ringing outro", "hard outro",
  "stripped outro", "runaway outro", "burnout outro", "engine-down outro",
  "horizon outro", "afterglow outro", "cut-to-black outro", "spiralling outro"
];

function chain(parts) { return parts.join(", "); }
function standardChains() {
  const out = [];
  for (const i of INTROS) {
    for (const b of BUILDS) {
      /* sample the cartesian space deterministically but broadly */
      const d = DROPS[Math.floor(rnd() * DROPS.length)];
      const d2 = DROPS[Math.floor(rnd() * DROPS.length)];
      const br = BREAKDOWNS[Math.floor(rnd() * BREAKDOWNS.length)];
      const c = CLIMAXES[Math.floor(rnd() * CLIMAXES.length)];
      const o = OUTROS[Math.floor(rnd() * OUTROS.length)];
      const shape = rnd();
      if (shape < 0.30) out.push(chain([i, b, d, br, c, o]));            // full arc
      else if (shape < 0.55) out.push(chain([i, b, d, c, o]));           // no breakdown
      else if (shape < 0.75) out.push(chain([i, b, d, br, d2, o]));      // drop → breakdown → second drop
      else if (shape < 0.90) out.push(chain([i, b, d, br, c, o]));       // full arc variant
      else out.push(chain([i, b, d, o]));                                // compact
    }
  }
  return out;
}

/* ------------------------------------------------ no-stop arrangements ------------------------------------------------ */
const NS_INTROS = [
  "driving intro", "instant intro", "groove-locked intro", "kick-led intro",
  "rolling percussion intro", "one-bar count-in", "bass-first intro", "punch-in intro",
  "rapid-fire intro", "riddim intro", "locked loop intro", "arpeggio intro",
  "drum-box intro", "full-throttle intro", "no-warning intro", "engine-rev intro"
];
const NS_BUILDS = [
  "driving build", "no-warning build", "rolling build", "tightening build",
  "rapid layer build", "locked pocket build", "hi-hat acceleration build", "rolling toms build",
  "sixteen-bar rocket build", "no-breath build", "syncopated build", "kick-roll build",
  "snare-march build", "percussion stack build", "instant-momentum build", "seamless build"
];
const NS_PEAKS = [
  "non-stop rolling groove", "continuous peak section", "back-to-back drops",
  "pounding groove engine", "wall-of-drums climax", "non-stop peak drive",
  "maximum climax", "pulsing groove drop", "bouncing peak groove", "seamless double climax",
  "rolling peak engine", "unstoppable drive", "floor-locked peak", "full-throttle peak",
  "perpetual-motion groove", "runaway peak"
];
const NS_OUTROS = [
  "hard-driving outro", "runaway outro", "locked outro", "burnout outro",
  "spinning outro", "abrupt outro", "tape-stop outro", "full-throttle outro",
  "fading-but-rolling outro", "engine-redline outro", "straight-through outro", "ringing-drive outro",
  "cut outro", "momentum outro", "no-landing outro", "final-lap outro"
];
function noStopChains() {
  const out = [];
  for (const i of NS_INTROS) {
    for (const b of NS_BUILDS) {
      const p = NS_PEAKS[Math.floor(rnd() * NS_PEAKS.length)];
      const p2 = NS_PEAKS[Math.floor(rnd() * NS_PEAKS.length)];
      const o = NS_OUTROS[Math.floor(rnd() * NS_OUTROS.length)];
      if (rnd() < 0.5) out.push(chain([i, b, p, o]));
      else out.push(chain([i, b, p, p2 === p ? NS_PEAKS[(NS_PEAKS.indexOf(p) + 3) % NS_PEAKS.length] : p2, o]));
    }
  }
  return out;
}

/* ------------------------------------------------ grow ------------------------------------------------ */
function grow(basePool, phrases, cap, noBreak) {
  const base = new Set((basePool || []).map(x => String(x).toLowerCase().trim()));
  const seen = new Set();
  const out = [];
  for (const p of shuffle(phrases)) {
    const t = String(p).replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!cleanText(t, noBreak) || base.has(k) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/* the hand-written NO_STOP_ARRANGEMENTS live in engine/genre.js — dedupe
   against their recurring phrases by importing nothing: instead refuse any
   chain identical to them is impossible here, so the engine dedupes at merge. */
const EXTRA_ARRANGEMENTS = grow(ARRANGEMENTS, standardChains(), 260, false);
const EXTRA_NO_STOP_ARRANGEMENTS = grow([], noStopChains(), 170, true);

const total = EXTRA_ARRANGEMENTS.length + EXTRA_NO_STOP_ARRANGEMENTS.length;
const fmt = a => JSON.stringify(a, null, 0).replace(/","/g, '",\n    "');
writeFileSync(new URL("../data/structure-extra.js", import.meta.url),
  `/* data/structure-extra.js — GENERATED by tools/expand-structures.js. DO NOT EDIT BY HAND.
   Additive arrangement expansion: ${EXTRA_ARRANGEMENTS.length} standard section-chains and
   ${EXTRA_NO_STOP_ARRANGEMENTS.length} no-break chains for NO-STOP mode. Deterministic, banned-word free,
   vocal-safe; the no-break wave refuses every break-word. The verbatim pools are never
   modified — these are appended at runtime by engine/genre.js. */\n
export const EXTRA_ARRANGEMENTS = ${fmt(EXTRA_ARRANGEMENTS)};\n
export const EXTRA_NO_STOP_ARRANGEMENTS = ${fmt(EXTRA_NO_STOP_ARRANGEMENTS)};\n`);
console.log("structure expansion written: " + total + " arrangements (" +
  EXTRA_ARRANGEMENTS.length + " standard + " + EXTRA_NO_STOP_ARRANGEMENTS.length + " no-stop)");
