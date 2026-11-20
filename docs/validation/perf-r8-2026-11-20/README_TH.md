# R8 — เก็บภาพเกมไว้ในเครื่องระหว่างการเล่นแต่ละครั้ง (service worker, 20 พ.ย. 2026)

เจ้าของ: “ต่อ R8 เลย” — ต่อจากรายงาน audit (C6) บน branch `claude/perf-audit-2026-11-20` ไม่เปลี่ยนกติกา เซฟ ภาพ หรือ API

## ปัญหา

GitHub Pages ส่งทุกไฟล์ด้วย cache 10 นาที เปลี่ยน header ไม่ได้ และ atlas/ภาพส่วนใหญ่ไม่มี hash ในชื่อ กลับมาเล่นหลัง 10 นาทีต้องถามเซิร์ฟเวอร์ซ้ำ (304) หลายสิบไฟล์ และถ้ามือถือล้าง HTTP cache ก็ต้องโหลดใหม่ทั้งหมด

## สิ่งที่ทำ

- **ไม่เปลี่ยนชื่อไฟล์**: build สร้าง `sw.js` (`vite.config.ts` plugin `fateweave-service-worker`) = `src/platform/service-worker.js` + build id + manifest ของทุกไฟล์ใต้ `assets/` พร้อม SHA-256 12 หลัก (ไม่รวมเพลง) ~14 KB
- **service worker**: cache-first ตาม path + hash — ไฟล์ที่ hash ไม่เปลี่ยนตั้งแต่ครั้งที่เก็บมาจาก cache; ไฟล์ใหม่/เปลี่ยนมาจากเน็ตแล้วแทนของเก่า; ตอน activate ลบสำเนาที่ hash ไม่ตรงหรือไม่อยู่ใน build แล้ว ไม่แตะ index.html, `version.json`, `sw.js`, API, เพลง (range request) และไฟล์ที่ไม่อยู่ใน manifest — แถบ “มีเวอร์ชันใหม่” และโหมด server ทำงานเหมือนเดิม
- **ลงทะเบียน** (`src/platform/service-worker-register.ts`, เรียกใน `main.ts`): เฉพาะ production build หลังหน้าโหลดเสร็จ; ไม่ลงทะเบียนภายใต้ browser automation (เทสต์ Playwright ยัง route คำขอเองได้) เว้นแต่ `?sw=1`; **`?sw=off` ถอน service worker และล้าง cache** (ทางออกถ้าเครื่องไหนค้าง)

## ผลวัด (Chromium 390×844, CPU 4×, 4G, `vite preview` ของ build แบบ Pages; เปิดเกมรอบสองหลังรอบแรกเข้าแผนที่)

| กรณี | ไม่มี SW | มี SW |
|---|---|---|
| HTTP cache ยังอยู่ (เหมือน Pages หลัง 10 นาที: ถามซ้ำทุกไฟล์) | 40 คำขอผ่านเน็ต, network idle 3.5 s | 11 คำขอผ่านเน็ต + 28 จาก SW, 2.8 s |
| HTTP cache ถูกล้าง (มือถือเคลียร์/พื้นที่เต็ม) | **9.0 MB**, network idle 9.6 s | **2.3–4.4 MB** (49 ไฟล์จาก SW), 7.2–7.4 s |

ไฟล์ที่โหลดก่อน SW เริ่มคุมหน้า (ครั้งแรกสุด) ยังไม่ถูกเก็บ จึงเก็บครบภายในการเล่นครั้งที่สอง ตัวเลขนี้วัดกับ `vite preview` ไม่ใช่ Pages จริง (container เข้า Pages ไม่ได้)

## ทดสอบ

- `tests/service-worker.test.ts` (4): ลงทะเบียนเฉพาะ production, ไม่ลงภายใต้ automation ยกเว้น `?sw=1`, `?sw=off` ถอน+ล้าง, worker ไม่แตะ range/ไฟล์นอก manifest/เพลง
- Vitest ทั้งหมด, typecheck, lint, build (ตรวจว่า `dist/sw.js` ถูกสร้าง); Playwright update-banner, unit-loading, perf-probe, portrait-keyboard (22)
- ยังไม่ได้ลองบน Safari/iPhone จริง (Safari รองรับ service worker แต่จำกัดพื้นที่ cache) — ถ้ามีปัญหาใช้ `?sw=off`
