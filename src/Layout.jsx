import React, { useEffect, useState } from 'react';
import { ImpersonationProvider } from './components/admin/ImpersonationContext';
import { VideoVisitProvider } from './components/context/VideoVisitContext';
import { PanelProvider } from './components/layout/GlobalTopIcons';
import GlobalPanels from './components/layout/GlobalPanels';
import GlobalHeader from './components/layout/GlobalHeader';
import ImpersonationBanner from './components/admin/ImpersonationBanner';
import { base44 } from '@/api/base44Client';
import { Toaster } from 'sonner';
import CalendarSideTab from './components/calendario/CalendarSideTab';
import VantaggiSideTab from './components/vantaggi/VantaggiSideTab';
import GlobalSearchBar from './components/layout/GlobalSearchBar';
import ChatSidebar from './components/home/ChatSidebar';
import ToolsDrawer from './components/home/ToolsDrawer';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function Layout({ children, currentPageName }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [forceOpenCalendar, setForceOpenCalendar] = useState(false);
  const [layoutUser, setLayoutUser] = useState(null);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Carica utente una sola volta per i pannelli globali
  useEffect(() => {
    base44.auth.me().then(u => setLayoutUser(u)).catch(() => {});
  }, []);

  // Ascolta evento globale per aprire la sidebar chat
  useEffect(() => {
    const handleToggleChatSidebar = () => setChatSidebarOpen(prev => !prev);
    window.addEventListener('toggle-chat-sidebar', handleToggleChatSidebar);
    return () => window.removeEventListener('toggle-chat-sidebar', handleToggleChatSidebar);
  }, []);

  const handleSelectConversation = (conv) => {
    setChatSidebarOpen(false);
    // Se siamo già su Home, emetti evento diretto (evita reload)
    if (currentPageName === 'Home') {
      window.dispatchEvent(new CustomEvent('load-conversation', { detail: conv }));
    } else {
      navigate(createPageUrl('Home') + '?loadConv=' + conv.id);
    }
  };

  const handleNewChat = () => {
    setChatSidebarOpen(false);
    if (currentPageName === 'Home') {
      window.dispatchEvent(new CustomEvent('new-chat'));
    } else {
      navigate(createPageUrl('Home') + '?newChat=1');
    }
  };

  useEffect(() => {
    console.log('[LAYOUT] Current page:', currentPageName);
  }, [currentPageName]);

  // Controlla se c'è il parametro openCalendar=1 nell'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openCalendar') === '1') {
      setForceOpenCalendar(true);
      // Rimuovi il parametro dall'URL senza reload
      const url = new URL(window.location);
      url.searchParams.delete('openCalendar');
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentPageName]);

  return (
    <ImpersonationProvider>
      <VideoVisitProvider>
        <PanelProvider>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          *, *::before, *::after {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          
          body {
            font-size: 16px;
            line-height: 1.6;
            letter-spacing: 0.01em;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          p, span, li, td, th, label, input, textarea, select, button {
            font-size: inherit;
            line-height: 1.6;
          }

          h1 { font-size: 32px; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; }
          h2 { font-size: 26px; font-weight: 600; line-height: 1.35; letter-spacing: -0.005em; }
          h3 { font-size: 22px; font-weight: 600; line-height: 1.4; }
          h4 { font-size: 18px; font-weight: 500; line-height: 1.45; }
          
          .text-xs  { font-size: 12px; line-height: 1.5; }
          .text-sm  { font-size: 14px; line-height: 1.55; }
          .text-base { font-size: 16px; line-height: 1.6; }
          .text-lg  { font-size: 18px; line-height: 1.5; }
          .text-xl  { font-size: 20px; line-height: 1.4; }
          .text-2xl { font-size: 24px; line-height: 1.35; }
          .text-3xl { font-size: 30px; line-height: 1.3; }

          .back-arrow-tap {
            -webkit-tap-highlight-color: transparent;
            position: relative;
            overflow: visible;
          }
          .back-arrow-tap::after {
            content: '';
            position: absolute;
            inset: -6px;
            border-radius: 9999px;
            background: currentColor;
            opacity: 0;
            transition: opacity 0.2s ease-out;
            pointer-events: none;
          }
          .back-arrow-tap:active::after {
            opacity: 0.2;
            transition: opacity 0s;
          }
        `}</style>
        {/* Imposta --page-bg in base alla pagina corrente per il gradient dell'header */}
        <style>{`:root { --page-bg: ${
          currentPageName === 'Home' ? '#0a0f1a' :
          currentPageName === 'Esplora' || currentPageName === 'MyProfile' ? '#001d3b' :
          '#0f172a'
        }; }`}</style>
        {/* Header globale trasparente — hamburger + busta + campanella */}
        {currentPageName !== 'AdminPanel' && (
          <GlobalHeader
            userEmail={layoutUser?.email}
            userRegime={layoutUser?.regime_fiscale}
            onMenuClick={() => { window.location.href = createPageUrl('MyProfile'); }}
            currentPageName={currentPageName}
          />
        )}
        {/* ChatSidebar globale — storico conversazioni da tutte le pagine */}
        <ChatSidebar
          open={chatSidebarOpen}
          onClose={() => setChatSidebarOpen(false)}
          userEmail={layoutUser?.email}
          activeConversationId={null}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
        />
        <ImpersonationBanner />
        {children}
        {currentPageName === 'Home' && <GlobalSearchBar currentPageName={currentPageName} />}
        <VantaggiSideTab />
        <CalendarSideTab 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          forceOpen={forceOpenCalendar}
          onForceOpenConsumed={() => setForceOpenCalendar(false)}
        />
        <GlobalPanels userEmail={layoutUser?.email} userRegime={layoutUser?.regime_fiscale} />
        <Toaster richColors position="top-center" />
        </PanelProvider>
      </VideoVisitProvider>
    </ImpersonationProvider>
  );
}