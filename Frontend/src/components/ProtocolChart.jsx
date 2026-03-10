import { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Layers, PieChart as PieIcon, BarChart3 } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="glass rounded-xl p-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: data.payload.fill }} />
        <span className="text-xs text-[#c5d0e0] font-medium">{data.name}</span>
      </div>
      <p className="text-lg font-bold text-white mt-1">{data.value}</p>
    </div>
  );
};

function ProtocolChart({ data }) {
  const [chartType, setChartType] = useState('pie');

  return (
    <div className="card-glow rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#8b5cf6]" />
          <h3 className="text-sm font-semibold text-white">Protocol Distribution</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setChartType('pie')} className={`p-1.5 rounded-lg transition-all ${chartType === 'pie' ? 'bg-[#3b82f6]/15 text-[#3b82f6]' : 'text-[#4a5e80] hover:text-[#7b8ba8]'}`} title="Pie Chart">
            <PieIcon className="w-4 h-4" />
          </button>
          <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-lg transition-all ${chartType === 'bar' ? 'bg-[#3b82f6]/15 text-[#3b82f6]' : 'text-[#4a5e80] hover:text-[#7b8ba8]'}`} title="Bar Chart">
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="48%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={4}
                dataKey="count"
                nameKey="protocol"
                strokeWidth={0}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-[#7b8ba8] text-[11px] ml-1">{value}</span>
                )}
              />
            </PieChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3058" strokeOpacity={0.4} />
              <XAxis dataKey="protocol" tick={{ fill: '#7b8ba8', fontSize: 11 }} axisLine={{ stroke: '#1e3058' }} tickLine={false} />
              <YAxis tick={{ fill: '#7b8ba8', fontSize: 11 }} axisLine={{ stroke: '#1e3058' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ProtocolChart;
