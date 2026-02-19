import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, Trash2, X, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SupplierApplicationForm from './SupplierApplicationForm';
import RequestCard from './RequestCard';



export default function MyRequestsList({ user }) {
  const [editingRequest, setEditingRequest] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);
  const [applyingToRequest, setApplyingToRequest] = useState(null);
  const [viewingApplicationsRequest, setViewingApplicationsRequest] = useState(null);
  const queryClient = useQueryClient();

  const [expandedRequest, setExpandedRequest] = useState(null);
  const [showAnonymize, setShowAnonymize] = useState(null);

  // Mostra le MIE richieste (tutte) + le richieste aperte degli altri
  const { data: myRequests = [], isLoading: loadingMy } = useQuery({
    queryKey: ['my-supplier-requests', user?.email],
    queryFn: () => base44.entities.SupplierRequest.filter({ author_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: otherRequests = [], isLoading: loadingOther } = useQuery({
    queryKey: ['other-supplier-requests', user?.email],
    queryFn: async () => {
      const all = await base44.entities.SupplierRequest.filter({ status: 'aperta' }, '-created_date');
      return all.filter(r => r.author_email !== user?.email);
    },
    enabled: !!user?.email,
  });

  const requests = [...myRequests, ...otherRequests];
  const isLoading = loadingMy || loadingOther;

  // Le mie candidature inviate
  const { data: myApplications = [] } = useQuery({
    queryKey: ['supplier-applications', user?.email],
    queryFn: () => base44.entities.Message.filter({ 
      from_email: user?.email, 
      source: 'fornitori_candidatura' 
    }),
    enabled: !!user?.email,
  });

  // Candidature ricevute per le mie richieste
  const { data: receivedApplications = [] } = useQuery({
    queryKey: ['received-applications', user?.email],
    queryFn: () => base44.entities.Message.filter({ 
      to_email: user?.email, 
      source: 'fornitori_candidatura' 
    }),
    enabled: !!user?.email,
  });

  // Controlla se ho già inviato candidatura per una richiesta
  const hasAppliedTo = (requestId) => {
    return myApplications.some(m => m.source_reference === requestId);
  };

  // Trova la mia candidatura per una richiesta
  const getMyApplication = (requestId) => {
    return myApplications.find(m => m.source_reference === requestId);
  };

  // Conta candidature ricevute per una richiesta
  const getApplicationsCount = (requestId) => {
    return receivedApplications.filter(m => m.source_reference === requestId).length;
  };

  // Conta candidature non lette per una richiesta
  const getUnreadApplicationsCount = (requestId) => {
    return receivedApplications.filter(m => m.source_reference === requestId && !m.is_read).length;
  };

  // Candidature per una richiesta specifica
  const getApplicationsForRequest = (requestId) => {
    return receivedApplications.filter(m => m.source_reference === requestId);
  };

  // Segna candidature come lette
  const markApplicationsAsRead = async (requestId) => {
    const toMark = receivedApplications.filter(m => m.source_reference === requestId && !m.is_read);
    await Promise.all(toMark.map(m => base44.entities.Message.update(m.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ['received-applications'] });
    queryClient.invalidateQueries({ queryKey: ['supplier-applications'] });
  };

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
        {/* Le mie richieste */}
        {myRequests.length > 0 && (
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            Le mie richieste ({myRequests.length})
          </p>
        )}
        {myRequests.map(request => {
          return <RequestCard key={request.id} request={request} user={user} isOwner={true}
            expandedRequest={expandedRequest} setExpandedRequest={setExpandedRequest}
            showAnonymize={showAnonymize} setShowAnonymize={setShowAnonymize}
            queryClient={queryClient}
            hasAppliedTo={hasAppliedTo} getMyApplication={getMyApplication}
            getApplicationsCount={getApplicationsCount} getUnreadApplicationsCount={getUnreadApplicationsCount}
            getApplicationsForRequest={getApplicationsForRequest}
            setApplyingToRequest={setApplyingToRequest}
            setViewingApplicationsRequest={setViewingApplicationsRequest}
            markApplicationsAsRead={markApplicationsAsRead}
            setEditingRequest={setEditingRequest} setDeletingRequest={setDeletingRequest}
          />;
        })}

        {/* Richieste di altri */}
        {otherRequests.length > 0 && (
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-4">
            Richieste aperte da altri ({otherRequests.length})
          </p>
        )}
        {otherRequests.map(request => {
          return <RequestCard key={request.id} request={request} user={user} isOwner={false}
            expandedRequest={expandedRequest} setExpandedRequest={setExpandedRequest}
            showAnonymize={showAnonymize} setShowAnonymize={setShowAnonymize}
            queryClient={queryClient}
            hasAppliedTo={hasAppliedTo} getMyApplication={getMyApplication}
            getApplicationsCount={getApplicationsCount} getUnreadApplicationsCount={getUnreadApplicationsCount}
            getApplicationsForRequest={getApplicationsForRequest}
            setApplyingToRequest={setApplyingToRequest}
            setViewingApplicationsRequest={setViewingApplicationsRequest}
            markApplicationsAsRead={markApplicationsAsRead}
            setEditingRequest={setEditingRequest} setDeletingRequest={setDeletingRequest}
          />;
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
                className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-white"
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

      {/* Dialog candidatura */}
      <Dialog open={!!applyingToRequest} onOpenChange={() => setApplyingToRequest(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-white">Candidati per questa richiesta</DialogTitle>
          </DialogHeader>
          {applyingToRequest && (
            <SupplierApplicationForm
              request={applyingToRequest}
              user={user}
              onClose={() => setApplyingToRequest(null)}
              onSuccess={() => {
                setApplyingToRequest(null);
                queryClient.invalidateQueries({ queryKey: ['supplier-applications'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog visualizza candidature ricevute */}
      <Dialog open={!!viewingApplicationsRequest} onOpenChange={() => setViewingApplicationsRequest(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 w-[calc(100vw-2rem)] max-w-md max-h-[80vh] overflow-hidden mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Candidature ricevute</DialogTitle>
          </DialogHeader>
          {viewingApplicationsRequest && (
            <div className="space-y-2 mt-2 overflow-y-auto max-h-[60vh] pr-1">
              <div className="bg-slate-900 rounded-lg p-2 mb-2">
                <p className="text-slate-400 text-xs">Richiesta:</p>
                <p className="text-white font-medium text-sm truncate">{viewingApplicationsRequest.service_type}</p>
              </div>
              
              {getApplicationsForRequest(viewingApplicationsRequest.id).length === 0 ? (
                <div className="text-center py-6">
                  <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Nessuna candidatura ricevuta</p>
                </div>
              ) : (
                getApplicationsForRequest(viewingApplicationsRequest.id).map((app) => (
                  <div key={app.id} className="bg-slate-900 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-6 h-6 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-3 h-3 text-lime-400" />
                        </div>
                        <span className="text-lime-400 text-xs font-medium truncate">{app.from_email}</span>
                      </div>
                      <span className="text-slate-500 text-[10px] flex-shrink-0">
                        {new Date(app.created_date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs whitespace-pre-wrap break-words">
                      {app.content?.replace(/📋 CANDIDATURA per richiesta "[^"]+"\n\n/, '')}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
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
    payment_frequency: request?.payment_frequency || 'una_tantum',
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

  const PAYMENT_FREQUENCIES = [
    { value: 'una_tantum', label: 'Una tantum' },
    { value: 'totale_budget', label: 'Totale budget' },
    { value: 'giornaliero', label: 'Giornaliero' },
    { value: 'mensile', label: 'Mensile' },
    { value: 'trimestrale', label: 'Trimestrale' },
    { value: 'annuale', label: 'Annuale' }
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
        <label className="text-slate-400 text-sm mb-1.5 block">Frequenza pagamento *</label>
        <select
          value={formData.payment_frequency}
          onChange={(e) => setFormData(prev => ({ ...prev, payment_frequency: e.target.value }))}
          className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
        >
          {PAYMENT_FREQUENCIES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
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