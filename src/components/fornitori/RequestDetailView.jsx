import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, Clock, Euro, Building2, Shield, Check, X, Unlock, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CandidateComparisonTable from './CandidateComparisonTable';
import SupplierReviewForm from './SupplierReviewForm';

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

const URGENCY_LABELS = {
  immediata: 'Immediata',
  entro_1_mese: 'Entro 1 mese',
  entro_3_mesi: 'Entro 3 mesi',
  nessuna_fretta: 'Nessuna fretta'
};

export default function RequestDetailView({ request, user, onBack }) {
  const [showComparison, setShowComparison] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
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

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.SupplierRequest.delete(request.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-supplier-requests'] });
      onBack();
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
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lime-400 font-medium">{request.service_type}</h3>
          {request.status === 'aperta' && request.author_email === user?.email && (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowEditForm(true)}
                className="text-slate-400 hover:text-lime-400 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <p className="text-slate-400 text-sm mb-4">{request.problem_to_solve}</p>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300">{COMPANY_CONTEXT_LABELS[request.company_context] || request.company_context}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Euro className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300">{BUDGET_LABELS[request.budget_range] || request.budget_range}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-slate-300">{URGENCY_LABELS[request.urgency]}</span>
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
                className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white"
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

      {/* Dialog conferma eliminazione */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm [&>button]:hidden">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Elimina richiesta?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Questa azione è irreversibile. Tutte le candidature ricevute verranno perse.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                Annulla
              </Button>
              <Button 
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 text-white hover:bg-red-600"
              >
                {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog modifica richiesta */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <EditSupplierRequestForm 
            request={request}
            onClose={() => setShowEditForm(false)}
            onSuccess={() => {
              setShowEditForm(false);
              queryClient.invalidateQueries({ queryKey: ['my-supplier-requests'] });
              onBack();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditSupplierRequestForm({ request, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    service_type: request.service_type || '',
    company_context: request.company_context || '',
    problem_to_solve: request.problem_to_solve || '',
    budget_range: request.budget_range || '',
    urgency: request.urgency || ''
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierRequest.update(request.id, data),
    onSuccess
  });

  const COMPANY_CONTEXTS = [
    { value: 'ditta_individuale', label: 'Ditta individuale' },
    { value: 'libero_professionista', label: 'Libero professionista' },
    { value: 'snc', label: 'SNC' },
    { value: 'sas', label: 'SAS' },
    { value: 'srl', label: 'SRL' },
    { value: 'srls', label: 'SRLS' },
    { value: 'spa', label: 'SPA' },
    { value: 'cooperativa', label: 'Cooperativa' },
    { value: 'associazione', label: 'Associazione' },
    { value: 'altro', label: 'Altro' }
  ];

  const BUDGET_RANGES = [
    { value: '0-500', label: '0 - 500 €' },
    { value: '500-1000', label: '500 - 1.000 €' },
    { value: '1000-2500', label: '1.000 - 2.500 €' },
    { value: '2500-5000', label: '2.500 - 5.000 €' },
    { value: '5000-10000', label: '5.000 - 10.000 €' },
    { value: '10000-25000', label: '10.000 - 25.000 €' },
    { value: '25000-50000', label: '25.000 - 50.000 €' },
    { value: '50000-100000', label: '50.000 - 100.000 €' },
    { value: 'oltre_100000', label: 'Oltre 100.000 €' }
  ];

  const URGENCY_OPTIONS = [
    { value: 'immediata', label: 'Immediata' },
    { value: 'entro_1_mese', label: 'Entro 1 mese' },
    { value: 'entro_3_mesi', label: 'Entro 3 mesi' },
    { value: 'nessuna_fretta', label: 'Nessuna fretta' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lime-400 font-semibold">Modifica richiesta</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div>
        <label className="text-slate-400 text-sm mb-1.5 block">Tipo di servizio *</label>
        <input
          value={formData.service_type}
          onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
        />
      </div>

      <div>
        <label className="text-slate-400 text-sm mb-1.5 block">Contesto aziendale *</label>
        <select
          value={formData.company_context}
          onChange={(e) => setFormData(prev => ({ ...prev, company_context: e.target.value }))}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
        >
          <option value="">Seleziona...</option>
          {COMPANY_CONTEXTS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-slate-400 text-sm mb-1.5 block">Problema da risolvere *</label>
        <textarea
          value={formData.problem_to_solve}
          onChange={(e) => setFormData(prev => ({ ...prev, problem_to_solve: e.target.value }))}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white min-h-24"
        />
      </div>

      <div>
        <label className="text-slate-400 text-sm mb-1.5 block">Budget *</label>
        <select
          value={formData.budget_range}
          onChange={(e) => setFormData(prev => ({ ...prev, budget_range: e.target.value }))}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
        >
          <option value="">Seleziona...</option>
          {BUDGET_RANGES.map(b => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-slate-400 text-sm mb-1.5 block">Urgenza *</label>
        <select
          value={formData.urgency}
          onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
        >
          <option value="">Seleziona...</option>
          {URGENCY_OPTIONS.map(u => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white"
        >
          Annulla
        </Button>
        <Button 
          onClick={() => updateMutation.mutate(formData)}
          disabled={updateMutation.isPending || !formData.service_type || !formData.company_context || !formData.problem_to_solve || !formData.budget_range || !formData.urgency}
          className="flex-1 bg-lime-400 text-slate-900 hover:bg-lime-500"
        >
          {updateMutation.isPending ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
      </div>
    </div>
  );
}