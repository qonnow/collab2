const crypto = require('crypto');
const Packet = require('../models/Packet');
const { encrypt, analyzeEncryption } = require('./encryptionService');
const { getIsConnected } = require('../config/db');

// หน่วยความจำในเมื่อไม่มีฐานข้อมูล
const memoryStore = [];
const MAX_MEMORY_PACKETS = 5000;

// แผนที่พอร์ตตามโปรโตคอล
const PROTOCOL_MAP = {
  80: 'HTTP',
  443: 'HTTPS',
  53: 'DNS',
  22: 'SSH',
  21: 'FTP',
  25: 'SMTP',
};

// ช่วง IP จำลอง
const IP_RANGES = [
  '192.168.1', '10.0.0', '172.16.0', '8.8.8', '1.1.1',
  '203.0.113', '198.51.100', '93.184.216', '104.16.0',
];

// แผนที่ Cipher Suite ตามวิธีเข้ารหัส
const CIPHER_SUITES = {
  'TLS 1.3': ['TLS_AES_256_GCM_SHA384', 'TLS_AES_128_GCM_SHA256', 'TLS_CHACHA20_POLY1305_SHA256'],
  'TLS 1.2': ['ECDHE-RSA-AES256-GCM-SHA384', 'ECDHE-RSA-AES128-GCM-SHA256', 'DHE-RSA-AES256-SHA256'],
  'SSL 3.0': ['RC4-SHA', 'DES-CBC3-SHA', 'RC4-MD5'],
  'AES': ['AES-256-CBC', 'AES-128-CBC', 'AES-256-GCM'],
};

// ผู้ออกใบรับรองสำหรับจำลอง
const CERT_ISSUERS = [
  'DigiCert Global Root G2',
  "Let's Encrypt Authority X3",
  'GlobalSign Root CA - R3',
  'Comodo RSA Certification Authority',
  'GeoTrust RSA CA 2018',
  'Amazon Root CA 1',
];

const CERT_SUBJECTS = [
  'example.com', 'api.example.com', 'secure.bank.com',
  'mail.provider.net', 'cdn.cloudhost.io', 'login.service.org',
];

/**
 * สร้างข้อมูลใบรับรอง TLS จำลอง
 */
const generateCertificate = (protocol) => {
  if (!['HTTPS', 'SSH'].includes(protocol)) return null;
  const now = new Date();
  const validFrom = new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);
  const validTo = new Date(now.getTime() + Math.random() * 730 * 24 * 60 * 60 * 1000);
  const isExpired = Math.random() < 0.08;
  if (isExpired) validTo.setTime(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  const subject = CERT_SUBJECTS[Math.floor(Math.random() * CERT_SUBJECTS.length)];
  return {
    issuer: CERT_ISSUERS[Math.floor(Math.random() * CERT_ISSUERS.length)],
    subject: `CN=${subject}`,
    validFrom: validFrom.toISOString(),
    validTo: validTo.toISOString(),
    serialNumber: crypto.randomBytes(16).toString('hex').toUpperCase(),
    signatureAlgorithm: Math.random() > 0.2 ? 'SHA256withRSA' : 'SHA384withECDSA',
    san: [subject, `*.${subject}`],
    isValid: !isExpired,
  };
};

// Payload ตัวอย่างสำหรับการจำลอง
const SAMPLE_PAYLOADS = {
  HTTP: 'GET /index.html HTTP/1.1\r\nHost: example.com\r\nUser-Agent: Mozilla/5.0',
  HTTPS_TLS12: 'TLSv1.2 Encrypted Application Data [cipher: AES-256-GCM]',
  HTTPS_TLS13: 'TLSv1.3 Encrypted Application Data [cipher: TLS_AES_256_GCM_SHA384]',
  HTTPS_SSL30: 'SSLv3 Encrypted Data [cipher: RC4-SHA] (deprecated)',
  DNS: 'Query: A record for example.com',
  SSH: 'SSH-2.0-OpenSSH_8.9 encrypted-channel-data',
  FTP: 'USER anonymous\r\nPASS guest@example.com',
  SMTP: 'EHLO mail.example.com\r\nMAIL FROM:<user@example.com>',
  TCP: 'Raw TCP data stream segment',
  UDP: 'UDP datagram payload contents',
  ICMP: 'Echo Request ping data',
};

/**
 * สร้างแพ็กเก็ตเครือข่ายจำลอง
 */
const generatePacket = () => {
  const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'SSH', 'ICMP', 'FTP', 'SMTP'];
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];

  const srcRange = IP_RANGES[Math.floor(Math.random() * IP_RANGES.length)];
  const dstRange = IP_RANGES[Math.floor(Math.random() * IP_RANGES.length)];

  const sourceIP = `${srcRange}.${Math.floor(Math.random() * 254) + 1}`;
  const destinationIP = `${dstRange}.${Math.floor(Math.random() * 254) + 1}`;
  const sourcePort = Math.floor(Math.random() * 64511) + 1024;

  // กำหนดพอร์ตปลายทางตามโปรโตคอล
  let destinationPort;
  const portEntry = Object.entries(PROTOCOL_MAP).find(([, p]) => p === protocol);
  if (portEntry) {
    destinationPort = parseInt(portEntry[0]);
  } else {
    destinationPort = Math.floor(Math.random() * 64511) + 1024;
  }

  // สร้าง payload พร้อมเวอร์ชัน TLS/SSL สำหรับ HTTPS
  let payload;
  let tlsVersion = null;
  if (protocol === 'HTTPS') {
    const versions = [
      { payload: SAMPLE_PAYLOADS.HTTPS_TLS13, method: 'TLS 1.3' },
      { payload: SAMPLE_PAYLOADS.HTTPS_TLS12, method: 'TLS 1.2' },
      { payload: SAMPLE_PAYLOADS.HTTPS_TLS12, method: 'TLS 1.2' },
      { payload: SAMPLE_PAYLOADS.HTTPS_SSL30, method: 'SSL 3.0' },
    ];
    const pick = versions[Math.floor(Math.random() * versions.length)];
    payload = pick.payload;
    tlsVersion = pick.method;
  } else {
    payload = SAMPLE_PAYLOADS[protocol] || `${protocol} packet data: ${crypto.randomBytes(16).toString('hex')}`;
  }

  // วิเคราะห์การเข้ารหัส
  const encryptionAnalysis = analyzeEncryption(payload);
  const isEncrypted = ['HTTPS', 'SSH'].includes(protocol) || encryptionAnalysis.isEncrypted;

  // เข้ารหัส AES เพื่อจำลอง
  const encryptedPayload = isEncrypted ? encrypt(payload) : '';

  // กำหนดวิธีเข้ารหัส
  let encryptionMethod = 'NONE';
  if (protocol === 'HTTPS') encryptionMethod = tlsVersion || 'TLS 1.2';
  else if (protocol === 'SSH') encryptionMethod = 'AES';
  else if (encryptionAnalysis.isEncrypted) encryptionMethod = encryptionAnalysis.method;

  // เลือก Cipher Suite
  let cipherSuite = null;
  if (isEncrypted) {
    const suites = CIPHER_SUITES[encryptionMethod] || CIPHER_SUITES['AES'];
    cipherSuite = suites[Math.floor(Math.random() * suites.length)];
  }

  // จำลองใบรับรอง
  const certificate = generateCertificate(protocol);

  // ตรวจจับภัยคุกคาม
  const { isSuspicious, threatLevel, threatDescription } = detectThreats(
    protocol, sourceIP, destinationIP, payload, isEncrypted
  );

  const size = Math.floor(Math.random() * 1460) + 40; // 40-1500 ไบต์

  return {
    packetId: `PKT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    protocol,
    sourceIP,
    sourcePort,
    destinationIP,
    destinationPort,
    payload: isEncrypted ? '[ENCRYPTED]' : payload,
    encryptedPayload,
    isEncrypted,
    encryptionMethod,
    cipherSuite,
    certificate,
    size,
    ttl: Math.floor(Math.random() * 128) + 1,
    flags: generateFlags(protocol),
    isSuspicious,
    threatLevel,
    threatDescription,
    capturedAt: new Date(),
  };
};

/**
 * สร้างแฟลกตามโปรโตคอล
 */
const generateFlags = (protocol) => {
  const flagSets = {
    TCP: ['SYN', 'ACK', 'FIN', 'PSH', 'RST'],
    UDP: [],
    HTTP: ['GET', 'POST', 'PUT', 'DELETE'],
    HTTPS: ['TLS', 'ENCRYPTED'],
    DNS: ['QUERY', 'RESPONSE'],
    SSH: ['ENCRYPTED', 'AUTH'],
    ICMP: ['ECHO', 'REPLY'],
    FTP: ['DATA', 'CONTROL'],
    SMTP: ['MAIL', 'RCPT'],
  };

  const available = flagSets[protocol] || [];
  const count = Math.floor(Math.random() * 3) + 1;
  const selected = [];
  for (let i = 0; i < Math.min(count, available.length); i++) {
    const flag = available[Math.floor(Math.random() * available.length)];
    if (!selected.includes(flag)) selected.push(flag);
  }
  return selected;
};

/**
 * ตรวจจับภัยคุกคามเบื้องต้น (ฟีเจอร์โบนัส)
 */
const detectThreats = (protocol, srcIP, dstIP, payload, isEncrypted) => {
  let isSuspicious = false;
  let threatLevel = 'NONE';
  let threatDescription = '';

  // โปรโตคอลที่ไม่เข้ารหัสและข้อมูลสำคัญ
  if (['FTP', 'SMTP', 'HTTP'].includes(protocol) && !isEncrypted) {
    if (payload.includes('PASS') || payload.includes('USER')) {
      isSuspicious = true;
      threatLevel = 'HIGH';
      threatDescription = 'Unencrypted credentials detected in packet';
    }
  }

  // รูปแบบการสแกนพอร์ต (ปริมาณมากไปยังปลายทางเดียวกัน)
  if (Math.random() < 0.05) {
    isSuspicious = true;
    threatLevel = 'MEDIUM';
    threatDescription = 'Potential port scanning activity detected';
  }

  // แพ็กเก็ตขนาดใหญ่ที่น่าสงสัย
  if (Math.random() < 0.02) {
    isSuspicious = true;
    threatLevel = 'LOW';
    threatDescription = 'Unusual packet size detected';
  }

  return { isSuspicious, threatLevel, threatDescription };
};

/**
 * บันทึกแพ็กเก็ตลงฐานข้อมูลหรือหน่วยความจำ
 */
const savePacket = async (packetData) => {
  if (getIsConnected()) {
    return await Packet.create(packetData);
  }
  // โหมดสำรองในหน่วยความจำ
  packetData._id = packetData.packetId;
  memoryStore.unshift(packetData);
  if (memoryStore.length > MAX_MEMORY_PACKETS) {
    memoryStore.length = MAX_MEMORY_PACKETS;
  }
  return packetData;
};

/**
 * ดึงแพ็กเก็ตทั้งหมดจากหน่วยความจำ (สำหรับโหมดสาธิต)
 */
const getMemoryStore = () => memoryStore;

/**
 * จำลองการจับแพ็กเก็ตแบบแยกต่อผู้ใช้
 * แต่ละ userId มี interval ของตัวเอง
 */
const userCaptures = new Map();

const startCapture = (io, userId, intervalMs = 1000) => {
  if (userCaptures.has(userId)) return;

  const interval = setInterval(async () => {
    // สร้างแพ็กเก็ต 1–5 รายการต่อรอบ
    const count = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < count; i++) {
      const packet = generatePacket();
      packet.userId = userId;

      try {
        await savePacket(packet);
        // ส่งแพ็กเก็ตเฉพาะห้องของผู้ใช้
        io.to(`user:${userId}`).emit('packet:new', packet);
      } catch (err) {
        console.error('Error saving packet:', err.message);
      }
    }
  }, intervalMs);

  userCaptures.set(userId, interval);
  console.log(`Packet capture started for user ${userId} (interval: ${intervalMs}ms)`);
};

const stopCapture = (userId) => {
  const interval = userCaptures.get(userId);
  if (interval) {
    clearInterval(interval);
    userCaptures.delete(userId);
  }
  console.log(`Packet capture stopped for user ${userId}`);
};

const getCaptureStatus = (userId) => userCaptures.has(userId);

module.exports = {
  generatePacket,
  savePacket,
  startCapture,
  stopCapture,
  getCaptureStatus,
  detectThreats,
  getMemoryStore,
};
