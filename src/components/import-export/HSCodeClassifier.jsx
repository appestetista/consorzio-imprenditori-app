import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, RotateCcw, Package } from 'lucide-react';

export default function HSCodeClassifier({ productDescription, onConfirm, onError, autoStart = false }) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [error, setError] = useState(null);
  const [lastClassified, setLastClassified] = useState(null);

  // Auto-start classification when productDescription changes and autoStart is true
  React.useEffect(() => {
    if (autoStart && productDescription?.trim() && productDescription !== lastClassified && !loading) {
      classify();
    }
  }, [productDescription, autoStart]);

  const classify = async () => {
    if (!productDescription?.trim()) return;
    setLoading(true);
    setError(null);
    setCandidates(null);
    setSelectedCode(null);
    setLastClassified(productDescription);

    try {
      // Prima chiamata: classificazione con ricerca web per codici HS reali
      let result;
      try {
        result = await base44.integrations.Core.InvokeLLM({
          prompt: `Sei un classificatore doganale esperto. Dato il seguente prodotto, restituisci fino a 3 codici HS (Harmonized System) candidati a 6 cifre.

PRODOTTO: "${productDescription}"

REGOLE INDEROGABILI:
- Restituisci SOLO codici HS che esistono realmente nella nomenclatura combinata UE (Regolamento CE n. 2658/87).
- Per ogni codice indica la descrizione UFFICIALE dalla nomenclatura combinata UE. 
- IMPORTANTE: Ogni codice HS ha una descrizione DIVERSA e SPECIFICA. NON ripetere la stessa descrizione per codici diversi.
- Se NON riesci a identificare NESSUN codice con ragionevole certezza, restituisci array vuoto in "codici" e scrivi il motivo in "errore".
- Indica per ogni codice un livello di certezza: "alto", "medio", "basso".
- NON INVENTARE codici HS. Meglio 1 codice certo che 3 incerti.
- Nella "nota" spiega brevemente cosa differenzia questo codice dagli altri candidati.
- DEVI SEMPRE restituire almeno 1 codice per prodotti comuni (pasta, olio, vino, macchinari, tessuti, ecc.)`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
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
      } catch (firstErr) {
        console.warn('[HSCodeClassifier] Primo tentativo fallito, retry senza web:', firstErr);
        // Fallback senza ricerca web
        result = await base44.integrations.Core.InvokeLLM({
          prompt: `Sei un classificatore doganale esperto. Dato il seguente prodotto, restituisci fino a 3 codici HS (Harmonized System) candidati a 6 cifre.

PRODOTTO: "${productDescription}"

Esempi noti: Pasta alimentare = 190219 o 190230. Olio d'oliva = 150910. Vino = 220421.

Restituisci SOLO codici HS reali a 6 cifre dalla nomenclatura combinata UE. Per ogni codice: descrizione ufficiale, certezza (alto/medio/basso), nota differenziante. DEVI restituire almeno 1 codice.`,
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
      }

      console.log('[HSCodeClassifier] LLM result:', JSON.stringify(result));

      // Gestione robusta: il risultato potrebbe essere wrappato in modi diversi
      let codici = result?.codici;
      if (!Array.isArray(codici)) codici = [];
      // Filtra codici validi (devono avere hs_code stringa non vuota)
      codici = codici.filter(c => c && typeof c.hs_code === 'string' && c.hs_code.trim().length >= 4);

      if (codici.length === 0) {
        const msg = result?.errore || "Impossibile determinare codice HS. Prova a specificare meglio il prodotto (es. 'pasta di semola secca' invece di 'pasta').";
        setError(msg);
        if (onError) onError(msg);
        return;
      }

      const codes = codici.slice(0, 3);
      setCandidates(codes);
      // Auto-confirm: select the highest-confidence code automatically
      const best = codes.find(c => c.certezza === 'alto') || codes[0];
      if (best) {
        setSelectedCode(best.hs_code);
        // Auto-confirm immediately
        if (onConfirm) {
          onConfirm(best);
        }
      }
    } catch (err) {
      console.error('[HSCodeClassifier] Errore LLM:', err);
      setError("Errore nella classificazione. Riprova tra qualche secondo.");
      if (onError) onError(err.message);
    } finally {
      setLoading(false);
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

  // Stato iniziale: se autoStart, non mostra nulla (parte da solo); altrimenti mostra bottone
  if (!loading && !candidates && !error) {
    if (autoStart) return null;
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
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-xs">Codice HS identificato</h3>
            <p className="text-slate-500 text-[10px]">Selezionato automaticamente — cambia se errato</p>
          </div>
        </div>

        <div className="space-y-2">
          {candidates.map((c) => (
            <button
              key={c.hs_code}
              onClick={() => {
                setSelectedCode(c.hs_code);
                if (onConfirm) onConfirm(c);
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedCode === c.hs_code
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-white/[0.03] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-mono font-bold text-sm">{c.hs_code}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${certezzaStyle[c.certezza] || certezzaStyle.basso}`}>
                    {c.certezza === 'alto' ? 'Alta' : c.certezza === 'medio' ? 'Media' : 'Bassa'}
                  </span>
                  {selectedCode === c.hs_code && <CheckCircle className="w-4 h-4 text-amber-400" />}
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">{c.descrizione_ufficiale}</p>
              {c.nota && <p className="text-slate-600 text-[10px] mt-1 italic">{c.nota}</p>}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={() => { setCandidates(null); setSelectedCode(null); setError(null); setLastClassified(null); }}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-600 text-slate-400 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Nessuno corretto? Reclassifica
          </button>
        </div>
      </CardContent>
    </Card>
  );
}