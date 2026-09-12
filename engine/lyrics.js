/* engine/lyrics.js — Lyrics Studio generator (pure, no DOM).
   Suno takes TWO inputs: a style prompt and lyrics with [Section] tags.
   The app previously only produced the first half (and only instrumental
   at that). This module turns a rolled state — key-independent but fully
   driven by concept/feeling/direction/genre-world/BPM/duration/arrangement
   — into a structured, singable, section-tagged lyric sheet:

   - mood lane classified from feeling/flavor/direction
   - title hook taken from the rolled Concept title
   - song form chosen per genre world (electronic drops / verse-chorus /
     rap) and per duration, with NO bridge/breakdown under NO-STOP
   - curated rhyming couplets filtered to a singable syllable band for the
     tempo (faster BPM → shorter lines), so lines fit the music
   - a bracketed vocal-profile tag line Suno reads for voice casting
   Deterministic per (seed, per-section nonces), so share links reproduce
   a lyric sheet exactly and a single section can be re-rolled alone. */
import {
  LYRIC_LANES, RAP_LINES, RAP_HOOKS, VOCAL_PROFILES,
  INTRO_LINES, OUTRO_LINES, MOOD_RULES, DEFAULT_LANE
} from "../data/lyrics.js";
import { makeRng, hash32 } from "./prng.js";
import { genreWorld } from "./world.js";

/* ---------------------------- mood / voice ---------------------------- */
export function moodLane(s) {
  const txt = [s && s.feeling, s && s.flavor, s && s.direction,
    s && s.concept && s.concept.narrative].filter(Boolean).join(" ");
  for (const [lane, re] of MOOD_RULES) if (re.test(txt)) return lane;
  return DEFAULT_LANE;
}
export function vocalProfile(s) {
  return VOCAL_PROFILES.find(p => p.id === (s && s.vocalProfile)) || VOCAL_PROFILES[0];
}
/* Organic worlds never get "robotic" casting by accident, and rap is only
   forced when the profile says so. */
function profileLead(s, lane) {
  const p = vocalProfile(s);
  let lead = p.lead;
  const world = s.techOnly ? "electronic" : genreWorld(s.primaryGenre);
  if (p.id === "processed" && world === "organic") lead = "warm layered vocal";
  return { lead, laneAdj: LYRIC_LANES[lane].adj };
}
/* Bracketed first line for the Suno lyrics box, e.g.
   "[female lead vocal, powerful, uplifting, anthemic]" */
export function vocalTag(s, lane) {
  lane = lane || moodLane(s);
  const { lead, laneAdj } = profileLead(s, lane);
  return "[" + lead + ", " + laneAdj.join(", ") + "]";
}
/* Prose descriptor for the Style Prompt / Full Brief "vocal:" line. */
export function vocalDescriptor(s, lane) {
  lane = lane || moodLane(s);
  const { lead, laneAdj } = profileLead(s, lane);
  return laneAdj.join(" ") + " " + lead;
}

/* ---------------------------- concept slots ---------------------------- */
export function titleHook(s) {
  const t = String((s.concept && s.concept.title) || "").trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
/* A short location noun phrase from the rolled Concept world/location,
   e.g. "deep inside a reactor core" → "reactor core". Electronic worlds
   only; organic songs don't sing about reactor cores. */
export function placePhrase(s) {
  const world = s.techOnly ? "electronic" : genreWorld(s.primaryGenre);
  if (world === "organic") return "";
  let raw = String((s.concept && (s.concept.location || s.concept.world)) || "").trim().toLowerCase();
  if (!raw) return "";
  raw = raw.replace(/[^a-z0-9 -]/g, "");
  const words = raw.split(/\s+/).filter(Boolean);
  /* take the tail noun phrase, then peel leading prepositions/articles so
     templates can safely supply their own determiner ("where the {place}") */
  const PREP = new Set(["inside", "in", "on", "atop", "at", "beneath", "under", "underneath",
    "above", "below", "of", "over", "through", "deep", "the", "a", "an", "middle", "edge", "heart", "centre", "center"]);
  let tail = words.slice(-3);
  while (tail.length > 1 && PREP.has(tail[0])) tail.shift();
  while (tail.length > 1 && (tail[0] === "the" || tail[0] === "a" || tail[0] === "an")) tail.shift();
  return tail.join(" ");
}

/* ---------------------------- syllables ---------------------------- */
/* Vowel-cluster counter with silent-e and common endings. Approximate but
   good enough to keep lines inside a singable band. */
export function syllables(word) {
  word = String(word).toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}
export function lineSyllables(line) {
  return String(line).split(/\s+/).reduce((a, w) => a + syllables(w), 0);
}

/* ---------------------------- section plans ---------------------------- */
/* kind: intro | verse | build | drop | chorus | bridge | outro | rapverse | hook
   tag is the literal Suno tag; lines are generated when rendered. */
function plan(s) {
  const world = s.techOnly ? "electronic" : genreWorld(s.primaryGenre);
  const dur = s.duration || "standard";
  const rap = vocalProfile(s).id === "rap";
  const noStop = !!s.noStop;
  const secs = [];
  const add = (kind, tag, extra) => secs.push(Object.assign({ kind, tag }, extra || {}));

  if (rap) {
    add("intro", "Intro");
    add("rapverse", "Rap Verse 1");
    add("hook", "Hook");
    add("rapverse", "Rap Verse 2");
    add("hook", "Hook");
    if (dur !== "compact") add("bridge", "Bridge", { rap: true });
    add("hook", "Hook");
    if (dur === "extended") { add("rapverse", "Rap Verse 3"); add("hook", "Hook"); }
    add("outro", "Outro");
    return secs;
  }

  if (world === "organic") {
    add("intro", "Intro");
    add("verse", "Verse 1");
    add("build", "Pre-Chorus");
    add("chorus", "Chorus");
    add("verse", "Verse 2");
    add("build", "Pre-Chorus");
    add("chorus", "Chorus");
    if (dur === "extended") { add("build", "Pre-Chorus"); add("chorus", "Chorus"); }
    /* NO-STOP: the bridge is the only dip — replace it with another hook */
    if (!noStop && dur !== "compact") add("bridge", "Bridge");
    add("chorus", "Final Chorus");
    add("outro", "Outro");
    return secs;
  }

  /* electronic / hybrid (hybrid songs still read drops well) */
  add("intro", "Intro");
  add("verse", "Verse 1");
  add("build", "Build");
  add("drop", "Drop");
  if (dur !== "compact") {
    add("verse", "Verse 2");
    add("build", "Build");
    add("drop", "Drop");
  }
  if (dur === "extended") {
    if (noStop) { add("build", "Build"); add("drop", "Drop"); }
    else add("breakdown", "Breakdown");
  }
  add("drop", noStop ? "Final Drop" : "Last Drop");
  add("outro", "Outro");
  return secs;
}

/* ---------------------------- line rendering ---------------------------- */
const TECHY_RE = /\b(frequency|station identification|mainframe|mainframe)\b/i;
function fillSlots(s, line, lane) {
  let out = line;
  if (out.includes("{title}")) out = out.replace(/\{title\}/g, titleHook(s) || "tonight");
  if (out.includes("{place}")) {
    const place = placePhrase(s);
    if (!place) return null;                                  /* gate: organic */
    out = out.replace(/\{place\}/g, place);
  }
  const world = s.techOnly ? "electronic" : genreWorld(s.primaryGenre);
  if (world === "organic" && TECHY_RE.test(out)) return null;
  void lane;
  return out;
}
/* Pick from a list via the section RNG, rejecting lines outside the
   syllable band and values already used in this sheet. */
function pickFit(rng, items, s, lane, band, seen, canPlace) {
  for (let t = 0; t < 40; t++) {
    const cand = rng.pick(items);
    if (!canPlace && typeof cand === "string" && cand.includes("{place}")) continue;
    const text = fillSlots(s, cand, lane);
    if (text === null) continue;
    const syl = text.includes("{title}") ? 0 : lineSyllables(text);
    if (syl && band && (syl < band[0] || syl > band[1])) continue;
    if (seen && seen.has(text)) continue;
    if (seen) seen.add(text);
    return text;
  }
  /* fallback: first thing that renders at all */
  for (const cand of items) { const text = fillSlots(s, cand, lane); if (text !== null && (!seen || !seen.has(text))) { if (seen) seen.add(text); return text; } }
  return "";
}
function pickCouplet(rng, bank, s, lane, band, seen, allowPlace, readAlso) {
  const dup = (a, b) => (seen && (seen.has(a) || seen.has(b))) ||
    (readAlso && (readAlso.has(a) || readAlso.has(b)));
  for (let t = 0; t < 60; t++) {
    const pair = rng.pick(bank);
    if (!allowPlace && pair.join(" ").includes("{place}")) continue;
    const a = fillSlots(s, pair[0], lane), b = fillSlots(s, pair[1], lane);
    if (a === null || b === null) continue;
    if (dup(a, b)) continue;
    const sa = lineSyllables(a), sb = lineSyllables(b);
    if (band && ((sa < band[0] || sa > band[1]) || (sb < band[0] || sb > band[1]))) continue;
    if (seen) { seen.add(a); seen.add(b); }
    return [a, b];
  }
  const pair = bank[0];
  return [fillSlots(s, pair[0], lane) || pair[0], fillSlots(s, pair[1], lane) || pair[1]];
}

/* Faster tempos get shorter phrases; ballads allow longer lines. */
function verseBand(s) {
  const b = s.bpm || 130;
  if (b >= 150) return [5, 10];
  if (b >= 125) return [6, 12];
  if (b >= 100) return [7, 13];
  return [7, 14];
}

function renderSection(s, sec, i, nonces, lane, sharedCouplets) {
  /* a LOCAL seen set: a per-section re-roll must not cascade into the
     following sections (each section is a pure function of seed+i+nonce).
     sharedCouplets is a song-level read set so Verse 2 doesn't echo
     Verse 1; rerolled sections (nonce>0) read but don't pollute it, so
     later sections still re-derive identically. */
  const seen = new Set();
  const nonce = (nonces && nonces[i]) || 0;
  /* rerolled sections read the song-wide set but never write to it, so
     sections after the rerolled one still derive identically */
  const register = lines => { if (nonce === 0 && sharedCouplets) lines.forEach(x => sharedCouplets.add(x)); };
  const rng = makeRng(s.lyrics && s.lyrics.seed ? s.lyrics.seed : (s.seed || 1), i * 7 + 13, nonce * 7919 + 1);
  const L = LYRIC_LANES[lane];
  const vBand = verseBand(s);
  const world = s.techOnly ? "electronic" : genreWorld(s.primaryGenre);
  const allowPlace = world !== "organic";
  const lines = [];
  const soft = t => "(" + t + ")";       /* backing / spoken softly */

  switch (sec.kind) {
    case "intro": {
      const pool = INTRO_LINES[lane].slice();
      lines.push(soft(pickFit(rng, pool, s, lane, [2, 10], seen, allowPlace)));
      break;
    }
    case "outro": {
      lines.push(pickFit(rng, L.chants, s, lane, [1, 7], seen, allowPlace));
      lines.push(soft(pickFit(rng, OUTRO_LINES[lane], s, lane, [2, 10], seen, allowPlace)));
      const t = titleHook(s);
      if (t && i % 2 === 0) lines.push(t + "…");
      break;
    }
    case "verse": {
      const c1 = pickCouplet(rng, L.verse, s, lane, vBand, seen, allowPlace, sharedCouplets);
      const c2 = pickCouplet(rng, L.verse, s, lane, vBand, seen, allowPlace, sharedCouplets);
      register([c1[0], c1[1], c2[0], c2[1]]);
      lines.push(c1[0], c1[1], c2[0], c2[1]);
      break;
    }
    case "rapverse": {
      /* 12 bars → six denser lines, three rhyming couplets */
      for (let k = 0; k < 3; k++) {
        const c = pickCouplet(rng, RAP_LINES, s, lane, [8, 16], seen, false, sharedCouplets);
        register([c[0], c[1]]);
        lines.push(c[0], c[1]);
      }
      break;
    }
    case "build": {
      const c = pickCouplet(rng, L.pre, s, lane, [4, 10], seen, allowPlace, sharedCouplets);
      register([c[0], c[1]]);
      lines.push(c[0], c[1]);
      break;
    }
    case "chorus":
    case "drop":
    case "hook": {
      const bank = vocalProfile(s).id === "rap" ? RAP_HOOKS : L.chorus;
      const set = rng.pick(bank);
      for (const raw of set) lines.push(fillSlots(s, raw, lane) || raw);
      /* drops announce themselves with one shout-along chant up front */
      if (sec.kind === "drop") lines.unshift(pickFit(rng, L.chants, s, lane, [1, 6], seen, allowPlace));
      break;
    }
    case "breakdown": {
      const c = pickCouplet(rng, L.bridge, s, lane, [5, 11], seen, allowPlace);
      lines.push(soft(c[0]), soft(c[1]));
      break;
    }
    case "bridge": {
      const bank = sec.rap ? RAP_LINES : L.bridge;
      if (sec.rap) {
        const c = pickCouplet(rng, bank, s, lane, [8, 16], seen, false, sharedCouplets);
        register([c[0], c[1]]);
        lines.push(c[0], c[1]);
      } else {
        const c = pickCouplet(rng, bank, s, lane, [5, 12], seen, allowPlace, sharedCouplets);
        register([c[0], c[1]]);
        lines.push(c[0], c[1]);
        /* turn line: resolve back toward the title */
        const t = titleHook(s);
        if (t) lines.push(t);
      }
      break;
    }
  }
  return { tag: sec.tag, kind: sec.kind, lines: lines.filter(Boolean) };
}

/* ---------------------------- public API ---------------------------- */
export function generateLyrics(s, seed, nonces) {
  if (!s) return { text: "", sections: [] };
  const lane = moodLane(s);
  s.lyrics = s.lyrics || { text: "", seed: 0, nonces: {}, edited: false };
  if (seed !== undefined) s.lyrics.seed = seed;
  nonces = nonces || s.lyrics.nonces || {};
  const sharedCouplets = new Set();
  const sections = plan(s).map((sec, i) => renderSection(s, sec, i, nonces, lane, sharedCouplets));
  const head = vocalTag(s, lane);
  const body = sections.map(sec => "[" + sec.tag + "]\n" + sec.lines.join("\n")).join("\n\n");
  return { lane, sections, text: head + "\n\n" + body };
}

/* Re-roll just one section (by section index); every other section is
   re-derived identically because its stream only depends on (seed, i). */
export function rerollLyricSection(s, index) {
  if (!s.lyrics || !s.lyrics.seed) s.lyrics = { text: "", seed: (Math.random() * 4294967296) >>> 0, nonces: {}, edited: false };
  s.lyrics.nonces = s.lyrics.nonces || {};
  s.lyrics.nonces[index] = (s.lyrics.nonces[index] || 0) + 1;
  s.lyrics.edited = false;
  const out = generateLyrics(s, s.lyrics.seed, s.lyrics.nonces);
  s.lyrics.text = out.text;
  return out;
}

/* Fresh full lyric sheet with a new seed (used by the unified roll engine
   and by the Re-roll button). */
export function rollLyrics(s, seed) {
  const sd = (seed === undefined) ? (Math.random() * 4294967296) >>> 0 : seed;
  s.lyrics = { text: "", seed: sd, nonces: {}, edited: false };
  const out = generateLyrics(s, sd, {});
  s.lyrics.text = out.text;
  return out;
}

/* What sections a state's lyrics would use, for UI/tests. */
export function lyricPlan(s) { return plan(s); }
/* Stable section index from a generated sheet's tag+occurrence — the UI
   uses it to wire per-section re-roll chips. */
export function sectionSignature(sec, i) { return i + ":" + sec.tag; }
