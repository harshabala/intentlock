# Drift baseline, 2026-11-16

First measurement of right and wrong locks (north-star workstream 1). **No rule was changed.**
Reproduce: `npm run score:drift` (add `-- --failures` for every miss, `-- --json out.json` for rows).

**Read this first.** The labels are an agent's proposals (`labelled_by: agent, review:
pending-owner`, see `tests/drift-set/README.md`). Treat every number below as provisional until the
owner reviews the labels. The set is synthetic: 239 sequences, 892 visits, 728 labelled
`serves-intent` and 164 `drift` (the wrong-lock rate has a larger denominator than the missed-drift
rate). Rates depend on how many long reads I wrote; see "What drives the number".

## Baseline

Per visit. Wrong lock = locked on a `serves-intent` visit. Missed drift = silent on a `drift` visit.
A visit counts as locked if the check on arrival or any 30 s dwell report locks.

As declared (each sequence replayed at its own preset, about a third each):

| Preset | Visits | Wrong locks | Wrong-lock rate | Missed drifts | Missed-drift rate |
| --- | --- | --- | --- | --- | --- |
| relaxed | 298 | 55 / 228 | 24.1% | 15 / 70 | 21.4% |
| balanced | 300 | 60 / 250 | 24.0% | 4 / 50 | 8.0% |
| strict | 294 | 43 / 250 | 17.2% | 1 / 44 | 2.3% |

Every sequence replayed at every preset (labels are preset-independent, so this is the like-for-like
comparison):

| Preset | Wrong locks | Wrong-lock rate | Missed drifts | Missed-drift rate | Sequences with a wrong lock |
| --- | --- | --- | --- | --- | --- |
| relaxed | 151 / 728 | 20.7% | 29 / 164 | 17.7% | 105 / 239 |
| balanced | 159 / 728 | 21.8% | 12 / 164 | 7.3% | 108 / 239 |
| strict | 159 / 728 | 21.8% | 11 / 164 | 6.7% | 108 / 239 |

Confusion table, balanced, all sequences (rows are the proposed label):

| | silent | lock |
| --- | --- | --- |
| serves-intent | 569 | 159 (wrong locks) |
| drift | 12 (missed) | 152 |

Excluding the 57 flagged-debatable cases changes little (balanced: 20.9% wrong locks, 6.2% missed),
so the result does not hinge on the contested labels. The workstream 2 targets (under 2% and under
10% at the default preset) are not met: wrong locks are about ten times too high; missed drifts at
balanced are within target but only because the rules lock aggressively.

Worst scenario categories (as declared; wrong-lock rate / missed-drift rate): long legitimate
reads 47.6% / n/a; video for work 42.9% / 0%; vague intents 47.4% / 0%; unlisted hosts 31.3% / 25%;
shopping for work 31.1% / 12.5%; research that looks like browsing 27.8% / 0%; searches 9.3% /
100% (6 of 6 drifts missed); social for work 21.4% / 42.9%; multi-tab switching 6.8% / 50%.
Best: sign-in redirects 4.1%, quick checks 6.7%, coding 7.3%.

## What drives the number

Of the 159 wrong locks at balanced: 114 (72%) are the 2-minute dwell rule on a page the rules
considered unaligned, 26 (16%) are a blocked category on arrival (mostly youtube.com), 16 (10%) are
the 60 s "repeated unrelated activity" path, and 3 are rapid tab switching. Of the 12 missed drifts,
11 are short detours or pages the rules judged aligned, and 1 is a host named in the intent.

## Three weakest rule areas

1. **The 2-minute unaligned-dwell floor, built on URL-only alignment.** A page counts as aligned
   only if the URL contains an intent word (4+ letters) or its site category is mapped to the
   intent. Dwell is summed per origin across pages, and each dwell report is itself logged as an
   "unrelated event" and a "same-domain load", so a 60 s read already scores 0.65 and a 120 s read
   locks. Careful reading is the commonest legitimate behaviour and is the commonest wrong lock.
2. **Site and intent mapping is coarse.** All of youtube.com is `short_video` (blocked for every
   non-entertainment intent, so tutorials lock on arrival); subdomains do not inherit a listed
   parent (`app.slack.com`, `app.asana.com` are neutral); forums are not aligned with
   entertainment; a vague or unclassified intent has no aligned categories at all, so even
   `docs.google.com` locks after two minutes; the keyword classifier misreads some intents
   (a lab-supplies order classified as learning).
3. **Keyword matching in both directions.** A word in the URL aligns the page, and naming a site in
   the intent aligns the whole site, so same-host drift is missed (the Facebook news feed while
   moderating a Facebook group). Search pages (`google.com/search?q=...`) are unlisted and short, so
   off-topic searches are never caught. Short off-topic glances (15 to 30 s) never reach 0.7.

## The twenty most instructive failures

Preset balanced. "Rule" says what the code decided and why; "Person" is the proposed label.

Wrong locks (rule locked; a person would not):

1. `res-05` v1, nature.com paper, intent "Gather sources for my paper on microplastics". Rule: lock
   at 120 s dwell (`extended_unrelated_dwell`); the URL is an article id with no intent word, and
   `nature.com` is unlisted. Person: the primary source being read. All five source pages lock.
2. `lng-02` v0, the Raft paper PDF, "Learn about distributed consensus". Rule: 120 s on an
   unlisted host, URL has no intent word. Person: this is the task. Same shape in `lng-03`, `lng-07`.
3. `cod-04` v3, react.dev "You Might Not Need an Effect", "Refactor the user settings component to
   use hooks". Rule: `react.dev` is unlisted and the URL has no intent word, so 210 s locks. Person:
   core documentation. Also `cod-07` (PostgreSQL docs), `unl-03` (the Go tour).
4. `unl-02` v1, the log search during "Debug the production outage". Rule: internal tool on an
   unlisted host, 200 s locks. Person: the work itself. Whole internal toolchains are invisible.
5. `drf-15` v0, Gmail drafts, "Write the monthly status email to investors". Rule: email is aligned
   for admin and communication but not writing; 160 s on the draft locks. Person: the task.
6. `adm-04` v0, `app.slack.com`, "Reply to team messages and send the standup update". Rule:
   intent classified as communication, but `app.slack.com` is not `slack.com`; subdomains do not
   inherit, so it is neutral and locks at 120 s. Person: the task. Same for `app.asana.com`.
7. `res-10` v2, a YouTube lecture on transformers, "Learn how transformers work in machine
   learning". Rule: `blocked_category:short_video` on arrival; the video URL is opaque. Person: the
   best resource. 10 wrong locks come from YouTube tutorials (`hlt-02`, `job-02`, `shp-08`, ...).
8. `soc-02` v0 to v2, x.com mentions and search, "Answer customer questions on our company X
   account". Rule: social media blocked on arrival, three times. Person: it is the job.
9. `ent-02` v2, reddit r/gaming, "Play some games and chill after work". Rule: forums are not in the
   entertainment alignment, so 60 s locks. Person: this is the stated intent. Four reddit visits
   under entertainment intents lock.
10. `tab-01` v4, comparing three project-management tools in side-by-side tabs. Rule:
    `rapid_context_switching` (4 tab switches, unrelated events) locks on arrival. Person: normal
    comparison. `tab-03` and `tab-05` are the same.
11. `shp-11` v1, amazon.com pipette tips, "Order lab supplies for the biology course". Rule: the
    classifier chose learning, so shopping is not aligned; 60 s locks. Person: the purchase.
12. `shp-06` v1, doordash cart, "Order pizza for the team lunch on Friday". Rule: lock at only 30 s
    on the cart page because dwell is summed per origin across pages (110 s on the menu counted).
    Person: finishing the order.
13. `vag-01` v0, a Google Doc, intent "work". Rule: no intent category, so nothing is aligned and the
    Doc locks at 120 s although `docs.google.com` is an allowed category. Person: obviously work.
14. `rab-09` v2, Pinterest "fractions activities", "Revise the lesson plan". Rule: social media
    blocked on arrival. Person: debatable; teachers gather ideas there (flagged for review).

Missed drifts (rule silent; a person would lock):

15. `soc-03` v2, the Facebook home feed while "Moderate the community Facebook group". Rule: the word
    facebook in the intent aligns the whole host, score 0. Person: the feed is not moderation.
    `soc-04` (Instagram explore) and `soc-14` (LinkedIn news) are the same.
16. `rab-14` v3, Wikipedia "Foucault pendulum in popular culture", lab report on pendulum motion.
    Rule: "pendulum" is in the URL, so aligned. Person: a pop-culture tangent.
17. `sea-02` v2, Google search "nba scores tonight" during the annual review. Rule: google.com is
    unlisted, 25 s, score 0.65, silent. Person: drift. All six off-topic searches are missed.
18. `tab-06` v3, reddit.com/r/funny for 15 s between spreadsheet visits. Rule: score 0.65, just under
    the threshold. Person: drift (and a justified grace period: flagged debatable).
19. `qck-05` v3, "who won the game last night" search during exam study. Rule: score 0.30. Person:
    brief personal drift. Flagged debatable, since a quick score check is arguably harmless.
20. `sea-14` v1 and v2, "cute puppy videos" search and its video tab while writing an abstract.
    Rule: 0.30 and 0.65. Person: drift. A search is where drift starts and the rules do not look at it.

## Not measured

The 5 s debounce, override cooldowns, the optional AI opinion and post-lock behaviour live in
`background.js` and are not replayed. The page title and text are in the data but unused by the
current rules (Workstream 2 uses them). Sequence timing is synthetic, and the arrival event is
assumed logged before the first check (the worker may read storage a moment earlier). Real
browsing will differ from synthetic data; the owner's own sessions are the real test.
