import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Users, AlertTriangle, CheckCircle, XCircle, Euro, Building2, UserCheck, Baby, Info, UtensilsCrossed, Gift, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

export default function WelfareNormativa() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('buoni-pasto');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('WelfareAziendale')} className="text-pink-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Normativa Welfare</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Normativa</h2>
                <p className="text-white/80 text-sm">Regole e limiti di esenzione</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-4 bg-slate-800 border border-slate-700 p-1 rounded-xl h-auto">
            <TabsTrigger 
              value="buoni-pasto" 
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-slate-400 rounded-lg text-sm py-3 px-1 leading-tight font-medium"
            >
              Buoni<br/>Pasto
            </TabsTrigger>
            <TabsTrigger 
              value="fringe-benefit" 
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-slate-400 rounded-lg text-sm py-3 px-1 leading-tight font-medium"
            >
              Fringe<br/>Benefit
            </TabsTrigger>
            <TabsTrigger 
              value="buoni-regalo" 
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-slate-400 rounded-lg text-sm py-3 px-1 leading-tight font-medium"
            >
              Buoni<br/>Regalo
            </TabsTrigger>
            <TabsTrigger 
              value="buoni-omaggio" 
              className="data-[state=active]:bg-pink-500 data-[state=active]:text-white text-slate-400 rounded-lg text-sm py-3 px-1 leading-tight font-medium"
            >
              Buoni<br/>Omaggio
            </TabsTrigger>
          </TabsList>

          {/* TAB BUONI PASTO */}
          <TabsContent value="buoni-pasto" className="mt-4 space-y-4">
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

          {/* TAB FRINGE BENEFIT */}
          <TabsContent value="fringe-benefit" className="mt-4 space-y-4">

        {/* Definizione */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-pink-400" />
              Cosa sono i Fringe Benefit?
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              I <span className="text-pink-400 font-medium">fringe benefit</span> (benefici accessori non monetari) sono beni e servizi messi a disposizione dal datore di lavoro ai lavoratori, che <span className="text-green-400 font-medium">non concorrono alla formazione del reddito imponibile</span> entro specifici limiti annuali.
            </p>
            <div className="mt-3 bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs">
                📜 <span className="text-slate-300">Riferimento normativo:</span> Art. 51, comma 3 del TUIR (Testo Unico delle Imposte sui Redditi)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ambito soggettivo */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-400" />
              A chi si applicano?
            </h3>
            
            <div className="space-y-3">
              {/* Lavoratori dipendenti */}
              <div className="flex items-start gap-3 bg-slate-900 rounded-lg p-3">
                <div className="w-10 h-10 bg-green-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Lavoratori dipendenti</p>
                  <p className="text-slate-400 text-xs">Tutti i lavoratori subordinati</p>
                </div>
              </div>

              {/* Amministratori */}
              <div className="flex items-start gap-3 bg-slate-900 rounded-lg p-3">
                <div className="w-10 h-10 bg-blue-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Amministratori SRL / SPA</p>
                  <p className="text-slate-400 text-xs">Con compenso qualificato come reddito assimilato a lavoro dipendente (art. 50, comma 1, lett. c-bis TUIR)</p>
                </div>
              </div>
            </div>

            {/* Warning */}
            <Alert className="mt-4 bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-slate-300 text-xs">
                <strong className="text-amber-400">Attenzione:</strong> I fringe benefit non sono ammessi in assenza di compenso da amministratore o se il beneficio è riconducibile esclusivamente alla qualità di socio.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Soglie di esenzione - Grafico visuale */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Euro className="w-5 h-5 text-pink-400" />
              Soglie di esenzione annuali
            </h3>

            <p className="text-slate-300 text-sm mb-4">
              Puoi erogare ai tuoi dipendenti fringe benefit <strong className="text-green-400">senza pagare tasse né contributi</strong>, fino a questi limiti:
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Senza figli */}
              <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-center border border-slate-600">
                <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <UserCheck className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-400 text-xs mb-1">Dipendente senza figli</p>
                <p className="text-white text-2xl font-bold">€1.000</p>
                <p className="text-slate-500 text-xs">all'anno per dipendente</p>
              </div>

              {/* Con figli */}
              <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl p-4 text-center border border-pink-500/30">
                <div className="w-12 h-12 bg-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Baby className="w-6 h-6 text-pink-400" />
                </div>
                <p className="text-pink-300 text-xs mb-1">Dipendente con figli</p>
                <p className="text-pink-400 text-2xl font-bold">€2.000</p>
                <p className="text-pink-300/70 text-xs">all'anno per dipendente</p>
              </div>
            </div>

            {/* Esempio pratico */}
            <div className="bg-slate-900 rounded-lg p-3 mb-4">
              <p className="text-pink-400 text-xs font-semibold mb-2">💡 Esempio pratico:</p>
              <p className="text-slate-300 text-xs leading-relaxed">
                Hai 5 dipendenti senza figli? Puoi erogare fino a <strong className="text-white">€5.000 totali</strong> (€1.000 x 5) in buoni spesa, gift card o altri benefit, <strong className="text-green-400">senza versare un euro</strong> di tasse o contributi.
              </p>
            </div>

            {/* Cosa significa */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-400 text-xs font-medium mb-2">✓ Vantaggi per te (azienda):</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-slate-300 text-xs">Costo 100% deducibile</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-slate-300 text-xs">Nessun contributo INPS da versare</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-slate-300 text-xs">Nessuna ritenuta fiscale da applicare</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Superamento limite */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              ⚠️ Attenzione: superamento del limite
            </h3>

            <p className="text-slate-300 text-sm mb-4">
              Questo è il punto più importante da capire: se superi anche di <strong className="text-red-400">1 solo euro</strong> la soglia, <strong className="text-white">perdi TUTTA l'esenzione</strong>.
            </p>
            
            {/* Esempio visuale */}
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <p className="text-slate-400 text-xs mb-3 text-center">Dipendente senza figli (soglia €1.000)</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-green-500/20 border border-green-500/40 rounded-lg p-2 text-center">
                    <p className="text-green-400 text-sm font-bold">€1.000</p>
                    <p className="text-green-300 text-xs">Esente al 100%</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-red-500/20 border border-red-500/40 rounded-lg p-2 text-center">
                    <p className="text-red-400 text-sm font-bold">€1.001</p>
                    <p className="text-red-300 text-xs">Tassato TUTTO (€1.001)</p>
                  </div>
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
              </div>
            </div>

            <Alert className="bg-red-500/10 border-red-500/30 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-slate-300 text-xs">
                <strong className="text-red-400">NON è come l'IRPEF!</strong> Non si tassa solo la parte eccedente. Se dai €1.001, paghi tasse e contributi su tutti i €1.001.
              </AlertDescription>
            </Alert>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-400 text-xs font-semibold mb-1">💡 Consiglio pratico:</p>
              <p className="text-slate-300 text-xs">
                Resta sempre sotto la soglia con un margine di sicurezza. Meglio €950 che rischiare €1.001!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Condizioni per amministratori */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-pink-400" />
              Condizioni per Amministratori
            </h3>
            <p className="text-slate-400 text-sm mb-3">
              Per gli amministratori di società di capitali, i fringe benefit sono ammessi solo se:
            </p>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2 bg-slate-900 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300 text-sm">Il compenso è <strong className="text-white">regolarmente deliberato</strong></span>
              </div>
              <div className="flex items-start gap-2 bg-slate-900 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300 text-sm">Il benefit è <strong className="text-white">coerente con il ruolo</strong> di amministratore</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-900 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-300 text-sm">Non costituisce <strong className="text-white">uso personale mascherato</strong> né distribuzione indiretta di utili</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Riepilogo visivo */}
        <Card className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-500/30">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 text-center">📊 Riepilogo</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-pink-400 text-lg font-bold">€1.000</p>
                <p className="text-slate-400 text-xs">Senza figli</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-pink-400 text-lg font-bold">€2.000</p>
                <p className="text-slate-400 text-xs">Con figli</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 col-span-2">
                <p className="text-green-400 text-sm font-medium">100% Esente</p>
                <p className="text-slate-400 text-xs">Entro le soglie: zero tasse, zero contributi</p>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* TAB BUONI REGALO */}
          <TabsContent value="buoni-regalo" className="mt-4 space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-400" />
                  Cosa sono i Buoni Regalo?
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  I <span className="text-pink-400 font-medium">buoni regalo</span> (gift card) sono titoli di pagamento spendibili presso catene commerciali, negozi o piattaforme online per l'acquisto di beni e servizi.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Euro className="w-5 h-5 text-pink-400" />
                  Limiti di esenzione
                </h3>
                <p className="text-slate-300 text-sm mb-3">
                  I buoni regalo rientrano nella categoria dei <strong className="text-white">fringe benefit</strong> e seguono le stesse soglie:
                </p>
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

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3">Esempi di utilizzo</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Gift card Amazon, Zalando, MediaWorld</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Buoni carburante</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Voucher per esperienze e viaggi</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB BUONI OMAGGIO */}
          <TabsContent value="buoni-omaggio" className="mt-4 space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-pink-400" />
                  Cosa sono i Buoni Omaggio?
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  I <span className="text-pink-400 font-medium">buoni omaggio</span> sono omaggi in natura o buoni acquisto destinati a <strong className="text-white">clienti, fornitori o partner commerciali</strong>, non ai dipendenti.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Euro className="w-5 h-5 text-pink-400" />
                  Limiti di deducibilità
                </h3>
                <p className="text-slate-300 text-sm mb-3">
                  Gli omaggi a clienti/fornitori sono <strong className="text-white">spese di rappresentanza</strong> e seguono regole diverse:
                </p>
                <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-4 text-center border border-pink-500/30 mb-3">
                  <p className="text-pink-300 text-xs mb-1">Limite per singolo omaggio</p>
                  <p className="text-pink-400 text-2xl font-bold">€50,00</p>
                  <p className="text-pink-300/70 text-xs">IVA detraibile + costo deducibile</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">
                    📜 <span className="text-slate-300">Riferimento:</span> Art. 108, comma 2, TUIR e DM 19/11/2008
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3">Regole fiscali</h3>
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <p className="text-green-400 text-xs font-semibold mb-1">✓ Omaggio ≤ €50</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <span className="text-slate-300 text-xs">IVA interamente detraibile</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <span className="text-slate-300 text-xs">Costo interamente deducibile</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-amber-400 text-xs font-semibold mb-1">⚠️ Omaggio &gt; €50</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="text-slate-300 text-xs">IVA indetraibile</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="text-slate-300 text-xs">Deducibilità limitata (in base ai ricavi)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3">Esempi di utilizzo</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Cesti natalizi per clienti</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Bottiglie di vino per fornitori</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Gadget aziendali per eventi</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Buoni acquisto per partner</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="bg-blue-500/10 border-blue-500/30">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-slate-300 text-xs">
                <strong className="text-blue-400">Differenza chiave:</strong> I buoni omaggio sono per terzi (clienti/fornitori), i fringe benefit sono per i dipendenti. Regole fiscali completamente diverse!
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav currentPage="WelfareAziendale" unreadMessages={messages.length} />
    </div>
  );
}