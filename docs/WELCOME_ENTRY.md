# Welcome startup and paper entrance

Baseline: Dev `10887004c91db5a2699f820761acc987b64fc385`.

## What to expect

Opening the page immediately presents a small pencil-and-heart drawing on a warm background. It uses inline HTML/SVG/CSS and the saved pink/sage theme; it does not need the app bundle, a font download or the teddy model. The later bear-startup pass adds three randomized sprite scenes and a skippable 2.4-second intro while the app loads, with a still/no-wait reduced-motion mode. See `STARTUP_SCENES.md`. Script/stylesheet startup failures show a reload link.

Focusing the nickname or start button preloads the drawing tools. A valid nickname starts the entrance while the module is prepared:

1. The current hero expands into a centered scene, including when it began below the phone form.
2. If its 3D renderer is ready, the live camera approaches the desk paper and the pencil finishes its existing heart.
3. The projected paper rectangle moves into the actual drawing canvas; the remaining room controls appear around it.

The expansion is about 750 ms, the camera approach 2.2 seconds and the final paper handoff 1.25 seconds: about 4.2 seconds for the full 3D entrance. The camera eases gently with a half-cosine curve and proportional magnification, avoiding the old sharp mid-motion zoom. The paper settles before dissolving and the room controls fade in at the same slower pace. These animations overlap the real module load. An invitation or unavailable/loading renderer uses the original illustration with a gentle 1.4-second pencil/paper reveal instead. Reduced-motion and paused scenes retain the short fade.

The illustrated paper is committed synchronously before its bounds are measured. Waiting for a single animation frame did not guarantee a React commit and could skip the reveal and handoff on phones.

A module failure or a studio request stalled for 15 seconds restores the usable form with its nickname. Late completion of a cancelled request cannot enter the room. Admission/network behavior inside the drawing room remains controlled by the existing room code.

## Code boundaries

- `index.html`: independent first-paint artwork/styles, saved-theme selection and resource-error recovery.
- `src/main.tsx`: dynamic app startup and render-error fallback.
- `src/App.tsx`: welcome form, intent preload, guarded entry and room lifecycle.
- `src/Studio.tsx`: the existing drawing room moved into a lazy-loaded module.
- `src/Brand.tsx`, `src/roomLink.ts`: shared existing brand/theme UI and URL helper.
- `src/hero/HeroStage.tsx`: scene expansion, illustrated fallback and cancellation.
- `src/hero/HeroAtmosphere.tsx`: camera approach, paper projection and graphics-failure completion.
- `src/hero/livingStudio.ts`: exposes the paper mesh and completes the current pencil stroke during entry.
- `src/PaperArrival.tsx`, `src/PaperArrival.css`: paper-to-canvas animation and studio reveal.

The 304 kB studio chunk is deferred until intent/entry; the optional Three.js/model path is independent. This is a bundle observation, not a measured phone startup-time or frame-rate claim.

## Verification

Production build, first-paint capture with every JS/CSS response blocked, startup failures, eight responsive widths, valid/invalid nickname, invitation URL, heading focus, slow/failed/timed-out room-module requests, late completion/retry, real 3D entry, WebGL loss/unavailability, paused/reduced motion, stroke/undo, keepsake export and leave/return were checked in local Chromium. Physical phones and two-device collaboration need separate testing.
