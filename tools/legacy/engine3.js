/* ---------------------------- AUDITION (Web Audio) ---------------------------- */
const Audition = (()=>{
  let ctx = null, playing = false, step = 0, timer = null, vol = 0.6, pattern = [];
  const N = 16;
  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC){ toast("Web Audio not supported here"); return null; }
      ctx = new AC();
    }
    if(ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function kick(c, t, gain){
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t+0.1);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.22);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t+0.25);
  }
  function hat(c, t, gain, open){
    const dur = open ? 0.35 : 0.05;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, 2.2);
    const src = c.createBufferSource(), g = c.createGain(), hp = c.createBiquadFilter();
    src.buffer = buf; hp.type="highpass"; hp.frequency.value = 7000;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    src.connect(hp); hp.connect(g); g.connect(c.destination);
    src.start(t);
  }
  function snare(c, t, gain){
    const len = Math.floor(c.sampleRate*0.14);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 1.8);
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.13);
    const o = c.createOscillator(), og = c.createGain();
    o.type="triangle"; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(90, t+0.09);
    og.gain.setValueAtTime(gain*0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t+0.09);
    src.connect(g); g.connect(c.destination);
    o.connect(og); og.connect(c.destination);
    src.start(t); o.start(t); o.stop(t+0.1);
  }
  function clap(c, t, gain){
    for(let r=0;r<3;r++){
      const tt = t + r*0.012;
      const len = Math.floor(c.sampleRate*0.06);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 2.5);
      const src = c.createBufferSource(), g = c.createGain(), bp = c.createBiquadFilter();
      src.buffer = buf; bp.type="bandpass"; bp.frequency.value=1100; bp.Q.value=1.2;
      g.gain.setValueAtTime(gain*0.5, tt); g.gain.exponentialRampToValueAtTime(0.001, tt+0.05);
      src.connect(bp); bp.connect(g); g.connect(c.destination);
      src.start(tt);
    }
  }
  function bass(c, t, freq, gain){
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type="sawtooth"; o.frequency.setValueAtTime(freq, t);
    f.type="lowpass"; f.frequency.setValueAtTime(240, t); f.frequency.linearRampToValueAtTime(160, t+0.24);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t+0.02); g.gain.linearRampToValueAtTime(0.001, t+0.24);
    o.connect(f); f.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t+0.25);
  }
  function note(c, t, midi, gain, dur){
    const o = c.createOscillator(), g = c.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(freqOf(midi), t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t+0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t+dur+0.02);
  }
  function padChord(c, t, midis, gain, dur){
    midis.forEach(m=>{
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type="sawtooth"; o.detune.value=(Math.random()*12-6);
      o.frequency.setValueAtTime(freqOf(m), t);
      f.type="lowpass"; f.frequency.value=900;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain/midis.length, t+0.05); g.gain.exponentialRampToValueAtTime(0.001, t+dur);
      o.connect(f); f.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t+dur+0.05);
    });
  }
  function chordMidis(rootPc){
    const iv = [0,4,7,11];
    return iv.map(i=>57 + ((rootPc+i)%12));
  }
  function buildPattern(){
    const root = ((state.rootPc|0)%12+12)%12;
    const rootMidi = 36 + root;
    const fifth = 36 + ((root+7)%12);
    const bpm = state.bpm||140;
    const stepDur = 60/bpm/4;
    const k = state.kick ? state.kick.toLowerCase() : "";
    const h = state.hats ? state.hats.toLowerCase() : "";
    const s = state.snare ? state.snare.toLowerCase() : "";
    const g = state.groove ? state.groove.toLowerCase() : "";
    const acid = state.technoAcid ? state.technoAcid.toLowerCase() : "";
    const offbeat = /offbeat|skip/.test(h) || /offbeat|skip/.test(g);
    const sparse = /sparse|minimal|reduced/.test(s) || /sparse|minimal/.test(g);
    const useGrid = state.rhythmGrid && state.rhythmGrid.some(Boolean);
    const grid = useGrid ? state.rhythmGrid : Array.from({length:N},(_,i)=> i%4===0 || i%4===2 || (i%8===6));
    for(let i=0;i<N;i++){
      const ev = [];
      const on = grid[i];
      if(i%4===0 && !sparse) ev.push({t:"kick", g:0.9});
      if(on && (i%4!==0 || rng()<0.15)) ev.push({t:"kick", g:0.55});
      if(offbeat ? (i%2===1) : (i%2===0)){
        ev.push({t:"hat", g:0.28, open:(i%8===7)});
        if(i%4===2 && rng()<0.35) ev.push({t:"hat", g:0.18, open:true});
      }
      if(i%4===2) ev.push({t:"snare", g:0.55});
      else if(i%8===6 && rng()<0.4) ev.push({t:"clap", g:0.3});
      if(rng()<0.12) ev.push({t:"bass", f:rng()<0.7?rootMidi:fifth, g:0.5});
      if(/acid/.test(acid) && rng()<0.22){
        const midi = scaleNote(state, [0,2,3,5,7,8][Math.floor(rng()*6)], 2) + (Math.floor(rng()*3)-1)*12;
        ev.push({t:"note", midi, g:0.22, dur:0.08});
      }
      if(rng()<0.09){
        const midi = scaleNote(state, [0,2,4,7][Math.floor(rng()*4)], 1);
        ev.push({t:"note", midi, g:0.14, dur:0.12});
      }
      pattern[i] = ev;
    }
    return {root, rootMidi, fifth, stepDur};
  }
  function tick(){
    if(!playing) return;
    const c = ctx;
    const t = c.currentTime + 0.03;
    const info = buildPattern();
    const evs = pattern[step] || [];
    const barStart = step===0 || step===8;
    if(barStart) padChord(c, t, chordMidis(state.rootPc), 0.10, info.stepDur*4.5);
    evs.forEach(ev=>{
      switch(ev.t){
        case "kick": kick(c, t, ev.g*vol); break;
        case "hat": hat(c, t, ev.g*vol, ev.open); break;
        case "snare": snare(c, t, ev.g*vol); break;
        case "clap": clap(c, t, ev.g*vol); break;
        case "bass": bass(c, t, freqOf(ev.f), ev.g*vol*0.7); break;
        case "note": note(c, t, ev.midi, ev.g*vol, ev.dur||0.1); break;
      }
    });
    step = (step+1)%N;
    const hud = $("audHud");
    if(hud){
      const cells = Array.from({length:N},(_,i)=>i===step?"▮":"·").join("");
      hud.textContent = "step "+(step+1)+"/16 " + cells;
    }
  }
  function start(){
    const c = ensure(); if(!c) return;
    playing = true;
    step = 0;
    pattern = [];
    buildPattern();
    tick();
    timer = setInterval(tick, 60/(state.bpm||140)/4*1000);
    setPlayBtn(true);
  }
  function stop(){
    playing = false;
    if(timer){ clearInterval(timer); timer = null; }
    setPlayBtn(false);
    const hud = $("audHud"); if(hud) hud.textContent = "stopped";
  }
  function toggle(){
    if(playing) stop(); else start();
  }
  function setPlayBtn(on){
    const b = $("auditionBtn");
    if(b){
      b.textContent = on ? "⏸ Stop audition" : "▶ Audition";
      b.classList.toggle("on", on);
    }
  }
  function setVolume(v){ vol = Math.max(0, Math.min(1, v)); }
  function refresh(){ if(playing){ stop(); start(); } }
  return {toggle, stop, setVolume, refresh};
})();

/* ---------------------------- PICKER MODAL ----------------------------
   Manual list selection — driven by the ORIGINAL PICKER_POOLS table so
   every pool of the old app stays manually selectable.
   ---------------------------------------------------------------------- */
let pickerOnPick = null;
function setPath(obj, dotted, val){
  const parts = String(dotted).split(".");
  let o = obj;
  for(let i=0;i<parts.length-1;i++){
    if(!o[parts[i]] || typeof o[parts[i]]!=="object") o[parts[i]] = {};
    o = o[parts[i]];
  }
  o[parts[parts.length-1]] = val;
}
function getPath(obj, dotted){
  const parts = String(dotted).split(".");
  let o = obj;
  for(const p of parts){ if(o==null) return undefined; o = o[p]; }
  return o;
}
function pickerEntry(key){
  if(PICKER_POOLS[key]) return PICKER_POOLS[key];
  const atom = ATOM_BY_KEY[key];
  if(atom && atom.pick && PICKER_POOLS[atom.pick]) return PICKER_POOLS[atom.pick];
  return null;
}
function openPicker(key){
  const entry = pickerEntry(key);
  if(!entry){ toast("No manual list for "+key); return; }
  const type = entry.type || "plain";
  if(type==="style"){ openStyleModal(); return; }
  if(type==="key"){ commit(); beginRoll(); ROLL_FN.key(state); afterChange(); toast("🎯 Key rolled — fine-tune with the root/scale lists"); return; }
  if(type==="melodyConceptAll"){ openFullMelodyPicker(); return; }
  if(type==="conceptAll"){ openFullConceptPicker(); return; }
  if(type==="counter"){ openCounterPicker(); return; }
  if(type==="voice"){ openVoiceConceptPicker(); return; }
  const arr = entry.arr ? entry.arr() : [];
  if(!arr || !arr.length){ toast("Empty list for "+key); return; }
  let apply;
  const field = entry.field || key;
  if(type==="bpm"){
    apply = val => { state.bpm = parseInt(val,10); };
  } else if(type==="root"){
    apply = val => { state.rootPc = arr.indexOf(val); };
  } else if(type==="scale"){
    apply = val => {
      const idx = arr.indexOf(val);
      if(idx>=0){ state.scaleId = SCALES[idx].id; state.chordColor = SCALES[idx].n; }
    };
  } else if(type==="scaleName"){
    apply = val => {
      const sc = SCALES.find(s=>s.n===val);
      if(sc){ state.scaleId = sc.id; state.chordColor = sc.n; }
    };
  } else {
    apply = val => setPath(state, field, val);
  }
  pickerOnPick = val => { commit(); apply(val); afterChange(); toast("✔ " + entry.label + ": " + val); };
  const cur = getPath(state, field);
  const pool = arr.map(v=>({label:String(v), value:String(v), cur: String(v)===String(cur)}));
  showPickerModal(pool, entry.label);
}
function showPickerModal(pool, label){
  const modal = $("pickerModal"); if(!modal) return;
  const grid = $("pickerGrid");
  const title = $("pickerTitle");
  if(title) title.textContent = "📜 Manual list — " + label + " (" + pool.length + ")";
  grid.innerHTML = pool.map(opt=>{
    return '<button class="popt'+(opt.cur?' cur':'')+'" data-val="'+escapeHtml(String(opt.value))+'" data-label="'+escapeHtml(opt.label)+'">'+
      '<span class="pv">'+escapeHtml(opt.label)+'</span>'+
      (opt.sub ? '<span class="ps">'+escapeHtml(opt.sub)+'</span>' : '')+
      '</button>';
  }).join("");
  modal.classList.add("open");
  grid.querySelectorAll(".popt").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const val = btn.getAttribute("data-val");
      pickerOnPick && pickerOnPick(val);
      closePicker();
    });
  });
  const search = $("pickerSearch");
  if(search){
    search.value = "";
    search.oninput = ()=>{
      const q = search.value.toLowerCase();
      grid.querySelectorAll(".popt").forEach(b=>{
        b.style.display = b.getAttribute("data-label").toLowerCase().includes(q) ? "" : "none";
      });
    };
  }
}
function closePicker(){
  const modal = $("pickerModal"); if(modal) modal.classList.remove("open");
  pickerOnPick = null;
}
function openFullConceptPicker(){
  const grid = $("pickerGrid");
  const title = $("pickerTitle");
  title.textContent = "📜 Concept — pick per row";
  const c = state.concept;
  let html = "";
  CONCEPT_KEYS.forEach(k=>{
    const opts = CONCEPT[k];
    const cur = c[k];
    html += '<div class="psec">'+k+' <span class="pcur">'+(cur||"—")+'</span></div><div class="pwrap">'+
      opts.map(v=>'<button class="popt'+(v===cur?' cur':'')+'" data-cat="'+k+'" data-val="'+escapeHtml(v)+'">'+escapeHtml(v)+'</button>').join("")+
      '</div>';
  });
  grid.innerHTML = html;
  modal.classList.add("open");
  modal.querySelectorAll(".popt").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.getAttribute("data-cat");
      const v = btn.getAttribute("data-val");
      commit(); state.concept[k] = v; afterChange(); closePicker();
    });
  });
}
function openFullMelodyPicker(){
  const grid = $("pickerGrid");
  const title = $("pickerTitle");
  title.textContent = "📜 Melody Concept — pick per row";
  const c = state.melodyConcept || {};
  let html = "";
  ["story","role","motion","hook"].forEach(k=>{
    const opts = MELODY_CONCEPT[k];
    const cur = c[k];
    html += '<div class="psec">'+k+' <span class="pcur">'+(cur||"—")+'</span></div><div class="pwrap">'+
      opts.map(v=>'<button class="popt'+(v===cur?' cur':'')+'" data-cat="'+k+'" data-val="'+escapeHtml(v)+'">'+escapeHtml(v)+'</button>').join("")+
      '</div>';
  });
  grid.innerHTML = html;
  modal.classList.add("open");
  modal.querySelectorAll(".popt").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.getAttribute("data-cat");
      const v = btn.getAttribute("data-val");
      commit(); if(!state.melodyConcept) state.melodyConcept={}; state.melodyConcept[k]=v; afterChange(); closePicker();
    });
  });
}
function openCounterPicker(){
  const grid = $("pickerGrid");
  const title = $("pickerTitle");
  title.textContent = "📜 Counter-melody — pick per row";
  const cm = state.counterMelody || {};
  let html = "";
  [["voice","Voice",LEADS],["direction","Direction",DIRECTIONS],["perf","Performance",PERFS],["contour","Contour",CONTOURS],["rhythm","Rhythm",RHYTHMS]].forEach(([k,label,opts])=>{
    const cur = cm[k];
    html += '<div class="psec">'+label+' <span class="pcur">'+(cur||"—")+'</span></div><div class="pwrap">'+
      opts.map(v=>'<button class="popt'+(v===cur?' cur':'')+'" data-cat="'+k+'" data-val="'+escapeHtml(v)+'">'+escapeHtml(v)+'</button>').join("")+
      '</div>';
  });
  grid.innerHTML = html;
  modal.classList.add("open");
  modal.querySelectorAll(".popt").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.getAttribute("data-cat");
      const v = btn.getAttribute("data-val");
      commit(); if(!state.counterMelody) state.counterMelody={}; state.counterMelody[k]=v; afterChange(); closePicker();
    });
  });
}
function openVoiceConceptPicker(){
  const grid = $("pickerGrid");
  const title = $("pickerTitle");
  title.textContent = "📜 Second line — pick per row";
  const vc = state.voiceConcept || {};
  let html = "";
  [["voice","Voice",BASS_VOICES],["movement","Movement",BASS_MOVES]].forEach(([k,label,opts])=>{
    const cur = vc[k];
    html += '<div class="psec">'+label+' <span class="pcur">'+(cur||"—")+'</span></div><div class="pwrap">'+
      opts.map(v=>'<button class="popt'+(v===cur?' cur':'')+'" data-cat="'+k+'" data-val="'+escapeHtml(v)+'">'+escapeHtml(v)+'</button>').join("")+
      '</div>';
  });
  grid.innerHTML = html;
  modal.classList.add("open");
  modal.querySelectorAll(".popt").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.getAttribute("data-cat");
      const v = btn.getAttribute("data-val");
      commit(); if(!state.voiceConcept) state.voiceConcept={}; state.voiceConcept[k]=v; afterChange(); closePicker();
    });
  });
}

/* ---------------------------- MASTER LIBRARY ---------------------------- */
let masterCategory = "all";
const MASTER_CATS = [
  ["all","All"],
  ["feel","Feeling & Melody"],
  ["key","Key & Scale"],
  ["bass","Bass"],
  ["drums","Drums"],
  ["techno","Techno Lab"],
  ["sound","Sound Design"],
  ["mix","Mix & Master"],
  ["spatial","Spatial & Mod"],
  ["groove","Groove & Melodic"],
  ["texture","Texture & FX"],
  ["concept","Concept"],
  ["arrangement","Arrangement"],
  ["layers","Mix Layers"],
  ["sparks","Spark Pools"]
];
function libraryData(cat){
  const out = [];
  const push = (label, arr, kind, field)=>{
    if(!arr) return;
    if(cat!=="all" && kind!==cat) return;
    arr.forEach(v=>out.push({label:String(v), kind, group:label, apply:(()=>{const vv=v; return ()=>setPath(state, field, vv);})()}));
  };
  push("Feelings", FEELINGS, "feel", "feeling");
  push("Flavors", FLAVORS, "feel", "flavor");
  push("Directions", DIRECTIONS, "feel", "direction");
  push("Lead Voices", LEADS, "feel", "leadVoice");
  push("Lead Performances", PERFS, "feel", "leadPerf");
  push("Harmonies", HARMONIES, "feel", "harmony");
  push("Chord Colors", CHORD_COLORS, "feel", "chordColor");
  push("Arpeggios", ARPS, "feel", "arpeggio");
  push("Contours", CONTOURS, "feel", "contour");
  push("Rhythms", RHYTHMS, "feel", "rhythm");
  push("Scales", SCALES.map(s=>s.n), "key", "scaleId");
  push("Root Notes", NOTE_NAMES, "key", "rootPc");
  push("Bass Voices", BASS_VOICES, "bass", "bassVoice");
  push("Bass Movements", BASS_MOVES, "bass", "bassMovement");
  push("Bass Relations", BASS_RELS, "bass", "bassRel");
  push("Kicks", KICKS, "drums", "kick");
  push("Hats", HATS, "drums", "hats");
  push("Snares", SNARES, "drums", "snare");
  push("Percussion", PERCS, "drums", "perc");
  push("Toms", TOMS, "drums", "toms");
  push("Grooves", GROOVES, "drums", "groove");
  push("Swings", SWINGS, "drums", "swing");
  push("Syncopations", SYNCS, "drums", "sync");
  push("Intensities", INTENSITIES, "drums", "intensity");
  push("Techno Drives", TECHNO_DRIVES, "techno", "technoDrive");
  push("Acids", TECHNO_ACIDS, "techno", "technoAcid");
  push("Textures", TECHNO_TEXTURES, "techno", "technoTexture");
  push("Raves", TECHNO_RAVES, "techno", "technoRave");
  push("Industrials", TECHNO_INDUSTRIALS, "techno", "technoIndustrial");
  push("Filters", FILTER_TYPES, "sound", "filterType");
  push("Envelopes", ENVELOPE_TYPES, "sound", "envelopeType");
  push("LFOs", LFO_TYPES, "sound", "lfoType");
  push("Distortion", DISTORTION_TYPES, "sound", "distortionType");
  push("Reverbs", REVERB_TYPES, "sound", "reverbType");
  push("Delays", DELAY_TYPES, "sound", "delayType");
  push("Sidechains", SIDECHAIN_TYPES, "sound", "sidechainType");
  push("Stereo Types", STEREO_TYPES, "sound", "stereoType");
  push("FX Chains", FX_CHAINS, "sound", "fxChain");
  push("Chord Progressions", CHORD_PROGS, "sound", "chordProg");
  push("Rhythm Patterns", RHYTHM_PATTERNS, "sound", "rhythmPattern");
  push("Sound Intensities", SOUND_INTENSITIES, "sound", "soundIntensity");
  push("Mix Density", MIX_DENSITY, "mix", "mixDensity");
  push("Mix Energy", MIX_ENERGY, "mix", "mixEnergy");
  push("Mix Space", MIX_SPACE, "mix", "mixSpace");
  push("Mix Glue", MIX_GLUE, "mix", "mixGlue");
  push("Mix Punch", MIX_PUNCH, "mix", "mixPunch");
  push("Master Drive", MASTER_DRIVE, "mix", "masterDrive");
  push("Master Loudness", MASTER_LOUDNESS, "mix", "masterLoudness");
  push("Master Color", MASTER_COLOR, "mix", "masterColor");
  push("Master Chains", MASTER_CHAIN, "mix", "masterChain");
  push("Stereo Images", STEREO_IMAGE, "spatial", "stereoImage");
  push("Stereo Widths", STEREO_WIDTH, "spatial", "stereoWidth");
  push("Spatial Depths", SPATIAL_DEPTH, "spatial", "spatialDepth");
  push("Spatial Movements", SPATIAL_MOVEMENT, "spatial", "spatialMovement");
  push("Mod Sources", MOD_SOURCE, "spatial", "modSource");
  push("Mod Destinations", MOD_DEST, "spatial", "modDest");
  push("Mod Rates", MOD_RATE, "spatial", "modRate");
  push("Mod Depths", MOD_DEPTH, "spatial", "modDepth");
  push("Texture Layers", TEXTURE_LAYER, "spatial", "textureLayer");
  push("Grain", GRAIN_TYPE, "spatial", "grainType");
  push("Shimmer", SHIMMER_TYPE, "spatial", "shimmerType");
  push("Atmosphere", ATMOSPHERE_TYPE, "spatial", "atmosphereType");
  push("Ghost Notes", GHOST_NOTES, "groove", "ghostNotes");
  push("Humanize", HUMANIZE_TYPES, "groove", "humanizeType");
  push("Pocket", POCKET_TYPES, "groove", "pocketType");
  push("Ornaments", ORNAMENT_TYPES, "groove", "ornamentType");
  push("Vibrato", VIBRATO_TYPES, "groove", "vibratoType");
  push("Portamento", PORTAMENTO_TYPES, "groove", "portamentoType");
  push("Scale Runs", SCALE_RUNS, "groove", "scaleRun");
  push("Interval Leaps", INTERVAL_LEAPS, "groove", "intervalLeap");
  push("Voicings", VOICING_TYPES, "groove", "voicingType");
  push("Inversions", INVERSION_TYPES, "groove", "inversionType");
  push("Tensions", TENSION_TYPES, "groove", "tensionType");
  push("Resolutions", RESOLUTION_TYPES, "groove", "resolutionType");
  push("Rides", RIDE_TYPES, "texture", "rideType");
  push("Crashes", CRASH_TYPES, "texture", "crashType");
  push("Clap Layers", CLAP_LAYERS, "texture", "clapLayer");
  push("Perc Fills", PERC_FILLS, "texture", "percFill");
  push("FX Types", FX_TYPES, "texture", "fxType");
  push("Transitions", TRANSITION_TYPES, "texture", "transitionType");
  push("Risers", RISER_TYPES, "texture", "riserType");
  push("Impacts", IMPACT_TYPES, "texture", "impactType");
  push("Energy Curves", ENERGY_CURVE_TYPES, "texture", "energyCurve");
  push("Builds", BUILD_TYPES, "texture", "buildType");
  push("Drops", DROP_TYPES, "texture", "dropType");
  push("Chops", CHOP_TYPES, "texture", "chopType");
  push("Counter-melody voices", LEADS, "feel", "counterMelody.voice");
  push("Second-line voices", BASS_VOICES, "bass", "voiceConcept.voice");
  if(cat==="all" || cat==="concept"){
    CONCEPT_KEYS.forEach(k=>{
      CONCEPT[k].forEach(v=>out.push({label:String(v), kind:"concept", group:"Concept · "+k, apply:(()=>{const kk=k; const vv=v; return ()=>setPath(state, "concept."+kk, vv);})()}));
    });
  }
  if(cat==="all" || cat==="arrangement"){
    ARRANGEMENTS.forEach(v=>out.push({label:String(v), kind:"arrangement", group:"Arrangement", apply:(()=>{const vv=v; return ()=>state.arrangement=vv;})()}));
  }
  if(cat==="all" || cat==="layers"){
    LAYERS.forEach(l=>out.push({label:l.label, kind:"layers", group:"Mix Layers", apply:(()=>{const id=l.id; return ()=>state.layers[id]=true;})()}));
  }
  if(cat==="all" || cat==="sparks"){
    SPARK_KIND_DEFS.forEach(([label,pool])=>{
      pool.forEach(v=>out.push({label:String(v), kind:"sparks", group:"Spark · "+label, apply:(()=>{const vv=v; const ll=label; return ()=>setSpark(vv, ll, "Applied from library");})()}));
    });
  }
  return out;
}
function openMasterLibrary(){
  const modal = $("masterModal"); if(!modal) return;
  const cats = $("masterCats");
  cats.innerHTML = MASTER_CATS.map(([id,label])=>
    '<button class="cat'+(id===masterCategory?' on':'')+'" data-cat="'+id+'">'+label+'</button>').join("");
  cats.querySelectorAll(".cat").forEach(b=>{
    b.addEventListener("click", ()=>{
      masterCategory = b.getAttribute("data-cat");
      openMasterLibrary();
    });
  });
  const search = $("masterSearch");
  const grid = $("masterGrid");
  const count = $("masterCount");
  const q = (search ? search.value : "").toLowerCase();
  const data = libraryData(masterCategory);
  const filtered = data.filter(d=>!q || d.label.toLowerCase().includes(q) || d.group.toLowerCase().includes(q));
  count.textContent = filtered.length + " of " + data.length + " entries";
  grid.innerHTML = filtered.map((d,i)=>
    '<button class="lentry" data-mi="'+i+'" title="'+escapeHtml(d.group)+'">'+
      '<span class="lv">'+escapeHtml(d.label)+'</span>'+
      '<span class="lg">'+escapeHtml(d.group)+'</span>'+
    '</button>').join("");
  grid.querySelectorAll(".lentry").forEach(b=>{
    b.addEventListener("click", ()=>{
      const item = filtered[parseInt(b.getAttribute("data-mi"),10)];
      if(!item) return;
      commit();
      item.apply();
      syncHarmonicColor(state);
      afterChange();
      toast("✔ " + item.group + ": " + item.label);
    });
  });
  if(search){
    search.oninput = ()=>{ openMasterLibrary(); };
  }
  modal.classList.add("open");
}
function closeMasterLibrary(){ const m=$("masterModal"); if(m) m.classList.remove("open"); }

/* ---------------------------- STYLE MODAL (manual style picker) ---------------------------- */
let styleModalMode = "both";
function openStyleModal(){
  const modal = $("styleModal"); if(!modal) return;
  const grid = $("styleGrid");
  const title = $("styleModalTitle");
  const note = $("styleScoreNote");
  const cats = $("styleCats");
  const search = $("styleSearch");
  const q = (search ? search.value : "").toLowerCase();
  const isTech = !!state.techOnly;
  title.textContent = "📜 Pick a style manually";
  note.textContent = isTech ? "Techno-Only mode: curated techno pool, core / sub / rare." : "No-Techno mode: choose a genre combo, or a single style then roll a combo.";
  cats.innerHTML = [
    '<button class="cat'+(styleModalMode==="both"?' on':'')+'" data-sm="both">Combos</button>',
    '<button class="cat'+(styleModalMode==="single"?' on':'')+'" data-sm="single">Single styles</button>',
    '<button class="cat'+(styleModalMode==="genre"?' on':'')+'" data-sm="genre">By genre</button>'
  ].join("");
  cats.querySelectorAll(".cat").forEach(b=>{
    b.addEventListener("click", ()=>{ styleModalMode = b.getAttribute("data-sm"); openStyleModal(); });
  });
  let html = "";
  if(isTech){
    if(styleModalMode==="both" || styleModalMode==="single"){
      STYLES.forEach(s=>{
        const cur = state.primaryStyle===s.n;
        if(q && !s.n.toLowerCase().includes(q)) return;
        html += '<button class="lentry'+(cur?' cur':'')+'" data-style="'+escapeHtml(s.n)+'">'+
          '<span class="lv">'+escapeHtml(s.n)+'</span><span class="lg">'+s.c+'</span></button>';
      });
    }
    if(styleModalMode==="genre"){
      html = '<div class="psec">Techno-Only — every style in the pool is techno-family.</div>'+
        '<div class="pwrap">'+
        STYLES.map(s=>'<button class="popt" data-style="'+escapeHtml(s.n)+'">'+escapeHtml(s.n)+'</button>').join("")+
        '</div>';
    }
  } else {
    if(styleModalMode==="both"){
      allCombos().forEach(c=>{
        const cur = state.primaryStyle===c;
        if(q && !c.toLowerCase().includes(q)) return;
        html += '<button class="lentry'+(cur?' cur':'')+'" data-combo="'+escapeHtml(c)+'">'+
          '<span class="lv">'+escapeHtml(c)+'</span><span class="lg">'+escapeHtml(genreOfStyle(c))+'\u00a0combo</span></button>';
      });
    } else if(styleModalMode==="single"){
      const singles = [];
      GENRES.forEach(g=>singles.push(g.n));
      singles.forEach(c=>{
        const cur = state.primaryStyle===c;
        if(q && !c.toLowerCase().includes(q)) return;
        html += '<button class="lentry'+(cur?' cur':'')+'" data-style="'+escapeHtml(c)+'">'+
          '<span class="lv">'+escapeHtml(c)+'</span><span class="lg">single genre</span></button>';
      });
    } else {
      GENRES.forEach(g=>{
        if(q && !g.n.toLowerCase().includes(q)) return;
        html += '<button class="lentry" data-genre="'+escapeHtml(g.n)+'">'+
          '<span class="lv">'+escapeHtml(g.n)+'</span><span class="lg">'+g.subs.length+' sub-styles</span></button>';
      });
    }
  }
  grid.innerHTML = html;
  grid.querySelectorAll("[data-style]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const val = b.getAttribute("data-style");
      commit();
      state.primaryStyle = val;
      state.primaryGenre = isTech ? "Techno" : genreOfStyle(val);
      if(!isTech) autoFitSounds({reRoll:true});
      afterChange();
      closeStyleModal();
      toast("🎯 Primary: "+val);
    });
  });
  grid.querySelectorAll("[data-combo]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const val = b.getAttribute("data-combo");
      commit();
      state.primaryStyle = val;
      state.primaryGenre = genreOfStyle(val);
      autoFitSounds({reRoll:true});
      afterChange();
      closeStyleModal();
      toast("🎯 Combo: "+val);
    });
  });
  grid.querySelectorAll("[data-genre]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const g = b.getAttribute("data-genre");
      commit();
      state.primaryGenre = g;
      const combo = genreComboName({n:g}, pick(GENRES.find(x=>x.n===g).subs));
      state.primaryStyle = combo;
      if(!state.locks.bpm) state.bpm = tempoForGenre(g, "");
      autoFitSounds({reRoll:true});
      afterChange();
      closeStyleModal();
      toast("🎯 "+combo);
    });
  });
  if(search){
    search.oninput = ()=>{ openStyleModal(); };
  }
  modal.classList.add("open");
}
function closeStyleModal(){ const m=$("styleModal"); if(m) m.classList.remove("open"); }

/* ---------------------------- COMMAND PALETTE ---------------------------- */
const COMMANDS = [];
function buildCommands(){
  COMMANDS.length = 0;
  const add = (label, hint, fn, keys)=>{
    COMMANDS.push({label, hint: hint||"", fn, keys: keys||""});
  };
  add("⚡ Power roll (everything)","fresh full state",()=>doRoll("power"),"P");
  add("🎲 Roll genre + styles","style & tempo",()=>doRoll("genre"),"G");
  add("🎲 Roll melody & feel","feeling + lead + harmony",()=>doRoll("feel-melody"),"M");
  add("🎲 Roll bass","bass voice/movement/relation",()=>doRoll("bass"),"B");
  add("🎲 Roll drums","kick/hats/snare/perc/groove",()=>doRoll("drums"),"D");
  add("🎲 Roll techno lab","drive/acid/texture/rave/industrial",()=>doRoll("technoLab"),"T");
  add("🎲 Roll sound design","filters/env/lfo/reverb/delay…",()=>doRoll("soundDesign"),"S");
  add("🎲 Roll mix & master","density/energy/glue/master chain",()=>doRoll("mixMaster"),"X");
  add("🎲 Roll spatial & mod","stereo/modulation/texture",()=>doRoll("spatialMod"));
  add("🎲 Roll groove & melodic extras","humanize/pocket/ornaments…",()=>doRoll("grooveMelodic"));
  add("🎲 Roll texture & FX","transitions/risers/drops…",()=>doRoll("textureFx"));
  add("🎲 Roll key","root + scale together",()=>doRoll("key"),"K");
  add("🎲 Roll BPM","fresh tempo",()=>doRoll("bpm"));
  add("🎲 Roll variations","3 alternative ideas",()=>doRoll("variations"),"V");
  add("🔀 Fuse styles","merge primary + secondary",()=>doRoll("fuse"),"F");
  add("🏆 Maximize my prompt (20 tries)","styles locked",()=>doMaxScoreRoll(20),"M2");
  add("🚀 Turbo Max (100 tries)","styles locked, everything else maxed",()=>doMaxTurbo(100),"M3");
  add("🎲 Re-roll similar (keep styles)","fresh set, score within ~5 of current",()=>doReRollSimilar(25),"R");
  add("💡 New idea","one random spark",()=>ideaRoll(),"I");
  add("⚡ DNA: Hard","150+ BPM peak-time hammer",()=>applyDna("hard"));
  add("🧪 DNA: Acid","303 squelch & roll",()=>applyDna("acid"));
  add("🎵 DNA: Melodic","anthem hooks, melody-dominant",()=>applyDna("melodic"));
  add("▫️ DNA: Minimal","hypnotic, stripped back",()=>applyDna("minimal"));
  add("🌑 DNA: Dark","industrial & cavernous",()=>applyDna("dark"));
  add("🎲 DNA: Surprise","full random techno chaos",()=>applyDna("surprise"));
  add("🎤 Copy & open Suno","description + suno.com/create",()=>{ const t=buildStylePrompt(); copyText(t,"Style Prompt"); setTimeout(()=>{ try{ if(window.open) window.open("https://suno.com/create","_blank"); }catch(e){} },400); },"O");
  add("⬇ Download .txt","current tab",()=>downloadText("neonforge-prompt.txt", currentTab==="style"?buildStylePrompt():currentTab==="brief"?buildFullBrief():currentTab==="eng"?buildEngineer():buildKit()));
  add("🎚 Toggle structure tags","[Intro] [Drop] in description",()=>{ commit(); state.structure=!state.structure; afterChange(); });
  add("👁 All sounds on","un-hide every sound card",()=>allSoundsOn(),"A");
  add("🎚 Toggle style-fit","auto-tune sounds to no-techno genre",()=>toggleStyleFit());
  add("📜 Open style picker","manual list",()=>openStyleModal(),"L");
  add("📜 Open master library","every pool, one screen",()=>openMasterLibrary(),"M5");
  add("👁 Hide/show sections","toggle prompt view",()=>toggleStylePromptFocus(),"H");
  add("🧵 Slim prompt mode","compact building",()=>toggleSlimMode());
  add("⚙️ Optimize prompt space","slim copy",()=>optimizePromptSpace());
  add("📋 Copy style prompt","≤1000 chars",()=>{ copyText(buildStylePrompt(),"Style Prompt"); },"C2");
  add("📋 Copy full brief","Suno + mix reference",()=>{ copyText(buildFullBrief(),"Full Brief"); });
  add("📋 Copy full pack","style + brief + kit + engineer",()=>copyFullPack());
  add("💾 Save preset","localStorage",()=>savePreset());
  add("🔗 Copy share link","state encoded in URL",()=>shareURL());
  add("↶ Undo","Ctrl+Z",()=>undo(),"U");
  add("↷ Redo","Ctrl+Shift+Z",()=>redo(),"R2");
  add("🧹 Clear history","localStorage",()=>clearHistory());
  add("🎧 Audition toggle","Web Audio preview",()=>Audition.toggle(),"Space");
  add("🔥 Mega Chaos Roll","everything",()=>sparkMega());
  add("💥 Anthem idea","melody-dominant concept",()=>anthemIdea());
  add("🎰 Lucky dip","full reroll + variations",()=>luckyDip());
  add("🕰 Time machine","fresh tempo/key/duration",()=>timeMachine());
  add("🎛 Chaos grid","16-step random",()=>chaosGrid());
  add("🎲 Roulette","one category",()=>roulette());
  add("🎚 Random layers","mix layer toggles",()=>randomLayers());
  add("🔮 Fate roll","random spark pool",()=>fateRoll());
  add("📌 Save idea","to idea book",()=>saveIdea());
  add("📖 Load idea","random from book",()=>loadIdea());
  add("🧹 Clear ideas","idea book",()=>clearIdeas());
  add("❓ Help","keyboard shortcuts",()=>{ openModal("helpModal"); });
  renderCommands();
}
function renderCommands(){
  const list = $("cmdList"); if(!list) return;
  const q = ($("cmdSearch") ? $("cmdSearch").value : "").toLowerCase();
  const filtered = COMMANDS.filter(c=>!q || c.label.toLowerCase().includes(q));
  list.innerHTML = filtered.map((c,i)=>
    '<button class="cmd" data-ci="'+i+'" data-label="'+escapeHtml(c.label)+'">'+
      '<span class="cl">'+escapeHtml(c.label)+'</span>'+
      (c.keys ? '<span class="ck">'+escapeHtml(c.keys)+'</span>' : '')+
    '</button>').join("");
  list.querySelectorAll(".cmd").forEach(b=>{
    b.addEventListener("click", ()=>{
      const c = filtered[parseInt(b.getAttribute("data-ci"),10)];
      closeModal("cmdModal");
      c.fn();
    });
  });
}
function openCommandPalette(){
  buildCommands();
  const search = $("cmdSearch");
  if(search){
    search.value = "";
    search.oninput = ()=>{ renderCommands(); };
  }
  const modal = $("cmdModal");
  if(modal){
    modal.classList.add("open");
    setTimeout(()=>{ if(search) search.focus(); }, 30);
  }
}

/* ---------------------------- HELP MODAL ---------------------------- */
function openHelp(){
  const modal = $("helpModal"); if(!modal) return;
  const table = $("keyTable");
  if(table) table.innerHTML = [
    ["⌘K / Ctrl+K","Command palette"],
    ["P","⚡ Power roll (everything)"],
    ["Space","▶/⏸ Audition"],
    ["⌘Z / Ctrl+Z","Undo"],
    ["⌘⇧Z / Ctrl+Shift+Z","Redo"],
    ["⌘C (on outbox focus)","Copy current tab"],
    ["G / M / B / D / T","Roll genre · melody · bass · drums · techno"],
    ["V","Roll 3 variations"],
    ["F","Fuse styles"],
    ["H","Toggle Prompt view (hide non-prompt sections)"],
    ["L","Manual style list"],
    ["O","Copy & open Suno"],
    ["R","🎲 Re-roll similar (keep styles)"],
    ["A","All sounds on (un-hide every sound card)"],
    ["?","This help"]
  ].map(r=>'<span class="kd"><kbd>'+r[0]+'</kbd></span><span>'+r[1]+'</span>').join("");
  modal.classList.add("open");
}
function openModal(id){ const m=$(id); if(m) m.classList.add("open"); }
function closeModal(id){ const m=$(id); if(m) m.classList.remove("open"); }

/* ---------------------------- TOGGLES / RANGES / CONTROLS ---------------------------- */
function bindToggle(id, fn){
  const el = $(id); if(!el) return;
  el.addEventListener("click", ()=>{ el.classList.toggle("on"); fn(el.classList.contains("on")); });
}
function rangeRead(el, fmt){
  const read = document.getElementById(el.id + "Read");
  if(read) read.textContent = fmt(el.value);
}
function bindRange(id, onInput){
  const el = $(id); if(!el) return;
  el.addEventListener("input", ()=>{ onInput(parseInt(el.value,10)); rangeRead(el, v=>v+"%"); });
}
function bindSelect(id, onPick){
  const el = $(id); if(!el) return;
  el.addEventListener("change", ()=>{ onPick(el.value); });
}

/* ---------------------------- KEYBOARD ---------------------------- */
function handleKey(e){
  if(e.target && (e.target.tagName==="INPUT" || e.target.tagName==="TEXTAREA" || e.target.tagName==="SELECT")){
    if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="c" && e.target.id==="outbox"){
      copyText(buildStylePrompt(), "Style Prompt");
    }
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if(mod && e.key.toLowerCase()==="k"){ e.preventDefault(); openCommandPalette(); return; }
  if(mod && e.key.toLowerCase()==="z"){ e.preventDefault(); if(e.shiftKey) redo(); else undo(); return; }
  if(mod && e.key.toLowerCase()==="y"){ e.preventDefault(); redo(); return; }
  if(e.key==="p" || e.key==="P"){ doRoll("power"); return; }
  if(e.key===" "){ e.preventDefault(); Audition.toggle(); return; }
  if(e.key==="g" || e.key==="G"){ doRoll("genre"); return; }
  if(e.key==="m" || e.key==="M"){ doRoll("feel-melody"); return; }
  if(e.key==="b" || e.key==="B"){ doRoll("bass"); return; }
  if(e.key==="d" || e.key==="D"){ doRoll("drums"); return; }
  if(e.key==="t" || e.key==="T"){ doRoll("technoLab"); return; }
  if(e.key==="v" || e.key==="V"){ doRoll("variations"); return; }
  if(e.key==="f" || e.key==="F"){ doRoll("fuse"); return; }
  if(e.key==="h" || e.key==="H"){ toggleStylePromptFocus(); return; }
  if(e.key==="l" || e.key==="L"){ openStyleModal(); return; }
  if(e.key==="o" || e.key==="O"){ copyText(buildStylePrompt(), "Style Prompt"); setTimeout(()=>{ try{ if(window.open) window.open("https://suno.com/create","_blank"); }catch(e2){} }, 400); return; }
  if(e.key==="r" || e.key==="R"){ doReRollSimilar(25); return; }
  if(e.key==="a" || e.key==="A"){ allSoundsOn(); return; }
  if(e.key==="?"){ openHelp(); return; }
}
function initShortcuts(){
  document.addEventListener("keydown", handleKey);
  const hint = $("shortcutHint");
  if(hint) hint.innerHTML = "⌘K palette · <b>P</b> power roll · <b>Space</b> audition · <b>G/M/B/D/T</b> quick rolls · <b>⌘Z</b> undo · <b>?</b> help";
}

/* ---------------------------- DELEGATED EVENTS ---------------------------- */
function initEvents(){
  document.addEventListener("click", e=>{
    const target = e.target;
    const pickBtn = target.closest("[data-pick]");
    if(pickBtn){
      openPicker(pickBtn.getAttribute("data-pick"));
      return;
    }
    const pickBtn2 = target.closest("[data-pick2]");
    if(pickBtn2){
      openPicker(pickBtn2.getAttribute("data-pick2"));
      return;
    }
    const rollBtn = target.closest("[data-roll]");
    if(rollBtn){
      doRoll(rollBtn.getAttribute("data-roll"));
      return;
    }
    const lockBtn = target.closest("[data-lock]");
    if(lockBtn){
      const k = lockBtn.getAttribute("data-lock");
      commit();
      state.locks[k] = !state.locks[k];
      lockBtn.classList.toggle("locked", state.locks[k]);
      lockBtn.textContent = state.locks[k] ? "🔒" : "🔓";
      afterChange();
      toast(state.locks[k] ? "🔒 Locked: "+k+" (rolls skip it)" : "🔓 Unlocked: "+k);
      return;
    }
    const hideBtn = target.closest("[data-hide]");
    if(hideBtn){
      toggleHide(hideBtn.getAttribute("data-hide"));
      return;
    }
    const histLoad = target.closest("[data-hist-load]");
    if(histLoad){
      const i = parseInt(histLoad.getAttribute("data-hist-load"),10);
      const h = history[i];
      if(!h){ toast("Missing history entry"); return; }
      const s = decodeState(h.enc);
      if(!s){ toast("History entry unreadable"); return; }
      commit(); state = s; rng = mulberry32(state.seed); afterChange();
      toast("📂 Loaded from history: "+h.label);
      return;
    }
    const histCopy = target.closest("[data-hist-copy]");
    if(histCopy){
      const i = parseInt(histCopy.getAttribute("data-hist-copy"),10);
      const h = history[i];
      if(!h){ toast("Missing history entry"); return; }
      copyText(h.prompt, "History prompt");
      return;
    }
    const applyVar = target.closest("[data-apply-var]");
    if(applyVar){
      const i = parseInt(applyVar.getAttribute("data-apply-var"),10);
      const v = state.variations[i];
      if(!v){ toast("Variation missing"); return; }
      commit();
      const keepLocks = state.locks;
      const keepHidden = state.hidden;
      const keepLayers = state.layers;
      state = JSON.parse(JSON.stringify(v));
      state.locks = keepLocks; state.hidden = keepHidden; state.layers = keepLayers;
      state.variations = [];
      rng = mulberry32(state.seed);
      afterChange();
      flash($("styleCard"));
      toast("✅ Applied variation #"+(i+1)+": "+(state.concept.title||"Untitled"));
      return;
    }
    const copyVar = target.closest("[data-copy-var]");
    if(copyVar){
      const i = parseInt(copyVar.getAttribute("data-copy-var"),10);
      const v = state.variations[i];
      if(!v){ toast("Variation missing"); return; }
      copyText(buildStylePromptFor(v), "Variation #"+(i+1));
      return;
    }
    const tab = target.closest("[data-tab]");
    if(tab){
      currentTab = tab.getAttribute("data-tab");
      document.querySelectorAll("[data-tab]").forEach(t=>t.classList.toggle("on", t===tab));
      renderOutput();
      return;
    }
    const maxSec = target.closest("[data-max-section]");
    if(maxSec){
      const k = maxSec.getAttribute("data-max-section");
      const def = SECTION_MAX_DEFS[k];
      if(!def){ toast("Unknown section: "+k); return; }
      doMaxScoreRollSection(def.keys, 15, def.label);
      return;
    }
    const maxBtn2 = target.closest("[id$='Btn2']");
    if(maxBtn2){
      const def = SECTION_MAX_BTN2[maxBtn2.id];
      if(def){
        doMaxScoreRollSection(def.keys, 15, def.label);
        return;
      }
    }
    const ideaBtn = target.closest("#ideaBtn");
    if(ideaBtn){ ideaRoll(); return; }
    const anthemBtn = target.closest("#anthemIdeaBtn"); if(anthemBtn){ anthemIdea(); return; }
    const luckyBtn = target.closest("#luckyDipBtn"); if(luckyBtn){ luckyDip(); return; }
    const timeBtn = target.closest("#timeMachineBtn"); if(timeBtn){ timeMachine(); return; }
    const dnaBtn = target.closest("[data-dna]");
    if(dnaBtn){ applyDna(dnaBtn.getAttribute("data-dna")); return; }
    const copySparkBtn = target.closest("#sparkCopyBtn"); if(copySparkBtn){ sparkCopy(); return; }
    const titleApplyBtn = target.closest("#sparkTitleApplyBtn");
    if(titleApplyBtn){
      if(lastSparkKind!=="Title" && lastSparkKind!=="Title II"){ toast("Roll a Title idea first (🏷 Title)"); return; }
      sparkApplyTitle(); return;
    }
    const moreSparkBtn = target.closest("#sparkMoreBtn");
    if(moreSparkBtn){
      ideaRoll();
      return;
    }
    const saveIdeaBtn = target.closest("#saveIdeaBtn"); if(saveIdeaBtn){ saveIdea(); return; }
    const loadIdeaBtn = target.closest("#loadIdeaBtn"); if(loadIdeaBtn){ loadIdea(); return; }
    const clearIdeasBtn = target.closest("#clearIdeasBtn"); if(clearIdeasBtn){ clearIdeas(); return; }
    const copyPackBtn = target.closest("#copyPackBtn"); if(copyPackBtn){ copyFullPack(); return; }
    const optimizeBtn = target.closest("#optimizePromptBtn"); if(optimizeBtn){ optimizePromptSpace(); return; }
    const slimBtn = target.closest("#slimModeBtn"); if(slimBtn){ toggleSlimMode(); return; }
    const resetMaxBtn = target.closest("#resetMaxBtn"); if(resetMaxBtn){ resetMaxState(); return; }
    const sunoOpenBtn = target.closest("#sunoOpenBtn");
    if(sunoOpenBtn){
      const text = buildStylePrompt();
      copyText(text, "Style Prompt");
      setTimeout(()=>{
        try{
          if(window.open){
            window.open("https://suno.com/create", "_blank");
            toast("🎤 Suno opened — paste the description in the style box");
          } else {
            toast("Paste the copied description into Suno");
          }
        }catch(e){ toast("Paste the copied description into Suno"); }
      }, 500);
      return;
    }
    const dlBtn = target.closest("#dlBtn");
    if(dlBtn){
      const text = currentTab==="style" ? buildStylePrompt() : currentTab==="brief" ? buildFullBrief() : currentTab==="eng" ? buildEngineer() : buildKit();
      downloadText("neonforge-" + (state.concept&&state.concept.title ? state.concept.title.replace(/[^a-z0-9]+/gi,"-").toLowerCase().slice(0,30) : "prompt") + ".txt", text);
      toast("⬇ Downloaded .txt (" + text.length + " chars)");
      return;
    }
    const structToggle = target.closest("#structToggle");
    if(structToggle){
      commit(); state.structure = !state.structure; afterChange();
      toast(state.structure ? "🎚 [Intro] [Drop] tags ON — Suno will follow the structure" : "🎚 Structure tags OFF");
      return;
    }
    const hiddenChip = target.closest("#hiddenChip");
    if(hiddenChip){
      if(Object.keys(state.hidden).some(k=>state.hidden[k])){ showAllSections(); }
      else { commit(); stylePromptFocus = true; for(const id of CARD_IDS){ if(!STYLE_PROMPT_SECTIONS.has(id)) state.hidden[id]=true; } afterChange(); toast("🎯 Prompt view — extras hidden"); }
      return;
    }
    const seedView = target.closest("#seedView");
    if(seedView){ copyText(String(state.seed), "Seed"); return; }
    const stashBtn = target.closest("#stashBBtn"); if(stashBtn){ stashB(); return; }
    const swapBtn = target.closest("#swapABBtn"); if(swapBtn){ swapAB(); return; }
    const audBtn = target.closest("#auditionBtn"); if(audBtn){ Audition.toggle(); return; }
    const copyBtn = target.closest("#copyBtn");
    if(copyBtn){
      if(currentTab==="style"){
        const text = buildStylePrompt();
        copyText(text, "Style Prompt");
        addHistory("Style Prompt", text, state);
      } else if(currentTab==="brief"){
        const text = buildFullBrief();
        copyText(text, "Full Brief");
        addHistory("Full Brief", text, state);
      } else if(currentTab==="eng"){
        const text = buildEngineer();
        copyText(text, "Engineer Notes");
        addHistory("Engineer Notes", text, state);
      } else {
        const text = buildKit();
        copyText(text, "Suno Kit");
        addHistory("Suno Kit", text, state);
      }
      return;
    }
    const copyKitBtn = target.closest("#copyKitBtn");
    if(copyKitBtn){
      const text = buildKit();
      copyText(text, "Suno Kit");
      addHistory("Suno Kit", text, state);
      return;
    }
    const undoBtn2 = target.closest("#undoBtn"); if(undoBtn2){ undo(); return; }
    const redoBtn2 = target.closest("#redoBtn"); if(redoBtn2){ redo(); return; }
    const shareBtn = target.closest("#shareBtn"); if(shareBtn){ shareURL(); return; }
    const masterLibBtn = target.closest("#masterLibBtn"); if(masterLibBtn){ openMasterLibrary(); return; }
    const cmdBtn = target.closest("#cmdBtn"); if(cmdBtn){ openCommandPalette(); return; }
    const helpBtn = target.closest("#helpBtn"); if(helpBtn){ openHelp(); return; }
    const styleFocusBtn2 = target.closest("#styleFocusBtn"); if(styleFocusBtn2){ toggleStylePromptFocus(); return; }
    const powerRollBtn = target.closest("#powerRollBtn"); if(powerRollBtn){ doRoll("power"); return; }
    const modeTechBtn = target.closest("#modeTechBtn");
    if(modeTechBtn){
      commit();
      state.techOnly = true;
      unhideAllSoundCards(); // techno mode wants the full sound set back
      if(!state.locks.genre) ROLL_FN.genre(state);
      if(!state.locks.bpm) state.bpm = tempoForGenre("Techno","Techno");
      afterChange();
      toast("⚡ Techno-Only mode — techno pool locked in, all sounds back on");
      return;
    }
    const modeAnyBtn = target.closest("#modeAnyBtn");
    if(modeAnyBtn){
      commit();
      state.techOnly = false;
      if(!state.locks.genre) ROLL_FN.genre(state);
      if(!state.locks.bpm) state.bpm = tempoForGenre(state.primaryGenre, state.secondaryGenre);
      autoFitSounds({reRoll:true}); // hide what doesn't fit the rolled genre, re-tune the rest
      afterChange();
      toast("🎛 No-Techno mode — genre combos on" + (state.styleFit ? " · sounds auto-fit to the genre" : ""));
      return;
    }
    const savePresetBtn = target.closest("#savePresetBtn"); if(savePresetBtn){ savePreset(); return; }
    const clearHistoryBtn = target.closest("#clearHistoryBtn"); if(clearHistoryBtn){ clearHistory(); return; }
    const exportBtn = target.closest("#exportBtn");
    if(exportBtn){
      const out = [];
      const presets = loadPresets();
      Object.keys(presets).forEach(n=>out.push("PRESET|"+n+"|"+presets[n]));
      history.forEach(h=>out.push("HIST|"+h.t+"|"+h.kind+"|"+h.enc));
      const data = out.join("\n");
      const a = document.createElement("a");
      try{
        if(window.URL && URL.createObjectURL && Blob){
          a.href = URL.createObjectURL(new Blob([data], {type:"text/plain"}));
        } else {
          a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(data);
        }
        a.download = "neonforge2-export.txt";
        a.click();
        toast("📦 Export downloaded ("+out.length+" entries)");
      }catch(e){
        copyText(data, "Export (download blocked)");
      }
      return;
    }
    const importBtn = target.closest("#importBtn");
    if(importBtn){
      const file = $("importFile"); if(!file || !file.files || !file.files[0]){ toast("Choose a .txt export first"); return; }
      const reader = new FileReader();
      reader.onload = ()=>{
        const lines = String(reader.result).split("\n").filter(Boolean);
        let presets = loadPresets(), hist = [];
        lines.forEach(line=>{
          const [tag, ...rest] = line.split("|");
          if(tag==="PRESET"){ presets[rest[0]] = rest.slice(1).join("|"); }
          else if(tag==="HIST" && rest[2]){ hist.push({t:parseInt(rest[0],10)||Date.now(), kind:rest[1], enc:rest[2], label:"imported", prompt:"imported"}); }
        });
        savePresets(presets);
        if(hist.length){ history = hist.concat(history).slice(0, MAX_HISTORY_ITEMS); saveHistory(); }
        renderPresets(); renderHistory();
        toast("📥 Imported "+lines.length+" entries");
      };
      reader.readAsText(file.files[0]);
      return;
    }
    const rhythmRandom = target.closest("#rhythmRandomBtn");
    if(rhythmRandom){ commit(); state.rhythmGrid = Array.from({length:16},()=>rng()>0.4); afterChange(); return; }
    const rhythmClear = target.closest("#rhythmClearBtn");
    if(rhythmClear){ commit(); state.rhythmGrid = Array.from({length:16},()=>false); afterChange(); return; }
    const copyArcBtn = target.closest("#copyArcBtn");
    if(copyArcBtn){
      const text = "ENERGY ARC — " + (state.concept.title||"Untitled") + " (" + state.primaryStyle + ", " + state.bpm + " BPM)\n" +
        energyArc().map(s=>s.startLabel+"  "+s.name.padEnd(18)+s.bars+" bars  energy "+s.energy+"%").join("\n") +
        "\n\n" + arcTags();
      copyText(text, "Energy Arc");
      return;
    }
    const melodyConceptBtn = target.closest("#melodyConceptGrid .gridroll");
    if(melodyConceptBtn){
      const k = melodyConceptBtn.getAttribute("data-key");
      commit(); beginRoll();
      if(!state.locks["melodyConcept-"+k]){
        if(!state.melodyConcept) state.melodyConcept={};
        state.melodyConcept[k] = pick(MELODY_CONCEPT[k]);
      }
      afterChange();
      return;
    }
    const conceptBtn = target.closest("#conceptGrid .gridroll");
    if(conceptBtn){
      const k = conceptBtn.getAttribute("data-key");
      commit(); beginRoll();
      if(!state.locks["concept-"+k]) state.concept[k] = pick(CONCEPT[k]);
      afterChange();
      return;
    }
    const clearCounter = target.closest("#clearCounterBtn"); if(clearCounter){ doRoll("clear-counter"); return; }
    const clearVoice = target.closest("#clearVoiceConceptBtn"); if(clearVoice){ doRoll("clear-voice-concept"); return; }
    const clearSecondary = target.closest("#clearSecondaryBtn"); if(clearSecondary){ doRoll("clear-secondary"); return; }
    const fuseBtn = target.closest("#fuseBtn"); if(fuseBtn){ doRoll("fuse"); return; }
    const clearVariations = target.closest("#clearVariationsBtn");
    if(clearVariations){ commit(); state.variations = []; afterChange(); toast("Variations cleared"); return; }
    const genreRollBtn = target.closest("#genreRollBtn"); if(genreRollBtn){ doRoll("genre"); return; }
    const bpmRollBtn = target.closest("#bpmRollBtn"); if(bpmRollBtn){ doRoll("bpm"); return; }
    const keyRollBtn = target.closest("#keyRollBtn"); if(keyRollBtn){ doRoll("key"); return; }
    const conceptRollBtn = target.closest("#conceptRollBtn"); if(conceptRollBtn){ doRoll("concept"); return; }
    const melodyConceptRoll = target.closest("#melodyConceptRollBtn"); if(melodyConceptRoll){ doRoll("melodyConcept"); return; }
    const arrangementRoll = target.closest("#arrangementRollBtn"); if(arrangementRoll){ doRoll("arrangement"); return; }
    const layersRoll = target.closest("#layersRollBtn");
    if(layersRoll){
      commit(); beginRoll();
      const ids = LAYERS.map(l=>l.id);
      const on = Math.max(2, Math.min(ids.length-1, 3+Math.floor(rng()*4)));
      ids.forEach((id,i)=>state.layers[id] = i<on);
      // shuffle
      for(let i=ids.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [ids[i],ids[j]]=[ids[j],ids[i]]; }
      const chosen = ids.slice(0,on);
      ids.forEach(id=>state.layers[id]=chosen.includes(id));
      afterChange();
      toast("🎚 "+on+" layers rolled");
      return;
    }
    const maxTurboBtn = target.closest("#maxTurboBtn"); if(maxTurboBtn){ doMaxTurbo(100); return; }
    const maxScoreBtn = target.closest("#maxScoreBtn"); if(maxScoreBtn){ doMaxScoreRoll(20); return; }
    const rerollSimilarBtn = target.closest("#rerollSimilarBtn"); if(rerollSimilarBtn){ doReRollSimilar(25); return; }
    const maxMelodyBtn = target.closest("#maxMelodyBtn"); if(maxMelodyBtn){ doMaxMelodyDominant(25); return; }
    const maxAnthemBtn = target.closest("#maxAnthemMelodyBtn"); if(maxAnthemBtn){ doMaxMelodyDominant(25); return; }
    const maxTempoBtn = target.closest("#maxTempoBtn"); if(maxTempoBtn){ doMaxScoreRollSection(["bpm"],15,"Tempo"); return; }
    const maxTempoLabBtn = target.closest("#maxTempoLabBtn"); if(maxTempoLabBtn){ doMaxScoreRollSection(["bpm","key","rootPc","scaleId"],15,"Tempo & Key"); return; }
    const maxBassBtn = target.closest("#maxBassBtn"); if(maxBassBtn){ doMaxScoreRollSection(["bassVoice","bassMovement","bassRel"],15,"Bass"); return; }
    const maxDrumsBtn = target.closest("#maxDrumsBtn"); if(maxDrumsBtn){ doMaxScoreRollSection(["kick","hats","snare","perc","toms","groove","swing","sync","intensity"],15,"Drums"); return; }
    const maxTechnoBtn = target.closest("#maxTechnoLabBtn"); if(maxTechnoBtn){ doMaxScoreRollSection(["technoDrive","technoAcid","technoTexture","technoRave","technoIndustrial"],15,"Techno Lab"); return; }
    const maxHarmonyBtn = target.closest("#maxHarmonyBtn"); if(maxHarmonyBtn){ doMaxScoreRollSection(["harmony","chordColor","chordProg","voicingType","inversionType","tensionType","resolutionType"],15,"Harmony"); return; }
    const maxRhythmBtn = target.closest("#maxRhythmBtn"); if(maxRhythmBtn){ doMaxScoreRollSection(["rhythm","rhythmPattern","ghostNotes","humanizeType","pocketType","sectionDensity"],15,"Rhythm"); return; }
    const maxSoundBtn = target.closest("#maxSoundDesignBtn"); if(maxSoundBtn){ doMaxScoreRollSection(["filterType","envelopeType","lfoType","distortionType","reverbType","delayType","sidechainType","stereoType","fxChain","soundIntensity"],15,"Sound Design"); return; }
    const maxMixBtn = target.closest("#maxMixMasterBtn"); if(maxMixBtn){ doMaxScoreRollSection(["mixDensity","mixEnergy","mixSpace","mixGlue","mixPunch","masterDrive","masterLoudness","masterColor","masterChain","filterCutoff","filterResonance","eqType","compressionType","saturationType","sidechainCurve"],15,"Mix Master"); return; }
    const maxSpatialBtn = target.closest("#maxSpatialModBtn"); if(maxSpatialBtn){ doMaxScoreRollSection(["stereoImage","stereoWidth","spatialDepth","spatialMovement","modSource","modDest","modRate","modDepth","textureLayer","grainType","shimmerType","atmosphereType","reverbSize","reverbDecay","stereoEnhance"],15,"Spatial Mod"); return; }
    const maxGrooveBtn = target.closest("#maxGrooveMelodicBtn"); if(maxGrooveBtn){ doMaxScoreRollSection(["ghostNotes","humanizeType","pocketType","ornamentType","vibratoType","portamentoType","scaleRun","intervalLeap","voicingType","inversionType","tensionType","resolutionType","delayTime","delayFeedback","sectionDensity"],15,"Groove Melodic"); return; }
    const maxTextureBtn = target.closest("#maxTextureFxBtn"); if(maxTextureBtn){ doMaxScoreRollSection(["rideType","crashType","clapLayer","percFill","fxType","transitionType","riserType","impactType","energyCurve","buildType","dropType","chopType"],15,"Texture FX"); return; }
    const maxConceptBtn = target.closest("#maxConceptBtn"); if(maxConceptBtn){ doMaxScoreRollSection(["concept","concept-title","concept-world","concept-location","concept-visual","concept-narrative","concept-sensation","concept-event","concept-conflict","concept-crowd","concept-transform"],15,"Concept"); return; }
    const maxArrangementBtn = target.closest("#maxArrangementBtn"); if(maxArrangementBtn){ doMaxScoreRollSection(["arrangement"],15,"Arrangement"); return; }
    const instToggle2 = target.closest("#instrumentalToggle"); if(instToggle2){ toggleInstrumental(); return; }
    const vocalToggle2 = target.closest("#vocalToggle"); if(vocalToggle2){ toggleVocal(); return; }
    const styleFitTgl = target.closest("#styleFitToggle"); if(styleFitTgl){ toggleStyleFit(); return; }
    const allSoundsBtn = target.closest("#allSoundsBtn"); if(allSoundsBtn){ allSoundsOn(); return; }
    const modalClose = target.closest(".modal-close");
    if(modalClose){ const m = modalClose.closest(".modal"); if(m){ m.classList.remove("open"); } return; }
    const modalBackdrop = target.closest(".modal");
    if(modalBackdrop && modalBackdrop.classList.contains("open") && target===modalBackdrop){
      modalBackdrop.classList.remove("open");
      return;
    }
    const showMore = target.closest("[data-show-more]");
    if(showMore){
      const val = showMore.getAttribute("data-show-more");
      if(val==="feel-melody"){ openPicker("leadVoice"); return; }
      if(val==="bass"){ openPicker("bassVoice"); return; }
      if(val==="drums"){ openPicker("kick"); return; }
      if(val==="techno"){ openPicker("technoDrive"); return; }
      if(val==="sound"){ openPicker("filterType"); return; }
      if(val==="mix"){ openPicker("mixDensity"); return; }
      if(val==="spatial"){ openPicker("stereoImage"); return; }
      if(val==="groove"){ openPicker("ghostNotes"); return; }
      if(val==="texture"){ openPicker("rideType"); return; }
      return;
    }
  });
  // non-click events
  const equalChanceChk = $("equalChanceChk");
  if(equalChanceChk) equalChanceChk.addEventListener("change", ()=>{ commit(); state.equalChance = equalChanceChk.checked; afterChange(); });
  const weirdness = $("weirdness");
  if(weirdness) weirdness.addEventListener("input", ()=>{ state.weirdness = parseInt(weirdness.value,10); render(); });
  const acidAmt = $("acidAmt");
  if(acidAmt) acidAmt.addEventListener("input", ()=>{ state.acidAmt = parseInt(acidAmt.value,10); renderTechnoDna(); });
  const driveAmt = $("driveAmt");
  if(driveAmt) driveAmt.addEventListener("input", ()=>{ state.driveAmt = parseInt(driveAmt.value,10); renderTechnoDna(); });
  const bpmInput = $("bpmInput");
  if(bpmInput) bpmInput.addEventListener("change", ()=>{
    const v = parseInt(bpmInput.value,10);
    if(v>=60 && v<=220){ commit(); state.bpm = v; afterChange(); toast("⏱ "+v+" BPM"); }
    else { bpmInput.value = state.bpm; toast("BPM out of range (60–220)"); }
  });
  const influenceSel = $("influenceSel");
  if(influenceSel) influenceSel.addEventListener("change", ()=>{ commit(); state.influence = influenceSel.value; afterChange(); });
  const melodicForceSel = $("melodicForceSel");
  if(melodicForceSel) melodicForceSel.addEventListener("change", ()=>{ commit(); state.melodicForce = melodicForceSel.value; afterChange(); });
  const durationSel = $("durationSel");
  if(durationSel) durationSel.addEventListener("change", ()=>{ commit(); state.duration = durationSel.value; afterChange(); });
  const counterRelSel = $("counterRelSel");
  if(counterRelSel) counterRelSel.addEventListener("change", ()=>{ commit(); state.counterMelodyRelation = counterRelSel.value; afterChange(); });
  const voiceRelSel = $("voiceRelSel");
  if(voiceRelSel) voiceRelSel.addEventListener("change", ()=>{ commit(); state.voiceRelation = voiceRelSel.value; afterChange(); });
  const rootSel = $("rootSel");
  if(rootSel) rootSel.addEventListener("change", ()=>{ commit(); state.rootPc = parseInt(rootSel.value,10); afterChange(); });
  const scaleSel = $("scaleSel");
  if(scaleSel) scaleSel.addEventListener("change", ()=>{ commit(); state.scaleId = scaleSel.value; state.chordColor = scaleOf(state).n; afterChange(); });
  const microMelodySel = $("microMelodySel");
  if(microMelodySel) microMelodySel.addEventListener("change", ()=>{ commit(); state.microMelody = microMelodySel.value; afterChange(); });
  const microBassSel = $("microBassSel");
  if(microBassSel) microBassSel.addEventListener("change", ()=>{ commit(); state.microBass = microBassSel.value; afterChange(); });
  const microMelodyBtn = $("microMelodyBtn");
  if(microMelodyBtn) microMelodyBtn.addEventListener("click", ()=>{
    commit(); state.microMelody = state.microMelody==="off" ? "quarter" : "off"; afterChange();
  });
  const microBassBtn = $("microBassBtn");
  if(microBassBtn) microBassBtn.addEventListener("click", ()=>{
    commit(); state.microBass = state.microBass==="off" ? "quarter" : "off"; afterChange();
  });
  const presetName = $("presetName");
  if(presetName) presetName.addEventListener("keydown", e=>{ if(e.key==="Enter") savePreset(); });
  const masterSearch = $("masterSearch");
  if(masterSearch) masterSearch.addEventListener("input", ()=>{ openMasterLibrary(); });
  const styleSearch = $("styleSearch");
  if(styleSearch) styleSearch.addEventListener("input", ()=>{ openStyleModal(); });
  const cmdSearch = $("cmdSearch");
  if(cmdSearch) cmdSearch.addEventListener("input", ()=>{ renderCommands(); });
  const audVol = $("audVol");
  if(audVol) audVol.addEventListener("input", ()=>{ Audition.setVolume(parseInt(audVol.value,10)/100); });
  const importFile = $("importFile");
  if(importFile) importFile.addEventListener("change", ()=>{ importFile.title = importFile.files[0] ? importFile.files[0].name : "no file chosen"; });
}

/* ---------------------------- BOOT ---------------------------- */
function boot(){
  // URL state / autosave
  const params = new URLSearchParams(location.search);
  let restored = null;
  if(params.get("s")) restored = decodeState(params.get("s"));
  if(!restored){
    try{
      const last = localStorage.getItem("nf2_last");
      if(last) restored = decodeState(last);
    }catch(e){}
  }
  if(restored){
    state = restored;
    const seed = state.seed || newSeed();
    state.seed = seed;
    rng = mulberry32(seed);
  }
  try{
    const savedB = localStorage.getItem("nf2_slotb");
    if(savedB) slotB = savedB;
  }catch(e){}
  state.rhythmGrid = Array.from({length:16},()=>rng()>0.4);
  buildDynamicRows();
  const rootSel = $("rootSel"), scaleSel = $("scaleSel");
  if(rootSel){ rootSel.innerHTML = NOTE_NAMES.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join(""); }
  if(scaleSel){ scaleSel.innerHTML = SCALES.map(s=>'<option value="'+s.id+'">'+s.n+' — '+s.mood+'</option>').join(""); }
  const microMelodySel = $("microMelodySel"), microBassSel = $("microBassSel");
  if(microMelodySel) microMelodySel.innerHTML = MICRO_MODES.map(m=>'<option value="'+m.id+'">'+m.n+' ('+m.cents.toFixed(1)+' ct)</option>').join("");
  if(microBassSel) microBassSel.innerHTML = MICRO_MODES.map(m=>'<option value="'+m.id+'">'+m.n+' ('+m.cents.toFixed(1)+' ct)</option>').join("");
  const influenceSel = $("influenceSel");
  if(influenceSel) influenceSel.innerHTML = ["subtle","balanced","strong"].map(v=>'<option value="'+v+'">'+v+'</option>').join("");
  const melodicForceSel = $("melodicForceSel");
  if(melodicForceSel) melodicForceSel.innerHTML = ["light","balanced","strong","dominant"].map(v=>'<option value="'+v+'">'+v+' ('+(MELODY_FORCE[v]?MELODY_FORCE[v].n:"")+')</option>').join("");
  const counterRelSel = $("counterRelSel");
  if(counterRelSel) counterRelSel.innerHTML = ["supports","follows","counters"].map(v=>'<option value="'+v+'">'+v+'</option>').join("");
  const voiceRelSel = $("voiceRelSel");
  if(voiceRelSel) voiceRelSel.innerHTML = ["supports","follows","counters"].map(v=>'<option value="'+v+'">'+v+'</option>').join("");
  const durationSel = $("durationSel");
  if(durationSel) durationSel.innerHTML = ["compact","standard","extended"].map(v=>'<option value="'+v+'">'+v+'</option>').join("");
  buildIdeaChips();
  buildMaxChips();
  buildDnaChips();
  buildCommands();
  renderCommands();
  initEvents();
  initShortcuts();
  render();
  renderIdeaBook();
  renderHistory();
  // first roll?
  if(!state.primaryStyle){
    commit();
    beginRoll();
    state.techOnly = true;
    ROLL_FN.genre(state);
    ROLL_FN.arrangement(state);
    state.instrumental = true;
    rollAllInto(state);
    afterChange();
    toast("⚡ NEON FORGE II — power-rolled a fresh techno idea");
  }
  updateURL();
  saveAuto();
  setTimeout(()=>{
    const t = $("bootNote");
    if(t) t.textContent = "Ready — " + new Date().toLocaleTimeString();
  }, 600);
  // test/automation hook
  window.__NF = {
    get: () => state,
    set: s => { state = s; rng = mulberry32(state.seed); },
    doRoll, rollAllInto, buildStylePrompt, buildFullBrief, buildKit, buildEngineer,
    scorePrompt, openPicker, openStyleModal, pickGenreCombo, genreComboName,
    allCombos, pickStyle, defaultState, commit, undo, redo,
    doMaxScoreRoll, doMaxScoreRollSection, doMaxTurbo, doMaxMelodyDominant,
    doReRollSimilar, runMaxSearch, maxSearchKeys, maxRollBusy: () => maxRollRunning,
    generateVariations, energyArc, arcLine, Audition, sparkShow, saveIdea, loadIdea,
    clearHistory, loadPresets, savePresets, encodeState, decodeState,
    rollGroup, buildSlimStylePrompt, ideaRoll, buildMaxChips, buildIdeaChips,
    SECTION_MAX_DEFS, applyDna, buildDnaChips, downloadText, DNA_PRESETS,
    autoFitSounds, allSoundsOn, unhideAllSoundCards, styleFitCards, genreWorld,
    toggleStyleFit, genreSafeText, structTags, arcName
  };
}

boot();
