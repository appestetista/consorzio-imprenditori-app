import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Clock, 
  UserCheck, 
  Search, 
  FileText, 
  Upload, 
  FileCheck, 
  Play, 
  CheckCircle2, 
  XCircle,
  User,
  Bot,
  Briefcase,
  Shield
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Richiesta ricevuta', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-700' },
  assigned: { label: 'Assegnata', icon: UserCheck, color: 'text-blue-400', bg: 'bg-blue-900/50' },
  in_analysis: { label: 'In analisi', icon: Search, color: 'text-yellow-400', bg: 'bg-yellow-900/50' },
  docs_requested: { label: 'Documenti richiesti', icon: FileText, color: 'text-orange-400', bg: 'bg-orange-900/50' },
  docs_received: { label: 'Documenti ricevuti', icon: Upload, color: 'text-cyan-400', bg: 'bg-cyan-900/50' },
  report_ready: { label: 'Report pronto', icon: FileCheck, color: 'text-purple-400', bg: 'bg-purple-900/50' },
  in_progress: { label: 'Pratica in corso', icon: Play, color: 'text-lime-400', bg: 'bg-lime-900/50' },
  completed: { label: 'Completata', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/50' },
  cancelled: { label: 'Annullata', icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/50' }
};

const ACTOR_ICONS = {
  system: Bot,
  user: User,
  consultant: Briefcase,
  admin: Shield
};

const ACTOR_LABELS = {
  system: 'Sistema',
  user: 'Utente',
  consultant: 'Consulente',
  admin: 'Admin'
};

export default function PraticaTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-sm">
        Nessun evento registrato
      </div>
    );
  }

  // Ordina per timestamp decrescente (più recente prima)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="space-y-4">
      {sortedHistory.map((event, index) => {
        const statusConfig = STATUS_CONFIG[event.to_status] || STATUS_CONFIG.pending;
        const StatusIcon = statusConfig.icon;
        const ActorIcon = ACTOR_ICONS[event.actor_role] || User;
        
        return (
          <div key={index} className="flex gap-3">
            {/* Icona stato */}
            <div className={`w-10 h-10 rounded-full ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
              <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
            </div>
            
            {/* Contenuto */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <span className="text-slate-600">•</span>
                <div className="flex items-center gap-1 text-slate-500 text-xs">
                  <ActorIcon className="w-3 h-3" />
                  <span>{ACTOR_LABELS[event.actor_role]}</span>
                </div>
              </div>
              
              {event.note && (
                <p className="text-slate-400 text-sm mt-1">{event.note}</p>
              )}
              
              <p className="text-slate-600 text-xs mt-1">
                {format(new Date(event.timestamp), "d MMM yyyy 'alle' HH:mm", { locale: it })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { STATUS_CONFIG };