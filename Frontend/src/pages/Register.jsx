import { useState, useEffect } from 'react';
import { Activity, UserPlus, Eye, EyeOff, Shield, Lock, Zap, Globe, ChevronRight, CheckCircle } from 'lucide-react';

const FeatureItem = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start gap-4 group">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 bg-feature-green border border-[rgba(16,185,129,0.15)]">
      <Icon className="w-4.5 h-4.5 text-[#34d399]" />
    </div>
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-[#4a5e80] mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const STRENGTH_CLS = {
  1: { bar: 'bg-[#f43f5e]', text: 'text-[#f43f5e]' },
  2: { bar: 'bg-[#f59e0b]', text: 'text-[#f59e0b]' },
  3: { bar: 'bg-[#10b981]', text: 'text-[#10b981]' },
};

function Register({ onRegister, onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onRegister(username, email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const passStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const passLabels = ['', 'Weak', 'Good', 'Strong'];

  const inputCls = "w-full rounded-xl px-4 py-3.5 text-sm text-[#c5d0e0] focus:outline-none transition-all duration-300 placeholder-[#2a3f5f] input-field focus:input-focus-green";

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#030712]">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] top-[-10%] left-[60%] rounded-full opacity-30 blur-3xl bg-orb-green animate-orb [animation-duration:8s]" />
        <div className="absolute w-[400px] h-[400px] top-[70%] left-[-5%] rounded-full opacity-30 blur-3xl bg-orb-cyan-dark animate-orb [animation-duration:10s] [animation-delay:2s]" />
        <div className="absolute w-[300px] h-[300px] top-[40%] left-[35%] rounded-full opacity-30 blur-3xl bg-orb-blue-light animate-orb [animation-duration:12s] [animation-delay:4s]" />
        <div className="absolute inset-0 bg-grid-green" />
      </div>

      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12">
        <div className={`max-w-lg transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative bg-gradient-green-cyan shadow-[0_8px_32px_rgba(16,185,129,0.35)]">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">PacketViz</h1>
              <p className="text-xs text-[#4a5e80] tracking-widest uppercase">Security Dashboard</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-3">
            Start securing
            <br />
            <span className="text-gradient-green">
              your network today
            </span>
          </h2>
          <p className="text-[#4a5e80] text-base leading-relaxed mb-10">
            Create your account and get instant access to powerful network monitoring and threat detection tools.
          </p>

          <div className="space-y-6">
            <FeatureItem icon={Shield} title="Enterprise Security" desc="Bank-grade encryption for all data in transit" />
            <FeatureItem icon={Lock} title="Role-based Access" desc="Admin and user roles with granular permissions" />
            <FeatureItem icon={Zap} title="Instant Setup" desc="Get started in seconds with zero configuration" />
            <FeatureItem icon={Globe} title="Full Protocol Support" desc="TCP, UDP, HTTP, HTTPS, DNS, SSH and more" />
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="hidden lg:block absolute left-0 top-[15%] bottom-[15%] w-px bg-divider-v" />

        <div className={`w-full max-w-[420px] transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-green-cyan shadow-[0_8px_32px_rgba(16,185,129,0.35)]">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">PacketViz</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Create account</h2>
            <p className="text-sm text-[#4a5e80] mt-1">Fill in the details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-[#7b8ba8] uppercase tracking-wider font-semibold mb-2">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username" className={inputCls}
                autoComplete="username" />
            </div>

            <div>
              <label className="block text-[11px] text-[#7b8ba8] uppercase tracking-wider font-semibold mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className={inputCls}
                autoComplete="email" />
            </div>

            <div>
              <label className="block text-[11px] text-[#7b8ba8] uppercase tracking-wider font-semibold mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters"
                  className={`${inputCls} pr-12`}
                  autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4a5e80] hover:text-[#7b8ba8] transition-colors p-1">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        passStrength >= level ? STRENGTH_CLS[passStrength]?.bar : 'bg-[#1e3058]/40'
                      }`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold ${STRENGTH_CLS[passStrength]?.text || ''}`}>
                    {passLabels[passStrength]}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] text-[#7b8ba8] uppercase tracking-wider font-semibold mb-2">Confirm Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password"
                  className={inputCls}
                  autoComplete="new-password" />
                {confirmPassword.length > 0 && confirmPassword === password && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#10b981]" />
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-[#f43f5e]/[0.06] border border-[#f43f5e]/20 rounded-xl px-4 py-3 text-sm text-[#f43f5e] animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 hover:translate-y-[-1px] active:translate-y-0 cursor-pointer mt-2 bg-gradient-register-btn shadow-[0_4px_25px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </button>
          </form>

          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-divider-h" />
          </div>

          <p className="text-center text-sm text-[#4a5e80]">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="text-[#34d399] hover:text-white font-semibold transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
