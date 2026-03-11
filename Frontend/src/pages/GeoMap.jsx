import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import { Globe, RefreshCw, AlertTriangle, Wifi, MapPin, Radio } from 'lucide-react';
import { getGeoStats } from '../services/api';
import socket from '../services/socket';
import 'leaflet/dist/leaflet.css';

const FLAG_EMOJI = {
  TH: '🇹🇭', US: '🇺🇸', GB: '🇬🇧', AU: '🇦🇺',
  JP: '🇯🇵', DE: '🇩🇪', SG: '🇸🇬', NL: '🇳🇱',
  CN: '🇨🇳', HK: '🇭🇰', FR: '🇫🇷', RU: '🇷🇺',
};

function GeoMap({ isCapturing }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollingRef = useRef(null);

  const fetchGeo = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getGeoStats();
      setLocations(res.data.locations);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch geo data:', err);
    }
    if (!silent) setLoading(false);
  };

  // โหลดครั้งแรก
  useEffect(() => {
    fetchGeo();
  }, []);

  // auto-poll ทุก 5 วินาทีตอนกำลัง capture
  useEffect(() => {
    if (isCapturing) {
      pollingRef.current = setInterval(() => fetchGeo(true), 5000);
    } else {
      clearInterval(pollingRef.current);
    }
    return () => clearInterval(pollingRef.current);
  }, [isCapturing]);

  // ฟัง packet:new จาก socket — refresh geo เมื่อมีแพ็กเก็ตใหม่
  useEffect(() => {
    const handler = () => fetchGeo(true);
    socket.on('packet:new', handler);
    return () => socket.off('packet:new', handler);
  }, []);

  // กรอง location ที่ lat/lon ไม่ valid ก่อน render ป้องกัน Leaflet crash
  const validLocations = locations.filter(
    (l) => l != null &&
      typeof l.lat === 'number' && isFinite(l.lat) &&
      typeof l.lon === 'number' && isFinite(l.lon)
  );

  const totalPackets = validLocations.reduce((s, l) => s + l.count, 0);
  const totalSuspicious = validLocations.reduce((s, l) => s + l.suspiciousCount, 0);

  // radius ตามสัดส่วน packet count
  const maxCount = validLocations[0]?.count || 1;
  const getRadius = (count) => Math.max(8, Math.min(40, (count / maxCount) * 40));

  const getColor = (loc) => {
    const ratio = loc.suspiciousCount / (loc.count || 1);
    if (ratio > 0.4) return '#f43f5e';
    if (ratio > 0.2) return '#f97316';
    if (ratio > 0.05) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Geolocation Map
            {isCapturing && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2.5 py-1 rounded-full">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE
              </span>
            )}
          </h2>
          <p className="text-sm text-[#7b8ba8] mt-0.5">
            Source IP distribution across the globe
            {lastUpdated && (
              <span className="ml-2 text-[#4a5e80]">
                · updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchGeo()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111c36] border border-[#1e3058]/80 text-sm text-[#c5d0e0] hover:border-[#3b82f6]/40 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-glow rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#3b82f6]/10 border border-[#3b82f6]/20">
            <Globe className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-xs text-[#7b8ba8]">Locations</p>
            <p className="text-2xl font-bold text-white">{locations.length}</p>
          </div>
        </div>
        <div className="card-glow rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#10b981]/10 border border-[#10b981]/20">
            <Wifi className="w-5 h-5 text-[#10b981]" />
          </div>
          <div>
            <p className="text-xs text-[#7b8ba8]">Total Packets</p>
            <p className="text-2xl font-bold text-white">{totalPackets.toLocaleString()}</p>
          </div>
        </div>
        <div className="card-glow rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#f43f5e]/10 border border-[#f43f5e]/20">
            <AlertTriangle className="w-5 h-5 text-[#f43f5e]" />
          </div>
          <div>
            <p className="text-xs text-[#7b8ba8]">Suspicious</p>
            <p className="text-2xl font-bold text-white">{totalSuspicious.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Leaflet Map */}
        <div className="card-glow rounded-2xl overflow-hidden" style={{ height: '480px', minHeight: '480px' }}>
          {loading && validLocations.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-[#3b82f6] animate-spin" />
            </div>
          ) : (
            <MapContainer
              center={[20, 10]}
              zoom={2}
              style={{ height: '100%', width: '100%', background: '#0b1628' }}
              zoomControl={false}
              attributionControl={false}
            >
              <ZoomControl position="bottomright" />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              {validLocations.map((loc) => (
                <CircleMarker
                  key={`${loc.country}-${loc.city}-${loc.lat}-${loc.lon}`}
                  center={[loc.lat, loc.lon]}
                  radius={getRadius(loc.count)}
                  pathOptions={{
                    color: getColor(loc),
                    fillColor: getColor(loc),
                    fillOpacity: 0.55,
                    weight: 1.5,
                  }}
                  eventHandlers={{ click: () => setSelected(loc) }}
                >
                  <Popup className="geo-popup">
                    <div className="text-[#0b1628] font-sans p-1 min-w-[160px]">
                      <p className="font-bold text-sm">
                        {FLAG_EMOJI[loc.country] || '🌍'} {loc.city}
                      </p>
                      <p className="text-xs text-gray-500">{loc.countryName}</p>
                      <div className="mt-2 space-y-0.5 text-xs">
                        <p>Packets: <strong>{loc.count.toLocaleString()}</strong></p>
                        <p>Suspicious: <strong className="text-red-500">{loc.suspiciousCount.toLocaleString()}</strong></p>
                      </div>
                      {loc.sampleIPs.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] text-gray-400 mb-1">Sample IPs</p>
                          {loc.sampleIPs.map((ip) => (
                            <p key={ip} className="text-[10px] font-mono">{ip}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Location list */}
        <div className="card-glow rounded-2xl overflow-hidden flex flex-col" style={{ height: '480px' }}>
          <div className="px-5 py-4 border-b border-[#1e3058]/40">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#3b82f6]" />
              Top Locations
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {validLocations.length === 0 && !loading && (
              <p className="text-xs text-[#4a5e80] p-5">No data — start packet capture first.</p>
            )}
            {validLocations.map((loc, i) => {
              const suspiciousRatio = loc.count > 0 ? loc.suspiciousCount / loc.count : 0;
              const barColor = getColor(loc);
              const widthPct = Math.round((loc.count / maxCount) * 100);
              return (
                <div
                  key={`${loc.country}-${loc.city}-${loc.lat}-${loc.lon}`}
                  onClick={() => setSelected(loc)}
                  className={`px-5 py-3.5 border-b border-[#1e3058]/20 cursor-pointer transition-colors hover:bg-[#111c36] ${selected?.city === loc.city ? 'bg-[#111c36]' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-white font-medium">
                      {FLAG_EMOJI[loc.country] || '🌍'} {loc.city}
                    </span>
                    <span className="text-xs text-[#7b8ba8]">{loc.count.toLocaleString()}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-[#1e3058]/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                    />
                  </div>
                  {suspiciousRatio > 0 && (
                    <p className="text-[10px] text-[#f43f5e] mt-1">
                      {loc.suspiciousCount} suspicious ({(suspiciousRatio * 100).toFixed(0)}%)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card-glow rounded-2xl px-6 py-4 flex items-center gap-8">
        <span className="text-xs text-[#7b8ba8] font-medium">Threat Level:</span>
        {[
          { color: '#3b82f6', label: 'Low (< 5%)' },
          { color: '#f59e0b', label: 'Medium (5–20%)' },
          { color: '#f97316', label: 'High (20–40%)' },
          { color: '#f43f5e', label: 'Critical (> 40%)' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span className="text-xs text-[#7b8ba8]">{label}</span>
          </div>
        ))}
        <span className="text-xs text-[#4a5e80] ml-auto">Circle size = packet volume</span>
      </div>
    </div>
  );
}

export default GeoMap;
