# สรุปคำสั่ง Prompt — KST-RM UPDATE V2 (แจ้งวัตถุดิบเข้าประจำวัน)

> ใช้ prompt นี้กับ AI (Claude / ChatGPT ฯลฯ) เพื่อสร้างแอปนี้ขึ้นใหม่ทั้งหมด

## Prompt หลัก

```
สร้างเว็บแอป Dashboard "แจ้งวัตถุดิบเข้าประจำวัน" สำหรับบริษัท ห้องเย็นโชติวัฒน์หาดใหญ่ (KST Hatyai)
เป็นไฟล์เดียว index.html (Single-file app) ใช้ React 18 + Babel Standalone ผ่าน CDN
รองรับ deploy บน GitHub Pages (https://torsak6589-creator.github.io/KST-RM-UPDATE-V2/)

ข้อกำหนด:

1. ธีม/ดีไซน์
   - ฟอนต์ IBM Plex Sans Thai
   - โทนสี navy เข้ม (#0A0E1A) + ทอง (#C8982A)
   - สีตามประเภท: กุ้งเป็น #e8456b, กุ้งดอง #5b6b7b, กุ้งขาว #1a73e8,
     กุ้งกุลาดำ #2b2f36, กุ้งทะเล #0f9488

2. การยืนยันตัวตน (Auth)
   - Login ด้วย Microsoft 365 ผ่าน MSAL Browser 2.38.3 (OAuth 2.0 PKCE)
   - จำกัดเฉพาะบัญชี @kst-hatyai.com (Tenant: 1a4d139b-4e96-4d3b-8cfd-007453cc609e)
   - Scopes: Files.Read.All, User.Read / เก็บ token ใน localStorage

3. แหล่งข้อมูล (เรียงลำดับ fallback)
   a) Azure Function endpoint /api/GetRMData (ดึง Excel จาก SharePoint ผ่าน Microsoft Graph)
   b) อ่านไฟล์ Excel "ADD (5).xlsx" sheet "RM RECORD" จาก SharePoint site KSTRMUPDATEV2
      โดยตรงผ่าน Graph API + SheetJS (xlsx 0.20.2)
   c) ไฟล์ data.js (window.RM_DATA) สำหรับ offline
   - Auto-refresh ทุก 5 นาที

4. โครงสร้างข้อมูล (1 รายการรับซื้อ)
   { d: "YYYY-MM-DD", bill: ชื่อเปิดบิล, type: "กุ้งเป็น"|"กุ้งดอง", rawType,
     species: "กุ้งขาว"|"กุ้งกุลาดำ"|"กุ้งทะเล", size: ตัว/กก., qty: กก.,
     price: บาท/กก., prov: จังหวัด, remark }
   - ตรวจจับหัวคอลัมน์ Excel อัตโนมัติ (วันที่/บิล/ประเภท/ชนิด/ขนาด/ปริมาณ/ราคา/จังหวัด/หมายเหตุ)
   - แปลง Excel serial date เป็น YYYY-MM-DD, ข้ามแถวที่ไม่มีวันที่หรือปริมาณ = 0

5. หน้าจอหลัก
   - การ์ดสรุปรายวัน: ปริมาณรวม (กก.), มูลค่ารวม (บาท), ราคาเฉลี่ย
   - แยกตามประเภท (กุ้งเป็น/กุ้งดอง) และชนิด (ขาว/กุลาดำ/ทะเล)
   - ตัวเลือกเดือน/วัน เพื่อดูข้อมูลย้อนหลัง

6. Backend (Azure Function "GetRMData" — Node.js 18)
   - HTTP GET + OPTIONS, authLevel: function, เปิด CORS ให้ https://torsak6589-creator.github.io
   - ใช้ @azure/identity (ClientSecretCredential) + @microsoft/microsoft-graph-client
   - Env vars: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET,
     SHAREPOINT_SITE_ID, EXCEL_FILE_PATH, EXCEL_SHEET_NAME
   - ตอบกลับ { data: [...], updatedAt, count }

สร้างไฟล์: index.html, data.js, index.js, function.json, host.json, package.json,
404.html, README.md, AZURE_SETUP.md
```
