import { useState, useEffect } from 'react';
import { getThreatStats, getTopIPs } from '../services/api';
import { ShieldAlert, AlertTriangle, Globe, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGeoLookup } from '../hooks/useGeoLookup';

const LEVEL_CLS = {
  CRITICAL: {
    text: 'text-[#f43f5e]',
    iconBox: 'bg-[#f43f5e]/[0.08] border border-[#f43f5e]/[0.14]',
    bar: 'bg-gradient-to-r from-[#f43f5e] to-[#f43f5e]/50',
    badge: 'bg-[#f43f5e]/[0.08] text-[#f43f5e] border border-[#f43f5e]/[0.14]',
  },
  HIGH: {
    text: 'text-[#f97316]',
    iconBox: 'bg-[#f97316]/[0.08] border border-[#f97316]/[0.14]',
    bar: 'bg-gradient-to-r from-[#f97316] to-[#f97316]/50',
    badge: 'bg-[#f97316]/[0.08] text-[#f97316] border border-[#f97316]/[0.14]',
  },
  MEDIUM: {
    text: 'text-[#f59e0b]',
    iconBox: 'bg-[#f59e0b]/[0.08] border border-[#f59e0b]/[0.14]',
    bar: 'bg-gradient-to-r from-[#f59e0b] to-[#f59e0b]/50',
    badge: 'bg-[#f59e0b]/[0.08] text-[#f59e0b] border border-[#f59e0b]/[0.14]',
  },
  LOW: {
    text: 'text-[#3b82f6]',
    iconBox: 'bg-[#3b82f6]/[0.08] border border-[#3b82f6]/[0.14]',
    bar: 'bg-gradient-to-r from-[#3b82f6] to-[#3b82f6]/50',
    badge: 'bg-[#3b82f6]/[0.08] text-[#3b82f6] border border-[#3b82f6]/[0.14]',
  },
  NONE: {
    text: 'text-[#4a5e80]',
    iconBox: 'bg-[#4a5e80]/[0.08] border border-[#4a5e80]/[0.14]',
    bar: 'bg-gradient-to-r from-[#4a5e80] to-[#4a5e80]/50',
    badge: 'bg-[#4a5e80]/[0.08] text-[#4a5e80] border border-[#4a5e80]/[0.14]',
  },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 shadow-xl">
      <p className="text-[11px] text-[#7b8ba8]">Count</p>
      <p className="text-lg font-bold text-white">{payload[0].value}</p>
    </div>
  );
};

function ThreatMonitor() {
  const [threats, setThreats] = useState({ summary: [], recent: [] });
  const [topIPs, setTopIPs] = useState({ topSources: [], topDestinations: [] });

  // รวบรวม IP ทั้งหมดเพื่อ geo lookup
  const allIPs = [
    ...threats.recent.map((t) => t.sourceIP),
    ...threats.recent.map((t) => t.destinationIP),
    ...topIPs.topSources.map((s) => s.ip),
    ...topIPs.topDestinations.map((d) => d.ip),
  ].filter(Boolean);
  const { getLabel, getFlag } = useGeoLookup(allIPs);

  const fetchData = async () => {
    try {
      const [threatRes, ipRes] = await Promise.all([getThreatStats(), getTopIPs()]);
      setThreats(threatRes.data);
      setTopIPs(ipRes.data);
    } catch (err) {
      console.error('Failed to fetch threat data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Threat Monitor</h2>
        <p className="text-sm text-[#7b8ba8] mt-0.5">Security alerts and suspicious activity</p>
      </div>

      {/* Threat Level Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => {
          const item = threats.summary.find((s) => s.level === level);
          const count = item?.count || 0;
          return (
            <div
              key={level}
              className="card-glow rounded-2xl p-5 transition-transform duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${LEVEL_CLS[level]?.iconBox}`}
                >
                  <ShieldAlert className={`w-4 h-4 ${LEVEL_CLS[level]?.text}`} />
                </div>
                <span className="text-[10px] text-[#4a5e80] uppercase tracking-wider font-semibold">{level}</span>
              </div>
              <p className={`text-3xl font-extrabold ${LEVEL_CLS[level]?.text}`}>
                {count}
              </p>
              <div className="mt-3 h-1 rounded-full bg-[#0b1628] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${LEVEL_CLS[level]?.bar}`}
                  style={{ width: `${Math.min(count * 10, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top IPs Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-glow rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#3b82f6]" /> Top Source IPs
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIPs.topSources} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e305830" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#4a5e80', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="ip"
                  type="category"
                  width={115}
                  axisLine={false}
                  tickLine={false}
                  tick={({ x, y, payload }) => (
                    <text x={x} y={y} dy={3} textAnchor="end" fill="#7b8ba8" fontSize={9}>
                      {getFlag(payload.value)} {payload.value}
                    </text>
                  )}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {topIPs.topSources.map((_, i) => (
                    <rect key={i} fill={`url(#blueGrad)`} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-glow rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#8b5cf6]" /> Top Destination IPs
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIPs.topDestinations} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e305830" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#4a5e80', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="ip"
                  type="category"
                  width={115}
                  axisLine={false}
                  tickLine={false}
                  tick={({ x, y, payload }) => (
                    <text x={x} y={y} dy={3} textAnchor="end" fill="#7b8ba8" fontSize={9}>
                      {getFlag(payload.value)} {payload.value}
                    </text>
                  )}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {topIPs.topDestinations.map((_, i) => (
                    <rect key={i} fill={`url(#purpleGrad)`} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Threats */}
      <div className="card-glow rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#f59e0b]" /> Recent Suspicious Packets
        </h3>
        {threats.recent.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 text-[#1e3058] mx-auto mb-3" />
            <p className="text-sm text-[#4a5e80]">No suspicious activity detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threats.recent.map((t) => (
              <div
                key={t._id}
                className="flex items-center gap-4 p-3.5 bg-[#050a18]/60 rounded-xl text-xs border border-[#1e3058]/30 hover:border-[#1e3058]/60 transition-colors"
              >
                <span
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] tracking-wide ${LEVEL_CLS[t.threatLevel]?.badge || LEVEL_CLS.NONE.badge}`}
                >
                  {t.threatLevel}
                </span>
                <span className="text-[#c5d0e0] font-mono text-[11px]">
                    {t.sourceIP}
                    {getFlag(t.sourceIP) && (
                      <span className="ml-1 text-xs" title={getLabel(t.sourceIP)}>{getFlag(t.sourceIP)}</span>
                    )}
                  </span>
                  <span className="text-[#2a3f5f]">→</span>
                  <span className="text-[#c5d0e0] font-mono text-[11px]">
                    {t.destinationIP}
                    {getFlag(t.destinationIP) && (
                      <span className="ml-1 text-xs" title={getLabel(t.destinationIP)}>{getFlag(t.destinationIP)}</span>
                    )}
                  </span>
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1e3058]/30 text-[#7b8ba8]"
                >
                  {t.protocol}
                </span>
                <span className="text-[#7b8ba8] flex-1 truncate">{t.threatDescription}</span>
                <span className="text-[#4a5e80] tabular-nums">{new Date(t.capturedAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThreatMonitor;
