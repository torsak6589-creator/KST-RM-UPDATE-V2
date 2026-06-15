# KST-RM UPDATE V2 — Azure Function Setup Guide

## โครงสร้างไฟล์

```
kst-rm-dashboard/
├── index.html              ← GitHub Pages frontend (live fetch)
├── data.js                 ← Fallback data (ใช้เมื่อ Azure Function ล่ม)
├── 404.html
├── README.md
└── api/                    ← Azure Functions project
    ├── host.json
    ├── package.json
    └── GetRMData/
        ├── index.js        ← Function code
        └── function.json
```

---

## ขั้นตอน 1 — Azure App Registration (ทำครั้งเดียว)

ไปที่ Azure Portal → App registrations → **KST-RM UPDATE V2**

### 1.1 API Permissions (ต้องเป็น Application permission ไม่ใช่ Delegated)

| Permission | Type | คำอธิบาย |
|---|---|---|
| `Files.Read.All` | Application | อ่านไฟล์ SharePoint |
| `Sites.Read.All` | Application | เข้าถึง SharePoint site |

กด **Grant admin consent** หลังเพิ่ม permission

### 1.2 Certificates & secrets
- สร้าง **Client secret** ใหม่ → copy value ไว้ (เห็นแค่ครั้งเดียว)

---

## ขั้นตอน 2 — หา SharePoint Site ID

เปิด Browser ไปที่:
```
https://graph.microsoft.com/v1.0/sites/ksthatyai365.sharepoint.com:/sites/KSTRMUPDATEV2
```
(ล็อกอิน Graph Explorer ก่อน)

copy ค่า `id` ได้เลย รูปแบบ: `ksthatyai365.sharepoint.com,xxxxxxxx-xxxx,xxxxxxxx-xxxx`

---

## ขั้นตอน 3 — สร้าง Azure Function App

1. Azure Portal → **Create a resource** → **Function App**
2. ตั้งค่า:
   - **Name**: `kst-rm-api` (หรือชื่ออื่น)
   - **Runtime stack**: Node.js 18
   - **Region**: Southeast Asia (ใกล้สุด)
   - **Plan**: Consumption (Serverless) — ฟรีถึง 1M calls/เดือน

3. Deploy code:
```bash
cd api/
npm install
func azure functionapp publish kst-rm-api
```

หรือ deploy ผ่าน VS Code Extension: **Azure Functions**

---

## ขั้นตอน 4 — Application Settings

ใน Azure Portal → Function App → **Configuration → Application settings**
เพิ่มค่าเหล่านี้:

| Name | Value | จำเป็น |
|------|-------|--------|
| `AZURE_TENANT_ID` | Directory (tenant) ID จาก App Registration Overview | ✅ |
| `AZURE_CLIENT_ID` | Application (client) ID | ✅ |
| `AZURE_CLIENT_SECRET` | Secret ที่สร้างใน Step 1.2 | ✅ |
| `EXCEL_SHEET_NAME` | ชื่อ sheet RM (default `RM RECORD`, สำรอง `SOURCE`) | optional |
| `SHARE_RM` | sharing token (`u!...`) ของไฟล์ RM RECORD (`ADD (5).xlsx`) | optional* |
| `SHARE_PLAN` | sharing token (`u!...`) ของไฟล์ PLAN/ACTUAL/PRICE/RECEIVE (site KSTRMUPDATEV2) | optional* |

> \* `SHARE_RM` / `SHARE_PLAN` มีค่า default ฝังในโค้ดอยู่แล้ว (ตรงกับที่ dashboard ใช้)
> ตั้งเป็น App Setting เฉพาะเมื่อย้ายไฟล์/เปลี่ยนลิงก์แชร์ ก็ override ได้โดยไม่ต้องแก้โค้ด
>
> ℹ️ ไม่ต้องใช้ `SHAREPOINT_SITE_ID` / `EXCEL_FILE_PATH` อีกแล้ว — เวอร์ชันนี้ resolve
> ไฟล์ผ่าน sharing token (`/shares/{token}/driveItem`) ซึ่งรองรับทั้งไฟล์บน
> SharePoint site และ OneDrive ส่วนตัวด้วย Application permission

กด **Save**

---

## ขั้นตอน 5 — แก้ dashboard (`kst-rm-dashboard/kst_rm_v17.html`)

แก้ค่าใน block `BACKEND API`:
```javascript
const API_BASE = 'https://kst-rm-api.azurewebsites.net/api'; // ← URL Function App จริง
const API_CODE = '';  // ← function key ถ้าใช้ authLevel: function (เว้นว่างถ้า anonymous)
```

- ถ้า `API_BASE` ไม่ว่าง → ทุก sheet จะดึงผ่าน backend (app-level) ก่อน
  → ผู้ใช้ทุกคนได้ข้อมูลชุดเดียวกับเจ้าของ
- ถ้า backend ล่ม/เน็ตขาด → fallback อัตโนมัติไปวิธีอ่านด้วยสิทธิ์ผู้ใช้ + snapshot เดิม

### Function Key (ถ้าใช้ authLevel: function)
ใน Azure Portal → Function App → Functions → GetRMData → **Function Keys**
copy default key แล้ววางใน `API_CODE`

> 🔒 หมายเหตุความปลอดภัย: dashboard อยู่บน GitHub Pages (public) — function key ที่ฝัง
> ในหน้าเว็บถือว่าเปิดเผยได้ ถ้าต้องการจำกัดเฉพาะคนในองค์กร แนะนำเปิด Azure AD
> (Easy Auth) ที่ Function App แล้วให้ dashboard แนบ Bearer token ของผู้ใช้แทน `code`

---

## ขั้นตอน 6 — ทดสอบ CORS

Function App → **CORS** → เพิ่ม:
```
https://torsak6589-creator.github.io
```

---

## ขั้นตอน 7 — ทดสอบ API

Endpoint รองรับหลาย dataset ผ่าน query `?dataset=`:

| dataset | sheet | ใช้ใน dashboard |
|---------|-------|-----------------|
| `rm` (default) | RM RECORD / SOURCE | ตารางรับซื้อ |
| `plan` | PLAN_DAILY | แผนรับซื้อรายวัน |
| `actual` | ACTUAL_TRACKING | KPI รายเดือน |
| `price` | ราคา  RM คิดขาย | ราคา RM คิดขาย |
| `receive` | RM-RECIVE | รับเข้าโรงงาน |

เปิด browser ไปที่ (ใส่ `&code=<FUNC_KEY>` ถ้าใช้ authLevel: function):
```
https://kst-rm-api.azurewebsites.net/api/GetRMData?dataset=rm
```

ควรได้ response (values = usedRange ดิบรวม header row):
```json
{
  "values": [["วันที่","ชื่อเปิดบิล", ...], ["2026-06-09", ...]],
  "updatedAt": "2026-06-09T...",
  "sheet": "RM RECORD",
  "dataset": "rm",
  "count": 150,
  "data": [ { "d": "2026-06-09", "qty": 2000, ... } ]
}
```
(`data[]` ที่ parse แล้วจะแนบมาเฉพาะ `dataset=rm` เพื่อความเข้ากันได้กับของเดิม)

---

## ขั้นตอน 8 — Commit & Deploy

```bash
git add index.html
git commit -m "feat: live Azure Function data fetch"
git push origin main
```

GitHub Pages จะ deploy อัตโนมัติใน ~1 นาที

---

## Auto-refresh

Dashboard จะ fetch ข้อมูลใหม่อัตโนมัติทุก **5 นาที**
หรือกด **ลองใหม่** ที่ badge มุมขวาบนถ้าโหลดไม่สำเร็จ

## Fallback

ถ้า Azure Function ล่มหรือเน็ตขาด — dashboard จะใช้ข้อมูลจาก `data.js` แทน
ควร update `data.js` สัปดาห์ละครั้งเป็น backup
