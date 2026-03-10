import { useState, useEffect } from 'react';
import { getAdminUsers, updateUserRole, getAuditLogs } from '../services/api';
import { Users, ScrollText, Shield, ShieldCheck, ChevronLeft, ChevronRight, Clock, Globe } from 'lucide-react';

function AdminPanel() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logPagination, setLogPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
    setLoading(false);
  };

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAuditLogs(page);
      setLogs(res.data.logs);
      setLogPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    else fetchLogs();
  }, [tab]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role.');
    }
  };

  const tabCls = (active) =>
    `px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
      active
        ? 'bg-gradient-blue-purple text-white shadow-[0_2px_10px_rgba(59,130,246,0.3)]'
        : 'text-[#7b8ba8] hover:text-white hover:bg-[#1e3058]/30'
    }`;

  const ACTION_CLS = {
    LOGIN_SUCCESS: 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20',
    LOGIN_FAILED: 'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20',
    REGISTER: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20',
    PROFILE_UPDATE: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Admin Panel</h2>
        <p className="text-sm text-[#7b8ba8] mt-0.5">Manage users and view audit logs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('users')} className={tabCls(tab === 'users')}>
          <Users className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Users
        </button>
        <button onClick={() => setTab('logs')} className={tabCls(tab === 'logs')}>
          <ScrollText className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Audit Logs
        </button>
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="card-glow rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center"><div className="shimmer h-4 w-32 mx-auto rounded" /></div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#4a5e80] uppercase text-[10px] tracking-wider bg-[#0a1628]">
                    <th className="text-left py-3 px-4 font-semibold">Username</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Role</th>
                    <th className="text-left py-3 px-4 font-semibold">Last Login</th>
                    <th className="text-left py-3 px-4 font-semibold">Joined</th>
                    <th className="text-center py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-[#1e3058]/30 hover:bg-[#1e3058]/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#c5d0e0]">{u.username}</td>
                      <td className="py-3 px-4 text-[#7b8ba8]">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          u.role === 'admin'
                            ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
                            : 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20'
                        }`}>
                          {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#7b8ba8]">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-[#7b8ba8]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-[#0b1628] border border-[#1e3058]/80 rounded-lg px-2 py-1 text-[11px] text-[#c5d0e0] focus:outline-none focus:border-[#3b82f6]/60"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-[#4a5e80] text-sm py-8">No users found</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {tab === 'logs' && (
        <div className="card-glow rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center"><div className="shimmer h-4 w-32 mx-auto rounded" /></div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#4a5e80] uppercase text-[10px] tracking-wider bg-[#0a1628]">
                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                    <th className="text-left py-3 px-4 font-semibold">Details</th>
                    <th className="text-left py-3 px-4 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#1e3058]/30 hover:bg-[#1e3058]/20 transition-colors">
                      <td className="py-3 px-4 text-[#7b8ba8] whitespace-nowrap">
                        <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${ACTION_CLS[log.action] || 'bg-[#64748b]/10 text-[#64748b] border-[#64748b]/20'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#c5d0e0]">{log.details}</td>
                      <td className="py-3 px-4 text-[#7b8ba8] font-mono">
                        <Globe className="w-3 h-3 inline mr-1 -mt-0.5" />
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <p className="text-center text-[#4a5e80] text-sm py-8">No audit logs yet</p>
              )}
            </div>
          )}
          {/* Pagination */}
          {logPagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-[#1e3058]/40">
              <span className="text-xs text-[#4a5e80]">Page {logPagination.page} of {logPagination.pages}</span>
              <div className="flex gap-2">
                <button onClick={() => fetchLogs(logPagination.page - 1)} disabled={logPagination.page <= 1}
                  className="p-2 rounded-lg border border-[#1e3058]/60 text-[#7b8ba8] hover:bg-[#1e3058]/30 hover:text-white disabled:opacity-20 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => fetchLogs(logPagination.page + 1)} disabled={logPagination.page >= logPagination.pages}
                  className="p-2 rounded-lg border border-[#1e3058]/60 text-[#7b8ba8] hover:bg-[#1e3058]/30 hover:text-white disabled:opacity-20 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
