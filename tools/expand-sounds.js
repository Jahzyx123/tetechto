/* tools/expand-sounds.js — GENERATES data/expansion.js
   The "huge sound upgrade": deterministic combinatorial expansion of every
   sonic pool (drums, bass, leads, harmony, techno lab, sound design, mix,
   spatial, texture, fx…).

   Rules, enforced here so the runtime never has to care:
   - deterministic (seeded, no Math.random) → same output every run
   - never emits a BANNED_MINIMAL word (maximum-energy policy)
   - never emits a vocal reference (instrumental safety)
   - deduped against the verbatim legacy pool AND against itself
   - additions only; the verbatim extracted pools stay untouched.

   Run: node tools/expand-sounds.js */
import { writeFileSync } from "node:fs";
import * as D from "../data/index.js";

/* ------------------------------------------------ guards ------------------------------------------------ */
const BANNED_RE = /\b(minimal|minimalist|minimalism|sparse|restrained|low[- ]?energy|weak|tiny|gentle|quiet|soft|thin|calm|subdued|delicate|faint|mellow|light\b)\b/i;
const VOCAL_RE = /\b(chorus|refrain|verse|vocal|vocals|voice|voices|sing|singing|singer|choir|chant|chants|lyric|lyrics|spoken|acapella|scream|screaming|whisper|whispers|rap|rapping|hum|humming)\b/i;
const okText = t => t && t.length <= 64 && !BANNED_RE.test(t) && !VOCAL_RE.test(t);

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

/* cross product of template parts, capped, shuffled, filtered, deduped */
function grow(name, phrases, cap) {
  const base = new Set((D[name] || []).map(x => String(x).toLowerCase().trim()));
  const seen = new Set();
  const out = [];
  for (const p of shuffle(phrases)) {
    const t = p.replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (!okText(t) || base.has(k) || seen.has(k)) continue;
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
const HARD = ["punishing", "brutal", "crushing", "slamming", "thunderous", "ferocious", "relentless", "savage", "merciless", "pounding", "hammering", "battering"];
const BIG = ["massive", "colossal", "titanic", "monolithic", "cavernous", "gigantic", "enormous", "towering", "monumental", "seismic"];
const HOT = ["overdriven", "saturated", "distorted", "clipped", "red-lined", "cranked", "scorched", "molten", "blistering", "searing"];
const TEX = ["analog", "digital", "granular", "tape-warmed", "vinyl-dusted", "transistor", "valve-driven", "circuit-bent", "modular", "resampled", "bit-crushed", "wavefolded"];
const MACH = ["909", "808", "707", "606", "727", "linn", "oberheim", "simmons", "SP-1200", "MPC-swung"];
const SPACE = ["warehouse", "bunker", "hangar", "cathedral", "tunnel", "silo", "foundry", "quarry", "aircraft-hangar", "subway-tunnel"];
const MOTION = ["rolling", "galloping", "driving", "surging", "pumping", "churning", "hurtling", "stampeding", "cascading", "accelerating"];

/* ------------------------------------------------ pool recipes ------------------------------------------------ */
const RECIPES = {
  /* ---------- drums ---------- */
  KICKS: {
    cap: 260, phrases: cat(
      X(cat(HARD, BIG, HOT), ["kick"]),
      X(TEX, ["kick"]),
      X(MACH, ["kick"]),
      X(SPACE, ["kick"]),
      X(cat(HARD, HOT), MACH, ["kick"]),
      X(cat(HARD, BIG), ["sub", "rumble", "tail", "thump", "body", "punch"], ["kick"]),
      X(["layered", "stacked", "double-hit", "triplet-tuned", "pitch-bent", "transient-shaped", "gated", "parallel-compressed"], ["kick"]),
      X(["off-grid", "swung", "shuffled", "flammed", "rolled", "doubled", "syncopated"], ["kick pattern"])
    )
  },
  HATS: {
    cap: 220, phrases: cat(
      X(cat(HARD, HOT, TEX), ["hats"]),
      X(MACH, ["hats"]),
      X(["16th-note", "32nd-note", "triplet", "offbeat", "shuffled", "swung", "rolling", "stuttered", "gated", "ratcheted", "flammed"], ["hats"]),
      X(["razor", "glassy", "metallic", "steely", "crystalline", "chrome", "titanium", "obsidian", "acid-etched"], ["hats"]),
      X(["open", "closed", "pedal", "half-open", "choked", "sizzling", "spitting"], ["hats"], ["pattern", "run", "loop"])
    )
  },
  SNARES: {
    cap: 200, phrases: cat(
      X(cat(HARD, BIG, HOT, TEX), ["snare"]),
      X(cat(HARD, BIG, HOT), ["clap"]),
      X(MACH, ["snare"]),
      X(SPACE, ["snare crack"]),
      X(["rimshot", "layered", "stacked", "gated", "reverb-blasted", "pitched-down", "pitched-up", "flammed", "rolled"], ["snare"]),
      X(["triple-stacked", "hand", "reverse", "slapback", "room-mic'd", "compressed"], ["clap"])
    )
  },
  PERCS: {
    cap: 220, phrases: cat(
      X(cat(HARD, TEX, HOT), ["percussion"]),
      X(["tribal", "industrial", "polyrhythmic", "syncopated", "machine", "hydraulic", "pneumatic", "kinetic", "scrap-metal", "anvil", "chain", "pipe"], ["percussion", "hits", "clatter"]),
      X(["conga", "bongo", "timbale", "djembe", "cowbell", "woodblock", "shaker", "cabasa", "guiro", "agogo", "tambourine", "clave"], ["pattern", "roll", "accents"]),
      X(SPACE, ["percussion"])
    )
  },
  TOMS: {
    cap: 150, phrases: cat(
      X(cat(HARD, BIG, TEX), ["toms"]),
      X(["rolling", "cascading", "descending", "ascending", "tribal", "thundering", "avalanche", "stampede"], ["tom", "tom-tom"], ["run", "fill", "roll", "barrage"]),
      X(MACH, ["toms"]),
      X(SPACE, ["tom fills"])
    )
  },
  GROOVES: {
    cap: 220, phrases: cat(
      X(MOTION, ["groove", "pocket", "drive", "swing"]),
      X(cat(HARD, BIG), ["hardgroove", "peak-time groove", "warehouse groove", "tribal groove"]),
      X(["four-on-the-floor", "broken-beat", "tribal", "polyrhythmic", "syncopated", "half-time", "double-time", "shuffle", "triplet", "swung 16th"], ["drive", "engine", "pressure", "momentum"]),
      X(["locked", "hypnotic", "propulsive", "unstoppable", "runaway", "steamrolling"], ["groove"])
    )
  },
  SWINGS: {
    cap: 140, phrases: cat(
      X(["straight", "swung", "shuffled", "triplet", "dotted", "humanized", "off-grid", "drunken", "elastic", "pushed", "pulled", "laid-back", "ahead-of-the-beat"], ["timing", "feel", "groove"]),
      X(["55%", "57%", "60%", "62%", "66%"], ["swing"]),
      X(MACH, ["swing"])
    )
  },
  SYNCS: {
    cap: 140, phrases: cat(
      X(["offbeat", "downbeat", "backbeat", "upbeat", "broken", "triplet", "cross-rhythm", "polymetric", "displaced", "stuttered", "ratcheted"], ["syncopation", "accents", "stabs", "pushes"]),
      X(["3-against-4", "5-against-4", "7/8", "5/4", "12/8"], ["syncopation"])
    )
  },
  INTENSITIES: {
    cap: 160, phrases: cat(
      X(cat(HARD, BIG, HOT), ["intensity", "pressure", "impact", "force"]),
      X(["maximum", "peak-time", "full-throttle", "all-out", "runaway", "unstoppable", "escalating", "explosive"], ["energy", "drive", "assault", "overdrive", "momentum"])
    )
  },

  /* ---------- bass ---------- */
  BASS_VOICES: {
    cap: 260, phrases: cat(
      X(cat(HARD, BIG, HOT, TEX), ["bass"]),
      X(["reese", "sub", "moog", "FM", "acid", "growl", "donk", "wobble", "square", "saw", "triangle", "pluck", "stab", "pad", "hoover", "808", "303", "talking", "formant", "supersaw"], ["bass"]),
      X(cat(HOT, TEX), ["reese", "sub", "FM", "acid", "growl"], ["bass"]),
      X(["chest-rattling", "floor-shaking", "earth-moving", "wall-flexing", "rib-cage"], ["sub", "bass"])
    )
  },
  BASS_MOVES: {
    cap: 180, phrases: cat(
      X(MOTION, ["octave", "eighth-note", "16th-note", "triplet", "offbeat", "chromatic", "pentatonic"], ["movement", "run", "line"]),
      X(["stepping", "walking", "leaping", "sliding", "portamento", "arpeggiated", "pedal-point", "call-and-response", "question-and-answer"], ["bass movement", "bassline"])
    )
  },
  BASS_RELS: {
    cap: 130, phrases: cat(
      X(["bass locked to the kick", "bass answering the lead", "bass shadowing the hook", "bass in octave unison with the lead", "bass countering the melody", "bass driving under the chords"], ["", "an octave down", "with a 16th delay", "in call-and-response"]),
      X(["tight", "loose", "syncopated", "interlocking", "contrapuntal"], ["bass-and-drum lock", "bass-and-lead dialogue"])
    )
  },

  /* ---------- melody / harmony ---------- */
  LEADS: {
    cap: 300, phrases: cat(
      X(cat(HOT, TEX, BIG), ["lead"]),
      X(["supersaw", "hypersaw", "FM", "additive", "wavetable", "granular", "vector", "phase-distortion", "pulse-width", "hoover", "trance", "acid", "bell", "pluck", "brass", "organ", "flute-like", "choir-like pad"], ["lead"]),
      X(["soaring", "screaming", "wailing", "roaring", "blazing", "piercing", "anthemic", "euphoric", "heroic", "triumphant"], ["lead", "topline", "hook"]),
      X(TEX, ["mono", "poly", "unison", "detuned"], ["lead"])
    )
  },
  PERFS: {
    cap: 160, phrases: cat(
      X(["played with", "performed with", "articulated with", "driven by"], ["wide vibrato", "hard pitch bends", "aggressive gating", "hammer-on runs", "glide portamento", "velocity accents", "expression-pedal swells", "aftertouch growl", "ribbon-controller sweeps", "mod-wheel filter opens", "stutter retriggers", "grace-note flourishes"])
    )
  },
  HARMONIES: {
    cap: 200, phrases: cat(
      X(cat(BIG, HARD), ["chords", "chord stabs", "progression"]),
      X(["suspended", "diminished", "augmented", "quartal", "modal", "borrowed", "neapolitan", "tritone-substituted", "chromatic-mediant", "picardy-third"], ["harmony", "progression", "chords"]),
      X(["minor-to-major", "major-to-minor", "ascending", "descending", "circular", "plagal", "deceptive"], ["lift", "resolution", "turnaround", "progression"])
    )
  },
  ARPS: {
    cap: 160, phrases: cat(
      X(["16th-note", "32nd-note", "triplet", "sextuplet", "up", "down", "up-down", "random-order", "chord-order", "octave-jumping", "polyrhythmic", "gated", "ratcheted"], ["arpeggio"]),
      X(cat(HOT, TEX), ["arpeggio"]),
      X(["euphoric", "cascading", "spiralling", "hypnotic", "runaway", "shimmering"], ["arpeggio", "arp run"])
    )
  },
  CONTOURS: {
    cap: 130, phrases: cat(
      X(["rising", "falling", "arch", "valley", "zig-zag", "terraced", "spiral", "wave", "staircase", "plateau-then-drop", "leap-then-step"], ["contour", "melodic shape"]),
      X(["wide-interval", "narrow-step", "octave-spanning", "two-octave", "chromatic-creeping"], ["contour"])
    )
  },
  RHYTHMS: {
    cap: 130, phrases: cat(
      X(["16th-note", "8th-note", "triplet", "dotted-8th", "syncopated", "half-time", "double-time", "cross-rhythm", "hemiola", "polymetric"], ["melody rhythm", "phrasing"]),
      X(["push-pull", "anticipated", "delayed-entry", "off-grid", "stuttered"], ["melodic phrasing"])
    )
  },

  /* ---------- techno lab ---------- */
  TECHNO_DRIVES: {
    cap: 140, phrases: cat(
      X(["turbo", "reactor", "piston", "hydraulic", "afterburner", "flywheel", "dynamo", "locomotive", "jet", "rotor", "thruster", "generator"], ["drive"]),
      X(cat(HARD, HOT), ["drive", "engine", "push"])
    )
  },
  TECHNO_ACIDS: {
    cap: 140, phrases: cat(
      X(["squelching", "boiling", "screaming", "writhing", "molten", "corrosive", "caustic", "venomous", "liquid", "razor", "runaway", "self-oscillating"], ["303 line", "acid line", "acid riff", "acid sequence"]),
      X(["overdriven", "resonance-cranked", "slide-heavy", "accent-driven"], ["acid line"])
    )
  },
  TECHNO_TEXTURES: {
    cap: 140, phrases: cat(
      X(TEX, ["texture", "grit", "haze", "film"]),
      X(SPACE, ["texture", "ambience", "reverberation"]),
      X(["scrap-metal", "steam", "coolant", "rust", "concrete", "diesel", "ozone", "static", "solder"], ["texture", "atmosphere"])
    )
  },
  TECHNO_RAVES: {
    cap: 130, phrases: cat(
      X(["hoover", "mentasm", "dominator", "trumpet", "orchestra-hit", "siren", "airhorn", "stab-stack", "chord-blast", "detuned-saw"], ["stabs", "blasts", "hits"]),
      X(cat(HOT, BIG), ["rave stabs", "rave riff"])
    )
  },
  TECHNO_INDUSTRIALS: {
    cap: 130, phrases: cat(
      X(["scrap-metal", "factory-stamp", "hydraulic-press", "steel-pipe", "anvil", "chain-drag", "girder", "rivet-gun", "arc-welder", "turbine", "conveyor", "furnace"], ["hits", "clangs", "impacts", "rhythm"])
    )
  },

  /* ---------- sound design ---------- */
  FILTER_TYPES: {
    cap: 150, phrases: cat(
      X(["lowpass", "highpass", "bandpass", "notch", "comb", "formant", "vowel", "state-variable", "ladder", "diode", "SEM", "MS-20"], ["12dB", "18dB", "24dB", "36dB", "resonant", "self-oscillating", "screaming"], ["filter"])
    )
  },
  ENVELOPE_TYPES: {
    cap: 120, phrases: cat(
      X(["snappy", "punchy", "explosive", "instant-attack", "slow-swell", "double-peak", "looping", "exponential", "logarithmic", "velocity-scaled"], ["ADSR", "envelope", "AD envelope", "DADSR"])
    )
  },
  LFO_TYPES: {
    cap: 140, phrases: cat(
      X(["sine", "triangle", "saw-up", "saw-down", "square", "sample-and-hold", "random-smooth", "chaos", "exponential"], ["0.25Hz", "0.5Hz", "1Hz", "2Hz", "4Hz", "8Hz", "1/4 sync", "1/8 sync", "1/16 sync", "triplet sync"], ["LFO"])
    )
  },
  DISTORTION_TYPES: {
    cap: 130, phrases: cat(
      X(["soft-clip", "hard-clip", "foldback", "wavefold", "bitcrush", "sample-rate-reduce", "diode", "germanium", "tube", "tape", "transformer", "fuzz", "octave-fuzz", "waveshaper"], ["distortion", "saturation", "drive"])
    )
  },
  REVERB_TYPES: {
    cap: 150, phrases: cat(
      X(["hall", "plate", "spring", "chamber", "room", "convolution", "shimmer", "granular", "reverse", "gated", "non-linear", "infinite"], ["large", "medium", "dark", "bright", "metallic", "modulated"], ["reverb"]),
      X(SPACE, ["impulse reverb"])
    )
  },
  DELAY_TYPES: {
    cap: 140, phrases: cat(
      X(["ping-pong", "stereo", "tape", "bucket-brigade", "digital", "granular", "reverse", "pitch-shifted", "filtered", "ducked"], ["1/8", "1/16", "dotted-1/8", "1/4", "triplet", "slapback"], ["delay"])
    )
  },
  SIDECHAIN_TYPES: {
    cap: 120, phrases: cat(
      X(["kick-ducked", "ghost-triggered", "bass-triggered", "snare-triggered", "band-split", "mid-side"], ["20ms", "40ms", "60ms", "80ms", "120ms", "1/16", "1/8"], ["sidechain"])
    )
  },
  STEREO_TYPES: {
    cap: 120, phrases: cat(
      X(["mono-solid", "wide", "super-wide", "mid-side", "haas", "hard-panned", "rotating", "auto-panned", "binaural", "ambisonic"], ["stereo field", "imaging", "spread"])
    )
  },
  FX_CHAINS: {
    cap: 160, phrases: (() => {
      const A = ["filter", "distortion", "bitcrush", "wavefold", "phaser", "flanger", "ring-mod", "delay", "reverb", "compressor", "granular"];
      const out = [];
      for (const a of A) for (const b of A) for (const c of A) {
        if (a === b || b === c || a === c) continue;
        out.push(a + " → " + b + " → " + c);
      }
      return out;
    })()
  },
  SOUND_INTENSITIES: {
    cap: 100, phrases: X(cat(HARD, BIG, HOT), ["sound-design intensity", "processing"])
  },
  CHORD_PROGS: {
    cap: 160, phrases: (() => {
      const roots = ["i", "iv", "v", "VI", "VII", "III", "ii°", "bII"];
      const out = [];
      for (const a of roots) for (const b of roots) for (const c of roots) for (const d of roots) {
        if (a === b || b === c || c === d) continue;
        out.push(a + "–" + b + "–" + c + "–" + d);
      }
      return out;
    })()
  },
  RHYTHM_PATTERNS: {
    cap: 160, phrases: cat(
      X(["four-on-the-floor", "broken", "tribal", "shuffle", "half-time", "double-time", "triplet", "polymetric", "syncopated", "ghost-heavy"], ["8-bar", "16-bar", "32-bar", "2-bar", "4-bar"], ["pattern"])
    )
  }
};

/* generic "texture-ish" pools: adjective × noun */
const GENERIC = {
  MIX_DENSITY: [cat(HARD, BIG, HOT), ["mix density", "layer stack", "wall of sound"]],
  MIX_ENERGY: [cat(HARD, BIG), ["mix energy", "forward drive", "front-loaded punch"]],
  MIX_SPACE: [cat(BIG, SPACE), ["mix space", "depth field", "room"]],
  MIX_GLUE: [["bus-compressed", "tape-glued", "transformer-glued", "parallel-crushed", "opto-glued", "VCA-glued"], ["mix glue", "bus cohesion"]],
  MIX_PUNCH: [cat(HARD, HOT), ["transient punch", "attack snap", "impact"]],
  MASTER_DRIVE: [cat(HOT, HARD), ["master drive", "bus saturation"]],
  MASTER_LOUDNESS: [["-4 LUFS", "-5 LUFS", "-6 LUFS", "-7 LUFS", "club-level", "festival-level", "peak-time"], ["loudness", "master level"]],
  MASTER_COLOR: [cat(TEX, HOT), ["master color", "bus tone"]],
  MASTER_CHAIN: [["EQ → compressor → saturator → limiter", "compressor → tape → clipper → limiter", "mid-side EQ → glue comp → soft clip → limiter", "transient shaper → saturator → multiband → limiter"], ["chain"]],
  FILTER_CUTOFF_TYPES: [["80Hz", "120Hz", "220Hz", "400Hz", "800Hz", "1.2kHz", "2.5kHz", "5kHz", "8kHz", "12kHz"], ["cutoff sweep", "cutoff automation", "cutoff open"]],
  FILTER_RESONANCE_TYPES: [["screaming", "self-oscillating", "biting", "howling", "razor", "resonant-peak"], ["resonance"]],
  EQ_TYPES: [["surgical", "broad-stroke", "mid-side", "dynamic", "tilt", "Pultec-style", "API-style", "SSL-style"], ["EQ"]],
  COMPRESSION_TYPES: [["FET", "VCA", "opto", "vari-mu", "multiband", "parallel", "serial", "upward", "transient-shaped"], ["compression"]],
  SATURATION_TYPES: [cat(TEX, HOT), ["saturation"]],
  SIDECHAIN_CURVE_TYPES: [["exponential", "logarithmic", "linear", "S-curve", "snap-back", "long-tail"], ["sidechain curve"]],
  STEREO_IMAGE: [["focused", "panoramic", "wall-to-wall", "mid-forward", "side-heavy", "rotating"], ["stereo image"]],
  STEREO_WIDTH: [["110%", "130%", "150%", "180%", "200%", "mono-bass"], ["stereo width"]],
  SPATIAL_DEPTH: [cat(BIG, SPACE), ["depth", "front-to-back staging"]],
  SPATIAL_MOVEMENT: [["orbiting", "sweeping", "spiralling", "ricocheting", "pendulum", "auto-panned", "doppler"], ["spatial movement"]],
  STEREO_ENHANCE_TYPES: [["haas", "mid-side", "unison-widened", "phase-rotated", "multiband-widened"], ["stereo enhancement"]],
  REVERB_SIZE_TYPES: [cat(BIG, SPACE), ["reverb size"]],
  REVERB_DECAY_TYPES: [["0.8s", "1.5s", "2.5s", "4s", "6s", "10s", "infinite", "gated 300ms", "reverse-swelling"], ["decay"]],
  MOD_SOURCE: [["LFO 1", "LFO 2", "envelope 2", "sample-and-hold", "velocity", "aftertouch", "step-sequencer", "chaos generator", "audio-rate operator"], ["modulation source"]],
  MOD_DEST: [["filter cutoff", "resonance", "pitch", "pulse width", "FM depth", "wavefolder", "delay time", "reverb size", "pan", "drive"], ["modulation target"]],
  MOD_RATE: [["1/1", "1/2", "1/4", "1/8", "1/16", "1/32", "triplet", "dotted", "free-running", "audio-rate"], ["modulation rate"]],
  MOD_DEPTH: [["subtle", "moderate", "deep", "extreme", "full-range", "bipolar", "unipolar"], ["modulation depth"]],
  TEXTURE_LAYER: [cat(TEX, HARD), ["texture layer", "grit bed"]],
  GRAIN_TYPE: [cat(TEX, HARD), ["granular grain", "grain cloud"]],
  SHIMMER_TYPE: [["octave-up", "fifth-up", "two-octave", "crystalline", "spectral", "harmonic"], ["shimmer"]],
  ATMOSPHERE_TYPE: [cat(SPACE, BIG), ["atmosphere", "air", "ambience"]],
  GHOST_NOTES: [["16th", "32nd", "triplet", "velocity-scaled", "filtered", "hat", "snare", "kick"], ["ghost notes"]],
  HUMANIZE_TYPES: [["±2ms", "±5ms", "±8ms", "±12ms", "velocity-randomized", "groove-templated", "live-drummer"], ["humanization"]],
  POCKET_TYPES: [["ahead-of-the-beat", "behind-the-beat", "dead-center", "elastic", "locked-in", "pushing"], ["pocket"]],
  ORNAMENT_TYPES: [["grace-note", "mordent", "trill", "turn", "acciaccatura", "slide-in", "fall-off", "doit"], ["ornamentation"]],
  VIBRATO_TYPES: [["wide", "fast", "slow-onset", "delayed", "pitch-only", "filter", "amplitude"], ["vibrato"]],
  PORTAMENTO_TYPES: [["10ms", "40ms", "80ms", "150ms", "fingered", "constant-rate", "constant-time", "legato-only"], ["portamento"]],
  SCALE_RUNS: [["ascending", "descending", "chromatic", "pentatonic", "modal", "octave-displaced", "double-time", "cascading"], ["scale run"]],
  INTERVAL_LEAPS: [["octave", "fifth", "seventh", "ninth", "tritone", "eleventh", "two-octave", "compound"], ["leap"]],
  VOICING_TYPES: [["close", "open", "drop-2", "drop-3", "quartal", "cluster", "spread", "shell", "rootless"], ["voicing"]],
  INVERSION_TYPES: [["root-position", "first-inversion", "second-inversion", "third-inversion", "slash-bass", "pedal-bass"], ["inversion"]],
  TENSION_TYPES: [["b9", "#9", "#11", "b13", "add9", "sus2", "sus4", "13"], ["tension"]],
  RESOLUTION_TYPES: [["authentic", "plagal", "deceptive", "phrygian", "chromatic", "suspended-then-released", "delayed"], ["resolution"]],
  DELAY_TIME_TYPES: [["1/16", "1/8", "dotted-1/8", "1/4", "dotted-1/4", "triplet-1/8", "60ms", "120ms", "250ms", "375ms"], ["delay time"]],
  DELAY_FEEDBACK_TYPES: [["15%", "30%", "45%", "60%", "75%", "self-oscillating", "filtered", "ducked"], ["feedback"]],
  SECTION_DENSITY_TYPES: [cat(HARD, BIG), ["section density", "arrangement density"]],
  RIDE_TYPES: [["bell-heavy", "washy", "crashing", "tight-ping", "sizzling", "metallic", "hand-hammered"], ["ride"]],
  CRASH_TYPES: [cat(BIG, HARD), ["crash", "china crash", "splash"]],
  CLAP_LAYERS: [["triple-stacked", "room-mic'd", "reverse-tailed", "gated", "pitched", "flammed"], ["clap layer"]],
  PERC_FILLS: [["tom", "shaker", "conga", "metal", "glitch", "reverse", "stutter", "roll"], ["fill"]],
  FX_TYPES: [["riser", "downlifter", "impact", "reverse-swell", "sweep", "noise-burst", "tape-stop", "glitch-stutter", "vinyl-brake", "siren"], ["FX"]],
  TRANSITION_TYPES: [["filter-sweep", "drum-roll", "reverse-cymbal", "silence-drop", "tape-stop", "beat-repeat", "noise-riser"], ["transition"]],
  RISER_TYPES: [["white-noise", "pitch-rising", "granular", "shepard-tone", "filtered-saw", "snare-roll"], ["riser"]],
  IMPACT_TYPES: [cat(BIG, HARD), ["impact", "boom", "hit"]],
  ENERGY_CURVE_TYPES: [["linear-climb", "step-climb", "plateau-then-surge", "double-peak", "sawtooth", "relentless-climb"], ["energy curve"]],
  BUILD_TYPES: [["8-bar", "16-bar", "32-bar", "filter-driven", "drum-driven", "noise-driven", "harmonic"], ["build"]],
  DROP_TYPES: [["full-force", "half-time", "beat-skipping", "silence-then-slam", "double-drop", "rolling"], ["drop"]],
  CHOP_TYPES: [["16th", "32nd", "triplet", "reverse", "gated", "stutter", "granular", "beat-repeat"], ["chop"]],
  FEELINGS: [["ferocious", "unstoppable", "triumphant", "defiant", "ecstatic", "possessed", "electrified", "volcanic", "iron-willed", "star-bound"], [""]],
  FLAVORS: [["dangerously", "brutally", "gloriously", "savagely", "impossibly", "relentlessly"], ["alive", "beautiful", "hopeful", "euphoric", "unhinged", "cinematic"]],
  DIRECTIONS: [["soaring", "screaming", "hammering", "spiralling", "cascading", "surging"], ["emotional hook", "octave melody", "minor-key lead", "anthem topline", "counter-line"]]
};
for (const [name, parts] of Object.entries(GENERIC)) {
  RECIPES[name] = { cap: 120, phrases: X(...parts) };
}

/* ------------------------------------------------ generate ------------------------------------------------ */
const EXTRA = {};
let added = 0, pools = 0;
for (const [name, r] of Object.entries(RECIPES)) {
  if (!Array.isArray(D[name])) { console.warn("skip unknown pool " + name); continue; }
  const list = grow(name, r.phrases, r.cap);
  if (!list.length) continue;
  EXTRA[name] = list; added += list.length; pools++;
}

const header = `/* data/expansion.js — GENERATED by tools/expand-sounds.js. DO NOT EDIT BY HAND.
   Additive sound-pool expansion: ${added} new entries across ${pools} pools.
   Deterministic, deduped against the verbatim pools, banned-word free,
   instrumental-safe. The verbatim legacy pools in the other data modules
   are never modified — these are appended at runtime by engine/state.js. */\n`;
const body = Object.entries(EXTRA)
  .map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v, null, 0).replace(/","/g, '",\n    "') + ",")
  .join("\n");
writeFileSync(new URL("../data/expansion.js", import.meta.url),
  header + "export const EXTRA_POOLS = {\n" + body + "\n};\n");

const before = Object.keys(EXTRA).reduce((a, k) => a + D[k].length, 0);
console.log("Expanded " + pools + " pools: " + before + " → " + (before + added) + " entries (+" + added + ").");
