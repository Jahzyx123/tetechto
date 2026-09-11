/* =====================================================================
   NEON FORGE II — pool expander
   ---------------------------------------------------------------------
   Doubles (or better) the variety of every sound pool that feeds the
   base Suno 5.5 description. Called by build.js right after the pools
   are extracted from the original app — the originals stay first and
   untouched, the generated entries are appended.

   Two strategies:
   - TEMPLATE pools (the "maximum X / relentless Y drive" family):
     core nouns are extracted from the existing entries, then combined
     with a fresh adjective bank and the same suffix patterns.
   - HAND-CURATED pools (kicks, leads, bass, grooves, feelings…):
     literal new phrases, written to read naturally and to survive the
     genre-safe cleaner (no hard techno-isms in the shared pools).

   Generation is seeded & deterministic: same source → same build.
   ===================================================================== */
"use strict";

/* ---------------------------- seeded PRNG ---------------------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rng = mulberry32(20260901);
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}
function sample(arr, cap){
  const uniq = [...new Set(arr)];
  if(uniq.length <= cap) return uniq;
  return shuffle(uniq).slice(0, cap);
}
function clean(s){ return String(s).replace(/\s+/g," ").trim(); }
/* The app's sanitizer drops whole clauses containing "low-energy" words
   (BANNED_MINIMAL) — generated entries must never contain them or the
   description line would be stripped and re-added over budget. */
const BANNED_RE = /\b(minimal|minimalist|minimalism|sparse|restrained|low[- ]?energy|weak|tiny|gentle|quiet)\b/i;
function cleanAdds(list){ return (Array.isArray(list) ? list : []).filter(x => !BANNED_RE.test(String(x))); }
/* Dedup key: case + separator + whitespace insensitive — chord progressions
   like "i – vi – iv – v" vs "I – IV – V – vi" must count as one. */
function normKey(x){
  return String(x).toLowerCase().replace(/[\s–—-]+/g, " ").replace(/\s+/g, " ").trim();
}

/* ---------------------------- template-pool expander ---------------------------- */
const LEAD_RE = /^(maximum|relentless|explosive|ferocious|crushing|slamming|pounding|thunderous|euphoric|driving|overdriven|hyper-driven|turbo-charged|supercharged|reactor-fueled|voltage-spiked|circuit-bent|modular-patched|warehouse-powered|bunker-born|peak-time|hardgroove-locked|hypnotic|stuttering|rave-charged|acid-drenched|acid-driven)\s+/i;
const TAIL_RE = /\s+(drive|pressure|force|layer|curve|time|level|width|depth|size|amount|ratio|rate|cycle|stage|stack|double|tail|room|mass|body|weight|thickness|heft|bulk)\s*$/i;

const NEW_ADJS = [
  "deep","warm","soft","bright","dark","smooth","rich","clean","pure","raw","crisp",
  "velvet","silken","molten","granite","crystal","golden","silver","shadow","lunar",
  "primal","ancient","modern","vintage","future","liquid","solid","woven","forged",
  "glowing","burning","frozen","gentle","bold","subtle","lush","sparse","dense",
  "layered","open","tight","wide","hammered","polished","matte","glossy","stacked",
  "braided","carved","molded","pressed","rolled","double","triple"
];
const NEW_TAILS = ["", " drive", " pressure", " force"];

function templateExpand(existing, cap){
  const cores = [];
  for(const e of existing){
    let c = String(e).replace(LEAD_RE, "");
    c = c.replace(TAIL_RE, "");
    c = clean(c);
    if(c && c.length >= 3) cores.push(c);
  }
  const uniqCores = [...new Set(cores)];
  if(!uniqCores.length) return [];
  const out = [];
  for(const a of NEW_ADJS){
    for(const c of uniqCores){
      for(const t of NEW_TAILS){
        out.push(clean(a + " " + c + t));
      }
    }
  }
  const existingSet = new Set(existing.map(String));
  return cleanAdds(sample(out.filter(x => !existingSet.has(x)), cap));
}

/* ---------------------------- hand-curated expansions ---------------------------- */
const HAND = {
  FEELINGS: [
    "yearning","bittersweet","tender","fierce","defiant","restless","dreamy","grounded",
    "weightless","burning","glacial","molten","electric","smoldering","radiant","stormy",
    "serene","volcanic","velvet","razor-sharp","sunlit","moonlit","feverish","soothing",
    "aching","dizzy","soaring","plunging","suspended","charged","luminous","shadowed",
    "golden","crimson","quiet","loud","wild","tame","ancient","alive","breathless",
    "homesick","hopeful","wistful","longing","fearless","gentle","savage","sacred",
    "ecstatic and quiet","wild and tender","fierce and fragile","joyful and haunted",
    "soft and unbreakable","burning and clear","restless and patient","ancient and new"
  ],
  FLAVORS: [
    "warm and weathered","bright and aching","soft and massive","clear and strange",
    "deep and delicate","raw and radiant","quiet and thunderous","cool and smoldering",
    "luminous and heavy","dark and golden","airy and grounded","sharp and tender",
    "velvet and volcanic","crystalline and warm","hazy and precise","liquid and jagged",
    "honeyed and fierce","moonlit and urgent","sun-bleached and dark","rich and restless",
    "sparse and lush","open and mysterious","braided and bright","carved and flowing",
    "echoing and close","burning and cool","glacial and molten","woven and loose"
  ],
  DIRECTIONS: [
    "melody that climbs one step at a time then leaps",
    "hook that keeps circling back to one glowing note",
    "line that unspools slowly into something enormous",
    "phrase that starts quiet and ends triumphant",
    "theme that breaks into fragments and rebuilds",
    "melody that answers its own question",
    "hook that arrives late and stays forever",
    "line that ducks under the beat then rises over it",
    "phrase that shadows the harmony in thirds",
    "melody that walks away and comes back changed",
    "hook that burns slowly through the whole track",
    "line that floats above the groove without touching it",
    "melody that unravels into a single sustained note",
    "phrase that snaps like a whip on the off-beat",
    "theme that grows a new branch every chorus",
    "hook that whispers first and shouts last",
    "line that bends like a question mark",
    "melody that falls in love with the bassline",
    "phrase that never lands where the drums expect it",
    "hook that turns the key into a doorway",
    "melody that stitches the verses together",
    "line that hides behind the vocal and peeks out",
    "theme that is finished before you notice it started",
    "hook that hangs in the air after the track ends",
    "phrase that walks a tightrope over the kick",
    "melody that turns a sigh into a statement",
    "line that learns the chorus by heart",
    "hook that echoes like a bell in an empty hall",
    "melody that races the hi-hats and wins by a hair",
    "phrase that blooms exactly where the tension peaks",
    "theme that forgives its own mistakes",
    "hook that is three notes long and infinite",
    "line that drags the listener into the next section",
    "melody that paints the same color twice and makes it new",
    "phrase that holds its breath under the drop",
    "hook that leaves a question for the bridge",
    "melody that nods to the intro on the way out",
    "line that becomes the room it plays in",
    "theme that sounds inevitable by the second chorus",
    "hook that is already a memory on first listen"
  ],
  LEADS: [
    "flute lead","oboe lead","clarinet lead","bassoon lead","saxophone lead","tenor sax lead",
    "trumpet lead","muted trumpet lead","flugelhorn lead","trombone lead","french horn lead",
    "violin lead","viola lead","cello lead","double bass lead","harp lead","piano lead",
    "electric piano lead","wurlitzer lead","rhodes lead","organ lead","accordion lead",
    "bandoneon lead","harmonica lead","banjo lead","mandolin lead","dobro lead",
    "pedal steel lead","lap steel lead","ukulele lead","charango lead","sitar lead",
    "koto lead","shakuhachi lead","duduk lead","oud lead","ney lead","erhu lead",
    "guzheng lead","pipa lead","marimba lead","vibraphone lead","glockenspiel lead",
    "celesta lead","kalimba lead","mbira lead","music box lead","toy piano lead",
    "steel drum lead","pan flute lead","recorder lead","ocarina lead","melodica lead",
    "harmonium lead","bass clarinet lead","contrabass lead","bowed vibraphone lead",
    "glass harp lead","singing bowl lead","wind chime lead","finger-picked lead",
    "hammered dulcimer lead","music box chime lead","music box tone lead","breathy flute lead",
    "reedy oboe lead","warm clarinet lead","smoky saxophone lead","brassy trumpet lead",
    "silvery violin lead","dark cello lead","golden harp lead","ivory piano lead",
    "vintage electric piano lead","pump organ lead","street accordion lead","train whistle lead",
    "fiddle lead","cajun fiddle lead","bluegrass banjo lead","flamenco guitar lead",
    "nylon guitar lead","steel-string lead","twelve-string lead","slide guitar lead",
    "bottleneck guitar lead","resonator lead","classical guitar lead","jazz guitar lead"
  ],
  PERFS: [
    "played with aching slowness","performed with breathtaking speed","played with razor precision",
    "performed with liquid smoothness","played with raw power","performed with delicate touch",
    "played with iron restraint","performed with velvet softness","played with firecracker energy",
    "performed with glacial calm","played with burning urgency","performed with feather-light grace",
    "played with hammering drive","performed with whisper-quiet intimacy","played with stadium-sized drama",
    "performed with intimate warmth","played with cold exactness","performed with joyful bounce",
    "played with sorrowful weight","performed with playful lightness","played with nervous energy",
    "performed with steady confidence","played with wild abandon","performed with controlled fury",
    "played with open-hearted warmth","performed with machine-like accuracy","played with human imperfection",
    "performed with surgical clarity","played with smoky depth","performed with sunlit brightness"
  ],
  HARMONIES: [
    "warm open chords","bright suspended chords","dark lush voicings","tight gospel changes",
    "open fifths and ringing fourths","soft seventh chords","dreamy added-ninth chords",
    "tense unresolved clusters","calm diatonic progressions","rich extended harmonies",
    "sparse two-note harmony","dense stacked chords","jazzy altered chords","bluesy dominant colors",
    "soulful gospel cadences","folk-tinged triads","classical voice-led changes","modern quartal harmony",
    "minimal pedal-point harmony","epic sustained chords","intimate close voicings","golden major chords",
    "shadowed minor colors","radiant resolutions","soft plagal cadences","bold picardy thirds",
    "modal drone harmony","call-and-response chord stabs","breathing pad chords","echoing wide chords"
  ],
  ARPS: [
    "sparkling arpeggio","rippling arpeggio","tumbling arpeggio","rising arpeggio","falling arpeggio",
    "cascading arpeggio","glittering arpeggio","liquid arpeggio","crystal arpeggio","golden arpeggio",
    "soft arpeggio","fast arpeggio","slow arpeggio","wide arpeggio","narrow arpeggio",
    "broken-chord figure","swinging arpeggio","jazzy arpeggio","classical arpeggio","baroque figuration",
    "folk-style arpeggio","minimal arpeggio","lush arpeggio","dry arpeggio","echoing arpeggio",
    "soaring arpeggio","diving arpeggio","weaving arpeggio","fluttering arpeggio","hovering arpeggio",
    "pulsing arpeggio","rolling arpeggio","bell-like arpeggio","plucked arpeggio","bowed arpeggio"
  ],
  CONTOURS: [
    "steep ascending contour","shallow descending contour","wave-like contour","arch-shaped contour",
    "valley-shaped contour","sawtooth contour","stepwise contour","leaping contour","gliding contour",
    "angular contour","curved contour","smooth contour","jagged contour","serpentine contour",
    "spiral contour","linear contour","undulating contour","terraced contour","rocket-shaped contour",
    "plummeting contour","hovering contour","soaring contour","diving contour","climbing contour",
    "falling contour","flat contour","expanding contour","contracting contour","breathing contour",
    "question-shaped contour","staircase contour","ribbon contour","arc-of-light contour","tide contour"
  ],
  RHYTHMS: [
    "straight driving rhythm","swung loping rhythm","syncopated rhythm","laid-back rhythm",
    "urgent rhythm","gentle rhythm","heavy rhythm","light rhythm","broken rhythm","continuous rhythm",
    "staccato rhythm","legato rhythm","pulsing rhythm","breathing rhythm","galloping rhythm",
    "trotting rhythm","strolling rhythm","marching rhythm","dancing rhythm","hopping rhythm",
    "gliding rhythm","shuffling rhythm","dragging rhythm","pushing rhythm","lazy rhythm",
    "eager rhythm","calm rhythm","stormy rhythm","bright rhythm","dark rhythm","unhurried rhythm",
    "insistent rhythm","spinning rhythm","rocking rhythm","swaying rhythm"
  ],
  BASS_VOICES: [
    "upright bass","double bass","acoustic bass","fretless bass","bass guitar","five-string bass",
    "six-string bass","piccolo bass","baritone guitar","tuba","bass clarinet","bassoon",
    "contrabassoon","cello","bass saxophone","bari sax","sousaphone","bass marimba",
    "bass kalimba","bass flute","bass harmonica","bass recorder","steel bass","upright electric bass",
    "detuned bass","palm-muted bass","fingered bass","slapped bass","popped bass","picked bass",
    "hammered bass","bowed bass","plucked bass","walking bass","pedal bass","drone bass",
    "root bass","octave bass","fifth bass","melodic bass","counter-bass","sub-root bass",
    "thumping upright bass","resonant acoustic bass","growling fretless bass","velvet electric bass",
    "gut-string bass","flatwound bass","roundwound bass","tapewound bass","lacquered bass",
    "wooden-bodied bass","hollow-body bass","solid-body bass","short-scale bass","long-scale bass",
    "fretless hollow bass","synth-free analog bass","motown-style bass","p-bass","j-bass"
  ],
  BASS_MOVES: [
    "walking movement","strolling movement","running movement","hopping movement","leaping movement",
    "gliding movement","sliding movement","crawling movement","creeping movement","lunging movement",
    "pulsing movement","throbbing movement","breathing movement","swaying movement","rocking movement",
    "bobbing movement","weaving movement","diving movement","climbing movement","falling movement",
    "hovering movement","trembling movement","shivering movement","swelling movement","fading movement",
    "echoing movement","doubling movement","shadowing movement","answering movement","chasing movement",
    "leading movement","following movement","mirroring movement","anticipating movement","dragging movement",
    "pushing movement","locking movement","rolling movement","staccato movement","legato movement",
    "syncopated movement","off-beat movement","half-time movement","double-time movement","triplet movement",
    "swung movement","straight movement","walking up the changes","walking down the changes","root-fifth movement"
  ],
  BASS_RELS: [
    "bass locking with the kick","bass weaving around the kick","bass shadowing the kick","bass answering the kick",
    "bass chasing the kick","bass mirroring the kick","bass grounding the drums","bass lifting the drums",
    "bass driving under the drums","bass floating over the drums","bass pulsing beneath the groove",
    "bass breathing with the groove","bass dancing against the groove","bass resting on the harmony",
    "bass pulling against the harmony","bass pushing under the melody","bass riding with the melody",
    "bass circling the melody","bass hugging the harmony","bass sparring with the melody",
    "bass in conversation with the kick","bass doubling the lead an octave down","bass strolling under the chords",
    "bass locked to the pocket","bass walking a line through the changes","bass hovering under the vocal",
    "bass chasing the harmony upward","bass answering every snare","bass anchoring the whole arrangement",
    "bass moving in long gliding steps","bass stepping around the beat","bass weaving through the percussion",
    "bass holding a deep pedal tone","bass climbing with the chorus","bass settling into the groove"
  ],
  KICKS: [
    "deep warm kick","punchy tight kick","round fat kick","soft felt kick","dark woody kick",
    "dry room kick","boomy cavern kick","thumping stadium kick","crisp attack kick","snappy click kick",
    "hollow shell kick","rubber bounce kick","hammered anvil kick","golden vintage kick","dusty lo-fi kick",
    "slick modern kick","clean sample kick","rough gritty kick","muscular club kick","solid rock kick",
    "meaty funk kick","bouncy disco kick","lush jazzy kick","minimal techno kick","hypnotic rolling kick",
    "tribal drum kick","marching band kick","latin percussion kick","afrobeat kick","swung jazz kick",
    "walking bass drum","felt beater kick","wood beater kick","plastic beater kick","double-stroke kick",
    "ghosted kick","deadened kick","ringing kick","open-shell kick","front-head kick","back-head kick",
    "kick with a soft tail","kick with a sharp tail","kick that lands like a heartbeat","kick that pushes air",
    "kick that punches through the mix","kick that rolls under the bass"
  ],
  HATS: [
    "crisp closed hats","shiny open hats","tight 8th hats","loose 16th hats","sizzling ride hats",
    "dark jazzy hats","bright pop hats","soft brush hats","dry mechanical hats","wet splashy hats",
    "metallic trash hats","wooden block hats","glassy ping hats","airy light hats","delicate tick hats",
    "punchy accent hats","layered stadium hats","tribal shaker hats","minimal sparse hats","busy jungle hats",
    "swung soul hats","funky wah hats","hypnotic rolling hats","driving straight hats","shuffling blues hats",
    "latin clave hats","afrobeat shaker hats","marching snare hats","vintage tape hats","lo-fi crackle hats",
    "breathy open hats","needle-point hats","cut-glass hats","silver-tone hats","brass-tone hats",
    "half-open hats","quarter-open hats","foot-splash hats","bell hats","edge hats","bow hats",
    "hats with a ghost tick","hats that breathe","hats that sparkle","hats that cut the beat"
  ],
  SNARES: [
    "tight crack snare","deep fat snare","dry rimshot","wooden rim knock","metallic cross-stick",
    "brushed snare","soft ghost snare","punchy pop snare","jazz brush sweep","marching snare",
    "tribal djembe slap","punk snare burst","powerful rock snare","subtle folk snare","warm vintage snare",
    "dark ambient snare","bright piccolo snare","glassy synth snare","thick layered snare","thin snare tick",
    "echoing dub snare","gated stadium snare","lo-fi cassette snare","funky snare pop","soul snare crack",
    "blues shuffle snare","country rimshot","latin snare roll","afrobeat snare cut","reggae one-drop snare",
    "ska upstroke snare","swing brush snare","ballad soft snare","arena anthem snare","garage snare thump",
    "bossa snare tap","samba snare rolls","marching flam","snare buzz roll","cross-stick tap",
    "snare with a woody crack","snare with a paper snap","snare that barks","snare that whispers"
  ],
  PERCS: [
    "wooden block percussion","metal shaker percussion","tribal bongo percussion","congas","claves",
    "cowbell accents","tambourine shaker","timbale hits","djembe slaps","frame drum strokes",
    "talking drum phrases","cajon thumps","maracas","guiro scrapes","cabasa shakes","triangle rings",
    "shaker egg patterns","finger snaps","hand claps","stomp accents","click tracks","knock patterns",
    "ratchet rattles","jingle cascades","chime glints","bells tolling","woodblock ticks","cuica squeals",
    "berimbau twangs","shekere shakes","agogo bells","caxixi rattles","pandeiro slaps","repinique bursts",
    "surdo thumps","tamborim cracks","caixa rolls","cuatro rasgueos","castanet chatter","bone clicks",
    "spoons clacking","washboard scrapes","jawbone rattles","rainstick whispers","ocean drum swells",
    "finger cymbal shimmer","sleigh bell jingles","mark tree cascades","wind chime drifts","glass bottle clinks",
    "percussion that dances around the beat","percussion that fills the cracks","percussion that answers the snare"
  ],
  TOMS: [
    "deep floor toms","low rack toms","punchy mid toms","resonant concert toms","wooden shell toms",
    "metallic rototoms","tribal drum toms","rolling tom fills","melodic tuned toms","dark heavy toms",
    "warm round toms","bright cutting toms","powerful rock toms","soft ballad toms","fat disco toms",
    "afrobeat talking toms","latin timbale toms","marching quad toms","syncopated tom patterns",
    "octoban runs","double-floor toms","single-rack toms","high-pitched toms","low-pitched toms",
    "tom fills that climb","tom fills that tumble","tom rolls under the melody","tom accents on the off-beat",
    "tom hits that echo","tom patterns that spiral","tom swells into the chorus","tom chatter in the breakdown"
  ],
  GROOVES: [
    "tight pocket groove","loose swing groove","driving rock groove","rolling funk groove","hypnotic minimal groove",
    "bouncy pop groove","shuffling blues groove","swinging jazz groove","pulsing disco groove","locked-in groove",
    "straight-ahead groove","syncopated groove","broken-beat groove","half-time groove","double-time groove",
    "lazy afternoon groove","urgent dance groove","tribal stomp groove","funky strut groove","soulful sway groove",
    "minimal pulse groove","maximal party groove","deep warm groove","crisp tight groove","heavy riff groove",
    "light skipping groove","elastic rubber groove","mechanical precision groove","human breath groove",
    "machine lock groove","latin clave groove","afrobeat engine groove","reggae skank groove","ska jump groove",
    "samba carnival groove","bossa sway groove","two-step garage groove","four-to-the-floor groove",
    "backbeat groove","half-beat drag groove","groove that leans forward","groove that sits back",
    "groove with a limp","groove with a skip","groove that never rushes","groove that breathes"
  ],
  SWINGS: [
    "subtle swing","heavy swing","loose swing","tight swing","laid-back swing","pushed swing",
    "jazzy swing","bluesy shuffle","triplet swing","16th swing","8th swing","half-time swing",
    "dotted swing","swung feel","bouncy swing","lazy swing","urgent swing","danceable swing",
    "natural swing","elastic swing","human swing","machine swing","funky swing","soulful swing",
    "deep swing","light swing","medium swing","hard swing","swing with a drag","swing with a push",
    "swing that sways","swing that snaps","loose-limbed swing","metronomic swing","vocal-like swing"
  ],
  SYNCS: [
    "off-beat syncopation","ghost-note syncopation","stuttered syncopation","polyrhythmic layering",
    "cross-rhythm accents","displaced backbeat","delayed snare hits","anticipating the downbeat",
    "dragging behind the beat","pushing ahead of the beat","tight syncopated accents","loose syncopation",
    "subtle rhythmic displacement","heavy off-beat accents","funky syncopation","jazzy syncopation",
    "tribal cross-rhythms","broken syncopation","rolling syncopation","chopped rhythm hits",
    "organic human syncopation","hypnotic off-beat pulse","driving syncopated drive","laid-back displacement",
    "urgent push-and-pull","danceable syncopation","machine-perfect offsets","humanized timing offsets",
    "syncopation that teases the beat","syncopation that lands sideways","syncopation that doubles back",
    "off-beat ghost ticks","tied-note syncopation","sixteenth-note displacement","eighth-note push"
  ],
  INTENSITIES: [
    "gentle simmer","soft swell","moderate drive","building momentum","growing pressure","peaking surge",
    "maximal blast","frenetic burst","hypnotic pulse","controlled burn","restrained power","open airiness",
    "dense wall","sparse elegance","steady roll","rising tide","falling away","wave-like motion",
    "thunderous peak","burning heat","icy precision","liquid flow","crackling energy","simmering tension",
    "boiling point","focused beam","scattered glitter","tight coil","loose explosion","deep breath",
    "held-back storm","unleashed torrent","quiet before the peak","slow-burn intensity","accelerating urgency"
  ],
  TECHNO_DRIVES: [
    "iron-lung drive","gear-grind drive","piston-punch drive","flywheel drive","turbine-surge drive",
    "magnet-coil drive","plasma drive","ion drive","worm-gear drive","crankshaft drive","camshaft drive",
    "lathe drive","press-brake drive","mill-whine drive","dynamo drive","generator-hum drive",
    "relay-chatter drive","servo drive","actuator drive","hydraulic-ram drive","pneumatic-burst drive",
    "compressor-surge drive","boiler-pressure drive","quench drive","anneal drive","kiln-heat drive"
  ],
  TECHNO_ACIDS: [
    "midnight acid crawl","acid skipping-rope line","acid stair-step run","acid breath cycle","acid morse code",
    "acid telegraph line","acid rainfall","acid drip line","acid pulse train","acid waveform dance",
    "acid zig-zag line","acid echo chase","acid mirror response","acid feedback howl","acid tuning sweep",
    "acid detune wash","acid ping-pong","acid bounce-back","acid shadow line","acid ghost note",
    "acid friction line","acid current flow","acid circuit loop","acid spark line","acid wire hum",
    "acid coil resonance"
  ],
  TECHNO_TEXTURES: [
    "oil-slick texture","rust-flake texture","weld-spatter texture","coolant-hiss texture","ballast-hum texture",
    "transformer-drone texture","cable-slap texture","pallet-drop texture","forklift-whine texture",
    "crane-hook rattle texture","hopper-pour texture","silicon-dust texture","circuit-board texture",
    "solder-fume texture","tape-shred texture","reel-brake clatter texture","print-head chatter texture",
    "modem-shriek texture","dial-tone texture","static-burst texture","power-line hum texture","neon-buzz texture",
    "marquee-flicker texture","train-rail texture","tunnel-wind texture","platform-echo texture"
  ],
  TECHNO_RAVES: [
    "hands-up rave hook","stadium rave chant","midnight rave pulse","sunrise rave swell","warehouse rave call",
    "after-hours rave shimmer","peak-hour rave roar","bunker rave whisper","main-room rave surge",
    "open-air rave glow","back-to-back rave loop","free-party rave drive","underground rave hum",
    "skyline rave sparkle","tunnel rave bounce","dockyard rave clatter","rooftop rave breeze",
    "basement rave weight","festival rave bloom","finale rave fire","first-light rave hush",
    "last-train rave rush","red-eye rave haze","echo-chamber rave call"
  ],
  TECHNO_INDUSTRIALS: [
    "stamping-press industrial","foundry-hammer industrial","chain-drag industrial","blast-furnace industrial",
    "assembly-line industrial","steel-rolling industrial","rivet-gun industrial","jackhammer industrial",
    "scaffold-rattle industrial","dock-crane industrial","freight-train industrial","mine-shaft industrial",
    "breaker-circuit industrial","transformer-yard industrial","smokestack industrial","boiler-room industrial",
    "machine-shop industrial","welding-bay industrial","paint-fume industrial","conveyor-belt industrial",
    "gear-cage industrial","turbine-hall industrial","slag-pit industrial","forge-heat industrial"
  ],
  SOUND_INTENSITIES: [
    "whisper 10%","airy 15%","room 25%","live 40%","full 55%","open 65%","hot 75%","burning 85%",
    "molten 95%","nuclear 130%"
  ],
  RHYTHM_PATTERNS: [
    "straight 8th","straight 16th","half-time shuffle","broken beat","2-step","swung 12/8","waltz 3/4",
    "5/4 groove","7/8 groove","9/8 lilt","12/8 gospel swing","cut-time drive","polyrhythm 3:2","polyrhythm 4:3",
    "marching 2/4","tambora groove","bembe","guaguanco","son montuno","mojito groove","baiao","xote",
    "forro","milonga","tango groove","bolero","cha-cha","mambo","salsa montuno","cumbia rebajada",
    "afrobeat engine","highlife","soukous","zouk","kizomba","tarantella","rebetiko","dabke","maqsum",
    "baladi","khaliji","dhol bhangra","garba cycle","taiko pattern","gamelan colotomic","samba batucada",
    "samba partido alto","bossa syncopation","samba reggae","afoxe","ijexa","samba de roda","choro",
    "maxixe","fado corrido","sega","morne","beguine","calypso 2/4","soca 4/4","ska offbeat",
    "rocksteady","one drop","rockers","steppers","rub-a-dub","dancehall 1:2","jersey bounce","philly boom",
    "miami bass","trap half-time","drill sliding","grime 140","footwork 160"
  ],
  VOCAL_DIRECTIONS: [
    "raw emotional vocal cry","breathy intimate whisper","layered choir harmony","duet vocal exchange",
    "spoken-word intro line","gospel-style ad-libs","operatic vocal flourish","falsetto vocal hook",
    "gravelly blues vocal","whispered hook","soulful melisma run","call-and-response vocal hook",
    "male-female vocal trade","vintage tape vocal","echo-laden vocal phrase","siren-like vocal slide",
    "hushed verse then soaring chorus","confessional close-mic vocal"
  ]
};

/* ---------------------------- CHORD PROG generator ---------------------------- */
function chordProgs(cap){
  const minor = ["i","ii","III","iv","v","VI","VII","bVI","bVII","bIII"];
  const major = ["I","ii","iii","IV","V","vi","vii°","bVII"];
  const out = [];
  const flavors = ["", "", "", " (phrygian)", " (major lift)", " (epic)", " (anthem)", " (modal)"];
  for(let n=0; n<60; n++){
    const useMinor = rng() < 0.6;
    const pool = useMinor ? minor : major;
    const len = 3 + Math.floor(rng()*2); // 3–4 chords
    const seq = [];
    for(let i=0;i<len;i++){
      let c = pool[Math.floor(rng()*pool.length)];
      if(i>0){ let g=0; while(seq[seq.length-1]===c && g++<6) c = pool[Math.floor(rng()*pool.length)]; }
      seq.push(c);
    }
    if(!useMinor && rng()<0.5) seq[seq.length-1] = seq[seq.length-1].toUpperCase().replace("°","");
    let s = seq.join(" – ") + flavors[Math.floor(rng()*flavors.length)];
    out.push(s);
  }
  const seen = new Set();
  const uniq = [];
  for(const s of out){
    const k = normKey(s);
    if(!seen.has(k)){ seen.add(k); uniq.push(s); }
  }
  return uniq.slice(0, cap);
}

/* ---------------------------- special template pools ---------------------------- */
const SPECIAL_TEMPLATE = {
  REVERB_TYPES(existing, cap){
    const cores = [];
    for(const e of existing){
      const parts = String(e).split(/\s+/);
      if(parts.length) cores.push(parts[0]);
    }
    const quals = ["huge","vast","endless","deep","dense","airy","dark","bright","warm","cold",
      "tight","wide","soft","hard","lush","dry","wet","metallic","woody","glassy","smooth",
      "gritty","vintage","modern","future","steel","stone","wood","glass","marble","concrete"];
    const out = [];
    for(const c of [...new Set(cores)]){
      for(const q of quals) out.push(c + " " + q);
    }
    const existingSet = new Set(existing.map(String));
    return cleanAdds(sample(out.filter(x => !existingSet.has(x)), cap));
  },
  FILTER_TYPES(existing, cap){
    const add = [
      "lowpass 6dB","lowpass 18dB","highpass 6dB","highpass 18dB","bandpass 6dB","bandpass 18dB",
      "notch wide","notch narrow","comb metallic","comb soft","formant choir","formant robot",
      "state-variable band","diode 6dB","ladder 2-pole","parallel bandpass","serial bandpass",
      "dual notch","triple notch","allpass 4-stage","allpass 8-stage","vowel a","vowel e","vowel o",
      "morph slow","morph fast","key-tracked 50%","envelope-following","bandpass + notch",
      "lowpass + bandpass","highpass + notch","comb + bandpass","drive + bandpass","clean bandpass",
      "glassy highpass","round lowpass","snappy bandpass","vocal formant sweep","mid-scoop notch",
      "telephone bandpass","radio lowpass","tape-mix highpass","crushed bandpass"
    ];
    const existingSet = new Set(existing.map(String));
    return cleanAdds(sample(add.filter(x => !existingSet.has(x)), cap));
  }
};

/* ---------------------------- object pools ---------------------------- */
function expandMelodyConcept(bodyObj){
  const out = JSON.parse(JSON.stringify(bodyObj));
  const story = [
    "a lighthouse beam finding a ship","a seed cracking open underground","two voices learning each other's names",
    "a door that only opens from the inside","a river finding the sea after a long detour",
    "a photograph slowly developing in the dark","a kite climbing into a storm","an echo that grows with every return",
    "a clock ticking backward into a memory","a bridge being built note by note","a fire started with one match",
    "a garden growing between cobblestones","a letter that finally gets an answer","a wave learning to stand still",
    "a telescope turned toward a familiar star","a song being remembered by a stranger","a key turning in a rusted lock",
    "a bird crossing a city at dawn","a stone skipping across still water","a bell that rings before the tower is built"
  ];
  const role = [
    "the melody is the question the bass softly answers","the melody leads and everything else follows its breath",
    "the melody is a voice arriving mid-conversation","the melody stitches the sections together",
    "the melody is the thread the drums hang from","the melody walks while the harmony carries its coat",
    "the melody is a visitor who never overstays","the melody is the weather the whole track lives in",
    "the melody argues gently with the harmony","the melody is the memory the track keeps returning to",
    "the melody opens doors the percussion walks through","the melody is the heartbeat everyone else syncs to",
    "the melody plays tour guide through the arrangement","the melody is the flag planted at each peak",
    "the melody hides in the verses and rules the chorus"
  ];
  const motion = [
    "hovers, then drops a whole octave","circles the tonic and never lands","climbs in thirds, returns in seconds",
    "leans into the off-beats like a dancer","unspools in long arcs between phrases","zigzags between close and wide intervals",
    "walks a spiral that tightens each chorus","suspends on the fifth, resolves late","glides through passing tones",
    "punches the downbeat, floats the rest","echoes itself one bar later, an octave up","stutter-steps then leaps clean",
    "rides the kick in the verse, soars in the chorus","turns every repeat into a new doorway","breathes in the gaps between drums"
  ];
  const hook = [
    "three notes that feel like a name","a hook that lands on the ninth and stays","a two-note question with a five-note answer",
    "a phrase you can hum before the song ends","a hook built from the title's rhythm","a falling line that turns up at the last step",
    "a hook that waits until the second chorus to show its full shape","a single held note that says everything",
    "a hook that borrows the bassline's best move","an ascending figure that never quite resolves","a hook you hear once and own forever",
    "a rhythmic hook made of rests and one accent","a hook that mirrors the kick pattern","a hook that turns the bridge into a homecoming",
    "a hook with a built-in key change feel","a hook that whispers in the intro and shouts at the end","a hook made of one chord and a lot of nerve",
    "a hook that sounds like a cheer","a hook that sounds like a goodbye","a hook that sounds like a beginning"
  ];
  out.story = out.story.concat(story);
  out.role = out.role.concat(role);
  out.motion = out.motion.concat(motion);
  out.hook = out.hook.concat(hook);
  return out;
}
function expandLayers(arr){
  const out = arr.slice();
  const add = [
    {id:"tapeWarmth", label:"Tape", phrase:"warm tape-style saturation"},
    {id:"grit", label:"Grit", phrase:"gritty analog drive"},
    {id:"air", label:"Air", phrase:"open airy high-end shimmer"},
    {id:"room", label:"Room", phrase:"natural room ambience"}
  ];
  const have = new Set(out.map(l=>l.id));
  add.forEach(l=>{ if(!have.has(l.id)) out.push(l); });
  return out;
}

/* ---------------------------- main entry ---------------------------- */
const EXPANDERS = {
  FEELINGS: 60, FLAVORS: 50, DIRECTIONS: 45, LEADS: 60, PERFS: 30, HARMONIES: 40,
  ARPS: 30, CONTOURS: 25, RHYTHMS: 25, BASS_VOICES: 50, BASS_MOVES: 40, BASS_RELS: 35,
  KICKS: 45, HATS: 40, SNARES: 35, PERCS: 45, TOMS: 30, GROOVES: 45, SWINGS: 25,
  SYNCS: 25, INTENSITIES: 30, TECHNO_DRIVES: 26, TECHNO_ACIDS: 26, TECHNO_TEXTURES: 26,
  TECHNO_RAVES: 24, TECHNO_INDUSTRIALS: 24, SOUND_INTENSITIES: 10, RHYTHM_PATTERNS: 40,
  VOCAL_DIRECTIONS: 18
};
/* template pools: cores extracted from existing entries */
const TEMPLATE_POOLS = [
  "MIX_DENSITY","MIX_ENERGY","MIX_SPACE","MIX_GLUE","MIX_PUNCH","MASTER_DRIVE",
  "MASTER_LOUDNESS","MASTER_COLOR","MASTER_CHAIN","FILTER_CUTOFF_TYPES",
  "FILTER_RESONANCE_TYPES","EQ_TYPES","COMPRESSION_TYPES","SATURATION_TYPES",
  "SIDECHAIN_CURVE_TYPES","STEREO_IMAGE","STEREO_WIDTH","SPATIAL_DEPTH",
  "SPATIAL_MOVEMENT","MOD_SOURCE","MOD_DEST","MOD_RATE","MOD_DEPTH","TEXTURE_LAYER",
  "GRAIN_TYPE","SHIMMER_TYPE","ATMOSPHERE_TYPE","REVERB_SIZE_TYPES","REVERB_DECAY_TYPES",
  "STEREO_ENHANCE_TYPES","GHOST_NOTES","HUMANIZE_TYPES","POCKET_TYPES","ORNAMENT_TYPES",
  "VIBRATO_TYPES","PORTAMENTO_TYPES","SCALE_RUNS","INTERVAL_LEAPS","VOICING_TYPES",
  "INVERSION_TYPES","TENSION_TYPES","RESOLUTION_TYPES","DELAY_TIME_TYPES",
  "DELAY_FEEDBACK_TYPES","SECTION_DENSITY_TYPES","RIDE_TYPES","CRASH_TYPES",
  "CLAP_LAYERS","PERC_FILLS","FX_TYPES","TRANSITION_TYPES","RISER_TYPES","IMPACT_TYPES",
  "ENERGY_CURVE_TYPES","BUILD_TYPES","DROP_TYPES","CHOP_TYPES"
];
const TEMPLATE_CAP = 24;

function parseBody(body){
  // body is the raw `const X = <stmt>` body — parse it standalone
  return Function('"use strict"; return (' + body + ");")();
}
function jsonConst(name, arr){
  return JSON.stringify(arr, null, 1).replace(/\n/g, "\n");
}

function expandPools(name, body){
  if(HAND[name]){
    const existing = parseBody(body);
    if(!Array.isArray(existing)) return body;
    const add = cleanAdds(HAND[name]);
    const existingSet = new Set(existing.map(String));
    const fresh = sample(add.filter(x => !existingSet.has(x)), add.length);
    const out = existing.concat(fresh);
    return "[\n" + out.map(x => JSON.stringify(x)).join(",\n") + "\n]";
  }
  if(name === "CHORD_PROGS"){
    const existing = parseBody(body);
    if(!Array.isArray(existing)) return body;
    // dedup the WHOLE pool (case/separator-insensitive) — the original
    // entries already contain case-variants like "i – vi – IV – v" vs
    // "i – vi – iv – v" that roll as duplicates; originals keep priority.
    const seen = new Set();
    const out = [];
    for(const x of existing){ const k = normKey(x); if(!seen.has(k)){ seen.add(k); out.push(x); } }
    for(const x of chordProgs(50)){ const k = normKey(x); if(!seen.has(k)){ seen.add(k); out.push(x); } }
    return "[\n" + out.map(x => JSON.stringify(x)).join(",\n") + "\n]";
  }
  if(name === "REVERB_TYPES" || name === "FILTER_TYPES"){
    const existing = parseBody(body);
    if(!Array.isArray(existing)) return body;
    const fresh = SPECIAL_TEMPLATE[name](existing, name === "REVERB_TYPES" ? 30 : 25);
    const out = existing.concat(fresh);
    return "[\n" + out.map(x => JSON.stringify(x)).join(",\n") + "\n]";
  }
  if(name === "MELODY_CONCEPT"){
    const obj = parseBody(body);
    if(!obj || typeof obj !== "object" || Array.isArray(obj)) return body;
    return JSON.stringify(expandMelodyConcept(obj), null, 1);
  }
  if(name === "LAYERS"){
    const arr = parseBody(body);
    if(!Array.isArray(arr)) return body;
    return JSON.stringify(expandLayers(arr), null, 1);
  }
  if(TEMPLATE_POOLS.includes(name)){
    const existing = parseBody(body);
    if(!Array.isArray(existing)) return body;
    const fresh = templateExpand(existing, TEMPLATE_CAP);
    const out = existing.concat(fresh);
    return "[\n" + out.map(x => JSON.stringify(x)).join(",\n") + "\n]";
  }
  return body;
}

module.exports = { expandPools };
