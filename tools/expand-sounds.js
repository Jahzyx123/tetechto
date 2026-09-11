/* tools/expand-sounds.js — GENERATES data/expansion.js
   The "huge sound upgrade": deterministic combinatorial expansion of every
   sonic pool (drums, bass, leads, harmony, techno lab, sound design, mix,
   spatial, texture, fx…).

   Rules, enforced here so the runtime never has to care:
   - deterministic (seeded, no Math.random) → same output every run
   - never emits a banned minimal word (maximum-energy policy)
   - never emits a vocal reference (instrumental safety)
   - deduped against the verbatim legacy pool AND against itself
   - additions only; the verbatim extracted pools stay untouched.

   Run: node tools/expand-sounds.js */
import { writeFileSync } from "node:fs";
import * as D from "../data/index.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
/* Mirror engine/prompt.js isDirty() EXACTLY (substring banned check + word-
   boundary vocal check) so every generated entry is clean at the source. */
const DIRTY_MINIMAL = ["minimal", "minimalist", "minimalism", "sparse", "restrained",
  "low-energy", "low energy", "weak", "tiny", "gentle", "quiet"];
const VOCAL_WORDS = (D.VOCAL_WORDS || []).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.join("|") + ")\\b", "i");
/* Melody keys get a runtime relax filter (engine/state.js). Words that would
   be stripped there are refused here so nothing is generated only to be
   thrown away. No counterweight rule needed — all melody vocab is intense. */
const MELODY_SOFT_RE = /\b(simple|simpl|basic|plain|minimal|sparse|restrained|quiet|subtle|soft|gentle|calm|soothing|serene|peaceful|content|tender|dreamy|mellow|smooth|easy|lazy|unhurried|laid[- ]?back|slow|light|lullab|drift|float|airy|delicate|feather|glacial|breez|languid|leisurely|cozy|vague|warm|tranquil|peace|hum|song|stroll)\b/i;
const MELODY_KEYS = new Set(["FEELINGS", "FLAVORS", "DIRECTIONS", "LEADS", "PERFS",
  "HARMONIES", "ARPS", "CONTOURS", "RHYTHMS"]);
function cleanText(t, melody) {
  if (!t || t.length > 64) return false;
  const low = t.toLowerCase();
  for (const b of DIRTY_MINIMAL) if (low.includes(b)) return false;
  if (VOCAL_RE.test(low)) return false;
  if (melody && MELODY_SOFT_RE.test(low)) return false;
  return true;
}

/* deterministic shuffle so the output is stable but not alphabetically clumped */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260902);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function limit(arr, n) { return arr.length > n ? arr.slice(0, n) : arr; }

/* cross product of template parts, capped, shuffled, filtered, deduped */
function grow(name, phrases, cap, melody) {
  const base = new Set((D[name] || []).map(x => String(x).toLowerCase().trim()));
  const seen = new Set();
  const out = [];
  for (const p of shuffle(limit(phrases, cap * 8))) {
    const t = p.replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!cleanText(t, melody) || base.has(k) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}
const X = (...lists) => {
  // cartesian product of word lists joined with spaces
  let acc = [""];
  for (const l of lists) {
    const next = [];
    for (const a of acc) for (const b of l) next.push((a ? a + " " : "") + b);
    acc = next;
  }
  return acc;
};
const cat = (...groups) => [].concat(...groups);

/* ------------------------------------------------ vocabularies ------------------------------------------------ */
const HARD = [
  "punishing", "brutal", "crushing", "slamming", "thunderous", "ferocious", "relentless",
  "savage", "merciless", "pounding", "hammering", "battering",
  "bone-rattling", "skull-rattling", "rib-cracking", "gut-punching", "teeth-rattling",
  "spine-snapping", "wall-crumbling", "earth-splitting", "concrete-cracking", "rebar-bending",
  "pile-driving", "pneumatic", "jackhammering", "anvil-heavy", "granite-hard", "adamantine",
  "sledgehammer", "wrecking-ball", "avalanche-heavy", "monsoon-heavy", "earthquake-grade",
  "tremor-grade", "shockwave", "concussive", "percussive", "impact-heavy", "drop-forged",
  "battle-forged", "cinderblock", "demolition", "bulldozing", "steamroller", "juggernaut",
  "war-rig", "siege-grade", "rampaging", "stampeding", "raging", "blitzing", "onslaught",
  "barrage", "cannonading", "shelling", "artillery-driven", "bombastic", "explosive-grade"
];
const BIG = [
  "massive", "colossal", "titanic", "monolithic", "cavernous", "gigantic", "enormous",
  "towering", "monumental", "seismic",
  "planetary", "continental", "oceanic", "mountainous", "skyscraper", "cathedral-scale",
  "city-block", "horizon-wide", "stadium-sized", "arena-sized", "colosseum", "gargantuan",
  "leviathan", "behemoth", "mammoth", "elephantine", "king-size", "supersized", "mega",
  "ultra", "hypermassive", "ultramassive", "galactic", "cosmic", "interstellar", "abyssal"
];
const HOT = [
  "overdriven", "saturated", "distorted", "clipped", "red-lined", "cranked", "scorched",
  "molten", "blistering", "searing",
  "incandescent", "white-hot", "red-hot", "superheated", "turbocharged", "nitro-charged",
  "afterburning", "flamethrower", "torch-hot", "furnace-fed", "kiln-fired", "smoldering",
  "ember-fed", "magma", "plasma", "solar", "hyperdrive", "warp-speed", "redlined", "maxed",
  "red-zone", "overclocked", "overvolted", "sparking", "short-circuiting", "welding-hot",
  "broiling", "combustion"
];
const TEX = [
  "analog", "digital", "granular", "tape-warmed", "vinyl-dusted", "transistor", "valve-driven",
  "circuit-bent", "modular", "resampled", "bit-crushed", "wavefolded",
  "carbon", "chromium", "tungsten", "titanium", "mercury", "graphite", "ferrite",
  "solder-fumed", "arc-welded", "steel-plated", "chrome-plated", "smoke-stained", "ash-coated",
  "soot-caked", "neon-lit", "halogen", "ultraviolet", "infrared", "laser-cut", "fiber-optic",
  "satellite", "sonar", "radar", "oscilloscope", "cathode", "anodic", "magnetized", "ionized",
  "sand-blasted", "acid-etched", "oxidized", "rusted", "galvanized", "heat-treated", "tempered",
  "forged", "machined", "holographic", "spectral", "dioded", "silicon"
];
const MACH = [
  "909", "808", "707", "606", "727", "linn", "oberheim", "simmons", "SP-1200", "MPC-swung",
  "DMX", "DrumTraks", "RX5", "RX7", "RZ-1", "CR-78", "CR-8000", "TR-626", "TR-505", "DDD-1",
  "Volca", "Electribe", "Rytm", "Tempest", "DrumBrute", "Drumlogue", "LXR-02", "Digitakt",
  "MachineDrum", "RD-8", "RD-9", "Drumstation", "Aira", "Analog-Rytm"
];
const SPACE = [
  "warehouse", "bunker", "hangar", "cathedral", "tunnel", "silo", "foundry", "quarry",
  "aircraft-hangar", "subway-tunnel",
  "blast-furnace", "steel-mill", "shipyard", "dry-dock", "power-station", "reactor-hall",
  "boiler-room", "turbine-hall", "vault", "mausoleum", "cavern", "ravine", "canyon", "gorge",
  "cistern", "reservoir", "arena", "colosseum", "amphitheater", "stadium-bowl", "hangar-bay",
  "missile-silo", "underground-parking", "concrete-bunker", "salt-mine", "coal-mine",
  "cargo-hold", "freight-tunnel", "ventilation-shaft"
];
const MOTION = [
  "rolling", "galloping", "driving", "surging", "pumping", "churning", "hurtling",
  "stampeding", "cascading", "accelerating",
  "rocketing", "cannonballing", "barreling", "careening", "thundering", "blasting",
  "slingshotting", "catapulting", "steamrolling", "bulldozing", "plowing", "charging",
  "ramming", "swerving", "skidding", "fishtailing", "tearing", "ripping", "blasting-through",
  "breakneck", "full-tilt", "flat-out", "redlining", "sprinting", "bolting", "dashing",
  "storming", "hurtling", "chasing", "overrunning"
];
const METAL = [
  "chrome", "tungsten", "titanium", "steel", "iron", "brass", "copper", "nickel", "cobalt",
  "zinc", "manganese", "aluminum", "platinum", "adamantium", "cast-iron", "wrought-iron",
  "spring-steel", "tool-steel", "high-carbon"
];
const FIRE = [
  "flamethrower", "incendiary", "napalm", "conflagration", "wildfire", "backdraft",
  "firestorm", "furnace", "blast-furnace", "white-phosphorus", "afterburn", "combustion",
  "pyre", "ember-storm", "flash-fire", "burning", "blazing", "ablaze"
];
const STORM = [
  "hurricane", "typhoon", "cyclone", "tornado", "tempest", "monsoon", "lightning",
  "thunderclap", "whirlwind", "maelstrom", "gale", "squall", "hailstorm", "sandstorm",
  "dust-storm", "blizzard", "waterspout", "tidal-wave", "tsunami", "quake", "tremor",
  "aftershock", "mudslide", "rockslide"
];
const WAR = [
  "artillery", "missile", "warhead", "bomb", "grenade", "mortar", "howitzer", "airstrike",
  "blitz", "squadron", "front-line", "firefight", "ordnance", "torpedo", "barrage",
  "shellfire", "crossfire", "flak", "anti-aircraft", "war-machine", "siege-tower",
  "battering-ram", "catapult", "trebuchet", "cannon", "cannonball", "buckshot", "shrapnel",
  "strafing", "war-zone", "battleground", "armored", "armored-column"
];
const BEAST = [
  "predator", "wolverine", "bull", "rhino", "gorilla", "tiger", "panther", "jaguar",
  "crocodile", "shark", "vulture", "raptor", "falcon", "hyena", "bison", "mammoth",
  "dinosaur", "dragon", "serpent", "viper", "cobra", "python", "piranha", "kraken",
  "goliath", "cyclops", "ogre", "berserker", "barbarian", "warlord", "gladiator", "wolf",
  "lion", "bear", "stallion", "warhorse"
];
const MOTOR = [
  "piston", "turbine", "diesel", "turbodiesel", "nitro", "supercharger", "flywheel",
  "crankshaft", "exhaust", "transmission", "gearbox", "camshaft", "driveshaft", "turbo",
  "intercooler", "cylinder", "motor", "dragster", "hotrod", "muscle", "big-block", "V8",
  "V12", "rotary", "two-stroke", "supercharged", "redline", "overdrive", "six-speed",
  "sequential"
];
const FORCE = cat(HARD, BIG, FIRE, STORM, WAR);
const HEAVY = cat(HARD, BIG, METAL);

/* ------------------------------------------------ pool recipes ------------------------------------------------ */
const RECIPES = {
  /* ---------- drums ---------- */
  KICKS: {
    cap: 340, phrases: cat(
      X(FORCE, ["kick"]),
      X(cat(HOT, TEX, METAL), ["kick"]),
      X(MACH, ["kick"]),
      X(SPACE, ["kick"]),
      X(cat(HARD, HOT, FIRE, WAR), MACH, ["kick"]),
      X(HEAVY, ["sub", "rumble", "tail", "thump", "body", "punch", "chest-hit", "sternum"], ["kick"]),
      X(["layered", "stacked", "double-hit", "triplet-tuned", "pitch-bent", "transient-shaped",
         "gated", "parallel-compressed", "sub-layered", "distortion-blended", "body-stacked",
         "top-knock", "low-tuned", "overdriven-top", "clip-limited", "rumble-backed"], ["kick"]),
      X(["off-grid", "swung", "shuffled", "flammed", "rolled", "doubled", "syncopated",
         "four-on-the-floor", "half-time", "double-time", "trap-styled", "machine-gun"], ["kick pattern"])
    )
  },
  HATS: {
    cap: 300, phrases: cat(
      X(cat(HOT, TEX, METAL), ["hats"]),
      X(MACH, ["hats"]),
      X(["16th-note", "32nd-note", "triplet", "offbeat", "shuffled", "swung", "rolling",
         "stuttered", "gated", "ratcheted", "flammed", "stepped", "galloping", "machine-gun"], ["hats"]),
      X(["razor", "glassy", "metallic", "steely", "crystalline", "chrome", "titanium", "obsidian",
         "acid-etched", "chromium", "shaved", "slicing", "laser-thin", "needle-sharp"], ["hats"]),
      X(["open", "closed", "pedal", "half-open", "choked", "sizzling", "spitting", "splashing",
         "scorching", "hissing", "slicing"], ["hats"], ["pattern", "run", "loop"])
    )
  },
  SNARES: {
    cap: 280, phrases: cat(
      X(FORCE, ["snare"]),
      X(cat(HARD, FIRE, WAR), ["clap"]),
      X(cat(TEX, METAL), ["snare"]),
      X(MACH, ["snare"]),
      X(SPACE, ["snare crack"]),
      X(["rimshot", "layered", "stacked", "gated", "reverb-blasted", "pitched-down", "pitched-up",
         "flammed", "rolled", "double-hit", "ghosted", "woodblock-blended", "body-shot",
         "crack-heavy", "tuned-low", "ringing"], ["snare"]),
      X(["triple-stacked", "hand", "reverse", "slapback", "room-mic'd", "compressed", "gated",
         "stadium", "arena", "crowd-sized", "whip"], ["clap"])
    )
  },
  PERCS: {
    cap: 300, phrases: cat(
      X(cat(HARD, TEX, HOT, METAL), ["percussion"]),
      X(["tribal", "industrial", "polyrhythmic", "syncopated", "machine", "hydraulic", "pneumatic",
         "kinetic", "scrap-metal", "anvil", "chain", "pipe", "found-object", "junk-metal",
         "junkyard", "steel-drum", "mechanized", "robotic"], ["percussion", "hits", "clatter"]),
      X(["conga", "bongo", "timbale", "djembe", "cowbell", "woodblock", "shaker", "cabasa",
         "guiro", "agogo", "tambourine", "clave", "cuica", "udu", "darbuka", "surdo",
         "berimbau", "pandeiro"], ["pattern", "roll", "accents"]),
      X(SPACE, ["percussion"]),
      X(cat(FIRE, STORM), ["percussion storm", "percussion barrage"])
    )
  },
  TOMS: {
    cap: 220, phrases: cat(
      X(cat(HARD, BIG, TEX, METAL), ["toms"]),
      X(["rolling", "cascading", "descending", "ascending", "tribal", "thundering", "avalanche",
         "stampede", "marching", "charging", "galloping", "battering"], ["tom", "tom-tom"],
        ["run", "fill", "roll", "barrage"]),
      X(MACH, ["toms"]),
      X(SPACE, ["tom fills"]),
      X(["floor", "rack", "concert", "roto", "octoban"], ["tom", "toms"], ["fill", "roll"])
    )
  },
  GROOVES: {
    cap: 300, phrases: cat(
      X(MOTION, ["groove", "pocket", "drive", "swing"]),
      X(cat(HARD, BIG), ["hardgroove", "peak-time groove", "warehouse groove", "tribal groove",
        "rave groove", "stomping groove", "headbanger groove"]),
      X(["four-on-the-floor", "broken-beat", "tribal", "polyrhythmic", "syncopated", "half-time",
         "double-time", "shuffle", "triplet", "swung 16th", "steppers", "militaristic",
         "stampede", "gallop"], ["drive", "engine", "pressure", "momentum"]),
      X(["locked", "hypnotic", "propulsive", "unstoppable", "runaway", "steamrolling",
         "battering", "relentless", "dragstrip", "outlaw", "primal"], ["groove"]),
      X(cat(BEAST, MOTOR), ["groove", "drive", "engine"])
    )
  },
  SWINGS: {
    cap: 200, phrases: cat(
      X(["straight", "swung", "shuffled", "triplet", "dotted", "humanized", "off-grid", "drunken",
         "elastic", "pushed", "pulled", "laid-back", "ahead-of-the-beat", "behind-the-beat",
         "rushed", "dragged", "stiff", "greasy", "sloppy", "taut"], ["timing", "feel", "groove"]),
      X(["55%", "57%", "60%", "62%", "66%", "70%", "75%"], ["swing"]),
      X(MACH, ["swing"]),
      X(["machine-locked", "drift-heavy", "grid-snapping", "pocket-locked"], ["swing feel"])
    )
  },
  SYNCS: {
    cap: 180, phrases: cat(
      X(["offbeat", "downbeat", "backbeat", "upbeat", "broken", "triplet", "cross-rhythm",
         "polymetric", "displaced", "stuttered", "ratcheted", "anticipated", "delayed",
         "ghost-syncopation", "push-pull"], ["syncopation", "accents", "stabs", "pushes"]),
      X(["3-against-4", "5-against-4", "7/8", "5/4", "12/8", "6/8", "9/8", "15/16"], ["syncopation"])
    )
  },
  INTENSITIES: {
    cap: 240, phrases: cat(
      X(FORCE, ["intensity", "pressure", "impact", "force"]),
      X(["maximum", "peak-time", "full-throttle", "all-out", "runaway", "unstoppable", "escalating",
         "explosive", "redline", "red-zone", "overload", "overdrive", "critical-mass",
         "point-of-no-return"], ["energy", "drive", "assault", "overdrive", "momentum"]),
      X(cat(FIRE, STORM, WAR), ["intensity", "assault", "charge"])
    )
  },

  /* ---------- bass ---------- */
  BASS_VOICES: {
    cap: 340, phrases: cat(
      X(cat(HARD, BIG, HOT, TEX, METAL), ["bass"]),
      X(["reese", "sub", "moog", "FM", "acid", "growl", "donk", "wobble", "square", "saw",
         "triangle", "pluck", "stab", "pad", "hoover", "808", "303", "talking", "formant",
         "supersaw", "sine", "drone", "hardcore", "jungle", "speed", "neuro", "dub", "psy"],
        ["bass"]),
      X(cat(HOT, TEX, METAL, FIRE), ["reese", "sub", "FM", "acid", "growl", "wobble", "neuro"], ["bass"]),
      X(["chest-rattling", "floor-shaking", "earth-moving", "wall-flexing", "rib-cage",
         "stomach-churning", "building-shaking", "window-rattling", "sub-bass-cannon"], ["sub", "bass"])
    )
  },
  BASS_MOVES: {
    cap: 240, phrases: cat(
      X(MOTION, ["octave", "eighth-note", "16th-note", "triplet", "offbeat", "chromatic",
        "pentatonic"], ["movement", "run", "line"]),
      X(["stepping", "walking", "leaping", "sliding", "portamento", "arpeggiated", "pedal-point",
         "call-and-response", "question-and-answer", "counter-melodic", "stabbing", "pumping",
         "driving", "rolling", "galloping", "machine-gun"], ["bass movement", "bassline"])
    )
  },
  BASS_RELS: {
    cap: 200, phrases: cat(
      X(["bass locked to the kick", "bass answering the lead", "bass shadowing the hook",
         "bass in octave unison with the lead", "bass countering the melody",
         "bass driving under the chords", "bass duelling the kick", "bass mirroring the toms",
         "bass weaving through the chords", "bass chasing the snare"],
        ["", "an octave down", "with a 16th delay", "in call-and-response", "in lockstep",
         "with a sidechain pump", "in unison", "a fifth apart"]),
      X(["tight", "loose", "syncopated", "interlocking", "contrapuntal", "locked", "interwoven",
         "conversational"], ["bass-and-drum lock", "bass-and-lead dialogue"])
    )
  },

  /* ---------- melody / harmony (kept intense for the relax filter) ---------- */
  LEADS: {
    cap: 360, phrases: cat(
      X(cat(HOT, TEX, BIG, METAL), ["lead"]),
      X(["supersaw", "hypersaw", "FM", "additive", "wavetable", "granular", "vector",
         "phase-distortion", "pulse-width", "hoover", "trance", "acid", "bell", "pluck",
         "brass", "organ", "flute-like", "choir-like pad", "detuned-saw", "stacked-saw",
         "formant", "vowel", "resonant", "shred", "razor"], ["lead"]),
      X(["soaring", "wailing", "roaring", "blazing", "piercing", "anthemic", "euphoric",
         "heroic", "triumphant", "raging", "searing", "storming", "cascading", "militant",
         "victorious", "dominant", "conquering", "majestic"], ["lead", "topline", "hook"]),
      X(TEX, ["mono", "poly", "unison", "detuned", "hypersaw", "superstack"], ["lead"])
    )
  },
  PERFS: {
    cap: 220, phrases: cat(
      X(["played with", "performed with", "articulated with", "driven by"],
        ["wide vibrato", "hard pitch bends", "aggressive gating", "hammer-on runs",
         "glide portamento", "velocity accents", "expression-pedal swells", "aftertouch growl",
         "ribbon-controller sweeps", "mod-wheel filter opens", "stutter retriggers",
         "grace-note flourishes", "raking strums", "whip slides", "octave dives",
         "filter screams", "ring-mod shimmers", "harmonic squeals", "bowed roars",
         "flutter-tongue bursts"])
    )
  },
  HARMONIES: {
    cap: 260, phrases: cat(
      X(cat(BIG, HARD, FIRE), ["chords", "chord stabs", "progression"]),
      X(["suspended", "diminished", "augmented", "quartal", "modal", "borrowed", "neapolitan",
         "tritone-substituted", "chromatic-mediant", "picardy-third", "parallel", "cluster",
         "polychord", "slash-chord", "power-chord", "planing", "quartal-stacked"], ["harmony", "progression", "chords"]),
      X(["minor-to-major", "major-to-minor", "ascending", "descending", "circular", "plagal",
         "deceptive", "chain", "giant-step", "heroic"], ["lift", "resolution", "turnaround", "progression"])
    )
  },
  ARPS: {
    cap: 220, phrases: cat(
      X(["16th-note", "32nd-note", "triplet", "sextuplet", "up", "down", "up-down",
         "random-order", "chord-order", "octave-jumping", "polyrhythmic", "gated", "ratcheted",
         "machine-gun", "velocity-staggered"], ["arpeggio"]),
      X(cat(HOT, TEX), ["arpeggio"]),
      X(["euphoric", "cascading", "spiralling", "hypnotic", "runaway", "shimmering", "strafing",
         "blazing", "storming", "unbroken"], ["arpeggio", "arp run"])
    )
  },
  CONTOURS: {
    cap: 200, phrases: cat(
      X(["rising", "falling", "arch", "valley", "zig-zag", "terraced", "spiral", "wave",
         "staircase", "plateau-then-drop", "leap-then-step", "cliff-edge", "mountain",
         "dive-bomb", "sawtooth", "tornado", "rocket", "corkscrew"], ["contour", "melodic shape"]),
      X(["wide-interval", "narrow-step", "octave-spanning", "two-octave", "chromatic-creeping",
         "broken-octave", "plunging", "sky-climbing"], ["contour"])
    )
  },
  RHYTHMS: {
    cap: 200, phrases: cat(
      X(["16th-note", "8th-note", "triplet", "dotted-8th", "syncopated", "half-time",
         "double-time", "cross-rhythm", "hemiola", "polymetric", "machine-gun", "galloping",
         "stuttering", "hammering"], ["melody rhythm", "phrasing"]),
      X(["push-pull", "anticipated", "delayed-entry", "off-grid", "stuttered", "stabbing",
         "ratcheted", "charging"], ["melodic phrasing"])
    )
  },

  /* ---------- techno lab ---------- */
  TECHNO_DRIVES: {
    cap: 200, phrases: cat(
      X(["turbo", "reactor", "piston", "hydraulic", "afterburner", "flywheel", "dynamo",
         "locomotive", "jet", "rotor", "thruster", "generator", "ramjet", "scramjet",
         "ion", "plasma", "steam", "nitro"], ["drive"]),
      X(cat(HARD, HOT, MOTOR), ["drive", "engine", "push"])
    )
  },
  TECHNO_ACIDS: {
    cap: 200, phrases: cat(
      X(["squelching", "boiling", "writhing", "molten", "corrosive", "caustic", "venomous",
         "liquid", "razor", "runaway", "self-oscillating", "bubbling", "spitting",
         "hissing", "scalding", "frothing"], ["303 line", "acid line", "acid riff", "acid sequence"]),
      X(["overdriven", "resonance-cranked", "slide-heavy", "accent-driven", "distortion-fed",
         "square-blended", "saw-blended"], ["acid line"])
    )
  },
  TECHNO_TEXTURES: {
    cap: 200, phrases: cat(
      X(TEX, ["texture", "grit", "haze", "film"]),
      X(SPACE, ["texture", "ambience", "reverberation"]),
      X(["scrap-metal", "steam", "coolant", "rust", "concrete", "diesel", "ozone", "static",
         "solder", "asphalt", "gravel", "glass", "wire", "flange"], ["texture", "atmosphere"])
    )
  },
  TECHNO_RAVES: {
    cap: 200, phrases: cat(
      X(["hoover", "mentasm", "dominator", "trumpet", "orchestra-hit", "siren", "airhorn",
         "stab-stack", "chord-blast", "detuned-saw", "gabber", "hardcore", "donk", "hoover-stack",
         "piano-stab", "organ-stab"], ["stabs", "blasts", "hits"]),
      X(cat(HOT, BIG), ["rave stabs", "rave riff"])
    )
  },
  TECHNO_INDUSTRIALS: {
    cap: 200, phrases: cat(
      X(["scrap-metal", "factory-stamp", "hydraulic-press", "steel-pipe", "anvil", "chain-drag",
         "girder", "rivet-gun", "arc-welder", "turbine", "conveyor", "furnace", "punch-press",
         "drop-hammer", "lathe", "stamping", "sawmill", "crusher", "compactor"],
        ["hits", "clangs", "impacts", "rhythm"])
    )
  },

  /* ---------- sound design ---------- */
  FILTER_TYPES: {
    cap: 200, phrases: cat(
      X(["lowpass", "highpass", "bandpass", "notch", "comb", "formant", "vowel",
         "state-variable", "ladder", "diode", "SEM", "MS-20", "Korg", "moog", "Oberheim",
         "Sallen-Key", "biquad", "zero-delay"],
        ["12dB", "18dB", "24dB", "36dB", "resonant", "self-oscillating", "screaming",
         "roaring", "howling", "squalling"], ["filter"])
    )
  },
  ENVELOPE_TYPES: {
    cap: 160, phrases: cat(
      X(["snappy", "punchy", "explosive", "instant-attack", "slow-swell", "double-peak",
         "looping", "exponential", "logarithmic", "velocity-scaled", "clipped", "plucky",
         "percussive", "punch-through", "super-tight", "hard-knee"], ["ADSR", "envelope", "AD envelope", "DADSR"])
    )
  },
  LFO_TYPES: {
    cap: 180, phrases: cat(
      X(["sine", "triangle", "saw-up", "saw-down", "square", "sample-and-hold", "random-smooth",
         "chaos", "exponential", "stepped", "ramp"],
        ["0.25Hz", "0.5Hz", "1Hz", "2Hz", "4Hz", "8Hz", "1/4 sync", "1/8 sync", "1/16 sync",
         "triplet sync", "audio-rate"], ["LFO"])
    )
  },
  DISTORTION_TYPES: {
    cap: 180, phrases: cat(
      X(["soft-clip", "hard-clip", "foldback", "wavefold", "bitcrush", "sample-rate-reduce",
         "diode", "germanium", "tube", "tape", "transformer", "fuzz", "octave-fuzz",
         "waveshaper", "bias", "starve", "germanium-clip", "silicone"], ["distortion", "saturation", "drive"])
    )
  },
  REVERB_TYPES: {
    cap: 200, phrases: cat(
      X(["hall", "plate", "spring", "chamber", "room", "convolution", "shimmer", "granular",
         "reverse", "gated", "non-linear", "infinite", "cavern", "arena", "stadium"],
        ["large", "medium", "dark", "bright", "metallic", "modulated"], ["reverb"]),
      X(SPACE, ["impulse reverb"])
    )
  },
  DELAY_TYPES: {
    cap: 180, phrases: cat(
      X(["ping-pong", "stereo", "tape", "bucket-brigade", "digital", "granular", "reverse",
         "pitch-shifted", "filtered", "ducked", "modulated", "saturated"], ["1/8", "1/16", "dotted-1/8", "1/4", "triplet", "slapback"], ["delay"])
    )
  },
  SIDECHAIN_TYPES: {
    cap: 160, phrases: cat(
      X(["kick-ducked", "ghost-triggered", "bass-triggered", "snare-triggered", "band-split",
         "mid-side", "lookahead", "keyed"], ["20ms", "40ms", "60ms", "80ms", "120ms", "1/16", "1/8"], ["sidechain"])
    )
  },
  STEREO_TYPES: {
    cap: 160, phrases: cat(
      X(["mono-solid", "wide", "super-wide", "mid-side", "haas", "hard-panned", "rotating",
         "auto-panned", "binaural", "ambisonic", "ultra-wide", "dual-mono"], ["stereo field", "imaging", "spread"])
    )
  },
  FX_CHAINS: {
    cap: 200, phrases: (() => {
      const A = ["filter", "distortion", "bitcrush", "wavefold", "phaser", "flanger", "ring-mod",
        "delay", "reverb", "compressor", "granular", "chorus", "rotary", "octaver", "pitch-shift",
        "tremolo", "auto-pan", "exciter", "gate", "resonator"];
      const out = [];
      for (const a of A) for (const b of A) for (const c of A) {
        if (a === b || b === c || a === c) continue;
        out.push(a + " → " + b + " → " + c);
      }
      return out;
    })()
  },
  SOUND_INTENSITIES: {
    cap: 140, phrases: X(FORCE, ["sound-design intensity", "processing"])
  },
  CHORD_PROGS: {
    cap: 240, phrases: (() => {
      const roots = ["i", "iv", "v", "VI", "VII", "III", "ii°", "bII", "bIII", "bVI", "bVII",
        "iv7", "V7", "i7", "VI7"];
      const out = [];
      for (const a of roots) for (const b of roots) for (const c of roots) for (const d of roots) {
        if (a === b || b === c || c === d) continue;
        out.push(a + "–" + b + "–" + c + "–" + d);
      }
      return out;
    })()
  },
  RHYTHM_PATTERNS: {
    cap: 200, phrases: cat(
      X(["four-on-the-floor", "broken", "tribal", "shuffle", "half-time", "double-time",
         "triplet", "polymetric", "syncopated", "ghost-heavy", "militaristic", "galloping",
         "marching", "stomping", "breakbeat"], ["8-bar", "16-bar", "32-bar", "2-bar", "4-bar"], ["pattern"])
    )
  }
};

/* generic "texture-ish" pools: adjective × noun */
const GENERIC = {
  MIX_DENSITY: [FORCE, ["mix density", "layer stack", "wall of sound", "full-spectrum mass"]],
  MIX_ENERGY: [cat(HARD, BIG, FIRE, STORM), ["mix energy", "forward drive", "front-loaded punch", "relentless push"]],
  MIX_SPACE: [cat(BIG, SPACE), ["mix space", "depth field", "room", "staging"]],
  MIX_GLUE: [["bus-compressed", "tape-glued", "transformer-glued", "parallel-crushed", "opto-glued",
    "VCA-glued", "FET-glued", "diode-glued", "tube-glued", "analog-summed", "console-summed",
    "neve-glued", "ssl-glued", "api-glued", "vari-mu-glued", "tape-saturated", "clipper-glued",
    "summing-mixed", "phase-locked", "glued-together", "welded-tight", "cohesive", "monolithic"],
    ["mix glue", "bus cohesion", "glue", "summing"]],
  MIX_PUNCH: [cat(HARD, HOT, FIRE, WAR), ["transient punch", "attack snap", "impact", "knock"]],
  MASTER_DRIVE: [cat(HOT, HARD, FIRE), ["master drive", "bus saturation", "push", "hype"]],
  MASTER_LOUDNESS: [["-3 LUFS", "-4 LUFS", "-5 LUFS", "-6 LUFS", "-7 LUFS", "-8 LUFS", "-9 LUFS",
    "club-level", "festival-level", "arena-level", "peak-time", "broadcast-max", "streaming-max",
    "redline", "full-scale"], ["loudness", "master level"]],
  MASTER_COLOR: [cat(TEX, HOT), ["master color", "bus tone", "sonic signature"]],
  MASTER_CHAIN: [[
    "EQ → compressor → saturator → limiter",
    "compressor → tape → clipper → limiter",
    "mid-side EQ → glue comp → soft clip → limiter",
    "transient shaper → saturator → multiband → limiter",
    "EQ → multiband comp → exciter → limiter",
    "compressor → parallel crush → tape → limiter",
    "gate → EQ → compressor → clipper",
    "de-esser → EQ → glue comp → limiter",
    "saturator → EQ → multiband → limiter",
    "EQ → compressor → widener → limiter",
    "clipper → limiter → limiter",
    "analog bus comp → EQ → limiter",
    "EQ → dynamic EQ → saturation → limiter",
    "multiband comp → clipper → limiter",
    "transient shaper → glue comp → limiter",
    "EQ → compressor → soft clipper → limiter"
  ], ["chain"]],
  FILTER_CUTOFF_TYPES: [["80Hz", "120Hz", "220Hz", "400Hz", "800Hz", "1.2kHz", "2.5kHz", "5kHz",
    "8kHz", "12kHz", "40Hz", "60Hz", "16kHz", "20kHz"], ["cutoff sweep", "cutoff automation", "cutoff open"]],
  FILTER_RESONANCE_TYPES: [["screaming", "self-oscillating", "biting", "howling", "razor",
    "resonant-peak", "shrieking", "whistling", "ringing", "metallic"], ["resonance"]],
  EQ_TYPES: [["surgical", "broad-stroke", "mid-side", "dynamic", "tilt", "Pultec-style",
    "API-style", "SSL-style", "Neve-style", "GML-style", "parametric", "graphic", "linear-phase",
    "minimum-phase", "analog-modeled", "transparent"], ["EQ", "equalizer", "curve"]],
  COMPRESSION_TYPES: [["FET", "VCA", "opto", "vari-mu", "multiband", "parallel", "serial",
    "upward", "transient-shaped", "diode-bridge", "feed-forward", "feed-back", "punch",
    "glue", "brickwall", "soft-knee", "hard-knee"], ["compression"]],
  SATURATION_TYPES: [cat(TEX, HOT), ["saturation"]],
  SIDECHAIN_CURVE_TYPES: [["exponential", "logarithmic", "linear", "S-curve", "snap-back",
    "long-tail", "fast-release", "squared"], ["sidechain curve"]],
  STEREO_IMAGE: [["focused", "panoramic", "wall-to-wall", "mid-forward", "side-heavy", "rotating",
    "immense", "towering", "vivid"], ["stereo image"]],
  STEREO_WIDTH: [["110%", "130%", "150%", "180%", "200%", "mono-bass", "super-wide", "ultra-wide",
    "hyper-wide"], ["stereo width"]],
  SPATIAL_DEPTH: [cat(BIG, SPACE), ["depth", "front-to-back staging", "layering"]],
  SPATIAL_MOVEMENT: [["orbiting", "sweeping", "spiralling", "ricocheting", "pendulum",
    "auto-panned", "doppler", "circling", "pulsing", "revolving"], ["spatial movement"]],
  STEREO_ENHANCE_TYPES: [["haas", "mid-side", "unison-widened", "phase-rotated", "multiband-widened",
    "exciter-driven", "spectral"], ["stereo enhancement"]],
  REVERB_SIZE_TYPES: [cat(BIG, SPACE), ["reverb size"]],
  REVERB_DECAY_TYPES: [["0.8s", "1.5s", "2.5s", "4s", "6s", "10s", "infinite", "gated 300ms",
    "reverse-swelling", "12s", "20s", "epic-tail"], ["decay"]],
  MOD_SOURCE: [["LFO 1", "LFO 2", "envelope 2", "sample-and-hold", "velocity", "aftertouch",
    "step-sequencer", "chaos generator", "audio-rate operator", "key-track", "random"], ["modulation source"]],
  MOD_DEST: [["filter cutoff", "resonance", "pitch", "pulse width", "FM depth", "wavefolder",
    "delay time", "reverb size", "pan", "drive", "wave position", "LFO rate"], ["modulation target"]],
  MOD_RATE: [["1/1", "1/2", "1/4", "1/8", "1/16", "1/32", "triplet", "dotted", "free-running",
    "audio-rate"], ["modulation rate"]],
  MOD_DEPTH: [["subtle", "moderate", "deep", "extreme", "full-range", "bipolar", "unipolar",
    "cascading"], ["modulation depth"]],
  TEXTURE_LAYER: [cat(TEX, HARD), ["texture layer", "grit bed", "noise floor"]],
  GRAIN_TYPE: [cat(TEX, HARD), ["granular grain", "grain cloud", "granular wash"]],
  SHIMMER_TYPE: [["octave-up", "fifth-up", "two-octave", "crystalline", "spectral", "harmonic",
    "upper-harmonic", "bright-sparkle"], ["shimmer"]],
  ATMOSPHERE_TYPE: [cat(SPACE, BIG), ["atmosphere", "air", "ambience"]],
  GHOST_NOTES: [["16th", "32nd", "triplet", "velocity-scaled", "filtered", "hat", "snare",
    "kick", "shuffle", "drag", "ruff"], ["ghost notes"]],
  HUMANIZE_TYPES: [["±2ms", "±5ms", "±8ms", "±12ms", "velocity-randomized", "groove-templated",
    "live-drummer", "imperfect", "drift-added"], ["humanization"]],
  POCKET_TYPES: [["ahead-of-the-beat", "behind-the-beat", "dead-center", "elastic", "locked-in",
    "pushing", "pulling", "deep", "front"], ["pocket"]],
  ORNAMENT_TYPES: [["grace-note", "mordent", "trill", "turn", "acciaccatura", "slide-in",
    "fall-off", "doit", "scoop", "rip", "bend-up"], ["ornamentation"]],
  VIBRATO_TYPES: [["wide", "fast", "slow-onset", "delayed", "pitch-only", "filter", "amplitude",
    "shimmering", "unstable"], ["vibrato"]],
  PORTAMENTO_TYPES: [["10ms", "40ms", "80ms", "150ms", "fingered", "constant-rate",
    "constant-time", "legato-only", "sliding", "long-glide"], ["portamento"]],
  SCALE_RUNS: [["ascending", "descending", "chromatic", "pentatonic", "modal", "octave-displaced",
    "double-time", "cascading", "lightning", "blazing"], ["scale run"]],
  INTERVAL_LEAPS: [["octave", "fifth", "seventh", "ninth", "tritone", "eleventh", "two-octave",
    "compound", "fourteenth"], ["leap"]],
  VOICING_TYPES: [["close", "open", "drop-2", "drop-3", "quartal", "cluster", "spread", "shell",
    "rootless", "drop-2+4", "fourth-stacked"], ["voicing"]],
  INVERSION_TYPES: [["root-position", "first-inversion", "second-inversion", "third-inversion",
    "slash-bass", "pedal-bass", "upper-structure"], ["inversion"]],
  TENSION_TYPES: [["b9", "#9", "#11", "b13", "add9", "sus2", "sus4", "13", "b5", "#5", "9"],
    ["tension"]],
  RESOLUTION_TYPES: [["authentic", "plagal", "deceptive", "phrygian", "chromatic",
    "suspended-then-released", "delayed", "interrupted"], ["resolution"]],
  DELAY_TIME_TYPES: [["1/16", "1/8", "dotted-1/8", "1/4", "dotted-1/4", "triplet-1/8", "60ms",
    "120ms", "250ms", "375ms", "500ms", "750ms"], ["delay time"]],
  DELAY_FEEDBACK_TYPES: [["15%", "30%", "45%", "60%", "75%", "self-oscillating", "filtered",
    "ducked", "pitch-shifted", "saturated"], ["feedback"]],
  SECTION_DENSITY_TYPES: [cat(HARD, BIG), ["section density", "arrangement density", "arrangement mass"]],
  RIDE_TYPES: [["bell-heavy", "washy", "crashing", "tight-ping", "sizzling", "metallic",
    "hand-hammered", "brass", "bright"], ["ride"]],
  CRASH_TYPES: [cat(BIG, HARD, METAL), ["crash", "china crash", "splash", "cymbal wash"]],
  CLAP_LAYERS: [["triple-stacked", "room-mic'd", "reverse-tailed", "gated", "pitched", "flammed",
    "stadium", "arena", "snap-backed"], ["clap layer"]],
  PERC_FILLS: [["tom", "shaker", "conga", "metal", "glitch", "reverse", "stutter", "roll",
    "snare", "rim"], ["fill"]],
  FX_TYPES: [["riser", "downlifter", "impact", "reverse-swell", "sweep", "noise-burst",
    "tape-stop", "glitch-stutter", "vinyl-brake", "siren", "dive-bomb", "whoosh", "braam"],
    ["FX"]],
  TRANSITION_TYPES: [["filter-sweep", "drum-roll", "reverse-cymbal", "silence-drop", "tape-stop",
    "beat-repeat", "noise-riser", "bar-roll", "impact-cut"], ["transition"]],
  RISER_TYPES: [["white-noise", "pitch-rising", "granular", "shepard-tone", "filtered-saw",
    "snare-roll", "kick-roll", "strobe"], ["riser"]],
  IMPACT_TYPES: [cat(BIG, HARD, FIRE, WAR), ["impact", "boom", "hit", "slam"]],
  ENERGY_CURVE_TYPES: [["linear-climb", "step-climb", "plateau-then-surge", "double-peak",
    "sawtooth", "relentless-climb", "staircase", "pyramid"], ["energy curve"]],
  BUILD_TYPES: [["8-bar", "16-bar", "32-bar", "filter-driven", "drum-driven", "noise-driven",
    "harmonic", "riser-driven", "snare-driven"], ["build"]],
  DROP_TYPES: [["full-force", "half-time", "beat-skipping", "silence-then-slam", "double-drop",
    "rolling", "relentless", "bass-heavy"], ["drop"]],
  CHOP_TYPES: [["16th", "32nd", "triplet", "reverse", "gated", "stutter", "granular",
    "beat-repeat", "vocal-free", "glitch"], ["chop"]],
  FEELINGS: [[
    "ferocious", "unstoppable", "triumphant", "defiant", "ecstatic", "possessed", "electrified",
    "volcanic", "iron-willed", "star-bound", "invincible", "unbreakable", "thunderstruck",
    "supernova", "war-hungry", "victory-drunk", "fearless", "gigantic", "colossal", "raging"
  ], ["fury", "resolve", "drive", "euphoria", "menace", "momentum", "dominance", "ecstasy",
    "triumph", "defiance", "ferocity", "intensity", "power", "glory", "conquest"]],
  FLAVORS: [["dangerously", "brutally", "gloriously", "savagely", "impossibly", "relentlessly",
    "violently", "ferociously", "mercilessly", "stunningly", "devastatingly", "explosively",
    "ruthlessly", "blindingly", "ferally", "monstrously"],
    ["alive", "beautiful", "hopeful", "euphoric", "unhinged", "cinematic", "radiant",
     "electric", "magnetic", "indestructible", "majestic", "vivid", "blazing", "triumphant",
     "menacing", "ecstatic", "colossal", "luminous", "galvanizing"]],
  DIRECTIONS: [["soaring", "hammering", "spiralling", "cascading", "surging", "blazing",
    "raging", "storming", "tearing", "searing", "roaring", "charging", "blitzing", "climbing",
    "diving", "marching"],
    ["emotional hook", "octave melody", "minor-key lead", "anthem topline", "counter-line",
     "crusher hook", "peak-time motif", "arena lead", "rage melody", "victory line",
     "stampede lead", "conquest theme"]]
};
for (const [name, parts] of Object.entries(GENERIC)) {
  RECIPES[name] = { cap: 160, phrases: X(...parts) };
}

/* ------------------------------------------------ generate ------------------------------------------------ */
const EXTRA = {};
let added = 0, pools = 0;
for (const [name, r] of Object.entries(RECIPES)) {
  if (!Array.isArray(D[name])) { console.warn("skip unknown pool " + name); continue; }
  const list = grow(name, r.phrases, r.cap, MELODY_KEYS.has(name));
  if (!list.length) continue;
  EXTRA[name] = list; added += list.length; pools++;
}

const header = `/* data/expansion.js — GENERATED by tools/expand-sounds.js. DO NOT EDIT BY HAND.
   Additive sound-pool expansion: ${added} new entries across ${pools} pools.
   Deterministic, deduped against the verbatim pools, banned-word free,
   instrumental-safe. The verbatim legacy pools in the other data modules
   are never modified — these are appended at runtime by engine/state.js. */\n`;
const body = Object.entries(EXTRA)
  .map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v, null, 0).replace(/\",\"/g, '",\n    "') + ",")
  .join("\n");
writeFileSync(new URL("../data/expansion.js", import.meta.url),
  header + "export const EXTRA_POOLS = {\n" + body + "\n};\n");

const before = Object.keys(EXTRA).reduce((a, k) => a + D[k].length, 0);
console.log("Expanded " + pools + " pools: " + before + " → " + (before + added) + " entries (+" + added + ").");
