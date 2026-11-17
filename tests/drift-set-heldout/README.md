# Held-out drift set

**labelled_by: agent, review: pending-owner.** 114 sequences written on 2026-11-17 AFTER the
decision rules were tuned on `tests/drift-set/`, and committed before they were ever scored.
Do not tune rules against this set; if a rule changes later, report both sets.

Same format and labelling rules as `tests/drift-set/README.md`. Deliberately different from the
tuning set: new intents, sites and titles; many titles with no word of the intent; real-world noise
(cookie and consent pages, link redirects, new-tab and about:blank pages, sign-in and MFA loops,
PDFs, localhost, router and NAS hosts, intranet hosts, non-English intents and titles in Spanish,
German, Japanese and French). Common hosts (YouTube, Reddit, Google Docs, GitHub, Wikipedia) still
appear, as they would in any real browsing.

Score once: `npm run score:drift -- --set heldout`. Result: `docs/drift-heldout-2026-11-17.md`.

About 20 of the 367 visits are generic home-page URLs that also occur in the tuning set (for example youtube.com, reddit r/all, x.com/home); every sequence, intent and almost every title is new.
