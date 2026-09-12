/* engine/genre.js — style & genre machinery.
   Ported 1:1 from the legacy engine:
   - weirdMix()/weirdCategory(): the 0–100 weirdness slider interpolated
     between three anchor mixes (core/sub/rare) — 3-point interpolation.
   - genreComboName()/pickGenreCombo()/pickGenreComboOther(): "Sub-Style
     Genre" naming with an 8-try guard so the secondary never repeats.
   - tempoForGenre(): genre-aware BPM in no-techno mode, weighted BPM
     bands in techno-only mode.
   All functions that need app settings take the state object `s`. */
import { STYLES as BASE_STYLES, GENRES as BASE_GENRES, TEMPO_RULES, WEIRD_MIX, SCALE_TIERS } from "../data/styles.js";
import { EXTRA_STYLES, EXTRA_GENRES, EXTRA_SUBS } from "../data/styles-extra.js";
import { ARRANGEMENTS } from "../data/concept.js";
import { random, pick } from "./prng.js";

/* ---------------------------- POOL EXPANSION ----------------------------
   The verbatim STYLES / GENRES pools are never edited on disk; the
   generated additions from data/styles-extra.js are concatenated here.
   EXTRA_SUBS bolts new sub-styles onto genres that already exist, which
   multiplies the combo space without inventing whole new genres.

   Every style name passes through canonStyleName() at assembly so a few
   generator artifacts are fixed ONCE here and every surface (rolls,
   picker, stats, share links) sees the same clean names. */
/* The K-spelling "Tekno" (free-party scene spelling) slipped into the
   expansion generator as a generic techno noun; users want the standard
   spelling EVERYWHERE, so every bare "Tekno" word canonicalises to
   "Techno" — "Pure Amsterdam Tekno" -> "Pure Amsterdam Techno",
   "Proto Ibiza Free-Party Tekno" -> "Proto Ibiza Free-Party Techno".
   Hardtek/Tribetek are separate words and never match \bTekno\b. Also
   collapses adjacent doubled words ("Ultra Granular Granular Techno"). */
export function canonStyleName(name) {
  let t = String(name == null ? "" : name).trim();
  t = t.replace(/\bTekno\b/g, m => (m[0] === "T" ? "Techno" : "techno"));
  t = t.replace(/\b(\w+)((\s+|-\s*)\1\b)+/gi, "$1")
       .replace(/\s{2,}/g, " ").trim();
  return t;
}
function canonStyleEntry(st) { return { ...st, n: canonStyleName(st.n) }; }
function dedupeStyles(list) {
  const seen = new Set();
  const out = [];
  for (const st of list) {
    const key = st.n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(st);
  }
  return out;
}
export const STYLES = dedupeStyles(BASE_STYLES.concat(EXTRA_STYLES).map(canonStyleEntry));
export const GENRES = BASE_GENRES
  .map(g => (EXTRA_SUBS[g.n] ? { ...g, subs: g.subs.concat(EXTRA_SUBS[g.n]) } : g))
  .concat(EXTRA_GENRES);
export const STYLE_STATS = {
  styles: STYLES.length,
  genres: GENRES.length,
  combos: GENRES.reduce((a, g) => a + g.subs.length, 0)
};

export const STYLES_BY_CAT = { core: [], sub: [], rare: [] };
STYLES.forEach(st => { (STYLES_BY_CAT[st.c] || STYLES_BY_CAT.sub).push(st.n); });

export function weirdMix(w) {
  const lo = w <= 50 ? WEIRD_MIX[0] : WEIRD_MIX[50];
  const hi = w <= 50 ? WEIRD_MIX[50] : WEIRD_MIX[100];
  const f = w <= 50 ? w / 50 : (w - 50) / 50;
  return { core: lo.core + (hi.core - lo.core) * f, sub: lo.sub + (hi.sub - lo.sub) * f, rare: lo.rare + (hi.rare - lo.rare) * f };
}
export function weirdCategory(s) {
  const m = weirdMix(s.weirdness);
  const r = random();
  if (r < m.core) return "core";
  if (r < m.core + m.sub) return "sub";
  return "rare";
}
/* The no-hand-percussion toggle also has to keep percussion-defined styles
   out of the roll -- "Taiko Ensemble" or "Tribal House" would otherwise
   reintroduce the whole idiom through the style line. Kept as a lazy import
   because state.js imports from this module. */
let _hp = null;
function handPerc(v) {
  if (!_hp) return false;
  return _hp(v);
}
export function _setHandPercPredicate(fn) { _hp = fn; }

/* retry-pick: draw from `arr` until the value passes, bounded so a heavily
   filtered pool can never spin forever */
function pickClean(s, arr, get) {
  const v = pick(arr);
  if (!s || !s.noHandPerc) return v;
  if (!handPerc(get ? get(v) : v)) return v;
  for (let i = 0; i < 24; i++) {
    const c = pick(arr);
    if (!handPerc(get ? get(c) : c)) return c;
  }
  return v;
}

/* canonStyleName() is defined by the pool assembly above (it also fixes
   the K-spelled "Tekno" generator artifacts at the same time). */

export function pickStyle(s) {
  if (s.techOnly) {
    if (s.equalChance) return canonStyleName(pickClean(s, STYLES.map(x => x.n)));
    const cat = weirdCategory(s);
    const pool = STYLES_BY_CAT[cat];
    if (!pool || !pool.length) return canonStyleName(pickClean(s, STYLES.map(x => x.n)));
    return canonStyleName(pickClean(s, pool));
  }
  return canonStyleName(pickGenreCombo(s));
}
export function genreComboName(g, sub) {
  const st = sub.trim(), gn = g.n.trim();
  if (st.toLowerCase() === gn.toLowerCase() || st.toLowerCase().endsWith(gn.toLowerCase())) return canonStyleName(st);
  /* Avoid stacking an overlapping boundary word: "Percussive Carnatic" +
     "Carnatic Fusion" -> "Percussive Carnatic Fusion" (not "...Carnatic
     Carnatic..."). Only multi-word genres carry an overlap risk. */
  const gWords = gn.split(/\s+/);
  if (gWords.length > 1) {
    const sWords = st.split(/\s+/);
    const sLast = sWords[sWords.length - 1].toLowerCase();
    const gFirst = gWords[0].toLowerCase();
    /* whole-word overlap ("Percussive Carnatic" + "Carnatic Fusion") or a
     hyphenated tail ("Post-Math" + "Math Rock" -> "Post-Math Rock") */
    if (sLast === gFirst || sLast.endsWith("-" + gFirst)) {
      return canonStyleName(st + " " + gWords.slice(1).join(" "));
    }
  }
  return canonStyleName(st + " " + gn);
}
export function pickGenreCombo(s) { const g = pickClean(s, GENRES, x => x.n); return genreComboName(g, pickClean(s, g.subs)); }
export function pickGenreComboOther(avoid, s) { let c = pickGenreCombo(s), g = 0; while (c === avoid && g++ < 8) { c = pickGenreCombo(s); } return c; }
export function allCombos() { const out = []; for (const g of GENRES) for (const sub of g.subs) out.push(genreComboName(g, sub)); return out; }
export function pickGenreObj(s) {
  if (s.equalChance) { const c = pickClean(s, allCombos()); return { genre: genreOfStyle(c) || "", combo: c }; }
  const g = pickClean(s, GENRES, x => x.n);
  return { genre: g.n, combo: genreComboName(g, pickClean(s, g.subs)) };
}
export function pickGenreObjOther(s, avoidGenre) {
  if (s.equalChance) {
    let c = pickClean(s, allCombos()), g = 0;
    while ((genreOfStyle(c) === avoidGenre) && g++ < 8) c = pickClean(s, allCombos());
    return { genre: genreOfStyle(c) || "", combo: c };
  }
  let g = pickClean(s, GENRES, x => x.n), guard = 0;
  while (g.n === avoidGenre && guard++ < 8) g = pickClean(s, GENRES, x => x.n);
  /* the SUB needs filtering too: genre "House" is clean but its sub
     "Tribal House" is not */
  return { genre: g.n, combo: genreComboName(g, pickClean(s, g.subs)) };
}
/* Direct selection of a genre by name hint (used by presets): exact name
   first, then case-insensitive substring. Returns the same {genre,combo}
   shape as pickGenreObj, or null when no genre matches. */
export function pickGenreHint(s, hint) {
  const h = String(hint || "").toLowerCase().trim();
  if (!h) return null;
  const g = GENRES.find(x => x.n.toLowerCase() === h) ||
    GENRES.find(x => x.n.toLowerCase().includes(h));
  if (!g) return null;
  return { genre: g.n, combo: genreComboName(g, pickClean(s, g.subs)) };
}
export function genreNameMatches(g, hint) {
  return String(g || "").toLowerCase().includes(String(hint || "").toLowerCase().trim());
}
export function genreOfStyle(name) {
  const low = (name || "").toLowerCase(); if (!low) return "";
  for (const g of GENRES) {
    const gn = g.n.toLowerCase();
    if (low === gn) return g.n;
    if (low.length > gn.length && low.endsWith(gn)) return g.n;
    for (const sub of g.subs) { if (low === genreComboName(g, sub).toLowerCase()) return g.n; }
  }
  return "";
}
export function tempoForGenre(s, g1, g2) {
  const txt = ((g1 || "") + " " + (g2 || "")).toLowerCase();
  if (s.techOnly) {
    const r = random();
    if (r < 0.15) return 128 + Math.floor(random() * 4);
    if (r < 0.55) return 135 + Math.floor(random() * 8);
    if (r < 0.85) return 142 + Math.floor(random() * 8);
    return 150 + Math.floor(random() * 6);
  }
  for (const [re, lo, hi] of TEMPO_RULES) { if (re.test(txt)) return lo + Math.floor(random() * (hi - lo + 1)); }
  return 96 + Math.floor(random() * 45);
}
export function pickScaleId(s) {
  const tier = SCALE_TIERS[weirdCategory(s)] || SCALE_TIERS.sub;
  return pick(tier);
}
export function pickSecondary(s, primary) { let st = pickStyle(s), g = 0; while (st === primary && g++ < 8) { st = pickStyle(s); } return st; }
export function rollBpmValue() {
  const r = random();
  if (r < 0.2) return 128 + Math.floor(random() * 8);
  if (r < 0.75) return 138 + Math.floor(random() * 11);
  return 150 + Math.floor(random() * 11);
}
export function pickArrangementFor(s) {
  const FAST_START = 12;
  let a;
  if (random() < 0.68 && ARRANGEMENTS.length > FAST_START) {
    a = ARRANGEMENTS[FAST_START + Math.floor(random() * (ARRANGEMENTS.length - FAST_START))];
  } else {
    a = pick(ARRANGEMENTS);
  }
  const d = s.duration || "standard";
  if (d === "compact") a = "Tight intro, " + a + " (compact, radio-length).";
  else if (d === "extended") a = "Long-form journey: extended intro, " + a + ", extended outro.";
  else a = a + ".";
  return a.charAt(0).toUpperCase() + a.slice(1);
}

/* ---------------------------- NO-STOP BEAT ----------------------------
   The verbatim ARRANGEMENTS pool is almost all drop/breakdown-shaped
   (40 entries, only ~1 has no break), so a no-stop beat needs its own
   curated pool: continuous groove, no breakdown, no bridge, no gap. */
export const NO_STOP_ARRANGEMENTS = [
  "driving intro, relentless build, non-stop rolling groove, continuous peak section, hard-driving outro",
  "one-bar count-in, immediate groove, rolling bassline engine, non-stop peak, locked-in outro",
  "instant intro, no-warning hook drop, relentless groove engine, continuous climax, runaway outro",
  "kick-led intro, rapid layer build, back-to-back drops, non-stop peak drive, spinning outro",
  "rolling percussion intro, snare-march build, seamless groove section, wall-of-drums climax, hard-stop outro",
  "drum-first intro, tight loop build, seamless groove, double-drop climax, cut-to-black outro",
  "groove-locked intro, hi-hat acceleration build, relentless peak groove, continuous drive, tape-stop outro",
  "clap-led intro, rolling toms build, elastic bass groove, non-stop climax, runaway outro",
  "bass-first intro, tight 16th build, pumping groove drop, continuous peak, spinning outro",
  "riddim intro, percussion stack build, non-stop bounce, maximum climax, abrupt outro",
  "hardgroove loop intro, tightening build, bouncing peak groove, continuous climax, driving outro",
  "sub-rumbling intro, kick-roll build, rolling groove engine, peak-time drive, abrupt outro",
  "arpeggio intro, layer-by-layer build, continuous melodic groove, non-stop climax, ringing outro",
  "punch-in intro, sixteen-bar rocket build, seamless drop, non-stop rolling groove, locked outro",
  "rapid-fire intro, no-breath build, back-to-back grooves, continuous peak, burnout outro",
  "syncopated intro, rolling build, relentless groove, seamless double climax, spiralling outro",
  "walking-bass intro, locked pocket build, non-stop swing groove, continuous peak, fading outro",
  "solo intro, ensemble build, full-band groove, non-stop section flow, straight outro"
];
export function pickNoStopArrangement(s) {
  let a = pick(NO_STOP_ARRANGEMENTS);
  const d = s.duration || "standard";
  if (d === "compact") a = "Instant groove intro, " + a + " (compact, radio-length).";
  else if (d === "extended") a = "Non-stop long-form: extended groove intro, " + a + ", seamless straight-through outro.";
  else a = a + ".";
  return a.charAt(0).toUpperCase() + a.slice(1);
}
