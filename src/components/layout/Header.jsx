import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Menu, X, LogOut, Settings, User, Eye, XCircle, Bell, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useImpersonation } from '../admin/ImpersonationContext';
import ImpersonationDialog from '../admin/ImpersonationDialog';
import { normalizeUser, isUserConsultant } from '../utils/normalizeUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../hooks/useNotificationSound';

export default function Header({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [impersonationDialogOpen, setImpersonationDialogOpen] = useState(false);
  const { impersonation, startImpersonation, stopImpersonation } = useImpersonation();
  const queryClient = useQueryClient();
  const { playSound } = useNotificationSound();
  const prevNotificationCountRef = useRef(0);
  
  // Normalizza l'utente per avere sempre la stessa struttura dati
  const normalizedUser = useMemo(() => normalizeUser(user), [user]);
  const isAdmin = normalizedUser?.role === 'admin';
  const effectiveEmail = impersonation.active ? impersonation.targetEmail : normalizedUser?.email;

  // Fetch notifiche non lette
  const { data: notifications = [] } = useQuery({
    queryKey: ['header-notifications', effectiveEmail],
    queryFn: () => base44.entities.Notification.filter({ 
      user_email: effectiveEmail, 
      is_read: false 
    }),
    enabled: !!effectiveEmail,
    refetchInterval: 10000, // Ogni 10 secondi
  });

  const unreadCount = notifications.length;

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
      return impersonatedUser?.company_logo || DEFAULT_LOGO;
    }
    // Utente normale o consulente: usa il logo normalizzato
    return normalizedUser?.company_logo || DEFAULT_LOGO;
  };

  return (
    <>
      <header className="bg-slate-900 py-4 px-4 flex items-center justify-between sticky top-0 z-40 border-b border-lime-400/30">
        <div className="flex items-center gap-3">
          <img 
            src={getUserLogo()} 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h1 className="text-lime-400 font-bold text-lg leading-tight">{title}</h1>
            <p className="text-lime-400 text-sm">{subtitle}</p>
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
          
          {/* Icona Messaggi */}
          <Link
            to={createPageUrl('Messaggi')}
            className="relative bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Mail className="w-5 h-5 text-lime-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="bg-lime-400 p-2 rounded-lg"
          >
            {menuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
          </button>
        </div>
      </header>

      {/* Menu Drawer */}
      <div className={cn(
        "fixed inset-0 z-50 transition-all duration-300",
        menuOpen ? "visible" : "invisible"
      )}>
        <div 
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMenuOpen(false)}
        />
        <div className={cn(
          "absolute right-0 top-0 h-full w-72 bg-slate-900 border-l border-lime-400/30 p-6 transition-transform duration-300",
          menuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex justify-end mb-6">
            <button onClick={() => setMenuOpen(false)}>
              <X className="w-6 h-6 text-lime-400" />
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-lime-400 font-semibold mb-4">
              {normalizedUser?.company_name || normalizedUser?.full_name || 'Utente'}
            </p>
            
            {/* Pulsante Torna ad Admin - Solo se impersonation attiva */}
            {impersonation.active && (
              <Link
                to={createPageUrl('Home')}
                onClick={() => {
                  stopImpersonation();
                  setMenuOpen(false);
                }}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 transition-colors w-full mb-3"
              >
                <XCircle className="w-5 h-5" />
                <span>Torna ad Admin</span>
              </Link>
            )}
            
            {/* Voci menu solo per Admin (non consulenti, non in impersonation) */}
            {isAdmin && !impersonation.active && (
              <>
                <Link
                  to={createPageUrl('AdminPanel')}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-5 h-5 text-lime-400" />
                  <span>Pannello Admin</span>
                </Link>

                {/* Pulsante Visualizza Come - Solo per Admin */}
                <button
                  onClick={() => {
                    setImpersonationDialogOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors w-full"
                >
                  <Eye className="w-5 h-5 text-lime-400" />
                  <span>Visualizza come...</span>
                </button>
              </>
            )}

            {/* Voce menu Il Mio Profilo - visibile per utenti, consulenti e quando in impersonation */}
            {(normalizedUser?.role === 'user' || isUserConsultant(normalizedUser) || impersonation.active) && (
              <Link
                to={createPageUrl('MyProfile')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <User className="w-5 h-5 text-lime-400" />
                <span>Il Mio Profilo</span>
              </Link>
            )}

            {/* Contatta Consorzio - nel menu */}
            <Link
              to={createPageUrl('ContattaConsorzio')}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Phone className="w-5 h-5 text-lime-400" />
              <span>Contatta Consorzio</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors w-full text-left"
            >
              <LogOut className="w-5 h-5 text-red-400" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dialog Impersonation */}
      <ImpersonationDialog
        open={impersonationDialogOpen}
        onClose={() => setImpersonationDialogOpen(false)}
        onStart={(role, targetId, targetEmail, targetName, targetUserData) => {
                    console.log('[Header] onStart callback triggered:', {
                      role,
                      targetId,
                      targetEmail,
                      targetName,
                      targetUserData
                    });
                    startImpersonation(role, targetId, targetEmail, targetName, targetUserData);
                    console.log('[Header] About to redirect to Home');
                    setTimeout(() => {
                      window.location.href = createPageUrl('Home');
                    }, 100);
                  }}
      />
    </>
  );
}