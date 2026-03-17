import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Ship, Mail, Clock, UserRound, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '@/components/layout/Header';
import BottomNavWithMenu from '@/components/layout/BottomNavWithMenu';
import ImportMessagesSection from '@/components/import-export/ImportMessagesSection';
import SearchHistory from '@/components/import-export/SearchHistory';
import WorldMapExplorer from '@/components/import-export/WorldMapExplorer';
import ExportSection from '@/components/import-export/ExportSection';
import ImportSection from '@/components/import-export/ImportSection';
import ContactExportManagerPopup from '@/components/import-export/ContactExportManagerPopup';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import { useAILimits } from '@/components/hooks/useAILimits';
import UsageCounter from '@/components/common/UsageCounter';
import LimitReachedBanner from '@/components/common/LimitReachedBanner';
import { Button } from '@/components/ui/button';
import { FileSearch } from 'lucide-react';
import AnalysisErrorBoundary from '@/components/import-export/AnalysisErrorBoundary';

export default function ImportExport() {
  const [user, setUser] = useState(null);
  const urlParamsIE = new URLSearchParams(window.location.search);
  const initialTab = urlParamsIE.get('tab') === 'import' ? 'import' : 'export';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedMapCountry, setSelectedMapCountry] = useState(null);
  const [historySnapshot, setHistorySnapshot] = useState(null);
  const [showContactPopup, setShowContactPopup] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try { setUser(await base44.auth.me()); } catch (e) { console.error(e); }
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const { data: exportManagers = [] } = useQuery({
    queryKey: ['export-managers'],
    queryFn: () => base44.entities.Consultant.filter({ category: 'Internazionalizzazione/Export' }),
  });

  const { data: importUnreadCount = 0 } = useQuery({
    queryKey: ['import-unread-count', user?.email],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ to_email: user?.email, source: 'import_export', is_read: false });
      return msgs.length;
    },
    enabled: !!user?.email,
  });

  const isExport = activeTab === 'export';
  const isImport = activeTab === 'import';

  const actionType = isExport ? 'export_analysis' : 'import_analysis';
  const { usageCount, limit, isLimitReached } = useAILimits(user?.email, actionType);

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-black p-3 -m-3 rounded-full back-arrow-tap hover:text-black/70 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-black text-xl font-bold">
              {isExport || activeTab === 'history' ? 'Export' : 'Import'}
            </h1>
          </div>
          {/* Icone gestite dal GlobalHeader */}
        </div>



        {/* Usage Counter */}
        {user && !isLimitReached && activeTab !== 'history' && (
          <div className="mb-4">
            <UsageCounter usageCount={usageCount} limit={limit} label={`Analisi ${isExport ? 'export' : 'import'} disponibili questo mese`} />
          </div>
        )}
        {user && isLimitReached && activeTab !== 'history' && (
          <div className="mb-4">
            <LimitReachedBanner actionType={actionType} usageCount={usageCount} limit={limit} />
          </div>
        )}

        {/* Storico inline */}
        {activeTab !== 'history' && user && (
          <div className="mb-6">
            <button
              onClick={() => setActiveTab('history')}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-all duration-100 active:translate-y-[2px]"
              style={{
                background: 'linear-gradient(180deg, #8b6914 0%, #6b4f0e 60%, #4a3609 100%)',
                border: '1px solid #a07a18',
                boxShadow: '0 4px 0 #3a2a07, 0 6px 12px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,220,130,0.25)',
              }}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-white" />
                <span className="text-white font-medium">Storico ricerche</span>
              </div>
              <span className="text-white/80 text-xs">Vedi tutto →</span>
            </button>
          </div>
        )}

        {/* Contenuto per tab */}
        <AnalysisErrorBoundary>
        {activeTab === 'messages' ? (
          <ImportMessagesSection user={user} />
        ) : activeTab === 'history' ? (
          <>
            <button
              onClick={() => setActiveTab('export')}
              className="flex items-center gap-2 text-black hover:text-black/70 mb-4 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna all'analisi
            </button>
            <SearchHistory userEmail={user?.email} onOpenAnalysis={(log) => {
              if (log.analysis_snapshot) {
                setHistorySnapshot(log.analysis_snapshot);
                setActiveTab(log.action_type === 'export_analysis' ? 'export' : 'import');
              }
            }} />
          </>
        ) : isExport ? (
          <ExportSection
            key={historySnapshot ? 'snapshot-' + JSON.stringify(historySnapshot.confirmedHS?.hs_code) : 'new'}
            user={user}
            exportManagers={exportManagers}
            selectedMapCountry={selectedMapCountry}
            setSelectedMapCountry={setSelectedMapCountry}
            initialSnapshot={historySnapshot}
            onClearSnapshot={() => setHistorySnapshot(null)}
          />
        ) : (
          <ImportSection
            user={user}
            exportManagers={exportManagers}
          />
        )}
        </AnalysisErrorBoundary>
      </main>

      <ContactExportManagerPopup open={showContactPopup} onClose={() => setShowContactPopup(false)} exportManagers={exportManagers} user={user} />
      <BottomNavWithMenu currentPage="ImportExport" unreadMessages={messages.length} />
    </div>
  );
}