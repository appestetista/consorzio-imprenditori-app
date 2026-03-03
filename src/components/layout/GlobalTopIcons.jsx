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
 * Icone busta + campanella — dimensioni fisse, identiche ovunque.
 */
export default function GlobalTopIcons({ userEmail, userRegime }) {
  const { toggleNotif } = usePanels();
  const navigate = useNavigate();
  const { totalBadge, unreadMessageCount } = useNotificationsBadge(userEmail, userRegime);

  return (
    <div className="flex items-center gap-1">
      {/* Busta messaggi — naviga alla pagina Messaggi */}
      <button onClick={() => navigate(createPageUrl('Messaggi'))} className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/cd5e7b92b_Immagine_2026-02-03_182832-removebg-preview.png" 
          alt="Messaggi" 
          className="w-7 h-7 object-contain"
        />
        {unreadMessageCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
          </span>
        )}
      </button>

      {/* Campanella notifiche — toggle pannello dal basso */}
      <button onClick={toggleNotif} className="relative w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl hover:bg-slate-800 transition-colors">
        <Bell className="w-6 h-6 text-slate-400" />
        {totalBadge > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>
    </div>
  );
}