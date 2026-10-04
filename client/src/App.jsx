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

function MainApp() {
  const { user, loading, hasPermission } = useContext(AuthContext);
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
