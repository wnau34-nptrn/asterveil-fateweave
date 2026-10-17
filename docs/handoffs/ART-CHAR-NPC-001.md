# CODEX HANDOFF — ART-CHAR-NPC-001
## Asterveil · Fateweave: living camp NPCs at their workstations

> Copy everything below this line into Codex.

---

You are the **2D illustrator and asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser.

The lobby (ค่ายทหารรับจ้าง, "the mercenary camp") now holds several services: hiring, the team sheet, equipment, a talent tree and a forge, with map potions coming next. The owner wants the camp to feel **alive**: the people who run those services should be visible at their workstations, busy with their own work, reacting when the player uses them. Produce six original camp NPCs, their workstation props and their small looping animations. The developer (Claude) will review and integrate them.

This task **replaces** the line "Do not add new characters, pets or NPC shopkeepers" in ART-UI-LOBBY-001 §5, at the owner's request (2026-10-16). Everything else in that handoff still applies.

**Do not change `src/`, `tests/`, `.github/`, `public/` or existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`.

### 0. Placement rules (read first)

Read `docs/handoffs/ART-PLACEMENT-RULES.md` §4 (lobby) and §5 (general).

- Draw every NPC frame facing RIGHT (→). The game **mirrors** NPCs that stand right of the campfire so that they face it. Every frame must still read correctly when flipped: no text, letters, numbers or one-sided emblems.
- Use the same 512×512 frame, scale and sole baseline as `public/assets/art/units.webp`, so NPCs stand at the same height as the mercenaries. Record `footY` per frame.
- Transparent backgrounds, no halos, no painted ground shadow (the game draws one).

### 1. Read first (style lock)

**Do not regenerate or modify these files.**

- `public/assets/art/units.webp`, `units_mercs.webp`: the heroes and mercenaries (line weight, proportions, rendering).
- `public/assets/lobby/lobby_bg.webp`, `lobby_fg.webp`, `lobby_firepit.webp`, `lobby_poses_heroes.webp`, `lobby_poses_mercs.webp`: the accepted camp scene and poses (ART-UI-LOBBY-001).
- `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`: the Luminous Veil palette.

Match the existing style exactly:

- Heroic chibi anime, 2.5–3 heads tall.
- Cel shading with soft gradients and warm firelight rim light.
- The same line weight as `units.webp`.
- Original work only.

NPCs are **civilians and camp staff, not fighters**. Give them working clothes, aprons, tools and props instead of armour and weapons. They must be clearly distinct from all ten mercenaries in silhouette and colour, so nobody mistakes an NPC for a hireable unit.

### 2. The six NPCs (one per lobby service)

Each NPC has a role, a personality shown through pose, and a workstation prop. Names are working names; the game shows Thai names in live HTML.

| id | Role (Thai UI service) | Look and personality | Workstation prop |
|---|---|---|---|
| `smith` | Blacksmith (ช่างตีเหล็ก, the forge) | Broad, cheerful, middle-aged; soot-smudged leather apron, rolled sleeves, goggles pushed up on a headband; proud of every piece | Anvil on a stump, small forge with glowing coals and bellows, tongs and hammers on a rack |
| `broker` | Hire broker (ป้ายจ้าง, hiring) | Slim, quick, friendly; travel coat with many pockets, feathered cap, quill behind the ear; always cheerful about "a great deal" | Notice board with pinned blank papers (shapes and wax seals only, no writing) and a small coin box |
| `trainer` | Drill instructor (ต้นไม้ความถนัด, talents) | Older veteran, retired from fighting; eye scar, grey braid, practice staff; stern but warm | Straw training dummy and a practice-weapon rack |
| `keeper` | Quartermaster (อุปกรณ์, equipment) | Short, tidy, spectacles; ledger board under the arm, measuring tape around the neck; fusses over fit | Stacked crates, an armour stand and a hanging rack of cloaks |
| `herbalist` | Potion brewer (ยา, map potions, next phase) | Young, curious, slightly clumsy; herb satchel, rolled-up sleeves, a bubbling flask that glows teal | Small table with bottles, a mortar and drying herbs |
| `scout` | Route guide (ออกเดินทาง, departure) | Lean ranger with a hooded cloak and spyglass; calm and watchful; a small owl companion on the shoulder is welcome | Map table with stones as markers (no lettering) and a lantern pole |

### 3. Exact deliverables

**A. NPC animation atlases (one per NPC, WebP sRGB with alpha)**

`npc_<id>.webp`, 2048×1536: a 4 × 3 grid of 512×512 frames.

| Row | Frames | Use |
|---|---|---|
| 1 `idle` | 4 frames, looping | Breathing, blinking, a small personal fidget (the smith wipes his brow, the broker flips a coin, the trainer leans on the staff, the keeper adjusts spectacles, the herbalist sniffs the flask, the scout glances through the spyglass) |
| 2 `work` | 4 frames, looping | The station activity: hammering on the anvil, pinning a notice, striking the dummy, counting crates, grinding herbs, moving a marker stone |
| 3 `greet` + `cheer` | 2 frames `greet` (looking up, a nod or wave when the player opens their service), 1 frame `cheer` (success: a piece enhanced, a hire made, a talent learned), 1 empty frame | Reactions |

- The loops must cycle smoothly at about 6–8 frames per second; frame 4 returns naturally to frame 1.
- Keep the sole baseline fixed across all frames. Only arms, heads, cloth and small props move.
- Effects belong inside the frame and stay small: forge sparks, a puff of flask steam, a straw wisp. Keep them close to the body so they survive the mirror.

Plus `npc_frames.json`:

```json
{ "<id>": { "frame": 512, "footY": 496, "rows": { "idle": [0,1,2,3], "work": [4,5,6,7], "greet": [8,9], "cheer": [10] } } }
```

**B. Workstation props (WebP with alpha)**

`npc_stations.webp`, 1536×1024: a 3 × 2 grid of 512×512 props in the order smith, broker, trainer / keeper, herbalist, scout.

- Bottom-centre anchor on the same ground line as the NPCs' soles.
- A prop sits beside its NPC (the NPC stands just left of it), not behind the figure.
- The forge coals and the herbalist's flask may glow softly. Paint no open flames; the campfire flame is code-drawn.

**C. Service busts (WebP, painted background)**

`npc_busts.webp`, 1536×1024: a 3 × 2 grid of 512×512 head-and-shoulder busts in the same order, each with a warm painted background like `portraits.webp`.

- Shown at 56–96 px, rounded or circular, in the header of each service sheet next to a live Thai speech line.
- Face centred, eyes at about 40% height, a friendly expression that fits the personality.

**D. Review sheets (reference only, PNG)**

- `review/camp-phone.png` (390×844) and `review/camp-desktop.png` (1366×768): the accepted lobby scene with the six NPCs at their stations, two or three heroes around the fire, and the HUD regions as thin outlines with no text.
  - NPCs right of the fire must be **mirrored**, as the game will show them.
  - Suggested spots: smith and keeper far left, trainer and broker mid-back, herbalist and scout far right. Keep the central fire and hero spots clear.
- `review/npc-lineup.png`: all six NPCs (idle frame 1) next to Aegis and Lio at the same scale.
- `review/npc-silhouettes.png`: the six NPCs as black silhouettes at 90 px next to the ten mercenaries, to prove they cannot be confused.
- `review/npc-loops.gif` (optional): each idle and work loop at 8 fps.

### 4. Technical constraints

- **No text, numbers, letters or logos** anywhere, including notices, maps, labels and ledgers. Use shapes and seals instead.
- No copying or "in the style of" any named game, studio or artist. Import nothing from other repositories.
- Nothing sexualised, gory or scary. The trainer's scar stays small and friendly.
- **Budget:** new runtime WebP files total at most **2.4 MB** (six atlases, stations and busts). PNG and GIF copies are review-only and do not count.
- Keep every existing runtime asset byte-identical. List the SHA-256 hashes of `units*.webp`, `portraits*.webp` and `public/assets/lobby/*.webp` in `NOTES.md`.

### 5. Do not

- Do not redesign heroes or mercenaries, or change the lobby scene, the HUD layout or the palette tokens.
- Do not give NPCs weapons drawn for battle or battle poses. They never fight.
- Do not draw UI panels, speech bubbles, buttons, prices, star badges or shop frames. The game draws all UI and speech in HTML.
- Do not add more than the six NPCs and the owl.
- Do not change files under `src/`, `tests/`, `.github/` or `public/`.

### 6. Validation checklist (tick in the PR body)

- [ ] Six NPC atlases at 2048×1536 with idle (4), work (4), greet (2) and cheer (1) frames; the JSON frame map with `footY`
- [ ] Loops cycle smoothly; the sole baseline is steady across frames
- [ ] Stations atlas (6 props) and busts atlas (6 busts) at the exact sizes
- [ ] **Facing:** every frame faces RIGHT (→) and reads correctly when mirrored
- [ ] Same scale and style as `units.webp`; NPCs clearly differ from all ten mercenaries (silhouette sheet)
- [ ] Review sheets included, with right-side NPCs mirrored in the camp mocks
- [ ] No text anywhere; original work; runtime total ≤ 2.4 MB; existing hashes unchanged
- [ ] `NOTES.md` and `STYLE_CHECK.md` complete

### 7. Return package, Git and review

```text
incoming/ART-CHAR-NPC-001/
  NOTES.md  STYLE_CHECK.md
  npc/      npc_smith.webp  npc_broker.webp  npc_trainer.webp  npc_keeper.webp  npc_herbalist.webp  npc_scout.webp  npc_frames.json
  props/    npc_stations.webp
  busts/    npc_busts.webp
  review/   camp-phone.png  camp-desktop.png  npc-lineup.png  npc-silhouettes.png  (optional) npc-loops.gif
```

**Git steps (required):**

1. Create the branch `art/art-char-npc-001` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-CHAR-NPC-001/`.
3. Commit with the message `art: add ART-CHAR-NPC-001 camp NPCs, stations and busts`.
4. Push the branch to `origin`.
5. Open a **draft pull request** into `feature/fateweave-initial-prototype`.
   - Title: `[ART-CHAR-NPC-001] Living camp NPCs`.
   - Body: embed the review sheets, include the ticked checklist and the runtime byte total, and end with the line **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

### 8. How the game will use them (for context)

After the Asset Intake Review, the developer will:

- place each NPC beside its station in the camp scene, playing `idle` and switching to `work` now and then;
- make each NPC a tap target that opens its service sheet;
- play `greet` when the sheet opens and `cheer` on a success;
- show the bust and one short live Thai line in the sheet header.

Reduced-motion players see a still idle frame.
