import React, { useEffect } from 'react';
import { ImpersonationProvider } from './components/admin/ImpersonationContext';
import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  useEffect(() => {
    console.log('[LAYOUT] Current page:', currentPageName);
  }, [currentPageName]);

  return (
    <ImpersonationProvider>
      {children}
      <Toaster richColors position="top-center" />
    </ImpersonationProvider>
  );
}