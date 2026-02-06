import React from 'react';
import { 
  Clock, 
  UserCheck, 
  Search, 
  FileText, 
  Upload, 
  FileCheck, 
  Play, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  pending: { 
    label: 'In attesa', 
    icon: Clock, 
    className: 'bg-slate-700 text-slate-300 border-slate-600' 
  },
  assigned: { 
    label: 'Assegnata', 
    icon: UserCheck, 
    className: 'bg-blue-900/50 text-blue-300 border-blue-700' 
  },
  in_analysis: { 
    label: 'In analisi', 
    icon: Search, 
    className: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' 
  },
  docs_requested: { 
    label: 'Documenti richiesti', 
    icon: FileText, 
    className: 'bg-orange-900/50 text-orange-300 border-orange-700' 
  },
  docs_received: { 
    label: 'Documenti ricevuti', 
    icon: Upload, 
    className: 'bg-cyan-900/50 text-cyan-300 border-cyan-700' 
  },
  report_ready: { 
    label: 'Report pronto', 
    icon: FileCheck, 
    className: 'bg-purple-900/50 text-purple-300 border-purple-700' 
  },
  in_progress: { 
    label: 'In corso', 
    icon: Play, 
    className: 'bg-lime-900/50 text-lime-300 border-lime-700' 
  },
  completed: { 
    label: 'Completata', 
    icon: CheckCircle2, 
    className: 'bg-green-900/50 text-green-300 border-green-700' 
  },
  cancelled: { 
    label: 'Annullata', 
    icon: XCircle, 
    className: 'bg-red-900/50 text-red-300 border-red-700' 
  }
};

export default function PraticaStatusBadge({ status, size = 'default' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  
  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs gap-1',
    default: 'px-3 py-1 text-sm gap-1.5',
    large: 'px-4 py-1.5 text-base gap-2'
  };
  
  const iconSizes = {
    small: 'w-3 h-3',
    default: 'w-4 h-4',
    large: 'w-5 h-5'
  };
  
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      config.className,
      sizeClasses[size]
    )}>
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };