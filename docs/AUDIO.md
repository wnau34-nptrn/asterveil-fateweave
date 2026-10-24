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
- **Controls (2026-10-19):** music/effects toggles, percentage readouts and separate volume sliders in the ตั้งค่า tab of map/battle information, plus a music toggle in the lobby header. Home has no audio panel.

**Testing.** Chromium checks the track choice (`data-music`), the controls, the stored preference and that every file is served. Whether sound is actually heard, and iOS Safari behaviour, need a real device.

# Sound effects (placeholder synth, owner choice 2026-10-16)

**Engine.** `src/platform/sfx.ts` builds every sound from Web Audio oscillators and filtered noise, so there are no audio files.
- 34 named sounds (`SfxName`), each a small recipe of tones and noise bursts.
- **Not production audio.** They are placeholders, meant to be replaced one by one with recorded files under the same names.
- Sounds start after the first gesture, are skipped while the page is hidden, and the same sound within 40 ms is dropped.
- Recovery (2026-10-18): every later pointer/key gesture can resume a suspended or interrupted Web Audio context; returning to the page or enabling effects retries too. Closed contexts are recreated. Safari's optional Audio Session API is set to `playback` to match music; unsupported/rejected API access falls back to gesture recovery. Mute/volume preferences are preserved, and missed effects are never replayed in a burst.
- Mute and volume are stored in `asterveil.fateweave.sfx.v1`, separate from the music.
- Map and battle information separate คำแนะนำ and ตั้งค่า; battle also has บันทึก. Audio preferences synchronize between map and battle. Controls never spend a turn or change the game save; dialog-closing touch protection is retained.
- No sound-test button is exposed (owner request, 2026-10-19). The underlying preview/recovery helpers remain covered by unit tests; physical iPhone output is still unverified.

| Where | Sounds |
|---|---|
| Buttons | `click` on every enabled button (the D-pad steps instead) |
| Map | `step`, `bump` (wall/stone/pit/seal), `encounter`, `chest`/`chestRare`, `rest`, `heal` (revive), `potion`, `rune`/`runeReset`/`door`, `lever` (+`door` when solved), `push`, `secret`, `herb`, `open` (event tile), `victory` (goal) |
| Battle (per actor turn, from its events) | `hit` (physical) or `zap` (energy intent or energy move), `crit` (execute/finisher/backstab), `miss` (dodge/evade), `guard`, `barrier`, `heal`, `buff`, `debuff`, `cancel`, `down`, then `victory`/`defeat` |
| Lobby | `coin` (hire, market, refresh), `upgrade`, `anvil` (forge, salvage, smelt), `potion` (brew), `claim`, `buff` (talent), `guard` (equip) |

**Testing.** `<html data-sfx>` names the last sound requested, even if playback is blocked: it cannot prove audio output. Lifecycle unit tests check actual oscillator/noise start calls after interruptions, rejected unlock, return from background, keyboard recovery, unmute and closed-context recreation. A focused Chromium battle test observes native audio-context state and oscillator scheduling after suspension for both an attack and Arcane Bolt. Audible output and iOS Safari behaviour still need a real device.
