import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const EXAMPLES = [
  {
    categoria: 'Ristorazione e Food',
    titolo: 'Sconto 15% sul menù pranzo',
    descrizione: 'Ristorante offre 15% di sconto su tutti i menù pranzo feriali ai membri del consorzio.',
    foto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'
  },
  {
    categoria: 'Servizi Digitali e IT',
    titolo: 'Sito web gratuito per 1 mese',
    descrizione: 'Agenzia web offre un mese gratuito di hosting e manutenzione sito per nuovi clienti iscritti.',
    foto: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80'
  },
  {
    categoria: 'Estetica e Benessere',
    titolo: 'Trattamento viso omaggio',
    descrizione: 'Centro estetico regala un trattamento viso alla prima visita per i membri.',
    foto: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=400&q=80'
  },
  {
    categoria: 'Stampa e Grafica',
    titolo: '20% su biglietti da visita e brochure',
    descrizione: 'Tipografia offre sconto del 20% su stampa biglietti, volantini e cataloghi aziendali.',
    foto: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=400&q=80'
  },
  {
    categoria: 'Auto e Officine',
    titolo: 'Tagliando auto a prezzo convenzionato',
    descrizione: 'Officina meccanica offre tagliando con 25% di sconto e controllo gratuito per i soci.',
    foto: 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400&q=80'
  },
  {
    categoria: 'Formazione e Corsi',
    titolo: 'Corso Excel gratuito online',
    descrizione: 'Ente formazione offre corso base Excel gratuito (valore €120) per i membri.',
    foto: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'
  }
];

export default function VantaggiExamplesPopup() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-lime-400 rounded-t-none border-t-0 h-9 text-xs gap-2 mb-4"
      >
        <Lightbulb className="w-4 h-4 text-lime-400" />
        Vedi esempi di vantaggi
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[80vh] overflow-y-auto [&>button]:text-lime-400 [&>button]:hover:text-lime-300">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-lime-400" />
              Esempi di vantaggi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {EXAMPLES.map((ex, i) => (
              <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-lg overflow-hidden flex">
                <img src={ex.foto} alt={ex.titolo} className="w-20 h-20 object-cover flex-shrink-0" />
                <div className="p-2.5 flex-1 min-w-0">
                  <span className="text-lime-400 text-[10px] font-medium bg-lime-400/10 px-2 py-0.5 rounded-full">
                    {ex.categoria}
                  </span>
                  <p className="text-white text-sm font-medium mt-1 truncate">{ex.titolo}</p>
                  <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{ex.descrizione}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}