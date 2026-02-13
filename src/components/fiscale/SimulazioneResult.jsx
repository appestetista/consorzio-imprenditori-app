import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingDown, Lightbulb, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

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
      {/* Riepilogo */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#0a2540] border-[#1a3a5c]">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Utile</p>
            <p className="text-white font-bold text-lg">{formatEuro(result.utile)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a2540] border-red-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Imposte Totali</p>
            <p className="text-red-400 font-bold text-lg">{formatEuro(result.imposte_totali)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a2540] border-green-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Netto Finale</p>
            <p className="text-green-400 font-bold text-lg">{formatEuro(result.netto_finale)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a2540] border-[#1a3a5c]">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-xs mb-1">Pressione fiscale</p>
            <p className="text-[#d4af37] font-bold text-lg">{result.pressione_fiscale}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra visuale */}
      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-xs">Ripartizione</span>
          </div>
          <div className="w-full h-6 rounded-full overflow-hidden flex bg-slate-800">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${((result.netto_finale / (result.netto_finale + result.imposte_totali)) * 100).toFixed(1)}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${((result.imposte_totali / (result.netto_finale + result.imposte_totali)) * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-green-400 text-xs">Netto {((result.netto_finale / (result.netto_finale + result.imposte_totali)) * 100).toFixed(1)}%</span>
            <span className="text-red-400 text-xs">Imposte {((result.imposte_totali / (result.netto_finale + result.imposte_totali)) * 100).toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-slate-300 text-sm">ChatGPT sta interpretando i risultati...</p>
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