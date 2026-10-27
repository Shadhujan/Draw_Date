# Bear startup scenes

The startup now has three original, transparent, eight-frame animations inspired by the supplied couple drawings: **the love chase**, **a little cuddle**, and **a flower surprise**. The white bear has heart eyes and reaches for the caramel bear in the chase; the caramel bear runs with both paws raised. The other scenes show a cheek-to-cheek hug and a tiny daisy bouquet.

## Playback and loading

- Once per document opening/refresh, select one scene. Where session storage is available, exclude the previous scene so consecutive openings differ. Returning from a drawing room does not replay startup.
- Play a short 2.4-second intro while the real welcome module and its stylesheet load. Fade to the ready page over 300 ms. This small deliberate intro replaces the previous immediate-ready loader behavior.
- Skip intro or Escape clears the intro wait. If the app is still loading, the same artwork stays visible with an Opening label; an empty app is never revealed. Keyboard focus moves to the nickname when a user skips.
- Reduced motion shows a still frame and has no intro wait or movement. A live preference change clears the remaining wait. Hidden-page animations pause.
- The initial pencil/heart fallback and warm pink/sage styles are inline in HTML, before any module or image arrives. The selected artwork softly fades in when loaded. A failed image leaves the pencil visible and removes the intro wait. A delayed image never holds up the app.
- Only the selected atlas is fetched. The three WebP files together total 656,584 bytes; a startup downloads one 188–235 kB atlas, not all three. No animation library, video player, font or external image service is needed at runtime.
- Welcome mounts behind the startup with its root inert and hidden from assistive technology until ready. The optional Three.js scene starts after the intro is removed, avoiding simultaneous 3D compilation during the small animation. Existing illustrated fallback artwork remains available.
- App/script/stylesheet failures show a reload link. Loading beyond 12 seconds offers a reload link without falsely declaring a failure. Both keep the warm startup background. Short landscape error states prioritize the message and link.

`index.html` owns the independent first paint, sprite playback and startup controller. `App.tsx` signals real committed readiness. The React error boundary signals failure. `HeroAtmosphere.tsx` listens for `draw-date-startup-finished` only if startup is active and removes that listener on unmount. Existing nickname validation, room links, studio tools and paper-to-canvas entrance are retained.

## Artwork and adding scenes

Generated with the built-in image generation tool using the user-supplied drawings as style/character references. These are newly drawn poses, not cutouts of the supplied pictures. The final chase pass raises both caramel paws while preserving the eight-frame run cycle. Generated frames have slight hand-drawn variation; they are 2D sprite animation rather than a 3D character rig.

Final artwork files:

| Asset | Loop | Layout |
| --- | --- | --- |
| `public/startup/chase-v1.webp` | 1 second | 4 columns × 2 rows |
| `public/startup/cuddle-v1.webp` | 1.6 seconds | 4 columns × 2 rows |
| `public/startup/flowers-v1.webp` | 1.8 seconds | 4 columns × 2 rows |

Each atlas is 1600 × 640 pixels: eight 400 × 320 cells in reading order, with transparent margins. Technical processing crops equal source cells, trims common empty vertical space, fits each frame without stretching, and repacks the cells into this exact grid. CSS uses discrete steps, with no sliding between cells. To add another animation, keep that layout, add a versioned filename and caption to the HTML scene list, and optionally set a different loop duration. A newly versioned filename avoids stale cached art.

### Final prompt set

Shared brief: original kawaii white bear with dark rounded ears and caramel bear couple; dark chocolate hand-ink outlines, pink blush and soft flat color; transparent background; eight sequential frames in an equal 4-column, 2-row grid, with consistent camera, proportions, baseline and character placement; both full bodies safely inside each cell; no text, grid, watermark or backdrop; seamless return to frame one.

1. **Chase:** white bear on the left chasing caramel bear to the right, heart-shaped eyes, delighted open smile and both arms reaching open toward the partner. Caramel glances back playfully, blushing with both paws in the air. Eight alternating run-cycle leg poses, subtle ear/body bounce and small hearts around white. The final targeted edit changes only the caramel front arm to a second raised paw and preserves the rest of the sheet.
2. **Cuddle:** white bear on the left and caramel on the right, hugging cheek to cheek. Happy closed eyes and pink cheeks; squeeze closer, gently squash cheeks, sway back together and settle into the starting embrace. Feet remain attached and planted; little hearts rise inside each cell.
3. **Flowers:** white bear on the left facing caramel on the right. Caramel shyly offers a small pink-wrapped bouquet of white daisies. White has heart eyes and paws lifted in delight; lean toward the flowers, gently bounce ears, then settle back. Bouquet remains visible and consistent across frames; no costume or angry expression.

## Verification

Production TypeScript/Vite build and local Chromium checks: all three actual sprite strips advance; only the chosen strip is requested; first-paint fallback, readiness gate, Skip/Escape and focus, 2.4-second intro, no consecutive scene repeats across repeated openings, eight widths in both themes, short phone/landscape layouts, initial/live reduced motion, slow app loading, failed atlas/script/stylesheet recovery, and the invitation's nickname-to-paper-to-studio entrance. Follow-up checks cover delayed/missing art, blocked storage, hidden-page pause, long-load reload, and optional 3D initialization after startup plus its camera entrance. Browser rendering uses software WebGL; physical-device smoothness is not measured. No database, live collaboration, remote branch or deployment changes are part of this pass.
