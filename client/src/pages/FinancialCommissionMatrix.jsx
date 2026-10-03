import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, FileText, CheckCircle, Calculator, Sparkles, User, Printer } from 'lucide-react';

export default function FinancialCommissionMatrix() {
  const [activeTab, setActiveTab] = useState('PAYROLL'); // 'PAYROLL', 'FORMULAS', 'PRICING'
  const [payrollSummary, setPayrollSummary] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Slip Gaji Modal State
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  useEffect(() => {
    fetchPayroll();
    fetchTreatments();
  }, [selectedBulan, selectedTahun]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/payroll/summary?bulan=${selectedBulan}&tahun=${selectedTahun}`);
      setPayrollSummary(res.data.payroll);
    } catch (err) {
      console.error('Error fetching payroll', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreatments = async () => {
    try {
      const res = await axios.get('/api/tindakan');
      setTreatments(res.data);
    } catch (err) {
      console.error('Error fetching treatments', err);
    }
  };

  const togglePaymentStatus = async (item) => {
    const newStatus = item.status_pembayaran === 'PAID' ? 'PENDING' : 'PAID';
    try {
      await axios.post('/api/payroll/pay', {
        user_id: item.user_id,
        bulan: item.bulan,
        tahun: item.tahun,
        status: newStatus
      });
      fetchPayroll();
    } catch (err) {
      alert('Gagal mengubah status pembayaran');
    }
  };

  const openSlipModal = (item) => {
    setSelectedSlip(item);
    setShowSlipModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">Keuangan, Catalog & Matrix Komisi Role</h1>
          <p className="text-xs text-[#514440]">Skema komisi otomatis untuk Nurse, Beautician, Marketing, Admin FO, dan Laporan Payroll Gaji.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setActiveTab('PAYROLL')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'PAYROLL' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
            >
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Laporan Payroll Gaji & Komisi
            </button>
            <button
              onClick={() => setActiveTab('FORMULAS')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'FORMULAS' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
            >
              <Calculator className="w-3.5 h-3.5 inline mr-1" />
              Skema Rumus Komisi Per Role (Revisi)
            </button>
            <button
              onClick={() => setActiveTab('PRICING')}
              className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === 'PRICING' ? 'bg-[#7d5141] text-white shadow-xs' : 'bg-[#faf3e8] text-[#514440] hover:bg-[#eee7dd]'}`}
            >
              <DollarSign className="w-3.5 h-3.5 inline mr-1" />
              Katalog 15 Tindakan & Pricing
            </button>
          </div>

          {activeTab === 'PAYROLL' && (
            <div className="flex gap-2 text-xs">
              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(Number(e.target.value))}
                className="py-1.5 px-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl font-semibold text-[#1e1b15]"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>Bulan {m}</option>
                ))}
              </select>

              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(Number(e.target.value))}
                className="py-1.5 px-3 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl font-semibold text-[#1e1b15]"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          )}
        </div>

        {/* PAYROLL SUMMARY TABLE */}
        {activeTab === 'PAYROLL' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
              <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                <tr>
                  <th className="py-3 px-4">Nama Karyawan</th>
                  <th className="py-3 px-4">Role / Lini Profesi</th>
                  <th className="py-3 px-4">Gaji Pokok</th>
                  <th className="py-3 px-4">Komisi Transaksi/Omset</th>
                  <th className="py-3 px-4">Komisi Doingan / Tindakan</th>
                  <th className="py-3 px-4">Grand Total THP</th>
                  <th className="py-3 px-4">Status Pembayaran</th>
                  <th className="py-3 px-4 text-center">Slip Gaji</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded4]">
                {payrollSummary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#fff8f0]">
                    <td className="py-3 px-4 font-bold text-[#1e1b15]">{item.full_name}</td>
                    <td className="py-3 px-4 text-[#7d5141] font-semibold">{item.role}</td>
                    <td className="py-3 px-4 text-[#514440]">Rp {item.gaji_pokok.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 text-[#514440]">Rp {item.total_komisi_produk.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 text-[#514440]">Rp {item.total_komisi_tindakan.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 font-bold text-sm text-[#7d5141]">
                      Rp {item.grand_total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => togglePaymentStatus(item)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          item.status_pembayaran === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {item.status_pembayaran === 'PAID' ? '✓ PAID (LUNAS)' : '⌛ PENDING (BAYAR)'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openSlipModal(item)}
                        className="px-2.5 py-1 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] rounded-lg text-[11px] font-semibold text-[#514440] cursor-pointer"
                      >
                        Cetak Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RUMUS KOMISI ROLE REVISI */}
        {activeTab === 'FORMULAS' && (
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-base text-[#1e1b15]">Skema Aturan Komisi & Aktivitas Per Role (Spesifikasi DEFLOW)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-[#faf3e8] border border-[#d6c2bd] rounded-2xl space-y-2">
                <div className="text-xs font-bold text-[#7d5141] uppercase tracking-wider">1. Nurse (Perawat)</div>
                <div className="p-3 bg-white rounded-xl text-xs font-mono text-[#1e1b15] border border-gray-200">
                  Aktivitas: Doingan / Nama Pasien<br/>
                  Komisi = Nominal Fix Komisi Tindakan Medis Per Pasien
                </div>
                <p className="text-[11px] text-[#514440]">Mendapatkan komisi tindakan medis untuk setiap prosedur yang dikerjakan / didampingi perawat.</p>
              </div>

              <div className="p-4 bg-[#faf3e8] border border-[#d6c2bd] rounded-2xl space-y-2">
                <div className="text-xs font-bold text-[#7d5141] uppercase tracking-wider">2. Beautician</div>
                <div className="p-3 bg-white rounded-xl text-xs font-mono text-[#1e1b15] border border-gray-200">
                  Aktivitas: Doingan / Nama Pasien & Status Doingan<br/>
                  - Mbr (Member)   : Rp 17.000 / Doingan<br/>
                  - Trial (Free)    : Rp 13.000 / Doingan
                </div>
                <p className="text-[11px] text-[#514440]">Komisi otomatis terhitung sesuai status doingan pasien member (Rp 17.000) atau trial free (Rp 13.000).</p>
              </div>

              <div className="p-4 bg-[#faf3e8] border border-[#d6c2bd] rounded-2xl space-y-2">
                <div className="text-xs font-bold text-[#7d5141] uppercase tracking-wider">3. Marketing</div>
                <div className="p-3 bg-white rounded-xl text-xs font-mono text-[#1e1b15] border border-gray-200">
                  Aktivitas: Nama Pasien, Status, Membership, DP Membership<br/>
                  - Trial (Free)       : Rp 10.000 / Pasien<br/>
                  - Komisi Membership  : Bonus % atau Nominal DP Membership
                </div>
                <p className="text-[11px] text-[#514440]">Insentif per registrasi pasien trial (Rp 10.000) ditambah komisi konversi membership dan DP membership.</p>
              </div>

              <div className="p-4 bg-[#faf3e8] border border-[#d6c2bd] rounded-2xl space-y-2">
                <div className="text-xs font-bold text-[#7d5141] uppercase tracking-wider">4. Admin FO (Front Office)</div>
                <div className="p-3 bg-white rounded-xl text-xs font-mono text-[#1e1b15] border border-gray-200">
                  Aktivitas: Mendaftarkan Pasien & Membuat Tagihan / Billing<br/>
                  Komisi = Omset Billing Kasir Harian (1.5%)
                </div>
                <p className="text-[11px] text-[#514440]">Mengelola pendaftaran pasien awal dan kasir nota billing counter.</p>
              </div>
            </div>
          </div>
        )}

        {/* PRICING & 15 TINDAKAN CATALOG */}
        {activeTab === 'PRICING' && (
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-base text-[#1e1b15]">Daftar Katalog 15 Jenis Tindakan / Treatment Resmi DEFLOW</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#e5ded4] rounded-xl">
                <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                  <tr>
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Nama Jenis Tindakan / Treatment</th>
                    <th className="py-3 px-4">Tarif Konsul Dokter</th>
                    <th className="py-3 px-4">Tarif Tindakan Medis</th>
                    <th className="py-3 px-4">Komisi Beautician (Fix)</th>
                    <th className="py-3 px-4">Komisi Nurse (Fix)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5ded4]">
                  {treatments.map((t, index) => (
                    <tr key={t.id} className="hover:bg-[#fff8f0]">
                      <td className="py-3 px-4 text-[#83746f] font-bold">{index + 1}</td>
                      <td className="py-3 px-4 font-bold text-[#1e1b15] text-sm">{t.nama_tindakan}</td>
                      <td className="py-3 px-4 text-[#514440]">Rp {t.tarif_konsul_dokter.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 font-bold text-[#7d5141]">Rp {t.tarif_tindakan_medis.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">Rp {t.komisi_fix_therapist.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-blue-700 font-semibold">Rp {t.nominal_nurse_tindakan.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SLIP GAJI POPUP MODAL */}
      {showSlipModal && selectedSlip && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#e5ded4]">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-serif font-bold text-base text-[#1e1b15]">Slip Gaji Karyawan DEFLOW</h3>
              <button onClick={() => setShowSlipModal(false)} className="text-gray-400 font-bold text-lg cursor-pointer">×</button>
            </div>

            <div className="space-y-3 font-mono text-xs text-[#1e1b15] bg-[#faf3e8] p-4 rounded-xl border border-[#d6c2bd]">
              <div className="text-center font-serif font-bold text-sm text-[#7d5141]">
                DEFLOW AESTHETIC CLINIC
                <div className="text-[10px] font-sans text-gray-500">SLIP GAJI & INSENTIF BULAN {selectedSlip.bulan}/{selectedSlip.tahun}</div>
              </div>
              <div className="border-t border-b border-gray-300 py-2 space-y-1">
                <div>Nama  : <strong>{selectedSlip.full_name}</strong></div>
                <div>Role  : <strong>{selectedSlip.role}</strong></div>
                <div>Status: <span className="font-bold text-emerald-700">{selectedSlip.status_pembayaran}</span></div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Gaji Pokok:</span>
                  <span>Rp {selectedSlip.gaji_pokok.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Komisi Transaksi/Omset:</span>
                  <span>Rp {selectedSlip.total_komisi_produk.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Komisi Doingan/Tindakan:</span>
                  <span>Rp {selectedSlip.total_komisi_tindakan.toLocaleString('id-ID')}</span>
                </div>
                <div className="border-t border-gray-400 pt-1 flex justify-between font-bold text-sm text-[#7d5141]">
                  <span>GRAND TOTAL THP:</span>
                  <span>Rp {selectedSlip.grand_total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak Slip Gaji
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
