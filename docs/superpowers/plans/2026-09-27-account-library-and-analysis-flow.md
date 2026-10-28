# Account library and analysis flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give signed-in users a clear analysis-mode chooser, a downloadable library of optimized resumes, consistent profile identity, and clearer Portuguese UI labels.

**Architecture:** Reuse the existing five home-page mode cards as the no-mode `/analysis/new` chooser. Add a user-scoped server-rendered `/resumes` page backed by `Analysis.finalResumeJson`, with a small client download control calling the existing `/api/export` route. Keep database/API identifiers and generation behavior unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, Tailwind CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-27-account-library-and-analysis-flow.md`

## Global Constraints

- Change only user-facing Portuguese copy; internal enum values, routes used by existing records, and API/database identifiers stay unchanged.
- The library is scoped by `session.userId` and only includes completed resume modes (`MAKE_ATS_FRIENDLY`, `COMPARE_AGAINST_JOB`, `OPTIMIZE_FOR_JOB`) with non-null `finalResumeJson`; LinkedIn results are a different schema and must not appear as resumes.
- Use the existing authenticated `/api/export` flow for PDF downloads; do not add a storage model or unauthenticated export path.
- Never derive a surname from an email or fabricate profile data.
- Preserve the existing visual system, responsive support, and analysis/auth behavior; do not push or deploy.

## Review Focus

- A signed-in user must not see another user's resume: test/verify ownership scoping on the library and existing export route.
- An analysis without a final resume must not appear in the library: constrain the Prisma query and verify the empty state.
- An absent job description must not leave a blank metadata row: render the excerpt conditionally.
- A one-token profile name must not derive a second initial from email: add a regression test; preserve an existing full name over an abbreviated provider name.
- An absent/invalid analysis mode must show choices rather than silently launching the wrong intake form: test valid-mode matching and inspect chooser behavior.

---

### Task 1: Shared mode chooser and visible terminology

**Files:**
- Create: `lib/analysis-modes.ts`
- Create: `components/home/analysis-mode-grid.tsx`
- Modify: `app/page.tsx`
- Modify: `app/analysis/new/page.tsx`
- Modify: `app/history/page.tsx`
- Modify: `components/app-shell/app-shell-nav.tsx`
- Modify: `app/loading.tsx`, `app/login/page.tsx`, `app/register/page.tsx`, `components/ui/route-line.tsx`
- Test: `lib/analysis-modes.test.ts`

**Interfaces:**
- `ANALYSIS_MODES` exports the five existing modes and their current titles, descriptions, CTA copy, icon, and accent.
- `AnalysisModeGrid` renders those mode cards and supports the home-page grid layout and a chooser-page layout without duplicating mode data.
- `/analysis/new` renders the chooser when `mode` is missing/invalid and preserves the existing intake form for a valid mode.

- [ ] **Step 1: Write failing tests** for all five mode values/hrefs and valid-mode recognition; assert invalid/missing values do not resolve to the ATS form by default.
- [ ] **Step 2: Run `npm test -- lib/analysis-modes.test.ts`** and confirm the tests fail because the shared mode contract is absent.
- [ ] **Step 3: Extract the mode data and reusable card grid**, use the grid from the home page and no-mode analysis page, and update signed-in navigation to “Nova análise”, “Análises anteriores”, and “Ver currículos”. Replace visible “jornada” copy throughout the app with fitting “análise”/“etapas” copy; leave identifiers untouched.
- [ ] **Step 4: Run `npm test -- lib/analysis-modes.test.ts` and `npx tsc --noEmit`**; confirm both pass.

### Task 2: Optimized-resume library and download

**Files:**
- Create: `app/resumes/page.tsx`
- Create: `components/resumes/download-resume-button.tsx`
- Modify: `components/app-shell/app-shell-nav.tsx` (library route and three-item mobile navigation)
- Test: `lib/resume-library.test.ts`

**Interfaces:**
- `/resumes` requires a session and queries the current user's analyses with mode in the three resume modes and `finalResumeJson: { not: null }`, newest first, selecting only fields needed for the card.
- Each card links to `/analysis/{id}/preview`, presents title/mode/date and a short optional job-description excerpt, and includes a PDF download control.
- The download control POSTs `{ analysisId }` to `/api/export`, downloads the returned PDF as a blob, and shows a readable error if the request fails.

- [ ] **Step 1: Write failing tests** for title fallback “Análise sem título”, whitespace-safe job excerpts truncated to the chosen limit, and the mode label fallback.
- [ ] **Step 2: Run `npm test -- lib/resume-library.test.ts`** and confirm the expected missing-helper failures.
- [ ] **Step 3: Implement the library presentation helpers, session-protected query, responsive empty/list states, preview link, and download button**; rely on the existing export endpoint's session and ownership checks.
- [ ] **Step 4: Run `npm test -- lib/resume-library.test.ts` and `npx tsc --noEmit`**; confirm both pass.

### Task 3: Google mark and profile name/initials

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `lib/user-profile.ts`
- Modify: `lib/auth.ts`
- Modify: `lib/user-profile.test.ts`
- Modify: `components/app-shell/account-menu.tsx` only if required to display the resolved name consistently.

**Interfaces:**
- `getProfileInitials(name, email)` uses the first and last tokens of an available full name; a one-token name yields one initial. Email is not parsed to invent surname initials.
- `getPreferredProfileName(existingName, providerName)` does not replace an existing multi-token name with a one-token provider value; otherwise it uses the provider's available name or existing value.

- [ ] **Step 1: Add failing tests** for multi-word initials, one-word initials despite a multi-token email, empty profile fallback, and preserving an existing full name when the provider returns only one token.
- [ ] **Step 2: Run `npm test -- lib/user-profile.test.ts`** and confirm the initials/name preference cases fail.
- [ ] **Step 3: Implement the tested profile helpers and use the preferred name in the Neon session sync; replace the malformed Google SVG with a balanced 20px multicolor Google G.**
- [ ] **Step 4: Run `npm test -- lib/user-profile.test.ts` and `npx tsc --noEmit`**; confirm both pass.

### Task 4: Verification and local review

**Files:** All files above.

- [ ] Read the installed Next.js guides for App Router pages/layouts, linking/navigation, and route handlers before implementation; follow any version-specific constraints.
- [ ] Read Impeccable's craft-floor immediately before UI implementation and preserve the incumbent design system.
- [ ] Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`; record exact results.
- [ ] Inspect the local `/analysis/new`, `/history`, `/resumes`, login, and account menu at mobile and desktop widths. Verify all five choices, empty/non-empty library presentation, preview navigation, PDF download, Google mark, and full-name initials.
- [ ] Review the diff and confirm no unrelated user changes (including `AGENTS.md`) were altered, and no Git push/deploy occurred.
