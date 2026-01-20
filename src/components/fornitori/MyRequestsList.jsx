import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, CheckCircle, XCircle, ChevronRight, Shield, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import RequestDetailView from './RequestDetailView';

const STATUS_CONFIG = {
  aperta: { label: 'Aperta', color: 'bg-green-500/20 text-green-400', icon: Clock },
  in_valutazione: { label: 'In valutazione', color: 'bg-blue-500/20 text-blue-400', icon: Eye },
  fornitore_scelto: { label: 'Fornitore scelto', color: 'bg-lime-500/20 text-lime-400', icon: CheckCircle },
  chiusa: { label: 'Chiusa', color: 'bg-slate-500/20 text-slate-400', icon: XCircle },
  annullata: { label: 'Annullata', color: 'bg-red-500/20 text-red-400', icon: XCircle }
};

const URGENCY_LABELS = {
  immediata: 'Immediata',
  entro_1_mese: 'Entro 1 mese',
  entro_3_mesi: 'Entro 3 mesi',
  nessuna_fretta: 'Nessuna fretta'
};

export default function MyRequestsList({ user }) {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-supplier-requests', user?.email],
    queryFn: () => base44.entities.SupplierRequest.filter({ author_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  if (selectedRequest) {
    return (
      <RequestDetailView 
        request={selectedRequest} 
        user={user}
        onBack={() => setSelectedRequest(null)} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-slate-700 mx-auto mb-4" />
        <p className="text-slate-400 mb-2">Nessuna richiesta</p>
        <p className="text-slate-500 text-sm">Crea la tua prima richiesta anonima per trovare fornitori</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map(request => {
        const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.aperta;
        const StatusIcon = statusConfig.icon;
        
        return (
          <button
            key={request.id}
            onClick={() => setSelectedRequest(request)}
            className="w-full bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-lime-400/50 transition-all text-left"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{request.service_type}</h3>
                <p className="text-slate-400 text-sm">{request.service_category}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
            </div>
            
            <p className="text-slate-500 text-sm mb-3 line-clamp-2">{request.problem_to_solve}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={statusConfig.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <Badge className="bg-slate-700 text-slate-300">
                  {URGENCY_LABELS[request.urgency]}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-sm">
                <Users className="w-4 h-4" />
                <span>{request.candidates_count || 0}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}