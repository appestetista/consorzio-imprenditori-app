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
                I <span className="text-pink-400 font-medium">fringe benefit</span> sono compensi in natura (beni e servizi) erogati dal datore di lavoro ai dipendenti, che <span className="text-green-400 font-medium">non concorrono alla formazione del reddito imponibile</span> entro specifiche soglie annuali.
              </p>
              <div className="mt-3 bg-slate-900 rounded-lg p-3">
                <p className="text-slate-400 text-xs">📜 <span className="text-slate-300">Riferimento:</span> Art. 51, comma 3, TUIR (D.P.R. 917/1986)</p>
                <p className="text-slate-400 text-xs mt-1">📜 <span className="text-slate-300">Soglie 2025-2027:</span> L. 207/2024 (Legge di Bilancio 2025)</p>
              </div>
              <p className="text-slate-400 text-[10px] mt-2 leading-relaxed">La soglia ordinaria è <strong className="text-slate-300">€258,23</strong>. La Legge di Bilancio 2025 ha introdotto una deroga triennale (2025-2027) con soglie maggiorate.</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Euro className="w-5 h-5 text-pink-400" />
                Soglie di esenzione annuali (2025-2027)
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-center border border-slate-600">
                  <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <UserCheck className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-xs mb-1">Senza figli a carico</p>
                  <p className="text-white text-2xl font-bold">€1.000</p>
                  <p className="text-slate-500 text-xs">annui per dipendente</p>
                </div>
                <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl p-4 text-center border border-pink-500/30">
                  <div className="w-10 h-10 bg-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Baby className="w-5 h-5 text-pink-400" />
                  </div>
                  <p className="text-pink-300 text-xs mb-1">Con figli a carico</p>
                  <p className="text-pink-400 text-2xl font-bold">€2.000</p>
                  <p className="text-pink-300/70 text-xs">annui per dipendente</p>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mb-3 leading-relaxed">Figli a carico: reddito ≤ €4.000 (under 24) o ≤ €2.840,51 (over 24). Necessaria dichiarazione del dipendente con CF dei figli.</p>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-400 text-xs font-medium mb-2">✓ Vantaggi per l'azienda (entro la soglia):</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /><span className="text-slate-300 text-xs">Costo deducibile dal reddito d'impresa</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /><span className="text-slate-300 text-xs">Nessun contributo INPS/INAIL</span></div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" /><span className="text-slate-300 text-xs">Nessuna ritenuta IRPEF per il dipendente</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-slate-300 text-xs">
              <strong className="text-red-400">Effetto "tutto o niente":</strong> Se il totale annuo dei fringe benefit supera anche di 1€ la soglia, l'<strong>intero importo</strong> (non solo l'eccedenza) diventa imponibile ai fini IRPEF, INPS e INAIL.
            </AlertDescription>
          </Alert>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                Differenza con il Welfare Aziendale
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed mb-3">
                I fringe benefit (comma 3) e il welfare aziendale (comma 2) sono <strong className="text-white">strumenti distinti</strong> con regole diverse:
              </p>
              <div className="space-y-2">
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3">
                  <p className="text-pink-400 text-xs font-semibold">Fringe Benefit (art. 51, c.3 TUIR)</p>
                  <p className="text-slate-300 text-[11px] mt-1">Buoni spesa, gift card, beni in natura. Soglia: €1.000/€2.000. Erogabili anche ad personam. Superata la soglia → tassazione totale.</p>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                  <p className="text-cyan-400 text-xs font-semibold">Welfare Aziendale (art. 51, c.2 TUIR)</p>
                  <p className="text-slate-300 text-[11px] mt-1">Servizi di istruzione, sanità, previdenza, trasporti, assistenza familiare. <strong className="text-green-400">Nessun limite di importo</strong>. Richiede regolamento aziendale e destinazione a categorie omogenee di dipendenti (deducibilità ex art. 95 TUIR).</p>
                </div>
              </div>
              <p className="text-slate-400 text-[10px] mt-2">💡 I due strumenti sono cumulabili per lo stesso dipendente.</p>
            </CardContent>
          </Card>
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
                  <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ Omaggio &gt; €50</p>
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