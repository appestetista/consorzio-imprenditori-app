import React, { useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';

const EXAMPLES = [
  {
    categoria: 'Ristorazione e Food',
    titolo: 'Sconto 15% sul menù pranzo',
    descrizione: 'Ristorante offre 15% di sconto su tutti i menù pranzo feriali ai membri del consorzio.'
  },
  {
    categoria: 'Servizi Digitali e IT',
    titolo: 'Sito web gratuito per 1 mese',
    descrizione: 'Agenzia web offre un mese gratuito di hosting e manutenzione sito per nuovi clienti iscritti.'
  },
  {
    categoria: 'Estetica e Benessere',
    titolo: 'Trattamento viso omaggio',
    descrizione: 'Centro estetico regala un trattamento viso alla prima visita per i membri.'
  },
  {
    categoria: 'Stampa e Grafica',
    titolo: '20% su biglietti da visita e brochure',
    descrizione: 'Tipografia offre sconto del 20% su stampa biglietti, volantini e cataloghi aziendali.'
  },
  {
    categoria: 'Auto e Officine',
    titolo: 'Tagliando auto a prezzo convenzionato',
    descrizione: 'Officina meccanica offre tagliando con 25% di sconto e controllo gratuito per i soci.'
  },
  {
    categoria: 'Formazione e Corsi',
    titolo: 'Corso Excel gratuito online',
    descrizione: 'Ente formazione offre corso base Excel gratuito (valore €120) per i membri.'
  }
];

export default function VantaggiExamplesCollapsible() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-slate-400 hover:text-lime-400 transition-colors text-xs w-full"
      >
        <Lightbulb className="w-4 h-4" />
        <span>Esempi di vantaggi</span>
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {EXAMPLES.map((ex, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lime-400 text-[10px] font-medium bg-lime-400/10 px-2 py-0.5 rounded-full">
                  {ex.categoria}
                </span>
              </div>
              <p className="text-white text-sm font-medium">{ex.titolo}</p>
              <p className="text-slate-400 text-xs mt-0.5">{ex.descrizione}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}