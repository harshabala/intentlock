# Architecture (summary)

Full detail lives in [`docs/architecture.md`](docs/architecture.md); storage layout in
[`docs/storage-schema.md`](docs/storage-schema.md); heuristics in [`docs/heuristic-policy.md`](docs/heuristic-policy.md).

## Components

| Piece | Files | Role |
| --- | --- | --- |
| Service worker | `background.js` | Owns session state, drift pipeline, alarms, history retention. Terminated when idle; state is restored from `storage.local` and alarms on wake. |
| Content scripts | `page-tracker.js`, `intervention-overlay.js`, `content.js` | Report dwell, render the lock overlay. Untrusted page context: they can only send an allowlisted set of messages. |
| Extension pages | `newtab`, `popup`, `options`, `history`, `analytics`, `diagnostics`, `intervention` | UI. Only these may mutate session or settings state. |
| Drift logic | `heuristic-policy.js`, `drift.js`, `drift-cache.js` | Local rules decide locks; optional LLM verdict is a second opinion. |
| LLM | `providers.js`, `llm.js`, `llm-backoff.js` | Calls only the user-selected provider with minimized context. |
| Storage | `storage-authority.js`, `storage-client.js`, `storage-queue.js`, `privacy-utils.js` | Epoch-guarded serialized writes, sanitization, redaction. |
| Diagnostics | `error-log.js`, `diagnostics.*` | Local, redacted, bounded error log with manual copy/export. |

## Trust boundaries

page -> content script -> (allowlisted messages, sender.tab required) -> service worker -> `storage.local` (state) / `storage.session` (API key) -> optional HTTPS call to the chosen LLM provider.

## Legacy snapshot

`legacy-extension-source/` is an old v1.4.1 copy of the extension kept for history only. It is not
loaded, packaged, linted or tested. See `docs/PRODUCTION_READINESS.md` (Blocked on owner) for the removal proposal.
