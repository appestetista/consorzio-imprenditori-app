import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Upload, Loader2, CheckCircle2, X } from 'lucide-react';

/**
 * Carica un bilancio (PDF/XLSX/IMG), estrae ricavi e costi dalla LLM,
 * e chiama onDataExtracted({ fatturato, costiTotali }) per settare il simulatore.
 */
export default function CaricaBilancioButton({ onDataExtracted }) {
  const [state, setState] = useState('idle'); // idle | uploading | extracting | done | error
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const inputRef = useRef();

  const EXTRACT_SCHEMA = {
    type: "object",
    properties: {
      ricavi: { type: "number", description: "Valore della produzione / Ricavi (voce A CE art. 2425 c.c.). Numero positivo senza separatori." },
      costi_produzione: { type: "number", description: "Totale costi della produzione (voce B CE). Numero positivo." },
      costo_personale: { type: "number", description: "Costo del personale (voce B.9 CE). Numero positivo." },
      ammortamenti: { type: "number", description: "Ammortamenti (voce B.10 CE). Numero positivo." },
      oneri_finanziari: { type: "number", description: "Interessi e oneri finanziari (voce C.17 CE). Numero positivo." },
      compensi_amministratori: { type: "number", description: "Compensi amministratori se rilevabile dalla Nota Integrativa." },
      utile_perdita: { type: "number", description: "Risultato d'esercizio." },
      ragione_sociale: { type: "string", description: "Ragione sociale se rilevabile." },
      anno: { type: "string", description: "Anno di riferimento se rilevabile." },
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setShowPanel(true);
    setState('uploading');
    setErrorMsg('');
    setExtracted(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setState('extracting');

      let result = null;

      // Metodo 1: ExtractDataFromUploadedFile — ottimizzato per file grandi
      try {
        const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: EXTRACT_SCHEMA,
        });
        if (extraction?.status === 'success' && extraction?.output) {
          const out = Array.isArray(extraction.output) ? extraction.output[0] : extraction.output;
          if (out && (out.ricavi || out.costi_produzione)) {
            result = out;
          }
        }
      } catch (e1) {
        console.warn('[Bilancio] ExtractData fallito, provo con LLM:', e1?.message);
      }

      // Metodo 2 (fallback): InvokeLLM con file_urls — modello leggero per velocità
      if (!result) {
        try {
          result = await base44.integrations.Core.InvokeLLM({
            prompt: `Sei un commercialista. Estrai dal bilancio italiano allegato SOLO questi dati numerici dal Conto Economico (art. 2425 c.c.):
- ricavi: Valore della produzione (voce A)
- costi_produzione: Totale costi produzione (voce B)  
- costo_personale: Costo personale (B.9)
- ammortamenti: Ammortamenti (B.10)
- oneri_finanziari: Interessi passivi (C.17)
- compensi_amministratori: se in Nota Integrativa
- utile_perdita: Risultato d'esercizio
- ragione_sociale e anno se visibili

Numeri positivi senza €, senza punti migliaia. Se un dato manca, omettilo.`,
            file_urls: [file_url],
            response_json_schema: EXTRACT_SCHEMA,
          });
        } catch (e2) {
          console.warn('[Bilancio] LLM fallito:', e2?.message);
        }
      }

      if (!result || (!result.ricavi && !result.costi_produzione)) {
        setState('error');
        setErrorMsg('Non sono riuscito a estrarre i dati dal documento. Prova con un PDF del bilancio depositato (Conto Economico leggibile).');
        return;
      }

      // Normalizza: converti stringhe in numeri se necessario
      const numKeys = ['ricavi', 'costi_produzione', 'costo_personale', 'ammortamenti', 'oneri_finanziari', 'compensi_amministratori', 'utile_perdita'];
      for (const k of numKeys) {
        if (result[k] != null && typeof result[k] === 'string') {
          const cleaned = result[k].replace(/[^\d,.]/g, '').replace(',', '.');
          result[k] = parseFloat(cleaned) || null;
        }
        // Converti negativi in positivi (sono valori assoluti)
        if (result[k] != null && result[k] < 0) result[k] = Math.abs(result[k]);
      }

      setExtracted(result);
      setState('done');
    } catch (err) {
      console.error('[Bilancio] Errore generale:', err?.message);
      setState('error');
      setErrorMsg('Errore durante l\'elaborazione. Riprova o usa un file più piccolo.');
    }
  };

  const handleApply = () => {
    if (!extracted) return;
    onDataExtracted(extracted);
    setShowPanel(false);
    setState('idle');
  };

  const fmt = n => n != null ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n) : '—';

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 rounded-lg text-xs font-medium transition-all bg-[#d4af37]/15 text-[#d4af37] hover:bg-[#d4af37]/25 border border-[#d4af37]/30"
      >
        📄 Carica bilancio
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.csv,.png,.jpg,.jpeg"
        onChange={handleFile}
        className="hidden"
      />

      {/* Panel risultati */}
      {showPanel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 className="text-white text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#d4af37]" />
                Dati dal bilancio
              </h2>
              <button onClick={() => { setShowPanel(false); setState('idle'); }} className="text-slate-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-3">
              {/* Loading */}
              {(state === 'uploading' || state === 'extracting') && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
                  <p className="text-slate-300 text-sm">
                    {state === 'uploading' ? 'Caricamento file...' : 'Estrazione dati dal bilancio...'}
                  </p>
                  <p className="text-slate-500 text-xs">Può richiedere qualche secondo</p>
                </div>
              )}

              {/* Error */}
              {state === 'error' && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-300 text-xs">{errorMsg}</p>
                  <button onClick={() => { setState('idle'); inputRef.current?.click(); }}
                    className="mt-2 text-xs text-[#d4af37] hover:underline">
                    Riprova con un altro file
                  </button>
                </div>
              )}

              {/* Risultati */}
              {state === 'done' && extracted && (
                <>
                  {/* Info azienda */}
                  {(extracted.ragione_sociale || extracted.anno) && (
                    <div className="bg-slate-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-slate-200 text-xs">
                        {extracted.ragione_sociale || ''} {extracted.anno ? `(${extracted.anno})` : ''}
                      </span>
                    </div>
                  )}

                  {/* Dati estratti */}
                  <div className="space-y-1.5">
                    {[
                      { k: 'ricavi', l: 'Ricavi (Valore produzione)' },
                      { k: 'costi_produzione', l: 'Costi della produzione' },
                      { k: 'costo_personale', l: 'Costo del personale (B.9)' },
                      { k: 'ammortamenti', l: 'Ammortamenti (B.10)' },
                      { k: 'oneri_finanziari', l: 'Oneri finanziari (C.17)' },
                      { k: 'compensi_amministratori', l: 'Compensi amministratori' },
                      { k: 'utile_perdita', l: 'Risultato d\'esercizio' },
                    ].map(({ k, l }) => (
                      <div key={k} className="flex justify-between items-center py-1">
                        <span className="text-slate-400 text-xs">{l}</span>
                        <span className={`text-xs font-medium ${
                          extracted[k] != null ? 'text-white' : 'text-slate-600 italic'
                        }`}>
                          {extracted[k] != null ? fmt(extracted[k]) : 'n.d.'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-500 text-center">
                    Questi dati verranno usati per settare automaticamente il simulatore
                  </p>

                  <button onClick={handleApply}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#d4af37] text-slate-900 hover:bg-[#c9a432] transition-all">
                    Applica al simulatore
                  </button>

                  <button onClick={() => { setState('idle'); inputRef.current?.click(); }}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors text-center">
                    Carica un altro file
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}