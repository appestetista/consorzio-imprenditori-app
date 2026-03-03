import React, { useEffect, useState } from 'react';
import { ImpersonationProvider } from './components/admin/ImpersonationContext';
import { VideoVisitProvider } from './components/context/VideoVisitContext';
import { PanelProvider } from './components/layout/GlobalTopIcons';
import GlobalPanels from './components/layout/GlobalPanels';
import GlobalHeader from './components/layout/GlobalHeader';
import { base44 } from '@/api/base44Client';
import { Toaster } from 'sonner';
import CalendarSideTab from './components/calendario/CalendarSideTab';
import VantaggiSideTab from './components/vantaggi/VantaggiSideTab';
import GlobalSearchBar from './components/layout/GlobalSearchBar';
import ChatSidebar from './components/home/ChatSidebar';
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
    // Naviga a Home con l'ID conversazione per caricarla
    navigate(createPageUrl('Home') + '?loadConv=' + conv.id);
  };

  const handleNewChat = () => {
    setChatSidebarOpen(false);
    navigate(createPageUrl('Home') + '?newChat=1');
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
        {/* Nessuno spacer necessario: l'header scorre con la pagina */}
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