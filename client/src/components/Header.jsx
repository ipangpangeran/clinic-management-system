import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Phone, MapPin, Bell, AlertTriangle, ExternalLink } from 'lucide-react';

export default function Header({ setActiveTab }) {
  const [clinic, setClinic] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    fetchClinicProfile();
    fetchLowStock();

    const interval = setInterval(() => {
      fetchLowStock();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchClinicProfile = async () => {
    try {
      const res = await axios.get('/api/clinic-profile');
      setClinic(res.data);
    } catch (err) {
      console.error('Error fetching clinic profile', err);
    }
  };

  const fetchLowStock = async () => {
    try {
      const res = await axios.get('/api/stok/low-stock');
      setLowStockItems(res.data);
    } catch (err) {
      console.error('Error fetching low stock notifications', err);
    }
  };

  const handleGoToInventory = () => {
    setShowNotifDropdown(false);
    if (setActiveTab) setActiveTab('inventory');
  };

  return (
    <header className="bg-white border-b border-[#e5ded4] px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#1e1b15] tracking-tight flex items-center gap-2">
            <span>{clinic?.clinic_name || 'DEFLOW'}</span> 
            <span className="font-sans text-xs font-bold text-[#7d5141] tracking-widest uppercase border-l border-[#d6c2bd] pl-2">
              {clinic?.tagline || 'AESTHETIC CLINIC'}
            </span>
          </h2>
          <div className="flex items-center gap-3 text-xs text-[#83746f] mt-1 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#7d5141]" />
              {clinic?.address || 'Jakarta Selatan'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-[#7d5141]" />
              {clinic?.whatsapp || '085297532050'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Bell Notification Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2.5 bg-[#faf3e8] hover:bg-[#eee7dd] border border-[#d6c2bd] rounded-xl text-[#514440] hover:text-[#7d5141] transition-all shadow-xs relative cursor-pointer"
            title="Notifikasi Stok Menipis (< 3)"
          >
            <Bell className="w-4 h-4" />
            {lowStockItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                {lowStockItems.length}
              </span>
            )}
          </button>

          {/* Low Stock Dropdown Popover */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#e5ded4] p-4 z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-[#e5ded4] pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#1e1b15]">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Notifikasi Stok Menipis (&lt; 3)</span>
                </div>
                <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                  {lowStockItems.length} Item
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400 italic">
                    Semua stok produk aman (&ge; 3).
                  </div>
                ) : (
                  lowStockItems.map(item => (
                    <div key={item.id} className="p-2.5 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#1e1b15]">{item.nama_produk}</div>
                        <div className="text-[10px] text-gray-500 font-mono">SKU: {item.kode_sku}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded inline-block">
                          {item.sisa_stok <= 0 ? `Stok Habis (0 ${item.satuan})` : `Sisa: ${item.sisa_stok} ${item.satuan}`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {lowStockItems.length > 0 && (
                <button
                  onClick={handleGoToInventory}
                  className="w-full py-2 bg-[#7d5141] hover:bg-[#653d2e] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                >
                  <span>Kelola Stok di Logistik (ASM)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-right pl-3 border-l border-[#e5ded4]">
          <div className="text-xs font-semibold text-[#1e1b15]">Realtime Status</div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> System Online
          </div>
        </div>
      </div>
    </header>
  );
}
