import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, UserPlus, ShoppingBag, PackageCheck, 
  DollarSign, ShieldCheck, MessageSquare, LogOut, ChevronRight, Sparkles, X, Users
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const { user, logout, hasPermission } = useContext(AuthContext);
  const [waReminderEnabled, setWaReminderEnabled] = useState(false);

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => setWaReminderEnabled(res.data.wa_reminder_enabled === '1'))
      .catch(err => console.error('Error fetching settings in Sidebar', err));
  }, []);

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, module: null },
    { id: 'patients', label: 'Pendaftaran Pasien & Treatment', icon: UserPlus, module: 'patient_intake' },
    { id: 'customer_database', label: 'Database Data Pelanggan', icon: Users, module: 'patient_management' },
    { id: 'doingan', label: 'Doingan & Aktivitas Perawatan', icon: Sparkles, module: 'doingan' },
    { id: 'pos', label: 'POS & Billing Counter', icon: ShoppingBag, module: 'patient_packages' },
    { id: 'inventory', label: 'Logistik & Stok Barang', icon: PackageCheck, module: ['inventory_retail', 'inventory_btc', 'inventory_non_medical'] },
    { id: 'financial', label: 'Keuangan & Komisi Gaji', icon: DollarSign, module: ['payroll', 'commission_formulas', 'pricing'] },
    { id: 'acl', label: 'Kelola User & Dynamic ACL', icon: ShieldCheck, module: 'acl' },
    ...(waReminderEnabled ? [{ id: 'wa', label: 'WhatsApp Gateway & Reminder', icon: MessageSquare, module: 'reminders' }] : []),
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Brand Logo Header */}
        <div className="px-6 py-5 border-b border-[#e5ded4] relative flex items-center justify-center bg-[#2a241e]">
          <div className="flex items-center justify-center w-full">
            <img 
              src="/logo/DEFLOW_LOGO_TAGLINE.png" 
              alt="DEFLOW Aesthetic Clinic" 
              className="h-12 sm:h-14 max-w-[85%] object-contain transition-all hover:scale-105 mx-auto"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo/DEFLOW_LOGO_ONLY.png';
              }}
            />
          </div>
          {setIsMobileMenuOpen && (
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="mx-4 my-4 p-3.5 bg-gradient-to-r from-[#faf3e8] to-[#f4ede3] border border-[#d6c2bd] rounded-2xl flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#7d5141] text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs shrink-0">
            {getInitials(user?.full_name)}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <h4 className="font-bold text-sm text-[#1e1b15] truncate tracking-tight font-sans">{user?.full_name}</h4>
            <div className="flex items-center gap-1 mt-0.5 text-[11px] font-bold text-[#7d5141] uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#7d5141]" />
              <span className="truncate">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {navItems.map((item) => {
            if (item.module) {
              if (Array.isArray(item.module)) {
                if (!item.module.some(mod => hasPermission(mod, 'can_read'))) return null;
              } else {
                if (!hasPermission(item.module, 'can_read')) return null;
              }
            }
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#7d5141] text-white shadow-md font-bold' 
                    : 'text-[#514440] hover:bg-[#faf3e8] hover:text-[#1e1b15]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#83746f]'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-[#e5ded4]">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#faf3e8] hover:bg-red-50 text-[#514440] hover:text-red-600 border border-[#d6c2bd] hover:border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Sistem</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-[#e5ded4] flex-col justify-between h-screen sticky top-0 z-30 shadow-xs shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay & Slide-Over */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col justify-between h-full transition-transform transform translate-x-0">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
