import React, { useEffect, useState } from 'react';
import { ImpersonationProvider } from './components/admin/ImpersonationContext';
import { VideoVisitProvider } from './components/context/VideoVisitContext';
import { Toaster } from 'sonner';
import CalendarSideTab from './components/calendario/CalendarSideTab';
import VantaggiSideTab from './components/vantaggi/VantaggiSideTab';
import GlobalSearchBar from './components/layout/GlobalSearchBar';

export default function Layout({ children, currentPageName }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [forceOpenCalendar, setForceOpenCalendar] = useState(false);

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
        {children}
        {currentPageName === 'Home' && <GlobalSearchBar currentPageName={currentPageName} />}
        <VantaggiSideTab />
        <CalendarSideTab 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          forceOpen={forceOpenCalendar}
          onForceOpenConsumed={() => setForceOpenCalendar(false)}
        />
        <Toaster richColors position="top-center" />
      </VideoVisitProvider>
    </ImpersonationProvider>
  );
}