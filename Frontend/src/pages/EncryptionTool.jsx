import { useState } from 'react';
import { encryptPayload, decryptPayload } from '../services/api';
import { Lock, Unlock, ArrowRight, Copy, Check, KeyRound } from 'lucide-react';

function EncryptionTool() {
  const [mode, setMode] = useState('encrypt');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setOutput('');

    try {
      if (mode === 'encrypt') {
        const res = await encryptPayload(input);
        setOutput(res.data.encrypted);
      } else {
        const res = await decryptPayload(input);
        setOutput(res.data.decrypted);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Encryption Tool</h2>
        <p className="text-sm text-[#7b8ba8] mt-0.5">AES-256 encrypt & decrypt packet payloads</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('encrypt'); setInput(''); setOutput(''); setError(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            mode === 'encrypt'
              ? 'bg-gradient-start text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]'
              : 'bg-[#0b1628] text-[#4a5e80] border border-[#1e3058]/60'
          }`}
        >
          <Lock className="w-4 h-4" /> Encrypt
        </button>
        <button
          onClick={() => { setMode('decrypt'); setInput(''); setOutput(''); setError(''); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            mode === 'decrypt'
              ? 'bg-gradient-decrypt text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)]'
              : 'bg-[#0b1628] text-[#4a5e80] border border-[#1e3058]/60'
          }`}
        >
          <Unlock className="w-4 h-4" /> Decrypt
        </button>
      </div>

      {/* Input */}
      <div className="card-glow rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-3.5 h-3.5 text-[#4a5e80]" />
          <label className="text-[10px] text-[#4a5e80] uppercase tracking-wider font-semibold">
            {mode === 'encrypt' ? 'Plain Text Input' : 'Encrypted Text Input'}
          </label>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'encrypt' ? 'Enter text to encrypt...' : 'Paste encrypted text here...'}
          className="w-full bg-[#050a18] border border-[#1e3058]/60 rounded-xl p-4 text-sm text-[#c5d0e0] font-mono h-36 resize-none focus:outline-none focus:border-[#3b82f6]/50 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all placeholder-[#2a3f5f]"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className={`mt-4 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-white disabled:opacity-40 ${
            mode === 'encrypt'
              ? 'bg-gradient-start shadow-[0_4px_20px_rgba(16,185,129,0.25)]'
              : 'bg-gradient-decrypt shadow-[0_4px_20px_rgba(59,130,246,0.25)]'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Processing...
            </span>
          ) : (
            <>
              {mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#f43f5e]/[0.08] border border-[#f43f5e]/25 rounded-xl p-4 text-sm text-[#f43f5e] animate-fade-in">
          {error}
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="card-glow rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] text-[#4a5e80] uppercase tracking-wider font-semibold">
              {mode === 'encrypt' ? 'Encrypted Output' : 'Decrypted Output'}
            </label>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-[#4a5e80] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-[#1e3058]/30"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-[#050a18] border border-[#1e3058]/40 rounded-xl p-4 text-sm text-[#c5d0e0] font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}

export default EncryptionTool;
