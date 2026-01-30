import React, { useEffect } from 'react';
import { ImpersonationProvider } from './components/admin/ImpersonationContext';
import { VideoVisitProvider } from './components/context/VideoVisitContext';
import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  useEffect(() => {
    console.log('[LAYOUT] Current page:', currentPageName);
  }, [currentPageName]);

  return (
    <ImpersonationProvider>
      <VideoVisitProvider>
        {children}
        <Toaster richColors position="top-center" />
      </VideoVisitProvider>
    </ImpersonationProvider>
  );
}