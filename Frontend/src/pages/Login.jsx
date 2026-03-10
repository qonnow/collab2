import { useState, useEffect } from 'react';
import { Activity, LogIn, Eye, EyeOff, Shield, Wifi, Lock, Zap, Globe, ChevronRight } from 'lucide-react';

const FeatureItem = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start gap-4 group">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 bg-feature-blue border border-[rgba(59,130,246,0.15)]">
      <Icon className="w-4.5 h-4.5 text-[#60a5fa]" />
    </div>
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-[#4a5e80] mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

function Login({ onLogin, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#030712]">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] top-[-10%] left-[-5%] rounded-full opacity-30 blur-3xl bg-orb-blue animate-orb [animation-duration:8s]" />
        <div className="absolute w-[400px] h-[400px] top-[60%] left-[70%] rounded-full opacity-30 blur-3xl bg-orb-purple animate-orb [animation-duration:10s] [animation-delay:2s]" />
        <div className="absolute w-[300px] h-[300px] top-[30%] left-[40%] rounded-full opacity-30 blur-3xl bg-orb-cyan animate-orb [animation-duration:12s] [animation-delay:4s]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-blue" />
      </div>

      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12">
        <div className={`max-w-lg transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative bg-gradient-blue-purple shadow-[0_8px_32px_rgba(59,130,246,0.35)]">
              <Activity className="w-7 h-7 text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10b981] border-2 border-[#030712] pulse-green" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">PacketViz</h1>
              <p className="text-xs text-[#4a5e80] tracking-widest uppercase">Security Dashboard</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-3">
            Monitor your network
            <br />
            <span className="text-gradient-blue">
              in real-time
            </span>
          </h2>
          <p className="text-[#4a5e80] text-base leading-relaxed mb-10">
            Capture, analyze, and visualize encrypted network packets with enterprise-grade security monitoring.
          </p>

          {/* Feature list */}
          <div className="space-y-6">
            <FeatureItem icon={Shield} title="Real-time Packet Capture" desc="Monitor TCP, UDP, HTTP, HTTPS, DNS, SSH traffic live" />
            <FeatureItem icon={Lock} title="Encryption Detection" desc="Identify TLS 1.2, TLS 1.3, and SSL 3.0 protocols" />
            <FeatureItem icon={Zap} title="Threat Analysis" desc="AI-powered anomaly detection and alerting" />
            <FeatureItem icon={Globe} title="Interactive Dashboard" desc="Beautiful charts and real-time data visualization" />
          </div>

          {/* Stats bar */}
          <div className="mt-12 flex items-center gap-8">
            {[{ n: '9+', l: 'Protocols' }, { n: '24/7', l: 'Monitoring' }, { n: 'AES', l: 'Encryption' }].map(({ n, l }) => (
              <div key={l}>
                <p className="text-xl font-extrabold text-white">{n}</p>
                <p className="text-[10px] text-[#4a5e80] uppercase tracking-wider">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Subtle vertical divider */}
        <div className="hidden lg:block absolute left-0 top-[15%] bottom-[15%] w-px bg-divider-v" />

        <div className={`w-full max-w-[420px] transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-blue-purple shadow-[0_8px_32px_rgba(59,130,246,0.35)]">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">PacketViz</h1>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome back</h2>
            <p className="text-sm text-[#4a5e80] mt-1">Enter your credentials to access the dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] text-[#7b8ba8] uppercase tracking-wider font-semibold mb-2.5">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-xl px-4 py-3.5 text-sm text-[#c5d0e0] focus:outline-none transition-all duration-300 placeholder-[#2a3f5f] input-field focus:input-focus-blue"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-[#7b8ba8] uppercase tracking-wider font-semibold mb-2.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl px-4 py-3.5 pr-12 text-sm text-[#c5d0e0] focus:outline-none transition-all duration-300 placeholder-[#2a3f5f] input-field focus:input-focus-blue"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4a5e80] hover:text-[#7b8ba8] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-40 hover:translate-y-[-1px] active:translate-y-0 cursor-pointer bg-gradient-login-btn shadow-[0_4px_25px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-divider-h" />
          </div>

          <p className="text-center text-sm text-[#4a5e80]">
            Don't have an account?{' '}
            <button onClick={onSwitchToRegister} className="text-[#60a5fa] hover:text-white font-semibold transition-colors">
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
