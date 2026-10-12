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

| # | Dimension | Before | After | What changed / what still caps it |
|---|-----------|--------|-------|-----------------------------------|
| 1 | Build and run | 8 | 9 | `npm run check` (lint, tests, static, version). Not verified on Node 18 locally. |
| 2 | Tests | 8 | 8 | +7 store-readiness tests (368 pass). Playwright journeys not run in this pass; no coverage measurement. |
| 3 | Static quality | 3 | 6 | ESLint 10 clean (0 errors, 0 warnings), CI-enforced. No formatter or type checking (would require a repo-wide reformat or TS migration). |
| 4 | Security | 8 | 9 | SECURITY.md, audit in CI, permission/CSP tests tied to the listing. Capped: no third-party review. |
| 5 | Reliability | 8 | 8 | Unchanged; already strong. Lifecycle browser tests need a run on the owner's machine/CI. |
| 6 | Config and packaging | 7 | 8 | Zip contents checked in CI and tests. Capped: no screenshots, changelog still Unreleased. |
| 7 | CI | 6 | 7 | Lint and audit job added. Cannot be verified remotely (Actions billing failure). |
| 8 | Docs | 7 | 9 | SECURITY, CONTRIBUTING, ARCHITECTURE, release steps. |
| 9 | UX / a11y / perf | 7 | 7 | Not changed; no measured contrast or idle-CPU results. |
| 10 | Operability | 8 | 8 | Unchanged. |

## Verification (local)

`npm run lint`, `npm test` (368 pass), `npm run verify:static` (74 pass), `npm audit` (0 vulnerabilities),
`npm run package` (44-file zip, no legacy/docs/tests/env entries), `npm run validate:version`.

## Branches and legacy code (not deleted)

- `feat/post-merge-remediation` (32 unmerged commits) and `gh-pages` are untouched; review before any cleanup.
- `legacy-extension-source/` is an old v1.4.1 copy of the extension. Nothing references it, it is not
  packaged, linted or tested (ESLint ignores it), and the current source has superseded it. It is dead code.

## Blocked on owner

1. Capture the five 1280x800 Web Store screenshots listed in `store/screenshots/README.md`.
2. Submit to the Chrome Web Store, tag `vX.Y.Z` and cut the release (intentionally not done).
3. Fix GitHub Actions billing so the new quality job and existing workflows can run; re-verify.
4. Decide on removing `legacy-extension-source/` (proposal: `git rm -r`; history keeps it) and on the
   32-commit `feat/post-merge-remediation` and `gh-pages` branches.
5. Run `npm run test:browser` (needs `npx playwright install chromium`) and the manual acceptance checklist.
6. Optional: adopt Prettier/TypeScript checking (large diff), enable GitHub private vulnerability reporting
   (SECURITY.md assumes it), measure contrast and idle CPU.
