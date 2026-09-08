/* engine/world.js — genre-world classification + genre-safe rewriting.
   Ported 1:1 from the legacy engine:
   - genreWorld() classifies the rolled genre as electronic / organic /
     hybrid.
   - genreSafeText() regex-rewrites techno-flavoured pool text to fit
     the genre world (four-on-the-floor → steady pulse, strip
     909/303/acid/rave/warehouse/sidechain terms in organic mode, a
     lighter touch in hybrid mode) while protecting the literal style
     names from being rewritten via placeholder swaps.
   - styleFitCards() lists the electronic-lean cards to hide for the
     current genre world (no-techno auto-curation). */

export const ELECTRONIC_LEAN_CARDS = ["technoLabCard", "textureFxCard", "soundDesignCard", "mixMasterCard", "spatialModCard", "rhythmLabCard"];
export const HYBRID_HIDE = ["technoLabCard", "textureFxCard"];
export const ELECTRONIC_GENRES = new Set(["house", "trance", "electronic", "dance", "electronic latin", "electronic retro", "retro", "electronic dance", "hardcore", "gabber", "jungle", "drum and bass", "breakbeat", "dubstep", "trap", "bass", "uk garage", "footwork", "jersey club", "industrial", "darkwave", "synthwave", "vaporwave", "lo-fi", "chillstep", "trip hop", "electro-swing", "city pop", "video game", "nightcore", "retro futurist", "space", "broken beat", "balearic", "chillwave", "broken bass", "steampunk", "dieselpunk", "solarpunk", "atompunk", "neon", "festival", "factory", "laboratory", "observatory", "spaceport", "subway", "airport", "motor racing", "skate", "snowboard", "gym", "amusement", "fair", "casino", "shibuya-kei", "crystal", "aura", "ethereal", "glass", "lighthouse"]);
export const ORGANIC_GENRES = new Set(["jazz", "blues", "bossa nova", "reggae", "country", "latin", "world", "classical", "folk", "gospel", "punk", "theatrical", "acoustic pop", "easy listening", "african", "caribbean", "spanish", "swing", "big band", "bluegrass", "americana", "western", "cajun", "polka", "klezmer", "gypsy", "indian classical", "middle eastern", "persian", "turkish", "greek", "italian", "french", "portuguese", "german", "nordic", "celtic", "slavic", "russian", "brazilian", "mexican", "argentine", "andean", "afro-cuban", "salsa", "cumbia", "samba", "orchestral", "lounge", "asian traditional", "tropical", "ocean", "forest", "desert", "winter", "spring", "nature", "weather", "underwater", "cave", "mountain", "harbor", "sailing", "railway", "garden", "farm", "countryside", "village", "small town", "river", "lake", "wind", "storm", "ice", "savanna", "prairie", "tundra", "wetland", "mangrove", "volcanic", "geothermal", "canyon", "mesa", "oasis", "rainforest", "boreal", "tibetan", "mongolian", "korean", "vietnamese", "chinese", "thai", "filipino", "hawaiian", "polynesian", "aboriginal", "amazonian", "native", "egyptian", "north african", "southern african", "lusophone", "operatic pop", "acoustic session", "spa", "yoga", "meditation", "wellness", "temple", "monastery", "church", "ceremonial", "wedding", "birthday", "summer", "autumn", "halloween", "nocturne", "interlude", "golden oldies", "diner", "motel", "road trip", "jukebox", "cassette", "vinyl", "circus", "marching", "brass band", "carnival", "ballroom", "port", "street market", "bazaar", "carnival of venice", "retro soul", "music box", "toy", "puppetry", "library", "museum", "studio", "restaurant", "bar", "camping", "hiking", "fishing", "surfing", "climbing", "adult"]);
export const SOUND_CARDS = ["feelCard", "bassCard", "drumsCard", "technoLabCard", "harmonyLabCard", "rhythmLabCard", "soundDesignCard", "mixMasterCard", "spatialModCard", "grooveMelodicCard", "textureFxCard"];
/* SOUND-LITE — the sections that describe the *sound* rather than the
   music (effects / mix / FX / ensemble texture). They are parked by the
   🔇 SOUND-LITE toggle so the Style Prompt fills with melody, groove and
   pattern first; their values may still be packed as last-resort backfill
   when there is room left (see densify()). */
export const SOUND_LITE_CARDS = ["soundDesignCard", "mixMasterCard", "spatialModCard", "textureFxCard", "technoLabCard"];
/* HIDE-BEATS — melody-only: park the drums & bass beats plus every
   sound-appearance section, so nothing but the melody/pattern command
   text reaches the prompt. */
export const HIDE_BEATS_CARDS = ["drumsCard", "bassCard", "soundDesignCard", "mixMasterCard", "spatialModCard", "textureFxCard", "technoLabCard"];
/* Detail-layer chips that describe sound design / FX — switched off by
   SOUND-LITE ("ping-pong delay feedback" etc. — the user-facing example).
   Musical / structural chips stay on. */
export const SOUND_LITE_LAYERS_KEEP = ["performance", "sequencing", "visual", "polyrhythm", "chordProgLayer", "rhythmLayer", "harmonicLayer", "energySculpt", "euphoria"];
/* HIDE-BEATS also drops the beat/percussion layer chips (polyrhythm) but
   keeps the pattern & performance layers that describe the melody. */
export const HIDE_BEATS_LAYERS_KEEP = SOUND_LITE_LAYERS_KEEP.filter(id => id !== "polyrhythm");
/* group -> the card it lives on (only re-roll groups whose card stays visible) */
export const FIT_GROUPS = [
  ["feel-melody", "feelCard"],
  ["bass", "bassCard"],
  ["drums", "drumsCard"],
  ["harmony", "harmonyLabCard"],
  ["grooveMelodic", "grooveMelodicCard"],
  ["soundDesign", "soundDesignCard"],
  ["mixMaster", "mixMasterCard"],
  ["spatialMod", "spatialModCard"],
  ["textureFx", "textureFxCard"],
  ["rhythm", "rhythmLabCard"]
];

export function genreWorld(genre) {
  const g = String(genre || "").toLowerCase().trim();
  if (!g) return "hybrid";
  if (ELECTRONIC_GENRES.has(g)) return "electronic";
  if (ORGANIC_GENRES.has(g)) return "organic";
  return "hybrid";
}

/* Cards to hide for the rolled genre world.

   Previously organic genres hid six cards and hybrid genres hid two,
   which meant those sounds never reached the prompt at all — no-techno
   prompts carried ~6 fewer sounds than techno-only ones.

   Now that engine/state.js swaps in organic/hybrid vocabularies for those
   same atom keys (data/acoustic.js), every card stays VISIBLE and simply
   rolls genre-appropriate words. The Lab card stays visible too — its five
   slots become ensemble stabs, room colour and hand percussion — except
   for organic genres, where the acoustic set already covers that ground
   and the extra slots crowd out better sounds. */
export function styleFitCards(s) {
  if (s.techOnly) return [];
  return genreWorld(s.primaryGenre) === "organic" ? ["technoLabCard"] : [];
}

/* ---------------------------- GENRE-SAFE PHRASES (no-techno) ----------------------------
   The original pools are techno-flavoured, so values that land in a
   no-techno description get rephrased to fit the genre world:
   - organic (jazz, classical, folk, country, …): synth → acoustic,
     rave/acid/909/warehouse/sidechain terms removed, overdriven →
     intense, four-on-the-floor → steady pulse, arc sections renamed
     (Drop → Climax…)
   - hybrid (pop, rock, soul, funk, hip-hop, …): only hard techno-only
     terms removed (acid/303/909/808/rave/hardstyle/warehouse/sidechain);
     synth, distortion and euphoric survive.
   The style line (genre combos like "Acid Jazz") is protected so real
   genre names are never mangled. */
export const ORGANIC_MAP = [
  /* phrase-level rewrites (must run before the word removals below) */
  [/\breese bass\b/gi, "deep bass"],
  [/\boverdriven[- ]?intensity\b/gi, "fiery intensity"],
  [/\bhardgroove[- ]?locked\b/gi, "locked-in"],
  [/\bcircuit[- ]?bent\b/gi, "quirky"],
  [/\bacid[- ]?driven\b/gi, "propulsive"],
  [/\bbunker[- ]?born\b/gi, "raw"],
  [/\bacid[- ]?searing\b/gi, "piercing"],
  [/\brave[- ]?stab[- ]?lead\b/gi, "sparkling lead"],
  [/\bsuper[- ]?charged[- ]?peak\b/gi, "electric"],
  [/\bsuper[- ]?charged\b/gi, "electric"],
  [/\breactor[- ]?fueled\b/gi, "driven"],
  [/\breactor[- ]?core\b/gi, "driving"],
  [/\bfrenzy[- ]?pumped\b/gi, "frenetic"],
  [/\btape[- ](\w+)\b/gi, "tape $1"],
  [/\b([a-z]+(?:[- ][a-z]+)?)[- ]synth\b/gi, (m, stem) => stem.replace(/-/g, " ")],
  [/\bdrop(s)?\b/gi, "refrain"],
  /* compound techno-isms (remove whole phrase) */
  [/\b(acid[- ]?squelch|acid[- ]?drenched|acid[- ]?fueled|303[- ]?style|303[- ]?filtered|bunker[- ]?rattling|peak[- ]?time|warehouse[- ]?powered|warehouse[- ]?echo|rave[- ]?charged|rave[- ]?stab|trance[- ]?pluck|saw[- ]?stack|triple[- ]?oscillator|hands[- ]?in[- ]?the[- ]?air|siren[- ]?like|siren[- ]?sweep|sub[- ]?wobble|turbo[- ]?charged|piston[- ]?powered|voltage[- ]?spiked|modular[- ]?patched|micro[- ]?swept|rave[- ]?fueled|synth[- ]?string bass|kick[- ]?locked|filter[- ]?swept|overdrive[- ]?slammed|gate[- ]?stab)\b/gi, " "],
  /* machine-model numbers */
  [/\b(909|808|303)\b/gi, " "],
  /* pure techno nouns / instruments */
  [/\b(sidechain|rave|trance|acid|hardstyle|gabber|industrial|breakbeat|dubstep|techno|warehouse|festival|mainstage|bigroom|laser|glitch|bitcrush|wobble|synthesizer|synth|stadium|arena|bunker|machine|oscillator|circuit|siren|cyberpunk|reese|filter|hardgroove(?!-)|wavetable|FM|sine|overdrive|factory)\b/gi, " "],
  /* adjective stack that only makes sense on electronic drums/synths */
  [/\b(relentless|punishing|brutal|berserk|slammed|slamming|clipped|gated|stuttered|stuttering|distorted|stomping|hammering)\b/gi, " "],
  [/\btightly\s+gated\b/gi, "tight"],
  /* dance-floor pattern → neutral pulse */
  [/\b(four[- ]?on[- ]?the[- ]?floor|4[- ]?on[- ]?the[- ]?floor)\b/gi, "steady pulse"],
  [/\bstomp(s|ing)?\b/gi, "groove"],
  /* standalone-capable words → genre-fitting equivalents */
  [/\boverdriven\b/gi, "intense"],
  [/\beuphoric\b/gi, "joyous"],
  [/\banthem(s)?\b/gi, "showpiece"],
  [/\bpumping\b/gi, "pulsing"],
  [/\bsiren\b/gi, "soaring"],
  [/\bcrushing\b/gi, "extremely"],
  [/\bferocious\b/gi, "fierce"],
  [/\bexplosive\b/gi, "bursting"]
];
export const HYBRID_MAP = [
  [/\bhardgroove[- ]?locked\b/gi, "locked-in"],
  [/\bacid[- ]?driven\b/gi, "propulsive"],
  [/\bbunker[- ]?born\b/gi, "raw"],
  /* compound techno-isms — only the ones with no place outside techno */
  [/\b(acid[- ]?squelch|acid[- ]?drenched|acid[- ]?fueled|acid[- ]?searing|303[- ]?style|303[- ]?filtered|bunker[- ]?rattling|peak[- ]?time|warehouse[- ]?powered|warehouse[- ]?echo|rave[- ]?charged|rave[- ]?stab|trance[- ]?pluck|saw[- ]?stack|triple[- ]?oscillator|siren[- ]?like|sub[- ]?wobble|turbo[- ]?charged|piston[- ]?powered|voltage[- ]?spiked|modular[- ]?patched|micro[- ]?swept|rave[- ]?fueled|kick[- ]?locked|gate[- ]?stab)\b/gi, " "],
  [/\b(909|808|303)\b/gi, " "],
  [/\b(sidechain|rave|trance|acid|hardstyle|gabber|industrial|warehouse|mainstage|bigroom|hardgroove(?!-)|reese)\b/gi, " "]
];

export function genreSafeText(s, text, protectStyles) {
  if (s.techOnly) return text;
  const world = genreWorld(s.primaryGenre);
  if (world === "electronic") return text;
  const fixes = world === "organic" ? ORGANIC_MAP : HYBRID_MAP;
  let t = String(text || "");
  const ph = [];
  if (protectStyles) {
    const styles = [s.primaryStyle, s.secondaryStyle].filter(Boolean).sort((a, b) => b.length - a.length);
    styles.forEach(st => {
      const re = new RegExp(st.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      t = t.replace(re, m => { ph.push(m); return "\u0001" + (ph.length - 1) + "\u0001"; });
    });
  }
  for (const [re, rep] of fixes) {
    t = t.replace(re, rep);
  }
  t = t.replace(/\b\d+\.\d+\b/g, "");           /* leftover "2.0"-style junk */
  t = t.replace(/ -\s*([a-z])/gi, " $1");      /* "glassy -bell" → "glassy bell" */
  t = t.replace(/^-\s+|\s+-$/g, " ");          /* leading/trailing hyphen stubs */
  t = t.replace(/\s{2,}/g, " ");
  t = t.replace(/\s+([,.;])/g, "$1");
  t = t.replace(/,\s*,/g, ",");
  t = t.replace(/[,.;]\s*[,.;]+/g, ".");
  t = t.replace(/^\s*[,.;:\s]+|\s*[,.;:\s]+$/g, "");
  if (ph.length) t = t.replace(/\u0001(\d+)\u0001/g, (m, i) => ph[+i]);
  return t.trim();
}
