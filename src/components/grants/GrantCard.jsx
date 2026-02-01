import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Euro, TrendingUp, ExternalLink, Zap, Bell, BellOff, Briefcase, Sparkles, Building2, Info, ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function GrantCard({ grant, onDetails, userInterest, onToggleAlerts, onRequestConsultation, aiRecommendation, isTopRecommended, userProfile, isAdmin = false }) {
  const [expanded, setExpanded] = useState(false);

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

  // Calcola giorni alla scadenza
  const daysToDeadline = grant.deadline ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isUrgent = daysToDeadline !== null && daysToDeadline <= 30 && daysToDeadline > 0;

  return (
    <Card className={`bg-slate-800 border-slate-700 overflow-hidden transition-all ${
      isTopRecommended ? 'ring-2 ring-purple-500/50' : ''
    } ${isUrgent ? 'border-l-4 border-l-orange-500' : ''}`}>
      {/* Header compatto */}
      <div className="p-4 pb-3">
        {/* Riga superiore: icona + titolo + status */}
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">{getGrantTypeIcon(grant.grant_type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className={`${getStatusColor(grant.status)} text-white text-[10px]`}>
                {grant.status}
              </Badge>
              {grant.easy_access && (
                <Badge className="bg-lime-400 text-slate-900 font-bold text-[10px]">
                  <Zap className="w-3 h-3 mr-0.5" />
                  Subito
                </Badge>
              )}
              {isAdmin && grant.confidence_level && (
                <Badge className={`text-[10px] ${
                  grant.confidence_level === 'alto' ? 'bg-green-600' :
                  grant.confidence_level === 'medio' ? 'bg-yellow-600' : 'bg-red-600'
                } text-white`}>
                  {grant.confidence_level === 'alto' && <ShieldCheck className="w-3 h-3 mr-0.5" />}
                  {grant.confidence_level === 'medio' && <ShieldQuestion className="w-3 h-3 mr-0.5" />}
                  {grant.confidence_level === 'basso' && <ShieldAlert className="w-3 h-3 mr-0.5" />}
                  {grant.confidence_level}
                </Badge>
              )}
            </div>
            <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">{grant.title}</h3>
          </div>
        </div>

        {/* Info essenziali in formato compatto */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {/* Ente */}
          <div className="flex items-center gap-1.5 text-orange-300">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate font-medium">{grant.ente_erogatore} • {grant.livello}</span>
          </div>
          
          {/* Scadenza */}
          <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-orange-400 font-bold' : 'text-slate-400'}`}>
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {grant.deadline && !isNaN(new Date(grant.deadline).getTime())
                ? (isUrgent ? `${daysToDeadline}gg` : format(new Date(grant.deadline), 'd MMM', { locale: it }))
                : 'Esaurimento'}
            </span>
          </div>

          {/* Importo */}
          <div className="flex items-center gap-1.5 text-lime-400">
            <Euro className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate font-medium">
              {grant.max_amount 
                ? `${(grant.max_amount / 1000).toFixed(0)}k€`
                : 'N/D'}
            </span>
          </div>

          {/* Copertura */}
          <div className="flex items-center gap-1.5 text-blue-400">
            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {grant.coverage_percentage ? `${grant.coverage_percentage}%` : 'N/D'}
            </span>
          </div>
        </div>

        {/* AI Recommendation badge */}
        {aiRecommendation && aiRecommendation.score >= 75 && (
          <div className="mt-2 bg-purple-500/10 border border-purple-500/30 rounded px-2 py-1">
            <p className="text-purple-300 text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Match {aiRecommendation.score}%
            </p>
          </div>
        )}

        {/* Admin notes */}
        {isAdmin && grant.extraction_notes && (
          <div className="mt-2 bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1">
            <p className="text-orange-300 text-[10px] flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{grant.extraction_notes}</span>
            </p>
          </div>
        )}
      </div>

      {/* Sezione espandibile */}
      {expanded && (
        <CardContent className="pt-0 pb-3 px-4 space-y-3 border-t border-slate-700">
          {/* Descrizione */}
          <p className="text-slate-400 text-sm">{grant.description}</p>

          {/* Badges tipologia */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-lime-400/30 text-lime-400 text-[10px]">
              {grant.grant_type}
            </Badge>
            <Badge variant="outline" className="border-blue-400/30 text-blue-400 text-[10px]">
              {grant.funding_type}
            </Badge>
            {!grant.requires_cofinancing && (
              <Badge variant="outline" className="border-green-400/30 text-green-400 text-[10px]">
                No cofinanziamento
              </Badge>
            )}
          </div>

          {/* Dettagli importo */}
          <div className="bg-slate-900/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Importo:</span>
              <span className="text-white">
                {grant.min_amount && grant.max_amount 
                  ? `${grant.min_amount.toLocaleString('it-IT')} - ${grant.max_amount.toLocaleString('it-IT')} €`
                  : grant.max_amount 
                    ? `Fino a ${grant.max_amount.toLocaleString('it-IT')} €`
                    : 'Da definire'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Copertura:</span>
              <span className="text-lime-400 font-medium">
                {grant.coverage_percentage ? `${grant.coverage_percentage}%` : 'Da definire'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Scadenza:</span>
              <span className={isUrgent ? 'text-orange-400 font-bold' : 'text-white'}>
                {grant.deadline && !isNaN(new Date(grant.deadline).getTime())
                  ? format(new Date(grant.deadline), 'd MMMM yyyy', { locale: it })
                  : 'A esaurimento fondi'}
              </span>
            </div>
            {grant.eligible_regions?.length > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">Regioni:</span>
                <span className="text-white text-right text-xs">
                  {grant.eligible_regions.length > 3 
                    ? `${grant.eligible_regions.slice(0, 3).join(', ')}...` 
                    : grant.eligible_regions.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Costi consulenza se presenti */}
          {(grant.prezzo_istruttoria || grant.percentuale_erogazione) && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-400 font-medium text-xs">Costi consulenza</span>
              </div>
              <div className="flex gap-4 text-xs">
                {grant.prezzo_istruttoria && (
                  <span className="text-slate-300">Istruttoria: <strong className="text-white">{grant.prezzo_istruttoria}€</strong></span>
                )}
                {grant.percentuale_erogazione && (
                  <span className="text-slate-300">Success: <strong className="text-white">{grant.percentuale_erogazione}%</strong></span>
                )}
              </div>
            </div>
          )}

          {/* Link ufficiale */}
          {grant.website_url && (
            <a 
              href={grant.website_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="underline truncate">Vai al bando ufficiale</span>
            </a>
          )}
        </CardContent>
      )}

      {/* Footer con azioni */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          {/* Pulsante espandi/comprimi */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white h-8 px-2"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="text-xs ml-1">{expanded ? 'Meno' : 'Più info'}</span>
          </Button>

          <div className="flex-1" />

          {/* Azioni rapide */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleAlerts}
            className={`h-8 w-8 p-0 ${userInterest?.wants_alerts ? 'text-lime-400' : 'text-slate-500 hover:text-slate-300'}`}
            title={userInterest?.wants_alerts ? 'Avvisi attivi' : 'Attiva avvisi'}
          >
            {userInterest?.wants_alerts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>

          <Button
            size="sm"
            onClick={onRequestConsultation}
            disabled={userInterest?.requested_consultation}
            className={`h-8 text-xs ${
              userInterest?.requested_consultation 
                ? 'bg-slate-600 text-slate-400' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 mr-1" />
            {userInterest?.requested_consultation ? 'Richiesto' : 'Consulenza'}
          </Button>

          <Button
            size="sm"
            onClick={() => onDetails(grant)}
            className="bg-lime-400 hover:bg-lime-500 text-slate-900 h-8 text-xs font-semibold"
          >
            Dettagli
          </Button>
        </div>
      </div>
    </Card>
  );
}