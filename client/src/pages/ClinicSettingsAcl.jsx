import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Building2, Save, Link2 } from 'lucide-react';

export default function ClinicSettingsAcl() {
  const [activeTab, setActiveTab] = useState('PROFILE'); // 'PROFILE' or 'ACL'
  const [profile, setProfile] = useState({
    clinic_name: 'DEFLOW',
    tagline: 'AESTHETIC CLINIC',
    address: 'Citraland - Jl. Soekarno - Hatta No.45, Tengkerang Bar., Marpoyan Damai, Kota Pekanbaru, Riau 28124',
    map_latitude: -6.2088,
    map_longitude: 106.8456,
    phone: '021-5551234',
    whatsapp: '6285121301755',
    email: 'info@deflowclinic.com',
    logo_url: '/logo/DEFLOW_LOGO_ONLY.png',
    tax_rate_percent: 11.0,
    wa_api_url: 'https://api-wa.ipangpangeran.com/send?api_key=ipang-super-secret-key-123456'
  });

  const [aclMatrix, setAclMatrix] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const roles = ['Admin System', 'Admin Klinik', 'Resepsionis / Cashier', 'Assistant Manager (ASM)', 'Manager', 'Dokter', 'Therapist / BTC', 'Nurse'];
  const modules = [
    { key: 'clinic_profile', name: 'Detail Profil Klinik' },
    { key: 'acl', name: 'Konfigurasi Dynamic ACL' },
    { key: 'patient_intake', name: 'Pendaftaran Pasien' },
    { key: 'patient_packages', name: 'Paket Treatment Pasien' },
    { key: 'reminders', name: 'Reminder Jadwal Kembali' },
    { key: 'inventory_retail', name: 'Stok Retail Skincare' },
    { key: 'inventory_btc', name: 'Stok Consumable BTC Terapis' },
    { key: 'inventory_non_medical', name: 'Stok Operasional Non-Medis' },
    { key: 'pricing', name: 'Manajemen Harga & Catalog' },
    { key: 'commission_formulas', name: 'Manajemen Aturan Komisi (5 Lini)' },
    { key: 'payroll', name: 'Laporan Payroll & Slip Gaji' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profRes, aclRes] = await Promise.all([
        axios.get('/api/clinic-profile'),
        axios.get('/api/acl')
      ]);
      if (profRes.data) setProfile(profRes.data);
      setAclMatrix(aclRes.data);
    } catch (err) {
      console.error('Error loading settings', err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await axios.put('/api/clinic-profile', profile);
      setMsg('Profil klinik & Endpoint WhatsApp Gateway API berhasil diperbarui!');
    } catch (err) {
      setMsg('Gagal memperbarui profil klinik.');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (role, moduleKey, action) => {
    const updated = [...aclMatrix];
    const itemIndex = updated.findIndex(i => i.role === role && i.module_key === moduleKey);
    if (itemIndex > -1) {
      updated[itemIndex][action] = updated[itemIndex][action] ? 0 : 1;
    } else {
      const newItem = {
        role,
        module_key: moduleKey,
        can_create: action === 'can_create' ? 1 : 0,
        can_read: action === 'can_read' ? 1 : 0,
        can_update: action === 'can_update' ? 1 : 0,
        can_delete: action === 'can_delete' ? 1 : 0,
      };
      updated.push(newItem);
    }
    setAclMatrix(updated);
  };

  const handleSaveAcl = async () => {
    setSaving(true);
    setMsg('');
    try {
      await axios.put('/api/acl', { permissions: aclMatrix });
      setMsg('Matriks Dynamic ACL berhasil disimpan!');
    } catch (err) {
      setMsg('Gagal menyimpan matriks ACL.');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionVal = (role, moduleKey, action) => {
    const item = aclMatrix.find(i => i.role === role && i.module_key === moduleKey);
    return item ? Boolean(item[action]) : false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Dynamic ACL & Pengaturan Profil Klinik</h1>
          <p className="text-xs text-[#514440]">Ubah profil resmi klinik (nama, logo, kontak, pointing WA API) dan konfigurasikan matriks hak akses per role pengguna.</p>
        </div>
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold shadow-xs">
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
        <div className="flex gap-2 border-b border-[#e5ded4] pb-3 text-xs">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'PROFILE' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1" />
            Pengaturan Profil Utama Klinik & WA API
          </button>
          <button
            onClick={() => setActiveTab('ACL')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'ACL' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
            Matriks Dynamic ACL (Hak Akses Roles)
          </button>
        </div>

        {/* PROFIL KLINIK FORM */}
        {activeTab === 'PROFILE' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Nama Utama Klinik *</label>
                <input
                  type="text"
                  value={profile.clinic_name}
                  onChange={(e) => setProfile({ ...profile, clinic_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#1e1b15]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Tagline Klinik *</label>
                <input
                  type="text"
                  value={profile.tagline}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#7d5141]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#514440] mb-1">Alamat Lengkap Klinik *</label>
              <textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                rows="2"
                required
                className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">No. WhatsApp Resmi Gateway *</label>
                <input
                  type="text"
                  value={profile.whatsapp}
                  onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Email Resmi Klinik</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
                />
              </div>
            </div>

            {/* WA API ENDPOINT POINTING CONFIGURATION (SUPER ADMIN) */}
            <div className="p-4 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#7d5141] uppercase tracking-wider">
                <Link2 className="w-4 h-4" />
                <span>Konfigurasi Pointing WhatsApp Gateway API (Super Admin)</span>
              </div>
              <p className="text-[11px] text-[#514440]">
                Masukkan URL Endpoint WhatsApp API jika server gateway mengalami perubahan alamat / API Key.
              </p>
              <input
                type="text"
                value={profile.wa_api_url || ''}
                onChange={(e) => setProfile({ ...profile, wa_api_url: e.target.value })}
                placeholder="https://api-wa.ipangpangeran.com/send?api_key=..."
                required
                className="w-full px-3 py-2 bg-white border border-[#d6c2bd] rounded-xl text-xs font-mono text-[#1e1b15]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Tarif Pajak PPN (%)</label>
                <input
                  type="number"
                  value={profile.tax_rate_percent}
                  onChange={(e) => setProfile({ ...profile, tax_rate_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Auto Logout Idle (Menit) *</label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={profile.idle_timeout_minutes || 15}
                  onChange={(e) => setProfile({ ...profile, idle_timeout_minutes: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#7d5141]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">URL / Path Logo Resmi</label>
                <input
                  type="text"
                  value={profile.logo_url}
                  onChange={(e) => setProfile({ ...profile, logo_url: e.target.value })}
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-mono"
                />
              </div>
            </div>


            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Simpan...' : 'Simpan Profil & Settings WA API'}
            </button>
          </form>
        )}

        {/* DYNAMIC ACL MATRIX TABLE */}
        {activeTab === 'ACL' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">Matriks Hak Akses Modul per Role (ACL Matrix)</h3>
              <button
                onClick={handleSaveAcl}
                disabled={saving}
                className="px-5 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Matriks ACL'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-4 border-r border-[#e5ded4]">Modul / Fitur System</th>
                    {roles.map(r => (
                      <th key={r} className="py-3 px-2 text-center border-r border-[#e5ded4] text-[10px]">{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {modules.map(m => (
                    <tr key={m.key} className="hover:bg-[#fff8f0]">
                      <td className="py-3 px-4 font-bold text-[#1e1b15] border-r border-[#e5ded4] bg-[#faf3e8]/40">
                        {m.name}
                      </td>
                      {roles.map(r => {
                        const canR = getPermissionVal(r, m.key, 'can_read');

                        return (
                          <td key={r} className="py-2 px-2 text-center border-r border-[#e5ded4]">
                            <button
                              type="button"
                              onClick={() => togglePermission(r, m.key, 'can_read')}
                              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                canR 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
                              }`}
                            >
                              {canR ? 'Akses (R)' : 'No Access'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
