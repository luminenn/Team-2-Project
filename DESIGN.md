# SONIQ Design System (dashboard extension)

The full source of truth for look, feel, and conventions is the login project's design system document. This file records what the dashboard adds on top of it. Read both before building new surfaces.

## Inherited from the login design system

- Next.js 15 App Router, React 19, TS strict, Tailwind v4 CSS-first tokens, shadcn structure, GSAP only (never framer-motion), next-themes with dark default, lucide-react.
- Hard rules: never Inter, never em dashes (U+2014), semantic tokens only, both themes tested, reduced motion respected, a11y required.
- Font: Plus Jakarta Sans only (font-sans). Headings copy the login page: font-semibold tracking-tight, 30/34px for page titles. Instrument Serif was removed on 2026-07-22 at the user's request to match the login screenshot; do not reintroduce it.
- The inversion trick for primary CTAs: bg-foreground text-background. Primary and secondary CTAs are pills (rounded-full, h-11), matching the login buttons.
- Glassy surfaces: bg-foreground/[0.04] with border-border; controls h-11; radius rounded-xl/2xl.
- Entrance motion: [data-reveal] + useReveal (GSAP, watchdog, reduced-motion safe). Press micro-interaction: pressable() from lib/motion.ts.
- Theme switch: View Transitions cross-fade (::view-transition-old/new(root), 350ms) so the fade is one composited animation instead of per-element color transitions; .theme-transition class crossfade is the fallback for browsers without startViewTransition, and heavy blurred layers carry data-theme-static for that path.

## Dashboard additions

### Status tokens (validated colorblind-safe against both surfaces)

Alignment statuses are triple-encoded everywhere: color + icon + label (see lib/status.ts).

| Token | Light | Dark |
|---|---|---|
| --status-exceptional | oklch(0.53 0.2 293) | oklch(0.62 0.17 293) |
| --status-aligned | oklch(0.5738 0.1194 156) | oklch(0.62 0.13 160) |
| --status-approaching | oklch(0.6 0.13 80) | oklch(0.67 0.12 88) |
| --status-incomplete | oklch(0.55 0.19 29) | oklch(0.55 0.19 28) |

Light approaching was deepened 0.66 to 0.60 L on 2026-07-22 so the flag icon clears 3:1 inside its tinted pill; hue and chroma unchanged, so CVD relationships hold, but re-run the CVD checker if it moves again. Dark incomplete was lightened 0.55 to 0.60 L on 2026-07-22 for the same reason (measured 2.85:1 to 3.39:1 for the flag icon on its rest pill; the incomplete flag pill hover was softened /0.22 to /0.18 so hover also clears 3:1). Incomplete stays the darkest of the four dark tokens (0.60 vs aligned/exceptional 0.62, approaching 0.67), preserving the lightness ordering CVD users rely on.

Rules: status colors carry marks (dots, segments, icons, ring) only; adjacent segments keep 2px gaps; labels stay in ink tokens (foreground / muted-foreground). Segment order in distribution bars: Exceptional, Aligned, Approaching, Incomplete. If you change any value, re-validate with a CVD checker against bg oklch(0.986 0 0) and oklch(0.1776 0 0).

### Scrim token

Modal backdrops use `backdrop:bg-scrim` (`--scrim`: black at 55% light / 65% dark). It is intentionally black in both themes; never hardcode backdrop colors.

### Grid backdrop

components/ui/grid-backdrop.tsx wraps components/ui/animated-grid-pattern.tsx (the 21st.dev AnimatedGridPattern with its framer-motion rect fades rewritten in GSAP). Fixed, -z-10, bg-background base; faint foreground grid lines (8%) with squares that glow to 10% foreground opacity (32 squares), skew-y-12, radial mask focused near the top. Theme-aware via currentColor. Reduced motion renders a static sprinkling of faint squares. This replaced the earlier aurora backdrop on 2026-07-22.

Performance rules for this layer: the wrapper carries `data-theme-static` (it must never participate in the .theme-transition universal crossfade; transitioning fill/stroke re-rasterizes the whole masked, skewed layer every frame) and `[contain:paint]`. Grid metrics are cached and refreshed via ResizeObserver; `place()` must never read layout (no getBoundingClientRect in mount loops or tween onRepeat callbacks; those are forced reflows of a full-page SVG).

### Elevation

Cards are solid `bg-card` at rest (never bg-card/NN alpha; alpha surfaces read flat and blend into the page). Resting and hover elevation come from two tokens defined in globals.css and applied as `shadow-[var(--shadow-card)]` / `hover:shadow-[var(--shadow-card-hover)]`:

- Light: soft key + ambient shadow (black at 4-9%).
- Dark: inset 1px top hairlight (white 5-7%) plus deep key + ambient (black 30-45%); depth in dark comes from the hairlight and shadow spread, not surface lightness jumps.

Hover backgrounds on solid cards use `color-mix(in oklab, var(--foreground) 3%, var(--card))` rather than alpha overlays.

### Motion vocabulary

- Entrance tweens (reveal, count-up, bar fill, ring draw) are guarded by `shouldSkipEntrance()` in lib/motion.ts: when `document.visibilityState === "hidden"` (background tab, headless capture) or reduced motion is on, they jump straight to the final state instead of animating. Never add an entrance tween without this guard; a stalled rAF ticker must never strand content at the tween's start value.
- Page/section entrance: data-reveal stagger (0.4s, power3.out, 50ms stagger).
- Progress/score bars carry a 1.6s watchdog that snaps to the final value if the GSAP ticker was throttled.
- Score numbers count up (useCountUp, watchdogged). Primary CTAs get a subtle magnetic pull (useMagnetic, max 5px). Course rows lift 2px with a deepening shadow on hover, and the score bar gets a one-time sheen sweep per pointer enter. The theme toggle icon spins in on switch. Accordion content crossfades with the grid-rows expansion.
- Progress bars: clip-path inset tween (never width).
- Count-up stats: gsap number tween with tabular-nums.
- Score ring: stroke-dashoffset draw.
- Accordions: grid-template-rows 0fr to 1fr, 300ms, motion-reduce:transition-none.
- Ambient: pulse-dot (size-2) for active pipeline stages, skeleton-shimmer for pending content. ProgressBar accepts `shimmer` and overlays the shimmer on the track for courses actively extracting/analyzing (never on Queued or finished bars).

### Attention hierarchy

The dashboard list is sorted by severity (Incomplete, then Approaching, then Aligned/Exceptional, then processing by progress) and rendered in three titled groups so the sort is legible: "Needs attention", "Aligned", "In the pipeline". Group headers are h2, normal case, 13px muted with a tabular count; empty groups are omitted. Never use uppercase tracked eyebrows for these.

Row weight encodes severity:

- Incomplete courses: surface tint `color-mix(in oklab, var(--status-incomplete) 6%, var(--card))` (9% on hover), full hairline border in status-incomplete/25-40 (full border, never a side stripe), and a 30px status-colored score. This is the only row tint; Approaching rows stay neutral and rely on the amber flag pill.
- Reported rows: 18px title, 26px ink score.
- Processing rows recede: compact padding (py-4), 16px title, reduced ink (foreground/75).

Only Incomplete courses get a colored score number (status-incomplete, large text so 3:1 suffices in dark). Flags render as tinted pills (incomplete tint when any standard is incomplete, approaching tint otherwise, quiet muted text at zero). Instructor names are never shown: the account holder is the professor who owns every course.

### Dashboard overview strip

Under the page title sits a dl/dt/dd stat strip (per the stat-strip rule, no hero-metric cards): Needs attention / Aligned / Analyzing counts with 8px status-dot marks (the analyzing dot pulses while anything is processing; zero-count dots go muted) and hairline dividers between items. Right of it, an aggregate DistributionBar (h-2.5, with legend) totals standards across all audited courses. Numbers count up via useCountUp. Labels stay in ink tokens; the dots and segments carry the color.

### Report header

The score ring on the report page renders at size 136, strokeWidth 8, 36px number (component defaults stay 116/7/30 for other contexts). The standards list is a solid bg-card container with `shadow-[var(--shadow-card)]`.

### Data display conventions

- Numbers in data contexts always tabular-nums.
- Stat strips are dl/dt/dd with dividers, not hero-metric cards.
- Findings always name module, page, and snippet; remediation shows copyable code where it exists.
- Bare numbers never reach the accessibility tree unlabeled: visible counts pair with sr-only units ("score 28 of 100", "6 standards", ", 2 courses"). `aria-label` never goes on a `<p>`/generic element (name-prohibited role; AT reads the text, not the label) — use per-value sr-only unit spans inside the visible content instead.
- `muted-foreground` data text (counts, units, metadata, control icons) stays at full token strength in light theme, never faded to /70 (which drops small text under 4.5:1 AA). Do not use `opacity-*` on a wrapper that contains text as a "recede" device — it fades the text too; recede via reduced-ink tokens (`text-foreground/75`) or muted color, not opacity. Page-title subtitles are the one sanctioned `text-foreground/70` use (dark ink at 70%, a higher-contrast token than muted-foreground, inherited from the login header).

### Pipeline failure and re-run loop

- `PipelineStage` includes terminal `Failed`; `Course.failedAtStage` + `Course.failureReason` record where and why. The stepper renders the X at failedAtStage; Failed is never a fifth step.
- Failure treatment uses `--destructive` (system error), never the status-incomplete rubric red: destructive icon chip on the row, destructive-tinted panel (color-mix 6% into card, full hairline border) on the pending page. Rubric tints stay reserved for rubric judgments.
- lib/course-store.ts is the client-side source of truth for pipeline state on top of the static data: `useCourses`/`useLiveCourse` to read, `retryAnalysis` and `requestRerun` to act. Client surfaces must read through it so retry/re-run reflect live.
- Every report header carries "Re-run analysis"; once requested it flips to an `aria-disabled` confirmation (not `disabled`, which would drop focus to body) and the dashboard row shows a pulse-dot "Re-analysis queued" chip. Retry buttons follow the h-11 control rule (not h-9); the dashboard retry moves focus to the row link before the row re-renders and announces via a `role="status"` region, since the button unmounts on click.

### Rows with secondary actions

Course rows use the stretched-link pattern: the wrapper div owns layout/card treatment, an absolute inset-0 link (`data-row-link`, z-1) makes the row clickable, and secondary interactive children (flag-pill deep links to `?status=...`, retry buttons) sit at z-2. Never nest interactive elements inside an anchor. Row focus ring comes from `has-[[data-row-link]:focus-visible]:ring-2` on the wrapper.

### Report triage layer

- `report.topIssue` renders as the "Start here:" line under the report header; flag icon color follows the flag-pill rule (incomplete red if any incomplete, else approaching).
- The header DistributionBar is interactive: segments and legend entries are `aria-pressed` filter buttons wired to `?status=`; clicking the active status clears to ALL. The dashboard aggregate bar stays `role="img"`.
- In the All-standards view the list is chunked by rubric section with quiet h3 subheaders (12px, normal case, counts with sr-only units).
- Expand all / Collapse all toggles controlled StandardCard accordions (open state lives in ReportView).
- Reviewer-facing audit metadata (videos checked, captions, hours saved) lives in a quiet line after the list and in the print footer, never in the header: the header speaks to the professor.

### Account settings dialog and account store

- components/settings-dialog.tsx opens from the ProfileMenu Settings item; there is no /settings route, the popup is the surface. Modal vocabulary is shared with ingest-dialog: native `<dialog>`, square bubble (rounded-2xl, solid bg-card, border-border, shadow-card-hover), `w-[min(92vw,520px)]`, internal scroll via `max-h-[min(88dvh,46rem)] overflow-y-auto`.
- Backdrop: `backdrop:bg-scrim backdrop:backdrop-blur-md` so the dashboard fully recedes behind modals; `dialog[open]::backdrop` fades in via the `backdrop-in` keyframe (disabled under reduced motion). Entrance is a GSAP scale/fade guarded by `shouldSkipEntrance()`; ingest-dialog carries the same treatment. Keep all modals on this vocabulary.
- lib/account-store.ts is a session-seeded overlay (course-store pattern): the auth session's name/email flow in as props through ProfileMenu, settings edits persist as overrides in localStorage (`soniq.account.v2`, namespaced per session email so accounts never share edits; a `storage` listener keeps tabs in sync and stored JSON is field-picked, never spread raw). Passwords never touch this layer; the password form is a validated mock until the real backend lands. Avatar uploads are canvas-downscaled to a 256px cover-cropped JPEG data URL (white-filled first: JPEG has no alpha, and transparency would flatten to black), guarded by a generation token so stale decodes never commit.
- Close discipline: closes route through a synchronous `closeDialog()` that calls `dialog.close()` and the parent `onClose` in the same tick. The dialog's queued `close` event can be deferred indefinitely in hidden tabs, so parent open-state must never depend on `onClose` alone (same class of hazard as the motion watchdogs). Esc/backdrop/X with unsaved edits swap in an inline discard-confirm strip: `role="group"` labelled by the question, both buttons `aria-describedby` it, focus moves to "Keep editing" on entry and parks on the Close button on dismissal (unmounting-control rule). Discard is a destructive-tinted pill (`bg-destructive/[0.08]`, destructive/40 hairline, text-destructive-ink), never a destructive fill: white-on-destructive fails AA at control text sizes.
- Form rules established here: visible labels always; validation on blur plus submit with focus moved to the first invalid field; errors render below the field as icon + text in `--destructive-ink`; save confirmations are `role="status"` check + text lines; pristine submit buttons use `aria-disabled` (never `disabled`) at 50% opacity; password fields get show/hide toggles and correct `autocomplete`; email/tel inputs set type and inputMode for mobile keyboards.
- `--destructive-ink` token pair exists because `--destructive` fails 4.5:1 as small text on card (3.87:1 in both themes, including as white-on-destructive button text). Ink values: light oklch(0.48 0.19 33) measures 7.2:1 on bg-card, dark oklch(0.72 0.16 33) measures 6.65:1; both sit at hue 33 with lightness clearly apart from --status-incomplete so the system-error red never mimics the rubric red. Use text-destructive-ink for error copy and destructive-tinted button text; `--destructive` stays for fills, icons, and borders. It is a system-error color, never a rubric color.

### Print document

components/report/print-report.tsx is the filed artifact: complete report, every standard expanded, professor-first order (Start here leads, audit metadata closes), chunked by section with `break-inside-avoid` per standard. It renders `hidden print:block`; all app chrome carries `print:hidden`. The `@media print` block in globals.css forces light tokens (kept in sync with :root by hand), sets `@page` margins, and applies `-webkit-print-color-adjust: exact` (plus the unprefixed form) to `*` — Chromium honors only the prefixed property, and without it tinted code blocks and background-only bullet dots drop out with "Background graphics" off. Status marks in print always sit next to their text label.

### Auth and the sign-in surface (merged from the login project, 2026-07-22)

- NextAuth v5 (JWT sessions) with the credentials demo user in lib/users.ts plus optional Google / Microsoft OAuth (buttons stay inert with a note until keys land in .env.local). `middleware.ts` protects `/dashboard/:path*`; `/` is the sign-in page and redirects to `/dashboard` when a session exists. Demo account: demo@soniq.app / password123 (env-overridable); `AUTH_SECRET` lives in .env.local.
- The sign-in page is the login project's AuthCard + AuroraBackground ported verbatim: the aurora palette variables, `--animate-aurora`, and its keyframes live in globals.css, and the aurora layer keeps `data-theme-static` (the exclusion selector covers pseudo-elements, which the aurora uses heavily).
- The dashboard layout reads the session server-side and passes name/email to ProfileMenu, so the header identity is always the signed-in user. Sign out calls `signOut({ redirectTo: "/" })` from next-auth/react with an `aria-disabled` "Signing out…" spinner state (never `disabled`, per the re-run button rule).
