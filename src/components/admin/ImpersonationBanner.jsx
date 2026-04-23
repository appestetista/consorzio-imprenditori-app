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
    <button
      onClick={handleStop}
      className="fixed right-3 z-[9999] flex items-center gap-1.5 bg-amber-500/80 hover:bg-amber-500 backdrop-blur-sm text-black rounded-full px-2.5 py-1 shadow-md transition-all text-[10px] font-semibold"
      style={{ top: '70px' }}
      title={`Visualizzando come: ${impersonation.targetName || impersonation.targetEmail}`}
    >
      <Eye className="w-3 h-3" />
      <X className="w-3 h-3" />
    </button>
  );
}