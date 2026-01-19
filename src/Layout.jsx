import React, { useEffect } from 'react';
import { ImpersonationProvider } from '@/components/admin/ImpersonationContext';

export default function Layout({ children, currentPageName }) {
  useEffect(() => {
    console.log('[LAYOUT] Current page:', currentPageName);
  }, [currentPageName]);

  return (
    <ImpersonationProvider>
      {children}
    </ImpersonationProvider>
  );
}