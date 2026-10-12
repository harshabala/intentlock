# Production readiness

Audit date: 2026-10-12. Scores are 0-10; 10 only if verifiably complete. Nothing here has been
submitted to the Chrome Web Store; the Web Store listing, screenshots and publishing remain owner actions.

## Baseline (before this pass)

| # | Dimension | Score | Evidence / gap |
|---|-----------|-------|----------------|
| 1 | Build and run reproducible | 8 | No build step; `package-lock.json`, deterministic zip script. No single `check` command. |
| 2 | Tests | 8 | 361 node tests (drift, heuristics, privacy, lifecycle, storage) plus Playwright journeys. No store/manifest consistency test. |
| 3 | Static quality | 3 | No ESLint, Prettier or type checking. |
| 4 | Security | 8 | Session-only API key, tight CSP, sender-validated messaging, 0 audit findings, no secrets found. Gap: no SECURITY.md, audit not in CI. |
| 5 | Reliability | 8 | Epoch-guarded storage, alarms, retention pruning, malformed-storage tests. Browser lifecycle tests exist but were not run in this audit. |
| 6 | Config and packaging | 7 | Explicit-allowlist zip, version validation, CHANGELOG, listing text. Screenshots missing (human capture required); Unreleased changelog not versioned. |
| 7 | CI | 6 | test.yml (Node 18/20/22 + browser), release.yml, pages.yml. No lint, no audit. Actions currently failing account-wide (billing), so unverified remotely. |
| 8 | Docs | 7 | README, AGENTS.md, docs/architecture.md, privacy policy and page. Missing SECURITY.md, CONTRIBUTING.md, root ARCHITECTURE.md. |
| 9 | UX / accessibility / performance | 7 | ARIA roles, focus outlines, labelled controls present. No documented contrast or idle-CPU measurement. |
| 10 | Operability | 8 | Local redacted error log, diagnostics page with copy/clear. No documented diagnostics privacy guarantees. |

Other findings: personal-data scan of tracked files found none (only fake test keys); stray untracked
macOS duplicates ("name 2.ext") existed in the local clone and are now ignored via `.gitignore`.

## After (this pass)

See the table below, updated at the end of the pass.
