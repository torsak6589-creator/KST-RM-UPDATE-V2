# KST-RM UPDATE V2 — แจ้งวัตถุดิบเข้าประจำวัน

GitHub Pages dashboard สำหรับติดตามวัตถุดิบ (กุ้ง) เข้าประจำวัน

## โครงสร้างไฟล์

```
kst-rm-dashboard/
├── index.html          ← หน้าหลัก (React + Babel CDN)
├── 404.html            ← GitHub Pages SPA redirect
├── README.md
└── project/
    └── data.js         ← ข้อมูลวัตถุดิบ (window.RM_DATA)
```

## วิธีอัปเดตข้อมูล

แก้ไข `project/data.js` แล้ว commit ขึ้น GitHub

```js
window.RM_DATA = [
  {
    d: "2026-06-09",      // วันที่ YYYY-MM-DD
    bill: "ภิรมย์",       // ชื่อ supplier
    type: "กุ้งเป็น",     // "กุ้งเป็น" | "กุ้งดอง"
    rawType: "กุ้งเป็น",
    species: "กุ้งขาว",   // "กุ้งขาว" | "กุ้งกุลาดำ" | "กุ้งทะเล"
    size: 50,             // ตัว/Kg (null ถ้าไม่มี)
    qty: 3200,            // Kg
    price: 270,           // ฿/Kg (0 ถ้าไม่มี)
    prov: "สงขลา",
    remark: ""
  },
  // ...
];
```

## Deploy บน GitHub Pages

1. Push repo ขึ้น GitHub
2. ไปที่ **Settings → Pages → Source → main branch / root**
3. เข้าถึงได้ที่ `https://<username>.github.io/<repo-name>/`

## Power Automate Sync (optional)

ถ้าต้องการ sync จาก SharePoint/OneDrive อัตโนมัติ  
ให้ Power Automate generate `project/data.js` แล้ว commit ผ่าน GitHub API

