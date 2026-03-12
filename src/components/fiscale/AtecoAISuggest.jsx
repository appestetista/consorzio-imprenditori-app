import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, Check, RotateCcw } from 'lucide-react';

/**
 * Componente che suggerisce codici ATECO in base alla descrizione dell'attività dell'utente.
 * Usa la LLM per interpretare la descrizione e restituire i codici più probabili,
 * poi li valida contro il database reale CodiceATECO.
 */
export default function AtecoAISuggest({ onSelect }) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);

  const handleSuggest = async () => {
    if (!description.trim() || description.trim().length < 5) return;
    setLoading(true);
    setError(null);
    setSuggestions(null);

    const prompt = `Sei un esperto di classificazione ATECO 2007 italiana.
L'utente descrive la sua attività economica così: "${description.trim()}"

Rispondi con i 5 codici ATECO più probabili che corrispondono a questa descrizione.
Per ogni codice fornisci:
- codice: il codice ATECO completo (es. "62.01.00")
- descrizione: la descrizione ufficiale ISTAT di quel codice
- motivazione: una frase breve su perché è rilevante

Rispondi SOLO con codici ATECO reali e esistenti nella classificazione ISTAT 2007.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggerimenti: {
            type: "array",
            items: {
              type: "object",
              properties: {
                codice: { type: "string" },
                descrizione: { type: "string" },
                motivazione: { type: "string" }
              }
            }
          }
        }
      }
    });

    const aiSuggestions = result?.suggerimenti || [];

    if (aiSuggestions.length === 0) {
      setError("Non sono riuscito a trovare codici ATECO per questa descrizione. Prova a essere più specifico.");
      setLoading(false);
      return;
    }

    // Valida contro il database reale — cerca i codici suggeriti
    const validated = [];
    for (const s of aiSuggestions) {
      const found = await base44.entities.CodiceATECO.filter({ codice: s.codice });
      if (found.length > 0) {
        validated.push({ ...s, verificato: true, dbRecord: found[0] });
      } else {
        validated.push({ ...s, verificato: false });
      }
    }

    setSuggestions(validated);
    setLoading(false);
  };

  const handleReset = () => {
    setDescription('');
    setSuggestions(null);
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* Input descrizione */}
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1 block">
          Descrivi la tua attività
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Es: Riparo computer e vendo accessori informatici..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm p-3 resize-none h-20 placeholder:text-slate-500 focus:border-[#d4af37] focus:outline-none"
        />
      </div>

      {/* Bottone suggerisci */}
      <button
        onClick={handleSuggest}
        disabled={loading || !description.trim() || description.trim().length < 5}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
          loading || !description.trim() || description.trim().length < 5
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-slate-900 hover:opacity-90'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analizzo la tua attività...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Suggerisci codici ATECO
          </>
        )}
      </button>

      {/* Errore */}
      {error && (
        <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-3 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Risultati */}
      {suggestions && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-xs">Codici suggeriti per te:</p>
            <button onClick={handleReset} className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Riprova
            </button>
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s.codice)}
              className="w-full text-left bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700 rounded-xl p-3 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#d4af37] text-sm font-mono font-bold">{s.codice}</span>
                {s.verificato && (
                  <span className="bg-green-900/40 text-green-400 text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Verificato
                  </span>
                )}
                {!s.verificato && (
                  <span className="bg-yellow-900/40 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded-full">
                    Non in DB
                  </span>
                )}
              </div>
              <p className="text-white text-xs leading-tight">{s.descrizione}</p>
              <p className="text-slate-500 text-[10px] mt-1 italic">{s.motivazione}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}