import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square, Activity, Lock, Unlock, ShieldAlert, Box } from 'lucide-react';
import socket from '../services/socket';
import { getOverviewStats, getProtocolStats, getTimeline, getPackets, startCapture as apiStartCapture, stopCapture as apiStopCapture, getCaptureStatus } from '../services/api';
import StatsCard from '../components/StatsCard';
import TrafficChart from '../components/TrafficChart';
import ProtocolChart from '../components/ProtocolChart';
import LivePacketTable from '../components/LivePacketTable';

function Dashboard({ isCapturing, setIsCapturing, user }) {
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState({
    totalPackets: 0,
    encryptedCount: 0,
    unencryptedCount: 0,
    suspiciousCount: 0,
    encryptionRate: 0,
    averageSize: 0,
  });
  const [protocols, setProtocols] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [livePackets, setLivePackets] = useState([]);
  const seenIds = useRef(new Set());

  // ดึงข้อมูลสถิติ
  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, protocolRes, timelineRes] = await Promise.all([
        getOverviewStats(),
        getProtocolStats(),
        getTimeline(30),
      ]);
      setStats(statsRes.data);
      setProtocols(protocolRes.data);
      setTimeline(timelineRes.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // ตรวจสอบสถานะ capture เมื่อโหลดหน้า
  useEffect(() => {
    getCaptureStatus()
      .then((res) => setIsCapturing(res.data.isCapturing))
      .catch(() => {});
  }, [setIsCapturing]);

  // ฟังแพ็กเก็ตแบบเรียลไทม์ผ่าน Socket (โบนัส — ถ้า socket เชื่อมต่อได้)
  useEffect(() => {
    const handleNewPacket = (packet) => {
      const id = packet.packetId;
      if (seenIds.current.has(id)) return;
      seenIds.current.add(id);
      setLivePackets((prev) => [packet, ...prev].slice(0, 100));
    };

    socket.on('packet:new', handleNewPacket);
    return () => socket.off('packet:new', handleNewPacket);
  }, []);

  // Polling หลัก — ดึง packets ล่าสุดทุก 2 วินาทีตอนจับอยู่
  useEffect(() => {
    if (!isCapturing) return;

    const poll = async () => {
      try {
        const res = await getPackets({ limit: 20 });
        const fresh = res.data.packets || [];
        setLivePackets((prev) => {
          const newOnes = fresh.filter((p) => !seenIds.current.has(p.packetId));
          newOnes.forEach((p) => seenIds.current.add(p.packetId));
          if (newOnes.length === 0) return prev;
          return [...newOnes.reverse(), ...prev].slice(0, 100);
        });
      } catch (_) { /* polling ล้มเหลวเงียบๆ */ }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [isCapturing]);

  const toggleCapture = async () => {
    try {
      if (isCapturing) {
        await apiStopCapture();
        setIsCapturing(false);
      } else {
        await apiStartCapture(800);
        setIsCapturing(true);
      }
    } catch (err) {
      console.error('Capture toggle failed:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Dashboard</h2>
          <p className="text-sm text-[#7b8ba8] mt-0.5">Real-time Encrypted Packet Visualization</p>
        </div>
        <button
          onClick={toggleCapture}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 text-white ${
            isCapturing
              ? 'bg-gradient-stop shadow-[0_4px_20px_rgba(244,63,94,0.3)]'
              : 'bg-gradient-start shadow-[0_4px_20px_rgba(16,185,129,0.3)]'
          }`}
        >
          {isCapturing ? (
            <>
              <Square className="w-4 h-4" /> Stop Capture
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Start Capture
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Packets"
          value={stats.totalPackets.toLocaleString()}
          subtitle={`Avg size: ${stats.averageSize}B`}
          icon={Box}
          color="#3b82f6"
        />
        <StatsCard
          title="Encrypted"
          value={stats.encryptedCount.toLocaleString()}
          subtitle={`${stats.encryptionRate}% of total`}
          icon={Lock}
          color="#10b981"
        />
        <StatsCard
          title="Unencrypted"
          value={stats.unencryptedCount.toLocaleString()}
          subtitle="Potentially exposed"
          icon={Unlock}
          color="#f43f5e"
        />
        <StatsCard
          title="Suspicious"
          value={stats.suspiciousCount.toLocaleString()}
          subtitle="Requires attention"
          icon={ShieldAlert}
          color="#f59e0b"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TrafficChart data={timeline} />
        </div>
        <ProtocolChart data={protocols} />
      </div>

      {/* Live Packet Table */}
      <LivePacketTable packets={livePackets} isAdmin={isAdmin} />
    </div>
  );
}

export default Dashboard;
