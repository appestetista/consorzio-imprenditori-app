import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

/**
 * Componente riutilizzabile che protegge le pagine admin.
 * Usa useAuth() per ottenere l'utente già normalizzato da AuthContext.
 * Se non autorizzato, redirect a Home con toast di errore.
 * 
 * Props:
 * - children: (user) => ReactNode — riceve l'utente autenticato
 */
export default function AdminGuard({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user || user.role !== 'admin') {
      toast.error('Accesso non autorizzato');
      navigate(createPageUrl('Home'));
    }
  }, [user, isLoadingAuth, navigate]);

  if (isLoadingAuth || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg, #0a0f1a)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return typeof children === 'function' ? children(user) : children;
}