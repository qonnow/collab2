import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, Lock, ShieldAlert, Globe, Wifi, WifiOff, Activity, Radio, LogOut, User, Settings, Crown } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & stats' },
  { path: '/packets', label: 'Packets', icon: List, desc: 'Browse captured data' },
  { path: '/encryption', label: 'Encryption', icon: Lock, desc: 'AES encrypt/decrypt' },
  { path: '/threats', label: 'Threats', icon: ShieldAlert, desc: 'Security monitor' },
  { path: '/geo', label: 'Geo Map', icon: Globe, desc: 'IP geolocation map' },
  { path: '/profile', label: 'Profile', icon: Settings, desc: 'Account settings' },
];

function Sidebar({ isConnected, isCapturing, user, onLogout }) {
  return (
    <aside className="w-80 flex flex-col bg-sidebar border-r border-[#1e3058]/40">
      {/* Logo */}
      <div className="p-7 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-blue-purple shadow-[0_4px_15px_rgba(59,130,246,0.3)]">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">PacketViz</h1>
            <p className="text-[11px] text-[#7b8ba8] tracking-widest uppercase">Real-time Dashboard</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-divider-h" />

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-5 py-6 space-y-2">
        <p className="text-[11px] font-semibold text-[#4a5e80] uppercase tracking-widest px-3 mb-4">Navigation</p>
        {navItems.map(({ path, label, icon: Icon, desc }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `group flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm transition-all duration-200 border ${
                isActive
                  ? 'text-white bg-nav-active border-[rgba(59,130,246,0.2)] shadow-[0_0_20px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,0.03)]'
                  : 'text-[#7b8ba8] hover:text-[#c5d0e0] border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  isActive ? 'bg-gradient-blue-indigo shadow-[0_2px_8px_rgba(59,130,246,0.3)]' : 'group-hover:bg-[#111c36]'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-medium leading-tight">{label}</span>
                  <span className="block text-[11px] text-[#4a5e80] leading-tight mt-0.5">{desc}</span>
                </div>
              </>
            )}
          </NavLink>
        ))}

        {/* Admin-only nav */}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `group flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm transition-all duration-200 border ${
                isActive
                  ? 'text-white bg-nav-active border-[rgba(245,158,11,0.25)] shadow-[0_0_20px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,0.03)]'
                  : 'text-[#7b8ba8] hover:text-[#c5d0e0] border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  isActive ? 'bg-gradient-to-br from-[#f59e0b] to-[#f97316] shadow-[0_2px_8px_rgba(245,158,11,0.3)]' : 'group-hover:bg-[#111c36]'
                }`}>
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-medium leading-tight">Admin</span>
                  <span className="block text-[11px] text-[#4a5e80] leading-tight mt-0.5">Users & logs</span>
                </div>
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Status Panel */}
      <div className="mx-5 mb-5 rounded-xl p-5 bg-status-panel border border-[#1e3058]/40">
        <p className="text-[11px] font-semibold text-[#4a5e80] uppercase tracking-widest mb-3">System Status</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-[#10b981] pulse-green" />
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#f43f5e] pulse-red" />
              )}
              <span className="text-xs text-[#7b8ba8]">WebSocket</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isConnected
                ? 'bg-[#10b981]/10 text-[#10b981]'
                : 'bg-[#f43f5e]/10 text-[#f43f5e]'
            }`}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className={`w-3 h-3 ${isCapturing ? 'text-[#10b981]' : 'text-[#4a5e80]'}`} />
              <span className="text-xs text-[#7b8ba8]">Capture</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isCapturing
                ? 'bg-[#10b981]/10 text-[#10b981]'
                : 'bg-[#4a5e80]/10 text-[#4a5e80]'
            }`}>
              {isCapturing ? 'Active' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* User Panel */}
      {user && (
        <div className="mx-5 mb-5 rounded-xl p-4 flex items-center gap-3 bg-status-panel border border-[#1e3058]/40">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-blue-purple">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.username}</p>
            <p className="text-[10px] text-[#4a5e80] uppercase">{user.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-[#4a5e80] hover:text-[#f43f5e] hover:bg-[#f43f5e]/10 transition-all"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
