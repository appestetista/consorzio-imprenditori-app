import React from 'react';
import { Menu, Bell, ChevronDown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePanels } from './GlobalTopIcons';
import { useNotificationsBadge } from '../home/NotificationsPanel';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

/**
 * Header globale trasparente — hamburger a sinistra, busta + campanella a destra.
 * Su Home: hamburger apre la sidebar chat. Su altre pagine: va a MyProfile.
 */
export default function GlobalHeader({ userEmail, userRegime, onMenuClick, onHamburgerClick, currentPageName }) {
  const { toggleNotif, openChatSidebar, headerHidden, notifPanelOpen } = usePanels();
  const { totalBadge, unreadMessageCount } = useNotificationsBadge(userEmail, userRegime);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleHamburger = () => {
    // Sempre: apri la sidebar chat con lo storico conversazioni
    openChatSidebar();
  };

  // Nascondi completamente l'header quando headerHidden è true
  if (headerHidden) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[70] pointer-events-none" style={{ background: `linear-gradient(to bottom, var(--app-bg, #0f172a) 60%, transparent 100%)` }}>
      <div className="max-w-md mx-auto flex items-center justify-between px-3 pt-4 pb-3 pointer-events-auto">
        {/* Sinistra: hamburger + tema + freccia indietro */}
        <div className="flex items-center gap-0">
          {/* Hamburger — apre sidebar chat */}
          <button
            onPointerUp={handleHamburger}
            className="w-11 h-11 flex items-center justify-center rounded-xl active:bg-white/10 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <Menu className="w-7 h-7" style={{ color: isDark ? '#ffffff' : '#000000' }} />
          </button>
          {/* Tema sole/luna */}
          <ThemeToggle />
          {!['Home', 'Esplora', 'MyProfile', 'AdminPanel'].includes(currentPageName) && (
            <button
              onPointerUp={() => navigate(-1)}
              className="w-11 h-11 flex items-center justify-center rounded-xl active:bg-white/10 transition-colors"
              style={{ touchAction: 'manipulation' }}
            >
              <ArrowLeft className="w-7 h-7" style={{ color: 'var(--app-accent)' }} />
            </button>
          )}
        </div>

        {/* Destra: busta + campanella */}
        <div className="flex items-center gap-1 mr-2">
          {/* Busta messaggi — naviga a pagina Messaggi */}
          <button
            onPointerUp={(e) => { e.stopPropagation(); navigate(createPageUrl('Messaggi')); }}
            className="relative flex items-center gap-0.5 h-12 px-1 rounded-xl active:bg-white/10 transition-colors"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/cd5e7b92b_Immagine_2026-02-03_182832-removebg-preview.png"
              alt="Messaggi"
              className="w-8 h-8 object-contain pointer-events-none select-none"
              draggable={false}
            />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[11px] rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center font-bold pointer-events-none shadow-lg">
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </span>
            )}
          </button>

          {/* Campanella notifiche — toggle pannello */}
          <button
            onPointerUp={(e) => { e.stopPropagation(); toggleNotif(); }}
            className="relative w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-xl active:bg-white/10 transition-colors"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <Bell className="w-7 h-7 pointer-events-none" style={{ color: isDark ? '#94a3b8' : '#000000' }} />
            {totalBadge > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold pointer-events-none">
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}