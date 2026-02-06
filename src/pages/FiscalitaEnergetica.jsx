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
  HelpCircle,
  Phone,
  Mail,
  Video,
  Clock,
  Send,
  Lightbulb,
  TrendingDown,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const AREE_INTERVENTO = [
  {
    id: 'forniture',
    icon: Zap,
    title: 'Forniture energetiche',
    description: 'Verifica contratti luce e gas, ottimizzazione tariffe',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10'
  },
  {
    id: 'impianti',
    icon: Factory,
    title: 'Efficientamento impianti',
    description: 'Illuminazione, climatizzazione, macchinari',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10'
  },
  {
    id: 'produzione',
    icon: Sun,
    title: 'Produzione energia',
    description: 'Fotovoltaico, cogenerazione, accumulo',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10'
  },
  {
    id: 'agevolazioni',
    icon: FileText,
    title: 'Agevolazioni fiscali',
    description: 'Crediti d\'imposta, certificati bianchi, detrazioni',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10'
  },
  {
    id: 'transizione',
    icon: Leaf,
    title: 'Transizione ecologica',
    description: 'Bandi e incentivi green, certificazioni ambientali',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10'
  }
];

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

const SPESE_RANGE = [
  'Fino a 5.000€/anno',
  '5.000€ - 15.000€/anno',
  '15.000€ - 50.000€/anno',
  '50.000€ - 100.000€/anno',
  'Oltre 100.000€/anno',
  'Non so'
];

export default function FiscalitaEnergetica() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1); // 1=intro, 2=autovalutazione, 3=consulenza
  const queryClient = useQueryClient();

  // Form state
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

  // Verifica se l'utente ha già una richiesta pending
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

  // Mutation per creare richiesta
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
      setStep(4); // step finale conferma
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
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">Fiscalità Energetica</h1>
            <p className="text-slate-400 text-sm">Scopri come ottimizzare i costi energia</p>
          </div>
        </div>

        {/* Progress indicator */}
        {step < 4 && (
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div 
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-lime-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* STEP 1: INTRODUZIONE */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Intro card */}
            <Card className="bg-gradient-to-br from-lime-400/10 to-emerald-400/5 border-lime-400/20">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-lime-400/20 rounded-xl">
                    <Lightbulb className="w-8 h-8 text-lime-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg mb-2">Cos'è la Fiscalità Energetica?</h2>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      È l'insieme di agevolazioni fiscali, incentivi e detrazioni legate ai consumi 
                      e agli investimenti energetici della tua azienda.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key message */}
            <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4">
              <p className="text-amber-200 text-sm text-center">
                ⚠️ <strong>Molte imprese pagano più del dovuto</strong> senza conoscere le opportunità disponibili
              </p>
            </div>

            {/* Aree di intervento */}
            <div>
              <h3 className="text-white font-semibold mb-3">Dove puoi intervenire</h3>
              <div className="space-y-3">
                {AREE_INTERVENTO.map(area => {
                  const Icon = area.icon;
                  return (
                    <Card key={area.id} className={`${area.bgColor} border-slate-700/50`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-slate-800/50`}>
                            <Icon className={`w-5 h-5 ${area.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">{area.title}</p>
                            <p className="text-slate-400 text-xs">{area.description}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <Button 
              onClick={() => setStep(2)}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold py-6"
            >
              Inizia la valutazione
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* STEP 2: AUTO-VALUTAZIONE */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white font-bold text-lg mb-1">La tua situazione attuale</h2>
              <p className="text-slate-400 text-sm">Rispondi a queste domande per preparare la consulenza</p>
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
        {step === 3 && (
          <div className="space-y-6">
            {/* Perché una consulenza */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-lime-400" />
                  Cosa può fare un consulente per te
                </h3>
                <ul className="space-y-3">
                  {[
                    'Analisi contratti e consumi attuali',
                    'Verifica accesso a incentivi e bandi',
                    'Piano di efficientamento personalizzato',
                    'Supporto per pratiche e certificazioni'
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
              <h2 className="text-white font-bold text-lg mb-1">Richiedi un'analisi</h2>
              <p className="text-slate-400 text-sm">Un consulente ti contatterà per una prima valutazione</p>
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
              Un consulente specializzato ti contatterà a breve per una prima analisi gratuita.
            </p>
            <Link to={createPageUrl('Home')}>
              <Button variant="outline" className="border-lime-400 text-lime-400">
                Torna alla Home
              </Button>
            </Link>
          </div>
        )}
      </main>

      <BottomNav currentPage="FiscalitaEnergetica" />
    </div>
  );
}