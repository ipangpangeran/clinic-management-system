import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, ShoppingBag, PackageCheck, MessageSquare, AlertCircle } from 'lucide-react';

export default function DashboardOverview({ setActiveTab }) {
  const [patients, setPatients] = useState([]);
  const [products, setProducts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [pRes, prodRes, rRes] = await Promise.all([
        axios.get('/api/pasien'),
        axios.get('/api/stok'),
        axios.get('/api/reminders')
      ]);
      setPatients(pRes.data);
      setProducts(prodRes.data);
      setReminders(rRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const trialCount = patients.filter(p => p.tipe_pasien === 'TRIAL').length;
  const regulerCount = patients.filter(p => p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL').length;
  const lowStockCount = products.filter(p => p.sisa_stok <= p.minimum_stok).length;
  const pendingRemindersList = reminders.filter(r => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Title & Welcome Banner */}
      <div className="bg-gradient-to-r from-[#7d5141] to-[#996958] rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold tracking-tight">Selamat Datang di DEFLOW Aesthetic Clinic</h1>
          <p className="text-amber-100 text-sm max-w-xl">
            Sistem manajemen internal terintegrasi untuk pendaftaran pasien, kasir POS, insentif komisi 5 lini, logistik stok, dan pengingat WhatsApp.
          </p>
        </div>
        <div className="hidden md:flex gap-3">
          <button
            onClick={() => setActiveTab('patients')}
            className="px-4 py-2.5 bg-white text-[#7d5141] font-semibold text-xs rounded-xl shadow-xs hover:bg-[#fff8f0] transition-all cursor-pointer"
          >
            + Intake Pasien Baru
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className="px-4 py-2.5 bg-[#514440] hover:bg-[#333029] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Buka Kasir POS
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#83746f] uppercase tracking-wider">Total Pasien</p>
            <h3 className="text-2xl font-bold text-[#1e1b15] font-serif">{patients.length}</h3>
            <div className="text-[11px] text-[#514440]">
              <span className="text-amber-700 font-semibold">{trialCount} Trial</span> • <span className="text-emerald-700 font-semibold">{regulerCount} Member</span>
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
        {/* Pasien Terdaftar Terbaru */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e5ded4] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Pasien Terdaftar Terbaru</h3>
            <button
              onClick={() => setActiveTab('patients')}
              className="text-xs font-semibold text-[#7d5141] hover:underline cursor-pointer"
            >
              Lihat Semua Pasien →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf3e8] text-[#514440] font-semibold border-b border-[#e5ded4]">
                <tr>
                  <th className="py-2.5 px-3">Nama Pasien</th>
                  <th className="py-2.5 px-3">No. HP</th>
                  <th className="py-2.5 px-3">Status Tipe</th>
                  <th className="py-2.5 px-3">Poin Pasien</th>
                  <th className="py-2.5 px-3">Tanggal Terdaftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded4]">
                {patients.slice(0, 5).map(p => (
                  <tr key={p.id} className="hover:bg-[#fff8f0]">
                    <td className="py-3 px-3 font-semibold text-[#1e1b15]">{p.nama_lengkap}</td>
                    <td className="py-3 px-3 text-[#514440]">{p.no_hp}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.tipe_pasien === 'TRIAL' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.tipe_pasien}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#7d5141]">+{p.total_poin} Poin</td>
                    <td className="py-3 px-3 text-[#83746f]">{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reminders Control Upcoming (Synced PENDING list) */}
        <div className="bg-white rounded-2xl border border-[#e5ded4] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
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
      </div>
    </div>
  );
}
