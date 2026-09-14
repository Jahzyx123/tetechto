/* tools/expand-sounds2.js — GENERATES data/expansion2.js
   The "sounds wave two": deterministic top-up of the 22 thinnest sonic
   pools (54–57 entries after wave one) to ~90+ each, plus the two small
   runtime pools that roll on special modes:
   - NO_STOP_INTENSITY (6 verbatim entries → ~30): rolled on every NO-STOP
     track.
   - VOCAL_DIRECTIONS (24 verbatim entries → ~60): rolled whenever a vocal
     mode is on — here vocal words are ON PURPOSE, so only the banned
     minimal-word guard applies.

   Same contract as wave one: deterministic (seeded), banned-word free,
   deduped against the verbatim pool AND itself, additions only — the
   verbatim pools are never modified.

   Run: node tools/expand-sounds2.js */
import { writeFileSync } from "node:fs";
import * as D from "../data/index.js";
import { VOCAL_DIRECTIONS } from "../data/safety.js";

/* The six verbatim NO-STOP intensities (engine/state.js NO_STOP_INTENSITY
   base list — kept inline here so the generator never imports the engine,
   which would create a cycle via data/expansion2.js). */
const NO_STOP_INTENSITY_BASE = [
  "unrelenting delivery", "maximum-energy delivery", "relentless forward drive",
  "peak-time sustained force", "wall of relentless energy", "full-force continuous drive"
];

/* ------------------------------------------------ guards ------------------------------------------------ */
const DIRTY_MINIMAL = ["minimal", "minimalist", "minimalism", "sparse", "restrained",
  "low-energy", "low energy", "weak", "tiny", "gentle", "quiet"];
const VOCAL_WORDS = (D.VOCAL_WORDS || []).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.join("|") + ")\\b", "i");
function cleanText(t, allowVocal) {
  if (!t || t.length > 64) return false;
  const low = t.toLowerCase();
  for (const b of DIRTY_MINIMAL) if (low.includes(b)) return false;
  if (!allowVocal && VOCAL_RE.test(low)) return false;
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
const rnd = mulberry32(20260915);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const X = (...lists) => {
  let out = [""];
  for (const l of lists) out = out.flatMap(p => l.map(w => (p ? p + " " : "") + w));
  return out;
};
function grow(name, phrases, cap, allowVocal) {
  const base = new Set((D[name] || []).map(x => String(x).toLowerCase().trim()));
  const seen = new Set();
  const out = [];
  for (const p of shuffle(phrases)) {
    const t = String(p).replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!cleanText(t, allowVocal) || base.has(k) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/* fresh maximum-energy adjective stack (wave one already owns
   maximum / relentless / explosive / ferocious / crushing / slamming /
   pounding / thunderous…) */
const A2 = ["white-hot", "volcanic", "seismic", "blistering", "turbine",
  "piston-forged", "reactor-fed", "furnace-hot", "razor-edged", "iron-clad",
  "molten", "feral", "manic", "berserk", "unrelenting", "runaway",
  "freight-train", "redline", "shockwave", "avalanche", "supernova",
  "juggernaut", "warpath", "chainsaw", "afterburner", "dynamo",
  "overclocked", "storm-forged", "granite", "cannon-grade"];

const POOLS = {
  SHIMMER_TYPE: X(A2, ["shimmer", "sparkle", "glow", "glisten", "gleam", "sheen", "halo", "cymbal shimmer", "glass shimmer", "bell shimmer", "plate shimmer", "air-band shimmer"], ["", "drive"]),
  ENERGY_CURVE_TYPES: X(A2, ["energy curve", "power curve", "drive curve", "force curve"], ["", "drive"]),
  ENERGY_CURVE_SHAPES: null, /* placeholder, replaced below */
  STEREO_ENHANCE_TYPES: X(A2, ["mid-side widening", "haas widening", "ping-pong spread", "dual-mono spread", "ambient widening", "stereo-bus lift", "room-mic spread", "orbiting spread"], ["", "drive"]),
  VIBRATO_TYPES: X(A2, ["wide vibrato", "narrow vibrato", "deep vibrato", "shallow vibrato", "arm vibrato", "finger vibrato", "delayed vibrato", "feedback vibrato"], ["", "drive"]),
  INVERSION_TYPES: X(A2, ["drop-3 voicing", "spread voicing", "cluster voicing", "open-fifth voicing", "pedal-tone voicing", "slash-bass voicing", "upper-structure voicing", "close-stack voicing"], ["", "drive"]),
  RESOLUTION_TYPES: X(A2, ["authentic cadence", "plagal cadence", "deceptive cadence", "modal cadence", "blues cadence", "phrygian cadence", "lydian cadence", "pedal-hold cadence"], ["resolution", ""], ["", "drive"]),
  TRANSITION_TYPES: X(A2, ["cymbal-wash transition", "reverse-sweep transition", "fill-driven transition", "breakdown-turn transition", "filter-ride transition", "impact-hit transition", "pickup-bar transition", "drum-roll transition"]),
  DROP_TYPES: X(A2, ["first-impact drop", "rolling-groove drop", "halftime-switch drop", "peak-hour drop", "afterglow drop", "second-wind drop", "turbo drop", "wall-of-force drop", "full-system drop", "sky-cracking drop"]),
  SIDECHAIN_CURVE_TYPES: X(A2, ["four-on-floor pump", "offbeat duck", "breathing duck", "hard-pump curve", "deep duck curve", "gated pump", "tempo-locked duck", "floor-pulse pump"], ["curve", ""], ["", "drive"]),
  MOD_DEPTH: X(A2, ["full-sweep depth", "edge-of-chaos depth", "sub-osc depth", "pitch-wide depth", "filter-eating depth", "hair-trigger depth", "slow-creep depth", "maximum-throw depth"], ["", "drive"]),
  INTERVAL_LEAPS: X(A2, ["octave-and-a-half leap", "compound leap", "wide-register leap", "sawtooth leap", "staircase leap", "diving leap", "rocketing leap", "double-octave leap"], ["", "drive"]),
  RIDE_TYPES: X(A2, ["washy ride", "dry ride", "ping ride", "crash-ride", "riveted ride", "dark ride", "bright ride", "hammered ride", "bell ride", "sizzle ride"]),
  CLAP_LAYERS: X(A2, ["double-clap stack", "room-clap layer", "snapped clap stack", "gated clap wall", "tambourine-clap blend", "crowd-clap layer", "delayed clap echo", "chain-clap layer"], ["", "drive"]),
  RISER_TYPES: X(A2, ["white-noise riser", "siren riser", "pitch riser", "filter riser", "string riser", "drum-roll riser", "alarm riser", "turbine riser", "voltage riser", "strobe riser"]),
  BUILD_TYPES: X(A2, ["snare-roll build", "filter-climb build", "riser-stacked build", "tom-roll build", "turbo build", "pressure-cooker build", "sixteen-bar build", "double-time build", "alarm-stack build", "kick-roll build"]),
  FILTER_RESONANCE_TYPES: X(A2, ["screaming resonance", "whistling resonance", "squelch resonance", "howling resonance", "laser resonance", "biting resonance", "formant resonance", "voltage resonance"], ["", "drive"]),
  STEREO_IMAGE: X(A2, ["hard-left image", "hard-right image", "center-locked image", "orbiting image", "ping-pong image", "wide-stage image", "depth-stacked image", "horizon image"]),
  STEREO_WIDTH: X(A2, ["wall-wide width", "front-row width", "club-wide width", "arena-wide width", "horizon-wide width", "binaural width", "edge-to-edge width", "main-stage width"]),
  MOD_RATE: X(A2, ["flutter rate", "sub-rate", "clocked rate", "half-time rate", "double-time rate", "tempo-synced rate", "slow-creep rate", "strobe rate", "turbine rate"], ["", "drive"]),
  REVERB_DECAY_TYPES: X(A2, ["cathedral decay", "cavern decay", "plate tail", "spring tail", "infinite tail", "gated tail", "shimmer tail", "blackhole decay", "bunker decay"], ["", "drive"]),
  HUMANIZE_TYPES: X(A2, ["swung timing", "pushed timing", "dragged timing", "loose-limbed timing", "hand-played timing", "breathing timing", "live-wire timing", "drunken-master timing"], ["", "drive"]),
  POCKET_TYPES: X(A2, ["behind-the-beat pocket", "ahead-of-the-beat pocket", "dead-center pocket", "deep pocket", "locked pocket", "swinging pocket", "driving pocket", "concrete pocket"], ["", "drive"])
};
delete POOLS.ENERGY_CURVE_SHAPES;
/* energy curve also takes shape vocabulary */
POOLS.ENERGY_CURVE_TYPES = POOLS.ENERGY_CURVE_TYPES.concat(
  X(["step-climb", "ramp", "surge", "staircase", "slow-burn climb", "double-peak", "wave-crest", "plateau-push", "afterburner climb"], ["energy curve", "drive arc", "power curve"]));

/* tier two: the pools sitting at 57–83 after wave one */
Object.assign(POOLS, {
  DELAY_FEEDBACK_TYPES: X(A2, ["delay feedback", "echo feedback", "repeat feedback", "regeneration", "echo trail", "feedback loop", "ping-pong feedback"], ["", "drive"]),
  PERC_FILLS: X(A2, ["perc fill", "drum fill", "tom fill", "perc break", "roll fill", "conga fill", "timbal fill", "metal fill"]),
  CHOP_TYPES: X(A2, ["chop", "cut", "slice", "edit", "splice", "stutter-cut", "gate-chop"], ["", "drive"]),
  SPATIAL_MOVEMENT: X(A2, ["orbit movement", "pan sweep", "spatial drift", "doppler pass", "fly-by movement", "rotating field", "overhead sweep", "depth pull"]),
  PORTAMENTO_TYPES: X(A2, ["portamento glide", "pitch slide", "ribbon glide", "finger slide", "whistle glide", "locked glide", "fast glide", "legato glide"]),
  SCALE_RUNS: X(A2, ["phrygian run", "lydian run", "harmonic-minor run", "chromatic run", "pentatonic run", "whole-tone run", "diminished run", "blues run", "dorian run", "arabic run"]),
  VOICING_TYPES: X(A2, ["spread voicing", "close voicing", "drop-2 voicing", "drop-3 voicing", "cluster voicing", "open voicing", "shell voicing", "quartal voicing", "upper-structure voicing", "rootless voicing"]),
  MOD_SOURCE: X(A2, ["LFO source", "envelope source", "step-seq source", "random source", "mod-wheel source", "aftertouch source", "clock source", "velocity source", "ribbon source", "macro source"]),
  GHOST_NOTES: X(A2, ["ghost notes", "ghost taps", "ghost strokes", "ghost ticks", "ghost flicks", "ghost bumps"], ["", "drive"]),
  ORNAMENT_TYPES: X(A2, ["grace-note ornament", "turn ornament", "mordent ornament", "slide ornament", "fall ornament", "doit ornament", "scoop ornament", "shake ornament", "gliss ornament"]),
  TENSION_TYPES: X(A2, ["b9 tension", "#9 tension", "#11 tension", "13 tension", "add9 tension", "sus4 tension", "6/9 tension", "b13 tension", "altered tension"]),
  MOD_DEST: X(A2, ["filter cutoff target", "pitch target", "amp target", "reverb-send target", "pan target", "waveform target", "resonance target", "delay-time target", "drive target", "pulse-width target"]),
  DELAY_TIME_TYPES: X(A2, ["slapback delay time", "tape delay time", "quarter-note delay", "dotted-eighth delay", "eighth-note delay", "sixteenth delay", "triplet delay", "ping-pong delay time", "tempo-locked delay"]),
  FX_TYPES: X(A2, ["tape stop", "reverse swell", "bitcrush hit", "strobe cut", "pitch dive", "granular freeze", "spectral wash", "downlift", "uplifter", "impact boom", "sub drop", "gate stutter"]),
  MASTER_CHAIN: X(A2, ["master chain", "bus chain", "glue chain", "limiter chain", "master bus", "final stage"], ["", "drive"]),
  COMPRESSION_TYPES: X(A2, ["bus compression", "sidechain compression", "parallel compression", "brickwall limiting", "opto compression", "FET compression", "vari-mu compression", "multiband compression", "glue compression", "peak limiting"]),
  STEREO_TYPES: X(A2, ["stereo field", "stereo image", "wide stereo", "mid-side stereo", "dual-mono stereo", "blumlein stereo", "binaural stereo", "XY stereo"]),
  MASTER_LOUDNESS: X(A2, ["master level", "loudness target", "peak ceiling", "integrated loudness", "program level"], ["", "drive"]),
  DISTORTION_TYPES: X(A2, ["tape saturation", "tube drive", "console saturation", "wavefolder drive", "fuzz drive", "hard-clip drive", "soft-clip drive", "bitcrush drive", "amp drive", "transformer saturation"])
});

const EXTRA_POOLS_W2 = {};
let total = 0;
for (const name in POOLS) {
  const added = grow(name, POOLS[name], 40, false);
  if (added.length) { EXTRA_POOLS_W2[name] = added; total += added.length; }
}

/* ---------------- NO-STOP intensity wave ---------------- */
const NS_ADJ = ["sustained", "continuous", "unbroken", "non-stop", "zero-rest",
  "perpetual", "full-throttle", "full-send", "wall-to-wall", "all-night",
  "double-peak", "engine-redline", "turbine-driven", "floor-locked",
  "no-lift", "max-pressure", "peak-hour", "unstoppable"];
const NS_NOUN = ["delivery", "drive", "force", "surge", "pressure", "push",
  "assault", "output", "momentum", "charge", "thrust", "pull"];
const nsAdded = grow("NO_STOP_INTENSITY", X(NS_ADJ, NS_NOUN), 24, false);
/* dedupe against the verbatim list */
const nsBase = new Set(NO_STOP_INTENSITY_BASE.map(x => x.toLowerCase().trim()));
const EXTRA_NO_STOP_INTENSITY_W2 = nsAdded.filter(x => !nsBase.has(x.toLowerCase().trim()));

/* ---------------- vocal direction wave (vocal words intended) ---------------- */
const VD_ADJ = ["commanding", "stacked", "gritty", "airy", "double-tracked",
  "reverb-soaked", "staccato", "soaring", "murmured", "ad-lib heavy",
  "gang-shout", "pitch-shifted", "vocoder-laced", "choir-stacked",
  "raw live-take", "delay-thrown", "half-sung", "percussive", "lush layered",
  "distorted megaphone", "intimate dry", "anthemic", "huge stadium",
  "processed glitch", "punchy double-time", "haunting reverb",
  "power-belted", "hypnotic repeating", "cinematic", "urgent shouted",
  "warm ensemble", "explosive", "call-and-response", "call-and-answer",
  "smooth legato", "crisp rhythmic"];
const VD_NOUN = ["vocal lead", "vocal wall", "vocal hook", "vocal glide",
  "vocal duel", "vocal punch", "vocal wash", "vocal stabs", "vocal belt",
  "vocal texture", "vocal arc", "vocal take", "vocal echoes", "vocal flow",
  "vocal hits", "vocal pad", "vocal chant", "vocal trade", "vocal peak",
  "vocal phrase", "vocal swell", "vocal section", "vocal burst", "vocal line"];
const EXTRA_VOCAL_DIRECTIONS_W2 = grow("VOCAL_DIRECTIONS", X(VD_ADJ, VD_NOUN), 36, true)
  .filter(x => !new Set(VOCAL_DIRECTIONS.map(v => v.toLowerCase().trim())).has(x.toLowerCase().trim()));

const fmt = a => JSON.stringify(a).replace(/","/g, '",\n    "');
let src = `/* data/expansion2.js — GENERATED by tools/expand-sounds2.js. DO NOT EDIT BY HAND.
   Sounds wave two: top-up of the 22 thinnest sonic pools (+${total} entries),
   NO-STOP intensity (+${EXTRA_NO_STOP_INTENSITY_W2.length}) and vocal directions
   (+${EXTRA_VOCAL_DIRECTIONS_W2.length}). Deterministic, banned-word free, deduped
   against the verbatim pools. Vocal directions intentionally carry vocal words. */\n\n`;
src += "export const EXTRA_POOLS_W2 = {\n";
for (const name in EXTRA_POOLS_W2) src += `  ${name}: ${fmt(EXTRA_POOLS_W2[name])},\n`;
src += "};\n";
src += `\nexport const EXTRA_NO_STOP_INTENSITY_W2 = ${fmt(EXTRA_NO_STOP_INTENSITY_W2)};\n`;
src += `\nexport const EXTRA_VOCAL_DIRECTIONS_W2 = ${fmt(EXTRA_VOCAL_DIRECTIONS_W2)};\n`;
writeFileSync(new URL("../data/expansion2.js", import.meta.url), src);
console.log("sounds wave two written: +" + total + " sound entries across " +
  Object.keys(EXTRA_POOLS_W2).length + " pools, +" + EXTRA_NO_STOP_INTENSITY_W2.length +
  " no-stop intensities, +" + EXTRA_VOCAL_DIRECTIONS_W2.length + " vocal directions");
