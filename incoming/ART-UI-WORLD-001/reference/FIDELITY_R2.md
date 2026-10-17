# Revision 2 visual verification

Concepts: `mockups/concept-fullscreen-390x844.png`, `concept-fullscreen-1366x768.png`.
Final references: `mockups/world-390x844.png`, `world-844x390.png`, `world-1366x768.png`; additional camp, goals, high-danger and 320 px states.

Both concept and browser screenshots were inspected with view_image in the same review pass. The generated concepts were normalized to the requested 390×844 / 1366×768 dimensions; original high-resolution generation files remain untouched. Final PNGs come from live Thai HTML/CSS in Playwright Chromium. Browser plugin was unavailable. All 11 viewport sizes were checked for world/title/battle; reference/validation.json records the 33 checks and interaction evidence.

| Point | Concept evidence | Final implementation / disposition |
|---|---|---|
| Full-screen map | Art reaches all four edges; no reserved HUD column | Map rectangle equals viewport on every checked world size. No world sidebar, tabs, map-frame border or horizontal partition. |
| Directional input | Four transparent circular arrows at lower left, empty centre | 46 px phone / 60 px desktop arrows, centre is decorative only; no joystick or new movement behavior. |
| Opposite action | Circular talk icon at lower right | Original talk SVG and 76/88 px contextual action; camp/rest available, otherwise disabled. Local label backing supplies readable Thai without making the entire button opaque. |
| Material | Navy glass, narrow light edges, restrained cyan/gold | .80 info glass, .24 control glass, white .28/.62 edges; no enclosing control panel or large filigree frame. |
| Party hierarchy | One slim four-hero row at upper edge | Four summaries, second upper row on portrait; original portraits on desktop, omitted on portrait as required. HP numbers and bars remain. |
| Objective disclosure | Compact progress capsule beneath location/party | `ชนะผู้คุมรอยแยก · 2/4` opens all four original checklist items and the steps/win/loss line. No persistent goal column. |
| Typography/copy | Concept has illustrative English/Latin labels | Final uses live Thai Kanit/Noto Sans Thai, >=12 px. This is a required language adaptation, not a copied raster interface. |
| Scene asset treatment | Scenic continuous road, floating islands, empty party beacon | Intentional constraint: real mockups use the original 128 px square-tile asset vocabulary and unchanged Knight portrait token. The concept is not a new production level/background; its decorative road/island geometry cannot replace the existing tile renderer/collision rules in this art-only task. |
| Composition repairs | Avoid repeated decorative rows and obstructed central playfield | Decor uses a stable independent coordinate hash, all six biome props can appear, larger thicket groups sit away from the party/clear central corridor. No assets or collision rules were changed. |
| State behavior | Current/available/disabled and disclosures remain light | Info→restart confirmation→Escape, goals disclosure, camp visual feedback, unavailable-context state, skill popover and field-target selection pass. |

Allowed-copy review: world name, zone, next-step chance/safe label, four hero names/HP, current objective/count, original event text, user-requested interaction label, existing camp/rest label and availability caption. Full original goals/stats/rules/restart remain in disclosures. No currency, shop, AUTO, NPC cast or additional game mechanism appears.

Layout, control placement, HUD material, hierarchy and live Thai implementation have been verified against the revised specification. The continuous scenic concept art is explicitly illustrative; the final rendered map intentionally preserves the shipped tile/portrait assets rather than claiming to reproduce that illustration as a playable level. Physical Safari/iOS and actual game integration remain outside these static-reference checks.
