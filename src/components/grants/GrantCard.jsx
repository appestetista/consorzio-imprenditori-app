import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Euro, TrendingUp, ExternalLink, Zap, CheckCircle2, Bell, BellOff, Briefcase, Sparkles, Building2, HelpCircle, Users, X } from 'lucide-react';
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

export default function GrantCard({ grant, onDetails, userInterest, onToggleAlerts, onRequestConsultation, aiRecommendation, isTopRecommended, userProfile }) {
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

  return (
    <Card className={`bg-slate-800 border-slate-700 hover:border-lime-400/50 transition-colors ${
      isTopRecommended ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getGrantTypeIcon(grant.grant_type)}</span>
              {grant.easy_access && (
                <Badge className="bg-lime-400 text-slate-900 font-bold">
                  <Zap className="w-3 h-3 mr-1" />
                  Attivabile Subito
                </Badge>
              )}
            </div>
            <CardTitle className="text-white text-lg">{grant.title}</CardTitle>
            {/* Ente erogatore in evidenza - SEMPRE VISIBILE */}
            <div className="bg-orange-500/20 border border-orange-500/50 rounded-md px-2.5 py-1.5 mt-2 inline-flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 text-sm font-bold">
                Ente Erogatore: {grant.ente_erogatore || 'Non specificato'}
              </span>
              {grant.livello && (
                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">{grant.livello}</Badge>
              )}
              <InfoTooltip 
                title="Ente Erogatore" 
                description="È l'ente pubblico che gestisce e finanzia il bando. Può essere l'Unione Europea (UE), lo Stato italiano, una Regione o un altro ente pubblico."
              />
            </div>
            {aiRecommendation && aiRecommendation.score >= 75 && !isTopRecommended && (
              <Badge className="bg-purple-600 text-white border-0 text-xs mt-1">
                <Sparkles className="w-3 h-3 mr-1" />
                {aiRecommendation.score}% match
              </Badge>
            )}
          </div>
          <div className="text-right">
            <Badge className={`${getStatusColor(grant.status)} text-white`}>
              {grant.status}
            </Badge>
            {grant.created_date && (
              <p className="text-slate-500 text-xs mt-1">
                Inserito il {format(new Date(grant.created_date), 'd MMM yyyy', { locale: it })}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-slate-400 text-sm line-clamp-2">{grant.description}</p>
        {aiRecommendation && aiRecommendation.reason && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2">
            <p className="text-purple-300 text-xs flex items-start gap-2">
              <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{aiRecommendation.reason}</span>
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-lime-400/30 text-lime-400">
            {grant.grant_type}
          </Badge>
          <Badge variant="outline" className="border-blue-400/30 text-blue-400">
            {grant.funding_type}
          </Badge>
        </div>

        <div className="space-y-2 text-sm bg-slate-900/50 rounded-lg p-3">
          {/* IMPORTO - sempre visibile */}
          <div className="flex items-center gap-2 text-slate-300">
            <Euro className="w-4 h-4 text-lime-400" />
            <span>
              <strong>Importo:</strong> {grant.min_amount && grant.max_amount 
                ? `${grant.min_amount.toLocaleString('it-IT')} - ${grant.max_amount.toLocaleString('it-IT')} €`
                : grant.max_amount 
                  ? `Fino a ${grant.max_amount.toLocaleString('it-IT')} €`
                  : 'Da definire'}
            </span>
            <InfoTooltip 
              title="Importo del contributo" 
              description="È l'ammontare minimo e massimo del finanziamento che puoi richiedere. L'importo effettivo dipende dal tuo progetto e dai requisiti del bando."
            />
          </div>

          {/* COPERTURA - sempre visibile */}
          <div className="flex items-center gap-2 text-slate-300">
            <TrendingUp className="w-4 h-4 text-lime-400" />
            <span>
              <strong>Copertura:</strong> {grant.coverage_percentage 
                ? `${grant.coverage_percentage}%` 
                : 'Da definire'}
            </span>
            <InfoTooltip 
              title="Percentuale di copertura" 
              description="È la percentuale delle spese ammissibili che viene coperta dal contributo. Ad esempio, se la copertura è 50% e investi 100.000€, riceverai 50.000€ di contributo."
            />
          </div>
          
          {/* SCADENZA - sempre visibile */}
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className="w-4 h-4 text-lime-400" />
            <span>
              <strong>Scadenza:</strong> {grant.deadline && !isNaN(new Date(grant.deadline).getTime())
                ? format(new Date(grant.deadline), 'd MMMM yyyy', { locale: it })
                : 'A esaurimento fondi'}
            </span>
            <InfoTooltip 
              title="Scadenza del bando" 
              description="È la data entro cui devi presentare la domanda. 'A esaurimento fondi' significa che il bando rimane aperto finché ci sono risorse disponibili."
            />
          </div>

          {/* REQUISITI DI ACCESSO - con verifica profilo utente */}
          <div className="flex items-start gap-2 text-slate-300">
            <Users className="w-4 h-4 text-lime-400 mt-0.5" />
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
            <CheckCircle2 className="w-4 h-4" />
            <span>
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
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
              onClick={() => onDetails(grant)}
            >
              Dettagli
            </Button>
            {grant.website_url && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300"
                onClick={() => window.open(grant.website_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className={`flex-1 ${userInterest?.wants_alerts ? 'border-lime-400 text-lime-400' : 'border-slate-600 text-slate-300'}`}
              onClick={onToggleAlerts}
            >
              {userInterest?.wants_alerts ? <Bell className="w-4 h-4 mr-1" /> : <BellOff className="w-4 h-4 mr-1" />}
              {userInterest?.wants_alerts ? 'Avvisi attivi' : 'Attiva avvisi'}
            </Button>
            
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onRequestConsultation}
              disabled={userInterest?.requested_consultation}
            >
              <Briefcase className="w-4 h-4 mr-1" />
              {userInterest?.requested_consultation ? 'Richiesta inviata' : 'Richiedi consulenza'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}