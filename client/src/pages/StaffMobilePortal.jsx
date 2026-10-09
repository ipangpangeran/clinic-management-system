import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Sparkles, User, CheckCircle2, Clock, AlertCircle, History, RefreshCw, FileText, CheckSquare, Square, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';

export default function StaffMobilePortal() {
  const { user } = useContext(AuthContext);
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [timeFilter, setTimeFilter] = useState('today'); // 'today' | 'month'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const isNurse = (user?.role === 'Nurse' || user?.lini_profesi === 'Nurse' || (user?.role || '').toLowerCase().includes('nurse') || (user?.lini_profesi || '').toLowerCase().includes('nurse'));

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
    const isTrial = activeSession.tipe_pasien === 'TRIAL' || activeSession.status_doingan === 'Trial';

    if (!isTrial && selectedTreatments.length === 0) {
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

      setMsg(`✓ ${res.data.message} Est. Komisi: Rp ${res.data.komisi?.toLocaleString('id-ID')}`);
      setSelectedTreatments([]);
      setNotes('');
      fetchSessionData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses konfirmasi selesai tindakan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTreatment = async () => {
    if (!activeSession) return;
    setCancelling(true);
    setMsg('');
    setErrorMsg('');
    try {
      const res = await axios.post(`/api/doingan/${activeSession.id}/cancel`, {
        reason: cancelReason || 'Dokter tidak merekomendasikan tindakan / Pasien minta pulang'
      });
      setMsg(`✓ ${res.data.message}`);
      setShowCancelModal(false);
      setCancelReason('');
      setActiveSession(null);
      fetchSessionData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal membatalkan tindakan');
    } finally {
      setCancelling(false);
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

  const filteredHistory = history.filter(item => {
    if (!item.completed_at) return false;
    const date = new Date(item.completed_at);
    const now = new Date();
    if (timeFilter === 'today') {
      return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    } else {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }
  });

  const totalKomisi = filteredHistory.reduce((sum, item) => sum + (Number(item.komisi) || 0), 0);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (filter) => {
    setTimeFilter(filter);
    setCurrentPage(1);
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
              {user?.full_name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-serif font-bold text-base leading-tight">{user?.full_name}</h2>
              <span className="text-[11px] text-amber-200 font-medium">{user?.role}</span>
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
          <span className="text-xs text-gray-300">Status:</span>
          {activeSession ? (
            <span className="px-3 py-1 bg-red-500/20 text-red-200 border border-red-400/40 rounded-full text-xs font-extrabold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              SEDANG MENANGANI PASIEN
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 rounded-full text-xs font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              AVAILABLE
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
                <strong className="text-[#1e1b15]">{new Date(activeSession.started_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">Kategori Service:</span>
                <strong className="text-[#7d5141]">{activeSession.kategori_layanan}</strong>
              </div>
            </div>
          </div>

          {/* CHECKLIST DETAIL TREATMENT FORM */}
          <form onSubmit={handleCompleteTreatment} className="space-y-4 pt-1">
            {(activeSession.tipe_pasien === 'TRIAL' || activeSession.status_doingan === 'Trial') ? (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-1.5 text-xs text-amber-900 shadow-2xs">
                <div className="font-bold text-sm flex items-center gap-1.5 text-amber-800">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>Pasien Treatment Trial</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90">
                  Untuk pasien Trial, Anda tidak perlu memilih rincian tindakan.
                </p>
              </div>
            ) : (
              <div>
                {/* Guidance for Nurse */}
                {isNurse && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 space-y-1 mb-2.5">
                    <div className="font-bold flex items-center gap-1.5 text-blue-800">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Panduan Konsultasi Dokter (Nurse):</span>
                    </div>
                    <p className="text-blue-900/90 leading-relaxed text-[10.5px]">
                      Jika dokter merekomendasikan tindakan lain, Anda dapat langsung <strong>beralih (switch)</strong> memilih tindakan di bawah. Jika dokter tidak merekomendasikan dan pasien minta pulang, gunakan tombol <strong>Batalkan Tindakan</strong> agar tidak ditagih di kasir/POS.
                    </p>
                  </div>
                )}

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
                        className={`w-full text-left p-3 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${isSelected
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
            )}

            {/* <div>
              <label className="block text-xs font-semibold text-[#514440] mb-1">Catatan Pengerjaan (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan kondisi kulit pasien / respon treatment..."
                rows="2"
                className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
              />
            </div> */}

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={submitting || cancelling}
                className="w-full py-3 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-400 text-white font-bold text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? 'Memproses Konfirmasi...' : 'SELESAIKAN TINDAKAN'}
              </button>

              {/* Cancel Button only for Nurse */}
              {isNurse && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  disabled={submitting || cancelling}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Batalkan Tindakan (Pasien Pulang)</span>
                </button>
              )}
            </div>
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

      {/* RIWAYAT PENGERJAAN */}
      <div className="bg-white rounded-3xl border border-[#e5ded4] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#e5ded4] pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#7d5141]" />
            <h3 className="font-serif font-bold text-sm text-[#1e1b15]">
              Riwayat Tindakan ( {filteredHistory.length} )
            </h3>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center bg-[#faf3e8] p-1 rounded-xl border border-[#d6c2bd] text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handleFilterChange('today')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${timeFilter === 'today'
                ? 'bg-[#7d5141] text-white shadow-xs'
                : 'text-[#83746f] hover:text-[#1e1b15]'
                }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('month')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${timeFilter === 'month'
                ? 'bg-[#7d5141] text-white shadow-xs'
                : 'text-[#83746f] hover:text-[#1e1b15]'
                }`}
            >
              Bulan Ini
            </button>
          </div>
        </div>

        {/* Total Komisi Summary */}
        <div className="bg-[#faf3e8]/80 border border-[#e5ded4] p-3 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-[#514440] font-semibold">
            Total Est. Komisi ({timeFilter === 'today' ? 'Hari Ini' : 'Bulan Ini'}):
          </span>
          <span className="font-mono font-bold text-emerald-700 text-sm">
            Rp {totalKomisi.toLocaleString('id-ID')}
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-6">
            Belum ada pengerjaan yang diselesaikan ({timeFilter === 'today' ? 'hari ini' : 'bulan ini'}).
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedHistory.map(item => (
                <div key={item.id} className="p-3 bg-[#faf3e8]/60 border border-[#e5ded4] rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold text-[#1e1b15]">
                    <span>{item.pasien_nama}</span>
                    <span className="text-emerald-700 font-mono text-[11px]">Rp {item.komisi?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-[11px] text-[#7d5141] font-semibold">{item.nama_tindakan}</div>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                    <span>Status: {item.status_doingan}</span>
                    <span>Selesai: {item.completed_at ? new Date(item.completed_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-[#e5ded4] text-xs">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] disabled:opacity-40 disabled:cursor-not-allowed border border-[#d6c2bd] text-[#7d5141] font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <span className="text-[11px] font-medium text-[#514440]">
                  {currentPage} dari {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] disabled:opacity-40 disabled:cursor-not-allowed border border-[#d6c2bd] text-[#7d5141] font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* CANCEL MODAL FOR NURSE */}
      {showCancelModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4]">
            <div className="flex items-center gap-2.5 text-red-700 border-b border-red-100 pb-3">
              <div className="w-9 h-9 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-[#1e1b15]">Batalkan Tindakan Pasien?</h3>
                <p className="text-[11px] text-gray-500">Pasien: {activeSession.pasien_nama}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11px] text-amber-900 leading-relaxed space-y-1">
              <p className="font-bold">⚠️ Perhatian Sesi Nurse:</p>
              <p>
                Jika dokter tidak merekomendasikan tindakan yang diminta dan pasien memutuskan pulang:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800 text-[10.5px]">
                <li>Sesi tindakan akan dibatalkan.</li>
                <li><strong>Pasien TIDAK AKAN masuk tagihan kasir / POS.</strong></li>
                <li>Status Anda otomatis kembali <strong>Available</strong>.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#514440] mb-1">
                Catatan Dokter / Alasan Pulang (Opsional):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Misal: Dokter tidak merekomendasikan tindakan / Pasien minta pulang dulu..."
                rows="2"
                className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#e5ded4]">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleCancelTreatment}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {cancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
