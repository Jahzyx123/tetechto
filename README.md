# NEON FORGE

**Suno 6.0 prompt lab** — techno-focused, but fluent in everything else.
Rebuilt from the legacy 600 KB single-file app into plain ES modules with
**zero install and no bundler**: any static file server runs it.

```
python3 -m http.server 8080      # then open http://localhost:8080
```

## SUNO 6.0 — what the lab now optimizes

Suno 6 launched 2026-09-09 (`v6`, `v6-wild`, `v6-mini`; older models
retired). Measured off the live composer, the field limits are unchanged —
**Style 1000 chars, Lyrics 5000, dedicated Exclude Styles field** — but the
prompting rules changed, and every builder in this lab follows them:

* **The style box is positive-only.** v6 reads an inline negative
  ("no vocals") as an instruction to *include* one. All negatives are
  compiled into the dedicated **Exclude Styles** field instead
  (`buildExcludeStyles`), and the style box ends in the positive
  `instrumental <genre>` tail (`styleTail`).
* **Front-load what matters.** v6 weighs early tags most, so every prompt
  leads with genre → influence → BPM → key before any detail.
* **No bracket tags in the style box.** Brackets belong to the Lyrics
  field — and v6 demonstrably *reads* them there.
* **Techno-first style-box shape.** The layer order follows the researched
  formula: identity (genre/influence/BPM/key) → mood/energy → **drums →
  bass** (the rhythm section IS techno's identity) → lead/harmony →
  production/FX → positive policy tail.

### How Suno 6 reads the Lyrics field (researched)

The Lyrics box is a **structure field**, not a text field. What the lab
learned and builds on:

* Bracket **tags sit on their own line** and are recognized verbatim:
  `[Intro] [Build] [Drop] [Breakdown] [Break] [Interlude] [Outro] [End]`,
  plus `[Instrumental]` / `[Instrumental Break]`. No punctuation after
  the tag. Unknown/custom tags are ignored — only established ones work.
* A **parenthetical line under a tag** is read as direction + duration
  hint: the `(8-bar instrumental)` pattern. Bar counts nudge section
  length; descriptive words steer the performance (v6's launch-day test
  famously rendered a whispered-French bridge that existed only as a
  section cue).
* **Blank lines between sections** help the parser; avoid `& @ #` and
  quotation marks; commas and periods are fine.
* Tags can carry inline descriptors (`[Chorus: full band, soaring]`), but
  over-stacking (6+) creates competing instructions.
* For a **fully instrumental track** (our default), keep the style-box
  tail positive (`instrumental techno`) and put every negative in Exclude
  Styles — do NOT write "no vocals" inline.

The **Structure (Lyrics)** tab emits exactly this shape, derived from your
rolled energy arc with real bar counts:

```
[Intro]

(16-bar intro, hangar-bay air, juggernaut peak-time groove, groove sets in, melody waits)

[Build]

(16-bar build, drums tighten, energy rises to 68%, clean tension build, white-noise riser)

[Drop]

(32-bar drop, full groove lands, main melody theme, 100% energy, hyper-driven anthem drop drive)

[Breakdown]

(24-bar breakdown, energy dips to 52%, filters open, groove thins, melody keeps leading)

[Build]

(16-bar build, drums tighten, final build, highest energy of the track, energy rises to 78%)

[Climax]

(32-bar climax, final peak, maximum intensity, full-power finale, 100% energy, armored-column impact)

[Outro]

(16-bar outro, groove keeps rolling, filter winds down, ends on the final pattern)

[End]
```

No sung lyrics needed — it is a pure instrumental arrangement script that
matches the style box (same groove/riser/drop atoms, same arc).

**Escalating repeats:** v6 renders near-identical repeated sections as a
literal repeat, so repeated sections never repeat their cues — the second
build *climbs higher and adds a layer* (or is the *final build*), middle
peaks are *fresh variations, even bigger*, and the last peak is the
*full-power finale*. Repeats even draw on different rolled atoms (riser +
transition for later builds, impact + energy curve for the finale), so
every section of the doc carries new information.
* **NO-STOP and HIDE-BEATS went positive too.** Their policy lines state
  what should happen ("continuous beat, seamless section changes, ultra
  delivery"); the old negative lists live in the Exclude Styles block.
* **The freed budget buys sounds.** Tags + policy used to cost ~100
  style-box characters; the densifier now spends all of them on extra
  rolled sounds.
* **Score = v6 quality.** `scorePrompt` adds **Exclude hygiene** (zero
  inline negatives) and **Mood coherence** (v6 averages contradictory moods
  into mush), alongside length, density, variety and coverage. MAX
  hill-climbs on all of them.
* **Judge both takes.** v6's two takes per generation can differ more than
  a deliberate prompt edit — the output panel reminds you, and suggests
  raising **Style Influence** (it ships at 50%).

## Layout

```
index.html          thin shell (loads ui/app.js as an ES module)
data/               ~100 content pools, extracted VERBATIM from the legacy app
engine/             pure logic — no DOM anywhere
ui/                 minimal DOM layer (app shell + manual-pick modal)
tools/              extraction + optional single-file build
tests/              headless test suite (node, jsdom optional)
Tetech-main/        original app — the data source for extraction (read-only)
tools/legacy/       legacy build/engine/smoke scripts kept for reference
```

### /engine — the prompt pipeline

* `prng.js` — `mulberry32` seeded PRNG + `pick()`; deterministic per seed.
* `genre.js` — weirdness slider, sub-style combo naming, genre-aware BPM.
* `world.js` — electronic/organic/hybrid classification + `genreSafeText()`
  (four-on-the-floor → steady pulse, 909/303/rave stripping; style names
  protected via placeholder swap).
* `prompt.js` — the Suno 6 builders:
  - `buildStylePrompt()` → **Style box**, ≤1000 chars, positive-only,
    genre/mood front-loaded, every free character densified into sounds;
  - `buildExcludeStyles()` → **Exclude Styles** field, mode-aware
    (instrumental / no-stop / hide-beats / no-hand-perc);
  - `sectionCues()` → **Lyrics field** structure doc: bare `[Section]`
    tags on their own lines, parenthetical bar-count + performance cues
    below, `[End]` close — following the rolled energy arc;
  - `buildFullBrief()` → everything, ≤3000 chars, blocks field-routed;
  - `sanitize()`/`assemble()`/`densify()`/`stripVocalCue()` — the same
    priority-drop, clause-boundary-clamp, sound-packing and vocal-cue
    neutralization pipeline as before, now feeding v6-shaped output.
* `roll.js` — **one** roll engine: `roll(state, scope, {mode, tries})`
  with random + MAX hill-climbing over the v6 score.

### Output tabs (one per Suno field)

| Tab | Suno field | Cap |
| --- | --- | --- |
| **Style Prompt** | Styles box | 1000 |
| **Exclude Styles** | Exclude Styles (More Options) | 1000 |
| **Lyrics Skeleton** | Lyrics (structure + per-section cues) | 5000 |
| **Full Brief** | everything, field-routed | 3000 |

### Modes

* **Techno-Only** — rolls from the 838-style techno pool, weighted BPM bands.
* **No-Techno** — genre + sub-style combos from the 250+/2800+ pool,
  genre-aware tempo, style-fit auto-curation and genre-safe rephrasing.
* **🥁 HIDE BEATS** (`B`) — melody-only: parks every beat/sound section,
  keeps the Lead block pure pattern text, and excludes the whole rhythm
  family via Exclude Styles.
* **🔇 SOUND-LITE** (`H`) — parks sound-appearance sections; melody /
  pattern / style content fills the box first, parked sounds are packed
  back only if characters remain.
* **⛓ NO-STOP** (`N`) — continuous-beat arrangement and arc, no Breakdown
  anywhere (policy line, cues, exclusions), ultra delivery, positive
  phrasing only.
* **⭐ MAX** — hill-climbs the v6 score (12× to 192× tries); never
  downgrades, keeps your style unless MAX STYLE is on.

## Commands

```
npm start            # static server (or any other file server)
npm test             # node tests/run.js — 486 checks, jsdom part optional
npm run extract      # regenerate /data from Tetech-main/index.html
npm run build        # optional single-file dist/index.html for sharing
```

`npm i` is only needed for the jsdom UI-boot test; the app itself has no
dependencies.

### Note on file sizes

Every source module stays well under 150 KB (largest: `data/styles.js`,
~74 KB). The optional `dist/index.html` is ~440 KB **by design** — it embeds
all ~347 KB of verbatim pool data into one shareable file. The runtime app is
the modular tree, not the dist file.
