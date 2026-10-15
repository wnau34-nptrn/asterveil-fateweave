# Art placement rules: where every image appears in the game

Every Codex art task for Asterveil · Fateweave must follow these rules. They describe how the game actually places, scales, flips and overlays each image, measured from the current code (`src/game/scenes/BattleScene.ts`, `src/ui/*.css`). Art that ignores them will look wrong in the game even if it looks right on its own.

## 1. Battle field (most important)

```
 LEFT HALF = our mercenaries                    RIGHT HALF = enemies
 (face RIGHT  →)                                (face LEFT  ←)

   [back-left]                                        [enemy back]
           [front-left]          ──►  ◄──
   [back-left]                                [enemy front / big]
           [front-left]
```

- **Mercenaries stand on the left half** (x = 14–39% of the field) and **always face right**, toward the enemies. Draw a 3/4 view looking right, like the existing Knight/Duelist/Mage/Priest in `public/assets/art/units.webp`.
- **Enemies stand on the right half** (x = 70–85%) and **always face left**, toward the party, like the existing Raider and Brute.
- **The game never mirrors battle sprites.** A sprite drawn facing the wrong way stays wrong, so the facing in the file is final.
- **Layout per side:**
  - Our side has 4 slots in two staggered pairs: back-left high (y ≈ 48% and 77%) and front-left lower and further right (y ≈ 59% and 90%).
  - The enemy side has two positions:
    - a back position (x 85%, y 51%) for normal-size foes;
    - a front position (x 70%, y 81%) for the large foe.
- **Anchor at the soles.** Each frame is placed by the sole baseline (`footY`), not the image centre. The game draws its own contact shadow, selection ring and target ring as ellipses around the feet. Do not paint shadows, rings or ground under the feet.
- **Display size.** A square frame is scaled to:

  | Screen | Normal unit | Large foe |
  |---|---|---|
  | Phone portrait | ~100 px | ~120 px |
  | Compact | ~80 px | ~110 px |
  | Desktop | ~145 px | ~215 px |

  Faces, weapons and silhouettes must read at **80–100 px**.
- **Text overlays.**
  - Below the feet: the name label (+14 px), a 5 px HP bar (+24 px) and HP text (+35 px). Keep nothing important at the very bottom edge.
  - Above the figure: the game places small status marks (◇ mark at the left shoulder, ◆ intent at the upper right). Keep the top-right corner of enemy frames calm.
- **Dimming.** Actors not involved in the current turn are dimmed to 55% opacity, and fallen ones to 28%. Strong value contrast keeps them readable when dimmed.
- **Tap area.** The tap area is the lower 90% of the frame around the body centre. The figure should fill the frame width reasonably (about 60–80%), not be a thin sliver.

## 2. Portraits

- Square frames that the game crops in several ways:
  - 32–48 px **rounded squares** on cards and in the SPD queue;
  - 40 px **circles** in lists and the party token.
- Keep the face centred in the upper-middle third, with the eyes at about 40% height.
- Portraits face the same way as the character's battle frame (mercenaries look right, enemies look left).
- Portraits have a painted background (not transparent).

## 3. Exploration map (tile size T = 36–64 px depending on screen)

- **Floor tiles:** 128 px source, shown at 1T.
- **Decor:** 1T, bottom-centre anchor.
- **Landmarks:** 2T, bottom-centre anchor, standing on the tile's bottom edge.
- **Party token:** 1.3T, bottom-centre anchor. It shows a circular portrait crop in a frame.
- **Chests:** about 0.75T, centred slightly above the tile's bottom edge. Closed and open must be obvious at 27–48 px.
- **Sprites taller than 1T overlap the tile above them.** Keep the top part of tall sprites light, so the tile behind stays readable.
- **No text** in any map art. Fog draws over unexplored tiles.

## 4. Lobby camp scene

- **Scene band:** the scene sits in a horizontal band:
  - about 2.4:1 on phones and up to 4.7:1 on desktop;
  - in short landscape, a side panel about 280 px wide.
- Characters stand or sit on a ground band in the lower third, around a central fire.
- **Facing in the lobby:**
  - Characters **left of the fire** use the frame as drawn (facing right).
  - Characters **right of the fire** are **mirrored by the game** to face the fire.
  - So lobby poses must stay correct when flipped horizontally: no text, letters or one-sided emblems that would read backwards. A weapon switching hands is acceptable.
- Up to 8 characters are shown, with nearer ones larger (scale 1.0 front, 0.75 back).
- Pose frames use the same 512 px size and sole/seat baseline as the battle frames, so they can swap without shifting.

## 5. General

- Transparent backgrounds without halos for every sprite (battle frames, poses, decor, chests). Portraits are the only images with painted backgrounds.
- Never bake Thai or Latin text, numbers, stars, prices or UI into images. The game renders all of that in live HTML.
- Every new frame records its baseline in the JSON frame map (`footY`, and `seatY` for sitting poses).
- Review sheets must show the art **at its real in-game size and position**, not only large on a neutral background:
  - a battle mock with mercenaries on the left facing right and enemies on the right facing left;
  - a map mock at 48 and 64 px tiles;
  - a lobby mock with left and right (mirrored) placements.
