import React from 'react';
import { useImpersonation } from './ImpersonationContext';
import { Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ImpersonationBanner() {
  const { impersonation, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!impersonation.active) return null;

  const handleStop = () => {
    stopImpersonation();
    navigate(createPageUrl('AdminPanel'));
  };

  return (
    <div className="sticky top-0 z-[9999] bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span>
          Stai visualizzando come: <strong>{impersonation.targetName || impersonation.targetEmail}</strong>
          {impersonation.role === 'consulente' && ' (Consulente)'}
        </span>
      </div>
      <button
        onClick={handleStop}
        className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 rounded-lg px-3 py-1 transition-colors font-semibold"
      >
        <X className="w-4 h-4" />
        Torna Admin
      </button>
    </div>
  );
}