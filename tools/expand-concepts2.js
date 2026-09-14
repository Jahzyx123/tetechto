/* tools/expand-concepts2.js — GENERATES data/concept-extra2.js
   The "concepts wave two": a second deterministic expansion of the concept
   card (world, location, visual, narrative, sensation, event, conflict,
   crowd, title, transform) and the melody-concept pools (story, role,
   motion, hook), built from an entirely fresh vocabulary so it stacks on
   top of wave one without collisions.

   Same contract as wave one: deterministic (seeded), banned-word free,
   vocal-safe, melody lines refuse relax vocabulary, deduped against the
   verbatim pools AND wave one AND itself. Additions only.

   Run: node tools/expand-concepts2.js */
import { writeFileSync } from "node:fs";
import { CONCEPT } from "../data/concept.js";
import { MELODY_CONCEPT } from "../data/melody.js";
import { EXTRA_CONCEPT, EXTRA_MELODY_CONCEPT_MORE } from "../data/concept-extra.js";
import { EXTRA_MELODY_CONCEPT } from "../data/melody-extra.js";
import { VOCAL_WORDS } from "../data/safety.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
const DIRTY_MINIMAL = ["minimal", "minimalist", "minimalism", "sparse", "restrained",
  "low-energy", "low energy", "weak", "tiny", "gentle", "quiet"];
const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "i");
const MELODY_SOFT_RE = /\b(simple|simpl|basic|plain|minimal|sparse|restrained|quiet|subtle|soft|gentle|calm|soothing|serene|peaceful|content|tender|dreamy|mellow|smooth|easy|lazy|unhurried|laid[- ]?back|slow|light|lullab|drift|float|airy|delicate|feather|glacial|breez|languid|leisurely|cozy|vague|warm|tranquil|peace|hum|song|stroll)\b/i;
/* genre-safe rewrites/deletions to avoid so lines read as-written in every
   genre world (drop→refrain, euphoric→joyous, machine/siren stripped…) */
const WORLD_UNSAFE_RE = /\b(machine|machines|siren|sirens|laser|lasers|filter|synth|synths|synthesizer|rave|warehouse|industrial|stadium|arena|factory|overdrive|anthem|anthems|euphoric|explosive|pumping|crushing|ferocious|stomp|stomping|909|808|303)\b/i;

function cleanText(t, melody) {
  if (!t || t.length > 100) return false;
  const low = t.toLowerCase();
  for (const b of DIRTY_MINIMAL) if (low.includes(b)) return false;
  if (VOCAL_RE.test(low)) return false;
  if (WORLD_UNSAFE_RE.test(low)) return false;
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
const rnd = mulberry32(20260916);
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
/* dedupe against verbatim + wave one + itself */
const BASE = new Set();
for (const k in CONCEPT) for (const v of CONCEPT[k]) BASE.add(String(v).toLowerCase().trim());
for (const k in EXTRA_CONCEPT) for (const v of EXTRA_CONCEPT[k]) BASE.add(String(v).toLowerCase().trim());
const MC_BASE = new Set();
for (const k in MELODY_CONCEPT) for (const v of MELODY_CONCEPT[k]) MC_BASE.add(String(v).toLowerCase().trim());
for (const k in EXTRA_MELODY_CONCEPT) for (const v of EXTRA_MELODY_CONCEPT[k]) MC_BASE.add(String(v).toLowerCase().trim());
for (const k in EXTRA_MELODY_CONCEPT_MORE) for (const v of EXTRA_MELODY_CONCEPT_MORE[k]) MC_BASE.add(String(v).toLowerCase().trim());

function grow(baseSet, phrases, cap, melody) {
  const seen = new Set();
  const out = [];
  for (const p of shuffle(phrases)) {
    const t = String(p).replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!cleanText(t, melody) || baseSet.has(k) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/* ================================================= WORLD ================================================= */
const W2_ADJ = ["submerged", "wind-torn", "sun-struck", "levitating", "calcified", "terraced",
  "vaulted", "labyrinthine", "war-torn", "gold-leafed", "rust-veined", "tide-locked",
  "comet-struck", "ash-crowned", "copper-clad", "fog-bound", "star-lit", "deep-core",
  "sky-bound", "iron-wrought", "storm-glass", "ember-veined", "glacier-carved", "after-hours",
  "untamed", "unsleeping", "high-altitude", "subsonic", "sand-buried", "wave-worn",
  "thunder-headed", "silvered", "black-sand", "red-dust", "glass-blown", "wire-strung", "bass-heavy"];
const W2_PLACE = ["sea wall", "tidal gate", "wind farm", "silo city", "dust port", "signal tower",
  "night market", "flooded quarry", "glass bridge", "magma chamber", "icebreaker", "rail yard",
  "salt mine", "echo chamber", "storm cellar", "rooftop garden", "submarine dock", "antenna array",
  "power canyon", "drum circle plaza", "clock tower", "ferry terminal", "customs gate",
  "lighthouse reef", "quarantine buoy", "weather station", "sonar dome", "fossil bed",
  "terraced city", "hanging gardens", "basalt columns", "copper mine", "wheat sea",
  "caravan route", "night harbor", "floating market", "dry lake", "launch trench",
  "orbital debris field", "sunken fleet", "magnetic anomaly", "gravity well", "last outpost"];
const W2_VERB = ["migrating", "echoing", "crystallizing", "levitating", "smoldering",
  "broadcasting", "hunting", "gathering", "pulsing", "flooding", "mutating", "accelerating",
  "circling", "landing", "launching", "erupting", "thawing", "sailing", "marching",
  "converging", "detonating", "rebuilding", "rewilding", "recharging", "signaling", "surfacing"];
const W2_ABS = ["the undertow", "a low tide", "the jet stream", "a pressure front", "the equator",
  "a compass error", "the deep current", "an aftershock", "the white noise of rain",
  "a standing wave", "the trade winds", "a fault line", "the midnight sun", "polar static",
  "a gravity wave", "the sound of ice"];
const W2_TAIL = ["answers to no map", "moves an inch every year", "has its own weather",
  "rings like struck metal", "never shows up on satellite", "keeps its own calendar",
  "glows faintly at low tide", "swallows every radio signal", "has outlived three empires",
  "runs hotter every decade", "leans toward the sea", "predates the coastline",
  "breathes twice a day", "sings only during storms", "casts no shadow at noon"];
const world = [].concat(
  X(W2_ADJ, W2_PLACE),
  X(W2_ADJ, W2_PLACE, ["", W2_VERB]),
  X(["a", "the"], W2_PLACE, ["of"], W2_ABS),
  X(W2_PLACE.slice(0, 24), ["that"], W2_TAIL),
  X(W2_ADJ.slice(0, 20), W2_PLACE.slice(0, 24), ["powered by", "built around", "haunted by"], W2_ABS)
);

/* ================================================= LOCATION ================================================= */
const L2_PREP = ["around the corner of", "at the base of", "atop", "through", "past",
  "underneath", "along the spine of", "on the roof of", "in the hold of", "at the gate of",
  "inside the hull of", "on the seaward side of", "in the lee of", "just beyond",
  "half-buried in", "wired into", "bolted to", "floating above", "carved into", "hidden within"];
const L2_ADJ = ["salt-crusted", "storm-proof", "hand-built", "half-finished", "war-scarred",
  "sun-bleached", "copper-green", "tar-black", "gold-plated", "fog-horned", "wind-bent",
  "tide-marked", "soot-stained", "rain-slicked", "ice-cored", "sand-scoured", "rope-bound",
  "chain-linked", "glass-walled", "steel-ribbed"];
const L2_PLACE = ["flood wall", "breakwater", "gantry", "sluice", "dry canal", "night dock",
  "old customs house", "signal station", "weather buoy", "grain elevator", "water tower",
  "smokestack", "turbine field", "antenna farm", "substation", "switchyard", "pumping station",
  "lock and dam", "ferry slip", "cargo terminal", "fuel depot", "salvage yard", "boat lift",
  "sea gate", "river mouth", "tidal basin", "anchor field", "beacon point", "summit relay",
  "border relay"];
const location = [].concat(
  X(L2_PREP, ["a", "the"], L2_ADJ, L2_PLACE),
  X(L2_PREP, ["the"], L2_PLACE, ["of", "beneath", "behind"], ["the", "a"], W2_PLACE.slice(0, 20))
);

/* ================================================= VISUAL ================================================= */
const V2_LIGHT = ["magnesium flare", "aurora curtain", "arc-welder flash", "lighthouse sweep",
  "flare stack", "static discharge", "cathode glow", "sodium streetlight", "meteor trail",
  "heat shimmer", "glacial blue", "spark shower", "phosphorescent wake", "neon cross",
  "strobe wall", "beacon flash", "dawn glare", "afterimage", "reflected city",
  "burning horizon", "double sunset", "green flash", "corona ring", "heat lightning"];
const V2_VERB = ["cascading down", "erupting from", "spilling over", "lacing through",
  "streaking across", "blooming inside", "crackling along", "pooling under",
  "shattering into", "pouring through", "seeping into", "arching over", "ricocheting off",
  "spiraling up", "condensing on", "evaporating off", "clinging to", "sheeting down",
  "flickering within", "exploding against"];
const V2_MEDIA = ["sea spray", "meltwater", "iron filings", "coal dust", "pollen", "ash",
  "gravel", "driftwood", "sea glass", "wet rope", "chain-link", "corrugated steel",
  "wet canvas", "salt crystals", "frost", "condensation", "oil slick", "foam", "silt",
  "smokestack plume", "flooded streets", "black ice", "standing water", "copper patina",
  "rust flakes", "wet newsprint"];
const visual = [].concat(
  X(V2_LIGHT, V2_VERB, V2_MEDIA),
  X(V2_MEDIA.slice(0, 14), ["lit from within by"], V2_LIGHT.slice(0, 12)),
  X(["everything"], V2_VERB.slice(0, 10), V2_LIGHT.slice(0, 14))
);

/* ================================================= NARRATIVE ================================================= */
const N2_SUBJ = ["a tidal engine", "the night ferry", "an unfinished bridge", "a border antenna",
  "the oldest turbine", "a convoy of lights", "the last icebreaker", "a buried subway",
  "the weather station", "a decommissioned beacon", "the midnight market", "a wandering frequency",
  "the deep cable", "an unlit lighthouse", "the salvage crew", "a drifting buoy",
  "the storm chasers", "an emergency broadcast", "the tide clock", "a forgotten relay"];
const N2_VERB = ["reawakens", "re-routes", "reclaims", "outrides", "outlasts", "rekindles",
  "redirects", "summons", "anchors", "drags to safety", "rewrites", "reignites", "shelters",
  "guides", "unearths", "reassembles", "relays", "outshines", "unlocks", "recharts"];
const N2_SWAP = ["wreckage into shelter", "a warning into welcome", "drift into arrival",
  "shipwreck into harbor", "exile into expedition", "blackout into festival",
  "erosion into art", "a border into a meeting point", "scarcity into surplus",
  "a dead channel into a lifeline", "ruin into refuge", "a mistake into a legend",
  "debris into architecture", "a delay into a destination", "silence into sonar",
  "storm surge into power", "fog into fuel", "a breakdown into a breakthrough",
  "rust into relic gold"];
const N2_LEARN = ["finds the hidden channel", "learns the tide table by heart",
  "starts answering distress calls", "chooses to stay lit", "rewrites its own chart",
  "begins guiding others home", "keeps the beacon burning", "memorizes every coastline",
  "refuses to sink", "starts mapping the dark"];
const narrative = [].concat(
  X(N2_SUBJ, N2_VERB, N2_SWAP),
  X(N2_SUBJ.slice(0, 14), N2_LEARN),
  X(["tonight", "at last", "against all odds", "one last time"], N2_SUBJ.slice(0, 14), N2_VERB.slice(0, 12), ["everything", "the whole coast", "the night itself"])
);

/* ================================================= SENSATION ================================================= */
const S2_THING = ["pressure", "voltage hum", "heat wave", "undertow", "gravity pull",
  "static charge", "shockwave", "resonance", "tremor", "surge", "backdraft", "overpressure",
  "sub-bass rumble", "infrasound", "a frequency shift", "the Doppler bend", "sonic boom",
  "reverb wash", "standing wave", "the backbeat"];
const S2_VERB = ["rolls through the chest", "builds behind the eyes", "travels up the spine",
  "settles in the sternum", "rattles the ribcage", "presses on the temples",
  "lifts the hair on your arms", "pulls at the inner ear", "vibrates the floorboards",
  "blooms behind the ribs", "crawls across the skin", "lands like a pressure wave",
  "charges the air", "rings in the bones", "moves the whole room"];
const S2_WHERE = ["on the top floor", "at the sea wall", "inside the turbine hall",
  "under the motorway", "on the observation deck", "in the flooded basement",
  "at the back of the crowd", "on the night ferry", "inside the echo chamber",
  "at the edge of the salt flat", "on the rooftop", "in the stairwell", "at the dock gate",
  "inside the storm cellar", "on the dancefloor", "in the rail yard"];
const S2_LIKE = ["a takeoff you never board", "the second before the wave breaks",
  "standing inside a struck bell", "a held breath released", "the elevator dropping one floor too fast",
  "a flag snapping in high wind", "the first second of freefall", "a door slamming in an empty hall",
  "the rumble after the thunder", "an anchor chain running out", "a turbine reaching speed",
  "the deck heaving once, then steadying"];
const sensation = [].concat(
  X(S2_THING, S2_VERB, S2_WHERE),
  X(["it feels like"], S2_LIKE, S2_WHERE.slice(0, 10)),
  X(S2_THING.slice(0, 12), ["felt like"], S2_LIKE.slice(0, 8))
);

/* ================================================= EVENT ================================================= */
const E2_SUBJ = ["the grand reopening", "a surprise eclipse", "the final departure",
  "the midnight launch", "a rolling blackout", "the tide turning early", "an unscheduled landing",
  "the beacon centennial", "a magnetic storm", "the bridge completion", "the convoy arrival",
  "an emergency flare", "the first broadcast", "the dry dock flooding", "the glacier calving",
  "a satellite re-entry", "the market last night", "the eye of the storm passing overhead",
  "the clock tower striking thirteen"];
const E2_VERB = ["draws every light in the city", "sets the harbor bells ringing",
  "pulls two rival crews into one rhythm", "turns the rooftop into a stage",
  "rewrites tonight's plan", "brings the night shift into the daylight",
  "empties the streets and fills the shore", "makes every clock agree",
  "sends the birds up at once", "lights the horizon edge to edge",
  "starts a chain of small rescues", "puts the whole coast on the same frequency",
  "gives the city a reason to stay up", "turns weather into celebration"];
const E2_TAIL = ["and nobody leaves early", "and the tide forgets to turn",
  "and every window stays lit", "and the story gets bigger each telling",
  "and the night extends its lease", "and the map has to be redrawn",
  "and the alarms become percussion", "and dawn arrives to applause",
  "and the fog lifts exactly on cue", "and the power grid hums along",
  "and the old charts stop applying", "and the harbor lights spell it out"];
const event = [].concat(
  X(E2_SUBJ, E2_VERB),
  X(E2_SUBJ.slice(0, 12), E2_VERB.slice(0, 10), E2_TAIL),
  X(["tonight's event:", "tonight:", "scheduled:"], E2_SUBJ.slice(0, 14))
);

/* ================================================= CONFLICT ================================================= */
const C2_A = ["the current", "the map", "the tide clock", "the beacon", "the engine",
  "the old chart", "the storm wall", "the antenna", "the salvage crew", "the schedule",
  "the harbor", "the convoy", "the breakwater", "the compass", "the fuel gauge", "the forecast"];
const C2_B = ["the hull", "the territory", "the moon", "the fog", "the ice", "the new coast",
  "the open sea", "the silence", "the deep", "the weather", "the hurricane", "the current",
  "the deadline", "the shoal", "the headwind", "the undertow"];
const C2_FORM = ["matched against", "locked with", "outpacing", "holding off",
  "trading blows with", "locked in a long duel with", "winning ground from", "standing firm against"];
const conflict = [].concat(
  X(C2_A, C2_FORM, C2_B),
  X(["a standoff between"], C2_A.slice(0, 10), ["and"], C2_B.slice(0, 10)),
  X(["the long match of"], C2_A.slice(0, 10), ["versus"], C2_B.slice(4, 14))
);

/* ================================================= CROWD ================================================= */
const CR2_SIZE = ["a crowd of ten thousand", "a packed harbor-front crowd", "a rooftop crowd",
  "an all-night crowd", "a rolling crowd", "a crowd that fills the dry dock",
  "a crowd that outnumbers the gulls", "a standing-room-only crowd", "a crowd three streets deep",
  "a crowd that arrived by ferry"];
const CR2_WHO = ["night-shift workers", "salvage crews", "storm watchers", "ferry commuters",
  "lighthouse keepers", "market traders", "turbine engineers", "harbor pilots",
  "off-duty firefighters", "radio operators", "tide researchers", "beacon keepers",
  "dock workers", "bridge painters", "weather volunteers", "the entire coast guard"];
const CR2_DO = ["keeps time with the swell", "moves as one when the beacon flashes",
  "counts down in three languages", "lights matches as the tide turns",
  "sways with the turbine rhythm", "roars every time the lock gates open",
  "holds the line against the weather", "turns the flood wall into a grandstand",
  "answers the foghorn in rhythm", "stamps the frost off the deck"];
const crowd = [].concat(
  X(CR2_SIZE, ["of"], CR2_WHO),
  X(CR2_SIZE.slice(0, 8), ["that"], CR2_DO),
  X(CR2_WHO.slice(0, 12), CR2_DO)
);

/* ================================================= TITLE ================================================= */
const T2_A = ["TIDAL", "SALT", "HARBOR", "BEACON", "NORTH", "DEPTH", "SHORE", "ANCHOR",
  "CURRENT", "EMBER", "ASH", "FROST", "GRANITE", "COPPER", "BRASS", "STEEL", "TIMBER",
  "GLASS", "MARBLE", "BASALT", "CORAL", "IVORY", "ONYX", "AMBER", "COBALT", "NICKEL",
  "MERCURY", "RADAR", "SONAR", "COMPASS", "CHART", "PILOT", "MAGNET", "PENDULUM",
  "FULCRUM", "LEVER", "PISTON", "HAMMER", "ANVIL", "GALLEON", "MERIDIAN", "MONSOON SEA",
  "LANDFALL", "WAYPOINT", "BEARING", "KEYSTONE", "TURBINE", "GANTRY", "SCAFFOLD", "DYNAMO"];
const T2_B = ["UNDERTOW", "SWELL", "BREAKWATER", "LIGHTHOUSE", "FERRY", "HARPOON",
  "LATITUDE", "FLOTILLA", "REGATTA", "TSUNAMI", "TYPHOON", "CYCLONE", "WHIRLPOOL",
  "ICEBERG", "GLACIER", "FOG BANK", "SEA GATE", "DEPTH CHARGE", "RIP TIDE",
  "STORM GLASS", "WEATHER FRONT", "ANCHORAGE", "DRY DOCK", "FLOOD WALL", "SOUNDING",
  "CROSSWIND", "BACKBEAT", "DOWNBEAT", "UPSWELL", "OUTPOST", "RECKONING TIDE",
  "IRON TIDE", "SECOND WIND", "LONG SWELL", "HIGH GROUND", "DEAD RECKONING",
  "OPEN WATER", "FIRST LIGHT", "NIGHT PASSAGE", "FULL STEAM"];
const title = [].concat(
  X(T2_A, T2_B),
  X(["THE"], T2_B.slice(0, 20), ["OF"], T2_A.slice(0, 20))
);

/* ================================================= TRANSFORM ================================================= */
const TR2_FROM = ["rust", "salt", "fog", "wreckage", "driftwood", "ballast", "anchor weight",
  "harbor fog", "cold iron", "sea spray", "coal smoke", "engine grease", "storm debris",
  "floodwater", "black ice", "copper scale", "dust", "ash", "slag", "silt"];
const TR2_TO = ["gold", "buoyancy", "momentum", "altitude", "shelter", "festival",
  "harbor light", "a compass heading", "a steady course", "lift", "an open channel",
  "a homing signal", "pure thrust", "daylight", "a standing ovation", "sea room",
  "clear water", "tailwind", "first light", "rescue"];
const transform = [].concat(
  X(TR2_FROM, ["becomes"], TR2_TO),
  X(TR2_FROM.slice(0, 12), ["is recast as"], TR2_TO.slice(0, 12)),
  X(["tonight's"], TR2_FROM.slice(0, 12), ["becomes tomorrow's"], TR2_TO.slice(4, 16))
);

/* ================================================= MELODY CONCEPTS ================================================= */
const MC2_STORY_SUBJ = ["a beacon", "the tide", "one hull note", "a storm", "the last door",
  "a frequency", "the ice", "the night shift", "a message", "every compass needle",
  "the fog", "an echo", "a drifting signal", "the engine room", "a countdown", "the sea",
  "a bridge", "the weather", "the horizon", "an old chart"];
const MC2_STORY_VERB = ["answering after a hundred years", "learning to keep time",
  "spreading across the whole fleet", "converted into steady power", "opening at last",
  "finding its own harbor", "melting into rhythm", "becoming the main event",
  "arriving exactly on the beat", "agreeing at once", "lifting as the first note lands",
  "returning stronger than the call", "finally docking", "becoming the heart",
  "flaking away to reveal gold", "ending in flight", "giving back what it took",
  "finishing itself overnight", "turning into percussion", "leaning closer"];
const MC2_ROLE_A = ["the lighthouse", "the map", "the flare fired overhead", "the first ferry home",
  "the crane lifting everything", "the compass", "the lookout", "the tide table",
  "the keel", "the searchlight", "the harbor bell", "the anchor line"];
const MC2_ROLE_B = ["the sea it floats above", "the weight it carries", "the dark it answers",
  "the storm it outlasts", "the harbor it guides", "the deck it holds steady",
  "the night it patrols", "the coastline it memorizes", "the deep it crosses",
  "the weather it defies", "the current it rides", "the shore it promises"];
const MC2_MOTION_A = ["starts submerged", "begins as fog", "coils through the intro",
  "circles twice", "dives at the breakdown", "gathers speed in straight lines",
  "moves like a tide with an agenda", "steps up in fifths", "swings wide",
  "rises one deck higher every sixteen bars", "holds position then surges", "banks hard left"];
const MC2_MOTION_B = ["surfaces at the build", "condenses into rhythm", "strikes at the peak",
  "then cuts straight for the drop", "rockets out of it", "until the sky opens",
  "then locks into the groove", "and never looks back", "before the final climb",
  "then slams into the climax", "and rides the wall of drums", "then holds the peak"];
const MC2_HOOK_A = ["a two-note call", "an interval", "a rhythmic knock", "the same three notes",
  "a hook", "a phrase", "a rising figure", "a stuttered note", "a call sign", "one long note"];
const MC2_HOOK_B = ["that the whole crowd answers", "that keeps widening",
  "repeated until the door opens", "one octave higher each time",
  "built from one pitch and pure timing", "landing with the downbeat every fourth bar",
  "that never resolves until the end", "turned into a ladder",
  "repeated until it becomes a melody", "bent into the shape of a wave"];
const EXTRA_MELODY_CONCEPT_W2 = {
  story: grow(MC_BASE, X(MC2_STORY_SUBJ, MC2_STORY_VERB), 100, true),
  role: grow(MC_BASE, [].concat(
    X(["the melody is"], MC2_ROLE_A, ["and the drums are"], MC2_ROLE_B),
    X(["the melody is"], MC2_ROLE_A, ["while the bass holds"], MC2_ROLE_B.slice(0, 8))),
    140, true),
  motion: grow(MC_BASE, X(MC2_MOTION_A, MC2_MOTION_B), 100, true),
  hook: grow(MC_BASE, X(MC2_HOOK_A, MC2_HOOK_B), 100, true)
};

const EXTRA_CONCEPT_W2 = {
  world: grow(BASE, world, 260, false),
  location: grow(BASE, location, 230, false),
  visual: grow(BASE, visual, 230, false),
  narrative: grow(BASE, narrative, 230, false),
  sensation: grow(BASE, sensation, 210, false),
  event: grow(BASE, event, 230, false),
  conflict: grow(BASE, conflict, 210, false),
  crowd: grow(BASE, crowd, 210, false),
  title: grow(BASE, title, 240, false),
  transform: grow(BASE, transform, 220, false)
};

const fmt = a => JSON.stringify(a).replace(/","/g, '",\n    "');
let src = `/* data/concept-extra2.js — GENERATED by tools/expand-concepts2.js. DO NOT EDIT BY HAND.
   Concepts wave two: deterministic expansion built from fresh vocabulary.
   Deterministic, banned-word free, vocal-safe, world-safe, deduped against
   the verbatim pools AND wave one. Additions only. */\n\n`;
src += "export const EXTRA_CONCEPT_W2 = {\n";
for (const k in EXTRA_CONCEPT_W2) src += `  ${k}: ${fmt(EXTRA_CONCEPT_W2[k])},\n`;
src += "};\n\nexport const EXTRA_MELODY_CONCEPT_W2 = {\n";
for (const k in EXTRA_MELODY_CONCEPT_W2) src += `  ${k}: ${fmt(EXTRA_MELODY_CONCEPT_W2[k])},\n`;
src += "};\n";
writeFileSync(new URL("../data/concept-extra2.js", import.meta.url), src);
const cTotal = Object.values(EXTRA_CONCEPT_W2).reduce((n, a) => n + a.length, 0);
const mTotal = Object.values(EXTRA_MELODY_CONCEPT_W2).reduce((n, a) => n + a.length, 0);
console.log("concepts wave two written: +" + cTotal + " concept entries (" +
  Object.entries(EXTRA_CONCEPT_W2).map(([k, a]) => k + ":" + a.length).join(" ") +
  "), +" + mTotal + " melody-concept lines (" +
  Object.entries(EXTRA_MELODY_CONCEPT_W2).map(([k, a]) => k + ":" + a.length).join(" ") + ")");
