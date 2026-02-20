import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, RotateCcw, Package } from 'lucide-react';

export default function HSCodeClassifier({ productDescription, onConfirm, onError }) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [error, setError] = useState(null);

  const classify = async () => {
    if (!productDescription?.trim()) return;
    setLoading(true);
    setError(null);
    setCandidates(null);
    setSelectedCode(null);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un classificatore doganale. Dato il seguente prodotto, restituisci ESATTAMENTE fino a 3 codici HS (Harmonized System) candidati a 6 cifre, con la descrizione ufficiale dalla nomenclatura combinata UE.

PRODOTTO: "${productDescription}"

REGOLE INDEROGABILI:
- Restituisci SOLO codici HS che esistono realmente nella nomenclatura combinata UE (Regolamento CE n. 2658/87 e successivi aggiornamenti).
- Per ogni codice indica la descrizione UFFICIALE dalla nomenclatura, NON una tua riformulazione.
- Se NON riesci a identificare NESSUN codice HS con ragionevole certezza, restituisci un array vuoto in "codici" e scrivi il motivo in "errore".
- Indica per ogni codice un livello di certezza: "alto" (corrispondenza precisa), "medio" (corrispondenza probabile), "basso" (corrispondenza incerta).
- NON INVENTARE codici HS. Meglio restituire 1 codice certo che 3 incerti.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          codici: {
            type: "array",
            items: {
              type: "object",
              properties: {
                hs_code: { type: "string", description: "Codice HS a 6 cifre" },
                descrizione_ufficiale: { type: "string", description: "Descrizione dalla nomenclatura combinata UE" },
                certezza: { type: "string", enum: ["alto", "medio", "basso"] },
                nota: { type: "string", description: "Nota aggiuntiva sulla classificazione" }
              }
            }
          },
          errore: { type: "string", description: "Motivo se nessun codice identificabile" }
        }
      }
    });

    setLoading(false);

    if (!result.codici || result.codici.length === 0) {
      const msg = result.errore || "Impossibile determinare codice HS. Specificare dettagli tecnici del prodotto.";
      setError(msg);
      if (onError) onError(msg);
      return;
    }

    const codes = result.codici.slice(0, 3);
    setCandidates(codes);
    // Auto-select if only one candidate
    if (codes.length === 1) {
      setSelectedCode(codes[0].hs_code);
    }
  };

  const handleConfirm = () => {
    console.log('[HSCodeClassifier] handleConfirm called, selectedCode:', selectedCode);
    if (!selectedCode) return;
    const chosen = candidates.find(c => c.hs_code === selectedCode);
    console.log('[HSCodeClassifier] chosen:', chosen);
    if (chosen && onConfirm) {
      onConfirm(chosen);
    }
  };

  const certezzaStyle = {
    alto: 'bg-green-500/20 text-green-400 border-green-500/30',
    medio: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    basso: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  // Stato iniziale: mostra bottone per avviare classificazione
  if (!loading && !candidates && !error) {
    return (
      <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm shadow-xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Classificazione Merceologica</h3>
              <p className="text-slate-500 text-xs">Identifica il codice doganale HS del prodotto</p>
            </div>
          </div>
          <button
            type="button"
            onClick={classify}
            disabled={!productDescription?.trim()}
            className={`w-full h-12 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              productDescription?.trim()
                ? 'bg-lime-400 hover:bg-lime-300 text-black shadow-lg shadow-lime-400/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Identifica Codice HS
          </button>
        </CardContent>
      </Card>
    );
  }

  // Loading
  if (loading) {
    return (
      <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 justify-center py-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            </div>
            <p className="text-slate-400 text-sm">Classificazione in corso...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Errore: nessun codice identificato
  if (error) {
    return (
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-semibold text-sm">Classificazione non riuscita</h3>
              <p className="text-red-200/80 text-xs mt-1">{error}</p>
            </div>
          </div>
          <Button
            onClick={classify}
            variant="outline"
            className="w-full mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Riprova
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Codici candidati disponibili
  return (
    <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm shadow-xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Seleziona codice HS</h3>
            <p className="text-slate-500 text-xs">Conferma prima di procedere</p>
          </div>
        </div>

        <div className="space-y-2">
          {candidates.map((c) => (
            <button
              key={c.hs_code}
              onClick={() => setSelectedCode(c.hs_code)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedCode === c.hs_code
                  ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
                  : 'bg-white/[0.03] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-mono font-bold text-sm">{c.hs_code}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${certezzaStyle[c.certezza] || certezzaStyle.basso}`}>
                  {c.certezza === 'alto' ? 'Alta' : c.certezza === 'medio' ? 'Media' : 'Bassa'}
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">{c.descrizione_ufficiale}</p>
              {c.nota && <p className="text-slate-600 text-[10px] mt-1 italic">{c.nota}</p>}
              {selectedCode === c.hs_code && (
                <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Selezionato
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => { setCandidates(null); setSelectedCode(null); setError(null); }}
            className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl border-2 border-slate-500 text-white font-bold text-sm bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reclassifica
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedCode}
            className={`flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              selectedCode 
                ? 'bg-lime-400 hover:bg-lime-300 text-black shadow-lg shadow-lime-400/30' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Conferma e Analizza
          </button>
        </div>
      </CardContent>
    </Card>
  );
}