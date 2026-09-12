/* data/presets.js — one-click starting points ("recipes").
   A preset is just a curated set of state overrides plus optional genre
   hint and post-roll flags; applyPreset() (engine/presets.js) applies
   them through the SAME machinery as the buttons (setSoundLite,
   setNoStop, setHideBeats, roll), so presets can never put the engine in
   a state the UI couldn't reach by hand. */

export const PRESETS = [
  {
    id: "peak", icon: "🔊", name: "Peak-time weapon",
    desc: "Strong hook, structured, maximum impact",
    overrides: { techOnly: true, instrumental: true, weirdness: 32, melodicForce: "strong", duration: "standard", structure: true, styleFit: true, equalChance: false }
  },
  {
    id: "acid", icon: "🌀", name: "Acid all-nighter",
    desc: "Weird sub-styles, hypnotic and far from core",
    overrides: { techOnly: true, instrumental: true, weirdness: 72, melodicForce: "balanced", duration: "extended", structure: false }
  },
  {
    id: "deep", icon: "🌑", name: "Deep hypnotic trip",
    desc: "Core styles, light melody, long-form journey",
    overrides: { techOnly: true, instrumental: true, weirdness: 18, melodicForce: "light", duration: "extended", soundLite: true }
  },
  {
    id: "nostop", icon: "⛓", name: "Non-stop workout",
    desc: "Zero breakdowns, ultra delivery start to finish",
    overrides: { techOnly: true, instrumental: true, weirdness: 40, melodicForce: "strong", duration: "extended", noStop: true, structure: true }
  },
  {
    id: "melody", icon: "🎼", name: "Melody-only sketch",
    desc: "No beats or bass — pure style melody pattern",
    overrides: { techOnly: true, instrumental: true, weirdness: 50, melodicForce: "dominant", hideBeats: true }
  },
  {
    id: "vocalanthem", icon: "🎤", name: "Vocal anthem",
    desc: "Full sung lyric sheet with hooks and choruses",
    overrides: { techOnly: false, instrumental: false, vocalProfile: "female", weirdness: 35, melodicForce: "dominant", duration: "standard", structure: true }
  },
  {
    id: "rap", icon: "🎙", name: "Rap / MC hook",
    desc: "Rap verses and hooks over a no-techno production",
    overrides: { techOnly: false, instrumental: false, vocalProfile: "rap", weirdness: 45, melodicForce: "balanced", genreHint: "Hip-Hop" }
  },
  {
    id: "jazznoir", icon: "🎷", name: "Jazz noir session",
    desc: "Acoustic instrumentation, smoky and modal",
    overrides: { techOnly: false, instrumental: true, weirdness: 55, melodicForce: "strong", genreHint: "Jazz", structure: false }
  },
  {
    id: "lofi", icon: "📻", name: "Lo-fi study beat",
    desc: "Soft, warm, light-touch instrumental",
    overrides: { techOnly: false, instrumental: true, weirdness: 30, melodicForce: "light", duration: "standard", soundLite: true, genreHint: "Lo-Fi" }
  },
  {
    id: "cinematic", icon: "🎬", name: "Cinematic score",
    desc: "Orchestral, extended, dominant melody arc",
    overrides: { techOnly: false, instrumental: true, weirdness: 45, melodicForce: "dominant", duration: "extended", genreHint: "Cinematic" }
  },
  {
    id: "festival", icon: "🎆", name: "Festival mainstage",
    desc: "Core anthems, hands-up structure and energy",
    overrides: { techOnly: true, instrumental: true, weirdness: 15, melodicForce: "strong", duration: "standard", structure: true }
  },
  {
    id: "band", icon: "🎸", name: "Live band feel",
    desc: "Hybrid acoustic/electronic groove, no-techno",
    overrides: { techOnly: false, instrumental: true, weirdness: 40, melodicForce: "balanced", genreHint: "Funk" }
  }
];
