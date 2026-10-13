#!/usr/bin/env node
/* tools/bench-prompt.js — measure the base prompt.

   The 1000-character Suno style box is the one artefact that leaves this
   app, so it gets a benchmark. This runs N rolls through the real engine
   and reports what each shape buys:

     details packed / rolled   how much of what you rolled is really in
     characters used / free     how full the box is
     unique-word ratio          how much of it is repetition
     sections / vocabulary      the engine's own content-based criteria

   Deterministic by construction: `newSeed()` reads Math.random(), so the
   harness pins Math.random to a fixed LCG BEFORE the engine is imported.
   The same run always prints the same numbers — that is what makes the
   before/after in the README checkable.

   Usage:
     node tools/bench-prompt.js [rolls] [--sample]
*/

let x = 987654321;
Math.random = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);

const argv = process.argv.slice(2);
const wantSample = argv.includes("--sample");
const N = Math.max(1, parseInt(argv.find(a => /^\d+$/.test(a)) || "120", 10));

const E = await import("../engine/index.js");

function bench(shape) {
  let details = 0, rolled = 0, chars = 0, free = 0, uniq = 0, sect = 0, vocab = 0, energy = 0;
  let sample = "";
  for (let i = 0; i < N; i++) {
    const s = E.defaultState();
    s.promptShape = shape;
    s.techOnly = i % 2 === 0;
    s.seed = 777 + i * 991;
    E.setSeed(s.seed);
    E.roll(s, "everything");
    const r = E.promptReport(s);
    details += r.inCount;
    rolled += r.rolledCount;
    chars += r.chars;
    free += r.free;
    uniq += r.variety.ratio;
    const by = Object.fromEntries(E.scorePrompt(s).items.map(i => [i.label, i.score]));
    sect += by["Section coverage"];
    vocab += by["Vocabulary variety"];
    energy += by["Energy density"];
    if (i === 0) sample = r.text;
  }
  const f = (v, d = 1) => (v / N).toFixed(d);
  return {
    shape, N,
    line: `${shape.padEnd(9)} details ${f(details)}/${f(rolled)}  chars ${f(chars)}/1000  free ${f(free)}  ` +
          `unique ${f(uniq, 3)}  sections ${f(sect)}  vocabulary ${f(vocab)}  energy ${f(energy)}`,
    sample
  };
}

console.log(`NEON FORGE — base prompt benchmark (${N} rolls per shape, deterministic)\n`);
const rows = ["labelled", "tags"].map(bench);
for (const r of rows) console.log(r.line);
if (wantSample) {
  console.log("\n--- labelled sample ---\n" + rows[0].sample);
}
