import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation, type ActiveTab } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { AlertsPage } from './pages/AlertsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { SettingsPage } from './pages/SettingsPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { CreateServiceModal } from './components/CreateServiceModal';
import { DeclareIncidentModal } from './components/DeclareIncidentModal';
import { AuthModal } from './components/AuthModal';
import { apiRequest } from './lib/api';

function MainApp() {
  const { user, activeOrg, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [isDeclareIncidentOpen, setIsDeclareIncidentOpen] = useState(false);
  const [servicesForModal, setServicesForModal] = useState<any[]>([]);

  const fetchServicesForModal = async () => {
    try {
      const data = await apiRequest('/api/v1/services');
      setServicesForModal(data);
    } catch {
      // silently catch
    }
  };

  useEffect(() => {
    if (activeOrg && !isLoading) {
      fetchServicesForModal();
    }
  }, [activeOrg, isLoading]);

  // Tab change handler resets deep detail selections
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedServiceId(null);
    setSelectedIncidentId(null);
  };

  const handleNavigateToService = (id: string) => {
    setSelectedServiceId(id);
    setActiveTab('services');
  };

  const handleNavigateToIncident = (id: string) => {
    setSelectedIncidentId(id);
    setActiveTab('incidents');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0F1117] text-neutral-900 dark:text-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tighter animate-pulse shadow-sm">
            DP
          </div>
          <div className="text-xs text-neutral-400 font-mono">
            Connecting to DevPulse monitoring cluster...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] dark:bg-[#0F1117] text-neutral-900 dark:text-neutral-100 font-sans antialiased">
      {/* Top Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (
          <DashboardPage
            key={activeOrg?.id || 'dashboard'}
            onNavigateToService={handleNavigateToService}
            onNavigateToIncident={handleNavigateToIncident}
            onOpenCreateService={() => setIsCreateServiceOpen(true)}
            onOpenDeclareIncident={() => {
              fetchServicesForModal();
              setIsDeclareIncidentOpen(true);
            }}
          />
        )}

        {activeTab === 'services' && (
          selectedServiceId ? (
            <ServiceDetailPage
              serviceId={selectedServiceId}
              onBack={() => setSelectedServiceId(null)}
              onNavigateToIncident={handleNavigateToIncident}
            />
          ) : (
            <ServicesPage
              key={activeOrg?.id || 'services'}
              onSelectService={(id) => setSelectedServiceId(id)}
              onOpenCreateService={() => setIsCreateServiceOpen(true)}
            />
          )
        )}

        {activeTab === 'incidents' && (
          selectedIncidentId ? (
            <IncidentDetailPage
              incidentId={selectedIncidentId}
              onBack={() => setSelectedIncidentId(null)}
            />
          ) : (
            <IncidentsPage
              key={activeOrg?.id || 'incidents'}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
              onOpenDeclareIncident={() => {
                fetchServicesForModal();
                setIsDeclareIncidentOpen(true);
              }}
            />
          )
        )}

        {activeTab === 'alerts' && <AlertsPage key={activeOrg?.id || 'alerts'} />}

        {activeTab === 'webhooks' && <WebhooksPage key={activeOrg?.id || 'webhooks'} />}

        {activeTab === 'settings' && <SettingsPage key={activeOrg?.id || 'settings'} />}

        {activeTab === 'docs' && <ApiDocsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">DevPulse</span>
            <span>·</span>
            <span>Developer Incident & Reliability Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Server: Node.js Express</span>
            <span>·</span>
            <span>REST API v1</span>
            <span>·</span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="hover:text-neutral-900 dark:hover:text-white underline decoration-neutral-300"
            >
              Switch Role / Persona
            </button>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <CreateServiceModal
        isOpen={isCreateServiceOpen}
        onClose={() => setIsCreateServiceOpen(false)}
        onSuccess={() => {
          fetchServicesForModal();
          setSelectedServiceId(null);
        }}
      />

      <DeclareIncidentModal
        isOpen={isDeclareIncidentOpen}
        services={servicesForModal}
        onClose={() => setIsDeclareIncidentOpen(false)}
        onSuccess={() => {
          setSelectedIncidentId(null);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
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
