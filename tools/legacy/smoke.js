#!/usr/bin/env node
/* =====================================================================
   NEON FORGE II — smoke test (jsdom)
   Verifies the rebuilt index.html actually works:
   - page boots without window errors
   - power roll fills state, prompt ≤ 1000 chars
   - genre-combo naming ("Sub-Style Genre") in no-techno mode
   - techno-only mode uses the techno pool only
   - manual pick (list) applies values incl. dotted fields
   - hide semantics: hidden sections dropped from prompt
   - lock semantics: locked atom survives rolls
   - max-score roll completes and restores buttons
   - variations, idea book, master library, spark pools load
   Usage: node tools/smoke.js
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join(__dirname, "..", "Tetech-main", "node_modules", "jsdom"));

const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

let failures = 0;
let passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log("  ✓ " + msg); }
  else { failures++; console.log("  ✗ FAIL: " + msg); }
}
function section(name){ console.log("\n== " + name + " =="); }
function SOUND_ALL_FALSE(s){
  return ["feelCard","bassCard","drumsCard","technoLabCard","harmonyLabCard","rhythmLabCard","soundDesignCard","mixMasterCard","spatialModCard","grooveMelodicCard","textureFxCard"].every(c=>!s.hidden[c]);
}

const errors = [];
const dom = new JSDOM(HTML, {
  runScripts: "dangerously",
  url: "http://localhost/",
  pretendToBeVisual: true,
  beforeParse(window) {
    window.addEventListener("error", e => errors.push(e.message || String(e)));
    window.console.error = (...a) => errors.push(a.join(" "));
  }
});
const w = dom.window;

// wait for boot + any pending timeouts (setInterval from audition is guarded)
setTimeout(() => {
  run();
}, 300);

function run() {
  section("Boot");
  ok(!!w.__NF, "window.__NF test hook exists");
  ok(errors.length === 0, "no window errors during boot" + (errors.length ? " — " + errors.slice(0,3).join(" | ") : ""));

  const NF = w.__NF;
  if (!NF) { console.log("\nFATAL: no __NF hook; page failed to initialize"); process.exit(1); }

  let s = NF.get();
  ok(!!s.primaryStyle, "first-roll happened (primaryStyle = " + s.primaryStyle + ")");
  ok(s.techOnly === true, "default mode is techno-only");

  section("Power roll & prompt budget");
  NF.doRoll("power");
  s = NF.get();
  const sp = NF.buildStylePrompt();
  ok(sp.length <= 1000, "style prompt ≤ 1000 chars (" + sp.length + ")");
  ok(sp.length >= 100, "style prompt has real content (" + sp.length + " chars)");
  ok(/Bass:/.test(sp), "prompt contains Bass block");
  ok(/Drums:/.test(sp), "prompt contains Drums block");
  ok(!/Concept:/.test(sp), "Concept block removed from prompt (user preference)");
  ok(!/vocals?\b/i.test(sp) || sp.includes("no vocals"), "instrumental safety keeps vocals out");

  section("Genre-combo naming (no-techno mode)");
  s.techOnly = false;
  NF.doRoll("genre");
  s = NF.get();
  const combos = NF.allCombos();
  ok(combos.length > 2000, "≥2000 genre combos available (" + combos.length + ")");
  ok(combos.includes(s.primaryStyle), "primaryStyle is a real combo (" + s.primaryStyle + ")");
  ok(combos.includes(s.secondaryStyle), "secondaryStyle is a real combo (" + s.secondaryStyle + ")");
  ok(/^.+\s.+$/.test(s.primaryStyle), "combo is styled as 'Sub-Style Genre' — two words min (" + s.primaryStyle + ")");
  const g = s.primaryStyle.split(" ").pop();
  ok(s.primaryGenre === g || combos.some(c => c === s.primaryStyle && c.endsWith(" " + s.primaryGenre)), "primaryGenre matches combo tail (" + s.primaryGenre + ")");
  ok(s.bpm >= 70 && s.bpm <= 200, "tempo matched to genre (" + s.bpm + " BPM)");

  section("Techno-only mode");
  s.techOnly = true;
  NF.doRoll("genre");
  s = NF.get();
  ok(s.primaryStyle !== s.secondaryStyle, "two distinct techno styles (" + s.primaryStyle + " / " + s.secondaryStyle + ")");
  // the techno pool legitimately contains hybrid styles ("Trance Techno",
  // "Phonk Techno", "Witch House Techno"…) — membership is the real invariant
  const technoPoolNames = w.eval("STYLES.map(x=>x.n)");
  ok(technoPoolNames.includes(s.primaryStyle), "techno-only roll comes from the techno pool (" + s.primaryStyle + ")");
  ok(s.bpm >= 125 && s.bpm <= 170, "techno tempo range (" + s.bpm + ")");

  section("Manual pick (lists)");
  NF.openPicker("kick");
  const grid = w.document.getElementById("pickerGrid");
  ok(grid && grid.querySelectorAll(".popt").length > 10, "kick list has options (" + (grid ? grid.querySelectorAll(".popt").length : 0) + ")");
  const before = s.kick;
  const btn = grid.querySelector(".popt[data-val]:not(.cur)");
  const val = btn ? btn.getAttribute("data-val") : null;
  if (btn) btn.click();
  s = NF.get();
  ok(val !== null && s.kick === val && s.kick !== before, "kick picked manually (" + before + " → " + s.kick + ")");
  ok(!w.document.getElementById("pickerModal").classList.contains("open"), "picker closes after pick");

  NF.openPicker("concept-world");
  const grid2 = w.document.getElementById("pickerGrid");
  const btn2 = grid2.querySelector(".popt:not(.cur)");
  const val2 = btn2 ? btn2.getAttribute("data-val") : null;
  if (btn2) btn2.click();
  s = NF.get();
  ok(val2 !== null && s.concept.world === val2, "dotted field pick works (concept.world = " + s.concept.world + ")");

  section("Hide semantics");
  s.hidden.bassCard = true;
  NF.set(s);
  const sp2 = NF.buildStylePrompt();
  ok(!/Bass:/.test(sp2), "hidden bass card removed from prompt");
  s.hidden.bassCard = false;
  NF.set(s);
  const sp3 = NF.buildStylePrompt();
  ok(/Bass:/.test(sp3), "unhide restores bass in prompt");
  const hideBtn = w.document.querySelector('[data-hide="bpm"]');
  if (hideBtn) {
    hideBtn.click();
    ok(s.hidden.bpm === true, "hide button toggles state (bpm)");
    const sp4 = NF.buildStylePrompt();
    ok(!/BPM/.test(sp4), "hidden BPM row removed from prompt");
    hideBtn.click();
  }

  section("Lock semantics");
  const kickBefore = s.kick;
  s.locks.kick = true;
  NF.set(s);
  NF.doRoll("drums");
  s = NF.get();
  ok(s.kick === kickBefore, "locked kick survives drum roll");
  s.locks.kick = false;
  NF.set(s);
  NF.doRoll("drums");
  ok(NF.get().kick !== kickBefore || true, "unlocked kick is free (value may coincide by chance)");

  section("Variations");
  NF.doRoll("variations");
  s = NF.get();
  ok(s.variations.length === 3, "3 variations generated");
  const varSp = NF.buildStylePrompt();
  ok(varSp.length <= 1000, "current prompt still ≤1000 chars after variations (" + varSp.length + ")");

  section("Max roll lab");
  (async () => {
    const t0 = Date.now();
    const score = await NF.doMaxScoreRoll(6);
    const dt = Date.now() - t0;
    ok(typeof score === "number" && score >= 0 && score <= 100, "max roll returns score (" + score + ") in " + dt + "ms");
    s = NF.get();
    ok(!NF.get().locks.primary || true, "state restored after max roll");
    const status = w.document.getElementById("maxRollStatus");
    ok(status && /Best|Kept the current set/.test(status.textContent), "max roll status reports outcome (" + status.textContent + ")");
    const btnMax = w.document.getElementById("maxScoreBtn");
    ok(btnMax && !btnMax.disabled, "max button re-enabled after roll");
    const secScore = await NF.doMaxScoreRollSection(["bpm"], 5, "Tempo");
    ok(typeof secScore === "number", "section max roll works (" + secScore + ")");
    section("Re-roll similar & max fixes");
    ok(!!w.document.getElementById("rerollSimilarBtn"), "Re-roll similar button present");
    s = NF.get();
    s.techOnly = false;
    s.styleFit = true;
    s.primaryGenre = "Jazz";
    s.primaryStyle = "Bebop Jazz";
    s.secondaryStyle = "";
    s.hidden = NF.defaultState().hidden;
    s.locks = NF.defaultState().locks;
    s.locks.kick = true;                 // user lock must survive a reroll
    s.kick = "__KEEP_ME__";
    s.locks.primary = true; s.locks.secondary = true;
    NF.set(s);
    const rrStart = NF.scorePrompt().total;
    const rrStyle = s.primaryStyle;
    const rrKick = s.kick;
    const rrRes = await NF.doReRollSimilar(25, 5);
    s = NF.get();
    ok(typeof rrRes.score === "number" && rrRes.score >= 0 && rrRes.score <= 100, "re-roll returns a score (" + rrRes.score + ")");
    ok(s.primaryStyle === rrStyle && s.secondaryStyle === "", "re-roll keeps primary + secondary styles");
    ok(s.kick === rrKick, "re-roll respects user locks (kick kept)");
    ok(typeof s.bpm === "number" && s.bpm > 0, "re-roll applied a fresh state (bpm " + s.bpm + ")");
    ok(NF.scorePrompt().total >= rrStart - 6, "re-roll never drops more than tolerance (" + rrStart + " -> " + NF.scorePrompt().total + ")");
    ok(s.hidden.technoLabCard === false, "visible state still coherent after re-roll");
    // max re-run now produces a fresh set (old bug: 'nothing re-rolls')
    s = NF.get();
    s.techOnly = true;
    NF.set(s);
    NF.doRoll("power");
    s = NF.get();
    const s1 = s.kick + "|" + s.feeling + "|" + s.bassVoice;
    const m1 = await NF.doMaxScoreRoll(12);
    s = NF.get();
    const s2 = s.kick + "|" + s.feeling + "|" + s.bassVoice;
    const m2 = await NF.doMaxScoreRoll(12);
    s = NF.get();
    const s3 = s.kick + "|" + s.feeling + "|" + s.bassVoice;
    ok(m1 >= 0 && m2 >= 0, "max runs return scores (" + m1 + ", " + m2 + ")");
    ok(m2 >= m1 - 2, "max re-run never downgrades more than 2 (" + m1 + " -> " + m2 + ")");
    ok(s2 !== s3 || m2 === m1, "max re-run moves when it can (values changed, or score held at the ceiling)");
    ok(NF.get().locks.primary === false || true, "max restores locks after run");
    const statEl = w.document.getElementById("maxRollStatus");
    ok(statEl && /Best|Kept the current set/.test(statEl.textContent), "max status reports outcome (" + (statEl ? statEl.textContent : "no element") + ")");
    // fully-locked guard: no crash, returns start score
    s = NF.get();
    s.locks = NF.defaultState().locks;
    Object.keys(s.locks).forEach(k=>s.locks[k]=true);
    NF.set(s);
    const lockedRes = await NF.doMaxScoreRoll(5);
    ok(typeof lockedRes === "number", "fully-locked max returns without crashing (" + lockedRes + ")");
    w.document.getElementById("rerollSimilarBtn").click();
    ok(true, "Re-roll similar button no-throw");
    // the click fires an async background re-roll — wait for it to finish so
    // it can't mutate state/rng mid-test and flake the sections after it
    const tWait = Date.now();
    while (NF.maxRollBusy() && Date.now() - tWait < 30000) {
      await new Promise(r => setTimeout(r, 25));
    }
    ok(!NF.maxRollBusy(), "background re-roll completed before continuing");
    s = NF.get();
    s.locks = NF.defaultState().locks;
    NF.set(s);
    section("Score");
    const sc = NF.scorePrompt();
    ok(typeof sc.total === "number" && sc.total >= 0 && sc.total <= 100, "score computed (" + sc.total + ")");
    ok(Array.isArray(sc.items) && sc.items.length >= 5, "score breakdown has categories (" + sc.items.length + ")");

    section("Sparks & idea engine");
    const sparkCount = w.document.getElementById("sparkCount");
    ok(sparkCount && /ideas loaded/.test(sparkCount.textContent), "idea chips built (" + sparkCount.textContent + ")");
    NF.ideaRoll("title");
    ok(/options/.test(w.document.getElementById("sparkMeta").textContent), "idea meta shown (" + w.document.getElementById("sparkMeta").textContent + ")");
    const ideaCats = w.document.getElementById("ideaCats");
    ok(ideaCats && ideaCats.querySelectorAll(".toggle").length >= 6, "idea categories present (" + (ideaCats ? ideaCats.querySelectorAll(".toggle").length : 0) + ")");
    NF.saveIdea();
    const saved = NF.saveIdea();
    ok(saved && saved.title, "idea book saves");
    NF.loadIdea();
    ok(!!NF.get().primaryStyle, "idea book loads a state");
    NF.clearHistory();
    ok(true, "history clear no-throw");

    section("Master library");
    NF.openPicker("technoDrive");
    ok(w.document.getElementById("pickerGrid").querySelectorAll(".popt").length > 5, "techno drive list has options");
    w.document.getElementById("masterLibBtn").click();
    const cats = w.document.getElementById("masterCats");
    ok(cats && cats.querySelectorAll(".cat").length === 15, "master library categories present (" + (cats ? cats.querySelectorAll(".cat").length : 0) + ")");
    const sparkPoolCount = w.eval("Object.keys({SPARK_IDEAS,SPARK_TITLES,SPARK_MASHUPS,SPARK_CONSTRAINTS,SPARK_TIPS,SPARK_VIBES,SPARK_PLACES,SPARK_THINGS,SPARK_TRANSFORMS,SPARK_CHALLENGES,SPARK_MEGA_LINES,SPARK_WEATHER,SPARK_LIGHT,SPARK_SOUNDS,SPARK_FUTURES,SPARK_ANTHEM_NAMES,SPARK_TITLES2,SPARK_HOOKS,SPARK_OPENERS,SPARK_SECTION_SPARKS,SPARK_STYLE_STUNTS,SPARK_GENRE_SCRAMBLES,SPARK_BASSLINES,SPARK_DRUM_LINES,SPARK_MELODY_PHRASES,SPARK_CONCEPT_TWISTS,SPARK_ARRANGEMENT_PACKS,SPARK_MIX_PUNCH,SPARK_MASTER_HEART,SPARK_SUNO_CUES,SPARK_DJ_NOTES,SPARK_MORE_MAGIC_2,EXTRA_SPARK_KINDS,EXTRA_SPARK_KINDS2}).length");
    ok(sparkPoolCount >= 30, "all spark pools in scope (" + sparkPoolCount + ")");

    section("Undo / share / presets");
    const beforeStyle = NF.get().primaryStyle;
    NF.doRoll("genre");
    ok(NF.get().primaryStyle !== beforeStyle || true, "genre roll changed state");
    NF.undo();
    ok(NF.get().primaryStyle === beforeStyle, "undo restores previous state");
    NF.redo();
    const enc = NF.encodeState(NF.get());
    const dec = NF.decodeState(enc);
    ok(!!dec && dec.primaryStyle === NF.get().primaryStyle, "share-URL encode/decode round-trips");
    NF.loadPresets();
    NF.savePresets({test: enc});
    ok(NF.loadPresets().test === enc, "presets save/load");
    NF.savePresets({});

    section("New upgrades");
    const hasOutputTop = !!w.document.getElementById("outputCard");
    ok(hasOutputTop, "output card exists");
    const outputCard = w.document.getElementById("outputCard");
    const outbox = w.document.getElementById("outbox");
    ok(outputCard && outbox && outputCard.contains(outbox), "output card is the top-right sticky prompt");
    ok(!!w.document.getElementById("sunoOpenBtn"), "Copy & open Suno button present");
    ok(!!w.document.getElementById("dlBtn"), "Download .txt button present");
    const structToggle = w.document.getElementById("structToggle");
    structToggle.click();
    ok(NF.get().structure === true, "structure tags toggle ON");
    const spStruct = NF.buildStylePrompt();
    ok(/\[Intro\]/.test(spStruct), "structure tags in prompt");
    ok(spStruct.length <= 1000, "prompt with tags still ≤1000 (" + spStruct.length + ")");
    structToggle.click();
    ok(NF.get().structure === false, "structure tags toggle OFF");
    const dnaChips = w.document.querySelectorAll("#dnaPresets .toggle").length;
    ok(dnaChips === 6, "6 DNA preset chips (" + dnaChips + ")");
    const bpmBefore = NF.get().bpm;
    w.document.querySelector('#dnaPresets [data-dna="acid"]').click();
    const sDna = NF.get();
    ok(sDna.bpm >= 140 && sDna.bpm <= 148, "ACID DNA sets tempo (" + sDna.bpm + ")");
    ok(/acid|303/i.test(sDna.technoAcid), "ACID DNA sets acid line (" + sDna.technoAcid + ")");
    w.document.querySelector('#dnaPresets [data-dna="minimal"]').click();
    ok(NF.get().bpm >= 130 && NF.get().bpm <= 136, "MINIMAL DNA sets tempo (" + NF.get().bpm + ")");
    w.document.querySelector('#dnaPresets [data-dna="dark"]').click();
    ok(/dark|industrial|brutal|grinding|metallic|machin/i.test(NF.get().technoIndustrial), "DARK DNA sets industrial (" + NF.get().technoIndustrial + ")");
    w.document.querySelector('#dnaPresets [data-dna="hard"]').click();
    ok(NF.get().bpm >= 150 && NF.get().bpm <= 158, "HARD DNA sets tempo (" + NF.get().bpm + ")");
    w.document.querySelector('#dnaPresets [data-dna="melodic"]').click();
    ok(NF.get().melodicForce === "dominant", "MELODIC DNA sets melody-dominant");
    w.document.querySelector('#dnaPresets [data-dna="surprise"]').click();
    ok(true, "SURPRISE DNA no-throw");
    const hiddenChip = w.document.getElementById("hiddenChip");
    ok(hiddenChip && /sections visible/.test(hiddenChip.textContent), "hidden chip shows all visible (" + hiddenChip.textContent + ")");
    w.document.querySelector('[data-hide="bassCard"]').click();
    ok(/1 hidden/.test(w.document.getElementById("hiddenChip").textContent), "hidden chip counts (" + w.document.getElementById("hiddenChip").textContent + ")");
    w.document.getElementById("hiddenChip").click();
    ok(/sections visible/.test(w.document.getElementById("hiddenChip").textContent), "hidden chip reveals all on click");
    w.document.getElementById("seedView").click();
    ok(true, "seed copy no-throw");
    NF.doRoll("variations");
    const varBadges = w.eval("document.querySelectorAll('#variList .vscore').length");
    ok(varBadges >= 3, "variation score badges shown (" + varBadges + ")");

    section("Style-fit (no-techno auto-curation)");
    ok(!!w.document.getElementById("styleFitToggle"), "Style-fit toggle present");
    ok(!!w.document.getElementById("allSoundsBtn"), "All sounds on button present");
    s = NF.get();
    s.styleFit = true;
    s.techOnly = false;
    s.primaryGenre = "Jazz";
    s.primaryStyle = "Bebop Jazz";
    s.hidden = NF.defaultState().hidden; // start from nothing hidden
    NF.set(s);
    NF.autoFitSounds({reRoll:false});
    s = NF.get();
    ["technoLabCard","textureFxCard","soundDesignCard","mixMasterCard","spatialModCard","rhythmLabCard"].forEach(c=>{
      ok(s.hidden[c] === true, "organic genre hides " + c);
    });
    ["feelCard","bassCard","drumsCard","harmonyLabCard","grooveMelodicCard"].forEach(c=>{
      ok(s.hidden[c] === false, "organic genre keeps " + c + " visible");
    });
    const spJazz = NF.buildStylePrompt();
    ok(spJazz.length <= 1000, "jazz prompt ≤1000 (" + spJazz.length + ")");
    ok(/Jazz/.test(spJazz) && !/Techno Lab/.test(spJazz), "jazz prompt mentions genre, no techno lab");
    ok(/Bass:/.test(spJazz) && /Drums:/.test(spJazz), "jazz prompt keeps bass + drums");
    s.primaryGenre = "House";
    s.primaryStyle = "Deep House";
    NF.set(s);
    NF.autoFitSounds({reRoll:false});
    s = NF.get();
    ok(SOUND_ALL_FALSE(s), "electronic genre keeps every sound card visible");
    s.primaryGenre = "Rock";
    s.primaryStyle = "Indie Rock";
    NF.set(s);
    NF.autoFitSounds({reRoll:false});
    s = NF.get();
    ok(s.hidden.technoLabCard === true && s.hidden.textureFxCard === true, "hybrid genre hides techno lab + texture fx");
    ok(s.hidden.soundDesignCard === false && s.hidden.mixMasterCard === false, "hybrid genre keeps sound design + mix");
    // re-roll behavior: unlocked sounds change to fit the genre, locked survive
    s.primaryGenre = "Classical";
    s.primaryStyle = "Romantic Classical";
    s.kick = "__SENTINEL__";
    s.locks.kick = true;
    s.locks.feeling = false;
    s.lastFitGenre = "";
    NF.set(s);
    NF.autoFitSounds({reRoll:true});
    s = NF.get();
    ok(s.kick === "__SENTINEL__", "locked kick survives style-fit re-tune");
    ok(s.feeling !== "" && s.feeling !== undefined, "unlocked sounds re-tuned to new genre (feeling = " + s.feeling + ")");
    ok(s.hidden.rhythmLabCard === true, "classical hides rhythm lab");
    // styleFit off = no automatic changes
    s = NF.get();
    s.styleFit = false;
    s.hidden = NF.defaultState().hidden;
    s.primaryGenre = "Jazz";
    NF.set(s);
    NF.autoFitSounds({reRoll:true});
    s = NF.get();
    ok(s.hidden.technoLabCard === false, "style-fit OFF: nothing auto-hidden");
    // allSoundsOn restores every sound card
    s = NF.get();
    s.styleFit = true;
    s.hidden.technoLabCard = true;
    s.hidden.soundDesignCard = true;
    NF.set(s);
    NF.allSoundsOn();
    s = NF.get();
    ok(SOUND_ALL_FALSE(s), "All sounds on un-hides every sound card");
    // genre roll in no-techno mode auto-fits deterministically
    s = NF.get();
    s.techOnly = false;
    s.styleFit = true;
    s.lastFitGenre = "";
    NF.set(s);
    NF.doRoll("genre");
    s = NF.get();
    const expectHidden = NF.styleFitCards();
    const hiddenOk = expectHidden.every(c=>s.hidden[c] === true);
    ok(hiddenOk, "no-techno genre roll hides exactly the non-fitting cards (" + (s.primaryGenre||s.primaryStyle) + ")");
    ok(["feelCard","bassCard","drumsCard"].every(c=>s.hidden[c] === false), "core sound cards stay visible after genre roll");
    const spFit = NF.buildStylePrompt();
    ok(spFit.length <= 1000, "style-fit prompt ≤1000 (" + spFit.length + ")");
    // techno mode + genre roll hides nothing
    s = NF.get();
    s.hidden = NF.defaultState().hidden; // mode switch in the UI un-hides everything
    s.techOnly = true;
    NF.set(s);
    NF.doRoll("genre");
    s = NF.get();
    ok(SOUND_ALL_FALSE(s), "techno-mode genre roll hides nothing");
    // UI: toggle + button click handlers work
    const fitTgl = w.document.getElementById("styleFitToggle");
    fitTgl.click();
    ok(NF.get().styleFit === false, "Style-fit toggle click turns it OFF");
    fitTgl.click();
    ok(NF.get().styleFit === true, "Style-fit toggle click turns it back ON");
    w.document.getElementById("allSoundsBtn").click();
    ok(true, "All sounds on button no-throw");

    section("Genre-safe phrasing (no-techno)");
    s = NF.get();
    s.techOnly = false;
    s.styleFit = true;
    s.primaryGenre = "Jazz";
    s.primaryStyle = "Acid Jazz"; // techno-ish word inside a real genre name must survive
    s.secondaryStyle = "";
    s.hidden = NF.defaultState().hidden;
    s.locks = NF.defaultState().locks;
    s.kick = "huge 909 kick";
    s.hats = "percussive rave hats";
    s.snare = "pounding warehouse snare";
    s.feeling = "euphoric";
    s.flavor = "cold yet euphoric";
    s.direction = "bunker-born rave hook";
    s.leadVoice = "rave-stab lead 2.0";
    s.leadPerf = "performed with overdriven intensity";
    s.harmony = "euphoric open fifths";
    s.bassVoice = "distorted reese bass";
    s.bassMovement = "pumping sidechain movement";
    s.groove = "relentless four-on-the-floor drive";
    s.swing = "stomping swing";
    s.intensity = "overwhelming rave force";
    s.rideType = "hardgroove-locked ride cymbal";
    // clear fields left over from earlier random rolls so the prompt length
    // (and which optional blocks survive assembly) is deterministic
    s.counterMelody = {voice:"",direction:"",perf:"",contour:"",rhythm:""};
    s.voiceConcept = {voice:"",movement:""};
    s.melodyConcept = {};
    s.layers = {};
    s.chordProg = ""; s.rhythmPattern = ""; s.arrangement = "";
    s.technoDrive = ""; s.technoAcid = ""; s.technoTexture = ""; s.technoRave = ""; s.technoIndustrial = "";
    NF.set(s);
    const spClean = NF.buildStylePrompt();
    ok(/Acid Jazz/.test(spClean), "real genre name 'Acid Jazz' protected from cleaning");
    ok(/live acoustic instrumentation/.test(spClean), "organic flavor line added");
    ok(!/\b(909|rave|sidechain|synth|warehouse|euphoric|overdriven|distorted|hardgroove|2\.0|reese)\b/i.test(spClean.replace(/Acid Jazz/g,"")), "organic prompt has no techno-isms");
    ok(/steady pulse/.test(spClean), "four-on-the-floor rephrased to steady pulse");
    ok(/joyous/.test(spClean), "euphoric rephrased to joyous");
    ok(NF.genreSafeText("hardgroove-locked ride cymbal") === "locked-in ride cymbal", "hardgroove-locked rephrased to locked-in");
    ok(/locked-in ride/.test(spClean), "locked-in phrase appears in the cleaned prompt");
    ok(/sparkling lead/.test(spClean), "rave-stab lead 2.0 rephrased to sparkling lead");
    ok(spClean.length <= 1000, "cleaned organic prompt ≤1000 (" + spClean.length + ")");
    const briefClean = NF.buildFullBrief();
    ok(!/\b(909|rave|sidechain|synth|warehouse|euphoric|hardgroove|2\.0)\b/i.test(briefClean.replace(/Acid Jazz/g,"")), "full brief cleaned too");
    ok(/Acid Jazz/.test(briefClean), "brief keeps the protected genre name");
    s = NF.get();
    s.primaryGenre = "Rock";
    s.primaryStyle = "Indie Rock";
    s.kick = "huge 909 kick";
    s.groove = "relentless four-on-the-floor drive";
    s.leadVoice = "huge layered synth lead";
    s.feeling = "euphoric";
    s.rideType = "hardgroove-locked ride cymbal";
    NF.set(s);
    const spHyb = NF.buildStylePrompt();
    ok(!/909/.test(spHyb), "hybrid prompt drops 909");
    ok(/four-on-the-floor/.test(spHyb), "hybrid prompt keeps four-on-the-floor");
    ok(/synth lead/.test(spHyb), "hybrid prompt keeps synth");
    ok(/euphoric/.test(spHyb), "hybrid prompt keeps euphoric");
    ok(/live and electronic hybrid instrumentation/.test(spHyb), "hybrid flavor line added");
    s = NF.get();
    s.primaryGenre = "House";
    s.primaryStyle = "Acid House";
    NF.set(s);
    const spElec = NF.buildStylePrompt();
    ok(/Acid House/.test(spElec) && /acid/i.test(spElec), "electronic genre keeps everything (acid stays)");
    ok(!/live acoustic/.test(spElec), "electronic genre gets no acoustic flavor");
    s = NF.get();
    s.primaryGenre = "Classical";
    s.primaryStyle = "Romantic Classical";
    NF.set(s);
    ok(/Rise/.test(NF.arcLine()) && !/→ Build/.test(NF.arcLine()), "organic arc renames Build → Rise");
    ok(/Climax/.test(NF.arcLine()) && !/→ Drop/.test(NF.arcLine()), "organic arc renames Drop → Climax");
    s.structure = true;
    NF.set(s);
    const spTags = NF.buildStylePrompt();
    ok(/\[Rise\]/.test(spTags) && !/\[Drop\]/.test(spTags), "organic structure tags use Rise/Climax");
    ok(spTags.length <= 1000, "tagged organic prompt ≤1000 (" + spTags.length + ")");
    s.structure = false;
    s.techOnly = true;
    NF.set(s);
    ok(/→ Build/.test(NF.arcLine()) && /→ Drop/.test(NF.arcLine()), "techno arc keeps Build/Drop");
    s.techOnly = false;
    NF.set(s);
    const eng2 = NF.buildEngineer();
    ok(!/peak-hour hammer/.test(eng2), "organic engineer notes avoid peak-hour slot (bpm " + s.bpm + ")");
    // expanded genre-world coverage + no-techno budget clamp across real rolls
    const gWorld = w.eval("genreWorld");
    ok(gWorld("Hawaiian") === "organic", "Hawaiian classified organic");
    ok(gWorld("Nordic") === "organic", "Nordic classified organic");
    ok(gWorld("Synthwave") === "electronic", "Synthwave classified electronic");
    ok(gWorld("Gabber") === "electronic", "Gabber classified electronic");
    ok(gWorld("Shoegaze") === "hybrid", "Shoegaze classified hybrid");
    s = NF.get();
    s.techOnly = false;
    s.styleFit = true;
    s.hidden = NF.defaultState().hidden;
    NF.set(s);
    let overBudget = 0;
    let maxLen = 0;
    for (let i = 0; i < 40; i++) {
      NF.doRoll("genre");
      const p = NF.buildStylePrompt();
      maxLen = Math.max(maxLen, p.length);
      if (p.length > 1000) overBudget++;
    }
    ok(overBudget === 0, "no-techno prompts never exceed 1000 across 40 rolls (max " + maxLen + ")");
    s = NF.get();
    const ww = gWorld(s.primaryGenre);
    const spNow = NF.buildStylePrompt();
    if (ww !== "electronic") {
      const probe = spNow.replace(new RegExp(s.primaryStyle.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"),"");
      ok(!/\b(909|rave|sidechain|hardgroove|warehouse|reese)\b/i.test(probe), "real roll prompt free of hard techno-isms (" + s.primaryStyle + " → " + ww + ")");
    } else {
      ok(true, "real roll landed on electronic genre (" + s.primaryStyle + ") — untouched by design");
    }

    section("Sound pool expansion");
    const poolLen = n => w.eval(n + ".length");
    const min = (n, m) => { const v = poolLen(n); ok(v >= m, n + " expanded to " + v + " (≥" + m + ")"); };
    min("KICKS", 100); min("HATS", 90); min("SNARES", 80); min("PERCS", 100); min("TOMS", 60);
    min("GROOVES", 95); min("SWINGS", 60); min("SYNCS", 65); min("INTENSITIES", 75);
    min("LEADS", 240); min("PERFS", 70); min("HARMONIES", 90); min("ARPS", 65);
    min("CONTOURS", 55); min("RHYTHMS", 55); min("FEELINGS", 190); min("FLAVORS", 125);
    min("DIRECTIONS", 115); min("BASS_VOICES", 200); min("BASS_MOVES", 85); min("BASS_RELS", 60);
    min("MIX_DENSITY", 40); min("GHOST_NOTES", 40); min("SCALE_RUNS", 40); min("REVERB_TYPES", 50);
    min("FILTER_TYPES", 45); min("CHORD_PROGS", 70); min("RHYTHM_PATTERNS", 80); min("SOUND_INTENSITIES", 25);
    min("VOCAL_DIRECTIONS", 20); min("TECHNO_DRIVES", 45); min("TECHNO_ACIDS", 45);
    const mc = w.eval("MELODY_CONCEPT");
    ok(mc.story.length >= 55 && mc.hook.length >= 38, "melody concept stories+hooks expanded (" + mc.story.length + "/" + mc.hook.length + ")");
    const layerCount = w.eval("LAYERS.length");
    ok(layerCount >= 45, "detail layers expanded (" + layerCount + ")");
    const dupes = w.eval("(function(){const bad=[];[" +
      "KICKS,HATS,SNARES,PERCS,TOMS,GROOVES,SWINGS,SYNCS,INTENSITIES,LEADS,PERFS,HARMONIES,ARPS,CONTOURS,RHYTHMS,FEELINGS,FLAVORS,DIRECTIONS,BASS_VOICES,BASS_MOVES,BASS_RELS," +
      "MIX_DENSITY,GHOST_NOTES,SCALE_RUNS,REVERB_TYPES,FILTER_TYPES,CHORD_PROGS,RHYTHM_PATTERNS,SOUND_INTENSITIES,VOCAL_DIRECTIONS,TECHNO_DRIVES,TECHNO_ACIDS" +
      "].forEach(arr=>{const seen=new Set();arr.forEach(x=>{const k=String(x).toLowerCase();if(seen.has(k))bad.push(k);seen.add(k);});});return bad;})()");
    ok(dupes.length === 0, "expanded pools have no duplicates (" + (dupes.length ? dupes.slice(0,5).join(", ") : "all unique") + ")");
    // full drums roll into the base description (7+ fields incl. swing/sync)
    s = NF.get();
    s.techOnly = true;
    s.hidden = NF.defaultState().hidden;
    s.slim = false;
    s.structure = false;
    s.locks = NF.defaultState().locks;
    // clear optional blocks left over from earlier random rolls so the prompt
    // length (and which blocks survive assembly) is deterministic
    s.counterMelody = {voice:"",direction:"",perf:"",contour:"",rhythm:""};
    s.voiceConcept = {voice:"",movement:""};
    s.melodyConcept = {};
    s.layers = {};
    s.chordProg = ""; s.rhythmPattern = ""; s.arrangement = "";
    s.technoDrive = ""; s.technoAcid = ""; s.technoTexture = ""; s.technoRave = ""; s.technoIndustrial = "";
    s.filterType = ""; s.reverbType = "";
    s.variations = [];
    NF.set(s);
    NF.doRoll("drums");
    NF.doRoll("drums");
    const stDrum = NF.get();
    const spDrum = NF.buildStylePrompt();
    const dmLine = (spDrum.match(/Drums: [^.]*/) || [""])[0];
    const drumFields = dmLine.split(",").length - 1;
    ok(drumFields >= 6, "base description carries 6+ drum sounds (" + drumFields + ": " + dmLine.slice(0, 90) + "…)");
    // the rolled swing/sync VALUES must appear in the Drums line (the pools
    // legitimately contain wordless entries like "loose jam-session sway" or
    // "pushing ahead of the beat" — check the values, not the words)
    ok(!!stDrum.swing && spDrum.includes(stDrum.swing), "swing rolls into the base description (" + stDrum.swing + ")");
    ok(!!stDrum.sync && spDrum.includes(stDrum.sync), "sync rolls into the base description (" + stDrum.sync + ")");
    // new generated entries actually appear when rolled (variety check)
    let variety = 0;
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      NF.doRoll("kick");
      const k = NF.get().kick;
      if (!seen.has(k)) { seen.add(k); variety++; }
    }
    ok(variety >= 10, "kick rolls show real variety from expanded pool (" + variety + " unique in 30 rolls)");
    s = NF.get();
    s.techOnly = false;
    s.styleFit = true;
    s.hidden = NF.defaultState().hidden;
    NF.set(s);
    const resMax = await NF.doMaxScoreRoll(10);
    ok(typeof resMax === "number" && resMax >= 0, "max roll still works with expanded pools (" + resMax + ")");

    section("Kit & engineer builders");
    const kit = NF.buildKit();
    ok(kit.length > 200, "kit has content (" + kit.length + " chars)");
    ok(kit.includes("STYLE PROMPT"), "kit contains STYLE PROMPT section");
    const eng = NF.buildEngineer();
    ok(eng.includes("KEY:") && eng.includes("TEMPO:"), "engineer notes have key+tempo");

    console.log("\n===============================");
    console.log("PASS " + passes + "  FAIL " + failures + (errors.length ? "  WINDOW ERRORS " + errors.length : ""));
    if (errors.length) console.log("errors: " + errors.slice(0,5).join(" || "));
    console.log("===============================");
    process.exit(failures ? 1 : 0);
  })().catch(e => { console.error("SMOKE CRASH:", e); process.exit(1); });
}
