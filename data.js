/**
 * KST-RM UPDATE V2 — Data file
 * แก้ไขไฟล์นี้เพื่ออัปเดตข้อมูลวัตถุดิบ
 *
 * โครงสร้าง record:
 *   d        : "YYYY-MM-DD"   วันที่
 *   bill     : string         ชื่อเปิดบิล / ชื่อ supplier
 *   type     : "กุ้งเป็น" | "กุ้งดอง"
 *   rawType  : string         ประเภทต้นฉบับ (ใส่ซ้ำหรือรายละเอียดเพิ่ม)
 *   species  : string         ชนิดกุ้ง เช่น "กุ้งขาว", "กุ้งกุลาดำ", "กุ้งทะเล"
 *   size     : number|null    ขนาด (ตัว/Kg)
 *   qty      : number         ปริมาณ (Kg)
 *   price    : number|null    ราคา (฿/Kg) ใส่ 0 หากยังไม่ทราบ
 *   prov     : string         จังหวัด/แหล่งที่มา
 *   remark   : string         หมายเหตุ
 */
window.RM_DATA = [
  /* -------- ตัวอย่างข้อมูล — ลบแล้วแทนด้วยข้อมูลจริง -------- */
  { d:"2026-06-07", bill:"ภิรมย์",      type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งขาว",   size:50,  qty:3200, price:270, prov:"สงขลา",    remark:"" },
  { d:"2026-06-07", bill:"พันทวีสินธุ์", type:"กุ้งดอง",  rawType:"กุ้งดอง",   species:"กุ้งขาว",   size:60,  qty:1800, price:230, prov:"นครศรีฯ",  remark:"" },
  { d:"2026-06-07", bill:"มุกดาวรรณ",   type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งกุลาดำ",size:35,  qty:2500, price:320, prov:"สุราษฎร์ฯ",remark:"" },
  { d:"2026-06-06", bill:"เต็มซีฟู้ด",  type:"กุ้งดอง",  rawType:"กุ้งดอง",   species:"กุ้งขาว",   size:70,  qty:1200, price:195, prov:"สงขลา",    remark:"" },
  { d:"2026-06-06", bill:"แพสัน-เต่า",  type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งทะเล",  size:40,  qty:4100, price:320, prov:"พัทลุง",   remark:"" },
  { d:"2026-06-06", bill:"โกเด่น",      type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งขาว",   size:55,  qty:2800, price:230, prov:"สงขลา",    remark:"" },
  { d:"2026-06-05", bill:"ภิรมย์",      type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งขาว",   size:50,  qty:3000, price:270, prov:"สงขลา",    remark:"" },
  { d:"2026-06-05", bill:"พันทวีสินธุ์", type:"กุ้งดอง",  rawType:"กุ้งดอง",   species:"กุ้งขาว",   size:65,  qty:2200, price:195, prov:"นครศรีฯ",  remark:"" },
  { d:"2026-06-04", bill:"มุกดาวรรณ",   type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งกุลาดำ",size:30,  qty:1900, price:380, prov:"สุราษฎร์ฯ",remark:"" },
  { d:"2026-06-04", bill:"เต็มซีฟู้ด",  type:"กุ้งดอง",  rawType:"กุ้งดอง",   species:"กุ้งทะเล",  size:45,  qty:3400, price:270, prov:"สงขลา",    remark:"" },
  { d:"2026-06-03", bill:"แพสัน-เต่า",  type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งขาว",   size:50,  qty:2700, price:270, prov:"พัทลุง",   remark:"" },
  { d:"2026-06-03", bill:"โกเด่น",      type:"กุ้งดอง",  rawType:"กุ้งดอง",   species:"กุ้งขาว",   size:60,  qty:1500, price:230, prov:"สงขลา",    remark:"" },
  { d:"2026-06-02", bill:"ภิรมย์",      type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งขาว",   size:55,  qty:3600, price:230, prov:"สงขลา",    remark:"" },
  { d:"2026-06-01", bill:"พันทวีสินธุ์", type:"กุ้งเป็น", rawType:"กุ้งเป็น",  species:"กุ้งกุลาดำ",size:28,  qty:2100, price:380, prov:"นครศรีฯ",  remark:"" },
  { d:"2026-06-01", bill:"มุกดาวรรณ",   type:"กุ้งดอง",  rawType:"กุ้งดอง",   species:"กุ้งขาว",   size:70,  qty:1400, price:175, prov:"สุราษฎร์ฯ",remark:"" },
];
