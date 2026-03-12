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
        className="ml-1 w-4 h-4 rounded-full bg-slate-600/60 hover:bg-slate-500/60 flex items-center justify-center transition-all"
      >
        <HelpCircle className="w-3 h-3 text-slate-300" />
      </button>

      {open && (
        <>
          {/* Overlay per chiudere */}
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          
          {/* Popup */}
          <div className="absolute left-0 top-full mt-2 z-[101] w-72 bg-[#0a2540] border border-[#1a3a5c] rounded-xl shadow-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[#d4af37] text-sm font-mono font-bold">ATECO {atecoCode}</span>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-3">
                <Loader2 className="w-4 h-4 text-[#d4af37] animate-spin" />
                <span className="text-slate-400 text-xs">Carico spiegazione...</span>
              </div>
            ) : info ? (
              <div className="space-y-2">
                <p className="text-white text-xs font-medium leading-snug">{info.descrizione}</p>
                {info.sezione && (
                  <p className="text-slate-500 text-[10px]">Sezione: {info.sezione}</p>
                )}
                {info.spiegazione && (
                  <p className="text-slate-400 text-[11px] leading-relaxed border-t border-slate-700/50 pt-2 mt-2">
                    {info.spiegazione}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </span>
  );
}