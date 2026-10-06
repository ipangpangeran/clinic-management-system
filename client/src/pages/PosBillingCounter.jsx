import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Search, Trash2, Printer, Plus, Minus, UserCheck, Stethoscope, Sparkles, CheckCircle, Receipt, Clock } from 'lucide-react';

export default function PosBillingCounter() {
  const [patients, setPatients] = useState([]);
  const [products, setProducts] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [users, setUsers] = useState([]);
  const [unbilledList, setUnbilledList] = useState([]);

  // Transaction Cart State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [activeTab, setActiveTab] = useState('RETAIL'); // 'RETAIL' or 'TINDAKAN'
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Selected Professional Lines for Commissions (Auto-assigned)
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [activeDoinganId, setActiveDoinganId] = useState(null);

  // Thermal Receipt Modal
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialPosData();
  }, []);

  const fetchInitialPosData = async () => {
    try {
      const [pRes, prodRes, tRes, uRes, unbilledRes] = await Promise.all([
        axios.get('/api/pasien'),
        axios.get('/api/stok'),
        axios.get('/api/tindakan'),
        axios.get('/api/users'),
        axios.get('/api/doingan/unbilled')
      ]);
      setPatients(pRes.data);
      setProducts(prodRes.data.filter(p => p.tipe_stok === 'RETAIL'));
      setTreatments(tRes.data);
      setUsers(uRes.data);
      const unbilled = unbilledRes.data || [];
      setUnbilledList(unbilled);

      const activeUnbilledPatients = pRes.data.filter(p => unbilled.some(doi => doi.pasien_id === p.id));
      if (activeUnbilledPatients.length > 0) {
        setSelectedPatientId(activeUnbilledPatients[0].id);
        const doi = unbilled.find(d => d.pasien_id === activeUnbilledPatients[0].id);
        if (doi) handleProcessUnbilledDoingan(doi, tRes.data);
      } else {
        setSelectedPatientId('');
        setCart([]);
      }
    } catch (err) {
      console.error('Error fetching POS data', err);
    }
  };

  const handleProcessUnbilledDoingan = (doi, tList = treatments) => {
    setSelectedPatientId(doi.pasien_id);
    setSelectedTherapistId(doi.petugas_id);
    setActiveDoinganId(doi.id);

    const matchingTreatment = tList.find(t => t.id === doi.tindakan_id) || tList.find(t => t.nama_tindakan === doi.nama_tindakan);
    const finalPrice = matchingTreatment ? (matchingTreatment.tarif_tindakan_medis || matchingTreatment.tarif_konsul_dokter || 150000) : 150000;

    const newItem = {
      item_id: doi.tindakan_id || 'doi-' + doi.id,
      tindakan_id: doi.tindakan_id || null,
      jenis_item: 'TINDAKAN',
      nama_item: doi.nama_tindakan || 'Tindakan Treatment',
      harga_satuan: finalPrice,
      jumlah: 1,
      therapist_id: doi.petugas_id
    };

    setCart([newItem]);
  };

  const handlePatientSelectChange = (e) => {
    const pid = e.target.value;
    setSelectedPatientId(pid);
    const doi = unbilledList.find(d => d.pasien_id === pid);
    if (doi) {
      handleProcessUnbilledDoingan(doi);
    }
  };

  const addToCart = (item, type) => {
    const existingIndex = cart.findIndex(c => c.item_id === item.id && c.jenis_item === type);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].jumlah += 1;
      setCart(updatedCart);
    } else {
      const newItem = {
        item_id: item.id,
        produk_id: type === 'RETAIL' ? item.id : null,
        tindakan_id: type === 'TINDAKAN' ? item.id : null,
        jenis_item: type,
        nama_item: type === 'RETAIL' ? item.nama_produk : item.nama_tindakan,
        harga_satuan: type === 'RETAIL' ? item.harga_jual : (item.tarif_tindakan_medis || item.tarif_konsul_dokter),
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
  const subtotal = cart.reduce((sum, item) => sum + (item.harga_satuan * item.jumlah), 0);
  const discount = Number(discountAmount) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(taxable * 0.11);
  const grandTotal = taxable + taxAmount;
  const payment = Number(paymentAmount) || grandTotal;
  const changeAmount = Math.max(0, payment - grandTotal);
  const earnedPoints = Math.floor(grandTotal / 50000);

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

  // Only patients who have completed treatment today and are not yet billed
  const activePosPatients = patients.filter(p => unbilledList.some(doi => doi.pasien_id === p.id));

  const filteredPatients = activePosPatients.filter(p => 
    p.nama_lengkap.toLowerCase().includes(patientSearch.toLowerCase()) || p.no_hp.includes(patientSearch)
  );

  const filteredProducts = products.filter(p => 
    p.nama_produk.toLowerCase().includes(itemSearch.toLowerCase()) || (p.kode_sku && p.kode_sku.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  const filteredTreatments = treatments.filter(t => 
    t.nama_tindakan.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">POS & Billing Counter</h1>
          <p className="text-xs text-[#514440]">Point of Sale kasir klinik, tagihan otomatis pasien selesai treatment, hitung poin, PPN 11%, dan cetak struk termal.</p>
        </div>
      </div>

      {/* AUTO BILLING QUEUE BANNER */}
      {unbilledList.length > 0 && (
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-300 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 animate-pulse" />
              <span>Antrian Tagihan Pasien Selesai Treatment ({unbilledList.length})</span>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase font-bold">Auto POS Billing Queue</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unbilledList.map(doi => (
              <div key={doi.id} className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-[#1e1b15]">{doi.pasien_nama}</div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">{doi.tipe_pasien}</span>
                </div>
                <div className="text-[11px] text-[#514440]">
                  <strong>Tindakan:</strong> {doi.nama_tindakan}
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold">
                  <strong>Petugas:</strong> {doi.petugas_nama} ({doi.lini_profesi || doi.petugas_role})
                </div>
                <button
                  onClick={() => handleProcessUnbilledDoingan(doi)}
                  className="w-full mt-1 py-1.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Proses Tagihan ini ke Kasir</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product & Service Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Patient Selector Card */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-2">
            <label className="block text-xs font-bold text-[#514440] uppercase tracking-wider">
              Pilih Pasien Transaksi *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari nama / HP pasien..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
                <Search className="w-4 h-4 text-[#83746f] absolute left-2.5 top-2.5" />
              </div>
              <select
                value={selectedPatientId}
                onChange={handlePatientSelectChange}
                className="flex-1 py-2 px-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-semibold text-[#1e1b15]"
              >
                {filteredPatients.length === 0 ? (
                  <option value="">-- Tidak Ada Pasien Aktif (Belum Ditagih) --</option>
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
              <div className="flex items-center justify-between text-xs pt-1 px-1 text-[#7d5141] font-semibold">
                <span>Tipe: {selectedPatient.tipe_pasien === 'NON-TRIAL' || selectedPatient.tipe_pasien === 'Reguler' ? 'MEMBER' : selectedPatient.tipe_pasien}</span>
                <span>Poin Sekarang: +{selectedPatient.total_poin} Poin</span>
              </div>
            )}
          </div>

          {/* Catalog Tabs & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1 p-1 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs">
                <button
                  onClick={() => setActiveTab('RETAIL')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'RETAIL' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'}`}
                >
                  Produk Retail Skincare
                </button>
                <button
                  onClick={() => setActiveTab('TINDAKAN')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === 'TINDAKAN' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'}`}
                >
                  Tindakan & Jasa Medis
                </button>
              </div>

              <div className="relative w-48">
                <input
                  type="text"
                  placeholder="Cari item..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
                <Search className="w-3.5 h-3.5 text-[#83746f] absolute left-2 top-2" />
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {activeTab === 'RETAIL' ? (
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
                      onClick={() => addToCart(p, 'RETAIL')}
                      disabled={p.sisa_stok <= 0}
                      className="mt-3 w-full py-1.5 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-300 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Ke Cart
                    </button>
                  </div>
                ))
              ) : (
                filteredTreatments.map(t => (
                  <div key={t.id} className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex flex-col justify-between hover:border-[#7d5141] transition-all">
                    <div>
                      <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Tindakan Medis</div>
                      <h4 className="font-bold text-xs text-[#1e1b15] mt-1">{t.nama_tindakan}</h4>
                      <p className="text-xs font-semibold text-[#7d5141] mt-1">
                        Rp {(t.tarif_tindakan_medis || t.tarif_konsul_dokter).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(t, 'TINDAKAN')}
                      className="mt-3 w-full py-1.5 bg-purple-800 hover:bg-purple-900 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Tindakan
                    </button>
                  </div>
                ))

              )}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Cart & Professional References (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
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

              <div className="flex justify-between text-[#514440]">
                <span>Pajak PPN 11%</span>
                <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
              </div>

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

              <div className="flex justify-between text-[11px] text-amber-700 font-semibold pt-1">
                <span>Estimasi Poin Diperoleh</span>
                <span>+{earnedPoints} Poin</span>
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
                ========================================<br/>
                {receiptData.clinic.clinic_name}<br/>
                {receiptData.clinic.tagline}<br/>
                {receiptData.clinic.address}<br/>
                TELP/WA: {receiptData.clinic.whatsapp}<br/>
                ========================================
              </div>

              <div>
                No. Nota : {receiptData.transaction.no_nota}<br/>
                Tanggal  : {new Date(receiptData.transaction.created_at).toLocaleString('id-ID')}<br/>
                Kasir    : {receiptData.transaction.kasir_nama}<br/>
                Pelanggan: {receiptData.transaction.pasien_nama} ({receiptData.transaction.tipe_pasien === 'NON-TRIAL' || receiptData.transaction.tipe_pasien === 'Reguler' ? 'MEMBER' : receiptData.transaction.tipe_pasien})
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
                <div className="flex justify-between">
                  <span>Pajak (PPN 11%):</span>
                  <span>Rp {receiptData.transaction.tax_amount.toLocaleString('id-ID')}</span>
                </div>
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
                <div className="flex justify-between">
                  <span>Poin Diperoleh:</span>
                  <span>+{receiptData.transaction.earned_points} Poin</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total Poin Sekarang:</span>
                  <span>{receiptData.transaction.total_poin} Poin</span>
                </div>
              </div>

              <div className="text-center font-bold pt-1 uppercase">
                Terima Kasih Atas Kunjungan Anda<br/>
                Jadwal Kontrol Anda: {receiptData.next_control_date}<br/>
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
    </div>
  );
}
