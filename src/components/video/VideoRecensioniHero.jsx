import React from 'react';
import { Phone, Video, Scissors, Share2, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    icon: Phone,
    number: '1',
    title: 'Ci dai i dati',
    desc: 'Inserisci nome e telefono del tuo cliente soddisfatto',
    color: '#d4af37',
  },
  {
    icon: Video,
    number: '2',
    title: 'Noi lo contattiamo',
    desc: 'Organizziamo la video intervista con il tuo cliente',
    color: '#22c55e',
  },
  {
    icon: Scissors,
    number: '3',
    title: 'Montaggio pro',
    desc: 'Editing professionale, grafiche e sottotitoli inclusi',
    color: '#3b82f6',
  },
  {
    icon: Share2,
    number: '4',
    title: 'Il video è tuo',
    desc: 'Usalo su social, sito web, WhatsApp e ovunque vuoi',
    color: '#a855f7',
  },
];

export default function VideoRecensioniHero() {
  return (
    <div className="mb-6">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-6"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0d2847 50%, #132f4c 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 80% 20%, #d4af37 0%, transparent 50%), radial-gradient(circle at 20% 80%, #d4af37 0%, transparent 50%)',
          }}
        />
        <div className="relative p-5 text-center">
          <div className="w-16 h-16 bg-[#d4af37]/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#d4af37]/30">
            <Video className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h2 className="text-white text-xl font-bold mb-1">
            Video Recensioni Professionali
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Fai parlare i tuoi clienti soddisfatti. Noi ci occupiamo di tutto, tu ricevi un video pronto per i tuoi canali.
          </p>
        </div>
      </div>

      {/* Process steps */}
      <div className="space-y-0">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="flex items-start gap-3">
              {/* Linea verticale + cerchio */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: step.color + '20', border: `1.5px solid ${step.color}40` }}
                >
                  <Icon className="w-5 h-5" style={{ color: step.color }} />
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="w-0.5 h-6 my-1 rounded-full" style={{ backgroundColor: step.color + '30' }} />
                )}
              </div>
              {/* Testo */}
              <div className="pt-1.5 pb-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">
                    {step.title}
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Privacy badge */}
      <div className="mt-4 bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex items-start gap-2">
        <span className="text-base flex-shrink-0">🔒</span>
        <p className="text-slate-400 text-xs leading-relaxed">
          <span className="text-slate-300 font-medium">I dati del tuo cliente restano riservati.</span>{' '}
          Li usiamo solo per contattarlo e organizzare la video recensione. Non vengono condivisi né pubblicati.
        </p>
      </div>
    </div>
  );
}