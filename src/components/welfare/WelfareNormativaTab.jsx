import React, { useState } from 'react';
import { FileText, Users, AlertTriangle, CheckCircle, XCircle, Euro, Building2, UserCheck, Baby, Info, UtensilsCrossed, Gift, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function WelfareNormativaTab() {
  const [activeTab, setActiveTab] = useState('buoni-pasto');

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 bg-slate-800 border border-slate-700 p-1 rounded-xl h-auto mb-4">
          <TabsTrigger value="buoni-pasto" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-slate-400 rounded-lg text-[11px] py-2 px-1 leading-tight font-medium">
            Buoni<br/>Pasto
          </TabsTrigger>
          <TabsTrigger value="fringe-benefit" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-slate-400 rounded-lg text-[11px] py-2 px-1 leading-tight font-medium">
            Fringe<br/>Benefit
          </TabsTrigger>
          <TabsTrigger value="buoni-regalo" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-slate-400 rounded-lg text-[11px] py-2 px-1 leading-tight font-medium">
            Buoni<br/>Regalo
          </TabsTrigger>
          <TabsTrigger value="buoni-omaggio" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-slate-400 rounded-lg text-[11px] py-2 px-1 leading-tight font-medium">
            Buoni<br/>Omaggio
          </TabsTrigger>
        </TabsList>

        {/* BUONI PASTO */}
        <TabsContent value="buoni-pasto" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-pink-400" />
                Cosa sono i Buoni Pasto?
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                I <span className="text-pink-400 font-medium">buoni pasto</span> sono titoli di pagamento utilizzabili per acquistare pasti o generi alimentari presso esercizi convenzionati.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Euro className="w-5 h-5 text-pink-400" />
                Limiti di esenzione giornalieri
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-xs mb-1">Cartacei</p>
                  <p className="text-white text-2xl font-bold">€4,00</p>
                  <p className="text-slate-500 text-xs">al giorno</p>
                </div>
                <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-4 text-center border border-pink-500/30">
                  <p className="text-pink-300 text-xs mb-1">Elettronici</p>
                  <p className="text-pink-400 text-2xl font-bold">€10,00</p>
                  <p className="text-pink-300/70 text-xs">al giorno (2026)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-slate-300 text-xs">
              Entro questi limiti i buoni pasto sono <strong className="text-green-400">totalmente esenti</strong> da tassazione e contributi.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* FRINGE BENEFIT */}
        <TabsContent value="fringe-benefit" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-pink-400" />
                Cosa sono i Fringe Benefit?
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                I <span className="text-pink-400 font-medium">fringe benefit</span> sono beni e servizi messi a disposizione dal datore di lavoro ai lavoratori, che <span className="text-green-400 font-medium">non concorrono alla formazione del reddito imponibile</span> entro specifici limiti annuali.
              </p>
              <div className="mt-3 bg-slate-900 rounded-lg p-3">
                <p className="text-slate-400 text-xs">📜 <span className="text-slate-300">Riferimento:</span> Art. 51, comma 3 del TUIR</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Euro className="w-5 h-5 text-pink-400" />
                Soglie di esenzione annuali
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-center border border-slate-600">
                  <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <UserCheck className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-xs mb-1">Senza figli</p>
                  <p className="text-white text-2xl font-bold">€1.000</p>
                  <p className="text-slate-500 text-xs">annui per dipendente</p>
                </div>
                <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl p-4 text-center border border-pink-500/30">
                  <div className="w-10 h-10 bg-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Baby className="w-5 h-5 text-pink-400" />
                  </div>
                  <p className="text-pink-300 text-xs mb-1">Con figli</p>
                  <p className="text-pink-400 text-2xl font-bold">€2.000</p>
                  <p className="text-pink-300/70 text-xs">annui per dipendente</p>
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-400 text-xs font-medium mb-2">✓ Vantaggi per te (azienda):</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /><span className="text-slate-300 text-xs">Costo 100% deducibile</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /><span className="text-slate-300 text-xs">Nessun contributo INPS</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /><span className="text-slate-300 text-xs">Nessuna ritenuta fiscale</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-slate-300 text-xs">
              <strong className="text-red-400">Attenzione:</strong> Se superi anche di 1€ la soglia, perdi TUTTA l'esenzione sull'intero importo.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* BUONI REGALO */}
        <TabsContent value="buoni-regalo" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-400" />
                Cosa sono i Buoni Regalo?
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                I <span className="text-pink-400 font-medium">buoni regalo</span> (gift card) sono titoli spendibili presso catene commerciali per l'acquisto di beni e servizi. Rientrano nei <strong className="text-white">fringe benefit</strong> con le stesse soglie.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Euro className="w-5 h-5 text-pink-400" />
                Limiti di esenzione
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-xs mb-1">Senza figli</p>
                  <p className="text-white text-2xl font-bold">€1.000</p>
                  <p className="text-slate-500 text-xs">annui</p>
                </div>
                <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-4 text-center border border-pink-500/30">
                  <p className="text-pink-300 text-xs mb-1">Con figli</p>
                  <p className="text-pink-400 text-2xl font-bold">€2.000</p>
                  <p className="text-pink-300/70 text-xs">annui</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-slate-300 text-xs">
              <strong className="text-amber-400">Importante:</strong> Il valore dei buoni regalo si cumula con gli altri fringe benefit per il calcolo della soglia annuale.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* BUONI OMAGGIO */}
        <TabsContent value="buoni-omaggio" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-pink-400" />
                Cosa sono i Buoni Omaggio?
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                I <span className="text-pink-400 font-medium">buoni omaggio</span> sono omaggi destinati a <strong className="text-white">clienti, fornitori o partner</strong>, non ai dipendenti.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Euro className="w-5 h-5 text-pink-400" />
                Limiti di deducibilità
              </h3>
              <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-4 text-center border border-pink-500/30 mb-3">
                <p className="text-pink-300 text-xs mb-1">Limite per singolo omaggio</p>
                <p className="text-pink-400 text-2xl font-bold">€50,00</p>
                <p className="text-pink-300/70 text-xs">IVA detraibile + costo deducibile</p>
              </div>
              <div className="space-y-2">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-400 text-xs font-semibold mb-1">✓ Omaggio ≤ €50</p>
                  <span className="text-slate-300 text-xs">IVA detraibile, costo deducibile al 100%</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ Omaggio > €50</p>
                  <span className="text-slate-300 text-xs">IVA indetraibile, deducibilità limitata</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}