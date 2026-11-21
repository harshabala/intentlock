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
- 2026-11-16: done by an agent. 239 sequences / 892 visits in `tests/drift-set/` (labels are agent proposals, `review: pending-owner`; the 30 most debatable are listed in its README), `npm run score:drift`, baseline in `docs/drift-baseline-2026-11-16.md` (balanced, all sequences: 21.8% wrong locks, 7.3% missed drifts). Verified with `npm run check` (green) and `npm run score:drift` (exit 0). No rules changed. Still needs the owner to review the labels and see the baseline.

### 1b. Check-in before lock (added 2026-11-16, owner request)
- The extension should talk with the user, not only block: "I'm watching a video, but it is for
  work." Three outcomes instead of two: aligned (silent), clear drift (lock) and uncertain (check-in).
- The check-in is a small non-blocking prompt (not the full-screen lock) that names the intent,
  says in one line why the page looks off, and offers "Yes, this is for my task" (optional short
  reason), "Just a quick check" (short grace period, then asks again) and "I drifted" (go back or
  close the tab). No typing on the common path. Shadow root, bundled fonts, reduced motion, keyboard
  reachable, in the accessibility and contrast checks.
- "Yes" aligns the site (a single page on hub sites such as YouTube) for this session only, stored
  with the session and cleared when it ends; never a permanent allow. An explicit allow or block
  by the user always wins. At most one check-in per site per session unless the grace period expires,
  plus a global minimum gap. Page title and a short snippet are compared with the intent locally and
  never stored. The optional AI may choose between check-in and silence, never lock.
- **Done when:** the scorer reports three outcomes; at the balanced preset wrong locks are under 2 %,
  prompts on legitimate pages under 10 % and missed drifts under 10 %; browser journeys cover the
  check-in, each answer, session-only alignment and an explicit block still locking; the full suite
  and journeys pass.

- 2026-11-16: built by an agent: `drift-decision.js`, `checkin-controller.js`, `checkin-prompt.js`, content/worker wiring, scorer with three outcomes, `tests/browser/checkin.spec.mjs` (5 journeys) and a check-in accessibility/contrast audit. Verified with `npm run check` and `npm run test:browser`. Numbers in `docs/drift-after-checkin-2026-11-16.md`.

- 2026-11-17: an agent wrote the held-out set (`tests/drift-set-heldout/`, 114 sequences, labels pending-owner) before scoring it; first scoring in `docs/drift-heldout-2026-11-17.md`: **balanced, held-out: wrong locks 0.0 %, prompts on legitimate pages 13.8 %, missed drifts 25.4 %. Prompt and missed-drift targets are not met on unseen data** (tuning set: 7.7 % and 5.5 %).
- 2026-11-17, coordinator decisions (not owner approvals): about one prompt per 13 legitimate pages is acceptable for now; relaxed stays gentle but asks on social and streaming after a short stay and never locks from inference; the worker split stays deferred. Round 2 (relaxed preset, second ask after a "yes", worker-restart journey) in `docs/drift-round2-2026-11-17.md`.
- 2026-11-19, Antigravity (Gemini 3.8 Flash): verified commit `199d7be` with two 17/17 browser test runs. Tightened logic using tuning set only: preserved 3-letter terms with stop-word refinement, expanded documentation/tooling domains, narrowed tech Q&A hosts, supported Google Scholar research. Tuning prompts dropped from 7.7% to 4.9% (missed 6.7%); held-out prompts dropped from 13.8% to 12.8% (missed 23.8%, strict wrong locks halved). Created DESIGN.md, brand.md, and 3-direction mockups with screenshots in `docs/design/`.
- 2026-11-19, Grok: read the 7 silent balanced held-out drifts and the 12 prompted legitimate pages. Reasons are in `docs/plans/AGENT-LOG.md`. No rule change. Not a scoring point.

### 2. Tighten the logic
- Use the scorer to drive changes: page content signals beyond the domain, a grace period for
  short detours, smarter handling of search and sign-in pages, and the AI second opinion where
  the rules are unsure.
- **Done when:** at the default preset, wrong locks are under 2 % and missed drifts under 10 % on
  the set, with no slowdown past the existing time budget.
- 2026-11-16: done on the set at balanced (wrong locks 0.0 %, prompts on legitimate pages 7.6 %, missed drifts 7.3 %); relaxed misses 38 % of drifts. Tuned on the same set, no held-out data; see the after-doc.
- 2026-11-19: two tuning-set rules. A title containing "in popular culture" asks instead of counting as alignment. A professional-network feed path asks when the intent names the site. Tuning balanced missed drifts 2/50 to 0/50; prompts 10/250 to 11/250. Held-out balanced, as declared, did not change: prompts 12/95 (12.6%), missed 7/23 (30.4%). Not a scoring point.

### 3. Design direction
- Write `DESIGN.md` and `brand.md` for IntentLock using the owner's design skills: one direction
  for colour, type, shape and motion. Show the owner two or three directions as mockups of the
  lock screen and the new tab before building.
- **Done when:** the owner picks one.
- 2026-11-19, Antigravity: `DESIGN.md` and `brand.md` written. Three directions (A: Terminal Discipline [Recommended], B: Warm Obsidian, C: The Shutter) created in `docs/design/directions-preview.html` with screenshots in `docs/design/screenshots/`. Pending owner choice.

- 2026-11-21: picked A, Terminal Discipline. Reason is in the agent log under Owner decisions. Not a scoring point until a recording is accepted.

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
- 2026-11-16: not started. `background.js` is now about 1,700 lines. The split needs a shared worker-state object (12 mutable module variables are reassigned across the file) and updates to four tests that read `background.js` as text (`extractDomain` characterization, idle copy, static smoke); plan it as its own step guarded by `npm run check` and two full `npm run test:browser` runs. Candidate seams: Chrome API wrappers, intervention-state helpers, history entry, cooldowns, retention, config loading, session lifecycle, tab events and drift evaluation, message handlers.

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
