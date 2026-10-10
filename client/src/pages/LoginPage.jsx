import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { KeyRound, User } from 'lucide-react';

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal. Periksa username & password.');
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span className="font-medium">{error}</span>
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
              onClick={() => { setUsername('rahma'); setPassword('admin1234'); }}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-extrabold rounded-lg text-left truncate cursor-pointer"
            >
              💆‍♀️ BTC Rahma
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
