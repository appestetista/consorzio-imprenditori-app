import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Search, FileText, MessageSquare, Mail, TrendingUp, DollarSign, Globe, Ship, Zap, Calendar } from 'lucide-react';

// ============================================
// PREZZI REALI AI (basati su OpenAI pricing 2024)
// ============================================

// GPT-4o (usato per analisi contratti con file/vision)
// Pricing: $2.50/1M input, $10.00/1M output
const GPT4O_PRICES = {
  input: 2.50 / 1000000,  
  output: 10.00 / 1000000  
};

// GPT-4o con web search (usato per import/export e ricerca bandi)
// Costo stimato per chiamata con add_context_from_internet: ~$0.03-0.08
// Include: token + ricerca web + elaborazione risultati
const GPT4O_WEB_SEARCH_COST_PER_CALL = 0.05; // USD medio per chiamata

// Stima token per analisi contratto PDF (media)
// Input: PDF ~3000-5000 token + prompt ~500 token
// Output: analisi strutturata ~1500-2000 token
const CONTRACT_ANALYSIS_TOKENS = {
  input: 4000,  
  output: 1800  
};

// Costo per singola analisi contratto (GPT-4o con vision)
const CONTRACT_ANALYSIS_COST_USD = 
  (CONTRACT_ANALYSIS_TOKENS.input * GPT4O_PRICES.input) + 
  (CONTRACT_ANALYSIS_TOKENS.output * GPT4O_PRICES.output);
// = (4000 * 0.0000025) + (1800 * 0.00001) = 0.01 + 0.018 = ~$0.028 per analisi

// Numero fonti scansionate per ricerca bandi settimanale
const GRANT_SOURCES_COUNT = 28;

// Tasso cambio EUR/USD approssimativo
const EUR_USD_RATE = 0.92;

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
        
        // Costo REALE basato sul numero di analisi contratti effettuate
        // Ogni analisi contratto usa GPT-4o con vision (~$0.028)
        const contractsCostUsd = userAnalyses.length * CONTRACT_ANALYSIS_COST_USD;
        
        // Token stimati per riferimento
        const totalInputTokens = userAnalyses.length * CONTRACT_ANALYSIS_TOKENS.input;
        const totalOutputTokens = userAnalyses.length * CONTRACT_ANALYSIS_TOKENS.output;

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
          costUsd: contractsCostUsd,
          costEur: contractsCostUsd * EUR_USD_RATE
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

      // ============================================
      // COSTI DI SISTEMA (operazioni automatiche/schedulate)
      // ============================================
      
      // Conta bandi creati automaticamente dal sistema
      const grantsCreatedBySystem = grants.filter(g => 
        !g.created_by_email || 
        g.created_by_email === 'system@scheduled' || 
        g.created_by_email === 'system@auto-import'
      ).length;
      
      // RICERCA BANDI SETTIMANALE (scheduledGrantFetch + fetchGrantsFromIncentivi)
      // Ogni lunedì: ~28 siti scansionati, ogni sito = 1 chiamata AI con web search
      // Calcola settimane trascorse dall'inizio (approssimativo)
      const oldestGrant = grants.reduce((min, g) => {
        const d = new Date(g.created_date);
        return d < min ? d : min;
      }, new Date());
      const weeksSinceStart = Math.max(1, Math.ceil((new Date() - oldestGrant) / (7 * 24 * 60 * 60 * 1000)));
      const grantSearchCallsTotal = weeksSinceStart * GRANT_SOURCES_COUNT;
      const grantSearchCostUsd = grantSearchCallsTotal * GPT4O_WEB_SEARCH_COST_PER_CALL;
      
      // ARRICCHIMENTO BANDI (enrichExistingGrants)
      // Ogni bando incompleto viene arricchito con 1 chiamata AI + web search
      const grantsNeedingEnrichment = grants.filter(g => 
        (!g.min_amount && !g.max_amount) || !g.coverage_percentage || !g.website_url
      ).length;
      // Stima: ~50% dei bandi sono stati arricchiti
      const estimatedEnrichments = Math.ceil(grantsNeedingEnrichment * 0.5);
      const grantEnrichmentCostUsd = estimatedEnrichments * GPT4O_WEB_SEARCH_COST_PER_CALL;

      // IMPORT/EXPORT ANALISI
      // Ogni analisi Import o Export = 1 chiamata AI con web search
      // Non contiamo i messaggi, ma le analisi effettuate (stimate dal comportamento utente)
      // Stima: 1 analisi ogni 2 messaggi import_export (alcuni messaggi sono follow-up)
      const importExportAnalysisCount = Math.ceil(importExportMessages.length / 2);
      const importExportCostUsd = importExportAnalysisCount * GPT4O_WEB_SEARCH_COST_PER_CALL;

      const systemCosts = {
        grantSearch: grantSearchCostUsd,
        grantSearchCalls: grantSearchCallsTotal,
        grantEnrichment: grantEnrichmentCostUsd,
        grantEnrichmentCalls: estimatedEnrichments,
        importExport: importExportCostUsd,
        importExportCalls: importExportAnalysisCount,
        total: grantSearchCostUsd + grantEnrichmentCostUsd + importExportCostUsd,
        weeksSinceStart
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
  const totalPlatformCostEur = userTotals.costEur + (systemCosts.total * EUR_USD_RATE);

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
          Monitoraggio Utilizzo AI
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* COSTO TOTALE PIATTAFORMA */}
        <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/30 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-bold">COSTO TOTALE AI</span>
            </div>
            <span className="text-green-400 font-black text-2xl">€{totalPlatformCostEur.toFixed(2)}</span>
          </div>
          
          {/* Breakdown costi dettagliato */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <FileText className="w-3 h-3" />
                Analisi Contratti
              </div>
              <span className="text-white font-semibold">€{userTotals.costEur.toFixed(2)}</span>
              <p className="text-slate-500 text-[10px]">{userTotals.analyses} analisi × ~€0.026</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <Calendar className="w-3 h-3" />
                Ricerca Bandi
              </div>
              <span className="text-white font-semibold">€{(systemCosts.grantSearch * EUR_USD_RATE).toFixed(2)}</span>
              <p className="text-slate-500 text-[10px]">{systemCosts.grantSearchCalls || 0} chiamate ({systemCosts.weeksSinceStart || 0} sett)</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <Globe className="w-3 h-3" />
                Arricchimento Bandi
              </div>
              <span className="text-white font-semibold">€{(systemCosts.grantEnrichment * EUR_USD_RATE).toFixed(2)}</span>
              <p className="text-slate-500 text-[10px]">~{systemCosts.grantEnrichmentCalls || 0} bandi arricchiti</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <Ship className="w-3 h-3" />
                Import/Export AI
              </div>
              <span className="text-white font-semibold">€{(systemCosts.importExport * EUR_USD_RATE).toFixed(2)}</span>
              <p className="text-slate-500 text-[10px]">~{systemCosts.importExportCalls || 0} analisi</p>
            </div>
          </div>
          
          {/* Nota metodologia */}
          <p className="text-slate-500 text-[9px] mt-2 leading-tight">
            💡 Costi stimati: Contratti = GPT-4o vision (~$0.028/analisi), Web search = GPT-4o + internet (~$0.05/chiamata)
          </p>
        </div>

        {/* Statistiche attività utenti */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <FileText className="w-4 h-4 text-lime-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{userTotals.analyses}</p>
            <p className="text-slate-400 text-[10px]">Analisi</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <MessageSquare className="w-4 h-4 text-lime-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{userTotals.messages}</p>
            <p className="text-slate-400 text-[10px]">Messaggi</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <Mail className="w-4 h-4 text-lime-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{userTotals.consultations}</p>
            <p className="text-slate-400 text-[10px]">Consulenze</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <Globe className="w-4 h-4 text-lime-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{stats.totalGrants}</p>
            <p className="text-slate-400 text-[10px]">Bandi</p>
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