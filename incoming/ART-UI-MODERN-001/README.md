# Asterveil · Fateweave — modern UI boards

ART-UI-MODERN-001 · Luminous Veil · 21 October 2026. Design references for a DOM/CSS rebuild, using existing game artwork and readable self-hosted Thai fonts.

| Board | PNG pixels | Contents |
| --- | --- | --- |
| [01_character_equipment.png](01_character_equipment.png) | 780×1688 | Six-slot paper doll, bag, delta card, wear/remove |
| [02_item_detail_compare.png](02_item_detail_compare.png) | 780×1688 | Item sheet, set, quality bars, comparison/actions |
| [03_character_overview.png](03_character_overview.png) | 780×1688 | Hero, EXP ring, stars, stats, roles |
| [04_skill_tree.png](04_skill_tree.png) | 780×1688 | Three branches, four tiers, node types, three equipped skills |
| [05_forge.png](05_forge.png) | 780×1688 | Icon modes, central item, result, costs, confirm |
| [06_lobby_hub.png](06_lobby_hub.png) | 780×1688 | Camp/NPC hotspots, currencies, chosen map/depart |
| [07_map_hud.png](07_map_hud.png) | 780×1688 | Existing tile art, floating HUD, party, D-pad/context/bag |
| [08_battle_hud.png](08_battle_hud.png) | 780×1688 | SPD, intent, party HP, four command cells/cooldown |
| [09_rewards_summary.png](09_rewards_summary.png) | 780×1688 | New loot, resources, EXP progress |
| [10_hire_board.png](10_hire_board.png) | 780×1688 | Existing recruit art, role cards and hire price |
| [01_character_equipment_pc.png](01_character_equipment_pc.png) | 2732×1536 | Requested optional wide equipment reference |
| [components_sheet.png](components_sheet.png) | 2732×2000 | Shared components, states, rarity, tokens, feedback |

Read [NOTES.md](NOTES.md) for design decisions, tokens, sizes, state/animation contracts and integration boundaries. Values are illustrative; the current game remains authoritative. The optional wide PC reference and future skill-tree arrangement do not change existing gameplay/layout rules.

Editable source: [boards.html](boards.html), [boards.css](boards.css), [render.cjs](render.cjs). Open the HTML in place within the repository so relative source-art/font URLs resolve. It is a static design gallery, not a playable prototype.

Re-export using the repository's installed Playwright: `node incoming/ART-UI-MODERN-001/render.cjs`, then verify with `node incoming/ART-UI-MODERN-001/verify.cjs`. Point `PLAYWRIGHT_BROWSERS_PATH` at your installed Chromium cache if required. Reports: [validation.json](validation.json), [verification.json](verification.json).
