import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Loader2, CheckCircle2, X, AlertTriangle, XCircle, Upload } from 'lucide-react';

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    is_bilancio: { type: "boolean", description: "true se il documento è un bilancio d'esercizio italiano (con Stato Patrimoniale o Conto Economico). false se è un altro tipo di documento (fattura, contratto, relazione, ecc.)" },
    tipo_documento: { type: "string", description: "Tipo di documento rilevato: 'bilancio', 'nota_integrativa', 'fattura', 'contratto', 'relazione', 'visura', 'altro'" },
    ricavi: { type: "number", description: "Valore della produzione / Ricavi (voce A CE art. 2425 c.c.). Numero positivo." },
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

const VOCI = [
  { k: 'ricavi', l: 'Ricavi (Valore produzione)', ref: 'Voce A — CE art. 2425', critical: true },
  { k: 'costi_produzione', l: 'Costi della produzione', ref: 'Voce B — CE art. 2425', critical: true },
  { k: 'costo_personale', l: 'Costo del personale', ref: 'Voce B.9 — CE' },
  { k: 'ammortamenti', l: 'Ammortamenti', ref: 'Voce B.10 — CE' },
  { k: 'oneri_finanziari', l: 'Oneri finanziari', ref: 'Voce C.17 — CE' },
  { k: 'compensi_amministratori', l: 'Compensi amministratori', ref: 'Nota Integrativa' },
  { k: 'utile_perdita', l: 'Risultato d\'esercizio', ref: 'CE — ultima riga' },
];

const fmt = n => n != null ? new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n) : null;

export default function CaricaBilancioButton({ onDataExtracted }) {
  const [files, setFiles] = useState([]); // [{name, size, file_url, state, result, error}]
  const [activeIdx, setActiveIdx] = useState(null); // indice file con risultati mostrati
  const [showPanel, setShowPanel] = useState(false);
  const inputRef = useRef();

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    if (activeIdx === idx) setActiveIdx(null);
    else if (activeIdx > idx) setActiveIdx(activeIdx - 1);
  };

  const processFile = async (fileObj, idx) => {
    // Aggiorna stato
    const update = (patch) => setFiles(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));

    update({ state: 'uploading' });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileObj });
      update({ file_url, state: 'extracting' });

      let result = null;

      // Metodo 1: ExtractDataFromUploadedFile
      try {
        const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: EXTRACT_SCHEMA,
        });
        if (extraction?.status === 'success' && extraction?.output) {
          const out = Array.isArray(extraction.output) ? extraction.output[0] : extraction.output;
          if (out) result = out;
        }
      } catch (e1) {
        console.warn('[Bilancio] ExtractData fallito:', e1?.message);
      }

      // Metodo 2 (fallback): InvokeLLM
      if (!result) {
        try {
          result = await base44.integrations.Core.InvokeLLM({
            prompt: `Analizza il documento allegato.

PRIMA DI TUTTO: determina se è un bilancio d'esercizio italiano (Conto Economico art. 2425 c.c.).
Se NON è un bilancio (es: fattura, contratto, visura, relazione), indica is_bilancio=false e tipo_documento corretto.

Se È un bilancio, estrai i dati numerici:
- ricavi, costi_produzione, costo_personale, ammortamenti, oneri_finanziari, compensi_amministratori, utile_perdita
- ragione_sociale, anno

Numeri positivi senza €, senza punti migliaia. Se un dato manca, omettilo.`,
            file_urls: [file_url],
            response_json_schema: EXTRACT_SCHEMA,
          });
        } catch (e2) {
          console.warn('[Bilancio] LLM fallito:', e2?.message);
        }
      }

      if (!result) {
        update({ state: 'error', error: 'Impossibile leggere il file. Verifica che sia un PDF leggibile.' });
        return;
      }

      // Normalizza numeri
      const numKeys = ['ricavi', 'costi_produzione', 'costo_personale', 'ammortamenti', 'oneri_finanziari', 'compensi_amministratori', 'utile_perdita'];
      for (const k of numKeys) {
        if (result[k] != null && typeof result[k] === 'string') {
          const cleaned = result[k].replace(/[^\d,.]/g, '').replace(',', '.');
          result[k] = parseFloat(cleaned) || null;
        }
        if (result[k] != null && result[k] < 0) result[k] = Math.abs(result[k]);
      }

      // Verifica se è un bilancio
      if (result.is_bilancio === false) {
        const tipoLabel = {
          fattura: 'una fattura', contratto: 'un contratto', relazione: 'una relazione',
          visura: 'una visura camerale', nota_integrativa: 'una nota integrativa',
          altro: 'un documento non riconosciuto'
        }[result.tipo_documento] || 'un documento non pertinente';
        update({ state: 'not_bilancio', result, error: `Questo file sembra ${tipoLabel}, non un bilancio d'esercizio.` });
        return;
      }

      // Verifica che ci siano dati minimi
      if (!result.ricavi && !result.costi_produzione) {
        update({ state: 'error', error: 'Il documento sembra un bilancio ma non ho trovato ricavi né costi. Prova con il PDF del bilancio depositato.' });
        return;
      }

      // Validazione coerenza voci
      const warnings = [];
      if (result.ricavi && result.costi_produzione && result.costi_produzione > result.ricavi * 2) {
        warnings.push('I costi superano di molto i ricavi — verifica i dati');
      }
      if (result.costo_personale && result.costi_produzione && result.costo_personale > result.costi_produzione) {
        warnings.push('Il costo personale supera i costi totali — possibile errore');
      }
      if (result.utile_perdita && result.ricavi && Math.abs(result.utile_perdita) > result.ricavi) {
        warnings.push('Il risultato d\'esercizio è anomalo rispetto ai ricavi');
      }

      update({ state: 'done', result, warnings });
      setActiveIdx(idx);

    } catch (err) {
      console.error('[Bilancio] Errore:', err?.message);
      update({ state: 'error', error: 'Errore di rete durante l\'elaborazione.' });
    }
  };

  const handleFiles = async (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    // Reset input per permettere re-upload dello stesso file
    e.target.value = '';

    const startIdx = files.length;
    const fileEntries = newFiles.map(f => ({
      name: f.name,
      size: f.size,
      state: 'queued',
      result: null,
      error: null,
      warnings: [],
      file_url: null,
      _raw: f,
    }));

    setFiles(prev => [...prev, ...fileEntries]);

    // Processa tutti i file in parallelo
    for (let i = 0; i < newFiles.length; i++) {
      processFile(newFiles[i], startIdx + i);
    }
  };

  const handleApply = (idx) => {
    const f = files[idx];
    if (!f?.result) return;
    onDataExtracted(f.result);
    setShowPanel(false);
  };

  const fmtSize = (bytes) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const activeFile = activeIdx != null ? files[activeIdx] : null;
  const countDone = files.filter(f => f.state === 'done').length;
  const countProcessing = files.filter(f => f.state === 'uploading' || f.state === 'extracting' || f.state === 'queued').length;

  return (
    <div className="space-y-2">
      {/* Pulsante carica */}
      <button
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 rounded-lg text-xs font-medium transition-all bg-[#d4af37]/15 text-[#d4af37] hover:bg-[#d4af37]/25 border border-[#d4af37]/30 flex items-center gap-1.5"
      >
        <Upload className="w-3.5 h-3.5" />
        Carica bilancio
        {files.length > 0 && (
          <span className="ml-1 bg-[#d4af37] text-slate-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {files.length}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.csv,.png,.jpg,.jpeg"
        onChange={handleFiles}
        className="hidden"
        multiple
      />

      {/* Lista file caricati */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-500 font-medium">{files.length} file caricat{files.length === 1 ? 'o' : 'i'}</p>
          {files.map((f, i) => (
            <div key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                activeIdx === i ? 'bg-[#d4af37]/15 border border-[#d4af37]/30' : 'bg-slate-800/50 border border-slate-700/30 hover:bg-slate-800/80'
              }`}
              onClick={() => {
                if (f.state === 'done' || f.state === 'not_bilancio' || f.state === 'error') {
                  setActiveIdx(i);
                  setShowPanel(true);
                }
              }}
            >
              {/* Icona stato */}
              {(f.state === 'queued' || f.state === 'uploading' || f.state === 'extracting') && (
                <Loader2 className="w-3.5 h-3.5 text-[#d4af37] animate-spin shrink-0" />
              )}
              {f.state === 'done' && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              )}
              {f.state === 'error' && (
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              )}
              {f.state === 'not_bilancio' && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}

              {/* Nome file */}
              <div className="flex-1 min-w-0">
                <span className="text-slate-200 truncate block">{f.name}</span>
                <span className="text-slate-500 text-[10px]">
                  {fmtSize(f.size)}
                  {f.state === 'uploading' && ' · Caricamento...'}
                  {f.state === 'extracting' && ' · Analisi in corso...'}
                  {f.state === 'done' && f.result?.ragione_sociale && ` · ${f.result.ragione_sociale}`}
                  {f.state === 'not_bilancio' && ' · Non è un bilancio'}
                  {f.state === 'error' && ' · Errore'}
                </span>
              </div>

              {/* X per rimuovere */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="text-slate-500 hover:text-red-400 p-0.5 shrink-0 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Panel dettaglio risultati */}
      {showPanel && activeFile && (activeFile.state === 'done' || activeFile.state === 'not_bilancio' || activeFile.state === 'error') && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2 shrink-0">
              <h2 className="text-white text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#d4af37]" />
                Dati estratti
              </h2>
              <button onClick={() => setShowPanel(false)} className="text-slate-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {/* Nome file */}
              <div className="bg-slate-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-300 text-xs truncate">{activeFile.name}</span>
              </div>

              {/* Errore: non è un bilancio */}
              {activeFile.state === 'not_bilancio' && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-300 text-xs font-semibold">Documento non valido</p>
                      <p className="text-amber-200/70 text-xs mt-1">{activeFile.error}</p>
                      <p className="text-slate-400 text-[10px] mt-2">Per il simulatore serve il bilancio d'esercizio con il Conto Economico (art. 2425 c.c.).</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Errore generico */}
              {activeFile.state === 'error' && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-300 text-xs">{activeFile.error}</p>
                  </div>
                </div>
              )}

              {/* Risultati OK */}
              {activeFile.state === 'done' && activeFile.result && (
                <>
                  {/* Info azienda */}
                  {(activeFile.result.ragione_sociale || activeFile.result.anno) && (
                    <div className="bg-green-900/15 border border-green-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-green-200 text-xs font-medium">
                        {activeFile.result.ragione_sociale || 'Bilancio'} {activeFile.result.anno ? `— ${activeFile.result.anno}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Warnings */}
                  {activeFile.warnings?.length > 0 && (
                    <div className="bg-amber-900/15 border border-amber-500/20 rounded-lg px-3 py-2 space-y-1">
                      {activeFile.warnings.map((w, wi) => (
                        <div key={wi} className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-amber-300/80 text-[10px]">{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Voci dettagliate */}
                  <div className="space-y-1">
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Voci estratte dal Conto Economico</p>
                    {VOCI.map(({ k, l, ref, critical }) => {
                      const val = activeFile.result[k];
                      const found = val != null;
                      return (
                        <div key={k} className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${
                          found ? 'bg-slate-800/30' : 'bg-slate-800/10'
                        }`}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {found ? (
                                <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                              ) : (
                                <div className={`w-3 h-3 rounded-full border shrink-0 ${critical ? 'border-red-400/50' : 'border-slate-600'}`} />
                              )}
                              <span className={`text-xs ${found ? 'text-slate-200' : 'text-slate-500'}`}>{l}</span>
                            </div>
                            <span className="text-[9px] text-slate-600 ml-4.5 pl-[18px]">{ref}</span>
                          </div>
                          <span className={`text-xs font-mono shrink-0 ml-2 ${
                            found ? 'text-white font-medium' : 'text-slate-600 italic'
                          }`}>
                            {found ? fmt(val) : 'n.d.'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Conteggio */}
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500">
                      {VOCI.filter(v => activeFile.result[v.k] != null).length}/{VOCI.length} voci trovate
                    </span>
                  </div>

                  {/* Applica */}
                  <button onClick={() => handleApply(activeIdx)}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-[#d4af37] text-slate-900 hover:bg-[#c9a432] transition-all">
                    Applica al simulatore
                  </button>
                </>
              )}

              {/* Bottone carica altro */}
              <button onClick={() => { setShowPanel(false); inputRef.current?.click(); }}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors text-center">
                Carica un altro file
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}