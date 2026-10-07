import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, Building2, Save, Link2, Users, UserPlus, Trash2, Edit2, KeyRound, Phone, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function ClinicSettingsAcl() {
  const { user: currentUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('PROFILE'); // 'PROFILE', 'USERS', 'ACL'
  
  // Profil Klinik State
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

  // User Management State
  const [userList, setUserList] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUserMode, setEditUserMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Form Fields as requested
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Manager');
  const [liniProfesi, setLiniProfesi] = useState('Beautician');
  const [gajiPokok, setGajiPokok] = useState(0);
  const [isTraining, setIsTraining] = useState(false);

  // ACL Matrix State
  const [aclMatrix, setAclMatrix] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const rolesList = ['Super Admin', 'Admin Klinik', 'Manager', 'Admin FO', 'Beautician', 'Nurse'];
  
  const modulesList = [
    { key: 'clinic_profile', name: 'Detail Profil Klinik' },
    { key: 'acl', name: 'Konfigurasi Dynamic ACL & Users' },
    { key: 'patient_intake', name: 'Pendaftaran Pasien (Admin FO)' },
    { key: 'patient_management', name: 'Manajemen Data Pasien (Edit, Hapus, Export Excel)' },
    { key: 'doingan', name: 'Catatan Doingan & Komisi Perawatan (Manager & Admin FO)' },
    { key: 'patient_packages', name: 'Paket Treatment Pasien' },
    { key: 'reminders', name: 'Reminder Jadwal Kembali WA' },
    { key: 'inventory_retail', name: 'Stok Retail Skincare' },
    { key: 'inventory_btc', name: 'Stok Consumable BTC Terapis' },
    { key: 'inventory_non_medical', name: 'Stok Operasional Non-Medis' },
    { key: 'pricing', name: 'Manajemen Harga & Catalog (15 Tindakan)' },
    { key: 'tindakan_crud', name: 'CRUD Jenis Tindakan Medis & Penyesuaian Harga Tarif' },
    { key: 'commission_formulas', name: 'Skema & Rumus Komisi Manager & Admin FO' },
    { key: 'payroll', name: 'Laporan Payroll & Slip Gaji' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profRes, aclRes, usrRes] = await Promise.all([
        axios.get('/api/clinic-profile'),
        axios.get('/api/acl'),
        axios.get('/api/users')
      ]);
      if (profRes.data) setProfile(profRes.data);
      setAclMatrix(aclRes.data);
      setUserList(usrRes.data);
    } catch (err) {
      console.error('Error loading settings', err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErrorMsg('');
    try {
      await axios.put('/api/clinic-profile', profile);
      setMsg('Profil klinik & pengaturan berhasil diperbarui!');
    } catch (err) {
      setErrorMsg('Gagal memperbarui profil klinik.');
    } finally {
      setSaving(false);
    }
  };

  // User Management Actions
  const openNewUserModal = () => {
    setEditUserMode(false);
    setSelectedUserId(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setPhone('');
    setRole('Manager');
    setLiniProfesi('Beautician');
    setGajiPokok(5000000);
    setIsTraining(false);
    setMsg('');
    setErrorMsg('');
    setShowUserModal(true);
  };

  const openEditUserModal = (u) => {
    setEditUserMode(true);
    setSelectedUserId(u.id);
    setUsername(u.username);
    setPassword(''); // leave empty if not changing
    setFullName(u.full_name);
    setPhone(u.phone || '');
    setRole(u.role);
    setLiniProfesi(u.lini_profesi || 'Beautician');
    setGajiPokok(u.gaji_pokok || 0);
    setIsTraining(u.is_training === 1);
    setMsg('');
    setErrorMsg('');
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setMsg('');
    setErrorMsg('');

    if (!username || !fullName || !role) {
      setErrorMsg('Username, Nama, dan Role wajib diisi');
      return;
    }

    if (!editUserMode && !password) {
      setErrorMsg('Password wajib diisi untuk user baru');
      return;
    }

    try {
      const payload = { username, password, full_name: fullName, role, lini_profesi: liniProfesi, phone, gaji_pokok: Number(gajiPokok), is_training: isTraining ? 1 : 0 };
      if (editUserMode && selectedUserId) {
        await axios.put(`/api/users/${selectedUserId}`, payload);
        setMsg('User berhasil diperbarui!');
      } else {
        await axios.post('/api/users', payload);
        setMsg('User baru berhasil ditambahkan!');
      }

      fetchData();
      setTimeout(() => setShowUserModal(false), 1000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan user');
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Hapus akun user ${u.full_name} (${u.username})?`)) return;
    try {
      await axios.delete(`/api/users/${u.id}`);
      setMsg(`User ${u.full_name} berhasil dihapus.`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus user');
    }
  };

  // ACL Matrix Toggle
  const togglePermission = (roleName, moduleKey, action) => {
    const updated = [...aclMatrix];
    const itemIndex = updated.findIndex(i => i.role === roleName && i.module_key === moduleKey);
    if (itemIndex > -1) {
      updated[itemIndex][action] = updated[itemIndex][action] ? 0 : 1;
    } else {
      const newItem = {
        role: roleName,
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
    setErrorMsg('');
    try {
      await axios.put('/api/acl', { permissions: aclMatrix });
      setMsg('Matriks Dynamic ACL berhasil disimpan!');
    } catch (err) {
      setErrorMsg('Gagal menyimpan matriks ACL.');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionVal = (roleName, moduleKey, action) => {
    const item = aclMatrix.find(i => i.role === roleName && i.module_key === moduleKey);
    return item ? Boolean(item[action]) : false;
  };

  // Check if current logged in user is Super Admin
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin System';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Kelola User & Profil Klinik (ACL Settings)</h1>
          <p className="text-xs text-[#514440]">Manajemen akun user klinik (Super Admin & Admin Klinik), konfigurasi profil, dan matriks Dynamic ACL.</p>
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

      {/* Main Tabs Container */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
        <div className="flex overflow-x-auto gap-2 border-b border-[#e5ded4] pb-3 text-xs whitespace-nowrap">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'PROFILE' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1" />
            Pengaturan Profil Utama Klinik
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'USERS' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1" />
            Manajemen User Pengguna ({userList.length})
          </button>

          <button
            onClick={() => setActiveTab('ACL')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'ACL' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
            Matriks Dynamic ACL (Hak Akses Roles)
          </button>
        </div>

        {/* TAB 1: PROFIL KLINIK FORM */}
        {activeTab === 'PROFILE' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="block text-xs font-semibold text-[#514440] mb-1">No. WhatsApp Resmi *</label>
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

            {/* WA API KEY / ENDPOINT POINTING CONFIGURATION (HIDDEN FOR ADMIN KLINIK - ONLY SUPER ADMIN CAN SEE) */}
            {isSuperAdmin && (
              <div className="p-4 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#7d5141] uppercase tracking-wider">
                  <Link2 className="w-4 h-4" />
                  <span>Konfigurasi Pointing WhatsApp Gateway API & API Key (Khusus Super Admin)</span>
                </div>
                <p className="text-[11px] text-[#514440]">
                  Endpoint URL API Key ini hanya dapat diakses dan diubah oleh Super Admin. User Admin Klinik tidak melihat menu ini.
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
            )}

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </button>
          </form>
        )}

        {/* TAB 2: USER MANAGEMENT (CREATE, EDIT, DELETE USER) */}
        {activeTab === 'USERS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5ded4] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1e1b15]">Daftar Pengguna Sistem (Users)</h3>
                <p className="text-xs text-[#514440]">Menu ini hanya dapat dikelola oleh Super Admin & Admin Klinik.</p>
              </div>
              <button
                onClick={openNewUserModal}
                className="px-4 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                + Tambah User Baru
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase tracking-wider border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Username (Login)</th>
                    <th className="py-3 px-4">Role Pengguna</th>
                    <th className="py-3 px-4">Nominal Gaji Pokok</th>
                    <th className="py-3 px-4">No. HP</th>
                    <th className="py-3 px-4 text-center">Aksi / Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {userList.map(u => (
                    <tr key={u.id} className="hover:bg-[#fff8f0]">
                      <td className="py-3 px-4 font-bold text-[#1e1b15]">{u.full_name}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#7d5141]">{u.username}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#faf3e8] text-[#7d5141] border border-[#d6c2bd]">
                            {u.role}
                          </span>
                          {u.is_training === 1 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              TRAINING (10K)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              REGULAR (13K)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#1e1b15]">
                        {u.role === 'Super Admin' || u.role === 'Admin System' || u.role === 'Admin Klinik' ? (
                          <span className="text-[#83746f] italic text-[11px]">Tanpa Gaji (Non-Payroll)</span>
                        ) : (
                          `Rp ${(u.gaji_pokok || 0).toLocaleString('id-ID')}`
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#514440]">{u.phone || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="p-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#7d5141] rounded-lg font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === currentUser?.id}
                            className="p-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-30 border border-red-200 text-red-700 rounded-lg font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DYNAMIC ACL MATRIX TABLE */}
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
                    {rolesList.map(r => (
                      <th key={r} className="py-3 px-2 text-center border-r border-[#e5ded4] text-[10px]">{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {modulesList.map(m => (
                    <tr key={m.key} className="hover:bg-[#fff8f0]">
                      <td className="py-3 px-4 font-bold text-[#1e1b15] border-r border-[#e5ded4] bg-[#faf3e8]/40">
                        {m.name}
                      </td>
                      {rolesList.map(r => {
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

      {/* USER MANAGEMENT FORM MODAL (CREATE & EDIT USER) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e5ded4] space-y-4">
            <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1e1b15]">
                {editUserMode ? 'Edit Data User' : 'Form Tambah User Baru'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 font-bold text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              {/* Form Field 1: Username */}
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Username (utk login) *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="misal: nurse.anita"
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-mono font-semibold text-[#1e1b15]"
                />
              </div>

              {/* Form Field 2: Password */}
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">
                  Password {editUserMode ? '(Kosongkan jika tidak diubah)' : '*'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editUserMode}
                  placeholder="******"
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
                />
              </div>

              {/* Form Field 3: Nama */}
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="misal: Siti Anita, S.Kep"
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
                />
              </div>

              {/* Form Field 4: No HP */}
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">No. HP / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812XXXXXXXX"
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs text-[#1e1b15]"
                />
              </div>

              {/* Form Field 5: Pilihan Role (Dropdown) */}
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Pilihan Role (Dropdown) *</label>
                <select
                  value={role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setRole(newRole);
                    if (newRole === 'Manager') setGajiPokok(5000000);
                    else if (newRole === 'Admin FO') setGajiPokok(4000000);
                    else setGajiPokok(0);
                  }}
                  required
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#7d5141]"
                >
                  {rolesList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Form Field 5b: Lini Profesi Petugas */}
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Lini Profesi Petugas *</label>
                <select
                  value={liniProfesi}
                  onChange={(e) => setLiniProfesi(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#1e1b15]"
                >
                  <option value="Beautician">Beautician (Terapis & Skin Care)</option>
                  <option value="Nurse">Nurse (Tindakan Medis & Dokter)</option>
                  <option value="Admin FO">Admin FO / Kasir</option>
                  <option value="Management">Management / Klinik</option>
                </select>
              </div>

              {/* Form Field 6: Nominal Gaji Pokok */}
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Nominal Gaji Pokok (Rp) *</label>
                {role === 'Super Admin' || role === 'Admin System' || role === 'Admin Klinik' ? (
                  <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 italic">
                    Role {role} tidak memiliki kalkulasi gaji pokok (Non-Payroll).
                  </div>
                ) : (
                  <input
                    type="number"
                    value={gajiPokok}
                    onChange={(e) => setGajiPokok(e.target.value)}
                    required
                    placeholder="misal: 4000000"
                    className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#1e1b15]"
                  />
                )}
              </div>

              {/* Form Field 7: Status Training Staff */}
              <div>
                <label className="block text-xs font-semibold text-[#514440] mb-1">Status Keanggotaan Staff (Terapis/Beautician)</label>
                <select
                  value={isTraining ? '1' : '0'}
                  onChange={(e) => setIsTraining(e.target.value === '1')}
                  className="w-full px-3 py-2 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl text-xs font-bold text-[#1e1b15]"
                >
                  <option value="0">Staff Regular / Senior (Komisi Trial Rp 13.000)</option>
                  <option value="1">Staff Training / Magang (Komisi Trial Rp 10.000)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#e5ded4]">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {editUserMode ? 'Simpan Perubahan User' : 'Simpan User Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
