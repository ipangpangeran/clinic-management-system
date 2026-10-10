import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { exportStyledExcel, formatMonthYearLabel } from '../utils/excelExport';
import { AuthContext } from '../context/AuthContext';
import {
  Sparkles, User, FileCheck, DollarSign, Award, Plus, Trash2, CheckCircle2, ShieldAlert,
  Smartphone, Calendar, Filter, Printer, Clock, CheckSquare, RefreshCw, UserCheck, UserPlus,
  FileText, Search, FileSpreadsheet, Package, Phone, CheckCircle, AlertCircle, ChevronLeft, ChevronRight
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
  const [marketingSummary, setMarketingSummary] = useState([]);
  const [marketingSearchName, setMarketingSearchName] = useState('');
  const [selectedMarketingUser, setSelectedMarketingUser] = useState('ALL');
  const [marketingPage, setMarketingPage] = useState(1);
  const marketingPageSize = 10;

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

  const fetchDataForTab = async (targetTab = activeMainTab, overrideStart = null, overrideEnd = null) => {
    setLoadingRecap(true);
    try {
      const sDate = overrideStart || startDate;
      const eDate = overrideEnd || endDate;
      if (targetTab === 'BTC') {
        const res = await axios.get(`/api/doingan/recap?start_date=${sDate}&end_date=${eDate}&lini=BEAUTICIAN`);
        setBtcData(res.data.data || []);
      } else if (targetTab === 'NURSE') {
        const res = await axios.get(`/api/doingan/recap?start_date=${sDate}&end_date=${eDate}&lini=NURSE`);
        setNurseData(res.data.data || []);
      } else if (targetTab === 'MARKETING') {
        const res = await axios.get(`/api/marketing/recap-detail?start_date=${sDate}&end_date=${eDate}`);
        if (res.data && res.data.details) {
          setMarketingData(res.data.details || []);
          setMarketingSummary(res.data.summary || []);
        } else if (Array.isArray(res.data)) {
          setMarketingData(res.data);
          setMarketingSummary([]);
        }
      }
    } catch (err) {
      console.error(`Error fetching data for ${targetTab}`, err);
    } finally {
      setLoadingRecap(false);
    }
  };

  const handleFilterThisMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed (e.g. 9 for October)

    // First day of current month: YYYY-MM-01
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;

    // Last day of current month: YYYY-MM-DD
    const lastDayObj = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`;

    setStartDate(firstDayStr);
    setEndDate(lastDayStr);
    fetchDataForTab(activeMainTab, firstDayStr, lastDayStr);
  };

  const handleFilterToday = () => {
    const today = getLocalDateString();
    setStartDate(today);
    setEndDate(today);
    fetchDataForTab(activeMainTab, today, today);
  };

  const getCurrentMonthLabel = () => {
    const d = new Date();
    return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
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
  const handleExportExcelBTC = async () => {
    if (btcData.length === 0) {
      alert('Belum ada data komisi Beautician (BTC) pada periode tanggal ini untuk di-export.');
      return;
    }

    const monthLabel = formatMonthYearLabel(startDate, endDate);
    const data = btcData.map((item, index) => ({
      no: index + 1,
      waktu_mulai: item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-',
      waktu_selesai: item.completed_at ? new Date(item.completed_at).toLocaleString('id-ID') : '-',
      pasien_nama: item.pasien_nama || '-',
      tipe_pasien: item.tipe_pasien || '-',
      petugas_nama: item.petugas_nama || '-',
      nama_tindakan: item.nama_tindakan || '-',
      status: item.status_pengerjaan === 'COMPLETED' ? 'SELESAI' : item.status_pengerjaan === 'CANCELLED' ? 'DIBATALKAN' : 'IN PROGRESS',
      komisi: Number(item.komisi) || 0
    }));

    const totalKomisi = btcData.reduce((sum, item) => sum + (Number(item.komisi) || 0), 0);

    await exportStyledExcel({
      fileName: `Laporan_Komisi_BTC_Deflow_${startDate}_sd_${endDate}`,
      sheets: [
        {
          name: 'Komisi Beautician',
          title: `DATA DEFLOW AESTHETIC CLINIC ${monthLabel}`,
          subtitle: `LAPORAN DATA KOMISI BEAUTICIAN (BTC) | Periode: ${startDate} s/d ${endDate}`,
          columns: [
            { header: 'No', key: 'no', width: 6, alignment: 'center' },
            { header: 'Waktu Mulai', key: 'waktu_mulai', width: 20, alignment: 'center' },
            { header: 'Waktu Selesai', key: 'waktu_selesai', width: 20, alignment: 'center' },
            { header: 'Nama Pasien', key: 'pasien_nama', width: 24 },
            { header: 'Tipe Pasien', key: 'tipe_pasien', width: 14, alignment: 'center' },
            { header: 'Petugas BTC', key: 'petugas_nama', width: 22 },
            { header: 'Detail Treatment / Facial', key: 'nama_tindakan', width: 28 },
            { header: 'Status Layanan', key: 'status', width: 16, alignment: 'center' },
            { header: 'Komisi BTC (Rp)', key: 'komisi', width: 18, isCurrency: true }
          ],
          data,
          summaryRow: {
            no: '',
            waktu_mulai: '',
            waktu_selesai: '',
            pasien_nama: '',
            tipe_pasien: '',
            petugas_nama: '',
            nama_tindakan: '',
            status: 'TOTAL KOMISI',
            komisi: totalKomisi
          }
        }
      ]
    });
  };

  // EXPORT EXCEL NURSE
  const handleExportExcelNurse = async () => {
    if (nurseData.length === 0) {
      alert('Belum ada data komisi Nurse pada periode tanggal ini untuk di-export.');
      return;
    }

    const monthLabel = formatMonthYearLabel(startDate, endDate);
    const data = nurseData.map((item, index) => ({
      no: index + 1,
      waktu_mulai: item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-',
      waktu_selesai: item.completed_at ? new Date(item.completed_at).toLocaleString('id-ID') : '-',
      pasien_nama: item.pasien_nama || '-',
      tipe_pasien: item.tipe_pasien || '-',
      petugas_nama: item.petugas_nama || '-',
      nama_tindakan: item.nama_tindakan || '-',
      status: item.status_pengerjaan === 'COMPLETED' ? 'SELESAI' : item.status_pengerjaan === 'CANCELLED' ? 'DIBATALKAN' : 'IN PROGRESS',
      komisi: Number(item.komisi) || 0
    }));

    const totalKomisi = nurseData.reduce((sum, item) => sum + (Number(item.komisi) || 0), 0);

    await exportStyledExcel({
      fileName: `Laporan_Komisi_Nurse_Deflow_${startDate}_sd_${endDate}`,
      sheets: [
        {
          name: 'Komisi Nurse',
          title: `DATA DEFLOW AESTHETIC CLINIC ${monthLabel}`,
          subtitle: `LAPORAN DATA KOMISI NURSE & MEDIS | Periode: ${startDate} s/d ${endDate}`,
          columns: [
            { header: 'No', key: 'no', width: 6, alignment: 'center' },
            { header: 'Waktu Mulai', key: 'waktu_mulai', width: 20, alignment: 'center' },
            { header: 'Waktu Selesai', key: 'waktu_selesai', width: 20, alignment: 'center' },
            { header: 'Nama Pasien', key: 'pasien_nama', width: 24 },
            { header: 'Tipe Pasien', key: 'tipe_pasien', width: 14, alignment: 'center' },
            { header: 'Petugas Nurse', key: 'petugas_nama', width: 22 },
            { header: 'Detail Tindakan Medis', key: 'nama_tindakan', width: 28 },
            { header: 'Status Layanan', key: 'status', width: 16, alignment: 'center' },
            { header: 'Komisi Nurse (Rp)', key: 'komisi', width: 18, isCurrency: true }
          ],
          data,
          summaryRow: {
            no: '',
            waktu_mulai: '',
            waktu_selesai: '',
            pasien_nama: '',
            tipe_pasien: '',
            petugas_nama: '',
            nama_tindakan: '',
            status: 'TOTAL KOMISI',
            komisi: totalKomisi
          }
        }
      ]
    });
  };

  // EXPORT EXCEL MARKETING
  const handleExportExcelMarketing = async () => {
    if (marketingData.length === 0 && marketingSummary.length === 0) {
      alert('Belum ada data pencatatan atau komisi Marketing pada periode tanggal ini untuk di-export.');
      return;
    }

    const monthLabel = formatMonthYearLabel(startDate, endDate);

    // Sheet 1: Summary Data per marketing
    let grandTotalPasien = 0;
    let grandTotalTrial = 0;
    let grandTotalMember = 0;
    let grandTotalKomisiPasien = 0;
    let grandTotalPaket = 0;
    let grandTotalKomisiPaket = 0;
    let grandTotalKomisi = 0;

    const summaryData = marketingSummary.map((item, index) => {
      grandTotalPasien += Number(item.total_pasien_count || 0);
      grandTotalTrial += Number(item.total_trial_count || 0);
      grandTotalMember += Number(item.total_member_count || 0);
      grandTotalKomisiPasien += Number(item.komisi_pasien || 0);
      grandTotalPaket += Number(item.total_paket_count || 0);
      grandTotalKomisiPaket += Number(item.total_komisi_paket || 0);
      grandTotalKomisi += Number(item.total_komisi_marketing || 0);

      return {
        no: index + 1,
        nama: item.marketing_nama || '-',
        role: item.marketing_role || 'Marketing',
        total_pasien: Number(item.total_pasien_count) || 0,
        trial: Number(item.total_trial_count) || 0,
        member: Number(item.total_member_count) || 0,
        tarif: item.rate_per_pasien ? `Rp ${item.rate_per_pasien.toLocaleString('id-ID')}` : '-',
        komisi_pasien: Number(item.komisi_pasien) || 0,
        total_paket: Number(item.total_paket_count) || 0,
        komisi_paket: Number(item.total_komisi_paket) || 0,
        total_komisi: Number(item.total_komisi_marketing) || 0
      };
    });

    // Sheet 2: Filtered Patient Registrations
    const dataToExport = marketingData.filter(item => {
      const matchesUser = selectedMarketingUser === 'ALL' ||
        String(item.marketing_id) === String(selectedMarketingUser) ||
        item.marketing_nama === selectedMarketingUser;
      if (!matchesUser) return false;

      if (!marketingSearchName.trim()) return true;
      const q = marketingSearchName.toLowerCase();
      return (item.pasien_nama || '').toLowerCase().includes(q) ||
        (item.marketing_nama || '').toLowerCase().includes(q) ||
        (item.pasien_hp || '').includes(q) ||
        (item.detail_transaksi || '').toLowerCase().includes(q);
    });

    let totalHargaPaket = 0;
    let totalKomisiPaketDetail = 0;

    const detailData = dataToExport.map((item, index) => {
      const hrg = Number(item.harga_paket || item.nominal_pembayaran || 0);
      const kom = Number(item.komisi_paket || 0);
      totalHargaPaket += hrg;
      totalKomisiPaketDetail += kom;

      return {
        no: index + 1,
        created_at: item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-',
        marketing_nama: item.marketing_nama || '-',
        pasien_nama: item.pasien_nama || '-',
        pasien_hp: item.pasien_hp || '-',
        tipe_pasien: item.tipe_pasien || '-',
        layanan: item.detail_transaksi || item.detail_layanan || 'Registrasi Pasien Baru',
        harga_paket: hrg,
        komisi_paket: kom
      };
    });

    await exportStyledExcel({
      fileName: `Laporan_Komisi_Marketing_Deflow_${startDate}_sd_${endDate}`,
      sheets: [
        {
          name: 'Rekap Komisi',
          title: `DATA DEFLOW AESTHETIC CLINIC ${monthLabel}`,
          subtitle: `LAPORAN REKAPITULASI KOMISI TIM MARKETING | Periode: ${startDate} s/d ${endDate}`,
          columns: [
            { header: 'No', key: 'no', width: 6, alignment: 'center' },
            { header: 'Nama Petugas Marketing', key: 'nama', width: 24 },
            { header: 'Role / Divisi', key: 'role', width: 16 },
            { header: 'Total Pasien', key: 'total_pasien', width: 14, isNumber: true },
            { header: 'Pasien Trial', key: 'trial', width: 14, isNumber: true },
            { header: 'Pasien Member', key: 'member', width: 14, isNumber: true },
            { header: 'Tarif Pasien', key: 'tarif', width: 16, alignment: 'center' },
            { header: 'Komisi Pasien (Rp)', key: 'komisi_pasien', width: 18, isCurrency: true },
            { header: 'Paket Terjual', key: 'total_paket', width: 14, isNumber: true },
            { header: 'Komisi Paket (Rp)', key: 'komisi_paket', width: 18, isCurrency: true },
            { header: 'Total Komisi yang Didapatkan (Rp)', key: 'total_komisi', width: 24, isCurrency: true }
          ],
          data: summaryData,
          summaryRow: {
            no: '',
            nama: 'TOTAL KESELURUHAN',
            role: '',
            total_pasien: grandTotalPasien,
            trial: grandTotalTrial,
            member: grandTotalMember,
            tarif: '',
            komisi_pasien: grandTotalKomisiPasien,
            total_paket: grandTotalPaket,
            komisi_paket: grandTotalKomisiPaket,
            total_komisi: grandTotalKomisi
          }
        },
        {
          name: 'Rincian Pasien',
          title: `DATA DEFLOW AESTHETIC CLINIC ${monthLabel}`,
          subtitle: `RINCIAN PENCATATAN DATA PASIEN OLEH TIM MARKETING | Periode: ${startDate} s/d ${endDate}`,
          columns: [
            { header: 'No', key: 'no', width: 6, alignment: 'center' },
            { header: 'Waktu Pendaftaran', key: 'created_at', width: 20, alignment: 'center' },
            { header: 'Petugas Marketing', key: 'marketing_nama', width: 22 },
            { header: 'Nama Pasien', key: 'pasien_nama', width: 24 },
            { header: 'No HP Pasien', key: 'pasien_hp', width: 18, alignment: 'center' },
            { header: 'Tipe Pasien', key: 'tipe_pasien', width: 14, alignment: 'center' },
            { header: 'Layanan / Paket', key: 'layanan', width: 28 },
            { header: 'Harga Paket (Rp)', key: 'harga_paket', width: 18, isCurrency: true },
            { header: 'Komisi Paket (Rp)', key: 'komisi_paket', width: 18, isCurrency: true }
          ],
          data: detailData,
          summaryRow: {
            no: '',
            created_at: '',
            marketing_nama: '',
            pasien_nama: '',
            pasien_hp: '',
            tipe_pasien: '',
            layanan: 'TOTAL RINCIAN',
            harga_paket: totalHargaPaket,
            komisi_paket: totalKomisiPaketDetail
          }
        }
      ]
    });
  };

  const nonStaffRoles = ['Super Admin', 'Admin System', 'Admin Klinik', 'Admin FO', 'Manager', 'Marketing'];
  const beauticianList = staffList.filter(s => s.role === 'Beautician' || (s.lini_profesi === 'Beautician' && !nonStaffRoles.includes(s.role)));
  const nurseList = staffList.filter(s => (s.role === 'Nurse' || s.role === 'Dokter') || (s.lini_profesi === 'Nurse' && !nonStaffRoles.includes(s.role)));

  // Extract unique marketing user list for the dropdown filter
  const marketingUserOptions = useMemo(() => {
    const map = new Map();
    marketingSummary.forEach(m => {
      if (m.marketing_id) {
        map.set(String(m.marketing_id), m.marketing_nama || `Marketing #${m.marketing_id}`);
      }
    });
    marketingData.forEach(d => {
      if (d.marketing_id && !map.has(String(d.marketing_id))) {
        map.set(String(d.marketing_id), d.marketing_nama || `Marketing #${d.marketing_id}`);
      }
    });
    return Array.from(map.entries()).map(([id, nama]) => ({ id, nama }));
  }, [marketingSummary, marketingData]);

  // Filtered & Paginated Marketing Data for Tab Marketing
  const filteredMarketingData = useMemo(() => {
    return marketingData.filter(item => {
      const matchesUser = selectedMarketingUser === 'ALL' ||
        String(item.marketing_id) === String(selectedMarketingUser) ||
        item.marketing_nama === selectedMarketingUser;
      if (!matchesUser) return false;

      if (!marketingSearchName.trim()) return true;
      const q = marketingSearchName.toLowerCase();
      return (item.pasien_nama || '').toLowerCase().includes(q) ||
        (item.marketing_nama || '').toLowerCase().includes(q) ||
        (item.pasien_hp || '').includes(q) ||
        (item.detail_transaksi || '').toLowerCase().includes(q);
    });
  }, [marketingData, selectedMarketingUser, marketingSearchName]);

  const totalMarketingPages = Math.ceil(filteredMarketingData.length / marketingPageSize) || 1;
  const currentMarketingPage = Math.min(marketingPage, totalMarketingPages);
  const paginatedMarketingData = filteredMarketingData.slice(
    (currentMarketingPage - 1) * marketingPageSize,
    currentMarketingPage * marketingPageSize
  );

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
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${activeMainTab === 'BTC' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
              }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Komisi Beautician (BTC)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('NURSE')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${activeMainTab === 'NURSE' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
              }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Komisi Nurse</span>
          </button>

          <button
            onClick={() => setActiveMainTab('MARKETING')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${activeMainTab === 'MARKETING' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
              }`}
          >
            <Award className="w-4 h-4" />
            <span>Komisi Marketing</span>
          </button>

          <button
            onClick={() => setActiveMainTab('LIVE_STATUS')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${activeMainTab === 'LIVE_STATUS' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'
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

              <button
                type="button"
                onClick={handleFilterThisMonth}
                disabled={loadingRecap}
                className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                title="Filter otomatis full 1 bulan berjalan ini"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-800" />
                <span>Bulan Ini ({getCurrentMonthLabel()})</span>
              </button>

              <button
                type="button"
                onClick={handleFilterToday}
                disabled={loadingRecap}
                className="px-3 py-2 bg-white hover:bg-gray-100 border border-[#d6c2bd] text-[#514440] font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                title="Filter hari ini"
              >
                <Clock className="w-3.5 h-3.5 text-[#7d5141]" />
                <span>Hari Ini</span>
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
                    <th className="py-3 px-4 text-right">Komisi</th>
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
                        <td className="py-3 px-4 text-[#1e1b15]">
                          <div>Mulai: {new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          {item.completed_at && (
                            <div className="text-[#1e1b15]">Selesai: {new Date(item.completed_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1e1b15]">{item.pasien_nama}</div>
                          <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[8px] font-semibold ${item.tipe_pasien === 'MEMBER' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}>
                            {item.tipe_pasien || 'PASIEN'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#1e1b15]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.petugas_nama}</span>
                            {(item.is_training === 1 || item.is_training === '1') && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                Trainee
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#1e1b15]">{item.nama_tindakan}</span>
                          {item.notes && <div className="text-[10px] text-gray-500 italic mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${item.status_pengerjaan === 'CANCELLED'
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
                    <th className="py-3 px-4">Petugas Nurse</th>
                    <th className="py-3 px-4">Detail Tindakan Medis</th>
                    <th className="py-3 px-4">Status Layanan</th>
                    <th className="py-3 px-4 text-right">Komisi</th>
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
                        <td className="py-3 px-4 text-[#1e1b15]">
                          <div>Mulai: {new Date(item.created_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          {item.completed_at && (
                            <div className="text-[#1e1b15]">Selesai: {new Date(item.completed_at).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1e1b15]">{item.pasien_nama}</div>
                          <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[8px] font-semibold ${item.tipe_pasien === 'MEMBER' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}>
                            {item.tipe_pasien || 'PASIEN'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1e1b15]">
                          {item.petugas_nama}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#1e1b15]">{item.nama_tindakan}</span>
                          {item.notes && <div className="text-[10px] text-gray-500 italic mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${item.status_pengerjaan === 'CANCELLED'
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

        {/* TAB 3: REKAPITULASI KOMISI & PENCATATAN MARKETING */}
        {activeMainTab === 'MARKETING' && (
          <div className="space-y-6">
            {/* Header & Skema Banner */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5ded4] pb-2">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#1e1b15] flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-700" />
                    <span>Rekapitulasi Komisi & Pencatatan Tim Marketing</span>
                  </h3>
                  <p className="text-xs text-[#83746f]">
                    Komisi marketing terdiri dari akumulasi pasien bulanan serta tiering komisi sukses penjualan paket treatment.
                  </p>
                </div>
              </div>

              {/* Informative Rule Card: Both Tiering Rules */}
              {/* <div className="p-3.5 bg-gradient-to-r from-amber-50 via-[#faf3e8] to-emerald-50 border border-[#d6c2bd] rounded-2xl grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1e1b15]">1. Akumulasi Pasien Bulanan:</div>
                    <div className="text-[11px] text-[#514440] flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                        1 – 99 Pasien : <strong>Rp 8.000</strong> / Pasien
                      </span>
                      <span className="font-semibold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                        &ge; 100 Pasien : <strong>Rp 10.000</strong> / Pasien
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 lg:border-l lg:border-[#d6c2bd] lg:pl-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1e1b15]">2. Tiering Komisi Penjualan Paket Member:</div>
                    <div className="text-[10px] text-[#514440] flex flex-wrap items-center gap-1 mt-1">
                      <span className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-mono">&lt; 600k: <strong>30k</strong></span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-mono">800k - &lt; 2jt: <strong>50k</strong></span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-mono">2jt - &lt; 5jt: <strong>70k</strong></span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-mono">&ge; 10jt: <strong>150k</strong></span>
                    </div>
                  </div>
                </div>
              </div> */}
            </div>

            {/* Rekapitulasi Cards per Marketing */}
            <div>
              <h4 className="font-serif font-bold text-sm text-[#1e1b15] mb-3 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>Ringkasan Perolehan Komisi</span>
              </h4>

              {marketingSummary.length === 0 ? (
                <div className="p-6 bg-white rounded-2xl border border-[#e5ded4] text-center text-gray-400 italic text-xs">
                  Belum ada data marketing atau pasien pada periode tanggal {startDate} s/d {endDate}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketingSummary.map((item) => {
                    const count = Number(item.total_pasien_count || 0);
                    const isTierMax = count >= 100;
                    const isTierActive = count >= 1;

                    return (
                      <div
                        key={item.marketing_id}
                        className="bg-white rounded-2xl border border-[#e5ded4] hover:border-amber-400 p-4 shadow-xs transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                      >
                        {/* Top decorative stripe */}
                        <div className={`absolute top-0 left-0 right-0 h-1.5 ${isTierMax ? 'bg-emerald-600' : isTierActive ? 'bg-amber-600' : 'bg-gray-300'}`} />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-[#faf3e8] border border-[#d6c2bd] text-[#7d5141] font-bold flex items-center justify-center text-sm shadow-xs">
                                {(item.marketing_nama || 'M').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h5 className="font-bold text-sm text-[#1e1b15] leading-tight">{item.marketing_nama}</h5>
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{item.marketing_role || 'Marketing'}</span>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isTierMax
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isTierActive
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-gray-100 text-gray-600 border-gray-300'
                              }`}>
                              {isTierMax ? 'Tier ≥ 100' : isTierActive ? 'Tier 1-99' : '0 Pasien'}
                            </span>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-1.5 bg-[#faf3e8]/70 p-2.5 rounded-xl border border-[#e5ded4]">
                            <div>
                              <div className="text-[10px] text-gray-500 font-medium">Akumulasi Pasien</div>
                              <div className="text-sm font-extrabold text-[#1e1b15]">{count} Orang</div>
                              <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                                Rp {(item.komisi_pasien || 0).toLocaleString('id-ID')}
                              </div>
                            </div>
                            <div className="border-l border-[#e5ded4] pl-2">
                              <div className="text-[10px] text-gray-500 font-medium">Paket Terjual</div>
                              <div className="text-sm font-extrabold text-purple-900">{item.total_paket_count || 0} Paket</div>
                              <div className="text-[10px] text-purple-700 font-bold mt-0.5">
                                Rp {(item.total_komisi_paket || 0).toLocaleString('id-ID')}
                              </div>
                            </div>
                          </div>

                          {/* Tariff description & helper */}
                          <div className="text-[10px] text-[#83746f] flex items-center justify-between">
                            <span>Tarif Pasien: <strong>{item.rate_per_pasien ? `Rp ${item.rate_per_pasien.toLocaleString('id-ID')}/org` : '-'}</strong></span>
                            {count < 100 && count > 0 && (
                              <span>Kurang {100 - count} org ke 10k</span>
                            )}
                          </div>
                        </div>

                        {/* Total Commission Footer */}
                        <div className="pt-2 border-t border-[#e5ded4] flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-600">Total Komisi:</span>
                          <span className="text-base font-extrabold text-emerald-700 font-mono">
                            Rp {Number(item.total_komisi_marketing || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail Daftar Pencatatan Pasien */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#1e1b15] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#7d5141]" />
                    <span>Rincian Pencatatan Pasien Terdaftar</span>
                  </h4>
                </div>

                {/* Filter Petugas Marketing & Pencarian Nama */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-none">
                    <select
                      value={selectedMarketingUser}
                      onChange={(e) => {
                        setSelectedMarketingUser(e.target.value);
                        setMarketingPage(1);
                      }}
                      className="px-2.5 py-1 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141] font-medium"
                    >
                      <option value="ALL">Semua Petugas</option>
                      {marketingUserOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex-none w-36">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari nama..."
                      value={marketingSearchName}
                      onChange={(e) => {
                        setMarketingSearchName(e.target.value);
                        setMarketingPage(1);
                      }}
                      className="w-full pl-7 pr-2 py-1 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] placeholder:text-gray-400 focus:outline-none focus:border-[#7d5141]"
                    />
                  </div>

                  <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    Total: <strong>{filteredMarketingData.length} Pasien</strong>
                  </div>
                </div>
              </div>

              {/* Exact 6 Columns: No | Waktu Pendaftaran | Petugas Marketing | Nama & Kontak Pasien | Tipe Pasien | Layanan / Paket */}
              <div className="overflow-x-auto bg-white rounded-xl border border-[#e5ded4]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">No</th>
                      <th className="py-3 px-4">Waktu Pendaftaran</th>
                      <th className="py-3 px-4">Petugas Marketing</th>
                      <th className="py-3 px-4">Nama & Kontak Pasien</th>
                      <th className="py-3 px-4">Tipe Pasien</th>
                      <th className="py-3 px-4">Layanan / Paket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5ded4]">
                    {paginatedMarketingData.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-400 italic">
                          Belum ada data pencatatan pasien marketing yang cocok dengan filter pada periode tanggal {startDate} s/d {endDate}.
                        </td>
                      </tr>
                    ) : (
                      paginatedMarketingData.map((item, idx) => {
                        const rowNumber = ((currentMarketingPage - 1) * marketingPageSize) + idx + 1;
                        return (
                          <tr key={item.id + '-' + idx} className="hover:bg-[#fff8f0]">
                            <td className="py-3 px-3 text-center font-bold text-gray-500">{rowNumber}</td>
                            <td className="py-3 px-4 text-[#1e1b15]">
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
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#1e1b15]">{item.pasien_nama}</div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span>{item.pasien_hp || '-'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.tipe_pasien === 'MEMBER'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                                }`}>
                                {item.tipe_pasien || 'PASIEN'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-[#1e1b15]">
                                {item.detail_transaksi || item.detail_layanan || 'Registrasi Pasien'}
                              </div>
                              {item.nama_paket && (
                                <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span>Rp {Number(item.nominal_pembayaran || item.harga_paket || 0).toLocaleString('id-ID')}</span>
                                  {item.komisi_paket > 0 && (
                                    <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold">
                                      +Komisi Paket Rp {item.komisi_paket.toLocaleString('id-ID')}
                                    </span>
                                  )}
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

              {/* Pagination Controls */}
              {filteredMarketingData.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 px-1 text-xs">
                  <div className="text-gray-500 font-medium">
                    Menampilkan <strong>{((currentMarketingPage - 1) * marketingPageSize) + 1}</strong> - <strong>{Math.min(currentMarketingPage * marketingPageSize, filteredMarketingData.length)}</strong> dari <strong>{filteredMarketingData.length}</strong> data pasien (10 terbaru per halaman)
                  </div>

                  {totalMarketingPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentMarketingPage === 1}
                        onClick={() => setMarketingPage(prev => Math.max(prev - 1, 1))}
                        className="px-2.5 py-1.5 bg-white border border-[#d6c2bd] text-[#514440] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#eee7dd] transition-all cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Prev</span>
                      </button>

                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalMarketingPages }, (_, i) => i + 1)
                          .filter(page => page === 1 || page === totalMarketingPages || Math.abs(page - currentMarketingPage) <= 1)
                          .map((page, idx, arr) => {
                            const prevPage = arr[idx - 1];
                            return (
                              <React.Fragment key={page}>
                                {prevPage && page - prevPage > 1 && (
                                  <span className="px-1 text-gray-400">...</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setMarketingPage(page)}
                                  className={`w-7 h-7 rounded-lg font-bold transition-all cursor-pointer text-xs ${currentMarketingPage === page
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
                        disabled={currentMarketingPage === totalMarketingPages}
                        onClick={() => setMarketingPage(prev => Math.min(prev + 1, totalMarketingPages))}
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
                  <div key={s.id} className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${s.is_busy ? 'bg-red-50/70 border-red-200' : 'bg-emerald-50/70 border-emerald-200'
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
                  <div key={s.id} className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${s.is_busy ? 'bg-red-50/70 border-red-200' : 'bg-emerald-50/70 border-emerald-200'
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
