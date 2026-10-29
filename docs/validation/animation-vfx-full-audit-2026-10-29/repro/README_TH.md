# ทำซ้ำ audit

ใช้ checkout ของ source SHA ใน README หลักและ dependencies ตาม package-lock (`npm ci`) ชุดนี้เป็น dev-only audit fixture ไม่ใช่ production feature หรือการเล่นแคมเปญครบทุกด่าน

```sh
cp docs/validation/animation-vfx-full-audit-2026-10-29/repro/runtime.html.txt audit-runtime.html
cp docs/validation/animation-vfx-full-audit-2026-10-29/repro/runtime.ts.txt audit-runtime.ts
mkdir -p /workspace/full-animation-audit
npm run dev -- --port 5174 --strictPort
```

อีก terminal ที่ project root:

```sh
node docs/validation/animation-vfx-full-audit-2026-10-29/repro/probe.cjs
AUDIT_WORKERS=2 node docs/validation/animation-vfx-full-audit-2026-10-29/repro/run.cjs
node docs/validation/animation-vfx-full-audit-2026-10-29/repro/live.cjs
```

- Scripts ใช้ `/usr/bin/chromium` และ port5174 ตามเครื่องที่ทดสอบ ต้องแก้ executable path/URL สำหรับ OS อื่นก่อนรัน หาก output อื่นให้กำหนด `AUDIT_OUTPUT_DIR`; `AUDIT_FILTER` เป็น regex เลือกกรณี; `run.cjs` ใช้ `AUDIT_WORKERS`
- Root fixture imports src จริงและ BattleUI/BattleScene/resolveCommand เดิม ไม่มี custom damage events มันจัด party/loadout/speed/HP/phase และ initial statuses เพื่อเลือกท่าที่จะตรวจ; `started=true` หมายถึงเริ่มจาก state หลัง beginBattle แล้ว มิฉะนั้น Start จะล้าง test conditions; ไม่ใช้ Start เพื่อแสร้งว่าทดสอบ barrier/phase แล้ว
- Reaction ของตัวหลังใช้ energy intent ที่ยิงถึง back row ตามกฎ; หลังบันทึกต้องยืนยัน event.type + targetId + amount/absorbed ของอาการนั้น ไม่ตีความภาพที่อีกตัวถูกโจมตีว่า target ผ่าน
- `counter` เลือก talent/ท่าจริงตามบรรทัดใน fixture ไม่มี counter event ที่สร้างมือ
- `run.cjs` ใช้ controlled clock เก็บ render checkpoints, frame/alpha/FX/events, expected-state comparison และ test-key snapshot stability ส่วน `live.cjs` ใช้ clock จริง, รอ pre-input frames, จับ actual pointer-down กับCDP timestamps และ encode แบบVFR โดยไม่retime/interpolate; encodingเป็นasyncเพื่อไม่บล็อกackของอีกcapture
- Exact rerun ที่362casesประกอบด้วย250ฐาน+4counter+108modes ช่วงพัฒนาตัวจับเคยแก้ QA setup/targeting แล้วรันทับกรณีที่ตั้งไม่ตรง ก่อน packageตรวจ actualreactioneventsทั้ง100กรณีผ่านแล้ว ไม่ถือว่า setupที่ผิดเดิมเป็นproductbug
- เปรียบเทียบ state แบบ canonical key order เพราะ JSON property insertion order ไม่ใช่กฎเกม; ไม่มีการแก้ resolver/save เพื่อให้เทียบผ่าน
- Root entry เป็นไฟล์ชั่วคราวที่ผู้ตรวจสร้างเอง เก็บเฉพาะสำเนา .txt ในรายงานเพื่อไม่ให้เข้า production TypeScript/build ก่อนจบงานลบ root entry ที่สร้างรอบนี้และหยุด audit server อย่าเพิ่มเส้นทาง audit เข้าเกมเผยแพร่
