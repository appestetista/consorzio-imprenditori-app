import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Ship, Mail, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import ImportMessagesSection from '@/components/import-export/ImportMessagesSection';
import SearchHistory from '@/components/import-export/SearchHistory';
import WorldMapExplorer from '@/components/import-export/WorldMapExplorer';
import ExportSection from '@/components/import-export/ExportSection';
import ImportSection from '@/components/import-export/ImportSection';

export default function ImportExport() {
  const [user, setUser] = useState(null);
  const urlParamsIE = new URLSearchParams(window.location.search);
  const initialTab = urlParamsIE.get('tab') === 'import' ? 'import' : 'export';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedMapCountry, setSelectedMapCountry] = useState(null);

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
              {isExport || activeTab === 'history' ? 'Analisi mercati internazionali' : 'Import dalla Cina'}
            </p>
          </div>
          {(isExport || activeTab === 'history') && (
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
          )}
        </div>

        {/* Tab Switch principale — Export / Messaggi */}
        <div className="flex gap-1.5 mb-6 bg-slate-800/50 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              isExport || activeTab === 'history'
                ? 'bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-900 shadow-lg shadow-lime-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`relative px-4 flex items-center justify-center py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'messages'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            {importUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold ring-2 ring-slate-900">{importUnreadCount}</span>
            )}
          </button>
        </div>

        {/* Mappa — solo per Export */}
        {(isExport && !activeTab.includes('history')) && (
          <WorldMapExplorer onCountrySelect={(country) => {
            setSelectedMapCountry(country);
          }} />
        )}

        {/* Contenuto per tab */}
        {activeTab === 'messages' ? (
          <ImportMessagesSection user={user} />
        ) : activeTab === 'history' ? (
          <SearchHistory userEmail={user?.email} />
        ) : isExport ? (
          <ExportSection
            user={user}
            exportManagers={exportManagers}
            selectedMapCountry={selectedMapCountry}
            setSelectedMapCountry={setSelectedMapCountry}
          />
        ) : (
          <ImportSection
            user={user}
            exportManagers={exportManagers}
          />
        )}
      </main>

      <BottomNav currentPage="ImportExport" unreadMessages={messages.length} />
    </div>
  );
}