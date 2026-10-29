# Built-in image_gen prompt set

All generations used built-in image_gen; no CLI/API fallback. Only same-repository masters were supplied. No external image or named artist, studio or game was used. The following production specifications summarize the final prompts; original returned PNGs are included for audit.

## Scene background

Original polished anime fantasy JRPG mercenary camp at dusk, 2400x1000 target. Warm amber foreground and violet-blue sky, floating pale ruins and cyan waterfalls, canvas tents with teal/gold banners, lantern strings, crates, blank hire noticeboard and cooking pot. Central 1600px safe area, expendable outer sides; bottom 35% clear slightly lit ground. No characters, firepit, flames, animals, writing, text, logos or UI. Fine linework, soft cel-painted gradients, Luminous Veil navy/cyan/champagne palette.

Selected source: `exec-90072eb2-157b-430b-9e03-5119fbf80b1a.png`.

## Foreground and firepit

Foreground: transparent wide canvas, sparse low grass, teal bedroll edge at lower left and small crate corner at lower right; upper 88% empty, centre clear. Warm amber rim, clean cel shading, no shadows, text or characters. Deterministic export confines the returned prop layer to bottom 120px.

Firepit: isolated oval pale stone ring and crossed brown logs, three-quarter view, transparent, bottom-centre anchor, no flame, smoke, embers, ground or cast shadow. 256px target; warm cel shading.

Sources: `exec-7a5eab89-b273-4b6d-ab08-a724732bdf03.png`, `exec-c342cb7a-14d3-42f8-942f-12317616fda7.png`.

## Heroes

Identity/style reference: `public/assets/art/units.webp`. New transparent 3-column, 4-row atlas with generous empty gutters. Rows: blond blue/gold shield knight, red-haired black/red/gold sword duelist, silver-haired violet witch, brown-haired green/white/gold priest. Preserve faces, outfits, palettes, equipment and linework. Columns: relaxed seated log with resting weapon; cheerful raised-arm wave; shield polishing / sword twirl / reading floating blank book / tending small healing light. All face screen RIGHT in three-quarter view, mirror-safe. Heroic chibi 2.5–3 heads, cel shading with soft gradients, warm rim. No background, floor, cast shadow, halo, lettering, runes, logo, UI or clipped figures.

Selected source: `exec-53a687e1-f03a-454f-8563-a0c3aad274cb.png`; earlier crowded atlas rejected before delivery.

## Approved mercenaries

Identity/style reference: `public/assets/art/units_mercs.webp`. Three-column, six-row transparent pose atlas. Rows Garran, Mira, Toma, Sefa, Brann, Lio in master order. Preserve teal spear/buckler, auburn braid/forest hood/bow, glasses/goggles/apron/vials, silver-blue scarf/twin daggers, beard/stone armor/hammer, curly hair/coral coat/lute. Columns seated relaxed on log with resting weapon; happy raised-arm wave; characteristic activity: spear maintenance, bow inspection, vial inspection, dagger cleaning, hammer polishing, lute playing. Every nose/body facing screen RIGHT in three-quarter view. Same chibi cel-shaded treatment. Transparent alpha, no floor/shadows/text/logos/music glyphs/UI. A background-extraction-only followup preserved all eighteen figures and removed the backdrop. Actual alpha was checked over a light background rather than inferred from the generator preview.

Selected source: `exec-9491dbb1-5cb5-4d67-93b7-bb7d7a679430.png`. Local normalization does not generate or repaint figures. All final atlas coordinates, anchors and export steps are recorded in build_package.py.
