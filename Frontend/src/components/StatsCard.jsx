const ACCENT = {
  '#3b82f6': { text: 'text-[#3b82f6]', iconBox: 'bg-[#3b82f6]/10 border-[#3b82f6]/[0.12]', barTrack: 'bg-[#3b82f6]/[0.06]', bar: 'bg-gradient-to-r from-[#3b82f6] to-[#3b82f6]/50' },
  '#10b981': { text: 'text-[#10b981]', iconBox: 'bg-[#10b981]/10 border-[#10b981]/[0.12]', barTrack: 'bg-[#10b981]/[0.06]', bar: 'bg-gradient-to-r from-[#10b981] to-[#10b981]/50' },
  '#f43f5e': { text: 'text-[#f43f5e]', iconBox: 'bg-[#f43f5e]/10 border-[#f43f5e]/[0.12]', barTrack: 'bg-[#f43f5e]/[0.06]', bar: 'bg-gradient-to-r from-[#f43f5e] to-[#f43f5e]/50' },
  '#f59e0b': { text: 'text-[#f59e0b]', iconBox: 'bg-[#f59e0b]/10 border-[#f59e0b]/[0.12]', barTrack: 'bg-[#f59e0b]/[0.06]', bar: 'bg-gradient-to-r from-[#f59e0b] to-[#f59e0b]/50' },
};

function StatsCard({ title, value, subtitle, icon: Icon, color = '#3b82f6', trend }) {
  const cls = ACCENT[color] || ACCENT['#3b82f6'];
  return (
    <div className="card-glow rounded-2xl p-5 animate-fade-in group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-[#4a5e80] uppercase tracking-widest">{title}</p>
          <p className={`text-3xl font-extrabold tracking-tight ${cls.text}`}>{value}</p>
          {subtitle && (
            <p className="text-[11px] text-[#7b8ba8] flex items-center gap-1">
              {trend && <span className={trend > 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}>{trend > 0 ? '↑' : '↓'}</span>}
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 ${cls.iconBox}`}>
            <Icon className={`w-5 h-5 ${cls.text}`} />
          </div>
        )}
      </div>
      <div className={`mt-3 h-1 rounded-full overflow-hidden ${cls.barTrack}`}>
        <div className={`h-full rounded-full transition-all duration-1000 ${cls.bar}`}
          style={{ width: `${Math.min(100, Math.max(5, parseInt(value?.toString().replace(/,/g, '')) || 0) / 10)}%` }}
        />
      </div>
    </div>
  );
}

export default StatsCard;
