import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { KeyRound, User, AlertCircle, AlertTriangle, WifiOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      console.error('Login request error:', err);
      if (!err.response) {
        // Network error / server down / connection refused
        setError({
          type: 'SERVER_OFFLINE',
          title: 'Tidak Dapat Terhubung ke Server Backend',
          message: 'Server backend DEFLOW sedang tidak aktif atau tidak dapat dijangkau (Connection Refused / Offline). Pastikan service backend (node / PM2) sudah berjalan.'
        });
      } else if (err.response.status === 502 || err.response.status === 503 || err.response.status === 504) {
        // Nginx Bad Gateway / Gateway Timeout in production
        setError({
          type: 'SERVER_DOWN',
          title: `Server Sedang Gangguan (HTTP ${err.response.status})`,
          message: 'Layanan server backend (Node.js/PM2) sedang mati atau mengalami restart. Silakan hubungi Administrator sistem.'
        });
      } else if (err.response.status >= 500) {
        // Internal Server Error
        setError({
          type: 'SERVER_ERROR',
          title: 'Kesalahan Sistem Server (Error 500)',
          message: err.response.data?.message || 'Terjadi kesalahan sistem internal pada server backend. Silakan periksa log server.'
        });
      } else if (err.response.status === 401 || err.response.status === 400) {
        // Username / password validation error
        setError({
          type: 'AUTH_FAILED',
          title: 'Login Gagal',
          message: err.response.data?.message || 'Username atau password salah. Silakan periksa kembali input Anda.'
        });
      } else {
        setError({
          type: 'UNKNOWN',
          title: `Gagal Memproses Login (${err.response.status})`,
          message: err.response.data?.message || 'Terjadi kendala saat verifikasi akun. Silakan coba beberapa saat lagi.'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#e5ded4] p-8 space-y-6">
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <img
              src="/logo/DEFLOW_LOGO_TAGLINE_CKLT.png"
              alt="DEFLOW Aesthetic Clinic"
              className="h-[calc(var(--spacing)*30)] object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo/DEFLOW_LOGO_TAGLINE.png';
              }}
            />
          </div>
          <p className="text-xs font-semibold text-[#7d5141] uppercase tracking-wider">Clinic Management System</p>
        </div>

        {error && (
          <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border shadow-2xs animate-in fade-in ${
            typeof error === 'object' && (error.type === 'SERVER_OFFLINE' || error.type === 'SERVER_DOWN' || error.type === 'SERVER_ERROR')
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {typeof error === 'object' && (error.type === 'SERVER_OFFLINE' || error.type === 'SERVER_DOWN') ? (
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : typeof error === 'object' && error.type === 'SERVER_ERROR' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              {typeof error === 'object' && error.title && (
                <div className="font-bold text-xs mb-0.5">{error.title}</div>
              )}
              <div className="leading-relaxed">
                {typeof error === 'object' ? error.message : error}
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#514440] uppercase tracking-wider mb-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#83746f]">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-[#1e1b15] focus:outline-none focus:border-[#7d5141] transition-all"
                placeholder="Input username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#514440] uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#83746f]">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-[#1e1b15] focus:outline-none focus:border-[#7d5141] transition-all"
                placeholder="Input password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
          >
            {submitting ? 'Memproses...' : 'Login'}
          </button>
        </form>

        {/* Demo Quick Login Helper */}
        <div className="pt-2 border-t border-[#e5ded4] space-y-2">
          <p className="text-[11px] font-bold text-[#7d5141] text-center uppercase tracking-wider">
            DEV ONLY - Demo Akun Fast Login:
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => { setUsername('superadmin'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#1e1b15] font-bold rounded-lg text-left truncate cursor-pointer"
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => { setUsername('adminklinik'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#1e1b15] font-bold rounded-lg text-left truncate cursor-pointer"
            >
              🏥 Admin Klinik
            </button>
            <button
              type="button"
              onClick={() => { setUsername('manager'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#1e1b15] font-bold rounded-lg text-left truncate cursor-pointer"
            >
              💼 Manager
            </button>
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#1e1b15] font-bold rounded-lg text-left truncate cursor-pointer"
            >
              📋 Admin FO
            </button>
            <button
              type="button"
              onClick={() => { setUsername('riska.yulia'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 font-extrabold rounded-lg text-left truncate cursor-pointer"
            >
              🩺 Nurse Riska
            </button>
            <button
              type="button"
              onClick={() => { setUsername('indah.khairun'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold rounded-lg text-left truncate cursor-pointer"
            >
              💆‍♀️ BTC Indah
            </button>
            <button
              type="button"
              onClick={() => { setUsername('henni.mariani'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold rounded-lg text-left truncate cursor-pointer"
            >
              💆‍♀️ BTC Henni
            </button>
            <button
              type="button"
              onClick={() => { setUsername('anggun.aprilia'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold rounded-lg text-left truncate cursor-pointer"
            >
              💆‍♀️ BTC Anggun
            </button>
            <button
              type="button"
              onClick={() => { setUsername('btc-training'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold rounded-lg text-left truncate cursor-pointer"
            >
              💆‍♀️ BTC Trainee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
