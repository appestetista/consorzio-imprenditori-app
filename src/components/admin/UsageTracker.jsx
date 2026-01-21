import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Search, FileText, MessageSquare, Mail, TrendingUp, DollarSign, Globe, Ship, Zap, Calendar } from 'lucide-react';

// Prezzi GPT-4o-mini (USD per 1M token) - usato per analisi contratti
const GPT4O_MINI_PRICES = {
  input: 0.15 / 1000000,  
  output: 0.60 / 1000000  
};

// Prezzi GPT-4o con web search (USD per chiamata) - usato per import/export e bandi
// Stima: ~$0.02-0.05 per chiamata con web search (più costoso)
const GPT4O_WEB_SEARCH_COST = 0.035; // USD per chiamata media

// Stima token per analisi contratto (media)
const ESTIMATED_TOKENS_PER_ANALYSIS = {
  input: 3500,  
  output: 1500  
};

// Costo stimato per chiamata AI (analisi contratti senza web)
const CONTRACT_ANALYSIS_COST = (ESTIMATED_TOKENS_PER_ANALYSIS.input * GPT4O_MINI_PRICES.input) + 
                                (ESTIMATED_TOKENS_PER_ANALYSIS.output * GPT4O_MINI_PRICES.output);

// Numero di siti scansionati per ricerca bandi
const GRANT_SOURCES_COUNT = 28;

export default function UsageTracker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('cost');

  // Fetch tutti i dati necessari per calcolare l'utilizzo
  const { data: usageData, isLoading } = useQuery({
    queryKey: ['usage-tracker'],
    queryFn: async () => {
      const [users, consultants, contractAnalyses, messages, consultationBookings, usageLogs, grants] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Consultant.list(),
        base44.entities.ContractAnalysis.list(),
        base44.entities.Message.list(),
        base44.entities.ConsultationBooking.list(),
        base44.entities.UsageLog.list(),
        base44.entities.FinancialGrant.list()
      ]);

      // Conta messaggi import/export (usano AI con web search)
      const importExportMessages = messages.filter(m => m.source === 'import_export');

      // Calcola utilizzo per utenti
      const userUsage = users.map(user => {
        const userAnalyses = contractAnalyses.filter(a => a.user_email === user.email);
        const userMessagesSent = messages.filter(m => m.from_email === user.email);
        const userMessagesReceived = messages.filter(m => m.to_email === user.email);
        const userConsultations = consultationBookings.filter(b => b.user_email === user.email);
        
        // Calcola costi da UsageLog se esistono, altrimenti stima
        const userLogs = usageLogs.filter(l => l.user_email === user.email);
        let totalCostUsd = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        
        if (userLogs.length > 0) {
          totalCostUsd = userLogs.reduce((sum, l) => sum + (l.cost_usd || 0), 0);
          totalInputTokens = userLogs.reduce((sum, l) => sum + (l.input_tokens || 0), 0);
          totalOutputTokens = userLogs.reduce((sum, l) => sum + (l.output_tokens || 0), 0);
        } else {
          // Stima basata sul numero di analisi contratti
          totalInputTokens = userAnalyses.length * ESTIMATED_TOKENS_PER_ANALYSIS.input;
          totalOutputTokens = userAnalyses.length * ESTIMATED_TOKENS_PER_ANALYSIS.output;
          totalCostUsd = userAnalyses.length * CONTRACT_ANALYSIS_COST;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.company_name || user.full_name || user.email,
          type: 'utente',
          analyses: userAnalyses.length,
          messagesSent: userMessagesSent.length,
          messagesReceived: userMessagesReceived.length,
          consultations: userConsultations.length,
          total: userAnalyses.length + userMessagesSent.length + userConsultations.length,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          costUsd: totalCostUsd,
          costEur: totalCostUsd * 0.92
        };
      });

      // Calcola utilizzo per consulenti
      const consultantUsage = consultants.map(consultant => {
        const consultantMessagesSent = messages.filter(m => m.from_email === consultant.email);
        const consultantMessagesReceived = messages.filter(m => m.to_email === consultant.email);
        const consultantBookings = consultationBookings.filter(b => b.consultant_id === consultant.id);

        return {
          id: consultant.id,
          email: consultant.email,
          name: consultant.name,
          type: 'consulente',
          category: consultant.category,
          analyses: 0,
          messagesSent: consultantMessagesSent.length,
          messagesReceived: consultantMessagesReceived.length,
          consultations: consultantBookings.length,
          total: consultantMessagesSent.length + consultantBookings.length,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          costEur: 0
        };
      });

      // Calcola costi di sistema (non attribuiti a utenti)
      // Bandi: ~28 chiamate AI con web search ogni lunedì
      const grantsCreatedBySystem = grants.filter(g => 
        g.created_by_email === 'system@scheduled' || g.created_by_email === 'system@auto-import'
      ).length;
      
      // Stima esecuzioni settimanali (assumiamo ~4 settimane di dati visibili)
      const estimatedWeeklyRuns = 4;
      const grantSearchCost = estimatedWeeklyRuns * GRANT_SOURCES_COUNT * GPT4O_WEB_SEARCH_COST;
      
      // Enrichment bandi (stima: 30% dei bandi vengono arricchiti)
      const estimatedEnrichments = Math.ceil(grantsCreatedBySystem * 0.3);
      const grantEnrichmentCost = estimatedEnrichments * GPT4O_WEB_SEARCH_COST;

      // Import/Export analisi (stima: ogni messaggio import_export ha generato 1 analisi AI)
      const importExportAnalysisCost = importExportMessages.length * GPT4O_WEB_SEARCH_COST;

      const systemCosts = {
        grantSearch: grantSearchCost,
        grantEnrichment: grantEnrichmentCost,
        importExport: importExportAnalysisCost,
        total: grantSearchCost + grantEnrichmentCost + importExportAnalysisCost
      };

      return { 
        users: [...userUsage, ...consultantUsage],
        systemCosts,
        stats: {
          totalGrants: grants.length,
          systemGrants: grantsCreatedBySystem,
          importExportMessages: importExportMessages.length
        }
      };
    }
  });

  const userData = usageData?.users || [];
  const systemCosts = usageData?.systemCosts || { grantSearch: 0, grantEnrichment: 0, importExport: 0, total: 0 };
  const stats = usageData?.stats || { totalGrants: 0, systemGrants: 0, importExportMessages: 0 };

  // Filtra e ordina
  const filteredData = userData
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'analyses':
          return b.analyses - a.analyses;
        case 'messages':
          return (b.messagesSent + b.messagesReceived) - (a.messagesSent + a.messagesReceived);
        case 'consultations':
          return b.consultations - a.consultations;
        case 'cost':
          return b.costEur - a.costEur || b.analyses - a.analyses;
        case 'total':
        default:
          return b.costEur - a.costEur || b.analyses - a.analyses || b.total - a.total;
      }
    });

  // Statistiche utenti
  const userTotals = userData.reduce((acc, item) => ({
    analyses: acc.analyses + item.analyses,
    messages: acc.messages + item.messagesSent,
    consultations: acc.consultations + item.consultations,
    costEur: acc.costEur + (item.costEur || 0),
    inputTokens: acc.inputTokens + (item.inputTokens || 0),
    outputTokens: acc.outputTokens + (item.outputTokens || 0)
  }), { analyses: 0, messages: 0, consultations: 0, costEur: 0, inputTokens: 0, outputTokens: 0 });

  // Costo totale piattaforma (utenti + sistema)
  const totalPlatformCostEur = userTotals.costEur + (systemCosts.total * 0.92);

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <p className="text-slate-400 text-center">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-lime-400" />
          Monitoraggio Utilizzo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Statistiche totali */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <FileText className="w-4 h-4 text-lime-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{totals.analyses}</p>
            <p className="text-slate-400 text-[10px]">Analisi AI</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <MessageSquare className="w-4 h-4 text-lime-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{totals.messages}</p>
            <p className="text-slate-400 text-[10px]">Messaggi</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <Mail className="w-4 h-4 text-lime-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{totals.consultations}</p>
            <p className="text-slate-400 text-[10px]">Consulenze</p>
          </div>
          <div className="bg-green-900/50 rounded-lg p-2 text-center border border-green-500/30">
            <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-green-400 font-bold text-lg">€{totals.costEur.toFixed(2)}</p>
            <p className="text-green-400/70 text-[10px]">Costo AI</p>
          </div>
        </div>

        {/* Filtri */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-slate-900 border-slate-700 text-white text-xs h-8"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-28 bg-slate-900 border-slate-700 text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">Costo €</SelectItem>
              <SelectItem value="analyses">Analisi</SelectItem>
              <SelectItem value="total">Totale</SelectItem>
              <SelectItem value="messages">Messaggi</SelectItem>
              <SelectItem value="consultations">Consulenze</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista utilizzo */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredData.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-4">Nessun risultato</p>
          ) : (
            filteredData.map((item, index) => (
              <div key={item.id} className="bg-slate-900 rounded-lg p-2">
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs font-mono">#{index + 1}</span>
                      <p className="text-white text-sm font-medium truncate">{item.name}</p>
                    </div>
                    <p className="text-slate-400 text-xs truncate">{item.email}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.type === 'consulente' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {item.type === 'consulente' ? '👔 Consulente' : '👤 Utente'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-400">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-bold text-sm">€{item.costEur.toFixed(3)}</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">{item.analyses} analisi</p>
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] mt-1 flex-wrap">
                  <span className="text-slate-400">
                    <FileText className="w-3 h-3 inline mr-1" />
                    {item.analyses} analisi
                  </span>
                  {item.inputTokens > 0 && (
                    <span className="text-green-400/70">
                      ~{Math.round(item.inputTokens / 1000)}k token
                    </span>
                  )}
                  <span className="text-slate-400">
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                    {item.messagesSent} msg
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}