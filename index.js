/**
 * KST-RM UPDATE V2 — Azure Function: GetRMData
 *
 * อ่านข้อมูลจาก Excel บน SharePoint/OneDrive ผ่าน Microsoft Graph API
 * โดยใช้ "App-level credentials" (Client Credentials + Files.Read.All)
 *
 * จุดสำคัญ: เพราะใช้ identity ของ "แอป" ไม่ใช่ของผู้ใช้แต่ละคน
 *   → ผู้ใช้ทุกคนจะได้ข้อมูล "ชุดเดียวกัน" กับเจ้าของแอปเสมอ
 *   → แก้ปัญหา "ผู้ใช้รายอื่นได้ข้อมูลไม่ตรงกับเจ้าของ" (403 / WAC token)
 *     ที่เกิดจาก dashboard เดิมอ่านไฟล์ด้วยสิทธิ์ส่วนตัวของผู้ใช้แต่ละคน
 *
 * Endpoint : GET /api/GetRMData?dataset=rm|plan|actual|price|receive
 * Response : { values: [[...row], ...], updatedAt: ISO, sheet, dataset, count }
 *            (values = usedRange ดิบรวม header row — format เดียวกับ Graph workbook usedRange)
 *
 * เพื่อความเข้ากันได้กับของเดิม: dataset=rm จะแนบ data[] ที่ parse แล้วมาด้วย
 */

const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");

/* ──────────────────────────────────────────
   CONFIG (ใส่ค่าจริงใน Application Settings)
   ────────────────────────────────────────── */
const TENANT_ID     = process.env.AZURE_TENANT_ID;
const CLIENT_ID     = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

/* Sharing tokens (รูปแบบ "u!..." ของ Graph /shares) — override ได้ผ่าน App Settings
   ค่า default ตรงกับที่ dashboard ใช้อยู่ (ADD (5).xlsx + ไฟล์ KSTRMUPDATEV2) */
const SHARE_RM   = process.env.SHARE_RM   ||
  "u!aHR0cHM6Ly9rc3RoYXR5YWkzNjUtbXkuc2hhcmVwb2ludC5jb20vOng6L2cvcGVyc29uYWwvdG9yc2FrX2FyX2tzdC1oYXR5YWlfY29tL0lRQTEwdEFvQ0VwUlJZUm4tYzdCMUtDdUFUSkZLTmM4SU5xUmtMekZyYi1nRzJjP2U9U2lscmxh";
const SHARE_PLAN = process.env.SHARE_PLAN ||
  "u!aHR0cHM6Ly9rc3RoYXR5YWkzNjUuc2hhcmVwb2ludC5jb20vOng6L3MvS1NUUk1VUERBVEVWMi9JUUQzeHhpOHhYVDJTYmNiQ1pJNVlMbVFBYTdsOVJTNmxjZm1MMXFqZ2JRX1d2ST9lPWIxVmF0cw";

/* dataset → ไฟล์ (sharing token) + ชื่อ sheet (รองรับชื่อสำรอง) */
const DATASETS = {
  rm:      { share: SHARE_RM,   sheets: [process.env.EXCEL_SHEET_NAME || "RM RECORD", "SOURCE"] },
  plan:    { share: SHARE_PLAN, sheets: ["PLAN_DAILY"] },
  actual:  { share: SHARE_PLAN, sheets: ["ACTUAL_TRACKING"] },
  price:   { share: SHARE_PLAN, sheets: ["ราคา  RM คิดขาย", "ราคา RM คิดขาย"] },
  receive: { share: SHARE_PLAN, sheets: ["RM-RECIVE"] },
};

/* ──────────────────────────────────────────
   คอลัมน์ mapping (ปรับตามหัวคอลัมน์จริงใน Excel) — ใช้เฉพาะ dataset=rm
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
   parse rows (RM) → RM_DATA records  (backward-compat กับของเดิม)
   ────────────────────────────────────────── */
function parseRmData(rows) {
  if (!rows || rows.length < 2) return [];
  const headerRow = rows[0].map(h => String(h || "").trim().toLowerCase());
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
  const ci = {};
  for (const [key, detect] of Object.entries(detectors)) ci[key] = headerRow.findIndex(detect);

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.length) continue;
    const rawDate = ci.date >= 0 ? r[ci.date] : null;
    if (!rawDate) continue;

    let dateStr;
    if (typeof rawDate === "number") {
      dateStr = excelSerialToDateStr(rawDate);
    } else {
      const s = String(rawDate).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) dateStr = s;
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split("/");
        dateStr = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      } else dateStr = null;
    }
    if (!dateStr) continue;

    const rawType = ci.rawType >= 0 ? String(r[ci.rawType] || "").trim() : "";
    const qty   = parseFloat(ci.qty   >= 0 ? r[ci.qty]   : 0) || 0;
    const price = parseFloat(ci.price >= 0 ? r[ci.price] : 0) || 0;
    const size  = parseFloat(ci.size  >= 0 ? r[ci.size]  : 0) || null;
    if (qty <= 0) continue;

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
  return data;
}

/* ──────────────────────────────────────────
   อ่าน usedRange ของ sheet จากไฟล์ที่อ้างด้วย sharing token
   (resolve share → driveId+itemId ก่อน แล้วค่อยเรียก workbook ของ drive item
    ซึ่งรองรับ application permission ได้แน่นอน)
   ────────────────────────────────────────── */
async function readSheetValues(graphClient, shareToken, sheetNames) {
  const item = await graphClient
    .api(`/shares/${shareToken}/driveItem`)
    .select("id,name,parentReference,lastModifiedDateTime")
    .get();

  const driveId = item.parentReference && item.parentReference.driveId;
  const itemId = item.id;
  if (!driveId || !itemId) throw new Error("ไม่พบ driveId/itemId จาก sharing token");

  const errors = [];
  for (const sheet of sheetNames) {
    try {
      const resp = await graphClient
        .api(`/drives/${driveId}/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/usedRange`)
        .select("values")
        .get();
      return { values: resp.values || [], updatedAt: item.lastModifiedDateTime, sheet };
    } catch (e) {
      errors.push(`${sheet}: ${e.message}`);
    }
  }
  throw new Error("อ่าน sheet ไม่สำเร็จ: " + errors.join(" | "));
}

/* ──────────────────────────────────────────
   Main function
   ────────────────────────────────────────── */
module.exports = async function (context, req) {
  context.log("GetRMData called");

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-cache, no-store",
  };

  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers };
    return;
  }

  const datasetKey = String((req.query && req.query.dataset) || "rm").toLowerCase();
  const ds = DATASETS[datasetKey];
  if (!ds) {
    context.res = {
      status: 400,
      headers,
      body: JSON.stringify({ error: `unknown dataset "${datasetKey}"`, datasets: Object.keys(DATASETS) }),
    };
    return;
  }

  try {
    /* Auth — Client Credentials (App permission: Files.Read.All) */
    const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"],
    });
    const graphClient = Client.initWithMiddleware({ authProvider });

    const { values, updatedAt, sheet } = await readSheetValues(graphClient, ds.share, ds.sheets);
    context.log(`dataset=${datasetKey} sheet="${sheet}" rows=${values.length}`);

    const body = {
      values,
      updatedAt,
      sheet,
      dataset: datasetKey,
      count: Math.max(0, values.length - 1),
    };
    /* backward-compat: dataset=rm แนบ data[] ที่ parse แล้ว */
    if (datasetKey === "rm") body.data = parseRmData(values);

    context.res = { status: 200, headers, body: JSON.stringify(body) };
  } catch (err) {
    context.log.error("GetRMData error:", err.message);
    context.res = {
      status: 500,
      headers,
      body: JSON.stringify({ error: err.message, dataset: datasetKey, values: [], data: [] }),
    };
  }
};
