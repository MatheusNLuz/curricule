# Curriculy account library and analysis flow

## Goal

Make the signed-in workspace easier to understand and use: choose an analysis mode before starting, browse optimized resumes, and use clear account/profile labels.

## Approved behavior

- Replace user-facing uses of “jornada” with context-appropriate wording such as “análise”, “análises anteriores”, or “etapas”. Internal identifiers, database fields, and API contracts remain unchanged.
- The history heading is “Análises anteriores”; an unnamed record is “Análise sem título”. Its “Nova análise” action opens the same five-mode choice presented on the home page: ATS, compare with a job, complete optimization, LinkedIn, and cover letter. Selecting a mode continues to the existing intake form for that mode.
- Add a signed-in “Ver currículos” destination. It lists only completed resume analyses (`MAKE_ATS_FRIENDLY`, `COMPARE_AGAINST_JOB`, `OPTIMIZE_FOR_JOB`) with a generated `finalResumeJson`, newest first. LinkedIn results use a different data shape and are excluded. Each item shows its analysis title (or “Análise sem título”), mode and date, plus a short job-description excerpt only when present. An item opens its existing preview.
- Each library item offers a normal PDF download using the existing authenticated `/api/export` flow. Keep ownership validation and avoid storing/exporting a PDF through a new backend path.
- Correct the Google sign-in mark so it renders as a recognizable, balanced multicolor Google G at the button’s size.
- Use the full profile name when available and derive avatar initials from the first and last name. Never infer or fabricate a surname from an email address; if only a one-token name is available, display it as-is and use its initials.
- Maintain the current visual system and responsive behavior on mobile and desktop. Do not change auth provider configuration, database schema, analysis generation, or deploy/push to GitHub.

## Data and navigation

The current `Analysis` record contains original/parsed resume text, optional job description, and optional optimized resume JSON. The library is a user-scoped view over existing records, not a new resume-storage model. The no-mode `/analysis/new` route becomes the mode chooser; routes with a valid `mode` continue to use the existing intake flow.

## Acceptance checks

- A user sees no “jornada” wording in rendered application copy and no internal API/database names are renamed.
- “Nova análise” opens all five existing modes; choosing each one enters the correct existing intake mode.
- The library excludes analyses without `finalResumeJson`, is scoped to the signed-in user, and shows an optional truncated vacancy description.
- Preview navigation and PDF download work for listed items; unauthorized users cannot access another user’s analysis through either action.
- A Google G is not clipped or visually malformed. Full available names and their first/last initials render consistently in account menu and sidebar; absent surname data is not fabricated.
- Existing behavior remains intact at desktop and mobile breakpoints.
