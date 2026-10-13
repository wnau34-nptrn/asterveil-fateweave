import Phaser from 'phaser';
import { palette } from './palette';

// Original 2D geometry inspired by the supplied world/battle references.
// These tiles, bridges and waterfalls are scenery, not expedition entities.
export function drawRiftBackdrop(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(-1);
  const compact = width < 600;
  g.fillGradientStyle(palette.sky, palette.sky, palette.night, 0x26375c, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(palette.gold, 0.08);
  g.fillCircle(width * 0.43, height * 0.08, compact ? 60 : 115);
  g.fillStyle(palette.mist, 0.1);
  for (let i = 0; i < 5; i++) g.fillEllipse(width * (0.09 + i * 0.23), height * (0.1 + (i % 2) * 0.08), compact ? 100 : 240, 14);

  const sites = compact ? [0.06, 0.48, 0.97] : [0.06, 0.38, 0.64, 0.96];
  sites.forEach((fraction, i) => {
    const x = width * fraction;
    const y = height * (0.19 + (i % 2) * 0.045);
    const span = compact ? 35 : 65;
    g.fillStyle(palette.ruin, 0.7);
    g.fillTriangle(x - span, y + 20, x + span, y + 20, x - 8, y + 112);
    g.fillStyle(palette.mist, 0.37);
    g.fillEllipse(x, y + 10, span * 2, 23);
    g.lineStyle(2, palette.gold, 0.3);
    g.lineBetween(x - span, y + 4, x + span, y + 4);
    // Ruined portal and a broken column, drawn with a simple stone lintel.
    g.fillStyle(palette.ruinLight, 0.55);
    g.fillRect(x - 20, y - 42, 9, 47);
    g.fillRect(x + 11, y - 42, 9, 47);
    g.fillRect(x - 24, y - 47, 48, 9);
    g.fillRect(x + 29, y - 22, 8, 25);
    g.lineStyle(1, palette.gold, 0.3);
    g.lineBetween(x - 24, y - 47, x + 24, y - 47);
    g.fillStyle(palette.grass, 0.65);
    g.fillEllipse(x - 23, y + 7, 24, 9);
    g.fillEllipse(x + 31, y + 10, 19, 8);
    // Static water ribbons fade into the mist; no perpetual animation.
    for (let ribbon = 0; ribbon < 3; ribbon++) {
      const wx = x - 8 + ribbon * 5;
      for (let segment = 0; segment < 4; segment++) {
        g.fillStyle(palette.cyan, 0.2 - segment * 0.04);
        g.fillRect(wx, y + 19 + segment * 31, 3, 31);
      }
    }
    if (i > 0) {
      const previousX = width * sites[i - 1]!;
      g.lineStyle(5, palette.ruinLight, 0.22);
      g.lineBetween(previousX + span, y + 8, x - span, y + 8);
      g.lineStyle(1, palette.gold, 0.24);
      g.lineBetween(previousX + span, y + 5, x - span, y + 5);
    }
  });

  // A perspective tiled terrace suggests ancient ruins without a battle grid.
  const floor = height * 0.39;
  g.fillStyle(palette.stone, 0.42);
  g.fillRect(0, floor, width, height - floor);
  g.lineStyle(1, palette.mist, 0.11);
  for (let i = 0; i < 10; i++) g.lineBetween(0, floor + height * (i / 10) ** 1.7, width, floor + height * (i / 10) ** 1.7);
  const divisions = compact ? 7 : 14;
  for (let i = -1; i <= divisions; i++) {
    const x = width * i / divisions;
    g.lineBetween(width / 2 + (x - width / 2) * 0.72, floor, x, height);
  }
  // Original foreground masonry frames an open battle courtyard.
  for (const side of [0, 1]) {
    const x = side ? width - width * 0.055 : 0;
    const wallWidth = width * 0.055;
    g.fillStyle(0x142338, 0.82);
    g.fillRect(x, 0, wallWidth, height * 0.67);
    g.fillTriangle(x, height * 0.67, x + wallWidth, height * 0.67, side ? width : 0, height * 0.91);
    g.lineStyle(1, palette.mist, 0.22);
    for (let row = 0; row < 8; row++) {
      const y = height * row / 12;
      g.lineBetween(x, y, x + wallWidth, y + 3);
      g.lineBetween(x + wallWidth * (row % 2 ? 0.35 : 0.7), y, x + wallWidth * (row % 2 ? 0.35 : 0.7), y + height / 12);
    }
  }
  for (const fraction of [0.21, 0.64]) {
    const x = width * fraction;
    const y = height * 0.08;
    g.lineStyle(2, palette.gold, 0.35); g.lineBetween(x, y, x, height * 0.37);
    g.fillStyle(0x8d3046, 0.44); g.fillRect(x + 3, y + 7, width * 0.024, height * 0.14);
    g.fillTriangle(x + 3, y + height * 0.14, x + width * 0.024, y + height * 0.14, x + width * 0.011, y + height * 0.18);
  }
  // Purple rift shards stay at the enemy edge, away from controls and labels.
  for (let i = 0; i < 4; i++) {
    const x = width * (0.86 + (i % 2) * 0.1);
    const y = height * (0.13 + i * 0.13);
    g.fillStyle(palette.corruption, 0.13);
    g.fillTriangle(x - 14, y + 26, x + 7, y - 22, x + 17, y + 29);
    g.lineStyle(1, palette.corruption, 0.32);
    g.lineBetween(x + 7, y - 22, x, y + 22);
  }
  return g;
}
