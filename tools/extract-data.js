#!/usr/bin/env node
/* =====================================================================
   NEON FORGE — data extraction step
   ---------------------------------------------------------------------
   Pulls every data pool VERBATIM out of the original single-file app
   (Tetech-main/index.html) and writes them as ES modules under /data,
   split by domain. The pool text itself is never re-authored here —
   extractConst() below is the JS-aware scanner reused from the legacy
   build script (tools/legacy/build.js), and the deterministic pool
   expansion from tools/legacy/expand.js is applied exactly as the old
   build did, so the shipped pools match the legacy app entry-for-entry.

   Usage:  node tools/extract-data.js
   Output: data/*.js  (generated — do not hand-edit)
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OLD = path.join(ROOT, "Tetech-main", "index.html");
const OUT_DIR = path.join(ROOT, "data");

// legacy expander is CommonJS — load it through require()
const require = createRequire(import.meta.url);
const { expandPools } = require("./legacy/expand.js");

/* ------------------------- JS-aware scanner -------------------------
   (verbatim from tools/legacy/build.js)
   Extracts `const NAME = <statement>;` blocks from the original file.
   Handles: double/single-quoted strings, template literals with ${...},
   regex literals, line & block comments, and nested brackets. Ends at
   the top-level semicolon. ------------------------------------------------- */
function extractConst(src, name) {
  const startRe = new RegExp("(^|\\n)const\\s+" + name + "\\s*=\\s*");
  const m = startRe.exec(src);
  if (!m) throw new Error("const not found: " + name);
  let i = m.index + m[0].length;
  const start = i;
  let depth = 0;          // bracket depth
  let mode = "code";      // code | dq | sq | tpl | re | line | block
  let tplDepth = 0;       // brace depth inside ${...} within a template
  let prevSig = null;     // previous significant char (for regex detection)

  const isSig = (c) => c !== undefined && !/\s/.test(c);

  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];

    if (mode === "line") { if (c === "\n") mode = "code"; i++; continue; }
    if (mode === "block") {
      if (c === "*" && n === "/") { mode = "code"; i += 2; } else i++;
      continue;
    }
    if (mode === "dq" || mode === "sq") {
      if (c === "\\") { i += 2; continue; }
      if ((mode === "dq" && c === '"') || (mode === "sq" && c === "'")) mode = "code";
      i++; continue;
    }
    if (mode === "tpl") {
      if (c === "\\") { i += 2; continue; }
      if (c === "`" && tplDepth === 0) { mode = "code"; i++; continue; }
      if (c === "$" && n === "{") { tplDepth = 1; i += 2; continue; }
      if (tplDepth > 0) {
        if (c === "{") tplDepth++;
        else if (c === "}") tplDepth--;
      }
      i++; continue;
    }
    if (mode === "re") {
      if (c === "\\") { i += 2; continue; }
      if (c === "[") { // char class — skip to its closing ]
        while (i < src.length && src[i] !== "]") { if (src[i] === "\\") i++; i++; }
        i++; continue;
      }
      if (c === "/") mode = "code";
      i++; continue;
    }

    // code mode
    if (c === "/" && n === "/") { mode = "line"; i += 2; continue; }
    if (c === "/" && n === "*") { mode = "block"; i += 2; continue; }
    if (c === "/" && (prevSig === null || "[,(={:;!&|?+-*%<>".includes(prevSig))) { mode = "re"; i++; continue; }
    if (c === '"') { mode = "dq"; i++; continue; }
    if (c === "'") { mode = "sq"; i++; continue; }
    if (c === "`") { mode = "tpl"; tplDepth = 0; i++; continue; }
    if (c === "[" || c === "{" || c === "(") { depth++; i++; prevSig = c; continue; }
    if (c === "]" || c === "}" || c === ")") { depth--; i++; prevSig = c; continue; }
    if (c === ";" && depth === 0) {
      return src.slice(start, i); // statement body, no trailing ;
    }
    if (isSig(c)) prevSig = c;
    i++;
  }
  throw new Error("unterminated const: " + name);
}

/* --------------------------- data manifest ---------------------------
   Same pool list as the legacy build's DATA_NAMES, split by domain into
   the module files each pool will live in. */
const DATA_FILES = {
  "styles.js": {
    doc: "Techno style pool (838 styles), genre/sub-style combos (no-techno mode), tempo rules, weirdness mix and scale tiers.",
    names: ["STYLES", "GENRES", "TEMPO_RULES", "WEIRD_MIX", "SCALE_TIERS"]
  },
  "melody.js": {
    doc: "Feeling / melody / harmony pools.",
    names: ["FEELINGS", "FLAVORS", "DIRECTIONS", "LEADS", "PERFS", "HARMONIES",
      "CHORD_COLORS", "ARPS", "CONTOURS", "RHYTHMS", "MELODY_CONCEPT",
      "EMOTION_ANTHEMS", "MELODY_DOMINANT_ANTHEMS", "HARMONY_ANTHEMS"]
  },
  "rhythm-section.js": {
    doc: "Bass and drum pools.",
    names: ["BASS_VOICES", "BASS_MOVES", "BASS_RELS", "KICKS", "HATS", "SNARES",
      "PERCS", "TOMS", "GROOVES", "SWINGS", "SYNCS", "INTENSITIES"]
  },
  "techno.js": {
    doc: "Techno lab pools (drive / acid / texture / rave / industrial).",
    names: ["TECHNO_DRIVES", "TECHNO_ACIDS", "TECHNO_TEXTURES", "TECHNO_RAVES",
      "TECHNO_INDUSTRIALS"]
  },
  "sound-design.js": {
    doc: "Sound design, chord progression and rhythm pattern pools.",
    names: ["FILTER_TYPES", "ENVELOPE_TYPES", "LFO_TYPES", "DISTORTION_TYPES",
      "REVERB_TYPES", "DELAY_TYPES", "SIDECHAIN_TYPES", "STEREO_TYPES",
      "FX_CHAINS", "SOUND_INTENSITIES", "CHORD_PROGS", "RHYTHM_PATTERNS"]
  },
  "mix-master.js": {
    doc: "Mix & master pools.",
    names: ["MIX_DENSITY", "MIX_ENERGY", "MIX_SPACE", "MIX_GLUE", "MIX_PUNCH",
      "MASTER_DRIVE", "MASTER_LOUDNESS", "MASTER_COLOR", "MASTER_CHAIN",
      "FILTER_CUTOFF_TYPES", "FILTER_RESONANCE_TYPES", "EQ_TYPES",
      "COMPRESSION_TYPES", "SATURATION_TYPES", "SIDECHAIN_CURVE_TYPES"]
  },
  "spatial.js": {
    doc: "Spatial / modulation / texture-layer pools.",
    names: ["STEREO_IMAGE", "STEREO_WIDTH", "SPATIAL_DEPTH", "SPATIAL_MOVEMENT",
      "MOD_SOURCE", "MOD_DEST", "MOD_RATE", "MOD_DEPTH", "TEXTURE_LAYER",
      "GRAIN_TYPE", "SHIMMER_TYPE", "ATMOSPHERE_TYPE", "REVERB_SIZE_TYPES",
      "REVERB_DECAY_TYPES", "STEREO_ENHANCE_TYPES"]
  },
  "groove-melodic.js": {
    doc: "Groove & melodic detail pools.",
    names: ["GHOST_NOTES", "HUMANIZE_TYPES", "POCKET_TYPES", "ORNAMENT_TYPES",
      "VIBRATO_TYPES", "PORTAMENTO_TYPES", "SCALE_RUNS", "INTERVAL_LEAPS",
      "VOICING_TYPES", "INVERSION_TYPES", "TENSION_TYPES", "RESOLUTION_TYPES",
      "DELAY_TIME_TYPES", "DELAY_FEEDBACK_TYPES", "SECTION_DENSITY_TYPES"]
  },
  "texture-fx.js": {
    doc: "Texture / FX / transition pools.",
    names: ["RIDE_TYPES", "CRASH_TYPES", "CLAP_LAYERS", "PERC_FILLS", "FX_TYPES",
      "TRANSITION_TYPES", "RISER_TYPES", "IMPACT_TYPES", "ENERGY_CURVE_TYPES",
      "BUILD_TYPES", "DROP_TYPES", "CHOP_TYPES"]
  },
  "concept.js": {
    doc: "Track concept pools, arrangements and energy-arc templates.",
    names: ["CONCEPT", "ARRANGEMENTS", "ARC_TEMPLATES"]
  },
  "scales.js": {
    doc: "Musical key engine data: notes, scales (with real intervals), microtonal modes, melodic force levels.",
    names: ["NOTE_NAMES", "SCALES", "MICRO_MODES", "MELODY_FORCE"]
  },
  "safety.js": {
    doc: "Detail layers, vocal directions, and the output-safety word lists.",
    names: ["LAYERS", "VOCAL_DIRECTIONS", "BANNED_MINIMAL", "VOCAL_WORDS", "SAFETY_LINE"]
  },
  "sparks.js": {
    doc: "Every spark/idea pool (titles, hooks, anthem names, mashups, …) feeding the unified roll engine.",
    names: ["SPARK_IDEAS", "SPARK_TITLES", "SPARK_MASHUPS", "SPARK_CONSTRAINTS",
      "SPARK_TIPS", "SPARK_VIBES", "SPARK_PLACES", "SPARK_THINGS",
      "SPARK_TRANSFORMS", "SPARK_CHALLENGES", "SPARK_MEGA_LINES",
      "SPARK_WEATHER", "SPARK_LIGHT", "SPARK_SOUNDS", "SPARK_FUTURES",
      "SPARK_ANTHEM_NAMES", "SPARK_TITLES2", "SPARK_HOOKS", "SPARK_OPENERS",
      "SPARK_SECTION_SPARKS", "SPARK_STYLE_STUNTS", "SPARK_GENRE_SCRAMBLES",
      "SPARK_BASSLINES", "SPARK_DRUM_LINES", "SPARK_MELODY_PHRASES",
      "SPARK_CONCEPT_TWISTS", "SPARK_ARRANGEMENT_PACKS", "SPARK_MIX_PUNCH",
      "SPARK_MASTER_HEART", "SPARK_SUNO_CUES", "SPARK_DJ_NOTES",
      "SPARK_MORE_MAGIC_2", "EXTRA_SPARK_KINDS", "EXTRA_SPARK_KINDS2"]
  },
  "atoms.js": {
    doc: "Field atlas: every rollable atom (key, card, label), picker pool wiring, and counter/voice relations.",
    names: ["ATOMS", "COUNTER_ROLE", "VOICE_ROLE", "PICKER_POOLS"],
    // ATOMS display functions reference the key helpers
    extraImports: { "../engine/music.js": ["keyName", "camelot"] }
  }
};

/* engine helper names that data modules may reference (besides pools) */
const ALL_NAMES = Object.values(DATA_FILES).flatMap(f => f.names);
const FILE_OF = {};
for (const [file, def] of Object.entries(DATA_FILES)) {
  for (const n of def.names) FILE_OF[n] = file;
}

function main() {
  const oldSrc = fs.readFileSync(OLD, "utf8");

  // 1. extract + expand every pool (identical to the legacy build)
  const bodies = {};
  for (const name of ALL_NAMES) {
    bodies[name] = expandPools(name, extractConst(oldSrc, name));
  }

  // 2. write one ES module per domain
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const written = [];
  for (const [file, def] of Object.entries(DATA_FILES)) {
    const parts = [];
    parts.push("/* " + file + " — " + def.doc);
    parts.push("   GENERATED VERBATIM from Tetech-main/index.html by tools/extract-data.js.");
    parts.push("   Do not hand-edit; re-run `node tools/extract-data.js` instead. */");

    // imports: any identifier from another data file that this file's bodies use
    const text = def.names.map(n => bodies[n]).join("\n");
    const needed = {};
    for (const other of ALL_NAMES) {
      if (def.names.includes(other)) continue;
      if (new RegExp("\\b" + other + "\\b").test(text)) {
        const from = "./" + FILE_OF[other];
        (needed[from] = needed[from] || []).push(other);
      }
    }
    if (def.extraImports) {
      for (const [from, ids] of Object.entries(def.extraImports)) {
        (needed[from] = needed[from] || []).push(...ids);
      }
    }
    for (const [from, ids] of Object.entries(needed)) {
      parts.push("import { " + [...new Set(ids)].join(", ") + ' } from "' + from + '";');
    }
    parts.push("");
    for (const name of def.names) {
      parts.push("export const " + name + " = " + bodies[name] + ";");
      parts.push("");
    }
    const out = parts.join("\n");
    fs.writeFileSync(path.join(OUT_DIR, file), out);
    written.push([file, out.length]);
  }

  // 3. barrel module
  const barrel = [
    "/* data/index.js — barrel re-export of every pool (GENERATED by tools/extract-data.js). */",
    ...Object.keys(DATA_FILES).map(f => 'export * from "./' + f + '";'),
    ""
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "index.js"), barrel);
  written.push(["index.js", barrel.length]);

  for (const [f, len] of written) {
    console.log("  data/" + f.padEnd(20) + Math.round(len / 1024) + " KB");
  }
  console.log("Extracted " + ALL_NAMES.length + " pools into " + written.length + " modules.");
}

main();
