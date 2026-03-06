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
    <div className="fixed left-2 right-2 z-[9999] flex items-center justify-between bg-amber-500/95 backdrop-blur-sm text-black rounded-full px-3 py-1.5 shadow-lg" style={{ top: '68px' }}>
      <div className="flex items-center gap-1.5 text-xs font-medium truncate">
        <Eye className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">
          <strong>{impersonation.targetName || impersonation.targetEmail}</strong>
        </span>
      </div>
      <button
        onClick={handleStop}
        className="flex items-center gap-1 bg-black/20 hover:bg-black/30 rounded-full px-2.5 py-0.5 transition-colors text-xs font-semibold flex-shrink-0 ml-2"
      >
        <X className="w-3 h-3" />
        Admin
      </button>
    </div>
  );
}