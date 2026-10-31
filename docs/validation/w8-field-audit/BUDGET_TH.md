# งบ texture ต่อ encounter (W8 / A11) — สร้างจากโค้ด

> สร้างโดย `tests/encounter-budget.test.ts` (`npm run coverage:presentation`) จาก `unit-atlases.json`, content และไฟล์ใน `public/assets/fx`; เทสต์ล้มเมื่อรายงานไม่ตรงหรือสนามใดเกิน 64 MiB

- ฮีโร่ที่ atlas หนักสุด 5 คน (กรณีแย่สุด): `lyra`, `lalin`, `seren`, `brann`, `lio`
- สนามแย่สุด (ทีม 5 ตาม OD-05): `vanguard-captain` 39.6 MiB decoded / 12.49 MB download (งบ ≤64 MiB / ~12 MB)
- VFX ที่ preload ทุก battle (12 atlas): 67.7 MiB decoded / 10.10 MB — นอกงบ animation แต่วัดแยกตาม §7
- VFX โหลดเฉพาะ encounter ที่ใช้: boss 7.9 MiB · foe signature 6.3 MiB · saint/dance 6.7 MiB (ปล่อยเมื่อ encounter ถัดไปไม่ใช้)

| encounter | ศัตรู (สำรอง) | atlas ศัตรู | ทีม 4: decoded / download | ทีม 5: decoded / download | boss VFX |
| --- | --- | --- | --- | --- | --- |
| `first-clash` | 2 (0) | hunter, vargoth | 30.7 MiB / 9.71 MB | 35.0 MiB / 11.16 MB | — |
| `scout-patrol` | 1 (0) | sprite | 23.9 MiB / 7.75 MB | 28.2 MiB / 9.20 MB | — |
| `rift-whelp` | 1 (0) | tusker | 26.8 MiB / 8.60 MB | 31.1 MiB / 10.04 MB | — |
| `thicket-ambush` | 3 (0) | mycon, beetle, matriarch | 30.2 MiB / 10.12 MB | 34.5 MiB / 11.56 MB | โหลด |
| `shadow-stalker` | 1 (0) | stalker | 25.2 MiB / 8.09 MB | 29.5 MiB / 9.53 MB | — |
| `veil-siege` | 2 (0) | raider, brute | 30.6 MiB / 9.98 MB | 34.9 MiB / 11.42 MB | — |
| `rear-ambush` | 2 (0) | riftweaver, channeler | 28.5 MiB / 9.09 MB | 32.8 MiB / 10.53 MB | — |
| `crystal-stampede` | 2 (0) | golem, juggernaut | 30.1 MiB / 9.90 MB | 34.4 MiB / 11.34 MB | โหลด |
| `rift-warden` | 4 (3) | wisp, crawler, sentinel | 29.0 MiB / 9.53 MB | 33.3 MiB / 10.97 MB | โหลด |
| `elite-tusk-chief` | 3 (0) | sprite, tusker, sporepuff | 29.6 MiB / 9.41 MB | 33.9 MiB / 10.86 MB | โหลด |
| `elite-briar-lord` | 4 (1) | stalker, sporepuff, matriarch | 30.1 MiB / 9.97 MB | 34.4 MiB / 11.41 MB | โหลด |
| `mini-veil-golem` | 2 (0) | riftweaver, golem | 29.7 MiB / 9.62 MB | 34.0 MiB / 11.06 MB | — |
| `vanguard-captain` | 4 (1) | hunter, vargoth, captain | 35.3 MiB / 11.05 MB | 39.6 MiB / 12.49 MB | โหลด |
| `slime-pair` | 2 (0) | dew, ember | 25.2 MiB / 8.07 MB | 29.5 MiB / 9.52 MB | — |
| `bat-swarm` | 3 (0) | dew, bat | 26.0 MiB / 8.18 MB | 30.3 MiB / 9.63 MB | — |
| `slime-nest` | 4 (0) | dew, ember, bat | 27.1 MiB / 8.50 MB | 31.4 MiB / 9.95 MB | — |
| `tusker-bats` | 2 (0) | tusker, bat | 28.7 MiB / 9.03 MB | 33.0 MiB / 10.47 MB | — |
| `beetle-spore` | 2 (0) | beetle, sporepuff | 26.1 MiB / 8.32 MB | 30.4 MiB / 9.77 MB | — |
| `beetle-wall` | 3 (0) | beetle, sporepuff | 26.1 MiB / 8.32 MB | 30.4 MiB / 9.77 MB | — |
| `stalker-spore` | 2 (0) | stalker, sporepuff | 26.7 MiB / 8.54 MB | 31.0 MiB / 9.99 MB | — |
| `forest-swarm` | 4 (0) | beetle, sporepuff | 26.1 MiB / 8.32 MB | 30.4 MiB / 9.77 MB | — |
| `channeler-wisps` | 3 (0) | channeler, wisp | 26.1 MiB / 8.28 MB | 30.4 MiB / 9.72 MB | — |
| `crawler-pack` | 3 (0) | wisp, crawler | 25.3 MiB / 8.12 MB | 29.6 MiB / 9.56 MB | — |
| `rift-host` | 3 (0) | channeler, wisp, crawler | 27.4 MiB / 8.66 MB | 31.7 MiB / 10.11 MB | — |

ชนิดซ้ำในสนามใช้ texture เดียวกัน (นับครั้งเดียว) · decoded = กว้าง×สูง×4 ของ atlas (RGBA) ไม่ใช่ RAM/GPU รวมของเครื่อง
