/**
 * บริการ Geolocation — ใช้ geoip-lite (MaxMind GeoLite2 database ฝังใน package)
 * รองรับ IPv4/IPv6 จริง + fallback สำหรับ private IP ที่ใช้ในโหมดจำลอง
 */
const geoip = require('geoip-lite');

// แผนที่ ISO country code → ชื่อเต็ม
const COUNTRY_NAMES = {
  AF:'Afghanistan', AL:'Albania', DZ:'Algeria', AR:'Argentina', AM:'Armenia',
  AU:'Australia', AT:'Austria', AZ:'Azerbaijan', BH:'Bahrain', BD:'Bangladesh',
  BY:'Belarus', BE:'Belgium', BR:'Brazil', BG:'Bulgaria', KH:'Cambodia',
  CA:'Canada', CL:'Chile', CN:'China', CO:'Colombia', HR:'Croatia',
  CZ:'Czech Republic', DK:'Denmark', EG:'Egypt', EE:'Estonia', FI:'Finland',
  FR:'France', GE:'Georgia', DE:'Germany', GH:'Ghana', GR:'Greece',
  HK:'Hong Kong', HU:'Hungary', IN:'India', ID:'Indonesia', IR:'Iran',
  IQ:'Iraq', IE:'Ireland', IL:'Israel', IT:'Italy', JP:'Japan',
  JO:'Jordan', KZ:'Kazakhstan', KE:'Kenya', KR:'South Korea', KW:'Kuwait',
  LV:'Latvia', LB:'Lebanon', LT:'Lithuania', LU:'Luxembourg', MY:'Malaysia',
  MX:'Mexico', MA:'Morocco', NL:'Netherlands', NZ:'New Zealand', NG:'Nigeria',
  NO:'Norway', OM:'Oman', PK:'Pakistan', PE:'Peru', PH:'Philippines',
  PL:'Poland', PT:'Portugal', QA:'Qatar', RO:'Romania', RU:'Russia',
  SA:'Saudi Arabia', RS:'Serbia', SG:'Singapore', SK:'Slovakia', ZA:'South Africa',
  ES:'Spain', LK:'Sri Lanka', SE:'Sweden', CH:'Switzerland', TW:'Taiwan',
  TH:'Thailand', TR:'Turkey', UA:'Ukraine', AE:'United Arab Emirates',
  GB:'United Kingdom', US:'United States', UZ:'Uzbekistan', VN:'Vietnam',
  YE:'Yemen', ZW:'Zimbabwe',
};

// Private / link-local / loopback prefixes — ไม่มี geo data จริง คืน null เสมอ
const PRIVATE_PREFIXES = ['10.', '172.', '192.168.', '127.', '169.254.', 'fc', 'fd', '::1'];

/**
 * ค้นหา geolocation ของ IP address โดยใช้ geoip-lite (MaxMind GeoLite2)
 * @param {string} ip
 * @returns {{ country, countryName, city, lat, lon } | null}
 */
const lookupGeo = (ip) => {
  if (!ip) return null;

  // Private IP — ไม่มี geo data จริง
  if (PRIVATE_PREFIXES.some((p) => ip.startsWith(p))) return null;

  // ค้นหาจาก geoip-lite (database MaxMind GeoLite2)
  const result = geoip.lookup(ip);
  if (!result || !Array.isArray(result.ll) || result.ll.length < 2) return null;

  const lat = result.ll[0];
  const lon = result.ll[1];
  // กรองพิกัด 0,0 (unknown) และค่าที่ไม่ valid
  if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) return null;

  const countryCode = result.country || '';
  return {
    country:     countryCode,
    countryName: COUNTRY_NAMES[countryCode] || countryCode,
    city:        result.city || result.region || countryCode,
    lat,
    lon,
  };
};

module.exports = { lookupGeo };
