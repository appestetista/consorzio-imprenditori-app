import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { isNormativaAggiornata, ANNO_NORMATIVA } from './motoreCalcoloFiscale';

export default function NormativaWarningBanner() {
  if (isNormativaAggiornata()) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-4"
      style={{ backgroundColor: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed" style={{ color: 'var(--app-text-primary)' }}>
        <strong>Attenzione:</strong> i calcoli si basano sulla normativa <strong>{ANNO_NORMATIVA}</strong>.
        Contatta il consorzio per verificare eventuali aggiornamenti.
      </p>
    </div>
  );
}