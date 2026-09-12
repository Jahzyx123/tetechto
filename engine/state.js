/* engine/state.js — app state shape, per-atom roll functions, roll groups.
   Ported from the legacy engine: one roll function per atom key, all
   consuming the verbatim pools. Roll functions mutate the state object
   they're given (so variation candidates can be rolled off-state). */
import {
  FEELINGS, FLAVORS, DIRECTIONS, LEADS, PERFS, HARMONIES, ARPS, CONTOURS, RHYTHMS, MELODY_CONCEPT,
  BASS_VOICES, BASS_MOVES, BASS_RELS, KICKS, HATS, SNARES, PERCS, TOMS, GROOVES, SWINGS, SYNCS, INTENSITIES,
  TECHNO_DRIVES, TECHNO_ACIDS, TECHNO_TEXTURES, TECHNO_RAVES, TECHNO_INDUSTRIALS,
  FILTER_TYPES, ENVELOPE_TYPES, LFO_TYPES, DISTORTION_TYPES, REVERB_TYPES, DELAY_TYPES,
  SIDECHAIN_TYPES, STEREO_TYPES, FX_CHAINS, CHORD_PROGS, RHYTHM_PATTERNS, SOUND_INTENSITIES,
  MIX_DENSITY, MIX_ENERGY, MIX_SPACE, MIX_GLUE, MIX_PUNCH,
  MASTER_DRIVE, MASTER_LOUDNESS, MASTER_COLOR, MASTER_CHAIN,
  FILTER_CUTOFF_TYPES, FILTER_RESONANCE_TYPES, EQ_TYPES, COMPRESSION_TYPES, SATURATION_TYPES, SIDECHAIN_CURVE_TYPES,
  STEREO_IMAGE, STEREO_WIDTH, SPATIAL_DEPTH, SPATIAL_MOVEMENT,
  MOD_SOURCE, MOD_DEST, MOD_RATE, MOD_DEPTH,
  TEXTURE_LAYER, GRAIN_TYPE, SHIMMER_TYPE, ATMOSPHERE_TYPE,
  REVERB_SIZE_TYPES, REVERB_DECAY_TYPES, STEREO_ENHANCE_TYPES,
  GHOST_NOTES, HUMANIZE_TYPES, POCKET_TYPES,
  ORNAMENT_TYPES, VIBRATO_TYPES, PORTAMENTO_TYPES, SCALE_RUNS, INTERVAL_LEAPS,
  VOICING_TYPES, INVERSION_TYPES, TENSION_TYPES, RESOLUTION_TYPES,
  DELAY_TIME_TYPES, DELAY_FEEDBACK_TYPES, SECTION_DENSITY_TYPES,
  RIDE_TYPES, CRASH_TYPES, CLAP_LAYERS, PERC_FILLS,
  FX_TYPES, TRANSITION_TYPES, RISER_TYPES, IMPACT_TYPES,
  ENERGY_CURVE_TYPES, BUILD_TYPES, DROP_TYPES, CHOP_TYPES,
  CONCEPT
} from "../data/index.js";
import { EXTRA_POOLS } from "../data/expansion.js";
import { EXTRA_MELODY_CONCEPT, EXTRA_MELODY_POOLS } from "../data/melody-extra.js";
import { ORGANIC_POOLS, HYBRID_POOLS } from "../data/acoustic.js";
import { genreWorld } from "./world.js";
import { rollLyrics } from "./lyrics.js";
import * as DATA from "../data/index.js";
import { newSeed, random, pick } from "./prng.js";
import { scaleOf } from "./music.js";
import {
  pickStyle, pickSecondary, pickGenreObj, pickGenreObjOther, genreOfStyle,
  tempoForGenre, pickScaleId, rollBpmValue, pickArrangementFor, pickNoStopArrangement,
  _setHandPercPredicate
} from "./genre.js";

/* ---------------------------- ROLL FUNCTIONS ----------------------------
   One roll function per atom key. Special keys (style/combos/key/concepts)
   get bespoke logic; plain sound atoms get a generated one-liner. */
export const POOL_OF = {
  feeling: FEELINGS, flavor: FLAVORS, direction: DIRECTIONS,
  leadVoice: LEADS, leadPerf: PERFS, harmony: HARMONIES, arpeggio: ARPS,
  contour: CONTOURS, rhythm: RHYTHMS,
  bassVoice: BASS_VOICES, bassMovement: BASS_MOVES, bassRel: BASS_RELS,
  kick: KICKS, hats: HATS, snare: SNARES, perc: PERCS, toms: TOMS,
  groove: GROOVES, swing: SWINGS, sync: SYNCS, intensity: INTENSITIES,
  technoDrive: TECHNO_DRIVES, technoAcid: TECHNO_ACIDS, technoTexture: TECHNO_TEXTURES,
  technoRave: TECHNO_RAVES, technoIndustrial: TECHNO_INDUSTRIALS,
  filterType: FILTER_TYPES, envelopeType: ENVELOPE_TYPES, lfoType: LFO_TYPES,
  distortionType: DISTORTION_TYPES, reverbType: REVERB_TYPES, delayType: DELAY_TYPES,
  sidechainType: SIDECHAIN_TYPES, stereoType: STEREO_TYPES, fxChain: FX_CHAINS,
  chordProg: CHORD_PROGS, rhythmPattern: RHYTHM_PATTERNS, soundIntensity: SOUND_INTENSITIES,
  mixDensity: MIX_DENSITY, mixEnergy: MIX_ENERGY, mixSpace: MIX_SPACE, mixGlue: MIX_GLUE, mixPunch: MIX_PUNCH,
  masterDrive: MASTER_DRIVE, masterLoudness: MASTER_LOUDNESS, masterColor: MASTER_COLOR, masterChain: MASTER_CHAIN,
  filterCutoff: FILTER_CUTOFF_TYPES, filterResonance: FILTER_RESONANCE_TYPES, eqType: EQ_TYPES,
  compressionType: COMPRESSION_TYPES, saturationType: SATURATION_TYPES, sidechainCurve: SIDECHAIN_CURVE_TYPES,
  stereoImage: STEREO_IMAGE, stereoWidth: STEREO_WIDTH, spatialDepth: SPATIAL_DEPTH, spatialMovement: SPATIAL_MOVEMENT,
  modSource: MOD_SOURCE, modDest: MOD_DEST, modRate: MOD_RATE, modDepth: MOD_DEPTH,
  textureLayer: TEXTURE_LAYER, grainType: GRAIN_TYPE, shimmerType: SHIMMER_TYPE, atmosphereType: ATMOSPHERE_TYPE,
  reverbSize: REVERB_SIZE_TYPES, reverbDecay: REVERB_DECAY_TYPES, stereoEnhance: STEREO_ENHANCE_TYPES,
  ghostNotes: GHOST_NOTES, humanizeType: HUMANIZE_TYPES, pocketType: POCKET_TYPES,
  ornamentType: ORNAMENT_TYPES, vibratoType: VIBRATO_TYPES, portamentoType: PORTAMENTO_TYPES,
  scaleRun: SCALE_RUNS, intervalLeap: INTERVAL_LEAPS,
  voicingType: VOICING_TYPES, inversionType: INVERSION_TYPES, tensionType: TENSION_TYPES, resolutionType: RESOLUTION_TYPES,
  delayTime: DELAY_TIME_TYPES, delayFeedback: DELAY_FEEDBACK_TYPES, sectionDensity: SECTION_DENSITY_TYPES,
  rideType: RIDE_TYPES, crashType: CRASH_TYPES, clapLayer: CLAP_LAYERS, percFill: PERC_FILLS,
  fxType: FX_TYPES, transitionType: TRANSITION_TYPES, riserType: RISER_TYPES, impactType: IMPACT_TYPES,
  energyCurve: ENERGY_CURVE_TYPES, buildType: BUILD_TYPES, dropType: DROP_TYPES, chopType: CHOP_TYPES
};

/* ---------------------------- POOL EXPANSION ----------------------------
   data/expansion.js adds thousands of generated-but-curated entries on top
   of the verbatim legacy pools. Merging happens here (not in /data) so the
   extracted modules stay byte-identical to the legacy source. */
const POOL_NAME_OF = new Map();
for (const n in DATA) { if (Array.isArray(DATA[n])) POOL_NAME_OF.set(DATA[n], n); }
export const EXPANSION_STATS = { pools: 0, added: 0 };
for (const k in POOL_OF) {
  const extra = EXTRA_POOLS[POOL_NAME_OF.get(POOL_OF[k])];
  if (extra && extra.length) {
    POOL_OF[k] = POOL_OF[k].concat(extra);
    EXPANSION_STATS.pools++; EXPANSION_STATS.added += extra.length;
  }
}

/* ------------------------- MELODY INTENSITY -------------------------
   The melody upgrade: intense, complex phrasing everywhere the melody
   is described. Two parts:

   1. EXTRA_MELODY_POOLS (data/melody-extra.js, generated) bolsters the
      rolled melody pools with high-density, aggressive entries.
   2. The relax filter below removes the simple / low-energy entries
      (calm, gentle, peaceful, tender, slow, easy, smooth, simple…) from
      the melody side unless an intensity counterweight makes the phrase
      a real contrast ("serene but powerful", "soft-mannered yet
      colossal" stay; "peaceful", "easy swaying rhythm" go).

   Purely a runtime view, exactly like the hand-perc and no-stop filters:
   the verbatim pools on disk are never edited. The filter is NOT applied
   to feelings/flavors outside the melody block? It is — the whole emotion
   line drives the melody's character, and the user asked for no simple
   relax things. Contrast values survive via the counterweight rule. */
export const MELODY_KEYS = new Set(["feeling", "flavor", "direction",
  "leadVoice", "leadPerf", "harmony", "arpeggio", "contour", "rhythm"]);
export const MELODY_SOFT_RE = /\b(simple|simpl|basic|plain|minimal|sparse|restrained|quiet|subtle|soft|gentle|calm|soothing|serene|peaceful|content|tender|dreamy|mellow|smooth|easy|lazy|unhurried|laid[- ]?back|slow|light|lullab|drift|float|airy|delicate|feather|glacial|breez|languid|leisurely|cozy|vague|warm|tranquil|peace|hum|song|stroll)\b/i;
export const MELODY_INTENSE_RE = /\b(titanic|massive|huge|colossal|violent|fierce|storm|blazing|burning|explosive|raging|thunder|seismic|monstrous|brutal|furious|ferocious|savage|relentless|unrelenting|power|crushing|pounding|hammering|slamming|piercing|razor|white[- ]?hot|molten|volcanic|merciless|unbreakable|unstoppable|enormous|giant|feral|predatory|apocalyptic|cataclysmic|devastating|deadly|killer|lethal|manic|frenzied|hysterical|frantic|unhinged|barbed|cutting|shredding|scorching|searing|attack|detonat|explod|slam|strike|wars?\b|warfare|warlike|war-cry|warcry|fury|rage|blade|steel|iron|chainsaw|machine[\s-]?gun|cannon|arsenal|siege|batt\w*|fuse\w*|voltage|grid|alarm\w*|siren\w*|insane|berserk|fractur|shatter|outrun|outflank|outgrow|aggress)\b/i;
export function isRelaxMelody(v) {
  return typeof v === "string" && MELODY_SOFT_RE.test(v) && !MELODY_INTENSE_RE.test(v);
}
const _relaxCache = new Map();
export function withoutRelaxMelody(arr) {
  if (!Array.isArray(arr)) return arr;
  let out = _relaxCache.get(arr);
  if (!out) {
    out = arr.filter(x => !isRelaxMelody(x));
    _relaxCache.set(arr, out);
  }
  return out;
}
export const MELODY_EXPANSION_STATS = { pools: 0, added: 0 };
for (const k in POOL_OF) {
  const nm = POOL_NAME_OF.get(POOL_OF[k]);
  const extra = EXTRA_MELODY_POOLS[nm];
  if (extra && extra.length && MELODY_KEYS.has(k)) {
    POOL_OF[k] = POOL_OF[k].concat(extra);
    MELODY_EXPANSION_STATS.pools++; MELODY_EXPANSION_STATS.added += extra.length;
  }
}
/* Melody-concept pools: verbatim + generated extras, relax entries
   filtered, memoised once at module load. */
export const MELODY_CONCEPT_POOL = {};
for (const k in MELODY_CONCEPT) {
  MELODY_CONCEPT_POOL[k] = withoutRelaxMelody(
    MELODY_CONCEPT[k].concat(EXTRA_MELODY_CONCEPT[k] || []));
}

/* ---------------------------- WORLD-AWARE POOLS ----------------------------
   In no-techno mode the rolled genre decides which vocabulary a sound atom
   draws from. Organic genres (jazz, folk, classical…) roll real rooms,
   kits, horns and strings; hybrid genres (rock, shoegaze…) get a blend;
   electronic genres and techno-only mode keep the original pools.

   This replaces the old style-fit behaviour of HIDING the techno-flavoured
   cards, which silently cost no-techno prompts ~6 sounds. Now the slots
   stay filled — with words that fit the genre. */
/* ------------------------- no-hand-percussion ------------------------- */
/* Suno hears "tribal", hand percussion, woodblocks and claps as a whole
   acoustic-percussion idiom, so the toggle removes that vocabulary as a
   family rather than one word at a time. The same switch also covers two
   neighbouring idioms that read the same way in a prompt: chopped
   breakbeat/jungle drums, and trash-can / found-object / scrap-metal
   industrial percussion.

   Word-boundary anchored on purpose. "block density" (an intensity term),
   "snappy"/"snap attack" (transients), "Heartbeat of the Block" and
   "a groove with a rim on the four" must all survive -- only the
   percussion senses are matched. */
export const HAND_PERC_RE = /\b(?:tribal|ethnic|conga|congas|bongo|bongos|djembe|djembes|tabla|tablas|shaker|shakers|tambourine|cowbell|clave|claves|maraca|maracas|guiro|cabasa|castanet|castanets|udu|cajon|cajón|taiko|timbale|timbales|agogo|bodhran|darbuka|doumbek|dholak|talking drum|frame drum|hand drum|hand-drum|hand percussion|shekere|kalimba|marimba|xylophone|vibraphone|woodblock|woodblocks|wood block|wooden block|wood-block|rimshot|rim shot|rim knock|rim click|clap|claps|clapping|handclap|handclaps|hand clap|hand-clap|finger snap|finger snaps|stomp|stomps|polyrhythm|polyrhythmic|caxixi rattles|caxixi|pandeiro|rainstick|washboard|jawbone|spoons|bones|bone clicks|sleigh bell|sleigh bells|wind chime|wind chimes|finger cymbal|finger cymbals|triangle|handpan|hang drum|steel pan|steelpan|steel drum|thumb piano|gourd|shekere|berimbau|cuica|repinique|surdo|tamborim|bodhrán|riq|daf|zarb|clacking|clacks|cross-stick|crossstick|rim-stick)\b|\bwood(?:en|y)?\b/i;

/* Breakbeat/jungle drums and junk-metal percussion. Kept as its own
   pattern so the two families stay legible, but driven by the same toggle.

   Word-boundary anchored for the same reason as above: "ornament" contains
   "amen", "expanse"/"expansion" contain "scrap"-like fragments, and
   "hammered"/"master pipeline"/"barrelhouse" must all survive. */
export const JUNK_PERC_RE = /\b(?:jungle|junglist|amen break|amen breaks|breakbeat|breakbeats|break-beat|chopped break|chopped breaks|ragga|trash|trash-can|trashcan|garbage|junk|junkyard|scrapyard|scrap metal|dustbin|bin lid|oil drum|oil-drum|anvil|anvils|hubcap|hubcaps|debris|found-object|found object|found sound|foley|pots and pans|kitchen sink|tin can|tin cans|clang|clangs|clanging|clank|clanks|clanking|clatter|clattering|metal sheet|sheet metal|pipe hit|pipe hits|blacksmith|scrap)\b|\b(?:industrial|machine|factory|scrap|junk)[ -]percussion\b/i;

export function hasHandPerc(v) {
  return typeof v === "string" && (HAND_PERC_RE.test(v) || JUNK_PERC_RE.test(v));
}

/* genre.js needs this predicate but cannot import it (state.js already
   imports genre.js), so it is injected here. */
_setHandPercPredicate(hasHandPerc);

/* Filtered pools are memoised: the filter runs on every roll of every
   atom, and re-scanning ~10k strings each time is wasteful. */
const _cleanCache = new Map();
export function withoutHandPerc(arr) {
  if (!Array.isArray(arr)) return arr;
  let out = _cleanCache.get(arr);
  if (!out) {
    out = arr.filter(x => !hasHandPerc(x));
    _cleanCache.set(arr, out);
  }
  return out;
}

/* ------------------------- no-stop appearance filter -------------------------
   NO-STOP is a continuous-beat mode, so any pool value that hints at a
   section change, break or fill would reintroduce "appearance" — the exact
   thing the button exists to remove. This strips those phrases at roll
   time: half-time / lazy / samba snare rolls / ocean drum swells /
   broken-beat / open-ride / fills / drops / risers / transitions /
   edits / warehouse & hardgroove flavour, etc. The pools on disk stay
   verbatim; the filter is a runtime view, exactly like the hand-perc one. */
export const NO_STOP_BAD_RE = new RegExp("\\b(" +
  "half[- ]time|lazy|samba|snare[- ]roll|ocean[- ]drum|broken|open[- ]ride|" +
  "fill(?:s|ed|ing)?|swell(?:s|ing)?|roll(?:s)?|drop(?:s)?|break(?:s|down|beat)?|" +
  "bridge|riser(?:s)?|transition(?:s)?|impact(?:s)?|build(?:s|[- ]up)?|" +
  "chop(?:ped|s)?|edit(?:s|ed)?|vacuum|blackout|pause(?:s)?|silence|silent|" +
  "gap(?:s)?|stutter(?:ing|ed)?|glitch(?:es|ing)?|warehouse|hardgroove" +
  ")\\b", "i");

const _noStopCache = new Map();
export function withoutNoStop(arr) {
  if (!Array.isArray(arr)) return arr;
  let out = _noStopCache.get(arr);
  if (!out) {
    out = arr.filter(x => !NO_STOP_BAD_RE.test(x));
    _noStopCache.set(arr, out);
  }
  return out;
}

export function poolFor(s, key) {
  const raw = POOL_OF[key];
  /* the filters wrap whichever world-specific pool ends up selected */
  const clean = p => {
    let q = (s && s.noHandPerc) ? withoutHandPerc(p) : p;
    q = (s && s.noStop) ? withoutNoStop(q) : q;
    /* melody intensity: simple / relaxed phrasing never rolls */
    return MELODY_KEYS.has(key) ? withoutRelaxMelody(q) : q;
  };
  const base = clean(raw);
  /* HIDE-BEATS gives back nothing for beat / sound atoms, so a stale value
     can never be re-rolled into the hidden cards either. */
  if (s && s.hideBeats && HIDE_BEATS_KEYS.has(key)) return [];
  if (!s || s.techOnly || !s.styleFit) return base;
  const world = genreWorld(s.primaryGenre);
  if (world === "organic") return clean(ORGANIC_POOLS[key]) || base;
  /* Hybrid prefers its own blended vocabulary, then falls back to the
     organic one, and only then to the techno-flavoured original — without
     that middle step, keys like sidechainType leak "909"/"sidechain" into
     rock and shoegaze prompts. */
  if (world === "hybrid") return clean(HYBRID_POOLS[key]) || clean(ORGANIC_POOLS[key]) || base;
  return base;
}

export const ROLL_FN = {};
for (const k in POOL_OF) {
  ROLL_FN[k] = (key => s => {
    if (s && s.hideBeats && HIDE_BEATS_KEYS.has(key)) { s[key] = ""; return; }
    const pool = poolFor(s, key);
    /* CLAP_LAYERS is 100% hand-percussion, so with the toggle on the pool
       is empty: blank the field instead of picking from nothing. */
    s[key] = (pool && pool.length) ? pick(pool) : "";
  })(k);
}
/* NO-STOP ultra delivery: the intensity knob is forced to continuous
   max-energy phrases so the track reads "full throttle" from bar one to
   the last one instead of building and dipping. */
export const NO_STOP_INTENSITY = [
  "unrelenting delivery", "maximum-energy delivery", "relentless forward drive",
  "peak-time sustained force", "wall of relentless energy", "full-force continuous drive"
];
ROLL_FN.intensity = s => {
  if (s.noStop) s.intensity = pick(NO_STOP_INTENSITY);
  else {
    const pool = poolFor(s, "intensity");
    s.intensity = (pool && pool.length) ? pick(pool) : "";
  }
};
/* Ultra delivery also drives the emotion/direction words: no soothing,
   serene, gentle or lazy phrasing anywhere in the box. */
export const NO_STOP_FEELING = ["relentless", "ferocious", "explosive", "euphoric", "frenzied", "unbreakable", "savage", "electric"];
export const NO_STOP_FLAVOR = ["electric and unstoppable", "relentless and blazing", "ferociously urgent", "full-throttle and unbroken", "burning and boundless", "ecstatic and infinite"];
export const NO_STOP_DIRECTION = ["unbroken forward charge", "relentless drive from the first bar", "continuous peak momentum", "ceaseless forward surge", "non-stop rising surge", "max-charge melodic hook", "full-throttle hook that never lets up", "wall-to-wall melodic drive"];
/* (feeling/direction overrides live with the original definitions below,
   so the same no-stop branch wins everywhere.) */
ROLL_FN.primary = s => { s.primaryStyle = pickStyle(s); s.primaryGenre = s.techOnly ? "Techno" : genreOfStyle(s.primaryStyle); };
ROLL_FN.secondary = s => { s.secondaryStyle = pickSecondary(s, s.primaryStyle); s.secondaryGenre = s.techOnly ? "Techno" : genreOfStyle(s.secondaryStyle); };
ROLL_FN.genre = s => {
  /* the composite genre roll respects the per-field locks too, so a locked
     primary/secondary survives ROLL EVERYTHING (and Batch Forge) */
  if (s.techOnly) {
    if (!s.locks.primary) { s.primaryStyle = pickStyle(s); s.primaryGenre = "Techno"; }
    if (!s.locks.secondary) { s.secondaryStyle = pickSecondary(s, s.primaryStyle); s.secondaryGenre = "Techno"; }
  } else {
    let pg = s.primaryGenre;
    if (!s.locks.primary) { const p = pickGenreObj(s); s.primaryGenre = p.genre; s.primaryStyle = p.combo; pg = p.genre; }
    if (!s.locks.secondary) { const q = pickGenreObjOther(s, pg); s.secondaryGenre = q.genre; s.secondaryStyle = q.combo; }
  }
  if (!s.locks.bpm) s.bpm = tempoForGenre(s, s.primaryGenre, s.secondaryGenre);
};
ROLL_FN.bpm = s => { s.bpm = rollBpmValue(); };
ROLL_FN.key = s => { s.rootPc = Math.floor(random() * 12); s.scaleId = pickScaleId(s); s.chordColor = scaleOf(s).n; };
ROLL_FN.feeling = s => {
  if (s.noStop) { s.feeling = pick(NO_STOP_FEELING); s.flavor = pick(NO_STOP_FLAVOR); return; }
  s.feeling = pick(poolFor(s, "feeling")); s.flavor = pick(poolFor(s, "flavor"));
};
ROLL_FN.direction = s => {
  if (s.noStop) { s.direction = pick(NO_STOP_DIRECTION); return; }
  const pool = poolFor(s, "direction");
  s.direction = (pool && pool.length) ? pick(pool) : "";
};
ROLL_FN.chordColor = s => { s.scaleId = pickScaleId(s); s.chordColor = scaleOf(s).n; };
ROLL_FN.rootPc = s => { s.rootPc = Math.floor(random() * 12); };
ROLL_FN.scaleId = s => { s.scaleId = pickScaleId(s); s.chordColor = scaleOf(s).n; };
ROLL_FN.concept = s => { for (const k in s.concept) s.concept[k] = pick(CONCEPT[k]); };
ROLL_FN.melodyConcept = s => { if (!s.melodyConcept) s.melodyConcept = {}; for (const k in MELODY_CONCEPT_POOL) s.melodyConcept[k] = pick(MELODY_CONCEPT_POOL[k]); };
/* composite atoms route through poolFor too, or they leak techno words
   (e.g. a "supersaw stack" counter-melody) into acoustic prompts */
/* NO-STOP hides the counter/second lines ("counter-bass"): they give the
   track a second voice that reads as an arrangement change. The rolls
   blank them so re-rolls can never bring them back while the mode is on. */
const blankCounter = s => {
  s.counterMelody = { voice: "", direction: "", perf: "", contour: "", rhythm: "" };
  s.voiceConcept = { voice: "", movement: "" };
};
ROLL_FN["counter-melody"] = s => { if (s.noStop || s.hideBeats) { blankCounter(s); return; } s.counterMelody = { voice: pick(poolFor(s, "leadVoice")), direction: pick(poolFor(s, "direction")), perf: pick(poolFor(s, "leadPerf")), contour: pick(poolFor(s, "contour")), rhythm: pick(poolFor(s, "rhythm")) }; };
ROLL_FN["counter-relation"] = s => { s.counterMelodyRelation = pick(["supports", "follows", "counters"]); };
ROLL_FN["voice-concept"] = s => { if (s.noStop || s.hideBeats) { blankCounter(s); return; } s.voiceConcept = { voice: pick(poolFor(s, "bassVoice")), movement: pick(poolFor(s, "bassMovement")) }; };
ROLL_FN["voice-relation"] = s => { s.voiceRelation = pick(["supports", "follows", "counters"]); };
ROLL_FN.arrangement = s => { s.arrangement = s.noStop ? pickNoStopArrangement(s) : pickArrangementFor(s); };
/* Lyrics Studio: blank while instrumental; a full section-tagged sheet
   is rolled (from the global seeded stream, so it stays share-reproducible)
   whenever vocals are on. */
ROLL_FN.lyrics = s => {
  s.lyrics = s.lyrics || { text: "", seed: 0, nonces: {}, edited: false };
  /* vocals exist only when vocal mode is explicitly on (instrumental off
     via the UI sets vocalMode in the same action) */
  if (s.instrumental || !s.vocalMode) { s.lyrics.text = ""; s.lyrics.seed = 0; return; }
  rollLyrics(s, (random() * 4294967296) >>> 0);
};
export const CONCEPT_KEYS = ["world", "location", "visual", "narrative", "sensation", "event", "conflict", "crowd", "title", "transform"];
CONCEPT_KEYS.forEach(k => { ROLL_FN["concept-" + k] = s => { s.concept[k] = pick(CONCEPT[k]); }; });
["story", "role", "motion", "hook"].forEach(k => { ROLL_FN["melodyConcept-" + k] = s => { if (!s.melodyConcept) s.melodyConcept = {}; s.melodyConcept[k] = pick(MELODY_CONCEPT_POOL[k] || MELODY_CONCEPT[k]); }; });

/* ---------------------------- GROUPS ---------------------------- */
export const GROUPS = {
  "primary": ["primary"], "secondary": ["secondary"], "bpm": ["bpm"], "key": ["key"],
  "feeling": ["feeling"],
  "feel-melody": ["feeling", "melodyConcept", "direction", "leadVoice", "leadPerf", "harmony", "chordColor", "arpeggio", "contour", "rhythm"],
  "melody": ["direction", "leadVoice", "leadPerf", "harmony", "chordColor", "arpeggio", "contour", "rhythm"],
  "concept-melody": ["melodyConcept"],
  "bass": ["bassVoice", "bassMovement", "bassRel"],
  "drums": ["kick", "hats", "snare", "perc", "toms", "groove", "swing", "sync", "intensity"],
  "technoLab": ["technoDrive", "technoAcid", "technoTexture", "technoRave", "technoIndustrial"],
  "concept": ["concept"], "arrangement": ["arrangement"],
  "rhythm": ["rhythm", "rhythmPattern"],
  "harmony": ["harmony", "chordColor", "chordProg"],
  "soundDesign": ["filterType", "envelopeType", "lfoType", "distortionType", "reverbType", "delayType", "sidechainType", "stereoType", "fxChain", "soundIntensity"],
  "mixMaster": ["mixDensity", "mixEnergy", "mixSpace", "mixGlue", "mixPunch", "masterDrive", "masterLoudness", "masterColor", "masterChain", "filterCutoff", "filterResonance", "eqType", "compressionType", "saturationType", "sidechainCurve"],
  "spatialMod": ["stereoImage", "stereoWidth", "spatialDepth", "spatialMovement", "modSource", "modDest", "modRate", "modDepth", "textureLayer", "grainType", "shimmerType", "atmosphereType", "reverbSize", "reverbDecay", "stereoEnhance"],
  "grooveMelodic": ["ghostNotes", "humanizeType", "pocketType", "ornamentType", "vibratoType", "portamentoType", "scaleRun", "intervalLeap", "voicingType", "inversionType", "tensionType", "resolutionType", "delayTime", "delayFeedback", "sectionDensity"],
  "textureFx": ["rideType", "crashType", "clapLayer", "percFill", "fxType", "transitionType", "riserType", "impactType", "energyCurve", "buildType", "dropType", "chopType"],
  "mix": ["mixDensity", "mixEnergy", "mixSpace", "mixGlue", "mixPunch"],
  "master": ["masterDrive", "masterLoudness", "masterColor", "masterChain"],
  "spatial": ["stereoImage", "stereoWidth", "spatialDepth", "spatialMovement", "stereoEnhance"],
  "mod": ["modSource", "modDest", "modRate", "modDepth"],
  "texture": ["textureLayer", "grainType", "shimmerType", "atmosphereType"],
  "grooveExtra": ["ghostNotes", "humanizeType", "pocketType"],
  "melodicExtra": ["ornamentType", "vibratoType", "portamentoType", "scaleRun", "intervalLeap"],
  "harmonicExtra": ["voicingType", "inversionType", "tensionType", "resolutionType"],
  "percExtra": ["rideType", "crashType", "clapLayer", "percFill"],
  "fxExtra": ["fxType", "transitionType", "riserType", "impactType"],
  "arrangementExtra": ["sectionDensity", "energyCurve", "buildType", "dropType"],
  "filter": ["filterType"], "envelope": ["envelopeType"], "lfo": ["lfoType"],
  "distortion": ["distortionType"], "reverb": ["reverbType"], "delay": ["delayType"],
  "sidechain": ["sidechainType"], "stereo": ["stereoType"], "fx": ["fxChain"],
  "chord": ["chordProg"], "rhythmPattern": ["rhythmPattern"],
  "power": Object.keys(ROLL_FN)
};

/* Every atom that makes a beat or a sound — skipped entirely under
   HIDE-BEATS so nothing can re-appear in the hidden cards. */
export const HIDE_BEATS_KEYS = new Set([
  ...GROUPS.drums, ...GROUPS.bass, ...GROUPS.technoLab, ...GROUPS.soundDesign,
  ...GROUPS.mixMaster, ...GROUPS.spatialMod, ...GROUPS.textureFx,
  "ghostNotes", "humanizeType", "pocketType",
  "rideType", "crashType", "clapLayer", "percFill",
  "counter-melody", "counter-relation", "voice-concept", "voice-relation"
]);

/* ---------------------------- STATE ---------------------------- */
export function defaultLocks() {
  const l = {};
  Object.keys(ROLL_FN).forEach(k => l[k] = false);
  l.instrumental = false;
  return l;
}
export function defaultHidden() {
  return {
    bpm: false, key: false, styleCard: false, feelCard: false, bassCard: false, drumsCard: false, technoLabCard: false,
    rhythmLabCard: false, harmonyLabCard: false, soundDesignCard: false, mixMasterCard: false, spatialModCard: false,
    grooveMelodicCard: false, textureFxCard: false, conceptCard: false, arrangementCard: false, layersCard: false
  };
}
export function defaultState() {
  return {
    seed: newSeed(),
    primaryStyle: "", secondaryStyle: "", primaryGenre: "", secondaryGenre: "", bpm: 140, rootPc: 9, scaleId: "aeolian",
    techOnly: true, equalChance: false,
    microMelody: "off", microBass: "off",
    feeling: "", flavor: "", direction: "",
    leadVoice: "", leadPerf: "", contour: "", rhythm: "",
    harmony: "", chordColor: "", arpeggio: "",
    bassVoice: "", bassMovement: "", bassRel: "",
    counterMelody: { voice: "", direction: "", perf: "", contour: "", rhythm: "" }, counterMelodyRelation: "supports",
    voiceConcept: { voice: "", movement: "" }, voiceRelation: "supports",
    kick: "", hats: "", snare: "", perc: "", toms: "", groove: "", swing: "", sync: "", intensity: "",
    technoDrive: "", technoAcid: "", technoTexture: "", technoRave: "", technoIndustrial: "",
    filterType: "", envelopeType: "", lfoType: "", distortionType: "", reverbType: "", delayType: "", sidechainType: "", stereoType: "", fxChain: "", chordProg: "", rhythmPattern: "", soundIntensity: "",
    mixDensity: "", mixEnergy: "", mixSpace: "", mixGlue: "", mixPunch: "", masterDrive: "", masterLoudness: "", masterColor: "", masterChain: "",
    filterCutoff: "", filterResonance: "", eqType: "", compressionType: "", saturationType: "", sidechainCurve: "",
    stereoImage: "", stereoWidth: "", spatialDepth: "", spatialMovement: "",
    modSource: "", modDest: "", modRate: "", modDepth: "",
    textureLayer: "", grainType: "", shimmerType: "", atmosphereType: "",
    reverbSize: "", reverbDecay: "", stereoEnhance: "",
    ghostNotes: "", humanizeType: "", pocketType: "",
    ornamentType: "", vibratoType: "", portamentoType: "", scaleRun: "", intervalLeap: "",
    voicingType: "", inversionType: "", tensionType: "", resolutionType: "",
    delayTime: "", delayFeedback: "", sectionDensity: "",
    rideType: "", crashType: "", clapLayer: "", percFill: "",
    fxType: "", transitionType: "", riserType: "", impactType: "",
    energyCurve: "", buildType: "", dropType: "", chopType: "",
    concept: { world: "", location: "", visual: "", narrative: "", sensation: "", event: "", conflict: "", crowd: "", title: "", transform: "" },
    melodyConcept: { story: "", role: "", motion: "", hook: "" },
    arrangement: "",
    vocalProfile: "auto",
    lyrics: { text: "", seed: 0, nonces: {}, edited: false },
    instrumental: true, vocalMode: false,
    layers: {}, locks: defaultLocks(), hidden: defaultHidden(),
    weirdness: 50, influence: "balanced", duration: "standard", melodicForce: "balanced", slim: false, structure: false,
    acidAmt: 60, driveAmt: 75,
    styleFit: true, lastFitGenre: "", noHandPerc: false,
    soundLite: false, noStop: false, hideBeats: false,
    maxStyle: false
  };
}

