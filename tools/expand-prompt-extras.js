/* tools/expand-prompt-extras.js — GENERATES data/prompt-extra.js
   The v4.6 wave for the fixed prose left in the prompt:
   - LAYER_PHRASES_EXTRA: ~20 rolled phrases per detail layer (46 layers)
   - SCALE_MOODS_EXTRA:   ~12 rolled moods per scale (27 scales)
   - MELODY_FORCE_EXTRA:  ~10 rolled focus lines per melodic-force level

   The engine picks one entry per (seed, id) — deterministic per track,
   share-reproducible, and without touching the main roll stream.

   Guards: deterministic (seeded), banned minimal words refused, vocal
   references refused, world-safe (survive genreSafeText as-written),
   length-capped, deduped against the verbatim originals. Additions only.

   Run: node tools/expand-prompt-extras.js */
import { writeFileSync } from "node:fs";
import { LAYERS, VOCAL_WORDS } from "../data/safety.js";
import { SCALES } from "../data/scales.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
const DIRTY_MINIMAL = ["minimal", "minimalist", "minimalism", "sparse", "restrained",
  "low-energy", "low energy", "weak", "tiny", "gentle", "quiet"];
const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "i");
/* words genreSafeText strips or rewrites — layer/mood lines must survive */
const WORLD_UNSAFE_RE = /\b(machine|machines|siren|sirens|laser|lasers|filter|filters|synth|synths|synthesizer|rave|warehouse|industrial|stadium|arena|factory|overdrive|anthem|anthems|euphoric|explosive|pumping|crushing|ferocious|stomp|stomping|909|808|303|sidechain)\b/i;

function cleanText(t, max) {
  if (!t || t.length > max) return false;
  const low = t.toLowerCase();
  for (const b of DIRTY_MINIMAL) if (low.includes(b)) return false;
  if (VOCAL_RE.test(low)) return false;
  if (WORLD_UNSAFE_RE.test(low)) return false;
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
const rnd = mulberry32(20260918);
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
function grow(baseArr, phrases, cap, max) {
  const base = new Set((baseArr || []).map(x => String(x).toLowerCase().trim()));
  const seen = new Set();
  const out = [];
  for (const p of shuffle(phrases)) {
    const t = String(p).replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!cleanText(t, max) || base.has(k) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/* ------------------------------------------------ layer phrases ------------------------------------------------ */
const LV = {
  texture: [["layered", "woven", "drifting", "granular", "glassy", "smouldering", "velvet", "rust-bright"], ["analog texture", "texture bed", "grain field", "ambient layer"]],
  fx: [["cinematic", "tidal", "white-knuckle", "slow-burn", "strobe-paced", "horizon-wide"], ["FX swells", "riser arcs", "sweep accents", "impact cues"]],
  mix: [["wide", "concrete-deep", "cathedral-open", "club-ready", "horizon-wide"], ["stereo mix", "low-end weight", "mix image", "front-row balance"]],
  experimental: [["left-field", "feral", "lab-grown", "off-grid", "untamed", "curveball"], ["sound design", "sonic experiments", "texture research", "patch work"]],
  acid: [["hypnotic", "wailing", "coiled", "venomous", "molten", "serpentine"], ["squelch line", "resonance lead", "writhing bassline", "squelch pattern"]],
  modulation: [["aggressive", "turbo", "restive", "surging", "white-knuckle"], ["tone modulation", "resonance movement", "cutoff motion", "modulation grid"]],
  space: [["vast", "cathedral-deep", "horizon-wide", "weightless", "abyssal"], ["spatial depth", "depth field", "stereo depth", "room beyond walls"]],
  reverb: [["cavernous", "cathedral-grade", "endless", "tide-deep", "blackhole"], ["reverb wash", "reverb tail", "hall bloom", "plate bloom"]],
  delay: [["ping-pong", "cascading", "echoing", "spiralling", "ricocheting"], ["delay feedback", "echo trail", "delay throws", "repeat patterns"]],
  glitch: [["strobe-paced", "chopped", "circuit-bent", "fractured", "pixelated"], ["cut fills", "fracture fills", "digital fills", "splice accents"]],
  tuning: [["detuned", "beating", "shimmering", "wide-angled", "drift-tuned"], ["unison stacks", "wide spreads", "beating layers", "detuned beds"]],
  performance: [["humanized", "expressive", "loose-limbed", "lived-in", "breathing"], ["performance feel", "timing feel", "expressive phrasing", "human touch"]],
  sequencing: [["surgical", "clockwork", "grid-locked", "step-perfect", "precision"], ["16-step sequencing", "step motion", "pattern design", "sequence grid"]],
  visual: [["immersive", "cinematic", "neon-lit", "widescreen", "strobe-lit"], ["visual world", "scene design", "light narrative", "visual arc"]],
  saturation: [["analog", "tape-fed", "transformer-heavy", "valve-fed", "molten"], ["tape saturation", "harmonic drive", "saturation glue", "drive stage"]],
  transient: [["razor-sharp", "surgical", "glass-cut", "whip-crack", "diamond-cut"], ["transient definition", "attack shape", "transient edge", "snap detail"]],
  lowend: [["colossal", "weaponised", "tectonic", "floor-moving", "seismic"], ["low-end weight", "sub pressure", "low-end mass", "floor weight"]],
  sidechain: [["deep", "breathing", "tidal", "floor-pulsing", "heavy-set"], ["ducking compression", "gain-pump groove", "ducking curve", "ducking movement"]],
  risers: [["searing", "turbine-fed", "escalating", "white-noise", "strobe-paced"], ["riser arcs", "climb accents", "ascent sweeps", "riser chains"]],
  impacts: [["cinematic", "seismic", "sub-heavy", "door-slam", "floor-cracking"], ["sub-impacts", "impact hits", "section-change hits", "landing hits"]],
  vinyl: [["warm", "dusted", "crackling", "aged", "archival"], ["vinyl crackle", "dust bed", "surface noise", "needle hiss"]],
  industrial: [["scrap-metal", "forge-floor", "hammered", "concrete", "rust-yard"], ["metal sound design", "scrap percussion", "forged textures", "steel textures"]],
  euphoria: [["hands-raising", "blinding", "skyward", "white-light", "peak-hour"], ["peak lift", "soaring lift", "peak bloom", "climax glow"]],
  polyrhythm: [["interlocking", "braided", "clockwork", "cross-gridded", "woven"], ["polyrhythmic percussion", "cross-rhythm web", "rhythm braids", "layered pulses"]],
  filterMod: [["aggressive", "turbo", "surging", "white-knuckle", "restless"], ["modulation matrix", "tone-sweep grid", "resonance matrix", "sweep matrix"]],
  envelope: [["multi-stage", "sculpted", "snapping", "slow-blooming", "precision"], ["envelope shaping", "attack sculpting", "envelope curves", "decay design"]],
  lfo: [["synced", "clocked", "fluttering", "orbital", "turbine-paced"], ["LFO motion", "modulation rate", "LFO movement", "wave motion"]],
  distortion: [["weaponised", "chainsaw", "furnace-hot", "razor-wired", "molten"], ["drive chain", "distortion stages", "drive texture", "clip stages"]],
  reverbDesign: [["cathedral-grade", "blackhole", "tide-deep", "glass-hall", "endless"], ["reverb design", "tail architecture", "space design", "hall design"]],
  delayDesign: [["ping-pong", "cascading", "spiral", "tape-style", "ricochet"], ["delay architecture", "echo design", "repeat routing", "delay staging"]],
  sidechainPump: [["deep", "tidal", "breathing", "floor-locked", "heavy-breathing"], ["ducking curve", "gain-pump motion", "ducking rhythm", "pulse ducking"]],
  stereoWide: [["super-wide", "horizon-wide", "edge-to-edge", "wall-to-wall", "orbiting"], ["stereo imaging", "width field", "stereo spread", "image width"]],
  chordProgLayer: [["hypnotic", "tidal", "ascending", "slowly-turning", "lantern-lit"], ["chord movement", "progression motion", "chord drift", "change patterns"]],
  rhythmLayer: [["interlocking", "grid-braided", "clockwork", "layered", "cross-cut"], ["pattern design", "rhythm grid", "groove patterns", "pattern weave"]],
  geneticLayer: [["genetically evolved", "mutated", "bred-for-impact", "evolved", "hybrid-grown"], ["sound design", "patch DNA", "evolved textures", "grown sounds"]],
  soundDesignLayer: [["surgical", "precision", "lab-grade", "scalpel-sharp", "engineered"], ["sound design matrix", "design grid", "patch matrix", "design detail"]],
  dnaLayer: [["DNA-mapped", "signature", "fingerprinted", "double-helix", "genome-stamped"], ["sonic signature", "sound fingerprint", "tonal DNA", "signature tone"]],
  energySculpt: [["sculpted", "terraced", "ramped", "arc-carved", "contoured"], ["energy arc design", "energy contour", "arc shaping", "momentum sculpt"]],
  harmonicLayer: [["rich", "stacked", "cathedral-thick", "layered", "overtone-heavy"], ["harmonic layering", "overtone stacks", "harmonic beds", "chord stacks"]],
  fxChain: [["complex", "chained", "routed", "staged", "cascaded"], ["FX routing", "chain design", "FX staging", "effect routing"]],
  batchLayer: [["batch-optimized", "ranked", "tournament-tested", "maximized", "score-driven"], ["production detail", "finish detail", "polish passes", "detail passes"]],
  statsLayer: [["statistically maximized", "measured", "peak-scored", "optimized", "charted"], ["detail polish", "maximized detail", "scored detail", "tuned detail"]],
  tapeWarmth: [["warm", "reel-fed", "analog-aged", "saturated", "golden-era"], ["tape saturation", "tape glue", "analog bloom", "tape colour"]],
  grit: [["gritty", "gravel-throated", "rust-edged", "dirt-wired", "coarse-grain"], ["analog drive", "drive grit", "dirt texture", "grain drive"]],
  air: [["open", "helium", "sky-open", "stratospheric", "weightless"], ["high-end shimmer", "top-end air", "air band", "upper sparkle"]],
  room: [["natural", "wood-panelled", "stone-walled", "lived-in", "breathing"], ["room ambience", "room tone", "space bloom", "ambience bed"]]
};
const LAYER_PHRASES_EXTRA = {};
for (const l of LAYERS) {
  const v = LV[l.id];
  if (!v) continue;
  const added = grow([l.phrase], X(v[0], v[1]), 20, 48);
  if (added.length) LAYER_PHRASES_EXTRA[l.id] = added;
}

/* ------------------------------------------------ scale moods ------------------------------------------------ */
const DARK_N = ["melancholy", "tension", "shadow", "gravity", "menace", "weight"];
const BRIGHT_N = ["lift", "glow", "daylight", "openness", "release", "air"];
const EXOTIC_N = ["ritual", "coil", "mystery", "heat", "venom", "spell"];
const UNSTABLE_N = ["vertigo", "collapse", "chaos", "fracture", "drift", "static"];
const MV = {
  aeolian: [["dark", "classic", "midnight", "iron-grey", "rain-soaked", "coal-lit"], DARK_N],
  harmonicMin: [["exotic", "dramatic", "blade-edged", "theatre-lit", "velvet", "knife-bright"], ["tension", "lift", "drama", "coil", "height", "shade"]],
  phrygian: [["menacing", "ritual", "Spanish-dark", "torch-lit", "processional", "iron-cast"], DARK_N.concat(["ritual", "procession"])],
  phrygianDom: [["snake-charmer", "coiled", "desert-hot", "venomous", "winding", "market-lit"], ["aggression", "heat", "coil", "spell", "charge", "venom"]],
  dorian: [["hopeful", "rolling", "street-lit", "grey-gold", "steady", "harbour-bound"], ["minor lift", "groove weight", "momentum", "resolve", "drive", "hope"]],
  minorPent: [["unmissable", "hook-cut", "iron-clad", "straight-shooting", "no-miss", "dead-centre"], ["hooks", "certainty", "hook weight", "directness", "clarity", "pull"]],
  hirajoshi: [["stark", "alien", "cinematic", "paper-thin", "lantern-lit", "snow-bound"], ["beauty", "space", "silence", "edge", "distance", "air"]],
  lydian: [["soaring", "weightless", "daylight", "helium", "sky-open", "white-gold"], BRIGHT_N],
  mixolydian: [["rolling", "grit-laced", "open-road", "field-wide", "sunlit", "stride-cut"], ["grit", "swagger", "lift", "stride", "grain", "bounce"]],
  melodicMin: [["aching", "ascending", "reaching", "stair-climbing", "yearning", "upward"], ["ascent", "longing", "climb", "resolve", "height", "ache"]],
  doubleHarm: [["occult", "maximal", "ceremonial", "incense-heavy", "gilded", "veiled"], EXOTIC_N],
  wholeTone: [["floating", "gravity-free", "hover-state", "tide-suspended", "unmoored", "glass-eyed"], ["dread", "hover", "suspension", "drift", "blur", "mist"]],
  octatonic: [["mechanical", "endlessly climbing", "gear-cut", "piston-paced", "escalating", "clockwork"], ["ascent", "climb", "mechanics", "gearing", "steps", "drive"]],
  locrian: [["unstable", "collapsing", "tilting", "fault-line", "crumbling", "off-axis"], UNSTABLE_N],
  majorPent: [["bright", "wide-open", "sunrise-cut", "fairground", "open-field", "clear-sky"], BRIGHT_N],
  blues: [["dirty", "swaggering", "gutter-cut", "smoke-worn", "bent-note", "streetwise"], ["groove", "swagger", "grit", "bend", "saunter", "soul"]],
  ionian: [["pure", "daylight", "clear-sky", "first-light", "wide-armed", "unshadowed"], BRIGHT_N],
  hungarianMin: [["gothic", "blade-sharp", "cathedral-dark", "velvet-edged", "thorned", "iron-lace"], EXOTIC_N],
  neapolitanMin: [["operatic", "dread-lit", "rising", "curtain-heavy", "marble", "storm-lit"], ["dread", "menace", "ascent", "grandeur", "shadow", "height"]],
  iwato: [["hollow", "ritual", "deeply strange", "bamboo-cut", "temple-bound", "wind-carved"], ["silence", "ritual", "space", "strangeness", "air", "stone"]],
  insen: [["spare", "eastern", "paper-thin", "taut", "lean", "wire-thin"], ["tension", "stillness", "edge", "poise", "air", "space"]],
  prometheus: [["mystic", "unresolved", "hovering", "fire-stolen", "oracle-lit", "suspended"], ["mystery", "hover", "fire", "omen", "height", "spell"]],
  superLocrian: [["maximum", "shrapnel-cut", "warped", "fractured", "bent-axis", "unhinged"], UNSTABLE_N],
  chromaticRun: [["atonal", "centreless", "aggressive", "no-key", "grid-broken", "directionless"], ["aggression", "chaos", "fracture", "pressure", "edge", "assault"]],
  bhairav: [["dawn-lit", "sacred", "heavy", "raga-cut", "temple-deep", "first-light"], ["gravity", "devotion", "weight", "stillness", "heat", "ritual"]],
  todi: [["intensely exotic", "coiled", "monsoon-dark", "velvet-venom", "incense-lit", "winding"], EXOTIC_N],
  ukrainian: [["blade-bright", "driving", "steppe-wide", "frost-edged", "steel-strung", "heading-north"], ["drive", "momentum", "edge", "stride", "bite", "fire"]]
};
const SCALE_MOODS_EXTRA = {};
for (const sc of Object.values(SCALES)) {
  const v = MV[sc.id];
  if (!v) continue;
  const added = grow([sc.mood], X(v[0], v[1]), 12, 70);
  if (added.length) SCALE_MOODS_EXTRA[sc.id] = added;
}

/* ------------------------------------------------ melodic focus ------------------------------------------------ */
const FORCE_VERBATIM = {
  light: "subtle melodic layer, low melody priority",
  balanced: "melody and groove in balance",
  strong: "melody leads, full melodic detail",
  dominant: "melody is the emotional core of the track"
};
const FORCE_CAND = {
  light: ["melody sits inside the groove", "melody as a low-lit detail layer",
    "melody under the surface of the beat", "melody woven into the texture",
    "melody kept half-hidden in the mix", "the lead stays beneath the drums",
    "melody as shadow, groove as body", "low-key melodic accents only",
    "melody implied more than stated", "melody rides inside the percussion"],
  balanced: ["melody and groove share the front", "lead and rhythm in equal measure",
    "melody walks beside the beat", "the hook and the drums split the bill",
    "melody balanced against the low end", "equal weight for lead and groove",
    "melody and pulse in lockstep", "the tune and the beat trade focus",
    "melody matches the drums step for step", "lead and rhythm at equal volume"],
  strong: ["melody leads, full melodic detail", "the lead carries the track forward",
    "melody out front, drums in support", "the hook drives, the groove follows",
    "melody takes the headline slot", "lead-first balance, strong hook focus",
    "the tune steers, the beat powers it", "melody elevated above the rhythm",
    "a lead-heavy, hook-forward balance", "melody commands the arrangement"],
  dominant: ["melody is the emotional core of the track", "the melody IS the track — everything serves it",
    "maximum melodic focus, beat as engine room", "melody crowns the mix, drums carry it",
    "the lead burns brightest in every section", "melody-dominant: the hook owns the night",
    "every element orbits the lead", "melody rules, rhythm obeys",
    "the tune is the headline, the drop its stage", "melody first, last and always"]
};
const MELODY_FORCE_EXTRA = {};
for (const k in FORCE_CAND) {
  const added = grow([FORCE_VERBATIM[k]], FORCE_CAND[k], 9, 70);
  if (added.length) MELODY_FORCE_EXTRA[k] = added;
}

const fmt = a => JSON.stringify(a).replace(/","/g, '",\n    "');
let src = `/* data/prompt-extra.js — GENERATED by tools/expand-prompt-extras.js. DO NOT EDIT BY HAND.
   Rolled variants for the prompt's fixed prose: layer phrases, scale moods
   and melodic-focus lines. Deterministic per (seed, id) in the engine. */\n\n`;
src += "export const LAYER_PHRASES_EXTRA = {\n";
for (const k in LAYER_PHRASES_EXTRA) src += `  ${k}: ${fmt(LAYER_PHRASES_EXTRA[k])},\n`;
src += "};\n\nexport const SCALE_MOODS_EXTRA = {\n";
for (const k in SCALE_MOODS_EXTRA) src += `  ${k}: ${fmt(SCALE_MOODS_EXTRA[k])},\n`;
src += "};\n\nexport const MELODY_FORCE_EXTRA = {\n";
for (const k in MELODY_FORCE_EXTRA) src += `  ${k}: ${fmt(MELODY_FORCE_EXTRA[k])},\n`;
src += "};\n";
writeFileSync(new URL("../data/prompt-extra.js", import.meta.url), src);
const lTot = Object.values(LAYER_PHRASES_EXTRA).reduce((n, a) => n + a.length, 0);
const mTot = Object.values(SCALE_MOODS_EXTRA).reduce((n, a) => n + a.length, 0);
const fTot = Object.values(MELODY_FORCE_EXTRA).reduce((n, a) => n + a.length, 0);
console.log("prompt extras written: +" + lTot + " layer phrases (" + Object.keys(LAYER_PHRASES_EXTRA).length +
  " layers), +" + mTot + " scale moods (" + Object.keys(SCALE_MOODS_EXTRA).length +
  " scales), +" + fTot + " melodic-focus lines");
