/* scales.js — Musical key engine data: notes, scales (with real intervals), microtonal modes, melodic force levels.
   GENERATED VERBATIM from Tetech-main/index.html by tools/extract-data.js.
   Do not hand-edit; re-run `node tools/extract-data.js` instead. */

export const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

export const SCALES = [
  {id:"aeolian",      n:"natural minor",     iv:[0,2,3,5,7,8,10],   mood:"dark, classic techno melancholy"},
  {id:"harmonicMin",  n:"harmonic minor",    iv:[0,2,3,5,7,8,11],   mood:"exotic tension, dramatic lift"},
  {id:"phrygian",     n:"phrygian",          iv:[0,1,3,5,7,8,10],   mood:"menacing, ritual, Spanish-dark"},
  {id:"phrygianDom",  n:"phrygian dominant", iv:[0,1,4,5,7,8,10],   mood:"snake-charmer aggression"},
  {id:"dorian",       n:"dorian",            iv:[0,2,3,5,7,9,10],   mood:"hopeful minor, hardgroove staple"},
  {id:"minorPent",    n:"minor pentatonic",  iv:[0,3,5,7,10],       mood:"unmissable hook, zero wrong notes"},
  {id:"hirajoshi",    n:"hirajoshi",         iv:[0,2,3,7,8],        mood:"stark, alien, cinematic"},
  {id:"lydian",       n:"lydian",            iv:[0,2,4,6,7,9,11],   mood:"soaring, weightless, euphoric"},
  {id:"mixolydian",   n:"mixolydian",        iv:[0,2,4,5,7,9,10],   mood:"anthemic major with grit"},
  {id:"melodicMin",   n:"melodic minor",     iv:[0,2,3,5,7,9,11],   mood:"aching but ascending"},
  {id:"doubleHarm",   n:"double harmonic",   iv:[0,1,4,5,7,8,11],   mood:"occult, maximal exotic"},
  {id:"wholeTone",    n:"whole tone",        iv:[0,2,4,6,8,10],     mood:"floating, gravity-free dread"},
  {id:"octatonic",    n:"octatonic",         iv:[0,2,3,5,6,8,9,11], mood:"mechanical, endlessly climbing"},
  {id:"locrian",      n:"locrian",           iv:[0,1,3,5,6,8,10],   mood:"unstable, collapsing"},
  {id:"majorPent",    n:"major pentatonic",  iv:[0,2,4,7,9],        mood:"bright, wide-open, festival hands"},
  {id:"blues",        n:"blues",             iv:[0,3,5,6,7,10],     mood:"dirty, swaggering, gutter groove"},
  {id:"ionian",       n:"major",             iv:[0,2,4,5,7,9,11],   mood:"pure euphoria, anthemic daylight"},
  {id:"hungarianMin", n:"hungarian minor",   iv:[0,2,3,6,7,8,11],   mood:"gothic, blade-sharp exotic"},
  {id:"neapolitanMin",n:"neapolitan minor",  iv:[0,1,3,5,7,8,11],   mood:"operatic dread, rising menace"},
  {id:"iwato",        n:"iwato",             iv:[0,1,5,6,10],       mood:"hollow, ritual, deeply strange"},
  {id:"insen",        n:"insen",             iv:[0,1,5,7,10],       mood:"spare eastern tension"},
  {id:"prometheus",   n:"prometheus",        iv:[0,2,4,6,9,10],     mood:"mystic, unresolved, hovering"},
  {id:"superLocrian", n:"altered",           iv:[0,1,3,4,6,8,10],   mood:"maximum harmonic chaos"},
  {id:"chromaticRun", n:"chromatic cluster", iv:[0,1,2,3,4,5,6,7,8,9,10,11], mood:"no tonal centre, pure aggression"},
  {id:"bhairav",      n:"bhairav",           iv:[0,1,4,5,7,8,11],   mood:"dawn raga, sacred and heavy"},
  {id:"todi",         n:"todi",              iv:[0,1,3,6,7,8,11],   mood:"intensely exotic, coiled"},
  {id:"ukrainian",    n:"ukrainian dorian",  iv:[0,2,3,6,7,9,10],   mood:"blade-bright minor, driving"}
];

export const MICRO_MODES = [
  {id:"off",       label:"Off",            cents:0,    desc:""},
  {id:"quarter",   label:"Quarter-tone",   cents:50,   desc:"quarter-tone microtonal inflections between the semitones"},
  {id:"sixth",     label:"Sixth-tone",     cents:33.33,desc:"sixth-tone microtonal shading"},
  {id:"eighth",    label:"Eighth-tone",    cents:25,   desc:"eighth-tone micro-detuning"},
  {id:"just",      label:"Just intonation",cents:-13.7,desc:"just-intonation pure harmonic tuning"},
  {id:"maqam",     label:"Maqam (3/4)",    cents:-50,  desc:"maqam-style three-quarter-tone intervals"},
  {id:"drift",     label:"Analog drift",   cents:12,   desc:"unstable analog pitch drift"},
  {id:"wide",      label:"Wide detune",    cents:22,   desc:"wide microtonal detuning between layers"}
];

export const MELODY_FORCE = {
  light:{label:"Light", desc:"subtle melodic layer, low melody priority"},
  balanced:{label:"Balanced", desc:"melody and groove in balance"},
  strong:{label:"Strong", desc:"melody leads, full melodic detail"},
  dominant:{label:"Dominant", desc:"melody is the emotional core of the track"}
};
