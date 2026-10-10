import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, ShoppingBag, PackageCheck, MessageSquare, AlertCircle, Clock, CheckCircle2, UserPlus, Search } from 'lucide-react';

export default function DashboardOverview({ setActiveTab, onOpenNewPatient, onOpenRepeatVisit }) {
  const [todayPatients, setTodayPatients] = useState([]);
  const [products, setProducts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [waReminderEnabled, setWaReminderEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [todayRes, prodRes, rRes, setRes] = await Promise.all([
        axios.get('/api/doingan/today'),
        axios.get('/api/stok'),
        axios.get('/api/reminders'),
        axios.get('/api/settings')
      ]);
      setTodayPatients(todayRes.data || []);
      setProducts(prodRes.data || []);
      setReminders(rRes.data || []);
      setWaReminderEnabled(setRes.data?.wa_reminder_enabled === '1');
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const inProgressCount = todayPatients.filter(p => p.status_pengerjaan === 'IN_PROGRESS').length;
  const completedCount = todayPatients.filter(p => p.status_pengerjaan === 'COMPLETED').length;
  const lowStockCount = products.filter(p => p.sisa_stok <= p.minimum_stok).length;
  const pendingRemindersList = reminders.filter(r => r.status === 'PENDING');

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Welcome Banner */}
      <div className="bg-gradient-to-r from-[#7d5141] to-[#996958] rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold tracking-tight">Selamat Datang di DEFLOW Aesthetic Clinic</h1>
          <p className="text-amber-100 text-sm max-w-xl">
            Sistem manajemen internal terintegrasi untuk pendaftaran pasien, kasir POS, insentif komisi, dan logistik stok.
          </p>
        </div>
        <div className="hidden md:flex gap-3">
          <button
            onClick={() => {
              if (onOpenRepeatVisit) {
                onOpenRepeatVisit();
              } else {
                setActiveTab('patients');
              }
            }}
            className="px-4 py-2.5 bg-white text-[#7d5141] font-semibold text-xs rounded-xl shadow-xs hover:bg-[#fff8f0] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Search className="w-4 h-4 text-[#7d5141]" />
            Cari Pasien Lama
          </button>
          <button
            onClick={() => {
              if (onOpenNewPatient) {
                onOpenNewPatient();
              } else {
                setActiveTab('patients');
              }
            }}
            className="px-4 py-2.5 bg-white text-[#7d5141] font-semibold text-xs rounded-xl shadow-xs hover:bg-[#fff8f0] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Pendaftaran Pasien
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className="px-4 py-2.5 bg-[#514440] hover:bg-[#333029] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            Kasir POS
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${waReminderEnabled ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#83746f] uppercase tracking-wider">Pasien Ditangani Hari Ini</p>
            <h3 className="text-2xl font-bold text-[#1e1b15] font-serif">{todayPatients.length} Pasien</h3>
            <div className="text-[11px] text-[#514440]">
              <span className="text-red-600 font-bold">{inProgressCount} Sedang Ditangani</span> • <span className="text-emerald-700 font-bold">{completedCount} Selesai</span>
            </div>
          </div>
          <div className="p-3 bg-[#faf3e8] border border-[#d6c2bd] text-[#7d5141] rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#83746f] uppercase tracking-wider">Katalog Produk & Stok</p>
            <h3 className="text-2xl font-bold text-[#1e1b15] font-serif">{products.length} Item</h3>
            <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {lowStockCount} Stok Menipis
            </div>
          </div>
          <div className="p-3 bg-[#faf3e8] border border-[#d6c2bd] text-[#7d5141] rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {waReminderEnabled && (
          <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#83746f] uppercase tracking-wider">Reminder Kontrol (H-1)</p>
              <h3 className="text-2xl font-bold text-[#1e1b15] font-serif">{pendingRemindersList.length} Pasien</h3>
              <div className="text-[11px] text-amber-700 font-semibold">
                {pendingRemindersList.length} Menunggu WA
              </div>
            </div>
            <div className="p-3 bg-[#faf3e8] border border-[#d6c2bd] text-[#7d5141] rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#83746f] uppercase tracking-wider">Performa Kasir POS</p>
            <h3 className="text-2xl font-bold text-[#1e1b15] font-serif">Aktif</h3>
            <div className="text-[11px] text-emerald-600 font-semibold">
              Kasir & Diskon PPN Ready
            </div>
          </div>
          <div className="p-3 bg-[#faf3e8] border border-[#d6c2bd] text-[#7d5141] rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pasien Ditangani Hari Ini Table */}
        <div className={`${waReminderEnabled ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-2xl border border-[#e5ded4] p-6 shadow-xs space-y-4`}>
          <div className="flex items-center justify-between border-b border-[#e5ded4] pb-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Daftar Pasien Ditangani Hari Ini</h3>
              <p className="text-xs text-[#83746f]">Menampilkan status pengerjaan, petugas, serta waktu mulai & selesai.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf3e8] text-[#514440] font-semibold border-b border-[#e5ded4] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Nama Pasien</th>
                  <th className="py-3 px-3">No. HP</th>
                  <th className="py-3 px-3">Tipe Pelanggan</th>
                  <th className="py-3 px-3">Waktu Ditangani</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Nama Petugas</th>
                  <th className="py-3 px-3">Waktu Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded4]">
                {todayPatients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-400 italic font-medium">
                      Belum ada data pasien yang sedang atau sudah ditangani hari ini.
                    </td>
                  </tr>
                ) : (
                  todayPatients.map(p => {
                    const isInProgress = p.status_pengerjaan === 'IN_PROGRESS';
                    return (
                      <tr key={p.doingan_id} className="hover:bg-[#fff8f0] transition-colors">
                        <td className="py-3 px-3 font-bold text-[#1e1b15]">{p.pasien_nama}</td>
                        <td className="py-3 px-3 text-[#514440]">{p.pasien_hp}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${p.tipe_pasien === 'TRIAL'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                            {p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler' ? 'MEMBER' : p.tipe_pasien}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#514440] font-medium">
                          {formatDateTime(p.started_at || p.created_at)}
                        </td>
                        <td className="py-3 px-3">
                          {isInProgress ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-300">
                              <Clock className="w-3 h-3 animate-spin" />
                              Sedang Ditangani
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Sudah Selesai
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#7d5141]">
                          {p.petugas_nama || '-'}
                          <div className="text-[10px] font-normal text-gray-400">{p.lini_profesi || p.petugas_role}</div>
                        </td>
                        <td className="py-3 px-3 text-[#514440] font-medium">
                          {isInProgress ? (
                            <span className="text-gray-400 italic">-</span>
                          ) : (
                            formatDateTime(p.completed_at)
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reminders Control Upcoming */}
        {waReminderEnabled && (
          <div className="bg-white rounded-2xl border border-[#e5ded4] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Jadwal Kontrol Besok</h3>
              <button
                onClick={() => setActiveTab('wa')}
                className="text-xs font-semibold text-[#7d5141] hover:underline cursor-pointer"
              >
                Gateway WA →
              </button>
            </div>

            <div className="space-y-3">
              {pendingRemindersList.length === 0 ? (
                <p className="text-xs text-[#83746f] italic text-center py-6">Tidak ada antrean reminder PENDING.</p>
              ) : (
                pendingRemindersList.slice(0, 4).map(r => (
                  <div key={r.id} className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-[#1e1b15]">
                      <span>{r.pasien_nama}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                        {r.tgl_kembali}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#514440] line-clamp-2">{r.message_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

