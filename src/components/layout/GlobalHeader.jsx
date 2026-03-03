import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePanels } from './GlobalTopIcons';
import { useNotificationsBadge } from '../home/NotificationsPanel';

/**
 * Header globale trasparente — hamburger a sinistra, busta + campanella a destra.
 * Busta = naviga a pagina Messaggi (o torna indietro se già lì). Campanella = toggle pannello notifiche.
 */
export default function GlobalHeader({ userEmail, userRegime, onMenuClick }) {
  const { toggleNotif } = usePanels();
  const { totalBadge, unreadMessageCount } = useNotificationsBadge(userEmail, userRegime);
  const navigate = useNavigate();
  const location = useLocation();

  const isOnMessaggi = location.pathname.includes('/Messaggi');

  const handleMailClick = () => {
    if (isOnMessaggi) {
      // Se siamo già su Messaggi, torna alla Home
      navigate(createPageUrl('Home'));
    } else {
      navigate(createPageUrl('Messaggi'));
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[70]">
      <div className="max-w-md mx-auto flex items-center justify-between px-3 pt-4 pb-2">
        {/* Sinistra: hamburger */}
        <button
          onClick={onMenuClick}
          className="w-12 h-12 flex items-center justify-center rounded-xl active:bg-white/10 transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <Menu className="w-6 h-6 text-slate-400" />
        </button>

        {/* Destra: busta + campanella */}
        <div className="flex items-center gap-2 mr-2">
          {/* Busta messaggi — naviga a pagina Messaggi */}
          <button
            onClick={handleMailClick}
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
      </div>
    </div>
  );
}