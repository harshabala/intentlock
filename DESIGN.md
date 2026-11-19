# IntentLock Design System

**Version:** 1.0 · Identity Lock (2026-11-19)  
**Authority:** Describes the design system for IntentLock. Canonical token source lives in `newtab.css`, `intervention.css`, and `checkin-prompt.js`.  
**Product:** Chrome MV3 extension — local-first intentional browsing enforcer, drift detector, and reflection threshold.

---

## 1. North Star & Identity

IntentLock is a **personal discipline instrument**, not a punitive parental control blocker and not a gamified productivity toy.

- **Dignity & Clarity:** When drift happens, acknowledge it calmly without shame, scolding, or visual hostility.
- **Friction with Agency:** Offer clear ways out (reflect & continue, close tab, pause, or end session) with explicit consequences.
- **Local-first & Ephemeral:** Sessions and statements belong solely to the user; transient page snippets are never stored.

**Recommended Design Direction (Agent Choice):** **Direction A: Terminal Discipline (Visualized Value Monochrome)**  
High-contrast Swiss/brutalist instrument: pure black (`#000000`) and pure white (`#ffffff`), 1px hairlines, 2px radius, monospace telemetry (IBM Plex Mono) with Source Serif 4 italic quotes for the user's vow/intent.

---

## 2. Design Directions Evaluated

We generated, evaluated, and screenshotted three distinct design directions across the three primary user moments:
1. Full-Screen Lock (Intervention)
2. Non-blocking Check-in Card ("Still on task?")
3. New Tab (Intent Declaration & Active Session)

Mockups and screenshots are stored in `docs/design/directions-preview.html` and `docs/design/screenshots/`.

| Direction | Mood & Aesthetic | Palette & Accents | Typography | Strengths / Trade-offs |
|---|---|---|---|---|
| **A: Terminal Discipline** *(Chosen)* | Strict high-density Swiss/brutalist instrument; monochrome precision. | Pure black `#000` / Pure white `#fff`; `.vv-hatch` texture. | IBM Plex Mono + Source Serif 4 | Zero distraction; authoritative; completely cohesive with existing MV3 bundle; passes all contrast tests at maximum ratio (21:1). |
| **B: Warm Obsidian** | Monastic contemplative sanctuary; calm notebook feel. | Obsidian charcoal `#121316`, ivory `#f4f3ef`, warm amber `#f59e0b`. | Source Serif 4 + System Mono | Low eye fatigue; gentle on late-night drift; but amber can dilute the urgency of a true drift intervention. |
| **C: The Shutter** | Industrial camera / optical instrument; technical HUD. | Matte slate `#0d0e11`, wireframe border `#334155`, safety orange `#ea580c`. | Technical Mono with corner crosshairs | Highly distinctive tactile feel; but higher visual noise and feels slightly more "developer tool" than personal discipline. |

---

## 3. Color Tokens (Direction A)

IntentLock uses an uncompromising dual-state palette:

### Dark Theme (Default)
| Token | Value | Role |
|---|---|---|
| `--bg` | `#000000` | Canvas and panel background |
| `--fg` | `#ffffff` | Primary text, titles, borders |
| `--muted` | `#a3a3a3` | Secondary metadata, durations, helpers |
| `--line` | `#ffffff` | 1px hairline wireframes and dividers |
| `--surface` | `#000000` | Floating card surface |
| `--focus-ring` | `#ffffff` | 2px solid offset outline |

### Light Theme
| Token | Value | Role |
|---|---|---|
| `--bg` | `#ffffff` | Canvas |
| `--fg` | `#000000` | Primary text and borders |
| `--muted` | `#666666` | Secondary text |
| `--line` | `#000000` | 1px border |
| `--surface` | `#ffffff` | Cards |

---

## 4. Typography

Dual-font editorial & technical pairing (both bundled locally as `.woff2` in `fonts/`):

| Role | Face | CSS Family | Use Case |
|---|---|---|---|
| **Telemetry & UI** | **IBM Plex Mono** | `"IBM Plex Mono", ui-monospace, "SF Mono", monospace` | Controls, buttons, countdown timers, tags, system messages, options |
| **Statement & Inscription** | **Source Serif 4** | `"Source Serif 4", Georgia, serif` | Headings, declaration headline, user intent quote (in italic) |

---

## 5. Shape, Space & Motion

- **Border Radius:** Ultra-tight `--radius: 2px`. Avoid rounded pill buttons or bubbly corners.
- **Wireframes:** Strict `1px solid var(--line)`.
- **Elevation:** Flat with pure border separation; floating cards (check-in) use `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4)`.
- **Motion:**
  - Standard transition: `160ms ease-out` (`opacity` and subtle `transform: translateY(4px)`).
  - Reduced motion (`prefers-reduced-motion: reduce`): Instantaneous 0ms swap (`animation: none !important; transition: none !important;`).
- **Touch Targets:** Minimum 44px height on all interactive elements.

---

## 6. The Three Core Moments

### 1. New Tab (Declare & Launch)
- Single prominent prompt: *"Declare your intent."*
- Auto-focused input line for frictionless entry.
- Optional duration budget (e.g. `[45 min]`).
- Single keystroke launch (`Enter` to Lock In).

### 2. Check-in Card ("Still on task?")
- Position: Bottom-right fixed HUD (`right: 16px; bottom: 16px; width: 340px`).
- Non-blocking: Host page remains scrollable and interactive; focus is not trapped.
- Clear 3-way triage:
  1. `[1] Yes, this is for my task` (aligns host/page for this session).
  2. `[2] Just a quick check` (2-minute temporary grace window).
  3. `[3] I drifted` (navigates back or closes tab).

### 3. Full-Screen Lock (Intervention)
- Fixed full-screen backdrop with faint `.vv-hatch` pattern.
- Centered 480px panel with hairline border.
- Displays the drift reason and the user's own intent as an italic serif quote.
- Requires deliberate action: Reflect & continue (with written prompt), Close tab, or End session.
