/**
 * โมเดลแพ็กเก็ต — ตัวช่วยคิวรีบนตาราง Supabase 'packets'
 * ชื่อคอลัมน์ใช้ snake_case; ตัวช่วยรับ/ส่ง camelCase
 */
const { getSupabase } = require('../config/db');

const TABLE = 'packets';
const sb = () => getSupabase();

/* ── ตัวช่วย: camelCase ↔ snake_case ── */

const toRow = (p) => ({
  packet_id:         p.packetId,
  user_id:           p.userId ?? null,
  protocol:          p.protocol,
  source_ip:         p.sourceIP,
  source_port:       p.sourcePort ?? null,
  destination_ip:    p.destinationIP,
  destination_port:  p.destinationPort ?? null,
  payload:           p.payload ?? '',
  encrypted_payload: p.encryptedPayload ?? '',
  is_encrypted:      p.isEncrypted ?? false,
  encryption_method: p.encryptionMethod ?? 'NONE',
  cipher_suite:      p.cipherSuite ?? null,
  certificate:       p.certificate ?? null,
  size:              p.size,
  ttl:               p.ttl ?? 64,
  flags:             p.flags ?? [],
  is_suspicious:     p.isSuspicious ?? false,
  threat_level:      p.threatLevel ?? 'NONE',
  threat_description: p.threatDescription ?? '',
  captured_at:       p.capturedAt ?? new Date().toISOString(),
});

const toObj = (r) => ({
  _id:               r.id,
  id:                r.id,
  packetId:          r.packet_id,
  userId:            r.user_id,
  protocol:          r.protocol,
  sourceIP:          r.source_ip,
  sourcePort:        r.source_port,
  destinationIP:     r.destination_ip,
  destinationPort:   r.destination_port,
  payload:           r.payload,
  encryptedPayload:  r.encrypted_payload,
  isEncrypted:       r.is_encrypted,
  encryptionMethod:  r.encryption_method,
  cipherSuite:       r.cipher_suite,
  certificate:       r.certificate,
  size:              r.size,
  ttl:               r.ttl,
  flags:             r.flags,
  isSuspicious:      r.is_suspicious,
  threatLevel:       r.threat_level,
  threatDescription: r.threat_description,
  capturedAt:        r.captured_at,
  createdAt:         r.created_at,
  updatedAt:         r.updated_at,
});

/* ── ตัวช่วย: apply filters บน Supabase query (รับ camelCase keys) ── */

const FILTER_MAP = {
  protocol:         'protocol',
  isEncrypted:      'is_encrypted',
  isSuspicious:     'is_suspicious',
  sourceIP:         'source_ip',
  destinationIP:    'destination_ip',
  threatLevel:      'threat_level',
  encryptionMethod: 'encryption_method',
  sourcePort:       'source_port',
  destinationPort:  'destination_port',
  userId:           'user_id',
};

const applyFilters = (q, filter = {}) => {
  for (const [k, col] of Object.entries(FILTER_MAP)) {
    if (filter[k] != null && filter[k] !== '') q = q.eq(col, filter[k]);
  }
  if (filter.sizeMin != null && filter.sizeMin !== '') q = q.gte('size', Number(filter.sizeMin));
  if (filter.sizeMax != null && filter.sizeMax !== '') q = q.lte('size', Number(filter.sizeMax));
  if (filter.dateFrom) q = q.gte('captured_at', new Date(filter.dateFrom).toISOString());
  if (filter.dateTo)   q = q.lte('captured_at', new Date(filter.dateTo).toISOString());
  if (filter.ipSearch) {
    const s = filter.ipSearch.replace(/'/g, "''");  // prevent injection
    q = q.or(`source_ip.ilike.%${s}%,destination_ip.ilike.%${s}%`);
  }
  return q;
};

/* ── CRUD (สร้าง/อ่าน/อัพเดต/ลบ) ── */

const Packet = {
  /** เพิ่มแพ็กเก็ต 1 รายการ คืนค่า camelCase */
  async create(data) {
    const { data: rows, error } = await sb()
      .from(TABLE)
      .insert(toRow(data))
      .select();
    if (error) throw error;
    return toObj(rows[0]);
  },

  /** ค้นหาตาม UUID id */
  async findById(id) {
    const { data, error } = await sb()
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return toObj(data);
  },

  /** นับจำนวนแถวตามตัวกรอง (camelCase keys) */
  async countDocuments(filter = {}) {
    let q = sb().from(TABLE).select('id', { count: 'exact', head: true });
    q = applyFilters(q, filter);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  },

  /** ค้นหาแบบแบ่งหน้า: filter (camelCase), เรียงลำดับ, ข้าม, จำกัด */
  async find({ filter = {}, sort = { capturedAt: -1 }, skip = 0, limit = 50 } = {}) {
    const addSort = (q) => {
      for (const [k, dir] of Object.entries(sort)) {
        const col = FILTER_MAP[k] || k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
        q = q.order(col, { ascending: dir === 1 });
      }
      return q;
    };

    // เมื่อ ipSearch ระบุ: source match ขึ้นก่อน แล้วค่อย destination-only match
    if (filter.ipSearch) {
      const s = filter.ipSearch.replace(/'/g, "''");
      const baseFilter = { ...filter, ipSearch: undefined };
      const need = skip + limit;

      let qA = addSort(applyFilters(sb().from(TABLE).select('*'), baseFilter));
      qA = qA.ilike('source_ip', `%${s}%`).range(0, need - 1);

      let qB = addSort(applyFilters(sb().from(TABLE).select('*'), baseFilter));
      qB = qB.ilike('destination_ip', `%${s}%`).not('source_ip', 'ilike', `%${s}%`).range(0, need - 1);

      const [resA, resB] = await Promise.all([qA, qB]);
      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;

      const combined = [...(resA.data || []), ...(resB.data || [])];
      return combined.slice(skip, skip + limit).map(toObj);
    }

    // ปกติ
    let q = addSort(applyFilters(sb().from(TABLE).select('*'), filter));
    q = q.range(skip, skip + limit - 1);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(toObj);
  },

  /** รวบรวม: สถิติภาพรวม */
  async statsOverview(userId) {
    const userFilter = userId ? { userId } : {};
    const total = await this.countDocuments(userFilter);
    const encrypted = await this.countDocuments({ ...userFilter, isEncrypted: true });
    const suspicious = await this.countDocuments({ ...userFilter, isSuspicious: true });

    // ขนาดเฉลี่ย
    let q = sb().from(TABLE).select('size');
    if (userId) q = q.eq('user_id', userId);
    const { data: sizeRows } = await q;
    const avgSize = sizeRows && sizeRows.length > 0
      ? Math.round(sizeRows.reduce((s, r) => s + r.size, 0) / sizeRows.length)
      : 0;

    return {
      totalPackets: total,
      encryptedCount: encrypted,
      unencryptedCount: total - encrypted,
      suspiciousCount: suspicious,
      encryptionRate: total > 0 ? ((encrypted / total) * 100).toFixed(1) : '0',
      averageSize: avgSize,
    };
  },

  /** รวบรวม: จัดกลุ่มตามโปรโตคอล */
  async statsByProtocol(userId) {
    let q = sb().from(TABLE).select('protocol, size');
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;
    const map = {};
    for (const r of data || []) {
      if (!map[r.protocol]) map[r.protocol] = { count: 0, totalSize: 0 };
      map[r.protocol].count++;
      map[r.protocol].totalSize += r.size;
    }
    return Object.entries(map)
      .map(([protocol, v]) => ({ protocol, count: v.count, avgSize: Math.round(v.totalSize / v.count) }))
      .sort((a, b) => b.count - a.count);
  },

  /** รวบรวม: ไทม์ไลน์จัดกลุ่มตามนาที */
  async statsTimeline(sinceDate, userId) {
    let q = sb()
      .from(TABLE)
      .select('captured_at, is_encrypted, is_suspicious')
      .gte('captured_at', sinceDate.toISOString())
      .order('captured_at', { ascending: true });
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;

    const groups = {};
    for (const r of data || []) {
      const d = new Date(r.captured_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      if (!groups[key]) groups[key] = { time: key, total: 0, encrypted: 0, unencrypted: 0, suspicious: 0 };
      groups[key].total++;
      if (r.is_encrypted) groups[key].encrypted++; else groups[key].unencrypted++;
      if (r.is_suspicious) groups[key].suspicious++;
    }
    return Object.values(groups);
  },

  /** รวบรวม: สรุปภัยคุกคาม + ล่าสุด */
  async statsThreats(userId) {
    let q = sb()
      .from(TABLE)
      .select('*')
      .eq('is_suspicious', true)
      .order('captured_at', { ascending: false });
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []).map(toObj);
    const levelMap = {};
    for (const r of rows) {
      levelMap[r.threatLevel] = (levelMap[r.threatLevel] || 0) + 1;
    }
    const summary = Object.entries(levelMap)
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);

    const recent = rows.slice(0, 10).map((t) => ({
      _id: t.id, packetId: t.packetId, protocol: t.protocol,
      sourceIP: t.sourceIP, destinationIP: t.destinationIP,
      threatLevel: t.threatLevel, threatDescription: t.threatDescription,
      capturedAt: t.capturedAt,
    }));

    return { summary, recent };
  },

  /** รวบรวม: IP ที่พบมากที่สุด */
  async statsTopIPs(userId) {
    let q = sb().from(TABLE).select('source_ip, destination_ip');
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;

    const srcMap = {}, dstMap = {};
    for (const r of data || []) {
      srcMap[r.source_ip] = (srcMap[r.source_ip] || 0) + 1;
      dstMap[r.destination_ip] = (dstMap[r.destination_ip] || 0) + 1;
    }

    const topSources = Object.entries(srcMap).map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topDestinations = Object.entries(dstMap).map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    return { topSources, topDestinations };
  },

  /** รวบรวม: source IP ทั้งหมดพร้อม count และ suspiciousCount สำหรับ geo mapping */
  async statsSourceIPs(userId) {
    let q = sb().from(TABLE).select('source_ip, is_suspicious');
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;

    const ipMap = {};
    for (const r of data || []) {
      if (!ipMap[r.source_ip]) ipMap[r.source_ip] = { count: 0, suspiciousCount: 0 };
      ipMap[r.source_ip].count++;
      if (r.is_suspicious) ipMap[r.source_ip].suspiciousCount++;
    }
    return ipMap;
  },
};

module.exports = Packet;
