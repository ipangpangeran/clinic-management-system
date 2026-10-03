import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { AlertTriangle, Plus, Edit, RefreshCw, FileText, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function LogisticsInventory() {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [mutations, setMutations] = useState([]);
  const [productApprovals, setProductApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState('RETAIL'); // 'RETAIL', 'THERAPIST_BTC', 'KLINIK_NON_MEDIS', 'PRODUCT_APPROVALS', 'MUTASI'

  // Add Product Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [namaProduk, setNamaProduk] = useState('');
  const [kodeSku, setKodeSku] = useState('');
  const [tipeStok, setTipeStok] = useState('RETAIL');
  const [hargaJual, setHargaJual] = useState(0);
  const [sisaStok, setSisaStok] = useState(10);
  const [minimumStok, setMinimumStok] = useState(5);
  const [satuan, setSatuan] = useState('pcs');

  // Edit Product & Stock Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState(null);
  const [editNamaProduk, setEditNamaProduk] = useState('');
  const [editHargaJual, setEditHargaJual] = useState(0);
  const [editSisaStok, setEditSisaStok] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  // Request / Mutasi Form State
  const [showMutationModal, setShowMutationModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [mutationType, setMutationType] = useState('REQUEST'); // 'IN', 'OUT', 'REQUEST'
  const [mutationJumlah, setMutationJumlah] = useState(5);
  const [mutationNotes, setMutationNotes] = useState('');

  const isDirectRole = user?.role === 'Super Admin' || user?.role === 'Admin System' || user?.role === 'Admin Klinik';

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const [prodRes, mutRes, approvalRes] = await Promise.all([
        axios.get('/api/stok'),
        axios.get('/api/stok/mutasi'),
        axios.get('/api/stok/product-approvals')
      ]);
      setProducts(prodRes.data);
      setMutations(mutRes.data);
      setProductApprovals(approvalRes.data);
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

  const openEditModal = (product) => {
    setSelectedEditProduct(product);
    setEditNamaProduk(product.nama_produk);
    setEditHargaJual(product.harga_jual);
    setEditSisaStok(product.sisa_stok);
    setEditNotes('');
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!selectedEditProduct) return;

    try {
      const res = await axios.put(`/api/stok/${selectedEditProduct.id}`, {
        nama_produk: editNamaProduk,
        harga_jual: Number(editHargaJual),
        sisa_stok: Number(editSisaStok),
        notes: editNotes
      });

      if (res.data.autoApproved) {
        alert('Perubahan nama, harga, dan stok berhasil disimpan secara langsung!');
      } else {
        alert('Pengajuan perubahan nama, harga, atau stok berhasil dikirim! Menunggu persetujuan (approval) oleh Super Admin / Admin Klinik.');
      }

      setShowEditModal(false);
      fetchInventoryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui produk');
    }
  };

  const handleProductApprovalReview = async (reqId, status) => {
    try {
      const res = await axios.put(`/api/stok/product-approvals/${reqId}/review`, { status });
      alert(res.data.message || `Status pengajuan produk berhasil diubah ke ${status}`);
      fetchInventoryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereview pengajuan produk');
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
  const pendingProductApprovalsCount = productApprovals.filter(p => p.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Logistik & Stok Inventori (ASM)</h1>
          <p className="text-xs text-[#514440]">Kelola stok produk retail skin care, bahan medis BTC terapis, operasional klinik non-medis, dan pengajuan perubahan produk & stok.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
          <button
            onClick={() => setShowProductModal(true)}
            className="px-4 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tambah Produk Inventori
          </button>
          <button
            onClick={() => setShowMutationModal(true)}
            className="px-3.5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Request / Mutasi Stok
          </button>
          <button
            onClick={() => {
              if (products.length > 0) openEditModal(products[0]);
            }}
            className="px-3.5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Nama / Harga / Stok
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
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
        <div className="flex overflow-x-auto gap-2 border-b border-[#e5ded4] pb-3 text-xs whitespace-nowrap">
          <button
            onClick={() => setActiveTab('RETAIL')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'RETAIL' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            Produk Retail Skin Care ({products.filter(p => p.tipe_stok === 'RETAIL').length})
          </button>
          <button
            onClick={() => setActiveTab('THERAPIST_BTC')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'THERAPIST_BTC' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            Consumable / BTC Terapis ({products.filter(p => p.tipe_stok === 'THERAPIST_BTC').length})
          </button>
          <button
            onClick={() => setActiveTab('KLINIK_NON_MEDIS')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'KLINIK_NON_MEDIS' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            Operasional Non-Medis ({products.filter(p => p.tipe_stok === 'KLINIK_NON_MEDIS').length})
          </button>
          <button
            onClick={() => setActiveTab('PRODUCT_APPROVALS')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'PRODUCT_APPROVALS' ? 'bg-indigo-800 text-white shadow-xs' : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'}`}
          >
            <span>Perubahan & Approval (Nama, Harga & Stok)</span>
            {pendingProductApprovalsCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse">
                {pendingProductApprovalsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('MUTASI')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'MUTASI' ? 'bg-amber-700 text-white shadow-xs' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'}`}
          >
            Riwayat Mutasi & Approval Stok ({mutations.length})
          </button>
        </div>

        {/* Tab Content Tables */}
        {activeTab === 'PRODUCT_APPROVALS' ? (
          /* PRODUCT NAME, PRICE & STOCK APPROVAL TABLE */
          <div className="overflow-x-auto">
            <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
              <div>
                <strong>Alur Approval Perubahan Produk:</strong>
                <span className="ml-1">Perubahan yang diajukan oleh <em>Admin FO</em> memerlukan persetujuan dari <strong>Super Admin</strong> atau <strong>Admin Klinik</strong>. Update oleh Super Admin / Admin Klinik langsung berlaku otomatis.</span>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-indigo-50 text-indigo-900 font-semibold uppercase border-b border-indigo-200">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Produk / SKU</th>
                  <th className="py-3 px-4">Perubahan Nama</th>
                  <th className="py-3 px-4">Perubahan Harga Jual</th>
                  <th className="py-3 px-4">Perubahan Sisa Stok</th>
                  <th className="py-3 px-4">Pemohon</th>
                  <th className="py-3 px-4">Status Approval</th>
                  <th className="py-3 px-4 text-center">Aksi (Super Admin / Admin Klinik)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded4]">
                {productApprovals.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-6 text-gray-400 italic">
                      Belum ada riwayat pengajuan perubahan nama, harga, atau stok produk.
                    </td>
                  </tr>
                ) : (
                  productApprovals.map(req => (
                    <tr key={req.id} className="hover:bg-[#fff8f0]">
                      <td className="py-3 px-4 text-[#83746f]">{new Date(req.created_at).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1e1b15]">{req.old_nama_produk}</div>
                        <div className="text-[10px] font-mono text-[#7d5141]">{req.kode_sku}</div>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {req.old_nama_produk !== req.new_nama_produk ? (
                          <div className="flex items-center gap-1">
                            <span className="line-through text-gray-400">{req.old_nama_produk}</span>
                            <ArrowRight className="w-3 h-3 text-indigo-600" />
                            <span className="font-bold text-indigo-900">{req.new_nama_produk}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Tetap</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {req.old_harga_jual !== req.new_harga_jual ? (
                          <div className="flex items-center gap-1">
                            <span className="line-through text-gray-400">Rp {req.old_harga_jual?.toLocaleString('id-ID')}</span>
                            <ArrowRight className="w-3 h-3 text-indigo-600" />
                            <span className="font-bold text-emerald-700">Rp {req.new_harga_jual?.toLocaleString('id-ID')}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Tetap</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {req.old_sisa_stok !== req.new_sisa_stok ? (
                          <div className="flex items-center gap-1">
                            <span className="line-through text-gray-400">{req.old_sisa_stok} {req.satuan}</span>
                            <ArrowRight className="w-3 h-3 text-indigo-600" />
                            <span className="font-bold text-amber-700">{req.new_sisa_stok} {req.satuan}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Tetap</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#514440]">
                        <span className="font-semibold">{req.requester_name || 'Admin FO'}</span>
                        <div className="text-[10px] text-gray-400">{req.notes}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          req.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                        }`}>
                          {req.status === 'PENDING' ? 'MENUNGGU APPROVAL' : req.status}
                        </span>
                        {req.approver_name && (
                          <div className="text-[10px] text-gray-400 mt-0.5">Oleh: {req.approver_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {req.status === 'PENDING' && isDirectRole ? (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleProductApprovalReview(req.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-xs"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => handleProductApprovalReview(req.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-xs"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            {req.status === 'PENDING' ? 'Menunggu Super Admin / Admin Klinik' : 'Selesai'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'MUTASI' ? (
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
                  <th className="py-3 px-4 text-center">Aksi (Super Admin / Admin Klinik / ASM)</th>
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
                      {m.status === 'PENDING' && (isDirectRole || user?.role === 'Assistant Manager (ASM)') && (
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
        ) : (
          /* PRODUCT LIST TABLES (RETAIL, THERAPIST_BTC, KLINIK_NON_MEDIS) */
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
                  <th className="py-3 px-4 text-center">Aksi Edit</th>
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
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 mx-auto"
                        >
                          <Edit className="w-3 h-3 text-indigo-600" />
                          <span>Edit Nama/Harga/Stok</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL EDIT PRODUK, HARGA & STOK */}
      {showEditModal && selectedEditProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Form Edit Produk & Stok</h3>
                <p className="text-[10px] text-gray-500 font-mono">SKU: {selectedEditProduct.kode_sku}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 font-bold text-lg cursor-pointer">×</button>
            </div>

            {!isDirectRole && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
                ⚠️ <strong>Info Role Admin FO:</strong> Perubahan Nama, Harga, atau Stok yang Anda simpan akan dikirim sebagai <strong>Pengajuan Approval</strong> ke Super Admin / Admin Klinik.
              </div>
            )}

            <form onSubmit={handleUpdateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Pilih Produk Yang Ingin Diubah</label>
                <select
                  value={selectedEditProduct.id}
                  onChange={(e) => {
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod) openEditModal(prod);
                  }}
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-semibold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama_produk} (Rp {p.harga_jual.toLocaleString('id-ID')} | Stok: {p.sisa_stok})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Nama Produk / Barang *</label>
                <input
                  type="text"
                  value={editNamaProduk}
                  onChange={(e) => setEditNamaProduk(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    value={editHargaJual}
                    onChange={(e) => setEditHargaJual(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Update Sisa Stok ({selectedEditProduct.satuan}) *</label>
                  <input
                    type="number"
                    value={editSisaStok}
                    onChange={(e) => setEditSisaStok(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Catatan / Alasan Perubahan</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Misal: Penyesuaian harga supplier baru / update stok fisik opname"
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                  rows="2"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all ${
                  isDirectRole ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                {isDirectRole ? 'Simpan Perubahan (Langsung Update)' : 'Kirim Pengajuan Perubahan (Perlu Approval)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PRODUK */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">+ Tambah Produk Inventori Baru</h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 font-bold text-lg cursor-pointer">×</button>
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
              <button onClick={() => setShowMutationModal(false)} className="text-gray-400 font-bold text-lg cursor-pointer">×</button>
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
