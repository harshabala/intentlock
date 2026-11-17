# Round 2: relaxed preset and drift after a "yes", 2026-11-17

Rules changed in `drift-decision.js` (coordinator decisions, not owner approvals). Both sets reported.
Reproduce: `npm run score:drift` (tuning) and `npm run score:drift -- --set heldout`.
I had already read the held-out failure breakdown (`drift-heldout-2026-11-17.md`) before making these
changes; the changes follow the coordinator's spec and the tuning set's rabbit-hole misses, but the
held-out set is no longer untouched by my knowledge of it.

## Changes
1. Relaxed: on social, streaming, short-video, meme, gaming and gambling sites a check-in appears after a
   30 second stay (balanced and strict keep 60 s). At relaxed no inferred outcome locks: a would-be lock
   becomes a check-in. A custom block still locks. After "I drifted" on a site, relaxed asks once more
   after 3 minutes instead of locking.
2. After a "yes" on a host, a later page whose title and snippet share no word with the intent, after a
   45 second stay and 3 minutes after the answer, earns one further check-in (kind `moved_on`). Pages
   that match the intent by URL, title or snippet, allow-category hosts, and hosts that already had their
   further ask stay silent. The worker stores the further-ask state on the session (`sites[].reasked`).

## Numbers (every sequence replayed; wrong locks / prompts on legitimate pages / missed drifts)

| Preset | Set | Before | After |
| --- | --- | --- | --- |
| relaxed | tuning | 0.0% / 6.9% / 38.4% | 0.0% / 7.0% / 39.6% |
| relaxed | held-out | 0.0% / 9.2% / 41.3% | 0.0% / 9.9% / 42.9% |
| balanced | tuning | 0.0% / 7.6% / 7.3% | 0.0% / 7.7% / 5.5% |
| balanced | held-out | 0.0% / 13.2% / 25.4% | 0.0% / 13.8% / 25.4% |
| strict | tuning | 0.0% / 7.6% / 6.7% | 0.0% / 7.7% / 4.9% |
| strict | held-out | 1.3% / 11.8% / 25.4% | 1.3% / 12.5% / 25.4% |

Rabbit-hole drift (balanced) missed: tuning 12/42 (28.6%) to 4/42 (9.5%); held-out 5/12 (41.7%) unchanged,
because its misses are vague intents and short Wikipedia tangents, not drift after a "yes".

## Honest reading
- Relaxed was not silent before (watched sites already asked after 60 s); the 30 s threshold adds almost
  nothing measurable, and relaxed missed drifts went up slightly because inferred locks no longer happen.
  Most relaxed misses are reddit, Hacker News, Amazon and ESPN, which the relaxed preset sets to allow, so
  they are a preset-policy choice, not a rule gap. Relaxed does not meet the 10% missed-drift target.
- The drift-after-yes gain shows on the tuning set only; the held-out set did not move.
- Held-out balanced still misses both targets (prompts 13.8%, missed drifts 25.4%).
