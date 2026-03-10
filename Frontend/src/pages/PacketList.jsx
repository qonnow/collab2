import { useState, useEffect } from 'react';
import { getPackets } from '../services/api';
import { Lock, Unlock, AlertTriangle, ChevronLeft, ChevronRight, Search, Database, ShieldCheck, FileKey } from 'lucide-react';

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
};

function PacketList({ user }) {
  const isAdmin = user?.role === 'admin';
  const [packets, setPackets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ protocol: '', isEncrypted: '', isSuspicious: '' });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchPackets = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (filters.protocol) params.protocol = filters.protocol;
      if (filters.isEncrypted) params.isEncrypted = filters.isEncrypted;
      if (filters.isSuspicious) params.isSuspicious = filters.isSuspicious;

      const res = await getPackets(params);
      setPackets(res.data.packets);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch packets:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPackets();
  }, [filters]);

  const selectCls = "bg-[#0b1628] border border-[#1e3058]/80 rounded-xl px-4 py-2.5 text-sm text-[#c5d0e0] focus:outline-none focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all appearance-none custom-select cursor-pointer";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Packet Explorer</h2>
        <p className="text-sm text-[#7b8ba8] mt-0.5">Browse and filter captured packets</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filters.protocol} onChange={(e) => setFilters({ ...filters, protocol: e.target.value })} className={selectCls}>
          <option value="">All Protocols</option>
          {['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'SSH', 'ICMP', 'FTP', 'SMTP'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={filters.isEncrypted} onChange={(e) => setFilters({ ...filters, isEncrypted: e.target.value })} className={selectCls}>
          <option value="">All Encryption</option>
          <option value="true">Encrypted</option>
          <option value="false">Unencrypted</option>
        </select>
        <select value={filters.isSuspicious} onChange={(e) => setFilters({ ...filters, isSuspicious: e.target.value })} className={selectCls}>
          <option value="">All Threat Levels</option>
          <option value="true">Suspicious Only</option>
          <option value="false">Normal Only</option>
        </select>
        <span className="flex items-center gap-1.5 text-xs text-[#4a5e80] ml-auto">
          <Database className="w-3 h-3" />
          {pagination.total.toLocaleString()} packets
        </span>
      </div>

      {/* Table */}
      <div className="card-glow rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="shimmer h-4 w-32 mx-auto rounded"></div>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#4a5e80] uppercase text-[10px] tracking-wider bg-[#0a1628]">
                  <th className="text-left py-3 px-3 font-semibold">Packet ID</th>
                  <th className="text-left py-3 px-3 font-semibold">Time</th>
                  {isAdmin && <th className="text-left py-3 px-3 font-semibold">Owner</th>}
                  <th className="text-left py-3 px-3 font-semibold">Protocol</th>
                  <th className="text-left py-3 px-3 font-semibold">Source</th>
                  <th className="text-left py-3 px-3 font-semibold">Destination</th>
                  <th className="text-left py-3 px-3 font-semibold">Size</th>
                  <th className="text-center py-3 px-3 font-semibold">Encrypted</th>
                  <th className="text-left py-3 px-3 font-semibold">Method</th>
                  <th className="text-center py-3 px-3 font-semibold">Threat</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((pkt) => (
                  <tr
                    key={pkt._id}
                    onClick={() => setSelected(selected === pkt._id ? null : pkt._id)}
                    className={`border-b border-[#1e3058]/30 cursor-pointer transition-colors duration-150 ${
                      selected === pkt._id ? 'bg-[#3b82f6]/[0.08]' : 'hover:bg-[#1e3058]/20'
                    } ${pkt.isSuspicious ? 'bg-[#f43f5e]/[0.04]' : ''}`}
                  >
                    <td className="py-2.5 px-3 font-mono text-[#7b8ba8] text-[11px]">
                      {pkt.packetId?.slice(0, 16)}...
                    </td>
                    <td className="py-2.5 px-3 text-[#7b8ba8] tabular-nums">
                      {new Date(pkt.capturedAt).toLocaleTimeString()}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3 text-[#8b5cf6] text-[11px] font-medium">
                        {pkt.ownerName || '—'}
                      </td>
                    )}
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${PROTOCOL_CLS[pkt.protocol] || 'bg-[#64748b]/[0.08] text-[#64748b] border-[#64748b]/15'}`}>
                        {pkt.protocol}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#c5d0e0] text-[11px]">
                      {pkt.sourceIP}:{pkt.sourcePort}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#c5d0e0] text-[11px]">
                      {pkt.destinationIP}:{pkt.destinationPort}
                    </td>
                    <td className="py-2.5 px-3 text-[#7b8ba8] tabular-nums">{pkt.size}B</td>
                    <td className="py-2.5 px-3 text-center">
                      {pkt.isEncrypted ? (
                        <Lock className="w-3.5 h-3.5 text-[#10b981] inline" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-[#f43f5e] inline" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#7b8ba8]">{pkt.encryptionMethod}</td>
                    <td className="py-2.5 px-3 text-center">
                      {pkt.isSuspicious && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                          pkt.threatLevel === 'HIGH' || pkt.threatLevel === 'CRITICAL'
                            ? 'bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/20'
                            : pkt.threatLevel === 'MEDIUM'
                            ? 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20'
                            : 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/20'
                        }`}>
                          {pkt.threatLevel}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-[#1e3058]/40">
          <span className="text-xs text-[#4a5e80]">
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPackets(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-[#1e3058]/60 text-[#7b8ba8] hover:bg-[#1e3058]/30 hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchPackets(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-2 rounded-lg border border-[#1e3058]/60 text-[#7b8ba8] hover:bg-[#1e3058]/30 hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && packets.find((p) => p._id === selected) && (() => {
        const pkt = packets.find((p) => p._id === selected);
        return (
          <div className="card-glow rounded-2xl p-5 animate-fade-in">
            <h3 className="text-sm font-semibold text-white mb-4">Packet Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Packet ID</span><p className="font-mono text-[#c5d0e0] mt-1">{pkt.packetId}</p></div>
              <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">TTL</span><p className="text-[#c5d0e0] mt-1">{pkt.ttl}</p></div>
              <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Flags</span><p className="text-[#c5d0e0] mt-1">{pkt.flags?.join(', ') || 'None'}</p></div>
              <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Encryption</span><p className="text-[#c5d0e0] mt-1">{pkt.encryptionMethod}</p></div>
            </div>

            {/* Cipher Suite */}
            {pkt.cipherSuite && (
              <div className="mt-4 p-4 bg-[#3b82f6]/[0.04] border border-[#3b82f6]/15 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <FileKey className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span className="text-[10px] text-[#4a5e80] uppercase tracking-wider font-semibold">Cipher Suite</span>
                </div>
                <p className="text-sm font-mono text-[#c5d0e0]">{pkt.cipherSuite}</p>
              </div>
            )}

            {/* Certificate Info */}
            {pkt.certificate && (
              <div className={`mt-4 p-4 rounded-xl border ${pkt.certificate.isValid ? 'bg-[#10b981]/[0.04] border-[#10b981]/15' : 'bg-[#f43f5e]/[0.04] border-[#f43f5e]/15'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className={`w-3.5 h-3.5 ${pkt.certificate.isValid ? 'text-[#10b981]' : 'text-[#f43f5e]'}`} />
                  <span className="text-[10px] text-[#4a5e80] uppercase tracking-wider font-semibold">TLS Certificate</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pkt.certificate.isValid ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#f43f5e]/10 text-[#f43f5e]'}`}>
                    {pkt.certificate.isValid ? 'Valid' : 'Expired'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Issuer</span><p className="text-[#c5d0e0] mt-0.5">{pkt.certificate.issuer}</p></div>
                  <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Subject</span><p className="text-[#c5d0e0] mt-0.5 font-mono">{pkt.certificate.subject}</p></div>
                  <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Algorithm</span><p className="text-[#c5d0e0] mt-0.5">{pkt.certificate.signatureAlgorithm}</p></div>
                  <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Valid From</span><p className="text-[#c5d0e0] mt-0.5">{new Date(pkt.certificate.validFrom).toLocaleDateString()}</p></div>
                  <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Valid To</span><p className="text-[#c5d0e0] mt-0.5">{new Date(pkt.certificate.validTo).toLocaleDateString()}</p></div>
                  <div><span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">SAN</span><p className="text-[#c5d0e0] mt-0.5 font-mono">{pkt.certificate.san?.join(', ')}</p></div>
                </div>
                <div className="mt-2">
                  <span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Serial Number</span>
                  <p className="text-[#7b8ba8] mt-0.5 font-mono text-[11px] break-all">{pkt.certificate.serialNumber}</p>
                </div>
              </div>
            )}

            {pkt.payload && (
              <div className="mt-4">
                <span className="text-[#4a5e80] text-[10px] uppercase tracking-wider">Payload</span>
                <pre className="mt-2 bg-[#050a18] p-4 rounded-xl text-xs text-[#c5d0e0] font-mono overflow-x-auto border border-[#1e3058]/40">
                  {pkt.payload}
                </pre>
              </div>
            )}
            {pkt.threatDescription && (
              <div className="mt-4 p-4 bg-[#f43f5e]/[0.06] border border-[#f43f5e]/20 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-[#f43f5e]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-bold">{pkt.threatLevel}</span>
                </div>
                <p className="text-xs text-[#7b8ba8] mt-1.5">{pkt.threatDescription}</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default PacketList;
