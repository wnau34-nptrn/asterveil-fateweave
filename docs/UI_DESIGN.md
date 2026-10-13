# Modern battle HUD design spec

The supplied classic JRPG screenshots guide a portrait battle screen: arena above enemy HP, two-column hero cards below, and skills/targets at the bottom. The user's requested modernization retains that recognizable skeleton with restrained framing, larger readable type, clear class colors and touch-friendly controls.

## Design system and inventory

- Midnight background `#08121f`; navy panels `#122239`; champagne trim `#d9bf86`; white text `#eef4ff`; muted blue `#9eb1cb`.
- Mint HP `#68e5b6`; violet enemy HP; cyan Knight, crimson Duelist, lilac Mage and emerald Priest accents.
- 10px control/card radii, 14px main frame; thin borders, light inset HP highlights and a restrained selected gold rim. No perpetual particles or HUD animation.
- Georgia for the existing brand. Installed Thai system font stack for game labels; no remote font dependency. Mobile names 14–16px, actions 11px, captions 8–10px (compact readiness names 8.5px at 320px); desktop names/actions larger.
- Original consistent 24×24 SVG line icons for Attack, Guard, Bash, Mark, Precision Strike, Bolt, Ward, Heal, Prayer and Restart. Skill icons share class colors; disabled states retain readable reasons.
- Native DOM bands: brand/beat/restart → canvas + existing event timeline and lane labels → two enemy HP cards → frozen enemy intent → four hero cards → selected class/commands/targets → one help disclosure containing tactics/history. Desktop places team and commands beside each other; phones stack them. Short landscape retains a compact arena and two-column dock; its timeline occupies the free space between hero and enemy columns, preserving hero faces.
- Four hero cards, exactly 2×2 at all sizes. Each has an illustrated portrait, class/lane, numeric HP and bar, optional barrier, and two real skill statuses. Selection is a gold outline plus text. Downed actors fade and cannot act.
- Three real owned commands for the selected class. Original English names accompany Thai labels and powers. Enemy/ally target buttons show the corresponding portrait and true HP.
- The existing native preview dialog remains code-native: player effects, enemy response, HP/barrier ledger, next intent, stationary confirmation/cancel footer, scrolling results and modal focus.

## Assets and implementation boundaries

Image Gen produced a full phone concept and separate original six-frame portraits, six-frame transparent full-body units, and a static ruin-courtyard background. The approved user request is UI modernization; the generated concept is an implementation guide within existing mechanics, not authorization for additional game systems. Original reference screenshots remain outside the repository. Assets are format-encoded as WebP without resizing/cropping/retouching; both atlases stay 1024×1536, with six 512px square frames. CSS samples portrait frames and Phaser samples unit frames directly.

Concept source in the session: `/workspace/generated_images/exec-9b0e746e-73b4-4e17-9815-749accca238e.png`. This session-local file is not a runtime dependency. The published originals are `public/assets/art/{units,portraits,ruins}.webp`; generated artwork is not copied from Brave Frontier. No screenshot is used as interactive UI. Controls wait for Phaser asset readiness on first load. Pointer zones follow the unit image feet/height anchors and include the face; status labels render above sprite artwork to remain readable at narrow widths.

Intentional constraints relative to generated concept: Thai names, skills, HP, cooldowns and beat labels follow real encounter data. Knight/Duelist remain the front column and Mage/Priest the back column, matching actual formation mechanics. Generated concept's invented skill names, extra timeline slots, generic Battle 1/1 and dummy readiness dots are replaced by actual labels and available/unavailable states. Two-enemy HP bars supplement the frozen intent; they do not add a new encounter, Break/Ultimate/Overdrive, inventory, AUTO or currency. Original generated characters retain class identity without copying the reference game's cast. Existing mechanics and version-3 saves remain unchanged. On compact fields ally HP numbers move to the large roster cards so lower character artwork cannot cover labels; name and small HP bar remain on the field.

## Interaction contract

Selecting a card updates commands and canvas/timeline highlight. Selecting a legal target previews without committing. Confirm advances one beat and selects the next living hero; cancel and rotation retain/cancel choices as before. Existing exact resolver and replay remain authoritative. Skill statuses derive from actor cooldowns and legal targets: healing at full HP is visibly unavailable, not presented as ready.

Browser validation uses existing Playwright production-subpath tests because Browser plugin is not available. Physical devices and Safari remain separate validation work.

## Fidelity review against concept and references

Compared the generated concept with final actual browser screenshots using `view_image`, including desktop, narrow phone, normal portrait and short landscape. The concept's 853×1844 raster represents a phone screen; 390×844 CSS pixels is its approximately 2.19× density equivalent. Using 853 CSS pixels would select a tablet layout, so functional/visual review uses real CSS phone widths rather than treating image pixels as CSS units.

| Comparison | Evidence and result |
|---|---|
| Structure | Arena → two enemy HP cards → frozen danger strip → 2×2 party → three commands and targets. Desktop/landscape adapt team and commands into adjacent bands. |
| Palette and framing | Midnight/navy, champagne selection trim, mint ally bars and violet enemy bars follow the concept; thinner frames implement the requested modern finish. |
| Typography | Thai names, HP and primary actions are code-native. Readiness copy was enlarged after screenshot review; full cooldown reasons wrap without clipping. |
| Portrait/field assets | Original generated six-cell atlases replace geometric placeholders. Faces have consistent crops; sprites share frame/feet anchors, and pointer zones include their visible heads. |
| Icons and states | One custom line-icon family modernizes the illustrated icon motifs. Active class tones, gold selection and muted unavailable actions remain consistent; readiness reflects targets/cooldowns. |
| Spacing and layering | Compact ally HP numbers live on large cards. Shield values have their own line. Enemy/status labels render above overlapping sprites; short-landscape timeline moves off the Mage's face. |
| Interaction/preview | Selecting a hero/skill/target uses actual engine data; the native dialog separates effects and keeps confirm/cancel reachable while results scroll. Rotation, saves and automatic next-hero selection persist. |

Above-the-fold copy review: brand, four real names/classes, formation, true enemy/hero HP, actual skills/powers and current beat are retained. The prototype's skill aliases, dummy readiness dots and Battle 1/1 are replaced with authoritative content as declared above. Functional selection/help/readiness labels are part of the implementation inventory. No currencies, item counts, AUTO, Ultimate or reward claims were added. Phones scroll naturally to the target row and help instead of shrinking all copy to reproduce a fixed-height screenshot. These are intentional adaptations to the actual game and responsive constraints, rather than unresolved rendering defects.
