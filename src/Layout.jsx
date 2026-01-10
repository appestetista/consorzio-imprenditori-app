import React from 'react';
import { ImpersonationProvider } from './components/admin/ImpersonationContext';

export default function Layout({ children, currentPageName }) {
  return (
    <ImpersonationProvider>
      {children}
    </ImpersonationProvider>
  );
}