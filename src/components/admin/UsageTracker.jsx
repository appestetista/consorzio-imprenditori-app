import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Search, FileText, MessageSquare, Mail, TrendingUp, DollarSign } from 'lucide-react';

// Prezzi GPT-4o-mini (USD per 1M token)
const OPENAI_PRICES = {
  input: 0.15 / 1000000,  // $0.15 per 1M token
  output: 0.60 / 1000000  // $0.60 per 1M token
};

// Stima token per analisi contratto (media)
const ESTIMATED_TOKENS_PER_ANALYSIS = {
  input: 3500,  // PDF content + prompt
  output: 1500  // Risposta strutturata
};

export default function UsageTracker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('cost');

  // Fetch tutti i dati necessari per calcolare l'utilizzo
  const { data: usageData, isLoading } = useQuery({
    queryKey: ['usage-tracker'],
    queryFn: async () => {
      const [users, consultants, contractAnalyses, messages, consultationBookings, usageLogs] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Consultant.list(),
        base44.entities.ContractAnalysis.list(),
        base44.entities.Message.list(),
        base44.entities.ConsultationBooking.list(),
        base44.entities.UsageLog.list()
      ]);

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
          // Stima basata sul numero di analisi
          totalInputTokens = userAnalyses.length * ESTIMATED_TOKENS_PER_ANALYSIS.input;
          totalOutputTokens = userAnalyses.length * ESTIMATED_TOKENS_PER_ANALYSIS.output;
          totalCostUsd = (totalInputTokens * OPENAI_PRICES.input) + (totalOutputTokens * OPENAI_PRICES.output);
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
          costEur: totalCostUsd * 0.92 // Conversione approssimativa
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

      return [...userUsage, ...consultantUsage];
    }
  });

  // Filtra e ordina
  const filteredData = (usageData || [])
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

  // Statistiche totali
  const totals = (usageData || []).reduce((acc, item) => ({
    analyses: acc.analyses + item.analyses,
    messages: acc.messages + item.messagesSent,
    consultations: acc.consultations + item.consultations,
    costEur: acc.costEur + (item.costEur || 0),
    inputTokens: acc.inputTokens + (item.inputTokens || 0),
    outputTokens: acc.outputTokens + (item.outputTokens || 0)
  }), { analyses: 0, messages: 0, consultations: 0, costEur: 0, inputTokens: 0, outputTokens: 0 });

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