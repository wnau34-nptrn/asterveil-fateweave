# CODEX HANDOFF — ART-UI-LOBBY-001
## Asterveil · Fateweave: warm mercenary-camp lobby scene with posed characters

> Copy everything below this line into Codex.

---

You are the **2D illustrator and asset producer** for **Asterveil · Fateweave**, a Thai-language, mobile-first 2D fantasy JRPG that runs in the browser.

The game now has a **lobby** (ค่ายทหารรับจ้าง, "the mercenary camp") between expeditions. Players hire mercenaries, upgrade stars and choose the team there. The owner wants it to feel **warm, cheerful and lived-in**, with the heroes and mercenaries **standing, sitting and doing things** around the camp. Produce the scene art and the character poses. The developer (Claude) will review and integrate them.

**Do not change `src/`, `tests/`, `.github/`, `public/` or existing art.**

Repository: `wnau34-nptrn/asterveil-fateweave`. Base branch: `feature/fateweave-initial-prototype`.

### 1. Read first (style lock)

**Do not regenerate or modify these files.**

- `public/assets/art/units.webp` (2×3 atlas of 512×512 idle frames): Knight Aegis (`guardian`), Duelist Lyra (`tracer`), Mage Eira (`weaver`), Priest Seren (`healer`), then Raider and Brute.
- `public/assets/art/portraits.webp`.
- `public/assets/title/title_bg.webp`.
- `public/assets/world/landmark_camp.webp`.
- `incoming/ART-UI-WORLD-001/STYLE_GUIDE.md`: the Luminous Veil palette and HUD rules.
- `docs/validation/lobby-l1/*.jpg`: the current **interim** lobby. The camp scene band shows the existing idle frames around a code-drawn fire. This is what your art replaces.
- `docs/handoffs/ART-CHAR-MERC-ENEMY-001.md`: the six upcoming mercenaries (Garran, Mira, Toma, Sefa, Brann, Lio). Their master designs may still be in review.

Match the existing style exactly:

- Heroic chibi anime, 2.5–3 heads tall.
- Cel shading with soft gradients and warm rim light.
- The same line weight as `units.webp`.
- Original work only.

### 2. Mood and setting

A frontier mercenary camp at dusk, just before setting out: a crackling campfire, canvas tents with teal-and-gold banners, string lanterns, crates and a notice board for hires, a cooking pot, bedrolls and a distant view of the floating ruins and cyan waterfalls.

- **Colour:** warm amber firelight in the foreground fading to the violet-blue dusk of the Veil Frontier. It should feel cosy and celebratory, not dark or grim.
- **Layout:** the HUD (header, tabs and member cards) is DOM over a separate panel. The scene is shown in its own band, about 2.4:1 on phones and up to 4.7:1 on desktop. Keep the important content (fire and character spots) inside a central safe area.

### 3. Exact deliverables

**A. Scene layers (WebP, sRGB)**

- `lobby_bg.webp`, 2400×1000: sky, ruins, tents, banners and lanterns. No characters, and no fire flames painted in; the game draws the flame. Leave a clear, slightly lit **ground band** (bottom 35%) for the characters.
- `lobby_fg.webp`, 2400×1000 RGBA: optional foreground props such as crates, bedroll edges and grass tufts, transparent elsewhere. They sit in front of the characters, so keep them low (bottom 12%).
- `lobby_firepit.webp`, 256×256 RGBA: the stone fire ring and logs, without flames, bottom-centre anchor.
- **Safe area:** all key elements stay within the centre 1600×1000. The outer 400 px on each side may be cropped on phones.

**B. Character poses** (the four existing heroes now)

For `guardian`, `tracer`, `weaver` and `healer`, draw **three new poses** each, in the same 512×512 frame, scale and facing (3/4 view facing right) as `units.webp`:

1. `sit`: sitting on a log or crate, relaxed, with weapon resting beside them.
2. `cheer`: arm raised in a toast or wave, smiling (for victories and new hires).
3. `idle_alt`: a character moment, one per hero:
   - Aegis polishing his shield;
   - Lyra twirling her sword;
   - Eira reading a floating rune book;
   - Seren tending a small healing light.

Deliver them as:

- the atlas `lobby_poses_heroes.webp`, 1536×2048 (3 columns = sit / cheer / idle_alt; 4 rows = guardian, tracer, weaver, healer);
- `lobby_poses_heroes.json` with `{ "<id>_<pose>": { "x", "y", "w", "h", "footY" } }`. For `sit`, also give `seatY`, the y of the seat contact.

**Requirements for every pose:**

- Same identity, outfit and colours as the hero's master frame. Do not redesign.
- Soles (or the seat contact for `sit`) on a shared baseline. Record `footY` and `seatY`.
- Transparent background, no shadow painted (the game draws one), no halo.
- Readable at 90–200 px tall.

**Mercenary poses:** do the same three poses for the six mercenaries only **after** their ART-CHAR-MERC-ENEMY-001 masters are approved. Use the same atlas format, `lobby_poses_mercs.webp`. If the masters are not yet approved when you work on this task, skip them and say so in `NOTES.md`.

**C. Review sheets** (reference only)

- `review/lobby-phone.png` (390×844 crop) and `review/lobby-desktop.png` (1366×768 crop): a mock composition of the scene with the four heroes posed around the fire (two sitting, one cheering, one idle_alt), plus a flame placeholder. Show the real HUD region boundaries as thin outlines, with no text.
- `review/poses-lineup.png`: all 12 poses next to the original idle frames at the same scale.
- `review/silhouettes.png`: the 12 poses as black silhouettes at 90 px.

### 4. Technical constraints

- **No text, numbers, letters or logos** in any image. All labels are live Thai HTML.
- No copying or "in the style of" any named game, studio or artist. Import nothing from other repositories.
- Nothing sexualised, gory or scary.
- **Budget:** new runtime WebP files total at most **1.6 MB**. PNG copies are review-only and do not count.
- Keep `units.webp`, `portraits.webp`, `title_bg.webp` and the world assets byte-identical. List their SHA-256 hashes in `NOTES.md`.

### 5. Do not

- Do not draw UI panels, buttons, star badges, prices, or gacha or shop frames.
- Do not redesign any character, or change the HUD layout or the palette tokens.
- Do not add new characters, pets or NPC shopkeepers. The lobby has no NPC or dialogue system.
- Do not change files under `src/`, `tests/`, `.github/` or `public/`.

### 6. Validation checklist (tick in the PR body)

- [ ] `lobby_bg`, `lobby_fg` and `lobby_firepit` at the exact sizes; key content inside the safe area
- [ ] 12 hero poses (sit / cheer / idle_alt × 4) in the atlas, with JSON including `footY` (and `seatY` for sit)
- [ ] Identities match the masters; same scale and facing; no halos
- [ ] Mercenary poses delivered, or explicitly deferred in `NOTES.md`
- [ ] Review sheets included
- [ ] No text; original work; runtime total ≤ 1.6 MB; existing hashes unchanged
- [ ] `NOTES.md` and `STYLE_CHECK.md` complete

### 7. Return package, Git and review

```text
incoming/ART-UI-LOBBY-001/
  NOTES.md  STYLE_CHECK.md
  scene/   lobby_bg.webp  lobby_fg.webp  lobby_firepit.webp  (+ PNG copies)
  poses/   lobby_poses_heroes.webp  lobby_poses_heroes.json  (optional) lobby_poses_mercs.webp/.json
  review/  lobby-phone.png  lobby-desktop.png  poses-lineup.png  silhouettes.png
```

**Git steps (required):**

1. Create the branch `art/art-ui-lobby-001` from the latest `feature/fateweave-initial-prototype`.
2. Add files **only** under `incoming/ART-UI-LOBBY-001/`.
3. Commit with the message `art: add ART-UI-LOBBY-001 lobby scene and hero poses`.
4. Push the branch to `origin`.
5. Open a **draft pull request** into `feature/fateweave-initial-prototype`.
   - Title: `[ART-UI-LOBBY-001] Warm lobby scene and posed heroes`.
   - Body: embed the review sheets, include the ticked checklist and the runtime byte total, and end with the line **"Ready for Claude Asset Intake Review."**
6. **Do not merge, do not deploy, and do not push to any other branch.**

The developer (Claude) then runs an Asset Intake Review and places the poses in the lobby scene. Who sits and who cheers will follow game state, for example cheering after a hire or a completed expedition.
