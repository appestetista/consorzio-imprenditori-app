import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Euro, TrendingUp, ExternalLink, Zap, CheckCircle2, Bell, BellOff, Briefcase, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function GrantCard({ grant, onDetails, userInterest, onToggleAlerts, onRequestConsultation, aiRecommendation, isTopRecommended }) {
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
            {aiRecommendation && aiRecommendation.score >= 75 && !isTopRecommended && (
              <Badge className="bg-purple-600 text-white border-0 text-xs mt-1">
                <Sparkles className="w-3 h-3 mr-1" />
                {aiRecommendation.score}% match
              </Badge>
            )}
          </div>
          <Badge className={`${getStatusColor(grant.status)} text-white`}>
            {grant.status}
          </Badge>
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

        <div className="space-y-2 text-sm">
          {grant.coverage_percentage && (
            <div className="flex items-center gap-2 text-slate-300">
              <TrendingUp className="w-4 h-4 text-lime-400" />
              <span>Copertura: {grant.coverage_percentage}%</span>
            </div>
          )}
          
          {grant.min_amount && grant.max_amount && (
            <div className="flex items-center gap-2 text-slate-300">
              <Euro className="w-4 h-4 text-lime-400" />
              <span>
                {grant.min_amount.toLocaleString('it-IT')} - {grant.max_amount.toLocaleString('it-IT')} €
              </span>
            </div>
          )}
          
          {grant.deadline && (
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-lime-400" />
              <span>Scadenza: {format(new Date(grant.deadline), 'd MMMM yyyy', { locale: it })}</span>
            </div>
          )}

          {!grant.requires_cofinancing && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Nessun cofinanziamento richiesto</span>
            </div>
          )}
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