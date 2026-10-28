# ART-WORLD-MAP-001 — แอสเตอร์เวล

Concept for owner review only. Six proposed chapter regions; geography, names, threats and chapter order beyond chapter 1 are not canon or approved. No runtime atlas or integration. Prepared 2026-10-22 (Asia/Bangkok).

## Reading the proposal

The southwest frontier contains **all ten locations of chapter 1**. Releases A, B and C progressively deliver that one chapter (maps 1–3, 4–7 and 8–10); they are not separate world regions. Release D adds online systems, not a promised chapter. Regions 2–6 reserve space for later chapters without inventing a release schedule.

The violet scar is รอยแยก: it begins at the southwest frontier, passes its local throne site and branches toward the continental heartland. The chapter-1 throne remains in the frontier; the central city is a separate, unnamed future location.

## Region proposals

Numbers refer only to `regions.png`. Working descriptions below are discussion names, not lettering on the paintings.

| Region | Biome and palette | Mood and signature landmark | Possible threat for owner selection |
|---|---|---|---|
| 1 — Southwest frontier / chapter 1 | Moss-green woods, slate ruins, silver water; cyan crystal and restrained violet scars | Wounded but recoverable; ten miniature landmarks along a local trail | The established chapter-1 invasion and the four commanders of วาร์กอธ; follow the lore draft rather than adding another faction |
| 2 — Northwest highlands | Snow, blue slate and pale glacial water | Isolated, austere; a split mountain above a small unnamed settlement | Frozen fate-threads could trap travellers in repeating footsteps; optional proposal |
| 3 — Northern amber steppe | Ochre grasses, copper ridges, dusty gold | Exposed, contemplative; a broken circular observatory | A migrating storm could erase routes and awaken ancient watchers; optional proposal |
| 4 — Northeast autumn forest | Burgundy canopy, dark roots, muted gold | Sacred, uneasy; a giant root cathedral | Root networks could bind the memories of whole settlements together; optional proposal |
| 5 — Southeast tidal delta | Turquoise channels, jade reeds and pale sand | Luminous, slowly drowning; a stepped tidal temple | Tides could carry fragments of the rift into inhabited waterways; optional proposal |
| 6 — Central heartland | Pale-gold fields, ivory stone, cool shadows | Apparently safe, increasingly fragile; an unnamed ring-walled city and spindle tower | The spreading scar could sever the threads holding the city together; optional proposal, not a revealed final chapter |

Chapter order 2–6 can change. Each region offers one strong palette and landmark silhouette for eventual chapter selection; region 1 intentionally contains multiple miniature biomes because it covers the complete first chapter.

## Chapter-1 miniature checklist

These are visual cues, not numbered map pins or guaranteed final travel geometry:

1. ซากชายแดน — ruined border keep at the outer southwest coast.
2. เส้นทางป่าทึบ — huge twisted tree and thorn woodland.
3. แนวรอยแยก — narrow violet rupture / gate.
4. ทะเลสาบเงาจันทร์ — silver lake with crescent shrine.
5. เหมืองผลึกร้าง — mine entrance and cyan thread-like crystal veins.
6. บึงหมอกพิษ — green marsh and stilt alchemy hut.
7. ป้อมเถ้าถ่าน — charred fortress with ember accents.
8. นครลอยฟ้าที่ล่มสลาย — small broken floating city, gold arches and cyan falls.
9. ทุ่งดาวตก — meteor meadow and impact crater.
10. บัลลังก์รอยแยก — small empty throne on violet fractured platforms near the peninsula neck.

## Sources and process

Read `docs/LORE_CHAPTER1_TH.md` and releases A–D of `docs/MASTER_PLAN_TH.md` from the requested base. The chapter-1 map intake was absent from that base. The separate local `world-keyart-work/incoming/ART-WORLD-KEYART-001/` package supplied the reviewed painting reference: its overview, map-8 painting and notes. That package is reference only and is not added by this PR.

All geography is newly generated for this project. No artwork or content from another project was imported. Built-in image generation was used; final prompts are recorded in `PROMPTS.json`. Delivery export/crop dimensions and process details are recorded below after visual review. Exact export dimensions do not imply native 4K brush detail.

Owner review should choose or revise regional biomes, landmarks, threats and future chapter order. This submission grants no visual approval. Keep the PR unmerged.

## Delivered files and visual review

- `world_concept.png`: 3840×2160, full-colour landscape concept.
- `world_concept_fog.png`: 3840×2160, the same geography with future regions under dense pearl-blue cloud banks; faint landmark silhouettes hint at future destinations. All ten chapter-1 miniatures remain clear.
- `world_portrait.png`: 1080×2340, a true crop of the original painting, focused on the western frontier and the scar. Native crop bounds are left=165, top=0, right=599, bottom=941 in the 1672×941 source. The crop deliberately loses the eastern continent and some edge landmarks. A future phone chapter-select would need panning or a different overview zoom; neither interaction is implemented by this concept.
- `regions.png`: 3840×2160, six closed dashed region boundaries and the numerals 1–6 only. Borders are discussion aids, not political or gameplay boundaries. The small offshore islets remain decorative, unassigned land.
- `PROMPTS.json`: final generation/edit prompts and the crop operation.
- `validation.json`: PNG decode, exact dimensions, RGB/sRGB export, byte counts and SHA-256 hashes.

The three landscape paintings were returned at 1672×941 and exported with Lanczos resampling to the requested 3840×2160. The portrait is enlarged from its narrow source crop; this is an owner-review readability study, not newly painted high-resolution phone detail. Fog and numbered outlines were made with the built-in image editor; these are concept variants, not guaranteed pixel-identical production layers.

Visually inspected the original, fog, numbered region view and portrait crop. Checked the ten southwest landmark cues, six different palette/landmark groups, southwest-to-centre violet scar, clear chapter-1 area beneath the fog boundary, and absence of writing outside the six region numerals. The stepped coastlines and detached ruins are painterly geography, not traversable tile or collision data. The narrow portrait preserves recognizable silhouettes but cannot show the whole continent or every chapter-1 landmark at once.

No gameplay tests are needed for this image-only intake. Submission validation also checks whitespace, PNG dimensions/decoding and that every changed file is a new addition under this intake directory. Handoff notes stay here to honor the requested file scope.
