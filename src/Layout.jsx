import React, { useEffect, useState } from 'react';
import { ImpersonationProvider } from './components/admin/ImpersonationContext';
import { VideoVisitProvider } from './components/context/VideoVisitContext';
import { Toaster } from 'sonner';
import CalendarSideTab from './components/calendario/CalendarSideTab';

export default function Layout({ children, currentPageName }) {
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    console.log('[LAYOUT] Current page:', currentPageName);
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
        <CalendarSideTab 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
        <Toaster richColors position="top-center" />
      </VideoVisitProvider>
    </ImpersonationProvider>
  );
}