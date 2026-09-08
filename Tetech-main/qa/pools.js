/* Scans every generation pool through the LIVE sanitizer used by the app.
   Any phrase the app would censor is a pool bug: it silently deletes content
   from prompts. Run: node qa/pools.js */
const fs=require('fs'), path=require('path');
const {JSDOM}=require('jsdom');
const file=path.join(__dirname,'..','index.html');
const w=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',url:'https://x.test/'}).window;
const bad=[];
const chk=(lbl,arr)=>arr.forEach(v=>{ if(typeof v==='string' && v && w.NF.isDirty(v.toLowerCase())) bad.push(lbl+' :: '+v); });
for(const k in w.NF.CONCEPT) chk('CONCEPT.'+k, w.NF.CONCEPT[k]);
for(const k in w.NF.MELODY_CONCEPT) chk('MELODY_CONCEPT.'+k, w.NF.MELODY_CONCEPT[k]);
chk('STYLES', w.NF.STYLES.map(s=>s.n));
chk('LAYERS', w.NF.LAYERS.map(l=>l.phrase));
chk('SCALES', w.NF.SCALES.map(s=>s.mood));
chk('MICRO_MODES', w.NF.MICRO_MODES.map(m=>m.desc));
const src=fs.readFileSync(file,'utf8');
const NAMES='ARRANGEMENTS|FEELINGS|FLAVORS|DIRECTIONS|LEADS|PERFS|HARMONIES|ARPS|CONTOURS|RHYTHMS|BASS_VOICES|BASS_MOVES|BASS_RELS|KICKS|HATS|SNARES|PERCS|TOMS|GROOVES|SWINGS|SYNCS|INTENSITIES|SPARK_IDEAS|SPARK_TITLES|SPARK_MASHUPS|SPARK_CONSTRAINTS|SPARK_TIPS|SPARK_VIBES|SPARK_PLACES|SPARK_THINGS|SPARK_TRANSFORMS|SPARK_CHALLENGES|SPARK_MEGA_LINES|SPARK_WEATHER|SPARK_LIGHT|SPARK_SOUNDS|SPARK_FUTURES|SPARK_ANTHEM_NAMES|EMOTION_ANTHEMS|MELODY_DOMINANT_ANTHEMS|HARMONY_ANTHEMS|SPARK_TITLES2|SPARK_HOOKS|SPARK_OPENERS|SPARK_SECTION_SPARKS|SPARK_STYLE_STUNTS|SPARK_GENRE_SCRAMBLES|SPARK_BASSLINES|SPARK_DRUM_LINES|SPARK_MELODY_PHRASES|SPARK_CONCEPT_TWISTS|SPARK_ARRANGEMENT_PACKS|SPARK_MIX_PUNCH|SPARK_MASTER_HEART|SPARK_SUNO_CUES|SPARK_DJ_NOTES|SPARK_MORE_MAGIC_2';
for(const m of src.matchAll(new RegExp('const ('+NAMES+') = \\[([\\s\\S]*?)\\n\\];','g')))
  chk(m[1], [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(x=>x[1]));
if(bad.length){ console.log('SELF-CENSORING POOL ENTRIES:'); bad.forEach(b=>console.log('  '+b)); }
else console.log('All pools pass the live sanitizer.');
console.log('total problems:', bad.length);
process.exit(bad.length?1:0);
