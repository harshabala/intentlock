# Contributing

IntentLock is a no-build Chrome MV3 extension. See `docs/development.md` for loading it unpacked
and `ARCHITECTURE.md` for the process model.

## Setup

```bash
npm ci
```

## Checks (run before opening a PR)

```bash
npm run lint            # ESLint
npm test                # unit + integration (node:test)
npm run verify:static   # manifest, CSP, runtime references
npm run audit:prod      # npm audit
npm run package -- --output /tmp/IntentLock-check.zip   # deterministic release zip
npm run test:browser    # optional: real Chromium journeys (needs npx playwright install chromium)
```

`npm run check` runs lint, tests, static verification and version validation together.

## Rules

- Keep behavior backward compatible; do not add telemetry or new outbound network calls.
- A new permission or host pattern needs a justification in `store/LISTING.md`,
  `docs/privacy-policy.md` and the README Permissions section.
- Never store the API key outside `chrome.storage.session`, and never log it.
- New files that must ship go in `RUNTIME_FILES` in `scripts/package-release.mjs`.
- No personal paths, emails or secrets in committed files.

## Releasing (maintainer only)

1. Bump `version` in `manifest.json` (and `package.json` if desired); move `CHANGELOG.md`
   `[Unreleased]` entries under the new version heading.
2. `npm run check` and `npm run package`.
3. Merge to `main`, then the maintainer tags `vX.Y.Z`; the Release workflow validates the tag against
   the manifest and attaches the zip. Chrome Web Store submission is a manual step using `store/LISTING.md`.
