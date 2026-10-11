# IntentLock — Agent task list & implementation plan

> **Give this entire file to one agent (or one session). Work only on this product until ship criteria are met.**

| Field | Value |
|-------|--------|
| **Product** | IntentLock |
| **Priority** | P0 — primary showcase |
| **GitHub** | https://github.com/harshabala/IntentLock |
| **Local clone (preferred)** | `~/Documents/Projects/IntentLock` |
| **If missing, clone to** | `~/Documents/Projects/IntentLock` via `gh repo clone harshabala/IntentLock` |
| **Default branch** | `main` |
| **Work branch** | `feat/flow-metrics-2026-07` (create from latest default if needed) |
| **Stack** | Chrome MV3 extension, vanilla JS ES modules, node:test |
| **Task IDs** | IL-1, IL-2, IL-3, IL-4, IL-5 |
| **Fable plan status** | Complete Fable plan (100% included below) |
| **Work already done** | IL-1 foundation landed + PR #2; IL-2–5 remaining |

## Agent instructions (start here)

1. **Read this whole file** before editing.
2. **cd** to the local clone path above. If the path does not exist, clone the GitHub repo there.
3. `git fetch origin && git checkout -B feat/flow-metrics-2026-07 origin/main` (or continue existing feature branch if present).
4. Implement tasks in the **recommended commit sequence** at the bottom of the plan section.
5. After each commit: run the **verify commands** listed below.
6. Create/update **`docs/TASKS.md`** with every task ID and status.
7. Complete the **README dual-section rewrite**.
8. Run design + code + security self-review on the diff; fix critical/high issues.
9. Push branch and open a PR against `main`. Do **not** force-push. Do **not** merge unless the user asked for auto-merge.
10. Do **not** touch other portfolio repos in this session.

## What “done” means for this product

All task IDs listed above are implemented **or** explicitly documented as infeasible with a narrow alternative. Metrics are local-first, activation is a named constant, scoreboard is user-visible with method + privacy copy, README is dual-section, `docs/TASKS.md` is accurate, tests/build green, PR open.


## Global constraints (apply to ALL work)

Source: `~/Desktop/portfolio-implementation-plan-2026-07-10.md` and `~/Desktop/product-flow-metrics-task-list.md`.

1. **Local-first metrics** — counters/estimates on device or extension storage only. Nothing leaves unless user explicitly exports or opts in. **No cloud analytics in v1.**
2. **One activation event** — named constant in code (e.g. `ACTIVATION_EVENT = '...'`).
3. **User-visible scoreboard** on the natural success screen (ParseKit token-savings pattern), with **method + caveat microcopy**. Honest estimates; never fake precision.
4. **Privacy line on every stats surface:** e.g. *"Stored only on this device. Never uploaded."* (wording may adapt slightly per product).
5. **Zero-AI default** where relevant — core loop works without API keys; AI is optional upgrade.
6. **README rewrite required** in every repo (see below).
7. **`docs/TASKS.md`** committed checklist; update checkboxes as you finish task IDs.
8. **Ship path:** branch `feat/flow-metrics-2026-07` → push → open PR → (if user requested auto-merge and reviews pass) squash-merge to default branch and delete feature branch.

### README overhaul (mandatory for every product)

Rewrite `README.md` with **two top sections**:

#### Start here (novice)
Plain everyday words, zero jargon:
- What it is
- What problems it solves
- Step-by-step install and first use
- Edge cases and how to still use it when you hit them

#### For technical users
- Mermaid architecture diagram (GitHub-native render)
- How it works under the hood
- Metrics / activation definition
- Dev install, test commands, storage/privacy notes

### Ship checklist per repo

- [ ] All task IDs for this product implemented or honestly deferred with reason in PR
- [ ] `docs/TASKS.md` updated (checkboxes match reality)
- [ ] README novice + technical sections done
- [ ] Build/tests pass (commands in this file)
- [ ] Design pass (hierarchy, motion, empty states, reduced-motion)
- [ ] Code pass (edge cases, no regressions)
- [ ] Security pass (secrets, XSS, storage, permissions, no accidental egress)
- [ ] Branch pushed; PR opened with body mapping commits → task IDs → metrics
- [ ] Merge only if user wants auto-merge **or** explicitly asks

### Related docs (read if needed)

| File | Why |
|------|-----|
| `~/Desktop/product-flow-metrics-task-list.md` | Original product task specs + metrics definitions |
| `~/Desktop/pm-portfolio-analysis-lenny.md` | Why these metrics matter (senior PM framing) |
| `~/Desktop/portfolio-implementation-plan-2026-07-10.md` | Multi-repo orchestration notes |
| `~/Desktop/fable-portfolio-handoff/STATUS.md` | What Fable completed (mostly plans only) |


## Work already completed (do not redo)

PR open: https://github.com/harshabala/IntentLock/pull/2 · branch `feat/flow-metrics-2026-07`

| Item | Status |
|------|--------|
| `session-metrics.js` + tests | Done |
| page-tracker `dwellDeltaMs` | Done |
| `isUrlAligned` + relatedHostnames in evaluatePolicyDrift | Partial (backend marks path started; overlay UI not done) |
| background metrics + createHistoryEntry + REPORT_VIEWED | Done |
| Session report UI + popup end → report | Done |
| `docs/TASKS.md` skeleton | Done |
| IL-2 session form presets | **TODO** |
| IL-3 mark-related overlay UI | **TODO** |
| IL-4 weekly popup glance | **TODO** |
| IL-5 heuristics-first onboarding | **TODO** |
| history.js on-intent % | **TODO** (check if missing) |
| docs/storage-schema.md update | **TODO** |
| README dual rewrite | **TODO** |
| Version bump / CHANGELOG | **TODO** |

**Local path:** `~/Documents/Projects/IntentLock`  
**Verify:** `node --test tests/*.mjs` (was 125 pass after IL-1 foundation)

**Agent resume focus:** Finish IL-2 → IL-5, history.js, storage-schema, README, then push commits onto the existing PR branch.


## Original product task spec (source of truth for “why”)

# P0 — IntentLock

## Product in one line

Chrome extension: declare browsing intent; block/score drift when tabs stop matching.

## Current gap

Strong mechanism; weak **session report**. Behavior products need a scoreboard or users can’t feel progress (and you can’t tell a metrics story).

---

### Task IL-1 — End-of-session report as the default close path

| Field | Detail |
|-------|--------|
| **Flow change** | When user ends session (or timer ends): full-screen or new-tab **Session report** before returning to empty new tab. Not only “session cleared.” |
| **Content** | Intent name · duration · **time on-intent %** · interventions · overrides · top domains (aligned vs drift) · one line: “You stayed on track X of Y minutes.” |
| **How it helps** | Makes outcome visceral. Activation isn’t only “locked in” — it’s “saw my first score.” Retention: people return to beat last session. |
| **Metric: Activation** | `activated = completed ≥1 session with duration ≥10 min AND report_viewed = true` |
| **Metric: Core health** | `on_intent_ratio = aligned_active_ms / session_active_ms` |
| **Metric: Intervention quality** | `override_rate = overrides / interventions` (high override = too aggressive or wrong policy) |
| **Metric: Retention proxy** | Sessions started per week (local history already likely exists) |
| **Privacy** | Store domain **hostnames** + intent labels + timestamps in extension storage only. No page titles/full URLs/query strings in the report history if avoidable (prefer eTLD+1). No sync to cloud unless user exports. |
| **User understanding** | *“On-intent % is time on sites that matched your intent policy vs total active browsing in this session. Heuristics don’t need an API key.”* |
| **Acceptance** | Every ended session shows report; history list of last N sessions with on-intent %. |

### Task IL-2 — Start session: intent + “what success looks like” in one step

| Field | Detail |
|-------|--------|
| **Flow change** | Session form: intent text + preset (Job search / Deep work / Coding) + strictness. Add one line under strictness: *“We’ll show your on-intent % when you finish.”* Sets expectation for the metric. |
| **How it helps** | Users know the product is scored, not only punitive. |
| **Acceptance** | Copy present on form; no extra step. |

### Task IL-3 — Intervention overlay: teach, don’t only block

| Field | Detail |
|-------|--------|
| **Flow change** | Overlay shows short reason: *“This looks like entertainment during Job search (heuristic).”* After override: optional one-tap *“This is related to my work”* → domain cooldown + local label (improves future scores). |
| **How it helps** | Lowers rage-quit; improves policy; shows product judgment. |
| **Metric** | `false_positive_marks` per domain (local) |
| **Privacy** | Label is local boolean on domain, not free-text to a server. |
| **Acceptance** | Override path always available; mark-related is optional. |

### Task IL-4 — Weekly glance in popup (no account)

| Field | Detail |
|-------|--------|
| **Flow change** | Popup: this week’s sessions, average on-intent %, best day. Button: “Export week as text” (for journaling / portfolio screenshots). |
| **How it helps** | Retention surface without opening full history. |
| **Privacy** | Export is user-initiated file/clipboard only. |
| **Acceptance** | Works offline; empty state if no sessions. |

### Task IL-5 — Zero-AI path explicit in first-run

| Field | Detail |
|-------|--------|
| **Flow change** | Onboarding step 2: default **Heuristics only** selected; LLM as “optional upgrade.” Copy: metrics work either way. |
| **How it helps** | Avoids “AI garnish” positioning; activation not blocked on API keys. |
| **Acceptance** | User can finish onboarding without any key. |

**IntentLock north star (for you):** weekly sessions among activated users.  
**User-facing north star:** average on-intent % (7-day) + sessions this week.

---

## Full Fable implementation plan (100% — implement against this)

# IntentLock — Implementation Plan: Flow Metrics (IL-1 … IL-5)

**Repo:** `/private/tmp/claude-501/-Users-harshabalakrishnan-Documents-Projects-IntentLock--claude-worktrees-nosync-sad-stonebraker-513401/43b1ff6a-912a-4fa7-82d6-aa16bd3c1ddd/scratchpad/portfolio/IntentLock`
**Branch:** `feat/flow-metrics-2026-07` (checked out) · **Default branch:** `main`
**Stack:** Chrome MV3, vanilla JS ES modules, no build step, `node:test` suite (114 tests currently passing)
**Test command (verified):** `node --test tests/*.mjs`

---

## 0. Architecture facts the plan builds on

| Fact | Consequence for this plan |
|------|--------------------------|
| `background.js` owns session lifecycle: `handleSessionStart`, `logEvent`, `evaluateDrift`, `triggerIntervention`, `endActiveSession` → `createHistoryEntry` → `sessionHistory` (capped 100) | All metric accumulation and history-entry enrichment happens here |
| `session.events` is **capped at 50** (`logEvent` shifts) | On-intent % CANNOT be reconstructed from events at session end. Metrics must accumulate **incrementally** into a persisted `session.metrics` object |
| `page-tracker.js` (content script side) reports `PAGE_DWELL` with **cumulative** `dwellMs` per page every 30 s, on visibility-hidden, and beforeunload; resets on SPA nav | To sum active ms safely across service-worker restarts, page-tracker should also report a **delta** (`dwellDeltaMs`) since its last report — a pure, already-tested module, easiest correct place for this |
| `heuristic-policy.js` has private `isKeywordAligned` / `isCategoryAligned`; `evaluatePolicyDrift` computes `isAligned` internally | Export one small helper `isUrlAligned(intent, url, policy, relatedHostnames)` so background can classify each dwell delta as aligned/drift with the exact same logic the policy engine uses |
| Interventions are not recorded anywhere today (only `OVERRIDE` events exist) | Add `session.metrics.interventionCount` incremented in `triggerIntervention` so `override_rate = overrides / interventions` is computable |
| Session report surfaces already exist half-built: `newtab.js showSummary()` (natural close path from new tab), `popup.js` End-session button, `OVERLAY_END_SESSION` in background | IL-1 = upgrade `showSummary` into the full report and route ALL end paths to it |
| History entries currently store full `overrides[].url` | Tighten to hostname-only per IL-1 privacy rule (history.js already renders hostname anyway) |
| Onboarding is `newtab.js showOnboardingWizard()` steps 1–3; step 2 is the LLM key screen with a SKIP button | IL-5 = restructure step 2 so heuristics-only is the selected default, key entry is the opt-in branch |
| No package.json, no linter, no bundler | Only verification gates: `node --test tests/*.mjs` and `node --check <file>` per changed file |

---

## 1. Cross-cutting foundation (build first)

### 1.1 New module: `session-metrics.js` (create)

Pure functions + constants, mirroring the repo idiom of small ES modules with a matching `tests/*.test.mjs`. Contents:

```js
// The ONE activation event for IntentLock (spec IL-1):
// completed ≥1 session with duration ≥10 min AND its report was viewed.
export const ACTIVATION_EVENT = 'session_report_viewed_after_10_min_session';
export const ACTIVATION_MIN_SESSION_MS = 10 * 60 * 1000;

export function qualifiesForActivation(historyEntry) { /* duration ≥ 10 min && reportViewed */ }
export function isActivated(activationState) { /* Boolean(activationState?.activatedAt) */ }

export function createSessionMetrics() {
  return { activeMs: 0, alignedActiveMs: 0, interventionCount: 0, overrideCount: 0, domains: {} };
}
// domains: { [hostname]: { activeMs, alignedMs } }  — capped at 50 hostnames (drop smallest)

export function applyDwellDelta(metrics, { hostname, deltaMs, aligned }) { /* mutate-free, returns new */ }
export function computeOnIntentRatio(metrics) { /* alignedActiveMs / activeMs, null if activeMs === 0 */ }
export function topDomains(metrics, n = 5) { /* [{hostname, activeMs, aligned}] sorted desc */ }

export function summarizeWeek(sessionHistory, now = Date.now()) {
  // sessions in last 7 days → { sessionCount, avgOnIntentRatio (null-safe), bestDay: 'Tue'|null, totalActiveMs }
}
export function formatWeekExport(summary, now = Date.now()) { /* plain-text block, see IL-4 copy */ }

// Shared microcopy — single source so every surface stays consistent (spec: privacy line on EVERY stats surface)
export const PRIVACY_COPY = 'Stored only on this device. Never uploaded.';
export const ON_INTENT_METHOD_COPY =
  'On-intent % is time on sites that matched your intent policy vs total active browsing in this session. ' +
  'It is an estimate from active-tab time — heuristics don’t need an API key.';
```

### 1.2 `heuristic-policy.js` (modify — additive only)

- Export new helper (placed next to `isKeywordAligned`/`isCategoryAligned`):
  ```js
  export function isUrlAligned(intent, url, policy, relatedHostnames = []) {
    // keywordAligned || categoryAligned || hostname (or parent domain) ∈ relatedHostnames
  }
  ```
- Extend `evaluatePolicyDrift` signature with optional `relatedHostnames = []` and fold it into the internal `isAligned` computation (used by IL-3 "mark related"). Default `[]` keeps all 48 existing tests green.
- Improve the `blocked_category` reason label (IL-3 "teach, don't only block"): when site category and intent category are both known, return a composed `reasonLabel`:
  `This looks like ${siteCat.label} during ${intentCat.label} (heuristic).`
  Fall back to the existing static `REASON_LABELS.blocked_category` otherwise.

### 1.3 New storage keys (`chrome.storage.local`) — document in `docs/storage-schema.md`

| Key | Shape | Written by | Task |
|-----|-------|-----------|------|
| `activeSession.metrics` | `{ activeMs, alignedActiveMs, interventionCount, overrideCount, domains: {hostname: {activeMs, alignedMs}} }` | background on every dwell delta / intervention / override | IL-1 |
| `sessionHistory[]` new fields | `activeMs, alignedActiveMs, onIntentRatio (0–1 or null), interventionCount, overrideCount, topDomains: [{hostname, activeMs, aligned}], reportViewed: boolean` — and `overrides[].hostname` **replaces** `overrides[].url` | `createHistoryEntry` + `REPORT_VIEWED` handler | IL-1 |
| `activationState` | `{ activatedAt: number\|null, sessionId: string\|null }` | background on `REPORT_VIEWED` when `qualifiesForActivation` | IL-1 |
| `relatedDomainMarks` | `{ [hostname]: { count: number, lastMarkedAt: number } }` (the spec's `false_positive_marks` per domain; boolean label, local only, capped 200) | background on `OVERLAY_OVERRIDE` with `markRelated: true` | IL-3 |

No new keys for IL-4 — the weekly glance is computed on the fly from `sessionHistory`. Nothing is ever sent anywhere; export is user-initiated clipboard/file only.

### 1.4 New test file: `tests/session-metrics.test.mjs` (create)

Cover: activation constant + `qualifiesForActivation` boundary (599 999 ms vs 600 000 ms; reportViewed false), ratio math incl. `activeMs === 0 → null`, domain cap, `summarizeWeek` (empty history → zeros/nulls; sessions with null ratios excluded from avg; bestDay), `formatWeekExport` snapshot.

---

## 2. Task IL-1 — End-of-session report as the default close path

### Files

| File | Change |
|------|--------|
| `page-tracker.js` | Add `dwellDeltaMs` to every report: track `lastReportedActiveMs`, include `dwellDeltaMs = activeMs - lastReportedActiveMs` in `snapshot()`/`report()`, reset it in `resetForUrl` |
| `tests/page-tracker.test.mjs` | New assertions: consecutive reports carry deltas; delta resets after SPA nav |
| `background.js` | Metrics accumulation + history enrichment + report routing (details below) |
| `tests/background.test.mjs` | `createHistoryEntry` includes ratio/topDomains/hostname-only overrides |
| `newtab.js` | `showSummary` → full **Session report**; handle `?report=last` deep link; send `REPORT_VIEWED` |
| `popup.js` | End-session button routes to the report tab |
| `history.js` | Show on-intent % per session card |
| `docs/storage-schema.md` | New fields/keys from §1.3 |

### `background.js` details

1. **Init:** in `handleSessionStart`, `session.metrics = session.metrics || createSessionMetrics()` (defensive `ensureMetrics(session)` helper used everywhere metrics are touched, since `newtab.js` creates the session object).
2. **Accumulate:** in `handleContentEvent`, on `PAGE_DWELL`/`SPA_NAVIGATION` with `payload.dwellDeltaMs > 0`:
   - `aligned = isUrlAligned(session.intent, payload.url, heuristicPolicy, Object.keys(relatedDomainMarks))`
   - update `session.metrics` via `applyDwellDelta` and persist with the existing `logEvent` write (piggyback on the same `chrome.storage.local.set({activeSession})`).
   - Respect `trackingEnabled === false`: no dwell events arrive, `activeMs` stays 0, report degrades honestly (see copy).
3. **Interventions:** in `triggerIntervention`, increment `session.metrics.interventionCount` (read-modify-write `activeSession`).
4. **Overrides:** in `handleOverlayOverride` and the `intervention.js` path (`OVERRIDE_INTERVENTION` → `handleOverride`), increment `session.metrics.overrideCount`.
5. **History entry:** extend `createHistoryEntry(session)`:
   - `onIntentRatio: computeOnIntentRatio(session.metrics)`, `activeMs`, `alignedActiveMs`, `interventionCount`, `overrideCount`, `topDomains: topDomains(session.metrics, 5)`, `reportViewed: false`
   - **Privacy tightening:** map `overrides[].url` → `overrides[].hostname` via existing `extractDomain()`; drop full URL/query strings from history (spec: hostnames only; page titles were already excluded).
6. **New message `REPORT_VIEWED`** (add to `handledMessages`): payload `{ sessionId }` → set `reportViewed: true` on the matching `sessionHistory` entry; if `qualifiesForActivation(entry)` and `activationState.activatedAt` is null, set `activationState = { activatedAt: Date.now(), sessionId }`. This is the **single activation event** (`ACTIVATION_EVENT` in `session-metrics.js`).
7. **Route every close path to the report:**
   - `OVERLAY_END_SESSION`: after `endActiveSession`, `chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html?report=last') })`.
   - Keyboard shortcut `toggle-session` end path: same.
   - popup and newtab paths handled in their own files (below).

### `newtab.js` details

- On `DOMContentLoaded`, before the existing `activeSession` check: if `new URLSearchParams(location.search).get('report') === 'last'` and no active session, load `sessionHistory`, render `showSummary` for the last entry.
- Rewrite `showSummary(container, session)` into the **Session report** (works from either a live ended session or a history entry — normalize both into one shape):
  - `h1`: `Session report`
  - Intent line (existing intent box).
  - **Hero stat** (the ParseKit-style emotional payoff): big on-intent %, with the one-liner below:
    - `You stayed on track ${alignedMin} of ${activeMin} minutes.` (rounded whole minutes)
    - If `onIntentRatio === null` (no dwell data / tracking off): show `—` and `Not enough activity data to score this session.` (never fake a number). If tracking is disabled add: `Behavior tracking is off in Settings, so on-intent % can't be measured.`
  - Stat rows (reuse `.stat-row` pattern): `Duration`, `Interventions`, `Overrides`, `Budget` (existing logic).
  - **Top domains** section replacing "Top drift sites": last-5 by active time, each row `hostname · Xm` with an `aligned` / `drift` tag (reuse `.plan-section` + `.stat-row`).
  - Reflections section (existing, unchanged).
  - **Method + caveat microcopy** (small, under the hero stat): `ON_INTENT_METHOD_COPY` from `session-metrics.js`.
  - **Privacy line** (footer of the report): `PRIVACY_COPY` → `Stored only on this device. Never uploaded.`
  - Buttons: `Start new session` (existing) + `View in history` (existing).
- After rendering, send `chrome.runtime.sendMessage({ type: 'REPORT_VIEWED', sessionId })`.
- Delete the dead local `createHistoryEntry` duplicate in `newtab.js` (unused since ending moved to background) — small cleanup, keeps one source of truth.

### `popup.js` details

- End-session click: after `END_ACTIVE_SESSION` + `SESSION_CLEARED`, `chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html?report=last') })` and `window.close()` — the report becomes the default close path from the popup too.

### `history.js` details

- In the meta row items, insert on-intent % when present: `` `${Math.round(session.onIntentRatio * 100)}% on-intent` `` (omit when `onIntentRatio == null` — old entries stay renderable). `overrides[].hostname` fallback: keep reading `o.url` for pre-existing entries (`o.hostname || hostname(o.url)`).

### Acceptance verification

- Load unpacked → run a ≥10 min session mixing an aligned site (e.g. github.com under `coding`) and a drift site → end via (a) new-tab Complete, (b) popup End session, (c) overlay End session → all three land on the Session report showing intent, duration, on-intent %, interventions, overrides, top domains, "You stayed on track X of Y minutes."
- `chrome.storage.local.get(['sessionHistory','activationState'])` in the service-worker console: entry has `onIntentRatio`, `reportViewed: true`, hostname-only overrides; `activationState.activatedAt` set.
- History page lists last sessions with on-intent %.
- `node --test tests/*.mjs` green.

---

## 3. Task IL-2 — Start session: intent + "what success looks like" in one step

### Files

| File | Change |
|------|--------|
| `newtab.js` | Extend `showNewSessionForm` (one screen, no extra step) |
| `newtab.css` | Minor styles for the preset row + expectation line (follow existing `.input-group` / `.field-hint` idioms) |

### Approach

- Add to the existing form, between the intent textarea and the time budget:
  - **Preset select** `#intent-preset` labeled `Preset` — options built from `INTENT_CATEGORIES` (all 12; the spec's Job search / Deep work / Coding are the first three; default = current `heuristicPolicy.intentCategoryId` or `classifyIntentCategory(intent)` suggestion on blur).
  - **Strictness select** `#session-strictness` labeled `Strictness` — `relaxed / balanced / strict`, defaulted from stored `heuristicPolicy.strictness`.
- One line of copy directly under the strictness select (class `field-hint`):
  - `We’ll show your on-intent % when you finish.`
- On submit (inside the existing `bindForm` handler, before session creation): if preset/strictness differ from stored policy, `buildDefaultPolicy(presetId, strictness)` (preserving `customBlockDomains`/`customAllowDomains` from the existing policy), save `heuristicPolicy`, send `CONFIG_UPDATED`. Session start flow otherwise unchanged — **no extra step**.

### Acceptance verification

- Open new tab → form shows intent + preset + strictness + the expectation copy; Lock in still one click. Changing preset updates `heuristicPolicy` (check storage). Screenshot for case study.

---

## 4. Task IL-3 — Intervention overlay: teach, don't only block

### Files

| File | Change |
|------|--------|
| `heuristic-policy.js` | Composed teach-reason for `blocked_category` + `relatedHostnames` param (§1.2) |
| `tests/heuristic-policy.test.mjs` | New cases: composed reason label; `relatedHostnames` makes a blocked domain aligned (no intervene); default arg keeps old behavior |
| `intervention-overlay.js` | Add optional one-tap "mark related" control |
| `tests/intervention-overlay.test.mjs` | Overlay exposes the mark control; override callback receives `markRelated` |
| `content.js` | Pass `markRelated` through `OVERLAY_OVERRIDE` payload |
| `background.js` | Persist mark → `relatedDomainMarks`; feed `relatedHostnames` into `evaluatePolicyDrift` and `isUrlAligned`; load key in `loadConfig` |
| `intervention.html` / `intervention.js` | Same optional checkbox on the full-page fallback for parity |
| `docs/storage-schema.md` | `relatedDomainMarks` key |

### Approach

- **Reason copy (teach):** background already passes `policyDrift.reasonLabel` — with §1.2 the overlay shows e.g. `This looks like Social Media during Job Search (heuristic).` LLM-triggered interventions keep the existing generic line.
- **Overlay control:** in `createInterventionOverlay`, add a checkbox row above the actions (unchecked by default, purely optional):
  - Label: `This is related to my work` (id `intentlock-mark-related`)
  - `onOverride(reflection, { markRelated })` — override path always available and unchanged when unchecked.
- **content.js:** include `markRelated` in the `OVERLAY_OVERRIDE` payload.
- **background.js `handleOverlayOverride`:** when `payload.markRelated` and a hostname is extractable:
  - `relatedDomainMarks[hostname] = { count: (prev.count||0)+1, lastMarkedAt: Date.now() }` (the spec's `false_positive_marks` metric, local only — a boolean-ish label on the domain, never free-text to any server).
  - Existing 5-min cooldown still applies (already implemented in `handleOverride`), satisfying "domain cooldown".
- **Scoring improvement:** in `evaluateDrift`, pass `relatedHostnames: Object.keys(relatedDomainMarks)` to `evaluatePolicyDrift`, and to `isUrlAligned` for dwell classification (IL-1) — marked domains count as aligned in future sessions and their dwell floors (120 s rule) no longer fire. This is deliberately stronger than `customAllowDomains` (which only clears the category block, not the unaligned-dwell floor).
- `loadConfig` reads `relatedDomainMarks` into memory alongside `overrideCooldowns`.

### Acceptance verification

- Trigger a blocked-category intervention during a `job_search` session → overlay reason reads `This looks like Social Media during Job Search (heuristic).`
- Override without the checkbox: works exactly as before (reflection required, cooldown set).
- Override with checkbox: `relatedDomainMarks` written; start a new session with the same intent category → visiting that domain no longer intervenes.
- Tests: policy tests for `relatedHostnames`; overlay test for the control; all existing tests green.

---

## 5. Task IL-4 — Weekly glance in popup (no account)

### Files

| File | Change |
|------|--------|
| `popup.js` | Weekly glance block + export button (both session-active and no-session states) |
| `popup.html` | none needed (popup.js builds DOM into `#content`) — keep as is |
| `newtab.css` | Small `.week-glance` styles reusing `.stat-row` / `.no-session` tokens |
| `session-metrics.js` | `summarizeWeek` + `formatWeekExport` (§1.1) — popup.js must load it; **note:** popup.html loads `popup.js` as a classic script, so either add `type="module"` to the `<script>` tag (matches how other extension pages could work; MV3 CSP allows it) — one-line `popup.html` change |

### Approach

- After the existing content (active-session block or empty state), render **This week** from `sessionHistory` via `summarizeWeek`:
  - Rows: `Sessions · N`, `Avg on-intent · NN%` (or `—` when no scored sessions), `Best day · Tue` (day with highest avg on-intent %, omit if none).
  - Empty state (no sessions in 7 days): `No sessions this week yet. Open a new tab to start one.`
  - Button `Export week as text` (class `complete-btn`): builds text via `formatWeekExport` →
    ```
    IntentLock — week of Jul 6, 2026
    Sessions: 4
    Avg on-intent: 78%
    Best day: Tue (91%)
    Total focused time: 3h 12m
    Generated locally. Nothing was uploaded.
    ```
    Copy to clipboard via `navigator.clipboard.writeText`; on failure fall back to a `Blob` download `intentlock-week-<date>.txt` (mirrors the JSON export pattern in `options.js`). Show `Copied to clipboard.` status line.
  - Method caveat (small text): `Averages cover sessions ended in the last 7 days; unscored sessions are excluded.`
  - Privacy line: `Stored only on this device. Never uploaded.`
- Everything reads local storage only — inherently offline; no network APIs touched.

### Acceptance verification

- With zero history: popup shows the empty-state line (no crash, no blanks).
- With ≥2 sessions this week: numbers match `sessionHistory` math; disconnect network → identical behavior; Export puts the text block on the clipboard.

---

## 6. Task IL-5 — Zero-AI path explicit in first-run

### Files

| File | Change |
|------|--------|
| `newtab.js` | Restructure onboarding `showStep2` |
| `newtab.css` | Styles for the two-option mode chooser (reuse `.input-group`, button classes) |

### Approach

Keep three steps (no new step). Rework step 2 from "enter a key or hunt for SKIP" into an explicit default choice:

- Heading: `CHOOSE YOUR DETECTION MODE`
- Intro copy: `IntentLock scores drift with built-in heuristics. An AI provider is an optional second opinion — your on-intent % and all metrics work either way.`
- Radio pair (heuristics **pre-selected**):
  - `Heuristics only — recommended, no API key` (default)
  - `Add an AI provider — optional upgrade`
- Provider select + key input (the existing controls, unchanged) are hidden unless the second radio is chosen — reuse the existing `hidden`-class toggling pattern from `updateOnboardingProviderUI`.
- Primary button: `CONTINUE` — with heuristics-only selected it clears any stored `llmApiKey` (existing `clearStoredKey` helper) and advances straight to step 3; with AI selected it runs the existing validate/save path (`LOCK IN` behavior). Keep `SKIP` removed (the default option replaces it) or keep it as a no-op alias — recommend removing to reduce choices.
- The existing step-3 policy screen and `finishOnboarding` are untouched, so onboarding completes with zero keys entered.
- Also update the post-onboarding `api-notice` in `showNewSessionForm` copy from "Configure an LLM provider … to enable AI-powered drift detection" to the honest framing: `Heuristics are active. Add an AI provider in Settings for a second opinion on ambiguous pages (optional).` — avoids "AI garnish" positioning on every new tab.

### Acceptance verification

- Fresh profile (`chrome.storage.local.clear()` + reload): complete onboarding pressing only NEXT → CONTINUE → SAVE POLICY, never typing a key; land on session form; start a session; heuristic intervention fires on a blocked site. `tests/static-smoke.test.mjs` still green.

---

## 7. Documentation & versioning (last commit)

- `docs/storage-schema.md`: add `activeSession.metrics`, new `sessionHistory` fields, `activationState`, `relatedDomainMarks`; note hostname-only overrides.
- `README.md`: add a short **"What success looks like"** section mirroring the in-app metrics (activation definition, on-intent %, weekly glance) per the cross-product checklist; update the flow diagram end node (`Session report` instead of nothing) and Settings/Version tables.
- `CHANGELOG.md` + `manifest.json`: bump to `1.6.0` — "Session report, on-intent %, weekly glance, mark-related, heuristics-first onboarding".

---

## 8. Commit sequence (conventional, small)

1. `feat: add session-metrics module with activation constant and week summary` (session-metrics.js + tests)
2. `feat: report dwell deltas from page tracker` (page-tracker.js + tests)
3. `feat: accumulate on-intent metrics and enrich session history` (background.js, heuristic-policy.js `isUrlAligned`, tests, storage-schema doc)
4. `feat: session report as default close path` (newtab.js, popup.js, history.js, css) — IL-1
5. `feat: show on-intent expectation and preset on session form` — IL-2
6. `feat: teach-mode intervention reason and mark-related cooldown label` — IL-3
7. `feat: weekly glance and text export in popup` — IL-4
8. `feat: heuristics-first onboarding with optional AI upgrade` — IL-5
9. `docs: storage schema, README success metrics, changelog 1.6.0`

After each commit: `node --test tests/*.mjs` and `node --check` on every touched `.js` file. Manual smoke via `chrome://extensions` Load unpacked for the UI tasks.

---

## 9. Global-constraint compliance map

| Constraint | Where satisfied |
|-----------|-----------------|
| Local-first, no telemetry | All new keys in `chrome.storage.local`; only egress is user-initiated clipboard/file export (IL-4) and the pre-existing opt-in LLM calls |
| ONE activation event as named constant | `ACTIVATION_EVENT` + `qualifiesForActivation()` in `session-metrics.js`; single write site (`REPORT_VIEWED` handler) |
| Scoreboard on natural success screen | Session report hero on-intent % in `newtab.js showSummary` — every end path routes there |
| Method + caveat microcopy | `ON_INTENT_METHOD_COPY` on report; week-average caveat in popup; honest `—` when unscorable |
| Privacy line on every stats surface | `PRIVACY_COPY` ("Stored only on this device. Never uploaded.") on report, popup weekly glance, and export footer |
| Extend, don't rewrite | No module is replaced; all changes are additive to existing files/patterns; events schema untouched (metrics ride alongside) |

## 10. Infeasible tasks

None. All five tasks are implementable in the current codebase. One spec nuance handled honestly rather than skipped: when the user disables behavior tracking (`trackingEnabled = false`), on-intent % is unmeasurable — the report says so explicitly instead of showing a fake number.


## Agent completion checklist

- [ ] Pull latest `feat/flow-metrics-2026-07` and confirm PR #2 base
- [ ] IL-1 gaps closed (history.js %, storage-schema, any missing tests)
- [ ] IL-2 done
- [ ] IL-3 done (overlay mark-related UI)
- [ ] IL-4 done
- [ ] IL-5 done
- [ ] README dual sections
- [ ] `docs/TASKS.md` fully checked
- [ ] `node --test tests/*.mjs` green
- [ ] Security: no full URLs in history; no telemetry; keys not logged
- [ ] Push + update PR body
