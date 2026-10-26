# Drawing dates: lesson pack

This pack adds eight original guided drawings and corrects the Bunny buddies guide. It starts from Dev `36a84ff` and is independent of the studio/keepsake polish patch.

| Drawing | Steps | Focus |
| --- | --- | --- |
| Love note | 5 | Curves, a face and sparkles |
| Flower date | 5 | Stems, leaves and petals |
| Bunny buddies | 5 | Matching ears, centered face and a heart hug |
| Kitten cuddles | 5 | Two characters with ears, expressions and tails |
| Teddy hug | 5 | Rounded shapes, a muzzle and paws |
| Lovebirds | 5 | Bird silhouettes, wings and a shared branch |
| Berry sweet | 5 | Fruit shapes, leaves and repeated seed marks |
| Tea for two | 5 | Cups, handles, saucers and steam |
| Cupcake date | 5 | Wrappers, frosting and small details |
| Butterfly wishes | 5 | Mirrored wings and matching patterns |
| Moonlit wishes | 5 | A crescent, cloud, stars and sparkles |

Freestyle stays available without guided steps. Select a drawing from Pick a little doodle, follow the highlighted step, and use the existing previous/next controls. Drawing selection retains the existing confirmation before clearing ink.

## Structure

- `src/types.ts`: the canonical `TEMPLATE_IDS` list and derived type.
- `src/drawingLessons.ts`: original path/circle geometry, names and instructions in 1000 × 700 board coordinates.
- `src/templates.tsx`: the common thumbnail/guide renderer. The full guide and previews keep their proportions.
- `src/guidedLesson.ts`: step metadata derived from the same definitions; existing validation and proximity-based tracing coverage.
- `src/board.ts`: recognizes IDs using the canonical list when loading or receiving board state.

The bunny is centered at x=500. Its five step groups mirror geometrically around that line. This corrects the reference guide; it is not an automatic mirror-ink drawing mode.

## Compatibility and checks

The incremental patch applies to Dev `36a84ff` and after the prior studio/keepsake patch. Existing drawing pixels are preserved; old template IDs remain recognized. After deploying the updated app, both participants should refresh before choosing a new lesson: an older client does not know the eight new IDs.

Validation includes a production build, all 55 step groups, runtime validation/storage round trips, bunny mirror sampling, every lesson's step navigation, eight responsive widths in both themes, and a drawing/fill/undo/export/reload flow. A second build and phone browser flow also passed with the prior studio/keepsake patch applied, including new lesson selection and both save styles. Local Chromium does not establish real two-device synchronization or physical-phone performance.

## ArtWorkout inspiration

Reviewed the official website and developer's App Store description on 27 October 2026:

- https://artworkout.app/
- https://apps.apple.com/us/app/artworkout-learn-how-to-draw/id1564657118

The useful ideas for this pack are short guided lessons, varied subjects, clear step prompts and encouraging feedback. All vector artwork here is newly authored. The current percent-traced indicator measures nearby guide coverage; it does not analyze stroke quality, steadiness or confidence like the separate features described by ArtWorkout.

Possible later additions are a demonstration of the current stroke, zoom/pan for detailed phone drawing and a small collection of completed lessons. These are not implemented by this pack.
