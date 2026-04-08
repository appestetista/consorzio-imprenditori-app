import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Euro, TrendingUp, ExternalLink, Zap, CheckCircle2, Bell, BellOff, Briefcase, Sparkles, Building2, HelpCircle, Users, X, Info, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Componente Tooltip con popup
function InfoTooltip({ title, description }) {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="ml-1 text-slate-400 hover:text-lime-400 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lime-400 text-base">{title}</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">{description}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function GrantCard({ grant, onDetails, userInterest, onToggleAlerts, onRequestConsultation, aiRecommendation, isTopRecommended, userProfile, isAdmin = false }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Aperto': return 'bg-green-500';
      case 'In apertura': return 'bg-yellow-500';
      case 'Chiuso': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getGrantTypeIcon = (type) => {
    const icons = {
      'Digitalizzazione': '💻',
      'Innovazione': '💡',
      'Ricerca e Sviluppo': '🔬',
      'Energia/Sostenibilità': '🌱',
      'Internazionalizzazione': '🌍',
      'Altro': '📋'
    };
    return icons[type] || '📋';
  };

  // Calcola giorni alla scadenza per evidenziare urgenza
  const daysToDeadline = grant.deadline ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isUrgent = daysToDeadline !== null && daysToDeadline <= 30 && daysToDeadline > 0;

  return (
    <Card className={`bg-slate-800 border-slate-700 hover:border-lime-400/50 transition-all ${
      isTopRecommended ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20' : ''
    } ${isUrgent ? 'border-l-4 border-l-orange-500' : ''}`}>
      <CardHeader className="pb-3">
        {/* RIGA SUPERIORE: Badge status + data */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">{getGrantTypeIcon(grant.grant_type)}</span>
            {grant.easy_access && (
              <Badge className="bg-lime-400 text-slate-900 font-bold text-[10px] px-1.5">
                <Zap className="w-3 h-3 mr-0.5" />
                Subito
              </Badge>
            )}
            {aiRecommendation && aiRecommendation.score >= 75 && !isTopRecommended && (
              <Badge className="bg-purple-600 text-white border-0 text-[10px] px-1.5">
                <Sparkles className="w-3 h-3 mr-0.5" />
                {aiRecommendation.score}%
              </Badge>
            )}
            {/* Badge confidence_level - solo per admin */}
            {isAdmin && grant.confidence_level && (
              <Badge className={`text-[10px] px-1.5 ${
                grant.confidence_level === 'alto' ? 'bg-green-600 text-white' :
                grant.confidence_level === 'medio' ? 'bg-yellow-600 text-white' :
                'bg-red-600 text-white'
              }`}>
                {grant.confidence_level === 'alto' && <ShieldCheck className="w-3 h-3 mr-0.5" />}
                {grant.confidence_level === 'medio' && <ShieldQuestion className="w-3 h-3 mr-0.5" />}
                {grant.confidence_level === 'basso' && <ShieldAlert className="w-3 h-3 mr-0.5" />}
                {grant.confidence_level}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(grant.status)} text-white text-[10px]`}>
              {grant.status}
            </Badge>
            {grant.created_date && (
              <span className="text-lime-400/80 text-[10px] font-medium whitespace-nowrap">
                📅 {format(new Date(grant.created_date), 'd/M/yy', { locale: it })}
              </span>
            )}
          </div>
        </div>

        {/* TITOLO */}
        <CardTitle className="text-white text-sm leading-tight">{grant.title}</CardTitle>
        
        {/* Ente erogatore */}
        <div className="bg-orange-500/20 border border-orange-500/50 rounded-md px-2 py-1.5 mt-2 flex flex-wrap items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
          <span className="text-orange-300 text-xs font-bold">
            {grant.ente_erogatore || 'N/D'}
          </span>
          {grant.livello && (
            <Badge className="bg-orange-500 text-white text-[9px] px-1 py-0">{grant.livello}</Badge>
          )}
          <InfoTooltip 
            title="Ente Erogatore" 
            description="È l'ente pubblico che gestisce e finanzia il bando. Può essere l'Unione Europea (UE), lo Stato italiano, una Regione o un altro ente pubblico."
          />
        </div>
        
        {grant.website_url && (
          <a 
            href={grant.website_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-[10px] underline flex items-center gap-1 mt-2 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{grant.website_url}</span>
          </a>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        <p className="text-slate-400 text-sm line-clamp-2">{grant.description}</p>
        {aiRecommendation && aiRecommendation.reason && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2">
            <p className="text-purple-300 text-xs flex items-start gap-2">
              <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{aiRecommendation.reason}</span>
            </p>
          </div>
        )}
        
        {/* Note estrazione - solo per admin */}
        {isAdmin && grant.extraction_notes && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
            <p className="text-orange-300 text-xs flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span><strong>Note LLM:</strong> {grant.extraction_notes}</span>
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-lime-400/30 text-lime-400 text-[10px]">
            {grant.grant_type}
          </Badge>
          <Badge variant="outline" className="border-blue-400/30 text-blue-400 text-[10px]">
            {grant.funding_type}
          </Badge>
        </div>

        <div className="space-y-2.5 text-sm bg-slate-900/50 rounded-lg p-3">
          {/* IMPORTO */}
          <div className="flex items-center gap-2 text-slate-300">
            <Euro className="w-4 h-4 text-lime-400 flex-shrink-0" />
            <span className="flex-1">
              <strong>Importo per azienda:</strong> {grant.min_amount && grant.max_amount 
                ? `${grant.min_amount.toLocaleString('it-IT')} - ${grant.max_amount.toLocaleString('it-IT')} €`
                : grant.max_amount 
                  ? `Fino a ${grant.max_amount.toLocaleString('it-IT')} €`
                  : grant.min_amount
                    ? `Da ${grant.min_amount.toLocaleString('it-IT')} €`
                    : 'Da definire'}
            </span>
            <InfoTooltip 
              title="Importo per singola azienda" 
              description="È l'importo minimo e massimo che la tua azienda può richiedere partecipando a questo bando. L'importo effettivo dipende dal tuo progetto e dai requisiti specifici."
            />
          </div>

          {/* COPERTURA */}
          <div className="flex items-center gap-2 text-slate-300">
            <TrendingUp className="w-4 h-4 text-lime-400 flex-shrink-0" />
            <span className="flex-1">
              <strong>Copertura:</strong> {grant.coverage_percentage 
                ? `${grant.coverage_percentage}%` 
                : 'Da definire'}
            </span>
            <InfoTooltip 
              title="Percentuale di copertura" 
              description="È la percentuale delle spese ammissibili che viene coperta dal contributo. Ad esempio, se la copertura è 50% e investi 100.000€, riceverai 50.000€ di contributo."
            />
          </div>
          
          {/* SCADENZA */}
          <div className={`flex items-center gap-2 ${isUrgent ? 'text-orange-400' : 'text-slate-300'}`}>
            <Calendar className={`w-4 h-4 flex-shrink-0 ${isUrgent ? 'text-orange-400' : 'text-lime-400'}`} />
            <span className="flex-1">
              <strong>Scadenza:</strong> {grant.deadline && !isNaN(new Date(grant.deadline).getTime())
                ? format(new Date(grant.deadline), 'd MMMM yyyy', { locale: it })
                : 'A esaurimento fondi'}
              {isUrgent && <span className="ml-2 text-orange-400 font-bold">({daysToDeadline} giorni)</span>}
            </span>
            <InfoTooltip 
              title="Scadenza del bando" 
              description="È la data entro cui devi presentare la domanda. 'A esaurimento fondi' significa che il bando rimane aperto finché ci sono risorse disponibili."
            />
          </div>

          {/* REQUISITI DI ACCESSO */}
          <div className="flex items-start gap-2 text-slate-300">
            <Users className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span><strong>Requisiti base:</strong></span>
              <div className="text-xs mt-1 space-y-1">
                {/* Dimensione aziendale */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Dimensione:</span>
                  <span className={
                    grant.eligible_company_sizes?.length > 0 
                      ? (userProfile?.company_size && grant.eligible_company_sizes.includes(userProfile.company_size) 
                          ? 'text-green-400' 
                          : userProfile?.company_size ? 'text-red-400' : 'text-slate-300')
                      : 'text-slate-300'
                  }>
                    {grant.eligible_company_sizes?.length > 0 
                      ? grant.eligible_company_sizes.join(', ')
                      : 'Tutte'}
                  </span>
                  {userProfile?.company_size && grant.eligible_company_sizes?.length > 0 && (
                    grant.eligible_company_sizes.includes(userProfile.company_size) 
                      ? <CheckCircle2 className="w-3 h-3 text-green-400" />
                      : <X className="w-3 h-3 text-red-400" />
                  )}
                </div>
                
                {/* Regione */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Regioni:</span>
                  <span className={
                    grant.eligible_regions?.length > 0 
                      ? (userProfile?.region && grant.eligible_regions.includes(userProfile.region) 
                          ? 'text-green-400' 
                          : userProfile?.region ? 'text-red-400' : 'text-slate-300')
                      : 'text-slate-300'
                  }>
                    {grant.eligible_regions?.length > 0 
                      ? (grant.eligible_regions.length > 3 
                          ? `${grant.eligible_regions.slice(0, 3).join(', ')}...` 
                          : grant.eligible_regions.join(', '))
                      : 'Tutte'}
                  </span>
                  {userProfile?.region && grant.eligible_regions?.length > 0 && (
                    grant.eligible_regions.includes(userProfile.region) 
                      ? <CheckCircle2 className="w-3 h-3 text-green-400" />
                      : <X className="w-3 h-3 text-red-400" />
                  )}
                </div>

                {/* Codice ATECO se presente */}
                {grant.eligible_ateco_codes?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">ATECO:</span>
                    <span className={
                      userProfile?.ateco_code 
                        ? (grant.eligible_ateco_codes.some(code => 
                            userProfile.ateco_code.startsWith(code) || code.startsWith(userProfile.ateco_code?.substring(0, 2))
                          ) ? 'text-green-400' : 'text-red-400')
                        : 'text-slate-300'
                    }>
                      {grant.eligible_ateco_codes.slice(0, 3).join(', ')}{grant.eligible_ateco_codes.length > 3 ? '...' : ''}
                    </span>
                    {userProfile?.ateco_code && (
                      grant.eligible_ateco_codes.some(code => 
                        userProfile.ateco_code.startsWith(code) || code.startsWith(userProfile.ateco_code?.substring(0, 2))
                      ) 
                        ? <CheckCircle2 className="w-3 h-3 text-green-400" />
                        : <X className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
            <InfoTooltip 
              title="Requisiti di accesso" 
              description="Sono i requisiti minimi che la tua azienda deve avere per poter partecipare al bando. Verde = compatibile con il tuo profilo. Rosso = non compatibile. Completa il tuo 'Profilo Bandi' per una verifica accurata."
            />
          </div>

          {/* COFINANZIAMENTO */}
          <div className={`flex items-center gap-2 ${grant.requires_cofinancing ? 'text-yellow-400' : 'text-green-400'}`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">
              <strong>Cofinanziamento:</strong> {grant.requires_cofinancing ? 'Richiesto' : 'Non richiesto'}
            </span>
            <InfoTooltip 
              title="Cofinanziamento" 
              description="Se richiesto, significa che devi contribuire con fondi propri a una parte dell'investimento. Se non richiesto, il contributo può coprire l'intero importo ammissibile."
            />
          </div>
        </div>

        {(grant.prezzo_istruttoria || grant.percentuale_erogazione) && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-medium text-sm">Costi assistenza consulenza</span>
            </div>
            <div className="space-y-1 text-xs">
              {grant.prezzo_istruttoria && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Prezzo istruttoria:</span>
                  <span className="text-white font-bold">{grant.prezzo_istruttoria.toLocaleString('it-IT')} €</span>
                </div>
              )}
              {grant.percentuale_erogazione && (
                <div className="flex justify-between">
                  <span className="text-slate-400">% su erogazione:</span>
                  <span className="text-white font-bold">{grant.percentuale_erogazione}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Button
            size="sm"
            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
            onClick={() => onDetails(grant)}
          >
            Dettagli completi
          </Button>
          {grant.website_url && (
            <Button
              size="sm"
              variant="outline"
              className="w-full border-blue-500 text-blue-400 text-xs hover:bg-blue-500/10"
              onClick={() => window.open(grant.website_url, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">Link ufficiale bando</span>
            </Button>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className={`flex-1 ${userInterest?.wants_alerts ? 'bg-lime-400 hover:bg-lime-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600 text-white'} text-[10px] px-2 h-8`}
                onClick={onToggleAlerts}
              >
                {userInterest?.wants_alerts ? <Bell className="w-3 h-3 mr-1 flex-shrink-0" /> : <BellOff className="w-3 h-3 mr-1 flex-shrink-0" />}
                <span className="truncate">Avviso 60/30 gg</span>
              </Button>
              <InfoTooltip 
                title="Avvisi scadenza" 
                description="Attivando questa opzione riceverai una notifica automatica via email 60 e 30 giorni prima della scadenza del bando, così non perderai l'opportunità di presentare la domanda in tempo."
              />
            </div>
            
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 h-8"
              onClick={onRequestConsultation}
              disabled={userInterest?.requested_consultation}
            >
              <Briefcase className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{userInterest?.requested_consultation ? 'Richiesto' : 'Consulenza'}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}