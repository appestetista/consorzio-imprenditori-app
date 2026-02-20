import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export default function VantaggiExamplesPopup() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-lime-400 transition-colors text-[11px] mt-1 mb-4 mx-auto"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        <span>Vedi esempi di vantaggi</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-lime-400" />
              Esempi di vantaggi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {EXAMPLES.map((ex, i) => (
              <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                <span className="text-lime-400 text-[10px] font-medium bg-lime-400/10 px-2 py-0.5 rounded-full">
                  {ex.categoria}
                </span>
                <p className="text-white text-sm font-medium mt-1.5">{ex.titolo}</p>
                <p className="text-slate-400 text-xs mt-0.5">{ex.descrizione}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}