# Curriculy UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing resume application into the mobile-friendly Curriculy workspace with the approved Plum Garden visual system, HugeIcons, restrained ReactBits motion, and Neon Auth compatibility.

**Architecture:** Keep the existing Next.js App Router pages and API payloads intact while introducing shared visual tokens, a client app shell, a shared icon wrapper, and small composable route/reveal primitives. Replace only the custom authentication boundary with Neon Auth and map its session to the existing Prisma `User` shape so analysis workflows continue to receive the same `userId` contract.

**Tech Stack:** Next.js 16.2.7, React 19.2.4, Tailwind CSS 4, TypeScript, `@neondatabase/auth`, `@hugeicons/react`, `@hugeicons/core-free-icons`, existing Base UI/shadcn primitives, and local ReactBits Fade Content/route reveal implementation.

**Spec:** `docs/superpowers/specs/2026-08-25-curriculy-ui-redesign-design.md`

## Global Constraints

- Curriculy remains general-purpose for people looking for work; copy must not assume a tech role.
- UI/UX behavior, existing analysis workflows, API payloads, Prisma analysis models, prompts, scoring, rewriting, comparison, and PDF generation remain unchanged.
- Neon Auth is the only backend exception: configuration, auth routes, session lookup, route protection, and the compatibility adapter are in scope.
- Light tokens are `#F7F3F8`, `#FFFFFF`, `#281D33`, `#6C4AA3`, `#C65C7E`, `#9ABD7D`, `#766D7C`, `#E3DCE7`, and `#EEE8F6`.
- Dark tokens are `#17111D`, `#251B2E`, `#F6F0FA`, `#B79AF4`, `#F184A5`, `#BEE58F`, `#B8AFC0`, `#3B2D49`, and `#35264A`.
- Color meaning must always be paired with text, layout, or iconography.
- HugeIcons is the only icon family used in application UI; document-preview styling may retain its document-specific typography/colors.
- ReactBits motion is limited to route/reveal clarity, honors `prefers-reduced-motion`, and never delays content.
- Supported widths are 320px, 360px, 390px, 768px, and desktop; no page-level horizontal overflow.

---

### Task 1: Install visual and Neon Auth dependencies and establish the token layer

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `components.json`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/theme-provider.tsx`
- Create: `components/theme-toggle.tsx`
- Create: `components/ui/huge-icon.tsx`
- Create: `components/ui/reveal.tsx`
- Create: `components/ui/route-line.tsx`

**Interfaces:**
- `ThemeProvider({ children }: { children: React.ReactNode })` owns the `light | dark` class on `document.documentElement` and persists the preference under `curriculy-theme`.
- `ThemeToggle()` renders an accessible button and toggles the provider state through a `CustomEvent` named `curriculy:toggle-theme`.
- `HugeIcon({ icon, label?, decorative?, size?, strokeWidth?, className? })` renders `HugeiconsIcon` and sets `aria-hidden` for decorative icons.
- `Reveal({ children, delay?, className? })` is a client-side ReactBits-style fade-content primitive with an immediate reduced-motion fallback.
- `RouteLine({ steps, activeIndex, className? })` renders named semantic waypoints and exposes the current stage in text and `aria-current`.

- [ ] **Step 1: Add exact dependencies and update the icon registry.**

  Add `@hugeicons/core-free-icons`, `@hugeicons/react`, and `@neondatabase/auth` to dependencies. Change `components.json` from the Lucide icon library to `custom` so future shadcn additions do not reintroduce Lucide.

- [ ] **Step 2: Replace the default theme tokens.**

  Rewrite `:root` and `.dark` in `app/globals.css` with semantic Plum Garden variables, add `--color-signal`, `--color-route`, and `--color-surface`, and replace the existing hard-coded `.surface` colors with `var(--surface)` and `var(--line)`. Add shared focus, selection, scrollbar, reduced-motion, and overflow rules.

  The core CSS shape is:

  ```css
  :root {
    --background: #f7f3f8;
    --foreground: #281d33;
    --surface: #ffffff;
    --primary: #6c4aa3;
    --primary-foreground: #ffffff;
    --signal: #c65c7e;
    --route: #9abd7d;
    --muted-foreground: #766d7c;
    --border: #e3dce7;
    --soft-primary: #eee8f6;
  }

  .dark {
    --background: #17111d;
    --foreground: #f6f0fa;
    --surface: #251b2e;
    --primary: #b79af4;
    --primary-foreground: #17111d;
    --signal: #f184a5;
    --route: #bee58f;
    --muted-foreground: #b8afc0;
    --border: #3b2d49;
    --soft-primary: #35264a;
  }
  ```

- [ ] **Step 3: Add the provider and primitives.**

  Implement `ThemeProvider` with an initial system preference, localStorage hydration, a `MutationObserver`-free class toggle, and a `curriculy:theme-change` event. Implement `Reveal` with `IntersectionObserver`, CSS classes, and a `motion-reduce:transition-none` path. Implement `RouteLine` with connected sage lines, completed/check states, current stage text, and no decorative-only state.

- [ ] **Step 4: Wire the provider into the root layout and update metadata.**

  Remove the fixed `dark` class from `<html>`, wrap the existing toast provider in `ThemeProvider`, set `lang="pt-BR"`, and change all metadata/visible product names from ATSForge to Curriculy. Keep the existing top-level `Topbar` position.

- [ ] **Step 5: Run static checks for the foundation.**

  Run `npm run lint` and `npx tsc --noEmit` after dependencies are installed. Expected: no new TypeScript or lint errors; if the current repository has pre-existing unrelated errors, record their exact paths before continuing.

---

### Task 2: Replace application icons and build the responsive Curriculy shell

**Files:**
- Modify: `components/app-shell/topbar.tsx`
- Create: `components/app-shell/app-shell-nav.tsx`
- Modify: `app/loading.tsx`
- Modify: `app/error.tsx`
- Modify: `app/not-found.tsx`
- Modify: `components/ui/custom-toast.tsx`
- Modify: `components/ui/custom-alert-dialog.tsx`
- Modify: `components/ui/accordion.tsx`
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/input.tsx`

**Interfaces:**
- `AppShellNav({ session }: { session: SessionUser | null })` renders desktop left navigation and mobile top/bottom navigation without changing route destinations.
- `SessionUser` remains `{ userId: string; email: string; name?: string | null }` for the UI compatibility boundary.

- [ ] **Step 1: Build the shell navigation around existing destinations.**

  Desktop layout: fixed/contained left rail from `md` upward with Curriculy mark, `Início`, `Histórico`, `Configurações`, and a bottom account/sign-out area. Mobile layout: compact top bar with brand/theme/menu controls and an expandable drawer or bottom action row. Keep `Novo` as the strongest action and preserve `/`, `/history`, `/settings`, `/login`, and logout behavior.

- [ ] **Step 2: Add visual states and theme control.**

  Use route sage for completed/current navigation accents, plum for primary actions, and signal rose for logout/warnings. Add `ThemeToggle` to the shell. All icon-only buttons must have `aria-label` and a visible focus ring.

- [ ] **Step 3: Migrate shared UI icons to HugeIcons.**

  Replace every `lucide-react` import under `app/` and `components/` with `HugeIcon` plus `@hugeicons/core-free-icons` icons. Keep icon sizes in the shared wrapper instead of repeating arbitrary stroke settings. Preserve the behavior of toasts, dialogs, accordion, buttons, and inputs while restyling them to Plum tokens.

- [ ] **Step 4: Harmonize loading, error, and not-found surfaces.**

  Use the same route motif and semantic icons in `loading.tsx`, `error.tsx`, `not-found.tsx`, and toast/dialog states. Add reduced-motion handling to all existing spinners and pulse effects.

- [ ] **Step 5: Check shell widths.**

  Verify the rail collapses before `768px`, the main content gets mobile bottom padding when needed, and `document.documentElement.scrollWidth` never exceeds `window.innerWidth` at 320px, 360px, 390px, and 768px.

---

### Task 3: Migrate auth to Neon Auth with the existing session compatibility contract

**Files:**
- Create: `lib/auth/server.ts`
- Create: `lib/auth/client.ts`
- Modify: `lib/auth.ts`
- Modify: `proxy.ts`
- Create: `app/api/auth/[...path]/route.ts`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `app/api/auth/me/route.ts`
- Modify: `app/api/auth/logout/route.ts`
- Modify: `prisma/schema.prisma`
- Delete: `app/api/auth/login/route.ts`
- Delete: `app/api/auth/register/route.ts`

**Interfaces:**
- `auth` is the singleton from `createNeonAuth({ baseUrl, cookies: { secret } })`.
- `getSessionUser()` continues to return `SessionUser | null`; it reads Neon Auth via `auth.getSession()`, finds/creates the local Prisma user by `neonAuthId` or email, and returns the local Prisma id as `userId`.
- `authClient` is the browser client from `createAuthClient()` and exposes `signIn.email`, `signUp.email`, `signOut`, and `useSession`.

- [ ] **Step 1: Add the minimal Prisma compatibility fields.**

  Change `User.password` to optional and add `neonAuthId String? @unique`. This is required because Neon Auth owns passwords while existing `Analysis.userId` relations continue using the local Prisma user id. Do not modify `Analysis` or any AI-related model. Document that the schema must be pushed/migrated after `DATABASE_URL` is configured.

- [ ] **Step 2: Create the Neon Auth server/client adapters.**

  Add `lib/auth/server.ts` using `createNeonAuth` with `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`; add `lib/auth/client.ts` with `createAuthClient`. Do not silently fall back to the JWT secret in production. Make missing Neon variables produce a clear server configuration error rather than a fake authenticated session.

- [ ] **Step 3: Replace session lookup and route protection.**

  Rewrite `getSessionUser` to use `auth.getSession()` and local-user synchronization. Replace the JWT checks in `proxy.ts` with `auth.middleware({ loginUrl: "/login" })`, preserve the PDF preview exception, and keep public `/login` and `/register` routes. Update `/api/auth/me` to return the same `{ user }` JSON shape.

- [ ] **Step 4: Add the catch-all Neon handler and remove custom credential handlers.**

  Add `app/api/auth/[...path]/route.ts` with `export const { GET, POST } = auth.handler()`. Delete the custom login/register routes so the application cannot accidentally maintain two credential systems. Keep `/api/auth/logout` as a compatibility redirect/handler only if existing clients still call it; its implementation must call Neon Auth sign-out rather than deleting the old `session` cookie.

- [ ] **Step 5: Rebuild login and registration UI around the Neon client.**

  Preserve `name`, `email`, and `password` fields and current error semantics, but call `authClient.signIn.email` and `authClient.signUp.email`. Add password show/hide controls, visible focus, `aria-invalid`/`aria-describedby` for errors, mobile-first spacing, and links between auth pages. Do not add OAuth buttons or alter auth capabilities without configured provider requirements.

- [ ] **Step 6: Validate auth configuration and compatibility.**

  Add a `.env.example` section with `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, and the existing `DATABASE_URL` reminder. Run type/lint checks and verify the route map has no duplicate auth path conflict. Exercise sign-in, sign-up, sign-out, `/api/auth/me`, protected `/history`, and the local-user mapping when Neon variables are available.

---

### Task 4: Redesign home, new analysis, history, settings, and auth surfaces

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/analysis/new/page.tsx`
- Modify: `app/history/page.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Create: `components/home/mode-route.tsx`
- Create: `components/analysis/input-route.tsx`

**Interfaces:**
- `ModeRoute` consumes the existing mode href/label/description records and keeps each exact `mode` query parameter.
- `InputRoute` consumes the existing `mode`, `requiresJob`, upload/paste state, location, and language state; it emits the same `handleContinue` request bodies and validation outcomes.

- [ ] **Step 1: Replace home’s card grid with a route-oriented invitation.**

  Use a concise Curriculy intro, a clear primary `Começar uma jornada` action, and five route choices: `Otimizar perfil`, `Comparar com uma vaga`, `Preparar candidatura completa`, `Melhorar LinkedIn`, and `Escrever carta`. Use a connected route line/waypoints and `Reveal` only for the first meaningful content. Keep all existing links and make the primary action reachable on mobile.

- [ ] **Step 2: Reframe new analysis as progressive waypoints.**

  Keep PDF upload and pasted text as equal tabs; keep the exact API calls, validation thresholds, fields, country values, language values, and query-derived mode. Restyle the page into `1. Seu material`, `2. Contexto da oportunidade`, and `3. Idioma/localidade`; use `RouteLine` to indicate the sequence and a sticky mobile continue action below the fields.

- [ ] **Step 3: Rebuild history as a journey list.**

  Preserve the Prisma query and score parsing. Translate visible labels to Portuguese, show mode/status/date/score context in readable rows, use a calm empty state with one next action, and ensure long titles and narrow screens wrap without pushing the arrow off-canvas.

- [ ] **Step 4: Rebuild settings as account and appearance sections.**

  Preserve the existing localStorage API-key behavior exactly, but make it explicit that keys are local configuration. Add the theme toggle and accessible password visibility buttons. Do not add server-side key storage or new provider behavior.

- [ ] **Step 5: Add states and content hierarchy.**

  Use `Reveal` for initial screen sections, not every card. Add loading/empty/error/focus states to the redesigned surfaces. Use language that fits any profession and never promises a guaranteed interview or ATS outcome.

- [ ] **Step 6: Run the route-preservation checklist.**

  Confirm the following exact navigation remains present: `/analysis/new?mode=MAKE_ATS_FRIENDLY`, `/analysis/new?mode=COMPARE_AGAINST_JOB`, `/analysis/new?mode=OPTIMIZE_FOR_JOB`, `/analysis/new?mode=LINKEDIN_OPTIMIZATION`, and `/analysis/new?mode=COVER_LETTER_ONLY`.

---

### Task 5: Restyle analysis dashboard, editor, LinkedIn, and preview without changing workflow behavior

**Files:**
- Modify: `app/analysis/[id]/client.tsx`
- Modify: `app/analysis/[id]/editor/client.tsx`
- Modify: `app/analysis/[id]/preview/client.tsx`
- Modify: `components/analysis/truth-guard-panel.tsx`
- Modify: `components/analysis/linkedin-dashboard.tsx`
- Modify: `components/editor/structured-resume-editor.tsx`
- Modify: `components/preview/basic-ats-template.tsx`
- Modify: `components/preview/modern-ats-template.tsx`

**Interfaces:**
- Existing component props, API calls, state names, query parameters, tab values, export behavior, save behavior, and document JSON shapes remain unchanged.
- The visual layer consumes `RouteLine`, `HugeIcon`, semantic tokens, and `Reveal` without moving analysis decisions into the UI.

- [ ] **Step 1: Restyle loading/error/progress states.**

  Replace generic loading text with the real analysis stages already provided by `step`, rendered as semantic route waypoints. Preserve the existing fetch sequence and retry action. Use a static state when reduced motion is enabled.

- [ ] **Step 2: Reorganize the dashboard into current state, evidence, and next action.**

  Keep score values, issue arrays, strengths, weaknesses, comparison, Truth Guard, cover-letter CTA, and export CTA intact. Change only grouping, spacing, colors, and responsive layout. Use Plum for identity, sage/mint for completed/positive state, rose for attention, and text/icons alongside every color signal.

- [ ] **Step 3: Make tabs and editor usable at mobile widths.**

  Keep the existing tab values and behavior, but allow local horizontal scrolling for the tab strip, stack match/question/editor/preview content, preserve a visible save/continue action, and avoid page-level overflow. Replace inline SVG suggestion icons with HugeIcons.

- [ ] **Step 4: Keep the preview document-led.**

  Restyle only the non-printable toolbar and outer workspace to Curriculy Plum. Preserve the A4 document structure, printable white paper, export/print behavior, and generated document content. Keep document-specific neutral colors inside the paper.

- [ ] **Step 5: Verify existing specialized content.**

  Confirm LinkedIn and cover-letter modes still render their current fields/actions, and that editor save, template selection, PDF export, cover-letter generation, Truth Guard approval, and manual edits still call their original endpoints with original payloads.

---

### Task 6: Verification, visual QA, and mechanical polish

**Files:**
- Modify: any changed UI file required by the checks above
- Create: `docs/superpowers/verification/2026-08-25-curriculy-ui-verification.md`

- [ ] **Step 1: Install dependencies and run project checks.**

  Run `npm install` only with the workspace/network permission available, then run `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Record exact failures instead of masking them.

- [ ] **Step 2: Run Impeccable mechanical review.**

  Run the Impeccable detector on the changed UI targets. Address findings for contrast, missing labels, overflow, animation, focus, and product-name leftovers. Re-run until only intentional findings remain.

- [ ] **Step 3: Exercise interaction states.**

  Check keyboard navigation, focus-visible styles, theme persistence, mobile menu open/close, auth errors/loading, upload success/removal, pasted text minimum, job-location selection, empty history, dashboard loading/error, editor save, preview print toolbar, and `prefers-reduced-motion`.

- [ ] **Step 4: Capture desktop and mobile evidence.**

  Inspect home, login, new analysis, history, settings, dashboard, editor, and preview at 320px, 390px, 768px, and desktop. Confirm no page horizontal overflow, action reachability, route hierarchy, readable density, and dark/light parity.

- [ ] **Step 5: Record verification results.**

  Write the command output, viewport checks, auth/config caveats, and any remaining external setup requirement to `docs/superpowers/verification/2026-08-25-curriculy-ui-verification.md`.

- [ ] **Step 6: Review final diff.**

  Run `git diff --check`, inspect `git diff --stat`, confirm no AI/backend files outside the approved auth boundary changed, and confirm no `ATSForge` references remain in visible UI copy.

