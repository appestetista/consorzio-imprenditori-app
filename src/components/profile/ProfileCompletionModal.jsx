import { useEffect } from 'react';
import { createPageUrl } from '@/utils';

const REQUIRED_FIELDS = ['company_name', 'company_email', 'referente', 'cellulare_referente', 'referente_email', 'region', 'specializzazione'];

export default function ProfileCompletionModal({ user }) {
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') return;

    // Verifica campi mancanti
    const hasMissingFields = REQUIRED_FIELDS.some(field => {
      const value = user[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    // Se mancano campi, redirect a MyProfile
    if (hasMissingFields) {
      console.log('[ProfileCompletionModal] Campi mancanti, redirect a MyProfile');
      window.location.href = createPageUrl('MyProfile');
    }
  }, [user]);

  return null; // Questo componente non renderizza nulla, fa solo il redirect
}