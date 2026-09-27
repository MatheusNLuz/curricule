# Curriculy UI/UX Redesign

**Status:** Direction approved; implementation pending user review of this specification.

## Product and scope

Curriculy is a general-purpose application for people looking for work. It adapts resume, profile, and application guidance to the candidate's history and target opportunity instead of assuming a technology-specific audience.

This phase redesigns the interface and user experience only. Existing analysis, optimization, PDF, AI, database, and application workflows remain behaviorally unchanged. The only backend exception is replacing the current custom authentication flow with Neon Auth.

## Experience thesis

Curriculy turns a stressful application process into a visible route: the user can see where their profile stands, what needs attention, and what the next useful action is.

The product should feel like a calm professional workspace with a distinct point of view, not a generic AI dashboard or a collection of decorative cards.

## Visual world: Plum Garden

The visual world combines a professional route system with the calmer, more human character of an editorial garden: clear paths, deliberate waypoints, and small areas of color that signal progress without overwhelming the document work.

### Palette

Light mode:

- Background: `#F7F3F8`
- Surface: `#FFFFFF`
- Ink: `#281D33`
- Primary plum: `#6C4AA3`
- Signal rose: `#C65C7E`
- Route sage: `#9ABD7D`
- Muted text: `#766D7C`
- Line: `#E3DCE7`
- Soft primary surface: `#EEE8F6`

Dark mode:

- Background: `#17111D`
- Surface: `#251B2E`
- Ink: `#F6F0FA`
- Primary lavender: `#B79AF4`
- Signal pink: `#F184A5`
- Route mint: `#BEE58F`
- Muted text: `#B8AFC0`
- Line: `#3B2D49`
- Soft primary surface: `#35264A`

Color rules:

- Plum is the main action and identity color.
- Sage/mint marks progress, completion, and the next waypoint.
- Rose/pink marks attention, warnings, and important moments.
- Color is always paired with text, position, or iconography; meaning never depends on color alone.
- Both themes use the same semantic token names and hierarchy.

### Typography and composition

- Use a distinctive display face for brand headings and a highly legible sans-serif for interface text.
- Keep headings compact and purposeful; avoid oversized marketing headlines inside operational screens.
- Prefer open layouts, route lines, sections, and quiet separators over repetitive bordered cards.
- Use bounded surfaces only for actual interactive fields, summaries, or selected choices.
- Keep dense content readable at 320px and above.

## Signature interaction

The route line is the recurring Curriculy motif. It appears in onboarding/new analysis, analysis progress, and optimization states as a semantic sequence of stages. It is not a decorative progress bar: each waypoint names a real product state and points to the next action.

ReactBits should be used sparingly for moments that clarify this route:

- a restrained entrance/reveal for the first meaningful screen;
- a focused spotlight or hover treatment for the active route/action;
- a purposeful transition between analysis states where it does not delay content.

Avoid particle backgrounds, perpetual motion, noisy text effects, and animation that resembles an AI demo.

## Icon system

HugeIcons becomes the single UI icon family. Replace Lucide usage in application UI with a small shared icon wrapper so stroke weight, size, color, and accessibility stay consistent. Icon-only controls must have accessible labels; decorative icons must be hidden from assistive technology.

## Surface plan

### App shell

- Rename visible ATSForge references to Curriculy.
- Desktop: compact left navigation with brand, primary destinations, and account controls.
- Mobile: compact top bar plus a bottom or drawer navigation pattern that does not consume the main task area.
- Make theme switching available without changing the existing product behavior.
- Keep toast, error, loading, and not-found states in the same visual language.

### Home

- Replace the uniform mode-card grid with one clear invitation and a route-oriented set of choices.
- Explain modes in general career language: optimize profile, compare with a vacancy, prepare materials, improve LinkedIn, and write a cover letter.
- Preserve all existing mode links and query parameters.
- Make the primary action reachable with one thumb on mobile.

### Login and registration

- Replace the current form presentation with a focused, trustworthy auth surface.
- Preserve all existing fields and error handling semantics.
- Integrate Neon Auth at this boundary only; the rest of the application keeps consuming its existing session contract until the migration adapter is complete.
- Provide mobile-first spacing, visible focus, password affordances, and clear recovery/error states.

### New analysis

- Present the input, vacancy context, location, and language as a progressive route rather than a long unstructured form.
- Keep PDF upload and paste as equal first-class choices.
- Preserve all existing validation rules and request payloads.
- On mobile, stack sections and keep the continue action visible after the relevant fields.

### History and settings

- History should read as a calm list of journeys with status and score context, not a dense admin table.
- Settings should make account and appearance settings clear; existing AI-key behavior is not expanded in this phase.
- Use empty states that explain the next useful action.

### Analysis dashboard

- Keep the score, ATS issues, warnings, strengths, weaknesses, comparison, and CTA content intact.
- Reorganize information into a clear sequence: current state, highest-impact findings, evidence, next action.
- Make score panels and long lists readable on narrow screens without horizontal clipping.
- Keep LinkedIn and cover-letter variants within the same shell while preserving their specialized content.

### Editor, preview, and export

- Treat the editor as a focused workspace: content first, actions second, persistent save/continue affordance on mobile.
- Keep the preview visually quiet and document-led.
- Preserve template selection, PDF export, cover-letter generation, and manual-save behavior.
- Avoid changing the generated document structure or export endpoint behavior.

## Responsive behavior

- Supported baseline: 320px, 360px, 390px, 768px, and desktop widths.
- No page-level horizontal overflow.
- Navigation collapses before content becomes cramped.
- Multi-column forms and dashboards stack in a meaningful reading order.
- Primary actions remain reachable without a precision hover interaction.
- Tables, tabs, route stages, and previews either wrap or use a deliberate local scroll container when unavoidable.
- Respect `prefers-reduced-motion` and keep all content available without animation.

## Backend boundary

The UI implementation must not change AI prompts, analysis orchestration, scoring, resume rewrite behavior, PDF generation, comparison logic, Prisma analysis models, or API payload contracts.

Neon Auth work is limited to:

- Neon Auth configuration and required dependencies/environment wiring.
- Login, registration, logout, session lookup, and route protection integration.
- A compatibility layer where existing UI/API consumers need the current session shape.

Any database schema migration beyond what Neon Auth itself requires is out of scope unless it is necessary to make authentication work and is explicitly documented.

## Validation plan

- Run the project's available type/lint/build checks after dependencies are available.
- Exercise login, registration, logout, protected routes, and session refresh after Neon Auth integration.
- Verify all existing analysis modes still submit the same payloads and render their current states.
- Inspect desktop and mobile screenshots in one batched pass.
- Check keyboard focus, accessible labels, contrast, reduced motion, loading, error, empty, and long-content states.
- Run the Impeccable detector on changed UI targets and address mechanical findings before final review.
