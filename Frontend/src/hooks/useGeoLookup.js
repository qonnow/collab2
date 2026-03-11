import { useState, useEffect, useRef } from 'react';
import { lookupIPs } from '../services/api';

const FLAG_EMOJI = {
  AF:'🇦🇫', AL:'🇦🇱', DZ:'🇩🇿', AR:'🇦🇷', AM:'🇦🇲', AU:'🇦🇺', AT:'🇦🇹',
  AZ:'🇦🇿', BH:'🇧🇭', BD:'🇧🇩', BY:'🇧🇾', BE:'🇧🇪', BR:'🇧🇷', BG:'🇧🇬',
  KH:'🇰🇭', CA:'🇨🇦', CL:'🇨🇱', CN:'🇨🇳', CO:'🇨🇴', HR:'🇭🇷', CZ:'🇨🇿',
  DK:'🇩🇰', EG:'🇪🇬', EE:'🇪🇪', FI:'🇫🇮', FR:'🇫🇷', GE:'🇬🇪', DE:'🇩🇪',
  GH:'🇬🇭', GR:'🇬🇷', HK:'🇭🇰', HU:'🇭🇺', IN:'🇮🇳', ID:'🇮🇩', IR:'🇮🇷',
  IQ:'🇮🇶', IE:'🇮🇪', IL:'🇮🇱', IT:'🇮🇹', JP:'🇯🇵', JO:'🇯🇴', KZ:'🇰🇿',
  KE:'🇰🇪', KR:'🇰🇷', KW:'🇰🇼', LV:'🇱🇻', LB:'🇱🇧', LT:'🇱🇹', LU:'🇱🇺',
  MY:'🇲🇾', MX:'🇲🇽', MA:'🇲🇦', NL:'🇳🇱', NZ:'🇳🇿', NG:'🇳🇬', NO:'🇳🇴',
  OM:'🇴🇲', PK:'🇵🇰', PE:'🇵🇪', PH:'🇵🇭', PL:'🇵🇱', PT:'🇵🇹', QA:'🇶🇦',
  RO:'🇷🇴', RU:'🇷🇺', SA:'🇸🇦', RS:'🇷🇸', SG:'🇸🇬', SK:'🇸🇰', ZA:'🇿🇦',
  ES:'🇪🇸', LK:'🇱🇰', SE:'🇸🇪', CH:'🇨🇭', TW:'🇹🇼', TH:'🇹🇭', TR:'🇹🇷',
  UA:'🇺🇦', AE:'🇦🇪', GB:'🇬🇧', US:'🇺🇸', UZ:'🇺🇿', VN:'🇻🇳', YE:'🇾🇪',
};

/**
 * Hook รับ array ของ IP strings คืนค่า getGeo(ip) function
 * ดึง geo data batch ครั้งเดียว; cache ข้ามการ re-render
 */
export const useGeoLookup = (ips = []) => {
  // geoMap เก็บผล lookup ในรูป { '1.1.1.1': { country, city, lat, lon } }
  const [geoMap, setGeoMap] = useState({});
  // fetchedRef ใช้จำ IP ที่เคย fetch ไปแล้ว ป้องกันเรียก API ซ้ำเมื่อ component re-render
  const fetchedRef = useRef(new Set());

  useEffect(() => {
    // กรองเฉพาะ IP ที่ยังไม่เคย fetch — ไม่ต้องส่งซ้ำถ้าข้อมูลมีอยู่แล้ว
    const unique = [...new Set(ips)].filter((ip) => ip && !fetchedRef.current.has(ip));
    if (unique.length === 0) return;

    lookupIPs(unique).then((res) => {
      unique.forEach((ip) => fetchedRef.current.add(ip));
      setGeoMap((prev) => ({ ...prev, ...res.data }));
    }).catch(() => {});
  }, [JSON.stringify([...new Set(ips)].sort())]);

  // คืนข้อมูล geo ดิบ หรือ null ถ้ายังไม่มี / IP เป็น private
  const getGeo = (ip) => geoMap[ip] || null;
  // คืนแค่ emoji ธงชาติ เช่น '🇺🇸'
  const getFlag = (ip) => {
    const geo = geoMap[ip];
    if (!geo) return '';
    return FLAG_EMOJI[geo.country] || '🌍';
  };
  // คืนธงชาติ + ชื่อเมือง เช่น '🇺🇸 San Jose' สำหรับแสดงในตาราง
  const getLabel = (ip) => {
    const geo = geoMap[ip];
    if (!geo) return '';
    return `${FLAG_EMOJI[geo.country] || '🌍'} ${geo.city}`;
  };

  return { getGeo, getFlag, getLabel };
};

export { FLAG_EMOJI };
