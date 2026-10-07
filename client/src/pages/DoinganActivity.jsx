import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import { 
  Sparkles, User, FileCheck, DollarSign, Award, Plus, Trash2, CheckCircle2, ShieldAlert,
  Smartphone, Calendar, Filter, Printer, Clock, CheckSquare, RefreshCw, UserCheck, UserPlus, FileText, Search, FileSpreadsheet
} from 'lucide-react';

export default function DoinganActivity() {
  const { user } = useContext(AuthContext);
  const [activeMainTab, setActiveMainTab] = useState('LIVE_STATUS'); // 'LIVE_STATUS', 'RECAP'

  // Data States
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [marketingRecap, setMarketingRecap] = useState([]);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filtered Recap State (Admin Dashboard)
  const [recapData, setRecapData] = useState([]);
  const [recapSummary, setRecapSummary] = useState({ total_count: 0, completed_count: 0, total_komisi: 0 });
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [filterPetugasId, setFilterPetugasId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loadingRecap, setLoadingRecap] = useState(false);

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
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchStaffAvailability();
    const interval = setInterval(() => {
      fetchStaffAvailability();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeMainTab === 'RECAP') {
      fetchRecapData();
    }
  }, [activeMainTab]);

  const fetchInitialData = async () => {
    try {
      const [pasRes, tndRes, usrRes, mktRes] = await Promise.all([
        axios.get('/api/pasien'),
        axios.get('/api/tindakan'),
        axios.get('/api/users'),
        axios.get('/api/marketing/recap')
      ]);
      setPatients(pasRes.data || []);
      setTreatments(tndRes.data || []);
      setAllUsersList(usrRes.data || []);
      setMarketingRecap(mktRes.data || []);
    } catch (err) {
      console.error('Error fetching initial doingan data', err);
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

  const fetchRecapData = async () => {
    setLoadingRecap(true);
    try {
      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      if (filterPetugasId) queryParams.append('petugas_id', filterPetugasId);
      if (filterCategory) queryParams.append('kategori_layanan', filterCategory);
      if (filterStatus) queryParams.append('status_pengerjaan', filterStatus);

      const [recapRes, mktRes] = await Promise.all([
        axios.get(`/api/doingan/recap?${queryParams.toString()}`),
        axios.get('/api/marketing/recap')
      ]);
      setRecapData(recapRes.data.data || []);
      setRecapSummary(recapRes.data.summary || { total_count: 0, completed_count: 0, total_komisi: 0 });
      setMarketingRecap(mktRes.data || []);
    } catch (err) {
      console.error('Error fetching recap data', err);
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
      const tndRes = await axios.get('/api/tindakan');
      setTreatments(tndRes.data);
      setShowTreatmentModal(false);
      setNamaTindakan('');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan jenis tindakan baru');
    } finally {
      setSubmittingTreatment(false);
    }
  };

  const handleDeleteDoingan = async (id) => {
    if (!window.confirm('Hapus catatan doingan ini?')) return;
    try {
      await axios.delete(`/api/doingan/${id}`);
      fetchRecapData();
    } catch (err) {
      alert('Gagal menghapus doingan');
    }
  };

  const handleExportExcel = () => {
    if (recapData.length === 0 && marketingRecap.length === 0) {
      alert('Belum ada data rekapan pengerjaan pada periode tanggal ini untuk di-export.');
      return;
    }

    const monthNames = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", 
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];
    const d = new Date();
    const monthYearStr = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    const rows = [
      ["DEFLOW AESTHETIC CLINIC", "", "", "", `DATA LAPORAN DOINGAN & KOMISI ${monthYearStr}`],
      ["", "", "", "", `Periode Laporan: ${startDate} s/d ${endDate}`],
      [],
      ["--- DETAIL DOINGAN PETUGAS MEDIS & TERAPIS ---"],
      [
        "No",
        "Waktu Mulai",
        "Waktu Selesai",
        "Nama Pasien",
        "Tipe Pasien",
        "Petugas Bertugas",
        "Lini Profesi / Role",
        "Detail Treatment / Actions",
        "Status Layanan",
        "Nominal Komisi (Rp)"
      ]
    ];

    recapData.forEach((item, index) => {
      rows.push([
        index + 1,
        item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-',
        item.completed_at ? new Date(item.completed_at).toLocaleString('id-ID') : '-',
        item.pasien_nama || '-',
        item.tipe_pasien || '-',
        item.petugas_nama || '-',
        item.lini_profesi || item.role_petugas || '-',
        item.nama_tindakan || '-',
        item.status_pengerjaan === 'COMPLETED' ? 'SELESAI' : 'IN PROGRESS',
        item.komisi || 0
      ]);
    });

    rows.push([]);
    rows.push(["--- REKAPITULASI KOMISI MARKETING (TRIAL ACQUISITION & REFERRAL) ---"]);
    rows.push(["No", "Nama Marketing", "Role / Lini", "Total Pasien Trial Didapat", "Komisi Per Pasien (Rp)", "Total Komisi Marketing (Rp)"]);

    marketingRecap.forEach((mkt, idx) => {
      rows.push([
        idx + 1,
        mkt.marketing_nama || '-',
        mkt.marketing_role || 'Marketing',
        mkt.total_trial_count || 0,
        10000,
        mkt.total_komisi_marketing || 0
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Doingan & Marketing");
    XLSX.writeFile(workbook, `Rekap_Doingan_Marketing_Deflow_${startDate}_to_${endDate}.xlsx`);
  };

  const beauticianList = staffList.filter(s => s.role === 'Beautician' || s.lini_profesi === 'Beautician');
  const nurseList = staffList.filter(s => s.role === 'Nurse' || s.lini_profesi === 'Nurse' || s.role === 'Dokter');

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Digital Alur Pasien & Doingan Perawatan</h1>
          <p className="text-xs text-[#514440]">Monitoring status live petugas Beautician & Nurse, serta rekapan laporan komisi lengkap termasuk tim Marketing.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageTreatments && (
            <button
              onClick={() => setShowTreatmentModal(true)}
              className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> + Master Jenis Tindakan Medis
            </button>
          )}
          <div className="px-3.5 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#7d5141] flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            <span>Role: <strong>{user?.role}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
        <div className="flex overflow-x-auto gap-2 border-b border-[#e5ded4] pb-3 text-xs whitespace-nowrap">
          <button
            onClick={() => setActiveMainTab('LIVE_STATUS')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'LIVE_STATUS' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Monitoring Status Live Petugas (Beautician & Nurse)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('RECAP')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'RECAP' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Dashboard Rekapitulasi & Filter Komisi</span>
          </button>
        </div>

        {/* TAB 1: MONITORING STATUS LIVE PETUGAS (BEAUTICIAN & NURSE) */}
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

        {/* TAB 2: DASHBOARD REKAPITULASI & FILTER KOMISI (TERMASUK MARKETING) */}
        {activeMainTab === 'RECAP' && (
          <div className="space-y-5">
            {/* Filter Controls */}
            <div className="bg-[#faf3e8] p-4 rounded-2xl border border-[#d6c2bd] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[#7d5141] uppercase tracking-wider">
                  <Filter className="w-4 h-4" />
                  <span>Filter Laporan Rekapitulasi Doingan & Komisi Petugas (Beautician, Nurse, Marketing)</span>
                </div>
                <button
                  type="button"
                  onClick={fetchRecapData}
                  disabled={loadingRecap}
                  className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  {loadingRecap ? 'Memuat Data...' : '🔍 Tampilkan / Filter Data'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#514440] mb-1">Dari Tanggal *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#514440] mb-1">Sampai Tanggal *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#514440] mb-1">Filter Nama Petugas / Marketing</label>
                  <select
                    value={filterPetugasId}
                    onChange={(e) => setFilterPetugasId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-semibold text-[#1e1b15]"
                  >
                    <option value="">-- Semua Staff & Marketing --</option>
                    {allUsersList.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#514440] mb-1">Filter Kategori Service</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-semibold text-[#1e1b15]"
                  >
                    <option value="">-- Semua Kategori --</option>
                    <option value="Facial (Beautician)">Facial (Beautician)</option>
                    <option value="Tindakan Medis (Nurse)">Tindakan Medis (Nurse)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#514440] mb-1">Filter Status Pengerjaan</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-semibold text-[#1e1b15]"
                  >
                    <option value="">-- Semua Status --</option>
                    <option value="IN_PROGRESS">IN PROGRESS (DILAYANI)</option>
                    <option value="COMPLETED">COMPLETED (SELESAI)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Marketing Commission Recap Cards */}
            <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-amber-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>Rekapitulasi Komisi Referral Tim Marketing (Trial Acquisition Rp 10.000 / Pasien)</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {marketingRecap.map(mkt => (
                  <div key={mkt.marketing_id} className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-1 shadow-2xs">
                    <div className="font-bold text-xs text-[#1e1b15]">{mkt.marketing_nama}</div>
                    <div className="text-[11px] text-gray-500">Role: {mkt.marketing_role || 'Marketing'}</div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-100 text-xs font-semibold">
                      <span>Total Pasien Trial: <strong>{mkt.total_trial_count} Pasien</strong></span>
                      <span className="text-emerald-700 font-bold">Rp {(mkt.total_komisi_marketing || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-1">
                <span className="text-[11px] text-gray-500 font-semibold uppercase">Total Patient Sessions</span>
                <div className="text-xl font-serif font-bold text-[#1e1b15]">{recapSummary.total_count} Sesi</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-1">
                <span className="text-[11px] text-gray-500 font-semibold uppercase">Pengerjaan Selesai (Completed)</span>
                <div className="text-xl font-serif font-bold text-emerald-700">{recapSummary.completed_count} Pasien</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-1">
                <span className="text-[11px] text-gray-500 font-semibold uppercase">Total Accumulative Komisi</span>
                <div className="text-xl font-serif font-bold text-[#7d5141]">
                  Rp {recapSummary.total_komisi?.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Recap Table */}
            <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5ded4] pb-3">
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Tabel Rekapitulasi Detail Activities & Komisi Medis/Terapis</h3>
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Excel Rekapan
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                  <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                    <tr>
                      <th className="py-3 px-4">Waktu Assign / Selesai</th>
                      <th className="py-3 px-4">Nama Pasien</th>
                      <th className="py-3 px-4">Petugas & Lini Profesi</th>
                      <th className="py-3 px-4">Detail Treatment / Actions</th>
                      <th className="py-3 px-4">Status Layanan</th>
                      <th className="py-3 px-4">Nominal Komisi</th>
                      {canManageTreatments && <th className="py-3 px-4 text-center">Hapus</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5ded4]">
                    {recapData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-gray-400 italic">
                          Belum ada data rekapan pengerjaan pada periode tanggal ini.
                        </td>
                      </tr>
                    ) : (
                      recapData.map(item => (
                        <tr key={item.id} className="hover:bg-[#fff8f0]">
                          <td className="py-3 px-4 text-[#83746f]">
                            <div>Mulai: {new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            {item.completed_at && <div>Selesai: {new Date(item.completed_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#1e1b15]">
                            {item.pasien_nama} ({item.tipe_pasien})
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#7d5141]">
                            {item.petugas_nama}
                            <div className="text-[10px] font-semibold text-[#7d5141] uppercase">{item.lini_profesi || item.role_petugas}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#1e1b15]">{item.nama_tindakan}</span>
                            <div className="text-[10px] text-gray-500">{item.kategori_layanan}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status_pengerjaan === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                              {item.status_pengerjaan === 'COMPLETED' ? 'SELESAI' : 'IN PROGRESS'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#7d5141]">
                            Rp {(item.komisi || 0).toLocaleString('id-ID')}
                          </td>
                          {canManageTreatments && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleDeleteDoingan(item.id)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                                title="Hapus doingan"
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
