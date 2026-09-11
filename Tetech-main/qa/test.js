const fs=require('fs'); const {JSDOM}=require('jsdom');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const errors=[];
const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://x.test/index.html",
  virtualConsole:new (require('jsdom').VirtualConsole)().on("jsdomError",e=>errors.push(e.message)).on("error",e=>errors.push(String(e)))});
const w=dom.window, d=w.document;
let pass=0,fail=0;
const t=(name,fn)=>{try{const r=fn();if(r===true||r===undefined){console.log("  ok  "+name);pass++;}else{console.log("FAIL  "+name+" :: "+r);fail++;}}catch(e){console.log("FAIL  "+name+" :: "+e.message);fail++;}};
const NF=()=>w.NF; const S=()=>w.NF.state;
const click=id=>d.getElementById(id).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const clickSel=sel=>d.querySelector(sel).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));

console.log("\n== ACCEPTANCE ==");
t("1 no console/jsdom errors on load", ()=> {
  const filtered = errors.filter(m=>!/getContext|HTMLCanvasElement/.test(m));
  return filtered.length===0 || JSON.stringify(filtered.slice(0,3));
});
t("2 instrumental ON by default", ()=> S().instrumental===true);
t("3 no vocal content while instrumental", ()=>{
  const re=new RegExp("\\b(vocal|vocals|voice|singing|scream|screaming|chant|chanting|choir|choral|lyric|lyrics|whisper|whispers|spoken|shout|acapella|rapping)\\b","i");
  for(let i=0;i<60;i++){ w.NF.doRoll("power");
    for(const txt of [w.NF.buildStylePrompt(),w.NF.buildFullBrief(),w.NF.buildKit(),w.NF.buildEngineer()]){
      const body=txt.replace(/instrumental techno, no vocals[^.]*/gi,"").replace(/VOCAL POLICY:[^\n]*/g,"").replace(/no vocals/gi,"");
      if(re.test(body)) return "leak: "+body.match(re)[0]+" in "+body.slice(Math.max(0,body.search(re)-60),body.search(re)+60);
    }}
  return true;});
t("4 no minimal language", ()=>{
  const bad=["minimal","minimalist","minimalism","sparse","restrained","low-energy","low energy","weak","tiny","gentle","quiet"];
  for(let i=0;i<60;i++){ w.NF.doRoll("power");
    for(const txt of [w.NF.buildStylePrompt(),w.NF.buildFullBrief(),w.NF.buildKit(),w.NF.buildEngineer()]){
      const l=txt.toLowerCase(); for(const b of bad) if(l.includes(b)) return "found '"+b+"'";
    }}
  return true;});
t("5 style prompt <= 1000", ()=>{ for(let i=0;i<100;i++){w.NF.doRoll("power"); const n=w.NF.buildStylePrompt().length; if(n>1000) return n;} return true;});
t("6 full brief <= 3000", ()=>{ for(let i=0;i<100;i++){w.NF.doRoll("power"); const n=w.NF.buildFullBrief().length; if(n>3000) return n;} return true;});
t("7 primary+secondary render", ()=>{ w.NF.doRoll("power"); const p=d.getElementById("v-primary").textContent, s=d.getElementById("v-secondary").textContent;
  return (p.length>3 && s.length>3 && p!==s) || (p+"|"+s);});
t("8 emotion before melody in brief", ()=>{ w.NF.doRoll("power"); const b=w.NF.buildFullBrief(); return b.indexOf("EMOTION:")>=0 && b.indexOf("EMOTION:")<b.indexOf("MELODY:");});
t("9 melody present at every force", ()=>{ for(const f of ["light","balanced","strong","dominant"]){ S().melodicForce=f; w.NF.doRoll("power");
    const sp=w.NF.buildStylePrompt(), br=w.NF.buildFullBrief();
    if(!/Lead:|Melody-driven:|Melody-dominant/.test(sp)) return "style missing at "+f;
    if(!/MELODY:/.test(br)) return "brief missing at "+f; } S().melodicForce="balanced"; return true;});
t("10 feel-melody rolls both", ()=>{ let ch=0; for(let i=0;i<12;i++){const a=S().feeling+"|"+S().direction; w.NF.doRoll("feel-melody"); if(S().feeling+"|"+S().direction!==a)ch++;} return ch>=10||ch;});
t("11 concept roll changes worlds", ()=>{ const seen=new Set(); for(let i=0;i<15;i++){w.NF.doRoll("concept"); seen.add(S().concept.world);} return seen.size>=8||seen.size;});
t("12 drums roll changes drums only", ()=>{ w.NF.doRoll("power"); const before=JSON.stringify({f:S().feeling,l:S().leadVoice,b:S().bassVoice,c:S().concept,p:S().primaryStyle});
  let dch=0; for(let i=0;i<10;i++){const k=S().kick+S().hats+S().groove; w.NF.doRoll("drums"); if(S().kick+S().hats+S().groove!==k)dch++;}
  const after=JSON.stringify({f:S().feeling,l:S().leadVoice,b:S().bassVoice,c:S().concept,p:S().primaryStyle});
  return (before===after && dch>=8) || ("drumchanges="+dch+" others="+(before===after));});
t("13 locks prevent randomization", ()=>{ w.NF.doRoll("power");
  Object.keys(w.NF.ROLL_FN).forEach(k=>S().locks[k]=true);
  const snap=JSON.stringify({p:S().primaryStyle,s:S().secondaryStyle,b:S().bpm,k:S().kick,l:S().leadVoice,c:S().concept,key:S().rootPc+S().scaleId,a:S().arrangement});
  for(let i=0;i<25;i++) w.NF.doRoll("power");
  const after=JSON.stringify({p:S().primaryStyle,s:S().secondaryStyle,b:S().bpm,k:S().kick,l:S().leadVoice,c:S().concept,key:S().rootPc+S().scaleId,a:S().arrangement});
  Object.keys(w.NF.ROLL_FN).forEach(k=>S().locks[k]=false);
  return snap===after || "changed";});
t("14 layers OFF on first load", ()=>{ const fresh=w.NF.defaultState(); return Object.keys(fresh.layers).length===0 || JSON.stringify(fresh.layers);});
t("15 undo/redo restore full state", ()=>{ w.NF.doRoll("power"); const a=w.NF.encodeState(S()); w.NF.doRoll("power"); const b=w.NF.encodeState(S());
  if(a===b) return "rolls identical"; w.NF.undo(); const u=w.NF.encodeState(S()); if(u!==a) return "undo mismatch";
  w.NF.redo(); const r=w.NF.encodeState(S()); return r===b || "redo mismatch";});
t("16 copy = exact visible text", ()=>{ w.NF.doRoll("power"); for(const tab of ["style","brief","kit","eng"]){
    w.NF.currentTab=tab; w.NF.renderOutput();
    const shown=d.getElementById("outbox").textContent;
    const built= tab==="style"?w.NF.buildStylePrompt():tab==="brief"?w.NF.buildFullBrief():tab==="eng"?w.NF.buildEngineer():w.NF.buildKit();
    if(shown.trim()!==built.trim()) return tab+" mismatch";
  } w.NF.currentTab="style"; return true;});
t("17 share links restore setup", ()=>{ for(let i=0;i<10;i++){ w.NF.doRoll("power"); const enc=w.NF.encodeState(S()); const dec=w.NF.decodeState(enc);
    if(!dec) return "decode null"; if(w.NF.encodeState(dec)!==enc) return "roundtrip mismatch"; } return true;});
t("18 variations meaningfully different", ()=>{ w.NF.doRoll("power"); const v=S().variations; if(v.length!==3) return "count "+v.length;
  const ps=v.map(x=>w.NF.buildStylePromptFor(x)); if(new Set(ps).size!==3) return "duplicate prompts";
  const cur=w.NF.buildStylePrompt(); if(ps.includes(cur)) return "variation == current"; return true;});
t("19 no giant matrix (card count sane)", ()=>{ const n=d.querySelectorAll(".card").length; return n<=30 || n;});
t("20 signature present", ()=>{ const s=d.querySelector(".foot .sig"); return (s && /Powered by/.test(s.textContent)) || "missing";});

console.log("\n== EXTRA ==");
t("key engine: scaleNote in scale", ()=>{ for(let i=0;i<200;i++){ w.NF.doRoll("key");
    const iv=w.NF.scaleOf(S()).iv; for(let dgr=-8;dgr<12;dgr++){ const m=w.NF.scaleNote(S(),dgr,4);
      const pc=((m - S().rootPc)%12+12)%12; if(!iv.includes(pc)) return "deg "+dgr+" pc "+pc; } } return true;});
t("camelot valid", ()=>{ for(let i=0;i<100;i++){ w.NF.doRoll("key"); if(!/^([1-9]|1[0-2])[AB]$/.test(w.NF.camelot(S()))) return w.NF.camelot(S()); } return true;});
t("461+ unique styles", ()=>{ const s=new Set(w.NF.STYLES.map(x=>x.n)); return s.size>=461 || s.size;});
t("hide removes content from prompt", ()=>{ w.NF.doRoll("power");
  const full=w.NF.buildStylePrompt(); S().hidden.drumsCard=true; const noDrums=w.NF.buildStylePrompt(); S().hidden.drumsCard=false;
  return (!noDrums.includes("Drums:") && full.includes("Drums:")) || "hide failed";});
t("all data-roll targets resolve", ()=>{ const bad=[];
  d.querySelectorAll("[data-roll]").forEach(el=>{const k=el.getAttribute("data-roll");
    if(!w.NF.ROLL_FN[k] && !w.NF.GROUPS[k] && !["fuse","clear-secondary","clear-counter","clear-voice-concept","variations","power"].includes(k)) bad.push(k);});
  return bad.length===0||bad.join(",");});
t("all data-lock keys exist", ()=>{ const bad=[];
  d.querySelectorAll("[data-lock]").forEach(el=>{const k=el.getAttribute("data-lock");
    if(!(k in S().locks)) bad.push(k);}); return bad.length===0||bad.join(",");});
t("all data-hide keys exist", ()=>{ const bad=[];
  d.querySelectorAll("[data-hide]").forEach(el=>{const k=el.getAttribute("data-hide");
    if(!(k in S().hidden)) bad.push(k);}); return bad.length===0||bad.join(",");});
t("all row-atoms have v-<atom> elements", ()=>{ const custom=["bpm","key","concept"];
  const missing=w.NF.ATOMS.filter(a=>!custom.includes(a.key) && !d.getElementById("v-"+a.key)).map(a=>a.key);
  return missing.length===0||missing.join(",");});


console.log("\n== NEW SUBSYSTEMS ==");
t("energy arc bars sane", ()=>{ for(const dur of ["compact","standard","extended"]){ S().duration=dur;
  const a=w.NF.energyArc(); if(!a.length) return dur+" empty";
  if(a.reduce((x,s)=>x+s.bars,0)<32) return dur+" too short";
  if(!a.every(s=>s.energy>=20&&s.energy<=100)) return dur+" energy out of range";
  if(a[0].name!=="Intro") return dur+" no intro"; } S().duration="standard"; return true;});
t("arc tags are Suno-style brackets", ()=>{ const tags=w.NF.arcTags().split("\n");
  return tags.every(x=>/^\[[A-Za-z ]+\]$/.test(x)) || tags.join("|");});
t("score always 0-100 with 6 items", ()=>{ for(let i=0;i<40;i++){ w.NF.doRoll("power");
  const r=w.NF.scorePrompt(); if(r.items.length!==6) return "items "+r.items.length;
  if(r.total<0||r.total>100) return "total "+r.total;
  if(!r.items.every(x=>x.score>=0&&x.score<=100)) return "item out of range"; } return true;});
t("A/B stash + swap round-trips", ()=>{ w.NF.doRoll("power"); const a=w.NF.encodeState(S());
  w.NF.stashB(); w.NF.doRoll("power"); const b=w.NF.encodeState(S());
  w.NF.swapAB(); if(w.NF.encodeState(S())!==a) return "swap did not load A";
  w.NF.swapAB(); return w.NF.encodeState(S())===b || "swap back failed";});
t("harmony never contradicts key", ()=>{ for(let i=0;i<80;i++){ w.NF.doRoll("power");
  const br=w.NF.buildFullBrief(); const m=br.match(/KEY: \S+ ([a-z ]+) \(/);
  if(!m) continue; const scale=m[1].trim();
  const h=br.match(/HARMONY: .*? in ([a-z ]+);/);
  if(h && h[1].trim()!==scale) return "key="+scale+" harmony="+h[1].trim(); } return true;});
t("audition motif stays in key", ()=>{ for(let i=0;i<30;i++){ w.NF.doRoll("power");
  const iv=w.NF.scaleOf(S()).iv;
  for(let d=-6;d<14;d++){ const midi=w.NF.scaleNote(S(),d,4);
    if(!iv.includes(((midi-S().rootPc)%12+12)%12)) return "off-key degree "+d; } } return true;});
t("command palette filters + runs", ()=>{ w.NF.openCmd(); w.NF.renderCmd("drums");
  const f=w.NF.cmdFiltered; if(!f.length) return "no match for 'drums'";
  if(!f.some(c=>/drums/i.test(c.name))) return "bad match"; w.NF.closeCmd(); return true;});
t("every command has a runnable fn", ()=>{ const bad=w.NF.COMMANDS.filter(c=>typeof c.run!=="function"||!c.name);
  return bad.length===0||bad.length+" broken";});
t("all commands execute without throwing", ()=>{
  const skip=/Import session|Export session/;
  for(const c of w.NF.COMMANDS){ if(skip.test(c.name)) continue;
    try{ c.run(); }catch(e){ return c.name+" :: "+e.message; } }
  d.getElementById("styleModal").classList.remove("open");
  d.getElementById("helpModal").classList.remove("open");
  w.NF.closeCmd(); return true;});
t("engineer notes always populated", ()=>{ for(let i=0;i<30;i++){ w.NF.doRoll("power");
  const e=w.NF.engineerLines(), dj=w.NF.djLines();
  if(e.length<6||dj.length<3) return "short";
  if(e.concat(dj).some(x=>/undefined|NaN|null/.test(x))) return "bad value"; } return true;});

t("no headless sections over 500 rolls", ()=>{ let bad=0;
  for(let i=0;i<500;i++){ w.NF.doRoll("power"); const sp=w.NF.buildStylePrompt();
    if(!/Bass:/.test(sp)||!/Drums:/.test(sp)||!/Concept:/.test(sp)) bad++; }
  return bad===0 || bad+"/500 prompts lost a section label";});
t("sanitizer keeps label when clause dropped", ()=>{
  S().instrumental=true;
  const out = w.NF.buildStylePrompt();
  return !/^\s*[a-z]/.test(out) || "prompt starts lowercase (orphaned clause)";});

t("reset locks for later tests", ()=>{ Object.keys(w.NF.ROLL_FN).forEach(k=>S().locks[k]=false); return true;});
t("EMOTION line never disappears", ()=>{ for(let i=0;i<400;i++){ w.NF.doRoll("power");
  const b=w.NF.buildFullBrief();
  if(b.indexOf("EMOTION:")<0) return "EMOTION vanished at roll "+i; } return true;});
t("no pool phrase is self-censoring", ()=>{
  // any single rolled value that the sanitizer would reject is a pool bug
  const fields=["feeling","flavor","direction","leadVoice","leadPerf","contour","rhythm","harmony",
                "arpeggio","bassVoice","bassMovement","bassRel","kick","hats","snare","perc","toms",
                "groove","swing","sync","intensity","arrangement"];
  for(let i=0;i<600;i++){ w.NF.doRoll("power"); const s=S();
    for(const f of fields){ if(s[f] && w.NF.isDirty(String(s[f]).toLowerCase())) return f+" = "+s[f]; }
    for(const k in (s.melodyConcept||{})){ if(s.melodyConcept[k] && w.NF.isDirty(String(s.melodyConcept[k]).toLowerCase())) return "melodyConcept."+k+" = "+s.melodyConcept[k]; }
    for(const k in (s.concept||{})){ if(s.concept[k] && w.NF.isDirty(String(s.concept[k]).toLowerCase())) return "concept."+k+" = "+s.concept[k]; }
  } return true;});
t("weirdness measurably shifts style mix", ()=>{
  // Weirdness biases the curated techno pool — which is only used in
  // Techno-Only mode (the default genre roller never includes techno).
  S().techOnly=true;
  const cat={}; w.NF.STYLES.forEach(x=>cat[x.n]=x.c);
  const sample=wd=>{ S().weirdness=wd; let rare=0;
    for(let i=0;i<600;i++){ w.NF.doRoll("primary"); if(cat[S().primaryStyle]==="rare") rare++; }
    return rare/600; };
  const lo=sample(0), hi=sample(100); S().weirdness=50; S().techOnly=false;
  if(lo>0.12) return "weirdness 0 still gives "+(lo*100).toFixed(0)+"% rare";
  if(hi<0.60) return "weirdness 100 only gives "+(hi*100).toFixed(0)+"% rare";
  return true;});
t("microtonality changes prompt + cents", ()=>{
  S().microMelody="off"; S().microBass="off"; const plain=w.NF.buildStylePrompt();
  S().microMelody="quarter"; const micro=w.NF.buildStylePrompt();
  if(plain===micro) return "prompt unchanged by microtonality";
  if(!/microtonal/i.test(micro)) return "no microtonal wording";
  let any=false; for(let i=0;i<12;i++){ if(w.NF.microCents("quarter",i,1)!==0) any=true; }
  S().microMelody="off";
  return any || "all cent offsets are zero";});
t("melody concept rolls + reaches prompt", ()=>{
  S().hidden.feelCard=false; S().locks.melodyConcept=false;
  const seen=new Set(); for(let i=0;i<20;i++){ w.NF.doRoll("concept-melody"); seen.add(S().melodyConcept.story); }
  if(seen.size<8) return "only "+seen.size+" distinct stories";
  const b=w.NF.buildFullBrief();
  return /MELODY CONCEPT:/.test(b) || "missing from brief";});
t("arrangements are plentiful + energetic", ()=>{
  const seen=new Set(); for(let i=0;i<400;i++){ w.NF.doRoll("arrangement"); seen.add(S().arrangement); }
  if(seen.size<20) return "only "+seen.size+" distinct arrangements";
  return true;});
t("27+ scales, all intervals valid", ()=>{
  if(w.NF.SCALES.length<27) return "only "+w.NF.SCALES.length;
  for(const s of w.NF.SCALES){
    if(!s.iv.length||s.iv[0]!==0) return s.id+" bad root";
    if(s.iv.some(x=>x<0||x>11)) return s.id+" interval out of range";
    if(new Set(s.iv).size!==s.iv.length) return s.id+" duplicate intervals";
  } return true;});

t("genre roll never uses techno in normal mode", ()=>{
  S().techOnly=false;
  const seen=new Set();
  for(let i=0;i<80;i++){ w.NF.doRoll("genre"); seen.add(S().primaryStyle); seen.add(S().secondaryStyle); }
  const anyTech=[...seen].some(x=>/techno|tekno/i.test(x));
  S().primaryStyle=""; S().secondaryStyle="";
  return (!anyTech && seen.size>=30) || ("tech leak or too few="+seen.size);});
t("techno-only mode uses techno pool", ()=>{
  S().techOnly=true;
  const techNames=new Set(w.NF.STYLES.map(x=>x.n));
  const seen=new Set();
  for(let i=0;i<60;i++){ w.NF.doRoll("genre"); seen.add(S().primaryStyle); }
  const leaked=[...seen].filter(x=>!techNames.has(x));
  S().techOnly=false;
  return (leaked.length===0 && seen.size>=20) || ("non-tech leaked="+JSON.stringify(leaked.slice(0,5)));});
t("genre pool is large", ()=> w.NF.GENRES.length>=30 || w.NF.GENRES.length);
t("genre roll fills both slots", ()=>{ S().techOnly=false; w.NF.doRoll("genre");
  return (S().primaryStyle.length>2 && S().secondaryStyle.length>2 && S().primaryStyle!==S().secondaryStyle) ||
    (S().primaryStyle+" | "+S().secondaryStyle);});
t("genre pool itself contains no techno", ()=>{
  const leak=[];
  for(const g of w.NF.GENRES){
    if(/techno|tekno/i.test(g.n)) leak.push("genre:"+g.n);
    for(const s of g.subs){ if(/techno|tekno/i.test(s)) leak.push(g.n+"::"+s); }
  }
  return leak.length===0 || ("techno in genre pool: "+JSON.stringify(leak));});

t("expanded bass/melody/drum/groove pools", ()=>{
  const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
  const cnt=n=>{ const m=src.match(new RegExp("const "+n+" = \\[([\\s\\S]*?)\\n\\];")); return m?[...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].length:0; };
  const need={FEELINGS:140,BASS_VOICES:55,BASS_MOVES:28,KICKS:30,HATS:28,GROOVES:30,SWINGS:20,INTENSITIES:25,LEADS:60,DIRECTIONS:55};
  const bad=[];
  for(const [k,v] of Object.entries(need)){ const c=cnt(k); if(c<v) bad.push(k+"="+c+"<"+v); }
  return bad.length===0 || bad.join(", ");});
t("equal-chance mode is selectable + applies", ()=>{
  S().equalChance=true;
  // Equal chance picks uniformly across all combos; primary and secondary
  // should still be different genres and set valid styles.
  const seen=new Set();
  for(let i=0;i<30;i++){ w.NF.doRoll("genre"); seen.add(S().primaryGenre); }
  S().equalChance=false;
  return (seen.size>0 && S().primaryStyle.length>2) || "equal chance broken";});
t("counter-melody + voice concept roll into prompts", ()=>{
  w.NF.doRoll("counter-melody"); w.NF.doRoll("voice-concept");
  const sp=w.NF.buildStylePrompt(), br=w.NF.buildFullBrief();
  const hasCounter = S().counterMelody && S().counterMelody.voice && sp.includes("Counter-melody") && br.includes("COUNTER-MELODY");
  const hasSecond = S().voiceConcept && S().voiceConcept.voice && sp.includes("Second line") && br.includes("SECOND LINE");
  const roles=["supports","follows","counters"].includes(S().counterMelodyRelation);
  return (hasCounter && hasSecond && roles) || ("counter:"+hasCounter+" second:"+hasSecond+" roles:"+roles);});
t("bass/lead pool pickers resolve + big batches", ()=>{
  const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
  const cnt=n=>{ const m=src.match(new RegExp("const "+n+" = \\[([\\s\\S]*?)\\n\\];")); return m?[...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].length:0; };
  const ok = cnt("LEADS")>=110 && cnt("BASS_VOICES")>=100;
  const hasPicker = !!w.NF.PICKER_POOLS && !!w.NF.PICKER_POOLS.leadVoice && !!w.NF.PICKER_POOLS.bassVoice;
  return (ok && hasPicker) || ("leads:"+cnt("LEADS")+" bass:"+cnt("BASS_VOICES")+" picker:"+hasPicker);});

t("audition engine has new genre-feel + pattern voices", ()=>{
  const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
  const checks=["function styleFeel()","function snare(","function tom(","function shaker(","function percExtra()","offbeatSk","breakbeat ?"];
  const missing=checks.filter(c=>!src.includes(c));
  return missing.length===0 || ("missing: "+missing.join(", "));});
t("genre roll matches BPM to genre + avoids same genre", ()=>{
  S().techOnly=false; S().locks.bpm=false;
  let same=0, outOfRange=0;
  for(let i=0;i<40;i++){
    w.NF.doRoll("genre");
    const b=S().bpm;
    if(S().primaryGenre===S().secondaryGenre) same++;
    if(b<60||b>200) outOfRange++;
  }
  // force a couple of clearly-tempo'd genres
  const force=(p,s)=>{ S().primaryGenre=p; S().primaryStyle=p+" X"; S().secondaryGenre=s; S().secondaryStyle=s+" Y"; return w.NF.tempoForGenre(p,s); };
  const dnb=force("Drum and Bass","Electronic"); const ska=force("Ska","Reggae");
  S().locks.bpm=false;
  return (same===0 && outOfRange===0 && dnb>=140 && dnb<=190 && ska>=60 && ska<=110) ||
    ("same="+same+" oob="+outOfRange+" dnb="+dnb+" ska="+ska);});

console.log("\n== IDEA ENGINE / WILDCARD LAB ==\n");
t("spark pools are huge", ()=>{
  const pools=[w.NF.SPARK_IDEAS,w.NF.SPARK_TITLES,w.NF.SPARK_MASHUPS,w.NF.SPARK_CONSTRAINTS,w.NF.SPARK_TIPS,w.NF.SPARK_VIBES,w.NF.SPARK_PLACES,w.NF.SPARK_THINGS,w.NF.SPARK_TRANSFORMS,w.NF.SPARK_CHALLENGES,w.NF.SPARK_MEGA_LINES];
  const n=pools.reduce((a,p)=>a+p.length,0);
  return n>=550 || ("only "+n+" sparks");
});
t("expanded pools are noticeably bigger", ()=>{
  const ok = w.NF.FEELINGS.length>=160 && w.NF.LEADS.length>=150 && w.NF.BASS_VOICES.length>=140 && w.NF.KICKS.length>=60 && w.NF.GROOVES.length>=50;
  return ok || (w.NF.FEELINGS.length+" "+w.NF.LEADS.length+" "+w.NF.BASS_VOICES.length+" "+w.NF.KICKS.length+" "+w.NF.GROOVES.length);
});
t("every spark kind rolls into the visible card", ()=>{
  const kinds=["Idea","Title","Mash-up","Constraint","Tip","Vibe","Scene","Object","Transform","Challenge"];
  for(const k of kinds){
    const text=w.NF.sparkShow(k);
    const shown=d.getElementById("v-spark").textContent;
    if(!text || !shown || shown!==text) return k+" :: "+text+" vs "+shown;
  }
  return true;
});
t("mega chaos roll executes and respects locked styles", ()=>{
  S().locks.primary=true; S().locks.secondary=true;
  const before=S().primaryStyle+"|"+S().secondaryStyle;
  w.NF.sparkMega();
  const after=S().primaryStyle+"|"+S().secondaryStyle;
  S().locks.primary=false; S().locks.secondary=false;
  return after===before || "styles changed";
});
t("spark commands registered", ()=>{
  const names = w.NF.COMMANDS.map(c=>c.name);
  return names.some(n=>/Mega Chaos Roll/.test(n)) && names.some(n=>/Random spark idea/.test(n)) || "missing spark commands";
});

console.log("\n== ANTHEM CATEGORY MAX ==\n");
t("emotion / dominant / harmony anthem buttons exist", ()=>{
  const ids=["maxEmotionMelodyBtn","maxAnthemMelodyBtn","maxHarmonyAnthemBtn","maxEmotionMelodyBtn2","maxAnthemMelodyBtn2","maxHarmonyAnthemBtn2"];
  const missing=ids.filter(id=>!d.getElementById(id) && id!=="maxEmotionMelodyBtn2" && id!=="maxAnthemMelodyBtn2" && id!=="maxHarmonyAnthemBtn2");
  // jsdom init renders rows; both copies are in static DOM
  return ids.every(id=>d.getElementById(id)) || "missing:"+missing.join(",");
});
t("anthem pools are loaded", ()=>{
  return w.NF.EMOTION_ANTHEMS.length>=20 && w.NF.MELODY_DOMINANT_ANTHEMS.length>=20 && w.NF.HARMONY_ANTHEMS.length>=20;
});
t("emotion/melody/harmony pools expanded a lot", ()=>{
  const ok = w.NF.FEELINGS.length>=200 && w.NF.LEADS.length>=220 && w.NF.HARMONIES.length>=110 && w.NF.DIRECTIONS.length>=110;
  return ok || ("f="+w.NF.FEELINGS.length+" l="+w.NF.LEADS.length+" h="+w.NF.HARMONIES.length+" d="+w.NF.DIRECTIONS.length);
});
t("max melody/harmony function hooks exist", ()=>{
  const has = typeof w.NF.doMaxEmotionMelody==="function" && typeof w.NF.doMaxMelodyDominant==="function" && typeof w.NF.doMaxHarmonyAnthem==="function";
  const hasKeys = w.NF.EMOTION_MELODY_KEYS && w.NF.EMOTION_MELODY_KEYS.includes("feeling") && w.NF.DOMINANT_MELODY_KEYS && w.NF.DOMINANT_MELODY_KEYS.includes("leadVoice") && w.NF.HARMONY_ANTHEM_KEYS && w.NF.HARMONY_ANTHEM_KEYS.includes("harmony");
  return (has && hasKeys) || "has="+has+" keys="+hasKeys;
});
t("anthem max targets cover emotion/melody/harmony atoms", ()=>{
  const emo=["feeling","flavor","direction","leadVoice","leadPerf","harmony","chordColor","arpeggio","contour","rhythm","melodyConcept","counter-melody"];
  const harm=["harmony","chordColor","chordProg","scaleId","rootPc","key","leadVoice","arpeggio","voicingType","inversionType","tensionType","resolutionType"];
  const badE=emo.filter(k=>!w.NF.EMOTION_MELODY_KEYS.includes(k));
  const badH=harm.filter(k=>!w.NF.HARMONY_ANTHEM_KEYS.includes(k));
  return badE.length===0 && badH.length===0 || ("E:"+badE.join(",")+" H:"+badH.join(","));
});
t("anthem commands registered", ()=>{
  const names=w.NF.COMMANDS.map(c=>c.name);
  return names.some(n=>/Max Emotion-Led Melody/.test(n)) && names.some(n=>/Max Melody-Dominant Anthem/.test(n)) && names.some(n=>/Max Harmony Anthem/.test(n)) || "missing anthem commands";
});

console.log("\n== MORE THINGS / ANTHEM BUILDER ==\n");
t("new extra spark pools are loaded", ()=>{
  const ok = w.NF.SPARK_WEATHER && w.NF.SPARK_LIGHT && w.NF.SPARK_SOUNDS && w.NF.SPARK_FUTURES && w.NF.SPARK_ANTHEM_NAMES;
  const n = (w.NF.SPARK_WEATHER?.length||0)+(w.NF.SPARK_LIGHT?.length||0)+(w.NF.SPARK_SOUNDS?.length||0)+(w.NF.SPARK_FUTURES?.length||0)+(w.NF.SPARK_ANTHEM_NAMES?.length||0);
  return ok && n>=220 || n;
});
t("more spark rolls into visible card", ()=>{
  const text=w.NF.sparkShowExtra(); const shown=d.getElementById("v-spark").textContent;
  return text && shown===text || (text+" vs "+shown);
});
t("anthem idea builds a full dominant concept", ()=>{
  const out=w.NF.anthemIdea();
  return (typeof out==="string" && out.length>10 && S().melodicForce==="dominant" && !!S().concept.title && !!S().concept.transform) || JSON.stringify({out,title:S().concept.title,transform:S().concept.transform,dirty:!!S().locks["concept-title"]});
});
t("max anthem idea + concept anthem hooks/keys exist", ()=>{
  const has = typeof w.NF.maxAnthemIdea==="function" && typeof w.NF.doMaxConceptAnthem==="function";
  const keys = w.NF.CONCEPT_ANTHEM_KEYS && w.NF.CONCEPT_ANTHEM_KEYS.includes("concept-title") && w.NF.CONCEPT_ANTHEM_KEYS.includes("concept-transform") && w.NF.CONCEPT_ANTHEM_KEYS.includes("melodyConcept");
  return has && keys || ("has="+has+" keys="+keys);
});
t("new anthem builder buttons exist", ()=>{
  const ids=["anthemIdeaBtn","maxAnthemIdeaBtn","sparkMoreBtn","sparkApplyChallengeBtn","maxConceptAnthemBtn"];
  const missing=ids.filter(id=>!d.getElementById(id));
  return missing.length===0 || missing.join(",");
});
t("anthem builder commands registered", ()=>{
  const names=w.NF.COMMANDS.map(c=>c.name);
  return names.some(n=>/Build Melody-Dominant Anthem Idea/i.test(n)) && names.some(n=>/extra spark/i.test(n)) && names.some(n=>/Max Concept Anthem/i.test(n)) || "missing commands";
});

console.log("\n== MORE MAGIC FEATURES ==\n");
t("more magic buttons exist", ()=>{
  const ids=["luckyDipBtn","timeMachineBtn","chaosGridBtn","randomFocusBtn","copySessionBtn","goPerfectBtn"];
  const missing=ids.filter(id=>!d.getElementById(id));
  return missing.length===0 || missing.join(",");
});
t("lucky dip runs sync + respects style locks when fully locked", ()=>{
  S().locks.primary=true; S().locks.secondary=true; S().locks.genre=true; S().locks.bpm=false;
  const before=S().primaryStyle+"|"+S().secondaryStyle;
  w.NF.luckyDip();
  S().locks.primary=false; S().locks.secondary=false; S().locks.genre=false;
  return (S().primaryStyle+"|"+S().secondaryStyle===before && S().melodicForce==="dominant") || "styles changed or not dominant";
});
t("time machine changes bpm/key temporal setup", ()=>{
  S().locks.bpm=false; S().locks.key=false;

  const a=S().bpm; w.NF.timeMachine();
  return (typeof S().bpm==="number" && S().bpm>=60 && S().bpm<=200 && typeof S().duration==="string") || "bad bpm/dur";
});
t("chaos grid fills 16 cells + pattern", ()=>{
  w.NF.chaosGrid();
  return (Array.isArray(S().rhythmGrid) && S().rhythmGrid.length===16 && !!S().rhythmPattern) || "bad grid";
});
t("copy session JSON returns encoded state", ()=>{
  const e=w.NF.copySessionJson();
  return typeof e==="string" && e.length>50 && !!w.NF.decodeState(e) || "bad encode";
});
t("random focus uses 12 categories", ()=>{
  return w.NF.FOCUS_CATEGORIES.length===12 && typeof w.NF.randomFocus==="function" && typeof w.NF.goPerfect==="function";
});
t("more magic commands registered", ()=>{
  const names=w.NF.COMMANDS.map(c=>c.name);
  return names.some(n=>/Lucky Dip/.test(n)) && names.some(n=>/Time Machine/.test(n)) && names.some(n=>/Chaos Grid/.test(n)) && names.some(n=>/Random Focus/.test(n)) && names.some(n=>/Copy session as JSON/.test(n)) && names.some(n=>/Go for 100/.test(n)) || "missing magic commands";
});

console.log("\n== MEGA BATCH FEATURES ==\n");
t("mega spark pools are huge", ()=>{
  const names=['SPARK_TITLES2','SPARK_HOOKS','SPARK_OPENERS','SPARK_SECTION_SPARKS','SPARK_STYLE_STUNTS','SPARK_GENRE_SCRAMBLES','SPARK_BASSLINES','SPARK_DRUM_LINES','SPARK_MELODY_PHRASES','SPARK_CONCEPT_TWISTS','SPARK_ARRANGEMENT_PACKS','SPARK_MIX_PUNCH','SPARK_MASTER_HEART','SPARK_SUNO_CUES','SPARK_DJ_NOTES','SPARK_MORE_MAGIC_2'];
  const n=names.reduce((a,n)=>a+w.NF[n].length,0);
  return n>=450 || n;
});
t("mega batch buttons exist", ()=>{
  const ids=["maxEverythingBtn","saveIdeaBtn","loadIdeaBtn","clearIdeasBtn","copyPackBtn","rouletteBtn","randomLayerBtn","fateRollBtn"];
  const missing=ids.filter(id=>!d.getElementById(id));
  return missing.length===0 || missing.join(",");
});
t("roulette + random layers + fate roll run", ()=>{
  const r=w.NF.roulette(); const lay=w.NF.randomLayers(); const f=w.NF.fateRoll();
  return (typeof r==="string" && Array.isArray(lay) && typeof f==="string" && f.length>5) || ("r="+r+" lay="+JSON.stringify(lay)+" f="+f);
});
t("idea book save/load/clear round-trips", ()=>{
  w.NF.clearIdeas();
  w.NF.saveIdea();
  const loaded=w.NF.loadIdea();
  const clear=w.NF.clearIdeas();
  return (typeof loaded==="string" && loaded.length>0 && clear===true) || ("loaded="+loaded+" clear="+clear);
});
t("copy full pack returns large payload", ()=>{
  const n=w.NF.copyFullPack();
  return typeof n==="number" && n>5000 || n;
});
t("mega batch commands registered", ()=>{
  const names=w.NF.COMMANDS.map(c=>c.name);
  return names.some(n=>/Max EVERYTHING/.test(n)) && names.some(n=>/Idea Book/.test(n)) && names.some(n=>/Full Pack/.test(n)) && names.some(n=>/Fate Roll/.test(n)) && names.some(n=>/mega spark pool/.test(n)) || "missing mega commands";
});
t("total spark count grew massively", ()=>{
  const num=parseInt(d.getElementById("sparkCount").textContent.replace(/\D/g,""),10);
  return num>900 || ("only "+num);
});

console.log("\n== SUB-TECHNO STYLE + PROMPT SPACE OPTIMIZER ==\n");
t("style pool grew + has sub-techno entries", ()=>{
  const tech=w.NF.STYLES.filter(x=>/Sub-?Techno|Subfloor|Sub-Bass|Subsonic|Subdrop|SubTunnel|SubHarbour|SubTerra/.test(x.n));
  return w.NF.STYLES.length>=800 && tech.length>=14 || ("styles="+w.NF.STYLES.length+" subtech="+tech.length);
});
t("sub-techno names are unique in pool", ()=>{
  const seen=new Set(); const bad=[];
  for(const st of w.NF.STYLES){ if(seen.has(st.n)) bad.push(st.n); seen.add(st.n); }
  return bad.length===0 || "dupes:"+bad.join(",");
});
t("slim mode never exceeds 1000", ()=>{
  S().slim=true; let bad=0;
  for(let i=0;i<40;i++){ w.NF.doRoll("power"); if(w.NF.buildStylePrompt().length>1000) bad++; }
  S().slim=false; return bad===0 || bad+" over";
});
t("optimize prompt saves chars and copies a lean result", ()=>{
  w.NF.doRoll("power");
  const a=w.NF.buildStylePrompt(); const r=w.NF.optimizePromptSpace();
  return (r && r.lean && r.saved>=0 && r.lean.length<=a.length && r.lean.length<=1000) || JSON.stringify(r);
});
t("full brief no longer repeats filter/env/lfo/fx", ()=>{
  w.NF.doRoll("power");
  const b=w.NF.buildFullBrief();
  const dupes=(b.match(/FILTER:|ENVELOPE:|LFO:|FX CHAIN:/g)||[]).length;
  return dupes===0 || ("duplicate detail headers: "+dupes);
});
t("dominant melody uses real hook instead of generic filler", ()=>{
  S().melodicForce="dominant"; w.NF.doRoll("melody");
  const line=w.NF.buildStylePrompt();
  S().melodicForce="balanced";
  return !/anthemic unforgettable hook/.test(line) || "generic filler remains";
});
t("optimizer commands registered", ()=>{
  const names=w.NF.COMMANDS.map(c=>c.name);
  return names.some(n=>/Optimize prompt space/.test(n)) && names.some(n=>/Toggle slim mode/.test(n)) || "missing optimizer commands";
});

console.log("\n== LIST PICKER SCORE BADGES ==\n");
t("kick list shows star + rank + energy score per option", ()=>{
  w.NF.openPicker("kick");
  w.NF.scoreStyleGridOptions(d.getElementById("styleGrid"));
  const opts=[...d.querySelectorAll("#styleGrid .styleopt")];
  const star=opts.filter(o=>o.querySelector(".cat.score")).length;
  const rank=opts.filter(o=>o.querySelector(".cat.rank")).length;
  const energy=opts.filter(o=>o.querySelector(".cat.energy")).length;
  d.querySelector("#styleModalClose").click();
  return (star===opts.length && rank===opts.length && energy>0) || ("star="+star+" rank="+rank+" energy="+energy);
});
t("lead list uses Melody category score", ()=>{
  w.NF.openPicker("leadVoice");
  w.NF.scoreStyleGridOptions(d.getElementById("styleGrid"));
  const opts=[...d.querySelectorAll("#styleGrid .styleopt")];
  const mel=opts.filter(o=>o.querySelector(".cat.melody")).length;
  d.querySelector("#styleModalClose").click();
  return mel>0 || ("melody badges="+mel);
});
t("harmony list uses Harmony category score", ()=>{
  w.NF.openPicker("harmony");
  w.NF.scoreStyleGridOptions(d.getElementById("styleGrid"));
  const opts=[...d.querySelectorAll("#styleGrid .styleopt")];
  const harm=opts.filter(o=>o.querySelector(".cat.harmony")).length;
  d.querySelector("#styleModalClose").click();
  return harm>0 || ("harmony badges="+harm);
});
t("bass list uses Coverage category score", ()=>{
  w.NF.openPicker("bassVoice");
  w.NF.scoreStyleGridOptions(d.getElementById("styleGrid"));
  const opts=[...d.querySelectorAll("#styleGrid .styleopt")];
  const cov=opts.filter(o=>o.querySelector(".cat.cov")).length;
  d.querySelector("#styleModalClose").click();
  return cov>0 || ("coverage badges="+cov);
});
t("rank badges rank every option in the same list", ()=>{
  w.NF.openPicker("kick");
  w.NF.scoreStyleGridOptions(d.getElementById("styleGrid"));
  const ranks=[...d.querySelectorAll("#styleGrid .cat.rank")].map(x=>x.textContent);
  const uniq=new Set(ranks);
  d.querySelector("#styleModalClose").click();
  return (uniq.size===ranks.length && ranks.length>50) || ("distinct="+uniq.size+" total="+ranks.length);
});
t("opening and scoring a list does not change state", ()=>{
  const before=w.NF.encodeState(S());
  w.NF.openPicker("leadVoice");
  w.NF.scoreStyleGridOptions(d.getElementById("styleGrid"));
  d.querySelector("#styleModalClose").click();
  return w.NF.encodeState(S())===before || "state changed";
});

console.log("\n== PROMPT VIEW (hide non-prompt sections) ==\n");
const PROMPT_SET = new Set(["styleCard","feelCard","bassCard","drumsCard","technoLabCard","harmonyLabCard","rhythmLabCard","soundDesignCard","mixMasterCard","spatialModCard","grooveMelodicCard","textureFxCard","conceptCard","arrangementCard","modeCard","layersCard","scoreCard"]);
const NON_PROMPT = ["sparkCard","auditionCard","geneticLabCard","batchLabCard","statsLabCard","maxRollLabCard","variationsCard","presetsCard","historyCard"];
t("on open, non-prompt sections are hidden by default", ()=>{
  w.NF.applyStylePromptFocus();
  const bad = NON_PROMPT.filter(id=>!w.NF.state.hidden[id]);
  return !bad.length || ("still visible: "+bad.join(","));
});
t("prompt-building sections stay visible on open", ()=>{
  w.NF.applyStylePromptFocus();
  const bad=[...PROMPT_SET].filter(id=>w.NF.state.hidden[id]);
  return !bad.length || ("hidden: "+bad.join(","));
});
t("prompt view leaves bpm/key row flags alone", ()=>{
  w.NF.applyStylePromptFocus();
  return w.NF.state.hidden.bpm===false && w.NF.state.hidden.key===false || "bpm/key got auto-hidden";
});
t("toggle prompt view hides then shows every card", ()=>{
  w.NF.toggleStylePromptFocus(); // off -> show all
  const allOff = NON_PROMPT.every(id=>!w.NF.state.hidden[id]);
  w.NF.toggleStylePromptFocus(); // on -> hide again
  const on = NON_PROMPT.every(id=>w.NF.state.hidden[id]);
  return (allOff && on) || ("allOff="+allOff+" on="+on);
});
t("prompt view header button flips text with the mode", ()=>{
  w.NF.showAllSections();
  const offTxt=d.getElementById("styleFocusBtn").textContent.trim();
  w.NF.toggleStylePromptFocus();
  const onTxt=d.getElementById("styleFocusBtn").textContent.trim();
  return (offTxt.includes("Show all") && onTxt.includes("Prompt view")) || (offTxt+" -> "+onTxt);
});
t("prompt view does not use undo history for auto-open", ()=>{
  w.NF.applyStylePromptFocus();
  const before=w.NF.encodeState(S());
  w.NF.applyStylePromptFocus(); // idempotent
  return w.NF.encodeState(S())===before || "auto-apply changed state";
});

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
