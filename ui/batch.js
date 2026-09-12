/* ui/batch.js — Batch Forge modal.
   Generates N independent ranked candidates via engine/batch.js and shows
   them in a grid. Every candidate carries a full state snapshot, so the
   usual verbs all work: load into the bench, copy, send to A/B compare,
   or save straight to the library. Pure presentation — engine roll/copy/
   save functions are handed in by app.js (no circular imports). */
import { forgeBatch, candidateHeadline } from "../engine/batch.js";
import { camelot, keyName } from "../engine/music.js";

const $ = sel => document.querySelector(sel);
function escapeHtml(x) {
  return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function openBatch(baseState, handlers) {
  const modal = $("#batchModal");
  modal.hidden = false;

  function renderGrid(candidates, ms) {
    const host = modal.querySelector("#batchGrid");
    if (!candidates.length) { host.innerHTML = `<div class="empty">No distinct candidates — unlock more fields.</div>`; return; }
    host.innerHTML = candidates.map((c, i) => {
      const s = c.state;
      const tags = [
        s.noStop ? "⛓ no-stop" : "", s.hideBeats ? "🥁 melody-only" : "",
        s.soundLite ? "🔇 sound-lite" : "", s.instrumental ? "" : "🎤 vocal",
        s.techOnly ? "" : "no-techno"
      ].filter(Boolean).join(" · ");
      return `
      <div class="batchCard">
        <div class="batchHead">
          <span class="batchRank">#${i + 1}</span>
          <span class="batchScore">${c.score.total}</span>
        </div>
        <div class="batchStyle">${escapeHtml(s.primaryStyle || "—")}</div>
        <div class="batchMeta">${s.bpm} BPM · ${escapeHtml(keyName(s))} · ${camelot(s)}</div>
        ${s.secondaryStyle ? `<div class="batchSub">+ ${escapeHtml(s.secondaryStyle)}</div>` : ""}
        ${tags ? `<div class="batchTags">${escapeHtml(tags)}</div>` : ""}
        <div class="batchPrev">${escapeHtml(c.prompt.slice(0, 220))}…</div>
        <div class="batchOps">
          <button class="btn small" data-act="load" data-i="${i}">Load</button>
          <button class="btn small" data-act="copy" data-i="${i}">📋 Copy</button>
          <button class="btn small" data-act="a" data-i="${i}">A</button>
          <button class="btn small" data-act="b" data-i="${i}">B</button>
          <button class="btn small" data-act="save" data-i="${i}">⭐</button>
        </div>
      </div>`;
    }).join("");
    host.querySelector(".batchHead")?.setAttribute?.("title", candidateHeadline(candidates[0]));
  }

  function renderShell() {
    modal.innerHTML = `
      <div class="box batchBox">
        <header>
          <h3>🎰 Batch Forge <span class="readout">N ranked candidates</span></h3>
          <span class="seg">
            <label class="inline">n&nbsp;<select id="batchN">
              <option value="6">6</option><option value="12" selected>12</option>
              <option value="24">24</option><option value="36">36</option>
            </select></label>
            <label class="inline" title="Hill-climb every candidate with MAX (slower)">
              <input type="checkbox" id="batchMax"> ⭐ MAX each</label>
          </span>
          <button class="btn primary" id="batchGo">🎲 Forge</button>
          <button class="btn small" id="batchClose">✕</button>
        </header>
        <div id="batchStatus" class="readout">Locks, toggles and voice settings are respected.</div>
        <div class="batchGrid" id="batchGrid">
          <div class="empty">Hit 🎲 Forge — ${12} fresh prompts are rolled, scored and ranked.</div>
        </div>
      </div>`;
    modal.querySelector("#batchClose").addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    modal.querySelector("#batchGo").addEventListener("click", run);
    modal.querySelector("#batchGrid").addEventListener("click", e => {
      const b = e.target.closest("[data-act]");
      if (!b || !last.length) return;
      const c = last[+b.dataset.i], act = b.dataset.act;
      if (act === "load") { handlers.onLoad(c.state); close(); }
      else if (act === "copy") handlers.onCopy(c.prompt, "Style Prompt");
      else if (act === "a" || act === "b") handlers.onCompare(act, c.state, c.prompt, c.score);
      else if (act === "save") handlers.onSave(c.state);
    });
  }
  let last = [];
  function run() {
    const n = +modal.querySelector("#batchN").value;
    const maxEach = modal.querySelector("#batchMax").checked;
    const status = modal.querySelector("#batchStatus");
    const go = modal.querySelector("#batchGo");
    go.disabled = true;
    status.textContent = "Forging " + n + (maxEach ? " MAX-optimised" : "") + " candidates…";
    /* let the status paint before the (synchronous, CPU-bound) run */
    setTimeout(() => {
      const t0 = Date.now();
      last = forgeBatch(baseState, n, { maxEach, tries: 12 });
      renderGrid(last);
      status.textContent = last.length + " distinct candidates in " + (Date.now() - t0) / 1000 + "s · best score " +
        (last[0] ? last[0].score.total : "—");
      go.disabled = false;
    }, 30);
  }
  function close() { modal.hidden = true; modal.innerHTML = ""; }

  renderShell();
}
