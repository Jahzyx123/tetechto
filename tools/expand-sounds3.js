/* tools/expand-sounds3.js — GENERATES data/expansion3.js
   The "sounds wave three": takes every sonic atom pool from its wave-two
   floor (~86 entries) to ~130 rollable entries. A fresh third-tier
   adjective stack crossed with pool-specific context nouns.

   Same contract as waves one and two: deterministic (seeded), banned-word
   free, vocal-safe, melody-safe (no relax vocabulary), deduped against the
   merged pools AND itself. Additions only; verbatim pools never modified.

   Run: node tools/expand-sounds3.js */
import { writeFileSync } from "node:fs";
import * as D from "../data/index.js";
import { VOCAL_WORDS } from "../data/safety.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
const DIRTY_MINIMAL = ["minimal", "minimalist", "minimalism", "sparse", "restrained",
  "low-energy", "low energy", "weak", "tiny", "gentle", "quiet"];
const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "i");
const MELODY_SOFT_RE = /\b(simple|simpl|basic|plain|minimal|sparse|restrained|quiet|subtle|soft|gentle|calm|soothing|serene|peaceful|content|tender|dreamy|mellow|smooth|easy|lazy|unhurried|laid[- ]?back|slow|light|lullab|drift|float|airy|delicate|feather|glacial|breez|languid|leisurely|cozy|vague|warm|tranquil|peace|hum|song|stroll)\b/i;
const MELODY_NAMES = new Set(["FEELINGS", "FLAVORS", "DIRECTIONS", "LEADS", "PERFS",
  "HARMONIES", "ARPS", "CONTOURS", "RHYTHMS"]);
function cleanText(t, melody) {
  if (!t || t.length > 64) return false;
  const low = t.toLowerCase();
  for (const b of DIRTY_MINIMAL) if (low.includes(b)) return false;
  if (VOCAL_RE.test(low)) return false;
  if (melody && MELODY_SOFT_RE.test(low)) return false;
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
const rnd = mulberry32(20260919);
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
function grow(name, phrases, cap, melody) {
  const base = new Set((D[name] || []).map(x => String(x).toLowerCase().trim()));
  const seen = new Set();
  const out = [];
  for (const p of shuffle(phrases)) {
    const t = String(p).replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!cleanText(t, melody) || base.has(k) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/* third-tier physical adjective stack (waves one+two already own their stacks) */
const A3 = ["ballistic", "hydraulic", "stratospheric", "tectonic", "pyroclastic",
  "chrome-lined", "zero-gravity", "neon-wired", "ferrofluid", "obsidian",
  "diamond-cut", "mercury-fed", "krypton-charged", "white-phosphor", "deep-core",
  "jet-stream", "storm-proof", "circuit-woven", "night-forged", "gravity-fed",
  "razor-wired", "turbine-true", "cathedral-deep", "floor-melting", "sky-splitting",
  "iron-winged", "voltage-born", "tide-forged", "ember-lit", "glacier-proof"];
/* emotional intensity stack for the melody pools */
const E3 = ["white-knuckle", "fever-bright", "storm-fed", "tide-pulled", "molten-hearted",
  "blazing", "thunder-struck", "gravity-heavy", "sky-cracking", "ember-lit",
  "flood-lit", "wild-eyed", "heart-first", "wire-taut", "sun-struck",
  "blood-pumping", "starved-for-air", "neon-drenched", "iron-willed", "horizon-bound"];

const DRUM_TAIL = ["", "drive", "engine", "charge"];
const POOLS = {
  /* drums */
  KICKS: X(A3, ["kick weight", "kick slam", "kick punch", "kick thud", "kick drive", "kick impact"], DRUM_TAIL),
  HATS: X(A3, ["hat sizzle", "hat tick", "hat wash", "hat shimmer", "hat cut", "hat spray"], ["", "drive"]),
  SNARES: X(A3, ["snare crack", "snare snap", "snare whip", "snare body", "snare ring", "snare bite"], ["", "drive"]),
  PERCS: X(A3, ["perc accents", "perc colour", "perc sparkle", "perc chatter", "perc detail", "perc bounce"], ["", "drive"]),
  TOMS: X(A3, ["tom thunder", "tom roll", "tom weight", "tom boom", "tom cascade", "tom charge"], DRUM_TAIL),
  GROOVES: X(A3, ["groove engine", "groove pocket", "groove pull", "groove swing", "groove drive", "groove stride"], DRUM_TAIL),
  SWINGS: X(A3, ["swing feel", "swing tilt", "swing lean", "swing bounce", "swing push", "swing ride"], ["", "drive"]),
  SYNCS: X(A3, ["syncopation grid", "off-beat pull", "sync accents", "cross-rhythm web", "syncopated push", "beat weave"], ["", "drive"]),
  INTENSITIES: X(A3, ["intensity surge", "intensity ceiling", "intensity ramp", "intensity bloom", "intensity charge", "intensity wall"], ["", "drive"]),
  RIDE_TYPES: X(A3, ["ride wash", "ride ping", "ride bell", "ride sizzle", "ride pulse", "ride shimmer"], ["", "drive"]),
  CRASH_TYPES: X(A3, ["crash bloom", "crash wash", "crash blast", "crash tail", "crash flare", "crash burst"], ["", "drive"]),
  CLAP_LAYERS: X(A3, ["clap stack", "clap wall", "clap snap", "clap bloom", "clap crack", "clap echo"], ["", "drive"]),
  PERC_FILLS: X(A3, ["perc fill", "drum fill", "tom fill", "roll fill", "metal fill", "conga fill"], ["", "drive"]),
  GHOST_NOTES: X(A3, ["ghost notes", "ghost taps", "ghost strokes", "ghost ticks", "ghost flicks", "ghost bumps"], ["", "drive"]),
  HUMANIZE_TYPES: X(A3, ["humanized timing", "loose-limbed timing", "breathing timing", "hand-played timing", "live-wire timing", "pushed timing"], ["", "drive"]),
  POCKET_TYPES: X(A3, ["deep pocket", "locked pocket", "swinging pocket", "driving pocket", "concrete pocket", "rolling pocket"], ["", "drive"]),
  /* melody emotions — intense stack, relax-proof */
  FEELINGS: X(E3, ["rush", "surge", "ache", "lift", "fever", "pull", "burn", "charge", "bloom", "grip"], ["", "drive"]),
  FLAVORS: X(E3, ["edge", "colour", "shade", "grain", "cast", "tint", "hue", "streak", "undertow", "afterglow"]),
  DIRECTIONS: X(E3, ["forward push", "upward pull", "circling motion", "descending arc", "relentless advance", "surging motion", "headlong drive", "climbing thrust"]),
  LEADS: X(A3, ["lead voice", "lead presence", "lead cut", "lead bloom", "lead edge", "lead fire"], ["", "drive"]),
  PERFS: X(A3, ["performance attack", "performance fire", "performance detail", "performance phrasing", "performance grip", "performance flair"], ["", "drive"]),
  HARMONIES: X(A3, ["harmony bed", "harmony stack", "harmony glow", "harmony wash", "harmony field", "harmony frame"], ["", "drive"]),
  ARPS: X(A3, ["arpeggio cascade", "arpeggio climb", "arpeggio weave", "arpeggio spiral", "arpeggio rain", "arpeggio engine"], ["", "drive"]),
  CONTOURS: X(A3, ["melodic contour", "phrase shape", "line arc", "melody path", "phrase arc", "line trajectory"], ["", "drive"]),
  RHYTHMS: X(A3, ["melody rhythm", "phrase pulse", "note grid", "rhythmic gait", "phrase stride", "note cadence"], ["", "drive"]),
  ORNAMENT_TYPES: X(A3, ["grace-note ornament", "turn ornament", "slide ornament", "fall ornament", "scoop ornament", "shake ornament"], ["", "drive"]),
  VIBRATO_TYPES: X(A3, ["wide vibrato", "deep vibrato", "arm vibrato", "finger vibrato", "delayed vibrato", "feedback vibrato"], ["", "drive"]),
  PORTAMENTO_TYPES: X(A3, ["portamento glide", "pitch slide", "ribbon glide", "finger slide", "locked glide", "legato glide"], ["", "drive"]),
  SCALE_RUNS: X(A3, ["phrygian run", "lydian run", "harmonic-minor run", "chromatic run", "pentatonic run", "whole-tone run", "diminished run", "blues run"], ["", "drive"]),
  INTERVAL_LEAPS: X(A3, ["octave leap", "compound leap", "wide-register leap", "sawtooth leap", "staircase leap", "diving leap", "rocketing leap"], ["", "drive"]),
  VOICING_TYPES: X(A3, ["spread voicing", "close voicing", "drop-2 voicing", "cluster voicing", "open voicing", "shell voicing", "quartal voicing", "rootless voicing"], ["", "drive"]),
  INVERSION_TYPES: X(A3, ["drop-3 voicing", "spread voicing", "cluster voicing", "open-fifth voicing", "pedal-tone voicing", "slash-bass voicing", "upper-structure voicing"], ["", "drive"]),
  TENSION_TYPES: X(A3, ["b9 tension", "#9 tension", "#11 tension", "13 tension", "add9 tension", "sus4 tension", "6/9 tension", "altered tension"], ["", "drive"]),
  RESOLUTION_TYPES: X(A3, ["authentic cadence", "plagal cadence", "deceptive cadence", "modal cadence", "blues cadence", "phrygian cadence", "lydian cadence", "pedal-hold cadence"], ["resolution", ""], ["", "drive"]),
  /* bass */
  BASS_VOICES: X(A3, ["bass voice", "bass body", "bass growl", "bass weight", "bass colour", "bass presence"], ["", "drive"]),
  BASS_MOVES: X(A3, ["bass motion", "bass movement", "bass figure", "bass walk", "bass weave", "bass drive"], ["", "drive"]),
  BASS_RELS: X(A3, ["bass-kick lock", "bass-drums bond", "low-end relation", "bass interplay", "bass anchor", "bass counterweight"], ["", "drive"]),
  /* techno lab */
  TECHNO_DRIVES: X(A3, ["drive engine", "momentum field", "forward thrust", "drive turbine", "propulsion grid", "drive current"], ["", "drive"]),
  TECHNO_ACIDS: X(A3, ["squelch line", "resonance line", "squelch lead", "wailing line", "venom line", "squelch pattern"], ["", "drive"]),
  TECHNO_TEXTURES: X(A3, ["texture grain", "texture wash", "texture field", "grain bed", "surface texture", "texture bloom"], ["", "drive"]),
  TECHNO_RAVES: X(A3, ["stab accents", "stab hits", "flash stabs", "stab bursts", "hit patterns", "flash hits"], ["", "drive"]),
  TECHNO_INDUSTRIALS: X(A3, ["metal rhythm", "forged rhythm", "steel percussion", "hammered pattern", "scrap rhythm", "anvil hits"], ["", "drive"]),
  /* sound design */
  FILTER_TYPES: X(A3, ["tone sweep", "resonance sweep", "cutoff motion", "tone gate", "tone filter path", "sweep shape"], ["", "drive"]),
  ENVELOPE_TYPES: X(A3, ["envelope shape", "attack curve", "decay shape", "envelope snap", "bloom curve", "envelope glide"], ["", "drive"]),
  LFO_TYPES: X(A3, ["LFO wave", "modulation wave", "LFO pattern", "wave motion", "LFO cycle", "modulation cycle"], ["", "drive"]),
  DISTORTION_TYPES: X(A3, ["drive stage", "clip stage", "saturation stage", "drive texture", "grit stage", "fuzz stage"], ["", "drive"]),
  REVERB_TYPES: X(A3, ["hall bloom", "plate bloom", "room bloom", "cathedral wash", "chamber wash", "space bloom"], ["reverb", ""], ["", "drive"]),
  DELAY_TYPES: X(A3, ["echo trail", "delay throw", "repeat pattern", "echo cascade", "delay bounce", "echo weave"], ["", "drive"]),
  SIDECHAIN_TYPES: X(A3, ["ducking groove", "gain-pump motion", "ducking pulse", "breathing duck", "floor-pump groove", "ducking rhythm"], ["", "drive"]),
  STEREO_TYPES: X(A3, ["stereo field", "stereo image", "wide stereo", "mid-side stereo", "dual-mono stereo", "binaural stereo"], ["", "drive"]),
  FX_CHAINS: X(A3, ["FX chain", "effect chain", "chain route", "FX path", "effect route", "chain stage"], ["", "drive"]),
  CHORD_PROGS: X(A3, ["chord progression", "chord cycle", "progression loop", "chord movement", "change pattern", "chord sequence"], ["", "drive"]),
  RHYTHM_PATTERNS: X(A3, ["rhythm pattern", "pattern grid", "groove pattern", "beat pattern", "pulse pattern", "pattern weave"], ["", "drive"]),
  SOUND_INTENSITIES: X(A3, ["sound intensity", "sonic pressure", "volume bloom", "loudness charge", "sound weight", "level surge"], ["", "drive"]),
  /* mix & master */
  MIX_DENSITY: X(A3, ["mix density", "arrangement density", "layer density", "track density", "stack density", "groove density"], ["", "drive"]),
  MIX_ENERGY: X(A3, ["mix energy", "band energy", "forward energy", "track energy", "section energy", "drive energy"], ["", "drive"]),
  MIX_SPACE: X(A3, ["mix space", "mix depth", "stage depth", "mix width", "depth stage", "space frame"], ["", "drive"]),
  MIX_GLUE: X(A3, ["mix glue", "bus glue", "blend glue", "cohesion bed", "mix bond", "groove glue"], ["", "drive"]),
  MIX_PUNCH: X(A3, ["mix punch", "transient punch", "attack punch", "drum punch", "kick punch", "impact punch"], ["", "drive"]),
  MASTER_DRIVE: X(A3, ["master drive", "bus drive", "master colour", "bus energy", "master push", "output drive"], ["", "drive"]),
  MASTER_LOUDNESS: X(A3, ["master level", "loudness target", "peak ceiling", "integrated loudness", "program level", "master loudness"], ["", "drive"]),
  MASTER_COLOR: X(A3, ["master colour", "bus colour", "output tint", "master tone", "final-stage colour", "master sheen"], ["", "drive"]),
  MASTER_CHAIN: X(A3, ["master chain", "bus chain", "glue chain", "limiter chain", "master bus", "final stage"], ["", "drive"]),
  FILTER_CUTOFF_TYPES: X(A3, ["cutoff point", "tone window", "cutoff edge", "tone opening", "cutoff sweep", "tone gate"], ["", "drive"]),
  FILTER_RESONANCE_TYPES: X(A3, ["resonance peak", "resonance ring", "resonance edge", "formant ring", "resonance bite", "resonance howl"], ["", "drive"]),
  EQ_TYPES: X(A3, ["EQ curve", "tone curve", "EQ shape", "band shape", "tone tilt", "EQ contour"], ["", "drive"]),
  COMPRESSION_TYPES: X(A3, ["bus compression", "glue compression", "peak limiting", "parallel compression", "brickwall limiting", "level riding"], ["", "drive"]),
  SATURATION_TYPES: X(A3, ["tape saturation", "tube saturation", "console saturation", "transformer saturation", "harmonic drive", "grit saturation"], ["", "drive"]),
  SIDECHAIN_CURVE_TYPES: X(A3, ["ducking curve", "pump curve", "breathing curve", "gain-pump shape", "ducking shape", "pulse curve"], ["", "drive"]),
  /* spatial */
  STEREO_IMAGE: X(A3, ["image placement", "stage placement", "image frame", "placement field", "stage image", "image slot"], ["", "drive"]),
  STEREO_WIDTH: X(A3, ["width field", "stereo width", "spread width", "image width", "stage width", "width bloom"], ["", "drive"]),
  SPATIAL_DEPTH: X(A3, ["depth field", "stage depth", "depth frame", "front-back depth", "depth bloom", "distance field"], ["", "drive"]),
  SPATIAL_MOVEMENT: X(A3, ["orbit movement", "pan sweep", "spatial drift", "doppler pass", "fly-by movement", "overhead sweep"], ["", "drive"]),
  MOD_SOURCE: X(A3, ["LFO source", "envelope source", "step-seq source", "random source", "clock source", "macro source"], ["", "drive"]),
  MOD_DEST: X(A3, ["pitch target", "amp target", "pan target", "waveform target", "resonance target", "drive target"], ["", "drive"]),
  MOD_RATE: X(A3, ["modulation rate", "LFO rate", "wave rate", "cycle rate", "modulation pace", "motion rate"], ["", "drive"]),
  MOD_DEPTH: X(A3, ["modulation depth", "sweep depth", "motion depth", "wave depth", "throw depth", "modulation reach"], ["", "drive"]),
  /* texture */
  TEXTURE_LAYER: X(A3, ["texture layer", "grain layer", "texture bed", "ambient layer", "surface layer", "texture veil"], ["", "drive"]),
  GRAIN_TYPE: X(A3, ["grain field", "surface grain", "texture grain", "grain bed", "noise grain", "grain wash"], ["", "drive"]),
  SHIMMER_TYPE: X(A3, ["shimmer bed", "shimmer veil", "shimmer halo", "sparkle field", "glow field", "halo wash"], ["", "drive"]),
  ATMOSPHERE_TYPE: X(A3, ["atmosphere bed", "air bed", "ambience field", "atmosphere wash", "room air", "ambient halo"], ["", "drive"]),
  REVERB_SIZE_TYPES: X(A3, ["room size", "hall size", "space size", "chamber size", "reverb scale", "depth size"], ["", "drive"]),
  REVERB_DECAY_TYPES: X(A3, ["reverb decay", "tail length", "tail decay", "bloom decay", "wash decay", "tail fade"], ["", "drive"]),
  STEREO_ENHANCE_TYPES: X(A3, ["stereo widening", "width boost", "image widening", "spread enhancement", "stage widening", "width lift"], ["", "drive"]),
  /* arrangement shapes */
  ENERGY_CURVE_TYPES: X(A3, ["energy curve", "power curve", "drive curve", "force curve", "momentum curve", "surge curve"], ["", "drive"]),
  BUILD_TYPES: X(A3, ["pressure build", "tension build", "layer build", "climb build", "momentum build", "ascent build"], ["", "drive"]),
  DROP_TYPES: X(A3, ["impact drop", "floor drop", "slam drop", "peak drop", "weight drop", "full-force drop"], ["", "drive"]),
  CHOP_TYPES: X(A3, ["chop figure", "cut figure", "slice figure", "edit figure", "splice figure", "gate-chop figure"], ["", "drive"]),
  DELAY_TIME_TYPES: X(A3, ["slapback delay time", "tape delay time", "quarter-note delay", "dotted-eighth delay", "eighth-note delay", "sixteenth delay", "triplet delay", "tempo-locked delay"], ["", "drive"]),
  DELAY_FEEDBACK_TYPES: X(A3, ["delay feedback", "echo feedback", "repeat feedback", "regeneration", "echo trail", "feedback loop", "ping-pong feedback"], ["", "drive"]),
  FX_TYPES: X(A3, ["tape stop", "reverse swell", "strobe cut", "pitch dive", "granular freeze", "spectral wash", "downlift", "uplifter", "impact boom", "sub drop"], ["", "drive"]),
  TRANSITION_TYPES: X(A3, ["transition sweep", "transition fill", "transition wash", "turnaround sweep", "section bridge", "handoff sweep"], ["", "drive"]),
  RISER_TYPES: X(A3, ["riser arc", "climb sweep", "ascent sweep", "riser chain", "lift sweep", "rise bloom"], ["", "drive"]),
  IMPACT_TYPES: X(A3, ["impact hit", "landing hit", "impact boom", "slam hit", "impact slam", "collision hit"], ["", "drive"]),
  SECTION_DENSITY_TYPES: X(A3, ["section density", "arrangement weight", "section stack", "part density", "section load", "groove density"], ["", "drive"])
};

const EXTRA_POOLS_W3 = {};
let total = 0;
for (const name in POOLS) {
  const added = grow(name, POOLS[name], 44, MELODY_NAMES.has(name));
  if (added.length) { EXTRA_POOLS_W3[name] = added; total += added.length; }
}

const fmt = a => JSON.stringify(a).replace(/","/g, '",\n    "');
let src = `/* data/expansion3.js — GENERATED by tools/expand-sounds3.js. DO NOT EDIT BY HAND.
   Sounds wave three: +${total} entries across ${Object.keys(EXTRA_POOLS_W3).length} pools,
   lifting every sonic atom pool toward ~130 rollable entries. Deterministic,
   banned-word free, vocal-safe, melody-safe; deduped against the merged
   pools. Additions only. */\n\n`;
src += "export const EXTRA_POOLS_W3 = {\n";
for (const name in EXTRA_POOLS_W3) src += `  ${name}: ${fmt(EXTRA_POOLS_W3[name])},\n`;
src += "};\n";
writeFileSync(new URL("../data/expansion3.js", import.meta.url), src);
console.log("sounds wave three written: +" + total + " entries across " +
  Object.keys(EXTRA_POOLS_W3).length + " pools");
