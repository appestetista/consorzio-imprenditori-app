import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function CruscottoFiscale() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1a] to-[#0f172a] px-4 pt-16 pb-24">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.href = createPageUrl('Esplora')} className="back-arrow-tap text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">Cruscotto Fiscale</h1>
            <p className="text-slate-400 text-xs">Simulazioni e analisi fiscale</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">Sezione in fase di aggiornamento.</p>
        </div>
      </div>
    </div>
  );
}