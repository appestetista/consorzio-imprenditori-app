import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

/**
 * Componente riutilizzabile che protegge le pagine admin.
 * Controlla che l'utente sia autenticato e abbia role === 'admin'.
 * Se non autorizzato, redirect a Home con toast di errore.
 * 
 * Props:
 * - children: (user) => ReactNode — riceve l'utente autenticato
 */
export default function AdminGuard({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          toast.error('Accesso non autorizzato');
          navigate(createPageUrl('Home'));
          return;
        }
        setUser(currentUser);
        setIsAuthorized(true);
      } catch (e) {
        console.error(e);
        toast.error('Accesso non autorizzato');
        navigate(createPageUrl('Home'));
      }
    };
    checkAuth();
  }, [navigate]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg, #0a0f1a)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return typeof children === 'function' ? children(user) : children;
}