import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { HelpCircle, X, Loader2 } from 'lucide-react';

/**
 * Piccolo bottone "?" che, al tap, mostra un popup con la spiegazione
 * del codice ATECO dell'utente. Carica la descrizione dal DB e,
 * se serve, arricchisce con una spiegazione in linguaggio semplice via LLM.
 */
export default function AtecoInfoPopup({ atecoCode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);

  const handleOpen = async (e) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (info) return; // già caricato

    setLoading(true);
    // 1) Cerca nel DB
    const found = await base44.entities.CodiceATECO.filter({ codice: atecoCode });
    const dbDesc = found.length > 0 ? found[0].descrizione : null;
    const sezione = found.length > 0 ? found[0].sezione_descrizione : null;

    // 2) Chiedi spiegazione semplice alla LLM
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Spiega in modo semplice e breve (max 3 frasi) a un imprenditore italiano cos'è il codice ATECO "${atecoCode}"${dbDesc ? ` che corrisponde a: "${dbDesc}"` : ''}. Spiega anche a cosa serve il codice ATECO in generale. Rispondi in italiano.`,
      response_json_schema: {
        type: "object",
        properties: {
          descrizione_ufficiale: { type: "string" },
          spiegazione: { type: "string" }
        }
      }
    });

    setInfo({
      codice: atecoCode,
      descrizione: dbDesc || result?.descrizione_ufficiale || 'Non trovato nel database',
      sezione: sezione,
      spiegazione: result?.spiegazione || ''
    });
    setLoading(false);
  };

  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={handleOpen}
        className="ml-2 w-6 h-6 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all"
      >
        <HelpCircle className="w-5 h-5 text-black" />
      </button>

      {open && (
        <>
          {/* Overlay scuro per chiudere */}
          <div className="fixed inset-0 z-[9998] bg-black/60" onClick={() => setOpen(false)} />
          
          {/* Popup centrato */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6 pointer-events-none">
            <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-2xl shadow-2xl p-6 w-full max-w-sm pointer-events-auto">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[#d4af37] text-lg font-mono font-bold">ATECO {atecoCode}</span>
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <Loader2 className="w-6 h-6 text-[#d4af37] animate-spin" />
                  <span className="text-slate-400 text-sm">Carico spiegazione...</span>
                </div>
              ) : info ? (
                <div className="space-y-3">
                  <p className="text-white text-sm font-medium leading-snug">{info.descrizione}</p>
                  {info.sezione && (
                    <p className="text-slate-500 text-xs">Sezione: {info.sezione}</p>
                  )}
                  {info.spiegazione && (
                    <p className="text-slate-400 text-sm leading-relaxed border-t border-slate-700/50 pt-3 mt-3">
                      {info.spiegazione}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </span>
  );
}