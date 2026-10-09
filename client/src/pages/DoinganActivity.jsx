import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import {
  Sparkles, User, FileCheck, DollarSign, Award, Plus, Trash2, CheckCircle2, ShieldAlert,
  Smartphone, Calendar, Filter, Printer, Clock, CheckSquare, RefreshCw, UserCheck, UserPlus,
  FileText, Search, FileSpreadsheet, Package, Phone, CheckCircle, AlertCircle
} from 'lucide-react';

export default function DoinganActivity() {
  const { user } = useContext(AuthContext);
  // Main tabs: 'BTC', 'NURSE', 'MARKETING', 'LIVE_STATUS'
  const [activeMainTab, setActiveMainTab] = useState('BTC');

  // Staff and quick data states
  const [staffList, setStaffList] = useState([]);
  const [treatments, setTreatments] = useState([]);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Only Date Filters (as requested: "Masing-masing punya filter hanya utk filter tanggal saja")
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [loadingRecap, setLoadingRecap] = useState(false);

  // Separated Commission Data
  const [btcData, setBtcData] = useState([]);
  const [nurseData, setNurseData] = useState([]);
  const [marketingData, setMarketingData] = useState([]);

  // Quick Treatment Modal State
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [namaTindakan, setNamaTindakan] = useState('');
  const [kategoriPetugas, setKategoriPetugas] = useState('BEAUTICIAN');
  const [tarifTindakanMedis, setTarifTindakanMedis] = useState(150000);
  const [tarifKonsulDokter, setTarifKonsulDokter] = useState(50000);
  const [komisiFixTherapist, setKomisiFixTherapist] = useState(17000);
  const [nominalNurseTindakan, setNominalNurseTindakan] = useState(15000);
  const [submittingTreatment, setSubmittingTreatment] = useState(false);

  const canManageTreatments = user?.role === 'Super Admin' || user?.role === 'Admin System' || user?.role === 'Admin Klinik';

  useEffect(() => {
    fetchStaffAvailability();
    fetchTreatments();
    const interval = setInterval(() => {
      fetchStaffAvailability();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeMainTab !== 'LIVE_STATUS') {
      fetchDataForTab(activeMainTab);
    }
  }, [activeMainTab]);

  const fetchTreatments = async () => {
    try {
      const res = await axios.get('/api/tindakan');
      setTreatments(res.data || []);
    } catch (err) {
      console.error('Error fetching treatments', err);
    }
  };

  const fetchStaffAvailability = async () => {
    try {
      const res = await axios.get('/api/staff-availability');
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Error fetching staff availability', err);
    }
  };

  const fetchDataForTab = async (targetTab = activeMainTab) => {
    setLoadingRecap(true);
    try {
      if (targetTab === 'BTC') {
        const res = await axios.get(`/api/doingan/recap?start_date=${startDate}&end_date=${endDate}&lini=BEAUTICIAN`);
        setBtcData(res.data.data || []);
      } else if (targetTab === 'NURSE') {
        const res = await axios.get(`/api/doingan/recap?start_date=${startDate}&end_date=${endDate}&lini=NURSE`);
        setNurseData(res.data.data || []);
      } else if (targetTab === 'MARKETING') {
        const res = await axios.get(`/api/marketing/recap-detail?start_date=${startDate}&end_date=${endDate}`);
        setMarketingData(res.data || []);
      }
    } catch (err) {
      console.error(`Error fetching data for ${targetTab}`, err);
    } finally {
      setLoadingRecap(false);
    }
  };

  const handleSaveQuickTreatment = async (e) => {
    e.preventDefault();
    if (!namaTindakan.trim()) {
      alert('Nama jenis tindakan wajib diisi');
      return;
    }
    setSubmittingTreatment(true);
    try {
      await axios.post('/api/tindakan', {
        nama_tindakan: namaTindakan,
        kategori_petugas: kategoriPetugas,
        tarif_tindakan_medis: Number(tarifTindakanMedis) || 0,
        tarif_konsul_dokter: Number(tarifKonsulDokter) || 0,
        komisi_fix_therapist: Number(komisiFixTherapist) || 0,
        nominal_nurse_tindakan: Number(nominalNurseTindakan) || 0
      });
      fetchTreatments();
      setShowTreatmentModal(false);
      setNamaTindakan('');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan jenis tindakan baru');
    } finally {
      setSubmittingTreatment(false);
    }
  };

  const handleDeleteDoingan = async (id, targetTab) => {
    if (!window.confirm('Hapus catatan doingan ini?')) return;
    try {
      await axios.delete(`/api/doingan/${id}`);
      fetchDataForTab(targetTab);
    } catch (err) {
      alert('Gagal menghapus doingan');
    }
  };

  // EXPORT EXCEL BEAUTICIAN (BTC)
  const handleExportExcelBTC = () => {
    if (btcData.length === 0) {
      alert('Belum ada data komisi Beautician (BTC) pada periode tanggal ini untuk di-export.');
      return;
    }
    const rows = [
      ["DEFLOW AESTHETIC CLINIC", "", "", "", `LAPORAN DATA KOMISI BEAUTICIAN (BTC)`],
      ["", "", "", "", `Periode: ${startDate} s/d ${endDate}`],
      [],
      [
        "No",
        "Waktu Mulai",
        "Waktu Selesai",
        "Nama Pasien",
        "Tipe Pasien",
        "Petugas BTC",
        "Detail Treatment / Facial",
        "Status Pengerjaan",
        "Pendapatan Komisi BTC (Rp)"
      ]
    ];

    btcData.forEach((item, index) => {
      rows.push([
        index + 1,
        item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-',
        item.completed_at ? new Date(item.completed_at).toLocaleString('id-ID') : '-',
        item.pasien_nama || '-',
        item.tipe_pasien || '-',
        item.petugas_nama || '-',
        item.nama_tindakan || '-',
        item.status_pengerjaan === 'COMPLETED' ? 'SELESAI' : item.status_pengerjaan === 'CANCELLED' ? 'DIBATALKAN' : 'IN PROGRESS',
        item.komisi || 0
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Komisi Beautician");
    XLSX.writeFile(workbook, `Laporan_Komisi_BTC_Deflow_${startDate}_sd_${endDate}.xlsx`);
  };

  // EXPORT EXCEL NURSE
  const handleExportExcelNurse = () => {
    if (nurseData.length === 0) {
      alert('Belum ada data komisi Nurse pada periode tanggal ini untuk di-export.');
      return;
    }
    const rows = [
      ["DEFLOW AESTHETIC CLINIC", "", "", "", `LAPORAN DATA KOMISI NURSE & MEDIS`],
      ["", "", "", "", `Periode: ${startDate} s/d ${endDate}`],
      [],
      [
        "No",
        "Waktu Mulai",
        "Waktu Selesai",
        "Nama Pasien",
        "Tipe Pasien",
        "Petugas Nurse / Medis",
        "Detail Tindakan Medis",
        "Status Layanan",
        "Pendapatan Komisi Nurse (Rp)"
      ]
    ];

    nurseData.forEach((item, index) => {
      rows.push([
        index + 1,
        item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-',
        item.completed_at ? new Date(item.completed_at).toLocaleString('id-ID') : '-',
        item.pasien_nama || '-',
        item.tipe_pasien || '-',
        item.petugas_nama || '-',
        item.nama_tindakan || '-',
        item.status_pengerjaan === 'COMPLETED' ? 'SELESAI' : item.status_pengerjaan === 'CANCELLED' ? 'DIBATALKAN' : 'IN PROGRESS',
        item.komisi || 0
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Komisi Nurse");
    XLSX.writeFile(workbook, `Laporan_Komisi_Nurse_Deflow_${startDate}_sd_${endDate}.xlsx`);
  };

  // EXPORT EXCEL MARKETING
  const handleExportExcelMarketing = () => {
    if (marketingData.length === 0) {
      alert('Belum ada data komisi Marketing pada periode tanggal ini untuk di-export.');
      return;
    }
    const rows = [
      ["DEFLOW AESTHETIC CLINIC", "", "", "", `LAPORAN DATA KOMISI TIM MARKETING`],
      ["", "", "", "", `Periode: ${startDate} s/d ${endDate}`],
      [],
      [
        "No",
        "Waktu Transaksi",
        "Nama Petugas Marketing",
        "Nama Pasien",
        "No HP Pasien",
        "Tipe Pasien",
        "Jenis Komisi",
        "Detail Paket / Tindakan",
        "Pembayaran / Harga Paket Pasien (Rp)",
        "Status Kasir POS",
        "Pendapatan Komisi Marketing (Rp)"
      ]
    ];

    marketingData.forEach((item, index) => {
      rows.push([
        index + 1,
        item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-',
        item.marketing_nama || '-',
        item.pasien_nama || '-',
        item.pasien_hp || '-',
        item.tipe_pasien || '-',
        item.jenis_komisi === 'PEMBELIAN_PAKET' ? 'Pembelian Paket Member' : 'Akuisisi Pasien Trial',
        item.detail_transaksi || '-',
        item.nominal_pembayaran || 0,
        item.is_billed ? 'Lunas di Kasir POS' : 'Menunggu Pembayaran POS',
        item.komisi || 0
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Komisi Marketing");
    XLSX.writeFile(workbook, `Laporan_Komisi_Marketing_Deflow_${startDate}_sd_${endDate}.xlsx`);
  };

  const nonStaffRoles = ['Super Admin', 'Admin System', 'Admin Klinik', 'Admin FO', 'Manager', 'Marketing'];
  const beauticianList = staffList.filter(s => s.role === 'Beautician' || (s.lini_profesi === 'Beautician' && !nonStaffRoles.includes(s.role)));
  const nurseList = staffList.filter(s => (s.role === 'Nurse' || s.role === 'Dokter') || (s.lini_profesi === 'Nurse' && !nonStaffRoles.includes(s.role)));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Pengecekan Data Komisi & Doingan</h1>
          <p className="text-xs text-[#514440]">Pemisahan laporan komisi Beautician (BTC), Nurse, Marketing, serta monitoring live petugas.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageTreatments && (
            <button
              onClick={() => setShowTreatmentModal(true)}
              className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />Master Jenis Tindakan Medis
            </button>
          )}
          <div className="px-3.5 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#7d5141] flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            <span>Role: <strong>{user?.role}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation (Separated BTC, Nurse, Marketing, Live Status) */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
        <div className="flex overflow-x-auto gap-2 border-b border-[#e5ded4] pb-3 text-xs whitespace-nowrap">
          <button
            onClick={() => setActiveMainTab('BTC')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'BTC' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Komisi Beautician (BTC)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('NURSE')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'NURSE' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Komisi Nurse</span>
          </button>

          <button
            onClick={() => setActiveMainTab('MARKETING')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'MARKETING' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Komisi Marketing</span>
          </button>

          <button
            onClick={() => setActiveMainTab('LIVE_STATUS')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeMainTab === 'LIVE_STATUS' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Monitoring Status Live Petugas</span>
          </button>
        </div>

        {/* COMMISSION FILTER BAR: ONLY DATE FILTERS AS REQUESTED */}
        {activeMainTab !== 'LIVE_STATUS' && (
          <div className="bg-[#faf3e8] p-4 rounded-2xl border border-[#d6c2bd] flex flex-col md:flex-row md:items-end justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#514440] mb-1">Dari Tanggal *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#514440] mb-1">Sampai Tanggal *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchDataForTab(activeMainTab)}
                disabled={loadingRecap}
                className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                {loadingRecap ? 'Memuat Data...' : 'Check / Filter'}
              </button>
            </div>

            {/* Excel Export Buttons Per View */}
            <div>
              {activeMainTab === 'BTC' && (
                <button
                  onClick={handleExportExcelBTC}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Excel Komisi BTC
                </button>
              )}
              {activeMainTab === 'NURSE' && (
                <button
                  onClick={handleExportExcelNurse}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Excel Komisi Nurse
                </button>
              )}
              {activeMainTab === 'MARKETING' && (
                <button
                  onClick={handleExportExcelMarketing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Excel Komisi Marketing
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: KOMISI BEAUTICIAN (BTC) */}
        {activeMainTab === 'BTC' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5ded4] pb-2">
              <h3 className="font-serif font-bold text-base text-[#1e1b15] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7d5141]" />
                <span>Rincian Pendapatan Komisi Beautician (BTC)</span>
              </h3>
              <span className="text-xs text-[#83746f]">Menampilkan data tindakan facial/perawatan per pasien & waktu pengerjaan</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4">Waktu Pengerjaan</th>
                    <th className="py-3 px-4">Nama Pasien & Tipe</th>
                    <th className="py-3 px-4">Petugas Beautician</th>
                    <th className="py-3 px-4">Detail Treatment / Facial</th>
                    <th className="py-3 px-4">Status Layanan</th>
                    <th className="py-3 px-4 text-right">Pendapatan Komisi BTC</th>
                    {canManageTreatments && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {btcData.length === 0 ? (
                    <tr>
                      <td colSpan={canManageTreatments ? 8 : 7} className="text-center py-8 text-gray-400 italic">
                        Belum ada data pengerjaan komisi Beautician pada periode tanggal {startDate} s/d {endDate}.
                      </td>
                    </tr>
                  ) : (
                    btcData.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#fff8f0]">
                        <td className="py-3 px-3 text-center font-bold text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 text-[#83746f]">
                          <div>Mulai: {new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          {item.completed_at && (
                            <div className="text-[11px] text-gray-500">Selesai: {new Date(item.completed_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1e1b15]">{item.pasien_nama}</div>
                          <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold ${
                            item.tipe_pasien === 'MEMBER' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}>
                            {item.tipe_pasien || 'PASIEN'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#7d5141]">
                          {item.petugas_nama}
                          <div className="text-[10px] text-gray-500">{item.lini_profesi || item.role_petugas || 'Beautician'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#1e1b15]">{item.nama_tindakan}</span>
                          {item.notes && <div className="text-[10px] text-gray-500 italic mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status_pengerjaan === 'CANCELLED'
                              ? 'bg-gray-100 text-gray-700 border border-gray-300'
                              : item.status_pengerjaan === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {item.status_pengerjaan === 'CANCELLED' ? 'DIBATALKAN' : item.status_pengerjaan === 'COMPLETED' ? 'SELESAI' : 'IN PROGRESS'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#7d5141] text-sm">
                          Rp {(item.komisi || 0).toLocaleString('id-ID')}
                        </td>
                        {canManageTreatments && (
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteDoingan(item.id, 'BTC')}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                              title="Hapus catatan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: KOMISI NURSE */}
        {activeMainTab === 'NURSE' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5ded4] pb-2">
              <h3 className="font-serif font-bold text-base text-[#1e1b15] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#7d5141]" />
                <span>Rincian Pendapatan Komisi Nurse & Medis</span>
              </h3>
              <span className="text-xs text-[#83746f]">Menampilkan data tindakan medis per pasien & waktu pengerjaan</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4">Waktu Pengerjaan</th>
                    <th className="py-3 px-4">Nama Pasien & Tipe</th>
                    <th className="py-3 px-4">Petugas Nurse / Medis</th>
                    <th className="py-3 px-4">Detail Tindakan Medis</th>
                    <th className="py-3 px-4">Status Layanan</th>
                    <th className="py-3 px-4 text-right">Pendapatan Komisi Nurse</th>
                    {canManageTreatments && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {nurseData.length === 0 ? (
                    <tr>
                      <td colSpan={canManageTreatments ? 8 : 7} className="text-center py-8 text-gray-400 italic">
                        Belum ada data pengerjaan komisi Nurse pada periode tanggal {startDate} s/d {endDate}.
                      </td>
                    </tr>
                  ) : (
                    nurseData.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#fff8f0]">
                        <td className="py-3 px-3 text-center font-bold text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 text-[#83746f]">
                          <div>Mulai: {new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          {item.completed_at && (
                            <div className="text-[11px] text-gray-500">Selesai: {new Date(item.completed_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1e1b15]">{item.pasien_nama}</div>
                          <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold ${
                            item.tipe_pasien === 'MEMBER' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}>
                            {item.tipe_pasien || 'PASIEN'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#7d5141]">
                          {item.petugas_nama}
                          <div className="text-[10px] text-gray-500">{item.lini_profesi || item.role_petugas || 'Nurse'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#1e1b15]">{item.nama_tindakan}</span>
                          {item.notes && <div className="text-[10px] text-gray-500 italic mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status_pengerjaan === 'CANCELLED'
                              ? 'bg-gray-100 text-gray-700 border border-gray-300'
                              : item.status_pengerjaan === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {item.status_pengerjaan === 'CANCELLED' ? 'DIBATALKAN' : item.status_pengerjaan === 'COMPLETED' ? 'SELESAI' : 'IN PROGRESS'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#7d5141] text-sm">
                          Rp {(item.komisi || 0).toLocaleString('id-ID')}
                        </td>
                        {canManageTreatments && (
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteDoingan(item.id, 'NURSE')}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                              title="Hapus catatan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: KOMISI MARKETING (DENGAN DATA PEMBAYARAN PAKET PASIEN LENGKAP) */}
        {activeMainTab === 'MARKETING' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5ded4] pb-2">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b15] flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>Rincian Pendapatan Komisi Tim Marketing</span>
                </h3>
                <p className="text-xs text-[#83746f]">
                  Menampilkan komisi dari <strong>Pembelian Paket Pasien</strong> (termasuk nilai transaksi & status kasir) serta <strong>Akuisisi Pasien Trial</strong>.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4">Waktu Transaksi</th>
                    <th className="py-3 px-4">Petugas Marketing</th>
                    <th className="py-3 px-4">Nama Pasien & Kontak</th>
                    <th className="py-3 px-4">Jenis Komisi</th>
                    <th className="py-3 px-4">Detail Paket / Tindakan</th>
                    <th className="py-3 px-4 text-right">Pembayaran Paket Pasien (Rp)</th>
                    <th className="py-3 px-4 text-center">Status Kasir POS</th>
                    <th className="py-3 px-4 text-right">Komisi Marketing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {marketingData.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-gray-400 italic">
                        Belum ada data komisi marketing pada periode tanggal {startDate} s/d {endDate}.
                      </td>
                    </tr>
                  ) : (
                    marketingData.map((item, idx) => (
                      <tr key={item.id + '-' + idx} className="hover:bg-[#fff8f0]">
                        <td className="py-3 px-3 text-center font-bold text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 text-[#83746f]">
                          {item.created_at ? new Date(item.created_at).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1e1b15]">{item.marketing_nama}</div>
                          <div className="text-[10px] text-amber-800 font-semibold uppercase">{item.marketing_role || 'Marketing'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1e1b15]">{item.pasien_nama}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{item.pasien_hp || '-'}</span>
                          </div>
                          <span className={`inline-block px-1.5 py-0.2 mt-0.5 rounded text-[9px] font-bold ${
                            item.tipe_pasien === 'MEMBER' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}>
                            {item.tipe_pasien || 'PASIEN'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {item.jenis_komisi === 'PEMBELIAN_PAKET' ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit">
                              <Package className="w-3 h-3" /> Penjualan Paket Member
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit">
                              <Sparkles className="w-3 h-3" /> Akuisisi Pasien Trial
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1e1b15]">
                          {item.detail_transaksi}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.jenis_komisi === 'PEMBELIAN_PAKET' ? (
                            <span className="font-extrabold text-[#1e1b15] text-xs">
                              Rp {Number(item.nominal_pembayaran || 0).toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Trial (Included)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.is_billed ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Lunas di Kasir POS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Menunggu Kasir POS
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-700 text-sm">
                          Rp {Number(item.komisi || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MONITORING STATUS LIVE PETUGAS (BEAUTICIAN & NURSE) */}
        {activeMainTab === 'LIVE_STATUS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Live Availability & Status Ruangan Petugas</h3>
                <p className="text-xs text-[#83746f]">Menampilkan status terkini apakah petugas Beautician dan Nurse sedang melayani pasien atau sedang ready (kosong).</p>
              </div>
              <button
                type="button"
                onClick={fetchStaffAvailability}
                className="px-3 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#7d5141] font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Status Live
              </button>
            </div>

            {/* Grid 1: Beautician Staff */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-[#7d5141] uppercase tracking-wider flex items-center gap-1.5">
                <span>💆‍♀️ Petugas Beautician ({beauticianList.length} Staff)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {beauticianList.map(s => (
                  <div key={s.id} className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                    s.is_busy ? 'bg-red-50/70 border-red-200' : 'bg-emerald-50/70 border-emerald-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-sm text-[#1e1b15]">{s.full_name}</div>
                      {s.is_busy ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> SEDANG DILAYANI
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> READY (KOSONG)
                        </span>
                      )}
                    </div>
                    {s.is_busy && s.active_doingan && (
                      <div className="bg-white p-3 rounded-xl border border-red-100 text-[11px] text-[#514440] space-y-1">
                        <div>Pasien: <strong className="text-[#1e1b15]">{s.active_doingan.pasien_nama}</strong> ({s.active_doingan.tipe_pasien})</div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-3 h-3 text-red-600" />
                          <span>Mulai: {new Date(s.active_doingan.started_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid 2: Nurse & Doctor Staff */}
            <div className="space-y-3 pt-2 border-t border-[#e5ded4]">
              <h4 className="font-bold text-xs text-[#7d5141] uppercase tracking-wider flex items-center gap-1.5">
                <span>🩺 Petugas Nurse & Dokter ({nurseList.length} Staff)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nurseList.map(s => (
                  <div key={s.id} className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                    s.is_busy ? 'bg-red-50/70 border-red-200' : 'bg-emerald-50/70 border-emerald-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-sm text-[#1e1b15]">{s.full_name}</div>
                      {s.is_busy ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> SEDANG DILAYANI
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> READY (KOSONG)
                        </span>
                      )}
                    </div>
                    {s.is_busy && s.active_doingan && (
                      <div className="bg-white p-3 rounded-xl border border-red-100 text-[11px] text-[#514440] space-y-1">
                        <div>Pasien: <strong className="text-[#1e1b15]">{s.active_doingan.pasien_nama}</strong> ({s.active_doingan.tipe_pasien})</div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-3 h-3 text-red-600" />
                          <span>Mulai: {new Date(s.active_doingan.started_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ADD TREATMENT MODAL */}
      {showTreatmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4]">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Tambah Master Jenis Tindakan Medis</h3>
              <button onClick={() => setShowTreatmentModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
            </div>

            <form onSubmit={handleSaveQuickTreatment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#514440] font-semibold mb-1">Nama Jenis Tindakan Medis / Perawatan *</label>
                <input
                  type="text"
                  value={namaTindakan}
                  onChange={(e) => setNamaTindakan(e.target.value)}
                  placeholder="misal: Laser Whitening, Injection Botox, Premium Facial..."
                  required
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>

              <div>
                <label className="block text-[#514440] font-semibold mb-1">Kategori Lini Petugas *</label>
                <select
                  value={kategoriPetugas}
                  onChange={(e) => setKategoriPetugas(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                >
                  <option value="BEAUTICIAN">Beautician (Facial & Perawatan)</option>
                  <option value="NURSE">Nurse (Tindakan Medis Perawat)</option>
                  <option value="DOKTER">Dokter (Tindakan & Konsultasi Medis)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Tarif Tindakan Medis (Rp)</label>
                  <input
                    type="number"
                    value={tarifTindakanMedis}
                    onChange={(e) => setTarifTindakanMedis(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Tarif Konsul Dokter (Rp)</label>
                  <input
                    type="number"
                    value={tarifKonsulDokter}
                    onChange={(e) => setTarifKonsulDokter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Fix Komisi Therapist/BTC (Rp)</label>
                  <input
                    type="number"
                    value={komisiFixTherapist}
                    onChange={(e) => setKomisiFixTherapist(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Fix Komisi Nurse (Rp)</label>
                  <input
                    type="number"
                    value={nominalNurseTindakan}
                    onChange={(e) => setNominalNurseTindakan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#e5ded4]">
                <button
                  type="button"
                  onClick={() => setShowTreatmentModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingTreatment}
                  className="px-5 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {submittingTreatment ? 'Menyimpan...' : 'Tambah Jenis Tindakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
