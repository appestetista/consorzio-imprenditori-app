import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const EMPTY_STATE = {
  active: false,
  role: null,
  targetId: null,
  targetEmail: null,
  targetName: null,
  adminEmail: null,
};

const clearStorage = () => sessionStorage.setItem('impersonation_state', JSON.stringify(EMPTY_STATE));

const ImpersonationContext = createContext();

export function ImpersonationProvider({ children }) {
  const [impersonation, setImpersonation] = useState(() => {
    const saved = sessionStorage.getItem('impersonation_state');
    if (saved) {
      try { return JSON.parse(saved); } catch { return { ...EMPTY_STATE }; }
    }
    return { ...EMPTY_STATE };
  });
  const [userRole, setUserRole] = useState(null);

  // Al mount: se c'è stato attivo in sessionStorage, verifica server-side che l'utente sia ancora admin
  useEffect(() => {
    if (!impersonation.active) return;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me?.role !== 'admin' || me.email !== impersonation.adminEmail) {
          console.warn('[ImpersonationContext] Admin verification failed at mount — clearing impersonation');
          setImpersonation({ ...EMPTY_STATE });
          clearStorage();
        }
      } catch {
        console.warn('[ImpersonationContext] Auth check failed — clearing impersonation');
        setImpersonation({ ...EMPTY_STATE });
        clearStorage();
      }
    })();
  }, []); // solo al mount

  // Salva impersonation in sessionStorage quando cambia
  useEffect(() => {
    sessionStorage.setItem('impersonation_state', JSON.stringify(impersonation));
  }, [impersonation]);

  const startImpersonation = async (role, targetId, targetEmail, targetName, targetUserData = null) => {
    // Verifica server-side che l'utente corrente sia admin prima di attivare l'impersonation
    try {
      const me = await base44.auth.me();
      if (me?.role !== 'admin') {
        console.error('[ImpersonationContext] startImpersonation DENIED — user is not admin:', me?.email);
        return;
      }
      const newState = {
        active: true,
        role,
        targetId,
        targetEmail,
        targetName,
        previewUserId: targetId,
        targetUserData,
        adminEmail: me.email,
      };
      setImpersonation(newState);
      sessionStorage.setItem('impersonation_state', JSON.stringify(newState));
    } catch (e) {
      console.error('[ImpersonationContext] startImpersonation failed — auth error:', e?.message);
    }
  };

  const stopImpersonation = () => {
    setImpersonation({ ...EMPTY_STATE });
    clearStorage();
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