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