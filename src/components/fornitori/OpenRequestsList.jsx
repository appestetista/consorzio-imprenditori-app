import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Euro, Briefcase, Building2, Shield, Send, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import SupplierCandidateForm from './SupplierCandidateForm';

const CONTEXT_LABELS = {
  micro: 'Micro impresa',
  pmi: 'PMI',
  srl_piccola: 'SRL piccola',
  srl_media: 'SRL media',
  srl_grande: 'SRL grande'
};

const BUDGET_LABELS = {
  'sotto_1k': '< 1k €',
  '1k-5k': '1-5k €',
  '5k-15k': '5-15k €',
  '15k-50k': '15-50k €',
  'oltre_50k': '> 50k €',
  'da_definire': 'Da definire'
};

const URGENCY_LABELS = {
  immediata: 'Immediata',
  entro_1_mese: 'Entro 1 mese',
  entro_3_mesi: 'Entro 3 mesi',
  nessuna_fretta: 'No fretta'
};

const PHASE_LABELS = {
  partenza: 'Partenza',
  stabilizzazione: 'Stabilizzazione',
  crescita: 'Crescita',
  riduzione_costi: 'Riduzione costi'
};

export default function OpenRequestsList({ user, supplierProfile }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['open-supplier-requests'],
    queryFn: () => base44.entities.SupplierRequest.filter({ status: 'aperta' }, '-created_date'),
  });

  // Candidature già inviate dal fornitore
  const { data: myCandidatures = [] } = useQuery({
    queryKey: ['my-candidatures', user?.email],
    queryFn: () => base44.entities.SupplierCandidate.filter({ supplier_email: user?.email }),
    enabled: !!user?.email,
  });

  const alreadyApplied = (requestId) => myCandidatures.some(c => c.request_id === requestId);

  // Filtra richieste per categoria del fornitore
  const filteredRequests = requests.filter(r => {
    if (!supplierProfile?.service_categories?.length) return true;
    return supplierProfile.service_categories.includes(r.service_category);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-slate-700 mx-auto mb-4" />
        <p className="text-slate-400 mb-2">Nessuna richiesta aperta</p>
        <p className="text-slate-500 text-sm">Le nuove richieste appariranno qui</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {filteredRequests.map(request => {
          const hasApplied = alreadyApplied(request.id);
          
          return (
            <div 
              key={request.id}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge className="bg-slate-700 text-slate-300 mb-2">{request.service_category}</Badge>
                  <h3 className="text-white font-medium">{request.service_type}</h3>
                </div>
                {hasApplied && (
                  <Badge className="bg-lime-500/20 text-lime-400">
                    <Check className="w-3 h-3 mr-1" />
                    Candidato
                  </Badge>
                )}
              </div>
              
              <p className="text-slate-400 text-sm mb-4 line-clamp-3">{request.problem_to_solve}</p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{CONTEXT_LABELS[request.company_context]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Euro className="w-3.5 h-3.5" />
                  <span>{BUDGET_LABELS[request.budget_range]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{URGENCY_LABELS[request.urgency]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{PHASE_LABELS[request.business_phase]}</span>
                </div>
              </div>

              {!hasApplied ? (
                <Button 
                  onClick={() => setSelectedRequest(request)}
                  className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Candidati
                </Button>
              ) : (
                <p className="text-center text-slate-500 text-sm py-2">
                  Hai già inviato la tua candidatura
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog candidatura */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[85vh] overflow-y-auto [&>button]:hidden">
          <SupplierCandidateForm 
            request={selectedRequest}
            user={user}
            supplierProfile={supplierProfile}
            onClose={() => setSelectedRequest(null)}
            onSuccess={() => {
              setSelectedRequest(null);
              queryClient.invalidateQueries({ queryKey: ['my-candidatures'] });
              queryClient.invalidateQueries({ queryKey: ['open-supplier-requests'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}