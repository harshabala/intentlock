# Held-out result, 2026-11-17

The rules in `drift-decision.js` were tuned on `tests/drift-set/` (239 sequences). This is the first
and only scoring of `tests/drift-set-heldout/` (114 sequences, 367 visits, 304 legitimate and 63
drift visits) which was written and committed (2ddbef5) before it was scored. No rule was changed
for this result. Labels: agent, `review: pending-owner`. Reproduce:
`npm run score:drift -- --set heldout` (add `--legacy` for the old rules).

## Three outcomes side by side (every sequence replayed at each preset)

| Preset | Set | Wrong locks | Prompts on legitimate pages | Missed drifts |
| --- | --- | --- | --- | --- |
| relaxed | tuning | 0 / 728 (0.0%) | 50 (6.9%) | 63 / 164 (38.4%) |
| relaxed | held-out | 0 / 304 (0.0%) | 28 (9.2%) | 26 / 63 (41.3%) |
| balanced | tuning | 0 / 728 (0.0%) | 55 (7.6%) | 12 / 164 (7.3%) |
| balanced | held-out | 0 / 304 (0.0%) | 40 (13.2%) | 16 / 63 (25.4%) |
| strict | tuning | 0 / 728 (0.0%) | 55 (7.6%) | 11 / 164 (6.7%) |
| strict | held-out | 4 / 304 (1.3%) | 36 (11.8%) | 16 / 63 (25.4%) |

Old two-outcome rules on the held-out set: balanced wrong locks 79 / 304 (26.0%), missed drifts
15 / 63 (23.8%); on the tuning set 21.8% and 7.3%.

## Are the targets met on the held-out set? (balanced: wrong locks under 2%, prompts under 10%, missed under 10%)

- Wrong locks: **met** (0.0%; strict 1.3%, also under 2%).
- Prompts on legitimate pages: **not met** (13.2%).
- Missed drifts: **not met** (25.4%). The tuning-set figure of 7.3% did not carry over.

So the tuning-set result was optimistic. The strongest claim that holds on unseen data is that
inferred wrong locks are gone; the extra prompts and the missed drifts are real and larger.

## Why (balanced, held-out)

Missed drifts (16): 6 on vague or unclassified intents, three of them non-English intents the
keyword classifier cannot read, so only block-category sites ask; 6 where the page looked aligned
(a feed or forum on a host the intent names, or a title word that matched); 3 short Wikipedia
tangents with neutral hosts below the dwell threshold; 1 after a "yes" on the same site.
Prompts on legitimate pages (40): 17 are the long-stay rule on unlisted hosts whose titles lack the
intent's words (the case the held-out set was built to include), 7 the watched-category rule, 7
vague intents, 6 work-capable sites (social and video), 2 searches, 1 a named-site feed.
Strict wrong locks (4): Stack Overflow, Stack Exchange and Apple developer forums locked at strict
because the classifier did not label those intents "coding" or "learning", so the technical Q&A
exception did not apply.

## Caveats

Synthetic, agent-labelled, 63 drift visits only (each missed drift is 1.6 points). About 20 generic
home-page URLs occur in both sets. Presets are compared on the same visits, so the relaxed and
strict columns are not independent samples.
