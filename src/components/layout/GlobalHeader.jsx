import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePanels } from './GlobalTopIcons';
import { useNotificationsBadge } from '../home/NotificationsPanel';

/**
 * Header globale trasparente — hamburger a sinistra, busta + campanella a destra.
 * Renderizzato dal Layout, NON dalle singole pagine.
 */
export default function GlobalHeader({ userEmail, userRegime, onMenuClick }) {
  const { toggleNotif } = usePanels();
  const navigate = useNavigate();
  const { totalBadge, unreadMessageCount } = useNotificationsBadge(userEmail, userRegime);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 pt-3 pb-2 pointer-events-auto">
        {/* Sinistra: hamburger */}
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
        >
          <Menu className="w-6 h-6 text-slate-400" />
        </button>

        {/* Destra: busta + campanella */}
        <div className="flex items-center gap-1">
          {/* Busta messaggi — naviga alla pagina Messaggi */}
          <button
            onClick={() => navigate(createPageUrl('Messaggi'))}
            className="relative w-10 h-10 flex items-center justify-center flex-shrink-0"
          >
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

          {/* Campanella notifiche */}
          <button
            onClick={toggleNotif}
            className="relative w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl hover:bg-white/10 transition-colors"
          >
            <Bell className="w-6 h-6 text-slate-400" />
            {totalBadge > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}