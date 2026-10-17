# Art direction — modern classic JRPG HUD

Target: vibrant heroic chibi / stylized fantasy JRPG in 2D. The user supplied two classic Brave Frontier battle screenshots and requested adapting that UI to Asterveil with a modern finish. The recognizable structure is arena → enemy HP → two-column hero cards → commands. The four-class Front/Back formation and deterministic Fateweave decisions remain the game's mechanics.

## Reference roles

Previously supplied Battle (C) and World Exploration (B) illustrate floating ancient ruins, cyan waterfalls, pale arches, purple corruption and gold/navy magic styling. Key Art (A) remains unavailable. The later annotated battle reference guided timeline, formation and command layout. The latest two classic JRPG screenshots guide full-width portrait battle composition, horizontal portrait/HP cards, strong skill affordances and a lower command region. Six-member parties, currency, AUTO, item slots, Ultimate/Overdrive, Break and displayed skills belong to those references; they are not existing Asterveil systems. The former Crystal has been removed at the user's request.

Supplied images remain reference material outside the repository. No copyrighted reference screen or cast is shipped as a runtime asset, and no static screenshot substitutes for working controls.

## Current implementation

A midnight navy HUD uses champagne trim, mint ally HP, violet enemy HP and cyan/crimson/lilac/emerald class accents. Thin frames and modest radii replace thick metallic UI. Thai copy, clear line icons and numeric outcomes remain code-native. See `UI_DESIGN.md` for tokens, component structure and implementation constraints.

The upper field is an original illustrated floating-ruin courtyard. Static full-body chibi frames distinguish blonde shield Knight, red-haired sword Duelist, silver-haired violet Mage and brown-haired green Priest; the two enemies are a magenta horned Raider and violet armored dragon Brute. Actors remain in two left-side columns, Back Mage/Priest and Front Knight/Duelist; enemies stand at right. Compact fields emphasize names and small HP bars, with exact ally HP prominent on the cards below. Selected actors use a light ring; downed actors fade. Announced threats, Mark and short damage/heal/barrier VFX reflect authoritative state.

The courtyard camera now gives the formation a continuous stone floor. Front/back partners stand diagonally from one another, with the second pair offset sideways; enemies are staggered separately. Illustrated soles, contact shadows and selection rings use one ground anchor, with enemy atlas padding excluded. Bodies render in foot-depth order and sizes adapt to both available height and width, keeping rear faces clear on portrait phones. This changes scenery framing and sprite geometry rather than the source artwork or formation mechanics.

Enemy portraits and true HP bars sit under the arena, followed by the frozen intent. The four large hero cards always form a 2×2 grid, each showing class/lane, HP/barrier and two actual skill statuses. Full-health healing is unavailable and cooldown text updates after commands/reload. Selecting a hero updates its commands, timeline and field highlight; completed casts select the next living member. Portrait phones fit compact roster and commands below an adaptive arena, with target markers directly on its characters without main-page scrolling; enemy HP remains on the field and optional details open from ⓘ; desktop and short landscape put team and commands beside each other. Help, forecasts and history use secondary disclosures. Tapping a marked character in the field casts immediately; skill details open optionally in the dock. Complete-outcome preview and confirmation overlays are removed.

## Original generated art provenance

Image Gen created the modern phone concept, then three separate original production assets from that direction. These are generated Asterveil art, not extracted Brave Frontier screenshots. The original generated PNGs remain session-local; published WebP files preserve original dimensions and artwork with format compression only:

| Runtime asset | Size / content | Source generation |
|---|---|---|
| `public/assets/art/units.webp` | 1024×1536 RGBA, 2×3 atlas of six 512px full-body frames | `exec-6ea43743-4e5e-4c3b-8645-c3409bd81659.png` |
| `public/assets/art/portraits.webp` | 1024×1536, 2×3 atlas of six square portraits | `exec-449b56b0-7dec-428f-83d7-7f68c1fba8af.png` |
| `public/assets/art/ruins.webp` | 1536×1024 static backdrop | `exec-4c7196df-b637-4661-a5c3-0ecda08c4546.png` |

Frame order is Knight, Duelist, Mage, Priest, Raider, Brute. CSS samples the portrait atlas directly; Phaser loads the transparent unit spritesheet without cropping source files. Backdrop uses cover scaling without a color wash. Frame mapping and base-aware paths are shared in `src/game/visuals/assets.ts`. Combined WebP transfer size is roughly 1.53 MiB. Static assets are hosted with the app, with no runtime image service or art-generation API. Initial controls wait until the Phaser scene is ready.

## Current limits

Artwork has one idle frame per actor and no walking/attack animation states. Effects remain brief code-driven labels/rings, honoring reduced motion. The environment is decorative, not a movement grid or exploration implementation. No music, sound, additional encounters or progression is introduced by the UI redesign. Future art/state assets should retain class silhouettes and source provenance. Browser evidence remains Chromium touch emulation; physical Android/iPhone, Safari and notch behavior require separate checks.
