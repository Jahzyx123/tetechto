/* tools/expand-concepts.js — GENERATES data/concept-extra.js
   The "huge concept upgrade": deterministic combinatorial expansion of the
   whole concept card (world, location, visual, narrative, sensation, event,
   conflict, crowd, title, transform) plus an extra wave of melody-concept
   lines (story, role, motion, hook).

   Before this, the concept card rolled from the verbatim pools only —
   27 to 93 entries per key. This adds thousands.

   Rules, enforced here so the runtime never has to care:
   - deterministic (seeded, no Math.random) → same output every run
   - never emits a banned minimal word (maximum-energy policy)
   - never emits a vocal reference (instrumental safety)
   - melody-concept lines additionally refuse relax vocabulary, so they
     survive the runtime melody filter (engine/state.js isRelaxMelody)
   - deduped against the verbatim pool AND against itself (case-insensitive)
   - additions only; the verbatim extracted pools stay untouched.

   Run: node tools/expand-concepts.js */
import { writeFileSync } from "node:fs";
import { CONCEPT } from "../data/concept.js";
import { MELODY_CONCEPT } from "../data/melody.js";
import { VOCAL_WORDS } from "../data/safety.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
const DIRTY_MINIMAL = ["minimal", "minimalist", "minimalism", "sparse", "restrained",
  "low-energy", "low energy", "weak", "tiny", "gentle", "quiet"];
const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "i");
/* runtime melody relax filter (engine/state.js MELODY_SOFT_RE) — melody
   concept extras must never trip it */
const MELODY_SOFT_RE = /\b(simple|simpl|basic|plain|minimal|sparse|restrained|quiet|subtle|soft|gentle|calm|soothing|serene|peaceful|content|tender|dreamy|mellow|smooth|easy|lazy|unhurried|laid[- ]?back|slow|light|lullab|drift|float|airy|delicate|feather|glacial|breez|languid|leisurely|cozy|vague|warm|tranquil|peace|hum|song|stroll)\b/i;

function cleanText(t, melody) {
  if (!t || t.length > 100) return false;
  const low = t.toLowerCase();
  for (const b of DIRTY_MINIMAL) if (low.includes(b)) return false;
  if (VOCAL_RE.test(low)) return false;
  if (melody && MELODY_SOFT_RE.test(low)) return false;
  return true;
}

/* deterministic shuffle so output is stable but not alphabetically clumped */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260913);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function limit(arr, n) { return arr.length > n ? arr.slice(0, n) : arr; }

/* cross product of word lists joined with spaces */
const X = (...lists) => {
  let acc = [""];
  for (const l of lists) {
    const next = [];
    for (const a of acc) for (const b of l) next.push((a ? a + " " : "") + b);
    acc = next;
  }
  return acc;
};
const cat = (...groups) => [].concat(...groups);

/* dedupe against a verbatim base + internally, filter, cap, shuffle */
function grow(basePool, phrases, cap, melody) {
  const base = new Set((basePool || []).map(x => String(x).toLowerCase().trim()));
  const seen = new Set();
  const out = [];
  for (const p of shuffle(limit(phrases, cap * 10))) {
    const t = p.replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!cleanText(t, melody) || base.has(k) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/* ------------------------------------------------ shared vocab ------------------------------------------------ */
const W_ADJ = [
  "flooded", "burning", "frozen", "drifting", "humming", "overgrown", "awakened",
  "magnetized", "bioluminescent", "chrome-plated", "storm-scoured", "sunken", "airborne",
  "hollow", "radiant", "electrified", "resonating", "collapsing", "resurrected", "cloaked",
  "mirrored", "molten", "crystalline", "derelict", "sentient", "sleepless", "pressurized",
  "overclocked", "terraformed", "volcanic", "tidal", "orbital", "neon-drenched", "grid-locked",
  "signal-haunted", "bass-forged", "storm-lit", "ember-lit", "quake-scarred", "wind-carved",
  "salt-blasted", "fog-drowned", "star-fall", "red-shifted", "ion-charged", "glass-roofed",
  "cable-strung", "antenna-crowned", "reactor-fed", "moon-pulled", "gravity-bent", "time-lost"
];
const W_PLACE = [
  "megacity", "reactor", "cathedral", "harbor", "refinery", "observatory", "supercomputer",
  "generation ship", "sky elevator", "particle accelerator", "foundry", "lighthouse",
  "data vault", "cooling tower", "solar farm", "launch complex", "server crypt",
  "antenna forest", "glacier", "salt flat", "glass desert", "crater", "wormhole gate",
  "black ocean", "ice shelf", "subway spine", "arcology", "orbital ring", "shipyard",
  "colosseum", "turbine hall", "mega-dam", "checkpoint", "quarantine district", "archive",
  "clockwork planet", "chrome orchard", "signal monastery", "bazaar", "dry dock",
  "floodgate", "monorail", "quarry", "greenhouse ring", "chapel of speakers",
  "machine graveyard", "storm wall", "radio mast", "ferry of lights", "city bell",
  "engine mountain", "neon mangrove", "coolant river", "mirror canyon", "forge moon"
];
const W_VERB = [
  "dreaming", "waking", "burning", "singing", "collapsing", "igniting", "transmitting",
  "orbiting", "drowning", "remembering", "breathing", "charging", "descending", "ascending",
  "overflowing", "resonating", "fracturing", "blooming", "surging", "spinning", "keening",
  "counting down", "rebooting", "molting", "leaning into the wind", "learning to dance"
];
const W_ABS = [
  "voltage", "static", "gravity", "silence", "thunder", "rhythm", "light", "memory",
  "the monsoon", "the aurora", "a single chord", "an endless signal", "a red eclipse",
  "the root note", "a frequency nobody owns", "its own reflection", "the last broadcast"
];
const W_TAIL_VERB = [
  "never sleeps", "hums at the root note", "only speaks in basslines", "remembers every crowd",
  "keeps time for the whole coast", "burns brighter when the drop hits", "answers every kick",
  "broadcasts to nobody and waits", "refuses to go dark", "grows louder every year",
  "runs on pure momentum", "echoes across two hemispheres", "holds the night open",
  "turns weather into rhythm", "charges itself on thunder", "has been counting to one, forever"
];

const L_PREP = [
  "inside", "beneath", "atop", "deep in", "on the edge of", "at the heart of", "along",
  "behind", "under", "above", "within", "across", "at the foot of", "in the shadow of",
  "beyond", "beside", "between", "below", "outside", "in the belly of", "on the far side of"
];
const L_ADJ = [
  "drowned", "abandoned", "humming", "neon-lit", "storm-lashed", "frozen", "burning",
  "mirrored", "hollow", "electrified", "overgrown", "shattered", "drifting", "sealed",
  "forgotten", "floodlit", "pressurized", "condemned", "consecrated", "red-lit", "fog-filled"
];
const L_PLACE = [
  "transit terminal", "reactor core", "turbine hall", "server crypt", "coolant river",
  "neon harbor", "glass causeway", "antenna forest", "launch corridor", "cathedral nave",
  "cargo bay", "monorail spine", "ice cavern", "salt flat", "crater rim", "data vault",
  "foundry floor", "chapel of speakers", "rooftop garden", "floodgate", "wind farm",
  "orbital dock", "subway cathedral", "arcade", "market alley", "bridge deck",
  "observatory dome", "dry dock", "greenhouse ring", "pump room", "ballroom of machines",
  "training yard", "customs gate", "reservoir", "echo chamber", "control cathedral",
  "maintenance shaft", "signal deck", "quarantine gate", "roof of the world"
];

const V_LIGHT = [
  "emerald light", "crimson light", "ultraviolet glow", "sodium glare", "a laser grid",
  "strobe light", "holographic rain", "bioluminescence", "phosphor glow", "arc-flash",
  "the aurora", "searchlights", "neon haze", "plasma bloom", "firelight", "moonlight",
  "a headlight sweep", "sunburst", "blacklight", "golden light", "candle-glow",
  "a wall of LEDs", "lightning", "a single spotlight", "infrared shimmer", "the strobe"
];
const V_VERB = [
  "refracting through", "washing over", "splitting across", "dripping from", "pulsing inside",
  "flooding", "tracing", "bending around", "scattering across", "reflecting off",
  "bleeding through", "flickering across", "slicing through", "swirling through",
  "crawling over", "igniting", "drowning", "melting into", "charging", "outlining"
];
const V_MEDIA = [
  "black water", "smoke", "shattered glass", "chrome walls", "falling rain", "drifting fog",
  "concrete", "steel beams", "dust", "haze", "mirrored floors", "wet asphalt", "ice",
  "sand", "vines", "cables", "vapor", "silhouettes", "sparks", "static", "steam",
  "a wall of speakers", "the crowd", "wet chrome", "snow", "oily puddles", "glass dust"
];

const N_SUBJ = [
  "an alien signal", "a rogue machine", "the last lighthouse", "a forgotten anthem",
  "a fractured AI", "the city itself", "a ghost frequency", "the storm", "a generation ship",
  "a buried archive", "the bassline", "a dying satellite", "a riot of light",
  "a time capsule", "the first sunrise", "the ocean", "a machine heart", "a crowd of strangers",
  "the night shift", "a rebel transmitter", "the grid", "an old war drum", "the eclipse",
  "a runaway train of data", "the quiet machine"
];
const N_VERB = [
  "turns", "trades", "rewires", "teaches", "carries", "rebuilds", "wakes", "outruns",
  "outlives", "remembers", "transmits", "converts", "drags", "lifts", "forges", "steers",
  "broadcasts", "trades in", "arms", "ignites"
];
const N_SWAP = [
  "panic into celebration", "silence into rhythm", "rust into gold", "grief into motion",
  "night into day", "static into a pulse", "fear into fuel", "memory into momentum",
  "chaos into a heartbeat", "darkness into a dancefloor", "endings into beginnings",
  "noise into a name", "loss into light", "distance into closeness", "wreckage into wonder",
  "exile into homecoming", "pressure into propulsion", "doubt into velocity",
  "a warning into an invitation", "the countdown into a celebration"
];
const N_LEARN = [
  "learns to feel", "learns to dance", "finds its rhythm", "chooses the crowd",
  "breaks its own programming", "answers the drop", "finds the one true tempo",
  "refuses to be switched off", "starts keeping time", "becomes the anthem"
];

const S_THING = [
  "bass", "sub-bass", "the kick", "pressure", "heat", "static", "voltage", "the pulse",
  "vibration", "rhythm", "the air", "thunder", "resonance", "the drop", "adrenaline",
  "the low end", "momentum", "the strobe", "the floor", "frequency"
];
const S_VERB = [
  "moving through", "pressing on", "rattling", "rolling through", "humming in", "climbing",
  "prickling", "thumping in", "flooding", "surging through", "crackling over", "vibrating in",
  "warming", "charging", "hammering", "sweeping through", "building inside", "locking around"
];
const S_WHERE = [
  "the chest", "the ribs", "the spine", "the sternum", "the skin", "the teeth", "the floor",
  "the blood", "the palms", "the shoulders", "the bones", "the stomach", "the lungs",
  "the fingertips", "the back of the skull", "the whole body", "the jaw", "the knees"
];
const S_LIKE = [
  "like an earthquake", "like a second heartbeat", "like thunder under the floor",
  "like a live wire", "like surf in a sealed room", "like an engine waking",
  "like a door slamming in slow motion", "like a storm finding its shape",
  "like gravity changing its mind", "like the room inhaling"
];

const E_SUBJ = [
  "the reactor", "the dam", "the eclipse", "the generator", "the satellite array",
  "the ice shelf", "the countdown", "the storm", "the sun", "the grid",
  "the space elevator", "the alarm", "the antenna", "the transformer", "the tide",
  "the comet", "the blackout", "the siren", "the gate", "the engine", "the floodlights",
  "the last speaker", "the frequency", "the horizon", "the pressure valve"
];
const E_VERB = [
  "reaches critical", "blows", "ignites", "opens", "aligns", "peaks", "cracks", "surges",
  "wakes", "flashes", "detonates in slow motion", "hits full power", "comes online",
  "collapses inward", "goes dark", "splits the sky", "crests", "locks in", "fires",
  "breaches", "tips past the point of return"
];
const E_TAIL = [
  "and the drop hits", "as the bass lands", "the moment the kick lands",
  "right before the breakdown", "and the crowd loses gravity", "while the strobes freeze",
  "and every light turns red", "as the anthem returns", "and the floor answers back",
  "and the night splits open", "exactly on the one", "and time doubles",
  "as two moons align", "and the echo catches up", "while the fog ignites",
  "and the bass takes over the weather"
];

const C_SIDES = [
  "signal", "static", "memory", "erasure", "order", "chaos", "gravity", "the rising bass",
  "machine", "heartbeat", "night", "dawn", "rust", "chrome", "fear", "euphoria",
  "silence", "the wall of sound", "tide", "engine", "dust", "light", "storm", "shelter",
  "past", "future", "flesh", "steel", "pulse", "void", "embers", "flood", "echo",
  "transmission", "instinct", "machine logic", "motion", "stillness", "the individual",
  "the organism", "oxygen", "voltage", "the clock", "the crowd"
];
const C_FORM = ["versus", "against", "fighting", "outlasting", "wrestling"];

const CR_SIZE = [
  "ten thousand", "a thousand", "a million", "countless", "an ocean of", "a tide of",
  "roomfuls of", "wave after wave of", "an entire city of", "legions of", "a horizon of"
];
const CR_WHO = [
  "strangers", "ravers", "survivors", "dancers", "travelers", "night workers", "pilgrims",
  "insomniacs", "astronauts", "androids", "drifters", "believers in the bass", "exiles",
  "operators", "machines and humans", "the sleepless", "the rebuilt", "storm-chasers",
  "welders and wanderers", "the last audience"
];
const CR_DO = [
  "moving as one organism", "breathing in sync", "pulsing with the same heartbeat",
  "lit by one strobe", "sharing one rhythm", "swaying like one machine",
  "marching into the drop", "trading silence for thunder", "becoming a single wave",
  "holding the same breath before the drop", "reflecting the same laser",
  "counting the same bar", "leaning into the same kick", "rebuilt by the same chorus",
  "moving faster than the dark", "phosphorescent and perfectly timed"
];

const T_A = [
  "NEON", "CHROME", "BLACK", "RED", "DEAD", "IRON", "HOLLOW", "FINAL", "FIRST", "LAST",
  "DEEP", "HIGH", "BURNING", "FROZEN", "ELECTRIC", "MAGNETIC", "SOLAR", "LUNAR", "ULTRA",
  "ZERO", "MAXIMUM", "CRIMSON", "VIOLET", "EMERALD", "OBSIDIAN", "GHOST", "PHANTOM",
  "RAZOR", "QUANTUM", "ANALOG", "PRIMAL", "FERAL", "BLAZING", "SHATTERED", "FORGOTTEN",
  "REBORN", "RELENTLESS", "INFINITE", "TERMINAL", "VOLCANIC", "ORBITAL", "MIDNIGHT",
  "TOTAL", "ABSOLUTE", "SAVAGE", "MERCILESS", "STORM", "THUNDER", "HYPER", "APEX"
];
const T_B = [
  "TRANSMISSION", "SIGNAL", "FLOOD", "SUNRISE", "PROTOCOL", "REACTOR", "HORIZON", "VOLTAGE",
  "MONSOON", "ECLIPSE", "CATHEDRAL", "CIRCUIT", "ANTHEM", "FREQUENCY", "ENGINE", "PULSE",
  "FURNACE", "MIRAGE", "TEMPEST", "AVALANCHE", "LEVIATHAN", "BASTION", "CITADEL", "OVERDRIVE",
  "REQUIEM", "STAMPEDE", "IGNITION", "CASCADE", "UPRISING", "AFTERBURN", "NIGHTFALL",
  "DAYBREAK", "PRESSURE", "FEVER", "DELUGE", "VORTEX", "PARADOX", "MONOLITH", "UPLINK",
  "SHOCKWAVE", "FOUNDRY", "GENESIS", "EXODUS", "VELOCITY", "WARPATH", "ONSLAUGHT",
  "DOMINION", "RECKONING", "ASCENSION", "LOCKDOWN"
];
const T_OF = ["HEART", "RISE", "FALL", "WRATH", "LAW", "CORE", "ECHO", "REIGN", "DAWN", "CROWN"];

const TR_FROM = [
  "fear", "panic", "silence", "grief", "static", "rust", "night", "dust", "chaos", "anger",
  "sorrow", "distance", "exhaustion", "gravity", "doubt", "cold", "shadow", "noise",
  "pressure", "the waiting", "the wreckage", "the countdown", "the alarm", "the flood"
];
const TR_VERB = ["becomes", "erupts into", "melts into", "hardens into", "ignites into", "dissolves into", "sharpens into", "blooms into"];
const TR_TO = [
  "euphoria", "celebration", "motion", "a wall of sound", "gold", "dawn", "light", "order",
  "an anthem", "a heartbeat", "thunder", "triumph", "velocity", "a single pulse", "ignition",
  "a flood of light", "momentum", "a second wind", "a war cry", "pure rhythm", "fire",
  "signal", "flight", "one organism", "an avalanche of yes", "the drop"
];

/* melody-concept extras (must survive the runtime relax filter) */
const M_SUBJ = [
  "the lead line", "the hook", "the melody", "the phrase", "the motif", "the top line",
  "the arpeggio", "the riff", "the counter-line", "the lead voice", "the pattern", "the sequence"
];
const M_VERB = [
  "hunts", "chases", "climbs", "tears through", "outruns", "circles", "stalks", "ignites",
  "detonates across", "fractures", "bends", "carves", "storms", "drills into",
  "ricochets through", "out-punches", "splits", "charges", "intercepts", "rides down"
];
const M_OBJ = [
  "the drop", "the breakdown", "the whole arrangement", "every bar", "the low end",
  "the grid", "the silence before the kick", "the last minute", "the redline", "the storm",
  "the final chorus of machines", "the wall of percussion", "the horizon of the mix",
  "its own echo", "the rhythm section", "the oncoming wall of sound"
];
const M_ROLE_N = [
  "siege engine", "war drum", "lightning rod", "pressure valve", "alarm system",
  "battering ram", "turbine", "reactor core", "floodgate", "piston", "avalanche",
  "flare gun", "spearhead", "engine of ascent", "detonator", "ram-rod", "iron spine",
  "flag planted on the peak", "second sun", "crowd-mover"
];
const M_MO_ADJ = [
  "relentless", "spiraling", "sawtooth", "piston-driven", "runaway", "surging", "whiplash",
  "rampaging", "white-knuckle", "turbine-speed", "avalanche", "strobe-paced", "overdrive",
  "full-throttle", "unstoppable", "razor-edged", "red-line", "war-march", "meteor", "ricochet"
];
const M_MO_N = [
  "ascent", "spiral", "charge", "stampede", "dive", "climb", "lunge", "pursuit",
  "wave assault", "free-fall", "surge", "march", "rampage", "cascade", "breach",
  "pincer attack", "countdown", "ignition run", "sky-burst", "landslide"
];
const M_H_N = [
  "three-note siren", "two-bar war cry", "hook", "riff", "stinger", "motif", "blast",
  "battle motif", "signal flare", "chant-line", "pattern", "figure", "crescent hook",
  "hammer phrase", "voltage theme"
];
const M_H_V = [
  "never resolves", "keeps climbing", "lands like a hammer", "won't let go",
  "splits the mix", "detonates on repeat", "bends the grid", "hits harder every loop",
  "outruns the echo", "locks the crowd in", "raises the ceiling", "refuses to land",
  "strikes on every downbeat", "pulls the drop closer", "sharpens with every repeat"
];

/* ------------------------------------------------ build ------------------------------------------------ */
const world = cat(
  X(W_ADJ, W_PLACE),
  X(W_PLACE, ["under"], W_ABS),
  X(W_PLACE, W_VERB.map(v => v)),
  X(["a"], W_PLACE, ["that"], W_TAIL_VERB)
);
const location = cat(
  X(L_PREP, ["a"], L_ADJ, L_PLACE),
  X(L_PREP, ["the"], L_PLACE),
  X(L_PREP, ["a"], L_PLACE, ["lit by"], ["one strobe", "the aurora", "burning cables", "phosphor moss", "a red eclipse", "falling sparks"])
);
const visual = cat(
  X(V_LIGHT, V_VERB, V_MEDIA),
  X(["every surface"], ["alive with"], ["reflected lasers", "phosphor trails", "crawling neon", "flickering signal", "molten color", "afterimages"])
);
const narrative = cat(
  X(N_SUBJ, N_VERB, N_SWAP),
  X(N_SUBJ, N_LEARN),
  X(["the story of"], N_SUBJ.map(s => s.replace(/^(an?|the) /, "")), ["finding its tempo"])
);
const sensation = cat(
  X(S_THING, S_VERB, S_WHERE),
  X(S_THING, S_VERB, S_WHERE, S_LIKE)
);
const event = cat(
  X(E_SUBJ, E_VERB, E_TAIL),
  X(E_SUBJ, E_VERB)
);
const conflict = cat(
  X(["the battle of"], C_SIDES, ["against"], C_SIDES),
  C_SIDES.flatMap(a => C_SIDES.filter(b => b !== a).slice(0, 3).map(b => a + " " + "versus" + " " + b)),
  X(C_SIDES, C_FORM.slice(1), C_SIDES)
);
const crowd = cat(
  X(CR_SIZE, CR_WHO, CR_DO),
  X(CR_WHO, ["moving"], ["like one machine", "at the speed of light", "in perfect phase", "with the mix", "as a single tide"])
);
const title = cat(
  X(T_A, T_B),
  X(["THE"], T_A, T_B),
  X(T_OF, ["OF THE"], T_B)
).map(t => t.toUpperCase());
const transform = cat(
  X(TR_FROM, TR_VERB, TR_TO),
  X(["everything that was"], ["still"], ["becomes"], ["motion", "thunder", "velocity", "a drum"])
);

const EXTRA_CONCEPT = {
  world: grow(CONCEPT.world, world, 460),
  location: grow(CONCEPT.location, location, 400),
  visual: grow(CONCEPT.visual, visual, 400),
  narrative: grow(CONCEPT.narrative, narrative, 380),
  sensation: grow(CONCEPT.sensation, sensation, 340),
  event: grow(CONCEPT.event, event, 380),
  conflict: grow(CONCEPT.conflict, conflict, 320),
  crowd: grow(CONCEPT.crowd, crowd, 320),
  title: grow(CONCEPT.title, title, 430),
  transform: grow(CONCEPT.transform, transform, 330)
};

/* melody-concept wave two — aggressive by design, relax-words refused */
const EXTRA_MELODY_CONCEPT_MORE = {
  story: grow(MELODY_CONCEPT.story, cat(X(M_SUBJ, M_VERB, M_OBJ)), 110, true),
  role: grow(MELODY_CONCEPT.role, cat(
    X(["the lead as"], M_ROLE_N),
    X(["the voice of"], M_ROLE_N),
    X(["melody as"], M_ROLE_N)
  ), 100, true),
  motion: grow(MELODY_CONCEPT.motion, cat(X(M_MO_ADJ, M_MO_N)), 110, true),
  hook: grow(MELODY_CONCEPT.hook, cat(
    X(["a"], M_H_N, ["that"], M_H_V),
    X(M_H_N.map(h => "the " + h), M_H_V)
  ), 110, true)
};

/* ------------------------------------------------ emit ------------------------------------------------ */
const total = Object.values(EXTRA_CONCEPT).reduce((a, x) => a + x.length, 0);
const melTotal = Object.values(EXTRA_MELODY_CONCEPT_MORE).reduce((a, x) => a + x.length, 0);
const fmt = obj => Object.entries(obj)
  .map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v, null, 0).replace(/","/g, '",\n    "') + ",")
  .join("\n");

writeFileSync(new URL("../data/concept-extra.js", import.meta.url),
  `/* data/concept-extra.js — GENERATED by tools/expand-concepts.js. DO NOT EDIT BY HAND.
   Additive concept-pool expansion: ${total} new concept entries across 10 keys, plus
   ${melTotal} extra melody-concept lines (story/role/motion/hook). Deterministic, deduped
   against the verbatim pools, banned-word free, instrumental-safe. The verbatim legacy
   pools are never modified — these are appended at runtime by engine/state.js. */\n
export const EXTRA_CONCEPT = {\n${fmt(EXTRA_CONCEPT)}\n};\n
export const EXTRA_MELODY_CONCEPT_MORE = {\n${fmt(EXTRA_MELODY_CONCEPT_MORE)}\n};\n`);

console.log("concept expansion written: " + total + " concept entries (" +
  Object.entries(EXTRA_CONCEPT).map(([k, v]) => k + ":" + v.length).join(", ") +
  ") + " + melTotal + " melody-concept extras");
