/* engine/spark.js — the Idea Engine.

   Sparks are wildcards: one evocative line drawn from the 32 Spark pools
   (data/sparks.js + the generated data/sparks-extra.js wave). They never
   enter the prompt by themselves — you copy them as creative fuel or apply
   them into the concept card / style identity, where the normal safety
   pipeline (genre-safe rewrite, vocal policy, length caps) treats them
   like any rolled concept.

   Ported from the legacy app's Idea Engine card (the pools were extracted
   in v4 but never wired up) and re-anchored on the new engine: seeded
   picks (share-reproducible), lock-respecting applies, and the big
   wildcards — Mega Chaos, Lucky Dip, Time Machine, Random Focus, Anthem
   Builder — built on roll()/rollKeys(). */
import * as SP from "../data/sparks.js";
import { SPARK_EXTRA } from "../data/sparks-extra.js";
import { pick, random } from "./prng.js";
import { ROLL_FN } from "./state.js";
import { roll, rollKeys, resolveScope } from "./roll.js";
import { scorePrompt } from "./prompt.js";

/* ---------------------------- merged pools ---------------------------- */
export const SPARK_POOLS = {};
const NAME_OF = new Map();
for (const name of Object.keys(SP)) {
  if (!name.startsWith("SPARK_") || !Array.isArray(SP[name])) continue;
  NAME_OF.set(SP[name], name);
  const base = SP[name];
  const seen = new Set(base.map(x => String(x).toLowerCase().trim()));
  const extra = (SPARK_EXTRA[name] || []).filter(x => !seen.has(String(x).toLowerCase().trim()));
  SPARK_POOLS[name] = base.concat(extra);
}
export const SPARK_STATS = {
  pools: Object.keys(SPARK_POOLS).length,
  entries: Object.values(SPARK_POOLS).reduce((n, a) => n + a.length, 0),
  added: Object.values(SPARK_EXTRA).reduce((n, a) => n + a.length, 0)
};

/* ---------------------------- kinds ---------------------------- */
/* The ten core spark kinds (legacy Idea Engine layout). The Title kind
   merges both title pools for a deeper draw. */
export const SPARK_KINDS = [
  { emoji: "💡", label: "Idea", pool: "SPARK_IDEAS" },
  { emoji: "🏷", label: "Title", pool: "SPARK_TITLES", also: ["SPARK_TITLES2"] },
  { emoji: "🧬", label: "Mash-up", pool: "SPARK_MASHUPS" },
  { emoji: "⛓", label: "Constraint", pool: "SPARK_CONSTRAINTS" },
  { emoji: "🛠", label: "Production tip", pool: "SPARK_TIPS" },
  { emoji: "🌊", label: "Vibe", pool: "SPARK_VIBES" },
  { emoji: "🗺", label: "Scene", pool: "SPARK_PLACES" },
  { emoji: "🔩", label: "Object", pool: "SPARK_THINGS" },
  { emoji: "🪄", label: "Transform", pool: "SPARK_TRANSFORMS" },
  { emoji: "🎯", label: "Challenge", pool: "SPARK_CHALLENGES" }
];
/* extra + magic-II registries ship in data/sparks.js with live pool refs;
   remap them onto the merged pools. */
function fromRegistry(reg) {
  return reg.map(entry => ({
    label: entry[0], kind: entry[2],
    pool: NAME_OF.get(entry[1])
  })).filter(k => k.pool && SPARK_POOLS[k.pool]);
}
export const EXTRA_KINDS = fromRegistry(SP.EXTRA_SPARK_KINDS);
export const MAGIC2_KINDS = fromRegistry(SP.EXTRA_SPARK_KINDS2);

export function kindPool(kind) {
  const all = SPARK_POOLS[kind.pool].concat((kind.also || []).flatMap(n => SPARK_POOLS[n] || []));
  return all;
}
export function rollSpark(kind) { return pick(kindPool(kind)); }
export function rollSparkNamed(name) { return pick(SPARK_POOLS[name]); }

/* ---------------------------- applies ---------------------------- */
/* Sparks respect locks exactly like rolls: a locked field is yours. */
export function applyTitle(s, text) {
  if (s.locks["concept-title"]) return false;
  s.concept.title = text;
  return true;
}
export function applyTransform(s, text) {
  if (s.locks["concept-transform"]) return false;
  s.concept.transform = text;
  return true;
}
export function applyChallenge(s, text) {
  if (s.locks["concept-narrative"]) return false;
  s.concept.narrative = text;
  return true;
}
/* a mash-up replaces the whole style identity (legacy behaviour) */
export function applyMashup(s, text) {
  if (s.locks.primary) return false;
  s.primaryStyle = text;
  s.secondaryStyle = "";
  s.primaryGenre = "";
  s.secondaryGenre = "";
  return true;
}

/* ---------------------------- wildcards ---------------------------- */
const MEGA_SCOPES = ["feel-melody", "bass", "drums", "arrangement", "concept",
  "concept-melody", "technoLab", "soundDesign", "mixMaster", "spatialMod",
  "grooveMelodic", "textureFx", "chord", "rhythmPattern", "key"];
const MEGA_LAYERS = ["texture", "fx", "mix", "experimental", "acid",
  "modulation", "space", "reverb", "delay", "glitch"];

/* re-roll the production around the current style, then stamp a spark
   title + transform and crank the energy settings (legacy Mega Chaos). */
export function megaChaos(s) {
  for (const scope of MEGA_SCOPES) rollKeys(s, resolveScope(scope));
  s.duration = "extended";
  s.influence = "strong";
  s.melodicForce = "dominant";
  s.driveAmt = 100;
  s.acidAmt = 100;
  for (const id of MEGA_LAYERS) s.layers[id] = true;
  if (!s.locks["concept-transform"]) s.concept.transform = pick(SPARK_POOLS.SPARK_TRANSFORMS);
  if (!s.locks["concept-title"]) s.concept.title = pick(SPARK_POOLS.SPARK_TITLES);
  return { line: pick(SPARK_POOLS.SPARK_MEGA_LINES), score: scorePrompt(s).total };
}

/* Lucky Dip: a whole fresh surprise track, melody-dominant. */
export function luckyDip(s) {
  roll(s, "everything");
  s.melodicForce = "dominant";
  s.influence = "strong";
  s.duration = "extended";
  return { vibe: pick(SPARK_POOLS.SPARK_VIBES), score: scorePrompt(s).total };
}

/* Time Machine: fresh tempo / key / duration / arrangement / energy shape. */
const BPM_OPTS = [70, 80, 85, 90, 95, 100, 110, 120, 122, 124, 126, 128, 130,
  132, 134, 136, 138, 140, 142, 144, 146, 148, 150, 152, 155, 160, 170, 180, 190, 200];
export function timeMachine(s) {
  if (!s.locks.bpm) s.bpm = BPM_OPTS[Math.floor(random() * BPM_OPTS.length)];
  if (!s.locks.key) ROLL_FN.key(s);
  if (!s.locks.arrangement) ROLL_FN.arrangement(s);
  s.duration = pick(["compact", "standard", "extended"]);
  if (!s.locks.energyCurve) ROLL_FN.energyCurve(s);
  if (!s.locks.buildType) ROLL_FN.buildType(s);
  if (!s.locks.dropType) ROLL_FN.dropType(s);
}

/* Random Focus: MAX a random production category (keeps style identity —
   roll()'s maximize pins it by default). */
export const FOCUS_CATEGORIES = [
  { label: "Drums", scope: "drums" },
  { label: "Bass", scope: "bass" },
  { label: "Melody", scope: "melody" },
  { label: "Harmony", scope: "harmony" },
  { label: "Mix", scope: "mix" },
  { label: "Space", scope: "spatial" },
  { label: "Texture & FX", scope: "textureFx" },
  { label: "Concept", scope: "concept" }
];
export function randomFocus(s, tries = 12) {
  const cat = pick(FOCUS_CATEGORIES);
  const res = roll(s, cat.scope, { mode: "max", tries });
  return { category: cat.label, score: res.score };
}

/* Anthem Builder: title + vibe + transform in one spark, melody-dominant. */
export function anthemIdea(s) {
  const name = pick(SPARK_POOLS.SPARK_ANTHEM_NAMES);
  const vibe = pick(SPARK_POOLS.SPARK_VIBES);
  const transform = pick(SPARK_POOLS.SPARK_TRANSFORMS);
  if (!s.locks["concept-title"]) s.concept.title = name;
  if (!s.locks["concept-narrative"]) s.concept.narrative = vibe;
  if (!s.locks["concept-transform"]) s.concept.transform = transform;
  s.melodicForce = "dominant";
  return name + " — " + vibe + " → " + transform;
}
export function maxAnthemIdea(s, tries = 20) {
  const res = roll(s, "melody", { mode: "max", tries });
  const out = anthemIdea(s);
  return { out, score: res.score };
}
