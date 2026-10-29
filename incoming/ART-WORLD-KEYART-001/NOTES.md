# ART-WORLD-KEYART-001 — chapter 1 environment concepts

Status: CONCEPTS ONLY — awaiting owner visual approval. 2026-10-22 (Asia/Bangkok).

Eight original environment directions for maps 2 and 4–10. No runtime integration is included. These paintings propose palette, material, landmarks and mood; they do not define final map geometry, collisions, encounters or new mechanics.

## Review the package

- `overview.png`: all eight paintings side by side, 3840×270. Left to right: 2, 4, 5, 6, 7, 8, 9, 10.
- `review.png`: full-package contact sheet, 1152×3200. Top to bottom uses the same order. Each row shows painting, four prop sketches, native-size tile mood and palette.
- `keyart_<n>.png`: 1920×1080, single opaque mood painting; high top-down 3/4 camera, visible front faces and lighter traversable surfaces.
- `landmarks_<n>.png`: 1536×1024, four opaque prop studies on neutral backing, read top-left, top-right, bottom-left, bottom-right. These are concept sheets, not transparent sprites.
- `tile_mood_<n>.png`: 192×192, 4×4 study with 48×48 cells. View at 100% for mobile-scale readability. The painted sheets demonstrate material/value grouping; they are not seamless production atlases, validated autotiles or collision maps.
- `palette_<n>.png`: 1280×224, eight exact flat swatches with hex labels. Hex labels are the sole image-text exception, required by the palette deliverable. Paintings, prop sheets, tile samples and overview contain no text.
- `PROMPTS.json`: final generation prompts and edit instructions. Built-in image generation was used; no CLI image API.
- `validation.json`: final PNG dimensions, sRGB colour space and byte sizes.

## Directions and four prop studies

| Map | Direction and lore connection | Props in reading order |
|---|---|---|
| 2 เส้นทางป่าทึบ | Pale moss-sand trail through dark teal thorn growth. The old forest is wounded by the rift, not an enemy military base; its shrine should feel quiet and recoverable. | Twisted thorn tree; moss shrine; root arch; eroded waystone |
| 4 ทะเลสาบเงาจันทร์ | Pearl stone crossings over silver mirror water, with warm floating lanterns. Reflections suggest memory without depicting a new scene or character. | Reflecting pool; stone landing; broken moon shrine; lantern cluster |
| 5 เหมืองผลึกร้าง | Slate walls and pale mining dust around abandoned rails. Cyan/lilac veins are frozen fate-thread bundles; retain their stranded structure rather than generic jewel spikes. | Mine entrance; abandoned ore cart; thread-vein rock; broken rail section |
| 6 บึงหมอกพิษ | Petrol-teal water and acid-green pools frame a pale raised plank route. The alchemical apparatus supports the swamp experimentation described in the lore. Mist stays off the walkable value band. | Stilt hut; bubbling pool; reed bank; potion still |
| 7 ป้อมเถ้าถ่าน | Charcoal walls enclose an ash-light courtyard, embers and muted red war cloth. Banners use invented geometric insignia without readable writing. | Burnt gate; courtyard platform; war banner; ember ruin |
| 8 นครลอยฟ้าที่ล่มสลาย | The old fate-weavers' abandoned city: blue-violet stone, gold geometry, broken arches, inverted floating foundations and cyan falls. Adapt the shipped backdrop's architecture to the higher map camera. | Gold-inlaid plaza; waterfall island; broken colonnade; fractured circular platform |
| 9 ทุ่งดาวตก | A dusk plain with copper grasses, lavender dusty paths and dark impact rims around cyan-white fallen stars. Empty, exposed and reflective before the final confrontation. | Impact crater; star-stone; glass shard cluster; hollow meteor rock |
| 10 บัลลังก์รอยแยก | An empty throne inside violet emptiness, pale fractured platforms, severed filaments and broken thread crossings. The concept leaves the boss and all characters out. | Throne platform; broken bridge platforms; rift well; suspended thread arch |

## Palette and material contract

The eight swatches read left to right as deep occlusion, dark wall/body, mid material, secondary surface, light floor, accent, accent, supporting accent. Exact hex codes are on the palette sheets. These are art-direction targets, not a claim that every painted pixel is limited to eight colours.

Keep walkable floor/planks/platforms visibly lighter than dense foliage, cliffs and void. Distinguish textures as well as hue: thorn loops, mirror water, parallel frozen strands, reeds/planks, ash and char, gold-inlaid slabs, impact glass, severed bridges. Cyan/lilac accents connect the chapter; local material and silhouette identify each expedition.

For later square-grid production, straighten routes onto north/south/east/west cells; do not implement the paintings' curves as diagonal movement. Preserve top-left light, grounded shadows and bottom-centre anchors. Large scenery should sit behind the clear route. Prop studies show silhouette and material only; transparent cutouts, overhang masks and exact anchors remain future production work after approval.

Map 8 deliberately keeps the existing backdrop's masonry, champagne inlays, tall broken arches and cyan waterfalls while lifting the camera. Pale paths are a readability adaptation; this does not replace or recolour `ruins.webp`.

## Sources and process

Read the chapter lore draft, master-plan map table, world style guide and original world-map handoff from the requested base branch. Visual references are this repository's shipped world tile/decor/landmark art and `public/assets/art/ruins.webp`. Historical names in older reference documents were not carried into this package. No art, names or content from other games or projects was used.

Original concepts generated with the built-in image tool, followed by visual review and targeted frozen-thread corrections for map 5. PNGs were mechanically resized/exported in sRGB to the delivery dimensions; larger export dimensions do not imply extra native painting detail. Palettes were assembled deterministically so labels and flat colours match exactly. Overview and review sheets are mechanical composites of the delivered images.

## Validation and owner review

Dimension checks cover all 34 PNGs: eight paintings, eight palettes, eight prop sheets, eight native tile samples and two review sheets. The contact sheet and map 5 corrections were visually inspected for subject, style, path contrast and unwanted writing. No application code changed, so gameplay tests are not relevant to this concept intake. Submission checks include `git diff --check` and an added-files-only scope check.

Owner review should choose or revise each map's palette, landmark silhouettes and mood before tilesets and battle backdrops are produced. No concept is marked approved by this delivery. Leave the PR unmerged.
