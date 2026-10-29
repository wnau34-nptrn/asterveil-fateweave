# ART-WORLD-CH1-MAP-001

Chapter 1 region-selection artwork for **Asterveil · Fateweave**. 22 October 2026, Asia/Bangkok. Artwork intake only; no runtime integration. PR targets `feature/fateweave-initial-prototype` and must remain unmerged.

## Files

| File | Size / role |
| --- | --- |
| `region_ch1.webp` | 1080×2340, opaque RGB painting; no baked text, UI or node markers |
| `region_ch1.json` | Ten node centres, camp centre, nine ordered route polylines, clear-ground rectangles, reveal territories and HUD safe rectangles |
| `region_ch1_fog.webp` | 1080×2340 RGBA cloud layer, genuine soft alpha; no terrain |
| `preview_390.png` | 390×960 phone composition; full map 390×845 between 64px header and 51px footer |
| `preview_1366.png` | 1366×1050 desktop composition with the same 390×960 portrait frame centred |
| `node_review.png` | 540×1170 unfogged review, cyan boxes show 120×120 image-pixel node ground areas at half scale; not a runtime asset |
| `PROMPTS.json` | Final generation and clearance-edit prompts; built-in image tool used |
| `export.py`, `render.cjs` | Mechanical image export and DOM preview compositor |
| `validation.json` | Export dimensions, byte sizes, alpha range, endpoint and Thai-label checks |

The taller preview canvases keep the full region and native-sized sample controls visible. Preview heights were not specified by the brief. The PC preview intentionally keeps the portrait game frame. The reference does not introduce a wide desktop layout or change gameplay scrolling rules.

## Palette and visual language

Warm emerald frontier and champagne paths transition upward through cool cyan stone and the darkest violet rift. Light comes from the top left. Materials and silhouettes distinguish locations alongside hue.

| Role | Colour target |
| --- | --- |
| HUD/deep shadow | `#08121f`, `#0d1c2e`, `#14243a` |
| Pale road and masonry | `#d9bf86`, `#f2d596` |
| Forest | deep petrol teal with emerald moss |
| Moon water / frozen threads / waterfalls | `#74d4ef` with silver-blue highlights |
| Poison | petrol water and acid-green pools |
| Ash fortress | charcoal, ember orange, muted red cloth |
| Fallen stars | copper grasses, lavender dust, cyan-white impacts |
| Rift | `#9454d6`, `#b59aff`, near-black violet |
| Preview cleared/current | `#68e5b6` / `#74d4ef` |

These are direction targets, not an indexed-palette restriction. New scenery was painted specifically for this region. References are this repository's `ART-WORLD-KEYART-001` on `art/art-world-keyart-001`, shipped `ruins.webp` and `world/tileset.webp`, the modern UI boards and the requested lore/master-plan/style documents. No artwork from another Asterveil project was used. The key-art overview was used for material and landmark continuity, not pasted into this painting.

## Node centres

Coordinates use the final 1080×2340 image, origin at top left, x rightward and y downward. `nodes` is an ordered array; `id` is the expedition identifier. The illustration's actual clearings determine these positions, rather than the original prompt's proposed layout.

| id | Place | x | y |
| --- | --- | ---: | ---: |
| 1 | ซากชายแดน | 315 | 2225 |
| 2 | เส้นทางป่าทึบ | 665 | 1815 |
| 3 | แนวรอยแยก | 329 | 1510 |
| 4 | ทะเลสาบเงาจันทร์ | 677 | 1383 |
| 5 | เหมืองผลึกร้าง | 430 | 1142 |
| 6 | บึงหมอกพิษ | 696 | 850 |
| 7 | ป้อมเถ้าถ่าน | 443 | 723 |
| 8 | นครลอยฟ้าที่ล่มสลาย | 720 | 520 |
| 9 | ทุ่งดาวตก | 506 | 355 |
| 10 | บัลลังก์รอยแยก | 703 | 192 |
| camp | ค่ายทหารรับจ้าง | 130 | 2205 |

The tent and campfire are painted beside the starting fort. There are no characters in the artwork. The final throne is deliberately empty so Vargoth remains runtime/story content. The mine uses luminous stranded mineral veins and old timber, while the separate rift scar uses sharp violet crystal fissures. The floating city's arches, gold-inlaid stone and cyan falls connect it to the shipped world backdrop.

`route` contains nine `{from,to,points:[{x,y},...]}` polylines; each begins/ends at the corresponding node centre and follows the painted road's bends. These are selection-screen presentation coordinates, not expedition movement/collision data. Draw a highlighted route in DOM/SVG only if desired; the pale travel road already exists in the painting.

Scale node, camp, route and mask geometry together with the image: `screenX = imageLeft + x * renderedWidth/1080`, likewise for y. Preserve aspect ratio and avoid cover-cropping. If the containing frame has another aspect ratio, include the contain-image offsets. Round only at the final CSS positioning step. Keep at least 44×44 CSS-pixel DOM hit targets even if the marker illustration is smaller. Labels should face inward and remain within the portrait frame.

## Fog layering

1. Paint the opaque map.
2. Above it, use one absolutely positioned full-image fog element. Its background is solid navy `#0d1c2e` followed by `region_ch1_fog.webp`, sized to the same image bounds. The backing prevents terrain leakage through the texture's deliberately transparent outer cloud wisps.
3. Mask that element to the **union** of `fogRect` territories belonging to locked places. Each rectangle is full width; neighbouring territories share exact horizontal boundaries halfway between successive node centres. These are simple reveal bands for this south-to-north linear route, not geographic biome boundaries. If integration needs shaped biome reveals, refine the masks without changing node centres.
4. Feather only the outside boundary of that union by 32 image pixels. Do not feather each adjacent band separately: seams between two locked bands should stay concealed. The texture has real alpha, so it can also be composited without the backing where partial atmospheric reveal is intended.
5. Above fog, draw live node circles, names, locks, cleared checks/stars, current selection and optional hard-mode badge. HUD comes last. Fog must not consume pointer events.

The preview state is node 1 cleared with three sample stars, node 2 current, node 3 opened, nodes 4–10 locked/fogged. Names remain visible as preview-only UI examples. The hard-mode badge is a presentation sample, not an unlock rule. The game supplies all real progression state; no new progression rule is defined here. Reduced motion can show reveals instantly; these assets require no animation.

## Process and validation

Built-in image generation produced the original painting and a separate transparent cloud bank. Targeted edits widened the route clearings. `PROMPTS.json` records the prompts. Mechanical Pillow resampling/export creates exact 1080×2340 WebP files; the generated native dimensions are recorded in `validation.json`, and upscaling is not claimed as additional painted detail. Colour-only WebP compression preserves the fog alpha channel. The two runtime rasters total 1,290,308 bytes (approximately 1.29 MB).

Chromium renders the preview's labels and controls as DOM over the image, using this repository's OFL Noto Sans Thai 400 and Kanit 600; the fonts are not copied into this package. Painting and cloud exports contain no text. Preview code does not ship in the game. To reproduce exports, run `python export.py MAP_SOURCE FOG_SOURCE` with Pillow, then `node render.cjs` with Playwright and Chrome installed. Both scripts write only inside this intake folder. The original generated sources remain in the image tool's output directory; final runtime exports are self-contained here.

Delivery checks: inspect the final painting and unfogged node review, verify exact raster dimensions and fog alpha, confirm nine route endpoints against all ten node centres, check Thai fonts/label bounds on phone and centred PC previews, and run `git diff --check` plus an added-files-only scope check. No gameplay code changed, so application tests are not required for this artwork-only intake. This package remains subject to visual intake review and is not a claim of runtime integration or owner approval.
