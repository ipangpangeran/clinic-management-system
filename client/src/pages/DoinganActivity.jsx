import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import StaffMobilePortal from './StaffMobilePortal';
import { 
  Sparkles, User, FileCheck, DollarSign, Award, Plus, Trash2, CheckCircle2, ShieldAlert,
  Smartphone, Calendar, Filter, Printer, Clock, CheckSquare, RefreshCw, UserCheck
} from 'lucide-react';

export default function DoinganActivity() {
  const { user } = useContext(AuthContext);
  const [activeMainTab, setActiveMainTab] = useState('ASSIGNMENT'); // 'ASSIGNMENT', 'STAFF_PORTAL', 'RECAP'

  // Data States
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Assignment Form State (Admin FO Intake)
  const [assignPasienId, setAssignPasienId] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Facial (Beautician)'); // 'Facial (Beautician)' vs 'Tindakan Medis (Nurse)'
  const [selectedPetugasId, setSelectedPetugasId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Filtered Recap State (Admin Dashboard)
  const [recapData, setRecapData] = useState([]);
  const [recapSummary, setRecapSummary] = useState({ total_count: 0, completed_count: 0, total_komisi: 0 });
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPetugasId, setFilterPetugasId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loadingRecap, setLoadingRecap] = useState(false);

  // Messages
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
  }, [serviceCategory]);

  useEffect(() => {
    if (activeMainTab === 'RECAP') {
      fetchRecapData();
    }
  }, [activeMainTab, startDate, endDate, filterPetugasId, filterCategory, filterStatus]);

  const fetchInitialData = async () => {
    try {
      const [pasRes, tndRes] = await Promise.all([
        axios.get('/api/pasien'),
        axios.get('/api/tindakan')
      ]);
      setPatients(pasRes.data || []);
      setTreatments(tndRes.data || []);
      if (pasRes.data.length > 0) setAssignPasienId(pasRes.data[0].id);
    } catch (err) {
      console.error('Error fetching initial doingan data', err);
    }
  };

  const fetchStaffAvailability = async () => {
    try {
      const lini = serviceCategory.includes('Nurse') ? 'Nurse' : 'Beautician';
      const res = await axios.get(`/api/staff-availability?lini=${lini}`);
      setStaffList(res.data || []);
      
      // Auto select first available staff if any
      const available = res.data.find(s => !s.is_busy);
      if (available) setSelectedPetugasId(available.id);
      else if (res.data.length > 0) setSelectedPetugasId(res.data[0].id);
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

      const res = await axios.get(`/api/doingan/recap?${queryParams.toString()}`);
      setRecapData(res.data.data || []);
      setRecapSummary(res.data.summary || { total_count: 0, completed_count: 0, total_komisi: 0 });
    } catch (err) {
      console.error('Error fetching recap data', err);
    } finally {
      setLoadingRecap(false);
    }
  };

  const handleAssignPatient = async (e) => {
    e.preventDefault();
    setAssigning(true);
    setMsg('');
    setErrorMsg('');

    if (!assignPasienId || !selectedPetugasId) {
      setErrorMsg('Pilih nama pasien dan petugas yang akan di-assign.');
      setAssigning(false);
      return;
    }

    try {
      const res = await axios.post('/api/doingan/assign', {
        pasien_id: assignPasienId,
        petugas_id: selectedPetugasId,
        kategori_layanan: serviceCategory,
        notes: assignNotes
      });

      setMsg(`✓ ${res.data.message}`);
      setAssignNotes('');
      fetchStaffAvailability();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal meng-assign pasien ke petugas');
    } finally {
      setAssigning(false);
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Digital Alur Pasien & Doingan Perawatan</h1>
          <p className="text-xs text-[#514440]">Digitalisasi pendaftaran pasien FO, assign petugas Beautician/Nurse live status, dan rekapan laporan komisi.</p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => setActiveMainTab('ASSIGNMENT')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'ASSIGNMENT' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Pendaftaran & Assign Petugas (Admin FO)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('STAFF_PORTAL')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === 'STAFF_PORTAL' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Portal Mobile Petugas (Beautician & Nurse)</span>
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

        {msg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{msg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: PENDAFTARAN & ASSIGNMENT PASIEN (ADMIN FO) */}
        {activeMainTab === 'ASSIGNMENT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#faf3e8]/40 p-5 rounded-2xl border border-[#d6c2bd] space-y-4">
              <div className="flex justify-between items-center border-b border-[#d6c2bd] pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#7d5141]" />
                  <h3 className="font-serif font-bold text-base text-[#1e1b15]">Form Intake Pasien Datang</h3>
                </div>
                <span className="text-[10px] font-bold text-[#7d5141] bg-white px-2.5 py-1 rounded-full border border-[#d6c2bd]">
                  Admin FO Flow
                </span>
              </div>

              <form onSubmit={handleAssignPatient} className="space-y-4">
                {/* 1. Pilih Pasien Datang */}
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Pilih Nama Pasien Datang *</label>
                  <select
                    value={assignPasienId}
                    onChange={(e) => setAssignPasienId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#1e1b15]"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nama_lengkap} ({p.tipe_pasien === 'MEMBER' ? 'MEMBER' : 'TRIAL'}) - {p.no_hp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Pilih Kebutuhan / Layanan Pasien */}
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Kebutuhan Layanan Pasien *</label>
                  <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setServiceCategory('Facial (Beautician)')}
                      className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer border ${
                        serviceCategory === 'Facial (Beautician)'
                          ? 'bg-[#7d5141] text-white border-[#7d5141] shadow-xs'
                          : 'bg-white text-[#514440] border-[#d6c2bd] hover:bg-[#faf3e8]'
                      }`}
                    >
                      💆‍♀️ Facial / Perawatan (Beautician)
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceCategory('Tindakan Medis (Nurse)')}
                      className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer border ${
                        serviceCategory === 'Tindakan Medis (Nurse)'
                          ? 'bg-[#7d5141] text-white border-[#7d5141] shadow-xs'
                          : 'bg-white text-[#514440] border-[#d6c2bd] hover:bg-[#faf3e8]'
                      }`}
                    >
                      🩺 Tindakan Dokter (Nurse)
                    </button>
                  </div>
                </div>

                {/* 3. Assign Petugas (Dropdown Filtered by Profession & Status) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-[#514440]">
                      Pilih Petugas {serviceCategory.includes('Nurse') ? 'Nurse' : 'Beautician'} Bertugas *
                    </label>
                    <button
                      type="button"
                      onClick={fetchStaffAvailability}
                      className="text-[10px] text-[#7d5141] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh Status
                    </button>
                  </div>

                  <select
                    value={selectedPetugasId}
                    onChange={(e) => setSelectedPetugasId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#1e1b15]"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id} disabled={s.is_busy}>
                        {s.full_name} ({s.lini_profesi || s.role}) - {s.is_busy ? `🔴 SEDANG MENANGANI (${s.active_doingan?.pasien_nama})` : '🟢 SENGANG (KOSONG)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Catatan Pendaftaran FO (Optional)</label>
                  <textarea
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    placeholder="misal: Pasien minta facial ruangan atas nomor 3..."
                    rows="2"
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={assigning}
                  className="w-full py-3 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {assigning ? 'Meng-assign Pasien...' : 'ASSIGN PASIEN KE PETUGAS'}
                </button>
              </form>
            </div>

            {/* Availability Monitor Column */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">
                  Status Live Petugas ({serviceCategory.includes('Nurse') ? 'Nurse' : 'Beautician'})
                </h3>
                <span className="text-xs text-gray-500 font-semibold">{staffList.length} Petugas Available</span>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {staffList.map(s => (
                  <div key={s.id} className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                    s.is_busy 
                      ? 'bg-red-50/70 border-red-200' 
                      : 'bg-emerald-50/70 border-emerald-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-sm text-[#1e1b15]">{s.full_name}</div>
                      {s.is_busy ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> SEDANG DILAYANI
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> SENGANG / KOSONG
                        </span>
                      )}
                    </div>

                    {s.is_busy && s.active_doingan && (
                      <div className="bg-white p-3 rounded-xl border border-red-100 text-[11px] text-[#514440] space-y-1">
                        <div>Pasien: <strong className="text-[#1e1b15]">{s.active_doingan.pasien_nama}</strong> ({s.active_doingan.tipe_pasien})</div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="w-3 h-3 text-red-600" />
                          <span>Mulai jam: {new Date(s.active_doingan.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PORTAL MOBILE PETUGAS */}
        {activeMainTab === 'STAFF_PORTAL' && (
          <div className="py-2">
            <StaffMobilePortal />
          </div>
        )}

        {/* TAB 3: DASHBOARD REKAPITULASI & FILTER KOMISI (ADMIN SIDE) */}
        {activeMainTab === 'RECAP' && (
          <div className="space-y-5">
            {/* Filter Controls */}
            <div className="bg-[#faf3e8] p-4 rounded-2xl border border-[#d6c2bd] space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#7d5141] uppercase tracking-wider">
                <Filter className="w-4 h-4" />
                <span>Filter Laporan Rekapitulasi Doingan & Komisi Petugas</span>
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
                  <label className="block text-[11px] font-semibold text-[#514440] mb-1">Filter Nama Petugas</label>
                  <select
                    value={filterPetugasId}
                    onChange={(e) => setFilterPetugasId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-semibold text-[#1e1b15]"
                  >
                    <option value="">-- Semua Petugas --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.lini_profesi || s.role})</option>
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
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Tabel Rekapitulasi Detail Activities & Komisi</h3>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Printer className="w-4 h-4" /> Cetak / Export Rekapan
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
                            <div>Mulai: {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-[10px] text-gray-400">
                              {item.completed_at ? `Selesai: ${new Date(item.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#1e1b15]">
                            {item.pasien_nama}
                            <div className="text-[10px] font-normal text-gray-500">{item.tipe_pasien}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#1e1b15]">{item.petugas_nama}</div>
                            <div className="text-[10px] font-semibold text-[#7d5141] uppercase">{item.lini_profesi || item.role_petugas}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#514440]">
                            {item.nama_tindakan}
                            {item.notes && <div className="text-[10px] text-gray-400 italic">Notes: {item.notes}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status_pengerjaan === 'COMPLETED' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                            }`}>
                              {item.status_pengerjaan === 'COMPLETED' ? '✓ SELESAI' : '⏳ IN PROGRESS'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#7d5141] text-sm">
                            Rp {(item.komisi || 0).toLocaleString('id-ID')}
                          </td>
                          {canManageTreatments && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleDeleteDoingan(item.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* QUICK ADD TREATMENT MODAL FOR SUPER ADMIN & ADMIN KLINIK */}
      {showTreatmentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Form Tambah Jenis Tindakan Baru</h3>
              <button onClick={() => setShowTreatmentModal(false)} className="text-gray-400 font-bold text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSaveQuickTreatment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#514440] mb-1">Nama Jenis Tindakan / Treatment *</label>
                <input
                  type="text"
                  value={namaTindakan}
                  onChange={(e) => setNamaTindakan(e.target.value)}
                  required
                  placeholder="misal: HIFU Full Face Lift & Firming"
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#514440] mb-1">Kategori Petugas *</label>
                <select
                  value={kategoriPetugas}
                  onChange={(e) => setKategoriPetugas(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl font-bold text-[#7d5141]"
                >
                  <option value="BEAUTICIAN">BEAUTICIAN (Facial & Skin Care)</option>
                  <option value="NURSE">NURSE (Tindakan Dokter & Medis)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#514440] mb-1">Tarif Tindakan Medis (Rp) *</label>
                  <input
                    type="number"
                    value={tarifTindakanMedis}
                    onChange={(e) => setTarifTindakanMedis(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl font-bold text-[#7d5141]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#514440] mb-1">Tarif Konsul Dokter (Rp)</label>
                  <input
                    type="number"
                    value={tarifKonsulDokter}
                    onChange={(e) => setTarifKonsulDokter(e.target.value)}
                    className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl space-y-3">
                <div className="font-bold text-[#7d5141] uppercase tracking-wider text-[11px]">Skema Komisi & Insentif Staff (Per Action)</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#514440] mb-1">Fix Komisi Beautician (Rp)</label>
                    <input
                      type="number"
                      value={komisiFixTherapist}
                      onChange={(e) => setKomisiFixTherapist(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-semibold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#514440] mb-1">Fix Komisi Nurse (Rp)</label>
                    <input
                      type="number"
                      value={nominalNurseTindakan}
                      onChange={(e) => setNominalNurseTindakan(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-semibold text-blue-800"
                    />
                  </div>
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
