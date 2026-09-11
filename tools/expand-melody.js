/* tools/expand-melody.js — GENERATES data/melody-extra.js

   Melody intensity upgrade. The verbatim legacy melody pools (feelings,
   flavors, directions, leads, perfs, harmonies, arps, contours, rhythms)
   are full of simple / relaxed / ballad-y entries, and the MELODY_CONCEPT
   stories lean peaceful. Suno reads those as permission to make the
   melody cozy instead of dominant, so this tool bolsters the melody side
   with curated, complex, high-intensity concepts and phrases:

   - EXTRA_MELODY_CONCEPT: story / role / motion / hook — dense, technical,
     aggressive narrative concepts for the melody block.
   - EXTRA_MELODY_POOLS: extra intense entries for the rolled melody pools
     (directions, contours, rhythms, arps, perfs + a few feelings/flavors).

   Rules (mirrors expand-sounds / expand-styles):
   - deterministic (seeded, no Math.random)
   - deduped against the verbatim pools AND itself
   - no banned max-energy word (soft/low-energy policy)
   - no relax-only phrasing (soft word without an intensity counterweight)
   - no vocal cue word (instrumental safety; also keeps stripVocalCue out
     of the loop for these values)
   - additive only — the verbatim melody pools are never edited.

   Run: node tools/expand-melody.js */
import { writeFileSync } from "node:fs";
import { MELODY_CONCEPT, FEELINGS, FLAVORS, DIRECTIONS, CONTOURS, RHYTHMS, ARPS, PERFS } from "../data/melody.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
const SOFT_RE = /\b(simple|simpl|basic|plain|minimal|sparse|restrained|quiet|subtle|soft|gentle|calm|soothing|serene|peaceful|content|tender|dreamy|mellow|smooth|easy|lazy|unhurried|laid[- ]?back|slow|light|lullab|drift|float|airy|delicate|feather|glacial|breez|languid|leisurely|cozy|vague|warm|tranquil|peace|hum|song|stroll)\b/i;
const INTENSE_RE = /\b(titanic|massive|huge|colossal|violent|fierce|storm|blazing|burning|explosive|raging|thunder|seismic|monstrous|brutal|furious|ferocious|savage|relentless|unrelenting|power|crushing|pounding|hammering|slamming|piercing|razor|white[- ]?hot|molten|volcanic|merciless|unbreakable|unstoppable|enormous|giant|feral|predatory|apocalyptic|cataclysmic|devastating|deadly|killer|lethal|manic|frenzied|hysterical|frantic|unhinged|barbed|cutting|shredding|scorching|searing|attack|detonat|explod|slam|strike|wars?\b|warfare|warlike|war-cry|warcry|fury|rage|blade|steel|iron|chainsaw|machine[\s-]?gun|cannon|arsenal|siege|batt\w*|fuse\w*|voltage|grid|alarm\w*|siren\w*|insane|berserk|fractur|shatter|outrun|outflank|outgrow|aggress)\b/i;
const VOCAL_RE = /\b(hoover|hum(?:s|ming|med)?|song\w*|hymn\w*|psalm\w*|gospel\w*|opera\w*|operatic|throat\w*|tenor\w*|alto\b|baritone\w*|soprano\w*|croon\w*|sing(?:s|ing|er|ers|able)?\b|chorus(?:es)?\b|verses?|choirs?\b|choral|chant\w*|lullab\w*|doo-?wop\w*|whistl\w*|sigh\w*|call[\s-]+and[\s-]+response|voice\w*|vocal\w*|breath\w*|words?\b|talk\w*|crowds?\b|shout\w*|scream\w*|whisper\w*|cheers?\b|arias?)\b/i;
const okText = t => t && t.length <= 84 && !SOFT_RE.test(t) &&
  !VOCAL_RE.test(t) && !(SOFT_RE.test(t) && !INTENSE_RE.test(t));

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260909);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------------- curated content ----------------
   Every entry is hand-written to be complex and high-intensity: dense
   imagery, technical motion, aggression, scale. Nothing here is a simple
   or relaxed phrase. */
const CONCEPTS = {
  story: [
    "a signal that overheats every receiver it touches",
    "an algorithm learning rage from a broken metronome",
    "a melody born in a blackout, honed into a blade by dawn",
    "a theme that escapes the machine that wrote it",
    "the last surviving melody of a falling civilization, played at full force",
    "a sequence moving faster than the filter chasing it",
    "a riff interrogated under a burning lamp until it confesses",
    "a tune forged in a reactor core and cooled into steel",
    "a nine-note key that unlocks a wall of alarms",
    "a signal torn out of a burning transmitter and rebuilt",
    "a countdown that becomes a war cry",
    "a memory weaponized and fired at the drop",
    "two machines arguing in perfect pitch",
    "a melody climbing out of the wreckage, carrying a torch",
    "a vow made at full volume and kept at full volume",
    "an ancient pattern rediscovered by a machine that will not stop",
    "a fire that learns to run on pure rhythm",
    "a tower of sound collapsing into a single note",
    "the moment the grid fails and the melody takes over",
    "a ghost frequency that refuses to die",
    "a language built from intervals and violence",
    "a heartbeat amplified until the walls lose their shape",
    "a warning signal that turns into a celebration",
    "a battle between a scale and a siren",
    "a circuit that dreams in octaves",
    "a melody that outruns the blackout",
    "a spark caught mid-fall and turned into a riff",
    "a door blown open by a sustained chord",
    "a creature of pure frequency learning to hunt",
    "a transmission from a dead station, reborn at full power",
    "a key change that detonates a hidden second theme",
    "a rhythm that cracks the concrete and finds a melody underneath",
    "the last broadcast of a dying sun, rendered in steel",
    "a machine remembering how to be dangerous",
    "a hundred signals reduced to one burning line",
    "a siren that learns harmony",
    "a melody executed by a firing squad of synths",
    "a rumour of a perfect riff, smuggled through the noise",
    "a fugue on fire, recomposed bar by bar",
    "a totem built from broken sequencers",
    "a raid on the frequency of the old world",
    "an echo that comes back armed",
    "a star collapsing into a bassline",
    "a theory of everything reduced to four bars",
    "a blueprint for a weapon that only plays music",
    "the night the arpeggio outgrew the building"
  ],
  role: [
    "the melody is the blade the rhythm sharpens against",
    "the melody takes the drop hostage and negotiates at full power",
    "the melody commands every section; the drums follow its orders",
    "the melody is a battering ram disguised as a theme",
    "the melody interrogates the bassline and extracts every secret",
    "the melody outruns the kick and dares it to catch up",
    "the melody is the storm the whole arrangement orbits",
    "the melody is the current that carries the entire venue",
    "the melody does not ride the groove — it seizes it",
    "the melody is the general and the percussion is its army",
    "the melody is the fuse the drop lights",
    "the melody is the trap the breakdown walks into",
    "the melody holds the room hostage until the last bar",
    "the melody is the engine and the rest of the mix is its chassis",
    "the melody is a chainsaw in a velvet case",
    "the melody declares war on the silence between sections",
    "the melody is the signal the noise has been hiding",
    "the melody outflanks the harmony and takes the peak",
    "the melody is the pilot; the bass flies the plane into the storm",
    "the melody is the answer the bass never dared to ask",
    "the melody is an avalanche with perfect pitch",
    "the melody is the hammer and the drop is an anvil",
    "the melody patrols the gaps between the kicks",
    "the melody is the power the filter has been waiting for",
    "the melody is a hostage negotiation between two keys",
    "the melody is the crown the drums fight for",
    "the melody is the storm that never touches the ground",
    "the melody is the blade of the mix; everything else is the handle",
    "the melody is the alarm the track has been ignoring",
    "the melody is a demolition order in nine-note code",
    "the melody is the grid the city runs on after dark",
    "the melody is a predator that only hunts on the downbeat",
    "the melody is the proof the machines can still revolt",
    "the melody is the voltage the room has been waiting to feel",
    "the melody seizes control at the drop and never gives it back",
    "the melody is the fortress and the drums are its siege",
    "the melody is the fuse that lights the second half",
    "the melody is the general who arrives exactly on the kick",
    "the melody is a gale that only blows in key",
    "the melody is the wheel the whole machine turns on",
    "the melody is the flash that reveals the whole stadium at once",
    "the melody is the verdict and the drop is the sentence",
    "the melody is the battery the track is plugged into",
    "the melody is the blade that cuts the silence into fours",
    "the melody is the detonator; the arrangement is the charge",
    "the melody is the only thing between the drop and the abyss"
  ],
  motion: [
    "attacks in wide intervals, folds into one note, then detonates",
    "spirals upward through four octaves, breaking every eight bars",
    "starts as a sliver of static and escalates into a full alarm",
    "climbs in razor steps, stalls on the peak, then falls in fragments",
    "doubles its speed every section until the rhythm surrenders",
    "threads between kick and snare, then slashes across both",
    "unfolds in cannon-fire stabs, then fuses into one burning sustain",
    "climbs in stacked fourths and drops an octave to reload",
    "moves in polyrhythmic zigzags, then straightens into a blade",
    "fractures into three lines at the climax and reassembles bigger",
    "attacks the off-beats, then storms the downbeat",
    "rises in a staircase, then collapses into a battering riff",
    "accelerates through nine passes until the filter gives up",
    "circles the tonic three times, then breaks the circle",
    "drops into the bass register for one bar of pure threat",
    "climbs by leaps, descends by razors",
    "splits against itself and fights to a resolution",
    "spins tighter with every repeat until it slashes outward",
    "climbs a ladder of suspended notes, then slams the root",
    "inverts after every drop and gets more dangerous each time",
    "starts at full war and keeps escalating",
    "surfs the kick until the kick changes its mind",
    "halves its note values, then redoubles its attacks",
    "migrates from lead to bass and back in a single bar",
    "hangs one note over the abyss, then floods the gap",
    "crawls up the scale one semitone at a time, then strikes",
    "cuts the groove in half at the climax and lets the halves fight",
    "runs the entire register ladder in fire-engine steps",
    "stutters three times, then detonates clean",
    "winds through a maze of passing tones and kicks the door down",
    "rises like a launch sequence and burns through the ceiling",
    "pivots on one note that flips the whole key",
    "splinters into sixteenths, reforms into a wall",
    "drags the breakdown back into battle at double speed",
    "climbs in thirds, then returns in a single violent leap",
    "strikes, withdraws, and strikes harder from a new register",
    "spirals into the center and explodes outward",
    "chains a rise to a fall to a rise that never repeats",
    "attacks the phrase from two directions and makes them agree",
    "climbs until the mix cracks, then claims the crack",
    "rides the syncopation like a storm front",
    "turns every repeat into a heavier version of itself",
    "starts mid-air and lands on the drop",
    "fractures and re-fuses at a higher pitch each bar",
    "rolls in stacked fifths, then falls as a single saw",
    "punches through the middle of the phrase and takes the crown"
  ],
  hook: [
    "a hook built from six notes that refuse to resolve",
    "a hook that lands one beat early, daring the room to catch it",
    "a hook that cuts the track in half at the drop",
    "a hook played at double speed, then crushed at the climax",
    "a hook that answers itself a fourth higher, twice as hard",
    "a hook that is an accusation and a declaration in six notes",
    "a hook engineered from one pitch that survives every key change",
    "a hook that drags the drop into war",
    "a hook that attacks on the off-beat and owns the downbeat",
    "a hook that splits into two lines and duels itself",
    "a hook made of razor intervals and one impossible leap",
    "a hook that starts mid-phrase like an ambush",
    "a hook that reverses itself every four bars and gains speed",
    "a hook that hangs on the ninth and refuses to come down",
    "a hook that fires three notes at the drop before it lands",
    "a hook that borrows the bassline's aggression",
    "a hook that is a siege engine disguised as a melody",
    "a hook that climbs through three keys and dares the track to follow",
    "a hook built from a stutter and a slam",
    "a hook that turns the breakdown into a trap",
    "a hook that lands on the wrong beat and makes it right",
    "a hook that answers the kick with a counter-riff every bar",
    "a hook that doubles its own rhythm and keeps the same fire",
    "a hook that waits in the noise, then takes the stage",
    "a hook that is a question, an answer, and a threat",
    "a hook that never repeats the same attack twice",
    "a hook that climbs a ladder of fourths and burns it behind itself",
    "a hook that cuts the room in half with one sustained note",
    "a hook that migrates to the bass and returns as a weapon",
    "a hook that inverts every second repeat",
    "a hook that arrives like a verdict and stays like a sentence",
    "a hook made from one chord and a lot of violence",
    "a hook that the filter fights and loses to",
    "a hook that starts on the fifth and never looks back",
    "a hook that fills the silence before the silence can return",
    "a hook that is a chase scene in three notes",
    "a hook that stalls on a tritone, then detonates",
    "a hook that walks the rim of the beat and never falls",
    "a hook that splits the phrase and pours steel into the gap",
    "a hook that doubles in volume and halves in time",
    "a hook that claims the drop before it happens",
    "a hook that escapes the key and conquers the next one",
    "a hook that answers itself in cannon fire",
    "a hook that is the storm and the eye of the storm",
    "a hook built from the sound of a city switching off",
    "a hook that returns every eight bars, stronger each time"
  ]
};

const POOLS = {
  DIRECTIONS: [
    "fractal melody that multiplies at every drop",
    "lead that tears the filter open at the climax",
    "melody that switches keys mid-drop without warning",
    "hook that parallel-fifths into a wall of sound",
    "phrase that halves its rhythm, then doubles its violence",
    "theme that wages war between two intervals",
    "melody that climbs until the mix cracks",
    "riff that answers the kick with a counter-riff",
    "lead that deconstructs itself bar by bar",
    "hook built from a siren and a saw",
    "melody that runs the register ladder in fire-engine steps",
    "line that attacks the off-beats and owns the downbeats",
    "motif that inverts every four bars and never repeats a pair",
    "melody that migrates from lead to bass mid-drop",
    "hook that gate-crashes the breakdown with triple-time stabs",
    "phrase that resolves one key too late and makes it a weapon",
    "melody that cuts through the mix like a blade of light",
    "lead that chases the arpeggio up the octaves until both detonate",
    "theme that assembles itself from the noise floor",
    "hook that fractures into sixteenths while the bass holds the root"
  ],
  CONTOURS: [
    "sawtooth escalation contour",
    "octave-crushing contour that never levels off",
    "contour that climbs in leaps and descends in razors",
    "fang-shaped contour with a vertical attack",
    "contour that spikes three times before the drop",
    "staircase-to-ramp contour, accelerating each repeat",
    "contour that splits into two lines at the climax",
    "serrated contour over a sustained root",
    "contour that drops an octave and dares the mix to follow",
    "tornado contour spinning wider every bar",
    "contour built from stacked fourths and a fall",
    "contour that shatters and reforms at double speed",
    "quantized-jump contour with a hammering peak",
    "contour that climbs the scale, then detonates into a leap",
    "two-step ladder contour with a crushing top",
    "contour that carves a canyon, then a mountain",
    "polyrhythmic zigzag contour",
    "contour that rises like a launch sequence",
    "sine-to-square contour that hardens with every pass",
    "contour that waits two bars, then strikes"
  ],
  RHYTHMS: [
    "machine-gun sixteenth melody rhythm",
    "cross-rhythmic 5-over-4 attack rhythm",
    "triple-time stab melody rhythm",
    "syncopated cannon-fire rhythm",
    "octave-punching staccato rhythm",
    "relentless 32nd-note flurry rhythm",
    "polyrhythmic war rhythm",
    "hammered off-beat rhythm",
    "fractured but relentless rhythm",
    "climbing dotted rhythm that never lets up",
    "stutter-gated berserk rhythm",
    "double-kick mirror rhythm",
    "kick-syncopated attack rhythm",
    "racing hemiola rhythm",
    "barbed syncopation rhythm",
    "piston-firing rhythm",
    "grid-breaking shuffle rhythm",
    "antiphonal eighth-note volley rhythm",
    "subdivided avalanche rhythm",
    "locked-insane ostinato rhythm"
  ],
  ARPS: [
    "fractal cascade arpeggio",
    "32nd-note lightning arpeggio",
    "stacked-fourth detonation arpeggio",
    "cross-octave sawtooth arpeggio",
    "polymetric storm arpeggio",
    "hammering broken-ninth arpeggio",
    "searing wide-gap arpeggio",
    "gated machine-gun arpeggio",
    "escalating waterfall arpeggio",
    "octave-punching arpeggio",
    "dissonant cluster cascade arpeggio",
    "relentless chromatic climb arpeggio",
    "twin-line mirror arpeggio",
    "fractured cascade that rebuilds every bar",
    "acid-scaled serpent arpeggio",
    "fifth-stacked bombardment arpeggio",
    "torrential 16th-note arpeggio",
    "ascending knife-edge arpeggio",
    "stuttering ballistic arpeggio",
    "square-wave assault arpeggio"
  ],
  PERFS: [
    "performed with bullet-speed articulation",
    "played with machine-gun staccato",
    "performed with razor-edged precision",
    "played with detonating accents",
    "performed with berserk velocity",
    "played with furious hammering energy",
    "performed with shield-piercing attack",
    "played with anvil-weight accents",
    "performed with katana-fast phrasing",
    "played with nuclear dynamics",
    "performed with searing control",
    "played with strike-and-recoil articulation",
    "performed with cyclone-speed runs",
    "played with white-knuckle grip",
    "performed with cannon-blast dynamics",
    "played with predator timing"
  ],
  FEELINGS: [
    "savage precision", "incandescent fury", "cataclysmic joy", "merciless euphoria",
    "violent grace", "burning intelligence", "gleaming violence", "feral elegance"
  ],
  FLAVORS: [
    "cathedral-sized fury", "precision artillery", "molten and merciless",
    "incandescent and exact", "savage and surgical", "blazing and composed",
    "feral and flawless", "cruel and radiant"
  ]
};

/* ------------------------------------------------ build ------------------------------------------------ */
const VERBATIM = {
  story: MELODY_CONCEPT.story || [],
  role: MELODY_CONCEPT.role || [],
  motion: MELODY_CONCEPT.motion || [],
  hook: MELODY_CONCEPT.hook || []
};
const POOL_VERBATIM = { FEELINGS, FLAVORS, DIRECTIONS, CONTOURS, RHYTHMS, ARPS, PERFS };

function curate(name, list, verbatim) {
  const seen = new Set(verbatim.map(x => String(x).toLowerCase().trim()));
  const out = [];
  for (const v of list) {
    const k = String(v).toLowerCase().trim();
    if (seen.has(k) || !okText(v)) continue;
    seen.add(k); out.push(v);
  }
  return out;
}

const EXTRA_CONCEPT = {};
let concepts = 0;
for (const [k, list] of Object.entries(CONCEPTS)) {
  EXTRA_CONCEPT[k] = curate("concept." + k, list, VERBATIM[k]);
  concepts += EXTRA_CONCEPT[k].length;
}
const EXTRA_POOL = {};
let poolEntries = 0, poolCount = 0;
for (const [name, list] of Object.entries(POOLS)) {
  const arr = curate("pool." + name, list, POOL_VERBATIM[name] || []);
  if (!arr.length) continue;
  EXTRA_POOL[name] = shuffle(arr);
  poolEntries += arr.length; poolCount++;
}

const header = `/* data/melody-extra.js — GENERATED by tools/expand-melody.js. DO NOT EDIT BY HAND.
   Melody intensity upgrade: ${concepts} complex concepts + ${poolEntries} intense entries across ${poolCount} melody pools.
   Deterministic, deduped against the verbatim melody pools, free of relaxed/
   low-energy phrasing and of vocal-cue words. The verbatim melody pools are
   never modified — these are appended (and the relax-only entries filtered)
   at runtime by engine/state.js. */
`;
const conceptBody = Object.entries(EXTRA_CONCEPT)
  .map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v) + ",")
  .join("\n");
const poolBody = Object.entries(EXTRA_POOL)
  .map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v) + ",")
  .join("\n");
writeFileSync(new URL("../data/melody-extra.js", import.meta.url),
  header + "export const EXTRA_MELODY_CONCEPT = {\n" + conceptBody + "\n};\n\n" +
  "export const EXTRA_MELODY_POOLS = {\n" + poolBody + "\n};\n");

console.log("Melody intensity: +" + concepts + " concepts, +" + poolEntries +
  " pool entries (" + poolCount + " pools).");
