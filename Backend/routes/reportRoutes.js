/**
 * reportRoutes.js — สร้างรายงาน PDF สรุปผล Network Packet
 * GET /api/reports/pdf  รองรับ query param ตัวกรองเดียวกับ Packet Explorer
 * ใช้ pdfkit วาด PDF โดยตรงแบบ streaming ไม่บันทึกไฟล์ชั่วคราว
 */
const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Packet = require('../models/Packet');
const { getIsConnected } = require('../config/db');
const { getMemoryStore } = require('../services/packetService');
const { authenticate } = require('../middleware/auth');

// ต้องล็อกอินก่อนถึงจะดาวน์โหลด PDF ได้
router.use(authenticate);

// ชุดสีธีม dark-navy ของ PacketViz (ใช้ hex string ตลอด แปลงเป็น RGB ก่อนส่ง pdfkit)
const C = {
  bg:        '#050e1f',
  navy:      '#0a1628',
  panel:     '#0d1f3c',
  border:    '#1e3058',
  blue:      '#3b82f6',
  green:     '#10b981',
  red:       '#f43f5e',
  amber:     '#f59e0b',
  purple:    '#8b5cf6',
  cyan:      '#06b6d4',
  text:      '#c5d0e0',
  muted:     '#7b8ba8',
  dim:       '#4a5e80',
  white:     '#ffffff',
};

// แปลง hex color (#rrggbb) เป็น [r, g, b] ที่ pdfkit ต้องการ
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

// สีประจำแต่ละ protocol สำหรับแถบสีในตารางและกราฟ
const PROTOCOL_COLORS = {
  TCP: C.blue, UDP: C.purple, HTTP: C.red, HTTPS: C.green,
  DNS: C.amber, SSH: C.cyan, ICMP: '#f97316', FTP: '#ec4899', SMTP: '#14b8a6',
};

// สีประจำระดับภัยคุกคาม ใช้ highlight แถวและ bar ในหน้า Threat Summary
const THREAT_COLORS = {
  CRITICAL: C.red, HIGH: C.red, MEDIUM: C.amber, LOW: '#f97316', NONE: C.dim,
};

/* ── ฟังก์ชันช่วยวาดรูปทรงพื้นฐานบน PDF ── */
const rgb = (hex) => hexToRgb(hex);

// วาดสี่เหลี่ยมทึบ พร้อมปรับความโปร่งแสงได้
function drawRect(doc, x, y, w, h, hex, opacity = 1) {
  const [r, g, b] = rgb(hex);
  doc.save().fillOpacity(opacity).rect(x, y, w, h).fill([r, g, b]).restore();
}

// วาดสี่เหลี่ยมมุมโค้ง ใช้กับการ์ดสถิติและกล่อง threat
function drawRoundRect(doc, x, y, w, h, radius, hex, opacity = 1) {
  const [r, g, b] = rgb(hex);
  doc.save().fillOpacity(opacity).roundedRect(x, y, w, h, radius).fill([r, g, b]).restore();
}

// ฟังก์ชัน shorthand วางข้อความพร้อมกำหนดสีและขนาดฟอนต์ในครั้งเดียว
function text(doc, str, x, y, opts, hex = C.text, size = 9) {
  doc.fontSize(size).fillColor(hex).text(str, x, y, opts);
}

// วาดหัวข้อ section — พื้นหลัง panel + แถบสีน้ำเงินซ้าย + ตัวหนังสือขาว
// คืนค่าตำแหน่ง y ถัดไปหลัง header
function sectionHeader(doc, title, y) {
  const pageW = doc.page.width;
  const margin = 40;
  drawRect(doc, margin, y, pageW - margin * 2, 26, C.panel);
  drawRect(doc, margin, y, 3, 26, C.blue);
  doc.fontSize(10).fillColor(C.white).text(title, margin + 14, y + 7, { continued: false });
  return y + 26 + 10;
}

// วาดแถวหัวตาราง — พื้นหลัง border color + label ตัวพิมพ์ใหญ่สีหม่น
// columns = [{ label, width, color }]
function tableHeader(doc, columns, y, rowH = 18) {
  const margin = 40;
  drawRect(doc, margin, y, doc.page.width - margin * 2, rowH, C.border);
  let x = margin;
  for (const col of columns) {
    doc.fontSize(7).fillColor(C.dim)
       .text(col.label.toUpperCase(), x + 4, y + 5, { width: col.width - 8, ellipsis: true });
    x += col.width;
  }
  return y + rowH;
}

// วาดแถวข้อมูล 1 แถว
// isAlt = true → แรเงาสลับแถว; isHighlight = true → พื้นแดงอ่อน (packet น่าสงสัย)
function tableRow(doc, columns, values, y, rowH = 16, isAlt = false, isHighlight = false) {
  const margin = 40;
  const pageW = doc.page.width;
  if (isHighlight) {
    drawRect(doc, margin, y, pageW - margin * 2, rowH, C.red, 0.06);
  } else if (isAlt) {
    drawRect(doc, margin, y, pageW - margin * 2, rowH, C.panel, 0.6);
  }
  // เส้นแบ่งด้านล่างแต่ละแถว
  doc.save().strokeColor(...rgb(C.border)).lineWidth(0.3)
     .moveTo(margin, y + rowH).lineTo(pageW - margin, y + rowH).stroke().restore();

  let x = margin;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const val = values[i] ?? '-';
    let color = C.text;
    if (col.color) color = col.color(val);
    doc.fontSize(7.5).fillColor(color)
       .text(String(val), x + 4, y + 4, { width: col.width - 8, ellipsis: true });
    x += col.width;
  }
  return y + rowH;
}

// วาดการ์ดสถิติขนาดเล็ก — กรอบมุมโค้ง + แถบสีด้านบน + label/ค่า/คำอธิบาย
function statsCard(doc, x, y, w, label, value, subtext, accentHex) {
  drawRoundRect(doc, x, y, w, 60, 5, C.panel);
  drawRect(doc, x, y, w, 2, accentHex);
  doc.fontSize(7).fillColor(C.dim).text(label.toUpperCase(), x + 10, y + 10);
  doc.fontSize(20).fillColor(accentHex).text(String(value), x + 10, y + 20, { width: w - 20 });
  doc.fontSize(7).fillColor(C.muted).text(subtext, x + 10, y + 46, { width: w - 20, ellipsis: true });
}

/* ── สร้าง filter summary string ── */
function buildFilterSummary(query) {
  const parts = [];
  if (query.protocol)         parts.push(`Protocol: ${query.protocol}`);
  if (query.isEncrypted)      parts.push(`Encrypted: ${query.isEncrypted}`);
  if (query.isSuspicious)     parts.push(`Suspicious: ${query.isSuspicious}`);
  if (query.threatLevel)      parts.push(`Threat: ${query.threatLevel}`);
  if (query.encryptionMethod) parts.push(`Method: ${query.encryptionMethod}`);
  if (query.ipSearch)         parts.push(`IP: ${query.ipSearch}`);
  if (query.sizeMin || query.sizeMax) {
    parts.push(`Size: ${query.sizeMin || 0}-${query.sizeMax || 'max'} B`);
  }
  if (query.dateFrom)         parts.push(`From: ${new Date(query.dateFrom).toLocaleString()}`);
  if (query.dateTo)           parts.push(`To: ${new Date(query.dateTo).toLocaleString()}`);
  return parts.length ? parts.join('  |  ') : 'No filters applied - showing all packets';
}

/* ── GET /api/reports/pdf ── */
router.get('/pdf', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = req.user.id;
    const MAX = 200;

    // สร้าง filter object จาก query params เดียวกับ Packet Explorer
    // base = {} สำหรับ admin, { userId } สำหรับ user ทั่วไป
    const buildFilter = (base) => {
      const f = { ...base };
      if (req.query.protocol)          f.protocol = req.query.protocol.toUpperCase();
      if (req.query.isEncrypted !== undefined && req.query.isEncrypted !== '') f.isEncrypted = req.query.isEncrypted === 'true';
      if (req.query.isSuspicious !== undefined && req.query.isSuspicious !== '') f.isSuspicious = req.query.isSuspicious === 'true';
      if (req.query.threatLevel)       f.threatLevel = req.query.threatLevel;
      if (req.query.encryptionMethod)  f.encryptionMethod = req.query.encryptionMethod;
      if (req.query.ipSearch)          f.ipSearch = req.query.ipSearch;
      if (req.query.sizeMin)           f.sizeMin = parseInt(req.query.sizeMin);
      if (req.query.sizeMax)           f.sizeMax = parseInt(req.query.sizeMax);
      if (req.query.dateFrom)          f.dateFrom = req.query.dateFrom;
      if (req.query.dateTo)            f.dateTo = req.query.dateTo;
      return f;
    };

    let packets = [];
    if (getIsConnected()) {
      const filter = buildFilter(isAdmin ? {} : { userId });
      packets = await Packet.find({ filter, sort: { capturedAt: -1 }, skip: 0, limit: MAX });
    } else {
      let data = isAdmin ? getMemoryStore() : getMemoryStore().filter(p => p.userId === userId);
      if (req.query.protocol) data = data.filter(p => p.protocol === req.query.protocol.toUpperCase());
      if (req.query.isEncrypted !== undefined && req.query.isEncrypted !== '') data = data.filter(p => p.isEncrypted === (req.query.isEncrypted === 'true'));
      if (req.query.isSuspicious !== undefined && req.query.isSuspicious !== '') data = data.filter(p => p.isSuspicious === (req.query.isSuspicious === 'true'));
      if (req.query.ipSearch) { const s = req.query.ipSearch.toLowerCase(); data = data.filter(p => (p.sourceIP || '').includes(s) || (p.destinationIP || '').includes(s)); }
      if (req.query.threatLevel) data = data.filter(p => p.threatLevel === req.query.threatLevel);
      if (req.query.encryptionMethod) data = data.filter(p => p.encryptionMethod === req.query.encryptionMethod);
      if (req.query.sizeMin) data = data.filter(p => p.size >= parseInt(req.query.sizeMin));
      if (req.query.sizeMax) data = data.filter(p => p.size <= parseInt(req.query.sizeMax));
      if (req.query.dateFrom) { const d = new Date(req.query.dateFrom); data = data.filter(p => new Date(p.capturedAt) >= d); }
      if (req.query.dateTo)   { const d = new Date(req.query.dateTo);   data = data.filter(p => new Date(p.capturedAt) <= d); }
      packets = data.slice(0, MAX);
    }

    // คำนวณสถิติสรุปจาก packet ที่ได้มา — ใช้แสดงในการ์ดและกราฟ
    const total = packets.length;
    const encrypted = packets.filter(p => p.isEncrypted).length;
    const suspicious = packets.filter(p => p.isSuspicious).length;
    const avgSize = total > 0 ? Math.round(packets.reduce((s, p) => s + p.size, 0) / total) : 0;
    // นับจำนวน packet แยกตาม protocol และ threat level
    const protocolMap = {};
    const threatMap = {};
    for (const p of packets) {
      protocolMap[p.protocol] = (protocolMap[p.protocol] || 0) + 1;
      if (p.isSuspicious) threatMap[p.threatLevel] = (threatMap[p.threatLevel] || 0) + 1;
    }
    // เรียง protocol จากมากไปน้อย แสดงแค่ top 6
    const topProtocols = Object.entries(protocolMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    // เรียง threat level ตาม severity (CRITICAL > HIGH > MEDIUM > LOW)
    const threatSummary = Object.entries(threatMap).sort((a, b) => {
      const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
      return (rank[b[0]] ?? 0) - (rank[a[0]] ?? 0);
    });

    /* ── สร้าง PDF ── */
    const doc = new PDFDocument({ size: 'A4', margin: 40, compress: true, info: {
      Title: 'PacketViz — Packet Analysis Report',
      Author: req.user.username || 'PacketViz',
      Subject: 'Network Packet Analysis',
      Creator: 'PacketViz Dashboard',
    }});

    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="packetviz-report-${ts}.pdf"`);
    doc.pipe(res);

    const pageW = doc.page.width;
    const margin = 40;
    const contentW = pageW - margin * 2;

    /* ════════════════════════════════
       PAGE 1 — COVER + SUMMARY
    ════════════════════════════════ */

    // Background
    drawRect(doc, 0, 0, pageW, doc.page.height, C.bg);

    // Top accent bar
    drawRect(doc, 0, 0, pageW, 4, C.blue);

    // Logo area
    drawRoundRect(doc, margin, 30, 44, 44, 8, C.blue, 0.15);
    drawRoundRect(doc, margin, 30, 44, 44, 8, C.blue, 0.06);
    doc.fontSize(18).fillColor(C.blue).text('PV', margin + 8, 42);

    // Title block
    doc.fontSize(22).fillColor(C.white).text('PacketViz', margin + 55, 34);
    doc.fontSize(9).fillColor(C.muted).text('NETWORK PACKET ANALYSIS REPORT', margin + 55, 58);

    // Date & generator
    const headerRight = pageW - margin;
    doc.fontSize(8).fillColor(C.dim)
       .text(`Generated: ${new Date().toLocaleString()}`, margin, 38, { width: contentW, align: 'right' });
    doc.fontSize(8).fillColor(C.dim)
       .text(`By: ${req.user.username || 'unknown'}  |  Role: ${req.user.role}`, margin, 52, { width: contentW, align: 'right' });

    // Divider
    drawRect(doc, margin, 86, contentW, 1, C.border);

    // Report title
    let y = 100;
    doc.fontSize(16).fillColor(C.white).text('Packet Explorer Report', margin, y);
    y += 22;
    doc.fontSize(8).fillColor(C.muted).text(buildFilterSummary(req.query), margin, y, { width: contentW });
    y += 30;

    // ── Stats Cards ──
    const cardW = (contentW - 12) / 4;
    statsCard(doc, margin,                       y, cardW, 'Total Packets',   total,                       'In this report',              C.blue);
    statsCard(doc, margin + cardW + 4,           y, cardW, 'Encrypted',       encrypted,                   `${total > 0 ? ((encrypted/total)*100).toFixed(1) : 0}% of total`, C.green);
    statsCard(doc, margin + (cardW + 4) * 2,     y, cardW, 'Unencrypted',     total - encrypted,           'Potentially exposed',         C.red);
    statsCard(doc, margin + (cardW + 4) * 3,     y, cardW, 'Suspicious',      suspicious,                  'Requires attention',          C.amber);
    y += 72;
    statsCard(doc, margin,                       y, cardW * 2 + 4, 'Average Packet Size', `${avgSize.toLocaleString()} B`, 'Mean across all packets', C.cyan);
    statsCard(doc, margin + (cardW + 4) * 2,     y, cardW * 2 + 4, 'Encryption Rate', `${total > 0 ? ((encrypted/total)*100).toFixed(1) : 0}%`, 'Percentage of encrypted traffic', C.purple);
    y += 72;

    // ── Protocol Distribution ──
    y = sectionHeader(doc, 'Protocol Distribution', y);
    if (topProtocols.length === 0) {
      doc.fontSize(8).fillColor(C.muted).text('No data', margin + 10, y); y += 20;
    } else {
      const barMaxW = contentW * 0.65;
      const maxCount = topProtocols[0][1];
      for (const [proto, count] of topProtocols) {
        const barW = Math.max(4, (count / maxCount) * barMaxW);
        const pctStr = `${((count / total) * 100).toFixed(1)}%`;
        const color = PROTOCOL_COLORS[proto] || C.muted;
        drawRoundRect(doc, margin + 80, y + 2, barW, 12, 3, color, 0.25);
        drawRoundRect(doc, margin + 80, y + 2, Math.min(barW, 28), 12, 3, color, 0.6);
        doc.fontSize(8).fillColor(color).text(proto, margin + 4, y + 3, { width: 70 });
        doc.fontSize(7.5).fillColor(C.text).text(`${count.toLocaleString()} packets`, margin + 86 + barW, y + 3, { width: 90 });
        doc.fontSize(7.5).fillColor(C.muted).text(pctStr, pageW - margin - 38, y + 3, { width: 36, align: 'right' });
        y += 18;
      }
      y += 8;
    }

    // ── Threat Summary ──
    y = sectionHeader(doc, 'Threat Summary', y);
    if (threatSummary.length === 0) {
      drawRoundRect(doc, margin, y, contentW, 28, 5, C.green, 0.06);
      drawRect(doc, margin, y, 3, 28, C.green);
      doc.fontSize(8.5).fillColor(C.green).text('No suspicious packets found in this dataset', margin + 12, y + 9);
      y += 38;
    } else {
      for (const [level, count] of threatSummary) {
        const color = THREAT_COLORS[level] || C.muted;
        drawRoundRect(doc, margin, y, contentW, 22, 4, color, 0.06);
        drawRect(doc, margin, y, 3, 22, color);
        doc.fontSize(8).fillColor(color).text(level, margin + 10, y + 6, { width: 80 });
        doc.fontSize(8).fillColor(C.text).text(`${count} packet${count !== 1 ? 's' : ''}`, margin + 90, y + 6);
        const barW = Math.max(4, (count / suspicious) * (contentW - 200));
        drawRoundRect(doc, margin + 160, y + 6, barW, 10, 2, color, 0.35);
        const pct = suspicious > 0 ? ((count/suspicious)*100).toFixed(0) : 0;
        doc.fontSize(7).fillColor(C.muted).text(`${pct}% of suspicious`, pageW - margin - 90, y + 7, { width: 88, align: 'right' });
        y += 26;
      }
      y += 6;
    }

    /* ════════════════════════════════
       PAGE 2+ — PACKET TABLE
    ════════════════════════════════ */
    doc.addPage();
    drawRect(doc, 0, 0, pageW, doc.page.height, C.bg);
    drawRect(doc, 0, 0, pageW, 4, C.blue);

    y = 24;
    doc.fontSize(13).fillColor(C.white).text('Packet Details', margin, y);
    doc.fontSize(8).fillColor(C.muted)
       .text(`${packets.length} packets${packets.length >= MAX ? ` (capped at ${MAX})` : ''}  |  Sorted: newest first`,
             margin, y + 18, { width: contentW });
    y += 40;

    // ── Table ──
    // กำหนด column ของตารางแพ็กเก็ต — width รวมกันต้องไม่เกิน contentW (515px)
    // color() รับค่าใน cell แล้วคืนสีที่เหมาะสม
    const columns = [
      { label: 'Time',        width: 52, color: () => C.muted },
      { label: 'Protocol',    width: 44, color: (v) => PROTOCOL_COLORS[v] || C.muted },
      { label: 'Source IP',   width: 104, color: () => C.text },
      { label: 'Destination', width: 104, color: () => C.text },
      { label: 'Size',        width: 40, color: () => C.muted },
      { label: 'Enc',         width: 24, color: (v) => v === 'Y' ? C.green : C.red },
      { label: 'Method',      width: 60, color: () => C.dim },
      { label: 'Threat',      width: 52, color: (v) => THREAT_COLORS[v] || C.dim },
    ];

    const ROW_H = 15;
    const PAGE_ROWS = Math.floor((doc.page.height - 80) / ROW_H);
    let rowCount = 0;

    // ฟังก์ชันวาด header ของหน้าใหม่ (ใช้ตอนขึ้นหน้าถัดไป)
    // ต้อง reset y และ rowCount ด้วยเพราะเป็น closure
    const drawPageHeader = () => {
      drawRect(doc, 0, 0, pageW, doc.page.height, C.bg);
      drawRect(doc, 0, 0, pageW, 4, C.blue);
      // running header
      doc.fontSize(7).fillColor(C.dim)
         .text('PacketViz - Packet Details (continued)', margin, 10, { width: contentW })
         .text(`Page ${doc.bufferedPageRange().start + doc.bufferedPageRange().count}`, margin, 10, { width: contentW, align: 'right' });
      y = 28;
      y = tableHeader(doc, columns, y);
      rowCount = 0;
    };

    y = tableHeader(doc, columns, y);
    for (let i = 0; i < packets.length; i++) {
      // ถ้าแถวเต็มหน้าแล้ว ใส่ footer แล้วขึ้นหน้าใหม่
      if (rowCount > 0 && rowCount % PAGE_ROWS === 0) {
        // footer on current page
        doc.fontSize(6.5).fillColor(C.dim)
           .text(`PacketViz Report  |  ${new Date().toLocaleDateString()}  |  Row ${i} of ${packets.length}`,
                 margin, doc.page.height - 30, { width: contentW, align: 'center' });
        doc.addPage();
        drawPageHeader();
      }

      const p = packets[i];
      const vals = [
        new Date(p.capturedAt).toLocaleTimeString(),
        p.protocol,
        `${p.sourceIP}:${p.sourcePort}`,
        `${p.destinationIP}:${p.destinationPort}`,
        `${p.size}B`,
        p.isEncrypted ? 'Y' : 'N',
        p.encryptionMethod || 'NONE',
        p.isSuspicious ? (p.threatLevel || 'SUSPICIOUS') : 'NONE',
      ];
      // แถวคู่ = isAlt (แรเงา), packet ที่น่าสงสัยระดับ MEDIUM/HIGH/CRITICAL = isHighlight
      y = tableRow(doc, columns, vals, y, ROW_H, i % 2 === 1, p.isSuspicious && p.threatLevel !== 'LOW');
      rowCount++;
    }

    if (packets.length === 0) {
      drawRoundRect(doc, margin, y + 10, contentW, 36, 5, C.panel);
      doc.fontSize(9).fillColor(C.muted).text('No packets match the selected filters.', margin, y + 22, { width: contentW, align: 'center' });
    }

    // Final footer
    doc.fontSize(6.5).fillColor(C.dim)
       .text(`PacketViz Report  |  Generated ${new Date().toLocaleString()}  |  ${packets.length} packets total`,
             margin, doc.page.height - 30, { width: contentW, align: 'center' });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
