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

| Name | Value |
|------|-------|
| `AZURE_TENANT_ID` | Directory (tenant) ID จาก App Registration Overview |
| `AZURE_CLIENT_ID` | Application (client) ID |
| `AZURE_CLIENT_SECRET` | Secret ที่สร้างใน Step 1.2 |
| `SHAREPOINT_SITE_ID` | Site ID จาก Step 2 |
| `EXCEL_FILE_PATH` | `/Shared Documents/ADD (5).xlsx` |
| `EXCEL_SHEET_NAME` | `SOURCE` |

กด **Save**

---

## ขั้นตอน 5 — แก้ index.html

เปิด `index.html` แก้บรรทัดนี้:
```javascript
const AZURE_FUNC_URL = "https://<YOUR-FUNC-APP>.azurewebsites.net/api/GetRMData";
```
เปลี่ยนเป็น URL จริง เช่น:
```javascript
const AZURE_FUNC_URL = "https://kst-rm-api.azurewebsites.net/api/GetRMData";
```

### Function Key (ถ้าใช้ authLevel: function)
ใน Azure Portal → Function App → Functions → GetRMData → **Function Keys**
copy default key แล้วใส่:
```javascript
const FUNC_KEY = "xxxxxxxxxxxxxxxxxxx==";
```

---

## ขั้นตอน 6 — ทดสอบ CORS

Function App → **CORS** → เพิ่ม:
```
https://torsak6589-creator.github.io
```

---

## ขั้นตอน 7 — ทดสอบ API

เปิด browser ไปที่:
```
https://kst-rm-api.azurewebsites.net/api/GetRMData?code=<FUNC_KEY>
```

ควรได้ response:
```json
{
  "data": [...],
  "updatedAt": "2026-06-09T...",
  "count": 150
}
```

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
