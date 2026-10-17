# Background music

**Source.** The owner supplied six tracks from Asterveil: Rise Beyond on 2026-10-16 ("ให้นำเพลงจากเกม Asterveil-rise-beyond มาใช้ได้เลย") by uploading them to the session. They were not copied from that repository.

**Encoding.** Each track was re-encoded for the web with ffmpeg:
- loudness normalised (loudnorm I −18 LUFS, TP −1.5);
- 44.1 kHz stereo MP3 at 96 kbps;
- metadata stripped.

Each file is about 2.1 MB, 13 MB in total. A track is fetched only when it first plays (`preload = none`).

| File | Original | Used for |
|---|---|---|
| `bgm_camp.mp3` | music_camp_01 | Title screen and the prologue (owner) |
| `bgm_archway.mp3` | Sunlight_Through_the_Archway | Commander creation and Vargoth's retreat at dawn (Claude's choice: calm and close to the camp theme) |
| `bgm_ruins.mp3` | music_ruins_01 | Lobby (owner) |
| `bgm_meadow.mp3` | music_meadow_01 | Exploration map (owner) |
| `bgm_battle.mp3` | music_battle_normal_01 | Battles (owner) |
| `bgm_boss.mp3` | Drakes_Hollow | The boss and the mini-boss (owner: boss) |

**Player.** `src/platform/music.ts`:
- Tracks loop and crossfade over 0.7 s.
- Playback starts on the first pointer or key press, as browsers require.
- Music pauses while the page is hidden and resumes when it returns.
- Mute and volume are stored in `asterveil.fateweave.audio.v1`.
- **Controls:** a toggle and a volume slider on the title screen, and a toggle in the lobby header.

**Testing.** Chromium checks the track choice (`data-music`), the controls, the stored preference and that every file is served. Whether sound is actually heard, and iOS Safari behaviour, need a real device.

# Sound effects (placeholder synth, owner choice 2026-10-16)

**Engine.** `src/platform/sfx.ts` builds every sound from Web Audio oscillators and filtered noise, so there are no audio files.
- 34 named sounds (`SfxName`), each a small recipe of tones and noise bursts.
- **Not production audio.** They are placeholders, meant to be replaced one by one with recorded files under the same names.
- Sounds start after the first gesture, are skipped while the page is hidden, and the same sound within 40 ms is dropped.
- Mute and volume are stored in `asterveil.fateweave.sfx.v1`, separate from the music.
- The title has an effects toggle and volume slider.

| Where | Sounds |
|---|---|
| Buttons | `click` on every enabled button (the D-pad steps instead) |
| Map | `step`, `bump` (wall/stone/pit/seal), `encounter`, `chest`/`chestRare`, `rest`, `heal` (revive), `potion`, `rune`/`runeReset`/`door`, `lever` (+`door` when solved), `push`, `secret`, `herb`, `open` (event tile), `victory` (goal) |
| Battle (per actor turn, from its events) | `hit` (physical) or `zap` (energy intent or energy move), `crit` (execute/finisher/backstab), `miss` (dodge/evade), `guard`, `barrier`, `heal`, `buff`, `debuff`, `cancel`, `down`, then `victory`/`defeat` |
| Lobby | `coin` (hire, market, refresh), `upgrade`, `anvil` (forge, salvage, smelt), `potion` (brew), `claim`, `buff` (talent), `guard` (equip) |

**Testing.** `<html data-sfx>` names the last sound played, so Chromium tests check which sound each action picks and that the toggle is stored. Whether the sounds are heard, and how they sound, needs a real device.
