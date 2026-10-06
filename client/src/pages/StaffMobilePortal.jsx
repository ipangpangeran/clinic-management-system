import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Sparkles, User, CheckCircle2, Clock, AlertCircle, History, RefreshCw, FileText, CheckSquare, Square } from 'lucide-react';

export default function StaffMobilePortal() {
  const { user } = useContext(AuthContext);
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSessionData(true);

    // Auto live polling every 3 seconds for immediate assignment update
    const pollInterval = setInterval(() => {
      fetchSessionData(false);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  const fetchSessionData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [sessRes, tndRes] = await Promise.all([
        axios.get('/api/doingan/staff/active'),
        axios.get('/api/tindakan')
      ]);

      const newActive = sessRes.data.active_doingan;

      // Show alert message if a new session was just assigned to staff
      setActiveSession(prev => {
        if (!prev && newActive) {
          setMsg(`🔔 Pasien baru "${newActive.pasien_nama}" telah di-assign ke Anda!`);
        }
        return newActive;
      });

      setHistory(sessRes.data.history || []);

      // Filter treatments based on staff profession / category (BEAUTICIAN vs NURSE)
      const userLini = (user?.lini_profesi || user?.role || 'BEAUTICIAN').toUpperCase();
      const filtered = tndRes.data.filter(t => {
        if (userLini.includes('NURSE') || userLini.includes('DOKTER')) {
          return t.kategori_petugas === 'NURSE' || !t.kategori_petugas;
        }
        return t.kategori_petugas === 'BEAUTICIAN' || !t.kategori_petugas;
      });
      setTreatments(filtered.length > 0 ? filtered : tndRes.data);
    } catch (err) {
      console.error('Error fetching staff session data', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const toggleTreatmentSelect = (treatmentId) => {
    if (selectedTreatments.includes(treatmentId)) {
      setSelectedTreatments(selectedTreatments.filter(id => id !== treatmentId));
    } else {
      setSelectedTreatments([...selectedTreatments, treatmentId]);
    }
  };

  const handleCompleteTreatment = async (e) => {
    e.preventDefault();
    if (!activeSession) return;
    if (selectedTreatments.length === 0) {
      setErrorMsg('Pilih minimal 1 detail tindakan yang telah Anda kerjakan pada pasien.');
      return;
    }

    setSubmitting(true);
    setMsg('');
    setErrorMsg('');

    try {
      const res = await axios.post(`/api/doingan/${activeSession.id}/complete`, {
        tindakan_ids: selectedTreatments,
        notes
      });

      setMsg(`✓ ${res.data.message} Est. Komisi: Rp ${res.data.komisi.toLocaleString('id-ID')}`);
      setSelectedTreatments([]);
      setNotes('');
      fetchSessionData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses konfirmasi selesai tindakan');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDuration = (startTime) => {
    if (!startTime) return '0 menit';
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = Math.max(0, now - start);
    const mins = Math.floor(diffMs / (1000 * 60));
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs} jam ${mins % 60} mnt`;
    return `${mins} menit`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#7d5141] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-[#7d5141]">Memuat Portal Staff Mobile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5 pb-10">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#2a241e] to-[#4a3b32] text-white p-5 rounded-3xl shadow-lg border border-[#5c4a3e] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#7d5141] flex items-center justify-center font-bold text-sm text-white shadow-xs">
              {user?.full_name?.substring(0,2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-serif font-bold text-base leading-tight">{user?.full_name}</h2>
              <span className="text-[11px] text-amber-200 font-medium">{user?.role} ({user?.lini_profesi || 'Beautician'})</span>
            </div>
          </div>
          <button
            onClick={fetchSessionData}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Live Status Badge */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-300">Status Saat Ini:</span>
          {activeSession ? (
            <span className="px-3 py-1 bg-red-500/20 text-red-200 border border-red-400/40 rounded-full text-xs font-extrabold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              🔴 SEDANG MENANGANI PASIEN
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 rounded-full text-xs font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              🟢 KOSONG
            </span>
          )}
        </div>
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ACTIVE PASIEN CARD */}
      {activeSession ? (
        <div className="bg-white rounded-3xl border-2 border-[#7d5141] p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[#e5ded4] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7d5141]" />
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">Pasien Active Saat Ini</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#faf3e8] text-[#7d5141] border border-[#d6c2bd]">
              {activeSession.tipe_pasien === 'MEMBER' ? 'MEMBER DEFLOW' : 'PASIEN TRIAL'}
            </span>
          </div>

          <div className="bg-[#faf3e8] p-4 rounded-2xl border border-[#d6c2bd] space-y-2">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold">Nama Pasien</span>
              <h4 className="font-serif font-bold text-lg text-[#1e1b15]">{activeSession.pasien_nama}</h4>
              <p className="text-xs text-[#7d5141] font-mono">{activeSession.pasien_hp}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#d6c2bd]/60 text-[#514440]">
              <div>
                <span className="text-gray-500 block text-[10px]">Waktu Di-Assign:</span>
                <strong className="text-[#1e1b15]">{new Date(activeSession.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">Kategori Service:</span>
                <strong className="text-[#7d5141]">{activeSession.kategori_layanan}</strong>
              </div>
            </div>
          </div>

          {/* CHECKLIST DETAIL TREATMENT FORM */}
          <form onSubmit={handleCompleteTreatment} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-[#1e1b15] mb-1.5">
                Konfirmasi Detail Treatment Yang Dilakukan: *
              </label>
              <p className="text-[11px] text-[#514440] mb-2">
                Pilih atau centang jenis tindakan yang sudah Anda berikan kepada pasien {activeSession.pasien_nama}:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {treatments.map(t => {
                  const isSelected = selectedTreatments.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTreatmentSelect(t.id)}
                      className={`w-full text-left p-3 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-[#7d5141] text-white border-[#7d5141] shadow-xs' 
                          : 'bg-[#faf3e8]/60 text-[#1e1b15] border-[#d6c2bd] hover:bg-[#faf3e8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-white shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-[#83746f] shrink-0" />
                        )}
                        <span>{t.nama_tindakan}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-200' : 'text-[#7d5141]'}`}>
                        Rp {t.tarif_tindakan_medis.toLocaleString('id-ID')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#514440] mb-1">Catatan Pengerjaan (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan kondisi kulit pasien / respon treatment..."
                rows="2"
                className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Memproses Konfirmasi...' : 'SELESAIKAN TINDAKAN & BEBASKAN PETUGAS'}
            </button>
          </form>
        </div>
      ) : (
        /* SENGANG / WAITING STATE */
        <div className="bg-white rounded-3xl border border-[#e5ded4] p-8 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Anda Saat Ini Sedang Sengang</h3>
          <p className="text-xs text-[#514440] max-w-xs mx-auto">
            Tidak ada pasien yang sedang ditangani. Apabila Admin FO meng-assign pasien baru, nama pasien akan otomatis muncul di halaman ini.
          </p>
          <button
            onClick={fetchSessionData}
            className="px-4 py-2 bg-[#faf3e8] hover:bg-[#eee7dd] text-[#7d5141] border border-[#d6c2bd] font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cek Update Antrean</span>
          </button>
        </div>
      )}

      {/* RIWAYAT PENGERJAAN HARI INI */}
      <div className="bg-white rounded-3xl border border-[#e5ded4] p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-[#e5ded4] pb-2">
          <History className="w-4 h-4 text-[#7d5141]" />
          <h3 className="font-serif font-bold text-sm text-[#1e1b15]">Riwayat Pengerjaan Pasien Terakhir ({history.length})</h3>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">Belum ada pengerjaan yang diselesaikan hari ini.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map(item => (
              <div key={item.id} className="p-3 bg-[#faf3e8]/60 border border-[#e5ded4] rounded-2xl text-xs space-y-1">
                <div className="flex justify-between items-center font-bold text-[#1e1b15]">
                  <span>{item.pasien_nama}</span>
                  <span className="text-emerald-700 font-mono text-[11px]">Rp {item.komisi?.toLocaleString('id-ID')}</span>
                </div>
                <div className="text-[11px] text-[#7d5141] font-semibold">{item.nama_tindakan}</div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                  <span>Status: {item.status_doingan}</span>
                  <span>Selesai: {item.completed_at ? new Date(item.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
