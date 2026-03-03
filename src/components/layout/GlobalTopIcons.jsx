import React, { createContext, useContext, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useNotificationsBadge } from '../home/NotificationsPanel';

// Context globale per aprire/chiudere pannelli messaggi e notifiche
const PanelContext = createContext(null);

export function PanelProvider({ children }) {
  const [msgPanelOpen, setMsgPanelOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  const toggleMsg = useCallback(() => {
    setNotifPanelOpen(false);
    setMsgPanelOpen(prev => !prev);
  }, []);

  const toggleNotif = useCallback(() => {
    setMsgPanelOpen(false);
    setNotifPanelOpen(prev => !prev);
  }, []);

  const closeAll = useCallback(() => {
    setMsgPanelOpen(false);
    setNotifPanelOpen(false);
  }, []);

  return (
    <PanelContext.Provider value={{ msgPanelOpen, notifPanelOpen, toggleMsg, toggleNotif, closeAll }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanels() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('usePanels must be used within PanelProvider');
  return ctx;
}

/**
 * Icone busta + campanella — usato nell'header interno delle pagine (es. Header.js).
 * Stesse dimensioni grandi del GlobalHeader.
 */
export default function GlobalTopIcons({ userEmail, userRegime }) {
  const { toggleMsg, toggleNotif } = usePanels();
  const { totalBadge, unreadMessageCount } = useNotificationsBadge(userEmail, userRegime);

  return (
    <div className="flex items-center gap-2">
      {/* Busta messaggi — toggle pannello */}
      <button
        onClick={toggleMsg}
        className="relative w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-xl active:bg-white/10 transition-colors"
        style={{ touchAction: 'manipulation' }}
      >
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/cd5e7b92b_Immagine_2026-02-03_182832-removebg-preview.png" 
          alt="Messaggi" 
          className="w-8 h-8 object-contain pointer-events-none"
        />
        {unreadMessageCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
          </span>
        )}
      </button>

      {/* Campanella notifiche — toggle pannello */}
      <button
        onClick={toggleNotif}
        className="relative w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-xl active:bg-white/10 transition-colors"
        style={{ touchAction: 'manipulation' }}
      >
        <Bell className="w-7 h-7 text-slate-400" />
        {totalBadge > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>
    </div>
  );
}