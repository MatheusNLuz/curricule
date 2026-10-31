# Curricule: authored 3D performances

This replaces the cutout arm rig after the user rejected its interchangeable gestures and dangling arm. The model is an original procedural reconstruction of the approved violet C concept, not the original raster image turned into a production 3D asset. Its finish remains reviewable on this branch.

`scene.mjs` owns actual 3D geometry, lighting, finger articulation, curved arm attachment and deterministic performances. There is no generated pose swapping, bitmap wrist rotation or runtime rendering dependency in the application.

- Welcome: a short greeting wave.
- Explain: the index finger follows two highlighted document sections.
- Analyze: the grip, magnifier and forearm move together over the document.
- Think: finger at the chin, head inclination, pause and an idea bubble.
- Verify: the pen marks three checkboxes, then withdraws to reveal them.
- Complete: a raised thumb, short jump and confetti. The thumb is not the Verify gesture.

## Rendering

Install dev dependencies, Chrome and FFmpeg, then run `node scripts/render-mascot-3d.mjs`. `CHROME_PATH` and `FFMPEG_PATH` override executable paths. An optional comma-separated action argument renders only selected clips, for example `node scripts/render-mascot-3d.mjs verify`.

The renderer starts a loopback-only temporary server, evaluates 120 deterministic frames per clip at 25 fps and 512 × 512, encodes VP9 WebM with alpha, and writes a WebP poster. `public/mascot/motion/manifest.json` records these settings. Temporary frames stay under ignored `scratch/`.

Build the self-contained HTML review with `node --import ./tests/register.mjs scripts/build-mascot-motion-review.mjs`. The template contains no image data; the builder embeds the real component markup, clips and posters.

Three.js 0.187.0 is a pinned development dependency used for authoring/rendering only. The browser application gets plain video plus still images. Visibility, user preferences, hidden tabs and reduced motion control playback. If the browser decodes the clip without alpha, a transparent-pixel probe retains the still image instead of displaying a black rectangle. Movie decoding failures also retain the still image.

Legacy `design/mascot/rig/` sources document the superseded cutout approach. Its `review.html` path is refreshed for existing review links.
