import React, { useState, useEffect, useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import DashboardOverview from './pages/DashboardOverview';
import PatientManagement from './pages/PatientManagement';
import DoinganActivity from './pages/DoinganActivity';
import PosBillingCounter from './pages/PosBillingCounter';
import LogisticsInventory from './pages/LogisticsInventory';
import FinancialCommissionMatrix from './pages/FinancialCommissionMatrix';
import ClinicSettingsAcl from './pages/ClinicSettingsAcl';
import WhatsAppGateway from './pages/WhatsAppGateway';

import StaffMobilePortal from './pages/StaffMobilePortal';
import { LogOut } from 'lucide-react';

function MainApp() {
  const { user, logout, loading, hasPermission } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setActiveTab('overview');
      return;
    }

    const navModules = {
      patients: 'patient_intake',
      doingan: 'doingan',
      pos: 'patient_packages',
      inventory: ['inventory_retail', 'inventory_btc', 'inventory_non_medical'],
      financial: ['payroll', 'commission_formulas', 'pricing'],
      acl: 'acl',
      wa: 'reminders'
    };

    const requiredModule = navModules[activeTab];
    if (requiredModule) {
      if (Array.isArray(requiredModule)) {
        if (!requiredModule.some(mod => hasPermission(mod, 'can_read'))) {
          setActiveTab('overview');
        }
      } else if (!hasPermission(requiredModule, 'can_read')) {
        setActiveTab('overview');
      }
    }
  }, [user, activeTab, hasPermission]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#7d5141] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-serif font-bold text-sm text-[#7d5141]">Memuat DEFLOW Aesthetic Clinic System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Specialized Layout for Beautician & Nurse Staff Roles
  if (user.role === 'Beautician' || user.role === 'Nurse') {
    return (
      <div className="min-h-screen bg-[#fff8f0] flex flex-col">
        {/* Staff Dedicated Header */}
        <header className="bg-[#2a241e] text-white px-4 py-3 sticky top-0 z-30 shadow-md border-b border-[#4a3b32] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo/DEFLOW_LOGO_TAGLINE.png" 
              alt="DEFLOW" 
              className="h-9 object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo/DEFLOW_LOGO_ONLY.png';
              }}
            />
            <span className="text-[10px] font-bold text-amber-200 bg-white/10 px-2 py-0.5 rounded-md uppercase tracking-wider hidden sm:inline">
              Portal Petugas ({user.role})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-bold text-xs truncate max-w-[130px] sm:max-w-none">{user.full_name}</div>
              <div className="text-[10px] text-amber-200 font-semibold">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 bg-white/10 hover:bg-red-600/30 text-gray-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/10 flex items-center gap-1"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Staff Mobile Portal Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-lg w-full mx-auto">
          <StaffMobilePortal />
        </main>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview setActiveTab={setActiveTab} />;
      case 'patients':
        return <PatientManagement />;
      case 'doingan':
        return <DoinganActivity />;
      case 'pos':
        return <PosBillingCounter />;
      case 'inventory':
        return <LogisticsInventory />;
      case 'financial':
        return <FinancialCommissionMatrix />;
      case 'acl':
        return <ClinicSettingsAcl />;
      case 'wa':
        return <WhatsAppGateway setActiveTab={setActiveTab} />;

      default:
        return <DashboardOverview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#fff8f0]">
      {/* Sidebar Navigation (Desktop Permanent & Mobile Off-canvas Drawer) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          setActiveTab={setActiveTab} 
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1 min-w-0">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
