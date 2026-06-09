/**
 * KST-RM UPDATE V2 — Azure Function: GetRMData
 * 
 * อ่านข้อมูล ADD (5).xlsx จาก SharePoint ผ่าน Microsoft Graph API
 * แปลงเป็น JSON format เดียวกับ window.RM_DATA
 * 
 * Endpoint: GET /api/GetRMData
 * Response: { data: [...], updatedAt: "ISO string", count: N }
 */

const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");

/* ──────────────────────────────────────────
   CONFIG (ใส่ค่าจริงใน Application Settings)
   ────────────────────────────────────────── */
const TENANT_ID    = process.env.AZURE_TENANT_ID;
const CLIENT_ID    = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET= process.env.AZURE_CLIENT_SECRET;
const SITE_ID      = process.env.SHAREPOINT_SITE_ID;   // ksthatyai365.sharepoint.com,<siteId>,<webId>
const FILE_PATH    = process.env.EXCEL_FILE_PATH || "/Shared Documents/ADD (5).xlsx";
const SHEET_NAME   = process.env.EXCEL_SHEET_NAME || "SOURCE";

/* ──────────────────────────────────────────
   คอลัมน์ mapping (ปรับตามหัวคอลัมน์จริงใน Excel)
   ────────────────────────────────────────── */
const COL = {
  date:    "A",  // วันที่         YYYY-MM-DD หรือ Excel serial
  bill:    "B",  // ชื่อเปิดบิล
  rawType: "C",  // ประเภทต้นฉบับ
  species: "D",  // ชนิดวัตถุดิบ
  size:    "E",  // ขนาด (ตัว/Kg)
  qty:     "F",  // ปริมาณ (Kg)
  price:   "G",  // ราคา (฿/Kg)
  prov:    "H",  // จังหวัด
  remark:  "I",  // หมายเหตุ
};

/* ──────────────────────────────────────────
   Excel serial date → YYYY-MM-DD
   ────────────────────────────────────────── */
function excelSerialToDateStr(serial) {
  if (!serial || isNaN(serial)) return null;
  const d = new Date((serial - 25569) * 86400 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ──────────────────────────────────────────
   แปลง rawType → type มาตรฐาน
   ────────────────────────────────────────── */
function normalizeType(raw) {
  if (!raw) return "กุ้งดอง";
  const r = String(raw).trim();
  if (r.includes("เป็น") || r.toUpperCase().includes("LIVE")) return "กุ้งเป็น";
  return "กุ้งดอง";
}

/* ──────────────────────────────────────────
   Main function
   ────────────────────────────────────────── */
module.exports = async function (context, req) {
  context.log("GetRMData called");

  /* CORS headers */
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-cache, no-store",
  };

  /* Handle preflight */
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers };
    return;
  }

  try {
    /* 1. Auth — Client Credentials (App permission: Files.Read.All) */
    const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"],
    });
    const graphClient = Client.initWithMiddleware({ authProvider });

    /* 2. Get Drive item ID for the Excel file */
    const driveItem = await graphClient
      .api(`/sites/${SITE_ID}/drive/root:${FILE_PATH}`)
      .select("id,name,lastModifiedDateTime")
      .get();

    const fileId = driveItem.id;
    const lastModified = driveItem.lastModifiedDateTime;

    /* 3. Read used range from sheet SOURCE */
    const rangeResp = await graphClient
      .api(`/sites/${SITE_ID}/drive/items/${fileId}/workbook/worksheets/${SHEET_NAME}/usedRange`)
      .select("values")
      .get();

    const rows = rangeResp.values || [];
    if (rows.length < 2) {
      context.res = {
        status: 200,
        headers,
        body: JSON.stringify({ data: [], updatedAt: lastModified, count: 0 }),
      };
      return;
    }

    /* 4. Parse header row → column index map */
    const headerRow = rows[0].map(h => String(h || "").trim().toLowerCase());
    const ci = {};
    // Auto-detect columns by header name (Thai or English)
    const detectors = {
      date:    h => h.includes("วันที่") || h.includes("date") || h === "d",
      bill:    h => h.includes("บิล") || h.includes("bill") || h.includes("ชื่อ"),
      rawType: h => h.includes("ประเภท") || h.includes("type"),
      species: h => h.includes("ชนิด") || h.includes("species"),
      size:    h => h.includes("ขนาด") || h.includes("size") || h.includes("ตัว/kg"),
      qty:     h => h.includes("ปริมาณ") || h.includes("qty") || h.includes("kg") || h.includes("น้ำหนัก"),
      price:   h => h.includes("ราคา") || h.includes("price"),
      prov:    h => h.includes("จังหวัด") || h.includes("province") || h.includes("prov"),
      remark:  h => h.includes("หมายเหตุ") || h.includes("remark") || h.includes("note"),
    };
    for (const [key, detect] of Object.entries(detectors)) {
      ci[key] = headerRow.findIndex(detect);
    }

    /* 5. Map rows → RM_DATA records */
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r.length) continue;

      const rawDate = ci.date >= 0 ? r[ci.date] : null;
      if (!rawDate) continue; // ข้ามแถวที่ไม่มีวันที่

      /* วันที่: รองรับทั้ง Excel serial number และ string YYYY-MM-DD */
      let dateStr;
      if (typeof rawDate === "number") {
        dateStr = excelSerialToDateStr(rawDate);
      } else {
        const s = String(rawDate).trim();
        /* รองรับ DD/MM/YYYY หรือ YYYY-MM-DD */
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          dateStr = s;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const [dd, mm, yyyy] = s.split("/");
          dateStr = `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
        } else {
          dateStr = null;
        }
      }
      if (!dateStr) continue;

      const rawType = ci.rawType >= 0 ? String(r[ci.rawType] || "").trim() : "";
      const qty     = parseFloat(ci.qty  >= 0 ? r[ci.qty]  : 0) || 0;
      const price   = parseFloat(ci.price>= 0 ? r[ci.price]: 0) || 0;
      const size    = parseFloat(ci.size >= 0 ? r[ci.size] : 0) || null;

      if (qty <= 0) continue; // ข้ามแถวที่ไม่มีปริมาณ

      data.push({
        d:       dateStr,
        bill:    ci.bill    >= 0 ? String(r[ci.bill]    || "").trim() : "",
        type:    normalizeType(rawType),
        rawType: rawType,
        species: ci.species >= 0 ? String(r[ci.species] || "").trim() : "",
        size:    size > 0 ? size : null,
        qty:     qty,
        price:   price,
        prov:    ci.prov    >= 0 ? String(r[ci.prov]    || "").trim() : "",
        remark:  ci.remark  >= 0 ? String(r[ci.remark]  || "").trim() : "",
      });
    }

    context.log(`Parsed ${data.length} records from ${rows.length - 1} rows`);

    context.res = {
      status: 200,
      headers,
      body: JSON.stringify({
        data,
        updatedAt: lastModified,
        count: data.length,
      }),
    };
  } catch (err) {
    context.log.error("GetRMData error:", err.message);
    context.res = {
      status: 500,
      headers,
      body: JSON.stringify({ error: err.message, data: [] }),
    };
  }
};
