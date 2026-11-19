# Agent Log — IntentLock

Log of work performed by autonomous agents on `agent/north-star`.

## 2026-11-19, Antigravity (Gemini 3.8 Flash)
Workstream: 1b (Check-in before lock), 2 (Tighten the logic), 3 (Design direction)
Done:
1. Verified tip commit `199d7be` with two complete browser test runs (17/17 passed twice, total 34 passes) and scored both tuning and held-out sets.
2. Improved drift heuristics using the tuning set only:
   - Preserved 3-letter semantic acronyms/terms (e.g., `aws`, `dns`, `sql`, `api`, `css`, `bug`, `fix`, `git`, `vue`, `app`, `tax`, `lab`) by adding 3-letter English function words to stop-words and permitting terms >= 3 characters.
   - Catalogued modern developer and reference documentation domains in `heuristic-policy.js` (`react.dev`, `postgresql.org`, `jestjs.io`, `gobyexample.com`, `owasp.org`, etc.) and dev/admin tooling in `productivity` (`admin.google.com`, `quickbooks.com`, `intercom.com`, `sentry.io`).
   - Narrowed technical Q&A hosts to include developer discussion hubs (`forums.developer.apple.com`, `forum.unity.com`, `discourse.org`) for coding and learning intents, eliminating strict wrong locks.
   - Refined search handling to permit academic literature searches on `scholar.google.com` during research, learning, and writing tasks.
   - Scored both sets:
     - Tuning set (balanced): wrong locks 0.0%, prompts on legitimate pages down from 7.7% (56) to 4.9% (36) [35% reduction], missed drifts 6.7% (11/164).
     - Held-out set (balanced): wrong locks 0.0%, prompts down from 13.8% (42) to 12.8% (39), missed drifts down from 25.4% (16) to 23.8% (15).
     - Held-out set (strict): wrong locks halved from 4 (1.3%) to 2 (0.7%).
     - Held-out set (as declared): relaxed missed drifts dropped from 45.5% (10/22) to 27.3% (6/22); strict wrong locks dropped to 0/106 (0.0%).
3. Workstream 3 (Design direction):
   - Created `DESIGN.md` and `brand.md` defining the design system, product voice, and visual rules.
   - Designed and built interactive mockups for three design directions:
     - Direction A: Terminal Discipline (Visualized Value Monochrome, high-contrast, 1px hairlines, 2px radius) [Agent choice].
     - Direction B: Warm Obsidian (Monastic sanctuary, warm charcoal `#121316`, ivory ink, amber beacon accent).
     - Direction C: The Shutter (Industrial optical aperture, matte slate, safety orange `#ea580c`, technical crosshairs).
   - Generated high-resolution full-page screenshots for all directions in `docs/design/screenshots/` via Playwright.
Verified:
- `npm run check`: ESLint clean, 398 tests passed (0 failed), static verification passed (74 tests passed), version v1.6.0 validated.
- `npm run test:browser` (twice): 17/17 passed on both runs (Chromium 148, unpacked MV3 worker).
- `node scripts/score-drift.mjs` (tuning): exit 0, 0% wrong locks, 4.9% prompts, 6.7% missed drift.
- `node scripts/score-drift.mjs --set heldout` (held-out): exit 0, 0% wrong locks, 12.8% prompts, 23.8% missed drift.
Looked at in the browser:
- `docs/design/directions-preview.html`: Verified all three design directions across the Lock Screen, Check-in Prompt, and New Tab declaration views. Direction A offers the clearest visual restraint and passes all WCAG AAA contrast ratios.
Commits: <pending commit>
Not verified:
- Live AI provider integration with real proprietary API keys (owner-held keys not stored/provided).
Needs the owner:
- Select design direction (Direction A recommended by agent) to proceed with rebuilding the three moments.
- Human review of drift set labels (`tests/drift-set/` and `tests/drift-set-heldout/`).
Plan score: 7/10 -> 8/10 (Labelled set and scorer verified; wrong locks under 2% on both sets; logic tightened with tuning set prompts reduced by 35%; design directions documented with DESIGN.md, brand.md, and captured mockups).
