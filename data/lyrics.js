/* data/lyrics.js — curated lyric banks for the Lyrics Studio.
   Hand-written (NOT extracted): the legacy app never generated lyrics,
   so this is net-new content. Everything is genre-neutral imagery
   (night, light, fire, rain, roads, hearts, signals) that reads as well
   over jazz as over techno; the sci-fi slots ({place}) are only injected
   for electronic worlds.

   Lane shape:
   - verse:  [lineA, lineB] rhyming couplets (4-line verse = two picks)
   - pre:    two-line builds into the hook
   - chorus: six-line hook sets; line 3 and line 6 are "{title}" anchors
   - bridge: two-line turns
   - chants: short shout-along fragments for drops / intros / outros
   Verse couplets flagged place:true contain a {place} slot and are
   skipped for organic (acoustic) genres. */

export const LYRIC_LANES = {
  euphoric: {
    adj: ["powerful", "uplifting", "anthemic"],
    verse: [
      ["we were chasing the static across the night", "till the city below us was only light"],
      ["every shadow we carried dissolves in sound", "this is the moment we don't come down"],
      ["hands in the air where the bassline glows", "nobody leaves till the whole room knows"],
      ["a spark in the wreckage, a pulse in the dark", "beating in time like a second heart"],
      ["all of the noise of the years behind", "melts in the roar of the lights gone blind"],
      ["we found each other in frequency", "and the whole wide world was the crowd and me"],
      ["run through the fire with our hands untied", "born in the flash on the other side"],
      ["the sky is a wire and the night is lit", "every heartbeat answers it"],
      ["we don't need sleep and we don't need ground", "only this beat and the spell we found"],
      ["colors are bleeding through broken glass", "this is the high that was built to last"],
      ["we wrote our names in the stadium light", "loud as a riot, bright as kites"],
      ["down where the {place} glows", "everybody's dancing on their toes"]
    ],
    pre: [
      ["so hold on tighter, here it comes", "the loudest beat beneath our drums"],
      ["one more breath and the room ignites", "we are the signal in the lights"],
      ["rise with me as the speakers blow", "there's nowhere else we'd rather go"],
      ["count it down and feel it start", "a firework inside our hearts"]
    ],
    chorus: [
      ["we are the ones they couldn't tame", "we are the spark inside the flame", "{title}", "louder than the fear we knew", "every color breaking through", "{title}"],
      ["throw your hands up into the light", "we own tonight, we own the night", "{title}", "sing it back till the walls give way", "we were born to rise today", "{title}"],
      ["higher, higher, never low", "this is where the broken go", "{title}", "turn it up and lose control", "music for the restless soul", "{title}"],
      ["gold in our lungs and fire in our feet", "dancing to the same heartbeat", "{title}", "nothing ever felt this right", "we become the light tonight", "{title}"]
    ],
    bridge: [
      ["if the morning comes too soon", "we'll be howling at the moon"],
      ["every voice becomes the choir", "every heart is on the wire"]
    ],
    chants: ["whoa-oh-oh-oh", "higher, higher", "don't let go", "one more time", "we're alive", "up, up, up", "all night long", "here we go"]
  },

  aggressive: {
    adj: ["aggressive", "gritty", "intense"],
    verse: [
      ["knees in the gravel and teeth in the wire", "we keep on walking through the fire"],
      ["they built a ceiling over every dream", "we tore the panels from the seams"],
      ["cold in the bones and hot in the veins", "thunder running through the lanes"],
      ["no god, no master, no reply", "only the will to touch the sky"],
      ["bite down hard on the hand of fear", "smile while the walls disappear"],
      ["a war in the chest and a storm in the throat", "every last word ripped from the coat"],
      ["we don't bow low and we don't break ranks", "blood in the grooves of the tank-trap banks"],
      ["sharp as a shiver, hard as stone", "we take the long way back alone"],
      ["sirens are singing the count of three", "charge on the beat of the enemy"],
      ["the city shakes when the kickdrum bites", "we are the teeth inside the night"],
      ["rust on our knuckles, smoke in our eyes", "nobody leaves and nobody hides"],
      ["down where the {place} roars", "we're kicking down the iron doors"]
    ],
    pre: [
      ["hold the line and don't look down", "we're taking back the higher ground"],
      ["one, two, let the pressure rise", "thunder in a hundred eyes"],
      ["feel it building in the chest", "no surrender, no contest"],
      ["strap in tight and count to ten", "we were never meant to bend"]
    ],
    chorus: [
      ["we are the crack inside the bell", "we are the fight they couldn't quell", "{title}", "break it open, make it loud", "we're the anger and the crowd", "{title}"],
      ["run with the wolves and don't look back", "every weakness under attack", "{title}", "teeth in the wire, boots in the mud", "risen from the underblood", "{title}"],
      ["louder than the gun report", "we're the storm beyond the fort", "{title}", "no retreat and no remorse", "we're the breaking and the force", "{title}"],
      ["stone in the hand and fire in the lung", "the anthem of the over-young", "{title}", "give us wall and give us door", "we are what you couldn't floor", "{title}"]
    ],
    bridge: [
      ["and when the last light flickers out", "that's when the fear starts to doubt"],
      ["we learned to stand inside the blow", "the harder wind, the harder grow"]
    ],
    chants: ["hey, hey, hey", "move, move", "no retreat", "stand up", "break it down", "all in, all in", "push it harder", "rise, rise"]
  },

  dark: {
    adj: ["breathy", "haunting", "intimate"],
    verse: [
      ["the city rain remembers every name", "and washes out the ones that never came"],
      ["i kept your shadow by the door", "it doesn't leave me anymore"],
      ["static on the line at half past three", "the only voice still talking back to me"],
      ["neon bleeding through a broken blind", "no one's keeping track of time"],
      ["we were a signal lost in grey", "fading longer every day"],
      ["cold cup of coffee, hollow hall", "i learned to talk into the wall"],
      ["the streets we walked are underwater now", "and every light is burning out somehow"],
      ["a paper heart in a paper town", "the kind of quiet that can drown"],
      ["i trace the outline of the door", "you don't live here anymore"],
      ["midnight opens like a wound", "whistling an old familiar tune"],
      ["every window holds a ghost", "every silence counts the most"],
      ["down where the {place} sleeps", "the dark is buried ankle-deep"]
    ],
    pre: [
      ["and it's pulling me below", "where the quiet currents go"],
      ["one more hour, one more ghost", "what i miss the missing most"],
      ["let the record spin to black", "nothing ever headed back"],
      ["slow the breathing, close the eyes", "only dark behind the skies"]
    ],
    chorus: [
      ["i'm still wandering the afterglow", "learning how to walk this slow", "{title}", "every footstep, every room", "humming in the key of you", "{title}"],
      ["and the night keeps score", "of the love we couldn't pour", "{title}", "rain against the window glass", "nothing ever seems to last", "{title}"],
      ["carry me where signals fade", "through the architecture of the shade", "{title}", "hold the quiet like a vow", "all we are is static now", "{title}"],
      ["ghost of a heartbeat in the wire", "smoke of an old forgotten fire", "{title}", "if you're listening out there", "this is all i've left to share", "{title}"]
    ],
    bridge: [
      ["and underneath the frost we kept", "a final ember never slept"],
      ["the dark is just the light, withdrawn", "i'm still here, i'm holding on"]
    ],
    chants: ["mm-mmm-mmm", "stay with me", "so cold", "don't go", "hush now", "fade away", "calling, calling", "in the dark"]
  },

  romantic: {
    adj: ["smooth", "soulful", "intimate"],
    verse: [
      ["slow motion hour by the window light", "moving to a rhythm quiet and tight"],
      ["your hand in mine as the record turns", "every little lesson the silence learns"],
      ["coffee on the stove and your sleepy smile", "stay with me another little while"],
      ["rain on the glass like a soft tambourine", "you in the middle of all of my dreams"],
      ["we danced in the kitchen at half past two", "nothing in the world but me and you"],
      ["the golden hour leaning on your face", "time forgetting time and place"],
      ["warm as the summer we tried to keep", "whispers in the hours before sleep"],
      ["every song on the radio", "sounds like a secret we already know"],
      ["your head on my chest and the world outside", "slowing to the pulse of a lullaby"],
      ["lights below us, just a blur", "glad i kept my heart with her"],
      ["a quiet table set for two", "every candle burning blue"],
      ["down where the {place} sways", "we could spend a thousand days"]
    ],
    pre: [
      ["come a little closer, let it show", "there's no need to take it slow"],
      ["hold the moment while it's here", "whisper it inside my ear"],
      ["breathe with me and don't let go", "till the early morning glow"],
      ["the night is soft, the room is warm", "safe inside each other's arms"]
    ],
    chorus: [
      ["it's you in every song i sing", "you're the chord and you're the string", "{title}", "spin me slowly through the room", "all the flowers come in bloom", "{title}"],
      ["stay till the stars come undone", "you're my favorite everyone", "{title}", "heart to heart and palm to palm", "this is where the calm is warm", "{title}"],
      ["slow down, darling, hold the line", "your hand is resting here in mine", "{title}", "every quiet beat we keep", "lulls the whole wide world to sleep", "{title}"],
      ["we don't need the morning yet", "this is all we'll ever get", "{title}", "sway with me and close your eyes", "love is in the lullaby", "{title}"]
    ],
    bridge: [
      ["and if the world keeps spinning fast", "we can build a moment built to last"],
      ["a thousand nights would feel like one", "as long as i'm not the only one"]
    ],
    chants: ["ooh, my love", "stay, stay", "so close", "darling", "hold me", "one more dance", "just us two", "mm-hmm"]
  },

  epic: {
    adj: ["soaring", "cinematic", "powerful"],
    verse: [
      ["born at the edge of a falling sky", "watching the old world wave goodbye"],
      ["a thousand voices, one refrain", "rising through the ash and rain"],
      ["mount of shadows, fields of stone", "we were never walking home alone"],
      ["banners unfolding against the dawn", "everything before us gone"],
      ["giants were sleeping beneath the ground", "we were the sound that woke the town"],
      ["over the ridgeline, bright and raw", "the ending nobody ever saw"],
      ["an ocean between us, wide and deep", "promises are hard to keep"],
      ["knees in the dust of an ancient hall", "answering the final call"],
      ["the long march home through the driving snow", "with a fire carried long ago"],
      ["kings and their kingdoms all return to sand", "but a sung-out song still stands"],
      ["we climbed to where the bells are rung", "and every bell in heaven sung"],
      ["down where the {place} burns", "the tide of history returns"]
    ],
    pre: [
      ["stand together, rise as one", "the reckoning has just begun"],
      ["lift your eyes beyond the wall", "answer when the heavens call"],
      ["every road has led us here", "nothing left but faith and fear"],
      ["feel the ground begin to shake", "only one more vow to make"]
    ],
    chorus: [
      ["we will rise above the grey", "carry the horizon home", "{title}", "written in the stars above", "bound by blood and built on love", "{title}"],
      ["glory in the failing light", "we are marching through the night", "{title}", "hold the line and lift the flame", "nobody will speak our names in vain", "{title}"],
      ["beyond the mountains, past the sea", "there's a version that is free", "{title}", "sound the horn and light the pyre", "we're the ones who dared the fire", "{title}"],
      ["forever young, forever strong", "echoing the battle song", "{title}", "shoulder up beside the brave", "there is nothing left to save but us", "{title}"]
    ],
    bridge: [
      ["and when the final curtain falls", "we'll be the writing on the walls"],
      ["the wind remembers what was sworn", "long before the battle's born"]
    ],
    chants: ["oh-oh-oh-oh-oh", "rise, rise, rise", "hold the line", "we remain", "carry on", "into the dawn", "as one, as one", "sing it loud"]
  },

  hypnotic: {
    adj: ["ethereal", "airy", "layered"],
    verse: [
      ["breathe in the color between the frames", "nothing in the room has names"],
      ["slow as a river beneath the glass", "moments come and moments pass"],
      ["a loop in the dark and a loop in the head", "echoes of the things we said"],
      ["floating an inch above the floor", "weightless as a closing door"],
      ["the pulse is a pendulum, soft and wide", "swinging on the other side"],
      ["out of the body, into the beat", "gliding down an empty street"],
      ["mirror on mirror, hall on hall", "answering a distant call"],
      ["spiral in silver, spiral in blue", "every spiral leads to you"],
      ["time is a ribbon untying slow", "nobody but us to know"],
      ["smoke over water, light over skin", "letting the outside in"],
      ["whisper a frequency, low and plain", "say it till it falls like rain"],
      ["down where the {place} drifts", "even all the shadows lift"]
    ],
    pre: [
      ["let it pull you, let it pour", "through the cracks in every door"],
      ["in and out and in again", "far away from where you've been"],
      ["surrender to the spinning room", "blooming in the petal blue"],
      ["one more layer, one more veil", "drifting off the given trail"]
    ],
    chorus: [
      ["falling upward into sound", "lifted off the frozen ground", "{title}", "round and round and round we spin", "let the quiet frequencies in", "{title}"],
      ["we are echoes, we are haze", "lost inside the golden days", "{title}", "deeper than the deep blue sea", "only us and only me", "{title}"],
      ["hold the note and let it ring", "floating on a silver string", "{title}", "close the eyes and disappear", "time dissolves around us here", "{title}"],
      ["in the hum between the stars", "riding soft electric cars", "{title}", "weightless as the words we sung", "rising on a single lung", "{title}"]
    ],
    bridge: [
      ["and the further that we fall", "the less we fear the fade at all"],
      ["somewhere past the thinning veil", "even silence tells a tale"]
    ],
    chants: ["ahh-ahh-ahh", "let it flow", "deeper now", "float away", "in and out", "so low, so slow", "mm-mm-mm", "again, again"]
  },

  driving: {
    adj: ["confident", "rhythmic", "driving"],
    verse: [
      ["headlights carving through the black", "no intention of turning back"],
      ["fuel gauge low but the motor's clean", "running on the in-between"],
      ["streetlights flicker, one by one", "counting down the miles undone"],
      ["pavement humming under steel", "telling me the way I feel"],
      ["windows down and the radio up", "running on an empty cup"],
      ["straight-line road to the morning heat", "matching every tire's beat"],
      ["map lines creasing in my hand", "crossing off the promised land"],
      ["the rearview mirror's full of ghosts", "the ahead's the only road"],
      ["diesel, coffee, cigarette", "everything ahead unmet"],
      ["wind is pulling at my sleeves", "asking if I still believe"],
      ["signposts counting down to dawn", "half of me is halfway gone"],
      ["down where the {place} runs", "gunning for the waking sun"]
    ],
    pre: [
      ["keep the wheel and keep the speed", "everything we'll ever need"],
      ["one more town, one more sign", "leaving every mile behind"],
      ["press it forward, hold it true", "nothing catching up to you"],
      ["through the gears and through the night", "running at the edge of light"]
    ],
    chorus: [
      ["drive it till the wheels go still", "running on the pure will", "{title}", "every road is calling loud", "risen from the sleeping town", "{title}"],
      ["on and on and on we go", "faster than the things we know", "{title}", "no destination in the glass", "only freedom built to last", "{title}"],
      ["white lines feeding through the dark", "striking like a beating heart", "{title}", "engine screaming out the song", "where we're going can't be wrong", "{title}"],
      ["give me open road and time", "leave the static far behind", "{title}", "rolling like a river runs", "blazing into morning sun", "{title}"]
    ],
    bridge: [
      ["every mile behind the wheel", "teaches what the heart can heal"],
      ["the road don't ask you why you run", "it only shines toward the sun"]
    ],
    chants: ["go, go, go", "don't stop now", "all ahead", "push, push", "open road", "keep moving", "run it down", "full speed"]
  }
};

/* Rap couplets are denser and rhythm-forward; used for the rap vocal
   profile regardless of mood lane. Pairs still end-rhyme. */
export const RAP_LINES = [
  ["yeah, city on my shoulders but my posture straight", "every door they bolted, I was at the gate"],
  ["started in the basement with a notebook page", "now the whole block rocking to the noise we made"],
  ["they told me keep it modest, I'm not built like that", "every setback got me suited in a different cap"],
  ["flow like a taxi, meter running cold", "stories in my pocket with the weight of gold"],
  ["cook the beat down till the baseline bubbles", "risen from the middle of the smoke and rubble"],
  ["no co-sign needed, I'm my own stampede", "planting every flag in the ground I lead"],
  ["wrist flick, kick drum, syllable snare", "building an empire out of thin air"],
  ["they counting me out while I'm counting the bars", "landing on the moon in a couple of stars"],
  ["pressure made diamonds, I'm the proof in the rough", "giving them a hundred when they ask for enough"],
  ["grind in the morning and the grind at night", "hungry never waited for the greenest light"],
  ["pen is the pistol and the page is the street", "every verse a victory complete"],
  ["zero handouts, zero breaks, zero slack", "took the long way and I never doubled back"],
  ["old head told me let the rhythm decide", "I let the drums drive and the snare provide"],
  ["marathon lungs on a sprinter's clock", "shocking the system every single block"],
  ["came with a flicker and a borrowed spark", "leaving with the whole stadium lit in the dark"],
  ["out of the shadows into the flash", "every hater eating out the palm of the cash"]
];

export const RAP_HOOKS = [
  ["hands up when the bass go boom", "we ain't never leaving soon", "{title}", "light it up and let it burn", "every lesson is a lesson learned", "{title}"],
  ["from the bottom to the top of the marquee", "every setback was a part of the journey", "{title}", "now the whole room singing every line", "we were built for this design", "{title}"],
  ["run it up, run it back, run it through", "there is nothing that a dream can't do", "{title}", "all the doubt became the fuel now", "breaking every single rule, loud", "{title}"]
];

/* Profile metadata: tag is what Suno reads in the lyrics box; the lane
   adjective stack is appended so the voice matches the mood. */
export const VOCAL_PROFILES = [
  { id: "auto",      label: "Auto voice",        lead: "lead vocal" },
  { id: "female",    label: "Female lead",       lead: "female lead vocal" },
  { id: "male",      label: "Male lead",         lead: "male lead vocal" },
  { id: "duet",      label: "Male/female duet",  lead: "male and female vocal trade" },
  { id: "choir",     label: "Choir / ensemble",  lead: "layered choir vocals" },
  { id: "rap",       label: "Rap / MC",          lead: "rap vocal, tight rhythmic flow" },
  { id: "processed", label: "Processed / robot", lead: "processed robotic vocal" }
];

/* One-liners for the first [Intro] line, by lane; organic worlds get
   softer readings, electronic ones chants. */
export const INTRO_LINES = {
  euphoric: ["the lights come up slow", "here it comes now", "we waited all night for this"],
  aggressive: ["no warning, no mercy", "brace for it now", "let the floor shake"],
  dark: ["rain on the window again", "it's late, and the city hums", "station identification, lost frequency"],
  romantic: ["close the door behind you", "the record's spinning slow tonight", "stay a while"],
  epic: ["before the dawn, the silence", "gather close and listen", "this is where it all begins"],
  hypnotic: ["breathe in, breathe out", "let the room dissolve", "softly now"],
  driving: ["ignition, headlights, gone", "the road is wide open", "mile zero"]
};

export const OUTRO_LINES = {
  euphoric: ["till the last light dies", "one more, one more time", "we don't wanna go home"],
  aggressive: ["and we're still standing", "never broken, never bowed", "remember the sound"],
  dark: ["and the signal fades", "goodnight, ghost, goodnight", "static, then nothing"],
  romantic: ["goodnight, my love, goodnight", "one last slow dance", "till the morning finds us"],
  epic: ["and the song remains", "remember us this way", "forever, and after"],
  hypnotic: ["drifting… drifting…", "fade into the hum", "slowly dissolving"],
  driving: ["headlights into dawn", "still rolling, still gone", "the road keeps singing"]
};

/* Keyword → mood-lane classifier, first match wins. The lane decides
   vocabulary, vocal adjectives and energy of the sung material. */
/* Leading word boundary only: several stems must match inflected pool
   words ("euphor"→euphoric/euphoria, "joy"→joyful, "aggress"→aggressive),
   so a trailing \b would defeat them. */
export const MOOD_RULES = [
  ["euphoric", /\b(happy|joy|euphor|ecstat|triumph|confident|uplift|celebrat|free|alive|sunshine|elated|bliss)/i],
  ["aggressive", /\b(aggress|furious|feroc|anger|angry|rebell|rebel|danger|menace|brutal|savage|war|fight|riot|hate|venge|relentless|crushing|fierce|strike)/i],
  ["romantic", /\b(romantic|sensual|sexy|love|lover|soulful|tender|warm|intimate|seduct|crush|kiss|desire|nostalgic|yearn)/i],
  ["epic", /\b(epic|cinematic|grand|glory|glorious|heroic|majestic|sacred|hymn|anthem|vast|immense|legendary|monumental)/i],
  ["hypnotic", /\b(hypnot|psyched|trippy|dreamy|dream|hazy|trance|spaced|floating|ethereal|surreal|distant|drowsy|meditat)/i],
  ["dark", /\b(melanchol|sad|heartbrok|dark|myster|haunt|bitter|cold|lonely|grief|cry|tears|sorrow|grey|gray|ominous|dread|noir|lost)/i]
];
export const DEFAULT_LANE = "driving";
