import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { 
  ArrowLeft, 
  Zap, 
  Factory, 
  Sun, 
  FileText, 
  Leaf,
  ChevronRight,
  CheckCircle2,
  Phone,
  Mail,
  Video,
  Clock,
  Send,
  TrendingDown,
  Shield,
  AlertTriangle,
  Target,
  Euro,
  Percent,
  Award,
  ArrowDownRight,
  Sparkles,
  Building2,
  Banknote,
  PiggyBank
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const SETTORI = [
  'Manifatturiero',
  'Commercio',
  'Ristorazione/Hospitality',
  'Servizi',
  'Artigianato',
  'Agricoltura',
  'Edilizia',
  'Logistica',
  'Altro'
];

const CONSUMI_ELETTRICI = [
  'Fino a 10.000 kWh/anno',
  '10.000 - 50.000 kWh/anno',
  '50.000 - 200.000 kWh/anno',
  '200.000 - 1.000.000 kWh/anno',
  'Oltre 1.000.000 kWh/anno',
  'Non conosco il dato'
];

const CONSUMI_GAS = [
  'Fino a 5.000 Smc/anno',
  '5.000 - 25.000 Smc/anno',
  '25.000 - 100.000 Smc/anno',
  '100.000 - 500.000 Smc/anno',
  'Oltre 500.000 Smc/anno',
  'Non conosco il dato',
  'Non utilizzo gas'
];

const RUOLI_AZIENDALI = [
  'Titolare/Amministratore',
  'Direttore Operativo',
  'Responsabile Acquisti',
  'Responsabile Produzione',
  'CFO/Direttore Amministrativo',
  'Energy Manager',
  'Altro'
];

// Dati per il grafico del potenziale risparmio
const OPPORTUNITA_RISPARMIO = [
  {
    titolo: 'Accise ridotte',
    descrizione: 'Per attività produttive e manifatturiere',
    percentuale: '15-30%',
    icona: Factory,
    colore: 'from-blue-500 to-blue-600'
  },
  {
    titolo: 'Esenzioni IVA',
    descrizione: 'Per esportatori e regimi agevolati',
    percentuale: '22%',
    icona: Euro,
    colore: 'from-green-500 to-green-600'
  },
  {
    titolo: 'Crediti d\'imposta',
    descrizione: 'Per efficientamento e transizione 5.0',
    percentuale: '35-45%',
    icona: Percent,
    colore: 'from-amber-500 to-amber-600'
  },
  {
    titolo: 'Certificati bianchi',
    descrizione: 'Per interventi di risparmio energetico',
    percentuale: '€ diretti',
    icona: Award,
    colore: 'from-purple-500 to-purple-600'
  }
];

export default function FiscalitaEnergetica() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    settore_attivita: '',
    spesa_energetica_range: '',
    ha_fatto_efficientamento: '',
    ha_fotovoltaico: '',
    conosce_agevolazioni: '',
    note: '',
    preferenza_contatto: '',
    disponibilita_oraria: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: richiestaEsistente } = useQuery({
    queryKey: ['richiesta-fiscalita', user?.email],
    queryFn: async () => {
      const richieste = await base44.entities.RichiestaFiscalitaEnergetica.filter({ 
        user_email: user.email,
        status: 'pending'
      });
      return richieste[0] || null;
    },
    enabled: !!user?.email
  });

  const createRichiestaMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.RichiestaFiscalitaEnergetica.create({
        ...data,
        user_email: user.email,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['richiesta-fiscalita'] });
      toast.success('Richiesta inviata! Sarai contattato a breve.');
      setStep(4);
    },
    onError: () => {
      toast.error('Errore nell\'invio della richiesta');
    }
  });

  const handleSubmit = () => {
    if (!formData.settore_attivita || !formData.spesa_energetica_range) {
      toast.error('Compila almeno settore e spesa energetica');
      return;
    }
    if (!formData.preferenza_contatto) {
      toast.error('Seleziona una preferenza di contatto');
      return;
    }
    createRichiestaMutation.mutate(formData);
  };

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#001d3b' }}>
      <Header user={user} />

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('RisparmioEnergetico')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">Fiscalità Energetica</h1>
            <p className="text-slate-400 text-sm">Recupera margine dalla bolletta</p>
          </div>
        </div>

        {/* Progress indicator */}
        {step < 4 && !richiestaEsistente && (
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div 
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-gradient-to-r from-lime-400 to-emerald-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* STEP 1: INTRODUZIONE CON GRAFICA D'IMPATTO */}
        {step === 1 && !richiestaEsistente && (
          <div className="space-y-6">
            
            {/* HERO - Impatto visivo immediato */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-lime-500 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Euro className="w-8 h-8 text-white" />
                  <Badge className="bg-white/20 text-white border-0">Risparmio fiscale</Badge>
                </div>
                <h2 className="text-white text-2xl font-bold mb-2">
                  Stai pagando troppo<br/>sulle bollette?
                </h2>
                <p className="text-white/90 text-sm">
                  La maggior parte delle imprese non conosce le agevolazioni a cui ha diritto per legge.
                </p>
              </div>
            </div>

            {/* BLOCCO 1: Cos'è la fiscalità energetica */}
            <Card className="bg-slate-800/70 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-white font-bold">Cos'è la fiscalità energetica</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  È l'insieme delle imposte, accise e oneri che pesano sulla bolletta di luce e gas. 
                  La legge prevede riduzioni ed esenzioni per determinate categorie di imprese, 
                  ma queste opportunità restano spesso inutilizzate. Conoscerle significa 
                  <span className="text-lime-400 font-medium"> recuperare margine operativo immediato</span>, 
                  senza dover cambiare fornitore né fare investimenti.
                </p>
              </CardContent>
            </Card>

            {/* GRAFICO VISUALE - Opportunità di risparmio */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-white font-bold">Quanto puoi recuperare</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {OPPORTUNITA_RISPARMIO.map((opp, idx) => {
                  const Icon = opp.icona;
                  return (
                    <div 
                      key={idx}
                      className="relative overflow-hidden rounded-xl bg-slate-800/50 border border-slate-700 p-4"
                    >
                      {/* Barra colorata laterale */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${opp.colore}`} />
                      
                      <div className="pl-2">
                        <div className="flex items-center justify-between mb-2">
                          <Icon className="w-5 h-5 text-slate-400" />
                          <span className={`text-lg font-bold bg-gradient-to-r ${opp.colore} bg-clip-text text-transparent`}>
                            {opp.percentuale}
                          </span>
                        </div>
                        <p className="text-white text-sm font-medium mb-1">{opp.titolo}</p>
                        <p className="text-slate-400 text-xs leading-tight">{opp.descrizione}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BLOCCO 2: Perché si paga troppo */}
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-amber-200 font-bold">Perché molte aziende pagano più del dovuto</h3>
                </div>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <ArrowDownRight className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>I fornitori applicano tariffe standard, senza verificare il diritto a riduzioni</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowDownRight className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>Le accise vengono addebitate per intero anche quando non dovute</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowDownRight className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>I codici attività non sempre corrispondono all'uso effettivo dell'energia</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* BLOCCO 3: Quando si ha diritto */}
            <Card className="bg-slate-800/70 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-white font-bold">Quando si ha diritto a riduzioni o esenzioni</h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { icon: Factory, text: 'Imprese manifatturiere e artigianali' },
                    { icon: Building2, text: 'Attività con consumi superiori a determinate soglie' },
                    { icon: Leaf, text: 'Aziende che investono in efficientamento' },
                    { icon: Sun, text: 'Imprese con impianti di autoproduzione' },
                    { icon: Banknote, text: 'Esportatori abituali e operatori in specifici settori' }
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 px-3 bg-slate-700/30 rounded-lg">
                        <Icon className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* BLOCCO 4: Perché vengono ignorate */}
            <Card className="bg-slate-800/70 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-white font-bold">Perché queste opportunità restano ignorate</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  La normativa fiscale in ambito energetico è complessa e frammentata. 
                  I commercialisti generalmente non si occupano di accise, e i fornitori di energia 
                  non hanno interesse a segnalare possibili riduzioni.
                </p>
                <p className="text-slate-400 text-sm italic">
                  Il risultato? L'imprenditore paga, spesso senza sapere che potrebbe non farlo.
                </p>
              </CardContent>
            </Card>

            {/* BLOCCO 5: Perché serve una consulenza */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-800/50 border-lime-500/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-lime-500/20 rounded-lg">
                    <Shield className="w-5 h-5 text-lime-400" />
                  </div>
                  <h3 className="text-white font-bold">Perché serve una consulenza tecnica specializzata</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Per ottenere i benefici previsti dalla legge è necessario verificare 
                  i requisiti specifici dell'impresa, analizzare i contratti di fornitura, 
                  controllare la corretta classificazione dell'utenza e, se necessario, 
                  presentare le istanze agli enti competenti.
                </p>
                <div className="bg-lime-400/10 rounded-lg p-3 border border-lime-400/20">
                  <p className="text-lime-300 text-sm font-medium text-center">
                    Non è un'attività che si può improvvisare: serve competenza tecnica e fiscale insieme.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* BLOCCO 6: Come interviene il consulente */}
            <Card className="bg-slate-800/70 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Award className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-white font-bold">Come interviene il consulente</h3>
                </div>
                
                {/* Timeline visuale */}
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-500 via-lime-500 to-emerald-500" />
                  
                  {[
                    { num: '1', title: 'Analisi', desc: 'Esamina bollette, contratti e codici attività' },
                    { num: '2', title: 'Verifica', desc: 'Identifica le agevolazioni applicabili al tuo caso' },
                    { num: '3', title: 'Calcolo', desc: 'Quantifica il risparmio potenziale e il recupero pregresso' },
                    { num: '4', title: 'Azione', desc: 'Prepara e presenta le istanze necessarie' },
                    { num: '5', title: 'Risultato', desc: 'Ottieni la riduzione in bolletta o il rimborso' }
                  ].map((step, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className="absolute -left-6 w-4 h-4 rounded-full bg-slate-800 border-2 border-lime-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{step.title}</p>
                        <p className="text-slate-400 text-xs">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* BLOCCO 7: Il consulente di efficientamento energetico */}
            <Card className="bg-slate-800/70 border-slate-700 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 px-5 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Target className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Il consulente di efficientamento energetico</h3>
                    <p className="text-slate-400 text-xs">La figura chiave per intercettare il risparmio fiscale</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-5 space-y-5">
                {/* Chi è */}
                <div>
                  <h4 className="text-indigo-300 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">1</span>
                    Chi è
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    È un tecnico specializzato nell'analisi dei consumi energetici aziendali. 
                    Conosce le tecnologie, i processi produttivi e le normative che regolano 
                    l'uso dell'energia nelle imprese. Il suo compito è individuare dove si 
                    spreca, dove si può ottimizzare e dove esistono opportunità fiscali non sfruttate.
                  </p>
                </div>

                {/* Perché è centrale */}
                <div>
                  <h4 className="text-indigo-300 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">2</span>
                    Perché è centrale per la fiscalità energetica
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Le agevolazioni fiscali sull'energia non si applicano automaticamente: 
                    richiedono la dimostrazione tecnica dell'uso che l'azienda fa dell'energia. 
                    Solo chi conosce i processi produttivi può classificare correttamente i consumi, 
                    identificare le soglie di accesso ai benefici e documentare il diritto alle riduzioni.
                  </p>
                </div>

                {/* Come analizza */}
                <div>
                  <h4 className="text-indigo-300 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">3</span>
                    Come analizza consumi e impianti
                  </h4>
                  <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
                    {[
                      'Esamina le bollette per verificare la corretta applicazione di accise e oneri',
                      'Analizza i contratti di fornitura e le condizioni economiche applicate',
                      'Studia il ciclo produttivo per capire come viene impiegata l\'energia',
                      'Verifica la classificazione dell\'utenza presso il fornitore e l\'Agenzia delle Dogane',
                      'Misura i consumi reali degli impianti per identificare inefficienze'
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complementare al commercialista */}
                <div>
                  <h4 className="text-indigo-300 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">4</span>
                    Complementare al commercialista, non alternativo
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">
                    Il commercialista gestisce la contabilità e gli adempimenti fiscali ordinari, 
                    ma raramente ha competenze tecniche sulle accise energetiche o sui requisiti 
                    per accedere ai benefici. Il consulente energetico fornisce l'analisi tecnica, 
                    il commercialista la traduce in dichiarazioni e adempimenti.
                  </p>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                    <p className="text-indigo-200 text-sm text-center">
                      Insieme coprono l'intera catena: <span className="font-medium">analisi tecnica → documentazione → beneficio fiscale</span>
                    </p>
                  </div>
                </div>

                {/* Accompagnamento nel tempo */}
                <div>
                  <h4 className="text-indigo-300 font-semibold text-sm mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">5</span>
                    Un accompagnamento nel tempo
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    La fiscalità energetica non è un intervento una tantum. Le normative cambiano, 
                    i consumi evolvono, gli impianti si modificano. Il consulente monitora nel tempo 
                    la situazione dell'azienda, verifica che i benefici restino applicabili e 
                    segnala nuove opportunità quando emergono.
                  </p>
                </div>

                {/* Conclusione forte */}
                <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg p-4 border border-indigo-500/20">
                  <p className="text-white text-sm text-center font-medium">
                    Senza un'analisi tecnica dei consumi, il risparmio fiscale sull'energia 
                    resta invisibile. È il consulente di efficientamento che lo rende accessibile.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* VISUAL SUMMARY - Impatto finale */}
            <div className="bg-gradient-to-r from-emerald-600/20 via-lime-500/20 to-green-600/20 rounded-2xl p-5 border border-lime-500/30">
              <div className="text-center mb-4">
                <PiggyBank className="w-10 h-10 text-lime-400 mx-auto mb-2" />
                <h3 className="text-white font-bold text-lg">Il tuo potenziale risparmio</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-lime-400">5-30%</p>
                  <p className="text-slate-400 text-xs">sulla bolletta</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-amber-400">5 anni</p>
                  <p className="text-slate-400 text-xs">recuperabili</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-emerald-400">0€</p>
                  <p className="text-slate-400 text-xs">anticipo</p>
                </div>
              </div>
              
              <p className="text-center text-slate-300 text-sm mt-4">
                La prima analisi è gratuita. Paghi solo a risultato ottenuto.
              </p>
            </div>

            {/* CTA */}
            <Button 
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-500 hover:to-emerald-500 text-slate-900 font-bold py-6 text-base shadow-lg shadow-lime-500/25"
            >
              Verifica il tuo risparmio
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: AUTO-VALUTAZIONE */}
        {step === 2 && !richiestaEsistente && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-bold text-lg mb-1">La tua situazione attuale</h2>
              <p className="text-slate-400 text-sm">Rispondi a queste domande per preparare l'analisi</p>
            </div>

            {/* Settore */}
            <div className="space-y-2">
              <Label className="text-slate-300">Settore di attività *</Label>
              <Select value={formData.settore_attivita} onValueChange={v => updateForm('settore_attivita', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Seleziona settore" />
                </SelectTrigger>
                <SelectContent>
                  {SETTORI.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spesa energetica */}
            <div className="space-y-2">
              <Label className="text-slate-300">Spesa energetica annua indicativa *</Label>
              <Select value={formData.spesa_energetica_range} onValueChange={v => updateForm('spesa_energetica_range', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Seleziona range" />
                </SelectTrigger>
                <SelectContent>
                  {SPESE_RANGE.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Domande Sì/No */}
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                <p className="text-white text-sm">Hai già fatto interventi di efficientamento?</p>
                <RadioGroup 
                  value={formData.ha_fatto_efficientamento} 
                  onValueChange={v => updateForm('ha_fatto_efficientamento', v)}
                  className="flex gap-4"
                >
                  {['Sì', 'No', 'Non so'].map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`eff-${opt}`} className="border-slate-600" />
                      <Label htmlFor={`eff-${opt}`} className="text-slate-300 text-sm">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                <p className="text-white text-sm">Hai impianti fotovoltaici?</p>
                <RadioGroup 
                  value={formData.ha_fotovoltaico} 
                  onValueChange={v => updateForm('ha_fotovoltaico', v)}
                  className="flex gap-4"
                >
                  {['Sì', 'No', 'In valutazione'].map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`fv-${opt}`} className="border-slate-600" />
                      <Label htmlFor={`fv-${opt}`} className="text-slate-300 text-sm">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                <p className="text-white text-sm">Conosci le agevolazioni disponibili per la tua azienda?</p>
                <RadioGroup 
                  value={formData.conosce_agevolazioni} 
                  onValueChange={v => updateForm('conosce_agevolazioni', v)}
                  className="flex gap-4"
                >
                  {['Sì', 'No', 'Parzialmente'].map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`ag-${opt}`} className="border-slate-600" />
                      <Label htmlFor={`ag-${opt}`} className="text-slate-300 text-sm">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex-1 border-slate-600 text-slate-300"
              >
                Indietro
              </Button>
              <Button 
                onClick={() => setStep(3)}
                className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
              >
                Continua
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: RICHIESTA CONSULENZA */}
        {step === 3 && !richiestaEsistente && (
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-lime-400" />
                  Cosa include l'analisi gratuita
                </h3>
                <ul className="space-y-3">
                  {[
                    'Verifica diritto a riduzioni accise',
                    'Controllo corretta applicazione IVA',
                    'Stima del risparmio potenziale',
                    'Calcolo eventuale recupero pregresso (fino a 5 anni)'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-white font-bold text-lg mb-1">Richiedi l'analisi gratuita</h2>
              <p className="text-slate-400 text-sm">Un consulente ti contatterà entro 48 ore</p>
            </div>

            {/* Preferenza contatto */}
            <div className="space-y-3">
              <Label className="text-slate-300">Come preferisci essere contattato? *</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'Telefono', icon: Phone, label: 'Telefono' },
                  { value: 'Email', icon: Mail, label: 'Email' },
                  { value: 'Videochiamata', icon: Video, label: 'Video' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateForm('preferenza_contatto', opt.value)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.preferenza_contatto === opt.value
                        ? 'bg-lime-400/20 border-lime-400 text-lime-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Disponibilità */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Disponibilità oraria
              </Label>
              <Select value={formData.disponibilita_oraria} onValueChange={v => updateForm('disponibilita_oraria', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Seleziona fascia oraria" />
                </SelectTrigger>
                <SelectContent>
                  {['Mattina (9-12)', 'Pranzo (12-14)', 'Pomeriggio (14-18)', 'Qualsiasi orario'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label className="text-slate-300">Note aggiuntive (facoltativo)</Label>
              <Textarea
                value={formData.note}
                onChange={e => updateForm('note', e.target.value)}
                placeholder="Descrivi brevemente la tua situazione o le tue esigenze..."
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
              />
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep(2)}
                className="flex-1 border-slate-600 text-slate-300"
              >
                Indietro
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createRichiestaMutation.isPending}
                className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
              >
                {createRichiestaMutation.isPending ? (
                  <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Invia richiesta
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFERMA */}
        {(step === 4 || richiestaEsistente) && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-lime-400" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Richiesta inviata!</h2>
            <p className="text-slate-400 mb-8">
              Un consulente specializzato ti contatterà entro 48 ore per una prima analisi gratuita.
            </p>
            <Link to={createPageUrl('RisparmioEnergetico')}>
              <Button variant="outline" className="border-lime-400 text-lime-400">
                Torna a Risparmio
              </Button>
            </Link>
          </div>
        )}
      </main>

      <BottomNav currentPage="FiscalitaEnergetica" />
    </div>
  );
}