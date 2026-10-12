# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's
**Security > Report a vulnerability** (private advisory) on this repository.
Do not open a public issue with exploit details, and never include a real API key in a report.

You can expect an acknowledgement, a fix or mitigation plan, and credit if you want it.
This is a single-maintainer project, so response times are best effort.

## Supported versions

Only the latest release on `main` is supported.

## Security model

- **Permissions (least privilege):** `tabs`, `storage`, `idle`, `tabGroups`, `alarms`, plus
  `http://*/*` and `https://*/*` host access. Each is justified in `store/LISTING.md` and a test
  (`tests/store-readiness.test.mjs`) fails if the manifest and the listing drift apart.
  Host access is required because the drift overlay is injected into whatever page the user is on.
- **CSP:** extension pages use `script-src 'self'; object-src 'self'`. No remote code, no inline
  script, no `eval`.
- **API key:** stored only in `chrome.storage.session` (cleared when the browser closes, never
  written to `storage.local`, never synced). If session storage is unavailable the key cannot be
  saved and AI checks stay off. The key is removed when the provider or endpoint changes, so it is
  never sent to a destination the user did not choose. It is only sent to the provider the user selected.
- **Logging:** error logs and the diagnostics export pass through `redactSecrets`; page titles,
  paths, queries and fragments are never stored. Logs stay on the device.
- **Message passing:** the service worker accepts only known message types, rejects senders with
  another extension id, restricts content scripts to a small allowlist
  (`CONTENT_EVENT`, `GET_INTERVENTION_STATE`, `INTERVENTION_TRANSITION`, `LOG_ERROR`),
  and requires a storage epoch on every mutation so stale writers cannot resurrect deleted data.
- **No telemetry:** the only outbound requests are LLM calls to the provider the user configured.

## Dependencies

The extension has no runtime dependencies. Dev dependencies (Playwright, ESLint) are pinned
exactly; `npm run audit:prod` runs `npm audit` and CI runs it on every push.

## Secrets hygiene

Never commit keys, tokens, `.env` files, personal paths or browser profiles.
Tests use obviously fake keys only.
