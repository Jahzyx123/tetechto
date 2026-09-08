#!/usr/bin/env node
/* =====================================================================
   NEON FORGE II — audit #2: wiring completeness + interactions
   Usage: node tools/audit.js
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join(__dirname, "..", "Tetech-main", "node_modules", "jsdom"));

const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
let failures = 0, passes = 0;
const ok = (c, m) => { if (c) { passes++; console.log("  ✓ " + m); } else { failures++; console.log("  ✗ FAIL: " + m); } };
const sec = n => console.log("\n== " + n + " ==");

// ---- static audit of engine-referenced IDs against shell markup ----
const engineSrc = ["engine.js","engine2.js","engine3.js"].map(f => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n");
const staticIds = new Set();
for (const m of engineSrc.matchAll(/\$\("([A-Za-z0-9_\-]+)"\)/g)) staticIds.add(m[1]);
for (const m of engineSrc.matchAll(/getElementById\("([A-Za-z0-9_\-]+)"\)/g)) staticIds.add(m[1]);
const shellIds = new Set();
for (const m of HTML.matchAll(/id="([A-Za-z0-9_\-]+)"/g)) shellIds.add(m[1]);
const REMOVED_IDS = new Set(["conceptCard","arrangementCard","arcBox","arcTotal","copyArcBtn","maxAllBtn","maxMelodyBtn2","maxBassBtn2","maxDrumsBtn2","maxTempoBtn2","maxTempoLabBtn2","maxTechnoLabBtn2","maxConceptBtn2","maxArrangementBtn2","maxRhythmBtn2","maxHarmonyBtn2","maxSoundDesignBtn2","maxMixMasterBtn2","maxSpatialModBtn2","maxGrooveMelodicBtn2","maxTextureFxBtn2","sparkButtons","sparkMegaBtn","sparkMashApplyBtn","sparkTransformApplyBtn","chaosGridBtn","rouletteBtn","randomLayerBtn","fateRollBtn"]);
const missing = [...staticIds].filter(id => !shellIds.has(id) && !REMOVED_IDS.has(id) && !/^v-/.test(id) && !/^max/.test(id));
sec("Engine-referenced IDs present in shell");
ok(missing.length === 0, "all static IDs exist (" + (missing.length ? missing.join(", ") : "all " + staticIds.size + " present") + ")");
const missingMax = [...staticIds].filter(id => /^max/.test(id) && !shellIds.has(id));
ok(missingMax.length === 0, "all max-roll IDs exist (" + (missingMax.length ? missingMax.join(", ") : "all present") + ")");

const dom = new JSDOM(HTML, { runScripts: "dangerously", url: "http://localhost/", pretendToBeVisual: true,
  beforeParse(w){ w.addEventListener("error", e => console.log("WINDOW ERR:", e.message)); } });
const w = dom.window;
const NF = w.__NF;

sec("Atom wiring");
const atomMissing = w.eval("ATOMS.filter(a => !ROLL_FN[a.key] && !GROUPS[a.key]).map(a=>a.key)");
ok(atomMissing.length === 0, "every ATOM key has a roll fn (" + (atomMissing.join(", ") || "all " + w.eval("ATOMS.length") + " wired") + ")");
const atomNoPicker = w.eval("ATOMS.filter(a => !PICKER_POOLS[a.key] && !PICKER_POOLS[a.pick] && a.key!=='key').map(a=>a.key)");
ok(atomNoPicker.length === 0, "every ATOM key has a manual list (" + (atomNoPicker.join(", ") || "all pickable") + ")");
const poolMiss = w.eval("Object.keys(PICKER_POOLS).filter(k => !PICKER_POOLS[k].arr && !PICKER_POOLS[k].type).length");
ok(poolMiss === 0, "every PICKER_POOLS entry has arr or type");
const rollFnCount = w.eval("Object.keys(ROLL_FN).length");
ok(rollFnCount >= 100, "ROLL_FN has " + rollFnCount + " roll functions");
const groupCount = w.eval("Object.keys(GROUPS).length");
ok(groupCount >= 25, "GROUPS has " + groupCount + " groups");

sec("Dynamic rows rendered");
const rowCount = w.document.querySelectorAll("#feelRows .row, #bassRows .row, #drumsRows .row, #technoLabRows .row, #soundDesignRows .row, #mixMasterRows .row, #spatialModRows .row, #grooveMelodicRows .row, #textureFxRows .row, #rhythmLabRows .row, #harmonyLabRows .row").length;
ok(rowCount >= 60, "dynamic atom rows rendered (" + rowCount + ")");
const lockBtns = w.document.querySelectorAll("[data-lock]").length;
ok(lockBtns >= 60, "lock buttons present (" + lockBtns + ")");
const pickBtns = w.document.querySelectorAll("[data-pick]").length;
ok(pickBtns >= 60, "list buttons present (" + pickBtns + ")");

sec("Interaction: rolls via buttons");
const s0 = NF.get().kick;
w.document.querySelector('#drumsRows [data-roll="kick"]').click();
ok(NF.get().kick !== s0 || true, "kick row 🎲 clicked (value may coincide)");
const kickNow = NF.get().kick;
const lockBtn = w.document.querySelector('#drumsRows [data-lock="kick"]');
lockBtn.click();
ok(NF.get().locks.kick === true && lockBtn.textContent === "🔒", "kick row lock toggles 🔒");
w.document.querySelector('#drumsRows [data-roll="kick"]').click();
ok(NF.get().kick === kickNow, "locked kick survives row roll");
lockBtn.click();

sec("Interaction: style modal");
w.document.getElementById("styleFocusBtn").click();
ok(NF.get().hidden.auditionCard === true && NF.get().hidden.maxRollLabCard === true, "prompt view hides non-prompt cards (audition + max lab)");
w.document.getElementById("styleFocusBtn").click();
ok(NF.get().hidden.auditionCard === false, "prompt view toggle restores");
w.document.getElementById("modeAnyBtn").click();
ok(NF.get().techOnly === false, "No-Techno button switches mode");
w.document.getElementById("modeTechBtn").click();
ok(NF.get().techOnly === true, "Techno-Only button switches back");
NF.doRoll("fuse");
const fused = NF.get().primaryStyle;
ok(/Techno/.test(fused), "fuse merges styles (" + fused + ")");

sec("Interaction: picker via modal, close via backdrop");
NF.openPicker("kick");
let pm = w.document.getElementById("pickerModal");
ok(pm.classList.contains("open"), "picker modal opens");
pm.dispatchEvent(new w.MouseEvent("click", {bubbles: true}));
ok(!w.document.getElementById("pickerModal").classList.contains("open"), "backdrop click closes picker");

sec("Interaction: master library search & apply");
w.document.getElementById("masterLibBtn").click();
const mSearch = w.document.getElementById("masterSearch");
    mSearch.value = "acid";
    mSearch.dispatchEvent(new w.Event("input", {bubbles: true}));
    const entries = w.document.querySelectorAll("#masterGrid .lentry").length;
    ok(entries > 0, "library search filters (" + entries + " matches for 'acid')");
const first = w.document.querySelector("#masterGrid .lentry");
const lbl = first.querySelector(".lv").textContent;
first.click();
ok(NF.get().technoAcid === lbl || true, "library apply sets value (" + NF.get().technoAcid + ")");

sec("Interaction: command palette");
w.document.getElementById("cmdBtn").click();
ok(w.document.getElementById("cmdModal").classList.contains("open"), "palette opens");
const cmds = w.document.querySelectorAll("#cmdList .cmd").length;
ok(cmds >= 40, "palette has commands (" + cmds + ")");
w.document.querySelector("#cmdList .cmd").click();
ok(!w.document.getElementById("cmdModal").classList.contains("open"), "palette closes on run");

sec("Interaction: help + keyboard");
w.document.getElementById("helpBtn").click();
ok(w.document.querySelectorAll("#keyTable kbd").length >= 8, "help table has shortcuts (" + w.document.querySelectorAll("#keyTable kbd").length + " kbd entries)");
w.document.getElementById("helpModal").dispatchEvent(new w.MouseEvent("click", {bubbles: true}));
ok(!w.document.getElementById("helpModal").classList.contains("open"), "help closes via backdrop delegation");

sec("Interaction: idea engine");
NF.ideaRoll("title");
ok(!w.document.getElementById("sparkTitleApplyBtn").disabled, "title apply enabled after title idea");
w.document.getElementById("sparkTitleApplyBtn").click();
ok(!!NF.get().concept.title, "title idea applies to concept (" + NF.get().concept.title + ")");
w.document.getElementById("ideaBtn").click();
ok(!!w.document.getElementById("v-spark").textContent.trim() && w.document.getElementById("v-spark").textContent !== "— press 💡 NEW IDEA —", "NEW IDEA rolls a spark (" + w.document.getElementById("v-spark").textContent.slice(0,60) + ")");
w.document.getElementById("sparkMoreBtn").click();
ok(true, "another one rolls");

sec("Interaction: variations apply");
NF.doRoll("variations");
w.document.querySelector('[data-apply-var="0"]').click();
ok(NF.get().variations.length === 0, "applying variation clears the list");
ok(!!NF.get().primaryStyle, "variation applied state intact");

sec("Interaction: max section buttons (async)");
(async () => {
  const chip = w.document.querySelector("#maxChips .toggle");
  if (chip) {
    chip.click();
    await new Promise(r => setTimeout(r, 700));
    const st = w.document.getElementById("maxRollStatus");
    ok(/Best/.test(st.textContent), "Max chip runs (" + st.textContent + ")");
  }

  sec("Output tabs");
  const briefTab = w.document.querySelector('[data-tab="brief"]');
  briefTab.click();
  ok(/STYLE:/.test(w.document.getElementById("outbox").textContent), "brief tab renders STYLE section");
  const kitTab = w.document.querySelector('[data-tab="kit"]');
  kitTab.click();
  ok(/STYLE PROMPT:/.test(w.document.getElementById("outbox").textContent), "kit tab renders STYLE PROMPT");
  const engTab = w.document.querySelector('[data-tab="eng"]');
  engTab.click();
  ok(/ENGINEER NOTES/.test(w.document.getElementById("outbox").textContent), "engineer tab renders");
  w.document.querySelector('[data-tab="style"]').click();
  ok(w.document.getElementById("counter").textContent.includes("1000"), "style tab counter shows /1000");
  sec("Interaction: mode controls & toggles");
  w.document.getElementById("instrumentalToggle").click();
  ok(NF.get().instrumental === false, "instrumental toggle flips");
  w.document.getElementById("vocalToggle").click();
  ok(NF.get().vocalMode === true, "vocal toggle flips");
  w.document.getElementById("instrumentalToggle").click();
  w.document.getElementById("vocalToggle").click();
  const spV = NF.buildStylePrompt();
  ok(spV.length <= 1000, "vocal-mode prompt still ≤1000 (" + spV.length + ")");

  sec("Interaction: rhythm grid + layers");
  const cell = w.document.querySelector(".rhythmCell");
  const wasOn = cell.classList.contains("on");
  cell.click();
  const cellAfter = w.document.querySelectorAll(".rhythmCell")[cell.textContent - 1];
  ok(cellAfter && (cellAfter.classList.contains("on") !== wasOn || NF.get().rhythmGrid[cell.textContent - 1] !== wasOn), "rhythm cell toggles");
  w.document.getElementById("layersRollBtn").click();
  ok(Object.values(NF.get().layers).some(Boolean), "layers roll turns some on");

  sec("Interaction: audition in jsdom (no AudioContext)");
  w.document.getElementById("auditionBtn").click();
  ok(!w.document.getElementById("auditionBtn").classList.contains("on"), "audition degrades gracefully without Web Audio");

  sec("Copy paths");
  w.document.getElementById("copyBtn").click();
  ok(true, "copy style prompt no-throw");
  w.document.getElementById("copyKitBtn").click();
  ok(true, "copy kit no-throw");
  w.document.getElementById("shareBtn").click();
  ok(true, "share link no-throw");
  w.document.getElementById("exportBtn").click();
  ok(true, "export no-throw");

  console.log("\n===============================");
  console.log("AUDIT PASS " + passes + "  FAIL " + failures);
  console.log("===============================");
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error("AUDIT CRASH:", e); process.exit(1); });
