import React, { createContext, useContext, useState } from 'react';

const ImpersonationContext = createContext();

export function ImpersonationProvider({ children }) {
  const [impersonation, setImpersonation] = useState({
    active: false,
    role: null, // 'user' | 'consulente'
    targetId: null,
    targetEmail: null,
    targetName: null
  });

  const startImpersonation = (role, targetId, targetEmail, targetName) => {
    setImpersonation({
      active: true,
      role,
      targetId,
      targetEmail,
      targetName
    });
  };

  const stopImpersonation = () => {
    setImpersonation({
      active: false,
      role: null,
      targetId: null,
      targetEmail: null,
      targetName: null
    });
  };

  return (
    <ImpersonationContext.Provider value={{ impersonation, startImpersonation, stopImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}