/* tools/expand-sparks.js — GENERATES data/sparks-extra.js
   The "sparks wave": deterministic expansion of the Idea Engine pools
   (data/sparks.js). Before v4.5 the Spark pools were extracted from the
   legacy app but never wired up — this wave lands with the Idea Engine
   card, so every pool it generates for is a live roll surface.

   Same contract as every other generator: deterministic (seeded), banned
   minimal words refused, vocal references refused (sparks reach the
   prompt), deduped against the verbatim pools AND itself. Additions only.

   Run: node tools/expand-sparks.js */
import { writeFileSync } from "node:fs";
import * as S from "../data/sparks.js";
import { VOCAL_WORDS } from "../data/safety.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
const DIRTY_MINIMAL = ["minimal", "minimalist", "minimalism", "sparse", "restrained",
  "low-energy", "low energy", "weak", "tiny", "gentle", "quiet"];
const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "i");
function cleanText(t) {
  if (!t || t.length > 130) return false;
  const low = t.toLowerCase();
  for (const b of DIRTY_MINIMAL) if (low.includes(b)) return false;
  if (VOCAL_RE.test(low)) return false;
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
const rnd = mulberry32(20260917);
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
function grow(name, phrases, cap) {
  const base = new Set((S[name] || []).map(x => String(x).toLowerCase().trim()));
  const seen = new Set();
  const out = [];
  for (const p of shuffle(phrases)) {
    const t = String(p).replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!cleanText(t) || base.has(k) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/* ------------------------------------------------ shared surreal vocab ------------------------------------------------ */
const ROOMS = ["lobby", "corridor", "stairwell", "loading bay", "control room", "boiler room",
  "archive", "green room", "server aisle", "turbine hall", "clock tower", "flooded basement",
  "observation deck", "baggage hall", "ticket hall", "signal room", "roof", "courtyard",
  "freight lift", "customs gate"];
const OBJECTS = ["the thermostat", "the fire door", "the vending machine", "the departure board",
  "the intercom", "the fuse box", "the turnstile", "the emergency light", "the payphone",
  "the escalator", "the antenna", "the sprinkler", "the radiator", "the compass",
  "the tide clock", "the barometer", "the switchboard", "the foghorn", "the crane", "the buoy"];
const ACTIONS = ["starts keeping time", "learns the groove", "begins to glow on the downbeat",
  "answers every fill", "refuses to be ignored", "moves one inch per bar", "starts conducting",
  "memorizes the arrangement", "hums at the root note", "begins broadcasting", "wakes up early",
  "takes over the mix", "files a complaint with the kick", "requests one more repeat",
  "starts counting in fours", "steals the reverb", "books the whole night", "files itself under legend"];
const LIGHTISH = ["sodium glare", "beacon sweep", "arc flash", "neon cross", "strobe wall",
  "phosphor glow", "magnesium flare", "cathode bloom", "lighthouse beam", "afterimage"];
const SOUNDISH = ["a struck pipe", "a bowed cable", "a slammed fire door", "a ringing girder",
  "a ticking relay", "a humming transformer", "a dropped wrench", "a clanging gate",
  "a hissing valve", "a creaking crane", "a tolling bell buoy", "a rattling shutter"];
const FUTURISH = ["the city learns to float", "the tide signs a treaty with the wall",
  "every clock agrees to disagree", "the map redraws itself nightly",
  "the harbor starts accepting signals from nowhere", "the lighthouse applies for a promotion",
  "the fog opens a night school", "the antenna files its first poem",
  "the last ferry becomes the first", "the storm applies for residency"];

/* ------------------------------------------------ pool vocab ------------------------------------------------ */
const POOLS = {
  SPARK_IDEAS: X(["write a track where"], OBJECTS.slice(0, 12), ACTIONS),
  SPARK_MASHUPS: X(["dark folk", "broken beat", "shoe gaze", "ambient dub", "cold wave",
    "kosmische", "library funk", "industrial gospel", "tape blues", "arctic disco",
    "doom jazz", "night garage", "salt techno", "cathedral bass", "rust opera"],
    ["+"], ["warehouse techno", "gamelan", "steel roof percussion", "distant brass",
      "tape loops", "choir of pendulums", "dockyard drums", "icebreakers in unison",
      "ferry-horn drones", "salt-spray arps", "rail-yard breaks", "neon bagpipes"]),
  SPARK_CONSTRAINTS: [].concat(
    X(["no hats until"], ["the third section", "the first turn", "the roof opens", "the fog lifts"]),
    X(["the whole track must fit inside"], ["one long breath", "a single corridor", "one elevator ride", "the space between two buoys"]),
    X(["every section must end on"], ["the same held note", "one struck object", "a door closing", "the turnstile clicking"])),
  SPARK_TIPS: [].concat(
    X(["let the"], ["sub", "kick", "hats", "ride", "bass", "stab"], ["arrive one bar", "leave one bar", "sit out one section"], ["late", "early", "on purpose"]),
    X(["print the", "bounce the", "resample the"], ["build", "breakdown", "turnaround"], ["and use it as"], ["the intro", "percussion", "the outro's shadow"])),
  SPARK_VIBES: X(["the", "every", "tonight the"], ["night shift", "last ferry", "tide clock",
    "departure board", "foghorn", "rooftop", "all-night garage", "signal tower", "harbor pilot",
    "storm wall", "control room", "night market"],
    ["runs on", "answers to", "keeps time with", "is lit by", "refuses to run without"],
    ["thunder and neon", "one held chord", "the kick alone", "borrowed voltage",
      "the rhythm of the rain", "pure momentum", "a frequency nobody owns", "tide tables and nerve"]),
  SPARK_PLACES: X(["a", "somewhere under", "the party is in"], ["flooded quarry",
    "decommissioned beacon", "glass bridge", "night market", "storm cellar", "rail yard",
    "salt mine", "echo chamber", "rooftop garden", "submarine dock", "antenna array",
    "power canyon", "clock tower", "ferry terminal", "dry dock", "sea gate"],
    ["", "where the bass has its own weather", "where every wall is a speaker",
      "where the tide keeps the door", "where the lights answer in rhythm",
      "where the fog is on the guest list", "where the clocks run backwards"]),
  SPARK_THINGS: X(["an object that", "a device that", "a relic that"],
    ["steals rhythm", "stores echoes", "broadcasts weather", "counts crowds", "trades in momentum",
      "only works during storms", "rings when the drop lands", "keeps one secret chord",
      "maps the room by sound", "winds itself on applause"]),
  SPARK_TRANSFORMS: X(["the"], OBJECTS.concat(ROOMS.slice(0, 10)),
    ["becomes a metronome", "starts dancing", "learns to swim", "begins broadcasting",
      "turns into a dancefloor", "files itself under myth", "starts keeping the beat",
      "grows a reverb tail", "asks for one more bar", "becomes the guest list",
      "runs uphill", "opens its own club", "applies for the night shift", "starts conducting the fog"]),
  SPARK_CHALLENGES: [].concat(
    X(["make the"], ["drop", "build", "outro", "breakdown", "intro"],
      ["feel like", "sound like", "land like"],
      ["a corridor", "a wave arriving", "a door finally opening", "an anchor letting go",
        "a train deciding to stay", "the tide changing its mind", "a city exhaling"]),
    X(["write a section where", "write a bar where"],
      ["nothing moves except the hats", "the bass carries everything", "the room is one instrument",
        "the silence does the counting", "every sound leans left"])),
  SPARK_MEGA_LINES: [].concat(
    X(["Mega chaos roll complete."], ["The prompt probably grew teeth.", "Check what survived.",
      "The genre filed a report.", "Somewhere a tempo blinked.", "The mix map was redrawn.",
      "Nothing is where you left it.", "The energy arc bent.", "Locks were respected, chaos wasn't.",
      "The prompt has opinions now.", "Undo is a time machine, use it."]),
    X(["Everything changed at once —"], ["audition before you judge.", "copy the good parts fast.",
      "the seed remembers what you did.", "the score will tell the truth.",
      "history has your previous self.", "the arrangement survived, mostly.",
      "the kick would like a word.", "the vibe is legally yours now."]),
    X(["Chaos delivered:"], ["one part accident, nine parts luck.", "the grid has been renegotiated.",
      "every card got a new story.", "the prompt grew one size.", "the dice are still warm.",
      "the mix learned three new tricks.", "the old prompt is in the archive, safe.",
      "the drop arrived unannounced."])),
  SPARK_WEATHER: X(["a", "tonight's weather:"], ["storm front", "pressure ridge", "fog bank",
    "heat shimmer", "static front", "dust wall", "hail line", "wind shear", "aurora band",
    "monsoon edge"], ["arriving on the downbeat", "with hats", "that respects the arrangement",
      "moving in 4/4", "that follows the bassline", "clearing exactly at the drop",
      "with a reverb tail", "on the guest list"]),
  SPARK_LIGHT: X(["the lights:"], LIGHTISH, ["keeping time", "spelling the hook",
    "arguing with the strobe", "following the bass", "learning the arrangement",
    "arriving one bar late", "refusing the outro", "on the night shift"]),
  SPARK_SOUNDS: X(["use"], SOUNDISH, ["as the only percussion for four bars",
    "tuned to the root", "drenched in plate reverb", "behind the whole mix",
    "as the turn signal", "as the final hit", "through a long delay",
    "as the intro's heartbeat"]),
  SPARK_FUTURES: FUTURISH.slice(),
  SPARK_ANTHEM_NAMES: X(["The", "A", "Midnight", "Terminal", "Northern", "Harbor",
    "Voltage", "Glacier", "Meridian", "Afterglow"], ["Green Light", "High Tide",
      "Longest Night", "Signal Fire", "Second Wind", "Open Channel", "Standing Wave",
      "Beacon Choir of One", "Held Note", "Departure", "Homecoming", "Sea Room",
      "Full Steam", "Night Passage", "Landfall"]),
  SPARK_OPENERS: X(["open with"], ["a distant radio clearing the room", "one struck object",
    "the bass walking in alone", "a held note and a decision", "the sound of doors opening",
    "a countdown that changes its mind", "the tide arriving early", "a single hat on a mission",
    "the room tone standing up", "a foghorn, politely"]),
  SPARK_SECTION_SPARKS: X(["the"], ["build", "drop", "breakdown", "turnaround", "intro",
    "outro", "second peak", "bridge"],
    ["enters through a glass door", "ends on one held note", "uses the bass as a clock",
      "borrows the hats and keeps them", "arrives with its own weather", "refuses the obvious exit",
      "keeps one secret from the mix", "runs one bar longer than promised",
      "leaves the lights on for the next section", "signs the guest list itself"]),
  SPARK_STYLE_STUNTS: [].concat(
    X(["write this as if"], ["the room is one instrument", "the mix owes you money",
      "the track is a building", "every sound has a day job", "the tempo is a rumor",
      "the drop is a door", "the bass is the narrator", "the reverb is homesick"]),
    X(["describe the track using only"], ["weather words", "architecture", "sea terms",
      "machinery with feelings", "travel documents", "light and nothing else"])),
  SPARK_GENRE_SCRAMBLES: X(["dark folk", "jazz hop", "shoe gaze", "ambient dub", "cold wave",
    "kosmische", "tape blues", "arctic disco", "doom jazz", "night garage", "salt techno",
    "cathedral bass", "rust opera", "library funk", "industrial gospel", "broken beat"],
    ["+"], ["warehouse techno", "gamelan", "steel roof percussion", "distant brass band",
      "tape loops", "dockyard drums", "icebreaker drones", "ferry-horn sections",
      "rail-yard breaks", "neon bagpipes", "choir of pendulums", "salt-spray arps",
      "lighthouse ambience", "crane-yard breakbeat"],
    ["+"], ["a storm", "a tide table", "one held chord", "an all-night garage", "a fog bank",
      "the night shift", "a single green light", "a departure board", "the last ferry",
      "an antenna with opinions"]),
  SPARK_BASSLINES: X(["a bassline", "a sub line", "a groove"],
    ["walking under a green light", "tracing the roof line", "riding a single note",
      "that signs every section", "with a day job at the harbor", "that never blinks",
      "counting the crowd in fours", "wearing the kick's coat", "that files the low end under myth",
      "arriving before the lights", "holding the whole roof up", "that knows a shortcut",
      "reading the room in root notes", "with one foot in the tide", "that keeps the door open"]),
  SPARK_DRUM_LINES: X(["a kick pattern", "a hat line", "a groove", "a drum figure"],
    ["that assigns the backbeat", "with a rim on the four", "that moves through the middle",
      "that treats silence as a band member", "with the toms on night duty",
      "that counts in prime numbers", "with one ghost note doing overtime",
      "that opens every section like a door", "keeping the fog in line",
      "with the ride on the guest list", "that never repeats but always returns",
      "walking the beat between sections", "with the snare working security",
      "that lets the sub do the talking"]),
  SPARK_MELODY_PHRASES: X(["a melodic arc", "a lead", "a phrase", "a motif"],
    ["over a green horizon", "that keeps one foot on the roof", "between two held notes",
      "that memorizes the skyline", "with a compass sewn in", "that answers the tide",
      "arriving one breath early", "that treats every repeat as a sequel",
      "leaning into the storm", "that signs its name in intervals", "with the root as home base",
      "that never lands quite where promised", "climbing by fourths and conviction",
      "that keeps the lights on for the outro"]),
  SPARK_CONCEPT_TWISTS: [].concat(
    X(["a track that"], ["begins in the lobby", "is really a building", "runs on borrowed weather",
      "keeps its drop in a vault", "sends the outro postcards", "treats the arrangement as a map",
      "only moves when watched", "files the bass under folklore"]),
    X(["a party held"], ["at the end of a queue", "inside a held note", "on the roof of the mix",
      "during the storm's day off", "between two buoys", "where the fog clocks in",
      "after the tide resigns", "in the reverb of a door"])),
  SPARK_ARRANGEMENT_PACKS: X(["Lobby", "Cold Open", "Ground Floor", "Loading Bay",
    "Fog Line", "Ticket Hall", "Harbor", "Tide Gate", "Signal Room", "Rooftop"],
    [" - "], ["Corridor", "Rising", "Hold", "Turn", "Ascent", "First Light", "Pressure",
      "Switchback", "Undertow", "Gallery"],
    [" - "], ["Staircase", "Higher", "Bridge", "Summit", "Overlook", "Second Wind",
      "Beacon", "Drop Zone", "Open Water", "Apex"],
    [" - "], ["Landing", "Release", "Roof", "Dawn", "Afterglow", "Sea Room", "Homecoming",
      "Last Light", "Harbor Return", "Full Circle"]),
  SPARK_MIX_PUNCH: X(["the"], ["sub", "kick", "hats", "snare", "bass", "stab", "lead", "ride"],
    ["gets its own room", "leans on the ceiling", "passes through a glass wall",
      "books the corner suite", "takes the stairs, not the lift", "signs a lease in the low end",
      "keeps a light on in the mix", "files for more headroom", "stands exactly where it should",
      "rents the whole left side"]),
  SPARK_MASTER_HEART: [].concat(
    X(["a master that"], ["breathes at the end", "holds one floor all night",
      "runs warm but never hot", "keeps the ceiling on a leash", "counts the peaks and lets two go",
      "treats loudness as weather", "saves one dB for the drop", "wears the glue like a coat",
      "bows to the sub", "keeps a porch light on for the hats", "never argues with the kick",
      "signs every section with the same ink"]),
    X(["a loudness map with"], ["one held floor", "two honest peaks", "a corridor of headroom",
      "the tide written in", "a rooftop reserve", "one secret valley", "the night shift pencilled in",
      "a doorway for the drop", "the low end on retainer", "headroom kept for the finale"]),
    X(["a glue that"], ["smells like tape", "sets in the low mids", "never fully dries",
      "tastes like the bus comp", "holds the stereo together", "lets the transients through",
      "locks the groove without a padlock", "runs on transformer warmth"])),
  SPARK_SUNO_CUES: [], /* rebuilt below with bracket-joined cues */
  SPARK_DJ_NOTES: [].concat(
    X(["open with"], ["the low end", "one held tone", "the room tone", "a single hat",
      "the bass arriving alone"], ["and let the crowd find it", "and hold it two bars longer",
      "and let the lights catch up", "and let the fog settle", "and let the mix lean in"]),
    X(["let the"], ["drop", "turnaround", "breakdown", "outro", "second peak"],
      ["carry the conversation", "borrow the previous track's tail", "land one beat early",
        "run the length of the room", "keep one secret"]),
    X(["ride the"], ["master", "filter", "tide", "build", "reverb"],
      ["until the room tips", "until the lights agree", "until the next idea arrives",
        "until the fog clocks out", "until the ceiling forgives you"])),
  SPARK_MORE_MAGIC_2: [].concat(
    X(["Print"], ["the first half", "the turn", "the breakdown", "the intro"],
      ["and let it breathe", "and frame it", "and send it ahead", "and let it age one night"]),
    X(["Turn"], ["the rule", "the grid", "the tempo", "the map", "the filter"],
      ["off and keep the trick", "sideways and keep walking", "down and listen again",
        "inside out and keep the shape", "over and let it land"]),
    X(["Ask"], ["the track", "the drop", "the bass", "the room", "the outro"],
      ["for a second opinion", "what it wants to be", "for one more bar",
        "where it keeps its secrets", "for the long way home"]))
};
/* SUNO cues are bracket-joined, not space-joined */
const SUNO_FIRST = ["[Intro:", "[Build:", "[Drop:", "[Breakdown:", "[Climax:", "[Turn:", "[Outro:", "[Peak:"];
const SUNO_SECOND = ["bare pulse]", "rising filter]", "full force]", "one held note]",
  "glass door opens]", "tide arrives]", "beacon lights]", "fog lifts]", "kick takes over]",
  "reverb settles]", "lights come up]", "door closes]"];
POOLS.SPARK_SUNO_CUES = SUNO_FIRST.flatMap(a => SUNO_SECOND.map(b => a + " " + b));

const SPARK_EXTRA = {};
let total = 0;
for (const name in POOLS) {
  const cap = { SPARK_TRANSFORMS: 25, SPARK_MEGA_LINES: 25, SPARK_ANTHEM_NAMES: 17,
    SPARK_ARRANGEMENT_PACKS: 33, SPARK_MIX_PUNCH: 25, SPARK_MASTER_HEART: 26,
    SPARK_SUNO_CUES: 25, SPARK_DJ_NOTES: 29, SPARK_MORE_MAGIC_2: 26,
    SPARK_GENRE_SCRAMBLES: 24, SPARK_BASSLINES: 25, SPARK_DRUM_LINES: 22,
    SPARK_MELODY_PHRASES: 22, SPARK_CONCEPT_TWISTS: 21, SPARK_SECTION_SPARKS: 18,
    SPARK_VIBES: 18, SPARK_PLACES: 15, SPARK_WEATHER: 15, SPARK_LIGHT: 15,
    SPARK_SOUNDS: 15, SPARK_FUTURES: 15, SPARK_CHALLENGES: 14, SPARK_TIPS: 13,
    SPARK_STYLE_STUNTS: 12, SPARK_OPENERS: 12, SPARK_MASHUPS: 16,
    SPARK_IDEAS: 15, SPARK_CONSTRAINTS: 10 }[name] || 20;
  const added = grow(name, POOLS[name], cap);
  if (added.length) { SPARK_EXTRA[name] = added; total += added.length; }
}

const fmt = a => JSON.stringify(a).replace(/","/g, '",\n    "');
let src = `/* data/sparks-extra.js — GENERATED by tools/expand-sparks.js. DO NOT EDIT BY HAND.
   Sparks wave: +${total} entries across ${Object.keys(SPARK_EXTRA).length} Idea Engine pools.
   Deterministic, banned-word free, vocal-safe, deduped against the verbatim
   spark pools. Additions only. */\n\n`;
src += "export const SPARK_EXTRA = {\n";
for (const name in SPARK_EXTRA) src += `  ${name}: ${fmt(SPARK_EXTRA[name])},\n`;
src += "};\n";
writeFileSync(new URL("../data/sparks-extra.js", import.meta.url), src);
console.log("sparks wave written: +" + total + " entries across " +
  Object.keys(SPARK_EXTRA).length + " pools (" +
  Object.entries(SPARK_EXTRA).map(([k, a]) => k.replace("SPARK_", "") + ":" + a.length).join(" ") + ")");
