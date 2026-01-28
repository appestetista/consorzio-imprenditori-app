import React, { createContext, useContext, useState, useEffect } from 'react';

const ImpersonationContext = createContext();

export function ImpersonationProvider({ children }) {
  const [impersonation, setImpersonation] = useState(() => {
    // Carica dallo sessionStorage se esiste
    const saved = sessionStorage.getItem('impersonation_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          active: false,
          role: null,
          targetId: null,
          targetEmail: null,
          targetName: null
        };
      }
    }
    return {
      active: false,
      role: null,
      targetId: null,
      targetEmail: null,
      targetName: null
    };
  });
  const [userRole, setUserRole] = useState(null);

  // Salva impersonation in sessionStorage quando cambia
  useEffect(() => {
    sessionStorage.setItem('impersonation_state', JSON.stringify(impersonation));
  }, [impersonation]);

  const startImpersonation = (role, targetId, targetEmail, targetName, targetUserData = null) => {
    console.log('[ImpersonationContext] startImpersonation called with:', {
      role,
      targetId,
      targetEmail,
      targetName,
      targetUserData
    });

    const newState = {
      active: true,
      role,
      targetId,
      targetEmail,
      targetName,
      previewUserId: targetId,
      targetUserData // include full user profile data
    };
    setImpersonation(newState);
    sessionStorage.setItem('impersonation_state', JSON.stringify(newState));
  };

  const stopImpersonation = () => {
    const newState = {
      active: false,
      role: null,
      targetId: null,
      targetEmail: null,
      targetName: null,
      previewUserId: null
    };
    setImpersonation(newState);
    sessionStorage.setItem('impersonation_state', JSON.stringify(newState));
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

  const appMode = getAppMode();

  return (
      <ImpersonationContext.Provider value={{ 
        impersonation, 
        startImpersonation, 
        stopImpersonation,
        setCurrentUserRole,
        appMode,
        getAppMode
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