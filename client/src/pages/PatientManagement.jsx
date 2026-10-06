import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Search, Edit, Trash2, Download, Package, Calendar, AlertTriangle, CheckCircle, ShieldAlert, FileSpreadsheet, UserCheck, Clock, RefreshCw, Sparkles, Stethoscope } from 'lucide-react';

export default function PatientManagement() {
  const { user, hasPermission } = useContext(AuthContext);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packages, setPackages] = useState([]);

  // Permissions check (Super Admin & Admin Klinik have full edit/delete/export access, or explicit ACL)
  const isSuperOrAdmin = user?.role === 'Super Admin' || user?.role === 'Admin System' || user?.role === 'Admin Klinik';
  const canEditPatient = isSuperOrAdmin || hasPermission('patient_management', 'can_update') || hasPermission('patient_intake', 'can_update');
  const canDeletePatient = isSuperOrAdmin || hasPermission('patient_management', 'can_delete');
  const canExportExcel = isSuperOrAdmin || hasPermission('patient_management', 'can_read');

  // Form State
  const [modePendaftaran, setModePendaftaran] = useState('NEW'); // 'NEW' or 'EXISTING'
  const [selectedExistingPatientId, setSelectedExistingPatientId] = useState('');
  const [formType, setFormType] = useState('TRIAL'); // 'TRIAL' or 'MEMBER'
  const [noKtp, setNoKtp] = useState('');
  const [noHp, setNoHp] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [alamat, setAlamat] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [riwayatAlergi, setRiwayatAlergi] = useState('');
  const [jenisKulit, setJenisKulit] = useState('');
  const [rekomendasiDokter, setRekomendasiDokter] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Live Staff Assignment State
  const [kebutuhanLayanan, setKebutuhanLayanan] = useState('Beautician'); // 'Beautician' or 'Nurse'
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Package Form State
  const [namaPaket, setNamaPaket] = useState('');
  const [totalKuota, setTotalKuota] = useState(5);
  const [hargaPaket, setHargaPaket] = useState(2500000);

  // Reminder Form State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [tglKembali, setTglKembali] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/pasien');
      setPatients(res.data);
    } catch (err) {
      console.error('Error fetching patients', err);
    }
  };

  const fetchStaffAvailability = async (lini) => {
    setLoadingStaff(true);
    try {
      const res = await axios.get(`/api/staff-availability?lini=${lini}`);
      setStaffList(res.data);
    } catch (err) {
      console.error('Error fetching staff availability', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleLayananChange = (lini) => {
    setKebutuhanLayanan(lini);
    setSelectedStaffId('');
    fetchStaffAvailability(lini);
  };

  const openNewPatientModal = () => {
    setEditMode(false);
    setSelectedPatient(null);
    setModePendaftaran('NEW');
    setSelectedExistingPatientId('');
    setFormType('TRIAL');
    setNoKtp('');
    setNoHp('');
    setNamaLengkap('');
    setAlamat('');
    setTglLahir('');
    setRiwayatAlergi('');
    setJenisKulit('');
    setRekomendasiDokter('');
    setKebutuhanLayanan('Beautician');
    setSelectedStaffId('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowModal(true);
    fetchStaffAvailability('Beautician');
  };

  const openIntakeForExisting = (p) => {
    setEditMode(false);
    setSelectedPatient(p);
    setModePendaftaran('EXISTING');
    setSelectedExistingPatientId(p.id);
    setFormType(p.tipe_pasien);
    setNamaLengkap(p.nama_lengkap);
    setNoHp(p.no_hp);
    setKebutuhanLayanan('Beautician');
    setSelectedStaffId('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowModal(true);
    fetchStaffAvailability('Beautician');
  };

  const openEditModal = (p) => {
    if (!canEditPatient) {
      alert('Akses Terbatas: Hanya Super Admin dan Admin Klinik yang berhak mengedit data pasien.');
      return;
    }
    setEditMode(true);
    setSelectedPatient(p);
    setModePendaftaran('NEW');
    setFormType(p.tipe_pasien);
    setNoKtp(p.no_ktp || '');
    setNoHp(p.no_hp || '');
    setNamaLengkap(p.nama_lengkap || '');
    setAlamat(p.alamat || '');
    setTglLahir(p.tgl_lahir || '');
    setRiwayatAlergi(p.riwayat_alergi || '');
    setJenisKulit(p.jenis_kulit || '');
    setRekomendasiDokter(p.rekomendasi_dokter || '');
    setKebutuhanLayanan('Beautician');
    setSelectedStaffId('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowModal(true);
    fetchStaffAvailability('Beautician');
  };

  const handleDeletePatient = async (patientId, patientName) => {
    if (!canDeletePatient) {
      alert('Akses Terbatas: Hanya Super Admin dan Admin Klinik yang berhak menghapus data pasien.');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus data pasien "${patientName}" secara permanen?\n\nSeluruh data riwayat transaksi, paket treatment, dan reminder terkait akan dibersihkan dari sistem.`)) {
      return;
    }

    try {
      await axios.delete(`/api/pasien/${patientId}`);
      alert(`Data pasien "${patientName}" berhasil dihapus dari sistem!`);
      fetchPatients();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data pasien');
    }
  };

  const handleExportExcel = () => {
    if (!canExportExcel) {
      alert('Akses Terbatas: Hanya Super Admin dan Admin Klinik yang berhak meng-export data pasien.');
      return;
    }

    if (filteredPatients.length === 0) {
      alert('Tidak ada data pasien untuk di-export.');
      return;
    }

    const exportData = filteredPatients.map((p, index) => ({
      'No': index + 1,
      'ID Pasien': p.id || '',
      'Nama Lengkap': p.nama_lengkap || '',
      'NIK / No. KTP': p.no_ktp || '-',
      'No. Handphone': p.no_hp || '',
      'Tipe Pasien': p.tipe_pasien || '',
      'Alamat': p.alamat || '-',
      'Tanggal Lahir': p.tgl_lahir || '-',
      'Riwayat Alergi': p.riwayat_alergi || 'Tidak ada',
      'Jenis Kulit': p.jenis_kulit || '-',
      'Rekomendasi Dokter': p.rekomendasi_dokter || '-',
      'Total Poin': p.total_poin || 0,
      'Tanggal Terdaftar': p.created_at ? new Date(p.created_at).toLocaleString('id-ID') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 35 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 12 },
      { wch: 22 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pasien');

    const fileName = `Data_Pasien_DEFLOW_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    let patientIdToAssign = null;
    let targetPatientName = namaLengkap;

    try {
      if (editMode && selectedPatient) {
        const payload = {
          no_ktp: noKtp || null,
          no_hp: noHp,
          nama_lengkap: namaLengkap,
          tipe_pasien: formType,
          alamat: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? alamat : null,
          tgl_lahir: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? tglLahir : null,
          riwayat_alergi: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? riwayatAlergi : null,
          jenis_kulit: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? jenisKulit : null,
          rekomendasi_dokter: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? rekomendasiDokter : null,
        };
        await axios.put(`/api/pasien/${selectedPatient.id}`, payload);
        patientIdToAssign = selectedPatient.id;
        setSuccessMessage('Data pasien berhasil diperbarui!');
      } else if (modePendaftaran === 'NEW') {
        if (!noHp || !namaLengkap) {
          setErrorMessage('Nama Lengkap dan No. Handphone wajib diisi');
          return;
        }
        const payload = {
          no_ktp: noKtp || null,
          no_hp: noHp,
          nama_lengkap: namaLengkap,
          tipe_pasien: formType,
          alamat: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? alamat : null,
          tgl_lahir: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? tglLahir : null,
          riwayat_alergi: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? riwayatAlergi : null,
          jenis_kulit: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? jenisKulit : null,
          rekomendasi_dokter: (formType === 'MEMBER' || formType === 'NON-TRIAL') ? rekomendasiDokter : null,
        };
        const res = await axios.post('/api/pasien', payload);
        patientIdToAssign = res.data.pasien?.id;
        targetPatientName = res.data.pasien?.nama_lengkap || namaLengkap;
        setSuccessMessage('Pasien baru berhasil didaftarkan!');
      } else if (modePendaftaran === 'EXISTING') {
        if (!selectedExistingPatientId) {
          setErrorMessage('Silakan pilih pasien terdaftar terlebih dahulu');
          return;
        }
        patientIdToAssign = selectedExistingPatientId;
        const found = patients.find(p => p.id === selectedExistingPatientId);
        if (found) targetPatientName = found.nama_lengkap;
      }

      // Live Assignment process if staff selected
      if (selectedStaffId && patientIdToAssign) {
        const selectedStaffObj = staffList.find(s => s.id === selectedStaffId);
        const katName = kebutuhanLayanan === 'Nurse' ? 'Tindakan Medis (Nurse)' : 'Facial (Beautician)';

        await axios.post('/api/doingan/assign', {
          pasien_id: patientIdToAssign,
          petugas_id: selectedStaffId,
          kategori_layanan: katName
        });

        setSuccessMessage(`Berhasil! Pasien ${targetPatientName} di-assign ke ${selectedStaffObj?.full_name || 'Petugas'}. Sesi otomatis IN_PROGRESS!`);
      }

      fetchPatients();
      setTimeout(() => {
        setShowModal(false);
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Terjadi kesalahan sistem';
      setErrorMessage(msg);
    }
  };

  const openPackageModal = async (p) => {
    setSelectedPatient(p);
    try {
      const res = await axios.get(`/api/pasien/${p.id}/paket`);
      setPackages(res.data);
      setShowPackageModal(true);
    } catch (err) {
      console.error('Error fetching patient packages', err);
    }
  };

  const handleAddPackage = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !namaPaket) return;

    try {
      await axios.post(`/api/pasien/${selectedPatient.id}/paket`, {
        nama_paket: namaPaket,
        total_kuota: Number(totalKuota),
        harga_paket: Number(hargaPaket)
      });
      const res = await axios.get(`/api/pasien/${selectedPatient.id}/paket`);
      setPackages(res.data);
      setNamaPaket('');
      alert('Paket treatment berhasil ditambahkan!');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan paket');
    }
  };

  const handleUsePackage = async (paketId) => {
    if (!window.confirm('Gunakan 1 kuota paket treatment ini sekarang?')) return;
    try {
      const res = await axios.post(`/api/pasien/paket/${paketId}/use`, { notes: 'Tindakan klinik' });
      alert(res.data.message);
      const updated = await axios.get(`/api/pasien/${selectedPatient.id}/paket`);
      setPackages(updated.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses paket');
    }
  };

  const openReminderModal = (p) => {
    setSelectedPatient(p);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setTglKembali(tomorrow);
    setShowReminderModal(true);
  };

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/reminders', {
        pasien_id: selectedPatient.id,
        tgl_kembali: tglKembali
      });
      alert('Jadwal pengingat kembali berhasil disimpan!');
      setShowReminderModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat reminder');
    }
  };

  const [dateFilter, setDateFilter] = useState('');

  const getLocalDateString = (dStr) => {
    const d = dStr ? new Date(dStr) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();

  const filteredPatients = patients.filter(p => {
    const matchSearch = p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
                        p.no_hp.includes(search) ||
                        (p.no_ktp && p.no_ktp.includes(search));
    const matchFilter = filterType === 'ALL' || p.tipe_pasien === filterType;
    let matchDate = true;
    if (dateFilter) {
      const pDate = p.created_at ? getLocalDateString(p.created_at) : '';
      matchDate = pDate === dateFilter;
    }
    return matchSearch && matchFilter && matchDate;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Pendaftaran Pasien & Live Assignment</h1>
          <p className="text-xs text-[#514440]">Menu Pendaftaran & Intake Pasien oleh Admin FO dengan fitur live assignment tim Beautician & Nurse realtime.</p>
        </div>
        <div className="flex items-center gap-2">
          {canExportExcel && (
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Export data pasien ke format Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          )}
          <button
            onClick={openNewPatientModal}
            className="px-4 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Pendaftaran & Live Intake</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#83746f]">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari NIK, No. HP, atau Nama..."
            className="w-full pl-9 pr-4 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
          />
        </div>

        {/* Date & Type Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto">
          {/* Quick Date Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-[#faf3e8] p-1 border border-[#d6c2bd] rounded-xl">
            <button
              type="button"
              onClick={() => setDateFilter(todayStr)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                dateFilter === todayStr ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Hari Ini (Today)</span>
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                dateFilter === '' ? 'bg-white text-[#7d5141] font-bold shadow-2xs' : 'text-[#514440] hover:bg-[#eee7dd]'
              }`}
            >
              Semua Tgl
            </button>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2 py-1 bg-white border border-[#d6c2bd] rounded-lg text-xs font-semibold text-[#1e1b15]"
            />
          </div>

          <span className="text-[#83746f] font-semibold ml-1">Tipe:</span>
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'ALL' ? 'bg-[#7d5141] text-white' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            Semua ({patients.length})
          </button>
          <button
            onClick={() => setFilterType('TRIAL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'TRIAL' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}
          >
            Trial ({patients.filter(p => p.tipe_pasien === 'TRIAL').length})
          </button>
          <button
            onClick={() => setFilterType('MEMBER')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'MEMBER' || filterType === 'NON-TRIAL' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}
          >
            Member ({patients.filter(p => p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL').length})
          </button>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-2xl border border-[#e5ded4] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase tracking-wider border-b border-[#e5ded4]">
              <tr>
                <th className="py-3 px-4">Tgl Terdaftar</th>
                <th className="py-3 px-4">Nama Pasien</th>
                <th className="py-3 px-4">Kontak (HP & NIK)</th>
                <th className="py-3 px-4">Tipe Pasien</th>
                <th className="py-3 px-4">Detail Medis (Member)</th>
                <th className="py-3 px-4">Poin</th>
                <th className="py-3 px-4 text-center">Aksi / Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ded4]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-[#83746f] italic">Tidak ada data pasien yang cocok dengan filter.</td>
                </tr>
              ) : (
                filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-[#fff8f0]">
                    <td className="py-3.5 px-4 text-[#83746f] text-[11px]">
                      <div className="font-bold text-[#1e1b15]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {p.created_at ? new Date(p.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1e1b15] text-sm">{p.nama_lengkap}</div>
                      <div className="text-[10px] text-[#83746f]">ID: {p.id}</div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-semibold text-[#1e1b15]">HP: {p.no_hp}</div>
                      <div className="text-[11px] text-[#83746f]">NIK: {p.no_ktp || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.tipe_pasien === 'TRIAL' 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}>
                        {p.tipe_pasien === 'NON-TRIAL' ? 'MEMBER' : p.tipe_pasien}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-[11px] text-[#514440]">
                      {p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' ? (
                        <div>
                          <div><strong>Alergi:</strong> {p.riwayat_alergi || 'Tidak ada'}</div>
                          <div><strong>Kulit:</strong> {p.jenis_kulit || '-'}</div>
                        </div>
                      ) : (
                        <span className="text-amber-700 italic">Form Trial (Minimalis)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#7d5141] text-sm">
                      +{p.total_poin} Poin
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => openIntakeForExisting(p)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-lg font-medium text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Live Intake & Assign Pasien ke Petugas"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Intake / Assign</span>
                        </button>

                        {canEditPatient && (
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#514440] rounded-lg font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Edit Profile Pasien"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#7d5141]" />
                            <span>Edit</span>
                          </button>
                        )}
                        {canDeletePatient && (
                          <button
                            onClick={() => handleDeletePatient(p.id, p.nama_lengkap)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Hapus Data Pasien"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Hapus</span>
                          </button>
                        )}
                        <button
                          onClick={() => openPackageModal(p)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Kelola Paket Treatment Pasien"
                        >
                          <Package className="w-3.5 h-3.5 text-amber-700" />
                          <span>Paket</span>
                        </button>
                        <button
                          onClick={() => openReminderModal(p)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-lg font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Set Reminder Kontrol Kembali"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-700" />
                          <span>Reminder</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INTAKE PENDAFTARAN PASIEN & LIVE STAFF ASSIGNMENT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15]">
                  {editMode ? 'Edit / Upgrade Profile Pasien' : 'Pendaftaran Pasien & Live Assignment (Admin FO)'}
                </h3>
                <p className="text-xs text-[#7d5141] font-semibold">Form registrasi & penugasan realtime ke Beautician / Nurse</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
            </div>

            {/* Error Message Warning */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message Notification */}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePatient} className="space-y-4">
              {!editMode && (
                <div className="p-1 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex gap-1">
                  <button
                    type="button"
                    onClick={() => setModePendaftaran('NEW')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      modePendaftaran === 'NEW' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'
                    }`}
                  >
                    + Pasien Baru (Registrasi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModePendaftaran('EXISTING')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      modePendaftaran === 'EXISTING' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'
                    }`}
                  >
                    👤 Pasien Terdaftar (Intake Langsung)
                  </button>
                </div>
              )}

              {/* SECTION 1: DATA PASIEN */}
              {!editMode && modePendaftaran === 'EXISTING' ? (
                <div className="space-y-2 p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl">
                  <label className="block text-xs font-bold text-amber-900">Pilih Pasien Terdaftar *</label>
                  <select
                    value={selectedExistingPatientId}
                    onChange={(e) => {
                      setSelectedExistingPatientId(e.target.value);
                      const p = patients.find(item => item.id === e.target.value);
                      if (p) setFormType(p.tipe_pasien);
                    }}
                    required
                    className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#7d5141]"
                  >
                    <option value="">-- Pilih Pasien Yang Datang --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nama_lengkap} - HP: {p.no_hp} ({p.tipe_pasien === 'NON-TRIAL' ? 'MEMBER' : p.tipe_pasien})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#514440] mb-1">Tipe Pasien Datang</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormType('TRIAL')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          formType === 'TRIAL' 
                            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs' 
                            : 'bg-[#faf3e8] border-[#d6c2bd] text-[#514440]'
                        }`}
                      >
                        Pasien Trial (Free)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormType('MEMBER')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          formType === 'MEMBER' || formType === 'NON-TRIAL'
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-xs' 
                            : 'bg-[#faf3e8] border-[#d6c2bd] text-[#514440]'
                        }`}
                      >
                        Pasien Member
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#514440] mb-1">Nama Lengkap Pasien *</label>
                    <input
                      type="text"
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                      required
                      placeholder="Misal: Maya Septha"
                      className="w-full px-3.5 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#514440] mb-1">No. Handphone (WA) *</label>
                      <input
                        type="text"
                        value={noHp}
                        onChange={(e) => setNoHp(e.target.value)}
                        required
                        placeholder="0812XXXXXXXX"
                        className="w-full px-3.5 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#514440] mb-1">NIK / No. KTP (Opsional)</label>
                      <input
                        type="text"
                        value={noKtp}
                        onChange={(e) => setNoKtp(e.target.value)}
                        placeholder="3171XXXXXXXXXXXX"
                        className="w-full px-3.5 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>
                  </div>

                  {(formType === 'MEMBER' || formType === 'NON-TRIAL') && (
                    <div className="space-y-3 border-t border-[#e5ded4] pt-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#514440] mb-1">Alamat Lengkap</label>
                        <textarea
                          value={alamat}
                          onChange={(e) => setAlamat(e.target.value)}
                          placeholder="Jl. Soekarno-Hatta No. 45, Pekanbaru"
                          className="w-full px-3.5 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                          rows="2"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#514440] mb-1">Tanggal Lahir</label>
                          <input
                            type="date"
                            value={tglLahir}
                            onChange={(e) => setTglLahir(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#514440] mb-1">Jenis Kulit Pasien</label>
                          <select
                            value={jenisKulit}
                            onChange={(e) => setJenisKulit(e.target.value)}
                            className="w-full px-3.5 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                          >
                            <option value="">-- Pilih Jenis Kulit --</option>
                            <option value="Normal">Normal</option>
                            <option value="Berminyak">Berminyak (Oily)</option>
                            <option value="Kering">Kering (Dry)</option>
                            <option value="Kombinasi / Sensitif">Kombinasi / Sensitif</option>
                            <option value="Acne Prone">Acne Prone (Berjerawat)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#514440] mb-1">Riwayat Alergi (Obat / Bahan Kosmetik)</label>
                        <input
                          type="text"
                          value={riwayatAlergi}
                          onChange={(e) => setRiwayatAlergi(e.target.value)}
                          placeholder="Misal: Alergi Seafood, Alergi Paraben, Alergi Cold"
                          className="w-full px-3.5 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#514440] mb-1">Catatan / Rekomendasi Dokter</label>
                        <input
                          type="text"
                          value={rekomendasiDokter}
                          onChange={(e) => setRekomendasiDokter(e.target.value)}
                          placeholder="Rekomendasi dokter penanggung jawab"
                          className="w-full px-3.5 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: KEBUTUHAN LAYANAN & LIVE STAFF ASSIGNMENT */}
              <div className="border-t border-[#e5ded4] pt-4 space-y-3 bg-[#fffbf7] p-3.5 rounded-xl border border-[#eedfd5]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e1b15]">
                    <Clock className="w-4 h-4 text-[#7d5141]" />
                    <span>Kebutuhan Layanan & Live Staff Assignment</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchStaffAvailability(kebutuhanLayanan)}
                    className="text-[11px] text-[#7d5141] hover:text-[#514440] font-semibold flex items-center gap-1 cursor-pointer"
                    title="Refresh live status petugas"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingStaff ? 'animate-spin' : ''}`} />
                    <span>Refresh Live Status</span>
                  </button>
                </div>

                {/* Pilih Kebutuhan Layanan */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#514440] mb-1.5">Pilih Kebutuhan Layanan Pasien:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLayananChange('Beautician')}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                        kebutuhanLayanan === 'Beautician'
                          ? 'bg-pink-50 border-pink-400 text-pink-950 font-bold shadow-xs'
                          : 'bg-white border-[#d6c2bd] text-[#514440] hover:bg-gray-50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-pink-600 shrink-0" />
                      <div>
                        <div>Facial / Perawatan</div>
                        <div className="text-[10px] font-normal text-pink-800">Tim Beautician</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLayananChange('Nurse')}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center gap-2 ${
                        kebutuhanLayanan === 'Nurse'
                          ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold shadow-xs'
                          : 'bg-white border-[#d6c2bd] text-[#514440] hover:bg-[#faf3e8]'
                      }`}
                    >
                      <Stethoscope className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div>Tindakan Medis</div>
                        <div className="text-[10px] font-normal text-blue-800">Tim Nurse</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Live Status Staff Dropdown */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#514440] mb-1">
                    Daftar Petugas ({kebutuhanLayanan === 'Beautician' ? 'Beautician' : 'Nurse'}) - Status Realtime:
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6c2bd] rounded-xl text-xs font-semibold text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  >
                    <option value="">-- (Opsional) Pilih Petugas Untuk Live Assignment --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id} disabled={s.is_busy}>
                        {s.is_busy 
                          ? `🔴 SEDANG MENANGANI (${s.active_doingan?.pasien_nama || 'Pasien'}) — ${s.full_name}` 
                          : `🟢 KOSONG — ${s.full_name}`
                        }
                      </option>
                    ))}
                  </select>

                  {selectedStaffId ? (
                    <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
                      <span>Sesi pengerjaan akan otomatis berstatus <strong>IN_PROGRESS</strong> setelah submit!</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-[10px] text-[#83746f] italic">
                      * Pilih petugas berpita 🟢 KOSONG untuk langsung memulai penugasan.
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {editMode 
                    ? 'Simpan Perubahan Pasien' 
                    : selectedStaffId 
                      ? 'Submit Intake & Start Live Session (IN_PROGRESS)' 
                      : 'Simpan Pendaftaran Pasien'
                  }
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PAKET TREATMENT PASIEN */}
      {showPackageModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Paket Treatment Pasien</h3>
                <p className="text-xs text-[#7d5141] font-semibold">{selectedPatient.nama_lengkap}</p>
              </div>
              <button onClick={() => setShowPackageModal(false)} className="text-gray-400 font-bold text-lg cursor-pointer">×</button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {packages.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-400 italic">Belum ada paket treatment aktif.</div>
              ) : (
                packages.map(pkg => (
                  <div key={pkg.id} className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#1e1b15]">{pkg.nama_paket}</div>
                      <div className="text-[10px] text-gray-500">
                        Sisa Kuota: <span className="font-bold text-[#7d5141]">{pkg.sisa_kuota}</span> dari {pkg.total_kuota}x
                      </div>
                    </div>
                    <button
                      onClick={() => handleUsePackage(pkg.id)}
                      disabled={pkg.sisa_kuota <= 0}
                      className={`px-3 py-1 rounded-lg font-bold text-[10px] cursor-pointer transition-all ${
                        pkg.sisa_kuota > 0 
                          ? 'bg-[#7d5141] text-white hover:bg-[#653d2e]' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {pkg.sisa_kuota > 0 ? 'Gunakan 1x' : 'Habis'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddPackage} className="border-t border-[#e5ded4] pt-3 space-y-2">
              <div className="text-xs font-bold text-[#1e1b15]">+ Tambah Paket Treatment Baru</div>
              <input
                type="text"
                value={namaPaket}
                onChange={(e) => setNamaPaket(e.target.value)}
                placeholder="Nama Paket (Misal: Paket Glowing Deluxe 5x)"
                required
                className="w-full px-3 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={totalKuota}
                  onChange={(e) => setTotalKuota(e.target.value)}
                  placeholder="Total Kuota (x)"
                  required
                  className="w-full px-3 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
                <input
                  type="number"
                  value={hargaPaket}
                  onChange={(e) => setHargaPaket(e.target.value)}
                  placeholder="Harga Paket (Rp)"
                  className="w-full px-3 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl cursor-pointer">
                Simpan Paket Pasien
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REMINDER JADWAL KONTROL */}
      {showReminderModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">Set Reminder Kontrol WA</h3>
              <button onClick={() => setShowReminderModal(false)} className="text-gray-400 font-bold text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSaveReminder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Nama Pasien</label>
                <input type="text" value={selectedPatient.nama_lengkap} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Tanggal Rencana Kembali / Kontrol *</label>
                <input
                  type="date"
                  value={tglKembali}
                  onChange={(e) => setTglKembali(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                Jadwalkan Pengingat WA
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
