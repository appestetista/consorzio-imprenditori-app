import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Ship, Mail, Clock, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import ImportMessagesSection from '@/components/import-export/ImportMessagesSection';
import SearchHistory from '@/components/import-export/SearchHistory';
import WorldMapExplorer from '@/components/import-export/WorldMapExplorer';
import ExportSection from '@/components/import-export/ExportSection';
import ImportSection from '@/components/import-export/ImportSection';
import ContactExportManagerPopup from '@/components/import-export/ContactExportManagerPopup';

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24">
      <Header user={user} />

      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Header con tab switch */}
        <div className="flex items-center gap-3 mb-5">
          <Link to={createPageUrl('Home')} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center back-arrow-tap">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold tracking-tight">
              {isExport || activeTab === 'history' ? 'Export' : 'Import'}
            </h1>
            <p className="text-slate-500 text-xs">
              {isExport || activeTab === 'history' ? 'Analisi mercati internazionali' : 'Analisi import'}
            </p>
          </div>
          {(isExport || activeTab === 'history') && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowContactPopup(true)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-lime-400 hover:border-lime-400/30 transition-all"
                title="Contatta Export Manager"
              >
                <UserRound className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'history' ? 'export' : 'history')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
                  activeTab === 'history'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Storico</span>
              </button>
            </div>
          )}
        </div>

        {/* Contenuto per tab */}
        {activeTab === 'messages' ? (
          <ImportMessagesSection user={user} />
        ) : activeTab === 'history' ? (
          <SearchHistory userEmail={user?.email} onOpenAnalysis={(log) => {
            if (log.analysis_snapshot) {
              setHistorySnapshot(log.analysis_snapshot);
              setActiveTab(log.action_type === 'export_analysis' ? 'export' : 'import');
            }
          }} />
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
      </main>

      <ContactExportManagerPopup open={showContactPopup} onClose={() => setShowContactPopup(false)} exportManagers={exportManagers} user={user} />
      <BottomNav currentPage="ImportExport" unreadMessages={messages.length} />
    </div>
  );
}