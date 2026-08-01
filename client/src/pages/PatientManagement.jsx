import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Search, Edit, Sparkles, Package, Calendar, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packages, setPackages] = useState([]);

  // Form State
  const [formType, setFormType] = useState('TRIAL'); // 'TRIAL' or 'NON-TRIAL'
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

  const openNewPatientModal = () => {
    setEditMode(false);
    setSelectedPatient(null);
    setFormType('TRIAL');
    setNoKtp('');
    setNoHp('');
    setNamaLengkap('');
    setAlamat('');
    setTglLahir('');
    setRiwayatAlergi('');
    setJenisKulit('');
    setRekomendasiDokter('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditMode(true);
    setSelectedPatient(p);
    setFormType(p.tipe_pasien);
    setNoKtp(p.no_ktp || '');
    setNoHp(p.no_hp || '');
    setNamaLengkap(p.nama_lengkap || '');
    setAlamat(p.alamat || '');
    setTglLahir(p.tgl_lahir || '');
    setRiwayatAlergi(p.riwayat_alergi || '');
    setJenisKulit(p.jenis_kulit || '');
    setRekomendasiDokter(p.rekomendasi_dokter || '');
    setErrorMessage('');
    setSuccessMessage('');
    setShowModal(true);
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!noHp || !namaLengkap) {
      setErrorMessage('Nama Lengkap dan No. Handphone wajib diisi');
      return;
    }

    try {
      const payload = {
        no_ktp: noKtp || null,
        no_hp: noHp,
        nama_lengkap: namaLengkap,
        tipe_pasien: formType,
        alamat: formType === 'NON-TRIAL' ? alamat : null,
        tgl_lahir: formType === 'NON-TRIAL' ? tglLahir : null,
        riwayat_alergi: formType === 'NON-TRIAL' ? riwayatAlergi : null,
        jenis_kulit: formType === 'NON-TRIAL' ? jenisKulit : null,
        rekomendasi_dokter: formType === 'NON-TRIAL' ? rekomendasiDokter : null,
      };

      if (editMode && selectedPatient) {
        await axios.put(`/api/pasien/${selectedPatient.id}`, payload);
        setSuccessMessage('Data pasien berhasil diperbarui / di-upgrade!');
      } else {
        await axios.post('/api/pasien', payload);
        setSuccessMessage('Pasien baru berhasil didaftarkan!');
      }

      fetchPatients();
      setTimeout(() => {
        setShowModal(false);
      }, 1200);
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

  const filteredPatients = patients.filter(p => {
    const matchSearch = p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
                        p.no_hp.includes(search) ||
                        (p.no_ktp && p.no_ktp.includes(search));
    const matchFilter = filterType === 'ALL' || p.tipe_pasien === filterType;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Pendaftaran & Manajemen Pasien</h1>
          <p className="text-xs text-[#514440]">Kelola registrasi pasien baru (Trial vs Reguler), kuota paket treatment, dan pengingat kontrol.</p>
        </div>
        <button
          onClick={openNewPatientModal}
          className="px-4 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Tambah Pasien Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
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

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-[#83746f] font-semibold">Tipe:</span>
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
            onClick={() => setFilterType('NON-TRIAL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'NON-TRIAL' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'}`}
          >
            Reguler ({patients.filter(p => p.tipe_pasien === 'NON-TRIAL').length})
          </button>
        </div>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-2xl border border-[#e5ded4] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase tracking-wider border-b border-[#e5ded4]">
              <tr>
                <th className="py-3 px-4">Nama Pasien</th>
                <th className="py-3 px-4">Kontak (HP & NIK)</th>
                <th className="py-3 px-4">Tipe Pasien</th>
                <th className="py-3 px-4">Detail Medis (Reguler)</th>
                <th className="py-3 px-4">Poin</th>
                <th className="py-3 px-4 text-center">Aksi / Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ded4]">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[#83746f] italic">Tidak ada data pasien yang cocok.</td>
                </tr>
              ) : (
                filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-[#fff8f0]">
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
                        {p.tipe_pasien}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-[11px] text-[#514440]">
                      {p.tipe_pasien === 'NON-TRIAL' ? (
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#514440] rounded-lg font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Edit Profile / Upgrade Trial to Reguler"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#7d5141]" />
                          <span>Edit / Upgrade</span>
                        </button>
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

      {/* MODAL INTAKE PENDAFTARAN PASIEN BARU & UPGRADE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1e1b15]">
                {editMode ? 'Edit / Upgrade Profile Pasien' : 'Form Registration Intake Pasien Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">×</button>
            </div>

            {/* Error Message Warning */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Selector Tipe Pasien */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#514440] uppercase tracking-wider">
                Tipe Pendaftaran Pasien
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setFormType('TRIAL')}
                  className={`py-2 px-3 rounded-lg font-semibold transition-all ${formType === 'TRIAL' ? 'bg-amber-600 text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'}`}
                >
                  TRIAL (Form Minimalis)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('NON-TRIAL')}
                  className={`py-2 px-3 rounded-lg font-semibold transition-all ${formType === 'NON-TRIAL' ? 'bg-[#7d5141] text-white shadow-xs' : 'text-[#514440] hover:bg-[#eee7dd]'}`}
                >
                  NON-TRIAL / REGULER (Lengkap)
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">
                  Nama Lengkap Pasien *
                </label>
                <input
                  type="text"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  required
                  placeholder="Contoh: Nia Ramadhani"
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">
                    No. Handphone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    required
                    placeholder="0812XXXXXXXX"
                    className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">
                    No. KTP / NIK {formType === 'TRIAL' ? '*' : '(Opsional)'}
                  </label>
                  <input
                    type="text"
                    value={noKtp}
                    onChange={(e) => setNoKtp(e.target.value)}
                    required={formType === 'TRIAL'}
                    placeholder="16 digit NIK"
                    className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                  />
                </div>
              </div>

              {/* Input Opsional untuk NON-TRIAL */}
              {formType === 'NON-TRIAL' && (
                <div className="space-y-3 pt-2 border-t border-[#e5ded4]">
                  <div>
                    <label className="block text-xs font-semibold text-[#514440] mb-1">
                      Alamat Lengkap (Opsional)
                    </label>
                    <textarea
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      rows="2"
                      placeholder="Jl. Senopati No. 12, Jakarta"
                      className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#514440] mb-1">
                        Tanggal Lahir (Opsional)
                      </label>
                      <input
                        type="date"
                        value={tglLahir}
                        onChange={(e) => setTglLahir(e.target.value)}
                        className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#514440] mb-1">
                        Jenis Kulit (Opsional)
                      </label>
                      <input
                        type="text"
                        value={jenisKulit}
                        onChange={(e) => setJenisKulit(e.target.value)}
                        placeholder="Normal, Berminyak, Sensitif"
                        className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#514440] mb-1">
                      Riwayat Alergi (Opsional)
                    </label>
                    <input
                      type="text"
                      value={riwayatAlergi}
                      onChange={(e) => setRiwayatAlergi(e.target.value)}
                      placeholder="Contoh: Alergi Seafood, Alergi Debu"
                      className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15] focus:outline-none focus:border-[#7d5141]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-[#e5ded4]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {editMode ? 'Simpan Perubahan' : 'Simpan Pasien Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KELOLA PAKET TREATMENT */}
      {showPackageModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1e1b15]">Paket Treatment Pasien</h3>
                <p className="text-xs text-[#7d5141] font-semibold">{selectedPatient.nama_lengkap}</p>
              </div>
              <button onClick={() => setShowPackageModal(false)} className="text-gray-400 font-bold text-lg">×</button>
            </div>

            {/* List Existing Packages */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#514440] uppercase">Paket Aktif Tersisa</h4>
              {packages.length === 0 ? (
                <p className="text-xs text-gray-500 italic">Belum ada paket aktif untuk pasien ini.</p>
              ) : (
                packages.map(pkg => (
                  <div key={pkg.id} className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#1e1b15]">{pkg.nama_paket}</div>
                      <div className="text-[11px] text-[#514440]">
                        Sisa Kuota: <span className="font-bold text-emerald-700">{pkg.sisa_kuota}</span> / {pkg.total_kuota} Kali
                      </div>
                    </div>
                    <button
                      onClick={() => handleUsePackage(pkg.id)}
                      disabled={pkg.sisa_kuota <= 0}
                      className="px-3 py-1.5 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-300 text-white font-semibold text-xs rounded-lg cursor-pointer transition-all"
                    >
                      Potong 1 Kuota
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Package Form */}
            <form onSubmit={handleAddPackage} className="pt-3 border-t border-[#e5ded4] space-y-2.5">
              <h4 className="text-xs font-bold text-[#514440] uppercase">+ Tambah Pembelian Paket Baru</h4>
              <div>
                <input
                  type="text"
                  value={namaPaket}
                  onChange={(e) => setNamaPaket(e.target.value)}
                  placeholder="Nama Paket (misal: Paket Glowing 5x)"
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={totalKuota}
                  onChange={(e) => setTotalKuota(e.target.value)}
                  placeholder="Total Kuota (x)"
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
                <input
                  type="number"
                  value={hargaPaket}
                  onChange={(e) => setHargaPaket(e.target.value)}
                  placeholder="Harga (Rp)"
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-xs"
              >
                + Simpan Pembelian Paket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SET REMINDER JADWAL KEMBALI */}
      {showReminderModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">Jadwal Kontrol Kembali Pasien</h3>
              <button onClick={() => setShowReminderModal(false)} className="text-gray-400 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleSaveReminder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Nama Pasien</label>
                <input type="text" value={selectedPatient.nama_lengkap} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Tanggal Kontrol Kembali</label>
                <input
                  type="date"
                  value={tglKembali}
                  onChange={(e) => setTglKembali(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Simpan & Integrasikan ke WA Gateway
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
