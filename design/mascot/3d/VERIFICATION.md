# 3D performance verification

The user rejected the interchangeable open-palm gestures, dangling hand and thumbs-up assigned to Verify. This revision replaces the live bitmap cutout rig with actual 3D performances rendered to transparent movies.

## Behavioral evidence

- Six clips, 120 frames each, 25 fps, 512 × 512, 4.8 seconds; 720 rendered frames in total.
- Playwright CLI decoded all six clips and captured six timestamps per action. Verified timeline scrubbing, pause/restart, 0.5× playback, dark background, 320px layout and reduced-motion fallback. No JavaScript errors or movie decoding errors.
- The authenticated production preview played all six clips, passed the transparent-pixel probe, and exercised pause, visibility preferences, reduced motion and mobile layout. No JavaScript errors or horizontal overflow.
- Agent-browser audited the standalone review: zero axe violations and zero incomplete checks.
- 227 tests passed (45 library + 182 application/security/regression). ESLint, TypeScript, production build and standalone packaging passed.

## Meaning of each performance

Explain follows highlighted document sections with the finger. Analyze moves the magnifier together with its grip. Think brings the finger to the chin and pauses before the idea appears. Verify writes three checklist marks and withdraws the pen. Complete owns the thumbs-up, short hop and confetti.

The model is a procedural visual reconstruction of the approved concept. It does not reproduce the original image pixel for pixel; the artistic finish remains open for user refinement. Chrome was validated directly. Other browsers retain the poster if decoding fails or the transparent-pixel probe reports an opaque video.

The original concept PNG remains available for comparison. Local visual evidence is in `docs/mascot-review-2026-10-30/v4-phases/`; the self-contained review is refreshed at the existing `design/mascot/rig/review.html` path and in `docs/mascot-review-2026-10-30/motion-v4.html`.
