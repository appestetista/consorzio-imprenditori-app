import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, CheckCircle, XCircle, Shield, Eye, Euro, Building2 } from 'lucide-react';
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

const COMPANY_CONTEXT_LABELS = {
  ditta_individuale: 'Ditta individuale',
  libero_professionista: 'Libero professionista',
  snc: 'SNC',
  sas: 'SAS',
  srl: 'SRL',
  srls: 'SRLS',
  spa: 'SPA',
  cooperativa: 'Cooperativa',
  associazione: 'Associazione',
  altro: 'Altro'
};

const BUDGET_LABELS = {
  '0-500': '0 - 500 €',
  '500-1000': '500 - 1.000 €',
  '1000-2500': '1.000 - 2.500 €',
  '2500-5000': '2.500 - 5.000 €',
  '5000-10000': '5.000 - 10.000 €',
  '10000-25000': '10.000 - 25.000 €',
  '25000-50000': '25.000 - 50.000 €',
  '50000-100000': '50.000 - 100.000 €',
  'oltre_100000': 'Oltre 100.000 €'
};



export default function MyRequestsList({ user }) {
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Mostra tutte le richieste aperte a tutti gli utenti
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['all-supplier-requests'],
    queryFn: () => base44.entities.SupplierRequest.filter({ status: 'aperta' }, '-created_date'),
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
            className={`w-full bg-slate-800 rounded-xl p-4 border transition-all text-left ${
              request.author_email === user?.email 
                ? 'border-lime-400/30 hover:border-lime-400/60' 
                : 'border-slate-700 hover:border-lime-400/50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium">{request.service_type}</h3>
                {request.author_email === user?.email && (
                  <span className="text-lime-400 text-xs">Il tuo annuncio</span>
                )}
              </div>
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            
            <p className="text-slate-400 text-sm mb-3">{request.problem_to_solve}</p>
            
            {/* Info dettagliate */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{COMPANY_CONTEXT_LABELS[request.company_context] || request.company_context}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Euro className="w-3.5 h-3.5 text-slate-500" />
                <span>{BUDGET_LABELS[request.budget_range] || request.budget_range || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{URGENCY_LABELS[request.urgency]}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{request.candidates_count || 0} candidature</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}