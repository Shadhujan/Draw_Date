# Draw Date improvement log

All dates are Asia/Colombo. Changes are committed to `Dev` for owner review; this document does not imply a production release.

## 26 October 2026 — Preserve the fluffy invitation scene and fix the bow

**Baseline:** local second-pass commit `8ec4a29`; remote `Dev` still at `004d298` when rechecked.

- The cream bear's bow was partly embedded in the head. Its exposed fragments looked like a mole/stray pink mark. Repositioned the complete bow as one group in front of the ear, with both loops and its centre visible.
- Kept the living 3D miniature on the main welcome page. Valid room-link invitation pages now show the original fluffy-bear illustration with the sunlit background, note, parallax, sparkles and local love feedback. The invitation does not initialize the miniature renderer.
- Kept nickname validation, theme switching and room-link admission behavior intact. Leaving a drawing returns to the main welcome, as before.

**Validation:** production build and whitespace check passed. Local Chromium: visually inspected corrected bow and original invitation; verified invitation layout at 1440, 390 and 320px with no horizontal overflow, both themes, love feedback, empty nickname error, Enter joining the original room ID, and leaving back to the main miniature welcome. No page exceptions. These checks do not verify two-device collaboration.

**Delivery:** the updated patch includes the second 3D pass and this follow-up, starting from remote `Dev` commit `004d298`. Use it instead of the earlier 3D patch when that patch has not been applied. GitHub write access remains blocked; no remote branch/deployment changed.

## 26 October 2026 — A living miniature art studio (second pass)

**Baseline:** remote `Dev` at `004d2985e69a3e52489ca18b413b352007090523`. The owner applied the first hero patch in this commit; this pass builds on that version, including its package version change.

**Problem:** the first pass still presented a static bear illustration with decorative animation. The owner requested a more substantial, more interactive hero.

**What changed**

- Built an original Three.js miniature room: two cream/caramel clay bears, soft surface grain, bows/scarf, a rounded wooden drawing table with gingham mat, a shared sheet of paper, paintbrush cup, tea mug, floor lamp, plant, books, framed heart, curtains and a hanging heart mobile. No external model, new dependency, or generated video is required.
- Bears breathe, blink, gently follow the pointer, and lean together/blush when the existing love button releases a heart burst. A floating pencil traces a heart on their shared paper. Motion stays local to the welcome screen.
- Added a keyboard-accessible evening/sunshine switch. Evening changes the window sky, stars, lamp emission, room illumination and surrounding colour, with a gentle transition when animation is enabled.
- Retained the original bear illustration for loading, WebGL unavailability and context loss. Kept the invitation form and drawing studio behavior intact.
- Lazy-loaded the miniature module alongside Three.js. Reused sphere geometry, materials and textures, capped pixel ratio/frame cadence, and computed room shadows on setup/resize instead of rendering another shadow scene every animation frame.

**Lifecycle fixes**

- Pausing and theme switching now reuse one renderer. Pause retains the current miniature frame instead of tearing down the canvas; initial reduced-motion renders a still miniature with no running animation loop.
- Context loss now calls `preventDefault()` so a browser can restore WebGL. The illustration appears while the context is lost, then the miniature resumes when restoration succeeds.
- Runtime renderer errors return to the illustration. Cleanup is idempotent and disposes owned geometry, textures, materials, environment maps, shadows and listeners.
- Offscreen/hidden animation stops scheduling frames. The miniature's lifecycle is independent of drawing-room state.

**Validation:** TypeScript/Vite production build; `git diff --check`; local headless Chromium with software WebGL. Checked eight widths (320, 390, 520, 768, 860, 861, 1024, 1440px): no horizontal page overflow, clipped first headline or scene-footer overlap. Visually reviewed daytime/evening, pink/sage and phone layouts. Measured draw calls stopping while paused/offscreen and under reduced motion; verified one context across theme/motion toggles. Tested actual `WEBGL_lose_context` loss/restoration, initial reduced motion, WebGL-unavailable illustration, nickname validation/Enter submission, drawing, colour selection, lasso paint, undo, PNG export, local reload recovery and return to welcome. No page exceptions in these checks.

**Push status:** the personal GitHub connection again rejected tree creation with HTTP 403 `Resource not accessible by integration`. This pass is prepared as a separate patch against the owner's current `Dev`; no remote branch or deployment has been changed by this pass.

**Limits:** desktop Chromium uses software WebGL; real-phone GPU/frame-rate/battery performance and two-device collaboration remain unverified. Existing Vite large-chunk advisory remains. Static room shadows intentionally approximate the small animated character/pencil motions.

## 26 October 2026 — Sunlit little studio hero

**Baseline:** `ab9b5967b014f16303cbaae983b50397686c0f15`.

**What changed**

- Reframed the existing artwork as a sunlit arched studio with a fine cream rim, layered parallax, a separate bear shadow, slowly shifting light, and a softer taped note. Consolidated superseded hero CSS instead of stacking more overrides.
- Kept the existing welcome message and nickname workflow; added a small hand-drawn heart underline, improved copy contrast, and made the nickname entry a semantic form with associated error feedback. Mobile nickname text is 16px to avoid automatic input zoom on iOS.
- Reworked optional Three.js atmosphere into glossy floating hearts, pearl-like four-point stars, and a single dust-particle draw call. Added a local-only “a little love” burst with a CSS/HTML fallback. Nothing is sent to a drawing room.
- Added a scene pause/play control. The scene responds to reduced-motion preference changes while the page is open. Animated artwork stays static when motion is reduced or paused.

**Bugs/performance issues addressed**

- Three.js previously read reduced-motion only once on mount, leaving animation active after a live preference change. The new media-query subscription updates the scene immediately and disposes the renderer when motion is disabled.
- The previous renderer continued scheduling animation frames while hidden or offscreen. The new loop stops on visibility/intersection changes and resumes with a clamped time step, avoiding a large motion jump.
- Scene cleanup is registered before geometry/material setup, so a failed optional enhancement also releases allocated resources. Resize, visibility, pointer, interaction and context lifecycle listeners are removed on cleanup.
- Removed the old floating pencils located outside the visible scene bounds; kept both pencils in the bear artwork.

**Files:** `src/App.tsx`, `src/hero/HeroStage.tsx`, `src/hero/HeroAtmosphere.tsx`, `src/hero/three-ambient.d.ts`, `src/styles.css`, and these two documentation files.

**Validation:** TypeScript/Vite production build and `git diff --check` passed. Existing artwork paths and lazy Three.js loading are retained. The RoomEnvironment helper comes from the existing Three.js package (about 0.94 kB gzipped as a separate chunk), with no added dependency. No drawing protocol, Supabase schema, or production setting changes. The existing >500 kB bundle advisory remains (it was present before this pass).

**Local browser verification:** passed in isolated headless Chromium using a local Vite server (software WebGL). Inspected rendered desktop, sage theme, 390px, 320px, and WebGL-unavailable screenshots. Responsive checks passed at 1440, 1024, 861, 860, 768, 520, 390, and 320px, with no horizontal overflow or clipped first headline. No page exceptions were recorded.

| Behavior | Result |
| --- | --- |
| Three.js renders; love action responds | Pass |
| Pause/resume and live reduced-motion changes | Pass |
| Measured WebGL draw calls stop while paused/offscreen and resume when visible | Pass |
| Pink/sage switching and scene remount | Pass |
| Empty-name error, associated invalid state, Enter submission | Pass |
| WebGL unavailable: artwork, form and HTML love feedback still work | Pass |
| Solo stroke, color swatch, lasso paint, undo | Pass |
| PNG download and local drawing recovery after reload | Pass |
| Leave studio and return to welcome | Pass |

Visual QA caught and corrected an overly wrapped desktop headline and a sticky note obscured by the bears. Image-based lighting from the existing Three.js RoomEnvironment gives the live hearts softer reflections. The pause control is keyboard accessible and reduced motion removes it when the scene is static.

**Push blocker:** the connected personal GitHub integration rejected both Git tree creation and file creation with HTTP 403 `Resource not accessible by integration`. A command-line push also failed because this workspace has no GitHub credentials. The change is committed locally only. Neither remote `Dev` nor `main` was modified by this pass; no deployment was created or promoted.

**Limits:** no remote Dev preview and no real two-device Supabase admission/reconnect/synchronization test. Local solo checks and software WebGL do not establish mobile hardware performance or production multiplayer behavior.
