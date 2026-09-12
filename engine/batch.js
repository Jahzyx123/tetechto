/* engine/batch.js — Batch Forge.
   Rolling one candidate at a time leaves the huge prompt space barely
   sampled; the MAX button hill-climbs one seed, Batch Forge generates N
   INDEPENDENT candidates in one shot, scores each with scorePrompt(),
   de-duplicates near-identical rolls and returns them ranked best-first.
   Each candidate carries a full state snapshot, so a good one is fully
   editable / loadable / comparable — never a frozen string.

   Locks, toggles and mode settings of the base state are all respected
   (rolling goes through the same roll() the buttons use). When
   maxEach:true every candidate is itself hill-climbed with `tries` tries. */
import { roll } from "./roll.js";
import { buildStylePrompt, buildFullBrief, scorePrompt } from "./prompt.js";

function fingerprint(s) {
  return [s.primaryStyle, s.secondaryStyle, s.bpm, s.rootPc, s.scaleId,
    s.feeling, s.flavor, s.direction, s.leadVoice, s.leadPerf, s.harmony,
    s.bassVoice, s.bassMovement, s.kick, s.snare, s.groove, s.intensity,
    s.technoDrive, s.technoAcid, s.arrangement, s.chordProg, s.rhythmPattern,
    (s.concept || {}).title].join("|");
}

export function forgeBatch(base, n, opts = {}) {
  const count = Math.max(1, Math.min(n || 12, 48));
  const tries = opts.tries || 12;
  const maxEach = !!opts.maxEach;
  const seen = new Set();
  const out = [];
  /* over-roll so de-dupe can't shrink the grid below n; the pool is huge,
     but a heavily-locked state narrows the variation and MAX-each can
     converge several clones onto the same optimum, so give that path more
     attempts and keep a fallback pool of converged duplicates. */
  const attempts = count + (maxEach ? 28 : 8);
  const duplicates = [];
  for (let i = 0; i < attempts && out.length < count; i++) {
    const cand = JSON.parse(JSON.stringify(base));
    roll(cand, "everything", maxEach ? { mode: "max", tries } : {});
    const sig = fingerprint(cand);
    if (seen.has(sig)) {
      if (maxEach && duplicates.length < count) duplicates.push({ cand, sig });
      continue;
    }
    seen.add(sig);
    const prompt = buildStylePrompt(cand);
    out.push({
      id: i,
      state: cand,
      sig,
      prompt,
      brief: buildFullBrief(cand),
      score: scorePrompt(cand),
      chars: prompt.length
    });
  }
  /* MAX-each convergence fallback: rather than returning a short grid,
     fill remaining slots with the converged candidates (each still a full
     scored snapshot). Only reached when distinct optima run out. */
  for (let k = 0; out.length < count && k < duplicates.length; k++) {
    const { cand, sig } = duplicates[k];
    const prompt = buildStylePrompt(cand);
    out.push({
      id: 100 + k,
      state: cand,
      sig: sig + "#dup" + k,
      prompt,
      brief: buildFullBrief(cand),
      score: scorePrompt(cand),
      chars: prompt.length
    });
  }
  out.sort((a, b) => b.score.total - a.score.total || b.score.soundCount - a.score.soundCount);
  return out;
}

/* One-line headline used by the grid. */
export function candidateHeadline(c) {
  const s = c.state;
  return (s.primaryStyle || "—") + " · " + s.bpm + " BPM · score " + c.score.total;
}
