# Cloudflare development API — P09 infrastructure probe

ส่วนนี้ใช้ตรวจว่า GitHub Actions ใช้บัญชี Cloudflare และ deploy Worker ได้จริง
ยังไม่มีบัญชีผู้เล่น D1 Durable Objects เซฟออนไลน์ หรือการตัดสินรางวัล และไม่ได้ย้ายหน้าเกมออกจาก GitHub Pages

## ข้อมูลที่เจ้าของเตรียม

Repository Settings → Secrets and variables → Actions → Repository secrets:

- `CLOUDFLARE_API_TOKEN`: API token ที่มี Account / Workers Scripts / Edit สำหรับบัญชีเป้าหมาย
- `CLOUDFLARE_ACCOUNT_ID`: Account ID 32 ตัวอักษรจาก Cloudflare

ไม่ใส่ token ในไฟล์ โค้ด frontend ภาพหน้าจอ หรือข้อความแชต; D1 Edit จะใช้เมื่อเริ่มงานฐานข้อมูลในภายหลัง
หาก Cloudflare ขอเลือก workers.dev subdomain ครั้งแรก ให้เลือกใน Compute → Workers & Pages แล้วรัน workflow ซ้ำ

## ตรวจและเผยแพร่

ทดสอบในเครื่องด้วย `node cloudflare/health.node.mjs` (Node 24)
CI ตรวจเพิ่มด้วย Wrangler 4.153.0 `deploy --dry-run` โดยไม่ใช้ secret

workflow `Cloudflare development API` ตรวจ PR โดยไม่ deploy และ deploy เฉพาะ push ไป
`feature/fateweave-initial-prototype` ที่เปลี่ยนไฟล์ใน `cloudflare/` หรือ workflow นี้
หรือสั่ง workflow_dispatch บนสาขาเกม (เมนู Run workflow อาจไม่แสดงจน workflow อยู่บน default branch)
deploy ใช้ชื่อ `asterveil-api-dev` และตรวจ GET `/health` หลังเผยแพร่
URL ที่ตรวจผ่านจะแสดงใน Actions run summary

ผลที่ต้องได้: HTTP 200 และ `{"status":"ok","service":"asterveil-api","environment":"dev"}`
HEAD ไม่ส่ง body; method อื่นบน `/health` ได้ 405; เส้นทางอื่นได้ 404
endpoint นี้เป็น public probe ไม่รับข้อมูลผู้เล่นหรือคำสั่งเกม

## เมื่อรันไม่ผ่าน

- Missing repository secret: ตรวจชื่อและว่าเพิ่มเป็น repository secret ไม่ใช่ environment secret
- Authentication/permission: ตรวจ token ยังไม่หมดอายุ Account ID และสิทธิ์ Workers Scripts Edit
- workers.dev ยังไม่พร้อม: เลือก subdomain ใน Cloudflare แล้วรันใหม่
- Health check ไม่ผ่าน: ดู URL และ deploy log ใน workflow; อย่ารายงานว่าออนไลน์สำเร็จจาก deploy step เพียงอย่างเดียว

ย้อนกลับได้โดย deploy commit ก่อนหน้าที่ตรวจผ่าน หรือลบ Worker ทดสอบใน Cloudflare
ไม่มีข้อมูลผู้เล่นให้ migrate ในขั้นนี้
ขั้นต่อไปคือ P09-01 สเปก guest/การกู้คืน/ขอบเขตเซฟเก่า แล้ว P09-02 ฐานข้อมูลและธุรกรรม
การผ่าน probe นี้ไม่ทำให้งาน P09 ทั้งชุดเสร็จ
