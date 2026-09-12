/* engine/share.js — shareable state via URL (?s=…).
   Ported from the legacy engine: same short-key map, same URL-safe
   base64 encoding, so states round-trip losslessly. Works in both the
   browser and Node (tests). */
import { defaultState, defaultLocks, defaultHidden } from "./state.js";

function toB64(str) {
  if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(str)));
  return Buffer.from(str, "utf8").toString("base64");
}
function fromB64(b64) {
  if (typeof atob === "function") return decodeURIComponent(escape(atob(b64)));
  return Buffer.from(b64, "base64").toString("utf8");
}

const MAP = {
  p: "primaryStyle", s2: "secondaryStyle", pg: "primaryGenre", sg: "secondaryGenre",
  b: "bpm", rp: "rootPc", sc: "scaleId", f: "feeling", fl: "flavor", d: "direction",
  lv: "leadVoice", lp: "leadPerf", ct: "contour", rh: "rhythm", h: "harmony", cc: "chordColor",
  ar: "arpeggio", bv: "bassVoice", bm: "bassMovement", br: "bassRel", k: "kick", ha: "hats",
  sn: "snare", pc: "perc", tm: "toms", gr: "groove", sw: "swing", sy: "sync", it: "intensity",
  arng: "arrangement", td: "technoDrive", ta: "technoAcid", tt: "technoTexture", tr: "technoRave", ti: "technoIndustrial",
  aa: "acidAmt", da: "driveAmt", mm: "microMelody", mb: "microBass", im: "instrumental", vm: "vocalMode",
  w: "weirdness", inf: "influence", dur: "duration", mf: "melodicForce", to: "techOnly", eq: "equalChance", nhp: "noHandPerc",
  ft: "filterType", et: "envelopeType", lt: "lfoType", dt: "distortionType", rt: "reverbType", dlt: "delayType",
  sct: "sidechainType", stt: "stereoType", fx: "fxChain", cprog: "chordProg", rpat: "rhythmPattern", sint: "soundIntensity",
  mixDensity: "mixDensity", mixEnergy: "mixEnergy", mixSpace: "mixSpace", mixGlue: "mixGlue", mixPunch: "mixPunch",
  masterDrive: "masterDrive", masterLoudness: "masterLoudness", masterColor: "masterColor", masterChain: "masterChain",
  stereoImage: "stereoImage", stereoWidth: "stereoWidth", spatialDepth: "spatialDepth", spatialMovement: "spatialMovement",
  modSource: "modSource", modDest: "modDest", modRate: "modRate", modDepth: "modDepth",
  textureLayer: "textureLayer", grainType: "grainType", shimmerType: "shimmerType", atmosphereType: "atmosphereType",
  ghostNotes: "ghostNotes", humanizeType: "humanizeType", pocketType: "pocketType",
  ornamentType: "ornamentType", vibratoType: "vibratoType", portamentoType: "portamentoType", scaleRun: "scaleRun", intervalLeap: "intervalLeap",
  voicingType: "voicingType", inversionType: "inversionType", tensionType: "tensionType", resolutionType: "resolutionType",
  rideType: "rideType", crashType: "crashType", clapLayer: "clapLayer", percFill: "percFill",
  fxType: "fxType", transitionType: "transitionType", riserType: "riserType", impactType: "impactType",
  sectionDensity: "sectionDensity", energyCurve: "energyCurve", buildType: "buildType", dropType: "dropType", chopType: "chopType",
  filterCutoff: "filterCutoff", filterResonance: "filterResonance", reverbSize: "reverbSize", reverbDecay: "reverbDecay",
  delayTime: "delayTime", delayFeedback: "delayFeedback",
  saturationType: "saturationType", compressionType: "compressionType", eqType: "eqType", sidechainCurve: "sidechainCurve", stereoEnhance: "stereoEnhance",
  cm: "counterMelody", cmr: "counterMelodyRelation", vc: "voiceConcept", vr: "voiceRelation",
  slim: "slim", lfg: "lastFitGenre",
  slt: "soundLite", nst: "noStop", hbt: "hideBeats",
  mx: "maxStyle", vp: "vocalProfile"
};

export function encodeState(s) {
  const m = { sd: s.seed, st: s.structure, sf: s.styleFit, cp: s.concept, mc: s.melodyConcept, ly: s.layers, lk: s.locks, hd: s.hidden, ltx: s.lyrics };
  for (const short in MAP) m[short] = s[MAP[short]];
  const json = JSON.stringify(m);
  return toB64(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeState(str) {
  try {
    str = String(str).replace(/-/g, "+").replace(/_/g, "/");
    const m = JSON.parse(fromB64(str));
    const s = defaultState();
    if (m.sd !== undefined) s.seed = m.sd;
    for (const short in MAP) { if (m[short] !== undefined) s[MAP[short]] = m[short]; }
    if (m.st !== undefined) s.structure = !!m.st;
    if (m.sf !== undefined) s.styleFit = !!m.sf;
    if (m.cp) s.concept = Object.assign(s.concept, m.cp);
    if (m.mc) s.melodyConcept = Object.assign(s.melodyConcept, m.mc);
    if (m.ly) s.layers = m.ly;
    if (m.lk) { s.locks = defaultLocks(); Object.assign(s.locks, m.lk); }
    if (m.hd) { s.hidden = defaultHidden(); Object.assign(s.hidden, m.hd); }
    if (m.ltx && typeof m.ltx === "object") s.lyrics = Object.assign({ text: "", seed: 0, nonces: {}, edited: false }, m.ltx);
    if (m.vp) s.vocalProfile = String(m.vp);
    return s;
  } catch (e) { return null; }
}
