# IntentLock: North Star and the road to 10/10

Written 2026-11-13 from a review of the code, the October plan and a conversation with the owner.
This replaces `2026-10-21-path-to-10.md` as the thing to work from. That plan scored engineering
health (8.6/10). This one scores whether IntentLock keeps people on task and looks the part.

Read "Rules for agents" first, then take the first workstream whose "Done when" is not yet true.

## Why IntentLock exists

Every new tab asks what you are about to do. While you work, it watches for drift and, when you
drift, covers the page until you reflect, close the tab or end the session. Everything stays on
the device.

## The owner's complaints

1. **The graphics are not good enough.** The design skills the owner has collected have not been
   applied here.
2. **The logic is not tight enough.** The owner is not confident it locks when it should and
   stays out of the way when it should not.

## North Star

**Sessions that end with the stated intent done.**

Guard rail, measured from the first day: **wrong locks**. A lock on a page that served the intent
is the fastest way to get the extension removed.

## What 10/10 looks like: three scenarios

1. **Right call, every time.** On a labelled set of real browsing sequences, IntentLock locks on
   the drifts and stays silent on the legitimate detours (documentation, a search, a login page,
   a reference video for the task).
2. **A lock you respect.** The lock screen is calm, fast and well made. It names the intent, says
   why this page looks off, and offers the three exits clearly. It feels like a product, not a
   blocker page.
3. **A reason to come back.** The new tab and history show the owner their own pattern: what they
   set out to do, how often they finished, and where they drift.

## Where IntentLock is today (purpose score: 7/10)

True today:
- The declare, monitor, lock, reflect loop works end to end in a real browser.
- Local heuristics with an intent taxonomy and a 529-domain site list, strictness presets, custom
  rules, an optional AI second opinion that cannot overrule explicit allows.
- 375 tests, 9 browser journeys, measured contrast on seven pages, a check under 20 ms.

Gaps:
- **No measure of right and wrong locks.** Tests prove the rules run as written. Nothing proves
  the rules make the right call on real browsing. This is the owner's "how tight is it".
- **No design pass.** `intervention.css` is 83 lines; the lock overlay is not in the contrast
  audit; motion is minimal. The new tab carries most of the styling.
- The lock text is fixed; the planned AI-written reflection prompt was never built.
- Default AI model names are unverified against live providers and there is no Anthropic option.
- `background.js` is 1,600 lines; `legacy-extension-source/` holds 29 dead files.
- Not published.

## Workstreams, in order

### 0. One clean base
- Merge `harsha/path-to-10`. With the owner's say-so, delete `legacy-extension-source/` and the
  stale branches.
- **Done when:** one checkout, `npm run check` and `npm run test:browser` green, GitHub equals
  local.

### 1. A labelled drift set (before any rule change)
- At least 200 browsing sequences: an intent, then a series of page visits, each labelled
  "serves the intent" or "drift" by a person. Cover the hard cases: research that looks like
  browsing, video used for work, social sites used for work, searches, sign-in redirects,
  shopping for a work purchase, quick legitimate checks.
- A scorer that replays the set through the real decision code and reports missed drifts and
  wrong locks, per strictness preset.
- **Done when:** the baseline numbers exist. Show them to the owner before changing rules.

### 2. Tighten the logic
- Use the scorer to drive changes: page content signals beyond the domain, a grace period for
  short detours, smarter handling of search and sign-in pages, and the AI second opinion where
  the rules are unsure.
- **Done when:** at the default preset, wrong locks are under 2 % and missed drifts under 10 % on
  the set, with no slowdown past the existing time budget.

### 3. Design direction
- Write `DESIGN.md` and `brand.md` for IntentLock using the owner's design skills: one direction
  for colour, type, shape and motion. Show the owner two or three directions as mockups of the
  lock screen and the new tab before building.
- **Done when:** the owner picks one.

### 4. Rebuild the three moments
- **New tab:** stating an intent should take one line and one keystroke.
- **Lock:** scenario 2. Entry and exit motion, reduced-motion support, and include it in the
  contrast audit.
- **Review:** scenario 3, on the history and analytics pages.
- **Done when:** the owner accepts a screen recording of all three.

### 5. Reflection that helps
- Optional AI-written reflection question that refers to the stated intent and the page, with the
  fixed text as fallback. Verify model names against live providers; add an Anthropic option.
- **Done when:** it works with a real key on each provider and never blocks the lock from showing.

### 6. Maintainability
- Split `background.js` into modules along its existing seams, guarded by the browser journeys.
- **Done when:** no file in the worker is over 400 lines and every test still passes.

### 7. Ship
- Store listing with the generated screenshots, privacy policy page, a tagged release.
- **Done when:** it installs from the Chrome Web Store.

## Rules for agents

- A rule change is accepted only with the scorer's before and after numbers.
- An explicit allow by the user is never overruled, by rules or by AI.
- The API key stays in session storage only. Page content sent to an AI provider is the minimum
  needed and only when the user has turned that on.
- Nothing leaves the device otherwise. No telemetry.
- `npm run check` green before every commit; browser journeys green before every merge.

## Needs the owner

- Labelling or reviewing the drift set; it encodes the owner's judgement of what drift is.
- Choosing the design direction and accepting the recordings.
- Real keys for the provider check; Chrome Web Store account.

## Scoring

One point each, ten in all: labelled set and scorer (1); wrong locks under 2 % (2); missed drifts
under 10 % (1); design direction chosen (1); new tab, lock and review rebuilt (2); reflection
works on live providers (1); worker split (1); published (1).

Today: 7 for a working, well-tested loop; accuracy is unmeasured and the design pass has not
started.
