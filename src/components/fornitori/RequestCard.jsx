import React from 'react';
import { Clock, Users, CheckCircle, XCircle, Eye, Euro, Building2, Pencil, Trash2, Send, MessageCircle, Search, Sparkles, FileText, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ApplicationReadStatus from './ApplicationReadStatus';
import SupplierSearchResults from './SupplierSearchResults';
import AnonymizeQuoteView from './AnonymizeQuoteView';

const STATUS_CONFIG = {
  aperta: { label: 'Aperta', color: 'bg-green-500/20 text-green-400', icon: Clock },
  ricerca_in_corso: { label: 'Ricerca...', color: 'bg-cyan-500/20 text-cyan-400', icon: Search },
  fornitori_trovati: { label: 'Fornitori trovati', color: 'bg-emerald-500/20 text-emerald-400', icon: Sparkles },
  preventivi_inviati: { label: 'Preventivi inviati', color: 'bg-blue-500/20 text-blue-400', icon: Send },
  preventivi_ricevuti: { label: 'Preventivi ricevuti', color: 'bg-purple-500/20 text-purple-400', icon: FileText },
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
  snc: 'SNC', sas: 'SAS', srl: 'SRL', srls: 'SRLS', spa: 'SPA',
  cooperativa: 'Cooperativa', associazione: 'Associazione', altro: 'Altro'
};

const BUDGET_LABELS = {
  '0-500': '0-500€', '500-1000': '500-1K€', '1000-2500': '1-2,5K€',
  '2500-5000': '2,5-5K€', '5000-10000': '5-10K€', '10000-25000': '10-25K€',
  '25000-50000': '25-50K€', '50000-100000': '50-100K€', 'oltre_100000': '>100K€'
};

export default function RequestCard({
  request, user, isOwner,
  expandedRequest, setExpandedRequest,
  showAnonymize, setShowAnonymize,
  queryClient,
  hasAppliedTo, getMyApplication,
  getApplicationsCount, getUnreadApplicationsCount,
  getApplicationsForRequest,
  setApplyingToRequest,
  setViewingApplicationsRequest,
  markApplicationsAsRead,
  setEditingRequest, setDeletingRequest
}) {
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.aperta;
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`w-full bg-slate-800 rounded-xl p-4 border ${
      isOwner ? 'border-lime-400/30' : 'border-slate-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm">{request.category || request.service_type}</h3>
          {request.macro_sector && (
            <p className="text-slate-500 text-xs truncate">{request.macro_sector}</p>
          )}
          {isOwner && <span className="text-lime-400 text-xs">La tua richiesta</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOwner && (
            <>
              <button
                onClick={() => {
                  setViewingApplicationsRequest(request);
                  markApplicationsAsRead(request.id);
                }}
                className="relative text-slate-400 hover:text-lime-400 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {getUnreadApplicationsCount(request.id) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                    {getUnreadApplicationsCount(request.id)}
                  </span>
                )}
              </button>
              <button onClick={() => setEditingRequest(request)} className="text-slate-400 hover:text-lime-400 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setDeletingRequest(request)} className="text-slate-400 hover:text-red-400 transition-colors">
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

      {/* Problem description */}
      <p className="text-slate-400 text-sm mb-3">{request.problem_to_solve}</p>

      {/* Info */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        {request.company_context && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-500" />
            {COMPANY_CONTEXT_LABELS[request.company_context]}
          </span>
        )}
        {request.budget_range && (
          <span className="flex items-center gap-1">
            <Euro className="w-3 h-3 text-slate-500" />
            {BUDGET_LABELS[request.budget_range]}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          {URGENCY_LABELS[request.urgency]}
        </span>
        {request.locality && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-500" />
            {request.locality} ({request.radius_km || 50}km)
          </span>
        )}
      </div>

      {/* Non-owner: candidati */}
      {!isOwner && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          {hasAppliedTo(request.id) ? (
            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
              <span className="text-slate-300 text-sm">Candidatura inviata</span>
              <ApplicationReadStatus isRead={getMyApplication(request.id)?.is_read} />
            </div>
          ) : (
            <Button onClick={() => setApplyingToRequest(request)} className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500">
              <Send className="w-4 h-4 mr-2" /> Candidati
            </Button>
          )}
        </div>
      )}

      {/* Owner: AI search + anonymize */}
      {isOwner && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
              className={`flex-1 text-xs ${
                expandedRequest === request.id
                  ? 'bg-slate-700 text-lime-400 hover:bg-slate-600'
                  : 'bg-lime-400 text-slate-900 hover:bg-lime-500'
              }`}
            >
              <Search className="w-3 h-3 mr-1" />
              {request.found_suppliers?.length > 0
                ? `${request.found_suppliers.length} fornitori`
                : 'Cerca fornitori AI'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAnonymize(showAnonymize === request.id ? null : request.id)}
              className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <FileText className="w-3 h-3 mr-1" /> Anonimizza
            </Button>
          </div>

          {expandedRequest === request.id && (
            <SupplierSearchResults
              request={request}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['my-supplier-requests'] })}
            />
          )}

          {showAnonymize === request.id && (
            <AnonymizeQuoteView requestId={request.id} />
          )}
        </div>
      )}

      {/* Candidature ricevute */}
      {isOwner && getApplicationsCount(request.id) > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <button
            onClick={() => {
              setViewingApplicationsRequest(request);
              markApplicationsAsRead(request.id);
            }}
            className="w-full flex items-center justify-between bg-lime-400/10 rounded-lg px-3 py-2 hover:bg-lime-400/20 transition-colors"
          >
            <span className="text-lime-400 text-sm font-medium">
              {getApplicationsCount(request.id)} candidatur{getApplicationsCount(request.id) === 1 ? 'a' : 'e'}
            </span>
            {getUnreadApplicationsCount(request.id) > 0 && (
              <Badge className="bg-red-500 text-white text-xs">
                {getUnreadApplicationsCount(request.id)} nuov{getUnreadApplicationsCount(request.id) === 1 ? 'a' : 'e'}
              </Badge>
            )}
          </button>
        </div>
      )}
    </div>
  );
}