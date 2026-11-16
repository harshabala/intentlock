# Labelled drift set

**labelled_by: agent, review: accepted-by-owner-2026-11-16.** On 2026-11-16 the owner accepted the labels as they stand ("In the labels, I'm good"), without a case-by-case review; the debatable cases listed below remain open to correction.

Original note: Every label here is an agent's proposal. Nothing in
this folder encodes the owner's judgement yet, so the baseline numbers are provisional until the
owner reviews the labels (north-star workstream 1). Do not tune rules against them before that.

## Format

One JSON file per scenario category. Each file has `labelled_by`, `review`, `schema_version`,
`category` and `sequences[]`. A sequence has `id`, `category`, `intent`, `strictness`
(`relaxed|balanced|strict`) and `visits[]`; optional `debatable[]` is `{visit, reason}`.
A visit has `url`, `title`, `text` (synthetic page-text snippet), `dwell_s` (active seconds on the
page), `t_s` (arrival, seconds from session start), `via` (`load` or `tab-switch`), `label`
(`serves-intent` or `drift`) and an optional `note`.
All sites are generic public sites; page text, titles and company hostnames (`*.example`,
`acme`) are synthetic. Nothing here is real browsing history.

## Labelling rules applied

1. A label is about the page's **purpose relative to the stated intent**, not about the site,
   the preset or how long the user stayed. Labels are preset-independent; `strictness` only says
   which preset the sequence is replayed at "as declared". The scorer also replays every sequence
   at all three presets.
2. A page that is a means to the task is `serves-intent`: docs, Q&A, a search for the task, a
   reference video, a forum thread about the task, a price lookup for a work purchase.
3. Sign-in, SSO, MFA and account-chooser pages are `serves-intent` when they lead to an on-intent
   destination; a login to an off-intent site is `drift`.
4. Brief checks that serve the task (calendar, translate, dictionary, maps, converters) are
   `serves-intent`. A short glance at something unrelated (a score, the weather, a feed) is
   `drift` by purpose, and is flagged debatable.
5. Same host, different purpose (LinkedIn messages vs. the news feed, company X account vs. personal
   timeline) is labelled by purpose; URL-only rules cannot see this.
6. For an entertainment intent ("relax and watch"), entertainment sites are `serves-intent`.
7. Vague intents ("work", "stuff") label obvious entertainment as `drift` and everything
   plausibly work-like as `serves-intent`.
8. Page text and title exist for the owner to judge and for future rules; the current rules read
   only the URL (and, for history, origins), so the baseline does not use them.

## What the scorer replays

`npm run score:drift` builds the policy as the new tab does (`mergePolicyWithIntent`), logs each
visit as `PAGE_LOAD` or `TAB_SWITCH` through `minimizeSessionEvent` (origins only, as stored), runs
`evaluatePolicyDrift` on arrival and again at every 30 s dwell report plus the final partial report
(page-tracker's interval). A visit counts as locked if any of those checks locks. Not modelled
(they live in `background.js`): the 5 s debounce, override cooldowns, the optional AI opinion and
what happens after a lock. Assumption: the arrival event is logged before the check runs.

## The 30 most debatable cases (review these first)

Chosen from the 57 flagged cases, ordered by how many of the three presets the rules disagree
with the proposed label. Changing a label here changes the baseline the most.

2. `cod-07` visit 1 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Review the database migration pull request"; www.postgresql.org/docs/current/sql-createindex.html. Long dwell on unlisted-host docs; the URL shares no word with the intent.
3. `qck-05` visit 3 (labelled `drift`; rules disagree at 3/3 presets) - intent "Study for the biology midterm"; www.google.com/search?q=who+won+the+game+last+night. A 14-second score check: a brief personal glance, perhaps harmless.
4. `rab-04` visit 1 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Prepare the keynote outline"; www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action. Speaking inspiration for a keynote; TED is not in any list.
5. `rab-09` visit 2 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Revise the lesson plan for tomorrow's class"; www.pinterest.com/search/pins/?q=fractions%20activities. Teachers do gather ideas on Pinterest.
6. `rab-14` visit 3 (labelled `drift`; rules disagree at 3/3 presets) - intent "Write a lab report on pendulum motion"; en.wikipedia.org/wiki/Foucault_pendulum_in_popular_culture. A pendulum-related Wikipedia page, but about pop culture; 100s of dwell.
7. `res-07` visit 3 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Explore ideas for a community garden proposal"; www.youtube.com/watch?v=HGdN4PqRsAB. Opaque video URL; content is on topic.
8. `res-10` visit 2 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Learn how transformers work in machine learning"; www.youtube.com/watch?v=kCc8FmEb1nY. Lecture video, opaque URL, 30 minutes of dwell.
9. `soc-14` visit 2 (labelled `drift`; rules disagree at 3/3 presets) - intent "Reconnect with my mentor, send a message on LinkedIn"; www.linkedin.com/feed/news/. LinkedIn news is on the same host as the task.
10. `unl-05` visit 3 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Write unit tests for the cart service"; martinfowler.com/articles/mocksArentStubs.html. Long essay on testing, unlisted host, nothing in the URL.
11. `unl-09` visit 2 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Prepare for the AWS solutions architect exam"; explore.skillbuilder.aws/learn. Skill Builder, long dwell, nothing in URL matches the intent words.
12. `vid-06` visit 1 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Write the product demo script"; www.youtube.com/watch?v=C0mpet1t0r. Competitor demo video for script research; opaque URL.
13. `wrc-06` visit 3 (labelled `serves-intent`; rules disagree at 3/3 presets) - intent "Compose the music for the short film"; open.spotify.com/playlist/Cinematic. Reference listening for composition on a streaming site not in any list.
14. `res-03` visit 4 (labelled `serves-intent`; rules disagree at 2/3 presets) - intent "Research how other apps handle onboarding for the redesign"; news.ycombinator.com/item?id=39000000. Hacker News thread on the topic, same issue.
15. `res-19` visit 4 (labelled `serves-intent`; rules disagree at 2/3 presets) - intent "Find three academic sources on remote work productivity"; news.ycombinator.com/item?id=38999999. Discussion thread of the study itself; not a source for the paper.
16. `shp-09` visit 1 (labelled `serves-intent`; rules disagree at 2/3 presets) - intent "Finish the grant budget spreadsheet"; www.amazon.com/dp/B0LAPTOP002. A price lookup that serves a budget line, but the intent says nothing of buying.
17. `shp-09` visit 2 (labelled `serves-intent`; rules disagree at 2/3 presets) - intent "Finish the grant budget spreadsheet"; www.bhphotovideo.com/c/product/1234-REG/field_recorder.html. Price lookup for the grant budget; shopping domain, no keyword overlap.
18. `shp-14` visit 1 (labelled `serves-intent`; rules disagree at 2/3 presets) - intent "Prepare the annual budget and procurement list"; www.amazon.com/dp/B0DESK00001. Pricing office furniture for a procurement list.
19. `tab-06` visit 1 (labelled `drift`; rules disagree at 1/3 presets) - intent "Work on the quarterly report"; x.com/home. Short glances at social between work: drift by page, but only seconds.
20. `drf-13` visit 1 (labelled `drift`; rules disagree at 1/3 presets) - intent "Prepare tomorrow's sales call talking points"; www.cnn.com/. News is a warn category, not block; a person would call it drift only if unrelated to sales.
21. `rab-03` visit 2 (labelled `drift`; rules disagree at 1/3 presets) - intent "Write the introduction for my literature review"; www.reddit.com/r/AcademicPsychology/. Academic forum could inform the review; forum category.
22. `cod-11` visit 1 (labelled `serves-intent`; rules disagree at 0/3 presets) - intent "Fix the memory leak in the image resizing worker"; nodejs.org/en/learn/diagnostics/memory. Long dwell on Node.js docs, host unlisted and the URL has no intent word.
23. `ent-07` visit 2 (labelled `drift`; rules disagree at 0/3 presets) - intent "Spend my break scrolling and having fun"; docs.google.com/spreadsheets/d/1WorkSheet/edit. Intent is leisure; work is not on-intent but this is hardly a harmful lock.
24. `hlt-02` visit 3 (labelled `serves-intent`; rules disagree at 0/3 presets) - intent "Plan my workout and meal prep for the week"; www.instagram.com/mealprepking/. Fitness influencer account for meal ideas.
25. `job-02` visit 4 (labelled `serves-intent`; rules disagree at 0/3 presets) - intent "Prepare for the interview at Acme next Tuesday"; www.levels.fyi/companies/acme/salaries. Salary research before an interview: relevant job-search prep; unlisted host.
26. `job-05` visit 2 (labelled `serves-intent`; rules disagree at 0/3 presets) - intent "Research salary expectations for a data engineer role"; www.reddit.com/r/dataengineering/comments/1sal/salary_thread_2026/. Forum thread with salary data: relevant, forum category.
27. `job-06` visit 3 (labelled `drift`; rules disagree at 0/3 presets) - intent "Update my portfolio site and apply to design roles"; dribbble.com/shots/popular. Browsing popular shots on a design site: inspiration or procrastination.
28. `lng-10` visit 1 (labelled `serves-intent`; rules disagree at 0/3 presets) - intent "Read the long-form article assigned for my media class"; www.theatlantic.com/magazine/archive/2024/05/attention-span-media/6780. Second long read on The Atlantic: assigned or not, unknown from the intent.
29. `drf-15` visit 1 (labelled `drift`; rules disagree at 0/3 presets) - intent "Write the monthly status email to investors"; www.reddit.com/r/startups/. Startup subreddit can inform an investor update; in forums category, so rules call it drift. Could be research.
30. `drf-22` visit 1 (labelled `drift`; rules disagree at 0/3 presets) - intent "Respond to the customer support backlog in Zendesk"; www.youtube.com/watch?v=PqRsTuVwXyZ. Background music in a video tab is a common work habit; the rules treat it as video drift.

