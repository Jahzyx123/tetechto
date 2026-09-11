/* =====================================================================
   NEON FORGE II — ENGINE (all-new code, rebuilt from scratch)
   ---------------------------------------------------------------------
   Everything below is fresh code written for the remake. It consumes
   the data pools above (which are the ORIGINAL pools, verbatim) and
   provides: mode switch (Techno-Only / No-Techno), style+sub-style
   combos, per-atom roll/lock/manual-list, hide feature, spark/idea
   engine, prompt builders (≤1000-char Suno description first), prompt
   scoring, energy arc, audition engine, share/presets/history.
   ===================================================================== */

/* ---------------------------- PRNG ---------------------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
let rng = mulberry32(Math.floor(Math.random()*4294967296));
function newSeed(){return Math.floor(Math.random()*4294967296);}
function pick(arr){return arr[Math.floor(rng()*arr.length)];}

/* ---------------------------- DERIVED INDEXES ---------------------------- */
const STYLES_BY_CAT = {core:[], sub:[], rare:[]};
STYLES.forEach(s=>{ (STYLES_BY_CAT[s.c] || STYLES_BY_CAT.sub).push(s.n); });
const SCALE_BY_ID = {}; SCALES.forEach(s=>SCALE_BY_ID[s.id]=s);
const MICRO_BY_ID = {}; MICRO_MODES.forEach(m=>MICRO_BY_ID[m.id]=m);
const ATOM_BY_KEY = {}; ATOMS.forEach(a=>ATOM_BY_KEY[a.key]=a);
const VOCAL_RE = new RegExp("\\b(" + VOCAL_WORDS.join("|") + ")\\b", "i");
function hasVocalRef(text){ return VOCAL_RE.test(text); }

/* ---------------------------- WEIRDNESS / STYLE MACHINERY ---------------------------- */
function weirdMix(w){
  const lo = w<=50 ? WEIRD_MIX[0]  : WEIRD_MIX[50];
  const hi = w<=50 ? WEIRD_MIX[50] : WEIRD_MIX[100];
  const f  = w<=50 ? w/50 : (w-50)/50;
  return { core: lo.core+(hi.core-lo.core)*f, sub: lo.sub+(hi.sub-lo.sub)*f, rare: lo.rare+(hi.rare-lo.rare)*f };
}
function weirdCategory(){
  const m = weirdMix(state.weirdness);
  const r = rng();
  if(r < m.core) return "core";
  if(r < m.core + m.sub) return "sub";
  return "rare";
}
function pickStyle(){
  if(state.techOnly){
    if(state.equalChance) return pick(STYLES.map(s=>s.n));
    const cat = weirdCategory();
    const pool = STYLES_BY_CAT[cat];
    if(!pool || !pool.length) return pick(STYLES.map(s=>s.n));
    return pick(pool);
  }
  return pickGenreCombo();
}
function genreComboName(g, sub){
  const s = sub.trim(), gn = g.n.trim();
  if(s.toLowerCase()===gn.toLowerCase() || s.toLowerCase().endsWith(gn.toLowerCase())) return s;
  return s + " " + gn;
}
function pickGenreCombo(){ const g = pick(GENRES); return genreComboName(g, pick(g.subs)); }
function pickGenreComboOther(avoid){ let c = pickGenreCombo(), g=0; while(c===avoid && g++<8){ c = pickGenreCombo(); } return c; }
function allCombos(){ const out=[]; for(const g of GENRES) for(const sub of g.subs) out.push(genreComboName(g,sub)); return out; }
function pickGenreObj(){
  if(state.equalChance){ const c = pick(allCombos()); return {genre: genreOfStyle(c) || "", combo:c}; }
  const g = pick(GENRES);
  return {genre:g.n, combo:genreComboName(g, pick(g.subs))};
}
function pickGenreObjOther(avoidGenre){
  if(state.equalChance){
    let c = pick(allCombos()), g=0;
    while((genreOfStyle(c)===avoidGenre) && g++<8) c = pick(allCombos());
    return {genre: genreOfStyle(c) || "", combo:c};
  }
  let g = pick(GENRES), guard=0;
  while(g.n===avoidGenre && guard++<8) g = pick(GENRES);
  return {genre:g.n, combo:genreComboName(g, pick(g.subs))};
}
function genreOfStyle(name){
  const low=(name||"").toLowerCase(); if(!low) return "";
  for(const g of GENRES){
    const gn=g.n.toLowerCase();
    if(low===gn) return g.n;
    if(low.length>gn.length && low.endsWith(gn)) return g.n;
    for(const sub of g.subs){ if(low===genreComboName(g,sub).toLowerCase()) return g.n; }
  }
  return "";
}
function tempoForGenre(g1, g2){
  const s=((g1||"")+" "+(g2||"")).toLowerCase();
  if(state.techOnly){
    const r=rng();
    if(r<0.15) return 128 + Math.floor(rng()*4);
    if(r<0.55) return 135 + Math.floor(rng()*8);
    if(r<0.85) return 142 + Math.floor(rng()*8);
    return 150 + Math.floor(rng()*6);
  }
  for(const [re,lo,hi] of TEMPO_RULES){ if(re.test(s)) return lo + Math.floor(rng()*(hi-lo+1)); }
  return 96 + Math.floor(rng()*45);
}
function pickScaleId(){
  const tier = SCALE_TIERS[weirdCategory()] || SCALE_TIERS.sub;
  return pick(tier);
}
function pickSecondary(primary){ let s = pickStyle(), g=0; while(s===primary && g++<8){ s = pickStyle(); } return s; }
function rollBpmValue(){
  const r = rng();
  if(r<0.2) return 128 + Math.floor(rng()*8);
  if(r<0.75) return 138 + Math.floor(rng()*11);
  return 150 + Math.floor(rng()*11);
}
function pickArrangementFor(s){
  const FAST_START = 12;
  let a;
  if(rng() < 0.68 && ARRANGEMENTS.length > FAST_START){
    a = ARRANGEMENTS[FAST_START + Math.floor(rng()*(ARRANGEMENTS.length-FAST_START))];
  } else {
    a = pick(ARRANGEMENTS);
  }
  const d = s.duration || "standard";
  if(d==="compact") a = "Tight intro, " + a + " (compact, radio-length).";
  else if(d==="extended") a = "Long-form journey: extended intro, " + a + ", extended outro.";
  else a = a + ".";
  return a.charAt(0).toUpperCase()+a.slice(1);
}

/* ---------------------------- KEY / SCALE HELPERS ---------------------------- */
function scaleOf(s){ return SCALE_BY_ID[s.scaleId] || SCALES[0]; }
function keyName(s){ return NOTE_NAMES[((s.rootPc|0)%12+12)%12] + " " + scaleOf(s).n; }
function syncHarmonicColor(s){ s.chordColor = scaleOf(s).n; return s; }
function camelot(s){
  const sc = scaleOf(s);
  const minorish = sc.iv.indexOf(4) === -1;
  const order = minorish ? [9,4,11,6,1,8,3,10,5,0,7,2] : [0,7,2,9,4,11,6,1,8,3,10,5];
  const idx = order.indexOf(((s.rootPc|0)%12+12)%12);
  return (idx<0?1:idx+1) + (minorish ? "A" : "B");
}
function freqOf(midi){ return 440 * Math.pow(2, (midi-69)/12); }
function microOf(id){ return MICRO_BY_ID[id] || MICRO_MODES[0]; }
function microCents(modeId, noteIndex, seedSalt){
  const m = microOf(modeId);
  if(!m.cents) return 0;
  const r = mulberry32(((state.seed>>>0) ^ (seedSalt|0) ^ (noteIndex*2654435761)) >>> 0)();
  switch(m.id){
    case "just":   return [0,-13.7,3.9,15.6,-13.7,-2,-31.2][noteIndex % 7];
    case "maqam":  return (noteIndex % 3 === 1) ? -50 : 0;
    case "drift":  return (r*2-1) * m.cents;
    case "wide":   return (noteIndex % 2 ? 1 : -1) * m.cents;
    default:       return (r < 0.5 ? -1 : 1) * m.cents * (r < 0.25 ? 0.5 : 1);
  }
}
function scaleNote(s, degree, octave){
  const iv = scaleOf(s).iv, len = iv.length;
  const oct = octave + Math.floor(degree/len);
  const d = ((degree % len) + len) % len;
  return 12*(oct+1) + (((s.rootPc|0)%12+12)%12) + iv[d];
}

/* ---------------------------- STATE ---------------------------- */
function defaultLocks(){
  const l = {};
  Object.keys(ROLL_FN).forEach(k=>l[k]=false);
  l.instrumental = false;
  return l;
}
function defaultHidden(){
  return { bpm:false, key:false, sparkCard:false, styleCard:false, feelCard:false, bassCard:false, drumsCard:false, technoLabCard:false,
           rhythmLabCard:false, harmonyLabCard:false, soundDesignCard:false, mixMasterCard:false, spatialModCard:false,
           grooveMelodicCard:false, textureFxCard:false, modeCard:false, layersCard:false,
           auditionCard:false, scoreCard:false, maxRollLabCard:false, variationsCard:false, presetsCard:false, historyCard:false };
}
function defaultState(){
  return {
    seed: newSeed(),
    primaryStyle:"", secondaryStyle:"", primaryGenre:"", secondaryGenre:"", bpm:140, rootPc:9, scaleId:"aeolian",
    techOnly:false, equalChance:false,
    microMelody:"off", microBass:"off",
    feeling:"", flavor:"", direction:"",
    leadVoice:"", leadPerf:"", contour:"", rhythm:"",
    harmony:"", chordColor:"", arpeggio:"",
    bassVoice:"", bassMovement:"", bassRel:"",
    counterMelody:{voice:"",direction:"",perf:"",contour:"",rhythm:""}, counterMelodyRelation:"supports",
    voiceConcept:{voice:"",movement:""}, voiceRelation:"supports",
    kick:"", hats:"", snare:"", perc:"", toms:"", groove:"", swing:"", sync:"", intensity:"",
    technoDrive:"", technoAcid:"", technoTexture:"", technoRave:"", technoIndustrial:"",
    filterType:"", envelopeType:"", lfoType:"", distortionType:"", reverbType:"", delayType:"", sidechainType:"", stereoType:"", fxChain:"", chordProg:"", rhythmPattern:"", soundIntensity:"",
    mixDensity:"", mixEnergy:"", mixSpace:"", mixGlue:"", mixPunch:"", masterDrive:"", masterLoudness:"", masterColor:"", masterChain:"",
    filterCutoff:"", filterResonance:"", eqType:"", compressionType:"", saturationType:"", sidechainCurve:"",
    stereoImage:"", stereoWidth:"", spatialDepth:"", spatialMovement:"",
    modSource:"", modDest:"", modRate:"", modDepth:"",
    textureLayer:"", grainType:"", shimmerType:"", atmosphereType:"",
    reverbSize:"", reverbDecay:"", stereoEnhance:"",
    ghostNotes:"", humanizeType:"", pocketType:"",
    ornamentType:"", vibratoType:"", portamentoType:"", scaleRun:"", intervalLeap:"",
    voicingType:"", inversionType:"", tensionType:"", resolutionType:"",
    delayTime:"", delayFeedback:"", sectionDensity:"",
    rideType:"", crashType:"", clapLayer:"", percFill:"",
    fxType:"", transitionType:"", riserType:"", impactType:"",
    energyCurve:"", buildType:"", dropType:"", chopType:"",
    rhythmGrid:Array.from({length:16},()=>false),
    concept:{world:"",location:"",visual:"",narrative:"",sensation:"",event:"",conflict:"",crowd:"",title:"",transform:""},
    melodyConcept:{story:"",role:"",motion:"",hook:""},
    arrangement:"",
    instrumental:true, vocalMode:false,
    layers:{}, locks:defaultLocks(), hidden:defaultHidden(),
    weirdness:50, influence:"balanced", duration:"standard", melodicForce:"balanced", slim:false, structure:false,
    acidAmt:60, driveAmt:75,
    styleFit:true, lastFitGenre:"",
    variations:[]
  };
}
/* state is initialized after ROLL_FN/GROUPS (defaultLocks needs ROLL_FN) */

/* ---------------------------- UNDO / REDO ---------------------------- */
let undoStack = [], redoStack = [];
const MAX_HISTORY = 80;
function snapshot(){ return JSON.parse(JSON.stringify(state)); }
function commit(){ undoStack.push(snapshot()); if(undoStack.length>MAX_HISTORY) undoStack.shift(); redoStack.length=0; }
function undo(){
  if(!undoStack.length){ toast("Nothing to undo"); return; }
  redoStack.push(snapshot()); state = undoStack.pop(); rng = mulberry32(state.seed);
  render(); updateURL(); saveAuto(); Audition.refresh(); toast("↶ Undo");
}
function redo(){
  if(!redoStack.length){ toast("Nothing to redo"); return; }
  undoStack.push(snapshot()); state = redoStack.pop(); rng = mulberry32(state.seed);
  render(); updateURL(); saveAuto(); Audition.refresh(); toast("↷ Redo");
}

/* ---------------------------- ROLL FUNCTIONS ----------------------------
   One roll function per atom key — built from the same pools as the
   original app. Special keys (style/combos/key/concepts) get bespoke
   logic; plain sound atoms get a generated one-liner. */
const POOL_OF = {
  feeling: FEELINGS, flavor: FLAVORS, direction: DIRECTIONS,
  leadVoice: LEADS, leadPerf: PERFS, harmony: HARMONIES, arpeggio: ARPS,
  contour: CONTOURS, rhythm: RHYTHMS,
  bassVoice: BASS_VOICES, bassMovement: BASS_MOVES, bassRel: BASS_RELS,
  kick: KICKS, hats: HATS, snare: SNARES, perc: PERCS, toms: TOMS,
  groove: GROOVES, swing: SWINGS, sync: SYNCS, intensity: INTENSITIES,
  technoDrive: TECHNO_DRIVES, technoAcid: TECHNO_ACIDS, technoTexture: TECHNO_TEXTURES,
  technoRave: TECHNO_RAVES, technoIndustrial: TECHNO_INDUSTRIALS,
  filterType: FILTER_TYPES, envelopeType: ENVELOPE_TYPES, lfoType: LFO_TYPES,
  distortionType: DISTORTION_TYPES, reverbType: REVERB_TYPES, delayType: DELAY_TYPES,
  sidechainType: SIDECHAIN_TYPES, stereoType: STEREO_TYPES, fxChain: FX_CHAINS,
  chordProg: CHORD_PROGS, rhythmPattern: RHYTHM_PATTERNS, soundIntensity: SOUND_INTENSITIES,
  mixDensity: MIX_DENSITY, mixEnergy: MIX_ENERGY, mixSpace: MIX_SPACE, mixGlue: MIX_GLUE, mixPunch: MIX_PUNCH,
  masterDrive: MASTER_DRIVE, masterLoudness: MASTER_LOUDNESS, masterColor: MASTER_COLOR, masterChain: MASTER_CHAIN,
  filterCutoff: FILTER_CUTOFF_TYPES, filterResonance: FILTER_RESONANCE_TYPES, eqType: EQ_TYPES,
  compressionType: COMPRESSION_TYPES, saturationType: SATURATION_TYPES, sidechainCurve: SIDECHAIN_CURVE_TYPES,
  stereoImage: STEREO_IMAGE, stereoWidth: STEREO_WIDTH, spatialDepth: SPATIAL_DEPTH, spatialMovement: SPATIAL_MOVEMENT,
  modSource: MOD_SOURCE, modDest: MOD_DEST, modRate: MOD_RATE, modDepth: MOD_DEPTH,
  textureLayer: TEXTURE_LAYER, grainType: GRAIN_TYPE, shimmerType: SHIMMER_TYPE, atmosphereType: ATMOSPHERE_TYPE,
  reverbSize: REVERB_SIZE_TYPES, reverbDecay: REVERB_DECAY_TYPES, stereoEnhance: STEREO_ENHANCE_TYPES,
  ghostNotes: GHOST_NOTES, humanizeType: HUMANIZE_TYPES, pocketType: POCKET_TYPES,
  ornamentType: ORNAMENT_TYPES, vibratoType: VIBRATO_TYPES, portamentoType: PORTAMENTO_TYPES,
  scaleRun: SCALE_RUNS, intervalLeap: INTERVAL_LEAPS,
  voicingType: VOICING_TYPES, inversionType: INVERSION_TYPES, tensionType: TENSION_TYPES, resolutionType: RESOLUTION_TYPES,
  delayTime: DELAY_TIME_TYPES, delayFeedback: DELAY_FEEDBACK_TYPES, sectionDensity: SECTION_DENSITY_TYPES,
  rideType: RIDE_TYPES, crashType: CRASH_TYPES, clapLayer: CLAP_LAYERS, percFill: PERC_FILLS,
  fxType: FX_TYPES, transitionType: TRANSITION_TYPES, riserType: RISER_TYPES, impactType: IMPACT_TYPES,
  energyCurve: ENERGY_CURVE_TYPES, buildType: BUILD_TYPES, dropType: DROP_TYPES, chopType: CHOP_TYPES
};
const ROLL_FN = {};
for(const k in POOL_OF){ ROLL_FN[k] = (pool => s => { s[k] = pick(pool); })(POOL_OF[k]); }
ROLL_FN.primary = s => { s.primaryStyle = pickStyle(); s.primaryGenre = s.techOnly ? "Techno" : genreOfStyle(s.primaryStyle); };
ROLL_FN.secondary = s => { s.secondaryStyle = pickSecondary(s.primaryStyle); s.secondaryGenre = s.techOnly ? "Techno" : genreOfStyle(s.secondaryStyle); };
ROLL_FN.genre = s => {
  if(s.techOnly){
    s.primaryStyle = pickStyle(); s.primaryGenre = "Techno";
    s.secondaryStyle = pickSecondary(s.primaryStyle); s.secondaryGenre = "Techno";
  }else{
    const p = pickGenreObj(); s.primaryGenre = p.genre; s.primaryStyle = p.combo;
    const q = pickGenreObjOther(p.genre); s.secondaryGenre = q.genre; s.secondaryStyle = q.combo;
  }
  if(!s.locks.bpm) s.bpm = tempoForGenre(s.primaryGenre, s.secondaryGenre);
};
ROLL_FN.bpm = s => { s.bpm = rollBpmValue(); };
ROLL_FN.key = s => { s.rootPc = Math.floor(rng()*12); s.scaleId = pickScaleId(); s.chordColor = scaleOf(s).n; };
ROLL_FN.feeling = s => { s.feeling = pick(FEELINGS); s.flavor = pick(FLAVORS); };
ROLL_FN.chordColor = s => { s.scaleId = pickScaleId(); s.chordColor = scaleOf(s).n; };
ROLL_FN.rootPc = s => { s.rootPc = Math.floor(rng()*12); };
ROLL_FN.scaleId = s => { s.scaleId = pickScaleId(); s.chordColor = scaleOf(s).n; };
ROLL_FN.concept = s => { for(const k in s.concept) s.concept[k] = pick(CONCEPT[k]); };
ROLL_FN.melodyConcept = s => { if(!s.melodyConcept) s.melodyConcept={}; for(const k in MELODY_CONCEPT) s.melodyConcept[k] = pick(MELODY_CONCEPT[k]); };
ROLL_FN["counter-melody"] = s => { s.counterMelody = { voice: pick(LEADS), direction: pick(DIRECTIONS), perf: pick(PERFS), contour: pick(CONTOURS), rhythm: pick(RHYTHMS) }; };
ROLL_FN["counter-relation"] = s => { s.counterMelodyRelation = pick(["supports","follows","counters"]); };
ROLL_FN["voice-concept"] = s => { s.voiceConcept = { voice: pick(BASS_VOICES), movement: pick(BASS_MOVES) }; };
ROLL_FN["voice-relation"] = s => { s.voiceRelation = pick(["supports","follows","counters"]); };
ROLL_FN.arrangement = s => { s.arrangement = pickArrangementFor(s); };
const CONCEPT_KEYS = ["world","location","visual","narrative","sensation","event","conflict","crowd","title","transform"];
CONCEPT_KEYS.forEach(k=>{ ROLL_FN["concept-"+k] = s => { s.concept[k] = pick(CONCEPT[k]); }; });
["story","role","motion","hook"].forEach(k=>{ ROLL_FN["melodyConcept-"+k] = s => { if(!s.melodyConcept) s.melodyConcept={}; s.melodyConcept[k] = pick(MELODY_CONCEPT[k]); }; });

/* ---------------------------- GROUPS ---------------------------- */
const GROUPS = {
  "primary":["primary"], "secondary":["secondary"], "bpm":["bpm"], "key":["key"],
  "feeling":["feeling"],
  "feel-melody":["feeling","melodyConcept","direction","leadVoice","leadPerf","harmony","chordColor","arpeggio","contour","rhythm"],
  "melody":["direction","leadVoice","leadPerf","harmony","chordColor","arpeggio","contour","rhythm"],
  "concept-melody":["melodyConcept"],
  "bass":["bassVoice","bassMovement","bassRel"],
  "drums":["kick","hats","snare","perc","toms","groove","swing","sync","intensity"],
  "technoLab":["technoDrive","technoAcid","technoTexture","technoRave","technoIndustrial"],
  "concept":["concept"], "arrangement":["arrangement"],
  "rhythm":["rhythm","rhythmPattern"],
  "harmony":["harmony","chordColor","chordProg"],
  "soundDesign":["filterType","envelopeType","lfoType","distortionType","reverbType","delayType","sidechainType","stereoType","fxChain","soundIntensity"],
  "mixMaster":["mixDensity","mixEnergy","mixSpace","mixGlue","mixPunch","masterDrive","masterLoudness","masterColor","masterChain","filterCutoff","filterResonance","eqType","compressionType","saturationType","sidechainCurve"],
  "spatialMod":["stereoImage","stereoWidth","spatialDepth","spatialMovement","modSource","modDest","modRate","modDepth","textureLayer","grainType","shimmerType","atmosphereType","reverbSize","reverbDecay","stereoEnhance"],
  "grooveMelodic":["ghostNotes","humanizeType","pocketType","ornamentType","vibratoType","portamentoType","scaleRun","intervalLeap","voicingType","inversionType","tensionType","resolutionType","delayTime","delayFeedback","sectionDensity"],
  "textureFx":["rideType","crashType","clapLayer","percFill","fxType","transitionType","riserType","impactType","energyCurve","buildType","dropType","chopType"],
  "mix":["mixDensity","mixEnergy","mixSpace","mixGlue","mixPunch"],
  "master":["masterDrive","masterLoudness","masterColor","masterChain"],
  "spatial":["stereoImage","stereoWidth","spatialDepth","spatialMovement","stereoEnhance"],
  "mod":["modSource","modDest","modRate","modDepth"],
  "texture":["textureLayer","grainType","shimmerType","atmosphereType"],
  "grooveExtra":["ghostNotes","humanizeType","pocketType"],
  "melodicExtra":["ornamentType","vibratoType","portamentoType","scaleRun","intervalLeap"],
  "harmonicExtra":["voicingType","inversionType","tensionType","resolutionType"],
  "percExtra":["rideType","crashType","clapLayer","percFill"],
  "fxExtra":["fxType","transitionType","riserType","impactType"],
  "arrangementExtra":["sectionDensity","energyCurve","buildType","dropType"],
  "filter":["filterType"], "envelope":["envelopeType"], "lfo":["lfoType"],
  "distortion":["distortionType"], "reverb":["reverbType"], "delay":["delayType"],
  "sidechain":["sidechainType"], "stereo":["stereoType"], "fx":["fxChain"],
  "chord":["chordProg"], "rhythmPattern":["rhythmPattern"],
  "power":Object.keys(ROLL_FN)
};

/* ---------------------------- STYLE-FIT (no-techno auto-curation) ----------------------------
   When a no-techno style is rolled, sound cards whose content only makes
   sense for electronic/techno productions are auto-hidden so neither the
   UI nor the Suno description mentions e.g. sidechain pumping on a bebop
   tune. The remaining (fitting) sound groups are re-rolled so the sounds
   actually match the new genre. Locks are always respected, and the whole
   behaviour can be turned off with the Style-fit toggle / restored with
   the "All sounds on" button. */
const ELECTRONIC_LEAN_CARDS = ["technoLabCard","textureFxCard","soundDesignCard","mixMasterCard","spatialModCard","rhythmLabCard"];
const HYBRID_HIDE = ["technoLabCard","textureFxCard"];
const ELECTRONIC_GENRES = new Set(["house","trance","electronic","dance","electronic latin","electronic retro","retro","electronic dance","hardcore","gabber","jungle","drum and bass","breakbeat","dubstep","trap","bass","uk garage","footwork","jersey club","industrial","darkwave","synthwave","vaporwave","lo-fi","chillstep","trip hop","electro-swing","city pop","video game","nightcore","retro futurist","space","broken beat","balearic","chillwave","broken bass","steampunk","dieselpunk","solarpunk","atompunk","neon","festival","factory","laboratory","observatory","spaceport","subway","airport","motor racing","skate","snowboard","gym","amusement","fair","casino","shibuya-kei","crystal","aura","ethereal","glass","lighthouse"]);
const ORGANIC_GENRES = new Set(["jazz","blues","bossa nova","reggae","country","latin","world","classical","folk","gospel","punk","theatrical","acoustic pop","easy listening","african","caribbean","spanish","swing","big band","bluegrass","americana","western","cajun","polka","klezmer","gypsy","indian classical","middle eastern","persian","turkish","greek","italian","french","portuguese","german","nordic","celtic","slavic","russian","brazilian","mexican","argentine","andean","afro-cuban","salsa","cumbia","samba","orchestral","lounge","asian traditional","tropical","ocean","forest","desert","winter","spring","nature","weather","underwater","cave","mountain","harbor","sailing","railway","garden","farm","countryside","village","small town","river","lake","wind","storm","ice","savanna","prairie","tundra","wetland","mangrove","volcanic","geothermal","canyon","mesa","oasis","rainforest","boreal","tibetan","mongolian","korean","vietnamese","chinese","thai","filipino","hawaiian","polynesian","aboriginal","amazonian","native","egyptian","north african","southern african","lusophone","operatic pop","acoustic session","spa","yoga","meditation","wellness","temple","monastery","church","ceremonial","wedding","birthday","summer","autumn","halloween","nocturne","interlude","golden oldies","diner","motel","road trip","jukebox","cassette","vinyl","circus","marching","brass band","carnival","ballroom","port","street market","bazaar","carnival of venice","retro soul","music box","toy","puppetry","library","museum","studio","restaurant","bar","camping","hiking","fishing","surfing","climbing","adult"]);
const SOUND_CARDS = ["feelCard","bassCard","drumsCard","technoLabCard","harmonyLabCard","rhythmLabCard","soundDesignCard","mixMasterCard","spatialModCard","grooveMelodicCard","textureFxCard"];
/* group -> the card it lives on (only re-roll groups whose card stays visible) */
const FIT_GROUPS = [
  ["feel-melody","feelCard"],
  ["bass","bassCard"],
  ["drums","drumsCard"],
  ["harmony","harmonyLabCard"],
  ["grooveMelodic","grooveMelodicCard"],
  ["soundDesign","soundDesignCard"],
  ["mixMaster","mixMasterCard"],
  ["spatialMod","spatialModCard"],
  ["textureFx","textureFxCard"],
  ["rhythm","rhythmLabCard"]
];
function genreWorld(genre){
  const g = String(genre||"").toLowerCase().trim();
  if(!g) return "hybrid";
  if(ELECTRONIC_GENRES.has(g)) return "electronic";
  if(ORGANIC_GENRES.has(g)) return "organic";
  return "hybrid";
}
function styleFitCards(){
  if(state.techOnly) return [];
  const world = genreWorld(state.primaryGenre);
  if(world==="electronic") return [];
  if(world==="organic") return ELECTRONIC_LEAN_CARDS.slice();
  return HYBRID_HIDE.slice();
}
function autoFitSounds(opts){
  opts = opts || {};
  const reRoll = opts.reRoll !== false;
  if(state.techOnly || !state.styleFit) return {hid:0, restored:0, rolled:false, skipped:true};
  const genre = state.primaryGenre || state.primaryStyle || "this style";
  const toHide = styleFitCards();
  const worldChanged = genre !== state.lastFitGenre;
  let hid = 0, restored = 0;
  if(worldChanged){
    /* genre world changed — reconcile the electronic-lean cards to exactly
       what fits now, so going Jazz → House brings the techno cards back. */
    ELECTRONIC_LEAN_CARDS.forEach(c=>{
      if(toHide.includes(c)){ if(!state.hidden[c]){ state.hidden[c] = true; hid++; } }
      else if(state.hidden[c]){ state.hidden[c] = false; restored++; }
    });
  } else {
    toHide.forEach(c=>{ if(!state.hidden[c]){ state.hidden[c] = true; hid++; } });
  }
  let rolled = false;
  if(reRoll && worldChanged){
    FIT_GROUPS.forEach(pair=>{
      const g = pair[0], card = pair[1];
      if(!state.hidden[card]) rollGroup(GROUPS[g]);
    });
    rolled = true;
  }
  state.lastFitGenre = genre;
  const bits = [];
  if(hid > 0) bits.push("hid " + hid + " sound card" + (hid>1?"s":"") + " that don't fit");
  if(restored > 0) bits.push("brought back " + restored + " sound card" + (restored>1?"s":"") + " for " + genre);
  if(rolled) bits.push("re-tuned the sounds to " + genre);
  if(bits.length) toast("🎛 Style-fit: " + bits.join(", "));
  return {hid, restored, rolled, skipped:false};
}
function unhideAllSoundCards(){
  let n = 0;
  SOUND_CARDS.forEach(c=>{ if(state.hidden[c]){ state.hidden[c] = false; n++; } });
  return n;
}
function allSoundsOn(){
  commit();
  const n = unhideAllSoundCards();
  afterChange();
  toast(n ? "👁 All " + n + " hidden sound card" + (n>1?"s":"") + " back ON" : "👁 All sounds are already visible");
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
const ORGANIC_MAP = [
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
  [/\b([a-z]+(?:[- ][a-z]+)?)[- ]synth\b/gi, (m,stem)=>stem.replace(/-/g," ")],
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
const HYBRID_MAP = [
  [/\bhardgroove[- ]?locked\b/gi, "locked-in"],
  [/\bacid[- ]?driven\b/gi, "propulsive"],
  [/\bbunker[- ]?born\b/gi, "raw"],
  /* compound techno-isms — only the ones with no place outside techno */
  [/\b(acid[- ]?squelch|acid[- ]?drenched|acid[- ]?fueled|acid[- ]?searing|303[- ]?style|303[- ]?filtered|bunker[- ]?rattling|peak[- ]?time|warehouse[- ]?powered|warehouse[- ]?echo|rave[- ]?charged|rave[- ]?stab|trance[- ]?pluck|saw[- ]?stack|triple[- ]?oscillator|siren[- ]?like|sub[- ]?wobble|turbo[- ]?charged|piston[- ]?powered|voltage[- ]?spiked|modular[- ]?patched|micro[- ]?swept|rave[- ]?fueled|kick[- ]?locked|gate[- ]?stab)\b/gi, " "],
  [/\b(909|808|303)\b/gi, " "],
  [/\b(sidechain|rave|trance|acid|hardstyle|gabber|industrial|warehouse|mainstage|bigroom|hardgroove(?!-)|reese)\b/gi, " "]
];
function genreSafeText(text, protectStyles){
  if(state.techOnly) return text;
  const world = genreWorld(state.primaryGenre);
  if(world==="electronic") return text;
  const fixes = world==="organic" ? ORGANIC_MAP : HYBRID_MAP;
  let t = String(text||"");
  const ph = [];
  if(protectStyles){
    const styles = [state.primaryStyle, state.secondaryStyle].filter(Boolean).sort((a,b)=>b.length-a.length);
    styles.forEach(st=>{
      const re = new RegExp(st.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "g");
      t = t.replace(re, m=>{ ph.push(m); return "\u0001"+(ph.length-1)+"\u0001"; });
    });
  }
  for(const [re, rep] of fixes){
    t = t.replace(re, rep);
  }
  t = t.replace(/\b\d+\.\d+\b/g,"");           /* leftover "2.0"-style junk */
  t = t.replace(/ -\s*([a-z])/gi, " $1");      /* "glassy -bell" → "glassy bell" */
  t = t.replace(/^-\s+|\s+-$/g, " ");          /* leading/trailing hyphen stubs */
  t = t.replace(/\s{2,}/g," ");
  t = t.replace(/\s+([,.;])/g,"$1");
  t = t.replace(/,\s*,/g,",");
  t = t.replace(/[,.;]\s*[,.;]+/g,".");
  t = t.replace(/^\s*[,.;:\s]+|\s*[,.;:\s]+$/g,"");
  if(ph.length) t = t.replace(/\u0001(\d+)\u0001/g, (m,i)=>ph[+i]);
  return t.trim();
}
function structTags(){
  const names = state.techOnly ? ["Intro","Build","Drop","Breakdown","Drop","Outro"] : ["Intro","Build","Drop","Breakdown","Drop","Outro"].map(arcName);
  return " " + names.map(n=>"["+n+"]").join(" ");
}

let state = defaultState();

/* ---------------------------- LINE BUILDERS ---------------------------- */
function styleLine(){
  let s = state.primaryStyle;
  if(state.secondaryStyle){
    if(state.influence==="subtle") s += " with a touch of " + state.secondaryStyle;
    else if(state.influence==="strong") s += " fused with " + state.secondaryStyle;
    else s += " with " + state.secondaryStyle + " influence";
  }
  if(!state.techOnly){
    const world = genreWorld(state.primaryGenre);
    if(world==="organic") s += " — live acoustic instrumentation";
    else if(world==="hybrid") s += " — live and electronic hybrid instrumentation";
  }
  if(!state.hidden.bpm) s += ", " + state.bpm + " BPM";
  if(!state.hidden.key) s += ", " + keyName(state);
  return s;
}
function emotionLine(){
  return "Emotion-led melody: " + state.feeling + " melody; " + state.flavor + "; direction: " + state.direction;
}
function melodyLine(){
  const f = state.melodicForce || "balanced";
  if(f==="light"){
    const mLight = microOf(state.microMelody);
    return "Lead: " + state.leadVoice + (mLight.desc ? ", " + mLight.desc : "") + ". Harmony: " + state.harmony;
  }
  const lead = state.leadVoice + ", " + state.leadPerf + "; " + state.contour + "; " + state.rhythm;
  const harm = state.harmony + ", " + state.chordColor + "; " + state.arpeggio;
  const mm = microOf(state.microMelody);
  const micro = mm.desc ? ", " + mm.desc : "";
  if(f==="strong") return "Melody-driven: " + lead + micro + ". Harmony: " + harm;
  if(f==="dominant"){ const hk = cleanFrag((state.melodyConcept&&state.melodyConcept.hook)||""); return "Melody-dominant anthem: " + lead + micro + (hk ? " — hook: " + hk : "") + ". Harmony: " + harm; }
  return "Lead: " + lead + micro + ". Harmony: " + harm;
}
function melodyConceptLine(compact){
  const mc = state.melodyConcept || {};
  if(!mc.story && !mc.hook) return "";
  if(compact) return "Melody concept: " + firstClean(mc.hook, mc.story);
  const parts = [mc.story, mc.hook, mc.motion].map(cleanFrag).filter(Boolean);
  return parts.length ? "Melody concept: " + parts.join("; ") : "";
}
function bassLine(){
  let s = "Bass: " + state.bassVoice + ", " + state.bassMovement + ", " + state.bassRel;
  const mb = microOf(state.microBass);
  if(mb.desc) s += ", " + mb.desc;
  return s;
}
function technoLabLine(compact){
  const parts=[];
  if(state.technoDrive) parts.push(state.technoDrive);
  if(state.technoAcid) parts.push(state.technoAcid);
  if(state.technoTexture) parts.push(state.technoTexture);
  if(state.technoRave) parts.push(state.technoRave);
  if(state.technoIndustrial) parts.push(state.technoIndustrial);
  if(!parts.length) return "";
  if(compact) return "Techno Lab: " + parts.slice(0,2).join(", ");
  return "Techno Lab: " + parts.join(", ") + (state.acidAmt ? ", acid "+state.acidAmt+"%" : "") + (state.driveAmt ? ", drive "+state.driveAmt+"%" : "");
}
function counterMelodyLine(){
  const cm = state.counterMelody; if(!cm || !cm.voice) return "";
  const rel = COUNTER_ROLE[state.counterMelodyRelation] || COUNTER_ROLE.supports;
  return "Counter-melody: " + cm.voice + ", " + cm.direction + ", " + cm.perf + ", " + cm.contour + ", " + cm.rhythm + "; " + rel;
}
function voiceConceptLine(){
  const vc = state.voiceConcept; if(!vc || !vc.voice) return "";
  const rel = VOICE_ROLE[state.voiceRelation] || VOICE_ROLE.supports;
  return "Second line: " + vc.voice + ", " + vc.movement + "; " + rel;
}
function drumLine(compact){
  if(compact){
    return "Drums: " + [state.kick, state.hats, state.snare, state.perc, state.groove, state.swing, state.sync].filter(Boolean).join(", ");
  }
  return "Drums: " + [state.kick, state.hats, state.snare, state.perc, state.toms, state.groove, state.swing, state.sync, state.intensity].filter(Boolean).join(", ");
}
function soundDesignLine(compact){
  const parts=[];
  if(state.filterType) parts.push(state.filterType);
  if(state.envelopeType) parts.push(state.envelopeType);
  if(state.lfoType) parts.push(state.lfoType);
  if(state.distortionType) parts.push(state.distortionType);
  if(state.reverbType) parts.push(state.reverbType);
  if(state.delayType) parts.push(state.delayType);
  if(state.sidechainType) parts.push(state.sidechainType);
  if(state.stereoType) parts.push(state.stereoType);
  if(state.fxChain) parts.push(state.fxChain);
  if(!parts.length) return "";
  if(compact) return "Sound Design: " + parts.slice(0,3).join(", ");
  return "Sound Design: " + parts.join(", ") + (state.soundIntensity ? ", "+state.soundIntensity : "");
}
function chordProgLine(){ return state.chordProg ? "Chord Progression: "+state.chordProg : ""; }
function rhythmPatternLine(){ return state.rhythmPattern ? "Rhythm Pattern: "+state.rhythmPattern : ""; }
function mixMasterLine(compact){
  const parts=[];
  if(state.mixDensity) parts.push(state.mixDensity);
  if(state.mixEnergy) parts.push(state.mixEnergy);
  if(state.mixSpace) parts.push(state.mixSpace);
  if(state.mixGlue) parts.push(state.mixGlue);
  if(state.mixPunch) parts.push(state.mixPunch);
  if(state.masterDrive) parts.push(state.masterDrive);
  if(state.masterLoudness) parts.push(state.masterLoudness);
  if(state.masterColor) parts.push(state.masterColor);
  if(state.masterChain) parts.push(state.masterChain);
  if(!parts.length) return "";
  if(compact) return "Mix/Master: " + parts.slice(0,3).join(", ");
  return "Mix/Master: " + parts.join(", ") + (state.filterCutoff ? ", cutoff "+state.filterCutoff : "") + (state.filterResonance ? ", resonance "+state.filterResonance : "") + (state.eqType ? ", EQ "+state.eqType : "") + (state.compressionType ? ", comp "+state.compressionType : "") + (state.saturationType ? ", sat "+state.saturationType : "") + (state.sidechainCurve ? ", sidechain "+state.sidechainCurve : "");
}
function spatialModLine(compact){
  const parts=[];
  if(state.stereoImage) parts.push(state.stereoImage);
  if(state.stereoWidth) parts.push(state.stereoWidth);
  if(state.spatialDepth) parts.push(state.spatialDepth);
  if(state.spatialMovement) parts.push(state.spatialMovement);
  if(state.modSource) parts.push(state.modSource+"→"+state.modDest);
  if(state.modRate) parts.push(state.modRate);
  if(state.modDepth) parts.push(state.modDepth);
  if(state.textureLayer) parts.push(state.textureLayer);
  if(state.grainType) parts.push(state.grainType);
  if(state.shimmerType) parts.push(state.shimmerType);
  if(state.atmosphereType) parts.push(state.atmosphereType);
  if(!parts.length) return "";
  if(compact) return "Spatial/Mod: " + parts.slice(0,3).join(", ");
  return "Spatial/Mod: " + parts.join(", ") + (state.reverbSize ? ", verb size "+state.reverbSize : "") + (state.reverbDecay ? ", decay "+state.reverbDecay : "") + (state.stereoEnhance ? ", enhance "+state.stereoEnhance : "");
}
function grooveMelodicLine(compact){
  const parts=[];
  if(state.ghostNotes) parts.push(state.ghostNotes);
  if(state.humanizeType) parts.push(state.humanizeType);
  if(state.pocketType) parts.push(state.pocketType);
  if(state.ornamentType) parts.push(state.ornamentType);
  if(state.vibratoType) parts.push(state.vibratoType);
  if(state.portamentoType) parts.push(state.portamentoType);
  if(state.scaleRun) parts.push(state.scaleRun);
  if(state.intervalLeap) parts.push(state.intervalLeap);
  if(state.voicingType) parts.push(state.voicingType);
  if(state.inversionType) parts.push(state.inversionType);
  if(state.tensionType) parts.push(state.tensionType);
  if(state.resolutionType) parts.push(state.resolutionType);
  if(!parts.length) return "";
  if(compact) return "Groove/Melodic: " + parts.slice(0,3).join(", ");
  return "Groove/Melodic: " + parts.join(", ") + (state.delayTime ? ", delay "+state.delayTime : "") + (state.delayFeedback ? ", fb "+state.delayFeedback : "") + (state.sectionDensity ? ", density "+state.sectionDensity : "");
}
function textureFxLine(compact){
  const parts=[];
  if(state.rideType) parts.push(state.rideType);
  if(state.crashType) parts.push(state.crashType);
  if(state.clapLayer) parts.push(state.clapLayer);
  if(state.percFill) parts.push(state.percFill);
  if(state.fxType) parts.push(state.fxType);
  if(state.transitionType) parts.push(state.transitionType);
  if(state.riserType) parts.push(state.riserType);
  if(state.impactType) parts.push(state.impactType);
  if(state.energyCurve) parts.push(state.energyCurve);
  if(state.buildType) parts.push(state.buildType);
  if(state.dropType) parts.push(state.dropType);
  if(state.chopType) parts.push(state.chopType);
  if(!parts.length) return "";
  if(compact) return "Texture/FX: " + parts.slice(0,3).join(", ");
  return "Texture/FX: " + parts.join(", ");
}
function cleanFrag(v){ return (v && !isDirty(String(v).toLowerCase())) ? v : ""; }
function firstClean(){ for(const v of arguments){ const c = cleanFrag(v); if(c) return c; } return ""; }
function conceptLine(compact){
  const c = state.concept;
  const title = firstClean(c.title, "UNTITLED");
  const lead  = firstClean(c.world, c.location, c.event, c.narrative, c.crowd, c.transform);
  if(compact) return "Concept: " + title + (lead ? " — " + lead : "");
  const rest = [c.world, c.narrative, c.event].map(cleanFrag).filter(Boolean);
  const body = rest.length ? rest.join(", ") : lead;
  return "Concept: " + title + (body ? " — " + body : "");
}
function arrangementLine(){ return "Arrangement: " + state.arrangement; }
function enabledLayers(){ return LAYERS.filter(l => state.layers[l.id]); }
function layerLine(){
  const e = enabledLayers();
  if(!e.length) return "";
  return "Details: " + e.map(l => l.phrase).join(", ");
}
function vocalLine(){
  if(state.instrumental){
    if(state.techOnly) return SAFETY_LINE;
    const g = (state.primaryGenre && !/techno/i.test(state.primaryGenre)) ? state.primaryGenre : "instrumental";
    return "instrumental " + g.toLowerCase() + ", no vocals, no lyrics, no screaming, no chants, no choir, no spoken words";
  }
  if(state.vocalMode) return "vocal: " + pick(VOCAL_DIRECTIONS);
  return "";
}

/* ---------------------------- SAFETY / BUDGET ---------------------------- */
const CLAUSE_LABEL_RE = /^([A-Z][A-Za-z&\- ]{1,28}:)\s*/;
function isDirty(low){
  if(state.instrumental && hasVocalRef(low)) return true;
  for(const b of BANNED_MINIMAL){ if(low.includes(b)) return true; }
  return false;
}
function sanitize(text){
  const clauses = text.split(/(?<=[.;,])\s+/);
  const out = [];
  let pendingLabel = "";
  for(let cl of clauses){
    const labelMatch = cl.match(CLAUSE_LABEL_RE);
    if(isDirty(cl.toLowerCase())){
      if(labelMatch) pendingLabel = labelMatch[1] + " ";
      continue;
    }
    if(pendingLabel && !labelMatch){
      cl = pendingLabel + cl.charAt(0).toLowerCase() + cl.slice(1);
    }
    pendingLabel = "";
    out.push(cl);
  }
  return out.join(" ").replace(/\s+/g," ").trim();
}
function assemble(blocks, budget, sep){
  let text = blocks.map(b=>b.t).filter(Boolean).join(sep);
  if(text.length <= budget) return text;
  /* compact-first pass: shrink EVERY block to its compact form before
     dropping any — packs far more sound detail into the same budget */
  if(blocks.some(b=>b.compact && b.t !== b.compact)){
    const alt = blocks.map(b => (b.compact && b.t !== b.compact) ? {t: b.compact, compact: b.compact, required: b.required, priority: b.priority} : b);
    const t2 = alt.map(x=>x.t).filter(Boolean).join(sep);
    if(t2.length <= budget){ return t2; }
    blocks = alt;
    text = t2;
  }
  for(const b of blocks){
    if(b.compact && b.t !== b.compact){
      b.t = b.compact;
      text = blocks.map(x=>x.t).filter(Boolean).join(sep);
      if(text.length <= budget) return text;
    }
  }
  const ordered = blocks.slice().sort((a,b)=>(a.priority||0)-(b.priority||0));
  for(const b of ordered){
    if(b.required) continue;
    b.t = "";
    text = blocks.map(x=>x.t).filter(Boolean).join(sep);
    if(text.length <= budget) return text;
  }
  if(text.length > budget){
    let cut = text.slice(0, budget);
    const m = cut.match(/^(.*[.;,])/);
    if(m && m[1].length > budget*0.5) cut = m[1].trim();
    text = cut.replace(/[,;.\s]+$/,"");
  }
  return text;
}
function normalizePrompt(text){
  let t = String(text||"");
  t = t.replace(/\s+/g," ").trim();
  t = t.replace(/(\.|,)\s*(?=\.|,)/g,".").replace(/\.{2,}/g,".");
  t = t.replace(/,\s*,/g,",");
  t = t.replace(/\banthemic unforgettable hook\b/g,"unforgettable hook");
  return t.trim();
}

/* ---------------------------- PROMPT BUILDERS ---------------------------- */
function buildStylePrompt(){
  const SLIM = !!state.slim;
  const flavor = (!state.techOnly && SLIM) ? (genreWorld(state.primaryGenre)==="organic" ? " — live acoustic instrumentation" : genreWorld(state.primaryGenre)==="hybrid" ? " — live and electronic hybrid instrumentation" : "") : "";
  const blocks = [{t: SLIM ? (state.primaryStyle + (state.secondaryStyle ? ", " + state.secondaryStyle : "") + flavor) : styleLine(), required:true, priority:1}];
  if(!state.hidden.feelCard){
    blocks.push({t: SLIM ? "Emotion-led melody: " + state.feeling + ", " + state.flavor + "; " + state.direction : emotionLine(), required:true, priority:2});
    const cml = counterMelodyLine();
    const fullMelody = melodyLine() + (cml ? ". " + cml : "");
    const compactMelody = melodyLine() + (cml && state.counterMelody && state.counterMelody.voice ? ". Counter-melody: " + state.counterMelody.voice : "");
    blocks.push({t: SLIM ? "Lead: " + state.leadVoice + "; " + state.contour + "; harmony: " + state.harmony : fullMelody, compact: compactMelody, required:true, priority:3});
    const mcl = melodyConceptLine(false);
    if(mcl) blocks.push({t: mcl, compact: melodyConceptLine(true), required:false, priority:6.5});
  }
  if(!state.hidden.bassCard){
    const vcl = voiceConceptLine();
    const fullBass = bassLine() + (vcl ? ". " + vcl : "");
    const compactBass = bassLine() + (vcl && state.voiceConcept && state.voiceConcept.voice ? ". Second line: " + state.voiceConcept.voice : "");
    blocks.push({t: SLIM ? "Bass: " + state.bassVoice + "; " + state.bassMovement : fullBass, compact: compactBass, required:true, priority:4});
  }
  if(!state.hidden.drumsCard) blocks.push({t: SLIM ? "Drums: " + state.kick + "; " + state.groove : drumLine(), compact: drumLine(true), required:true, priority:5});
  if(!state.hidden.technoLabCard){
    const tl = technoLabLine(false);
    if(tl) blocks.push({t: tl, compact: technoLabLine(true), required:false, priority:5.5});
  }
  if(!state.hidden.soundDesignCard){
    const sdl = soundDesignLine(false);
    if(sdl) blocks.push({t: sdl, compact: soundDesignLine(true), required:false, priority:5.6});
    const cpl = chordProgLine();
    if(cpl) blocks.push({t: cpl, compact: "Chords: "+(state.chordProg||"").split("–")[0], required:false, priority:5.7});
    const rpl = rhythmPatternLine();
    if(rpl) blocks.push({t: rpl, compact: "Rhythm: "+(state.rhythmPattern||"").split(" ")[0], required:false, priority:5.8});
  }
  if(!state.hidden.mixMasterCard){
    const mml = mixMasterLine(false);
    if(mml) blocks.push({t: mml, compact: mixMasterLine(true), required:false, priority:5.82});
  }
  if(!state.hidden.spatialModCard){
    const sml = spatialModLine(false);
    if(sml) blocks.push({t: sml, compact: spatialModLine(true), required:false, priority:5.84});
  }
  if(!state.hidden.grooveMelodicCard){
    const gml = grooveMelodicLine(false);
    if(gml) blocks.push({t: gml, compact: grooveMelodicLine(true), required:false, priority:5.86});
  }
  if(!state.hidden.textureFxCard){
    const tfl = textureFxLine(false);
    if(tfl) blocks.push({t: tfl, compact: textureFxLine(true), required:false, priority:5.88});
  }
  blocks.push({t: layerLine(), required:false, priority:6});
  const TAGS = structTags();
  const tagCost = state.structure ? TAGS.length + 1 : 0;
  const flavorCost = (!state.techOnly && (SLIM || true)) ? (genreWorld(state.primaryGenre)==="organic" ? " — live acoustic instrumentation".length : genreWorld(state.primaryGenre)==="hybrid" ? " — live and electronic hybrid instrumentation".length : 0) : 0;
  let body = assemble(blocks.slice(), 1000 - (state.instrumental ? SAFETY_LINE.length + 2 : 20) - tagCost - flavorCost, ". ");
  body = sanitize(body);
  body = body.replace(/[.\s]+$/,"");
  if(!/Bass:/.test(body) && !state.hidden.bassCard) body += ". " + bassLine();
  if(!/Drums:/.test(body) && !state.hidden.drumsCard) body += ". " + drumLine(true);
  if(state.counterMelody && state.counterMelody.voice && !/Counter-melody:/.test(body)) body += ". Counter-melody: " + state.counterMelody.voice;
  if(state.voiceConcept && state.voiceConcept.voice && !/Second line:/.test(body)) body += ". Second line: " + state.voiceConcept.voice;
  body = sanitize(body);
  if(!state.techOnly) body = genreSafeText(body, true); // rephrase techno-isms to fit the genre (style names protected)
  if(state.structure && !state.hidden.styleCard) body += TAGS;
  const v = vocalLine();
  let out = normalizePrompt(body + "." + (v ? " " + v : ""));
  if(state.structure && out.length > 1000){
    out = normalizePrompt(out.replace(TAGS, ""));
  }
  if(out.length > 1000){ // final safety clamp at a clause boundary
    let cut = out.slice(0, 1000);
    const m2 = cut.match(/^(.*[.;,])/);
    if(m2 && m2[1].length > 500) cut = m2[1].trim();
    out = normalizePrompt(cut);
  }
  return out;
}
function buildFullBrief(){
  const c = state.concept;
  const layers = enabledLayers();
  const f = state.melodicForce || "balanced";
  const sec = [];
  sec.push("STYLE: " + styleLine() + ".");
  if(!state.hidden.key) sec.push("KEY: " + keyName(state) + " (Camelot " + camelot(state) + ") — " + scaleOf(state).mood + ".");
  if(!state.hidden.feelCard){
    if(f!=="balanced") sec.push("MELODIC FOCUS: " + MELODY_FORCE[f].desc + ".");
    const emo = [cleanFrag(state.feeling), cleanFrag(state.flavor)].filter(Boolean).join(" and ");
    const dir = cleanFrag(state.direction);
    sec.push("EMOTION: " + (emo || "maximum-energy") + (dir ? " — " + dir : "") + ".");
    const mcs = state.melodyConcept || {};
    if(mcs.story){
      sec.push("MELODY CONCEPT: " + mcs.story + ". Role: " + mcs.role + ". Motion: " + mcs.motion + ". Hook: " + mcs.hook + ".");
    }
    if(f==="light"){
      sec.push("MELODY: " + state.leadVoice + ".");
      sec.push("HARMONY: " + state.harmony + ".");
    } else {
      sec.push("MELODY: " + state.leadVoice + ", " + state.leadPerf + "; " + state.contour + "; " + state.rhythm + ".");
      sec.push("HARMONY: " + state.harmony + " in " + state.chordColor + "; " + state.arpeggio + ".");
    }
    const cml2 = counterMelodyLine().replace(/^Counter-melody:\s*/i, "");
    if(cml2) sec.push("COUNTER-MELODY: " + cml2 + ".");
  }
  if(!state.hidden.bassCard){
    sec.push("BASS: " + state.bassVoice + ", " + state.bassMovement + ", " + state.bassRel + ".");
    const vcl2 = voiceConceptLine().replace(/^Second line:\s*/i, "");
    if(vcl2) sec.push("SECOND LINE: " + vcl2 + ".");
  }
  if(!state.hidden.drumsCard) sec.push("DRUMS: " + state.kick + "; " + state.hats + "; " + state.snare + "; " + state.perc + "; " + state.toms + "; " + state.groove + "; " + state.swing + "; " + state.sync + "; " + state.intensity + ".");
  if(!state.hidden.technoLabCard){
    const tl = technoLabLine(false);
    if(tl) sec.push(tl.toUpperCase() + ".");
  }
  if(!state.hidden.soundDesignCard){
    const sdl = soundDesignLine(false);
    if(sdl) sec.push(sdl.toUpperCase() + ".");
    if(state.chordProg) sec.push("CHORD PROGRESSION: " + state.chordProg + ".");
    if(state.rhythmPattern) sec.push("RHYTHM PATTERN: " + state.rhythmPattern + ".");
    if(state.rhythmGrid) sec.push("RHYTHM GRID: " + state.rhythmGrid.map((on,i)=>on? (i+1) : "-").join(" ") + ".");
  }
  if(!state.hidden.mixMasterCard){
    const mml = mixMasterLine(false);
    if(mml) sec.push(mml.toUpperCase() + ".");
  }
  if(!state.hidden.spatialModCard){
    const sml = spatialModLine(false);
    if(sml) sec.push(sml.toUpperCase() + ".");
  }
  if(!state.hidden.grooveMelodicCard){
    const gml = grooveMelodicLine(false);
    if(gml) sec.push(gml.toUpperCase() + ".");
  }
  if(!state.hidden.textureFxCard){
    const tfl = textureFxLine(false);
    if(tfl) sec.push(tfl.toUpperCase() + ".");
  }
  sec.push("ENERGY ARC: " + arcLine() + ".");
  if(layers.length) sec.push("MIX & DETAIL: " + layers.map(l=>l.phrase).join(", ") + ".");
  sec.push("VOCAL POLICY: " + vocalLine() + ".");
  let text = sec.map(s=>sanitize(s)).filter(Boolean).join("\n\n");
  if(text.length > 3000){
    const parts = text.split("\n\n");
    while(parts.length > 1 && parts.join("\n\n").length > 3000) parts.pop();
    text = parts.join("\n\n");
    if(text.length > 3000){ text = text.slice(0,3000).replace(/\s+\S*$/,""); }
  }
  if(!state.techOnly) text = genreSafeText(text, true); // style names protected
  return text;
}
function buildKit(){
  const sp = buildStylePrompt();
  const fb = buildFullBrief();
  const policy = vocalLine() || (state.vocalMode ? "vocal mode enabled — " + pick(VOCAL_DIRECTIONS) : "no vocals");
  return [
    "STYLE PROMPT:\n" + sp,
    "FULL BRIEF:\n" + fb,
    "ENERGY ARC:\n" + arcLine() + "\n\n" + arcTags(),
    "VOCAL POLICY:\n" + policy
  ].join("\n\n");
}
function buildEngineer(){
  const c = state.concept;
  return [
    "ENGINEER NOTES — " + (c.title||"Untitled"),
    "",
    engineerLines().join("\n"),
    "",
    "DJ NOTES:",
    djLines().join("\n"),
    "",
    "REFERENCE: " + styleLine() + "."
  ].join("\n");
}
function buildStylePromptFor(s){
  const saved = state; state = s;
  const out = buildStylePrompt();
  state = saved;
  return out;
}

/* ---------------------------- ENERGY ARC / ENGINEER ---------------------------- */
const ARC_NAME_MAP = {Intro:"Intro", Build:"Rise", Drop:"Climax", Breakdown:"Release", Climax:"Finale", Outro:"Outro"};
function arcName(n){
  if(state.techOnly) return n;
  if(genreWorld(state.primaryGenre)!=="organic") return n;
  return ARC_NAME_MAP[n] || n;
}
function energyArc(){
  const tpl = ARC_TEMPLATES[state.duration||"standard"];
  const spb = 60/(state.bpm||140);
  const boost = {light:-6, balanced:0, strong:5, dominant:9}[state.melodicForce||"balanced"];
  let bar = 0;
  return tpl.map(([name,bars,energy])=>{
    const startSec = bar*4*spb;
    bar += bars;
    const e = Math.max(20, Math.min(100, energy + (/Drop|Climax/.test(name)?boost:Math.round(boost/2))));
    return {name: arcName(name), bars, energy:e, start:startSec, startLabel:fmtTime(startSec)};
  });
}
function arcTotalSec(){
  const spb = 60/(state.bpm||140);
  return energyArc().reduce((a,s)=>a+s.bars,0)*4*spb;
}
function arcLine(){
  return energyArc().map(s=>s.name+" "+s.bars+" bars @"+s.energy+"%").join(" → ");
}
function arcTags(){
  return energyArc().map(s=>"["+s.name+"]").join("\n");
}
function fmtTime(sec){ const m=Math.floor(sec/60), s=Math.round(sec%60); return m+":"+String(s).padStart(2,"0"); }
function estimatedLengthSec(){
  const base = {compact:200, standard:330, extended:480}[state.duration||"standard"];
  const bpmAdj = Math.round(base * (140/(state.bpm||140)) * 0.35 + base*0.65);
  return bpmAdj;
}
function barsFor(sec){ return Math.round(sec / (60/(state.bpm||140)) / 4); }
function engineerLines(){
  const sc = scaleOf(state);
  const bpm = state.bpm||140;
  const out = [];
  out.push("KEY: " + keyName(state) + " (Camelot " + camelot(state) + ") — " + sc.mood + ".");
  out.push("TEMPO: " + bpm + " BPM, " + fmtTime(estimatedLengthSec()) + " target runtime (~" + barsFor(estimatedLengthSec()) + " bars).");
  const kickHz = Math.round(freqOf(scaleNote(state,0,1)));
  out.push("LOW END: tune the kick body near " + kickHz + " Hz (root of the key), sub and kick sharing one fundamental, everything below 30 Hz filtered out.");
  out.push("SIDECHAIN: bass and pads ducked to the kick, " + (bpm>=145?"fast 40 ms":"punchy 60 ms") + " release, pumping locked to the four-on-the-floor.");
  out.push("STEREO: kick and sub dead centre in mono, hats and percussion wide, lead spread hard with a haze of stereo delay.");
  out.push("MASTER: loud club master, glue compression on the buss, saturated peaks, headroom pushed for maximum-energy playback.");
  return out;
}
function djLines(){
  const bpm = state.bpm||140;
  const organic = !state.techOnly && genreWorld(state.primaryGenre)==="organic";
  const slot = organic
    ? (bpm>=150 ? "up-tempo barn-burner" : bpm>=120 ? "confident mid-set mover" : "gentle opener")
    : (bpm>=150 ? "peak-hour hammer" : bpm>=140 ? "main-room peak time" : "driving warm-up into peak");
  return [
    "CUE: intro is beatmatch-friendly, drums first, full energy by the second phrase.",
    "MIX RANGE: pairs cleanly with " + (bpm-4) + "–" + (bpm+4) + " BPM tracks in Camelot " + camelot(state) + " and its neighbours.",
    "SLOT: " + slot + "."
  ];
}
function weirdReadout(wd){
  const m = weirdMix(wd);
  const pct = x=>Math.round(x*100);
  return '<b style="color:var(--cyan)">'+wd+'</b> · core '+pct(m.core)+'% / sub '+pct(m.sub)+'% / rare '+pct(m.rare)+'%';
}

/* ---------------------------- PROMPT SCORE ---------------------------- */
function scorePrompt(){
  const sp = buildStylePrompt();
  const items = [];
  const len = sp.length;
  let lenScore = len<250 ? 40 : len<400 ? 70 : len<=900 ? 100 : len<=1000 ? 82 : 50;
  items.push({label:"Prompt length", score:lenScore,
    note: len<400 ? "Short — add detail layers or unhide a section." : len>900 ? "Near the ceiling; trim if Suno truncates." : "In the sweet spot."});
  const melo = /Lead:|Melody-driven|Melody-dominant/.test(sp);
  const force = state.melodicForce||"balanced";
  const meloScore = !melo ? 0 : force==="light" ? 72 : force==="balanced" ? 92 : 100;
  items.push({label:"Melodic clarity", score:meloScore,
    note: !melo ? "Melody missing — unhide Feeling & Melody." : force==="light" ? "Light force; raise it for a stronger hook." : "Melody is clearly led."});
  const hasLead = /Lead:|Melody-driven|Melody-dominant/.test(sp);
  const parts = ["Bass:","Drums:","Harmony:","Emotion-led melody:"].filter(k=>sp.includes(k)).length + (hasLead?1:0);
  items.push({label:"Instrumentation coverage", score:Math.round(parts/5*100),
    note: parts===5 ? "Every layer specified." : (5-parts)+" section(s) missing from the prompt."});
  const styleWords = styleLine().split(/,|with|fused/).length;
  const focusScore = styleWords<=3 ? 100 : styleWords<=4 ? 85 : 65;
  items.push({label:"Style focus", score:focusScore,
    note: focusScore===100 ? "Tight, unambiguous genre signal." : "Consider fusing or clearing the secondary style."});
  const energyWords = (sp.match(/\b(maximum|relentless|explosive|brutal|massive|huge|ferocious|unstoppable|driving|crushing|slamming|overdrive|peak|euphoric|thunderous)\b/gi)||[]).length;
  const eScore = energyWords>=6 ? 100 : energyWords>=4 ? 88 : energyWords>=2 ? 70 : 45;
  items.push({label:"Energy density", score:eScore,
    note: energyWords>=4 ? energyWords+" high-energy cues." : "Roll drums/intensity for more punch."});
  const keyScore = state.hidden.key ? 55 : 100;
  items.push({label:"Harmonic definition", score:keyScore,
    note: state.hidden.key ? "Key hidden — Suno will pick its own." : keyName(state)+" locked in."});
  const total = Math.round(items.reduce((a,i)=>a+i.score,0)/items.length);
  try{ window.__lastScore=total; }catch(e){}
  return {total, items};
}
function scoreClass(n){ return n>=85 ? "good" : n>=65 ? "mid" : "bad"; }

/* ---------------------------- ROLL HELPERS ---------------------------- */
function beginRoll(){ state.seed = newSeed(); rng = mulberry32(state.seed); }
function rollAllInto(target){ for(const k in ROLL_FN){ if(!target.locks[k]) ROLL_FN[k](target); } }
function rollGroup(keys){ for(const k of keys){ if(!state.locks[k]) ROLL_FN[k](state); } }
function generateVariations(){
  const vars = [];
  for(let i=0;i<3;i++){
    const v = snapshot();
    v.variations = [];
    rollAllInto(v);
    vars.push(v);
  }
  state.variations = vars;
}
function doRoll(kind){
  if(kind==="fuse"){
    commit();
    if(!state.secondaryStyle){ toast("Add a secondary style first"); return; }
    const strip = x => x.replace(/\s*Techno$/i,"").trim();
    const fused = (strip(state.primaryStyle)+" "+strip(state.secondaryStyle)).trim()+" Techno";
    state.primaryStyle = fused; state.secondaryStyle = "";
    flash($("styleCard")); afterChange(); toast("🔀 Fused: "+fused);
    return;
  }
  if(kind==="clear-secondary"){
    commit(); state.secondaryStyle = ""; afterChange(); toast("Secondary cleared");
    return;
  }
  if(kind==="clear-counter"){
    commit(); state.counterMelody = {voice:"",direction:"",perf:"",contour:"",rhythm:""}; afterChange(); toast("Counter-melody cleared");
    return;
  }
  if(kind==="clear-voice-concept"){
    commit(); state.voiceConcept = {voice:"",movement:""}; afterChange(); toast("Voice concept cleared");
    return;
  }
  if(kind==="variations"){
    commit(); beginRoll(); generateVariations();
    flash($("variationsCard")); afterChange(); toast("🎲 3 variations generated");
    return;
  }
  if(ROLL_FN[kind] && !GROUPS[kind]){
    commit(); beginRoll();
    if(!state.locks[kind]) ROLL_FN[kind](state);
    if(kind==="genre") autoFitSounds({reRoll:true});
    afterChange(); flashCards([kind]);
    return;
  }
  const keys = GROUPS[kind];
  if(!keys){ toast("Unknown roll: "+kind); return; }
  commit(); beginRoll();
  for(const k of keys){ if(!state.locks[k]) ROLL_FN[k](state); }
  if(kind==="power"){ autoFitSounds({reRoll:false}); generateVariations(); }
  else if(kind==="primary" || kind==="secondary"){ autoFitSounds({reRoll:true}); }
  afterChange();
  flashCards(keys);
}
function flashCards(keys){
  const cards = new Set(keys.map(k=>ATOM_BY_KEY[k] && ATOM_BY_KEY[k].card).filter(Boolean));
  cards.forEach(c=>flash($(c)));
  if(keys.length>10) flash($("variationsCard"));
}
function flash(el){ if(!el) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
function afterChange(){ render(); updateURL(); saveAuto(); Audition.refresh(); }
