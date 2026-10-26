# Plush teddy asset

The cream teddy was authored for Draw Date in Blender 5.2 using the owner's fluffy-bear reference. The caramel partner shares its geometry and normal texture, with separate material tints. No third-party model or paid model-generation output is bundled.

## Shape and source

- Approved head, smiling embroidered eyes, muzzle and pink cheeks retained.
- Hips, thighs and feet are one continuous seated-body volume. Core head/body/ear/nose surfaces were welded and capped after simplification to prevent pole holes.
- Head and arm pivots support gentle idle and love-reaction motion without deforming the approved face.
- Short fibre geometry and a packed normal texture give a velour finish. This remains shorter and smoother than the original fluffy illustration.
- The incremental deliverable includes the editable Blender source. Private editor/project references are intentionally omitted from repository files.

## Website asset

`public/hero/cream-teddy-web.glb` is 3,961,632 bytes, compared with the earlier 26,735,028-byte appearance prototype. Its complete presentation export has approximately 69,458 triangles, compared with 593,138 before optimization. The website takes only `RIG_cream_teddy`; it discards the exported presentation lights and plinth.

Both bears use one request and share geometry/texture buffers. Caramel materials are cloned and tinted independently. The normal texture is embedded, with no decoder/CDN dependency. The optional GLTF loader and room/model code stay lazy-loaded.

Expected character nodes: `RIG_cream_teddy`, `RIG_head`, `RIG_left_arm`, `RIG_right_arm`. The asset contains no standalone turntable animation. The room controls the poses.

The original fluffy illustration remains on invitations and serves as fallback when WebGL or the model cannot load. Paused/reduced-motion scenes retain a still miniature. Hidden/offscreen loops stop; renderer cleanup also handles model loads that finish after leaving the welcome screen.

## Verification limits

Local software-WebGL Chromium covers rendered layout and behavior. Physical-phone GPU/frame-rate/battery behavior and real two-device collaboration remain unverified. The high-detail prototype remains available separately and is not loaded by the app.
