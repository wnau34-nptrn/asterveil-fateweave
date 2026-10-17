# CODEX HANDOFF — ART-STORY-PROLOGUE-001
## Asterveil · Fateweave: Vargoth and the prologue scenes

> Copy everything below this line into Codex.

---

You are the **2D illustrator and asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser.

A new player now sees a short **prologue** before the first battle. It is a story scene of 4 panels plus a 2-panel closing scene after the battle is won (`src/ui/story-ui.ts`). Today the scenes use the battle ruins backdrop, and the antagonist **Vargoth** is only a dark silhouette borrowed from another foe. Produce Vargoth and three story backgrounds so the prologue feels like a real opening. The developer (Claude) will review and integrate them.

**Do not change `src/`, `tests/`, `.github/`, `public/` or existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`.

### 0. The story (owner-approved lore, 2026-10-16)

- **The land:** แอสเตอร์เวล (Asterveil). Its sky has been torn by **รอยแยก** (rifts): glowing violet tears through which the demon tribes pour.
  - **Never** draw or label any "veil", "curtain" or barrier. The owner retired that idea; the threat is the rifts alone.
- **The player:** a commander, the **fate-weaver**, who sees the threads of fate of their mercenaries. The commander is never shown.
- **The antagonist:** **วาร์กอธ (Vargoth), chief of the rift demon tribes.** He wants the land for his tribes.
  - In the prologue he steps out of a rift above a ruined frontier fort and sends his vanguard against the four heroes.
  - When the vanguard falls, he withdraws into the rift, promising to wait at the rift gate.
  - He is the big villain of later chapters; the chapter 1 boss is only his general.
- **The prologue panels** (for mood; the game draws all text):

  | Scene | Background (deliverable) | Speaker | What happens |
  |---|---|---|---|
  | 1 | `story_awaken` | narrator | The commander wakes among the ruins of the frontier fort; a violet rift splits the dusk sky. |
  | 2 | `story_awaken` | Aegis (knight) | "You are the fate-weaver… we have waited for you." |
  | 3 | `story_rift` | **Vargoth** | He stands before the open rift: "This land will be my tribe's, and you will die here!" |
  | 4 | `story_rift` | Lyra (duelist) | "His vanguard is coming! Command us!" |
  | closing 1 | `story_retreat` | **Vargoth** | Fading back into a narrowing rift: "Interesting… I will wait for you at the rift gate." |
  | closing 2 | `story_retreat` | Seren (priest) | "He has withdrawn. To the camp first." |

### 1. Read first (style lock)

**Do not regenerate or modify these files.**

- `public/assets/art/ruins.webp` (1536×1024): the battle ruins. `story_awaken` is the **same place** at dusk, in the same painterly style.
- `public/assets/lobby/lobby_bg.webp`: the warm camp, for palette and rendering quality.
- `public/assets/art/units.webp`, `units_mercs.webp`, `units_foes.webp` and the matching `portraits*.webp`: the heroic-chibi characters and foes.
  - Vargoth must match their line weight, rendering and proportions (heroic chibi, about 3 heads tall), only larger and more imposing.
- `public/assets/art/units_foes.webp`: the existing rift foes (violet crystal brute, rift weaver, golem, sentinel).
  - Vargoth belongs to the same rift family (violet `#c79bff` rift light, deep navy-violet shadows) but must be **clearly different** from every existing foe. In particular he is not a variant of the crystal brute or the sentinel.
- `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`: the Luminous Veil UI palette, kept for the HUD colours only.
- `docs/handoffs/ART-PLACEMENT-RULES.md` §1 and §5: enemies face LEFT (←).

### 2. Vargoth: character design

- **Who:** an original demon chieftain, arrogant and patient rather than feral. He leads; he does not rush in.
- **Silhouette:**
  - tall, heavy shoulders;
  - a crown of jagged obsidian horns with violet crystal tips;
  - a long tattered cloak whose edges dissolve into violet rift light.
- **Armour and weapon:**
  - layered black-stone armour with thin glowing violet cracks;
  - one great **crescent glaive**, held low, with a rift-light edge.
- **Face:** a strong jaw, glowing violet eyes and a confident smirk.
  - Readable when the head is about 60 px.
  - Not grotesque: this is a mobile JRPG villain who will return.
- **Palette:**
  - deep navy-violet and black stone, accents in rift violet `#c79bff` and a little cold silver;
  - no pure black areas larger than the hand;
  - keep a warm rim light so he reads on the dark story backgrounds.
- **Originality:** original design only. No resemblance to any named game, film or artist's character. No real-world religious symbols. No text, runes that read as letters, or numbers.

### 3. Exact deliverables

**A. Vargoth figure** (WebP, RGBA)
- `vargoth_full.webp`, 1024×1024: full body, standing, **facing LEFT (←)** toward where the heroes would be, glaive held low.
  - Feet near the bottom with the sole baseline at y ≈ 1000; head near the top with about 24 px padding.
  - Transparent background, no ground, no shadow, no rift behind him (the background provides it).
  - The figure fills 70–85% of the frame height. The game shows it over the story background at about 280–520 px tall.
- `vargoth_full.json`: `{ "footY": <sole line> }`.

**B. Vargoth bust** (WebP, RGB or RGBA)
- `vargoth_bust.webp`, 512×512: head and shoulders, three-quarter view facing left.
  - Eyes at about 40% of the height, face centred, so a circle crop works at 40–260 px. It is used in the story card and the coach strip.
  - Background is a simple dark violet glow, no text.

**C. Story backgrounds** (WebP, RGB)
Each is 1920×1080, painterly, matching `ruins.webp`, with no characters in the scene (the game adds Vargoth and the heroes on top).
- `story_awaken.webp`: the ruined frontier fort of `ruins.webp`, seen at **dusk**.
  - Broken arches and the circular stone floor are familiar.
  - A long violet rift splits the sky, still narrow.
  - Embers and dust in the air; a quiet, ominous mood.
- `story_rift.webp`: the same ruins at night. The rift is **torn wide open** above the far end of the courtyard, and a pillar of violet light falls to the ground where Vargoth will stand (right of centre).
  - Shadowy demon silhouettes are faintly visible inside the rift: small, far, not detailed.
- `story_retreat.webp`: the same ruins just before dawn. The rift is **narrowing** and fading; the first cold light is in the sky.
  - Smoke from the fight, the floor scarred with violet burn marks.
  - A path leads off left toward the distant warm glow of a camp.

**Composition rules for C** (the game crops them):
- Phones show a **centred 9:16 slice** (about 608 px wide at the centre). The focal point of each scene (the rift, the pillar of light) must sit inside the centre 608 px column.
- The **bottom 35%** is covered by the dialogue card: keep it calm floor or stone, nothing important.
- The **top 10%** sits under the HUD: keep it to sky.
- On wide screens Vargoth's figure stands right of centre, about x 55–75%. Leave that area readable (no bright clutter behind his torso).

**D. Review sheets** (PNG, reference only)
- `review/prologue-phone.png` (390×844) and `review/prologue-desktop.png` (1366×768): scene 3 mocked up.
  - `story_rift` cropped as the game does, Vargoth standing on it, and an empty dark rounded rectangle where the dialogue card goes (bottom 35%).
  - No text.
- `review/vargoth-lineup.png`: Vargoth next to the knight (`units.webp` frame 0) and the crystal brute (`units_foes.webp`) at the same scale, to show size and that he reads as a new character.
- `review/vargoth-sizes.png`: the bust at 260, 96, 56 and 40 px, circle-cropped, on `#0d1c2e`.
- `review/scenes.png`: the three backgrounds side by side with the 9:16 centre slice outlined.

### 4. Technical constraints

- sRGB colour, embedded profile.
- Transparent figure edges without halos or stray pixels.
- **Budget:** all runtime WebPs together must be at most **1,600,000 bytes**. Review PNGs do not count.
- **No text, letters, numbers, logos or watermarks** in any image.
- Keep existing files byte-identical. List the SHA-256 hashes of these files in `NOTES.md`:
  - `ruins.webp`, `units.webp`, `units_foes.webp`, `portraits.webp`, `portraits_foes.webp`, `lobby_bg.webp`.
- Import nothing from other repositories.

### 5. Do not

- Do not draw the commander, the four heroes, the vanguard foes or any UI (dialogue boxes, buttons, frames) into the runtime art.
- Do not draw a veil, curtain, dome or barrier of light around the land.
- Do not change the heroes' or foes' designs, the HUD or the palette tokens.
- Do not make Vargoth a recolour of an existing foe.
- Do not use pixel art, photo textures or 3D renders.
- Do not write game code.

### 6. Validation checklist (tick in the PR body)

- [ ] Vargoth full figure 1024×1024, faces LEFT, footY recorded, transparent, original design and clearly distinct from every existing foe
- [ ] Bust 512×512, circle-crops cleanly at 40–260 px
- [ ] Three backgrounds at 1920×1080: same ruins as `ruins.webp`, focal point inside the centre 9:16 slice, calm bottom 35% and top 10%
- [ ] No veil or barrier imagery; no text anywhere
- [ ] Review sheets included (phone and desktop mock, lineup, sizes, scenes)
- [ ] Runtime total ≤ 1.6 MB; existing hashes unchanged
- [ ] `NOTES.md` and `STYLE_CHECK.md` complete

### 7. Return package, Git and review

```text
incoming/ART-STORY-PROLOGUE-001/
  NOTES.md  STYLE_CHECK.md
  vargoth/  vargoth_full.webp  vargoth_full.json  vargoth_bust.webp  (+ PNG masters)
  scenes/   story_awaken.webp  story_rift.webp  story_retreat.webp  (+ PNG masters)
  review/   prologue-phone.png  prologue-desktop.png  vargoth-lineup.png  vargoth-sizes.png  scenes.png
```

**Git steps (required):**

1. Create the branch `art/art-story-prologue-001` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-STORY-PROLOGUE-001/`.
3. Commit with the message `art: add ART-STORY-PROLOGUE-001 Vargoth and prologue scenes`.
4. Push the branch to `origin`.
5. Open a **draft pull request** into `feature/fateweave-initial-prototype`.
   - Title: `[ART-STORY-PROLOGUE-001] Vargoth and prologue scenes`.
   - Body: embed the review sheets, include the ticked checklist and the runtime byte total, and end with the line **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

After you return, the developer (Claude) runs an Asset Intake Review. If the art is accepted, Claude integrates it:
- the backgrounds behind the prologue panels;
- Vargoth's full figure in his scenes;
- the bust in the story card.

Otherwise Claude answers with a revision request on the PR.
