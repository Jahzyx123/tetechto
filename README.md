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
  field — and v6 demonstrably *reads* them there. `sectionCues()` emits a
  per-section performance skeleton (`[Drop | full groove lands, main
  melody theme, 100% energy]`) derived from the rolled energy arc and the
  state's own build/drop/riser/texture atoms.
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
  - `sectionCues()` → **Lyrics field** skeleton, `[Section | cue]` lines
    that follow the rolled energy arc;
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
