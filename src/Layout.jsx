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
import { ThemeProvider } from './components/context/ThemeContext';

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
    <ThemeProvider>
    <ImpersonationProvider>
      <VideoVisitProvider>
        <PanelProvider>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

          /* ======= TEMA NOTTE (default) ======= */
          body.theme-dark {
            --app-bg: #0a0f1a;
            --app-bg-secondary: #0f172a;
            --app-bg-card: #1e293b;
            --app-bg-card-hover: #334155;
            --app-bg-input: rgba(30, 41, 59, 0.8);
            --app-bg-overlay: rgba(0, 0, 0, 0.5);
            --app-border: rgba(71, 85, 105, 0.4);
            --app-border-accent: rgba(212, 175, 55, 0.2);
            --app-text-primary: #ffffff;
            --app-text-secondary: #94a3b8;
            --app-text-muted: #64748b;
            --app-text-inverse: #0f172a;
            --app-accent: #d4af37;
            --app-accent-glow: rgba(212, 175, 55, 0.4);
            --app-accent-secondary: #84ff00;
            --app-gradient-bottom: linear-gradient(to top, #0a0f1a 75%, transparent 100%);
            --app-gradient-card: linear-gradient(160deg, #1a1a1a 0%, #001d3b 50%, #001530 100%);
            --app-gradient-border-inactive: linear-gradient(145deg, #c0c0c0 0%, #a8a8a8 25%, #808080 50%, #c0c0c0 75%, #e8e8e8 100%);
            --app-gradient-border-active: linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%);
            --app-shadow-card: 0 6px 20px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3);
            --app-btn-disabled-bg: #334155;
            --app-lime: #84ff00;
            --app-lime-alpha: rgba(132, 255, 0, 0.25);
          }

          /* ======= TEMA GIORNO ======= */
          body.theme-light {
            --app-bg: #f0f2f5;
            --app-bg-secondary: #e2e8f0;
            --app-bg-card: #ffffff;
            --app-bg-card-hover: #f1f5f9;
            --app-bg-input: rgba(255, 255, 255, 0.9);
            --app-bg-overlay: rgba(0, 0, 0, 0.25);
            --app-border: rgba(203, 213, 225, 0.8);
            --app-border-accent: rgba(161, 128, 30, 0.3);
            --app-text-primary: #1e293b;
            --app-text-secondary: #475569;
            --app-text-muted: #94a3b8;
            --app-text-inverse: #ffffff;
            --app-accent: #a1801e;
            --app-accent-glow: rgba(161, 128, 30, 0.25);
            --app-accent-secondary: #16a34a;
            --app-gradient-bottom: linear-gradient(to top, #f0f2f5 75%, transparent 100%);
            --app-gradient-card: linear-gradient(160deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
            --app-gradient-border-inactive: linear-gradient(145deg, #cbd5e1 0%, #94a3b8 25%, #64748b 50%, #cbd5e1 75%, #e2e8f0 100%);
            --app-gradient-border-active: linear-gradient(145deg, #a1801e 0%, #8b6914 25%, #6b5a30 50%, #a1801e 75%, #d4c477 100%);
            --app-shadow-card: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
            --app-btn-disabled-bg: #cbd5e1;
            --app-lime: #16a34a;
            --app-lime-alpha: rgba(22, 163, 74, 0.2);
          }

          body.theme-light {
            background-color: #f0f2f5 !important;
            color: #1e293b;
          }
          body.theme-dark {
            background-color: #0a0f1a !important;
            color: #ffffff;
          }
          
          html, body {
            background-color: #0a0f1a !important;
            overscroll-behavior: none;
          }

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
        {currentPageName !== 'AdminPanel' && <GlobalSearchBar currentPageName={currentPageName} />}
        {currentPageName !== 'AdminPanel' && <ToolsDrawer />}
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
    </ThemeProvider>
  );
}