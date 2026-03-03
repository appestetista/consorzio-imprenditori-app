import React, { createContext, useContext, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationsBadge } from '../home/NotificationsPanel';

// Context globale per aprire/chiudere pannelli messaggi e notifiche
const PanelContext = createContext(null);

export function PanelProvider({ children }) {
  const [msgPanelOpen, setMsgPanelOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  const toggleMsg = () => {
    setMsgPanelOpen(prev => !prev);
    if (!msgPanelOpen) setNotifPanelOpen(false); // chiudi l'altro
  };
  const toggleNotif = () => {
    setNotifPanelOpen(prev => !prev);
    if (!notifPanelOpen) setMsgPanelOpen(false); // chiudi l'altro
  };
  const closeAll = () => {
    setMsgPanelOpen(false);
    setNotifPanelOpen(false);
  };

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
 * Icone busta + campanella — identiche ovunque.
 * Basta usare <TopIcons userEmail={...} userRegime={...} /> in qualsiasi header.
 */
export default function GlobalTopIcons({ userEmail, userRegime }) {
  const { toggleMsg, toggleNotif } = usePanels();
  const { totalBadge, unreadMessageCount } = useNotificationsBadge(userEmail, userRegime);

  return (
    <div className="flex items-center gap-2">
      {/* Busta messaggi */}
      <button onClick={toggleMsg} className="relative p-1">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/cd5e7b92b_Immagine_2026-02-03_182832-removebg-preview.png" 
          alt="Messaggi" 
          className="w-9 h-9 object-contain"
        />
        {unreadMessageCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
            {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
          </span>
        )}
      </button>

      {/* Campanella notifiche */}
      <button onClick={toggleNotif} className="relative p-1.5 rounded-xl hover:bg-slate-800 transition-colors">
        <Bell className="w-6 h-6 text-slate-400" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>
    </div>
  );
}