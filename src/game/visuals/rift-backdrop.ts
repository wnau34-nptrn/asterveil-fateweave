// Original generated artwork is scenery; it owns no combat state or hit zones.
// The battle painting (1536×1024) is drawn behind the whole battle view, not inside the canvas, so the
// HUD floats over one continuous scene. The courtyard horizon (45% down the artwork) is framed at 27%
// of the field so every fighter's soles land on the floor, as when the canvas drew it.
export interface Box { x: number; y: number; w: number; h: number }
export function riftBackdropFrame(view: { w: number; h: number }, field: Box): Box {
  const ax = field.x + field.w / 2, ay = field.y + field.h * .27;
  // At least the field's own cover scale, and large enough to reach every edge of the view from the anchor.
  const scale = Math.max(field.w / 1536, field.h / 768, ax / 768, (view.w - ax) / 768, ay / (1024 * .45), (view.h - ay) / (1024 * .55));
  const w = 1536 * scale, h = 1024 * scale;
  return { x: ax - w / 2, y: ay - h * .45, w, h };
}
