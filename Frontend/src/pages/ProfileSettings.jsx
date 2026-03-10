import { useState } from 'react';
import { updateProfile } from '../services/api';
import { User, Mail, Lock, Save, CheckCircle, AlertTriangle } from 'lucide-react';

function ProfileSettings({ user, onUpdate }) {
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const updates = {};
    if (email && email !== user.email) updates.email = email;
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'New passwords do not match.' });
        return;
      }
      if (!currentPassword) {
        setMessage({ type: 'error', text: 'Current password is required.' });
        return;
      }
      updates.password = newPassword;
      updates.currentPassword = currentPassword;
    }

    if (Object.keys(updates).length === 0) {
      setMessage({ type: 'error', text: 'No changes to save.' });
      return;
    }

    setSaving(true);
    try {
      const res = await updateProfile(updates);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onUpdate) onUpdate(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    }
    setSaving(false);
  };

  const inputCls = "w-full bg-[#0b1628] border border-[#1e3058]/80 rounded-xl px-4 py-3 text-sm text-[#c5d0e0] focus:outline-none focus:border-[#3b82f6]/60 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Profile Settings</h2>
        <p className="text-sm text-[#7b8ba8] mt-0.5">Manage your account details</p>
      </div>

      {/* User Info Card */}
      <div className="card-glow rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-blue-purple shadow-[0_4px_15px_rgba(59,130,246,0.3)]">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{user?.username}</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-5 text-sm ${
            message.type === 'success'
              ? 'bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981]'
              : 'bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e]'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="text-[11px] text-[#4a5e80] uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-2">
              <Mail className="w-3 h-3" /> Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>

          {/* Divider */}
          <div className="h-px bg-[#1e3058]/60" />
          <p className="text-[11px] text-[#4a5e80] uppercase tracking-wider font-semibold">Change Password</p>

          {/* Current Password */}
          <div>
            <label className="text-[11px] text-[#4a5e80] uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-2">
              <Lock className="w-3 h-3" /> Current Password
            </label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} placeholder="Enter current password" />
          </div>

          {/* New / Confirm */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[#4a5e80] uppercase tracking-wider font-semibold mb-2 block">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="Min 6 characters" />
            </div>
            <div>
              <label className="text-[11px] text-[#4a5e80] uppercase tracking-wider font-semibold mb-2 block">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Repeat new password" />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-blue-purple text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileSettings;
