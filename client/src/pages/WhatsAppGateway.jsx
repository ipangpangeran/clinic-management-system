import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Send, CheckCircle2, Trash2, RefreshCw, Smartphone, ExternalLink } from 'lucide-react';

export default function WhatsAppGateway({ setActiveTab }) {
  const [waLogs, setWaLogs] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [clinic, setClinic] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchWaData();
  }, []);

  const fetchWaData = async () => {
    try {
      const [logRes, remRes, profRes] = await Promise.all([
        axios.get('/api/wa/logs'),
        axios.get('/api/reminders'),
        axios.get('/api/clinic-profile')
      ]);
      setWaLogs(logRes.data);
      setReminders(remRes.data);
      setClinic(profRes.data);
    } catch (err) {
      console.error('Error fetching WA data', err);
    }
  };

  const handleManualTrigger = async () => {
    setSending(true);
    try {
      await axios.post('/api/wa/send-reminders');
      alert('Proses pengiriman pengingat WhatsApp selesai diproses!');
      fetchWaData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memicu pengiriman WA');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteReminder = async (remId, patientName) => {
    try {
      await axios.delete(`/api/reminders/${remId}`);
      fetchWaData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus reminder');
    }
  };


  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const pendingReminders = reminders.filter(r => r.status === 'PENDING');

  const getMaskedEndpoint = (fullUrl) => {
    if (!fullUrl) return 'https://api-wa.ipangpangeran.com';
    try {
      const parsed = new URL(fullUrl);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch (e) {
      return fullUrl.split('?')[0].split('/send')[0];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1e1b15]">WhatsApp Gateway & Cron Reminders</h1>
          <p className="text-xs text-[#514440]">Otomatisasi pengiriman pesan pengingat jadwal kontrol H-1 pasien via WhatsApp Gateway API.</p>
        </div>
        <button
          onClick={handleManualTrigger}
          disabled={sending}
          className="px-5 py-2.5 bg-[#7d5141] hover:bg-[#653d2e] disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Memproses Pengiriman API...' : 'Kirim Reminder WhatsApp H-1 Sekarang'}
        </button>
      </div>

      {/* Clean Gateway API Status Card (Without Technical Payload JSON) */}
      <div className="bg-white p-6 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-xs">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1e1b15]">Status WA Gateway</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> API AKTIF & TERHUBUNG
                </span>
              </div>
              <p className="text-xs text-[#514440] font-mono mt-1">
                Endpoint URL: <strong className="text-[#7d5141]">{getMaskedEndpoint(clinic?.wa_api_url)}</strong>
              </p>
            </div>
          </div>


          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <span className="text-[#83746f]">Jadwal Cron Job Otomatis:</span>
              <div className="font-mono font-bold text-[#7d5141]">08:00 AM (Setiap Hari)</div>
            </div>
            {setActiveTab && (
              <button
                onClick={() => setActiveTab('acl')}
                className="px-3 py-1.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] text-[#7d5141] font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                title="Ubah URL Pointing WA API di Super Admin Settings"
              >
                <span>Ubah Endpoint</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Pending H-1 Reminders with Delete Action vs Dispatch Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Antrean H-1 Reminders (With Delete Button) */}
        <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
            <h3 className="font-serif font-bold text-base text-[#1e1b15]">Antrean Reminder Jadwal Kontrol</h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {pendingReminders.length} PENDING
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pendingReminders.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-8">Tidak ada antrean reminder jadwal kontrol.</p>
            ) : (
              pendingReminders.map(r => (
                <div key={r.id} className="p-3.5 bg-[#faf3e8] border border-[#d6c2bd] rounded-xl space-y-2 relative group hover:border-[#7d5141] transition-all">
                  <div className="flex justify-between items-center text-xs font-bold text-[#1e1b15]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#1e1b15]">{r.pasien_nama}</span>
                      <span className="text-[#83746f] text-[11px] font-normal">({r.pasien_hp})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-900 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        {r.tgl_kembali}
                      </span>
                      {/* Delete Button for Reminder Queue */}
                      <button
                        onClick={() => handleDeleteReminder(r.id, r.pasien_nama)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                        title="Hapus dari antrean reminder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#514440] font-sans leading-relaxed">{r.message_text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dispatch Logs Table */}
        <div className="bg-white p-5 rounded-2xl border border-[#e5ded4] shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-[#e5ded4] pb-3">
            <h3 className="font-serif font-bold text-base text-[#1e1b15]">Log Pengiriman API WhatsApp</h3>
            <button onClick={fetchWaData} className="text-xs text-[#7d5141] font-semibold hover:underline flex items-center gap-1 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf3e8] text-[#514440] font-semibold uppercase border-b border-[#e5ded4]">
                <tr>
                  <th className="py-2.5 px-3">Waktu Kirim</th>
                  <th className="py-2.5 px-3">No. HP Pasien</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ded4]">
                {waLogs.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-gray-400 italic">Belum ada log pengiriman API.</td>
                  </tr>
                ) : (
                  waLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[#fff8f0]">
                      <td className="py-2.5 px-3 text-[#83746f] text-[11px]">{new Date(log.sent_at).toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1e1b15]">{log.recipient_number}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {log.status}
                        </span>
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
