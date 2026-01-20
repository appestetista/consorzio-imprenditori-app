import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Clock, Euro, Briefcase, Shield, Check, X, Unlock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CandidateComparisonTable from './CandidateComparisonTable';
import SupplierReviewForm from './SupplierReviewForm';

const BUDGET_LABELS = {
  'sotto_1k': 'Sotto 1.000 €',
  '1k-5k': '1.000 - 5.000 €',
  '5k-15k': '5.000 - 15.000 €',
  '15k-50k': '15.000 - 50.000 €',
  'oltre_50k': 'Oltre 50.000 €',
  'da_definire': 'Da definire'
};

const URGENCY_LABELS = {
  immediata: 'Immediata',
  entro_1_mese: 'Entro 1 mese',
  entro_3_mesi: 'Entro 3 mesi',
  nessuna_fretta: 'Nessuna fretta'
};

const PHASE_LABELS = {
  partenza: 'Partenza',
  stabilizzazione: 'Stabilizzazione',
  crescita: 'Crescita',
  riduzione_costi: 'Riduzione costi'
};

export default function RequestDetailView({ request, user, onBack }) {
  const [showComparison, setShowComparison] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['request-candidates', request.id],
    queryFn: () => base44.entities.SupplierCandidate.filter({ request_id: request.id }),
  });

  const { data: supplierProfiles = [] } = useQuery({
    queryKey: ['supplier-profiles-for-candidates', candidates.map(c => c.supplier_email)],
    queryFn: async () => {
      if (candidates.length === 0) return [];
      const profiles = await base44.entities.SupplierProfile.list();
      return profiles.filter(p => candidates.some(c => c.supplier_email === p.user_email));
    },
    enabled: candidates.length > 0,
  });

  const unlockContactMutation = useMutation({
    mutationFn: async (candidateId) => {
      await base44.entities.SupplierCandidate.update(candidateId, {
        contact_unlocked: true,
        contact_unlocked_at: new Date().toISOString(),
        status: 'selezionato'
      });
      await base44.entities.SupplierRequest.update(request.id, {
        status: 'fornitore_scelto',
        chosen_candidate_id: candidateId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['my-supplier-requests'] });
      setShowUnlockConfirm(false);
    }
  });

  const getSupplierProfile = (email) => supplierProfiles.find(p => p.user_email === email);
  const chosenCandidate = candidates.find(c => c.id === request.chosen_candidate_id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-lime-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-white font-semibold">Dettaglio richiesta</h2>
      </div>

      {/* Info richiesta */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-lime-400 font-medium mb-2">{request.service_type}</h3>
        <p className="text-slate-400 text-sm mb-4">{request.problem_to_solve}</p>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Euro className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300">{BUDGET_LABELS[request.budget_range]}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300">{URGENCY_LABELS[request.urgency]}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300">{PHASE_LABELS[request.business_phase]}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300">{candidates.length} candidature</span>
          </div>
        </div>
      </div>

      {/* Fornitore scelto - se presente */}
      {chosenCandidate && (
        <div className="bg-lime-400/10 border border-lime-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-lime-400" />
            <span className="text-lime-400 font-medium">Fornitore selezionato</span>
          </div>
          
          {chosenCandidate.contact_unlocked && (
            <div className="bg-slate-800 rounded-lg p-3 mb-3">
              <p className="text-white font-medium">{getSupplierProfile(chosenCandidate.supplier_email)?.company_name || 'Fornitore'}</p>
              <p className="text-slate-400 text-sm">{chosenCandidate.supplier_email}</p>
            </div>
          )}
          
          {request.status === 'fornitore_scelto' && !showReviewForm && (
            <Button 
              onClick={() => setShowReviewForm(true)}
              className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Lascia una recensione
            </Button>
          )}
        </div>
      )}

      {/* Form recensione */}
      {showReviewForm && chosenCandidate && (
        <SupplierReviewForm 
          request={request}
          candidate={chosenCandidate}
          user={user}
          onClose={() => setShowReviewForm(false)}
          onSuccess={() => {
            setShowReviewForm(false);
            queryClient.invalidateQueries({ queryKey: ['my-supplier-requests'] });
          }}
        />
      )}

      {/* Lista candidature */}
      {!chosenCandidate && candidates.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium">Candidature ricevute</h4>
            {candidates.length >= 2 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowComparison(true)}
                className="border-lime-400 text-lime-400 hover:bg-lime-400/10"
              >
                Confronta
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {candidates.map(candidate => {
              const profile = getSupplierProfile(candidate.supplier_email);
              
              return (
                <div 
                  key={candidate.id}
                  className="bg-slate-800 rounded-xl p-4 border border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-lime-400" />
                        <span className="text-slate-400 text-sm">Fornitore anonimo</span>
                      </div>
                      {profile?.badges?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {profile.badges.map(badge => (
                            <Badge key={badge} className={
                              badge === 'affidabile' ? 'bg-green-500/20 text-green-400' :
                              badge === 'complesso' ? 'bg-amber-500/20 text-amber-400' :
                              badge === 'dispendioso' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-red-500/20 text-red-400'
                            }>
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {profile?.aggregated_stats?.would_redo_percentage !== undefined && (
                      <div className="text-right">
                        <p className="text-lime-400 font-bold">{profile.aggregated_stats.would_redo_percentage}%</p>
                        <p className="text-slate-500 text-xs">lo rifarebbero</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div>
                      <span className="text-slate-500">Esperienza:</span>
                      <p className="text-slate-300">{candidate.real_experience}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Metodo:</span>
                      <p className="text-slate-300">{candidate.work_method}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <span className="text-slate-500">Tempi:</span>
                        <p className="text-slate-300">{candidate.estimated_time}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Prezzo:</span>
                        <p className="text-slate-300">{candidate.estimated_price}</p>
                      </div>
                    </div>
                    {candidate.what_they_wont_do && (
                      <div>
                        <span className="text-slate-500">Cosa NON fanno:</span>
                        <p className="text-slate-300">{candidate.what_they_wont_do}</p>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setShowUnlockConfirm(true);
                    }}
                    className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Scegli e sblocca contatto
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Nessuna candidatura */}
      {!isLoading && candidates.length === 0 && request.status === 'aperta' && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Nessuna candidatura ancora</p>
          <p className="text-slate-500 text-sm">I fornitori stanno valutando la tua richiesta</p>
        </div>
      )}

      {/* Dialog conferma sblocco */}
      <Dialog open={showUnlockConfirm} onOpenChange={setShowUnlockConfirm}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm [&>button]:hidden">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Unlock className="w-8 h-8 text-lime-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Sblocca contatto?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Confermando, il fornitore vedrà i tuoi dati di contatto e potrete comunicare direttamente.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowUnlockConfirm(false)}
                className="flex-1 border-slate-600 text-white hover:bg-slate-700"
              >
                Annulla
              </Button>
              <Button 
                onClick={() => unlockContactMutation.mutate(selectedCandidate?.id)}
                disabled={unlockContactMutation.isPending}
                className="flex-1 bg-lime-400 text-slate-900 hover:bg-lime-500"
              >
                {unlockContactMutation.isPending ? 'Sblocco...' : 'Conferma'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog confronto */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto [&>button]:hidden">
          <CandidateComparisonTable 
            candidates={candidates} 
            supplierProfiles={supplierProfiles}
            onClose={() => setShowComparison(false)}
            onSelect={(candidate) => {
              setSelectedCandidate(candidate);
              setShowComparison(false);
              setShowUnlockConfirm(true);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}