import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send, UserRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AIUsageInline from '../home/AIUsageInline';

export default function GlobalSearchBar({ currentPageName }) {
  const navigate = useNavigate();
  const [usate, setUsate] = useState(0);
  const [piano, setPiano] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setPiano(u?.piano_abbonamento || 'free');
      setUsate(u?.consulenze_usate_mese || 0);
    }).catch(() => {});
  }, []);

  // Non mostrare su Home (ha la sua barra input con pupino), AdminPanel, CalendarioIncontri
  if (currentPageName === 'Home' || currentPageName === 'AdminPanel' || currentPageName === 'CalendarioIncontri') return null;

  return (
    <div className="fixed z-40 left-0 right-0" style={{ bottom: '100px' }}>
      {/* Sfondo sfumato per coprire il contenuto dietro */}
      <div className="absolute inset-0 pointer-events-none" style={{ top: '-36px', background: 'linear-gradient(to top, var(--app-bg) 60%, transparent 100%)' }} />
      <div className="relative max-w-md mx-auto px-3 space-y-1.5">
        <AIUsageInline usate={usate} piano={piano} />
        <div className="flex items-center gap-2">
          {/* Barra di ricerca */}
          <button
            onClick={() => navigate(createPageUrl('Home'))}
            className="flex-1 relative flex items-center rounded-xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-lg overflow-hidden"
          >
            <span className="flex-1 text-left text-slate-500 text-sm px-4 py-2.5 truncate">
              Chiedi qualsiasi cosa...
            </span>
            <div
              className="flex-shrink-0 m-1 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#334155' }}
            >
              <Send className="w-4 h-4 text-slate-500" />
            </div>
          </button>

          {/* Pulsante My Profilo */}
          <button
            onClick={() => navigate(createPageUrl('MyProfile'))}
            className="flex-shrink-0 w-10 h-10 rounded-xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <UserRound className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}