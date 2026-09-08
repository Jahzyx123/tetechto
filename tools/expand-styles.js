/* tools/expand-styles.js — GENERATES data/styles-extra.js

   Style expansion for BOTH modes:

   - EXTRA_STYLES: more techno styles for Techno-Only mode, tiered
     core/sub/rare exactly like the verbatim STYLES pool.
   - EXTRA_GENRES: more non-techno genres, each with sub-styles, feeding
     the no-techno "Sub-Style Genre" combo engine.
   - EXTRA_SUBS: extra sub-styles bolted onto genres that already exist,
     which multiplies combos without inventing whole new genres.

   Additive only: the verbatim STYLES / GENRES pools are never edited, they
   are concatenated at runtime in engine/genre.js.

   Deterministic, deduped against the verbatim pools and itself, and free
   of banned low-energy words. Run: node tools/expand-styles.js */
import { writeFileSync } from "node:fs";
import { STYLES, GENRES } from "../data/index.js";

/* A generated style name must not contain a banned word: sanitize() drops
   any clause containing one, which would delete the whole style line
   (this is exactly how "Minimal Composition" vanished from prompts). */
const BANNED_RE = /\b(minimal|minimalist|minimalism|sparse|restrained|low[- ]?energy|weak|tiny|gentle|quiet)\b/i;
const ok = t => t && t.length <= 42 && !BANNED_RE.test(t);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260904);
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const X = (...lists) => {
  let acc = [""];
  for (const l of lists) {
    const next = [];
    for (const a of acc) for (const b of l) next.push((a ? a + " " : "") + b);
    acc = next;
  }
  return acc;
};

/* ---------------- techno styles ---------------- */
const TQUAL = {
  core: ["Driving", "Rolling", "Pumping", "Peak-Time", "Warehouse", "Basement", "Late-Night", "Sunrise", "Marathon", "Main-Room", "Terrace", "Afterhours"],
  sub: ["Hypnotic", "Tribal", "Melodic", "Dub", "Acid", "Broken", "Groove", "Deep", "Raw", "Loopy", "Stripped", "Percussive", "Ambient-Edged", "Electro", "Bleep", "Rave", "Hoover", "Trance-Leaning"],
  rare: ["Polyrhythmic", "Microtonal", "Granular", "Spectral", "Kinetic", "Brutalist", "Cybernetic", "Subterranean", "Monolithic", "Iridescent", "Glacial", "Volcanic", "Nocturnal", "Astral", "Fractal", "Neon-Soaked", "Rust-Belt", "Cathedral", "Tectonic", "Quantum"]
};
const TNOUN = {
  core: ["Techno"],
  sub: ["Techno", "Hard Techno", "Dub Techno", "Acid Techno", "Hardgroove"],
  rare: ["Techno", "Industrial Techno", "Schranz", "Bleep Techno", "Electro-Techno", "Rave Techno"]
};
const TPRE = {
  core: ["", "Classic", "Modern", "Pure"],
  sub: ["", "Neo", "Post", "Proto", "Retro"],
  rare: ["", "Hyper", "Ultra", "Meta", "Trans", "Neo-Brutalist"]
};

/* ---------------- new non-techno genres ---------------- */
const NEW_GENRES = [
  ["Post-Rock", ["Cinematic Post-Rock", "Math Post-Rock", "Ambient Post-Rock", "Heavy Post-Rock", "Instrumental Crescendo", "Sludge Post-Rock", "Drone Post-Rock", "Chamber Post-Rock", "Nordic Post-Rock", "Desert Post-Rock"]],
  ["Afrobeat", ["Classic Afrobeat", "Afro-Funk", "Afro-Jazz Groove", "Highlife Fusion", "Ethio-Groove", "Afro-House Groove", "Lagos Shuffle", "Broken Afrobeat", "Afro-Latin Groove", "Desert Afrobeat"]],
  ["Balkan Brass", ["Wedding Brass", "Gypsy Brass", "Turbo Brass", "Fanfare Romanesc", "Serbian Kolo", "Macedonian 7/8", "Brass Punk", "Balkan Swing", "Roma Fanfare", "Danube Brass"]],
  ["Nu Disco", ["French Touch", "Italo Revival", "Cosmic Disco", "Space Disco", "Boogie Funk", "Disco House", "Slow Motion Disco", "Balearic Disco", "Sunset Boogie", "Roller Disco"]],
  ["Neo-Soul", ["Jazzy Neo-Soul", "Future Soul", "Broken Soul", "Gospel Neo-Soul", "Rhodes Soul", "Alt-Soul", "Soul Groove", "Velvet Soul", "Late-Night Soul", "Psychedelic Soul"]],
  ["Flamenco", ["Bulería", "Soleá", "Alegría", "Rumba Flamenca", "Tangos Flamencos", "Nuevo Flamenco", "Flamenco Fusion", "Cante Jondo Instrumental", "Guitarra Flamenca", "Flamenco Jazz"]],
  ["Klezmer", ["Freylekhs", "Bulgar", "Doina", "Hora Klezmer", "Klezmer Jazz", "Balkan Klezmer", "Modern Klezmer", "Wedding Klezmer", "Terkish", "Klezmer Swing"]],
  ["Gamelan", ["Balinese Gong Kebyar", "Javanese Court Gamelan", "Gamelan Fusion", "Kecak Rhythm", "Gender Wayang", "Gamelan Minimal Cycle", "Jegog Bamboo", "Angklung Ensemble", "Gamelan Jazz", "Ceremonial Gamelan"]],
  ["Cumbia", ["Cumbia Villera", "Digital Cumbia", "Cumbia Sonidera", "Chicha Peruana", "Cumbia Rebajada", "Andean Cumbia", "Electro Cumbia", "Tropical Cumbia", "Psychedelic Cumbia", "Cumbia Norteña"]],
  ["Highlife", ["Palm-Wine Highlife", "Burger Highlife", "Guitar Band Highlife", "Dance Band Highlife", "Contemporary Highlife", "Ghanaian Groove", "Highlife Jazz", "Afro-Highlife", "Highlife Funk", "Coastal Highlife"]],
  ["Bhangra", ["Traditional Bhangra", "Folk Dhol", "Bhangra Fusion", "Punjabi Groove", "Bhangra Funk", "Dhol Drive", "Modern Bhangra", "Bhangra Brass", "Harvest Bhangra", "Bhangra Swing"]],
  ["Fado", ["Fado de Lisboa", "Fado de Coimbra", "Fado Corrido", "Fado Menor", "Instrumental Fado", "Guitarra Portuguesa", "Modern Fado", "Fado Jazz", "Fado Nocturno", "Fado Fusion"]],
  ["Zydeco", ["Classic Zydeco", "Nouveau Zydeco", "Zydeco Blues", "Creole Two-Step", "Accordion Zydeco", "Zydeco Funk", "Bayou Groove", "Rubboard Shuffle", "Zydeco Waltz", "Swamp Zydeco"]],
  ["Taiko", ["Kumi-Daiko", "Miyake Style", "Hachijo Style", "Festival Taiko", "Taiko Fusion", "Cinematic Taiko", "Odaiko Thunder", "Shime Drive", "Taiko Ensemble", "Ceremonial Taiko"]],
  ["Mariachi", ["Mariachi Tradicional", "Son Jalisciense", "Mariachi Bolero", "Ranchera Instrumental", "Mariachi Moderno", "Huapango", "Mariachi Brass", "Serenata", "Mariachi Fusion", "Fiesta Mariachi"]],
  ["Bossa Nova", ["Classic Bossa", "Samba-Jazz Bossa", "Modern Bossa", "Bossa Groove", "Rio Bossa", "Cool Bossa", "Bossa Fusion", "Guitar Bossa", "Beachside Bossa", "Nocturnal Bossa"]],
  ["Blues Rock", ["Delta Blues Rock", "British Blues Rock", "Texas Shuffle", "Slide Blues Rock", "Heavy Blues Rock", "Psychedelic Blues", "Swamp Blues Rock", "Boogie Blues", "Southern Blues Rock", "Desert Blues Rock"]],
  ["Chamber Pop", ["Baroque Chamber Pop", "Orchestral Chamber Pop", "String-Led Pop", "Cinematic Chamber Pop", "Folk Chamber Pop", "Chamber Groove", "Vintage Chamber Pop", "Nocturne Pop", "Chamber Jazz Pop", "Chamber Waltz"]],
  ["Spaghetti Western", ["Desert Duel", "Morricone Style", "Whistling Western", "Mariachi Western", "Dark Western", "Western Surf", "Frontier March", "Canyon Theme", "Outlaw Ride", "Sunset Standoff"]],
  ["Dub", ["Roots Dub", "Steppers Dub", "Dub Poetry Instrumental", "Digital Dub", "Dub Techno Roots", "Heavyweight Dub", "Echo Chamber Dub", "Dubwise Groove", "Space Dub", "Bass Dub"]],
  ["Ska", ["Traditional Ska", "Two-Tone", "Ska Punk", "Rocksteady Ska", "Ska Jazz", "Skinhead Reggae", "Third Wave Ska", "Ska Brass", "Offbeat Drive", "Kingston Ska"]],
  ["Surf Rock", ["Classic Surf", "Reverb Surf", "Garage Surf", "Spy Surf", "Psychedelic Surf", "Surf Punk", "Instrumental Surf", "Hot Rod Surf", "Big Wave Surf", "Twang Surf"]],
  ["Math Rock", ["Odd-Meter Math Rock", "Tapping Math Rock", "Jazz Math Rock", "Heavy Math Rock", "Twinkly Math Rock", "Instrumental Math", "Polymetric Rock", "Angular Rock", "Post-Math", "Math Groove"]],
  ["Krautrock", ["Motorik", "Cosmic Krautrock", "Kosmische", "Electronic Krautrock", "Psychedelic Kraut", "Drone Kraut", "Space Kraut", "Repetitive Groove", "Neu Style", "Berlin School"]],
  ["Trip Hop", ["Bristol Trip Hop", "Cinematic Trip Hop", "Dark Trip Hop", "Jazzy Trip Hop", "Downtempo Trip Hop", "Orchestral Trip Hop", "Broken Trip Hop", "Noir Trip Hop", "Dub Trip Hop", "Modern Trip Hop"]],
  ["Big Band", ["Swing Big Band", "Bebop Big Band", "Latin Big Band", "Modern Big Band", "Brass-Heavy Big Band", "Ballroom Big Band", "Jump Blues Band", "Shout Chorus", "Count Style", "Duke Style"]],
  ["Baroque", ["Concerto Grosso", "Fugue", "Toccata", "Baroque Dance Suite", "Harpsichord Baroque", "Chamber Baroque", "Baroque Strings", "Continuo Groove", "Ornamented Baroque", "Baroque Fusion"]],
  ["Process Composition", ["Phase Music", "Additive Process", "Pulse Composition", "Systems Music", "Repetitive Cell Music", "Post-Classical Pulse", "Marimba Cycle", "String Cycle", "Piano Cycle", "Tape Loop Cycle"]],
  ["Cinematic Orchestral", ["Epic Trailer", "Heroic Fanfare", "Dark Orchestral", "Adventure Score", "Chase Cue", "Emotional Strings", "Hybrid Orchestral", "Battle Percussion", "Fantasy Score", "Sci-Fi Orchestral"]],
  ["Bluegrass", ["Traditional Bluegrass", "Progressive Bluegrass", "Newgrass", "Banjo Breakdown", "Fiddle Tune", "Gospel Bluegrass", "Jam Grass", "Appalachian Grass", "Bluegrass Swing", "High Lonesome"]],
  ["Tango", ["Tango Nuevo", "Milonga", "Tango Vals", "Orquesta Típica", "Bandoneón Tango", "Electro Tango", "Tango Jazz", "Dramatic Tango", "Buenos Aires Tango", "Tango Fusion"]],
  ["Celtic", ["Irish Reel", "Scottish Jig", "Celtic Air", "Bodhrán Drive", "Celtic Fusion", "Pipe March", "Fiddle Set", "Sea Shanty Instrumental", "Highland Groove", "Celtic Rock"]],
  ["Qawwali Groove", ["Harmonium Cycle", "Tabla Qawwali", "Sufi Groove", "Devotional Pulse", "Modern Sufi", "Qawwali Fusion", "Ecstatic Cycle", "Handclap Qawwali", "Sufi Jazz", "Trance Qawwali"]],
  ["Carnatic Fusion", ["Konnakol Groove", "Mridangam Drive", "Raga Fusion", "Veena Lead", "Carnatic Jazz", "South Indian Groove", "Tala Cycle", "Violin Carnatic", "Percussive Carnatic", "Modern Carnatic"]],
  ["Nordic Folk", ["Nyckelharpa Tune", "Hardanger Fiddle", "Sami Drum Groove", "Viking Folk", "Nordic Ballad Instrumental", "Fjord Folk", "Runic Drone", "Nordic Fusion", "Polska Dance", "Winter Folk"]],
  ["Gospel", ["Traditional Gospel", "Contemporary Gospel", "Gospel Organ", "Hand-Clap Gospel", "Gospel Funk", "Southern Gospel", "Gospel Jazz", "Revival Gospel", "Gospel Shuffle", "Praise Groove"]],
  ["Boom Bap", ["Golden Era Boom Bap", "Jazzy Boom Bap", "Dusty Boom Bap", "Hard Boom Bap", "Soul Sample Boom Bap", "East Coast Boom Bap", "Lo-Fi Boom Bap", "Vinyl Boom Bap", "Head-Nod Groove", "Crate Dig Beat"]],
  ["Jazz Fusion", ["Electric Fusion", "Latin Fusion", "Funk Fusion", "Prog Fusion", "Ambient Fusion", "Heavy Fusion", "Rhodes Fusion", "Odd-Meter Fusion", "Cosmic Fusion", "Modern Fusion"]],
  ["Dungeon Synth", ["Medieval Dungeon", "Forest Synth", "Winter Dungeon", "Comfy Synth", "Dark Dungeon", "Castle Ambience", "Ritual Synth", "Tavern Theme", "Crypt Synth", "Fantasy Dungeon"]],
  ["Sea Shanty", ["Capstan Shanty", "Halyard Shanty", "Forebitter Instrumental", "Modern Shanty", "Pirate Groove", "Harbour Shanty", "Shanty Punk", "Shanty Waltz", "Whaling Tune", "Deck Stomp"]]
];

/* extra sub-styles for genres that already exist in the verbatim pool */
/* Never use "live" in a generated name: Suno reads it as a concert
   recording, and engine/prompt.js strips the word at output anyway. */
const EXTRA_SUB_QUAL = ["Late-Night", "Sunrise", "Midnight", "Golden-Hour", "Rain-Soaked", "Sunlit", "Winter", "Summer", "Neon", "Velvet", "Smoke-Filled", "Wide-Screen", "Slow-Burn", "Fever-Dream", "Hand-Played", "Room-Recorded", "Festival", "Basement", "Rooftop", "Riverside"];

/* ---------------- build ---------------- */
const styleSeen = new Set(STYLES.map(s => s.n.toLowerCase()));
const EXTRA_STYLES = [];
for (const tier of ["core", "sub", "rare"]) {
  const cand = shuffle(X(TPRE[tier], TQUAL[tier], TNOUN[tier]));
  const cap = tier === "core" ? 120 : tier === "sub" ? 240 : 380;
  let n = 0;
  for (const raw of cand) {
    const t = raw.replace(/\s+/g, " ").trim();
    if (!ok(t) || styleSeen.has(t.toLowerCase())) continue;
    styleSeen.add(t.toLowerCase());
    EXTRA_STYLES.push({ n: t, c: tier });
    if (++n >= cap) break;
  }
}

const genreSeen = new Set(GENRES.map(g => String(g.n).toLowerCase()));
const EXTRA_GENRES = [];
for (const [name, subs] of NEW_GENRES) {
  if (genreSeen.has(name.toLowerCase())) continue;
  genreSeen.add(name.toLowerCase());
  const seen = new Set();
  const list = subs.filter(x => ok(x) && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
  if (list.length) EXTRA_GENRES.push({ n: name, subs: list });
}

/* bolt extra sub-styles onto existing genres (multiplies combos cheaply) */
const EXTRA_SUBS = {};
let addedSubs = 0;
for (const g of GENRES) {
  const have = new Set((g.subs || []).map(x => String(x).toLowerCase()));
  const picks = shuffle(EXTRA_SUB_QUAL).slice(0, 6);
  const list = [];
  for (const q of picks) {
    const t = (q + " " + g.n).replace(/\s+/g, " ").trim();
    if (!ok(t) || have.has(t.toLowerCase())) continue;
    /* the combo is rendered "<sub> <genre>", so a sub sharing a word with
       its genre yields "Percussive Carnatic Carnatic Fusion" */
    const gw = new Set(g.n.toLowerCase().split(/\s+/));
    if (q.toLowerCase().split(/\s+/).some(w => gw.has(w))) continue;
    have.add(t.toLowerCase());
    list.push(t);
  }
  if (list.length) { EXTRA_SUBS[g.n] = list; addedSubs += list.length; }
}

const newCombos = EXTRA_GENRES.reduce((a, g) => a + g.subs.length, 0) + addedSubs;
writeFileSync(new URL("../data/styles-extra.js", import.meta.url),
  `/* data/styles-extra.js — GENERATED by tools/expand-styles.js. DO NOT EDIT BY HAND.

   Additive style expansion, concatenated onto the verbatim pools at
   runtime by engine/genre.js (the extracted pools are never edited).

   EXTRA_STYLES: ${EXTRA_STYLES.length} techno styles (Techno-Only mode).
   EXTRA_GENRES: ${EXTRA_GENRES.length} new genres / ${EXTRA_GENRES.reduce((a, g) => a + g.subs.length, 0)} sub-styles (No-Techno mode).
   EXTRA_SUBS:   ${addedSubs} extra sub-styles on ${Object.keys(EXTRA_SUBS).length} existing genres.
   Net new genre x sub-style combos: ${newCombos}. */
export const EXTRA_STYLES = ${JSON.stringify(EXTRA_STYLES, null, 0).replace(/\},\{/g, "},\n  {").replace(/^\[/, "[\n  ").replace(/\]$/, "\n]")};

export const EXTRA_GENRES = ${JSON.stringify(EXTRA_GENRES, null, 0).replace(/\},\{/g, "},\n  {").replace(/^\[/, "[\n  ").replace(/\]$/, "\n]")};

export const EXTRA_SUBS = ${JSON.stringify(EXTRA_SUBS, null, 0).replace(/","/g, '",\n    "').replace(/\],"/g, '],\n  "').replace(/^\{/, "{\n  ").replace(/\}$/, "\n}")};
`);

console.log("techno styles: +" + EXTRA_STYLES.length);
console.log("new genres:    +" + EXTRA_GENRES.length + " (" + EXTRA_GENRES.reduce((a, g) => a + g.subs.length, 0) + " subs)");
console.log("extra subs:    +" + addedSubs + " on " + Object.keys(EXTRA_SUBS).length + " genres");
console.log("new combos:    +" + newCombos);
