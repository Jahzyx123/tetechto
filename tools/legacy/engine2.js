/* ---------------------------- RENDER ---------------------------- */
const $ = id => document.getElementById(id);
let currentTab = "style";
let stylePromptFocus = false;

function atomValue(atom){
  if(atom.display) return atom.display(state);
  if(atom.field) return state[atom.field] || "—";
  return "—";
}
function fieldRowHtml(atom){
  return '<div class="row"><span class="lbl">'+atom.label+'</span>'+
    '<span class="val" id="v-'+atom.key+'">—</span>'+
    '<button class="lock" data-lock="'+atom.key+'">🔓</button>'+
    '<button class="mini miniroll" data-roll="'+atom.key+'">🎲</button>'+
    '<button class="mini listbtn" data-pick="'+atom.key+'">📜 List</button>'+
    '</div>';
}
const DYNAMIC_CARDS = { feelCard:"feelRows", bassCard:"bassRows", drumsCard:"drumsRows", technoLabCard:"technoLabRows",
  harmonyLabCard:"harmonyLabRows", rhythmLabCard:"rhythmLabRows", soundDesignCard:"soundDesignRows",
  mixMasterCard:"mixMasterRows", spatialModCard:"spatialModRows", grooveMelodicCard:"grooveMelodicRows",
  textureFxCard:"textureFxRows" };
function buildDynamicRows(){
  Object.keys(DYNAMIC_CARDS).forEach(cardId=>{
    const containerId = DYNAMIC_CARDS[cardId];
    const atoms = ATOMS.filter(a=>a.card===cardId);
    const el = $(containerId);
    if(el) el.innerHTML = atoms.map(fieldRowHtml).join("");
  });
}

const CARD_IDS = ["sparkCard","styleCard","feelCard","bassCard","drumsCard","technoLabCard","rhythmLabCard","harmonyLabCard","soundDesignCard","mixMasterCard","spatialModCard","grooveMelodicCard","textureFxCard","modeCard","layersCard","auditionCard","scoreCard","maxRollLabCard","variationsCard","presetsCard","historyCard"];
const STYLE_PROMPT_SECTIONS = new Set(["styleCard","feelCard","bassCard","drumsCard","technoLabCard","harmonyLabCard","rhythmLabCard","soundDesignCard","mixMasterCard","spatialModCard","grooveMelodicCard","textureFxCard","modeCard","layersCard","scoreCard"]);

const lastMicro = {microMelody:"quarter", microBass:"quarter"};
function render(){
  syncHarmonicColor(state);
  const seedEl=$("seedView"); if(seedEl){ seedEl.textContent = "seed " + (state.seed % 1000000); seedEl.title = "This roll's seed — click to copy"; }
  const undoBtn=$("undoBtn"), redoBtn=$("redoBtn");
  if(undoBtn) undoBtn.disabled = undoStack.length===0;
  if(redoBtn) redoBtn.disabled = redoStack.length===0;
  const vp=$("v-primary"); if(vp) vp.textContent = state.primaryStyle || "— roll me";
  const vs=$("v-secondary"); if(vs){ vs.textContent = state.secondaryStyle || "— none"; vs.classList.toggle("dim", !state.secondaryStyle); }
  const techBtn=$("modeTechBtn"), anyBtn=$("modeAnyBtn");
  if(techBtn) techBtn.classList.toggle("on-tech", !!state.techOnly);
  if(anyBtn) anyBtn.classList.toggle("on-any", !state.techOnly);
  const eqChk=$("equalChanceChk"); if(eqChk) eqChk.checked = !!state.equalChance;
  const genreHint=$("genreHint"), modeNoteBar=$("modeNoteBar");
  if(modeNoteBar){
    modeNoteBar.textContent = state.techOnly
      ? "Techno-Only mode — the roller and every list use the curated techno pool (" + STYLES.length + " styles, core / sub / rare)."
      : "No-Techno mode — the roller draws sub-style + genre combos from " + GENRES.length + " genres. No techno appears unless you switch." +
        (state.styleFit ? " · Style-fit ON: sounds auto-tune to the rolled genre." : " · Style-fit OFF: sounds stay as rolled.");
  }
  const styleFitTgl=$("styleFitToggle");
  if(styleFitTgl) styleFitTgl.classList.toggle("on", !!state.styleFit);
  const styleFitRead=$("styleFitRead");
  if(styleFitRead) styleFitRead.textContent = state.styleFit
    ? "on genre roll: hides sounds that don't fit · re-tunes the rest"
    : "off — nothing is hidden or re-tuned automatically";
  if(genreHint){
    if(state.techOnly){
      genreHint.textContent = "techno pool only · 🎲 rolls two techno styles";
    } else if(state.primaryGenre){
      genreHint.textContent = (state.primaryGenre===state.secondaryGenre ? state.primaryGenre+" (same genre)" : state.primaryGenre+" + "+state.secondaryGenre) + " · tempo matched to genre";
    } else {
      genreHint.textContent = GENRES.length + " genres · rolls a sub-style combo";
    }
    genreHint.className = "val dim";
  }
  const bpmInput=$("bpmInput"); if(bpmInput) bpmInput.value = state.bpm;
  const influenceSel=$("influenceSel"); if(influenceSel) influenceSel.value = state.influence;
  const influenceRead=$("influenceRead");
  if(influenceRead) influenceRead.textContent = {subtle:"≈ 15% flavor",balanced:"≈ 35% flavor",strong:"≈ 60% fusion"}[state.influence];
  const weird=$("weirdness"); if(weird) weird.value = state.weirdness;
  const weirdRead=$("weirdnessRead"); if(weirdRead) weirdRead.innerHTML = weirdReadout(state.weirdness);
  const melodicForceSel=$("melodicForceSel"); if(melodicForceSel) melodicForceSel.value = state.melodicForce || "balanced";
  const melodicForceRead=$("melodicForceRead");
  if(melodicForceRead) melodicForceRead.textContent = (MELODY_FORCE[state.melodicForce] || MELODY_FORCE.balanced).desc;
  const bpmRow=$("bpmRow"), keyRow=$("keyRow");
  if(bpmRow) bpmRow.style.display = state.hidden.bpm ? "none" : "flex";
  if(keyRow) keyRow.style.display = state.hidden.key ? "none" : "flex";
  const rootSel=$("rootSel"); if(rootSel) rootSel.value = String(((state.rootPc|0)%12+12)%12);
  const scaleSel=$("scaleSel"); if(scaleSel) scaleSel.value = scaleOf(state).id;
  const keyRead=$("keyRead"); if(keyRead) keyRead.textContent = "Camelot " + camelot(state) + " · " + scaleOf(state).mood;
  const emotionLineEl=$("emotionLine");
  if(emotionLineEl) emotionLineEl.innerHTML = "<b>Emotion-led melody:</b> " + escapeHtml(state.feeling) + " melody; <b>" + escapeHtml(state.flavor) + "</b>; direction: " + escapeHtml(state.direction);
  ATOMS.forEach(a=>{
    const el = $("v-"+a.key);
    if(el) el.textContent = atomValue(a);
  });
  const mc = state.melodyConcept || {};
  const setTxt = (id,val)=>{ const el=$(id); if(el) el.textContent = val; };
  setTxt("v-mcstory", mc.story || "—");
  setTxt("v-mcrole", mc.role || "—");
  setTxt("v-mcmotion", mc.motion || "—");
  setTxt("v-mchook", mc.hook || "—");
  if(state.counterMelody && state.counterMelody.voice){
    setTxt("v-counter", state.counterMelody.voice + " · " + state.counterMelody.direction);
  } else {
    setTxt("v-counter", "— roll to add a second line");
  }
  const counterRelSel=$("counterRelSel"); if(counterRelSel) counterRelSel.value = state.counterMelodyRelation || "supports";
  if(state.voiceConcept && state.voiceConcept.voice){
    setTxt("v-voiceconcept", state.voiceConcept.voice + " · " + state.voiceConcept.movement);
  } else {
    setTxt("v-voiceconcept", "— roll to add a second voice");
  }
  const voiceRelSel=$("voiceRelSel"); if(voiceRelSel) voiceRelSel.value = state.voiceRelation || "supports";
  setTxt("v-ctitle", state.concept.title || "—");
  ["world","location","visual","narrative","sensation","event","conflict","crowd","transform"].forEach(k=>{
    setTxt("v-c"+k, state.concept[k] || "—");
  });
  setTxt("v-arrangement", state.arrangement || "—");
  const durationSel=$("durationSel"); if(durationSel) durationSel.value = state.duration;
  const chordProgDisplay=$("chordProgDisplay"); if(chordProgDisplay) chordProgDisplay.textContent = state.chordProg || "—";
  const instToggle=$("instrumentalToggle"), vocalToggle=$("vocalToggle");
  if(instToggle) instToggle.classList.toggle("on", state.instrumental);
  if(vocalToggle) vocalToggle.classList.toggle("on", state.vocalMode);
  const modeNote=$("modeNote");
  if(modeNote) modeNote.textContent = state.instrumental
    ? "Instrumental safety is ON — all vocal content is stripped automatically."
    : (state.vocalMode ? "Vocal mode ON — vocal direction will appear in prompts." : "No vocal content will be generated.");
  renderLayers();
  document.querySelectorAll("[data-lock]").forEach(btn=>{
    const k = btn.getAttribute("data-lock");
    const locked = state.locks[k];
    btn.classList.toggle("locked", locked);
    btn.textContent = locked ? "🔒" : "🔓";
  });
  document.querySelectorAll("[data-hide]").forEach(btn=>{
    const k = btn.getAttribute("data-hide");
    const hidden = state.hidden[k];
    btn.classList.toggle("off", hidden);
    btn.textContent = hidden ? "🙈" : "👁";
  });
  CARD_IDS.forEach(id=>{
    const card = $(id);
    if(card) card.classList.toggle("hidden", state.hidden[id]);
  });
  ["Melody","Bass"].forEach(which=>{
    const key = which==="Melody" ? "microMelody" : "microBass";
    const on = state[key] && state[key]!=="off";
    const btn = $("micro"+which+"Btn"), sel = $("micro"+which+"Sel"), read = $("micro"+which+"Read");
    if(btn) btn.classList.toggle("on", !!on);
    if(on && state[key]) lastMicro[key] = state[key];
    if(sel){ sel.value = on ? state[key] : (lastMicro[key]||"quarter"); sel.disabled = !on; }
    if(read) read.textContent = on ? (microOf(state[key]).cents>0?"+":"")+microOf(state[key]).cents.toFixed(1)+" cents" : "12-TET (off)";
  });
  renderArc();
  renderTechnoDna();
  renderScore();
  renderAB();
  renderRhythmGrid();
  renderPresets();
  renderOutput();
  renderVariations();
  const maxRollScore=$("maxRollScore"); if(maxRollScore) maxRollScore.textContent = scorePrompt().total;
  const structToggle=$("structToggle");
  if(structToggle) structToggle.classList.toggle("on", !!state.structure);
  const hiddenChip=$("hiddenChip");
  if(hiddenChip){
    let n = 0;
    STYLE_PROMPT_SECTIONS.forEach(id=>{ if(state.hidden[id]) n++; });
    if(state.hidden.bpm) n++;
    if(state.hidden.key) n++;
    hiddenChip.textContent = n ? "👁 " + n + " hidden from description — click to show" : "👁 all sections visible";
    hiddenChip.classList.toggle("dim", n>0);
  }
  const styleFocusBtn=$("styleFocusBtn");
  if(styleFocusBtn){
    styleFocusBtn.textContent = stylePromptFocus ? "🌐 Show all" : "📄 Prompt view";
    styleFocusBtn.title = stylePromptFocus ? "Show every card again" : "Hide every card whose settings do not appear in the Description";
  }
}
function renderLayers(){
  const wrap = $("layerToggles"); if(!wrap) return;
  wrap.innerHTML = "";
  LAYERS.forEach(l=>{
    const el = document.createElement("span");
    el.className = "toggle" + (state.layers[l.id] ? " on" : "");
    el.innerHTML = '<span class="led"></span>' + l.label;
    el.addEventListener("click", ()=>toggleLayer(l.id));
    wrap.appendChild(el);
  });
}
function renderOutput(){
  let text;
  if(currentTab==="style") text = buildStylePrompt();
  else if(currentTab==="brief") text = buildFullBrief();
  else if(currentTab==="eng") text = buildEngineer();
  else text = buildKit();
  const limit = currentTab==="style" ? 1000 : (currentTab==="brief" ? 3000 : 8000);
  let html = escapeHtml(text);
  const secs = (currentTab==="kit"||currentTab==="eng")
    ? ["STYLE PROMPT:","FULL BRIEF:","ENERGY ARC:","VOCAL POLICY:","ENGINEER NOTES:","DJ NOTES:","KEY:","TEMPO:","LOW END:","SIDECHAIN:","STEREO:","MASTER:","CUE:","MIX RANGE:","SLOT:","REFERENCE:"]
    : ["STYLE:","EMOTION:","MELODY CONCEPT:","MELODY:","HARMONY:","BASS:","DRUMS:","ENERGY ARC:","MIX &amp; DETAIL:","VOCAL POLICY:","VOCAL:"];
  secs.forEach(s=>{ html = html.replace(new RegExp(escapeRe(s),'g'), '<span class="sec">'+s+'</span>'); });
  const outbox = $("outbox");
  if(outbox) outbox.innerHTML = html;
  const counter = $("counter");
  if(counter){
    counter.textContent = text.length + " / " + limit + " chars";
    counter.classList.toggle("over", text.length > limit);
    counter.classList.toggle("good", currentTab==="style" && text.length<=1000 && text.length>=400);
  }
}
function renderVariations(){
  const list = $("variList");
  if(!list) return;
  if(!state.variations.length){
    list.innerHTML = '<div class="vcard"><div class="vbody dim">Hit "Generate 3 variations" (or ⚡ Power roll) to roll three alternative ideas, then apply the best one.</div></div>';
    return;
  }
  list.innerHTML = "";
  state.variations.forEach((v,i)=>{
    const sp = buildStylePromptFor(v);
    const sc = scoreFor(v);
    const card = document.createElement("div");
    card.className = "vcard";
    card.innerHTML =
      '<div class="vhead"><span class="vtitle">#'+(i+1)+' · '+escapeHtml((v.concept&&v.concept.title)||"Untitled")+'</span>'+
      '<span class="vscore '+scoreClass(sc.total)+'">'+sc.total+'/100</span>'+
      '<span class="vsub">'+escapeHtml(v.primaryStyle)+' · '+v.bpm+' BPM · '+sp.length+' chars</span></div>'+
      '<div class="vbody">'+escapeHtml(sp)+'</div>'+
      '<div class="vactions">'+
        '<button class="sm" data-apply-var="'+i+'">Apply this one</button>'+
        '<button class="sm ghost" data-copy-var="'+i+'">Copy</button>'+
      '</div>';
    list.appendChild(card);
  });
}
function renderScore(){
  const box = $("scoreBox"); if(!box) return;
  const {total, items} = scorePrompt();
  const st = $("scoreTotal");
  if(st){ st.textContent = total; st.className = "scoretotal " + scoreClass(total); }
  box.innerHTML = items.map(i=>
    '<div class="scorerow">'+
      '<span class="sname">'+escapeHtml(i.label)+'</span>'+
      '<span class="sbar"><span class="sfill '+scoreClass(i.score)+'" style="width:'+i.score+'%"></span></span>'+
      '<span class="snum '+scoreClass(i.score)+'">'+i.score+'</span>'+
      '<span class="snote">'+escapeHtml(i.note)+'</span>'+
    '</div>').join("");
}
function renderArc(){
  const wrap = $("arcBox"); if(!wrap) return;
  const arc = energyArc();
  wrap.innerHTML = arc.map(s=>
    '<div class="arcseg" title="'+escapeHtml(s.name+" · "+s.bars+" bars · starts "+s.startLabel)+'" style="flex:'+s.bars+'">'+
      '<div class="arcbar"><div class="arcfill" style="height:'+s.energy+'%"></div></div>'+
      '<div class="arcname">'+escapeHtml(s.name)+'</div>'+
      '<div class="arcmeta">'+s.bars+'b</div>'+
    '</div>').join("");
  const tot = $("arcTotal");
  if(tot) tot.textContent = fmtTime(arcTotalSec()) + " · " + arc.reduce((a,s)=>a+s.bars,0) + " bars · " + (state.bpm||140) + " BPM";
}
function renderTechnoDna(){
  const box = $("technoDnaBox"); if(!box) return;
  const items=[
    {n:"Drive", v:state.driveAmt||75},
    {n:"Acid", v:state.acidAmt||60},
    {n:"Texture", v:Math.min(100, (state.technoTexture||"").length*2+40)},
    {n:"Rave", v:Math.min(100, (state.technoRave||"").length*2+50)},
    {n:"Industrial", v:Math.min(100, (state.technoIndustrial||"").length*2+45)}
  ];
  box.innerHTML = items.map(it=>'<div class="seg"><div class="bar"><div class="fill" style="height:'+it.v+'%"></div></div><div class="nm">'+it.n+'</div><div class="pc">'+it.v+'%</div></div>').join("");
  const read = $("technoDnaRead");
  if(read) read.textContent = "DNA: " + items.map(i=>i.n+":"+i.v+"%").join(" · ") + " — " + (state.techOnly ? "TECHNO-ONLY MODE" : "no-techno genre mode");
}
function renderRhythmGrid(){
  const grid = $("rhythmGrid"); if(!grid) return;
  if(!state.rhythmGrid || state.rhythmGrid.length!==16) state.rhythmGrid=Array.from({length:16},()=>rng()>0.4);
  grid.innerHTML = "";
  state.rhythmGrid.forEach((on,i)=>{
    const cell = document.createElement("div");
    cell.className = "rhythmCell"+(on?" on":"");
    cell.textContent = (i+1);
    cell.title = "Step "+(i+1);
    cell.addEventListener("click", ()=>{
      state.rhythmGrid[i] = !state.rhythmGrid[i];
      renderRhythmGrid();
      afterChange();
    });
    grid.appendChild(cell);
  });
  const st = $("rhythmStatus");
  if(st) st.textContent = state.rhythmGrid.filter(Boolean).length+"/16 steps on · "+(state.rhythmPattern||"custom");
}

/* ---------------------------- ACTIONS ---------------------------- */
function toggleLayer(id){ commit(); state.layers[id] = !state.layers[id]; afterChange(); }
function toggleInstrumental(){ commit(); state.instrumental = !state.instrumental; afterChange(); }
function toggleVocal(){ commit(); state.vocalMode = !state.vocalMode; afterChange(); }
function toggleStyleFit(){
  commit();
  state.styleFit = !state.styleFit;
  afterChange();
  toast(state.styleFit ? "🎚 Style-fit ON — sounds auto-tune to the genre on no-techno rolls" : "🎚 Style-fit OFF — sounds stay exactly as rolled");
}
function toggleHide(key){ commit(); state.hidden[key] = !state.hidden[key]; afterChange(); }
function showAllSections(){
  commit();
  Object.keys(state.hidden).forEach(k=>state.hidden[k]=false);
  stylePromptFocus = false;
  afterChange();
  toast("👁 All sections shown");
}
function applyStylePromptFocus(){
  for(const id of CARD_IDS){
    if(!STYLE_PROMPT_SECTIONS.has(id)) state.hidden[id] = true;
  }
}
function toggleStylePromptFocus(){
  commit();
  stylePromptFocus = !stylePromptFocus;
  for(const id of CARD_IDS){
    if(stylePromptFocus){
      if(!STYLE_PROMPT_SECTIONS.has(id)) state.hidden[id] = true;
    } else {
      state.hidden[id] = false;
    }
  }
  afterChange();
  toast(stylePromptFocus ? "🎯 Prompt view — non-prompt sections hidden" : "👁 All sections shown");
}

/* ---------------------------- ESCAPE / TOAST ---------------------------- */
function escapeHtml(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\&]/g,'\\$&'); }
let toastTimer;
function toast(msg){
  const t = $("toast"); if(!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove("show"), 1800);
}
function copyText(text, label){
  const done = ()=>toast((label||"")+" copied ✓ ("+text.length+" chars)");
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done){
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ document.execCommand("copy"); done(); }catch(e){ toast("Copy failed — select manually"); }
  document.body.removeChild(ta);
}
function downloadText(filename, text){
  const a = document.createElement("a");
  try{
    if(window.URL && URL.createObjectURL && Blob){
      a.href = URL.createObjectURL(new Blob([text], {type:"text/plain"}));
    } else {
      a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
    }
    a.download = filename;
    a.click();
  }catch(e){
    copyText(text, "Download blocked — copied instead");
  }
}

/* ---------------------------- SHARE URL / PRESETS ---------------------------- */
function encodeState(s){
  const m = {
    sd:s.seed, p:s.primaryStyle, s2:s.secondaryStyle, b:s.bpm, rp:s.rootPc, sc:s.scaleId, f:s.feeling, fl:s.flavor, d:s.direction,
    lv:s.leadVoice, lp:s.leadPerf, ct:s.contour, rh:s.rhythm, h:s.harmony, cc:s.chordColor,
    ar:s.arpeggio, bv:s.bassVoice, bm:s.bassMovement, br:s.bassRel, k:s.kick, ha:s.hats,
    sn:s.snare, pc:s.perc, tm:s.toms, gr:s.groove, sw:s.swing, sy:s.sync, it:s.intensity,
    arng:s.arrangement, td:s.technoDrive, ta:s.technoAcid, tt:s.technoTexture, tr:s.technoRave, ti:s.technoIndustrial, aa:s.acidAmt, da:s.driveAmt, mm:s.microMelody, mb:s.microBass, im:s.instrumental, vm:s.vocalMode, w:s.weirdness, inf:s.influence,
    dur:s.duration, mf:s.melodicForce, to:s.techOnly, eq:s.equalChance, cp:s.concept, mc:s.melodyConcept, ly:s.layers, lk:s.locks, hd:s.hidden, st:s.structure, sf:s.styleFit,
    ft:s.filterType, et:s.envelopeType, lt:s.lfoType, dt:s.distortionType, rt:s.reverbType, dlt:s.delayType, sct:s.sidechainType, stt:s.stereoType, fx:s.fxChain, cprog:s.chordProg, rpat:s.rhythmPattern, sint:s.soundIntensity, rg:s.rhythmGrid,
    mixDensity:s.mixDensity, mixEnergy:s.mixEnergy, mixSpace:s.mixSpace, mixGlue:s.mixGlue, mixPunch:s.mixPunch,
    masterDrive:s.masterDrive, masterLoudness:s.masterLoudness, masterColor:s.masterColor, masterChain:s.masterChain,
    stereoImage:s.stereoImage, stereoWidth:s.stereoWidth, spatialDepth:s.spatialDepth, spatialMovement:s.spatialMovement,
    modSource:s.modSource, modDest:s.modDest, modRate:s.modRate, modDepth:s.modDepth,
    textureLayer:s.textureLayer, grainType:s.grainType, shimmerType:s.shimmerType, atmosphereType:s.atmosphereType,
    ghostNotes:s.ghostNotes, humanizeType:s.humanizeType, pocketType:s.pocketType,
    ornamentType:s.ornamentType, vibratoType:s.vibratoType, portamentoType:s.portamentoType, scaleRun:s.scaleRun, intervalLeap:s.intervalLeap,
    voicingType:s.voicingType, inversionType:s.inversionType, tensionType:s.tensionType, resolutionType:s.resolutionType,
    rideType:s.rideType, crashType:s.crashType, clapLayer:s.clapLayer, percFill:s.percFill,
    fxType:s.fxType, transitionType:s.transitionType, riserType:s.riserType, impactType:s.impactType,
    sectionDensity:s.sectionDensity, energyCurve:s.energyCurve, buildType:s.buildType, dropType:s.dropType, chopType:s.chopType,
    filterCutoff:s.filterCutoff, filterResonance:s.filterResonance, reverbSize:s.reverbSize, reverbDecay:s.reverbDecay, delayTime:s.delayTime, delayFeedback:s.delayFeedback,
    saturationType:s.saturationType, compressionType:s.compressionType, eqType:s.eqType, sidechainCurve:s.sidechainCurve, stereoEnhance:s.stereoEnhance,
    cm:s.counterMelody, cmr:s.counterMelodyRelation, vc:s.voiceConcept, vr:s.voiceRelation,
    cw:s.concept&&s.concept.world, cl:s.concept&&s.concept.location, cv:s.concept&&s.concept.visual, cn:s.concept&&s.concept.narrative,
    cse:s.concept&&s.concept.sensation, ce:s.concept&&s.concept.event, ccf:s.concept&&s.concept.conflict, ccr:s.concept&&s.concept.crowd, ct2:s.concept&&s.concept.title, ctr:s.concept&&s.concept.transform
  };
  const json = JSON.stringify(m);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decodeState(str){
  try{
    str = str.replace(/-/g,"+").replace(/_/g,"/");
    const json = decodeURIComponent(escape(atob(str)));
    const m = JSON.parse(json);
    const s = defaultState();
    if(m.sd!==undefined) s.seed = m.sd;
    const map = {
      p:"primaryStyle", s2:"secondaryStyle", b:"bpm", rp:"rootPc", sc:"scaleId", f:"feeling", fl:"flavor", d:"direction",
      lv:"leadVoice", lp:"leadPerf", ct:"contour", rh:"rhythm", h:"harmony", cc:"chordColor",
      ar:"arpeggio", bv:"bassVoice", bm:"bassMovement", br:"bassRel", k:"kick", ha:"hats",
      sn:"snare", pc:"perc", tm:"toms", gr:"groove", sw:"swing", sy:"sync", it:"intensity",
      arng:"arrangement", td:"technoDrive", ta:"technoAcid", tt:"technoTexture", tr:"technoRave", ti:"technoIndustrial", aa:"acidAmt", da:"driveAmt", mm:"microMelody", mb:"microBass", im:"instrumental", vm:"vocalMode", w:"weirdness", inf:"influence", dur:"duration", mf:"melodicForce", to:"techOnly", eq:"equalChance",
      ft:"filterType", et:"envelopeType", lt:"lfoType", dt:"distortionType", rt:"reverbType", dlt:"delayType", sct:"sidechainType", stt:"stereoType", fx:"fxChain", cprog:"chordProg", rpat:"rhythmPattern", sint:"soundIntensity", rg:"rhythmGrid",
      mixDensity:"mixDensity", mixEnergy:"mixEnergy", mixSpace:"mixSpace", mixGlue:"mixGlue", mixPunch:"mixPunch",
      masterDrive:"masterDrive", masterLoudness:"masterLoudness", masterColor:"masterColor", masterChain:"masterChain",
      stereoImage:"stereoImage", stereoWidth:"stereoWidth", spatialDepth:"spatialDepth", spatialMovement:"spatialMovement",
      modSource:"modSource", modDest:"modDest", modRate:"modRate", modDepth:"modDepth",
      textureLayer:"textureLayer", grainType:"grainType", shimmerType:"shimmerType", atmosphereType:"atmosphereType",
      ghostNotes:"ghostNotes", humanizeType:"humanizeType", pocketType:"pocketType",
      ornamentType:"ornamentType", vibratoType:"vibratoType", portamentoType:"portamentoType", scaleRun:"scaleRun", intervalLeap:"intervalLeap",
      voicingType:"voicingType", inversionType:"inversionType", tensionType:"tensionType", resolutionType:"resolutionType",
      rideType:"rideType", crashType:"crashType", clapLayer:"clapLayer", percFill:"percFill",
      fxType:"fxType", transitionType:"transitionType", riserType:"riserType", impactType:"impactType",
      sectionDensity:"sectionDensity", energyCurve:"energyCurve", buildType:"buildType", dropType:"dropType", chopType:"chopType",
      filterCutoff:"filterCutoff", filterResonance:"filterResonance", reverbSize:"reverbSize", reverbDecay:"reverbDecay", delayTime:"delayTime", delayFeedback:"delayFeedback",
      saturationType:"saturationType", compressionType:"compressionType", eqType:"eqType", sidechainCurve:"sidechainCurve", stereoEnhance:"stereoEnhance",
      cm:"counterMelody", cmr:"counterMelodyRelation", vc:"voiceConcept", vr:"voiceRelation"};
    for(const short in map){ if(m[short]!==undefined) s[map[short]] = m[short]; }
    if(m.st!==undefined) s.structure = !!m.st;
    if(m.sf!==undefined) s.styleFit = !!m.sf;
    if(m.cp) s.concept = Object.assign(s.concept, m.cp);
    if(m.mc) s.melodyConcept = Object.assign(s.melodyConcept, m.mc);
    if(m.ly) s.layers = m.ly;
    if(m.lk){ s.locks = defaultLocks(); Object.assign(s.locks, m.lk); }
    if(m.hd){ s.hidden = defaultHidden(); Object.assign(s.hidden, m.hd); }
    return s;
  }catch(e){ return null; }
}
function updateURL(){
  const enc = encodeState(state);
  const url = location.pathname + "?s=" + enc;
  try{ history.replaceState(null, "", url); }catch(e){}
}
function shareURL(){
  const enc = encodeState(state);
  const url = location.origin + location.pathname + "?s=" + enc;
  copyText(url, "Share link");
}
function loadPresets(){ try{ return JSON.parse(localStorage.getItem("nf2_presets")||"{}"); }catch(e){ return {}; } }
function savePresets(p){ try{ localStorage.setItem("nf2_presets", JSON.stringify(p)); }catch(e){ toast("localStorage unavailable"); } }
function renderPresets(){
  const wrap = $("presetList"); if(!wrap) return;
  wrap.innerHTML = "";
  const presets = loadPresets();
  const keys = Object.keys(presets);
  if(!keys.length){ wrap.innerHTML = '<span class="readout">No presets saved yet.</span>'; return; }
  keys.forEach(name=>{
    const del = document.createElement("span");
    del.className = "toggle"; del.textContent = "✕"; del.title = "Delete preset";
    del.addEventListener("click", ()=>{
      const p = loadPresets(); delete p[name]; savePresets(p); renderPresets(); toast("Deleted "+name);
    });
    wrap.appendChild(del);
    const el = document.createElement("span");
    el.className = "toggle"; el.innerHTML = '<span class="led"></span>'+escapeHtml(name);
    el.title = "Load preset";
    el.addEventListener("click", ()=>{
      commit(); state = decodeState(presets[name]); rng = mulberry32(state.seed); afterChange(); toast("📂 Loaded "+name);
    });
    wrap.appendChild(el);
  });
}
function savePreset(){
  const name = $("presetName").value.trim();
  if(!name){ toast("Enter a preset name"); return; }
  const presets = loadPresets();
  presets[name] = encodeState(state);
  savePresets(presets);
  $("presetName").value = "";
  renderPresets();
  toast("💾 Saved preset: "+name);
}
function saveAuto(){ try{ localStorage.setItem("nf2_last", encodeState(state)); }catch(e){} }

/* ---------------------------- HISTORY ---------------------------- */
const HISTORY_KEY = "nf2_history";
const MAX_HISTORY_ITEMS = 40;
let history = loadHistory();
function loadHistory(){ try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]"); }catch(e){ return []; } }
function saveHistory(){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }catch(e){} }
function addHistory(kind, promptText, s){
  const c = s.concept || {};
  history.unshift({
    t: Date.now(),
    kind: kind,
    label: (c.title || "Untitled") + " — " + (s.primaryStyle || "Techno"),
    enc: encodeState(s),
    prompt: promptText
  });
  if(history.length > MAX_HISTORY_ITEMS) history.length = MAX_HISTORY_ITEMS;
  saveHistory();
  renderHistory();
}
function clearHistory(){ history = []; saveHistory(); renderHistory(); toast("History cleared"); }
function timeAgo(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if(s < 60) return s+"s ago";
  const m = Math.floor(s/60); if(m < 60) return m+"m ago";
  const h = Math.floor(m/60); if(h < 24) return h+"h ago";
  return Math.floor(h/24)+"d ago";
}
function renderHistory(){
  const wrap = $("historyList"); if(!wrap) return;
  if(!history.length){ wrap.innerHTML = '<div class="readout">Copied and applied ideas will appear here.</div>'; return; }
  wrap.innerHTML = "";
  history.forEach((h,i)=>{
    const item = document.createElement("div");
    item.className = "hitem";
    item.innerHTML =
      '<div class="hhead"><span class="hlabel">'+escapeHtml(h.label)+'</span>'+
      '<span class="hkind">'+escapeHtml(h.kind)+'</span></div>'+
      '<div class="htime">'+timeAgo(h.t)+'</div>'+
      '<div class="hbody">'+escapeHtml(h.prompt)+'</div>'+
      '<div class="hactions">'+
        '<button class="sm" data-hist-load="'+i+'">Load</button>'+
        '<button class="sm ghost" data-hist-copy="'+i+'">Copy</button>'+
      '</div>';
    wrap.appendChild(item);
  });
}

/* ---------------------------- A/B ---------------------------- */
let slotB = null;
function stashB(){
  slotB = encodeState(state);
  try{ localStorage.setItem("nf2_slotb", slotB); }catch(e){}
  renderAB(); toast("📌 Stashed to slot B");
}
function swapAB(){
  if(!slotB){ toast("Nothing in slot B — stash first"); return; }
  const incoming = decodeState(slotB);
  if(!incoming){ toast("Slot B unreadable"); return; }
  const outgoing = encodeState(state);
  commit();
  state = incoming; rng = mulberry32(state.seed);
  slotB = outgoing;
  try{ localStorage.setItem("nf2_slotb", slotB); }catch(e){}
  afterChange(); toast("🔄 Swapped A ⇄ B");
}
function renderAB(){
  const el = $("abInfo"); if(!el) return;
  if(!slotB){ el.textContent = "Slot B empty."; const b=$("swapABBtn"); if(b) b.disabled = true; return; }
  const s = decodeState(slotB);
  const b=$("swapABBtn"); if(b) b.disabled = false;
  el.textContent = s ? (((s.concept&&s.concept.title)||"Untitled") + " · " + s.primaryStyle + " · " + s.bpm + " BPM") : "Slot B unreadable.";
}

/* ---------------------------- MAX ROLL ---------------------------- */
const SECTION_MAX_DEFS = {
  melody: { label:"🎵 Melody", keys:["feeling","flavor","direction","leadVoice","leadPerf","harmony","chordColor","arpeggio","contour","rhythm","melodyConcept","melodyConcept-story","melodyConcept-role","melodyConcept-motion","melodyConcept-hook","counter-melody","counter-relation"] },
  bass: { label:"🔊 Bass", keys:["bassVoice","bassMovement","bassRel"] },
  drums: { label:"🥁 Drums", keys:["kick","hats","snare","perc","toms","groove","swing","sync","intensity"] },
  tempoLab: { label:"⚙️ Tempo & Key", keys:["bpm","key","rootPc","scaleId"] },
  technoLab: { label:"🧪 Techno", keys:["technoDrive","technoAcid","technoTexture","technoRave","technoIndustrial"] },
  harmony: { label:"🎼 Chords", keys:["harmony","chordColor","chordProg","voicingType","inversionType","tensionType","resolutionType"] },
  rhythm: { label:"🥁 Rhythm", keys:["rhythm","rhythmPattern","ghostNotes","humanizeType","pocketType","sectionDensity"] },
  soundDesign: { label:"⚗️ Sound", keys:["filterType","envelopeType","lfoType","distortionType","reverbType","delayType","sidechainType","stereoType","fxChain","soundIntensity"] },
  mixMaster: { label:"🎛 Mix & Master", keys:["mixDensity","mixEnergy","mixSpace","mixGlue","mixPunch","masterDrive","masterLoudness","masterColor","masterChain","filterCutoff","filterResonance","eqType","compressionType","saturationType","sidechainCurve"] },
  spatialMod: { label:"🌌 Spatial", keys:["stereoImage","stereoWidth","spatialDepth","spatialMovement","modSource","modDest","modRate","modDepth","textureLayer","grainType","shimmerType","atmosphereType","reverbSize","reverbDecay","stereoEnhance"] },
  grooveMelodic: { label:"🎼 Groove", keys:["ghostNotes","humanizeType","pocketType","ornamentType","vibratoType","portamentoType","scaleRun","intervalLeap","voicingType","inversionType","tensionType","resolutionType","delayTime","delayFeedback","sectionDensity"] },
  textureFx: { label:"💥 Texture & FX", keys:["rideType","crashType","clapLayer","percFill","fxType","transitionType","riserType","impactType","energyCurve","buildType","dropType","chopType"] }
};
function buildMaxChips(){
  const wrap = $("maxChips"); if(!wrap) return;
  wrap.innerHTML = "";
  Object.keys(SECTION_MAX_DEFS).forEach(k=>{
    const def = SECTION_MAX_DEFS[k];
    const el = document.createElement("button");
    el.className = "toggle";
    el.innerHTML = '<span class="led"></span>' + def.label;
    el.title = "Roll 15 random tries of this part, keep the best score";
    el.addEventListener("click", ()=>doMaxScoreRollSection(def.keys, 15, def.label));
    wrap.appendChild(el);
  });
}
let maxRollRunning = false;
/* When a max/reroll is already running, later calls WAIT for it instead of
   returning undefined — double-clicks and test sequences get a real result. */
let maxRollDone = Promise.resolve();
function startMaxRun(){
  maxRollRunning = true;
  let resolveDone;
  maxRollDone = new Promise(r => { resolveDone = r; });
  return resolveDone;
}
function endMaxRun(doneResolve){ maxRollRunning = false; doneResolve(); }
function yieldUI(){ return new Promise(r=>setTimeout(r, 12)); }
function scoreFor(s){
  const saved = state; state = s;
  const out = scorePrompt();
  state = saved;
  return out;
}
function setMaxStatus(msg){
  const el = $("maxRollStatus"); if(el) el.textContent = msg;
}
/* Never rolled by a max search: the style combo itself, and the Concept /
   Arrangement cards (removed from the prompt — rolling them would churn the
   track title for zero score). */
const NEVER_MAX = new Set(["concept","arrangement","primary","secondary","genre"]);
/* Which ROLL_FN keys a max search may touch, given the starting state:
   skips styles, concept/arrangement, atoms on hidden cards (not in the
   prompt, so they can't help the score) and atoms the user locked. */
function maxSearchKeys(start){
  const out = [];
  for(const k in ROLL_FN){
    if(NEVER_MAX.has(k) || k.startsWith("concept-")) continue;
    if(start.locks && start.locks[k]) continue;
    const at = ATOM_BY_KEY[k];
    if(at && at.card && start.hidden && start.hidden[at.card]) continue;
    out.push(k);
  }
  return out;
}
/* Shared search: tries `attempts` fresh states (styles locked), keeps the
   best Prompt Score. acceptTies lets a re-run always produce a NEW set even
   when the score can't improve — that was the old "max does nothing" bug.
   minScore: candidates below this are only used as a fallback
   (for "re-roll similar"). */
async function runMaxSearch(attempts, opts){
  opts = opts || {};
  const acceptTies = opts.acceptTies !== false;
  const minScore = opts.minScore;
  attempts = attempts || 20;
  const start = snapshot();
  const startScore = scoreFor(start).total;
  const keys = maxSearchKeys(start);
  if(!keys.length){
    toast("🔒 Everything is locked or hidden — nothing to maximize");
    setMaxStatus("Nothing to roll — everything locked or hidden.");
    return {best:start, bestScore:startScore, startScore, attempts:0, adopted:false, keys:0};
  }
  let best = start;
  let bestScore = startScore;
  let bestInTol = null, bestInTolScore = -1;
  let last = null, lastScore = -1;
  for(let i=0;i<attempts;i++){
    await yieldUI();
    const v = snapshot();
    v.variations = [];
    v.seed = newSeed();
    rng = mulberry32(v.seed);
    for(const k of keys) ROLL_FN[k](v);
    if(!v.techOnly && !v.locks.bpm && v.primaryGenre){
      v.bpm = tempoForGenre(v.primaryGenre, v.secondaryGenre); // no-techno: fit tempo to the genre
    }
    const sc = scoreFor(v).total;
    last = v; lastScore = sc;
    if(sc > bestScore || (acceptTies && sc === bestScore)){
      best = v; bestScore = sc;
      if(opts.onProgress) opts.onProgress(bestScore, i+1, attempts);
    }
    if(minScore !== undefined && sc >= minScore && sc > bestInTolScore){
      bestInTol = v; bestInTolScore = sc;
    }
  }
  /* adopt a fresh set even if it only ties — that's what makes re-runs move.
     BUT never adopt a set below minScore (the downgrade tolerance): if no
     candidate reached it, keep the current state — "max" must not make the
     prompt worse. */
  let final = best, finalScore = bestScore;
  let adopted = bestScore > startScore || (acceptTies && bestScore === startScore && best !== start);
  if(opts.alwaysFresh && best === start){
    if(bestInTol){
      final = bestInTol; finalScore = bestInTolScore; adopted = true;
    } else {
      final = start; finalScore = startScore; adopted = false;
    }
  } else if(bestInTol && bestInTolScore > bestScore){
    final = bestInTol; finalScore = bestInTolScore;
  }
  try{ final.locks = JSON.parse(JSON.stringify(start.locks)); }catch(e){ final.locks = start.locks; }
  try{ final.hidden = JSON.parse(JSON.stringify(start.hidden)); }catch(e){ final.hidden = start.hidden; }
  try{ final.layers = JSON.parse(JSON.stringify(start.layers)); }catch(e){ final.layers = start.layers; }
  final.variations = [];
  state = final;
  rng = mulberry32(state.seed);
  return {best:final, bestScore:finalScore, startScore, attempts, adopted, keys:keys.length};
}
async function doMaxScoreRoll(attempts){
  if(maxRollRunning){ toast("⏳ Max roll already running — queued behind it…"); return await maxRollDone; }
  attempts = attempts || 20;
  const doneResolve = startMaxRun();
  try {
    commit();
    const startScore = scoreFor(state).total;
    const btns = ["maxScoreBtn","maxTurboBtn","rerollSimilarBtn"].map(id=>$(id)).filter(Boolean);
    const origTexts = btns.map(b=>b.textContent);
    btns.forEach(b=>{ b.disabled=true; b.textContent="⏳ "+startScore; });
    setMaxStatus("Searching "+attempts+" combos — styles locked");
    toast("🏆 Searching "+attempts+" combos — styles locked: "+(state.primaryStyle||"")+" / "+(state.secondaryStyle||"none"));
    const res = await runMaxSearch(attempts, {
      minScore: startScore - 2, // never downgrade more than 2 — but always move when a near-equal set exists
      alwaysFresh: true,
      onProgress: (sc, i, n)=>{ setMaxStatus("Best "+sc+"/100 at "+i+"/"+n); btns.forEach(b=>{ if(b) b.textContent="⏳ "+sc+" ("+i+"/"+n+")"; }); }
    });
    afterChange();
    flash($("scoreCard"));
    btns.forEach((b,i)=>{ b.disabled=false; b.textContent=origTexts[i]||b.textContent; });
    const delta = res.bestScore - res.startScore;
    if(res.adopted === false){
      setMaxStatus("Kept the current set at "+res.bestScore+"/100 — no candidate within 2 points in "+res.attempts+" tries (styles kept: "+(state.primaryStyle||"")+" / "+(state.secondaryStyle||"none")+")");
      toast("🏆 Already at "+res.bestScore+" /100 — nothing within 2 points found; current set kept");
    } else {
      setMaxStatus("Best "+res.bestScore+"/100 after "+res.attempts+" tries — styles kept: "+(state.primaryStyle||"")+" / "+(state.secondaryStyle||"none")+(delta>0 ? " (+"+delta+")" : ""));
      toast("🏆 Best score "+res.bestScore+" /100"+(delta>0 ? " (was "+res.startScore+", +"+delta+")" : " — fresh set at the same score")+" — "+state.primaryStyle+" + "+(state.secondaryStyle||"no secondary")+" after "+res.attempts+" tries");
    }
    return res.bestScore;
  } finally {
    endMaxRun(doneResolve);
  }
}
/* NEW: re-roll a fresh set with a similar score — everything rolls again
   EXCEPT primary + secondary styles. Always adopts a new set, even when the
   score only ties (that's the point: you get another idea with the same
   quality). */
async function doReRollSimilar(attempts, tolerance){
  if(maxRollRunning){ toast("⏳ Max roll already running — queued behind it…"); return await maxRollDone; }
  attempts = attempts || 25;
  const tol = (tolerance === undefined) ? 5 : tolerance;
  const doneResolve = startMaxRun();
  try {
    commit();
    const startScore = scoreFor(state).total;
    const btn = $("rerollSimilarBtn");
    const origText = btn ? btn.textContent : "";
    if(btn){ btn.disabled = true; btn.textContent = "⏳ "+startScore; }
    setMaxStatus("Re-rolling "+attempts+" fresh sets — styles locked, aiming within "+tol+" of "+startScore);
    toast("🎲 Re-rolling "+attempts+" fresh sets — keeping "+((state.primaryStyle||"")+" / "+(state.secondaryStyle||"none"))+" — target ≥ "+(startScore-tol)+"/100");
    const res = await runMaxSearch(attempts, {
      minScore: startScore - tol,
      alwaysFresh: true,
      onProgress: (sc, i, n)=>{ setMaxStatus("Similar-score search "+i+"/"+n+" — best "+sc+"/100 (target ≥ "+(startScore-tol)+")"); if(btn) btn.textContent="⏳ "+sc+" ("+i+"/"+n+")"; }
    });
    afterChange();
    flash($("scoreCard"));
    if(btn){ btn.disabled = false; btn.textContent = origText; }
    const delta = res.bestScore - res.startScore;
    if(res.adopted === false){
      setMaxStatus("Kept the current set at "+res.bestScore+"/100 — nothing within "+tol+" points in "+res.attempts+" tries");
      toast("🎲 No similar-score set found within "+tol+" points — current set kept ("+state.primaryStyle+" / "+(state.secondaryStyle||"none")+")");
    } else {
      setMaxStatus("Fresh set at "+res.bestScore+"/100 (was "+res.startScore+") after "+res.attempts+" tries — styles kept: "+state.primaryStyle+" / "+(state.secondaryStyle||"none"));
      toast("🎲 Fresh set at "+res.bestScore+" /100"+(delta>=0 ? " (same or better)" : " — "+delta+" vs before")+" · styles kept — "+state.primaryStyle+" + "+(state.secondaryStyle||"no secondary"));
    }
    return {score:res.bestScore, startScore, delta, attempts:res.attempts};
  } finally {
    endMaxRun(doneResolve);
  }
}
async function doMaxScoreRollSection(sectionKeys, attempts, label){
  if(maxRollRunning){ toast("⏳ Max roll already running — queued behind it…"); return await maxRollDone; }
  attempts = attempts || 15;
  const doneResolve = startMaxRun();
  try {
    commit();
    const bestStart = snapshot();
    /* only roll keys that are real, unlocked, and on a visible card */
    const keys = sectionKeys.filter(k => ROLL_FN[k] && !bestStart.locks[k] && !(ATOM_BY_KEY[k] && ATOM_BY_KEY[k].card && bestStart.hidden[ATOM_BY_KEY[k].card]));
    if(!keys.length){
      toast("🔒 "+label+" is fully locked or hidden — nothing to maximize");
      setMaxStatus(label+" — everything locked or hidden.");
      return scoreFor(bestStart).total;
    }
    let best = bestStart;
    let bestScore = scoreFor(bestStart).total;
    const btnIds = ["max"+label.replace(/\s+/g,"")+"Btn", "max"+label.replace(/\s+/g,"")+"Btn2"];
    const btns = btnIds.map(id=>$(id)).filter(Boolean);
    const origTexts = btns.map(b=>b.textContent);
    btns.forEach(b=>{ b.disabled=true; b.textContent="⏳ "+bestScore; });
    setMaxStatus("Max "+label+": "+attempts+" tries…");
    toast("🏆 Max "+label+": "+attempts+" tries…");
    for(let i=0;i<attempts;i++){
      await yieldUI();
      const v = snapshot();
      v.variations = [];
      v.seed = newSeed();
      rng = mulberry32(v.seed);
      for(const k of keys) ROLL_FN[k](v);
      const sc = scoreFor(v).total;
      if(sc > bestScore || sc === bestScore){ // ties adopted → re-runs always move
        best = v;
        bestScore = sc;
        btns.forEach(b=>{ if(b) b.textContent="⏳ "+bestScore+" ("+(i+1)+"/"+attempts+")"; });
        setMaxStatus(label+" best "+bestScore+" ("+(i+1)+"/"+attempts+")");
      }
    }
    try{ best.locks = JSON.parse(JSON.stringify(bestStart.locks)); }catch(e){ best.locks = bestStart.locks; }
    try{ best.hidden = JSON.parse(JSON.stringify(bestStart.hidden)); }catch(e){ best.hidden = bestStart.hidden; }
    try{ best.layers = JSON.parse(JSON.stringify(bestStart.layers)); }catch(e){ best.layers = bestStart.layers; }
    best.variations = [];
    state = best;
    rng = mulberry32(state.seed);
    afterChange();
    const l = label.toLowerCase();
    if(l.includes("melody")) flash($("feelCard"));
    else if(l.includes("bass")) flash($("bassCard"));
    else if(l.includes("tempo")||l.includes("bpm")||l.includes("key")) flash($("styleCard"));
    else if(l.includes("techno")||l.includes("lab")) flash($("technoLabCard"));
    else if(l.includes("concept")) flash($("conceptCard"));
    else if(l.includes("arrange")) flash($("arrangementCard"));
    else if(l.includes("drum")) flash($("drumsCard"));
    else if(l.includes("rhythm")) flash($("rhythmLabCard"));
    else if(l.includes("harmony")||l.includes("chord")) flash($("harmonyLabCard"));
    else if(l.includes("sound")) flash($("soundDesignCard"));
    else flash($("scoreCard"));
    btns.forEach((b,i)=>{ b.disabled=false; b.textContent=origTexts[i]||("🏆 Max "+label); });
    setMaxStatus("Best "+label+" → "+bestScore+"/100 after "+attempts+" tries");
    toast("🏆 Best "+label+" → "+bestScore+" /100 after "+attempts+" tries");
    return bestScore;
  } finally {
    endMaxRun(doneResolve);
  }
}
async function doMaxTurbo(attempts){ attempts = attempts||100; return await doMaxScoreRoll(attempts); }
async function doMaxMelodyDominant(attempts){
  const score = await doMaxScoreRollSection(["feeling","flavor","direction","leadVoice","leadPerf","harmony","chordColor","arpeggio","contour","rhythm","melodyConcept","melodyConcept-story","melodyConcept-role","melodyConcept-motion","melodyConcept-hook","counter-melody","counter-relation"], attempts||25, "Melody");
  if(score !== undefined && !maxRollRunning){
    state.melodicForce = "dominant";
    if(!state.concept.title) state.concept.title = pick(SPARK_ANTHEM_NAMES);
    if(!state.concept.transform) state.concept.transform = pick(SPARK_TRANSFORMS);
    afterChange();
  }
  return score;
}
function resetMaxState(){
  maxRollRunning = false;
  maxRollDone = Promise.resolve(); // release any queued awaiters
  const btns = document.querySelectorAll("#maxRollLabCard button, #scoreCard button");
  btns.forEach(b=>b.disabled=false);
  setMaxStatus("Reset — all max locks cleared");
  toast("🔓 Max state reset — you can roll again");
}

/* ---------------------------- DNA PRESETS (one-click techno flavors) ---------------------------- */
function pickMatching(pool, re){
  if(!pool || !pool.length) return "";
  const f = pool.filter(x=>re.test(String(x).toLowerCase()));
  return (f.length ? f[Math.floor(Math.random()*f.length)] : pool[Math.floor(Math.random()*pool.length)]);
}
function pickScaleByMood(re){
  const f = SCALES.filter(s=>re.test((s.mood||"").toLowerCase()));
  if(f.length) return f[Math.floor(Math.random()*f.length)];
  const ae = SCALES.find(s=>s.id==="aeolian");
  return ae || SCALES[0];
}
function applyDna(name){
  commit(); beginRoll();
  const s = state;
  s.techOnly = true;
  unhideAllSoundCards(); // DNA is a techno preset — bring every sound card back
  const roll = (k)=>{ if(!s.locks[k] && ROLL_FN[k]) ROLL_FN[k](s); };
  const set = (k,v)=>{ if(!s.locks[k]) s[k]=v; };
  if(name==="hard"){
    set("bpm", 150 + Math.floor(rng()*9));
    set("driveAmt", 100); set("acidAmt", 80);
    set("intensity", pickMatching(INTENSITIES,/hard|peak|maximum|slam|relentless/));
    set("kick", pickMatching(KICKS,/hard|peak|punch|slam|hammer/));
    set("snare", pickMatching(SNARES,/hard|punch|snap/));
    set("technoDrive", pickMatching(TECHNO_DRIVES,/hard|peak|relentless|brutal|maximum/));
    set("energyCurve", pickMatching(ENERGY_CURVE_TYPES,/peak|max|slam|aggressive/));
    set("dropType", pickMatching(DROP_TYPES,/slam|hard|impact/));
    set("textureLayer", pickMatching(TEXTURE_LAYER,/dense|thick|layer/));
    set("melodicForce", "balanced"); set("duration", "standard");
    s.layers.texture = true; s.layers.fx = true;
    set("technoTexture", pickMatching(TECHNO_TEXTURES,/hard|raw|brutal|metallic/));
  } else if(name==="acid"){
    set("bpm", 140 + Math.floor(rng()*9));
    set("acidAmt", 100); set("driveAmt", 85);
    set("technoAcid", pickMatching(TECHNO_ACIDS,/acid|303|squelch|bubbl|resonant/));
    set("filterType", pickMatching(FILTER_TYPES,/band|resonan|acid/));
    set("lfoType", pickMatching(LFO_TYPES,/filter|acid|sweep|pump/));
    set("groove", pickMatching(GROOVES,/rolling|hypnotic|pulsing/));
    set("swing", pickMatching(SWINGS,/acid|16th|triplet/));
    set("technoTexture", pickMatching(TECHNO_TEXTURES,/acid|squelch|resonan/));
    set("rhythmPattern", pickMatching(RHYTHM_PATTERNS,/acid|16th|rolling/));
    set("melodicForce", "balanced"); set("duration", "standard");
    s.layers.acid = true;
  } else if(name==="melodic"){
    set("bpm", 136 + Math.floor(rng()*7));
    set("melodicForce", "dominant");
    set("feeling", pickMatching(FEELINGS,/euphor|uplift|radiant|bliss|joy|soar/));
    set("flavor", pickMatching(FLAVORS,/radiant|uplift|blazing|euphor/));
    set("leadVoice", pickMatching(LEADS,/lead|pluck|arp|bell|shimmer|vocal/));
    set("harmony", pickMatching(HARMONIES,/major|seventh|plagal|lush|open/));
    set("arpeggio", pickMatching(ARPS,/shimmer|ripple|rising|spark/));
    roll("counter-melody");
    set("duration", "standard");
    s.layers.space = true; s.layers.reverb = true;
  } else if(name==="minimal"){
    set("bpm", 130 + Math.floor(rng()*7));
    set("melodicForce", "light");
    set("intensity", pickMatching(INTENSITIES,/hypnotic|minimal|subtle|driving/));
    set("groove", pickMatching(GROOVES,/hypnotic|rolling|minimal|pumping/));
    set("kick", pickMatching(KICKS,/tight|punch|minimal|boomy/));
    set("hats", pickMatching(HATS,/clean|tight|stripped|hypnotic/));
    set("perc", pickMatching(PERCS,/minimal|sparse|wooden/));
    set("technoTexture", pickMatching(TECHNO_TEXTURES,/hypnotic|minimal|dub/));
    set("duration", "extended");
    Object.keys(s.layers).forEach(k=>s.layers[k]=false);
  } else if(name==="dark"){
    set("bpm", 142 + Math.floor(rng()*7));
    const sc = pickScaleByMood(/dark|minor|grief|tragic|haunt/);
    set("scaleId", sc.id); set("chordColor", sc.n);
    set("technoIndustrial", pickMatching(TECHNO_INDUSTRIALS,/industrial|dark|brutal|grinding|metallic|machin/));
    set("technoTexture", pickMatching(TECHNO_TEXTURES,/industrial|dark|raw/));
    set("reverbType", pickMatching(REVERB_TYPES,/dark|cavern|hall|cathedral/));
    set("distortionType", pickMatching(DISTORTION_TYPES,/hard|heavy|overdrive|crush/));
    set("intensity", pickMatching(INTENSITIES,/brutal|dark|relentless|aggressive/));
    set("driveAmt", 90); set("acidAmt", 60);
    set("melodicForce", "strong");
    s.layers.experimental = true; s.layers.fx = true;
  } else { // surprise — pure chaos within the techno world
    ["technoLab","drums","feel-melody","key","grooveMelodic","textureFx","soundDesign"].forEach(g=>{
      const keys = GROUPS[g] || [g];
      keys.forEach(k=>roll(k));
    });
    set("melodicForce", ["light","balanced","strong","dominant"][Math.floor(rng()*4)]);
    set("duration", ["compact","standard","extended"][Math.floor(rng()*3)]);
    set("bpm", 132 + Math.floor(rng()*26));
  }
  afterChange();
  toast("⚡ DNA: " + DNA_PRESETS[name].label + " — " + DNA_PRESETS[name].desc);
  return name;
}
function buildDnaChips(){
  const wrap = $("dnaPresets"); if(!wrap) return;
  wrap.innerHTML = "";
  Object.keys(DNA_PRESETS).forEach(k=>{
    const el = document.createElement("button");
    el.className = "toggle";
    el.setAttribute("data-dna", k);
    el.innerHTML = '<span class="led"></span>' + DNA_PRESETS[k].label;
    el.title = DNA_PRESETS[k].desc;
    wrap.appendChild(el);
  });
}
const DNA_PRESETS = {
  hard:    {label:"🔨 HARD",    desc:"150+ BPM peak-time hammer — relentless drive, slamming drops"},
  acid:    {label:"🧪 ACID",    desc:"303 squelch, resonant filters, rolling 16th grooves"},
  melodic: {label:"🎵 MELODIC", desc:"euphoric leads, anthem hooks, melody-dominant"},
  minimal: {label:"▫️ MINIMAL", desc:"hypnotic, stripped-back, rolling for 10+ minutes"},
  dark:    {label:"🌑 DARK",    desc:"industrial, cavernous reverb, brutal percussion"},
  surprise:{label:"🎲 SURPRISE",desc:"full random techno chaos"}
};

/* ---------------------------- IDEA ENGINE ----------------------------
   One button, one idea. Pick a category (or roll random), read the
   spark, use it as the song title, copy it, or save it to the Idea
   Book. Simple on purpose. */
let lastSpark = "", lastSparkKind = "", lastSparkKindLabel = "";
let ideaCat = "random";
const IDEA_CATS = [
  ["random",     "✨ Random"],
  ["title",      "🏷 Title"],
  ["hook",       "🪝 Hook"],
  ["vibe",       "🌊 Vibe"],
  ["scene",      "🗺 Scene"],
  ["constraint", "⛓ Constraint"],
  ["melody",     "🎼 Melody phrase"]
];
const IDEA_POOLS = {
  title:      SPARK_TITLES,
  hook:       SPARK_HOOKS,
  vibe:       SPARK_VIBES,
  scene:      SPARK_PLACES,
  constraint: SPARK_CONSTRAINTS,
  melody:     SPARK_MELODY_PHRASES
};
const IDEA_LABELS = { title:"🏷 Title", hook:"🪝 Hook", vibe:"🌊 Vibe", scene:"🗺 Scene", constraint:"⛓ Constraint", melody:"🎼 Melody phrase" };
function sparkPick(a){ return a[Math.floor(Math.random()*a.length)] || ""; }
function updateIdeaButtons(){
  const canTitle = lastSparkKind === "Title" || lastSparkKind === "Title II";
  const btn = $("sparkTitleApplyBtn");
  if(btn) btn.disabled = !canTitle;
}
function setSpark(text, kind, meta){
  lastSpark = text; lastSparkKind = kind; lastSparkKindLabel = meta;
  const el = $("v-spark"); if(el) el.textContent = text;
  const m = $("sparkMeta"); if(m) m.textContent = meta || "";
  updateIdeaButtons();
}
function buildIdeaChips(){
  const wrap = $("ideaCats"); if(!wrap) return;
  wrap.innerHTML = "";
  IDEA_CATS.forEach(([id, label])=>{
    const el = document.createElement("button");
    el.className = "toggle" + (id === ideaCat ? " on" : "");
    el.innerHTML = '<span class="led"></span>' + label;
    el.addEventListener("click", ()=>{
      ideaCat = id;
      buildIdeaChips();
      ideaRoll(id);
    });
    wrap.appendChild(el);
  });
  const cnt = $("sparkCount");
  if(cnt) cnt.textContent = IDEA_CATS.reduce((a,[id])=>a+(IDEA_POOLS[id]?IDEA_POOLS[id].length:0),0) + " ideas loaded";
}
function ideaRoll(cat){
  cat = cat || ideaCat;
  if(cat === "random"){
    const list = IDEA_CATS.filter(c=>c[0]!=="random");
    cat = list[Math.floor(Math.random()*list.length)][0];
  }
  const pool = IDEA_POOLS[cat];
  if(!pool || !pool.length){ toast("No ideas in that category"); return; }
  const text = sparkPick(pool);
  const kind = cat === "title" ? "Title" : (IDEA_LABELS[cat] || cat);
  setSpark(text, kind, IDEA_LABELS[cat] + " · " + pool.length + " options · tap 🎲 Another one for more");
  return text;
}
const SPARK_KIND_DEFS = [
  ["💡 Idea", SPARK_IDEAS, "Idea"],
  ["🏷 Title", SPARK_TITLES, "Title"],
  ["🧬 Mash-up", SPARK_MASHUPS, "Mash-up"],
  ["⛓ Constraint", SPARK_CONSTRAINTS, "Constraint"],
  ["🛠 Tip", SPARK_TIPS, "Tip"],
  ["🌊 Vibe", SPARK_VIBES, "Vibe"],
  ["🗺 Scene", SPARK_PLACES, "Scene"],
  ["🔩 Object", SPARK_THINGS, "Object"],
  ["🪄 Transform", SPARK_TRANSFORMS, "Transform"],
  ["🎯 Challenge", SPARK_CHALLENGES, "Challenge"],
  ["🎼 Melody Phrase", SPARK_MELODY_PHRASES, "Melody Phrase"],
  ["🪝 Hook", SPARK_HOOKS, "Hook"],
  ["🎚 Bassline", SPARK_BASSLINES, "Bassline"],
  ["🥁 Drum Line", SPARK_DRUM_LINES, "Drum Line"],
  ["🚪 Opener", SPARK_OPENERS, "Opener"],
  ["🧩 Section Spark", SPARK_SECTION_SPARKS, "Section"],
  ["🕶 Style Stunt", SPARK_STYLE_STUNTS, "Style stunt"],
  ["🔀 Genre Scramble", SPARK_GENRE_SCRAMBLES, "Genre scramble"],
  ["🌀 Concept Twist", SPARK_CONCEPT_TWISTS, "Concept twist"],
  ["🗺 Arrangement Pack", SPARK_ARRANGEMENT_PACKS, "Arrangement"],
  ["🎚 Mix Punch", SPARK_MIX_PUNCH, "Mix punch"],
  ["💖 Master Heart", SPARK_MASTER_HEART, "Master heart"],
  ["🔖 Suno Cue", SPARK_SUNO_CUES, "Suno cue"],
  ["🎧 DJ Note", SPARK_DJ_NOTES, "DJ note"],
  ["⚡ Magic", SPARK_MORE_MAGIC_2, "Magic"],
  ["🌦 Weather", SPARK_WEATHER, "Weather"],
  ["🏮 Light", SPARK_LIGHT, "Light"],
  ["🎚 Sound Source", SPARK_SOUNDS, "Sound"],
  ["🔮 Future Scene", SPARK_FUTURES, "Future"],
  ["🎬 Anthem Name", SPARK_ANTHEM_NAMES, "Anthem Name"],
  ["🏷 Title II", SPARK_TITLES2, "Title II"]
];
function sparkShow(kind){
  const def = SPARK_KIND_DEFS.find(x=>x[2]===kind);
  if(!def){ toast("Unknown spark pool"); return; }
  const text = sparkPick(def[1]);
  setSpark(text, kind, def[0] + " · " + def[1].length + " options · " + (state.bpm||140) + " BPM · " + keyName(state));
  return text;
}
function sparkApplyTitle(){
  if(lastSparkKind !== "Title" && lastSparkKind !== "Title II"){ toast("Roll a title spark first"); return; }
  commit(); state.concept.title = lastSpark; afterChange(); toast("🏷 Title applied: " + lastSpark);
}
function sparkApplyMash(){
  if(lastSparkKind !== "Mash-up"){ toast("Roll a mash-up first"); return; }
  commit(); state.primaryStyle = lastSpark; state.secondaryStyle = ""; state.primaryGenre = ""; state.secondaryGenre = ""; afterChange(); toast("🧬 Mash-up applied: " + lastSpark);
}
function sparkApplyTransform(){
  if(lastSparkKind !== "Transform"){ toast("Roll a transform first"); return; }
  commit(); state.concept.transform = lastSpark; afterChange(); toast("🪄 Transform applied: " + lastSpark);
}
function sparkCopy(){
  if(!lastSpark){ toast("Nothing to copy — roll a spark first"); return; }
  copyText("🎲 " + (lastSparkKind || "Spark") + "\n" + lastSpark + "\n\nNEON FORGE II · " + state.primaryStyle + " · " + state.bpm + " BPM · " + keyName(state), "Spark");
}
function sparkMega(){
  commit(); beginRoll();
  const keys = ["feeling","melodyConcept","direction","leadVoice","leadPerf","harmony","chordColor","arpeggio","contour","rhythm","bassVoice","bassMovement","bassRel","kick","hats","snare","perc","toms","groove","swing","sync","intensity","arrangement","concept","technoLab","soundDesign","mixMaster","spatialMod","grooveMelodic","textureFx","chord","rhythmPattern","key"];
  keys.forEach(k=>{ const ks = GROUPS[k] ? GROUPS[k] : [k]; ks.forEach(x=>{ if(!state.locks[x]) ROLL_FN[x](state); }); });
  state.duration = "extended"; state.influence = "strong"; state.melodicForce = "dominant";
  state.driveAmt = 100; state.acidAmt = 100;
  ["texture","fx","mix","experimental","acid","modulation","space","reverb","delay","glitch"].forEach(id=>state.layers[id]=true);
  if(!state.locks["concept-transform"]) state.concept.transform = sparkPick(SPARK_TRANSFORMS);
  if(!state.locks["concept-title"]) state.concept.title = sparkPick(SPARK_TITLES);
  afterChange();
  setSpark("🔥 " + sparkPick(SPARK_MEGA_LINES), "Mega", "Mega Chaos Roll · " + keys.length + " atom groups rerolled · score " + scorePrompt().total + "/100");
  toast("🔥 Mega Chaos Roll");
}
function anthemIdea(){
  commit(); beginRoll();
  const name = pick(SPARK_ANTHEM_NAMES);
  const vibe = pick(SPARK_VIBES);
  const transform = pick(SPARK_TRANSFORMS);
  if(!state.locks["concept-title"]) state.concept.title = name;
  if(!state.locks["concept-narrative"]) state.concept.narrative = vibe;
  if(!state.locks["concept-transform"]) state.concept.transform = transform;
  state.melodicForce = "dominant";
  afterChange();
  setSpark("💥 " + name + " — " + vibe + " → " + transform, "Anthem Idea", "Anthem Builder · Melody-Dominant · score " + scorePrompt().total + "/100");
  toast("💥 Anthem Idea: " + name);
}
function luckyDip(){
  commit(); beginRoll();
  ["genre","feeling","direction","leadVoice","leadPerf","harmony","chordColor","arpeggio","contour","rhythm","bassVoice","bassMovement","bassRel","kick","hats","snare","perc","toms","groove","swing","sync","intensity","technoLab","soundDesign","mixMaster","spatialMod","grooveMelodic","textureFx","arrangement","concept","melodyConcept","chord","rhythmPattern"].forEach(k=>{
    const ks = GROUPS[k] ? GROUPS[k] : [k];
    ks.forEach(x=>{ if(!state.locks[x]) ROLL_FN[x](state); });
  });
  state.melodicForce = "dominant"; state.influence = "strong"; state.duration = "extended";
  generateVariations();
  afterChange();
  setSpark("🎰 " + sparkPick(SPARK_VIBES), "Lucky Dip", "Lucky Dip · " + (state.bpm||140) + " BPM · " + keyName(state) + " · " + (state.primaryStyle||"") + " · score " + scorePrompt().total + "/100");
  toast("🎰 Lucky Dip");
}
function timeMachine(){
  commit(); beginRoll();
  const bpmOpts = [70,80,85,90,95,100,110,120,122,124,126,128,130,132,134,136,138,140,142,144,146,148,150,152,155,160,170,180,190,200];
  if(!state.locks.bpm) state.bpm = bpmOpts[Math.floor(rng()*bpmOpts.length)];
  if(!state.locks.key) ROLL_FN.key(state);
  if(!state.locks.arrangement) ROLL_FN.arrangement(state);
  state.duration = ["compact","standard","extended"][Math.floor(rng()*3)];
  if(!state.locks["energyCurve"]) ROLL_FN.energyCurve(state);
  if(!state.locks["buildType"]) ROLL_FN.buildType(state);
  if(!state.locks["dropType"]) ROLL_FN.dropType(state);
  afterChange();
  setSpark("🕰 Time Machine: " + state.bpm + " BPM · " + keyName(state) + " · " + (state.duration||"standard") + " · " + (state.arrangement||"—"), "Time Machine", "Fresh tempo + key + duration + arrangement + energy shape");
  toast("🕰 Time Machine → " + state.bpm + " BPM · " + keyName(state));
}
function chaosGrid(){
  commit(); beginRoll();
  state.rhythmGrid = Array.from({length:16},()=>rng()>0.45);
  if(!state.locks.rhythmPattern) ROLL_FN.rhythmPattern(state);
  afterChange();
  setSpark("🎛 Chaos Grid: " + state.rhythmGrid.map((on,i)=>on?(i+1):"-").join(" "), "Chaos Grid", "16-step random grid · " + (state.rhythmPattern||"custom") + " · " + (state.bpm||140) + " BPM");
  toast("🎛 Chaos Grid randomized");
}
const ROU_LABELS = {
  genre: ["genre"], drums: ["kick","hats","snare","perc","toms","groove","swing","sync","intensity"],
  bass: ["bassVoice","bassMovement","bassRel"], melody: ["feeling","direction","leadVoice","leadPerf","harmony","chordColor","arpeggio","contour","rhythm"],
  concept: ["concept"], arrangement: ["arrangement"], mix: ["mixDensity","mixEnergy","mixSpace","mixGlue","mixPunch","masterDrive","masterLoudness","masterColor","masterChain"]
};
function roulette(){
  const cats = Object.keys(ROU_LABELS);
  const cat = cats[Math.floor(rng()*cats.length)];
  commit(); beginRoll();
  const keys = ROU_LABELS[cat];
  keys.forEach(k=>{ const ks=GROUPS[k]?GROUPS[k]:[k]; ks.forEach(x=>{ if(!state.locks[x]) ROLL_FN[x](state); }); });
  afterChange();
  setSpark("🎲 " + cat.toUpperCase() + " ROULETTE — " + sparkPick(SPARK_MORE_MAGIC_2), "Roulette", cat.toUpperCase() + " · " + keys.length + " atoms rerolled · " + keyName(state));
  toast("🎲 " + cat.toUpperCase() + " Roulette");
}
function randomLayers(){
  commit();
  const id = ["texture","fx","mix","experimental","acid","modulation","space","reverb","delay","glitch"];
  id.forEach(k=>{ state.layers[k] = rng()>0.45; });
  afterChange();
  const on = id.filter(k=>state.layers[k]);
  setSpark("🎚 Random Layers: " + (on.join(", ")||"none"), "Random Layers", on.length + " layers on · " + scorePrompt().total + "/100");
  toast("🎚 Random Layers: " + on.length + " on");
}
function fateRoll(){
  const pools = [SPARK_HOOKS,SPARK_OPENERS,SPARK_SECTION_SPARKS,SPARK_ARRANGEMENT_PACKS,SPARK_MIX_PUNCH,SPARK_MASTER_HEART,SPARK_DJ_NOTES];
  const pool = pools[Math.floor(rng()*pools.length)];
  const text = sparkPick(pool);
  setSpark("🔮 " + text, "Fate", "Fate Roll · " + pool.length + " options in pool · " + (state.bpm||140) + " BPM");
  toast("🔮 Fate Roll");
}
let ideaBook = [];
function loadIdeaBook(){ try{ ideaBook = JSON.parse(localStorage.getItem("nf2_idea_book")||"[]"); }catch(e){ ideaBook=[]; } return ideaBook; }
function renderIdeaBook(){
  const el = $("ideaBookMeta"); if(el) el.textContent = "Idea Book: " + ideaBook.length + " saved.";
}
function saveIdea(){
  loadIdeaBook();
  const entry = {
    at: Date.now(), seed: state.seed,
    title: state.concept.title || "Untitled",
    primary: state.primaryStyle, secondary: state.secondaryStyle,
    bpm: state.bpm, key: keyName(state), score: scorePrompt().total,
    state: encodeState(state), spark: lastSparkKind+" :: "+lastSpark
  };
  ideaBook.push(entry);
  if(ideaBook.length>40) ideaBook = ideaBook.slice(-40);
  try{ localStorage.setItem("nf2_idea_book", JSON.stringify(ideaBook)); }catch(e){ toast("localStorage unavailable"); return; }
  renderIdeaBook(); toast("📌 Idea saved: "+(entry.title||"#"+ideaBook.length));
  return entry;
}
function loadIdea(){
  loadIdeaBook();
  if(!ideaBook.length){ toast("Idea Book is empty — save one first"); return; }
  const entry = ideaBook[Math.floor(rng()*ideaBook.length)];
  const s = decodeState(entry.state);
  if(!s){ toast("Saved idea unreadable"); return; }
  commit(); state = s; rng = mulberry32(state.seed); afterChange();
  toast("📖 Loaded idea: "+(entry.title||"Untitled"));
  return entry.title;
}
function clearIdeas(){
  ideaBook = [];
  try{ localStorage.removeItem("nf2_idea_book"); }catch(e){}
  renderIdeaBook(); toast("🧹 Idea Book cleared");
}
function copyFullPack(){
  const style = buildStylePrompt(), brief = buildFullBrief(), kit = buildKit(), eng = buildEngineer();
  const pack = "NEON FORGE II FULL PACK" +
    "\n\n================================\nSTYLE PROMPT (SUNO 5.5 DESCRIPTION)\n================================\n" + style +
    "\n\n================================\nFULL BRIEF\n================================\n" + brief +
    "\n\n================================\nSUNO KIT\n================================\n" + kit +
    "\n\n================================\nENGINEER NOTES\n================================\n" + eng;
  copyText(pack, "Full Pack");
  return pack.length;
}
function optimizePromptSpace(){
  const before = buildStylePrompt().length;
  state.slim = true; const after = buildStylePrompt().length; state.slim = false;
  const lean = buildSlimStylePrompt();
  setSpark("⚙️ optimized " + before + " → " + lean.length + " chars · saved " + Math.max(0,before-lean.length) + " chars", "Space Optimizer", "Prompt Space Optimizer · target ≤1000 · filler removed, real content kept");
  toast("⚙️ Prompt space optimized: " + before + " → " + lean.length + " chars");
  copyText(lean, "Optimized Prompt");
  return {before, after: lean.length, saved: Math.max(0,before-lean.length), lean};
}
function buildSlimStylePrompt(){
  const saved = state.slim;
  state.slim = false; const normal = buildStylePrompt();
  state.slim = true; const slim = buildStylePrompt();
  state.slim = saved;
  return normal.length <= slim.length ? normal : slim;
}
function toggleSlimMode(){ commit(); state.slim = !state.slim; afterChange(); toast((state.slim?"🧵 Slim mode ON — compact prompt building":"🧵 Slim mode OFF")); return state.slim; }
