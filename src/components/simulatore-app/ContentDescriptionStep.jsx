import React, { useState } from "react";
import { Wand2, Globe, Loader2, Check, PenLine } from "lucide-react";

const CONTENT_SUGGESTIONS = {
  servizi: [
    "Aree di pratica e specializzazioni",
    "Team e professionisti dello studio",
    "Casi di successo / referenze",
    "Tariffe e modalita di consulenza",
    "Contatti e sedi",
    "Modulo richiesta appuntamento",
  ],
  immobiliare: [
    "Catalogo immobili in vendita/affitto",
    "Servizi offerti (valutazioni, gestione, ecc.)",
    "Team di agenti",
    "Zone coperte",
    "Modulo di contatto / richiesta info",
  ],
  salute: [
    "Elenco servizi e prestazioni",
    "Team medico e specialisti",
    "Orari e prenotazione visite",
    "Convenzioni e assicurazioni accettate",
    "Contatti e come raggiungerci",
  ],
  turismo: [
    "Camere / alloggi disponibili",
    "Servizi e amenities",
    "Tariffe e disponibilita",
    "Galleria fotografica",
    "Attrazioni nelle vicinanze",
    "Modulo prenotazione",
  ],
  educazione: [
    "Corsi e programmi offerti",
    "Docenti e formatori",
    "Calendario e orari",
    "Prezzi e iscrizioni",
    "Certificazioni rilasciate",
    "Contatti",
  ],
  altro: [
    "Servizi / prodotti offerti",
    "Chi siamo / il team",
    "Prezzi e tariffe",
    "Portfolio / lavori realizzati",
    "Contatti e orari",
  ],
};

export default function ContentDescriptionStep({ businessType, contentDescription, onContentChange, websiteUrl, onExtractFromSite }) {
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);

  const suggestions = CONTENT_SUGGESTIONS[businessType] || CONTENT_SUGGESTIONS.altro;
  const hasWebsite = websiteUrl && websiteUrl.trim().length > 3;

  const handleExtractFromSite = async () => {
    if (!hasWebsite) return;
    setExtracting(true);
    try {
      await onExtractFromSite();
      setExtracted(true);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
          <PenLine className="w-3.5 h-3.5" /> Cosa vuoi mostrare nella tua app?
        </p>
        <textarea
          value={contentDescription}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Descrivi i contenuti che vuoi nella tua app: servizi offerti, prezzi, team, specializzazioni, ecc."
          rows={4}
          className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 resize-none"
        />
      </div>

      {/* Suggerimenti specifici per categoria */}
      <div>
        <p className="text-[10px] text-gray-500 mb-2">Suggerimenti per la tua categoria:</p>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                const current = contentDescription.trim();
                const bullet = "- " + s;
                if (current.includes(s)) return;
                onContentChange(current ? current + "\n" + bullet : bullet);
              }}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:border-purple-500/30 hover:bg-purple-500/10 transition-all active:scale-95"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Pulsante "Prendi dal sito" */}
      {hasWebsite && (
        <div>
          <p className="text-[10px] text-gray-500 mb-2">Oppure lascia fare all'AI:</p>
          <button
            onClick={handleExtractFromSite}
            disabled={extracting || extracted}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
              extracted
                ? "bg-green-500/10 border-green-500/20"
                : "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15"
            }`}
          >
            {extracting ? (
              <>
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                <div className="text-left">
                  <p className="text-sm font-bold text-purple-300">Analizzo il tuo sito...</p>
                  <p className="text-[10px] text-gray-500">Estraggo contenuti, servizi e informazioni</p>
                </div>
              </>
            ) : extracted ? (
              <>
                <Check className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <p className="text-sm font-bold text-green-400">Contenuti estratti dal sito!</p>
                  <p className="text-[10px] text-gray-500">L'AI usera questi dati per generare l'app</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Prendi contenuti dal sito</p>
                  <p className="text-[10px] text-gray-500">L'AI analizzera {websiteUrl} ed estrarra i dati</p>
                </div>
              </>
            )}
          </button>
        </div>
      )}

      {!hasWebsite && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/15 p-3">
          <p className="text-[10px] text-amber-300/80 text-center">
            Se hai un sito web, torna indietro e inseriscilo — l'AI potra estrarre automaticamente i contenuti
          </p>
        </div>
      )}
    </div>
  );
}