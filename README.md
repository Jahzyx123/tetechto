# NEON FORGE

[![CI](https://github.com/Jahzyx123/tetechto/actions/workflows/ci.yml/badge.svg)](https://github.com/Jahzyx123/tetechto/actions/workflows/ci.yml)

Suno 5.5 prompt lab — techno-focused, but fluent in everything else.
Rebuilt from the legacy 600 KB single-file app into plain ES modules with
**zero install and no bundler**: any static file server runs it.

```
python3 -m http.server 8080      # then open http://localhost:8080
```

## What's new in v4.5 — the Idea Engine returns

The legacy app's **Idea Engine — Sparks & Wildcards** card is back, ported
to the modular engine and wired to the 32 Spark pools that were extracted in
v4 but never rolled anywhere until now.

* **Idea Engine card** — a full-width card at the top of the lab with:
  * **10 core spark kinds** (💡 Idea, 🏷 Title, 🧬 Mash-up, ⛓ Constraint,
    🛠 Tip, 🌊 Vibe, 🗺 Scene, 🔩 Object, 🪄 Transform, 🎯 Challenge),
  * **More spark / Magic II** cyclers reaching the remaining 21 pools
    (weather, light, sound sources, futures, hooks, basslines, drum lines,
    melody phrases, concept twists, arrangement packs, mix punch, master
    heart, Suno cues, DJ notes…),
  * **Apply buttons** — a rolled title/mash-up/transform/challenge goes
    straight into the concept card or the style identity (lock-respecting),
  * **Copy spark** — one click copies the spark with the track context.
* **Wildcards** — the legacy power buttons, rebuilt on the new engine:
  🔥 **Mega Chaos Roll** (re-rolls the whole production + spark title &
  transform, extended + melody-dominant frame), 🎰 **Lucky Dip** (a whole
  fresh surprise track), 🕰 **Time Machine** (fresh tempo / key / duration /
  arrangement / energy), 🧠 **Random Focus** (MAX a random category),
  💥 **Anthem Idea** and ⚡ **Max Anthem Idea** (title + vibe + transform,
  melody-dominant).
* **Sparks wave** — new generator `tools/expand-sparks.js` →
  `data/sparks-extra.js`: **+554 entries across 29 pools** (1,913 sparks
  total, every pool ≥40). Seeded, banned-word free, vocal-safe, deduped
  against the verbatim spark pools — which stay untouched.
* Sparks never enter the prompt on their own; they are creative fuel you
  copy or apply — applied sparks flow through the same genre-safe / vocal /
  length pipeline as rolled concepts.
* The engine gained `engine/spark.js` (merged pools, kind registries,
  applies, wildcards). `npm run expand` now runs all seven generators.

## What's new in v4.4 — concepts & sounds wave two

The "concepts & sounds for everything that rolls" upgrade continues with a
second wave on both fronts — every pool that still rolled thin is now deep.

* **Concepts wave two** — a brand-new vocabulary pass
  (`tools/expand-concepts2.js` → `data/concept-extra2.js`) adds **+2,270
  concept entries** across all 10 keys, stacked on top of wave one with
  zero collisions. Merged concept pools now hold: world 812 · title 763 ·
  location 695 · visual 672 · narrative 658 · event 652 · sensation 584 ·
  transform 582 · crowd 558 · conflict 557 (**6,733 total**, up from 4,263).
* **Melody-concept wave two** — **+440 lines**: story 310 · motion 296 ·
  hook 295 · role 259 (role was the thinnest concept pool left at 119).
  All pre-filtered to survive the runtime relax check.
* **Sounds wave two** — `tools/expand-sounds2.js` → `data/expansion2.js`
  tops up every thin sonic pool: **41 pools, +1,639 entries**. After v4.1's
  wave one left the smallest atom pools at 54–57 entries, two tiers of
  wave-two vocabulary now lift **all 95 sound pools to ≥86 entries**.
* **NO-STOP intensity ×5** — the ultra-delivery intensity line rolled from
  6 verbatim entries; the generated wave brings it to **30**.
* **Vocal directions ×2.5** — vocal-mode tracks rolled from 24 directions;
  the generated wave brings the pool to **60** (vocal words are intentional
  here — vocal mode is user-selected).
* Inventory note: energy-arc templates were checked and correctly left
  alone (deterministic structural data — no roll involved). The legacy
  SPARK pools were still dormant at this point — they came alive one
  release later with the v4.5 Idea Engine.
* Same guarantees as every prior wave: deterministic (seeded), banned-word
  free, vocal-safe (except the vocal-direction pool, by design), world-safe
  language, deduped against verbatim + wave one — which are never modified.
  `npm run expand` regenerates all six generators.

## What's new in v4.3 — structures & hybrid sound vocabularies

Continuing the "concepts & sounds for everything that rolls" upgrade into the
two remaining thin spots: the arrangement pools and the hybrid genre sound
vocabularies.

* **Structure wave — arrangements ×7.5** — the Arrangement atom rolls on every
  track but drew from just 40 verbatim chains, the thinnest pool per roll in
  the app. A new deterministic generator, `tools/expand-structures.js`, adds
  **+260 standard section-chains** (intro → build → drop → breakdown → climax
  → outro shapes) and **+170 no-break chains** → `data/structure-extra.js`,
  merged at runtime into `ARRANGEMENTS_FULL` / `NO_STOP_ARRANGEMENTS_FULL`.
  The 40 verbatim chains (and the 12 fast-start shapes up front) are untouched
  — the generated entries append after them.
* **No-stop integrity** — every generated no-break chain is refused at the
  source if it contains any break-word (break / breakdown / bridge / gap /
  pause / silence / vacuum / blackout / stutter), so a NO-STOP track can never
  grow a break by re-roll.
* **World-safe language** — arrangement text flows through `genreSafeText`
  for organic and hybrid genres, which strips techno-only nouns and a set of
  extreme adjectives. The generated vocabulary is built to survive both maps
  as-written (only the intended `drop→refrain` / `euphoric→joyous` rewrites
  apply), so chains never degrade into fragments in any rolled genre.
* **Hybrid sound coverage 21 → 92 atom keys** — hybrid genres (rock, shoegaze,
  post-punk, metal, funk…) previously fell back to organic, then techno
  vocabulary for ~71 of the ~92 sound atoms. `tools/expand-acoustic.js` now
  emits a full hybrid blend (amps, pedals, live kits, tape and synths) →
  `data/acoustic.js`, raising `HYBRID_POOLS` from **377 to 1,541 entries**
  across all 92 keys. Every organic atom key now has its own hybrid pool, so
  no techno term leaks into hybrid prompts. The organic pools are
  byte-identical to v4.2.
* Same guarantees as the prior waves: deterministic (seeded), banned-word free,
  instrumental/vocal-safe, deduped against the verbatim pools — which are never
  modified. `npm run expand` now runs the sounds, concepts, structures and
  acoustic generators.

## What's new in v4.2 — concepts & sounds for everything that rolls

* **Concept pools ×8.5** — the Concept card used to roll from the verbatim
  pools only (27–93 entries per key). A new deterministic generator,
  `tools/expand-concepts.js`, adds **+3,760 entries** across all 10 keys
  (world, location, visual, narrative, sensation, event, conflict, crowd,
  title, transform) → `data/concept-extra.js`, merged at runtime into
  `CONCEPT_POOL`. Every key now holds 347–552 rollable values.
* **Melody-concept wave two** — **+370** extra story / role / motion / hook
  lines, all pre-filtered so they survive the runtime relax check. Merged
  melody-concept pools: story 210 · role 119 · motion 196 · hook 195.
* **Melody sound bug fixed** — the generated melody sound extras
  (`EXTRA_MELODY_POOLS`, +111 entries across feelings/flavors/directions/
  perfs/arps/contours/rhythms) were **silently never merged** — the
  expansion loop re-resolved pool names from already-replaced arrays and got
  `undefined`. Fixed by resolving each atom's pool name once up-front, so
  these sounds now actually reach every roll.
* **Richer hand-picking** — the Concept and Melody-concept manual pickers
  now offer the full expanded pools, matching what the rolls draw from.
* Same guarantees as the sound expansion: deterministic (seeded), banned-word
  free, instrumental/vocal-safe, deduped against the verbatim pools — which
  are never modified. Regenerate anytime with `npm run expand`.

Two engine bugs found and fixed while stress-testing the richer pools:

* **NO-STOP emotion hygiene** — the verbatim pools carry contrast entries
  ("serene but powerful") that rightfully survive the relax filter in normal
  rolls, but under NO-STOP they occasionally leaked into the emotion line.
  `poolFor()` now pre-filters feeling/flavor/direction to max-energy
  vocabulary while ultra delivery is on.
* **Style-name erosion** — a rare flake: the vocal sanitizer rewrote
  "Festival Gospel" → "Festival Church", then a *second* genre-safe pass
  didn't recognize the rewritten form as a style name and its
  `festival → ""` techno-strip ate a word out of the name. `genreSafeText`
  now parks **every** rendered form of both style names
  (`styleProtectForms()`), with a deterministic regression test.
* The test suite went flake-hunting: **10 consecutive full-suite runs, all
  green** (previously two checks failed ~1 run in 5–8).

## What's new in v4.1

* **⚡ Batch Lab** (`G`) — the legacy MEGA BATCH idea rebuilt on the unified
  engine. Roll 4–16 fully independent candidates from your current settings
  (locks, chips and weirdness all carry over), scored and ranked best-first,
  each with its full Style Prompt preview. One-click **Copy**, **Load**, or
  send any candidate straight into **Compare A/B**. The live state is never
  touched until you Load.
* **Session autosave** — the whole state persists to `localStorage` shortly
  after every change, and is restored when you return without a share link.
  A pasted `?s=` URL always wins, so shared prompts are never clobbered.
* **🆕 New** — clean-slate roll that keeps *your* setup (mode, weirdness,
  toggles) but re-rolls everything and clears locks/hidden cards.
* **PWA — installable & offline** — web manifest + app icon + service worker
  (`sw.js`). Navigations are network-first, modules are
  stale-while-revalidate, and `tools/stamp.js` bumps the SW cache version on
  every deploy so offline users never run a mixed-generation app.

## What's new in v4

* **Accessibility pass** — every mode chip and detail-layer chip is a real
  `<button>` with `aria-pressed`; every icon button (🎲 🔒 👁 ☰) exposes an
  accessible name; toasts are an ARIA live region; the picker and the new
  shortcuts dialog are proper `role="dialog"` modals with Escape support;
  `:focus-visible` rings everywhere; `prefers-reduced-motion` respected.
* **Keyboard shortcuts dialog** — press `?` (or the ⌨ KEYS button) for the
  full cheat-sheet instead of a one-line toast.
* **Collapsible cards** — ▾/▸ per card plus Collapse-all / Expand-all, so
  the 15-section wall shrinks to what you're working on.
* **Share-URL fix** — `?s=` now actually tracks the live state. (The custom
  `History` class shadowed `window.history`, so `replaceState` threw
  silently inside a `try/catch` and the URL froze at boot. Regression-tested.)
* **Fast clone** — one `clone()` helper (structuredClone with JSON
  fallback) replaces five ad-hoc `JSON.parse(JSON.stringify())` copies;
  MAX at 192× is noticeably snappier.
* **Focus preservation** — topbar controls keep keyboard focus across
  re-renders.
* **Tooling** — ESLint flat config (`npm run lint`, zero errors) and a
  GitHub Actions CI pipeline (lint → test → dist build).
* **Design pass** — richer dark-neon theme: glow gradients, card hover
  depth, styled scrollbars, responsive layout.

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

### /data — generated, verbatim

Every `const NAME = […]` pool (STYLES, GENRES, TEMPO_RULES, FEELINGS, LEADS,
KICKS, all TECHNO_*, all SPARK_*, ATOMS, PICKER_POOLS, SAFETY_LINE, …) is
pulled programmatically out of `Tetech-main/index.html` by
`node tools/extract-data.js`, using the JS-aware `extractConst()` scanner and
the deterministic pool expansion from the legacy build — the content is never
re-typed. Don't hand-edit these files; re-run the extractor.

On top of the verbatim pools sit the **generated expansion layers**, additive
and deterministic — never edit them either, re-run the generators:

* `data/expansion.js` — `tools/expand-sounds.js` → 9,000+ extra sounds across
  95 sonic pools (drums, bass, leads, techno lab, sound design, mix, spatial,
  texture, fx…).
* `data/concept-extra.js` — `tools/expand-concepts.js` → 3,760 extra concept
  entries (10 keys) + 370 melody-concept lines.
* `data/melody-extra.js` — `tools/expand-melody.js` → melody pool + concept
  extras.

`npm run expand` regenerates the sound + concept layers. All expansion merges
happen once at load in `engine/state.js` (`EXPANSION_STATS`,
`CONCEPT_EXPANSION_STATS`, `MELODY_EXPANSION_STATS`).

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
* `share.js` — state ↔ URL-safe base64 (`?s=…` share links).

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
* **⭐ MAX** — now also offers 96× and 192× try counts for deeper
  hill-climbing; it still never downgrades and still keeps your style.

## Commands

```
npm start            # static server (or any other file server)
npm test             # node tests/run.js — 652 checks incl. the jsdom UI boot
npm run lint         # eslint flat config — zero errors is the bar
npm run extract      # regenerate /data from Tetech-main/index.html
npm run build        # optional single-file dist/index.html for sharing
```

`npm i` is only needed for the jsdom UI-boot test and ESLint; the app itself
has no runtime dependencies.

## Keyboard shortcuts

| Key | Action |
| --- | ------ |
| `R` | Roll everything |
| `M` | MAX — maximize score over N tries |
| `B` / `H` / `N` | 🥁 Hide beats · 🔇 Sound-lite · ⛓ No-stop |
| `L` / `C` / `S` | Library · A/B compare · save to library |
| `1` / `2` | Style Prompt / Full Brief tab |
| `?` | Shortcuts dialog |
| `Esc` | Close any dialog |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |

### Note on file sizes

Every source module stays well under 150 KB (largest: `data/expansion.js`,
~9000 generated lines). The optional `dist/index.html` is ~1 MB **by design**
— it embeds all ~800 KB of verbatim + generated pool data into one shareable
file. The runtime app is the modular tree, not the dist file.
