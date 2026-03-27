import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, LogOut, Settings, User, Eye, XCircle, Mail, Phone, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useImpersonation } from '../admin/ImpersonationContext';
import ImpersonationDialog from '../admin/ImpersonationDialog';
import { normalizeUser, isUserConsultant } from '../utils/normalizeUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../hooks/useNotificationSound';
import GlobalTopIcons from './GlobalTopIcons';

export default function Header({ user }) {
  const [impersonationDialogOpen, setImpersonationDialogOpen] = useState(false);
  const { impersonation, startImpersonation, stopImpersonation } = useImpersonation();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const prevNotificationCountRef = useRef(0);
  
  // Normalizza l'utente per avere sempre la stessa struttura dati
  const normalizedUser = useMemo(() => normalizeUser(user), [user]);
  const isAdmin = normalizedUser?.role === 'admin';
  const effectiveEmail = impersonation.active ? impersonation.targetEmail : normalizedUser?.email;

  // Fetch notifiche non lette (per suono)
  const { data: notifications = [] } = useQuery({
    queryKey: ['header-notifications', effectiveEmail],
    queryFn: () => base44.entities.Notification.filter({ 
      user_email: effectiveEmail, 
      is_read: false 
    }),
    enabled: !!effectiveEmail,
    refetchInterval: 10000,
  });

  const unreadCount = notifications.length;
  const userRegime = normalizedUser?.regime_fiscale || null;

  // Suona quando arriva una nuova notifica + aggiorna badge PWA
  useEffect(() => {
    if (unreadCount > prevNotificationCountRef.current && prevNotificationCountRef.current > 0) {
      playSound?.();
    }
    prevNotificationCountRef.current = unreadCount;

    // Aggiorna il badge sull'icona della PWA (se supportato)
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [unreadCount, playSound]);

  // Subscribe real-time alle notifiche
  useEffect(() => {
    if (!effectiveEmail) return;
    
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === effectiveEmail) {
        playSound?.();
        queryClient.invalidateQueries({ queryKey: ['header-notifications', effectiveEmail] });
      }
      if (event.type === 'update' || event.type === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['header-notifications', effectiveEmail] });
      }
    });

    return unsubscribe;
  }, [effectiveEmail, queryClient, playSound]);
  
  const handleLogout = () => {
    base44.auth.logout();
  };

  const getHeaderInfo = () => {
    let title = '';
    let subtitle = '';

    if (impersonation.active) {
      // Impersonificazione attiva: mostra nome azienda dell'utente impersonificato
      title = impersonation.targetName || 'Utente';
      // Il sottotitolo dipende dal ruolo dell'utente impersonificato
      if (impersonation.role === 'consulente') {
        subtitle = 'Consulente';
      } else {
        subtitle = 'Membro del Consorzio';
      }
    } else {
      // Nessuna impersonificazione
      if (isAdmin) {
        title = 'Admin Consorzio';
        subtitle = 'Amministratore';
      } else if (isUserConsultant(normalizedUser)) {
        title = normalizedUser?.company_name || 'Consulente';
        subtitle = 'Consulente';
      } else {
        title = normalizedUser?.company_name || 'Membro';
        subtitle = 'Membro del Consorzio';
      }
    }

    return { title, subtitle };
  };

  const { title, subtitle } = getHeaderInfo();

  // Logo dell'utente: se ha un logo aziendale usa quello, altrimenti il logo del consorzio
  const DEFAULT_LOGO = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop";
  
  const getUserLogo = () => {
    if (impersonation.active) {
      // In impersonazione: normalizza i dati dell'utente impersonificato
      const impersonatedUser = normalizeUser(impersonation.targetUserData);
      return impersonatedUser?.logo_url || DEFAULT_LOGO;
    }
    // Utente normale o consulente: usa il logo normalizzato
    return normalizedUser?.logo_url || DEFAULT_LOGO;
  };

  return (
    <>
      <header className="py-4 px-4 flex items-center justify-between sticky top-0 z-40 border-b border-lime-400/30" style={{ backgroundColor: '#061018' }}>
        <div className="flex items-center gap-3">
          <img 
            src={getUserLogo()} 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h1 className="text-[#d4af37] font-bold text-lg leading-tight">{title}</h1>
            <p className="text-[#d4af37] text-sm">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {impersonation.active && (
            <button
              onClick={() => {
                stopImpersonation();
                window.location.href = createPageUrl('Home');
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
          
          {/* Icone messaggi + notifiche (componente globale) */}
          <GlobalTopIcons userEmail={effectiveEmail} userRegime={userRegime} />
        </div>
      </header>

      {/* Dialog Impersonation */}
      <ImpersonationDialog
        open={impersonationDialogOpen}
        onClose={() => setImpersonationDialogOpen(false)}
        onStart={(role, targetId, targetEmail, targetName, targetUserData) => {
                    startImpersonation(role, targetId, targetEmail, targetName, targetUserData);
                    setTimeout(() => {
                      window.location.href = createPageUrl('Home');
                    }, 100);
                  }}
      />
    </>
  );
}