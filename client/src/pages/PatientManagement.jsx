import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { exportStyledExcel, formatMonthYearLabel } from '../utils/excelExport';
import { AuthContext } from '../context/AuthContext';
import {
  UserPlus, Search, Edit, Trash2, Download, Package, Calendar,
  AlertTriangle, CheckCircle, ShieldAlert, FileSpreadsheet, UserCheck,
  Clock, RefreshCw, Sparkles, Stethoscope, Users, CheckCircle2, UserPlus2, History, Database,
  ShoppingCart, X, ChevronLeft, ChevronRight, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatPersonName } from '../utils/formatters';

export default function PatientManagement({
  mode = 'INTAKE',
  setActiveTab,
  autoOpenNewPatient = false,
  setAutoOpenNewPatient,
  autoOpenRepeatVisit = false,
  setAutoOpenRepeatVisit
}) {
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
  const [dateFilterMode, setDateFilterMode] = useState('TODAY'); // 'TODAY' | 'MONTH' | 'ALL' | 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
  const [isAssignPackageOpen, setIsAssignPackageOpen] = useState(false);

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

  // Member Registration Package Selection State
  const [selectedRegPackages, setSelectedRegPackages] = useState([]);
  const [isBuyingPackage, setIsBuyingPackage] = useState(false);

  // Migration from Trial to Member Package Modal State
  const [migratedPatient, setMigratedPatient] = useState(null);
  const [showMigrationPackageModal, setShowMigrationPackageModal] = useState(false);
  const [selectedMigrationPackages, setSelectedMigrationPackages] = useState([]);
  const [submittingMigrationPkg, setSubmittingMigrationPkg] = useState(false);

  // Claim Modal State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showClaimBothModal, setShowClaimBothModal] = useState(false);
  const [selectedClaimPkg, setSelectedClaimPkg] = useState(null);
  const [claimItemKey, setClaimItemKey] = useState('A');
  const [claimStaffId, setClaimStaffId] = useState('');
  const [claimBothBtcStaffId, setClaimBothBtcStaffId] = useState('');
  const [claimBothNurseStaffId, setClaimBothNurseStaffId] = useState('');
  const [claimBothNotes, setClaimBothNotes] = useState('');
  const [btcStaffList, setBtcStaffList] = useState([]);
  const [nurseStaffList, setNurseStaffList] = useState([]);
  const [claimNotes, setClaimNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [packageLogs, setPackageLogs] = useState([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Historical Package Claim Page Filter State
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStartDate, setClaimStartDate] = useState('');
  const [claimEndDate, setClaimEndDate] = useState('');
  const [claimCategory, setClaimCategory] = useState('ALL');

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

  const toggleRegPackage = (pkg) => {
    setSelectedRegPackages(prev => {
      const exists = prev.some(p => p.id === pkg.id);
      if (exists) {
        return prev.filter(p => p.id !== pkg.id);
      } else {
        return [...prev, pkg];
      }
    });
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
    setSelectedRegPackages([]);
    setIsBuyingPackage(false);
    setKebutuhanLayanan('Beautician');
    setSelectedStaffId('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowModal(true);
    fetchStaffAvailability('Beautician');
  };

  useEffect(() => {
    if (autoOpenNewPatient) {
      openNewPatientModal();
      if (setAutoOpenNewPatient) setAutoOpenNewPatient(false);
    }
  }, [autoOpenNewPatient]);

  useEffect(() => {
    if (autoOpenRepeatVisit) {
      setRepeatSearch('');
      setShowRepeatVisitModal(true);
      if (setAutoOpenRepeatVisit) setAutoOpenRepeatVisit(false);
    }
  }, [autoOpenRepeatVisit]);

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
    setSelectedRegPackages([]);
    setIsBuyingPackage(false);
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
    setSelectedRegPackages([]);
    setIsBuyingPackage(false);
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

      // Langsung munculkan modal pemilihan paket yang dibeli pasien
      setMigratedPatient(patient);
      setSelectedMigrationPackages([]);
      setShowMigrationPackageModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status pasien');
    }
  };

  const handleConfirmMigrationPackages = async () => {
    if (!migratedPatient) return;
    if (selectedMigrationPackages.length === 0) {
      alert('Silakan pilih minimal 1 paket treatment yang dibeli oleh pasien member!');
      return;
    }

    setSubmittingMigrationPkg(true);
    try {
      await axios.post(`/api/pasien/${migratedPatient.id}/paket`, {
        packages: selectedMigrationPackages,
        marketing_id: migratedPatient.marketing_id || null
      });
      const totalNominal = selectedMigrationPackages.reduce((sum, p) => sum + (Number(p.harga_paket) || 0), 0);
      alert(`Berhasil! ${selectedMigrationPackages.length} paket telah ditambahkan ke pasien "${migratedPatient.nama_lengkap}". Tagihan sebesar Rp ${totalNominal.toLocaleString('id-ID')} langsung diteruskan ke Kasir POS.`);
      setShowMigrationPackageModal(false);
      setMigratedPatient(null);
      setSelectedMigrationPackages([]);
      fetchPatients();
      fetchTodayDoingan();
      if (setActiveTab) {
        setActiveTab('pos');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan paket pembelian');
    } finally {
      setSubmittingMigrationPkg(false);
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

  // Master Data Pelanggan (Raw) Expanded List & Export
  const rawMasterList = [];
  patients.forEach(p => {
    const isMember = p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler';
    const hadTrial = p.initial_tipe_pasien === 'TRIAL' || p.has_trial_history === 1 || p.tipe_pasien === 'TRIAL';

    // 1. Trial History Entry (if patient arrived as Trial or has trial history)
    if (hadTrial) {
      rawMasterList.push({
        raw_id: `${p.id}-trial`,
        patient_id: p.id,
        nama_lengkap: p.nama_lengkap,
        no_hp: p.no_hp,
        no_ktp: p.no_ktp,
        created_at: p.created_at,
        tipe_kedatangan: 'TRIAL',
        status_saat_ini: isMember ? 'MEMBER (MIGRASI DARI TRIAL)' : 'TRIAL',
        marketing_nama: p.marketing_nama,
        referrer_nama: p.referrer_nama,
        original_patient: p
      });
    }

    // 2. Member Entry (if patient is currently Member)
    if (isMember) {
      rawMasterList.push({
        raw_id: `${p.id}-member`,
        patient_id: p.id,
        nama_lengkap: p.nama_lengkap,
        no_hp: p.no_hp,
        no_ktp: p.no_ktp,
        created_at: p.updated_at || p.created_at,
        tipe_kedatangan: 'MEMBER',
        status_saat_ini: p.has_trial_history === 1 ? 'MEMBER (MIGRASI DARI TRIAL)' : 'MEMBER',
        marketing_nama: p.marketing_nama,
        referrer_nama: p.referrer_nama,
        original_patient: p
      });
    }
  });

  const availableMonths = Array.from(new Set(
    rawMasterList
      .filter(item => item.created_at)
      .map(item => item.created_at.slice(0, 7))
  )).sort().reverse();

  const filteredRawPatients = rawMasterList.filter(item => {
    const searchLower = rawSearch.toLowerCase();
    const matchSearch = !rawSearch ||
      (item.nama_lengkap && item.nama_lengkap.toLowerCase().includes(searchLower)) ||
      (item.no_hp && item.no_hp.includes(rawSearch)) ||
      (item.no_ktp && item.no_ktp.includes(rawSearch)) ||
      (item.marketing_nama && item.marketing_nama.toLowerCase().includes(searchLower));

    let matchMonth = true;
    if (rawMonthFilter !== 'ALL' && item.created_at) {
      const itemMonth = item.created_at.slice(0, 7);
      matchMonth = (itemMonth === rawMonthFilter);
    }

    let matchType = true;
    if (rawTypeFilter === 'TRIAL') {
      matchType = (item.tipe_kedatangan === 'TRIAL');
    } else if (rawTypeFilter === 'MEMBER') {
      matchType = (item.tipe_kedatangan === 'MEMBER');
    }

    return matchSearch && matchMonth && matchType;
  });

  const handleExportRawMasterExcel = () => {
    if (!canExportExcel) {
      alert('Akses Terbatas: Anda tidak memiliki wewenang export data.');
      return;
    }
    const exportData = filteredRawPatients.map((item, index) => {
      return {
        'No.': index + 1,
        'Tgl Registrasi / Intake': item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-',
        'Nama Pasien': item.nama_lengkap,
        'No. Handphone': item.no_hp,
        'No. KTP': item.no_ktp || '-',
        'Tipe Kedatangan': item.tipe_kedatangan,
        'Status Saat Ini': item.status_saat_ini,
        'Marketing Intake': item.marketing_nama || '-',
        'Referrer Pasien': item.referrer_nama || '-'
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

    if (!editMode && !isBuyingPackage && !selectedStaffId) {
      setErrorMessage('Silakan pilih Petugas Bertugas (Beautician / Nurse) untuk menangani treatment pasien hari ini.');
      return;
    }

    if (!editMode && isBuyingPackage && selectedRegPackages.length === 0) {
      setErrorMessage('Mode Beli Paket aktif: Silakan pilih minimal 1 paket treatment yang dibeli.');
      return;
    }

    let patientIdToAssign = null;
    let targetPatientName = namaLengkap;

    try {
      if (editMode && selectedPatient) {
        if (!noHp || !namaLengkap) {
          setErrorMessage('Nama Lengkap dan No. Handphone wajib diisi');
          return;
        }
        const formattedNama = formatPersonName(namaLengkap);
        const payload = {
          no_ktp: noKtp || null,
          no_hp: noHp,
          nama_lengkap: formattedNama,
          // Preserve tipe_pasien asli dan data lainnya agar tidak berubah
          tipe_pasien: selectedPatient.tipe_pasien,
          alamat: selectedPatient.alamat,
          tgl_lahir: selectedPatient.tgl_lahir,
          riwayat_alergi: selectedPatient.riwayat_alergi,
          jenis_kulit: selectedPatient.jenis_kulit,
          rekomendasi_dokter: selectedPatient.rekomendasi_dokter,
          marketing_id: selectedPatient.marketing_id,
          referrer_pasien_id: selectedPatient.referrer_pasien_id,
        };
        await axios.put(`/api/pasien/${selectedPatient.id}`, payload);
        setSuccessMessage('Data pasien (Nama, No HP, NIK) berhasil diperbarui!');
        fetchPatients();
        fetchTodayDoingan();
        setTimeout(() => {
          setShowModal(false);
          setEditMode(false);
          setSelectedPatient(null);
        }, 1200);
        return;
      } else if (modePendaftaran === 'NEW') {
        if (!noHp || !namaLengkap) {
          setErrorMessage('Nama Lengkap dan No. Handphone wajib diisi');
          return;
        }
        if (!marketingId) {
          setErrorMessage('Tim Marketing wajib dipilih untuk pendaftaran pasien baru.');
          return;
        }
        const formattedNama = formatPersonName(namaLengkap);
        const payload = {
          no_ktp: noKtp || null,
          no_hp: noHp,
          nama_lengkap: formattedNama,
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
        targetPatientName = res.data.pasien?.nama_lengkap || formattedNama;
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

      // Save purchased packages if member selected packages
      if ((formType === 'MEMBER' || formType === 'NON-TRIAL') && isBuyingPackage && selectedRegPackages.length > 0 && patientIdToAssign) {
        await axios.post(`/api/pasien/${patientIdToAssign}/paket`, {
          packages: selectedRegPackages,
          marketing_id: marketingId || null
        });
        setSelectedRegPackages([]);
      }

      // Live Assignment process ONLY if not buying package and staff selected
      if (!isBuyingPackage && selectedStaffId && patientIdToAssign) {
        const selectedStaffObj = staffList.find(s => s.id === selectedStaffId);
        const katName = kebutuhanLayanan === 'Nurse' ? 'Tindakan Medis (Nurse)' : 'Facial (Beautician)';

        await axios.post('/api/doingan/assign', {
          pasien_id: patientIdToAssign,
          petugas_id: selectedStaffId,
          kategori_layanan: katName,
          marketing_id: marketingId || null
        });

        setSuccessMessage(`Berhasil! Pasien ${targetPatientName} di-assign ke ${selectedStaffObj?.full_name || 'Petugas'}. Sesi otomatis IN_PROGRESS!`);
      } else if (isBuyingPackage) {
        setSuccessMessage(`Berhasil! Pendaftaran member & pembelian paket untuk ${targetPatientName} sukses. Tagihan paket telah diteruskan ke Kasir POS!`);
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
      const patientPkgs = res.data || [];
      setPackages(patientPkgs);
      // Jika pasien belum punya paket sama sekali, otomatis buka form tambah paket
      setIsAssignPackageOpen(patientPkgs.length === 0);
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
    if (!selectedPatient || !namaPaket || !namaPaket.trim()) return;

    let aName = itemAName ? itemAName.trim() : '';
    let aKuota = Number(itemAKuota) || 0;
    let bName = itemBName ? itemBName.trim() : '';
    let bKuota = Number(itemBKuota) || 0;

    const hasA = aName && aKuota > 0;
    const hasB = bName && bKuota > 0;

    if (!hasA && !hasB) {
      alert('Mohon isi minimal 1 Item Tindakan/Perawatan (Tindakan Dokter A atau Facial B) dengan kuota sesi minimal 1!');
      return;
    }

    try {
      await axios.post(`/api/pasien/${selectedPatient.id}/paket`, {
        nama_paket: namaPaket.trim(),
        item_a_name: hasA ? aName : '',
        item_a_kuota: hasA ? aKuota : 0,
        item_b_name: hasB ? bName : '',
        item_b_kuota: hasB ? bKuota : 0,
        harga_paket: Number(hargaPaket) || 0
      });
      const res = await axios.get(`/api/pasien/${selectedPatient.id}/paket`);
      const patientPkgs = res.data || [];
      setPackages(patientPkgs);
      setIsAssignPackageOpen(false); // Collapse form after successfully adding package
      alert(`Paket treatment "${namaPaket}" berhasil ditambahkan ke pasien!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan paket');
    }
  };

  const handleDeletePatientPackage = async (paketId, namaPaket) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus paket "${namaPaket}" dari pasien ini?\n\nSeluruh riwayat kuota paket ini akan dibersihkan dari sistem.`)) {
      return;
    }
    try {
      await axios.delete(`/api/pasien/paket/${paketId}`);
      alert(`Paket "${namaPaket}" berhasil dihapus!`);
      if (selectedPatient) {
        const res = await axios.get(`/api/pasien/${selectedPatient.id}/paket`);
        setPackages(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus paket pasien');
    }
  };

  const handleCreateMasterPkg = async (e) => {
    e.preventDefault();
    if (!newMasterNama || !newMasterNama.trim()) {
      alert('Nama Paket wajib diisi!');
      return;
    }

    let itemA = newMasterItemA ? newMasterItemA.trim() : '';
    let kuotaA = Number(newMasterKuotaA) || 0;
    let itemB = newMasterItemB ? newMasterItemB.trim() : '';
    let kuotaB = Number(newMasterKuotaB) || 0;

    const hasA = itemA && kuotaA > 0;
    const hasB = itemB && kuotaB > 0;

    if (!hasA && !hasB) {
      alert('Mohon isi minimal 1 Item Tindakan/Perawatan (Tindakan Dokter A atau Facial BTC B) dengan kuota sesi minimal 1!');
      return;
    }

    try {
      await axios.post('/api/master-paket', {
        nama_paket: newMasterNama.trim(),
        item_a_name: hasA ? itemA : '',
        item_a_kuota: hasA ? kuotaA : 0,
        item_b_name: hasB ? itemB : '',
        item_b_kuota: hasB ? kuotaB : 0,
        harga_paket: Number(newMasterHarga) || 0
      });
      alert('Master Template Paket berhasil ditambahkan!');
      fetchMasterPackages();
      setNewMasterNama('');
      setNewMasterItemA('');
      setNewMasterKuotaA(3);
      setNewMasterItemB('');
      setNewMasterKuotaB(0);
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

  const openClaimBothModal = async (pkg) => {
    setSelectedClaimPkg(pkg);
    setClaimBothBtcStaffId('');
    setClaimBothNurseStaffId('');
    setClaimBothNotes('');
    try {
      const [btcRes, nurseRes] = await Promise.all([
        axios.get('/api/staff-availability?lini=Beautician'),
        axios.get('/api/staff-availability?lini=Nurse')
      ]);
      setBtcStaffList(btcRes.data || []);
      setNurseStaffList(nurseRes.data || []);
    } catch (err) {
      console.error('Error fetching staff lists for claim both', err);
    }
    setShowClaimBothModal(true);
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

  const handleProcessClaimBoth = async (e) => {
    e.preventDefault();
    if (!selectedClaimPkg || !claimBothBtcStaffId || !claimBothNurseStaffId) {
      alert('Pilih kedua petugas (Beautician dan Nurse bertugas)!');
      return;
    }
    setSubmittingClaim(true);
    try {
      const res = await axios.post(`/api/pasien/paket/${selectedClaimPkg.id}/claim-both`, {
        petugas_btc_id: claimBothBtcStaffId,
        petugas_nurse_id: claimBothNurseStaffId,
        notes: claimBothNotes
      });
      alert(res.data.message);
      setShowClaimBothModal(false);
      const updated = await axios.get(`/api/pasien/${selectedPatient.id}/paket`);
      setPackages(updated.data);
      fetchPackageUsageLogs();
      fetchTodayDoingan();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses klaim kedua paket');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const filteredPackageLogs = packageLogs.filter(log => {
    if (claimSearch.trim()) {
      const term = claimSearch.toLowerCase();
      const match =
        (log.pasien_nama || '').toLowerCase().includes(term) ||
        (log.pasien_hp || '').includes(term) ||
        (log.nama_paket || '').toLowerCase().includes(term) ||
        (log.item_claimed || '').toLowerCase().includes(term) ||
        (log.petugas_nama || '').toLowerCase().includes(term) ||
        (log.doingan_nama_tindakan || '').toLowerCase().includes(term) ||
        (log.notes || '').toLowerCase().includes(term);
      if (!match) return false;
    }
    if (claimStartDate) {
      const logDate = log.used_at ? log.used_at.slice(0, 10) : '';
      if (logDate < claimStartDate) return false;
    }
    if (claimEndDate) {
      const logDate = log.used_at ? log.used_at.slice(0, 10) : '';
      if (logDate > claimEndDate) return false;
    }
    if (claimCategory === 'DOKTER') {
      const itm = (log.item_claimed || '').toLowerCase();
      if (!itm.includes('dokter') && !itm.includes('medis')) return false;
    } else if (claimCategory === 'FACIAL') {
      const itm = (log.item_claimed || '').toLowerCase();
      if (!itm.includes('facial') && !itm.includes('care')) return false;
    }
    return true;
  });

  const handleExportPackageLogs = async () => {
    const dataToExport = filteredPackageLogs.length > 0 ? filteredPackageLogs : packageLogs;
    if (dataToExport.length === 0) {
      alert('Belum ada histori klaim paket untuk diexport');
      return;
    }

    const monthLabel = formatMonthYearLabel(claimStartDate, claimEndDate);
    const data = dataToExport.map((log, index) => {
      let detail = log.item_claimed || '-';
      if (log.doingan_status === 'COMPLETED' && log.doingan_nama_tindakan) {
        detail = log.doingan_nama_tindakan;
      } else if (log.notes && !log.notes.startsWith('Klaim paket') && !log.notes.startsWith('Klaim Kuota')) {
        detail = log.notes;
      } else if (log.doingan_nama_tindakan && !log.doingan_nama_tindakan.startsWith('[')) {
        detail = log.doingan_nama_tindakan;
      }
      return {
        no: index + 1,
        used_at: log.used_at ? new Date(log.used_at).toLocaleString('id-ID') : '-',
        pasien_nama: log.pasien_nama ? `${log.pasien_nama} (${log.pasien_hp || '-'})` : '-',
        nama_paket: log.nama_paket || '-',
        item_claimed: log.item_claimed || '-',
        petugas_nama: log.petugas_nama || '-',
        detail,
        status: log.doingan_status === 'COMPLETED' ? 'SELESAI' : 'IN PROGRESS'
      };
    });

    await exportStyledExcel({
      fileName: `Histori_Klaim_Paket_DEFLOW_${new Date().toISOString().split('T')[0]}`,
      sheets: [
        {
          name: 'Histori Klaim Paket',
          title: `DATA DEFLOW AESTHETIC CLINIC ${monthLabel}`,
          subtitle: `HISTORIKAL PENGGUNAAN & KLAIM PAKET TREATMENT PASIEN`,
          columns: [
            { header: 'No', key: 'no', width: 6, alignment: 'center' },
            { header: 'Waktu Klaim', key: 'used_at', width: 20, alignment: 'center' },
            { header: 'Nama Pasien', key: 'pasien_nama', width: 26 },
            { header: 'Nama Paket', key: 'nama_paket', width: 22 },
            { header: 'Item / Porsi Klaim', key: 'item_claimed', width: 24 },
            { header: 'Petugas Bertugas', key: 'petugas_nama', width: 22 },
            { header: 'Detail Tindakan', key: 'detail', width: 28 },
            { header: 'Status Sesi', key: 'status', width: 16, alignment: 'center' }
          ],
          data
        }
      ]
    });
  };

  const handleExportMarketingRecap = async () => {
    if (marketingRecap.length === 0) {
      alert('Belum ada data rekap marketing untuk diexport');
      return;
    }

    const monthLabel = formatMonthYearLabel();
    let grandTotalPasien = 0;
    let grandTotalTrial = 0;
    let grandTotalMember = 0;
    let grandTotalKomisi = 0;

    const data = marketingRecap.map((m, index) => {
      grandTotalPasien += Number(m.total_pasien_count || 0);
      grandTotalTrial += Number(m.total_trial_count || 0);
      grandTotalMember += Number(m.total_member_count || 0);
      grandTotalKomisi += Number(m.total_komisi_marketing || 0);

      return {
        no: index + 1,
        nama: m.marketing_nama || '-',
        role: m.marketing_role || 'Marketing',
        total_pasien: Number(m.total_pasien_count) || 0,
        trial: Number(m.total_trial_count) || 0,
        member: Number(m.total_member_count) || 0,
        tier: m.tier_label || (m.rate_per_pasien ? `Rp ${m.rate_per_pasien.toLocaleString('id-ID')} / Pasien` : '-'),
        komisi: Number(m.total_komisi_marketing) || 0
      };
    });

    await exportStyledExcel({
      fileName: `Rekap_Komisi_Marketing_DEFLOW_${new Date().toISOString().split('T')[0]}`,
      sheets: [
        {
          name: 'Rekap Komisi Marketing',
          title: `DATA DEFLOW AESTHETIC CLINIC ${monthLabel}`,
          subtitle: `REKAPITULASI KOMISI & PEROLEHAN PASIEN TIM MARKETING`,
          columns: [
            { header: 'No', key: 'no', width: 6, alignment: 'center' },
            { header: 'Nama Marketing', key: 'nama', width: 24 },
            { header: 'Role / Divisi', key: 'role', width: 16 },
            { header: 'Total Pasien', key: 'total_pasien', width: 14, isNumber: true },
            { header: 'Pasien Trial', key: 'trial', width: 14, isNumber: true },
            { header: 'Pasien Member', key: 'member', width: 14, isNumber: true },
            { header: 'Skema / Tier Tarif', key: 'tier', width: 20, alignment: 'center' },
            { header: 'Total Komisi (Rp)', key: 'komisi', width: 20, isCurrency: true }
          ],
          data,
          summaryRow: {
            no: '',
            nama: 'TOTAL KESELURUHAN',
            role: '',
            total_pasien: grandTotalPasien,
            trial: grandTotalTrial,
            member: grandTotalMember,
            tier: '',
            komisi: grandTotalKomisi
          }
        }
      ]
    });
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

  const getLocalMonthString = (dStr) => {
    const d = dStr ? new Date(dStr) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const todayStr = getLocalDateString();
  const currentMonthStr = getLocalMonthString();

  // Filter master patients for Database view & search modal
  const filteredPatients = patients.filter(p => {
    const matchSearch = (p.nama_lengkap || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.no_hp || '').includes(search) ||
      (p.no_ktp && p.no_ktp.includes(search));
    const matchFilter = filterType === 'ALL' ||
      (filterType === 'TRIAL' && (p.tipe_pasien === 'TRIAL' || p.has_trial_history === 1)) ||
      (filterType === 'MEMBER' && (p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler'));

    let matchDate = true;
    if (dateFilterMode === 'TODAY') {
      const pDate = p.created_at ? getLocalDateString(p.created_at) : '';
      matchDate = pDate === todayStr;
    } else if (dateFilterMode === 'MONTH') {
      const pMonth = p.created_at ? getLocalMonthString(p.created_at) : '';
      matchDate = pMonth === currentMonthStr;
    } else if (dateFilterMode === 'CUSTOM') {
      const pDate = p.created_at ? getLocalDateString(p.created_at) : '';
      matchDate = pDate === customDate;
    } else if (dateFilterMode === 'ALL') {
      matchDate = true;
    }

    return matchSearch && matchFilter && matchDate;
  });

  const totalPages = Math.ceil(filteredPatients.length / pageSize) || 1;
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filter existing patients for repeat visit lookup modal
  const matchedRepeatPatients = patients.filter(p => {
    if (!repeatSearch.trim()) return true;
    const term = repeatSearch.toLowerCase();
    return (p.nama_lengkap || '').toLowerCase().includes(term) ||
      (p.no_hp || '').includes(term) ||
      (p.no_ktp && p.no_ktp.includes(term));
  });

  // Active intake queue today (exclude patients whose treatment is completed AND billing finished, cancelled patients, and exclude Marketing referral records)
  const activeTodayQueue = todayDoinganList.filter(d =>
    !(d.status_pengerjaan === 'COMPLETED' && d.is_billed === 1) &&
    d.status_pengerjaan !== 'CANCELLED' &&
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
                : viewMode === 'HISTORICAL_KLAIM'
                  ? 'Historical Klaim Paket Treatment Pasien'
                  : 'Detail Data Pelanggan'}
          </h1>
          <p className="text-xs text-[#514440]">
            {viewMode === 'INTAKE'
              ? 'Menu pendaftaran pasien baru, intake kunjungan berulang pasien lama, serta antrean treatment aktif hari ini.'
              : viewMode === 'RAW_MASTER'
                ? 'Database mentah pencatatan awal kedatangan seluruh pelanggan. Data kedatangan Trial tersimpan utuh dan tidak terpengaruh migrasi Member.'
                : viewMode === 'HISTORICAL_KLAIM'
                  ? 'Rekap riwayat kapan pasien mengambil/ngeklaim paket treatment kuota secara komprehensif.'
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
                Pilih opsi pendaftaran untuk pasien baru atau pencarian data pasien lama.
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
                    <th className="py-3 px-4">Petugas</th>
                    <th className="py-3 px-4">Status Pengerjaan</th>
                    <th className="py-3 px-4 text-center">Tindakan Selesai</th>
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
                                Sedang Ditangani
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                                Selesai (Antrian Kasir)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isInProgress ? (
                              <span className="text-[11px] text-gray-400 italic">Ditangani di Portal Petugas</span>
                            ) : (
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {d.tipe_pasien === 'TRIAL' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const patientObj = patients.find(p => p.id === d.pasien_id) || {
                                        id: d.pasien_id,
                                        nama_lengkap: d.pasien_nama,
                                        no_hp: d.pasien_hp,
                                        tipe_pasien: d.tipe_pasien,
                                        marketing_id: d.marketing_id
                                      };
                                      handleUpgradeToMember(patientObj);
                                    }}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                    title="Ubah Status Pasien ke Member & Beli Paket Treatment"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Ubah ke Member</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (setActiveTab) setActiveTab('pos');
                                  }}
                                  className="px-3 py-1.5 bg-[#514440] hover:bg-[#333029] text-white font-bold rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                >
                                  <span>Ke Kasir POS →</span>
                                </button>
                              </div>
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

              <span className="text-[#83746f] font-semibold ml-1">Kedatangan:</span>
              <button
                onClick={() => setRawTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${rawTypeFilter === 'ALL' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
              >
                Semua Kedatangan ({rawMasterList.length})
              </button>
              <button
                onClick={() => setRawTypeFilter('TRIAL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${rawTypeFilter === 'TRIAL' ? 'bg-amber-700 text-white shadow-xs' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}
              >
                Trial ({rawMasterList.filter(item => item.tipe_kedatangan === 'TRIAL').length})
              </button>
              <button
                onClick={() => setRawTypeFilter('MEMBER')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${rawTypeFilter === 'MEMBER' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}
              >
                Member ({rawMasterList.filter(item => item.tipe_kedatangan === 'MEMBER').length})
              </button>

              {canExportExcel && (
                <button
                  onClick={handleExportRawMasterExcel}
                  className="ml-1 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Export Master Data Mentah Pelanggan ke Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
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
                    filteredRawPatients.map(item => (
                      <tr key={item.raw_id} className="hover:bg-[#fff8f0] transition-colors">
                        <td className="py-3.5 px-4 text-[#83746f] font-medium whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#1e1b15] text-sm">
                          {item.nama_lengkap}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#1e1b15]">{item.no_hp}</div>
                          {item.no_ktp && <div className="text-[10px] text-[#83746f]">NIK: {item.no_ktp}</div>}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.tipe_kedatangan === 'TRIAL' ? (
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
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${item.status_saat_ini.includes('MIGRASI')
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                            : item.status_saat_ini === 'MEMBER'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                            {item.status_saat_ini}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#1e1b15]">{item.marketing_nama || '-'}</div>
                          {item.referrer_nama && <div className="text-[10px] text-indigo-700 font-medium">Referred by: {item.referrer_nama}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(item.original_patient)}
                              className="px-2.5 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] text-[#7d5141] border border-[#d6c2bd] font-semibold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                              title="Edit Profil Pasien"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
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
        </div>
      )}

      {/* VIEW MODE 3: DETAIL DATA PELANGGAN */}
      {(viewMode === 'DETAIL' || viewMode === 'MASTER') && (
        <div className="space-y-6">
          {/* Master Controls & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-3">
            {/* Top Bar: Left (Search & Date Filter), Right (Tipe Filter) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* LEFT SIDE: Cari & Filter Tanggal (Hari Ini, Bulan Ini, Semua, Date Picker) */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter Nama */}
                <div className="relative w-full sm:w-60">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#83746f]">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari NIK, No. HP, atau Nama Pasien..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  />
                </div>

                {/* Filter Tanggal */}
                <div className="flex flex-wrap items-center gap-1 bg-[#faf3e8] p-1 border border-[#d6c2bd] rounded-xl text-xs">
                  {/* Tgl Hari Ini */}
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode('TODAY');
                      setCustomDate('');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${dateFilterMode === 'TODAY'
                      ? 'bg-[#7d5141] text-white shadow-xs'
                      : 'text-[#514440] hover:bg-[#eee7dd]'
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Terdaftar Hari Ini</span>
                  </button>

                  {/* Bulan Ini */}
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode('MONTH');
                      setCustomDate('');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${dateFilterMode === 'MONTH'
                      ? 'bg-[#7d5141] text-white shadow-xs'
                      : 'text-[#514440] hover:bg-[#eee7dd]'
                      }`}
                  >
                    Bulan Ini
                  </button>

                  {/* Semua */}
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode('ALL');
                      setCustomDate('');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${dateFilterMode === 'ALL'
                      ? 'bg-[#7d5141] text-white shadow-xs'
                      : 'text-[#514440] hover:bg-[#eee7dd]'
                      }`}
                  >
                    Semua
                  </button>

                  {/* Date Pick */}
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateFilterMode(e.target.value ? 'CUSTOM' : 'ALL');
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 border rounded-lg text-xs font-semibold ${dateFilterMode === 'CUSTOM'
                      ? 'bg-white border-[#7d5141] text-[#7d5141] font-bold'
                      : 'bg-white border-[#d6c2bd] text-[#1e1b15]'
                      }`}
                  />
                </div>
              </div>

              {/* RIGHT SIDE: Filter Tipe */}
              <div className="flex flex-wrap items-center justify-start lg:justify-end gap-1.5 text-xs">
                <span className="text-[#83746f] font-semibold">Tipe:</span>
                <button
                  onClick={() => {
                    setFilterType('ALL');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'ALL' ? 'bg-[#7d5141] text-white' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
                >
                  Semua ({patients.length})
                </button>
                <button
                  onClick={() => {
                    setFilterType('TRIAL');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'TRIAL' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}
                >
                  Trial & Riwayat ({patients.filter(p => p.tipe_pasien === 'TRIAL' || p.has_trial_history === 1).length})
                </button>
                <button
                  onClick={() => {
                    setFilterType('MEMBER');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'MEMBER' || filterType === 'NON-TRIAL' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}
                >
                  Member ({patients.filter(p => p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler').length})
                </button>
              </div>
            </div>

            {/* Bottom Right: Export Excel */}
            {canExportExcel && (
              <div className="flex justify-end pt-2 border-t border-[#f0e8dd]">
                <button
                  onClick={handleExportExcel}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Export master data pasien ke Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
              </div>
            )}
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
                    paginatedPatients.map(p => {
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

                            {isMember && (
                              <button
                                onClick={() => openPackageModal(p)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold rounded-lg text-[11px] cursor-pointer inline-flex items-center gap-1"
                                title="Kelola Paket Treatment Member"
                              >
                                <Package className="w-3.5 h-3.5" />
                                <span>Paket</span>
                              </button>
                            )}

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

            {/* Pagination Controls */}
            {filteredPatients.length > 0 && (
              <div className="p-3.5 bg-[#faf3e8]/70 border-t border-[#e5ded4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-[#83746f] font-medium">
                  Menampilkan <span className="font-bold text-[#1e1b15]">{((currentPage - 1) * pageSize) + 1}</span> - <span className="font-bold text-[#1e1b15]">{Math.min(currentPage * pageSize, filteredPatients.length)}</span> dari <span className="font-bold text-[#1e1b15]">{filteredPatients.length}</span> pasien
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-2.5 py-1.5 bg-white border border-[#d6c2bd] text-[#514440] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#eee7dd] transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, idx, arr) => {
                          const prevPage = arr[idx - 1];
                          return (
                            <React.Fragment key={page}>
                              {prevPage && page - prevPage > 1 && (
                                <span className="px-1 text-gray-400">...</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`w-7 h-7 rounded-lg font-bold transition-all cursor-pointer text-xs ${currentPage === page
                                  ? 'bg-[#7d5141] text-white shadow-xs'
                                  : 'bg-white border border-[#d6c2bd] text-[#514440] hover:bg-[#eee7dd]'
                                  }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-2.5 py-1.5 bg-white border border-[#d6c2bd] text-[#514440] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#eee7dd] transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 4: HISTORICAL KLAIM PAKET TREATMENT PASIEN (FULL PAGE) */}
      {viewMode === 'HISTORICAL_KLAIM' && (
        <div className="space-y-6">
          {/* Top Control Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (setActiveTab) setActiveTab('customer_database');
                  setViewMode('DETAIL');
                }}
                className="px-3.5 py-2 bg-[#faf3e8] hover:bg-[#f2e6d6] text-[#7d5141] border border-[#d6c2bd] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Kembali ke Detail Data Pelanggan"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke Pelanggan</span>
              </button>

              <div className="border-l border-[#e5ded4] pl-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-700" />
                  <h2 className="font-serif font-bold text-lg text-[#1e1b15]">
                    Historical Klaim Paket Treatment Pasien
                  </h2>
                </div>
                <p className="text-xs text-[#83746f]">
                  Rekap riwayat kapan dan porsi kuota apa yang telah diambil/diklaim oleh member.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchPackageUsageLogs()}
                className="px-3.5 py-2 bg-white hover:bg-[#fbf7f4] text-[#514440] border border-[#d6c2bd] font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Data</span>
              </button>

              <button
                type="button"
                onClick={handleExportPackageLogs}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel ({filteredPackageLogs.length})</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#e5ded4] shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#83746f]">Total Sesi Terklaim</div>
              <div className="text-2xl font-bold font-serif text-[#1e1b15] mt-1">{packageLogs.length}</div>
              <div className="text-[11px] text-[#83746f] mt-0.5">Keseluruhan klaim kuota paket</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#e5ded4] shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#83746f]">Member Unik</div>
              <div className="text-2xl font-bold font-serif text-[#7d5141] mt-1">
                {new Set(packageLogs.map(l => l.pasien_id || l.pasien_nama)).size}
              </div>
              <div className="text-[11px] text-[#83746f] mt-0.5">Pasien aktif klaim paket</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#e5ded4] shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#83746f]">Tindakan Dokter</div>
              <div className="text-2xl font-bold font-serif text-blue-700 mt-1">
                {packageLogs.filter(l => (l.item_claimed || '').toLowerCase().includes('dokter') || (l.item_claimed || '').toLowerCase().includes('medis')).length}
              </div>
              <div className="text-[11px] text-[#83746f] mt-0.5">Porsi sesi tindakan dokter</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#e5ded4] shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#83746f]">Facial & Perawatan</div>
              <div className="text-2xl font-bold font-serif text-amber-700 mt-1">
                {packageLogs.filter(l => (l.item_claimed || '').toLowerCase().includes('facial') || (l.item_claimed || '').toLowerCase().includes('care')).length}
              </div>
              <div className="text-[11px] text-[#83746f] mt-0.5">Porsi sesi beautician/facial</div>
            </div>
          </div>

          {/* Filters & Search Bar Card */}
          <div className="bg-white p-3.5 rounded-xl border border-[#e5ded4] shadow-xs">
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3">

              {/* Search Bar - Ukuran dibatasi agar tidak terlalu panjang */}
              <div className="relative w-full md:w-64 flex-none">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#83746f]">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Cari pasien, HP, paket..."
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#d6c2bd] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7d5141] bg-[#fff8f0]"
                />
              </div>

              {/* Range Tanggal - Menggabungkan label & input dalam 1 baris vertikal rapi */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#83746f] whitespace-nowrap">Dari:</span>
                  <input
                    type="date"
                    value={claimStartDate}
                    onChange={(e) => setClaimStartDate(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-[#d6c2bd] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7d5141] bg-[#fff8f0]"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#83746f] whitespace-nowrap">s/d</span>
                  <input
                    type="date"
                    value={claimEndDate}
                    onChange={(e) => setClaimEndDate(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-[#d6c2bd] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7d5141] bg-[#fff8f0]"
                  />
                </div>
              </div>

              {/* Filter Category Pills */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setClaimCategory('ALL')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${claimCategory === 'ALL'
                    ? 'bg-[#7d5141] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setClaimCategory('DOKTER')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${claimCategory === 'DOKTER'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                >
                  Dokter
                </button>
                <button
                  type="button"
                  onClick={() => setClaimCategory('FACIAL')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${claimCategory === 'FACIAL'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                >
                  Facial
                </button>

                {/* Reset Filter Button */}
                {(claimSearch || claimStartDate || claimEndDate || claimCategory !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setClaimSearch('');
                      setClaimStartDate('');
                      setClaimEndDate('');
                      setClaimCategory('ALL');
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer ml-1"
                    title="Reset Semua Filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Full-Page Historical Claim Table */}
          <div className="bg-white rounded-2xl border border-[#e5ded4] shadow-xs overflow-hidden">
            <div className="p-4 bg-[#faf3e8] border-b border-[#e5ded4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#7d5141]" />
                <span className="font-bold text-xs uppercase tracking-wider text-[#514440]">
                  Daftar Riwayat Klaim Sesi Paket Pasien
                </span>
                <span className="px-2 py-0.5 bg-[#7d5141] text-white rounded-full text-[10px] font-bold">
                  {filteredPackageLogs.length} Data
                </span>
              </div>
              <div className="text-xs text-[#83746f]">
                Menampilkan data secara lengkap tanpa pemotongan teks
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fbf7f4] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">No.</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Waktu Klaim</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Nama Pasien</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Nama Paket</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">Item / Porsi Klaim</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Petugas Assigned</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Detail Tindakan</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">Status Sesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {filteredPackageLogs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-gray-400 italic">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <History className="w-8 h-8 text-gray-300" />
                          <span>Tidak ada riwayat klaim paket yang sesuai dengan filter.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPackageLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-[#fff9f2] transition-colors">
                        <td className="py-3.5 px-4 text-center font-medium text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#1e1b15] whitespace-nowrap">
                          {log.used_at ? new Date(log.used_at).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#7d5141]">{log.pasien_nama || '-'}</div>
                          {log.pasien_hp && (
                            <div className="text-[11px] text-gray-500 font-mono">{log.pasien_hp}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#1e1b15]">
                          {log.nama_paket || '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg font-semibold text-xs whitespace-nowrap shadow-2xs">
                            {log.item_claimed}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#514440]">
                          <div className="flex items-center gap-1.5">
                            {/* <span className="w-2 h-2 rounded-full bg-emerald-500"></span> */}
                            <span>{log.petugas_nama || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#514440] font-medium leading-relaxed">
                          {(log.doingan_status === 'COMPLETED' && log.doingan_nama_tindakan)
                            ? log.doingan_nama_tindakan
                            : (log.notes && !log.notes.startsWith('Klaim paket') && !log.notes.startsWith('Klaim Kuota'))
                              ? log.notes
                              : (log.doingan_nama_tindakan && !log.doingan_nama_tindakan.startsWith('['))
                                ? log.doingan_nama_tindakan
                                : (log.item_claimed || '-')}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {log.doingan_status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              <span>Selesai</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>In Progress</span>
                            </span>
                          )}
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
                matchedRepeatPatients.slice(0, 10).map(p => {
                  const isRepeatMember = p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler' || p.status_saat_ini === 'MEMBER';
                  return (
                    <div key={p.id} className="p-3.5 bg-[#faf3e8]/60 hover:bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex items-center justify-between gap-3 transition-colors">
                      <div>
                        <div className="font-bold text-sm text-[#1e1b15]">{p.nama_lengkap}</div>
                        <div className="text-xs text-[#514440] font-medium">HP: {p.no_hp} {p.no_ktp ? `| NIK: ${p.no_ktp}` : ''}</div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${p.tipe_pasien === 'TRIAL' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                          {p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler' ? 'MEMBER' : p.tipe_pasien}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isRepeatMember && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowRepeatVisitModal(false);
                              openPackageModal(p);
                            }}
                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1"
                            title="Kelola Paket Treatment Member"
                          >
                            <Package className="w-4 h-4" />
                            <span>Klaim Paket</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openIntakeForExisting(p)}
                          className="px-3.5 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Buat Sesi Hari Ini</span>
                        </button>
                      </div>
                    </div>
                  );
                })
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
                {editMode ? `Edit Data Pasien: ${selectedPatient?.nama_lengkap || namaLengkap}` : (modePendaftaran === 'NEW' ? 'Form Pendaftaran Pasien Baru' : `Intake Treatment Hari Ini: ${namaLengkap}`)}
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
              {/* KHUSUS EDIT MODE: HANYA NAMA, NO HP, DAN NIK */}
              {editMode ? (
                <div className="space-y-3.5">
                  {/* Read-Only Status & Info Banner */}
                  <div className="p-3.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-[#514440] uppercase tracking-wider block">Status Keanggotaan / Tipe Pasien</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedPatient?.tipe_pasien === 'MEMBER' || selectedPatient?.tipe_pasien === 'NON-TRIAL'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                          {selectedPatient?.tipe_pasien || 'PASIEN'}
                        </span>
                        <span className="text-[11px] text-gray-500 italic">(Tipe member dikunci & tidak dapat diubah)</span>
                      </div>
                    </div>
                    {selectedPatient?.marketing_nama && (
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-[#514440] uppercase tracking-wider block">Marketing PIC</span>
                        <span className="text-xs font-bold text-[#7d5141]">{selectedPatient.marketing_nama}</span>
                      </div>
                    )}
                  </div>

                  {/* 3 Input Fields yang dapat diedit */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">Nama Lengkap Pasien *</label>
                      <input
                        type="text"
                        required
                        value={namaLengkap}
                        onChange={(e) => setNamaLengkap(formatPersonName(e.target.value))}
                        placeholder="Tuliskan nama lengkap"
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">* Otomatis kapital huruf awal nama orang (EYD Title Case)</p>
                    </div>

                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">No. Handphone / WhatsApp *</label>
                      <input
                        type="text"
                        required
                        value={noHp}
                        onChange={(e) => setNoHp(e.target.value)}
                        placeholder="08..."
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">NIK / No. KTP</label>
                      <input
                        type="text"
                        value={noKtp}
                        onChange={(e) => setNoKtp(e.target.value)}
                        placeholder="16 digit NIK KTP..."
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* MODE PENDAFTARAN BARU / INTAKE TREATMENT */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[#514440] font-semibold mb-1">Tipe Pasien / Pelanggan *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormType('TRIAL');
                          if (kebutuhanLayanan !== 'Beautician') {
                            handleLayananChange('Beautician');
                          }
                        }}
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
                      onChange={(e) => setNamaLengkap(formatPersonName(e.target.value))}
                      placeholder="Tuliskan nama lengkap"
                      className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">* Otomatis kapital huruf awal nama (EYD Title Case)</p>
                  </div>

                  <div>
                    <label className="block text-[#514440] font-semibold mb-1">No. Handphone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      disabled={modePendaftaran === 'EXISTING'}
                      value={noHp}
                      onChange={(e) => setNoHp(e.target.value)}
                      placeholder="08..."
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
                    <label className="block text-[#514440] font-semibold mb-1">Team Marketing *</label>
                    <select
                      value={marketingId}
                      required={modePendaftaran === 'NEW'}
                      disabled={modePendaftaran === 'EXISTING'}
                      onChange={(e) => setMarketingId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                    >
                      <option value="">-- Pilih Tim Marketing (Wajib) --</option>
                      {marketingList.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.role || m.lini_profesi})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 relative">
                    <label className="block text-[#514440] font-semibold mb-1">MGM</label>
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
                          .filter(p => p.tipe_pasien === 'MEMBER' || p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler' || p.status_saat_ini === 'MEMBER')
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
                                <span className="text-[10px] text-emerald-700 font-semibold ml-2">(Member)</span>
                              </div>
                              <span className="text-[#83746f] text-[11px] font-semibold">{p.no_hp}</span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Toggle Beli Paket Treatment atau Kunjungan Reguler/Trial */}
              {(formType === 'MEMBER' || formType === 'NON-TRIAL') && !editMode && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-xs text-[#1e1b15] flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#7d5141]" />
                      <span>Apakah Pasien Membeli Paket Treatment?</span>
                    </div>
                    <p className="text-[11px] text-[#514440] mt-0.5">
                      {isBuyingPackage
                        ? 'Pasien membeli paket: Assign petugas ditiadakan (di-hide), tagihan paket langsung diteruskan ke POS Kasir.'
                        : 'Pasien tidak beli paket: Menu assign petugas akan ditampilkan untuk perawatan hari ini.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#d6c2bd] self-start sm:self-auto shrink-0 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBuyingPackage(false);
                        setSelectedRegPackages([]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!isBuyingPackage
                        ? 'bg-[#514440] text-white shadow-xs'
                        : 'text-[#83746f] hover:text-[#1e1b15]'
                        }`}
                    >
                      TIDAK
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBuyingPackage(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isBuyingPackage
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-[#83746f] hover:text-[#1e1b15]'
                        }`}
                    >
                      YA (Beli Paket)
                    </button>
                  </div>
                </div>
              )}

              {/* Pembelian Paket Treatment Member (HANYA MUNCUL JIKA isBuyingPackage == true) */}
              {(formType === 'MEMBER' || formType === 'NON-TRIAL') && !editMode && isBuyingPackage && (
                <div className="p-4 bg-[#fffbf2] rounded-xl border border-amber-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#7d5141] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#7d5141]" />
                      <span>Pilih Paket Treatment yang Dibeli</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      Bisa Pilih &gt; 1 Paket
                    </span>
                  </div>

                  <p className="text-[11px] text-[#514440]">
                    Pilih paket treatment yang dibeli oleh member baru ini. Tagihan paket akan otomatis diteruskan ke antrean Kasir POS.
                  </p>

                  {masterPackages.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-amber-200 text-xs text-gray-400 italic">
                      Belum ada Master Paket yang terdaftar di sistem.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                      {masterPackages.map(pkg => {
                        const isSelected = selectedRegPackages.some(p => p.id === pkg.id);
                        return (
                          <div
                            key={pkg.id}
                            onClick={() => toggleRegPackage(pkg)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 select-none ${isSelected
                              ? 'bg-amber-100 border-[#7d5141] shadow-2xs ring-1 ring-[#7d5141]'
                              : 'bg-white border-[#d6c2bd] hover:border-[#7d5141]'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => { }}
                              className="mt-0.5 accent-[#7d5141] cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-[#1e1b15] truncate">{pkg.nama_paket}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                {[
                                  pkg.item_a_name && (pkg.item_a_kuota > 0 || !pkg.item_b_name) ? `${pkg.item_a_name} (${pkg.item_a_kuota || 0}x)` : null,
                                  pkg.item_b_name && pkg.item_b_kuota > 0 ? `${pkg.item_b_name} (${pkg.item_b_kuota}x)` : null
                                ].filter(Boolean).join(' + ')}
                              </div>
                              <div className="text-[11px] font-bold text-[#7d5141] mt-1">
                                Rp {Number(pkg.harga_paket || 0).toLocaleString('id-ID')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedRegPackages.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200 text-xs font-bold text-[#7d5141]">
                      <span>{selectedRegPackages.length} Paket Dipilih:</span>
                      <span className="text-sm">
                        Total Rp {selectedRegPackages.reduce((sum, p) => sum + (Number(p.harga_paket) || 0), 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Live Staff Assignment Box (HANYA MUNCUL JIKA TIDAK BELI PAKET ATAU PASIEN TRIAL) */}
              {!editMode && (!isBuyingPackage || formType === 'TRIAL') && (
                <div className="p-4 bg-[#faf3e8] rounded-xl border border-[#d6c2bd] space-y-3 animate-in fade-in duration-150">
                  <div className="font-bold text-[#7d5141] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#7d5141]" />
                    <span>Assign Petugas</span>
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
                        {formType !== 'TRIAL' && (
                          <option value="Nurse">Tindakan Medis (Nurse)</option>
                        )}
                      </select>
                      {formType === 'TRIAL' && (
                        <p className="text-[10px] text-amber-800 font-medium mt-1">
                          * Pasien Trial khusus ditangani oleh Beautician
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">Pilih Petugas Bertugas *</label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                      >
                        <option value="">-- {loadingStaff ? 'Memuat Staff...' : 'Pilih Petugas Staff'} --</option>
                        {staffList.map(s => {
                          const isNurse = (s.role === 'Nurse' || s.lini_profesi === 'Nurse');
                          return (
                            <option key={s.id} value={s.id} disabled={isNurse ? false : s.is_busy}>
                              {isNurse
                                ? `🟢 ${s.full_name} ${s.active_count > 0 ? `(${s.active_count} Pasien Aktif)` : ''}`
                                : `${s.is_busy ? '🔴' : '🟢'} ${s.full_name} ${(s.is_training === 1 || s.is_training === '1') ? '(Training)' : ''}`
                              }
                            </option>
                          );
                        })}
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
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#7d5141]" />
                  <span>Kelola Paket Treatment Member</span>
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-[#83746f]">Pasien:</span>
                  <span className="font-bold text-[#1e1b15]">{selectedPatient.nama_lengkap}</span>
                  {selectedPatient.no_hp && <span className="text-gray-500 font-medium">({selectedPatient.no_hp})</span>}
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                    MEMBER
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowPackageModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* List Existing Active Packages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-[#7d5141] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Daftar Paket Treatment Aktif ({packages.length})</span>
                </h4>
                {packages.length > 0 && (
                  <span className="text-[11px] text-[#83746f]">
                    Pilih tombol <strong className="text-[#7d5141]">Klaim</strong> untuk mengambil sesi tindakan
                  </span>
                )}
              </div>

              {packages.length === 0 ? (
                <div className="p-6 bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-[#514440]">Belum ada paket treatment aktif untuk pasien ini.</p>
                  <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                    Gunakan formulir di bawah ini untuk menambahkan paket pertama kepada pasien.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {packages.map(pkg => (
                    <div key={pkg.id} className="p-4 bg-gradient-to-br from-[#faf6f0] to-[#f5ede4] border border-[#d6c2bd] rounded-2xl space-y-3 text-xs shadow-xs">
                      <div className="flex justify-between items-start border-b border-[#d6c2bd]/60 pb-2.5">
                        <div>
                          <div className="font-bold text-base text-[#1e1b15] font-serif">{pkg.nama_paket}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${pkg.sisa_kuota > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-200 text-gray-600'
                              }`}>
                              Total Sisa: {pkg.sisa_kuota} / {pkg.total_kuota} Sesi
                            </span>
                            {pkg.created_at && (
                              <span className="text-[10px] text-gray-500">
                                Dibeli: {new Date(pkg.created_at).toLocaleDateString('id-ID')}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePatientPackage(pkg.id, pkg.nama_paket)}
                          className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-semibold rounded-xl text-xs cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                          title="Hapus Paket Pasien Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>

                      {/* Sub-item A & B Quotas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {pkg.item_a_name && (
                          <div className="p-3 bg-white rounded-xl border border-[#d6c2bd]/80 shadow-2xs flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[#1e1b15] truncate" title={pkg.item_a_name}>
                                {pkg.item_a_name}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Kuota: <strong className={pkg.item_a_kuota > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'}>
                                  {pkg.item_a_kuota || 0}
                                </strong> / {pkg.item_a_total || pkg.total_kuota} Sesi
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={(pkg.item_a_kuota || 0) <= 0}
                              onClick={() => openClaimModal(pkg, 'A')}
                              className="px-3.5 py-2 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all active:scale-95 shrink-0 flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                              <span>{(pkg.item_a_kuota || 0) > 0 ? 'Klaim Item A' : 'Habis'}</span>
                            </button>
                          </div>
                        )}

                        {pkg.item_b_name && (
                          <div className="p-3 bg-white rounded-xl border border-[#d6c2bd]/80 shadow-2xs flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[#1e1b15] truncate" title={pkg.item_b_name}>
                                {pkg.item_b_name}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                Kuota: <strong className={pkg.item_b_kuota > 0 ? 'text-emerald-700 font-bold' : 'text-gray-400'}>
                                  {pkg.item_b_kuota || 0}
                                </strong> / {pkg.item_b_total || 0} Sesi
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={(pkg.item_b_kuota || 0) <= 0}
                              onClick={() => openClaimModal(pkg, 'B')}
                              className="px-3.5 py-2 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all active:scale-95 shrink-0 flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                              <span>{(pkg.item_b_kuota || 0) > 0 ? 'Klaim Item B' : 'Habis'}</span>
                            </button>
                          </div>
                        )}

                        {/* Opsi Klaim Sekaligus Keduanya jika sisa kuota A & B > 0 */}
                        {pkg.item_a_name && pkg.item_b_name && (pkg.item_a_kuota || 0) > 0 && (pkg.item_b_kuota || 0) > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => openClaimBothModal(pkg)}
                              className="w-full py-2.5 px-3 bg-gradient-to-r from-[#7d5141] to-[#553123] hover:from-[#653d2e] hover:to-[#442317] text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#8e614f]"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Klaim Keduanya Sekaligus (1. BTC ➔ 2. Nurse)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expandable Section: Assign / Tambah Paket Baru ke Pasien */}
            <div className="pt-2 border-t border-[#e5ded4]">
              <button
                type="button"
                onClick={() => setIsAssignPackageOpen(!isAssignPackageOpen)}
                className={`w-full p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isAssignPackageOpen
                  ? 'bg-[#7d5141] text-white border-[#7d5141] shadow-xs'
                  : 'bg-[#faf3e8] hover:bg-[#f3eae0] text-[#7d5141] border-[#d6c2bd]'
                  }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                  <Plus className={`w-4 h-4 transition-transform duration-200 ${isAssignPackageOpen ? 'rotate-45' : ''}`} />
                  <span>Tambah Paket Baru</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={isAssignPackageOpen ? 'text-amber-100' : 'text-[#83746f]'}>
                    {isAssignPackageOpen ? 'Sembunyikan Form' : 'Buka Form Tambah'}
                  </span>
                  {isAssignPackageOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {isAssignPackageOpen && (
                <form onSubmit={handleAddPackage} className="mt-3 p-4 bg-[#fffdfa] border border-[#d6c2bd] rounded-2xl space-y-3.5 text-xs shadow-inner animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e5ded4]">
                    <div>
                      <div className="font-bold text-xs text-[#1e1b15]">Formulir Penambahan Paket Treatment</div>
                      <p className="text-[11px] text-[#83746f]">Isi kuota paket manual atau pilih template master yang sudah terdaftar.</p>
                    </div>
                    {masterPackages.length > 0 && (
                      <select
                        value={selectedMasterPkgId}
                        onChange={handleMasterPackageSelect}
                        className="px-2.5 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl font-bold text-xs text-[#7d5141] shrink-0 focus:outline-none"
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
                      placeholder="Contoh: Ultimate 1 / Glowing Package..."
                      className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">Item Tindakan / Perawatan 1</label>
                      <input
                        type="text"
                        value={itemAName}
                        onChange={(e) => setItemAName(e.target.value)}
                        placeholder="Contoh: Facial Premium / Tindakan Dokter..."
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">Kuota Item 1 (Sesi)</label>
                      <input
                        type="number"
                        min="0"
                        value={itemAKuota}
                        onChange={(e) => setItemAKuota(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">Item Tindakan / Perawatan 2 (Opsional)</label>
                      <input
                        type="text"
                        value={itemBName}
                        onChange={(e) => setItemBName(e.target.value)}
                        placeholder="Contoh: Facial Premium (kosongkan jika 1 tindakan)..."
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#514440] font-semibold mb-1">Kuota Item 2 (Sesi)</label>
                      <input
                        type="number"
                        min="0"
                        value={itemBKuota}
                        onChange={(e) => setItemBKuota(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
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
                      className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAssignPackageOpen(false)}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#514440] font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-amber-200" />
                      <span>Simpan & Assign Paket Member</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
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
                  {staffList.map(s => {
                    const isNurse = (s.role === 'Nurse' || s.lini_profesi === 'Nurse');
                    return (
                      <option key={s.id} value={s.id} disabled={isNurse ? false : s.is_busy}>
                        {isNurse
                          ? `🟢 ${s.full_name} ${s.active_count > 0 ? `(${s.active_count} Pasien Aktif)` : ''}`
                          : `${s.is_busy ? '🔴' : '🟢'} ${s.full_name}`
                        }
                      </option>
                    );
                  })}
                </select>
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

      {/* MODAL KLAIM KEDUA PORSI/ITEM SEKALIGUS (BTC FIRST -> NURSE SECOND) */}
      {showClaimBothModal && selectedClaimPkg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4]">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Klaim Kedua Tindakan Sekaligus</h3>
                <p className="text-xs text-[#83746f]">Paket: <span className="font-bold text-[#7d5141]">{selectedClaimPkg.nama_paket}</span></p>
              </div>
              <button onClick={() => setShowClaimBothModal(false)} className="text-gray-400 font-bold text-xl hover:text-black">×</button>
            </div>

            <form onSubmit={handleProcessClaimBoth} className="space-y-3.5 text-xs">
              {/* Info Urutan Tindakan Sesuai SOP */}
              <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1 text-amber-950">
                <div className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Urutan Pengerjaan Klinik:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  <strong>1. Ditindak Pertama:</strong> Facial oleh Beautician (BTC).<br />
                  <strong>2. Ditindak Kedua:</strong> Dokter / Tindakan Medis (Nurse). Sesi Nurse otomatis mengantri dan akan aktif setelah BTC selesai.
                </p>
              </div>

              {/* Input Petugas 1: BTC */}
              <div className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl space-y-2">
                <div className="font-bold text-[#7d5141] flex items-center justify-between">
                  <span>1. Petugas Beautician ({selectedClaimPkg.item_b_name || 'Facial'}) *</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Sisa: {selectedClaimPkg.item_b_kuota} Sesi</span>
                </div>
                <select
                  required
                  value={claimBothBtcStaffId}
                  onChange={(e) => setClaimBothBtcStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                >
                  <option value="">-- Pilih Beautician (BTC) --</option>
                  {btcStaffList.map(s => (
                    <option key={s.id} value={s.id} disabled={s.is_busy}>
                      {s.is_busy ? '🔴' : '🟢'} {s.full_name} {(s.is_training === 1 || s.is_training === '1') ? '(Training)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input Petugas 2: Nurse */}
              <div className="p-3 bg-[#f0f9ff] border border-blue-200 rounded-xl space-y-2">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span>2. Petugas Dokter / Nurse ({selectedClaimPkg.item_a_name || 'Tindakan Dokter'}) *</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Sisa: {selectedClaimPkg.item_a_kuota} Sesi</span>
                </div>
                <select
                  required
                  value={claimBothNurseStaffId}
                  onChange={(e) => setClaimBothNurseStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-[#1e1b15]"
                >
                  <option value="">-- Pilih Petugas Nurse (Dokter) --</option>
                  {nurseStaffList.map(s => (
                    <option key={s.id} value={s.id} disabled={false}>
                      🟢 {s.full_name} {s.active_count > 0 ? `(${s.active_count} Pasien Aktif)` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-800 italic">
                  * Nurse selalu dapat dipilih meskipun sedang menangani pasien lain.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#e5ded4]">
                <button
                  type="button"
                  onClick={() => setShowClaimBothModal(false)}
                  className="px-4 py-2 bg-gray-100 text-[#514440] font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#7d5141] to-[#553123] hover:from-[#653d2e] hover:to-[#442317] disabled:bg-gray-300 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submittingClaim ? 'Memproses...' : 'Konfirmasi Klaim Keduanya'}
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
                          {mp.item_a_name && mp.item_a_kuota > 0 && (
                            <span>Item A (Dokter): <strong className="text-[#7d5141]">{mp.item_a_name}</strong> ({mp.item_a_kuota} Sesi)</span>
                          )}
                          {mp.item_b_name && mp.item_b_kuota > 0 && (
                            <span className={mp.item_a_name && mp.item_a_kuota > 0 ? "ml-2" : ""}>
                              {mp.item_a_name && mp.item_a_kuota > 0 ? "| " : ""}Item B (Facial BTC): <strong className="text-[#7d5141]">{mp.item_b_name}</strong> ({mp.item_b_kuota} Sesi)
                            </span>
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
                  <label className="block text-[#514440] font-semibold mb-1">Item Tindakan / Perawatan 1</label>
                  <input
                    type="text"
                    value={newMasterItemA}
                    onChange={(e) => setNewMasterItemA(e.target.value)}
                    placeholder="mis. Facial Premium / Tindakan Dokter..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Kuota Item 1 (Sesi)</label>
                  <input
                    type="number"
                    min="0"
                    value={newMasterKuotaA}
                    onChange={(e) => setNewMasterKuotaA(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Item Tindakan / Perawatan 2 (Opsional)</label>
                  <input
                    type="text"
                    value={newMasterItemB}
                    onChange={(e) => setNewMasterItemB(e.target.value)}
                    placeholder="mis. Facial Premium (kosongkan jika 1 tindakan)..."
                    className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15]"
                  />
                </div>
                <div>
                  <label className="block text-[#514440] font-semibold mb-1">Kuota Item 2 (Sesi)</label>
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
                Simpan Master Template Paket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REKAP MARKETING TRIAL & PAKET */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15] flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-700" />
                  <span>Rekap Data Pasien & Komisi Team Marketing</span>
                </h3>
                <p className="text-xs text-[#83746f]">Komisi marketing diakumulasi dalam 1 bulan: 1 – 99 Pasien = Rp 8.000 / Pasien | &ge; 100 Pasien = Rp 10.000 / Pasien.</p>
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
                    <th className="py-2.5 px-3 text-center">Total Pasien</th>
                    <th className="py-2.5 px-3 text-center">Pasien Trial</th>
                    <th className="py-2.5 px-3 text-center">Pasien Member</th>
                    <th className="py-2.5 px-3">Skema / Tier Tarif</th>
                    <th className="py-2.5 px-3 text-right">Total Komisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {marketingRecap.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-gray-400 italic">Belum ada data pencapaian marketing.</td>
                    </tr>
                  ) : (
                    marketingRecap.map((m, idx) => (
                      <tr key={m.marketing_id || idx} className="hover:bg-[#fff8f0]">
                        <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-[#1e1b15]">{m.marketing_nama}</td>
                        <td className="py-2.5 px-3 text-[#83746f]">{m.marketing_role || 'Marketing'}</td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-[#1e1b15]">{m.total_pasien_count || 0} Orang</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-800">{m.total_trial_count || 0}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-800">{m.total_member_count || 0}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${Number(m.total_pasien_count) >= 100
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : Number(m.total_pasien_count) >= 1
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                            }`}>
                            {m.tier_label || (m.rate_per_pasien ? `Rp ${m.rate_per_pasien.toLocaleString('id-ID')} / Pasien` : '-')}
                          </span>
                        </td>
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

      {/* MODAL PEMBELIAN PAKET PASIEN MIGRASI DARI TRIAL KE MEMBER */}
      {showMigrationPackageModal && migratedPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-[#e5ded4] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-amber-50 to-[#faf3e8] border-b border-[#e5ded4] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#1e1b15]">
                    Pilih Paket Treatment Pasien Member
                  </h3>
                  <p className="text-xs text-emerald-800 font-semibold">
                    Status pasien "{migratedPatient.nama_lengkap}" berhasil diubah menjadi MEMBER!
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Tutup jendela pemilihan paket? Tagihan paket tidak akan diteruskan ke POS jika belum disimpan.')) {
                    setShowMigrationPackageModal(false);
                    setMigratedPatient(null);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-[#514440] space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>Penambahan Paket Wajib / Pilihan Pasien Migrasi</span>
                </div>
                <p>
                  Pasien yang bermigrasi dari Trial ke Member perlu memilih paket treatment yang dibeli. Tagihan dari paket yang dipilih akan <strong>langsung muncul di antrean Kasir POS</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#514440] uppercase tracking-wider mb-2">
                  Daftar Master Paket (Bisa Pilih &gt; 1 Paket) *
                </label>

                {masterPackages.length === 0 ? (
                  <div className="p-4 text-center bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 italic">
                    Belum ada Master Paket yang tersedia.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {masterPackages.map(pkg => {
                      const isSelected = selectedMigrationPackages.some(p => p.id === pkg.id);
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => {
                            setSelectedMigrationPackages(prev => {
                              const exists = prev.some(p => p.id === pkg.id);
                              if (exists) {
                                return prev.filter(p => p.id !== pkg.id);
                              } else {
                                return [...prev, pkg];
                              }
                            });
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 select-none ${isSelected
                            ? 'bg-emerald-50 border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                            : 'bg-white border-[#d6c2bd] hover:border-emerald-600'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => { }}
                            className="mt-0.5 accent-emerald-700 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#1e1b15]">{pkg.nama_paket}</div>
                            <div className="text-[10px] text-gray-600 mt-0.5">
                              {[
                                pkg.item_a_name && (pkg.item_a_kuota > 0 || !pkg.item_b_name) ? `${pkg.item_a_name} (${pkg.item_a_kuota || 0}x)` : null,
                                pkg.item_b_name && pkg.item_b_kuota > 0 ? `${pkg.item_b_name} (${pkg.item_b_kuota}x)` : null
                              ].filter(Boolean).join(' + ')}
                            </div>
                            <div className="text-xs font-bold text-emerald-800 mt-1">
                              Rp {Number(pkg.harga_paket || 0).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total & Summary Card */}
              <div className="p-3.5 bg-[#faf3e8] rounded-xl border border-[#d6c2bd] flex justify-between items-center text-xs font-bold">
                <div className="text-[#514440]">
                  <span>Total Paket Terpilih: </span>
                  <span className="text-[#7d5141] font-extrabold">{selectedMigrationPackages.length} Paket</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Total Tagihan POS</div>
                  <div className="text-sm text-emerald-800 font-extrabold">
                    Rp {selectedMigrationPackages.reduce((sum, p) => sum + (Number(p.harga_paket) || 0), 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#faf3e8] border-t border-[#e5ded4] flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMigrationPackageModal(false);
                  setMigratedPatient(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-[#514440] font-bold text-xs rounded-xl cursor-pointer"
              >
                Lewati (Beli Nanti)
              </button>
              <button
                type="button"
                disabled={submittingMigrationPkg || selectedMigrationPackages.length === 0}
                onClick={handleConfirmMigrationPackages}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{submittingMigrationPkg ? 'Menyimpan...' : 'Simpan & Teruskan Tagihan ke POS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
