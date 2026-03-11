import { useState, useEffect } from 'react';
import { getPackets, exportPackets, generatePDFReport } from '../services/api';
import { Lock, Unlock, AlertTriangle, ChevronLeft, ChevronRight, Search, Database, ShieldCheck, FileKey, SlidersHorizontal, X, Download } from 'lucide-react';
import { useGeoLookup } from '../hooks/useGeoLookup';

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
  const [filters, setFilters] = useState({
    protocol: '', isEncrypted: '', isSuspicious: '',
    threatLevel: '', encryptionMethod: '',
    ipSearch: '', sizeMin: '', sizeMax: '', dateFrom: '', dateTo: '',
  });
  const [ipSearchInput, setIpSearchInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  // sortBy เก็บ format 'field_direction' เช่น 'capturedAt_desc', 'size_asc'
  const [sortBy, setSortBy] = useState('capturedAt_desc');
  // exporting = true ขณะรอดาวน์โหลดไฟล์ (ทั้ง CSV, JSON, PDF)
  const [exporting, setExporting] = useState(false);
  // showExportMenu ควบคุมการเปิด/ปิด dropdown เมนู Export
  const [showExportMenu, setShowExportMenu] = useState(false);

  // geo lookup สำหรับ IP ใน page ปัจจุบัน
  const sourceIPs = packets.map((p) => p.sourceIP).filter(Boolean);
  const { getFlag, getLabel } = useGeoLookup(sourceIPs);

  const fetchPackets = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (filters.protocol)         params.protocol = filters.protocol;
      if (filters.isEncrypted)      params.isEncrypted = filters.isEncrypted;
      if (filters.isSuspicious)     params.isSuspicious = filters.isSuspicious;
      if (filters.threatLevel)      params.threatLevel = filters.threatLevel;
      if (filters.encryptionMethod) params.encryptionMethod = filters.encryptionMethod;
      if (filters.ipSearch)         params.ipSearch = filters.ipSearch;
      if (filters.sizeMin)          params.sizeMin = filters.sizeMin;
      if (filters.sizeMax)          params.sizeMax = filters.sizeMax;
      if (filters.dateFrom)         params.dateFrom = filters.dateFrom;
      if (filters.dateTo)           params.dateTo = filters.dateTo;

      // แยก 'capturedAt_desc' → sortField='capturedAt', sortDir='desc'
      const [sortField, sortDir] = sortBy.split('_');
      params.sortBy  = sortField;
      params.sortDir = sortDir;
      const res = await getPackets(params);
      setPackets(res.data.packets);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch packets:', err);
    }
    setLoading(false);
  };

  // Debounce IP search — รอหยุดพิมพ์ 400ms แล้วค่อย fetch
  // guard: ถ้าค่าเหมือนเดิมไม่ต้อง update (ป้องกัน double-fetch ตอน mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => {
        if (f.ipSearch === ipSearchInput) return f;
        return { ...f, ipSearch: ipSearchInput };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [ipSearchInput]);

  useEffect(() => {
    fetchPackets();
  }, [filters, sortBy]);

  const resetFilters = () => {
    setFilters({ protocol: '', isEncrypted: '', isSuspicious: '', threatLevel: '', encryptionMethod: '', ipSearch: '', sizeMin: '', sizeMax: '', dateFrom: '', dateTo: '' });
    setIpSearchInput('');
  };

  // นับจำนวน filter ที่เปิดอยู่ — แสดงเป็น badge บนปุ่ม Advanced
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // รวบรวม filter ที่มีค่าใส่ params object สำหรับส่ง API
  // ใช้ร่วมกันได้ทั้ง export CSV/JSON/PDF
  const buildFilterParams = () => {
    const params = {};
    if (filters.protocol)         params.protocol = filters.protocol;
    if (filters.isEncrypted)      params.isEncrypted = filters.isEncrypted;
    if (filters.isSuspicious)     params.isSuspicious = filters.isSuspicious;
    if (filters.threatLevel)      params.threatLevel = filters.threatLevel;
    if (filters.encryptionMethod) params.encryptionMethod = filters.encryptionMethod;
    if (filters.ipSearch)         params.ipSearch = filters.ipSearch;
    if (filters.sizeMin)          params.sizeMin = filters.sizeMin;
    if (filters.sizeMax)          params.sizeMax = filters.sizeMax;
    if (filters.dateFrom)         params.dateFrom = filters.dateFrom;
    if (filters.dateTo)           params.dateTo = filters.dateTo;
    return params;
  };

  // ดาวน์โหลดข้อมูลแพ็กเก็ตเป็นไฟล์ CSV หรือ JSON
  // ใช้ URL.createObjectURL เพื่อสร้างลิงก์ดาวน์โหลดชั่วคราวแล้วลบทิ้ง
  const handleExport = async (format) => {
    setShowExportMenu(false);
    setExporting(true);
    try {
      const params = { format, ...buildFilterParams() };
      const res = await exportPackets(params);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `packets-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(false);
  };

  // สร้างและดาวน์โหลดรายงาน PDF แบบ formatted
  // ส่ง filter ปัจจุบันไปด้วยเพื่อให้ PDF ตรงกับสิ่งที่เห็นบนหน้าจอ
  const handlePDFReport = async () => {
    setShowExportMenu(false);
    setExporting(true);
    try {
      const res = await generatePDFReport(buildFilterParams());
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `packetviz-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Report failed:', err);
    }
    setExporting(false);
  };

  const selectCls = "bg-[#0b1628] border border-[#1e3058]/80 rounded-xl px-4 py-2.5 text-sm text-[#c5d0e0] focus:outline-none focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all appearance-none custom-select cursor-pointer";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Packet Explorer</h2>
          <p className="text-sm text-[#7b8ba8] mt-0.5">Browse and filter captured packets</p>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-[#1e3058]/60 text-[#7b8ba8] hover:text-white hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/[0.06] disabled:opacity-40 transition-all"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 bg-[#0d1f3c] border border-[#1e3058]/80 rounded-xl overflow-hidden shadow-2xl min-w-[160px]">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-3 text-sm text-[#c5d0e0] hover:bg-[#1e3058]/40 flex items-center gap-2.5 transition-colors"
                >
                  <span className="text-[10px] font-bold text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded">CSV</span>
                  Spreadsheet
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-3 text-sm text-[#c5d0e0] hover:bg-[#1e3058]/40 flex items-center gap-2.5 transition-colors border-t border-[#1e3058]/40"
                >
                  <span className="text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">JSON</span>
                  Raw data
                </button>
                <button
                  onClick={handlePDFReport}
                  className="w-full text-left px-4 py-3 text-sm text-[#c5d0e0] hover:bg-[#1e3058]/40 flex items-center gap-2.5 transition-colors border-t border-[#1e3058]/40"
                >
                  <span className="text-[10px] font-bold text-[#f43f5e] bg-[#f43f5e]/10 px-1.5 py-0.5 rounded">PDF</span>
                  Full Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="card-glow rounded-2xl p-4 space-y-3">
        {/* Row 1 — basic filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* IP Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a5e80] pointer-events-none" />
            <input
              type="text"
              placeholder="Search source / destination IP…"
              value={ipSearchInput}
              onChange={(e) => setIpSearchInput(e.target.value)}
              className="w-full bg-[#0b1628] border border-[#1e3058]/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#c5d0e0] placeholder-[#4a5e80] focus:outline-none focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
            />
          </div>
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
            <option value="">All Packets</option>
            <option value="true">Suspicious Only</option>
            <option value="false">Normal Only</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectCls}>
            <option value="capturedAt_desc">↓ Newest</option>
            <option value="capturedAt_asc">↑ Oldest</option>
            <option value="size_desc">↓ Largest</option>
            <option value="size_asc">↑ Smallest</option>
            <option value="threatLevel_desc">↓ Threat</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#f43f5e] border border-[#f43f5e]/20 bg-[#f43f5e]/[0.06] hover:bg-[#f43f5e]/[0.12] transition-all"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition-all ${showAdvanced ? 'text-[#3b82f6] border-[#3b82f6]/30 bg-[#3b82f6]/[0.08]' : 'text-[#7b8ba8] border-[#1e3058]/60 bg-transparent hover:border-[#3b82f6]/30'}`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Advanced
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#3b82f6] text-white text-[9px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <span className="flex items-center gap-1.5 text-xs text-[#4a5e80]">
              <Database className="w-3 h-3" />
              {pagination.total.toLocaleString()} packets
            </span>
          </div>
        </div>

        {/* Row 2 — advanced filters (collapsible) */}
        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#1e3058]/30">
            <select value={filters.threatLevel} onChange={(e) => setFilters({ ...filters, threatLevel: e.target.value })} className={selectCls}>
              <option value="">Any Threat Level</option>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select value={filters.encryptionMethod} onChange={(e) => setFilters({ ...filters, encryptionMethod: e.target.value })} className={selectCls}>
              <option value="">Any Method</option>
              {['TLS 1.3', 'TLS 1.2', 'SSL 3.0', 'AES', 'NONE'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min bytes"
                min="0"
                value={filters.sizeMin}
                onChange={(e) => setFilters({ ...filters, sizeMin: e.target.value })}
                className="w-28 bg-[#0b1628] border border-[#1e3058]/80 rounded-xl px-3 py-2.5 text-sm text-[#c5d0e0] placeholder-[#4a5e80] focus:outline-none focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
              />
              <span className="text-[#4a5e80] text-xs">—</span>
              <input
                type="number"
                placeholder="Max bytes"
                min="0"
                value={filters.sizeMax}
                onChange={(e) => setFilters({ ...filters, sizeMax: e.target.value })}
                className="w-28 bg-[#0b1628] border border-[#1e3058]/80 rounded-xl px-3 py-2.5 text-sm text-[#c5d0e0] placeholder-[#4a5e80] focus:outline-none focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="bg-[#0b1628] border border-[#1e3058]/80 rounded-xl px-3 py-2 text-sm text-[#c5d0e0] focus:outline-none focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
              />
              <span className="text-[#4a5e80] text-xs">—</span>
              <input
                type="datetime-local"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="bg-[#0b1628] border border-[#1e3058]/80 rounded-xl px-3 py-2 text-sm text-[#c5d0e0] focus:outline-none focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all"
              />
            </div>
          </div>
        )}
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
                      {getFlag(pkt.sourceIP) && (
                        <span className="ml-1 text-xs" title={getLabel(pkt.sourceIP)}>{getFlag(pkt.sourceIP)}</span>
                      )}
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
