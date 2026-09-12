# NEON FORGE

Suno 5.5 prompt lab — techno-focused, but fluent in everything else.
Rebuilt from the legacy 600 KB single-file app into plain ES modules with
**zero install and no bundler**: any static file server runs it.

```
python3 -m http.server 8080      # then open http://localhost:8080
```

## Layout

```
index.html          thin shell (loads ui/app.js as an ES module)
data/               content pools, extracted VERBATIM from the legacy app
                    (data/lyrics.js + data/presets.js are hand-curated)
engine/             pure logic — no DOM anywhere
ui/                 minimal DOM layer (app shell, manual-pick, batch, arc)
tools/              extraction + optional single-file build
tests/              headless test suite (node, jsdom optional)
Tetech-main/        original app — the data source for extraction (read-only)
tools/legacy/       legacy build/engine/smoke scripts kept for reference
```

### /data — generated, verbatim

Every `const NAME = […]` pool (STYLES, GENRES, TEMPO_RULES, FEELINGS, LEADS,
KICKS, all TECHNO_*, all SPARK_*, ATOMS, PICKER_POOLS, SAFETY_LINE, …) is
pulled programmatically out of `Tetech-main/index.html` by
`node tools/extract-data.js`, using the JS-aware `extractConst()` scanner and
the deterministic pool expansion from the legacy build — the content is never
re-typed. Don't hand-edit these files; re-run the extractor.

### /engine — ported algorithms

* `prng.js` — `mulberry32` seeded PRNG + `pick()`; deterministic per seed.
* `genre.js` — weirdness slider (3-point core/sub/rare interpolation),
  "Sub-Style Genre" combo naming with the 8-retry no-repeat rule,
  `tempoForGenre()` (genre-aware BPM / weighted techno bands).
* `world.js` — electronic/organic/hybrid classification + `genreSafeText()`
  regex rewriting (four-on-the-floor → steady pulse, 909/303/rave stripping,
  style names protected via placeholder swap).
* `prompt.js` — `assemble()`/`sanitize()` block system: Style Prompt hard-capped
  at **1000 chars**, Full Brief at **3000 chars**; compact-first, then drop by
  priority, then clause-boundary clamp — never mid-word. Includes the
  instrumental vocal sanitizer and the banned max-energy word list.
* `roll.js` — **one** roll engine: `roll(state, scope, {mode, tries})`.
  Scope = field / section / everything; mode = `random` or `max`
  (maximize score over N tries). This replaces the legacy Idea Engine,
  MORE MAGIC, MEGA BATCH, Anthem Builder and Genetic/Quantum Labs.
* `state.js` — default state + the `ROLL_FN` roll table (which fields the
  roll engine touches per scope, with lock/hide/flag gating in one place).
* `harmony.js` — scale/key-aware **diatonic chord concretization**: roman
  progressions (`i – VI – III – VII`) resolve to real chords in the chosen
  root/scale (`Am – F – C – G`), with a full triad palette + roman labels
  for the prompt.
* `lyrics.js` — deterministic **lyric studio**: electronic (Verse/Drop),
  organic (Verse/Chorus/Bridge) and rap (Rap Verse/Hook) song forms,
  mood-lane word banks, a title/place slot system, singable syllable
  discipline, per-section re-roll nonces and song-level couplet dedupe.
* `batch.js` — **Batch Forge**: N candidates in one click, each scored
  (compatibility/density/cohesion/arrangement/definition), fingerprinted
  for distinctness, ranked best-first with state snapshots for loading.
* `presets.js` — curated one-click **recipes** built on the same public
  operations the buttons use (banger, vocal anthem, dubby, rap, lo-fi,
  jazz-noir, cinematic, non-stop, peak-time, sound-lite, melodic, ambient).
* `share.js` — state ↔ URL-safe base64 (`?s=…` share links, lyrics
  included).

### Studio features

* **Vocals / Lyrics tab** — toggle the mic chip (or press `V`) to move
  from instrumental safety to a full production: a casting tag
  (7 vocal profiles), a section-tagged sheet, vocal-only policy and the
  LYRICS block embedded in the Full Brief (hard-capped at 3000 chars,
  production text gives way before lyrics). Re-roll the whole sheet or
  one section, edit inline; your sheet survives share links.
* **Batch Forge (G)** — generate 6/12/24 ranked prompts at once, plain or
  MAX-each; load any candidate verbatim or borrow its style.
* **Recipes bar** — one-click starting points with hovered ingredient lists.
* **Energy arc visualizer** — the arrangement card renders the energy
  curve and 20–100 value for every timecoded section.

### Modes

* **Techno-Only** — rolls from the 838-style techno pool, weighted BPM bands.
* **No-Techno** — rolls genre + sub-style combos from the 250+/2800+ pool,
  genre-aware tempo, style-fit auto-curation and genre-safe rephrasing.

Both are first-class; the mode toggle sits in the header.

### One-click prompt shape chips

* **🥁 HIDE BEATS** (`B`) — melody-only focus: parks the drums, bass and
  every sound-appearance section, blanks all beat/sound atoms (they can
  never re-roll back in), hides counter/second lines, and keeps the Lead
  block pure **pattern** text (no instrument name — the style owns the
  voice). Example: style "Solo Guitar Play" → nothing extra appears in
  the song, just a melody pattern to follow, plus an explicit
  melody-only policy line.
* **🔇 SOUND-LITE** (`H`) — parks every "sound appearance" section (sound
  design / delay / FX / mix / spatial / ensemble) and switches off the
  sound-design detail layers (`ping-pong delay feedback`…), so the Style
  Prompt fills with style, melody, groove and pattern first (Harmony Lab
  stays). The parked values ARE packed back in afterwards, but only if
  there are characters left — style content always wins.
* **⛓ NO-STOP** (`N`) — non-stop beat with **ultra delivery**: a curated
  no-break arrangement, a peak-to-peak energy arc with no Breakdown,
  `[Breakdown]` dropped from the structure tags, max-energy feeling /
  flavor / direction / intensity forced from bar one to the last, and an
  explicit "no breaks, no bridges, no silent gaps, ultra delivery"
  policy in every prompt. Counter/second lines and every appearance cue
  (half-time, lazy, rolls, fills, drops, risers…) are hidden at roll
  time. Re-rolls stay no-stop until it's cleared.
* **🎼 MELODY FIRST** (`J`) — reorders the Style Prompt so diatonic chords,
  the melodic-focus line, emotion, melody/harmony and bass sit directly
  under the style header; drums are packed last and only if the budget
  has room (the full sound-design detail still fills leftover space).
* **📄 HIDE VOX-LINE** (`P`, instrumental mode only) — removes the
  `instrumental …, no vocals/lyrics/chants…` policy line from both
  outputs and returns its characters to the sound pool.
* **⭐ MAX** — now also offers 96× and 192× try counts for deeper
  hill-climbing; it still never downgrades and still keeps your style.

Style-name fidelity: every output-time word rewrite parks the picked
primary/secondary style names and restores them byte-for-byte (a genre
name is never swapped mid-sentence), and the assembled pool is
canonicalized — the K-spelling "Tekno" always renders "Techno"
(including `Free-Party Tekno` → `Free-Party Techno`); Hardtek/Tribetek
are separate words and stay. Words users asked out of outputs
(e.g. "skank") are scrubbed at render time to the musical term
("off-beat chop"), without touching the verbatim pools.

## Commands

```
npm start            # static server (or any other file server)
npm test             # node tests/run.js — 560+ checks, jsdom UI part needs npm i
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
