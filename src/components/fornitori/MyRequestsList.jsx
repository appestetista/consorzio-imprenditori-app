import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Users, CheckCircle, XCircle, Shield, Eye, Euro, Building2, Pencil, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  const [editingRequest, setEditingRequest] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);
  const queryClient = useQueryClient();

  // Mostra tutte le richieste aperte a tutti gli utenti
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['all-supplier-requests'],
    queryFn: () => base44.entities.SupplierRequest.filter({ status: 'aperta' }, '-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-supplier-requests'] });
      setDeletingRequest(null);
    }
  });

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

  const isOwner = (request) => request.author_email === user?.email;

  return (
    <>
      <div className="space-y-3">
        {requests.map(request => {
          const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.aperta;
          const StatusIcon = statusConfig.icon;
          
          return (
            <div
              key={request.id}
              className={`w-full bg-slate-800 rounded-xl p-4 border ${
                isOwner(request) 
                  ? 'border-lime-400/30' 
                  : 'border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{request.service_type}</h3>
                  {isOwner(request) && (
                    <span className="text-lime-400 text-xs">Il tuo annuncio</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOwner(request) && (
                    <>
                      <button 
                        onClick={() => setEditingRequest(request)}
                        className="text-slate-400 hover:text-lime-400 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeletingRequest(request)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
              
              <p className="text-slate-400 text-sm mb-3">{request.problem_to_solve}</p>
              
              {/* Info dettagliate */}
              <div className="grid grid-cols-2 gap-2">
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
            </div>
          );
        })}
      </div>

      {/* Dialog conferma eliminazione */}
      <Dialog open={!!deletingRequest} onOpenChange={() => setDeletingRequest(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm [&>button]:hidden">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Elimina richiesta?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Questa azione è irreversibile.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDeletingRequest(null)}
                className="flex-1 border-slate-600 text-white hover:bg-slate-700"
              >
                Annulla
              </Button>
              <Button 
                onClick={() => deleteMutation.mutate(deletingRequest?.id)}
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
      <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <EditRequestForm 
            request={editingRequest}
            onClose={() => setEditingRequest(null)}
            onSuccess={() => {
              setEditingRequest(null);
              queryClient.invalidateQueries({ queryKey: ['all-supplier-requests'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditRequestForm({ request, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    service_type: request?.service_type || '',
    company_context: request?.company_context || '',
    problem_to_solve: request?.problem_to_solve || '',
    budget_range: request?.budget_range || '',
    urgency: request?.urgency || ''
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
          className="flex-1 border-slate-600 text-white hover:bg-slate-700"
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