import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardEconomica from '../components/cruscotto-fiscale/DashboardEconomica';
import FattureList from '../components/cruscotto-fiscale/FattureList';
import SyncPanel from '../components/cruscotto-fiscale/SyncPanel';
import { FileText, BarChart3, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function CruscottoFiscale() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: aziende = [], isLoading: loadingAziende } = useQuery({
    queryKey: ['aziende-fiscali', user?.email],
    queryFn: () => base44.entities.AziendaFiscale.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const azienda = aziende[0] || null;

  const { data: fatture = [], isLoading: loadingFatture } = useQuery({
    queryKey: ['fatture', azienda?.id],
    queryFn: () => base44.entities.FatturaElettronica.filter({ azienda_id: azienda.id }),
    enabled: !!azienda?.id
  });

  const handleSyncComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['fatture'] });
    queryClient.invalidateQueries({ queryKey: ['aziende-fiscali'] });
  };

  const handleAziendaCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['aziende-fiscali'] });
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'fatture', label: 'Fatture', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1a] to-[#0f172a] px-4 pt-16 pb-24">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.href = createPageUrl('Esplora')} className="back-arrow-tap text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">Cruscotto Fiscale</h1>
            <p className="text-slate-400 text-xs">Analisi fatture elettroniche in tempo reale</p>
          </div>
        </div>

        {/* Sync Panel */}
        <SyncPanel
          azienda={azienda}
          onSyncComplete={handleSyncComplete}
          onAziendaCreated={handleAziendaCreated}
          userEmail={user?.email}
        />

        {/* Tabs */}
        {azienda && (
          <>
            <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
              {tabs.map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 gap-1.5 text-xs ${activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </Button>
              ))}
            </div>

            {(loadingFatture || loadingAziende) ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && <DashboardEconomica fatture={fatture} />}
                {activeTab === 'fatture' && <FattureList fatture={fatture} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}