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
  const [userRole, setUserRole] = useState(null);

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

  const setCurrentUserRole = (role) => {
    setUserRole(role);
  };

  const getAppMode = () => {
    if (impersonation.active && impersonation.role === 'user') {
      return 'user-preview';
    }
    return userRole === 'admin' ? 'admin' : 'user';
  };

  return (
    <ImpersonationContext.Provider value={{ 
      impersonation, 
      startImpersonation, 
      stopImpersonation,
      setCurrentUserRole,
      appMode: getAppMode()
    }}>
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