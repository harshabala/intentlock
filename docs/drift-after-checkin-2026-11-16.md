# Drift scores after the check-in and rule tightening, 2026-11-16

Same set and scorer as `drift-baseline-2026-11-16.md` (239 sequences, 892 visits, owner-accepted
labels). Reproduce: `npm run score:drift` (new decision) and `npm run score:drift -- --legacy`
(the original two-outcome rules).

## Result, balanced preset

| | Before (legacy) | After | Target |
| --- | --- | --- | --- |
| Wrong locks (lock on a legitimate page) | 159 / 728 = 21.8% | 0 / 728 = 0.0% | under 2% |
| Prompts on legitimate pages | not applicable | 55 / 728 = 7.6% | under 10% |
| Missed drifts (silent on a drift page) | 12 / 164 = 7.3% | 12 / 164 = 7.3% | under 10% |
| Drift pages: locked / prompted / silent | 152 / 0 / 12 | 36 / 116 / 12 | |

All three targets are met at balanced, on this set. Other presets (every sequence replayed):

| Preset | Wrong locks | Prompts on legitimate | Missed drifts |
| --- | --- | --- | --- |
| relaxed | 0 / 728 (0.0%) | 50 (6.9%) | 63 / 164 (38.4%) |
| balanced | 0 / 728 (0.0%) | 55 (7.6%) | 12 / 164 (7.3%) |
| strict | 0 / 728 (0.0%) | 55 (7.6%) | 11 / 164 (6.7%) |

As declared (each sequence at its own preset): wrong locks 0%; prompts 7.9% / 8.8% / 6.0% and missed
drifts 42.9% / 4.0% / 6.8% for relaxed / balanced / strict. **Relaxed does not meet the missed-drift
target**: it demotes social media and streaming to "warn", so they only prompt after a minute.

## What changed (`drift-decision.js`)

- Three outcomes. A lock needs clear drift: a user's custom block, a block-category site that is
  not also used for work (Netflix, Twitch, 9GAG...), or a return to a site the user already called
  a drift. YouTube, social sites, forums, searches, long stays on pages that never mention the task,
  vague intents and named-site feeds ask instead.
- Dwell is per page (since the last navigation to that origin), and dwell reports no longer count as
  new unrelated events or same-domain loads. Old rule: 60 s on a page already scored 0.65.
- Subdomains inherit a listed parent (`app.slack.com` follows `slack.com`).
- An intent that names a site aligns its pages, not its feed or home page.
- Page title and snippet are compared with the intent (stem tolerant); words that only name the
  site do not count. Off-topic searches ask. Sign-in hops are silent.
- Vague or unclassified intents never lock.
- Rapid tab switching no longer scores on its own (it caused 3 wrong locks and caught no drift the
  host rules missed).

## Caveats

- The rules were tuned on this same set; there is no held-out set, so expect real browsing to score
  worse. The set is synthetic and my page titles and snippets often contain topic words.
- The scorer simulates the user: a check-in on a legitimate page is answered "yes", on a drift page
  "I drifted". The global minimum gap and the "quick check" grace period are not modelled.
- 55 prompts on 728 legitimate visits is still roughly one in thirteen pages; the biggest sources
  are long reads on unlisted hosts with no topic words in the title, and unrelated-looking searches.
