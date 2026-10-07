import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import {
  UserPlus, Search, Edit, Trash2, Download, Package, Calendar,
  AlertTriangle, CheckCircle, ShieldAlert, FileSpreadsheet, UserCheck,
  Clock, RefreshCw, Sparkles, Stethoscope, Users, CheckCircle2, UserPlus2, History, Database
} from 'lucide-react';

export default function PatientManagement({ mode = 'INTAKE', setActiveTab }) {
  const { user, hasPermission } = useContext(AuthContext);

  // Current view mode: 'INTAKE' (Pendaftaran Pasien & Treatment), 'RAW_MASTER' (Master Data Pelanggan), or 'DETAIL' (Detail Data Pelanggan)
  const [viewMode, setViewMode] = useState(mode);

  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  const [patients, setPatients] = useState([]);
  const [todayDoinganList, setTodayDoinganList] = useState([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Master Data Pelanggan (Raw) State
  const [rawSearch, setRawSearch] = useState('');
  const [rawMonthFilter, setRawMonthFilter] = useState('ALL');
  const [rawTypeFilter, setRawTypeFilter] = useState('ALL');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showRepeatVisitModal, setShowRepeatVisitModal] = useState(false);
  const [repeatSearch, setRepeatSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packages, setPackages] = useState([]);

  // Permissions check
  const isSuperOrAdmin = user?.role === 'Super Admin' || user?.role === 'Admin System' || user?.role === 'Admin Klinik' || user?.role === 'Admin FO';
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

  // Marketing & MGM Referral State
  const [marketingList, setMarketingList] = useState([]);
  const [marketingId, setMarketingId] = useState('');
  const [referrerPasienId, setReferrerPasienId] = useState('');
  const [mgmSearchInput, setMgmSearchInput] = useState('');
  const [showMgmDropdown, setShowMgmDropdown] = useState(false);

  // Live Staff Assignment State
  const [kebutuhanLayanan, setKebutuhanLayanan] = useState('Beautician');
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Package Form State
  const [namaPaket, setNamaPaket] = useState('');
  const [totalKuota, setTotalKuota] = useState(5);
  const [hargaPaket, setHargaPaket] = useState(2500000);
  const [masterPackages, setMasterPackages] = useState([]);
  const [showMasterPkgModal, setShowMasterPkgModal] = useState(false);
  const [selectedMasterPkgId, setSelectedMasterPkgId] = useState('');
  const [itemAName, setItemAName] = useState('Tindakan Dokter A');
  const [itemAKuota, setItemAKuota] = useState(3);
  const [itemBName, setItemBName] = useState('Facial');
  const [itemBKuota, setItemBKuota] = useState(2);

  // Claim Modal State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedClaimPkg, setSelectedClaimPkg] = useState(null);
  const [claimItemKey, setClaimItemKey] = useState('A');
  const [claimStaffId, setClaimStaffId] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [packageLogs, setPackageLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Marketing Recap State
  const [marketingRecap, setMarketingRecap] = useState([]);
  const [showMarketingModal, setShowMarketingModal] = useState(false);

  // New Master Package Form State
  const [newMasterNama, setNewMasterNama] = useState('');
  const [newMasterItemA, setNewMasterItemA] = useState('');
  const [newMasterKuotaA, setNewMasterKuotaA] = useState(3);
  const [newMasterItemB, setNewMasterItemB] = useState('');
  const [newMasterKuotaB, setNewMasterKuotaB] = useState(2);
  const [newMasterHarga, setNewMasterHarga] = useState(0);

  // System Settings State (WA Reminder Toggle)
  const [waReminderEnabled, setWaReminderEnabled] = useState(false);

  // Reminder Form State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [tglKembali, setTglKembali] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchPatients();
    fetchTodayDoingan();
    fetchMarketingUsers();
    fetchMasterPackages();
    fetchPackageUsageLogs();
    fetchMarketingRecap();
    fetchSettings();

    // Auto-polling antrean petugas & status pengerjaan secara silent setiap 3 detik
    const interval = setInterval(() => {
      fetchTodayDoingan(true);
      if (showModal && kebutuhanLayanan) {
        fetchStaffAvailability(kebutuhanLayanan, true);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [kebutuhanLayanan, showModal]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setWaReminderEnabled(res.data.wa_reminder_enabled === '1');
    } catch (err) { }
  };

  const fetchMasterPackages = async () => {
    try {
      const res = await axios.get('/api/master-paket');
      setMasterPackages(res.data || []);
      if (res.data && res.data.length > 0) {
        const mp = res.data[0];
        setSelectedMasterPkgId(mp.id);
        setNamaPaket(mp.nama_paket);
        setItemAName(mp.item_a_name);
        setItemAKuota(mp.item_a_kuota);
        setItemBName(mp.item_b_name);
        setItemBKuota(mp.item_b_kuota);
        setHargaPaket(mp.harga_paket);
      }
    } catch (err) { }
  };

  const fetchPackageUsageLogs = async () => {
    try {
      const res = await axios.get('/api/pasien/paket/usage/all');
      setPackageLogs(res.data || []);
    } catch (err) { }
  };

  const fetchMarketingRecap = async () => {
    try {
      const res = await axios.get('/api/marketing/recap');
      setMarketingRecap(res.data || []);
    } catch (err) { }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/pasien');
      setPatients(res.data || []);
    } catch (err) {
      console.error('Error fetching patients', err);
    }
  };

  const fetchMarketingUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      // Only include users whose role or lini_profesi is Marketing
      const marketingOnly = (res.data || []).filter(u =>
        (u.role || '').toLowerCase() === 'marketing' ||
        (u.lini_profesi || '').toLowerCase() === 'marketing'
      );
      setMarketingList(marketingOnly);
    } catch (err) {
      console.error('Error fetching users for marketing selection', err);
    }
  };

  const fetchTodayDoingan = async (silent = false) => {
    if (!silent) setLoadingToday(true);
    try {
      const res = await axios.get('/api/doingan/today');
      setTodayDoinganList(res.data || []);
    } catch (err) {
      console.error('Error fetching today doingan', err);
    } finally {
      if (!silent) setLoadingToday(false);
    }
  };

  const fetchStaffAvailability = async (lini, silent = false) => {
    if (!silent) setLoadingStaff(true);
    try {
      const res = await axios.get(`/api/staff-availability?lini=${lini}`);
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Error fetching staff availability', err);
    } finally {
      if (!silent) setLoadingStaff(false);
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
    setMarketingId('');
    setReferrerPasienId('');
    setMgmSearchInput('');
    setShowMgmDropdown(false);
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
    setFormType(p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler' ? 'MEMBER' : p.tipe_pasien);
    setNamaLengkap(p.nama_lengkap);
    setNoHp(p.no_hp);
    setMarketingId(p.marketing_id || '');
    setReferrerPasienId(p.referrer_pasien_id || '');
    const refP = patients.find(x => x.id === p.referrer_pasien_id);
    setMgmSearchInput(refP ? `${refP.nama_lengkap} (${refP.no_hp})` : '');
    setShowMgmDropdown(false);
    setKebutuhanLayanan('Beautician');
    setSelectedStaffId('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowRepeatVisitModal(false);
    setShowModal(true);
    fetchStaffAvailability('Beautician');
  };

  const openEditModal = (p) => {
    if (!canEditPatient) {
      alert('Akses Terbatas: Anda tidak memiliki wewenang untuk mengedit data pasien.');
      return;
    }
    setEditMode(true);
    setSelectedPatient(p);
    setModePendaftaran('NEW');
    setFormType(p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler' ? 'MEMBER' : p.tipe_pasien);
    setNoKtp(p.no_ktp || '');
    setNoHp(p.no_hp || '');
    setNamaLengkap(p.nama_lengkap || '');
    setAlamat(p.alamat || '');
    setTglLahir(p.tgl_lahir || '');
    setRiwayatAlergi(p.riwayat_alergi || '');
    setJenisKulit(p.jenis_kulit || '');
    setRekomendasiDokter(p.rekomendasi_dokter || '');
    setMarketingId(p.marketing_id || '');
    setReferrerPasienId(p.referrer_pasien_id || '');
    const refP = patients.find(x => x.id === p.referrer_pasien_id);
    setMgmSearchInput(refP ? `${refP.nama_lengkap} (${refP.no_hp})` : '');
    setShowMgmDropdown(false);
    setKebutuhanLayanan('Beautician');
    setSelectedStaffId('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowModal(true);
    fetchStaffAvailability('Beautician');
  };

  const handleUpgradeToMember = async (patient) => {
    if (!canEditPatient) {
      alert('Akses Terbatas: Anda tidak memiliki wewenang untuk mengedit data pasien.');
      return;
    }
    if (!window.confirm(`Ubah status pasien "${patient.nama_lengkap}" dari TRIAL menjadi MEMBER?`)) return;
    try {
      await axios.put(`/api/pasien/${patient.id}`, {
        ...patient,
        tipe_pasien: 'MEMBER'
      });
      alert(`Status pasien "${patient.nama_lengkap}" berhasil diubah menjadi MEMBER!`);
      fetchPatients();
      fetchTodayDoingan();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status pasien');
    }
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
      { wch: 12 },
      { wch: 22 }
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = filterType === 'TRIAL' ? 'Pasien Trial' : filterType === 'MEMBER' ? 'Pasien Member' : 'Semua Pasien';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fileName = `Data_Pelanggan_DEFLOW_${filterType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Master Data Pelanggan (Raw) Filtering & Export
  const availableMonths = Array.from(new Set(
    patients
      .filter(p => p.created_at)
      .map(p => p.created_at.slice(0, 7))
  )).sort().reverse();

  const filteredRawPatients = patients.filter(p => {
    const searchLower = rawSearch.toLowerCase();
    const matchSearch = !rawSearch ||
      (p.nama_lengkap && p.nama_lengkap.toLowerCase().includes(searchLower)) ||
      (p.no_hp && p.no_hp.includes(rawSearch)) ||
      (p.no_ktp && p.no_ktp.includes(rawSearch)) ||
      (p.marketing_nama && p.marketing_nama.toLowerCase().includes(searchLower));

    let matchMonth = true;
    if (rawMonthFilter !== 'ALL' && p.created_at) {
      const pMonth = p.created_at.slice(0, 7);
      matchMonth = (pMonth === rawMonthFilter);
    }

    const initialTipe = p.initial_tipe_pasien || (p.has_trial_history === 1 ? 'TRIAL' : p.tipe_pasien);
    let matchType = true;
    if (rawTypeFilter === 'TRIAL') {
      matchType = (initialTipe === 'TRIAL');
    } else if (rawTypeFilter === 'MEMBER') {
      matchType = (initialTipe === 'MEMBER');
    }

    return matchSearch && matchMonth && matchType;
  });

  const handleExportRawMasterExcel = () => {
    if (!canExportExcel) {
      alert('Akses Terbatas: Anda tidak memiliki wewenang export data.');
      return;
    }
    const exportData = filteredRawPatients.map((p, index) => {
      const initialTipe = p.initial_tipe_pasien || (p.has_trial_history === 1 ? 'TRIAL' : p.tipe_pasien);
      return {
        'No.': index + 1,
        'Tgl Registrasi / Intake': p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-',
        'Nama Pasien': p.nama_lengkap,
        'No. Handphone': p.no_hp,
        'No. KTP': p.no_ktp || '-',
        'Tipe Kedatangan Awal': initialTipe,
        'Status Saat Ini': p.tipe_pasien,
        'Marketing Intake': p.marketing_nama || '-',
        'Referrer Pasien': p.referrer_nama || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Data Mentah');
    const fileName = `Master_Data_Pelanggan_Raw_${rawMonthFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!editMode && !selectedStaffId) {
      setErrorMessage('Silakan pilih Petugas Bertugas (Beautician / Nurse) untuk menangani treatment pasien hari ini.');
      return;
    }

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
          marketing_id: marketingId || null,
          referrer_pasien_id: referrerPasienId || null,
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
          marketing_id: marketingId || null,
          referrer_pasien_id: referrerPasienId || null,
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
        if (found) {
          targetPatientName = found.nama_lengkap;
          if (found.tipe_pasien !== formType) {
            await axios.put(`/api/pasien/${found.id}`, {
              ...found,
              tipe_pasien: formType
            });
          }
        }
      }

      // Live Assignment process if staff selected
      if (selectedStaffId && patientIdToAssign) {
        const selectedStaffObj = staffList.find(s => s.id === selectedStaffId);
        const katName = kebutuhanLayanan === 'Nurse' ? 'Tindakan Medis (Nurse)' : 'Facial (Beautician)';

        await axios.post('/api/doingan/assign', {
          pasien_id: patientIdToAssign,
          petugas_id: selectedStaffId,
          kategori_layanan: katName,
          marketing_id: marketingId || null
        });

        setSuccessMessage(`Berhasil! Pasien ${targetPatientName} di-assign ke ${selectedStaffObj?.full_name || 'Petugas'}. Sesi otomatis IN_PROGRESS!`);
      }

      fetchPatients();
      fetchTodayDoingan();
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

  const handleMasterPackageSelect = (e) => {
    const mpId = e.target.value;
    setSelectedMasterPkgId(mpId);
    const mp = masterPackages.find(x => x.id === mpId);
    if (mp) {
      setNamaPaket(mp.nama_paket);
      setItemAName(mp.item_a_name);
      setItemAKuota(mp.item_a_kuota);
      setItemBName(mp.item_b_name || '');
      setItemBKuota(mp.item_b_kuota || 0);
      setHargaPaket(mp.harga_paket);
    }
  };

  const handleAddPackage = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !namaPaket) return;

    try {
      await axios.post(`/api/pasien/${selectedPatient.id}/paket`, {
        nama_paket: namaPaket,
        item_a_name: itemAName,
        item_a_kuota: Number(itemAKuota),
        item_b_name: itemBName,
        item_b_kuota: Number(itemBKuota),
        harga_paket: Number(hargaPaket)
      });
      const res = await axios.get(`/api/pasien/${selectedPatient.id}/paket`);
      setPackages(res.data);
      alert(`Paket treatment ${namaPaket} berhasil ditambahkan ke pasien!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan paket');
    }
  };

  const handleCreateMasterPkg = async (e) => {
    e.preventDefault();
    if (!newMasterNama || !newMasterItemA) {
      alert('Nama Paket dan Nama Item A wajib diisi!');
      return;
    }
    try {
      await axios.post('/api/master-paket', {
        nama_paket: newMasterNama,
        item_a_name: newMasterItemA,
        item_a_kuota: Number(newMasterKuotaA) || 1,
        item_b_name: newMasterItemB || null,
        item_b_kuota: Number(newMasterKuotaB) || 0,
        harga_paket: Number(newMasterHarga) || 0
      });
      alert('Master Template Paket berhasil ditambahkan!');
      fetchMasterPackages();
      setNewMasterNama('');
      setNewMasterItemA('');
      setNewMasterKuotaA(3);
      setNewMasterItemB('');
      setNewMasterKuotaB(2);
      setNewMasterHarga(0);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan template master paket');
    }
  };

  const handleDeleteMasterPkg = async (id, nama) => {
    if (!window.confirm(`Hapus template master paket "${nama}"?`)) return;
    try {
      await axios.delete(`/api/master-paket/${id}`);
      fetchMasterPackages();
    } catch (err) {
      alert('Gagal menghapus template master paket');
    }
  };

  const openClaimModal = (pkg, itemKey) => {
    setSelectedClaimPkg(pkg);
    setClaimItemKey(itemKey);
    setClaimStaffId('');
    setClaimNotes('');
    const targetLini = itemKey === 'B' ? 'Beautician' : 'Nurse';
    setKebutuhanLayanan(targetLini);
    fetchStaffAvailability(targetLini);
    setShowClaimModal(true);
  };

  const handleProcessClaim = async (e) => {
    e.preventDefault();
    if (!selectedClaimPkg || !claimStaffId) {
      alert('Pilih petugas bertugas!');
      return;
    }
    setSubmittingClaim(true);
    try {
      const res = await axios.post(`/api/pasien/paket/${selectedClaimPkg.id}/claim`, {
        item_key: claimItemKey,
        petugas_id: claimStaffId,
        notes: claimNotes
      });
      alert(res.data.message);
      setShowClaimModal(false);
      const updated = await axios.get(`/api/pasien/${selectedPatient.id}/paket`);
      setPackages(updated.data);
      fetchPackageUsageLogs();
      fetchTodayDoingan();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses klaim paket');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleExportPackageLogs = () => {
    if (packageLogs.length === 0) {
      alert('Belum ada histori klaim paket untuk diexport');
      return;
    }
    const exportData = packageLogs.map((log, index) => ({
      'No.': index + 1,
      'Tanggal & Waktu Klaim': log.used_at ? new Date(log.used_at).toLocaleString('id-ID') : '-',
      'Nama Pasien': log.pasien_nama || '-',
      'No. HP Pasien': log.pasien_hp || '-',
      'Nama Paket': log.nama_paket || '-',
      'Porsi/Item Diklaim': log.item_claimed || '-',
      'Petugas Bertugas': log.petugas_nama || '-',
      'Admin FO Penginput': log.user_fo_nama || '-',
      'Catatan': log.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Histori Klaim Paket');
    XLSX.writeFile(workbook, `Histori_Klaim_Paket_DEFLOW_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportMarketingRecap = () => {
    if (marketingRecap.length === 0) {
      alert('Belum ada data rekap marketing untuk diexport');
      return;
    }
    const exportData = marketingRecap.map((m, index) => ({
      'No.': index + 1,
      'Nama Marketing': m.marketing_nama || '-',
      'Role / Lini Profesi': m.marketing_role || 'Marketing',
      'Jumlah Pasien Trial Didapatkan': m.total_trial_count || 0,
      'Total Komisi Trial (Rp 10.000 / Pasien)': m.total_komisi_marketing || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Komisi Marketing');
    XLSX.writeFile(workbook, `Rekap_Komisi_Marketing_Trial_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  const getLocalDateString = (dStr) => {
    const d = dStr ? new Date(dStr) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();

  // Filter master patients for Database view & search modal
  const filteredPatients = patients.filter(p => {
    const matchSearch = (p.nama_lengkap || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.no_hp || '').includes(search) ||
      (p.no_ktp && p.no_ktp.includes(search));
    const matchFilter = filterType === 'ALL' ||
      (filterType === 'TRIAL' && (p.tipe_pasien === 'TRIAL' || p.has_trial_history === 1)) ||
      (filterType === 'MEMBER' && (p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler'));
    let matchDate = true;
    if (dateFilter) {
      const pDate = p.created_at ? getLocalDateString(p.created_at) : '';
      matchDate = pDate === dateFilter;
    }
    return matchSearch && matchFilter && matchDate;
  });

  // Filter existing patients for repeat visit lookup modal
  const matchedRepeatPatients = patients.filter(p => {
    if (!repeatSearch.trim()) return true;
    const term = repeatSearch.toLowerCase();
    return (p.nama_lengkap || '').toLowerCase().includes(term) ||
      (p.no_hp || '').includes(term) ||
      (p.no_ktp && p.no_ktp.includes(term));
  });

  // Active intake queue today (exclude patients whose treatment is completed AND billing finished, and exclude Marketing referral records)
  const activeTodayQueue = todayDoinganList.filter(d =>
    !(d.status_pengerjaan === 'COMPLETED' && d.is_billed === 1) &&
    d.petugas_role !== 'Marketing' &&
    d.kategori_layanan !== 'Marketing Referral'
  );

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
      {/* View Mode Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5ded4] pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">
            {viewMode === 'INTAKE'
              ? 'Pendaftaran Pasien & Treatment Hari Ini'
              : viewMode === 'RAW_MASTER'
                ? 'Master Data Pelanggan'
                : 'Detail Data Pelanggan'}
          </h1>
          <p className="text-xs text-[#514440]">
            {viewMode === 'INTAKE'
              ? 'Menu pendaftaran pasien baru, intake kunjungan berulang pasien lama, serta antrean treatment aktif hari ini.'
              : viewMode === 'RAW_MASTER'
                ? 'Database mentah pencatatan awal kedatangan seluruh pelanggan. Data kedatangan Trial tersimpan utuh dan tidak terpengaruh migrasi Member.'
                : 'Kelola profil pelanggan aktif, riwayat poin, klaim paket treatment member, edit profil, dan reminder kontrol.'}
          </p>
        </div>
      </div>

      {/* VIEW MODE 1: PENDAFTARAN PASIEN & TREATMENT HARI INI */}
      {viewMode === 'INTAKE' && (
        <div className="space-y-6">
          {/* Action Header Card */}
          <div className="bg-gradient-to-r from-[#faf3e8] to-[#f4ede3] p-5 rounded-2xl border border-[#d6c2bd] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#7d5141] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7d5141]" />
                <span>Penerimaan & Intake Pasien Hari Ini</span>
              </h3>
              <p className="text-xs text-[#514440]">
                Pilih opsi pendaftaran untuk pasien baru atau pencarian data pasien lama yang datang kembali.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setRepeatSearch('');
                  setShowRepeatVisitModal(true);
                }}
                className="px-4 py-2.5 bg-white hover:bg-[#fff8f0] text-[#7d5141] border border-[#d6c2bd] font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-[#7d5141]" />
                <span>🔍 Cari Pasien Lama</span>
              </button>

              <button
                type="button"
                onClick={openNewPatientModal}
                className="px-4 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Pasien Baru</span>
              </button>
            </div>
          </div>

          {/* Table Antrean & Pengerjaan Treatment Pasien Hari Ini */}
          <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Daftar Antrean & Treatment Pasien Hari Ini</h3>
                <p className="text-xs text-[#83746f]">Pasien yang sudah selesai tindakan & lunas transaksi otomatis diselesaikan dari antrean ini.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTodayDoingan}
                  disabled={loadingToday}
                  className="px-3 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] text-[#7d5141] border border-[#d6c2bd] font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingToday ? 'animate-spin' : ''}`} />
                  <span>Refresh Antrean</span>
                </button>
                <span className="text-xs font-bold text-[#7d5141] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  {activeTodayQueue.length} Pasien Aktif
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-4">Waktu Intake</th>
                    <th className="py-3 px-4">Nama Pasien</th>
                    <th className="py-3 px-4">Tipe & Kontak</th>
                    <th className="py-3 px-4">Petugas & Lini</th>
                    <th className="py-3 px-4">Status Pengerjaan</th>
                    <th className="py-3 px-4 text-center">Tindakan Selesai / Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {activeTodayQueue.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-400 italic">
                        Belum ada antrean treatment pasien yang aktif hari ini. Klik <strong>Register Pasien Baru</strong> atau <strong>🔍 Cari Pasien Lama</strong> di atas.
                      </td>
                    </tr>
                  ) : (
                    activeTodayQueue.map(d => {
                      const isInProgress = d.status_pengerjaan === 'IN_PROGRESS';
                      return (
                        <tr key={d.doingan_id} className="hover:bg-[#fff8f0] transition-colors">
                          <td className="py-3.5 px-4 text-[#514440] font-medium">
                            {formatDateTime(d.started_at || d.created_at)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#1e1b15] text-sm">
                            {d.pasien_nama}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#514440]">{d.pasien_hp}</div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${d.tipe_pasien === 'TRIAL' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                              {d.tipe_pasien === 'NON-TRIAL' || d.tipe_pasien === 'Reguler' ? 'MEMBER' : d.tipe_pasien}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#7d5141]">{d.petugas_nama}</div>
                            <div className="text-[10px] text-gray-500 font-medium">{d.kategori_layanan || d.lini_profesi}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {isInProgress ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-300">
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                Sedang Ditangani (IN_PROGRESS)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                                Selesai Treatment (Menunggu Kasir POS)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isInProgress ? (
                              <span className="text-[11px] text-gray-400 italic">Ditangani di Portal Petugas</span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (setActiveTab) setActiveTab('pos');
                                }}
                                className="px-3 py-1.5 bg-[#514440] hover:bg-[#333029] text-white font-bold rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                              >
                                <span>Ke Kasir POS →</span>
                              </button>
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
        </div>
      )}

      {/* VIEW MODE 2: MASTER DATA PELANGGAN (DATA MENTAH REGISTRASI / KEDATANGAN AWAL) */}
      {viewMode === 'RAW_MASTER' && (
        <div className="space-y-6">
          {/* Controls Bar: Search, Month Filter, Arrival Type Filter, Export */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#83746f]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                placeholder="Cari NIK, No. HP, Nama Pasien, atau Marketing..."
                className="w-full pl-9 pr-4 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141] font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-[#faf3e8] px-3 py-1.5 border border-[#d6c2bd] rounded-xl">
                <Calendar className="w-4 h-4 text-[#7d5141]" />
                <span className="font-semibold text-[#514440]">Bulan Intake:</span>
                <select
                  value={rawMonthFilter}
                  onChange={(e) => setRawMonthFilter(e.target.value)}
                  className="bg-white px-2.5 py-1 border border-[#d6c2bd] rounded-lg text-xs font-bold text-[#1e1b15]"
                >
                  <option value="ALL">-- Semua Bulan --</option>
                  {availableMonths.map(m => {
                    const dateObj = new Date(`${m}-01`);
                    const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    return <option key={m} value={m}>{monthLabel}</option>;
                  })}
                </select>
              </div>

              <span className="text-[#83746f] font-semibold ml-1">Kedatangan Awal:</span>
              <button
                onClick={() => setRawTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${rawTypeFilter === 'ALL' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
              >
                Semua Kedatangan ({patients.length})
              </button>
              <button
                onClick={() => setRawTypeFilter('TRIAL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${rawTypeFilter === 'TRIAL' ? 'bg-amber-700 text-white shadow-xs' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}
              >
                Trial Awal ({patients.filter(p => (p.initial_tipe_pasien || (p.has_trial_history === 1 ? 'TRIAL' : p.tipe_pasien)) === 'TRIAL').length})
              </button>
              <button
                onClick={() => setRawTypeFilter('MEMBER')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${rawTypeFilter === 'MEMBER' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}
              >
                Member Direct ({patients.filter(p => (p.initial_tipe_pasien || (p.has_trial_history === 1 ? 'TRIAL' : p.tipe_pasien)) === 'MEMBER').length})
              </button>

              {canExportExcel && (
                <button
                  onClick={handleExportRawMasterExcel}
                  className="ml-1 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Export Master Data Mentah Pelanggan ke Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel (Mentah)</span>
                </button>
              )}
            </div>
          </div>

          {/* Master Raw Patient Table */}
          <div className="bg-white rounded-2xl border border-[#e5ded4] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase tracking-wider border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Tgl Registrasi</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Nama Pasien</th>
                    <th className="py-3.5 px-4 min-w-[140px]">HP & NIK</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Tipe Kedatangan Awal</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Tipe Saat Ini</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Marketing Intake</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {filteredRawPatients.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-[#83746f] italic">
                        Tidak ada data mentah pelanggan yang cocok dengan filter pencarian / bulan.
                      </td>
                    </tr>
                  ) : (
                    filteredRawPatients.map(p => {
                      const initialTipe = p.initial_tipe_pasien || (p.has_trial_history === 1 ? 'TRIAL' : p.tipe_pasien);
                      const isCurrentlyMember = p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler';
                      return (
                        <tr key={p.id} className="hover:bg-[#fff8f0] transition-colors">
                          <td className="py-3.5 px-4 text-[#83746f] font-medium whitespace-nowrap">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#1e1b15] text-sm">
                            {p.nama_lengkap}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1e1b15]">{p.no_hp}</div>
                            {p.no_ktp && <div className="text-[10px] text-[#83746f]">NIK: {p.no_ktp}</div>}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {initialTipe === 'TRIAL' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                TRIAL
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                MEMBER
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isCurrentlyMember && initialTipe === 'TRIAL' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                                MEMBER (MIGRASI DARI TRIAL)
                              </span>
                            ) : isCurrentlyMember ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                MEMBER
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                TRIAL
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1e1b15]">{p.marketing_nama || '-'}</div>
                            {p.referrer_nama && <div className="text-[10px] text-indigo-700 font-medium">Referred by: {p.referrer_nama}</div>}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(p)}
                                className="px-2.5 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] text-[#7d5141] border border-[#d6c2bd] font-semibold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                                title="Edit Profil Pasien"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: DETAIL DATA PELANGGAN */}
      {(viewMode === 'DETAIL' || viewMode === 'MASTER') && (
        <div className="space-y-6">
          {/* Master Controls & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#83746f]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari NIK, No. HP, atau Nama Pasien..."
                className="w-full pl-9 pr-4 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
              />
            </div>

            {/* Date & Type Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-[#faf3e8] p-1 border border-[#d6c2bd] rounded-xl">
                <button
                  type="button"
                  onClick={() => setDateFilter(todayStr)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${dateFilter === todayStr ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'
                    }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Terdaftar Hari Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${dateFilter === '' ? 'bg-white text-[#7d5141] font-bold shadow-2xs' : 'text-[#514440] hover:bg-[#eee7dd]'
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
                Trial & Riwayat ({patients.filter(p => p.tipe_pasien === 'TRIAL' || p.has_trial_history === 1).length})
              </button>
              <button
                onClick={() => setFilterType('MEMBER')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'MEMBER' || filterType === 'NON-TRIAL' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}
              >
                Member ({patients.filter(p => p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler').length})
              </button>

              <button
                type="button"
                onClick={() => setShowLogsModal(true)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Histori Klaim Paket Pasien"
              >
                <History className="w-3.5 h-3.5" />
                <span>Histori Klaim Paket ({packageLogs.length})</span>
              </button>

              {canExportExcel && (
                <button
                  onClick={handleExportExcel}
                  className="ml-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Export master data pasien ke Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
              )}
            </div>
          </div>

          {/* Master Patient Table */}
          <div className="bg-white rounded-2xl border border-[#e5ded4] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase tracking-wider border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">Tgl Terdaftar</th>
                    <th className="py-3 px-4 min-w-[140px]">Nama Pasien</th>
                    <th className="py-3 px-4 min-w-[130px]">HP & NIK</th>
                    <th className="py-3 px-4 whitespace-nowrap">Tipe Pasien</th>
                    <th className="py-3 px-4 whitespace-nowrap">Poin</th>
                    <th className="py-3 px-4 text-right min-w-[360px] whitespace-nowrap">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-[#83746f] italic">Tidak ada data pasien yang cocok dengan filter master database.</td>
                    </tr>
                  ) : (
                    filteredPatients.map(p => {
                      const isMember = p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler';
                      return (
                        <tr key={p.id} className="hover:bg-[#fff8f0] transition-colors">
                          <td className="py-3.5 px-4 text-[#83746f] font-medium whitespace-nowrap">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#1e1b15] text-sm">
                            {p.nama_lengkap}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1e1b15]">{p.no_hp}</div>
                            {p.no_ktp && <div className="text-[10px] text-[#83746f]">NIK: {p.no_ktp}</div>}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isMember && p.has_trial_history === 1 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                                MEMBER (MIGRASI DARI TRIAL)
                              </span>
                            ) : isMember ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                MEMBER
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                TRIAL
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#7d5141] whitespace-nowrap">
                            +{p.total_poin || 0} Poin
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">

                            <button
                              onClick={() => openEditModal(p)}
                              className="px-2.5 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] text-[#7d5141] border border-[#d6c2bd] font-semibold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                              title="Edit Profil Pasien"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {!isMember && canEditPatient && (
                              <button
                                onClick={() => handleUpgradeToMember(p)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                                title="Ubah Status ke Member"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Ubah ke Member</span>
                              </button>
                            )}

                            <button
                              onClick={() => openPackageModal(p)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                              title="Kelola Paket Treatment Member"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>Paket</span>
                            </button>

                            {waReminderEnabled && (
                              <button
                                onClick={() => openReminderModal(p)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                                title="Set Reminder Kontrol WA"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Reminder</span>
                              </button>
                            )}

                            {canDeletePatient && (
                              <button
                                onClick={() => handleDeletePatient(p.id, p.nama_lengkap)}
                                className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                                title="Hapus Pasien"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* MODAL SEARCH REPEAT PATIENT (KUNJUNGAN BERULANG PASIEN LAMA) */}
      {showRepeatVisitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-[#e5ded4]">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15] flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#7d5141]" />
                  <span>🔍 Cari Pasien Lama</span>
                </h3>
                <p className="text-xs text-[#83746f]">Cari pasien lama berdasarkan Nama, No. HP, atau NIK untuk dibuatkan sesi pengerjaan treatment hari ini.</p>
              </div>
              <button onClick={() => setShowRepeatVisitModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#83746f]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                autoFocus
                value={repeatSearch}
                onChange={(e) => setRepeatSearch(e.target.value)}
                placeholder="Ketik Nama, No. HP, atau NIK Pasien..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141] font-medium"
              />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {matchedRepeatPatients.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic border border-dashed rounded-xl">
                  Tidak ditemukan pasien dengan kata kunci "{repeatSearch}".
                </div>
              ) : (
                matchedRepeatPatients.slice(0, 10).map(p => (
                  <div key={p.id} className="p-3.5 bg-[#faf3e8]/60 hover:bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex items-center justify-between gap-3 transition-colors">
                    <div>
                      <div className="font-bold text-sm text-[#1e1b15]">{p.nama_lengkap}</div>
                      <div className="text-xs text-[#514440] font-medium">HP: {p.no_hp} {p.no_ktp ? `| NIK: ${p.no_ktp}` : ''}</div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${p.tipe_pasien === 'TRIAL' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                        {p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler' ? 'MEMBER' : p.tipe_pasien}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openIntakeForExisting(p)}
                      className="px-3.5 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>+ Buat Sesi Treatment Hari Ini</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM PENDAFTARAN & LIVE STAFF ASSIGNMENT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-[#e5ded4]">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1e1b15]">
                {editMode ? 'Edit Data Profil Pasien' : (modePendaftaran === 'NEW' ? 'Form Pendaftaran Pasien Baru' : `Intake Treatment Hari Ini: ${namaLengkap}`)}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePatient} className="space-y-4 text-xs">
              {/* Patient Data Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#514440] font-semibold mb-1">Tipe Pasien / Pelanggan *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('TRIAL')}
                      className={`py-2 text-center rounded-xl font-bold transition-all ${formType === 'TRIAL' ? 'bg-amber-700 text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] border border-[#d6c2bd]'}`}
                    >
                      PASIEN TRIAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('MEMBER')}
                      className={`py-2 text-center rounded-xl font-bold transition-all ${formType === 'MEMBER' || formType === 'NON-TRIAL' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] border border-[#d6c2bd]'}`}
                    >
                      PASIEN MEMBER
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Nama Lengkap Pasien *</label>
                  <input
                    type="text"
                    required
                    disabled={modePendaftaran === 'EXISTING'}
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder="Nama Pasien..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  />
                </div>

                <div>
                  <label className="block text-[#514440] font-semibold mb-1">No. Handphone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    disabled={modePendaftaran === 'EXISTING'}
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="08123456789..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  />
                </div>

                <div>
                  <label className="block text-[#514440] font-semibold mb-1">NIK / No. KTP</label>
                  <input
                    type="text"
                    value={noKtp}
                    disabled={modePendaftaran === 'EXISTING'}
                    onChange={(e) => setNoKtp(e.target.value)}
                    placeholder="16 digit NIK KTP..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  />
                </div>

                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Team Marketing (Assigned FO)</label>
                  <select
                    value={marketingId}
                    disabled={modePendaftaran === 'EXISTING'}
                    onChange={(e) => setMarketingId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  >
                    <option value="">-- Tanpa Team Marketing --</option>
                    {marketingList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.role || m.lini_profesi})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#83746f] mt-0.5">*Trial mendapat komisi 10K untuk Team Marketing</p>
                </div>

                <div className="sm:col-span-2 relative">
                  <label className="block text-[#514440] font-semibold mb-1">MGM (Member Get Member) / Referrer</label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled={modePendaftaran === 'EXISTING'}
                      value={mgmSearchInput}
                      onFocus={() => setShowMgmDropdown(true)}
                      onChange={(e) => {
                        setMgmSearchInput(e.target.value);
                        setShowMgmDropdown(true);
                        if (!e.target.value) setReferrerPasienId('');
                      }}
                      placeholder="Ketik nama atau No. HP member yang membawa pasien ini..."
                      className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141] pr-16"
                    />
                    {referrerPasienId && (
                      <button
                        type="button"
                        onClick={() => {
                          setReferrerPasienId('');
                          setMgmSearchInput('');
                        }}
                        className="absolute right-2 top-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {showMgmDropdown && mgmSearchInput && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#d6c2bd] rounded-xl shadow-lg max-h-44 overflow-y-auto divide-y divide-gray-100">
                      {patients
                        .filter(p => p.id !== selectedPatient?.id)
                        .filter(p => (p.nama_lengkap || '').toLowerCase().includes(mgmSearchInput.toLowerCase()) || (p.no_hp || '').includes(mgmSearchInput))
                        .slice(0, 8)
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setReferrerPasienId(p.id);
                              setMgmSearchInput(`${p.nama_lengkap} (HP: ${p.no_hp})`);
                              setShowMgmDropdown(false);
                            }}
                            className="p-2.5 hover:bg-[#faf3e8] cursor-pointer text-xs flex justify-between items-center transition-colors"
                          >
                            <div>
                              <span className="font-bold text-[#1e1b15]">{p.nama_lengkap}</span>
                              <span className="text-[10px] text-gray-500 ml-2">({p.tipe_pasien === 'TRIAL' ? 'Trial' : 'Member'})</span>
                            </div>
                            <span className="text-[#83746f] text-[11px] font-semibold">{p.no_hp}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  <p className="text-[10px] text-[#83746f] mt-0.5">*Member pembuat referral otomatis dapat bonus poin 5% dari total harga paket treatment yang dibeli</p>
                </div>
              </div>

              {/* Live Staff Assignment Box */}
              {!editMode && (
                <div className="p-4 bg-[#faf3e8] rounded-xl border border-[#d6c2bd] space-y-3">
                  <div className="font-bold text-[#7d5141] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#7d5141]" />
                    <span>Assign Petugas & Lini Profesi Treatment Hari Ini</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">Kategori Layanan *</label>
                      <select
                        value={kebutuhanLayanan}
                        onChange={(e) => handleLayananChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                      >
                        <option value="Beautician">Facial & Care (Beautician)</option>
                        <option value="Nurse">Tindakan Medis (Nurse)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">Pilih Petugas Bertugas *</label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                      >
                        <option value="">-- {loadingStaff ? 'Memuat Staff...' : 'Pilih Petugas Staff'} --</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id} disabled={s.is_busy}>
                            {s.full_name} ({s.role}) {s.is_busy ? '[SEDANG DITANGANI PASIEN LAIN]' : '[READY]'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e5ded4]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#514440] font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {editMode ? 'Simpan Perubahan' : 'Proses Registration & Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KELOLA PAKET TREATMENT MEMBER */}
      {showPackageModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Kelola Paket Treatment Member</h3>
                <p className="text-xs text-[#83746f]">Pasien: <span className="font-bold text-[#1e1b15]">{selectedPatient.nama_lengkap}</span></p>
              </div>
              <button onClick={() => setShowPackageModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
            </div>

            {/* List Existing Packages */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-[#7d5141] uppercase">Daftar Paket Treatment Aktif</h4>
              {packages.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Belum ada paket treatment aktif untuk pasien ini.</p>
              ) : (
                packages.map(pkg => (
                  <div key={pkg.id} className="p-4 bg-[#faf3e8] border border-[#d6c2bd] rounded-2xl space-y-3 text-xs shadow-2xs">
                    <div className="flex justify-between items-center border-b border-[#d6c2bd]/60 pb-2">
                      <div className="font-bold text-sm text-[#1e1b15]">{pkg.nama_paket}</div>
                      <div className="text-xs font-mono font-bold text-[#7d5141]">
                        Total Sisa Kuota: <span className="text-emerald-700">{pkg.sisa_kuota}</span> / {pkg.total_kuota} Sesi
                      </div>
                    </div>

                    {/* Sub-item A & B Quotas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {pkg.item_a_name && (
                        <div className="p-2.5 bg-white rounded-xl border border-[#d6c2bd]/70 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-[#1e1b15]">{pkg.item_a_name}</div>
                            <div className="text-[10px] text-gray-500">
                              Sisa: <strong className="text-emerald-700">{pkg.item_a_kuota || 0}</strong> / {pkg.item_a_total || pkg.total_kuota}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={(pkg.item_a_kuota || 0) <= 0}
                            onClick={() => openClaimModal(pkg, 'A')}
                            className="px-2.5 py-1 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-300 text-white font-bold rounded-lg text-[10px] cursor-pointer shadow-2xs"
                          >
                            Klaim Item A
                          </button>
                        </div>
                      )}

                      {pkg.item_b_name && (
                        <div className="p-2.5 bg-white rounded-xl border border-[#d6c2bd]/70 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-[#1e1b15]">{pkg.item_b_name}</div>
                            <div className="text-[10px] text-gray-500">
                              Sisa: <strong className="text-emerald-700">{pkg.item_b_kuota || 0}</strong> / {pkg.item_b_total || 0}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={(pkg.item_b_kuota || 0) <= 0}
                            onClick={() => openClaimModal(pkg, 'B')}
                            className="px-2.5 py-1 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-300 text-white font-bold rounded-lg text-[10px] cursor-pointer shadow-2xs"
                          >
                            Klaim Item B
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Form Add New Package */}
            <form onSubmit={handleAddPackage} className="pt-3 border-t border-[#e5ded4] space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-xs text-[#7d5141] uppercase">+ Assign / Tambah Paket Baru ke Pasien</h4>
                {masterPackages.length > 0 && (
                  <select
                    value={selectedMasterPkgId}
                    onChange={handleMasterPackageSelect}
                    className="px-2 py-1 bg-[#faf3e8] border border-[#d6c2bd] rounded-lg font-bold text-[11px] text-[#7d5141]"
                  >
                    <option value="">-- Pilih Template Master --</option>
                    {masterPackages.map(mp => (
                      <option key={mp.id} value={mp.id}>{mp.nama_paket} (Rp {mp.harga_paket?.toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[#514440] font-semibold mb-1">Nama Paket *</label>
                <input
                  type="text"
                  required
                  value={namaPaket}
                  onChange={(e) => setNamaPaket(e.target.value)}
                  placeholder="Nama Paket..."
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Nama Tindakan 1 (Item A) *</label>
                  <input
                    type="text"
                    required
                    value={itemAName}
                    onChange={(e) => setItemAName(e.target.value)}
                    placeholder="e.g. Tindakan Dokter A..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Kuota Item A (Sesi)</label>
                  <input
                    type="number"
                    min="1"
                    value={itemAKuota}
                    onChange={(e) => setItemAKuota(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Nama Tindakan 2 (Item B - Opsional)</label>
                  <input
                    type="text"
                    value={itemBName}
                    onChange={(e) => setItemBName(e.target.value)}
                    placeholder="e.g. Facial..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Kuota Item B (Sesi)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemBKuota}
                    onChange={(e) => setItemBKuota(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#514440] font-semibold mb-1">Harga Paket Total (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={hargaPaket}
                  onChange={(e) => setHargaPaket(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#514440] hover:bg-[#333029] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                + Simpan & Assign Paket Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SET REMINDER KONTROL */}
      {showReminderModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4]">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">Jadwal Reminder Kontrol H-1</h3>
              <button onClick={() => setShowReminderModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
            </div>

            <form onSubmit={handleSaveReminder} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#514440] font-semibold mb-1">Pasien</label>
                <div className="p-2.5 bg-[#faf3e8] rounded-xl font-bold text-[#1e1b15] border border-[#d6c2bd]">
                  {selectedPatient.nama_lengkap} ({selectedPatient.no_hp})
                </div>
              </div>

              <div>
                <label className="block text-[#514440] font-semibold mb-1">Tanggal Kunjungan Kembali *</label>
                <input
                  type="date"
                  required
                  value={tglKembali}
                  onChange={(e) => setTglKembali(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="px-3 py-2 bg-gray-100 text-[#514440] font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Set Reminder WA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KLAIM PORSI/ITEM PAKET */}
      {showClaimModal && selectedClaimPkg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4]">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Klaim Porsi / Item Paket Treatment</h3>
                <p className="text-xs text-[#83746f]">Paket: <span className="font-bold text-[#7d5141]">{selectedClaimPkg.nama_paket}</span></p>
              </div>
              <button onClick={() => setShowClaimModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
            </div>

            <form onSubmit={handleProcessClaim} className="space-y-3 text-xs">
              <div className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl space-y-1">
                <div className="font-bold text-[#1e1b15] text-sm">
                  Item Klaim: <span className="text-[#7d5141]">{claimItemKey === 'A' ? selectedClaimPkg.item_a_name : selectedClaimPkg.item_b_name}</span>
                </div>
                <div className="text-xs text-emerald-800 font-semibold">
                  Sisa Kuota: {claimItemKey === 'A' ? selectedClaimPkg.item_a_kuota : selectedClaimPkg.item_b_kuota} Sesi
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  *Klaim paket memotong kuota dan otomatis masuk ke antrean Doingan petugas dengan status Gratis (Prepaid Rp 0). Petugas menerima komisi standar. Marketing tidak mendapat komisi.
                </div>
              </div>

              <div>
                <label className="block text-[#514440] font-semibold mb-1">Pilih Petugas Bertugas ({kebutuhanLayanan}) *</label>
                <select
                  required
                  value={claimStaffId}
                  onChange={(e) => setClaimStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                >
                  <option value="">-- Select Petugas Bertugas --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id} disabled={s.is_busy}>
                      {s.full_name} ({s.role}) {s.is_busy ? '[SEDANG DITANGANI PASIEN LAIN]' : '[READY]'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#514440] font-semibold mb-1">Catatan Pengeklaiman (Opsional)</label>
                <input
                  type="text"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="Catatan pengerjaan / area..."
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e5ded4]">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 bg-gray-100 text-[#514440] font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-300 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submittingClaim ? 'Memproses...' : 'Konfirmasi Klaim Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KELOLA MASTER TEMPLATE PAKET */}
      {showMasterPkgModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Kelola Master Template Paket</h3>
                <p className="text-xs text-[#83746f]">Atur template paket default (Ultimate 1, Ultimate 2, Botox, dll) agar dapat dipilih saat penambahan kuota pasien.</p>
              </div>
              <button onClick={() => setShowMasterPkgModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
            </div>

            {/* List Existing Master Templates */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-[#7d5141] uppercase">Daftar Master Template Paket Saat Ini</h4>
              <div className="space-y-2">
                {masterPackages.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Belum ada template master paket.</p>
                ) : (
                  masterPackages.map(mp => (
                    <div key={mp.id} className="p-3.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-sm text-[#1e1b15]">{mp.nama_paket}</div>
                        <div className="text-[#514440] font-medium">
                          Item A: <strong className="text-[#7d5141]">{mp.item_a_name}</strong> ({mp.item_a_kuota} Sesi)
                          {mp.item_b_name && (
                            <span className="ml-2">| Item B: <strong className="text-[#7d5141]">{mp.item_b_name}</strong> ({mp.item_b_kuota} Sesi)</span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                          Harga Standard: Rp {(mp.harga_paket || 0).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMasterPkg(mp.id, mp.nama_paket)}
                        className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Form Add New Master Template */}
            <form onSubmit={handleCreateMasterPkg} className="pt-3 border-t border-[#e5ded4] space-y-3 text-xs">
              <h4 className="font-bold text-xs text-[#7d5141] uppercase">+ Tambah Master Template Paket Baru</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Nama Paket *</label>
                  <input
                    type="text"
                    required
                    value={newMasterNama}
                    onChange={(e) => setNewMasterNama(e.target.value)}
                    placeholder="e.g. Ultimate 3 / Botox..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Harga Paket Standard (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newMasterHarga}
                    onChange={(e) => setNewMasterHarga(e.target.value)}
                    placeholder="2500000..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Nama Item A *</label>
                  <input
                    type="text"
                    required
                    value={newMasterItemA}
                    onChange={(e) => setNewMasterItemA(e.target.value)}
                    placeholder="e.g. Tindakan Dokter A..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Kuota Item A (Sesi)</label>
                  <input
                    type="number"
                    min="1"
                    value={newMasterKuotaA}
                    onChange={(e) => setNewMasterKuotaA(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Nama Item B (Opsional)</label>
                  <input
                    type="text"
                    value={newMasterItemB}
                    onChange={(e) => setNewMasterItemB(e.target.value)}
                    placeholder="e.g. Facial..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Kuota Item B (Sesi)</label>
                  <input
                    type="number"
                    min="0"
                    value={newMasterKuotaB}
                    onChange={(e) => setNewMasterKuotaB(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                + Simpan Master Template Paket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORI KLAIM PAKET */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15] flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-700" />
                  <span>Historical Klaim Paket Treatment Pasien</span>
                </h3>
                <p className="text-xs text-[#83746f]">Rekap riwayat kapan pasien mengambil/ngeklaim paket treatment kuota.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPackageLogs}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
                <button onClick={() => setShowLogsModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5ded4] overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                    <tr>
                      <th className="py-2.5 px-3 whitespace-nowrap">Tanggal & Jam Klaim</th>
                      <th className="py-2.5 px-3">Nama Pasien</th>
                      <th className="py-2.5 px-3">Nama Paket</th>
                      <th className="py-2.5 px-3">Item / Porsi Klaim</th>
                      <th className="py-2.5 px-3">Petugas Assigned</th>
                      <th className="py-2.5 px-3">FO Penginput</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5ded4]">
                    {packageLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-gray-400 italic">Belum ada riwayat pengeklaiman paket.</td>
                      </tr>
                    ) : (
                      packageLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#fff8f0]">
                          <td className="py-2.5 px-3 font-semibold text-[#1e1b15] whitespace-nowrap">
                            {log.used_at ? new Date(log.used_at).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#7d5141]">
                            {log.pasien_nama} ({log.pasien_hp})
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#1e1b15]">
                            {log.nama_paket}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">
                              {log.item_claimed}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#514440]">
                            {log.petugas_nama || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">
                            {log.user_fo_nama || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REKAP MARKETING 10K */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15] flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-700" />
                  <span>Rekap Data Pasien Trial & Komisi Marketing (10K / Pasien)</span>
                </h3>
                <p className="text-xs text-[#83746f]">Menampilkan berapa data trial yang didapatkan masing-masing user marketing dan total komisinya.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMarketingRecap}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
                <button onClick={() => setShowMarketingModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e5ded4] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-2.5 px-3">No.</th>
                    <th className="py-2.5 px-3">Nama Marketing</th>
                    <th className="py-2.5 px-3">Role / Lini</th>
                    <th className="py-2.5 px-3 text-center">Jml Pasien Trial Selesai</th>
                    <th className="py-2.5 px-3 text-right">Total Komisi (Rp 10.000 / Pasien)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {marketingRecap.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-gray-400 italic">Belum ada data pencapaian marketing.</td>
                    </tr>
                  ) : (
                    marketingRecap.map((m, idx) => (
                      <tr key={m.marketing_id || idx} className="hover:bg-[#fff8f0]">
                        <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-[#1e1b15]">{m.marketing_nama}</td>
                        <td className="py-2.5 px-3 text-[#83746f]">{m.marketing_role || 'Marketing'}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-800">{m.total_trial_count || 0} Pasien</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono text-sm">
                          Rp {(m.total_komisi_marketing || 0).toLocaleString('id-ID')}
                        </td>
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
  );
}
