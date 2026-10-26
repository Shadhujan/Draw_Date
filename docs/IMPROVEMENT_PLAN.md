# Draw Date improvement plan

## Working agreement

- Work in `Shadhujan/Draw_Date`, on the case-sensitive `Dev` branch only.
- Commit and push tested, reviewable changes directly to `Dev`. The owner reviews and merges manually.
- Never push/merge `main`, promote a production deployment, change hosting settings, or apply database changes.
- Re-read remote `Dev` before each run. Preserve concurrent user changes; never force push.
- Maintain `docs/IMPROVEMENT_LOG.md` with the problem, change, checks, and limitations for each pass.
- A two-hour ChatGPT automation was created on 26 October 2026 (Asia/Colombo). It has no model/effort selector; GPT-6.1 Extra High could not be pinned.
- Stop manufacturing changes once the app is polished. After two complete reviews without actionable findings, pause the automation and report completion.

## Design direction

A private, romantic drawing date, with a warm kawaii art studio and cream/caramel bears. Keep pink and sage themes, a simple nickname invitation, existing art, and a canvas-first drawing experience. Use real-time Three.js selectively, layered light and soft physical motion. No pricing, fake claims, extra navigation, or feature clutter.

The owner's five uploaded references guided this pass: the current hero, two sunlit studio concepts, a transparent cuddling-bear image, and a broader studio concept. The existing repository already includes optimized bear and environment WebP assets. Preserve those original assets and do not copy third-party website artwork/code.

Research consulted on 26 October 2026:

- https://lusion.co/ — coordinated 3D, lighting, and interactive storytelling.
- https://lusion.co/projects/infinite_passerella/ — coherent materials and art direction.
- https://bruno-simon.com/?lang=en — real-time interaction as a discovery.
- https://threejs.org/docs/pages/WebGLRenderer.html — animation-loop lifecycle and disposal.

These are motion/art-direction references, not evidence about website budgets. Higgsfield's read-only model recommendation was checked; no generation or paid job was submitted. Existing art plus interactive meshes gives this pass a more useful result than a fixed video background.

## Latest pass status

The owner applied the first sunlit-hero patch to `Dev` as `004d298`. A second pass now builds on that exact version: an original, interactive Three.js miniature studio with animated bears, a pencil heart trace, and day/evening lighting. The original fluffy illustration is used on valid room-link invitation pages and remains the main hero’s graphics/loading fallback. Local browser checks cover rendering, motion lifecycle, actual context loss/restoration and the solo drawing/export flow.

The personal GitHub connection still rejects writes with HTTP 403 `Resource not accessible by integration`. Do not claim this second pass reached remote `Dev` or production. Apply the saved second-pass patch to the latest compatible `Dev` or repair write access, then verify the remote head before continuing. Preserve the paused automation status until the write blocker is resolved.

## Current verification priorities

1. Visually review the hero on desktop, 320/390px phones, and both themes. Preserve readable copy and reachable controls.
2. Exercise nickname validation, Enter submission, invitation entry, new-room action, and return to welcome.
3. Verify live reduced-motion changes, pause/resume, WebGL-disabled fallback, hidden/offscreen loops, and cleanup after theme changes or leaving the hero.
4. Smoke-test drawing, undo, guide selection, color changes, lasso and PNG export after welcome changes.
5. Review remaining collaboration/storage bugs with reproduction evidence. Real two-device Supabase admission, reconnect, and guest/host synchronization need separate runtime verification; never infer them from a successful build.

## Next safe passes

- Finish any preview visual/runtime gaps recorded in the log before expanding scope.
- Verify keyboard focus, touch targets, and contrast in the studio.
- Review large-board persistence, long strokes, and multipart sync with focused regression cases before changing protocols.
- Consider a separate lazy-loaded studio boundary if measured welcome load warrants it. Do not add libraries merely for novelty.
