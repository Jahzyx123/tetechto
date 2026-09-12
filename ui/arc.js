/* ui/arc.js — energy-arc visualizer (DOM layer).
   The engine already computes the full arrangement timeline
   (energyArc: section name, bars, energy %, timecode); this turns it into
   a compact stacked bar chart on the Arrangement card so the shape of the
   song — where the drops and releases land — is visible at a glance and
   matches the [Intro][Build][Drop]… structure tags and the lyric sheet. */
import { energyArc, keyName } from "../engine/index.js";

export function arcHtml(s) {
  const arc = energyArc(s);
  const totalBars = arc.reduce((a, x) => a + x.bars, 0) || 1;
  const spb = 60 / (s.bpm || 140);
  const totalSec = totalBars * 4 * spb;
  const seg = x => {
    const hue = Math.round(190 - (x.energy / 100) * 165);   /* cyan → magenta/red */
    const pct = Math.max(12, x.energy);
    return `
      <div class="arcSeg" style="flex-grow:${x.bars}"
           title="${x.name} · ${x.bars} bars · ${x.energy}% energy · ${x.startLabel}">
        <div class="arcTrack">
          <div class="arcBar" style="height:${pct}%; background:linear-gradient(180deg, hsl(${hue},90%,62%), hsl(${hue},85%,42%));"></div>
        </div>
        <div class="arcLbl">
          <b>${x.name}</b>
          <span>${x.bars} bar${x.bars > 1 ? "s" : ""} · ${x.startLabel} · ${x.energy}%</span>
        </div>
      </div>`;
  };
  const end = Math.round(totalSec);
  return `
    <div class="arcviz">
      <div class="arcRow">${arc.map(seg).join("")}</div>
      <div class="arcFoot">
        <span>${keyName(s)} · ${s.bpm} BPM</span>
        <span>${totalBars} bars · ${Math.floor(end / 60)}:${String(end % 60).padStart(2, "0")} approximate runtime${s.noStop ? " · non-stop" : ""}</span>
      </div>
    </div>`;
}
