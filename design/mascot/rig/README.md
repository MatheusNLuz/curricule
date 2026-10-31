# Curricule: shared cutout rig

Refinement requested on 2026-10-31: the independent `read`/`verify` renders changed arm anatomy. The live component now uses **one body and the same arms for every action**. The previous six flat renders remain historical design sources, rather than the live animation.

`components/mascot/mascot-rig.tsx` assembles eight transparent WebP pieces. `rig.module.css` authors a shared 4.8 second clock with separate tracks for body, gesture, document, gaze, eyelids, brows, smile and contact shadow. All actions return to their initial state for seamless replay. CSS animation clocks share pause/reduced-motion/visibility behavior from `Mascot`.

This is a layered 2D rig with rendered 3D artwork. It is not a 3D mesh, skeletal model, lip-sync system or full-turn animation. The document-holding arm is one layer; individual fingers are not separately articulated.

`review.html` is a portable snapshot of the actual component's markup and CSS, with all image layers embedded. Open it without a server to inspect the six actions, scrub the shared timeline, change speed, pause or replay. Live application behavior remains owned by the React component.

## Anatomy correction

The initial `inspect` track reused the isolated pointing hand and rotated it 165 degrees. Browser inspection confirmed that `read` and `verify` shared this exact hand track. That track and the isolated pointing hand were removed from the live rig. `arms-v2.png` adds complete resting and thumbs-up arms, generated from the original mascot reference (exact built-in imagegen prompt in `arms-v2-prompt.txt`). New limbs use small joint rotations rather than rotating the hand into a different pose.

- Read: resting right arm, raised document, eyes scan the lines.
- Verify: complete thumbs-up arm, gaze toward the user, short nod; the document stays steady.
- Explain: complete original open-palm arm, two restrained presentation beats.
- Think: relaxed arm and upward gaze, with no wrist inversion.

Rebuild the portable snapshot with `node --import ./tests/register.mjs scripts/build-mascot-motion-review.mjs`. Visual review uses six timestamps per action, not just a midpoint screenshot; evidence is kept locally in `docs/mascot-review-2026-10-30/phases/`.

## Artwork provenance

Generated with the built-in imagegen tool, referencing `design/mascot/poses/welcome.png`. `parts.png` is the first sprite sheet; `parts-clean.png` is its alpha cleanup. Transparent pixels may contain colored RGB data: inspect composited on a background, not raw RGB against black. `scripts/prepare-mascot-rig.mjs` mechanically slices named regions, aligns hand canvases and encodes WebP; it does not repaint the artwork.

Initial prompt:

> Use case: identity-preserve. Asset type: transparent 2D cutout animation rig sprite sheet for the EXACT attached violet 3D C mascot. Preserve its C silhouette, two lavender horizontal bars in opening, plump proportions, purple material, short shoes, studio shading. Make ONE precisely arranged 1536x1024 landscape sprite sheet, 3 columns by 2 rows, equal cells 512x512, no grid lines, no text. Each cell has ample transparent margins, never touches another cell. TOP LEFT: entire main C body with its two legs and shoes and two floating lavender bars, front three-quarter view EXACT like reference, but REMOVE BOTH ARMS AND ALL FACE FEATURES, leave smooth uninterrupted violet surface where face was. Entire body fits this cell. TOP MIDDLE: only detached reference waving arm and hand, short gently bent chubby forearm, rounded 4-digit mitten hand open palm, shoulder end at lower-left and fingers upper-right, no body. TOP RIGHT: only detached other short arm gently hugging an ivory resume card with two lavender lines, matching reference, shoulder end upper-left, hand foreground across card lower-middle, no body. BOTTOM LEFT: isolated pair of reference dark oval eyes, white highlights, and eyebrows on transparency, matching reference spacing and perspective. BOTTOM MIDDLE: isolated reference curved dark friendly smile on transparency, same thickness and material. BOTTOM RIGHT: isolated short right forearm with rounded mitten hand pointing right, shoulder end left, single extended finger right and other fingers folded, SAME HAND SIZE AND FOREARM THICKNESS as waving hand. ALL parts in identical soft polished 3D render style. This is a technical character parts sheet, not 6 poses. No arms on the body. No body behind arms. No colored backgrounds. Actual transparent alpha.

Cleanup prompt:

> Edit this exact character parts sheet. KEEP every part in EXACT SAME POSITION, EXACT SAME SIZE, SAME SHAPES, SAME shading and violet color. Change ONLY the alpha/background: remove ALL diffuse purple and white glows surrounding the shapes. Make a clean hard-surface transparent cutout sheet. Every pixel outside the precise solid silhouette of each body, hand, card, eye, brow and smile is fully transparent alpha=0. Inside each solid object fully opaque alpha=255. Keep soft antialiasing only at the immediate 1-pixel contour, no halos whatsoever. No ambient glows, no drop shadows, no background, no aura. This is a clean production sprite sheet for assembling an animation rig.
