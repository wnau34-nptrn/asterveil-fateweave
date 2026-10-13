import Phaser from 'phaser';

// Original generated artwork is scenery; it owns no combat state or hit zones.
export function drawRiftBackdrop(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Image {
  // The courtyard starts at 45% of the artwork. Frame that horizon at 27%
  // of the field so the playable formation has ground beneath every foot.
  const backdrop = scene.add.image(width / 2, height * .27, 'rift-ruins').setOrigin(.5, .45).setDepth(-1);
  const scale = Math.max(width / 1536, height / 768);
  return backdrop.setDisplaySize(1536 * scale, 1024 * scale);
}
