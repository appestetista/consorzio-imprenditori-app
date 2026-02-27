import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Gift, Banknote, Calculator, TrendingUp, UserCheck, Heart, Info, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function WelfareSection() {
  return (
    <div className="space-y-6">
      {/* 3 Pulsanti affiancati */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-slate-800 border-pink-500/30 cursor-pointer hover:border-pink-500/50 transition-colors"
          onClick={() => window.location.href = createPageUrl('WelfareNormativa')}
        >
          <CardContent className="p-3 text-center">
            <div className="w-10 h-10 bg-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileText className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-white font-semibold text-xs">Normativa</h3>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-pink-500/30 cursor-pointer hover:border-pink-500/50 transition-colors"
          onClick={() => window.location.href = createPageUrl('WelfareTipologie')}
        >
          <CardContent className="p-3 text-center">
            <div className="w-10 h-10 bg-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Gift className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-white font-semibold text-xs">Di che tipo sono</h3>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-pink-500/30 cursor-pointer hover:border-pink-500/50 transition-colors"
          onClick={() => window.location.href = createPageUrl('WelfareOrdina')}
        >
          <CardContent className="p-3 text-center">
            <div className="w-10 h-10 bg-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Banknote className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-white font-semibold text-xs">Scegli e ordina</h3>
          </CardContent>
        </Card>
      </div>

      {/* Pulsante Richiedi Analisi */}
      <Card className="bg-slate-800 border-pink-500/30 cursor-pointer hover:border-pink-500/50 transition-colors"
        onClick={() => window.location.href = createPageUrl('RichiestaWelfare')}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-400/20 rounded-full flex items-center justify-center">
              <Calculator className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Vuoi vedere quanto risparmi?</h3>
              <p className="text-slate-400 text-sm">Richiedi un'analisi gratuita</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-pink-400" />
        </CardContent>
      </Card>

      {/* SEZIONE 1 - Impatto Immediato */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-pink-400" />
            Il confronto che conta
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Se spendi <span className="text-white font-semibold">1.000 €</span> per un dipendente, ecco cosa cambia:
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-900 rounded-lg p-4 border border-red-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="w-5 h-5 text-red-400" />
                <h4 className="text-red-400 font-semibold">Premio in busta paga</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Costo azienda:</span><span className="text-white font-medium">1.000 €</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Valore netto al dipendente:</span><span className="text-red-400 font-medium">~600 €</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Tassazione e contributi:</span><span className="text-red-400 font-medium">~400 €</span></div>
              </div>
              <p className="text-slate-500 text-xs mt-3 pt-2 border-t border-slate-700">Il 40% circa viene assorbito da tasse e contributi.</p>
            </div>

            <div className="bg-slate-900 rounded-lg p-4 border border-pink-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-pink-400" />
                <h4 className="text-pink-400 font-semibold">Welfare Aziendale</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Costo azienda:</span><span className="text-white font-medium">1.000 €</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Valore per il dipendente:</span><span className="text-pink-400 font-medium">fino a 1.000 €</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Tassazione:</span><span className="text-green-400 font-medium">Agevolata o nulla*</span></div>
              </div>
              <p className="text-slate-500 text-xs mt-3 pt-2 border-t border-slate-700">*Nei limiti previsti dalla normativa vigente (art. 51 TUIR).</p>
            </div>
          </div>

          <Alert className="mt-4 bg-pink-500/10 border-pink-500/30">
            <Info className="h-4 w-4 text-pink-400" />
            <AlertDescription className="text-slate-300 text-sm">
              Il welfare aziendale è fiscalmente efficiente perché sostituisce parte della retribuzione monetaria con benefit defiscalizzati.
              A parità di costo per l'azienda, il dipendente percepisce un valore maggiore.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SEZIONE 2 - Effetto Produttività */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            Effetto sulla produttività
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Il welfare non è un costo aggiuntivo: è una <span className="text-white font-semibold">riallocazione intelligente della spesa</span>.
          </p>
          <div className="space-y-3">
            {[
              { icon: UserCheck, text: 'Minore assenteismo', desc: 'Dipendenti con benefit utili tendono ad assentarsi meno' },
              { icon: Heart, text: 'Maggiore fidelizzazione', desc: 'Riduce il turnover e i costi di ricerca personale' },
              { icon: Banknote, text: 'Minori richieste di aumenti', desc: 'Il valore percepito riduce la pressione sugli stipendi' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-slate-900 rounded-lg p-3">
                <div className="w-8 h-8 bg-pink-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{item.text}</p>
                  <p className="text-slate-400 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-4 italic">
            Buoni pasto, buoni spesa, servizi sanitari integrativi e convenzioni sono tra i benefit più apprezzati.
          </p>
        </CardContent>
      </Card>

      {/* SEZIONE 3 - Simulazione Precompilata */}
      <Card className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-500/30">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-pink-400" />
            Esempio pratico: azienda con 5 dipendenti
          </h3>
          <div className="bg-slate-900/80 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><p className="text-slate-400 text-xs">Dipendenti</p><p className="text-white font-semibold">5</p></div>
              <div><p className="text-slate-400 text-xs">Welfare mensile/dip.</p><p className="text-white font-semibold">100 €</p></div>
            </div>
            <div className="border-t border-slate-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Spesa annua azienda:</span><span className="text-white font-semibold">6.000 €</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Valore netto percepito:</span><span className="text-pink-400 font-semibold">fino a 6.000 €</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Equivalente in busta paga:</span><span className="text-slate-300">~3.600 €</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Valore recuperato:</span>
                <span className="text-green-400 font-bold text-lg">+2.400 €/anno</span>
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-xs">
            ⚠️ I numeri sono stime prudenziali basate sulla normativa 2025 e possono variare in base alla situazione specifica dell'azienda.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}