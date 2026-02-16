import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingDown, Lightbulb, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

export default function SimulazioneResult({ result, onNewScenario }) {
  const [analisiLoading, setAnalisiLoading] = useState(false);
  const [analisi, setAnalisi] = useState(null);
  const [dettaglioOpen, setDettaglioOpen] = useState(false);

  if (!result?.success) {
    return (
      <Card className="bg-red-900/30 border-red-800">
        <CardContent className="p-4">
          <p className="text-red-300 text-sm">{result?.error || 'Errore nel calcolo'}</p>
        </CardContent>
      </Card>
    );
  }

  const formatEuro = (n) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
  };

  const handleAnalisiAI = async () => {
    setAnalisiLoading(true);
    const response = await base44.functions.invoke('analisiAIFiscale', {
      simulazione_id: result.simulazione_id
    });
    setAnalisi(response.data?.analisi || 'Errore nella generazione dell\'analisi');
    setAnalisiLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Avvisi */}
      {result.avvisi?.length > 0 && result.avvisi.map((avviso, i) => (
        <Card key={i} className="bg-yellow-900/20 border-yellow-600/40">
          <CardContent className="p-3 flex items-start gap-2">
            <span className="text-yellow-400 text-sm flex-shrink-0">⚠️</span>
            <p className="text-yellow-300 text-xs">{avviso}</p>
          </CardContent>
        </Card>
      ))}

      {/* Tax Rate Semaforo */}
      {(() => {
        const taxRate = result.tax_rate_effettivo || 0;
        const semaforoColor = taxRate < 30 ? '#22c55e' : taxRate <= 45 ? '#eab308' : '#ef4444';
        const semaforoLabel = taxRate < 30 ? 'Efficiente' : taxRate <= 45 ? 'Attenzione' : 'Critico';
        const semaforoBg = taxRate < 30 ? 'border-green-500/50' : taxRate <= 45 ? 'border-yellow-500/50' : 'border-red-500/50';
        return (
          <Card className={`bg-[#0a2540] ${semaforoBg} border-2`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs mb-1">Tax Rate su Utile</p>
                <p className="text-white font-bold text-2xl">{taxRate}%</p>
                <p className="text-xs mt-1" style={{ color: semaforoColor }}>{semaforoLabel}</p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full ${taxRate > 45 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-red-900/40'}`} />
                <div className={`w-5 h-5 rounded-full ${taxRate >= 30 && taxRate <= 45 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.6)]' : 'bg-yellow-900/40'}`} />
                <div className={`w-5 h-5 rounded-full ${taxRate < 30 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-green-900/40'}`} />
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* KPI principali */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#0a2540] border-[#1a3a5c]">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Utile</p>
            <p className="text-white font-bold text-lg">{formatEuro(result.utile)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a2540] border-green-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Netto Finale</p>
            <p className="text-green-400 font-bold text-lg">{formatEuro(result.netto_finale)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasse separate: societarie / personali / contributi */}
      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-4 space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Dettaglio Imposte</p>
          {(result.tasse_societarie > 0) && (
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Imposte società (IRES + IRAP)</span>
              <span className="text-red-400 font-semibold text-sm">{formatEuro(result.tasse_societarie)}</span>
            </div>
          )}
          {(result.tasse_personali > 0) && (
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Imposte personali socio/amm.</span>
              <span className="text-red-400 font-semibold text-sm">{formatEuro(result.tasse_personali)}</span>
            </div>
          )}
          {(result.contributi_pure > 0) && (
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Contributi INPS (amm.re)</span>
              <span className="text-yellow-400 font-semibold text-sm">{formatEuro(result.contributi_pure)}</span>
            </div>
          )}
          <div className="border-t border-slate-700 pt-2 flex justify-between items-center">
            <span className="text-white text-sm font-semibold">Totale</span>
            <span className="text-red-400 font-bold text-sm">{formatEuro(result.imposte_totali)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Pressione fiscale doppia */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#0a2540] border-[#1a3a5c]">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Press. su fatturato</p>
            <p className="text-[#d4af37] font-bold text-lg">{result.pressione_fiscale}%</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a2540] border-[#1a3a5c]">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Press. su utile</p>
            <p className="text-[#d4af37] font-bold text-lg">{result.tax_rate_effettivo}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafico Torta Distribuzione */}
      {(() => {
        const imposte = result.imposte_pure || 0;
        const contributi = result.contributi_pure || 0;
        const netto = result.netto_finale || 0;
        const totale = imposte + contributi + netto;
        if (totale <= 0) return null;
        const data = [
          { name: 'Imposte', value: imposte, color: '#ef4444' },
          { name: 'Contributi', value: contributi, color: '#f59e0b' },
          { name: 'Netto', value: netto, color: '#22c55e' },
        ].filter(d => d.value > 0);

        const renderLabel = ({ name, percent }) => `${(percent * 100).toFixed(1)}%`;

        return (
          <Card className="bg-[#0a2540] border-[#1a3a5c]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 text-xs">Distribuzione</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderLabel}
                    stroke="none"
                  >
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value, entry) => {
                      const item = data.find(d => d.name === value);
                      return <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}: {formatEuro(item?.value || 0)}</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* Dettaglio calcolo */}
      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-0">
          <button
            onClick={() => setDettaglioOpen(!dettaglioOpen)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <span className="text-white text-sm font-medium">Dettaglio calcolo</span>
            {dettaglioOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {dettaglioOpen && (
            <div className="px-4 pb-4 border-t border-slate-800 pt-3">
              <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                {result.dettaglio_calcolo}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottoni azione */}
      <div className="flex gap-3">
        <button
          onClick={onNewScenario}
          className="flex-1 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
        >
          Nuovo Scenario
        </button>
        <button
          onClick={handleAnalisiAI}
          disabled={analisiLoading}
          className="flex-1 h-10 rounded-xl bg-[#1a3a5c] hover:bg-[#224b73] text-[#d4af37] text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {analisiLoading ? 'Analisi...' : 'Analisi AI'}
        </button>
      </div>

      {/* Analisi AI */}
      {analisiLoading && (
        <Card className="bg-[#0a2540] border-[#1a3a5c]">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4af37] mx-auto mb-3"></div>
            <p className="text-slate-300 text-sm">Analisi AI in corso...</p>
          </CardContent>
        </Card>
      )}

      {analisi && !analisiLoading && (
        <Card className="bg-[#0a2540] border-[#d4af37]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-[#d4af37]" />
              <span className="text-[#d4af37] font-medium text-sm">Analisi AI</span>
            </div>
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown className="text-slate-300 text-sm leading-relaxed">
                {analisi}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-slate-600 text-[10px] text-center">
        Simulazione a scopo informativo, non sostituisce consulenza fiscale professionale.
      </p>
    </div>
  );
}