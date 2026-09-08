/* tools/expand-acoustic.js — GENERATES data/acoustic.js

   The no-techno upgrade.

   Problem this solves: in no-techno mode the style-fit pass HID the
   techno-flavoured cards (Techno Lab, Texture/FX, and for organic genres
   also Sound Design / Mix / Spatial / Rhythm). Hiding them meant those
   sounds simply vanished from the prompt — organic genres landed ~6 fewer
   sounds than techno-only and wasted ~30 characters of the box.

   Instead of hiding, we now SWAP: every one of those atom keys gets an
   organic and a hybrid pool of genre-appropriate sounds — real rooms, real
   kits, real horns, real strings, real amps, real tape. Same slots, same
   packing, same character budget, but the vocabulary fits the genre.

   Same guarantees as tools/expand-sounds.js: deterministic, deduped, no
   banned low-energy word, no vocal reference.

   Run: node tools/expand-acoustic.js */
import { writeFileSync } from "node:fs";

const BANNED_RE = /\b(minimal|minimalist|minimalism|sparse|restrained|low[- ]?energy|weak|tiny|gentle|quiet|soft|thin|calm|subdued|delicate|faint|mellow|light\b)\b/i;
const VOCAL_RE = /\b(vox|chorus|refrain|verse|vocal|vocals|voice|voices|sing|singing|singer|choir|chant|chants|lyric|lyrics|spoken|acapella|scream|screaming|whisper|whispers|rap|rapping|hum|humming)\b/i;
const okText = t => t && t.length <= 60 && !BANNED_RE.test(t) && !VOCAL_RE.test(t);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260903);
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
const cat = (...g) => [].concat(...g);
function build(phrases, cap) {
  const seen = new Set(); const out = [];
  for (const p of shuffle(phrases)) {
    const t = p.replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!okText(t) || seen.has(k)) continue;
    seen.add(k); out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

/* ---------------- vocabularies ---------------- */
const BIG = ["thunderous", "roaring", "towering", "commanding", "blazing", "soaring", "sweeping", "surging", "driving", "urgent"];
const WARM = ["warm", "woody", "resonant", "rich", "burnished", "honeyed", "amber", "velvet", "golden", "smoky"];
const ROOM = ["church", "cathedral", "concert-hall", "chapel", "ballroom", "barn", "live-room", "studio-floor", "theatre", "wooden-hall", "stone-room", "opera-house"];
const MIC = ["ribbon-mic'd", "room-mic'd", "close-mic'd", "overhead-mic'd", "tube-mic'd", "stereo-pair"];
const TAPE = ["tape-warmed", "valve-driven", "transformer-coloured", "analogue-console", "vinyl-mastered", "reel-to-reel"];
const PLAY = ["played with fire", "played with swing", "attacked hard", "driven forward", "pushed ahead of the beat", "dug in deep"];

const DRUMKIT = ["maple kit", "birch kit", "vintage jazz kit", "big-band kit", "rock kit", "gospel kit", "bebop kit", "brushed kit", "marching kit", "orchestral bass drum", "taiko", "djembe", "cajón", "tabla", "bodhrán", "surdo", "dhol", "frame drum"];
const HORNS = ["trumpet", "trombone", "tenor sax", "alto sax", "baritone sax", "flugelhorn", "french horn", "tuba", "cornet", "clarinet", "bass clarinet", "oboe", "bassoon", "harmonica"];
const STRINGS = ["violin", "viola", "cello", "double bass", "string section", "fiddle", "nyckelharpa", "erhu", "sarangi", "kora", "oud", "bouzouki", "mandolin", "banjo", "dobro", "pedal steel", "harp", "koto", "shamisen"];
const KEYS = ["grand piano", "upright piano", "rhodes", "wurlitzer", "hammond organ", "pipe organ", "harpsichord", "clavinet", "accordion", "harmonium", "celesta", "vibraphone", "marimba"];
const GTR = ["nylon guitar", "steel-string guitar", "archtop guitar", "resonator guitar", "twelve-string guitar", "tremolo guitar", "slide guitar", "flamenco guitar", "surf guitar", "baritone guitar"];
const AMP = ["tweed amp", "blackface amp", "AC30-style amp", "tube-driven amp", "spring-reverb amp", "cranked combo"];
const BASSAC = ["upright bass", "fretless bass", "P-bass", "J-bass", "tuba bass", "bass trombone", "cello bass", "acoustic bass guitar", "washtub bass"];
const ENS = ["horn section", "string quartet", "brass ensemble", "woodwind section", "gospel band", "big band", "chamber ensemble", "folk trio", "mariachi section", "steel-pan section", "gamelan ensemble", "orchestral tutti"];
const PERCAC = ["congas", "bongos", "timbales", "shaker", "tambourine", "cowbell", "claves", "guiro", "cabasa", "castanets", "triangle", "woodblock", "agogô", "cajón", "udu", "spoons", "handclaps stack"];

/* ---------------- organic pools, per atom key ---------------- */
const ORGANIC = {
  kick: cat(X(cat(WARM, BIG), ["kick drum"]), X(DRUMKIT, ["kick"]), X(MIC, ["kick drum"]), X(ROOM, ["kick"])),
  hats: cat(X(["crisp", "washy", "sizzling", "brushed", "tight", "loose", "shimmering"], ["hi-hat", "hi-hats"]), X(MIC, ["hi-hats"]), X(["16th", "swung", "shuffled", "triplet", "off-beat"], ["hi-hat pattern"])),
  snare: cat(X(cat(WARM, BIG), ["snare"]), X(["brushed", "rimshot", "cross-stick", "piccolo", "wood-shell", "marching", "gospel"], ["snare"]), X(MIC, ["snare"]), X(ROOM, ["snare crack"])),
  perc: cat(X(cat(WARM, BIG), PERCAC), X(PERCAC, ["pattern", "roll", "accents"])),
  toms: cat(X(cat(WARM, BIG), ["toms", "floor tom"]), X(DRUMKIT, ["tom fills"]), X(["cascading", "rolling", "tribal", "thundering"], ["tom run"])),
  groove: cat(X(["swinging", "shuffling", "strutting", "second-line", "afrobeat", "samba", "clave-driven", "bluegrass", "waltzing", "polka", "reggae one-drop", "funk", "motown", "gospel"], ["groove", "pocket", "feel"]), X(BIG, ["groove"])),
  swing: cat(X(["hard-swung", "loping", "triplet", "laid-back", "pushed", "elastic", "New Orleans", "Viennese"], ["swing", "feel"])),
  sync: cat(X(["clave", "tresillo", "hemiola", "cross-rhythm", "off-beat", "anticipated", "second-line"], ["syncopation", "accents"])),
  intensity: cat(X(cat(BIG, ["full-band", "all-in", "barnstorming", "revival-tent", "stadium"]), ["intensity", "drive", "push"])),
  bassVoice: cat(X(cat(WARM, BIG), BASSAC), X(MIC, BASSAC), X(TAPE, ["bass"])),
  bassMovement: cat(X(["walking", "strolling", "striding", "galloping", "pedal-point", "arco", "pizzicato", "slap", "two-feel", "four-to-the-bar"], ["bass line", "movement"])),
  bassRel: cat(X(["bass locked with the kit", "bass trading with the horns", "bass answering the piano", "bass anchoring the ensemble", "bass walking under the changes"], ["", "in the pocket", "an octave down"])),
  leadVoice: cat(X(cat(WARM, BIG), cat(HORNS, STRINGS, KEYS, GTR)), X(MIC, cat(HORNS, STRINGS)), X(GTR, AMP)),
  leadPerf: cat(X(["played with", "performed with", "articulated with"], ["fierce vibrato", "growling attack", "bent blue notes", "hammer-ons", "double-stops", "flutter tonguing", "bow pressure", "palm muting", "tremolo picking", "grace notes", "slides into the note"]), PLAY),
  harmony: cat(X(cat(WARM, BIG), ["chords", "harmony", "voicings"]), X(ENS, ["harmony", "pads", "stabs"]), X(["gospel", "modal", "quartal", "close-harmony", "big-band", "barbershop-style", "chorale"], ["voicings"])),
  arpeggio: cat(X(["fingerpicked", "harp-like", "cascading", "rolling", "banjo-roll", "flamenco", "classical", "clawhammer"], ["arpeggio", "figure"])),
  contour: cat(X(["rising", "falling", "arch", "leaping", "stepwise", "call-and-response", "blues-scale"], ["melodic contour", "phrase shape"])),
  rhythm: cat(X(["swung 8th", "straight 8th", "triplet", "dotted", "syncopated", "rubato", "double-time"], ["phrasing", "melody rhythm"])),
  /* the cards that used to be hidden — now filled with real production terms */
  technoDrive: cat(X(cat(BIG, ["locomotive", "freight-train", "stampeding", "runaway"]), ["momentum", "drive", "push"])),
  technoAcid: cat(X(["wailing", "crying", "moaning", "howling", "singing"], ["blues lead", "slide line", "harmonica line", "fiddle line", "sax wail"])),
  technoTexture: cat(X(TAPE, ["texture", "grain", "colour"]), X(ROOM, ["ambience", "air"])),
  technoRave: cat(X(ENS, ["stabs", "hits", "shout chorus"])),
  technoIndustrial: cat(X(["hand-clap", "foot-stomp", "chain-gang", "hammer-and-anvil", "washboard", "bones", "spoons"], ["rhythm", "hits"])),
  filterType: cat(X(["wah-pedal", "mute-and-open", "harmon-mute", "cup-mute", "plunger-mute", "tone-knob", "cocked-wah"], ["filtering", "sweep"])),
  envelopeType: cat(X(["hard-attack", "slow-bloom", "swelling", "plucked", "bowed-in", "struck", "brushed"], ["envelope", "attack"])),
  lfoType: cat(X(["leslie", "tremolo", "vibrato-arm", "rotary", "bowed-tremolo", "flutter"], ["0.5Hz", "2Hz", "4Hz", "6Hz", "fast", "slow"], ["modulation"])),
  distortionType: cat(X(cat(TAPE, ["overdriven tube", "cranked valve", "fuzz-pedal", "console-driven", "transformer"]), ["saturation", "drive"])),
  reverbType: cat(X(ROOM, ["reverb", "ambience"]), X(["plate", "spring", "chamber"], ["reverb"])),
  delayType: cat(X(["tape echo", "slapback", "plate echo", "hall echo"], ["1/8", "1/4", "120ms", "250ms", "dotted"])),
  sidechainType: cat(X(["ensemble breathing", "band dynamics", "call-and-response ducking", "conductor swell"], ["", "on the downbeat"])),
  stereoType: cat(X(["stereo-pair", "Decca-tree", "Blumlein", "XY-pair", "spaced-omni", "wide-band"], ["imaging", "stage"])),
  fxChain: cat(X(["mic", "amp", "console", "tape", "plate", "room"], ["→"], ["console", "tape", "plate", "room", "master"])),
  soundIntensity: cat(X(cat(BIG, ["full-throated", "wide-open"]), ["ensemble intensity", "performance energy"])),
  chordProg: cat(["I–vi–ii–V", "ii–V–I", "I–IV–V–I", "vi–IV–I–V", "I–bVII–IV–I", "iii–vi–ii–V", "I–V–vi–IV", "blues I–IV–V", "rhythm changes", "modal i–bVII", "I–ii–iii–IV", "circle of fifths turnaround"]),
  rhythmPattern: cat(X(["son clave", "rumba clave", "bossa", "samba", "baião", "second-line", "shuffle", "two-step", "waltz", "6/8 folk", "bluegrass boom-chuck", "reggae one-drop"], ["pattern"])),
  mixDensity: cat(X(cat(BIG, ["full-band", "wall-of-brass", "layered-ensemble"]), ["arrangement density"])),
  mixEnergy: cat(X(BIG, ["ensemble energy", "forward drive"])),
  mixSpace: cat(X(ROOM, ["space", "depth"])),
  mixGlue: cat(X(["console-glued", "tape-glued", "bus-compressed", "room-glued"], ["cohesion", "blend"])),
  mixPunch: cat(X(cat(BIG, ["transient", "stick-attack", "reed-attack"]), ["punch", "impact"])),
  masterDrive: cat(X(TAPE, ["master drive", "bus colour"])),
  masterLoudness: cat(X(["-8 LUFS", "-10 LUFS", "-12 LUFS", "-14 LUFS", "concert-level", "broadcast-level"], ["master level"])),
  masterColor: cat(X(cat(TAPE, WARM), ["master colour"])),
  masterChain: cat(["console EQ → tape → bus comp → limiter", "tube EQ → opto comp → tape → limiter", "ribbon EQ → vari-mu → plate → limiter"]),
  filterCutoff: cat(X(["mute open", "mute closed", "tone rolled back", "tone wide open", "wah heel-down", "wah toe-down"], ["", "through the phrase"])),
  filterResonance: cat(X(["singing", "vocal-like", "nasal", "throaty", "biting"], ["resonance", "formant"])),
  eqType: cat(X(["Pultec-style", "console-strip", "ribbon-tamed", "air-band", "mid-forward", "tilt"], ["EQ"])),
  compressionType: cat(X(["opto", "vari-mu", "FET", "tube", "parallel", "bus"], ["compression"])),
  saturationType: cat(X(cat(TAPE, WARM), ["saturation"])),
  sidechainCurve: cat(X(["conductor", "breath", "bow-stroke", "stick"], ["dynamic curve"])),
  stereoImage: cat(X(["stage-left", "stage-right", "centre-forward", "full-stage", "sectioned"], ["placement", "image"])),
  stereoWidth: cat(X(["natural", "wide-stage", "orchestral", "close-ensemble", "front-row"], ["width"])),
  spatialDepth: cat(X(ROOM, ["depth", "front-to-back staging"])),
  spatialMovement: cat(X(["walking across the stage", "leslie rotation", "swelling forward", "call from the back of the hall"], ["", "between phrases"])),
  stereoEnhance: cat(X(["stereo-pair", "room-mic blend", "hall-return", "ambience-bus"], ["widening"])),
  reverbSize: cat(X(ROOM, ["size"])),
  reverbDecay: cat(X(["0.9s", "1.4s", "2.2s", "3.5s", "5s"], ["decay"])),
  modSource: cat(X(["breath", "bow", "wrist", "foot-pedal", "leslie speed", "conductor"], ["control"])),
  modDest: cat(X(["tone", "vibrato depth", "amp tremolo", "reverb send", "dynamics", "pitch bend"], ["target"])),
  modRate: cat(X(["slow", "medium", "fast", "accelerating", "phrase-length"], ["modulation rate"])),
  modDepth: cat(X(["subtle", "moderate", "deep", "full-range"], ["modulation depth"])),
  textureLayer: cat(X(cat(ROOM, TAPE), ["texture layer", "ambience bed"])),
  grainType: cat(X(cat(TAPE, ["vinyl", "shellac", "acetate", "room-noise"]), ["grain"])),
  shimmerType: cat(X(["cymbal", "triangle", "glockenspiel", "harp", "celesta", "string-harmonic"], ["shimmer", "sparkle"])),
  atmosphereType: cat(X(ROOM, ["atmosphere", "air"])),
  ghostNotes: cat(X(["brushed", "stick-tip", "finger", "palm", "left-hand"], ["ghost notes"])),
  humanizeType: cat(X(["live-band", "hand-played", "breathing", "conducted", "rubato"], ["timing"])),
  pocketType: cat(X(["behind-the-beat", "ahead-of-the-beat", "dead-centre", "swung", "laid-back"], ["pocket"])),
  ornamentType: cat(X(["grace-note", "mordent", "trill", "turn", "slide", "fall-off", "doit", "scoop", "shake"], ["ornament"])),
  vibratoType: cat(X(["wide", "fast", "delayed", "bow", "finger", "breath", "hand"], ["vibrato"])),
  portamentoType: cat(X(["slide", "glissando", "bend-up", "bend-down", "scoop"], ["into the note", "between phrases"])),
  scaleRun: cat(X(["blues", "bebop", "pentatonic", "modal", "chromatic", "diatonic", "flamenco"], ["run", "lick"])),
  intervalLeap: cat(X(["octave", "fifth", "sixth", "seventh", "ninth", "tenth"], ["leap"])),
  voicingType: cat(X(["close", "open", "drop-2", "spread", "shell", "quartal", "cluster"], ["voicing"])),
  inversionType: cat(X(["root-position", "first-inversion", "second-inversion", "slash-bass", "pedal-bass"], ["voicing"])),
  tensionType: cat(X(["b9", "#11", "13", "add9", "sus4", "6/9"], ["tension"])),
  resolutionType: cat(X(["authentic", "plagal", "deceptive", "blues", "modal", "suspended"], ["resolution"])),
  delayTime: cat(X(["slapback 90ms", "tape 180ms", "quarter-note", "dotted-eighth", "hall pre-delay"], [""])),
  delayFeedback: cat(X(["single repeat", "two repeats", "three repeats", "long trail", "damped"], ["echo"])),
  sectionDensity: cat(X(cat(BIG, ["full-ensemble", "stripped-to-rhythm", "horns-only", "strings-only"]), ["section density"])),
  rideType: cat(X(["bell-heavy", "washy", "crashing", "sizzle", "rivet", "hand-hammered"], ["ride cymbal"])),
  crashType: cat(X(cat(BIG, ["china", "splash", "orchestral"]), ["crash", "cymbal"])),
  clapLayer: cat(X(["hand-clap", "foot-stomp", "tambourine", "thigh-slap", "gospel clap"], ["layer", "stack"])),
  percFill: cat(X(PERCAC, ["fill", "break"])),
  fxType: cat(X(["cymbal swell", "tape stop", "drum break", "horn stab", "string swell", "gong hit", "timpani roll"], [""])),
  transitionType: cat(X(["drum fill", "horn pickup", "string swell", "cymbal roll", "break-down", "key change", "ritardando"], ["transition"])),
  riserType: cat(X(["cymbal roll", "string ascent", "horn crescendo", "timpani roll", "snare crescendo"], [""])),
  impactType: cat(X(cat(BIG, ["orchestral", "gong", "timpani", "bass-drum"]), ["hit", "impact"])),
  energyCurve: cat(X(["slow-burn", "step-climb", "call-and-response climb", "revival build", "cinematic swell"], ["arc"])),
  buildType: cat(X(["8-bar", "16-bar", "horn-led", "drum-led", "string-led", "ensemble"], ["build"])),
  dropType: cat(X(["full-band entry", "half-time", "stop-time", "break-and-slam", "shout chorus entry"], [""])),
  chopType: cat(X(["stop-time", "stab", "hit-and-hold", "break", "tag"], ["figure"]))
};

/* ---------------- hybrid: electronic + live, both allowed ---------------- */
const HYBRID = {
  kick: cat(X(cat(WARM, BIG), ["kick"]), X(["layered acoustic-and-electronic", "sampled-and-live", "reinforced"], ["kick"])),
  snare: cat(X(["layered", "sampled-and-live", "reinforced", "gated live"], ["snare"]), X(cat(WARM, BIG), ["snare"])),
  leadVoice: cat(X(cat(WARM, BIG), cat(GTR, KEYS, HORNS)), X(["synth-doubled", "amp-and-DI"], cat(GTR, KEYS))),
  bassVoice: cat(X(cat(WARM, BIG), BASSAC), X(["sub-reinforced", "DI-and-amp", "synth-doubled"], ["bass"])),
  technoDrive: cat(X(cat(BIG, ["motorik", "krautrock", "post-punk", "shoegaze"]), ["drive", "momentum"])),
  technoAcid: cat(X(["fuzzed", "wailing", "screaming", "swirling"], ["guitar line", "organ line", "synth-and-string line"])),
  technoTexture: cat(X(cat(TAPE, ["shoegaze", "reverb-drenched", "shimmer-drenched"]), ["texture", "wash"])),
  technoRave: cat(X(["organ", "brass", "string", "guitar-stack"], ["stabs", "hits"])),
  technoIndustrial: cat(X(["floor-tom", "metal-percussion", "hammered", "stomp-and-clap"], ["rhythm", "hits"])),
  rideType: cat(X(["bell-heavy", "washy", "sizzle", "crashing"], ["ride"])),
  crashType: cat(X(cat(BIG, ["china", "splash"]), ["crash"])),
  clapLayer: cat(X(["hand-clap", "layered clap", "stomp"], ["stack"])),
  percFill: cat(X(PERCAC, ["fill"])),
  fxType: cat(X(["tape stop", "reverse swell", "cymbal swell", "feedback squeal", "guitar dive"], [""])),
  transitionType: cat(X(["drum fill", "feedback swell", "filter sweep", "cymbal roll", "break"], ["transition"])),
  riserType: cat(X(["cymbal roll", "feedback build", "string ascent", "noise swell"], [""])),
  impactType: cat(X(cat(BIG, ["orchestral", "gong"]), ["impact"])),
  energyCurve: cat(X(["slow-burn", "wall-of-sound climb", "step-climb", "cinematic swell"], ["arc"])),
  buildType: cat(X(["8-bar", "16-bar", "guitar-led", "drum-led", "synth-led"], ["build"])),
  dropType: cat(X(["full-band entry", "wall-of-sound entry", "half-time", "stop-time"], [""])),
  chopType: cat(X(["stop-time", "stab", "break", "stutter"], ["figure"]))
};

/* ---------------- emit ---------------- */
function emit(map, cap) {
  const out = {};
  let n = 0;
  for (const [k, phrases] of Object.entries(map)) {
    const list = build(phrases, cap);
    if (list.length) { out[k] = list; n += list.length; }
  }
  return { out, n };
}
const org = emit(ORGANIC, 90);
const hyb = emit(HYBRID, 90);

const ser = o => Object.entries(o)
  .map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v).replace(/","/g, '",\n    "') + ",")
  .join("\n");

writeFileSync(new URL("../data/acoustic.js", import.meta.url),
  `/* data/acoustic.js — GENERATED by tools/expand-acoustic.js. DO NOT EDIT BY HAND.

   Genre-world sound vocabularies for no-techno mode.
   ORGANIC_POOLS: ${org.n} entries across ${Object.keys(org.out).length} atom keys.
   HYBRID_POOLS:  ${hyb.n} entries across ${Object.keys(hyb.out).length} atom keys.

   These REPLACE the techno-flavoured pools when the rolled genre is
   organic or hybrid, instead of the old behaviour of hiding those cards
   entirely. Same slots, same packing, genre-appropriate words. */
export const ORGANIC_POOLS = {
${ser(org.out)}
};
export const HYBRID_POOLS = {
${ser(hyb.out)}
};
`);
console.log("organic: " + org.n + " entries / " + Object.keys(org.out).length + " keys");
console.log("hybrid:  " + hyb.n + " entries / " + Object.keys(hyb.out).length + " keys");
