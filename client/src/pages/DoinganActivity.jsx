import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Sparkles, User, FileCheck, DollarSign, Award, Plus, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function DoinganActivity() {
  const { user } = useContext(AuthContext);
  const [doinganList, setDoinganList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [pasienId, setPasienId] = useState('');
  const [tindakanId, setTindakanId] = useState('');
  const [statusDoingan, setStatusDoingan] = useState('Mbr'); // 'Mbr', 'Trial', 'Membership', 'DP Membership'
  const [nominalDp, setNominalDp] = useState('');
  const [nominalMembership, setNominalMembership] = useState('');
  const [notes, setNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [doiRes, pasRes, tndRes] = await Promise.all([
        axios.get('/api/doingan'),
        axios.get('/api/pasien'),
        axios.get('/api/tindakan')
      ]);
      setDoinganList(doiRes.data);
      setPatients(pasRes.data);
      setTreatments(tndRes.data);
      if (pasRes.data.length > 0) setPasienId(pasRes.data[0].id);
      if (tndRes.data.length > 0) setTindakanId(tndRes.data[0].id);
    } catch (err) {
      console.error('Error loading doingan data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDoingan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    setErrorMsg('');

    if (!pasienId) {
      setErrorMsg('Pilih nama pasien terlebih dahulu');
      setSubmitting(false);
      return;
    }

    try {
      const selectedTreatment = treatments.find(t => t.id === tindakanId);
      const payload = {
        pasien_id: pasienId,
        tindakan_id: tindakanId || null,
        nama_tindakan: selectedTreatment ? selectedTreatment.nama_tindakan : 'Doingan Perawatan',
        status_doingan: statusDoingan,
        nominal_dp: Number(nominalDp) || 0,
        nominal_membership: Number(nominalMembership) || 0,
        notes: notes
      };

      const res = await axios.post('/api/doingan', payload);
      setMsg(`Catatan doingan berhasil disimpan! Estimated Komisi: Rp ${res.data.komisi.toLocaleString('id-ID')}`);
      setNotes('');
      setNominalDp('');
      setNominalMembership('');
      fetchData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan catatan doingan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDoingan = async (id) => {
    if (!window.confirm('Hapus catatan doingan ini?')) return;
    try {
      await axios.delete(`/api/doingan/${id}`);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus doingan');
    }
  };

  // Preset Commission Calculations per role for live preview badge
  const calculatePreviewCommission = () => {
    if (!user) return 0;
    if (user.role === 'Beautician') {
      return statusDoingan === 'Mbr' ? 17000 : 13000;
    }
    if (user.role === 'Marketing') {
      if (statusDoingan === 'Trial') return 10000;
      const base = Number(nominalMembership) || Number(nominalDp) || 0;
      return Math.max(50000, Math.round(base * 0.05));
    }
    if (user.role === 'Nurse') {
      const tr = treatments.find(t => t.id === tindakanId);
      return tr ? (tr.nominal_nurse_tindakan || 15000) : 15000;
    }
    return 15000;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Aktivitas & Catatan Doingan Perawatan</h1>
          <p className="text-xs text-[#514440]">Formulir input doingan treatment untuk Nurse, Beautician, dan Marketing beserta pencatatan komisi otomatis.</p>
        </div>
        <div className="px-4 py-2 bg-gradient-to-r from-[#faf3e8] to-[#f4ede3] border border-[#d6c2bd] rounded-xl flex items-center gap-2">
          <Award className="w-4 h-4 text-[#7d5141]" />
          <span className="text-xs font-bold text-[#1e1b15]">Role Aktif: <strong className="text-[#7d5141]">{user?.role}</strong></span>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e5ded4] pb-3">
            <Plus className="w-4 h-4 text-[#7d5141]" />
            <h3 className="font-serif font-bold text-base text-[#1e1b15]">Catat Doingan / Perawatan Baru</h3>
          </div>

          <form onSubmit={handleSaveDoingan} className="space-y-3.5">
            {/* Nama Pasien */}
            <div>
              <label className="block text-xs font-semibold text-[#514440] mb-1">Nama Pasien *</label>
              <select
                value={pasienId}
                onChange={(e) => setPasienId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-semibold text-[#1e1b15]"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nama_lengkap} ({p.tipe_pasien}) - {p.no_hp}
                  </option>
                ))}
              </select>
            </div>

            {/* Selecting Treatment / Tindakan */}
            {user?.role !== 'Marketing' && (
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Jenis Tindakan / Treatment *</label>
                <select
                  value={tindakanId}
                  onChange={(e) => setTindakanId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-semibold text-[#1e1b15]"
                >
                  {treatments.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nama_tindakan} (Tarif: Rp {t.tarif_tindakan_medis.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Beautician Specific Status Doingan */}
            {user?.role === 'Beautician' && (
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Status Doingan Pasien *</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusDoingan('Mbr')}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${statusDoingan === 'Mbr' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] border border-[#d6c2bd]'}`}
                  >
                    Mbr / Member (Komisi Rp 17.000)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusDoingan('Trial')}
                    className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${statusDoingan === 'Trial' ? 'bg-amber-700 text-white shadow-xs' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}
                  >
                    Trial / Free (Komisi Rp 13.000)
                  </button>
                </div>
              </div>
            )}

            {/* Marketing Specific Options */}
            {user?.role === 'Marketing' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#514440] mb-1">Kategori Aktivitas Marketing *</label>
                  <select
                    value={statusDoingan}
                    onChange={(e) => setStatusDoingan(e.target.value)}
                    className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-semibold"
                  >
                    <option value="Trial">Pasien Trial (Free - Komisi Rp 10.000)</option>
                    <option value="Membership">Pembelian Membership Baru</option>
                    <option value="DP Membership">Pembayaran DP Membership</option>
                  </select>
                </div>

                {(statusDoingan === 'Membership' || statusDoingan === 'DP Membership') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#514440] mb-1">Nominal Membership (Rp)</label>
                      <input
                        type="number"
                        value={nominalMembership}
                        onChange={(e) => setNominalMembership(e.target.value)}
                        placeholder="2500000"
                        className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#514440] mb-1">Nominal DP (Rp)</label>
                      <input
                        type="number"
                        value={nominalDp}
                        onChange={(e) => setNominalDp(e.target.value)}
                        placeholder="500000"
                        className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Catatan Perawatan */}
            <div>
              <label className="block text-xs font-semibold text-[#514440] mb-1">Catatan / Detail Perawatan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="2"
                placeholder="Detail reaksi kulit, area pengerjaan, atau resep..."
                className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
              />
            </div>

            {/* Commission Preview Card */}
            <div className="p-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-[#514440]">Perkiraan Komisi Diperoleh:</span>
              <span className="font-bold text-sm text-[#7d5141]">
                Rp {calculatePreviewCommission().toLocaleString('id-ID')}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Simpan Catatan...' : 'Simpan Doingan & Hitung Komisi'}
            </button>
          </form>
        </div>

        {/* History Table Column (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
            <h3 className="font-serif font-bold text-base text-[#1e1b15]">Riwayat Doingan & Komisi Petugas</h3>
            <span className="text-xs font-bold text-[#7d5141] bg-[#faf3e8] px-3 py-1 rounded-full border border-[#d6c2bd]">
              {doinganList.length} Catatan
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
              <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase tracking-wider border-b border-[#e5ded4]">
                <tr>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Nama Pasien</th>
                  <th className="py-2.5 px-3">Tindakan / Aktivitas</th>
                  <th className="py-2.5 px-3">Petugas & Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Komisi</th>
                  <th className="py-2.5 px-3 text-center">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded4]">
                {doinganList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-400 italic">Belum ada catatan doingan.</td>
                  </tr>
                ) : (
                  doinganList.map(item => (
                    <tr key={item.id} className="hover:bg-[#fff8f0]">
                      <td className="py-2.5 px-3 text-[11px] text-[#83746f]">
                        {new Date(item.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#1e1b15]">{item.pasien_nama}</td>
                      <td className="py-2.5 px-3 text-[#514440] font-medium">{item.nama_tindakan}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#1e1b15]">{item.petugas_nama}</div>
                        <div className="text-[10px] font-bold text-[#7d5141] uppercase">{item.role_petugas}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status_doingan === 'Mbr' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status_doingan || 'Regular'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#7d5141]">
                        Rp {item.komisi.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteDoingan(item.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
}
