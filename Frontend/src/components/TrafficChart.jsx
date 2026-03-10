import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 shadow-xl min-w-40">
      <p className="text-[11px] text-[#7b8ba8] mb-2 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-[#c5d0e0]">{entry.name}</span>
          </div>
          <span className="font-bold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

function TrafficChart({ data }) {
  return (
    <div className="card-glow rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#3b82f6]" />
          <h3 className="text-sm font-semibold text-white">Traffic Timeline</h3>
        </div>
        <span className="text-[10px] text-[#4a5e80] uppercase tracking-wider">Last 30 min</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEncrypted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradUnencrypted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSuspicious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e305830" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: '#4a5e80', fontSize: 10 }}
              tickFormatter={(val) => val?.split(' ')[1] || val}
              axisLine={{ stroke: '#1e305850' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#4a5e80', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-[#7b8ba8] text-[11px] ml-1">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="encrypted"
              stackId="1"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradEncrypted)"
              name="Encrypted"
            />
            <Area
              type="monotone"
              dataKey="unencrypted"
              stackId="1"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#gradUnencrypted)"
              name="Unencrypted"
            />
            <Area
              type="monotone"
              dataKey="suspicious"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#gradSuspicious)"
              name="Suspicious"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrafficChart;
