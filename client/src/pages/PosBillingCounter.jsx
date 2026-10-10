import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Search, Trash2, Printer, Plus, Minus, UserCheck, Stethoscope, Sparkles, CheckCircle, Receipt, Clock, FileSpreadsheet, Package, X, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PosBillingCounter() {
  const [patients, setPatients] = useState([]);
  const [products, setProducts] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [users, setUsers] = useState([]);
  const [unbilledList, setUnbilledList] = useState([]);
  const [masterPackages, setMasterPackages] = useState([]);

  // Migration from Trial to Member Modal in POS
  const [migratedPatient, setMigratedPatient] = useState(null);
  const [showMigrationPackageModal, setShowMigrationPackageModal] = useState(false);
  const [selectedMigrationPackages, setSelectedMigrationPackages] = useState([]);
  const [submittingMigrationPkg, setSubmittingMigrationPkg] = useState(false);

  // Transaction Cart State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [activeTab, setActiveTab] = useState('RETAIL'); // 'RETAIL' or 'TINDAKAN'
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [clinicProfile, setClinicProfile] = useState(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Selected Professional Lines for Commissions (Auto-assigned)
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [activeDoinganId, setActiveDoinganId] = useState(null);

  // Thermal Receipt Modal
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View Mode: 'KASIR' or 'HISTORY'
  const [posViewMode, setPosViewMode] = useState('KASIR');
  const [historyTrxList, setHistoryTrxList] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchInitialPosData();

    // Auto-polling antrean tagihan unbilled POS setiap 3 detik
    const interval = setInterval(() => {
      fetchUnbilledQueueSilent();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchUnbilledQueueSilent = async () => {
    try {
      const [unbilledRes, pRes] = await Promise.all([
        axios.get('/api/doingan/unbilled'),
        axios.get('/api/pasien')
      ]);
      setUnbilledList(unbilledRes.data || []);
      setPatients(pRes.data || []);
    } catch (err) { }
  };

  const fetchTransactionHistory = async () => {
    setLoadingHistory(true);
    try {
      const queryParams = new URLSearchParams();
      if (historyStartDate) queryParams.append('start_date', historyStartDate);
      if (historyEndDate) queryParams.append('end_date', historyEndDate);
      if (historySearch) queryParams.append('search', historySearch);

      const res = await axios.get(`/api/transaksi?${queryParams.toString()}`);
      setHistoryTrxList(res.data || []);
    } catch (err) {
      console.error('Error fetching transaction history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleExportExcel = () => {
    if (historyTrxList.length === 0) {
      alert('Tidak ada data transaksi yang cocok dengan filter untuk diexport!');
      return;
    }

    const exportData = historyTrxList.map((trx, index) => ({
      'No.': index + 1,
      'No. Nota': trx.no_nota || '-',
      'Tanggal & Waktu': trx.created_at ? new Date(trx.created_at).toLocaleString('id-ID') : '-',
      'Nama Pasien': trx.pasien_nama || '-',
      'No. HP Pasien': trx.pasien_hp || '-',
      'Tipe Pasien': trx.tipe_pasien || '-',
      'Kasir': trx.kasir_nama || '-',
      'Petugas / Terapis': trx.therapist_nama || '-',
      'Subtotal (Rp)': trx.subtotal || 0,
      'Diskon (Rp)': trx.discount || 0,
      'Pajak PPN (Rp)': trx.tax_amount || 0,
      'Total Akhir (Rp)': trx.grand_total || 0,
      'Jumlah Bayar (Rp)': trx.payment_amount || 0,
      'Kembalian (Rp)': trx.change_amount || 0,
      'Poin Diperoleh': trx.earned_points || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet['!cols'] = [
      { wch: 5 },   // No.
      { wch: 22 },  // No. Nota
      { wch: 20 },  // Tanggal & Waktu
      { wch: 25 },  // Nama Pasien
      { wch: 16 },  // No. HP Pasien
      { wch: 14 },  // Tipe Pasien
      { wch: 20 },  // Kasir
      { wch: 20 },  // Petugas / Terapis
      { wch: 15 },  // Subtotal
      { wch: 15 },  // Diskon
      { wch: 18 },  // Pajak PPN
      { wch: 18 },  // Total Akhir
      { wch: 18 },  // Jumlah Bayar
      { wch: 15 },  // Kembalian
      { wch: 14 }   // Poin Diperoleh
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Transaksi');

    const dateSuffix = historyStartDate || historyEndDate
      ? `_${historyStartDate || 'Awal'}_s.d_${historyEndDate || 'Kini'}`
      : `_${new Date().toISOString().split('T')[0]}`;

    const fileName = `Laporan_Transaksi_DEFLOW${dateSuffix}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleOpenReceiptModal = async (trxId) => {
    try {
      const receiptRes = await axios.get(`/api/transaksi/${trxId}/receipt`);
      setReceiptData(receiptRes.data);
      setShowReceiptModal(true);
    } catch (err) {
      alert('Gagal memuat detail struk transaksi');
    }
  };

  const fetchInitialPosData = async () => {
    try {
      const [pRes, prodRes, tRes, uRes, unbilledRes, clinicRes, masterPkgRes] = await Promise.all([
        axios.get('/api/pasien'),
        axios.get('/api/stok'),
        axios.get('/api/tindakan'),
        axios.get('/api/users'),
        axios.get('/api/doingan/unbilled'),
        axios.get('/api/clinic-profile'),
        axios.get('/api/master-paket')
      ]);
      setPatients(pRes.data);
      setProducts(prodRes.data.filter(p => p.tipe_stok === 'RETAIL'));
      setTreatments(tRes.data);
      setUsers(uRes.data);
      setClinicProfile(clinicRes.data || null);
      setMasterPackages(masterPkgRes.data || []);
      const unbilled = unbilledRes.data || [];
      setUnbilledList(unbilled);

      if (pRes.data && pRes.data.length > 0) {
        const activeUnbilled = unbilled.length > 0 ? pRes.data.find(p => p.id === unbilled[0].pasien_id) : null;
        const defaultId = activeUnbilled ? activeUnbilled.id : pRes.data[0].id;
        setSelectedPatientId(defaultId);
        if (unbilled.length > 0) handleProcessUnbilledDoingan(unbilled[0], tRes.data);
      }
    } catch (err) {
      console.error('Error fetching POS data', err);
    }
  };

  const handleUpgradeTrialToMember = async (doi) => {
    try {
      const patient = patients.find(p => p.id === doi.pasien_id) || {
        id: doi.pasien_id,
        nama_lengkap: doi.pasien_nama,
        marketing_id: doi.marketing_id
      };
      await axios.put(`/api/pasien/${doi.pasien_id}`, {
        tipe_pasien: 'MEMBER'
      });
      setMigratedPatient(patient);
      setSelectedMigrationPackages([]);
      setShowMigrationPackageModal(true);
      fetchInitialPosData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status pasien ke Member');
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
      alert(`Berhasil! ${selectedMigrationPackages.length} paket telah ditambahkan ke pasien "${migratedPatient.nama_lengkap}". Tagihan sebesar Rp ${totalNominal.toLocaleString('id-ID')} telah diteruskan ke antrian Kasir POS.`);
      setShowMigrationPackageModal(false);
      setMigratedPatient(null);
      setSelectedMigrationPackages([]);
      fetchInitialPosData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan paket pembelian');
    } finally {
      setSubmittingMigrationPkg(false);
    }
  };

  const handleProcessUnbilledDoingan = (doi, tList = treatments) => {
    setSelectedPatientId(doi.pasien_id);

    const patientUnbilled = unbilledList.filter(d => d.pasien_id === doi.pasien_id);
    if (patientUnbilled.length > 0) {
      const newItems = patientUnbilled.map(d => {
        if (d.item_type === 'PAKET') {
          return {
            item_id: d.id,
            paket_id: d.id,
            jenis_item: 'PAKET',
            nama_item: 'Paket: ' + d.nama_tindakan,
            harga_satuan: Number(d.harga_paket) || 0,
            jumlah: 1,
            therapist_id: null
          };
        } else {
          const targetPatient = patients.find(p => p.id === d.pasien_id);
          const isTrial = (d.status_doingan === 'Trial' || d.tipe_pasien === 'TRIAL' || (targetPatient && targetPatient.tipe_pasien === 'TRIAL'));
          const matchingTreatment = (tList || treatments).find(t => t.id === d.tindakan_id) || (tList || treatments).find(t => t.nama_tindakan === d.nama_tindakan) || (tList || treatments).find(t => d.nama_tindakan?.startsWith(t.nama_tindakan));
          const basePrice = matchingTreatment ? (matchingTreatment.harga_paket || matchingTreatment.tarif_tindakan_medis || 0) : 0;
          const finalPrice = isTrial ? 0 : basePrice;
          const qty = (d.qty_benang && d.qty_benang > 1) ? d.qty_benang : 1;
          return {
            item_id: d.tindakan_id || 'doi-' + d.id,
            tindakan_id: d.tindakan_id || null,
            jenis_item: 'TINDAKAN',
            nama_item: d.nama_tindakan || 'Tindakan Treatment',
            harga_satuan: finalPrice,
            jumlah: isTrial ? 1 : qty,
            therapist_id: d.petugas_id
          };
        }
      });
      setCart(newItems);
      const doiTreatment = patientUnbilled.find(d => d.item_type !== 'PAKET');
      if (doiTreatment) {
        setActiveDoinganId(doiTreatment.id);
        setSelectedTherapistId(doiTreatment.petugas_id);
      } else {
        setActiveDoinganId(null);
        setSelectedTherapistId('');
      }
    }
  };

  const handlePatientSelectChange = (e) => {
    const pid = e.target.value;
    setSelectedPatientId(pid);
    const patientUnbilled = unbilledList.filter(d => d.pasien_id === pid);
    if (patientUnbilled.length > 0) {
      const newItems = patientUnbilled.map(doi => {
        if (doi.item_type === 'PAKET') {
          return {
            item_id: doi.id,
            paket_id: doi.id,
            jenis_item: 'PAKET',
            nama_item: 'Paket: ' + doi.nama_tindakan,
            harga_satuan: Number(doi.harga_paket) || 0,
            jumlah: 1,
            therapist_id: null
          };
        } else {
          const targetPatient = patients.find(p => p.id === doi.pasien_id);
          const isTrial = (doi.status_doingan === 'Trial' || doi.tipe_pasien === 'TRIAL' || (targetPatient && targetPatient.tipe_pasien === 'TRIAL'));
          const matchingTreatment = treatments.find(t => t.id === doi.tindakan_id) || treatments.find(t => t.nama_tindakan === doi.nama_tindakan) || treatments.find(t => doi.nama_tindakan?.startsWith(t.nama_tindakan));
          const basePrice = matchingTreatment ? (matchingTreatment.harga_paket || matchingTreatment.tarif_tindakan_medis || 0) : 0;
          const qty = (doi.qty_benang && doi.qty_benang > 1) ? doi.qty_benang : 1;
          return {
            item_id: doi.tindakan_id || 'doi-' + doi.id,
            tindakan_id: doi.tindakan_id || null,
            jenis_item: 'TINDAKAN',
            nama_item: doi.nama_tindakan || 'Tindakan Treatment',
            harga_satuan: isTrial ? 0 : basePrice,
            jumlah: isTrial ? 1 : qty,
            therapist_id: doi.petugas_id
          };
        }
      });
      setCart(newItems);
      const doiTreatment = patientUnbilled.find(d => d.item_type !== 'PAKET');
      if (doiTreatment) {
        setActiveDoinganId(doiTreatment.id);
        setSelectedTherapistId(doiTreatment.petugas_id);
      } else {
        setActiveDoinganId(null);
        setSelectedTherapistId('');
      }
    } else {
      setCart([]);
      setActiveDoinganId(null);
      setSelectedTherapistId('');
    }
  };

  const addToCart = (item, type) => {
    const selectedPatient = patients.find(p => p.id === selectedPatientId);
    const isTrial = selectedPatient && selectedPatient.tipe_pasien === 'TRIAL';

    const existingIndex = cart.findIndex(c => c.item_id === item.id && c.jenis_item === type);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].jumlah += 1;
      setCart(updatedCart);
    } else {
      let hargaItem = type === 'RETAIL' ? item.harga_jual : (item.tarif_tindakan_medis || 0);
      if (type === 'TINDAKAN' && isTrial) {
        hargaItem = 0;
      }
      const newItem = {
        item_id: item.id,
        produk_id: type === 'RETAIL' ? item.id : null,
        tindakan_id: type === 'TINDAKAN' ? item.id : null,
        jenis_item: type,
        nama_item: type === 'RETAIL' ? item.nama_produk : item.nama_tindakan,
        harga_satuan: hargaItem,
        jumlah: 1
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (index, delta) => {
    const updatedCart = [...cart];
    updatedCart[index].jumlah += delta;
    if (updatedCart[index].jumlah <= 0) {
      updatedCart.splice(index, 1);
    }
    setCart(updatedCart);
  };

  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  // Calculations
  const isTaxEnabled = clinicProfile ? (clinicProfile.is_tax_enabled === 1 || clinicProfile.is_tax_enabled === true || clinicProfile.is_tax_enabled === '1') : true;
  const taxRatePercent = clinicProfile && clinicProfile.tax_rate_percent !== null && clinicProfile.tax_rate_percent !== undefined ? Number(clinicProfile.tax_rate_percent) : 11;
  const taxRate = isTaxEnabled ? (taxRatePercent / 100) : 0;
  const subtotal = cart.reduce((sum, item) => sum + (item.harga_satuan * item.jumlah), 0);
  const discount = Number(discountAmount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = isTaxEnabled && taxRate > 0 ? Math.round(taxable * taxRate) : 0;
  const grandTotal = taxable + taxAmount;
  const payment = Number(paymentAmount) || grandTotal;
  const changeAmount = Math.max(0, payment - grandTotal);
  const earnedPoints = 0;

  const filteredPatients = patients.filter(p => {
    const q = (patientSearch || '').toLowerCase();
    return (p.nama_lengkap || '').toLowerCase().includes(q) || (p.no_hp || '').includes(q);
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const selectedTherapistUser = users.find(u => u.id === selectedTherapistId);

  const handleCheckout = async () => {
    if (!selectedPatientId) {
      alert('Pilih pasien terlebih dahulu!');
      return;
    }
    if (cart.length === 0) {
      alert('Keranjang transaksi masih kosong!');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        pasien_id: selectedPatientId,
        items: cart,
        discount_amount: discount,
        payment_amount: payment,
        therapist_id: selectedTherapistId || null,
        doingan_id: activeDoinganId || null
      };

      const res = await axios.post('/api/transaksi', payload);
      const trxId = res.data.transaksi_id;

      // Fetch dynamic receipt data
      const receiptRes = await axios.get(`/api/transaksi/${trxId}/receipt`);
      setReceiptData(receiptRes.data);
      setShowReceiptModal(true);

      // Reset Cart
      setCart([]);
      setDiscountAmount(0);
      setPaymentAmount('');
      setActiveDoinganId(null);
      setSelectedTherapistId('');
      fetchInitialPosData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.nama_produk.toLowerCase().includes(itemSearch.toLowerCase()) || (p.kode_sku && p.kode_sku.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  const filteredTreatments = treatments.filter(t =>
    t.nama_tindakan.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#e5ded4] pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Kasir POS & Transaksi</h1>
          <p className="text-xs text-[#514440]">Point of Sale kasir klinik, tagihan otomatis pasien selesai treatment dan cetak struk termal.</p>
        </div>

        <div className="flex bg-[#faf3e8] p-1 border border-[#d6c2bd] rounded-2xl text-xs font-bold self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setPosViewMode('KASIR')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${posViewMode === 'KASIR' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'
              }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Terminal Kasir POS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPosViewMode('HISTORY');
              fetchTransactionHistory();
            }}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${posViewMode === 'HISTORY' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'
              }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Riwayat Transaksi & Struk Kasir</span>
          </button>
        </div>
      </div>

      {posViewMode === 'HISTORY' ? (
        /* TRANSACTION HISTORY VIEW */
        <div className="space-y-5">
          {/* History Filter Card */}
          <div className="bg-[#faf3e8] p-4 rounded-2xl border border-[#d6c2bd] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-[#7d5141] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />
                <span>Filter Historical Transaksi Pasien & Struk</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={historyTrxList.length === 0}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={fetchTransactionHistory}
                  disabled={loadingHistory}
                  className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  {loadingHistory ? 'Memuat...' : 'Cari Transaksi'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#514440] mb-1">Cari Nota / Nama / HP Pasien</label>
                <input
                  type="text"
                  placeholder="No. Nota (INV/...), nama, HP..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-medium text-[#1e1b15]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#514440] mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#514440] mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl font-bold text-[#1e1b15]"
                />
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">Daftar Riwayat Transaksi Penjualan</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#7d5141] font-bold">{historyTrxList.length} Transaksi Ditemukan</span>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={historyTrxList.length === 0}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 disabled:opacity-50 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-4">Waktu & No. Nota</th>
                    <th className="py-3 px-4">Nama Pasien</th>
                    <th className="py-3 px-4">Kasir & Petugas</th>
                    <th className="py-3 px-4">Rincian Bayar</th>
                    <th className="py-3 px-4">Total Akhir</th>
                    <th className="py-3 px-4 text-center">Struk / Thermal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {historyTrxList.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-400 italic">
                        Belum ada riwayat transaksi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    historyTrxList.map(trx => (
                      <tr key={trx.id} className="hover:bg-[#fff8f0]">
                        <td className="py-3.5 px-4 text-[#83746f]">
                          <div className="font-bold text-[#1e1b15] text-xs">{trx.no_nota}</div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(trx.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#1e1b15]">
                          {trx.pasien_nama}
                          <div className="text-[10px] font-normal text-gray-500">HP: {trx.pasien_hp} ({trx.tipe_pasien})</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#1e1b15]">Kasir: {trx.kasir_nama}</div>
                          {trx.therapist_nama && <div className="text-[10px] text-[#7d5141]">Petugas: {trx.therapist_nama}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-[#514440]">
                          <div>Subtotal: Rp {trx.subtotal?.toLocaleString('id-ID')}</div>
                          {trx.discount > 0 && <div className="text-red-600">Diskon: -Rp {trx.discount?.toLocaleString('id-ID')}</div>}
                          {trx.tax_amount > 0 && (
                            <div className="text-gray-400 text-[10px]">PPN: Rp {trx.tax_amount?.toLocaleString('id-ID')}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-800 text-sm">
                          Rp {trx.grand_total?.toLocaleString('id-ID')}
                          <div className="text-[10px] font-normal text-gray-400">+{trx.earned_points || 0} Poin</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenReceiptModal(trx.id)}
                            className="px-3 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#7d5141] font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#7d5141]" />
                            <span>Struk</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* KASIR POS VIEW MODE */
        <>
          {/* AUTO BILLING QUEUE BANNER */}
          {unbilledList.length > 0 && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-300 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
                  <span>Antrian Tagihan Pasien Selesai Treatment & Paket Baru ({unbilledList.length})</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase font-bold">Auto POS Billing Queue</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unbilledList.map(doi => (
                  <div key={doi.id} className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-[#1e1b15]">{doi.pasien_nama}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${doi.item_type === 'PAKET'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold'
                        : 'bg-amber-100 text-amber-900'
                        }`}>
                        {doi.item_type === 'PAKET' ? '📦 PAKET MEMBER' : (doi.tipe_pasien === 'NON-TRIAL' || doi.tipe_pasien === 'Reguler' ? 'MEMBER' : doi.tipe_pasien)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#514440]">
                      <strong>{doi.item_type === 'PAKET' ? 'Paket Dibeli:' : 'Tindakan:'}</strong> {doi.nama_tindakan}
                    </div>
                    {doi.item_type === 'PAKET' ? (
                      <div className="text-[11px] text-purple-800 font-bold">
                        <strong>Nominal:</strong> Rp {Number(doi.harga_paket || 0).toLocaleString('id-ID')}
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-800 font-semibold">
                        <strong>Petugas:</strong> {doi.petugas_nama}{(doi.lini_profesi || doi.petugas_role || doi.role_petugas) ? ` (${doi.lini_profesi || doi.petugas_role || doi.role_petugas})` : ''}
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1">
                      {doi.tipe_pasien === 'TRIAL' && doi.item_type !== 'PAKET' && (
                        <button
                          type="button"
                          onClick={() => handleUpgradeTrialToMember(doi)}
                          className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-lg cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                          title="Ubah status pasien dari Trial ke Member & Pilih Paket"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Ubah ke Member (Beli Paket)</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleProcessUnbilledDoingan(doi)}
                        className="w-full py-1.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Proses Tagihan ini ke Kasir</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Patient Selection & Collapsible Catalog (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              {/* Patient Selector Card */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#e5ded4] pb-2">
                  <label className="block text-xs font-bold text-[#514440] uppercase tracking-wider">
                    Pilih Pasien Transaksi *
                  </label>
                  {selectedPatient && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedPatient.tipe_pasien === 'TRIAL'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                      {selectedPatient.tipe_pasien === 'NON-TRIAL' || selectedPatient.tipe_pasien === 'Reguler' ? 'MEMBER' : selectedPatient.tipe_pasien}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ketik cari nama / No. HP pasien..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-medium focus:outline-none focus:border-[#7d5141]"
                    />
                    <Search className="w-4 h-4 text-[#83746f] absolute left-2.5 top-2.5" />
                  </div>
                  <select
                    value={selectedPatientId}
                    onChange={handlePatientSelectChange}
                    className="w-full py-2.5 px-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-semibold text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  >
                    {filteredPatients.length === 0 ? (
                      <option value="">-- Tidak Ada Pasien Aktif --</option>
                    ) : (
                      filteredPatients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nama_lengkap} ({p.tipe_pasien === 'NON-TRIAL' || p.tipe_pasien === 'Reguler' ? 'MEMBER' : p.tipe_pasien}) - {p.no_hp}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {selectedPatient && (
                  <div className="p-3 bg-[#faf3e8] rounded-xl border border-[#d6c2bd] flex items-center justify-between text-xs text-[#7d5141] font-semibold">
                    <div>
                      <span className="text-[11px] text-[#514440] block">Pasien Aktif:</span>
                      <strong className="text-sm text-[#1e1b15]">{selectedPatient.nama_lengkap}</strong>
                      <span className="text-[11px] text-gray-500 ml-1.5">({selectedPatient.no_hp})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Total Poin Pasien</span>
                      <span className="text-sm font-bold text-emerald-800">+{selectedPatient.total_poin || 0} Poin</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Product & Service Catalog (Accordion) */}
              <div className="bg-white rounded-2xl border border-[#e5ded4] shadow-xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors cursor-pointer ${isCatalogOpen ? 'bg-[#faf3e8] border-b border-[#e5ded4]' : 'bg-white hover:bg-[#faf3e8]/70'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#faf3e8] border border-[#d6c2bd] text-[#7d5141] flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#1e1b15] uppercase tracking-wider flex items-center gap-1.5">
                        <span>+ Katalog Produk & Tindakan</span>
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 rounded-full font-semibold normal-case">Opsional</span>
                      </div>
                      <p className="text-[11px] text-[#83746f] mt-0.5">
                        Buka jika ingin menambah pembelian atau jasa ke keranjang
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-[#7d5141] bg-white border border-[#d6c2bd] px-2.5 py-1.5 rounded-xl shrink-0 shadow-2xs">
                    <span>{isCatalogOpen ? 'Tutup Katalog' : 'Buka Katalog'}</span>
                    {isCatalogOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {isCatalogOpen && (
                  <div className="p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex gap-1 p-1 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setActiveTab('RETAIL')}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${activeTab === 'RETAIL' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'}`}
                        >
                          Produk Retail ({products.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('TINDAKAN')}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${activeTab === 'TINDAKAN' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'}`}
                        >
                          Tindakan Medis ({treatments.length})
                        </button>
                      </div>

                      <div className="relative flex-1 sm:max-w-xs">
                        <input
                          type="text"
                          placeholder="Cari item..."
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs focus:outline-none focus:border-[#7d5141]"
                        />
                        <Search className="w-3.5 h-3.5 text-[#83746f] absolute left-2.5 top-2" />
                      </div>
                    </div>

                    {/* Catalog Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {activeTab === 'RETAIL' ? (
                        filteredProducts.length === 0 ? (
                          <div className="sm:col-span-2 text-center py-6 text-gray-400 italic text-xs">
                            Tidak ada produk retail yang cocok.
                          </div>
                        ) : (
                          filteredProducts.map(p => (
                            <div key={p.id} className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex flex-col justify-between hover:border-[#7d5141] transition-all">
                              <div>
                                <div className="flex justify-between items-start">
                                  <span className="text-[10px] font-bold text-[#7d5141] uppercase tracking-wider">{p.kode_sku}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.sisa_stok > p.minimum_stok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                    Stok: {Math.max(0, p.sisa_stok)} {p.satuan} {p.sisa_stok <= 0 && '(Habis)'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-xs text-[#1e1b15] mt-1">{p.nama_produk}</h4>
                                <p className="text-xs font-semibold text-[#7d5141] mt-1">Rp {p.harga_jual.toLocaleString('id-ID')}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => addToCart(p, 'RETAIL')}
                                disabled={p.sisa_stok <= 0}
                                className="mt-2.5 w-full py-1.5 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-300 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Tambah Ke Cart
                              </button>
                            </div>
                          ))
                        )
                      ) : (
                        filteredTreatments.length === 0 ? (
                          <div className="sm:col-span-2 text-center py-6 text-gray-400 italic text-xs">
                            Tidak ada tindakan medis yang cocok.
                          </div>
                        ) : (
                          filteredTreatments.map(t => (
                            <div key={t.id} className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex flex-col justify-between hover:border-[#7d5141] transition-all">
                              <div>
                                <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Tindakan Medis</div>
                                <h4 className="font-bold text-xs text-[#1e1b15] mt-1">{t.nama_tindakan}</h4>
                                <p className="text-xs font-semibold text-[#7d5141] mt-1">
                                  Rp {(t.tarif_tindakan_medis || 0).toLocaleString('id-ID')}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => addToCart(t, 'TINDAKAN')}
                                className="mt-2.5 w-full py-1.5 bg-purple-800 hover:bg-purple-900 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Tambah Tindakan
                              </button>
                            </div>
                          ))
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Checkout Cart & Professional References (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4 sticky top-20">
                <div className="flex items-center justify-between border-b border-[#e5ded4] pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-[#7d5141]" />
                    <h3 className="font-serif font-bold text-base text-[#1e1b15]">Keranjang Kasir POS</h3>
                  </div>
                  <span className="text-xs text-[#83746f] font-semibold">{cart.length} Item</span>
                </div>

                {/* Cart Items List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 italic">Keranjang belanja belum terisi.</div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex items-center justify-between text-xs">
                        <div className="flex-1 pr-2">
                          <div className="font-bold text-[#1e1b15]">{item.nama_item}</div>
                          <div className="text-[11px] text-[#7d5141]">Rp {item.harga_satuan.toLocaleString('id-ID')} x {item.jumlah}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-[#d6c2bd] rounded-lg bg-white">
                            <button onClick={() => updateQuantity(idx, -1)} className="px-1.5 py-0.5 text-gray-600 hover:bg-gray-100 rounded-l cursor-pointer">-</button>
                            <span className="px-2 font-bold text-xs">{item.jumlah}</span>
                            <button onClick={() => updateQuantity(idx, 1)} className="px-1.5 py-0.5 text-gray-600 hover:bg-gray-100 rounded-r cursor-pointer">+</button>
                          </div>
                          <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-700 p-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* AUTOMATIC STAFF ASSIGNMENT INFO BADGE (Manual Dropdowns Removed) */}
                {selectedTherapistUser && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-emerald-900 uppercase tracking-wider text-[10px]">Petugas yang Melayani (Otomatis):</div>
                    <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{selectedTherapistUser.full_name} ({selectedTherapistUser.lini_profesi || selectedTherapistUser.role})</span>
                    </div>
                  </div>
                )}

                {/* Price Calculations */}
                <div className="space-y-1.5 pt-2 border-t border-[#e5ded4] text-xs">
                  <div className="flex justify-between text-[#514440]">
                    <span>Subtotal Item</span>
                    <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center text-[#514440]">
                    <span>Diskon Transaksi (Rp)</span>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-24 px-2 py-1 text-right bg-[#faf3e8] border border-[#d6c2bd] rounded-lg text-xs font-semibold"
                    />
                  </div>

                  {isTaxEnabled && taxRate > 0 && (
                    <div className="flex justify-between text-[#514440]">
                      <span>Pajak PPN ({taxRatePercent}%)</span>
                      <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-[#e5ded4] text-base font-bold text-[#7d5141]">
                    <span>TOTAL BAYAR</span>
                    <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="font-semibold text-[#514440]">Bayar Tunai / Cash (Rp)</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      placeholder={grandTotal}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-28 px-2 py-1 text-right bg-[#faf3e8] border border-[#d6c2bd] rounded-lg text-xs font-bold text-[#1e1b15]"
                    />
                  </div>

                  <div className="flex justify-between text-xs text-emerald-700 font-bold pt-0.5">
                    <span>Kembalian</span>
                    <span>Rp {changeAmount.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="text-[10px] text-[#83746f] italic text-right pt-1 border-t border-[#e5ded4]">
                    * Poin khusus didapatkan 5% oleh Member Referrer via MGM saat transaksi paket
                  </div>
                </div>

                {/* Checkout Action Button */}
                <button
                  onClick={handleCheckout}
                  disabled={submitting || cart.length === 0}
                  className="w-full py-3 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-300 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? 'Memproses Nota...' : 'PROSES KASIR & CETAK STRUK'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DYNAMIC POS THERMAL RECEIPT MODAL (58mm/80mm Wireframe) */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-300">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#7d5141]" /> Dynamic Thermal Receipt Wireframe
              </h3>
              <button onClick={() => setShowReceiptModal(false)} className="text-gray-400 font-bold text-lg">×</button>
            </div>

            {/* PRINTABLE RECEIPT CONTAINER */}
            <div id="printable-receipt" className="font-mono text-[11px] leading-tight text-black p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="text-center font-bold uppercase">
                ========================================<br />
                {receiptData.clinic.clinic_name}<br />
                {receiptData.clinic.tagline}<br />
                {receiptData.clinic.address}<br />
                TELP/WA: {receiptData.clinic.whatsapp}<br />
                ========================================
              </div>

              <div className="grid grid-cols-[75px_auto_1fr] gap-x-1.5 leading-tight">
                <span>No. Nota</span>
                <span>:</span>
                <span className="font-bold">{receiptData.transaction.no_nota}</span>

                <span>Tanggal</span>
                <span>:</span>
                <span>{new Date(receiptData.transaction.created_at).toLocaleString('id-ID')}</span>

                <span>Kasir</span>
                <span>:</span>
                <span>{receiptData.transaction.kasir_nama}</span>

                <span>Pelanggan</span>
                <span>:</span>
                <span>{receiptData.transaction.pasien_nama} ({receiptData.transaction.tipe_pasien === 'NON-TRIAL' || receiptData.transaction.tipe_pasien === 'Reguler' ? 'MEMBER' : receiptData.transaction.tipe_pasien})</span>
              </div>

              <div className="border-t border-b border-dashed border-gray-400 py-1 space-y-1">
                {receiptData.details.map((dtl, i) => (
                  <div key={i}>
                    <div className="flex justify-between">
                      <span>{dtl.jumlah}x {dtl.nama_item}</span>
                      <span>Rp {dtl.subtotal_item.toLocaleString('id-ID')}</span>
                    </div>
                    {receiptData.transaction.therapist_nama && (
                      <div className="text-[10px] text-gray-600 pl-2">
                        (Ref Terapis: {receiptData.transaction.therapist_nama})
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rp {receiptData.transaction.subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diskon:</span>
                  <span>Rp {receiptData.transaction.discount.toLocaleString('id-ID')}</span>
                </div>
                {receiptData.transaction.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Pajak (PPN {receiptData.clinic?.tax_rate_percent || 11}%):</span>
                    <span>Rp {receiptData.transaction.tax_amount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-gray-400 pt-0.5 flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>Rp {receiptData.transaction.grand_total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>BAYAR (Cash):</span>
                  <span>Rp {receiptData.transaction.payment_amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>KEMBALI:</span>
                  <span>Rp {receiptData.transaction.change_amount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-gray-400 py-1">
                {receiptData.transaction.earned_points > 0 && (
                  <div className="flex justify-between">
                    <span>Poin Diperoleh:</span>
                    <span>+{receiptData.transaction.earned_points} Poin</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total Poin MGM:</span>
                  <span>{receiptData.transaction.total_poin || 0} Poin</span>
                </div>
              </div>

              <div className="text-center font-bold pt-1 uppercase">
                Terima Kasih Atas Kunjungan Anda<br />
                {receiptData.next_control_date && receiptData.next_control_date !== '-' && (
                  <>Jadwal Kontrol Anda: {receiptData.next_control_date}<br /></>
                )}
                ========================================
              </div>
            </div>

            {/* Print Action Button */}
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Struk Termal (58mm/80mm)
            </button>
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
