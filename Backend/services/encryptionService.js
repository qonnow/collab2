const CryptoJS = require('crypto-js');

const SECRET_KEY = process.env.AES_SECRET_KEY || 'packet-encryption-key-32char!';

/**
 * เข้ารหัสข้อมูลด้วย AES
 */
const encrypt = (plainText) => {
  const encrypted = CryptoJS.AES.encrypt(plainText, SECRET_KEY).toString();
  return encrypted;
};

/**
 * ถอดรหัสข้อมูลที่เข้ารหัสด้วย AES
 */
const decrypt = (cipherText) => {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted;
};

/**
 * ตรวจจับเวอร์ชัน TLS/SSL จากรูปแบบ payload
 */
const detectTlsVersion = (payload) => {
  // TLS 1.3 (เลเยอร์ระเบียน 0x0303 แต่มีส่วนขยาย supported_versions ระบุ 1.3)
  if (payload.includes('TLSv1.3') || payload.includes('\\x16\\x03\\x03') && payload.includes('1.3')) {
    return 'TLS 1.3';
  }
  // TLS 1.2 (เลเยอร์ระเบียนเวอร์ชัน 0x0303)
  if (payload.includes('TLSv1.2') || payload.includes('\\x16\\x03\\x03')) {
    return 'TLS 1.2';
  }
  // SSL 3.0 (เลเยอร์ระเบียนเวอร์ชัน 0x0300)
  if (payload.includes('SSLv3') || payload.includes('SSL 3.0') || payload.includes('\\x16\\x03\\x00')) {
    return 'SSL 3.0';
  }
  // TLS ทั่วไป
  if (payload.includes('TLSv') || payload.includes('\\x16\\x03')) {
    return 'TLS';
  }
  return null;
};

/**
 * วิเคราะห์ว่า payload ดูเหมือนถูกเข้ารหัสหรือไม่
 */
const analyzeEncryption = (payload) => {
  if (!payload) return { isEncrypted: false, method: 'NONE' };

  // ตรวจสอบเวอร์ชัน TLS/SSL ที่เจาะจง
  const tlsVersion = detectTlsVersion(payload);
  if (tlsVersion) {
    return { isEncrypted: true, method: tlsVersion };
  }

  // ตรวจสอบค่าเอนโทรปีสูง (ข้อมูลเข้ารหัสมักมีเอนโทรปีสูง)
  const entropy = calculateEntropy(payload);
  if (entropy > 4.5) {
    return { isEncrypted: true, method: 'UNKNOWN' };
  }

  return { isEncrypted: false, method: 'NONE' };
};

/**
 * คำนวณค่าเอนโทรปีแบบ Shannon ของสตริง
 */
const calculateEntropy = (str) => {
  const len = str.length;
  if (len === 0) return 0;

  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
};

module.exports = { encrypt, decrypt, analyzeEncryption, calculateEntropy, detectTlsVersion };
