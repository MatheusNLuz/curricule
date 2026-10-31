# Anatomy and action review · 2026-10-31

The review was triggered by two concrete defects: identical `read`/`verify` arm tracks and an inverted pointing hand.

## Before

Playwright CLI inspected both actions at 2.0s. Both reported `animation: inspect` and `matrix(-0.965926, 0.258819, -0.258819, -0.965926, 0, 0)`, confirming the same 165-degree rotation. The pointing asset was a hand without sufficient forearm; moving that bitmap could not produce a natural elbow gesture.

## After

- Removed the isolated pointing hand from the component and removed `inspect`/`ponder` wrist rotations.
- Full resting and thumbs-up arms replace attempts to rotate a hand into another pose.
- Analyze lifts the document and scans it, with the right arm relaxed. Verify keeps the document steady, addresses the viewer and gives a thumbs-up with a short nod. Explain uses the original full open-palm arm.
- Playwright CLI captured all six actions at 0, 0.96, 1.92, 2.88, 3.84 and 4.75 seconds. The 36-frame contact sheet was visually reviewed for attachment, occlusion, inversion and distinct action.
- A separate authenticated production-build check exercised all six actions and captured the actual application. Analyze and verify use distinct body, document and gaze timelines. Pause, reduced motion, hiding/reopening the character and 320px layout passed; no JavaScript errors.
- Agent-browser exercised Analyze and Verify at 0.5× and audited the standalone review: zero axe violations and zero incomplete checks.
- 19 focused workspace/product regression tests passed, along with ESLint, TypeScript and production build/standalone packaging. The earlier broader 227-test run belongs to the preceding iteration.

Local captures and CLI logs stay in `docs/mascot-review-2026-10-30/phases/` and `scratch/mascot-*`. `review.html` is the portable review artifact committed with the corrected rig.
