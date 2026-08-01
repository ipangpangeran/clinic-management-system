import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { PackageCheck, AlertTriangle, Plus, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export default function LogisticsInventory() {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [mutations, setMutations] = useState([]);
  const [activeTab, setActiveTab] = useState('RETAIL'); // 'RETAIL', 'THERAPIST_BTC', 'KLINIK_NON_MEDIS', 'MUTASI'

  // Add Product Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [namaProduk, setNamaProduk] = useState('');
  const [kodeSku, setKodeSku] = useState('');
  const [tipeStok, setTipeStok] = useState('RETAIL');
  const [hargaJual, setHargaJual] = useState(0);
  const [sisaStok, setSisaStok] = useState(10);
  const [minimumStok, setMinimumStok] = useState(5);
  const [satuan, setSatuan] = useState('pcs');

  // Request / Mutasi Form State
  const [showMutationModal, setShowMutationModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [mutationType, setMutationType] = useState('REQUEST'); // 'IN', 'OUT', 'REQUEST'
  const [mutationJumlah, setMutationJumlah] = useState(5);
  const [mutationNotes, setMutationNotes] = useState('');

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const [prodRes, mutRes] = await Promise.all([
        axios.get('/api/stok'),
        axios.get('/api/stok/mutasi')
      ]);
      setProducts(prodRes.data);
      setMutations(mutRes.data);
    } catch (err) {
      console.error('Error fetching inventory data', err);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/stok', {
        nama_produk: namaProduk,
        kode_sku: kodeSku || ('SKU-' + Date.now()),
        tipe_stok: tipeStok,
        harga_jual: Number(hargaJual),
        sisa_stok: Number(sisaStok),
        minimum_stok: Number(minimumStok),
        satuan: satuan
      });
      alert('Produk inventori berhasil ditambahkan!');
      setShowProductModal(false);
      fetchInventoryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat produk');
    }
  };

  const handleCreateMutation = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/stok/mutasi', {
        produk_id: selectedProductId,
        tipe: mutationType,
        jumlah: Number(mutationJumlah),
        notes: mutationNotes
      });
      alert('Pengajuan / pencatatan mutasi stok berhasil!');
      setShowMutationModal(false);
      fetchInventoryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses mutasi stok');
    }
  };

  const handleApproval = async (mutasiId, status) => {
    try {
      await axios.put(`/api/stok/mutasi/${mutasiId}/approval`, { status });
      alert(`Status mutasi berhasil diubah menjadi ${status}`);
      fetchInventoryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status approval');
    }
  };

  const filteredProducts = products.filter(p => p.tipe_stok === activeTab);
  const lowStockCount = products.filter(p => p.sisa_stok <= p.minimum_stok).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Logistik & Stok Inventori (ASM)</h1>
          <p className="text-xs text-[#514440]">Kelola stok produk retail skin care, bahan medis BTC terapis, dan operasional klinik non-medis.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMutationModal(true)}
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> + Request / Mutasi Stok
          </button>
          <button
            onClick={() => setShowProductModal(true)}
            className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> + Tambah Produk Inventori
          </button>
        </div>
      </div>

      {/* Alert Low Stock */}
      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between text-red-800 text-xs font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>Terdapat <strong>{lowStockCount} item produk</strong> yang memiliki sisa stok di bawah batas minimum alert!</span>
          </div>
          <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">PERLU RESTOK</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
        <div className="flex gap-2 border-b border-[#e5ded4] pb-3 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('RETAIL')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'RETAIL' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            Produk Retail Skin Care ({products.filter(p => p.tipe_stok === 'RETAIL').length})
          </button>
          <button
            onClick={() => setActiveTab('THERAPIST_BTC')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'THERAPIST_BTC' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            Consumable / BTC Terapis ({products.filter(p => p.tipe_stok === 'THERAPIST_BTC').length})
          </button>
          <button
            onClick={() => setActiveTab('KLINIK_NON_MEDIS')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'KLINIK_NON_MEDIS' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            Operasional Non-Medis ({products.filter(p => p.tipe_stok === 'KLINIK_NON_MEDIS').length})
          </button>
          <button
            onClick={() => setActiveTab('MUTASI')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'MUTASI' ? 'bg-amber-700 text-white shadow-xs' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'}`}
          >
            Riwayat Mutasi & Approval ({mutations.length})
          </button>
        </div>

        {/* Tab Content Tables */}
        {activeTab !== 'MUTASI' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                <tr>
                  <th className="py-3 px-4">Kode SKU</th>
                  <th className="py-3 px-4">Nama Produk / Barang</th>
                  <th className="py-3 px-4">Harga Jual (Retail)</th>
                  <th className="py-3 px-4">Sisa Stok</th>
                  <th className="py-3 px-4">Batas Min. Stok</th>
                  <th className="py-3 px-4">Status Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded4]">
                {filteredProducts.map(p => {
                  const isLow = p.sisa_stok <= p.minimum_stok;
                  return (
                    <tr key={p.id} className="hover:bg-[#fff8f0]">
                      <td className="py-3 px-4 font-mono font-bold text-[#7d5141]">{p.kode_sku}</td>
                      <td className="py-3 px-4 font-semibold text-[#1e1b15]">{p.nama_produk}</td>
                      <td className="py-3 px-4 text-[#514440]">Rp {p.harga_jual.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 font-bold text-sm text-[#1e1b15]">{Math.max(0, p.sisa_stok)} {p.satuan} {p.sisa_stok <= 0 && <span className="text-red-600 text-xs font-normal ml-1">(Habis)</span>}</td>

                      <td className="py-3 px-4 text-[#83746f]">{p.minimum_stok} {p.satuan}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isLow 
                            ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isLow ? 'ALERT: MENIPIS' : 'AMANKAN'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* MUTASI TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Tipe Mutasi</th>
                  <th className="py-3 px-4">Jumlah</th>
                  <th className="py-3 px-4">Pemohon</th>
                  <th className="py-3 px-4">Status Approval</th>
                  <th className="py-3 px-4 text-center">Aksi (ASM / Admin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded4]">
                {mutations.map(m => (
                  <tr key={m.id} className="hover:bg-[#fff8f0]">
                    <td className="py-3 px-4 text-[#83746f]">{new Date(m.created_at).toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 font-bold text-[#1e1b15]">{m.nama_produk}</td>
                    <td className="py-3 px-4 font-semibold text-[#7d5141]">{m.tipe}</td>
                    <td className="py-3 px-4 font-bold">{m.jumlah} {m.satuan}</td>
                    <td className="py-3 px-4 text-[#514440]">{m.requester_name || 'Staff'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        m.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.status === 'PENDING' && (user?.role === 'Assistant Manager (ASM)' || user?.role === 'Admin System' || user?.role === 'Admin Klinik') && (
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleApproval(m.id, 'APPROVED')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handleApproval(m.id, 'REJECTED')}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH PRODUK */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">+ Tambah Produk Inventori Baru</h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Nama Produk / Barang *</label>
                <input type="text" value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)} required className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Kode SKU</label>
                  <input type="text" value={kodeSku} onChange={(e) => setKodeSku(e.target.value)} placeholder="SKU-XXXX" className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Tipe Stok</label>
                  <select value={tipeStok} onChange={(e) => setTipeStok(e.target.value)} className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-semibold">
                    <option value="RETAIL">RETAIL SKINCARE</option>
                    <option value="THERAPIST_BTC">CONSUMABLE / BTC TERAPIS</option>
                    <option value="KLINIK_NON_MEDIS">OPERASIONAL NON-MEDIS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Harga Jual</label>
                  <input type="number" value={hargaJual} onChange={(e) => setHargaJual(e.target.value)} className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Sisa Stok</label>
                  <input type="number" value={sisaStok} onChange={(e) => setSisaStok(e.target.value)} className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Min. Alert</label>
                  <input type="number" value={minimumStok} onChange={(e) => setMinimumStok(e.target.value)} className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs" />
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                Simpan Produk Baru
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REQUEST / MUTASI STOK */}
      {showMutationModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">Form Pengajuan / Mutasi Stok</h3>
              <button onClick={() => setShowMutationModal(false)} className="text-gray-400 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleCreateMutation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Pilih Produk Inventori *</label>
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} required className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs">
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.nama_produk} (Stok: {p.sisa_stok})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Tipe Mutasi</label>
                  <select value={mutationType} onChange={(e) => setMutationType(e.target.value)} className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs">
                    <option value="REQUEST">REQUEST STOK (Terapis / Staff)</option>
                    <option value="IN">STOK MASUK / RESTOK (IN)</option>
                    <option value="OUT">STOK KELUAR (OUT)</option>
                    <option value="USAGE">PEMAKAIAN TINDAKAN (USAGE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Jumlah</label>
                  <input type="number" value={mutationJumlah} onChange={(e) => setMutationJumlah(e.target.value)} required className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Catatan / Alasan</label>
                <textarea value={mutationNotes} onChange={(e) => setMutationNotes(e.target.value)} placeholder="Misal: Pemakaian pasien facial Maya" className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs" rows="2" />
              </div>

              <button type="submit" className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer">
                Kirim Mutasi / Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
