# Draw Date improvement log

All dates are Asia/Colombo. Changes are committed to `Dev` for owner review; this document does not imply a production release.

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
