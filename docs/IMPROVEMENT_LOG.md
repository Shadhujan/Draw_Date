# Draw Date improvement log

All dates are Asia/Colombo. Changes are committed to `Dev` for owner review; this document does not imply a production release.

## 27 October 2026 — A calmer drawing room and keepsake downloads

**Baseline:** remote `Dev` at `36a84ff367091c657ae78267e3f402a6f431da35`, after the owner pushed the plush-teddy integration.

**Problem:** invitations and presence were repeated in separate locations, the always-open brush shelf added phone scrolling, and PNG downloads had no preview or keepsake option.

**Change:** placed a compact duo/presence strip and one invitation action above the canvas. Offline members are no longer presented as currently drawing together. Increased the phone canvas width, enlarged everyday tool and swatch hit areas, strengthened studio text contrast, and made the brush library expandable. The doodle chooser starts collapsed on phones and open on desktop. Existing brushes, gradients, shading, lasso, guides, reactions and undo remain available.

Added one Save drawing action with a native modal preview: Drawing only or a cream-framed Keepsake. The latter has editable optional names and an optional local date, with pink/sage frame accents. The canvas freezes the same pigment snapshot previously used for PNG export, including visible hints. Framing adds space around those pixels without cropping or rescaling them. Downloads stay on the device. Escape/backdrop/close dismiss the preview; focus returns to Save drawing. Download errors have an inline retry path.

**Validation:** TypeScript/Vite production build; whitespace check; local headless Chromium. Eleven widths (320, 360, 390, 520, 680, 768, 960, 961, 1024, 1150, 1440px) passed page overflow/control bounds checks in both themes. Guided phone layouts also passed responsive checks. Exercised brush selection, color, gradient/shading, lasso paint, undo, guide steps, local reload recovery and leave/return. Downloaded both PNG styles and compared every drawing RGB pixel between the plain export and the corresponding framed region: identical. Checked small/landscape save sheets, optional empty captions, Tamil/emoji names, local dates near midnight, frozen previews across resize, failed PNG preparation/retry, reduced motion, modal background inertness and focus restoration. No page exceptions in the completed checks. A React component/accessibility review was also applied.

**Limits:** local browser verification does not establish physical-phone performance or real two-device Supabase admission, synchronization and reconnect behavior. The local checkout runs in device-only mode without configured Supabase credentials. Existing bundle-size advisory remains.

**Delivery:** automatic approval review blocked the GitHub source upload, citing missing explicit authorization to publish through the connector. The tested change is therefore delivered as an incremental patch against the baseline above. No remote branch, database or production changes were made in this pass.

## 26 October 2026 — Connected plush bears in the studio

**Baseline:** remote `Dev` at `258191adc4b062cb39adb7a197e4194ef64ede80`, including the owner's applied hero patches.

**Problem:** the owner approved the new teddy face, but the feet looked detached. The approximately 27 MB appearance prototype was also too heavy to place directly in the welcome scene.

**Change:** joined hips, thighs and feet into a continuous seated-body mesh; preserved the approved face; added head/arm pivots. Simplified the asset to approximately 4 MB / 69k triangles, retaining short fibre geometry and the embedded normal texture. Closed simplification seams/poles after visual QA found a head-cap defect. Added the locally hosted model and a lazy GLTF loader; the cream and caramel bears share geometry/textures and one download. Added soft seats and posed paws toward the drawing table. Existing pencil trace, reactions, pointer response, evening lighting and theme controls remain. The original fluffy art remains on invitations and as graphics/model-loading fallback.

**Validation:** TypeScript/Vite build and whitespace check; Blender structural checks and renders; actual Three.js scene rendered in local headless Chromium/software WebGL. Eight widths (320–1440px) passed overflow, title and scene-footer checks. Verified one model request for both bears, one renderer across theme/motion changes, paused/offscreen draw-call stoppage, initial/live reduced motion and real WebGL loss/restoration. Invitation entry, nickname validation, Enter submission, drawing, swatches, lasso, undo, PNG export, reload recovery and leave/return checks passed without page exceptions. An aborted model request kept the illustration, love feedback and drawing entry usable; entering the studio while a delayed model request completed produced no page errors or stray hero canvas.

**Delivery:** repository-bound files omit private editor links and editor IDs. The sanitized GitHub write still returned HTTP 403 `Resource not accessible by integration`, so this pass is delivered as an incremental binary-capable patch. Remote branches and production were not changed.

**Limits:** real-phone GPU/battery performance and real two-device collaboration remain unverified. Existing Vite large-chunk advisory remains. The material is a short velour coat, with less fluff than the original illustration.

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

## 27 October 2026 — More drawing dates and a symmetrical bunny

**Baseline:** remote `Dev` at `36a84ff367091c657ae78267e3f402a6f431da35`. This is a separate drawing-content patch; it can also be applied after the studio/keepsake patch.

**Change:** added eight original vector lessons: Kitten cuddles, Teddy hug, Lovebirds, Berry sweet, Tea for two, Cupcake date, Butterfly wishes and Moonlit wishes. Together with Love note, Flower date and Bunny buddies, the catalog now has 11 guided drawings / 55 steps plus Freestyle. Centered the bunny on x=500 and mirrored its ears, head, face, whiskers, blush, body, paws and heart. Each lesson stores its geometry and instructions together, so its thumbnail, guide and step labels stay consistent. Thumbnails preserve proportions, and the expanded catalog has bounded scrolling.

**Correctness:** one shared template-ID list now drives TypeScript and runtime validation. New IDs survive board sanitization, local persistence and the existing reset/state message guards. Existing IDs and drawing coordinates remain valid. Progress continues to mean tracing coverage, not a stroke-quality or accuracy grade.

**Validation:** TypeScript/Vite build and whitespace check; local Chromium rendering and visual review of all 11 guides. Verified all 55 step groups, empty/exact tracing coverage, invalid-step rejection and template storage round trips. Every bunny step passed a geometric mirror check. Navigated through every lesson, checked eight widths in both themes, and exercised bunny tracing, undo, smart fill, PNG export and reload recovery with the selected guide and step. No page exceptions in completed checks. The patch also applied cleanly after the studio/keepsake patch; the combined build, mobile lesson picker and keepsake export passed. See `DRAWING_LESSONS.md` for compatibility and scope.

**Limits/delivery:** real two-device sync and physical-phone performance remain unverified. Both participants need the updated client to recognize the new lesson IDs. Delivered as an incremental patch; the earlier automatic approval-review block on publishing source through GitHub remains in place. No remote branch or production changes were made.

## 27 October 2026 — First-paint artwork and entering through the hero paper

**Baseline:** owner-pushed `Dev` at `10887004c91db5a2699f820761acc987b64fc385`, including both the studio/keepsake and extra-drawings patches.

**Problem:** the HTML root was empty until the app JavaScript and stylesheet loaded, causing a white initial screen. Valid nickname submission immediately replaced Welcome with Studio; the previously discussed hero-to-paper entrance was still missing.

**Change:** added self-contained, themed pencil/heart startup artwork and styles directly to the HTML. The app stylesheet loads with the dynamic app module so a pending external stylesheet cannot block the startup paint. Startup script/stylesheet failures offer a branded native reload link. Added a render-error fallback. Moved the existing studio into a separate lazy-loaded module, sharing the brand and room-link helpers; drawing tools preload on nickname/button intent. Current production output separates about 304 kB of studio JavaScript from the welcome entry.

Valid submission now expands the actual hero scene, finishes its pencil-heart motion and moves the orthographic camera overhead toward the desk paper. That projected paper becomes a foreground sheet which moves into the real canvas while the studio unfolds. Invitation artwork and unavailable/not-yet-ready graphics use an illustrated pencil/paper entrance. Paused/reduced-motion entry uses a short fade. The form is guarded against duplicate entry, the arriving studio is temporarily inert, and focus moves to its heading after the transition has committed. Failed/stalled studio loading cancels the visual, preserves the nickname and restores the form; a late module response cannot enter a cancelled attempt. Existing room IDs, drawing state, lesson IDs, nickname cleaning and room lifecycle are preserved.

**Validation:** production build and whitespace check; actual production files in local headless Chromium. Held every JS/CSS response and confirmed the styled sage startup paint before releasing them. Aborted entry JS and app CSS and verified reload recovery. Verified no Studio module request before intent; empty-name validation; eight widths (320, 390, 520, 768, 860, 861, 1024, 1440px) with invitation entry, correct room URL, no horizontal overflow and heading focus. Actual Three.js entry completed on desktop; phone WebGL loss during entry fell back and completed. Also checked unavailable WebGL, paused/reduced motion, slow/failed/stalled Studio requests, cancellation/late completion and retry, a stroke, undo, keepsake PNG, leave and return. Completed flow checks recorded no page exceptions. Inspected the real camera close-up and projected paper handoff; a slowed QA clock was used to hold the camera for visual inspection, not to measure frame rate.

**Delivery/limits:** incremental patch against the baseline above. Physical-phone GPU smoothness/battery and live two-device sync remain unverified; the optional Three.js chunk still has the existing bundle-size advisory. The earlier automatic approval-review block on GitHub source publishing remains in place; no remote branch or deployment was changed.

## 27 October 2026 — Three animated bear startup scenes

**Request:** animate the supplied couple-picture idea as sprite strips: white bear chasing with open arms and heart eyes, caramel running with paws raised, floating love, and different scenes on later openings.

**Change:** generated three original eight-frame transparent sprite sheets (chase, cuddle, flower surprise), packed into small WebP atlases. One scene is chosen per document opening; session storage excludes the immediately previous one. Only the selected asset is requested. The real app loads underneath a skippable 2.4-second intro, with an inline pencil/heart fallback before the image arrives. Root interaction and accessibility exposure wait for actual app readiness. Reduced motion uses a still frame with no intro wait; hidden-page animations pause. Image failure removes the intro wait, and script/stylesheet errors retain reload recovery. A long load offers a reload link. Delayed images never hold up the page. Optional 3D loading begins after startup, and its existing paper entrance remains available.

**Validation:** production build and whitespace check; all three strips visibly advance in Chromium; selected-atlas-only requests; Skip/Escape, readiness/focus and intro timing; eight widths in both themes plus short/landscape layouts; initial/live reduced motion; repeated openings without consecutive repeats; blocked storage; simulated hidden visibility; delayed/failed images and modules; long-load recovery using an accelerated timer; real 3D startup deferral and subsequent nickname camera-to-paper entrance. Completed checks have no page exceptions. Art and actual startup screens were visually reviewed. Browser QA uses software WebGL and does not measure physical-phone smoothness. See `STARTUP_SCENES.md` for asset layout and prompts.

**Delivery:** current remote Dev remains `10887004c91db5a2699f820761acc987b64fc385`, without the previous startup patch. The package provides a combined patch from that Dev and a smaller alternative for users who already applied the previous startup/paper patch. Apply one. It includes a standalone animated artwork preview. No remote source publishing or deployment was attempted.
