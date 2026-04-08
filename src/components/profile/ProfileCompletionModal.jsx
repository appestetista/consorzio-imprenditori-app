import { useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { useImpersonation } from '../admin/ImpersonationContext';

const REQUIRED_FIELDS_USER = ['company_name', 'company_email', 'referente', 'cellulare_referente', 'referente_email', 'region', 'specializzazione'];
const REQUIRED_FIELDS_CONSULENTE = []; // I consulenti hanno il loro profilo studio separato

export default function ProfileCompletionModal({ user }) {
  const { appMode } = useImpersonation();
  
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') return;
    
    // Non fare redirect durante l'impersonificazione
    if (appMode === 'user-preview') return;
    
    // I consulenti non hanno campi obbligatori qui - hanno il Profilo Studio
    if (user.user_type === 'consulente') return;

    // Verifica campi mancanti solo per utenti normali
    const hasMissingFields = REQUIRED_FIELDS_USER.some(field => {
      const value = user[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    // Se mancano campi, redirect a MyProfile (solo se siamo GIÀ sulla Home)
    // Evita loop infiniti: non fare redirect se siamo già su MyProfile
    const currentPath = window.location.pathname;
    const isOnMyProfile = currentPath.includes('MyProfile');
    
    if (hasMissingFields && !isOnMyProfile) {
      console.log('[ProfileCompletionModal] Campi mancanti, redirect a MyProfile');
      window.location.href = createPageUrl('MyProfile');
    }
  }, [user, appMode]);

  return null; // Questo componente non renderizza nulla, fa solo il redirect
}