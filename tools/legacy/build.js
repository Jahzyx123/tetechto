#!/usr/bin/env node
/* =====================================================================
   NEON FORGE II — build script
   ---------------------------------------------------------------------
   Extracts EVERY data pool (sounds, ideas, melodies, styles, genres,
   concepts, sparks…) verbatim from the original app (Tetech-main/
   index.html), then assembles the brand-new single-file app
   (index.html at the repo root) around them.

   Usage:  node tools/build.js
   Output: index.html
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const OLD = path.join(ROOT, "Tetech-main", "index.html");
const SHELL = path.join(__dirname, "shell.html");
const OUT = path.join(ROOT, "index.html");

/* ------------------------- JS-aware scanner -------------------------
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

/* --------------------------- data manifest --------------------------- */
const DATA_NAMES = [
  // styles / genres / tempo
  "STYLES", "GENRES", "TEMPO_RULES", "WEIRD_MIX", "SCALE_TIERS",
  // melody / feeling
  "FEELINGS", "FLAVORS", "DIRECTIONS", "LEADS", "PERFS", "HARMONIES",
  "CHORD_COLORS", "ARPS", "CONTOURS", "RHYTHMS", "MELODY_CONCEPT",
  "EMOTION_ANTHEMS", "MELODY_DOMINANT_ANTHEMS", "HARMONY_ANTHEMS",
  // bass / drums
  "BASS_VOICES", "BASS_MOVES", "BASS_RELS", "KICKS", "HATS", "SNARES",
  "PERCS", "TOMS", "GROOVES", "SWINGS", "SYNCS", "INTENSITIES",
  // techno lab
  "TECHNO_DRIVES", "TECHNO_ACIDS", "TECHNO_TEXTURES", "TECHNO_RAVES",
  "TECHNO_INDUSTRIALS",
  // sound design
  "FILTER_TYPES", "ENVELOPE_TYPES", "LFO_TYPES", "DISTORTION_TYPES",
  "REVERB_TYPES", "DELAY_TYPES", "SIDECHAIN_TYPES", "STEREO_TYPES",
  "FX_CHAINS", "SOUND_INTENSITIES",
  // harmony / rhythm
  "CHORD_PROGS", "RHYTHM_PATTERNS",
  // mix & master
  "MIX_DENSITY", "MIX_ENERGY", "MIX_SPACE", "MIX_GLUE", "MIX_PUNCH",
  "MASTER_DRIVE", "MASTER_LOUDNESS", "MASTER_COLOR", "MASTER_CHAIN",
  "FILTER_CUTOFF_TYPES", "FILTER_RESONANCE_TYPES", "EQ_TYPES",
  "COMPRESSION_TYPES", "SATURATION_TYPES", "SIDECHAIN_CURVE_TYPES",
  // spatial & mod
  "STEREO_IMAGE", "STEREO_WIDTH", "SPATIAL_DEPTH", "SPATIAL_MOVEMENT",
  "MOD_SOURCE", "MOD_DEST", "MOD_RATE", "MOD_DEPTH", "TEXTURE_LAYER",
  "GRAIN_TYPE", "SHIMMER_TYPE", "ATMOSPHERE_TYPE", "REVERB_SIZE_TYPES",
  "REVERB_DECAY_TYPES", "STEREO_ENHANCE_TYPES",
  // groove & melodic
  "GHOST_NOTES", "HUMANIZE_TYPES", "POCKET_TYPES", "ORNAMENT_TYPES",
  "VIBRATO_TYPES", "PORTAMENTO_TYPES", "SCALE_RUNS", "INTERVAL_LEAPS",
  "VOICING_TYPES", "INVERSION_TYPES", "TENSION_TYPES", "RESOLUTION_TYPES",
  "DELAY_TIME_TYPES", "DELAY_FEEDBACK_TYPES", "SECTION_DENSITY_TYPES",
  // texture & fx
  "RIDE_TYPES", "CRASH_TYPES", "CLAP_LAYERS", "PERC_FILLS", "FX_TYPES",
  "TRANSITION_TYPES", "RISER_TYPES", "IMPACT_TYPES", "ENERGY_CURVE_TYPES",
  "BUILD_TYPES", "DROP_TYPES", "CHOP_TYPES",
  // concept / arrangement / keys / scales
  "CONCEPT", "ARRANGEMENTS", "ARC_TEMPLATES", "NOTE_NAMES", "SCALES",
  "MICRO_MODES", "MELODY_FORCE",
  // layers / safety
  "LAYERS", "VOCAL_DIRECTIONS", "BANNED_MINIMAL", "VOCAL_WORDS",
  // atoms & pickers
  "ATOMS", "COUNTER_ROLE", "VOICE_ROLE", "PICKER_POOLS",
  // spark / idea pools (all of them)
  "SPARK_IDEAS", "SPARK_TITLES", "SPARK_MASHUPS", "SPARK_CONSTRAINTS",
  "SPARK_TIPS", "SPARK_VIBES", "SPARK_PLACES", "SPARK_THINGS",
  "SPARK_TRANSFORMS", "SPARK_CHALLENGES", "SPARK_MEGA_LINES",
  "SPARK_WEATHER", "SPARK_LIGHT", "SPARK_SOUNDS", "SPARK_FUTURES",
  "SPARK_ANTHEM_NAMES", "SPARK_TITLES2", "SPARK_HOOKS", "SPARK_OPENERS",
  "SPARK_SECTION_SPARKS", "SPARK_STYLE_STUNTS", "SPARK_GENRE_SCRAMBLES",
  "SPARK_BASSLINES", "SPARK_DRUM_LINES", "SPARK_MELODY_PHRASES",
  "SPARK_CONCEPT_TWISTS", "SPARK_ARRANGEMENT_PACKS", "SPARK_MIX_PUNCH",
  "SPARK_MASTER_HEART", "SPARK_SUNO_CUES", "SPARK_DJ_NOTES",
  "SPARK_MORE_MAGIC_2", "EXTRA_SPARK_KINDS", "EXTRA_SPARK_KINDS2",
  "SAFETY_LINE"
];

function main() {
  const { expandPools } = require("./expand.js");
  const oldSrc = fs.readFileSync(OLD, "utf8");
  const parts = [];
  for (const name of DATA_NAMES) {
    const body = extractConst(oldSrc, name);
    parts.push("const " + name + " = " + expandPools(name, body) + ";");
  }
  const dataBlock = parts.join("\n\n");

  // syntax-check the extracted data standalone (no DOM needed — pure data)
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(dataBlock, sandbox, { timeout: 5000 });
  // top-level consts live in the context's lexical env, not on the sandbox
  // object — probe them with a shorthand object literal instead.
  const all = vm.runInContext("({ " + DATA_NAMES.join(", ") + " })", sandbox, { timeout: 5000 });
  const total = Object.keys(all).length;
  const count = (n) => {
    const v = all[n];
    return Array.isArray(v) ? v.length : (v && typeof v === "object" ? Object.keys(v).length : 1);
  };
  const big = ["STYLES", "GENRES", "FEELINGS", "FLAVORS", "DIRECTIONS", "LEADS",
    "PERFS", "HARMONIES", "ARPS", "CONTOURS", "RHYTHMS", "BASS_VOICES",
    "BASS_MOVES", "BASS_RELS", "KICKS", "HATS", "SNARES", "PERCS", "TOMS",
    "GROOVES", "SWINGS", "SYNCS", "INTENSITIES", "ARRANGEMENTS", "ATOMS"];
  const lines = ["Extracted " + total + " data pools:"];
  for (const n of big) { const cc = count(n); lines.push("  " + n.padEnd(16) + cc + " entries"); }
  let sparkTotal = 0;
  for (const k of Object.keys(all)) if (/^SPARK_/.test(k)) sparkTotal += count(k);
  lines.push("  SPARK_* pools total   " + sparkTotal + " spark entries");
  console.log(lines.join("\n"));

  // assemble
  const shell = fs.readFileSync(SHELL, "utf8");
  const marker = "/*__DATA__*/";
  const engineMarker = "/*__ENGINE__*/";
  if (!shell.includes(marker)) throw new Error("shell.html is missing the " + marker + " marker");
  if (!shell.includes(engineMarker)) throw new Error("shell.html is missing the " + engineMarker + " marker");
  const engine = ["engine.js", "engine2.js", "engine3.js"]
    .map(f => fs.readFileSync(path.join(__dirname, f), "utf8"))
    .join("\n\n");
  const out = shell.replace(marker, dataBlock).replace(engineMarker, engine);
  fs.writeFileSync(OUT, out);
  console.log("Wrote " + path.relative(ROOT, OUT) + " (" + Math.round(out.length / 1024) + " KB)");
}

main();
