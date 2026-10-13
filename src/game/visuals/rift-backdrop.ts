import Phaser from 'phaser';

// Original generated artwork is scenery; it owns no combat state or hit zones.
export function drawRiftBackdrop(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Image {
  const backdrop = scene.add.image(width / 2, height / 2, 'rift-ruins').setDepth(-1);
  const scale = Math.max(width / 1536, height / 1024);
  return backdrop.setDisplaySize(1536 * scale, 1024 * scale);
}
