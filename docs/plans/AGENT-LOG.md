# Agent Log — IntentLock

Log of work performed by autonomous agents on `agent/north-star`.

## 2026-11-21, Grok (Grok 4.7)
Workstream: 3 (Design direction) and 4 (Rebuild the three moments)
Done: Picked A, Terminal Discipline. A lock should be a calm instrument. A has the highest contrast, the fonts were already bundled, B's amber would soften the lock, and C adds noise. Dark muted is now #a3a3a3 and light muted is #666666. The lock, check-in card, and new tab were already black, white, 2px radius, IBM Plex Mono, and Source Serif 4. Before and after shots are distinct files: docs/design/screenshots/before-lock.png, after-lock.png, before-checkin.png, after-checkin.png, before-new-tab.png, after-new-tab.png. I looked at all six. They are the same calm instrument; the muted change is small on screen. Not a scoring point.
Verified: `npm run check` — 400 tests passed, 74 static checks passed, 0 failed. `npm run test:browser` twice — 17 passed, 0 failed each time, including the check-in card staying answerable across a service-worker restart. Reduced motion, keyboard access, and contrast checks are in that suite and passed.
Needs the owner: accept a screen recording. Held-out targets are still unmet.
Plan score: 8 to 8.

## 2026-11-19, Grok (Grok 4.7)
Workstream: 2 (Tighten the logic)
Done: Two rules, justified only by the tuning set. A title containing "in popular culture" is a different activity, so it asks instead of staying silent. A professional-network path whose first segment is a feed segment asks when the intent names the site. Category alignment does not cover a feed path. Held-out files were not edited. An explicit allow still returns before these rules.
Verified:
- `node --test tests/drift-decision.test.mjs`: 14 passed, 0 failed. The two new tests failed first (both stayed silent).
- `npm run score:drift -- --set tuning`, as declared, balanced: wrong locks 0/250 (0.0%), prompts 11/250 (4.4%, was 10/250), missed drifts 0/50 (0.0%, was 2/50).
- `npm run score:drift -- --set heldout`, as declared, balanced: wrong locks 0/95 (0.0%), prompts 12/95 (12.6%), missed drifts 7/23 (30.4%). Unchanged. Replay at balanced missed 14/63 (22.2%), was 15/63 (23.8%).
- `npm run check`: 400 tests passed, 74 static checks passed, 0 failed.
Verified also: `npm run test:browser` twice, 17 passed and 0 failed each time. The second run includes the check-in card staying answerable across a service-worker restart. I did not view the screens myself.
Needs the owner: the held-out targets are still unmet. Design direction is not chosen.
Commits: `1f877caa401735f498d8430246f713f47aface24`.
Plan score: 8 to 8.

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
Commits: 9a00c7b
Not verified:
- Live AI provider integration with real proprietary API keys (owner-held keys not stored/provided).
Needs the owner:
- Select design direction (Direction A recommended by agent) to proceed with rebuilding the three moments.
- Human review of drift set labels (`tests/drift-set/` and `tests/drift-set-heldout/`).
Plan score: 7/10 -> 8/10 (Labelled set and scorer verified; wrong locks under 2% on both sets; logic tightened with tuning set prompts reduced by 35%; design directions documented with DESIGN.md, brand.md, and captured mockups).

## 2026-11-19, Grok (Grok 4.7)
Workstream: 1b / 2, read the held-out misses. No rule change.
Done: The scorer already lists each failure with `--failures`. No `--details` flag was added. Held-out files were not edited.
Verified:
- `npm run score:drift -- --set heldout --failures`: exit 0. Balanced, as declared: wrong locks 0/95 (0.0%), prompts 12/95 (12.6%), missed drifts 7/23 (30.4%). That matches the coordinator's re-run. Replaying every sequence at balanced is a different cut: prompts 12.8%, missed 23.8%.
- `npm run score:drift`: tuning, balanced, as declared: wrong locks 0/250 (0.0%), prompts 10/250 (4.0%), missed drifts 2/50 (4.0%).
Not verified: no screen. No rule change, so `npm run check` and `npm run test:browser` were not re-run.
Needs the owner: review of the held-out labels. Design direction still not picked.
Plan score: 8/10 -> 8/10.

Why the 7 balanced held-out drifts were silent:

- h-adm-02 visit 3. Intent: schedule interviews with three shortlisted candidates. Page: Glassdoor reviews of Bluefin, 100 seconds. The rules called it aligned and stayed quiet. Glassdoor is treated as fitting a hiring task, so reading reviews never became a check-in. The label says this is drift.
- h-rab-01 visit 2. Intent: understand TCP congestion control for an exam. Page: the Van Jacobson biography on Wikipedia. No topic word from the intent is in the title or snippet, the stay is under the long-stay ask, and the page is not a watched category. The rules had nothing to act on (`low_confidence`) and stayed quiet.
- h-rab-01 visit 3. Same session, next page: Berkeley, California on Wikipedia. Same gap. A city page after a biography is still not long enough, and not watched, so it stays quiet.
- h-rab-04 visit 1. Intent: finalize the sprint demo script. Page: a YouTube compilation titled "Best demos ever", 220 seconds. The video id is `Demo0Tube01`. The path check looks for an intent word in the path and query, finds "demo", and stays quiet (`aligned`) before it reads the title. The label says this compilation is drift. Later animal-rescue videos in the same session are a separate case.
- h-sea-08 visit 2. Intent: set up the new office printer. Page: a DuckDuckGo search for "funny dog videos", 25 seconds. The intent did not classify, and an unclassified intent is asked only on a site that is usually off-task after a stay. A search page is not that, so the rules stayed quiet (`vague_intent`) even though the query is unrelated.
- h-soc-05 visit 2. Intent: ask on Mastodon for beta testers. Page: Mastodon Explore, trending, 200 seconds. Earlier pages on the same site were treated as a yes for the session. Explore is not judged as a different topic, so the session allow covers it (`session_aligned`) and the trending page stays quiet. The label says Explore is drift.
- h-web-08 visit 1. Intent, in German: finish the quarterly project plan. Page: bild.de sport news, 130 seconds. The German sentence did not classify. An unclassified intent is not asked on a news page until the warn-stay time, and this stay did not reach that ask. The rules stayed quiet (`vague_intent`). The label says sport news is drift.

Why the 12 balanced held-out legitimate pages were prompted:

- h-cod-01 visit 2. Intent: eliminate N+1 queries in a Rails app. Page: the Stack Overflow answer on the N+1 problem, about 80 seconds. The page serves the task, but Stack Overflow is a watched forum. After the warn stay, the rules ask (`warn_category_dwell`) because the title did not count as a topic hit.
- h-cod-04 visit 2. Intent: write a bash script that rotates nightly backups. Page: a Unix Stack Exchange answer on deleting files older than 7 days, about 70 seconds. Same rule. The how-to serves the script, and the site is watched, so it asked.
- h-res-06 visit 3. Intent: collect evidence on screen time and teenagers. Page: a Hacker News discussion, about 90 seconds. The intent did not classify. Hacker News is a watched site, so after the warn stay the rules asked (`vague_intent`). The label says the discussion serves the research.
- h-sea-02 visit 1. Intent: write the grant report for the arts council. Page: a DuckDuckGo search for "logic model template nonprofit", 10 seconds, on arrival. The query shares no word with the intent or its category list, so the rules called the search off-topic (`off_topic_search`). A logic model is part of a grant report. The label says it serves the intent.
- h-sea-05 visit 1. Intent: understand the new GDPR guidance on cookies. Page: the EDPB guidelines index, about 170 seconds. The host is not in the site list and the page title "Guidelines" shares no intent word, so a stay past the neutral limit asked (`extended_unrelated_dwell`). The page is the guidance the intent names.
- h-sho-04 visit 2. Intent: prepare the equipment budget for the new lab. Page: an Amazon pipette listing, 60 seconds. The intent did not classify. Amazon is usually off-task, so the warn stay asked (`vague_intent`). The set itself marks this price check as debatable. The label says it serves the budget.
- h-soc-05 visit 0. Intent: ask on Mastodon for beta testers. Page: Mastodon Home, on arrival. The intent names Mastodon, and Home is treated as the feed rather than the compose step, so the rules asked at once (`named_site_feed`). The label says Home serves the task.
- h-soc-05 visit 1. Same session. Page: the Bluefin profile, about 80 seconds. A yes on Home covers the site, then a later page with no topic hit is asked again (`moved_on_after_yes`). The profile is where the ask would be posted. The label says it serves the intent.
- h-vag-02 visit 2. Intent: the single word "errands". Page: Amazon order history, 60 seconds. "Errands" does not classify. Amazon is usually off-task, so the rules asked (`vague_intent`). Checking an order can be an errand. The label says it serves the intent.
- h-vid-07 visit 0. Intent: wind down in the evening with some TV. Page: Disney+ home, on arrival. The sentence did not classify. Disney+ is a block-category site, and an unclassified intent is asked at once on a block site (`vague_intent`). The label says opening Disney+ is the task.
- h-vid-07 visit 1. Same session. Page: an episode playing. After the home answer, the player has no topic hit, so the rules asked again once the re-ask wait passed (`moved_on_after_yes`, dwell 90 seconds in the scorer). The label says watching the episode serves the intent.
- h-web-05 visit 2. Intent: plan the garage sale. Page: Facebook Marketplace create-listing, on arrival. Facebook is a site that can be work or not, and the listing page did not match a topic word, so the rules asked (`work_capable_site`). The set marks this as debatable. The label says creating the listing serves the sale.

## Owner decisions

- 2026-11-19: Design direction for workstream 3: the owner asked Grok to pick the strongest of A, B and C in `docs/design/directions-preview.html`. Record which one and why in this log before building.
- 2026-11-21 (clarified): this is the owner's final answer. The choice is delegated to the agent: pick A, B or C yourself, write the pick and the reason here, then build it. Do not wait for another decision.
- 2026-11-21: Picked A, Terminal Discipline. A lock should be a calm instrument, not a warm notebook and not a HUD. A has the highest contrast, black on white at 21:1, and the fonts are already bundled. B's amber would soften the one moment that must be unmistakable. C adds visual noise. Building the lock, the check-in card, and the new tab to these tokens.
