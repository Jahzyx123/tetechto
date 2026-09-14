/* engine/prompt.js — prompt assembly, sanitising and budgets.
   Ported 1:1 from the legacy engine:
   - assemble(): priority/required/compact-variant block system. Compact
     every block first, then drop optional blocks lowest-priority-first,
     then hard-clamp at a clause boundary as a last resort — never
     mid-phrase, never mid-word.
   - sanitize(): drops whole clauses containing banned low-energy words
     (BANNED_MINIMAL) or vocal references when instrumental-only is on.
   - buildStylePrompt(): hard cap 1000 chars (Suno 5.5 style box).
   - buildFullBrief(): hard cap 3000 chars.
   All builders take the state object explicitly. */
import { SAFETY_LINE, BANNED_MINIMAL, VOCAL_WORDS, LAYERS, VOCAL_DIRECTIONS } from "../data/safety.js";
import { EXTRA_VOCAL_DIRECTIONS_W2 } from "../data/expansion2.js";
import { hasHandPerc, NO_STOP_BAD_RE } from "./state.js";
import { ARC_TEMPLATES } from "../data/concept.js";
import { MELODY_FORCE } from "../data/scales.js";
import { COUNTER_ROLE, VOICE_ROLE } from "../data/atoms.js";
import { pick } from "./prng.js";
import { keyName, camelot, scaleOf, microOf } from "./music.js";
import { genreWorld, genreSafeText } from "./world.js";

/* Vocal direction wave two: the verbatim list plus the generated wave
   (vocal words are intentional here — vocal mode is user-selected). */
const _vdBase = VOCAL_DIRECTIONS.map(x => String(x).toLowerCase().trim());
export const VOCAL_DIRECTIONS_ALL = VOCAL_DIRECTIONS.concat(
  EXTRA_VOCAL_DIRECTIONS_W2.filter(x => !_vdBase.includes(String(x).toLowerCase().trim())));

const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.join("|") + ")\\b", "i");
export function hasVocalRef(text) { return VOCAL_RE.test(text); }

/* ---------------------------- SAFETY / BUDGET ---------------------------- */
const CLAUSE_LABEL_RE = /^([A-Z][A-Za-z&\- ]{1,28}:)\s*/;
export function isDirty(s, low) {
  if (s.instrumental && hasVocalRef(low)) return true;
  /* Safety net for the no-hand-percussion toggle. Filtering poolFor() covers
     rolled atoms, but fixed prose, arrangement templates and spark lines
     reach the prompt without passing through a pool. */
  if (s.noHandPerc && hasHandPerc(low)) return true;
  for (const b of BANNED_MINIMAL) { if (low.includes(b)) return true; }
  return false;
}
export function sanitize(s, text) {
  const clauses = text.split(/(?<=[.;,])\s+/);
  const out = [];
  let pendingLabel = "";
  for (let cl of clauses) {
    const labelMatch = cl.match(CLAUSE_LABEL_RE);
    if (isDirty(s, cl.toLowerCase())) {
      if (labelMatch) pendingLabel = labelMatch[1] + " ";
      continue;
    }
    if (pendingLabel && !labelMatch) {
      cl = pendingLabel + cl.charAt(0).toLowerCase() + cl.slice(1);
    }
    pendingLabel = "";
    out.push(cl);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}
export function assemble(blocks, budget, sep) {
  let text = blocks.map(b => b.t).filter(Boolean).join(sep);
  if (text.length <= budget) return text;
  /* compact-first pass: shrink EVERY block to its compact form before
     dropping any — packs far more sound detail into the same budget */
  if (blocks.some(b => b.compact && b.t !== b.compact)) {
    const alt = blocks.map(b => (b.compact && b.t !== b.compact) ? { t: b.compact, compact: b.compact, required: b.required, priority: b.priority } : b);
    const t2 = alt.map(x => x.t).filter(Boolean).join(sep);
    if (t2.length <= budget) { return t2; }
    blocks = alt;
    text = t2;
  }
  for (const b of blocks) {
    if (b.compact && b.t !== b.compact) {
      b.t = b.compact;
      text = blocks.map(x => x.t).filter(Boolean).join(sep);
      if (text.length <= budget) return text;
    }
  }
  const ordered = blocks.slice().sort((a, b) => (a.priority || 0) - (b.priority || 0));
  for (const b of ordered) {
    if (b.required) continue;
    b.t = "";
    text = blocks.map(x => x.t).filter(Boolean).join(sep);
    if (text.length <= budget) return text;
  }
  if (text.length > budget) {
    let cut = text.slice(0, budget);
    const m = cut.match(/^(.*[.;,])/);
    if (m && m[1].length > budget * 0.5) cut = m[1].trim();
    text = cut.replace(/[,;.\s]+$/, "");
  }
  return text;
}

/* ---------------------------- DENSE PACKING ----------------------------
   assemble() guarantees we fit the budget, but it gets there by compacting
   and dropping — which used to leave 100-300 characters of the Suno style
   box unused while a dozen rolled sounds never made it into the prompt.

   densify() runs afterwards and spends every remaining character: it walks
   the rolled sound atoms that aren't in the text yet, in musical-importance
   order, and appends each one to its section clause (or to a trailing
   "Sound:" clause) as long as it still fits. Nothing is ever truncated
   mid-phrase — a fragment either fits whole or is skipped and the next,
   shorter one is tried. */

/* every rolled sound atom that can be packed, best-first */
export const PACK_ORDER = [
  ["Feel", ["feeling", "flavor", "direction"]],
  ["Drums", ["kick", "hats", "snare", "clapLayer", "perc", "toms", "rideType", "crashType", "percFill", "groove", "swing", "sync", "rhythmPattern", "intensity", "ghostNotes", "humanizeType", "pocketType"]],
  ["Bass", ["bassVoice", "bassMovement", "bassRel"]],
  ["Lead", ["leadVoice", "leadPerf", "contour", "rhythm", "ornamentType", "vibratoType", "portamentoType", "scaleRun", "intervalLeap"]],
  ["Harmony", ["harmony", "chordColor", "arpeggio", "chordProg", "voicingType", "inversionType", "tensionType", "resolutionType"]],
  ["Ensemble", ["technoDrive", "technoAcid", "technoTexture", "technoRave", "technoIndustrial"]],
  ["Tone", ["filterType", "filterCutoff", "filterResonance", "envelopeType", "lfoType", "distortionType", "saturationType", "reverbType", "reverbSize", "reverbDecay", "delayType", "delayTime", "delayFeedback", "sidechainType", "sidechainCurve", "stereoType", "fxChain", "soundIntensity"]],
  ["Mix", ["mixDensity", "mixEnergy", "mixSpace", "mixGlue", "mixPunch", "eqType", "compressionType", "masterDrive", "masterLoudness", "masterColor", "masterChain"]],
  ["Space", ["stereoImage", "stereoWidth", "stereoEnhance", "spatialDepth", "spatialMovement", "modSource", "modDest", "modRate", "modDepth"]],
  ["Texture", ["textureLayer", "grainType", "shimmerType", "atmosphereType"]],
  ["FX", ["fxType", "transitionType", "riserType", "impactType", "chopType"]],
  ["Arc", ["energyCurve", "buildType", "dropType", "sectionDensity"]]
];
/* PACK_ORDER labels that describe sound design / FX. Under SOUND-LITE
   their cards are hidden, but their values are still packed as backfill
   after every melody / pattern section had its turn. */
export const SOUND_LITE_LABELS = new Set(["Ensemble", "Tone", "Mix", "Space", "Texture", "FX", "Arc"]);

/* which card must be visible for a group to be packed */
const PACK_CARD = {
  "Feel": "feelCard", "Drums": "drumsCard", "Bass": "bassCard", "Lead": "feelCard", "Harmony": "feelCard",
  "Ensemble": "technoLabCard", "Tone": "soundDesignCard", "Mix": "mixMasterCard",
  "Space": "spatialModCard", "Texture": "spatialModCard", "FX": "textureFxCard", "Arc": "textureFxCard"
};

/* Legacy pools contain degenerate phrases where an expansion suffix was
   appended to a word that already ended the phrase — "driving drive",
   "master drive drive", "filter drive pressure". They read badly AND they
   waste characters that could carry another sound, so collapse them at
   pack time. The pools on disk stay verbatim. */
const FILLER = "force|drive|pressure";
/* The word "live" must never reach the output: Suno reads it as a concert
   recording. Pool values and a few verbatim style names carry it, so it is
   rewritten at output rather than by editing the verbatim pools. Compound
   forms get a sensible replacement instead of being cut to a fragment
   ("Live-Room Jazz" -> "Room-Recorded Jazz", not "Room Jazz"). */
export function stripLive(v) {
  let t = String(v || "");
  t = t.replace(/\blive-room\b/gi, m => m[0] === "L" ? "Room-Recorded" : "room-recorded");
  t = t.replace(/\blive-jam\b/gi, m => m[0] === "L" ? "Jam" : "jam");
  t = t.replace(/\blive-band\b/gi, m => m[0] === "L" ? "Band" : "band");
  t = t.replace(/\blive-drummer\b/gi, m => m[0] === "L" ? "Drummer" : "drummer");
  t = t.replace(/\bsampled-and-live\b/gi, m => m[0] === "S" ? "Sampled" : "sampled");
  t = t.replace(/\blive\b[ -]?/gi, "");
  return t.replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
}

export function tightenPhrase(v) {
  let t = String(v || "");
  t = t.replace(new RegExp("\\b(" + FILLER + ")(\\s+(?:" + FILLER + "))+\\b", "gi"), "$1");
  t = t.replace(/\b(\w+)ing\s+\1\b/gi, "$1ing");
  t = t.replace(new RegExp("\\b(\\w+)\\s+\\1\\b", "gi"), "$1");
  return t.replace(/\s+/g, " ").trim();
}

/* Suno hears a human vocal cue in prompt words that have nothing to do
   with singing — "voicing" (a harmony term), "hoover" (a rave lead-saw),
   "hum" (machinery), "song" (a melody), whistle, choir, chant, and so on —
   and answers with ad-libs: "hey", "houuu", vocal background, lyrics.

   This is the single output-time rewrite point: every pool value flows
   through here before it reaches the prompt, so no data file has to change.
   Each replacement keeps the musical meaning (tenor sax -> sax, train
   whistle -> train horn, hum -> drone) and every rule is idempotent, so
   calling it again on already-rewritten text is a no-op.

   Two things are NEVER rewritten: the explicit negated no-vocals policy
   ("no vocals, no lyrics, no chants, no choir...") and the vocal-mode-only
   directions (VOCAL_DIRECTIONS). Both are parked on sentinel placeholders
   before any rule runs and restored untouched at the end. */
export function stripVocalCue(text) {
  let t = String(text || "");
  const cap1 = (m, c) => m[0] === m[0].toUpperCase() && m === m.toUpperCase()
    ? c.toUpperCase()
    : m[0] === m[0].toUpperCase()
      ? c.charAt(0).toUpperCase() + c.slice(1) : c;
  /* --- protect policy lines: the negated no-vocals line and any "vocal:"
     direction line are the only places those words are intended, so they
     must survive every rule below byte-for-byte. --- */
  const keep = [];
  const park = (m) => { keep.push(m); return "\u0001" + (keep.length - 1) + "\u0001"; };
  /* \u0001 is a deliberate placeholder token the sanitizer parks/restores with. */
  // eslint-disable-next-line no-control-regex
  const unPark = (x) => x.replace(/\u0001(\d+)\u0001/g, (m, i) => keep[+i] !== undefined ? keep[+i] : m);
  t = t.replace(/\bvocal:\s*[^.!?\n]*/gi, park);
  t = t.replace(/\bno\s+(?:vocals?|lyrics?|screaming|screams?|chants?|choirs?|spoken|shouts?|singing|songs?|verses?|choruses?)[^.!?\n]*/gi, park);

  /* "chord voicings" -> "chord spreads" / "chord voicing" -> "chord spread"
     (never "chord chord spreads") */
  t = t.replace(/\b(chords?)\s+voicings?\b/gi, (m, c) => cap1(m, c + (/s$/i.test(m) ? " spreads" : " spread")));
  /* every remaining "voicing(s)" is a harmony arrangement term */
  t = t.replace(/\bvoicings?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "chord spreads" : "chord spread"));
  t = t.replace(/\bvoice[\s-]+led\b/gi, (m) => cap1(m, "smoothly-led"));
  t = t.replace(/\bvocal-like\b/gi, (m) => cap1(m, "humanized"));
  /* "singable" is a melody descriptor (catchy/melodic), not an instruction
     to add a voice — but Suno reads it as singing, so neutralize it. */
  t = t.replace(/\bsingable\b/gi, (m) => cap1(m, "melodic"));
  /* "barbershop-style voicings" is a close-harmony arrangement term, but
     barbershop is first and foremost a cappella quartet style — Suno reads
     it as vocals, so neutralize the ensemble cue. */
  t = t.replace(/\bbarbershop-style\b/gi, (m) => cap1(m, "close-harmony"));
  t = t.replace(/\bvocal\s+formant\b|\bformant\s+vocal\b/gi, (m) => cap1(m, "formant"));

  /* ================= second wave: the full vocal-cue audit =================
     Phrase rules first (they keep grammar and register), then the generic
     word rules. Everything is case-preserving and idempotent. */

  /* hoover = rave lead-saw (Hoover Techno, hoover stabs/bass/blasts) */
  t = t.replace(/\bhoovers?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "super-saws" : "super-saw"));

  /* hum = machinery/melody drone, never a hummed vocal */
  t = t.replace(/\bhums\s+a\s+lullaby\b/gi, (m) => cap1(m, "drones a cradle pulse"));
  t = t.replace(/\ba\s+lullaby\s+a\s+machine\s+hums\s+to\s+itself\b/gi, (m) => cap1(m, "a cradle pulse a machine drones to itself"));
  t = t.replace(/\bhums?\s+(?:the|a)\s+melody\b/gi, (m) => cap1(m, "shadows " + (/\bthe\b/i.test(m) ? "the" : "a") + " melody"));
  t = t.replace(/\byou\s+can\s+hum\b/gi, (m) => cap1(m, "you can carry"));
  t = t.replace(/\byou\s+hum\b/gi, (m) => cap1(m, "you carry"));
  t = t.replace(/\bhumming\b/gi, (m) => cap1(m, "droning"));
  t = t.replace(/\bhummed\b/gi, (m) => cap1(m, "droned"));
  t = t.replace(/\bhums?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "drones" : "drone"));

  /* song(s) = melody/piece; Songkran and Songo stay (no word boundary) */
  t = t.replace(/\bsong\s+length\b/gi, (m) => cap1(m, "track length"));
  t = t.replace(/\bsongs?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "melodies" : "melody"));

  /* hymn/psalm = sacred anthem (MACHINE HYMN, Engine-Room Hymn) */
  t = t.replace(/\bhymns?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "anthems" : "anthem"));
  t = t.replace(/\bpsalms?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "anthems" : "anthem"));

  /* gospel = church-approved groove (gospel kit/kick/harmony, Gospel Neo-Soul) */
  t = t.replace(/\bgospel\b/gi, (m) => cap1(m, "church"));

  /* opera house = concert hall; space opera = space saga; operatic = theatrical */
  t = t.replace(/\bopera[\s-]+house\b/gi, (m) => cap1(m, "concert-hall"));
  t = t.replace(/\bspace\s+opera\b/gi, (m) => cap1(m, "space saga"));
  t = t.replace(/\bopera\s+soprano\b/gi, (m) => cap1(m, "concert-hall high"));
  t = t.replace(/\boperatic\b/gi, (m) => cap1(m, "theatrical"));
  t = t.replace(/\bopera\b/gi, (m) => cap1(m, "concert"));

  /* throat = overtone/growl texture (Tuvan Throat, full-throated energy) */
  t = t.replace(/\b(Mongolian|Tuvan)\s+throat\b/gi, (m, g) => cap1(m, g + " overtone"));
  t = t.replace(/\bthroat\s+singing\b/gi, (m) => cap1(m, "overtone"));
  t = t.replace(/\bthroat\s+wind\b/gi, (m) => cap1(m, "overtone wind"));
  t = t.replace(/\bfull-throated\b/gi, (m) => cap1(m, "full-bodied"));
  t = t.replace(/\bthroaty\b/gi, (m) => cap1(m, "growl"));

  /* vocal registers on instruments = register adjectives (soprano/tenor/
     alto/baritone). "Partido Alto" is a samba rhythm, not a register. */
  t = t.replace(/\b(?:tenor|alto|baritone|soprano)\s+saxophones?\b/gi, (m) => cap1(m, "saxophone"));
  t = t.replace(/\b(?:tenor|alto|baritone|soprano)\s+sax\b/gi, (m) => cap1(m, "sax"));
  t = t.replace(/\bbaritone[\s-]+sax\b/gi, (m) => cap1(m, "sax"));
  t = t.replace(/\bbaritone\s+guitar\b/gi, (m) => cap1(m, "low guitar"));
  t = t.replace(/\bbaritone\s+synth\b/gi, (m) => cap1(m, "low synth"));
  t = t.replace(/\balto\s+flute\b/gi, (m) => cap1(m, "flute"));
  t = t.replace(/\bpartido\s+alto\b/gi, (m) => cap1(m, "partido"));
  t = t.replace(/\bbaritone\b/gi, (m) => cap1(m, "low"));
  t = t.replace(/\balto\b/gi, (m) => cap1(m, "bright"));
  t = t.replace(/\btenor\b/gi, (m) => cap1(m, "mellow"));
  t = t.replace(/\bsoprano\b/gi, (m) => cap1(m, "bright"));

  /* croon = mellow; singing bowl = resonant bowl */
  t = t.replace(/\bcrooners?\b/gi, (m) => cap1(m, "mellow"));
  t = t.replace(/\bcrooning\b/gi, (m) => cap1(m, "mellow"));
  t = t.replace(/\bcroon\b/gi, (m) => cap1(m, "mellow tone"));
  t = t.replace(/\bsinging\s+bowls?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "resonant bowls" : "resonant bowl"));
  t = t.replace(/\bsings?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "rings" : "ring"));
  t = t.replace(/\bsinging\b/gi, (m) => cap1(m, "resonant"));

  /* chorus = arrangement drop / ensemble effect (chorus delay, chorused bass) */
  t = t.replace(/\bchorus\s+delay\b/gi, (m) => cap1(m, "ensemble delay"));
  t = t.replace(/\bchorus\s+(?:fx|effect)\b/gi, (m) => cap1(m, "ensemble " + (/\bfx\b/i.test(m) ? "fx" : "effect")));
  t = t.replace(/\bchorused\b/gi, (m) => cap1(m, "detuned"));
  t = t.replace(/\bchorus(?:es)?\b/gi, (m) => cap1(m, /(?:es)$/i.test(m) ? "drops" : "drop"));
  /* verse = song-section word, same cue family (verse -> section) */
  t = t.replace(/\bverses?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "sections" : "section"));

  /* choir = ensemble pad; formant choir = shaper; choral = ensemble */
  t = t.replace(/\bformant\s+choir\b/gi, (m) => cap1(m, "formant shaper"));
  t = t.replace(/\bchoir-?backed\b/gi, (m) => cap1(m, "ensemble-backed"));
  t = t.replace(/\bchoral\b/gi, (m) => cap1(m, "ensemble"));
  t = t.replace(/\bchoirs?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "ensembles" : "ensemble"));

  /* chant = rave swell (stadium rave chant -> stadium rave swell) */
  t = t.replace(/\bstadium\s+rave\s+chant\b/gi, (m) => cap1(m, "stadium rave swell"));
  t = t.replace(/\bchanting\b/gi, (m) => cap1(m, "swelling"));
  t = t.replace(/\bchants?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "swells" : "swell"));

  /* lullaby = cradle pulse (Turbine Lullaby, Music Box Lullaby Gear) */
  t = t.replace(/\blullab(?:y|ies)\b/gi, (m) => cap1(m, /s$/i.test(m) ? "cradles" : "cradle"));

  /* doowop = jukebox nostalgia */
  t = t.replace(/\bdoo-?wops?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "jukeboxes" : "jukebox"));

  /* whistle = pipes/horn/flute (train whistle -> train horn, Penny Whistle
     -> Penny Pipes, Whistling Western -> Harmonica Western) */
  t = t.replace(/\bpenny\s+whistles?\b/gi, (m) => cap1(m, "penny pipes"));
  t = t.replace(/\bceltic\s+whistles?\b/gi, (m) => cap1(m, "celtic pipes"));
  t = t.replace(/\bwhistling\s+western\b/gi, (m) => cap1(m, "harmonica western"));
  t = t.replace(/\btrain\s+whistles?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "train horns" : "train horn"));
  t = t.replace(/\bkettle\s+whistles?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "kettle rings" : "kettle ring"));
  t = t.replace(/\bslide\s+whistles?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "slide flutes" : "slide flute"));
  t = t.replace(/\bfactory\s+whistles?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "factory horns" : "factory horn"));
  t = t.replace(/\bwhistle\s+stop\b/gi, (m) => cap1(m, "flag stop"));
  t = t.replace(/\byou\s+whistle\b/gi, (m) => cap1(m, "you carry"));
  t = t.replace(/\bwhistling\b/gi, (m) => cap1(m, "piping"));
  t = t.replace(/\bwhistles?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "pipes" : "pipe"));

  /* sigh = pause (Gravity of a Sigh -> Gravity of a Pause) */
  t = t.replace(/\bsighs?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "pauses" : "pause"));

  /* call-and-response = instrumental trading (question-answer) */
  t = t.replace(/\bcall[\s-]+and[\s-]+response\b/gi, (m) => cap1(m, "question-answer"));

  /* voice/vocal = lead line (never the parked policy or directions) */
  t = t.replace(/\bunder\s+the\s+vocal\b/gi, (m) => cap1(m, "under the lead"));
  t = t.replace(/\bbehind\s+the\s+vocal\b/gi, (m) => cap1(m, "behind the lead"));
  t = t.replace(/\bthe\s+melody\s+is\s+a\s+voice\s+arriving\b/gi, (m) => cap1(m, "the melody arrives like a guest"));
  t = t.replace(/\btwo\s+voices\s+learning\s+each\s+other'?s\s+names\b/gi, (m) => cap1(m, "two lines learning each other's names"));
  t = t.replace(/\bvocals?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "leads" : "lead"));
  t = t.replace(/\bvoices?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "lines" : "line"));

  /* breath = pulse/airy (breathing curve -> pulsing curve, breathy flute ->
     airy flute, breath control -> pulse control) */
  t = t.replace(/\bhuman\s+breath\s+groove\b/gi, (m) => cap1(m, "human-groove pulse"));
  t = t.replace(/\bno[\s-]?breath\s+build\b/gi, (m) => cap1(m, "no-pause build"));
  t = t.replace(/\bbreathy\b/gi, (m) => cap1(m, "airy"));
  t = t.replace(/\bbreath-?like\b/gi, (m) => cap1(m, "pulse-like"));
  t = t.replace(/\bbreathing\b/gi, (m) => cap1(m, "pulsing"));
  t = t.replace(/\bbreathes?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "pulses" : "pulse"));
  t = t.replace(/\bbreathed\b/gi, (m) => cap1(m, "pulsed"));
  t = t.replace(/\bbreathe\b/gi, (m) => cap1(m, "pulse"));
  t = t.replace(/\bbreath\b/gi, (m) => cap1(m, "pulse"));

  /* word/talk = note/broadcast/signal (one word of direction -> one note,
     weather radio with no words -> no broadcast, towers talk -> signal) */
  t = t.replace(/\bwith\s+no\s+words?\b/gi, (m) => cap1(m, "with no broadcast"));
  t = t.replace(/\bone\s+word\s+of\s+direction\b/gi, (m) => cap1(m, "one note of direction"));
  t = t.replace(/\bfind\s+the\s+single\s+word\b/gi, (m) => cap1(m, "find the single note"));
  t = t.replace(/\btowers?\s+talk\b/gi, (m) => cap1(m, /\btowers\b/i.test(m) ? "towers signal" : "tower signals"));

  /* crowd = festival energy (Crowd Surge, crowd silence as percussion) */
  t = t.replace(/\bcrowds?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "festivals" : "festival"));

  /* shout/scream/cheer/whisper = dynamics, not voices (screaming distortion
     -> scorching distortion, hook that shouts -> surges, whisper -> hush) */
  t = t.replace(/\bsounds?\s+like\s+a\s+cheer\b/gi, (m) => cap1(m, "sounds like a flare"));
  t = t.replace(/\bscreaming\s+distortion\b/gi, (m) => cap1(m, "scorching distortion"));
  t = t.replace(/\bscreaming\s+resonance\b/gi, (m) => cap1(m, "scorching resonance"));
  t = t.replace(/\bscreaming\b/gi, (m) => cap1(m, "scorching"));
  t = t.replace(/\bscreams?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "scorches" : "scorch"));
  t = t.replace(/\bshouting\b/gi, (m) => cap1(m, "surging"));
  t = t.replace(/\bshouts?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "surges" : "surge"));
  t = t.replace(/\bwhispering\b/gi, (m) => cap1(m, "hushing"));
  t = t.replace(/\bwhispers?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "hushes" : "hush"));

  /* aria = showpiece (Aria Pop -> Showpiece Pop) */
  t = t.replace(/\barias?\b/gi, (m) => cap1(m, /s$/i.test(m) ? "showpieces" : "showpiece"));

  return unPark(t);
}


/* Inside a labelled clause the label already says what the sound is, so
   the noun repeated in every value is pure overhead: "Bass: searing FM
   bass, rolling octave bass line" -> "Bass: searing FM, rolling octave
   line". Only applied to values being packed under a matching label, and
   never when it would leave nothing behind. */
const LABEL_NOUN = {
  Bass: /\s+bass\b/i,
  Lead: /\s+lead\b/i,
  Drums: /\s+(?:drum|drums)\b/i,
  Harmony: /\s+(?:harmony|chords)\b/i
};
export function dropLabelNoun(label, v) {
  const re = LABEL_NOUN[label];
  if (!re) return v;
  const out = String(v).replace(re, "").replace(/\s+/g, " ").trim();
  return out.length >= 3 ? out : v;
}

export function densify(s, body, budget) {
  let out = body;
  /* In no-techno mode the body has already been genre-rewritten, so a raw
     pool value ("synth-driven hook") won't match its rewritten form
     ("driven hook") and would be packed in twice. Compare — and insert —
     the rewritten text. */
  const fit = v => tightenPhrase(stripVocalCue(!s.techOnly ? genreSafeText(s, String(v), true) : String(v)));
  const has = v => out.toLowerCase().includes(String(v).toLowerCase());

  /* collect everything still missing, grouped, shortest-first.
     Hidden sound cards are collected into a SEPARATE backfill list under
     SOUND-LITE: they only enter the prompt after every visible section
     has had its turn — "hide it, but make it appear if there is space". */
  const groups = [], backfill = [];
  for (const [label, keys] of PACK_ORDER) {
    const card = PACK_CARD[label];
    const parked = !!(card && s.hidden[card]);
    if (parked && !(s.soundLite && SOUND_LITE_LABELS.has(label))) continue;
    const vals = [];
    for (const k of keys) {
      const v = s[k];
      if (!v || typeof v !== "string") continue;
      if (isDirty(s, v.toLowerCase())) continue;
      /* No-stop never packs appearance cues, even if a value slipped in
         (manual pick, old snapshot): half-time, lazy, rolls, fills,
         drops, risers, edits… all make the song sound sectioned. */
      if (s.noStop && NO_STOP_BAD_RE.test(v)) continue;
      /* HIDE-BEATS never packs the instrument name back: the style owns
         the voice ("Solo Guitar Play"), so the melody block must stay
         pure pattern text. */
      if (s.hideBeats && k === "leadVoice") continue;
      const w = fit(v);
      if (!w || has(w) || vals.includes(w)) continue;
      vals.push(w);
    }
    if (vals.length) {
      vals.sort((a, b) => a.length - b.length);   // three short sounds beat one long one
      (parked ? backfill : groups).push({ label, vals, open: false });
    }
  }
  if (!groups.length && !backfill.length) return out;

  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /* [^.] would stop at the decimal in "2.5s decay" and splice text into
     the middle of a value; only treat ". " (period + space) as a break. */
  const clauseRe = label => new RegExp("((?:^|\\. )" + esc(label) + ":(?:[^.]|\\.(?! ))*)", "i");
  for (const g of groups) g.open = clauseRe(g.label).test(out);

  /* append `v` to g's clause (cheap: ", v") or start the clause (costly:
     ". Label: v"). Returns false if it wouldn't fit. */
  function place(g, vRaw) {
    const v = g.open ? dropLabelNoun(g.label, vRaw) : vRaw;
    const cost = g.open ? 2 + v.length : 2 + g.label.length + 2 + v.length;
    if (out.length + cost > budget) return false;
    if (g.open) {
      const re = clauseRe(g.label);
      if (re.test(out)) out = out.replace(re, m => m + ", " + v);
      else out += ", " + v;
    } else {
      out += ". " + g.label + ": " + v;
      g.open = true;
    }
    return true;
  }

  /* Pass 1 — round-robin one item per section, so every part of the kit
     gets represented before any single section goes deep. */
  let progress = true;
  while (progress) {
    progress = false;
    for (const g of groups) {
      if (!g.vals.length) continue;
      if (place(g, g.vals[0])) { g.vals.shift(); progress = true; }
      else break;                                  // nothing shorter will fit either
    }
  }

  /* Pass 2 — spend the leftovers globally shortest-first, preferring
     sections whose clause already exists (no label to pay for). This is
     what turns the last ~80 characters into 2-4 extra sounds instead of
     dead space. */
  const rest = [];
  for (const g of groups) for (const v of g.vals) rest.push({ g, v });
  rest.sort((a, b) => (a.g.open ? a.v.length : a.v.length + a.g.label.length) -
                      (b.g.open ? b.v.length : b.v.length + b.g.label.length));
  for (const { g, v } of rest) { if (has(v)) continue; place(g, v); }

  /* Pass 3 — SOUND-LITE backfill. The parked sound-design sections only
     get packed now, and only as long as characters remain: style /
     melody / pattern content always wins; FX details appear strictly if
     there is space. */
  if (backfill.length) {
    let bp = true;
    while (bp) {
      bp = false;
      for (const g of backfill) {
        if (!g.vals.length) continue;
        if (place(g, g.vals[0])) { g.vals.shift(); bp = true; }
        else break;
      }
    }
    const restB = [];
    for (const g of backfill) for (const v of g.vals) restB.push({ g, v });
    restB.sort((a, b) => (a.g.open ? a.v.length : a.v.length + a.g.label.length) -
                         (b.g.open ? b.v.length : b.v.length + b.g.label.length));
    for (const { g, v } of restB) { if (has(v)) continue; place(g, v); }
  }

  return out;
}

/* A clause whose values were all stripped by the sanitizer leaves a bare
   label ("Emotion: Lead: ..."). Drop those empty labels. */
function dropEmptyLabels(text) {
  return String(text || "")
    .replace(/(^|\. )([A-Z][A-Za-z&/\- ]{1,14}):\s*(?=[A-Z][A-Za-z&/\- ]{1,14}:)/g, "$1")
    .replace(/(^|\. )([A-Z][A-Za-z&/\- ]{1,14}):\s*(?=\.|$)/g, "$1");
}
export function normalizePrompt(text) {
  let t = dropEmptyLabels(String(text || ""));
  t = stripLive(t);
  t = stripVocalCue(t);
  t = tightenPhrase(t);
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/(\.|,)\s*(?=\.|,)/g, ".").replace(/\.{2,}/g, ".");
  t = t.replace(/,\s*,/g, ",");
  t = t.replace(/\banthemic unforgettable hook\b/g, "unforgettable hook");
  return t.trim();
}

/* ---------------------------- LINE BUILDERS ---------------------------- */
export function cleanFrag(s, v) { return (v && !isDirty(s, String(v).toLowerCase())) ? v : ""; }
export function firstClean(s, ...vals) { for (const v of vals) { const c = cleanFrag(s, v); if (c) return c; } return ""; }

export function styleLine(s) {
  let out = s.primaryStyle;
  if (s.secondaryStyle) {
    if (s.influence === "subtle") out += " with a touch of " + s.secondaryStyle;
    else if (s.influence === "strong") out += " fused with " + s.secondaryStyle;
    else out += " with " + s.secondaryStyle + " influence";
  }
  if (!s.techOnly) {
    const world = genreWorld(s.primaryGenre);
    if (world === "organic") out += " — acoustic instrumentation";
    else if (world === "hybrid") out += " — acoustic and electronic hybrid instrumentation";
  }
  if (!s.hidden.bpm) out += ", " + s.bpm + " BPM";
  if (!s.hidden.key) out += ", " + keyName(s);
  return out;
}
export function emotionLine(s) {
  return "Emotion-led melody: " + s.feeling + " melody; " + s.flavor + "; direction: " + s.direction;
}
export function melodyLine(s) {
  const f = s.melodicForce || "balanced";
  /* HIDE-BEATS: only the melody PATTERN survives — no instrument name
     (the style owns the voice), no counter line. The style line carries
     the instrument ("Solo Guitar Play"), so the Lead block stays pure
     pattern text. */
  if (s.hideBeats) {
    const parts = [s.leadPerf, s.contour, s.rhythm, s.ornamentType, s.vibratoType,
      s.portamentoType, s.scaleRun, s.intervalLeap].filter(Boolean);
    return parts.length ? "Lead: " + parts.join(", ") : "";
  }
  if (f === "light") {
    const mLight = microOf(s.microMelody);
    return "Lead: " + s.leadVoice + (mLight.desc ? ", " + mLight.desc : "") + ". Harmony: " + s.harmony;
  }
  const lead = s.leadVoice + ", " + s.leadPerf + "; " + s.contour + "; " + s.rhythm;
  const harm = s.harmony + ", " + s.chordColor + "; " + s.arpeggio;
  const mm = microOf(s.microMelody);
  const micro = mm.desc ? ", " + mm.desc : "";
  if (f === "strong") return "Melody-driven: " + lead + micro + ". Harmony: " + harm;
  if (f === "dominant") { const hk = cleanFrag(s, (s.melodyConcept && s.melodyConcept.hook) || ""); return "Melody-dominant anthem: " + lead + micro + (hk ? " — hook: " + hk : "") + ". Harmony: " + harm; }
  return "Lead: " + lead + micro + ". Harmony: " + harm;
}
export function melodyConceptLine(s, compact) {
  const mc = s.melodyConcept || {};
  if (!mc.story && !mc.hook) return "";
  if (compact) return "Melody concept: " + firstClean(s, mc.hook, mc.story);
  const parts = [mc.story, mc.hook, mc.motion].map(v => cleanFrag(s, v)).filter(Boolean);
  return parts.length ? "Melody concept: " + parts.join("; ") : "";
}
export function bassLine(s) {
  let out = "Bass: " + s.bassVoice + ", " + s.bassMovement + ", " + s.bassRel;
  const mb = microOf(s.microBass);
  if (mb.desc) out += ", " + mb.desc;
  return out;
}
export function technoLabLine(s, compact) {
  const parts = [];
  if (s.technoDrive) parts.push(s.technoDrive);
  if (s.technoAcid) parts.push(s.technoAcid);
  if (s.technoTexture) parts.push(s.technoTexture);
  if (s.technoRave) parts.push(s.technoRave);
  if (s.technoIndustrial) parts.push(s.technoIndustrial);
  if (!parts.length) return "";
  /* the label follows the genre world: "Techno Lab" only in techno mode */
  const lab = s.techOnly ? "Techno Lab" : "Ensemble";
  if (compact) return lab + ": " + parts.slice(0, 2).join(", ");
  return lab + ": " + parts.join(", ") + (s.acidAmt ? ", acid " + s.acidAmt + "%" : "") + (s.driveAmt ? ", drive " + s.driveAmt + "%" : "");
}
export function counterMelodyLine(s) {
  if (s.noStop || s.hideBeats) return "";
  const cm = s.counterMelody; if (!cm || !cm.voice) return "";
  const rel = COUNTER_ROLE[s.counterMelodyRelation] || COUNTER_ROLE.supports;
  return "Counter-melody: " + cm.voice + ", " + cm.direction + ", " + cm.perf + ", " + cm.contour + ", " + cm.rhythm + "; " + rel;
}
export function voiceConceptLine(s) {
  if (s.noStop || s.hideBeats) return "";
  const vc = s.voiceConcept; if (!vc || !vc.voice) return "";
  const rel = VOICE_ROLE[s.voiceRelation] || VOICE_ROLE.supports;
  return "Second line: " + vc.voice + ", " + vc.movement + "; " + rel;
}
export function drumLine(s, compact) {
  if (compact) {
    return "Drums: " + [s.kick, s.hats, s.snare, s.perc, s.groove, s.swing, s.sync].filter(Boolean).join(", ");
  }
  return "Drums: " + [s.kick, s.hats, s.snare, s.perc, s.toms, s.groove, s.swing, s.sync, s.intensity].filter(Boolean).join(", ");
}
export function soundDesignLine(s, compact) {
  const parts = [];
  if (s.filterType) parts.push(s.filterType);
  if (s.envelopeType) parts.push(s.envelopeType);
  if (s.lfoType) parts.push(s.lfoType);
  if (s.distortionType) parts.push(s.distortionType);
  if (s.reverbType) parts.push(s.reverbType);
  if (s.delayType) parts.push(s.delayType);
  if (s.sidechainType) parts.push(s.sidechainType);
  if (s.stereoType) parts.push(s.stereoType);
  if (s.fxChain) parts.push(s.fxChain);
  if (!parts.length) return "";
  if (compact) return "Sound Design: " + parts.slice(0, 3).join(", ");
  return "Sound Design: " + parts.join(", ") + (s.soundIntensity ? ", " + s.soundIntensity : "");
}
export function chordProgLine(s) { return s.chordProg ? "Chord Progression: " + s.chordProg : ""; }
export function rhythmPatternLine(s) { return s.rhythmPattern ? "Rhythm Pattern: " + s.rhythmPattern : ""; }
export function mixMasterLine(s, compact) {
  const parts = [];
  if (s.mixDensity) parts.push(s.mixDensity);
  if (s.mixEnergy) parts.push(s.mixEnergy);
  if (s.mixSpace) parts.push(s.mixSpace);
  if (s.mixGlue) parts.push(s.mixGlue);
  if (s.mixPunch) parts.push(s.mixPunch);
  if (s.masterDrive) parts.push(s.masterDrive);
  if (s.masterLoudness) parts.push(s.masterLoudness);
  if (s.masterColor) parts.push(s.masterColor);
  if (s.masterChain) parts.push(s.masterChain);
  if (!parts.length) return "";
  if (compact) return "Mix/Master: " + parts.slice(0, 3).join(", ");
  return "Mix/Master: " + parts.join(", ") + (s.filterCutoff ? ", cutoff " + s.filterCutoff : "") + (s.filterResonance ? ", resonance " + s.filterResonance : "") + (s.eqType ? ", EQ " + s.eqType : "") + (s.compressionType ? ", comp " + s.compressionType : "") + (s.saturationType ? ", sat " + s.saturationType : "") + (s.sidechainCurve ? ", sidechain " + s.sidechainCurve : "");
}
export function spatialModLine(s, compact) {
  const parts = [];
  if (s.stereoImage) parts.push(s.stereoImage);
  if (s.stereoWidth) parts.push(s.stereoWidth);
  if (s.spatialDepth) parts.push(s.spatialDepth);
  if (s.spatialMovement) parts.push(s.spatialMovement);
  if (s.modSource) parts.push(s.modSource + "→" + s.modDest);
  if (s.modRate) parts.push(s.modRate);
  if (s.modDepth) parts.push(s.modDepth);
  if (s.textureLayer) parts.push(s.textureLayer);
  if (s.grainType) parts.push(s.grainType);
  if (s.shimmerType) parts.push(s.shimmerType);
  if (s.atmosphereType) parts.push(s.atmosphereType);
  if (!parts.length) return "";
  if (compact) return "Spatial/Mod: " + parts.slice(0, 3).join(", ");
  return "Spatial/Mod: " + parts.join(", ") + (s.reverbSize ? ", verb size " + s.reverbSize : "") + (s.reverbDecay ? ", decay " + s.reverbDecay : "") + (s.stereoEnhance ? ", enhance " + s.stereoEnhance : "");
}
export function grooveMelodicLine(s, compact) {
  const parts = [];
  if (s.ghostNotes) parts.push(s.ghostNotes);
  if (s.humanizeType) parts.push(s.humanizeType);
  if (s.pocketType) parts.push(s.pocketType);
  if (s.ornamentType) parts.push(s.ornamentType);
  if (s.vibratoType) parts.push(s.vibratoType);
  if (s.portamentoType) parts.push(s.portamentoType);
  if (s.scaleRun) parts.push(s.scaleRun);
  if (s.intervalLeap) parts.push(s.intervalLeap);
  if (s.voicingType) parts.push(s.voicingType);
  if (s.inversionType) parts.push(s.inversionType);
  if (s.tensionType) parts.push(s.tensionType);
  if (s.resolutionType) parts.push(s.resolutionType);
  if (!parts.length) return "";
  if (compact) return "Groove/Melodic: " + parts.slice(0, 3).join(", ");
  return "Groove/Melodic: " + parts.join(", ") + (s.delayTime ? ", delay " + s.delayTime : "") + (s.delayFeedback ? ", fb " + s.delayFeedback : "") + (s.sectionDensity ? ", density " + s.sectionDensity : "");
}
export function textureFxLine(s, compact) {
  const parts = [];
  if (s.rideType) parts.push(s.rideType);
  if (s.crashType) parts.push(s.crashType);
  if (s.clapLayer) parts.push(s.clapLayer);
  if (s.percFill) parts.push(s.percFill);
  if (s.fxType) parts.push(s.fxType);
  if (s.transitionType) parts.push(s.transitionType);
  if (s.riserType) parts.push(s.riserType);
  if (s.impactType) parts.push(s.impactType);
  if (s.energyCurve) parts.push(s.energyCurve);
  if (s.buildType) parts.push(s.buildType);
  if (s.dropType) parts.push(s.dropType);
  if (s.chopType) parts.push(s.chopType);
  if (!parts.length) return "";
  if (compact) return "Texture/FX: " + parts.slice(0, 3).join(", ");
  return "Texture/FX: " + parts.join(", ");
}
export function conceptLine(s, compact) {
  const c = s.concept;
  const title = firstClean(s, c.title, "UNTITLED");
  const lead = firstClean(s, c.world, c.location, c.event, c.narrative, c.crowd, c.transform);
  if (compact) return "Concept: " + title + (lead ? " — " + lead : "");
  const rest = [c.world, c.narrative, c.event].map(v => cleanFrag(s, v)).filter(Boolean);
  const body = rest.length ? rest.join(", ") : lead;
  return "Concept: " + title + (body ? " — " + body : "");
}
export function arrangementLine(s) { return "Arrangement: " + s.arrangement; }
export function enabledLayers(s) { return LAYERS.filter(l => s.layers[l.id]); }
export function layerLine(s) {
  const e = enabledLayers(s);
  if (!e.length) return "";
  return "Details: " + e.map(l => l.phrase).join(", ");
}
/* Instrumental-only vocal sanitizer: when instrumental is on the prompt
   always ends in an explicit no-vocals policy line. */
/* Compact form of the no-vocals policy. Semantically identical to
   SAFETY_LINE but ~40 characters cheaper, which densify() converts into
   roughly three more rolled sounds. The verbose SAFETY_LINE is still used
   in the Full Brief, where 3000 characters is never the binding limit. */
export function vocalLineCompact(s) {
  const g = (!s.techOnly && s.primaryGenre && !/techno/i.test(s.primaryGenre))
    ? s.primaryGenre.toLowerCase() : "techno";
  return "instrumental " + g + ", no vocals/lyrics/chants/choir/spoken words";
}
export function vocalLine(s) {
  if (s.instrumental) {
    if (s.techOnly) return SAFETY_LINE;
    const g = (s.primaryGenre && !/techno/i.test(s.primaryGenre)) ? s.primaryGenre : "instrumental";
    return "instrumental " + g.toLowerCase() + ", no vocals, no lyrics, no screaming, no chants, no choir, no spoken words";
  }
  if (s.vocalMode) return "vocal: " + pick(VOCAL_DIRECTIONS_ALL);
  return "";
}
export function structTags(s) {
  const raw = s.noStop
    ? ["Intro", "Build", "Drop", "Drop", "Outro"]
    : ["Intro", "Build", "Drop", "Breakdown", "Drop", "Outro"];
  const names = s.techOnly ? raw : raw.map(n => arcName(s, n));
  return " " + names.map(n => "[" + n + "]").join(" ");
}

/* Explicit no-stop policy. Suno hears "[Breakdown]" / "breakdown" as
   permission to pull the beat out, so the builder also spells out that
   the groove never stops — and that delivery is full throttle the whole
   way — the roll alone is not enough. */
export function noStopLine(s, compact) {
  if (!s.noStop) return "";
  if (compact) return "Non-stop: continuous beat, no breaks/bridges/silent gaps, ultra delivery";
  return "Non-stop: continuous beat from start to finish, no breaks, no bridges, no breakdowns, no silent gaps, seamless section changes, ultra delivery — relentless energy from the first bar to the last";
}

/* Explicit melody-only policy. HIDE-BEATS removes every beat/sound atom,
   and this line tells Suno the focus is the style's own instrument with a
   melody pattern to follow — nothing extra should appear. */
export function hideBeatsLine(s, compact) {
  if (!s.hideBeats) return "";
  if (compact) return "Melody-only: no drums/percussion/bass/extra sounds, melody pattern focus";
  return "Melody pattern focus: no drums, no percussion, no bass, no added instruments or effects — only the style's own lead melody and its pattern";
}

/* ---------------------------- PROMPT BUILDERS ---------------------------- */
/* Every form a style name can legitimately take inside a built prompt: the
   raw name plus everything the in-pipeline rewrites can turn it into
   (vocal-sanitized "Festival Gospel" → "Festival Church", tightened,
   live-stripped). All of them must be parked by genreSafeText's style
   protection — protecting only the raw name is what let a later genre-safe
   pass eat "festival" out of the already-vocal-sanitized name. */
export function styleProtectForms(s) {
  const out = new Set();
  for (const n of [s.primaryStyle, s.secondaryStyle]) {
    if (!n) continue;
    out.add(n);
    out.add(stripVocalCue(n));
    out.add(stripLive(n));
    out.add(tightenPhrase(n));
    out.add(tightenPhrase(stripVocalCue(n)));
    if (!s.techOnly) out.add(genreSafeText(s, n, true));
  }
  return [...out].filter(Boolean).sort((a, b) => b.length - a.length);
}

export function buildStylePrompt(state) {
  const s = state;
  const SLIM = !!s.slim;
  const flavor = (!s.techOnly && SLIM) ? (genreWorld(s.primaryGenre) === "organic" ? " — acoustic instrumentation" : genreWorld(s.primaryGenre) === "hybrid" ? " — acoustic and electronic hybrid instrumentation" : "") : "";
  const blocks = [{ t: SLIM ? (s.primaryStyle + (s.secondaryStyle ? ", " + s.secondaryStyle : "") + flavor) : styleLine(s), required: true, priority: 1 }];
  if (s.noStop) blocks.push({ t: noStopLine(s, false), compact: noStopLine(s, true), required: true, priority: 1.5 });
  if (s.hideBeats) blocks.push({ t: hideBeatsLine(s, false), compact: hideBeatsLine(s, true), required: true, priority: 1.6 });
  if (!s.hidden.feelCard) {
    blocks.push({
      t: SLIM ? "Emotion-led melody: " + s.feeling + ", " + s.flavor + "; " + s.direction : emotionLine(s),
      /* dense form: same information, none of the connective prose — the
         characters saved here become extra sounds in densify() */
      compact: "Emotion: " + [s.feeling, s.flavor, s.direction].filter(Boolean).join(", "),
      required: true, priority: 2
    });
    const cml = counterMelodyLine(s);
    const fullMelody = melodyLine(s) + (cml ? ". " + cml : "");
    /* Dense form never re-adds the instrument under HIDE-BEATS: the block
       stays pure pattern text even when assemble() compacts it. */
    const denseMelody = s.hideBeats
      ? "Lead: " + [s.leadPerf, s.contour, s.rhythm, s.ornamentType, s.vibratoType, s.portamentoType, s.scaleRun, s.intervalLeap].filter(Boolean).join(", ")
        + ". Harmony: " + [s.harmony, s.chordColor, s.arpeggio].filter(Boolean).join(", ")
      : "Lead: " + [s.leadVoice, s.leadPerf, s.contour, s.rhythm].filter(Boolean).join(", ")
        + ". Harmony: " + [s.harmony, s.chordColor, s.arpeggio].filter(Boolean).join(", ")
        + (s.counterMelody && s.counterMelody.voice ? ". Counter: " + s.counterMelody.voice : "");
    const slimLead = s.hideBeats
      ? "Lead: " + [s.leadPerf, s.contour].filter(Boolean).join("; ") + "; melody pattern"
      : "Lead: " + s.leadVoice + "; " + s.contour;
    blocks.push({ t: SLIM ? slimLead + "; harmony: " + s.harmony : fullMelody, compact: denseMelody, required: true, priority: 3 });
    const mcl = melodyConceptLine(s, false);
    if (mcl) blocks.push({ t: mcl, compact: melodyConceptLine(s, true), required: false, priority: 6.5 });
  }
  if (!s.hidden.bassCard) {
    const vcl = voiceConceptLine(s);
    const fullBass = bassLine(s) + (vcl ? ". " + vcl : "");
    const denseBass = "Bass: " + [s.bassVoice, s.bassMovement, s.bassRel].filter(Boolean).join(", ")
      + (s.voiceConcept && s.voiceConcept.voice ? ". Second line: " + s.voiceConcept.voice : "");
    blocks.push({ t: SLIM ? "Bass: " + s.bassVoice + "; " + s.bassMovement : fullBass, compact: denseBass, required: true, priority: 4 });
  }
  if (!s.hidden.drumsCard) blocks.push({ t: SLIM ? "Drums: " + s.kick + "; " + s.groove : drumLine(s), compact: drumLine(s, true), required: true, priority: 5 });
  if (!s.hidden.technoLabCard) {
    const tl = technoLabLine(s, false);
    if (tl) blocks.push({ t: tl, compact: technoLabLine(s, true), required: false, priority: 5.5 });
  }
  if (!s.hidden.soundDesignCard) {
    const sdl = soundDesignLine(s, false);
    if (sdl) blocks.push({ t: sdl, compact: soundDesignLine(s, true), required: false, priority: 5.6 });
  }
  /* Harmony Lab and Rhythm Lab are pattern cards, not sound design: they
     stay independent of the Sound Design card, so parking the FX sections
     (SOUND-LITE) keeps the chord progression and rhythm pattern alive. */
  if (!s.hidden.harmonyLabCard) {
    const cpl = chordProgLine(s);
    if (cpl) blocks.push({ t: cpl, compact: "Chords: " + (s.chordProg || "").split("–")[0], required: false, priority: 5.7 });
  }
  if (!s.hidden.rhythmLabCard) {
    const rpl = rhythmPatternLine(s);
    if (rpl) blocks.push({ t: rpl, compact: "Rhythm: " + (s.rhythmPattern || "").split(" ")[0], required: false, priority: 5.8 });
  }
  if (!s.hidden.mixMasterCard) {
    const mml = mixMasterLine(s, false);
    if (mml) blocks.push({ t: mml, compact: mixMasterLine(s, true), required: false, priority: 5.82 });
  }
  if (!s.hidden.spatialModCard) {
    const sml = spatialModLine(s, false);
    if (sml) blocks.push({ t: sml, compact: spatialModLine(s, true), required: false, priority: 5.84 });
  }
  if (!s.hidden.grooveMelodicCard) {
    const gml = grooveMelodicLine(s, false);
    if (gml) blocks.push({ t: gml, compact: grooveMelodicLine(s, true), required: false, priority: 5.86 });
  }
  if (!s.hidden.textureFxCard) {
    const tfl = textureFxLine(s, false);
    if (tfl) blocks.push({ t: tfl, compact: textureFxLine(s, true), required: false, priority: 5.88 });
  }
  blocks.push({ t: layerLine(s), required: false, priority: 6 });
  const TAGS = structTags(s);
  const tagCost = s.structure ? TAGS.length + 1 : 0;
  const flavorCost = (!s.techOnly && (SLIM || true)) ? (genreWorld(s.primaryGenre) === "organic" ? " — acoustic instrumentation".length : genreWorld(s.primaryGenre) === "hybrid" ? " — acoustic and electronic hybrid instrumentation".length : 0) : 0;
  /* Budget note: we deliberately assemble against a REDUCED budget so the
     block system produces its compact, high-density forms, then densify()
     spends the reclaimed characters on rolled sounds that prose phrasing
     would have left out entirely. Net effect: many more sounds per 1000. */
  const hardBudget = 1000 - (s.instrumental ? SAFETY_LINE.length + 2 : 20) - tagCost - flavorCost;
  /* Never clamp below the required blocks' own compact length — the style,
     emotion, lead, bass and drum lines always survive intact. */
  const requiredLen = blocks.filter(b => b.required)
    .reduce((a, b) => a + ((b.compact || b.t || "").length + 2), 0);
  const seedBudget = Math.min(hardBudget, Math.max(Math.round(hardBudget * 0.10), requiredLen));
  let body = assemble(blocks.slice(), seedBudget, ". ");
  body = sanitize(s, body);
  /* The style line is the one block Suno cannot do without. sanitize() and
     assemble()'s last-resort clamp can both strip it (long generated style
     names made this reachable), so restore it at the front if it is gone. */
  const styleHead = blocks[0] && (blocks[0].t || blocks[0].compact);
  const protectForms = styleProtectForms(s);
  const styleShown = () => protectForms.some(f => body.includes(f));
  if (styleHead && s.primaryStyle && !styleShown()) {
    body = body ? styleHead + ". " + body : styleHead;
  }
  body = body.replace(/[.\s]+$/, "");
  if (!/Bass:/.test(body) && !s.hidden.bassCard) body += ". " + bassLine(s);
  if (!/Drums:/.test(body) && !s.hidden.drumsCard) body += ". " + drumLine(s, true);
  if (!s.noStop && !s.hideBeats && s.counterMelody && s.counterMelody.voice && !/Counter(-melody)?:/.test(body)) body += ". Counter: " + s.counterMelody.voice;
  if (!s.noStop && !s.hideBeats && s.voiceConcept && s.voiceConcept.voice && !/Second line:/.test(body)) body += ". 2nd: " + s.voiceConcept.voice;
  body = sanitize(s, body);
  if (!s.techOnly) body = genreSafeText(s, body, protectForms); // rephrase techno-isms to fit the genre (every style-name form protected)
  /* "voicing" must be gone before densify compares / inserts: Suno reads
     it as a human voice ("hey"/"houuu"); the rewrite is idempotent, so the
     final normalizePrompt pass does not double-apply it. */
  body = stripVocalCue(body);
  /* spend every leftover character on rolled sounds that didn't make the cut */
  const v0 = s.instrumental ? vocalLineCompact(s) : vocalLine(s);
  const reserve = (v0 ? v0.length + 2 : 1) + tagCost + 2;
  body = densify(s, body, 1000 - reserve);
  body = sanitize(s, body);
  if (!s.techOnly) body = genreSafeText(s, body, protectForms);
  if (s.structure && !s.hidden.styleCard) body += TAGS;
  const v = s.instrumental ? vocalLineCompact(s) : vocalLine(s);
  let out = normalizePrompt(body + "." + (v ? " " + v : ""));
  if (s.structure && out.length > 1000) {
    out = normalizePrompt(out.replace(TAGS, ""));
  }
  if (out.length > 1000) { // final safety clamp at a clause boundary
    let cut = out.slice(0, 1000);
    const m2 = cut.match(/^(.*[.;,])/);
    if (m2 && m2[1].length > 500) cut = m2[1].trim();
    out = normalizePrompt(cut);
  }
  return out;
}

export function buildFullBrief(state) {
  const s = state;
  const layers = enabledLayers(s);
  const f = s.melodicForce || "balanced";
  const sec = [];
  sec.push("STYLE: " + styleLine(s) + ".");
  if (s.noStop) sec.push("NON-STOP: continuous beat from start to finish — no breaks, no bridges, no breakdowns, no silent gaps, seamless section changes, ultra delivery: relentless energy from the first bar to the last.");
  if (s.hideBeats) sec.push("MELODY-ONLY: no drums, no percussion, no bass, no added instruments or effects — only the style's own lead melody and its pattern.");
  if (!s.hidden.key) sec.push("KEY: " + keyName(s) + " (Camelot " + camelot(s) + ") — " + scaleOf(s).mood + ".");
  if (!s.hidden.feelCard) {
    if (f !== "balanced") sec.push("MELODIC FOCUS: " + MELODY_FORCE[f].desc + ".");
    const emo = [cleanFrag(s, s.feeling), cleanFrag(s, s.flavor)].filter(Boolean).join(" and ");
    const dir = cleanFrag(s, s.direction);
    sec.push("EMOTION: " + (emo || "maximum-energy") + (dir ? " — " + dir : "") + ".");
    const mcs = s.melodyConcept || {};
    if (mcs.story) {
      sec.push("MELODY CONCEPT: " + mcs.story + ". Role: " + mcs.role + ". Motion: " + mcs.motion + ". Hook: " + mcs.hook + ".");
    }
    if (f === "light") {
      sec.push("MELODY: " + s.leadVoice + ".");
      sec.push("HARMONY: " + s.harmony + ".");
    } else {
      sec.push("MELODY: " + s.leadVoice + ", " + s.leadPerf + "; " + s.contour + "; " + s.rhythm + ".");
      sec.push("HARMONY: " + s.harmony + " in " + s.chordColor + "; " + s.arpeggio + ".");
    }
    const cml2 = counterMelodyLine(s).replace(/^Counter-melody:\s*/i, "");
    if (cml2) sec.push("COUNTER-MELODY: " + cml2 + ".");
  }
  if (!s.hidden.bassCard) {
    sec.push("BASS: " + s.bassVoice + ", " + s.bassMovement + ", " + s.bassRel + ".");
    const vcl2 = voiceConceptLine(s).replace(/^Second line:\s*/i, "");
    if (vcl2) sec.push("SECOND LINE: " + vcl2 + ".");
  }
  if (!s.hidden.drumsCard) sec.push("DRUMS: " + s.kick + "; " + s.hats + "; " + s.snare + "; " + s.perc + "; " + s.toms + "; " + s.groove + "; " + s.swing + "; " + s.sync + "; " + s.intensity + ".");
  if (!s.hidden.technoLabCard) {
    const tl = technoLabLine(s, false);
    if (tl) sec.push(tl.toUpperCase() + ".");
  }
  if (!s.hidden.soundDesignCard) {
    const sdl = soundDesignLine(s, false);
    if (sdl) sec.push(sdl.toUpperCase() + ".");
  }
  if (!s.hidden.harmonyLabCard && s.chordProg) sec.push("CHORD PROGRESSION: " + s.chordProg + ".");
  if (!s.hidden.rhythmLabCard && s.rhythmPattern) sec.push("RHYTHM PATTERN: " + s.rhythmPattern + ".");
  if (!s.hidden.mixMasterCard) {
    const mml = mixMasterLine(s, false);
    if (mml) sec.push(mml.toUpperCase() + ".");
  }
  if (!s.hidden.spatialModCard) {
    const sml = spatialModLine(s, false);
    if (sml) sec.push(sml.toUpperCase() + ".");
  }
  if (!s.hidden.grooveMelodicCard) {
    const gml = grooveMelodicLine(s, false);
    if (gml) sec.push(gml.toUpperCase() + ".");
  }
  if (!s.hidden.textureFxCard) {
    const tfl = textureFxLine(s, false);
    if (tfl) sec.push(tfl.toUpperCase() + ".");
  }
  if (!s.hidden.conceptCard) {
    const cl = conceptLine(s, false);
    if (cl && cl !== "Concept: UNTITLED") sec.push(cl.replace(/^Concept:/, "CONCEPT:") + ".");
  }
  if (!s.hidden.arrangementCard && s.arrangement) sec.push("ARRANGEMENT: " + s.arrangement);
  sec.push("ENERGY ARC: " + arcLine(s) + ".");
  if (layers.length) sec.push("MIX & DETAIL: " + layers.map(l => l.phrase).join(", ") + ".");
  sec.push("VOCAL POLICY: " + vocalLine(s) + ".");
  /* strip "live" before the 3000-char cap so length accounting stays right */
  let text = sec.map(x => stripVocalCue(stripLive(sanitize(s, x)))).filter(Boolean).join("\n\n");
  if (text.length > 3000) {
    const parts = text.split("\n\n");
    while (parts.length > 1 && parts.join("\n\n").length > 3000) parts.pop();
    text = parts.join("\n\n");
    if (text.length > 3000) { text = text.slice(0, 3000).replace(/\s+\S*$/, ""); }
  }
  if (!s.techOnly) text = genreSafeText(s, text, styleProtectForms(s)); // every style-name form protected
  return stripVocalCue(text);
}

/* ---------------------------- ENERGY ARC ---------------------------- */
const ARC_NAME_MAP = { Intro: "Intro", Build: "Rise", Drop: "Climax", Breakdown: "Release", Climax: "Finale", Outro: "Outro" };
export function arcName(s, n) {
  if (s.techOnly) return n;
  if (genreWorld(s.primaryGenre) !== "organic") return n;
  return ARC_NAME_MAP[n] || n;
}
/* No-stop arc shapes: peak → peak, no Breakdown/Release dip, no quiet
   bridge — the beat keeps rolling from the first bar to the last. */
export const NO_STOP_ARC = {
  compact: [["Intro", 8, 45], ["Build", 16, 75], ["Drop", 32, 100], ["Climax", 32, 100], ["Outro", 8, 30]],
  standard: [["Intro", 8, 45], ["Build", 16, 75], ["Drop", 32, 100], ["Climax", 32, 100], ["Drop", 32, 100], ["Outro", 8, 25]],
  extended: [["Intro", 16, 45], ["Build", 24, 75], ["Drop", 32, 100], ["Climax", 32, 100], ["Drop", 32, 100], ["Climax", 32, 100], ["Outro", 16, 30]]
};
export function energyArc(s) {
  const tpl = (s.noStop ? NO_STOP_ARC : ARC_TEMPLATES)[s.duration || "standard"];
  const spb = 60 / (s.bpm || 140);
  const boost = { light: -6, balanced: 0, strong: 5, dominant: 9 }[s.melodicForce || "balanced"];
  let bar = 0;
  return tpl.map(([name, bars, energy]) => {
    const startSec = bar * 4 * spb;
    bar += bars;
    const e = Math.max(20, Math.min(100, energy + (/Drop|Climax/.test(name) ? boost : Math.round(boost / 2))));
    return { name: arcName(s, name), bars, energy: e, start: startSec, startLabel: fmtTime(startSec) };
  });
}
export function arcLine(s) {
  return energyArc(s).map(x => x.name + " " + x.bars + " bars @" + x.energy + "%").join(" → ");
}
export function fmtTime(sec) { const m = Math.floor(sec / 60), x = Math.round(sec % 60); return m + ":" + String(x).padStart(2, "0"); }

/* ---------------------------- PROMPT SCORE ----------------------------
   Same scoring as the legacy engine — used by the maximize mode of the
   unified roll engine. */
/* Words that carry no sonic information -- used for the variety metric. */
const STOP_WORDS = new Set(["with","and","the","that","then","into","over","under","from","this","a","an","of","in","on","at","to","for","bpm","no","vocals","instrumental"]);

export function scorePrompt(state) {
  const s = state;
  const sp = buildStylePrompt(s);
  const items = [];
  const len = sp.length;

  /* Length: the box is 1000 chars and unused space is wasted signal, so a
     full prompt is the goal. The old curve peaked at <=900 and gave every
     dense prompt 82 -- it penalised exactly what the packer is built to do. */
  const lenScore = len > 1000 ? 40 : len >= 940 ? 100 : len >= 860 ? 92
    : len >= 700 ? 80 : len >= 450 ? 64 : len >= 250 ? 48 : 30;
  items.push({
    label: "Prompt length", score: lenScore,
    note: len > 1000 ? "Over the 1000-char cap." : len >= 940 ? "Filling the box — maximum signal."
      : len >= 700 ? "Room left; unhide a section to use it." : "Short — a lot of the box is unused."
  });

  /* Sound density measured against what is actually achievable, not a flat
     table that saturates at 30. */
  let soundChars = 0, soundCount = 0;
  for (const [, keys] of PACK_ORDER) {
    for (const k of keys) {
      const v = s[k];
      if (!v || typeof v !== "string") continue;
      const forms = [v, tightenPhrase(v), stripLive(v), stripVocalCue(tightenPhrase(v))];
      if (!s.techOnly) forms.push(tightenPhrase(genreSafeText(s, v, true)));
      const hit = forms.find(f => f && sp.includes(f));
      if (hit) { soundChars += hit.length; soundCount++; }
    }
  }
  const dScore = Math.max(20, Math.min(100, Math.round((soundCount / 42) * 100)));
  items.push({
    label: "Sound density", score: dScore,
    note: soundCount + " rolled sounds packed (" + Math.round(soundChars / Math.max(len, 1) * 100) + "% of the box)"
  });

  /* Vocabulary variety: repeated descriptors waste characters and read as
     padding to the model. Scores the share of unique content words. */
  const words = (sp.toLowerCase().match(/[a-z][a-z-]{2,}/g) || []).filter(w => !STOP_WORDS.has(w));
  const uniq = new Set(words).size;
  const ratio = words.length ? uniq / words.length : 1;
  const vScore = Math.max(20, Math.min(100, Math.round((ratio - 0.6) / 0.35 * 100)));
  items.push({
    label: "Vocabulary variety", score: vScore,
    note: (words.length - uniq) + " repeated words of " + words.length + " (" + Math.round(ratio * 100) + "% unique)"
  });

  /* Section coverage across every labelled block the packer can emit. */
  const LABELS = ["Emotion:", "Lead:", "Harmony:", "Bass:", "Drums:", "Tone:", "Mix:", "Space:", "Texture:", "FX:", "Arc:"];
  const present = LABELS.filter(l => sp.includes(l)).length;
  const cScore = Math.round(present / LABELS.length * 100);
  items.push({
    label: "Section coverage", score: cScore,
    note: present + " of " + LABELS.length + " sections present" +
      (present < LABELS.length ? " — unhide cards to add more." : " — full spread.")
  });

  /* Command coverage — the Full Brief's command layer (concept, melody
     concept, arrangement, energy arc, detail layers). The Style Prompt box
     only rewards sounds; MAX with this criterion also optimizes the
     commands that shape the song, so a click upgrades the whole brief. */
  const cmdChecks = [
    ["Concept", !s.hidden.conceptCard, () => conceptLine(s, false) !== "Concept: UNTITLED"],
    ["Melody concept", !s.hidden.feelCard, () => !!melodyConceptLine(s, false)],
    ["Arrangement", !s.hidden.arrangementCard, () => !!s.arrangement],
    ["Energy arc", true, () => !!arcLine(s)],
    ["Detail layers", true, () => enabledLayers(s).length > 0]
  ];
  const cmdApplicable = cmdChecks.filter(c => c[1]).length;
  const cmdPresent = cmdChecks.filter(c => c[1] && c[2]()).length;
  const cmdCover = cmdApplicable ? Math.round(cmdPresent / cmdApplicable * 100) : 100;
  items.push({
    label: "Command coverage", score: cmdCover,
    note: cmdPresent + " of " + cmdApplicable + " command layers present" +
      (cmdPresent < cmdApplicable ? " — MAX rolls them in." : " — full brief command.")
  });

  /* Command density — how much command text actually reaches the Full
     Brief. Same idea as sound density but for the writing: a longer
     concept story, a closer melody-concept description, a fuller
     arrangement and arc earn more. MAX picks the richest brief. */
  const fbCmd = [
    conceptLine(s, false), melodyConceptLine(s, false),
    s.arrangement || "", arcLine(s) || "",
    layerLine(s)
  ].filter(Boolean).join(" ").length;
  const cmdDensity = Math.max(20, Math.min(100, Math.round((fbCmd / 420) * 100)));
  items.push({
    label: "Command density", score: cmdDensity,
    note: fbCmd + " command characters" +
      (fbCmd >= 420 ? " — brief fully commanded." : fbCmd >= 300 ? " — good command layer." : " — MAX rolls fuller commands.")
  });

  const melo = /Lead:|Melody-driven|Melody-dominant/.test(sp);
  const force = s.melodicForce || "balanced";
  const meloScore = !melo ? 0 : force === "light" ? 72 : force === "balanced" ? 92 : 100;
  items.push({
    label: "Melodic clarity", score: meloScore,
    note: !melo ? "Melody missing — unhide Feeling & Melody." : force === "light" ? "Light force; raise it for a stronger hook." : "Melody is clearly led."
  });

  const styleWords = styleLine(s).split(/,|with|fused/).length;
  const focusScore = styleWords <= 3 ? 100 : styleWords <= 4 ? 85 : 65;
  items.push({
    label: "Style focus", score: focusScore,
    note: focusScore === 100 ? "Tight, unambiguous genre signal." : "Consider fusing or clearing the secondary style."
  });

  const energyWords = (sp.match(/\b(maximum|relentless|explosive|brutal|massive|huge|ferocious|unstoppable|driving|crushing|slamming|overdrive|peak|euphoric|thunderous)\b/gi) || []).length;
  const eScore = energyWords >= 6 ? 100 : energyWords >= 4 ? 88 : energyWords >= 2 ? 70 : 45;
  items.push({
    label: "Energy density", score: eScore,
    note: energyWords >= 4 ? energyWords + " high-energy cues." : "Roll drums/intensity for more punch."
  });

  const keyScore = s.hidden.key ? 55 : 100;
  items.push({
    label: "Harmonic definition", score: keyScore,
    note: s.hidden.key ? "Key hidden — Suno will pick its own." : keyName(s) + " locked in."
  });

  const total = Math.round(items.reduce((a, i) => a + i.score, 0) / items.length);
  return { total, items, soundCount, soundChars };
}
