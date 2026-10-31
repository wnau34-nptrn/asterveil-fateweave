# งบ texture ต่อ encounter (W8 / A11) — สร้างจากโค้ด

> สร้างโดย `tests/encounter-budget.test.ts` (`npm run coverage:presentation`) จาก `unit-atlases.json`, content และไฟล์ใน `public/assets/fx`; เทสต์ล้มเมื่อรายงานไม่ตรงหรือสนามใดเกิน 64 MiB

- ฮีโร่ที่ atlas หนักสุด 5 คน (กรณีแย่สุด): `lyra`, `lalin`, `seren`, `brann`, `lio`
- สนามแย่สุด (ทีม 5 ตาม OD-05): `vanguard-captain` 40.0 MiB decoded / 12.49 MB download (งบ ≤64 MiB / ~12 MB)
- VFX ที่ preload ทุก battle (12 atlas): 67.8 MiB decoded / 10.10 MB — นอกงบ animation แต่วัดแยกตาม §7
- VFX โหลดเฉพาะ encounter ที่ใช้: boss 7.9 MiB · foe signature 6.4 MiB · saint/dance 6.7 MiB (ปล่อยเมื่อ encounter ถัดไปไม่ใช้)

| encounter | ศัตรู (สำรอง) | atlas ศัตรู | ทีม 4: decoded / download | ทีม 5: decoded / download | boss VFX |
| --- | --- | --- | --- | --- | --- |
| `first-clash` | 2 (0) | hunter, vargoth | 31.1 MiB / 9.71 MB | 35.4 MiB / 11.16 MB | — |
| `scout-patrol` | 1 (0) | sprite | 24.3 MiB / 7.75 MB | 28.6 MiB / 9.20 MB | — |
| `rift-whelp` | 1 (0) | tusker | 27.2 MiB / 8.60 MB | 31.5 MiB / 10.05 MB | — |
| `thicket-ambush` | 3 (0) | mycon, beetle, matriarch | 30.6 MiB / 10.12 MB | 34.9 MiB / 11.56 MB | โหลด |
| `shadow-stalker` | 1 (0) | stalker | 25.6 MiB / 8.09 MB | 29.9 MiB / 9.54 MB | — |
| `veil-siege` | 2 (0) | raider, brute | 31.0 MiB / 9.98 MB | 35.3 MiB / 11.43 MB | — |
| `rear-ambush` | 2 (0) | riftweaver, channeler | 28.9 MiB / 9.09 MB | 33.2 MiB / 10.54 MB | — |
| `crystal-stampede` | 2 (0) | golem, juggernaut | 30.5 MiB / 9.90 MB | 34.8 MiB / 11.34 MB | โหลด |
| `rift-warden` | 4 (3) | wisp, crawler, sentinel | 29.4 MiB / 9.53 MB | 33.7 MiB / 10.97 MB | โหลด |
| `elite-tusk-chief` | 3 (0) | sprite, tusker, sporepuff | 30.0 MiB / 9.41 MB | 34.3 MiB / 10.86 MB | โหลด |
| `elite-briar-lord` | 4 (1) | stalker, sporepuff, matriarch | 30.5 MiB / 9.97 MB | 34.8 MiB / 11.41 MB | โหลด |
| `mini-veil-golem` | 2 (0) | riftweaver, golem | 30.1 MiB / 9.62 MB | 34.4 MiB / 11.07 MB | — |
| `vanguard-captain` | 4 (1) | hunter, vargoth, captain | 35.7 MiB / 11.05 MB | 40.0 MiB / 12.49 MB | โหลด |
| `slime-pair` | 2 (0) | dew, ember | 25.6 MiB / 8.07 MB | 29.9 MiB / 9.52 MB | — |
| `bat-swarm` | 3 (0) | dew, bat | 26.4 MiB / 8.18 MB | 30.7 MiB / 9.63 MB | — |
| `slime-nest` | 4 (0) | dew, ember, bat | 27.5 MiB / 8.50 MB | 31.8 MiB / 9.95 MB | — |
| `tusker-bats` | 2 (0) | tusker, bat | 29.1 MiB / 9.03 MB | 33.4 MiB / 10.48 MB | — |
| `beetle-spore` | 2 (0) | beetle, sporepuff | 26.5 MiB / 8.33 MB | 30.8 MiB / 9.77 MB | — |
| `beetle-wall` | 3 (0) | beetle, sporepuff | 26.5 MiB / 8.33 MB | 30.8 MiB / 9.77 MB | — |
| `stalker-spore` | 2 (0) | stalker, sporepuff | 27.2 MiB / 8.55 MB | 31.4 MiB / 9.99 MB | — |
| `forest-swarm` | 4 (0) | beetle, sporepuff | 26.5 MiB / 8.33 MB | 30.8 MiB / 9.77 MB | — |
| `channeler-wisps` | 3 (0) | channeler, wisp | 26.5 MiB / 8.28 MB | 30.8 MiB / 9.73 MB | — |
| `crawler-pack` | 3 (0) | wisp, crawler | 25.7 MiB / 8.12 MB | 30.0 MiB / 9.56 MB | — |
| `rift-host` | 3 (0) | channeler, wisp, crawler | 27.8 MiB / 8.67 MB | 32.1 MiB / 10.11 MB | — |

ชนิดซ้ำในสนามใช้ texture เดียวกัน (นับครั้งเดียว) · decoded = กว้าง×สูง×4 ของ atlas (RGBA) ไม่ใช่ RAM/GPU รวมของเครื่อง
