import React, { useState, useContext } from 'react';
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
  const { user, loading } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center">
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
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header setActiveTab={setActiveTab} />
        <main className="p-8 max-w-7xl w-full mx-auto flex-1">
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
