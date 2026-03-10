import { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, AlertTriangle, Radio } from 'lucide-react';

const PROTOCOL_CLS = {
  TCP: 'bg-[#3b82f6]/[0.08] text-[#3b82f6] border-[#3b82f6]/15',
  UDP: 'bg-[#8b5cf6]/[0.08] text-[#8b5cf6] border-[#8b5cf6]/15',
  HTTP: 'bg-[#f43f5e]/[0.08] text-[#f43f5e] border-[#f43f5e]/15',
  HTTPS: 'bg-[#10b981]/[0.08] text-[#10b981] border-[#10b981]/15',
  DNS: 'bg-[#f59e0b]/[0.08] text-[#f59e0b] border-[#f59e0b]/15',
  SSH: 'bg-[#06b6d4]/[0.08] text-[#06b6d4] border-[#06b6d4]/15',
  ICMP: 'bg-[#f97316]/[0.08] text-[#f97316] border-[#f97316]/15',
  FTP: 'bg-[#ec4899]/[0.08] text-[#ec4899] border-[#ec4899]/15',
  SMTP: 'bg-[#14b8a6]/[0.08] text-[#14b8a6] border-[#14b8a6]/15',
  OTHER: 'bg-[#64748b]/[0.08] text-[#64748b] border-[#64748b]/15',
};

function LivePacketTable({ packets, isAdmin }) {
  const tableRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
  }, [packets, autoScroll]);

  return (
    <div className="card-glow rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#f43f5e]" />
          <h3 className="text-sm font-semibold text-white">Live Packets</h3>
          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] font-medium">
            {packets.length} captured
          </span>
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all duration-200 ${
            autoScroll
              ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20'
              : 'bg-[#0b1628] text-[#4a5e80] border border-[#1e3058]/60'
          }`}
        >
          Auto-scroll {autoScroll ? 'ON' : 'OFF'}
        </button>
      </div>

      <div ref={tableRef} className="overflow-auto max-h-[340px] rounded-xl">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-[#0a1628]">
            <tr className="text-[#4a5e80] uppercase text-[10px] tracking-wider">
              <th className="text-left py-2.5 px-3 font-semibold">Time</th>
              {isAdmin && <th className="text-left py-2.5 px-3 font-semibold">Owner</th>}
              <th className="text-left py-2.5 px-3 font-semibold">Protocol</th>
              <th className="text-left py-2.5 px-3 font-semibold">Source</th>
              <th className="text-left py-2.5 px-3 font-semibold">Destination</th>
              <th className="text-left py-2.5 px-3 font-semibold">Size</th>
              <th className="text-center py-2.5 px-3 font-semibold">Enc</th>
              <th className="text-center py-2.5 px-3 font-semibold">Threat</th>
            </tr>
          </thead>
          <tbody>
            {packets.map((pkt, i) => (
              <tr
                key={pkt.packetId || i}
                className={`border-b border-[#1e3058]/30 transition-colors duration-150 ${
                  i === 0 ? 'row-flash' : ''
                } ${
                  pkt.isSuspicious
                    ? 'bg-[#f43f5e]/[0.04] hover:bg-[#f43f5e]/[0.08]'
                    : 'hover:bg-[#1e3058]/20'
                }`}
              >
                <td className="py-2 px-3 text-[#7b8ba8] tabular-nums">
                  {new Date(pkt.capturedAt).toLocaleTimeString()}
                </td>
                {isAdmin && (
                  <td className="py-2 px-3 text-[#8b5cf6] text-[11px] font-medium">
                    {pkt.ownerName || '—'}
                  </td>
                )}
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${PROTOCOL_CLS[pkt.protocol] || PROTOCOL_CLS.OTHER}`}>
                    {pkt.protocol}
                  </span>
                </td>
                <td className="py-2 px-3 text-[#c5d0e0] font-mono text-[11px]">
                  {pkt.sourceIP}:{pkt.sourcePort}
                </td>
                <td className="py-2 px-3 text-[#c5d0e0] font-mono text-[11px]">
                  {pkt.destinationIP}:{pkt.destinationPort}
                </td>
                <td className="py-2 px-3 text-[#7b8ba8] tabular-nums">{pkt.size}B</td>
                <td className="py-2 px-3 text-center">
                  {pkt.isEncrypted ? (
                    <Lock className="w-3.5 h-3.5 text-[#10b981] inline" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-[#f43f5e] inline" />
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  {pkt.isSuspicious && (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] inline" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LivePacketTable;
