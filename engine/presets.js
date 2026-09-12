/* engine/presets.js — apply a curated one-click recipe to a state.
   Presets deliberately start from a clean slate (locks cleared, parked
   cards reconciled) and then drive the SAME public operations the UI
   buttons use, so every preset outcome is reproducible by hand. */
import { PRESETS } from "../data/presets.js";
import { roll } from "./roll.js";
import { setSoundLite, setNoStop, setHideBeats, unhideAllSoundCards } from "./roll.js";
import { SOUND_CARDS } from "./world.js";
import { pickGenreHint, pickGenreObjOther, tempoForGenre } from "./genre.js";
import { defaultLocks } from "./state.js";

const SCALAR_KEYS = [
  "techOnly", "instrumental", "vocalProfile", "weirdness", "melodicForce",
  "duration", "influence", "structure", "styleFit", "equalChance", "noHandPerc",
  "maxStyle"
];

export function listPresets() { return PRESETS; }

export function applyPreset(s, preset) {
  const o = (preset && preset.overrides) || {};
  /* clean slate: no stale locks or parked sections */
  s.locks = defaultLocks();
  setHideBeats(s, false);
  setNoStop(s, false);
  setSoundLite(s, false);
  for (const k of SCALAR_KEYS) if (k in o) s[k] = o[k];
  s.vocalMode = !s.instrumental;
  if (s.techOnly) {
    unhideAllSoundCards(s, SOUND_CARDS);
    s.lastFitGenre = "";
  }
  /* genre: hinted presets select the genre directly (retry lottery almost
     never hits a 1-in-N genre), otherwise a normal seeded genre roll */
  const hint = (o.genreHint || "").toLowerCase().trim();
  if (hint && !s.techOnly) {
    const p = pickGenreHint(s, hint) || null;
    if (p) {
      s.primaryGenre = p.genre; s.primaryStyle = p.combo;
      const q = pickGenreObjOther(s, p.genre);
      s.secondaryGenre = q.genre; s.secondaryStyle = q.combo;
      s.bpm = tempoForGenre(s, s.primaryGenre, s.secondaryGenre);
    } else {
      roll(s, "genre");
    }
  } else {
    roll(s, "genre");
  }
  /* shape toggles AFTER the genre roll so their card parking and pool
     re-rolling land on the right genre */
  if (o.hideBeats) setHideBeats(s, true);
  if (o.noStop) setNoStop(s, true);
  if (o.soundLite) setSoundLite(s, true);
  /* fill everything EXCEPT the genre identity, which the hint/roll above
     already settled (presets start with locks cleared, so pin temporarily) */
  s.locks.primary = true; s.locks.secondary = true; s.locks.bpm = true; s.locks.genre = true;
  roll(s, "everything");
  s.locks.primary = false; s.locks.secondary = false; s.locks.bpm = false; s.locks.genre = false;
  return s;
}
