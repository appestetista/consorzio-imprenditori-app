import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Upload, FileText, CheckCircle, Info, TrendingDown, Users, Clock, Send, Loader2, Shield, Lightbulb, Flame, Leaf, Sun, Phone, Wifi, Building2, Home, Factory, MapPin, HelpCircle, Heart, Calculator, TrendingUp, Gift, Banknote, UserCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const CATEGORIE_INFO = {
  'Assicurazioni': {
    icon: Shield,
    color: 'from-blue-500 to-blue-600',
    vantaggi: [
      'Polizze collettive a tariffe agevolate',
      'Coperture personalizzate per PMI',
      'Consulenza gratuita con broker dedicato',
      'Gestione sinistri semplificata'
    ],
    descrizione: 'Carica la tua polizza attuale e ricevi un\'analisi gratuita con proposte di risparmio.',
    tipoDocumento: 'polizza assicurativa'
  },
  'Luce': {
    icon: Lightbulb,
    color: 'from-yellow-500 to-orange-500',
    vantaggi: [
      'Tariffe energia elettrica scontate fino al 20%',
      'Energia 100% da fonti rinnovabili',
      'Nessun costo di attivazione',
      'Fatturazione trasparente'
    ],
    descrizione: 'Inviaci la tua bolletta della luce e ti proporremo la tariffa più conveniente.',
    tipoDocumento: 'bolletta della luce'
  },
  'Gas': {
    icon: Flame,
    color: 'from-orange-500 to-red-500',
    vantaggi: [
      'Prezzi gas metano competitivi',
      'Contratti flessibili',
      'Assistenza clienti dedicata',
      'Bonus per consumi elevati'
    ],
    descrizione: 'Carica la tua bolletta del gas per ricevere un preventivo personalizzato.',
    tipoDocumento: 'bolletta del gas'
  },
  'Efficientamento Energetico': {
    icon: Leaf,
    color: 'from-green-500 to-emerald-600',
    vantaggi: [
      'Audit energetico gratuito',
      'Accesso a incentivi e detrazioni fiscali',
      'Riduzione consumi fino al 40%',
      'Certificazione energetica'
    ],
    descrizione: 'Invia le tue bollette per una valutazione del potenziale di risparmio.',
    tipoDocumento: 'bollette recenti'
  },
  'Fotovoltaico': {
    icon: Sun,
    color: 'from-amber-400 to-yellow-500',
    vantaggi: [
      'Preventivi impianti fotovoltaici',
      'Accesso a incentivi statali',
      'Finanziamenti agevolati',
      'Manutenzione inclusa'
    ],
    descrizione: 'Carica le tue bollette per calcolare il dimensionamento ideale dell\'impianto.',
    tipoDocumento: 'bollette energia'
  },
  'Spesa Telefonica': {
    icon: Phone,
    color: 'from-purple-500 to-violet-600',
    vantaggi: [
      'Piani business a tariffe ridotte',
      'Minuti e GB illimitati',
      'Dispositivi a rate agevolate',
      'Assistenza prioritaria'
    ],
    descrizione: 'Inviaci la tua bolletta telefonica per un\'offerta su misura.',
    tipoDocumento: 'bolletta telefonica'
  },
  'Internet': {
    icon: Wifi,
    color: 'from-cyan-500 to-blue-500',
    vantaggi: [
      'Fibra ultraveloce fino a 10 Gbps',
      'IP statico incluso',
      'SLA garantito per aziende',
      'Backup 4G/5G incluso'
    ],
    descrizione: 'Carica la tua bolletta internet e scopri le offerte dedicate.',
    tipoDocumento: 'bolletta internet'
  },
  'Welfare Aziendale': {
    icon: Heart,
    color: 'from-pink-500 to-rose-500',
    vantaggi: [
      'Riduzione del carico fiscale',
      'Maggiore valore netto per i dipendenti',
      'Aumento della produttività',
      'Fidelizzazione del personale'
    ],
    descrizione: 'Scopri come trasformare un costo lordo in valore netto per i tuoi dipendenti.',
    tipoDocumento: null
  }
};

export default function RisparmioDettaglio() {
  const [user, setUser] = useState(null);
  const [categoria, setCategoria] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Form fotovoltaico
  const [fotovoltaicoForm, setFotovoltaicoForm] = useState({
    tipo_immobile: '',
    superficie_tetto: '',
    orientamento_tetto: '',
    consumo_mensile: '',
    consumo_annuo_kwh: '',
    fasce_orarie_consumo: [],
    potenza_contatore: '',
    anno_impianto_elettrico: '',
    interesse_incentivi: [],
    tipo_copertura: '',
    presenza_ombreggiature: '',
    interesse_batterie: '',
    interesse_colonnina: '',
    budget_indicativo: '',
    tempistiche: '',
    indirizzo_installazione: ''
  });

  // Form spesa telefonica
  const [telefonicaForm, setTelefonicaForm] = useState({
    tipo_utenza: '',
    operatore_attuale: '',
    num_linee: '',
    num_interni: '',
    num_mobile: '',
    spesa_mensile: '',
    servizi_utilizzati: [],
    problemi_attuali: '',
    interesse_fibra: '',
    interesse_mobile: ''
  });

  // Form efficientamento energetico
  const [efficientamentoForm, setEfficientamentoForm] = useState({
    tipo_immobile: '',
    anno_costruzione: '',
    superficie_mq: '',
    classe_energetica_attuale: '',
    tipo_riscaldamento: '',
    tipo_raffrescamento: '',
    tipo_infissi: '',
    isolamento_pareti: '',
    isolamento_tetto: '',
    spesa_annua_energia: '',
    interventi_interesse: [],
    ha_gia_preventivi: '',
    tempistiche: '',
    budget_indicativo: ''
  });

  // Form internet
  const [internetForm, setInternetForm] = useState({
    tipo_utenza: '',
    operatore_attuale: '',
    tipo_connessione: '',
    velocita_attuale: '',
    spesa_mensile: '',
    esigenze: [],
    problemi_attuali: '',
    indirizzo: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCategoria(params.get('categoria') || '');
  }, []);

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

  // Richieste precedenti dell'utente per questa categoria
  const { data: mieRichieste = [] } = useQuery({
    queryKey: ['mie-richieste-risparmio', user?.email, categoria],
    queryFn: () => base44.entities.RichiestaRisparmio.filter({ 
      user_email: user?.email, 
      categoria: categoria 
    }),
    enabled: !!user?.email && !!categoria,
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    
    // Crea preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      
      let fileUrl = null;
      if (uploadedFile) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: uploadedFile });
        fileUrl = uploadResult.file_url;
      }

      // Per fotovoltaico, costruisci le note dal form
      let noteFinali = note;
      if (categoria === 'Fotovoltaico') {
        noteFinali = `
RICHIESTA PREVENTIVO FOTOVOLTAICO

📍 UBICAZIONE E IMMOBILE:
- Tipo immobile: ${fotovoltaicoForm.tipo_immobile || 'Non specificato'}
- Indirizzo installazione: ${fotovoltaicoForm.indirizzo_installazione || 'Non specificato'}
- Superficie tetto stimata: ${fotovoltaicoForm.superficie_tetto || 'Non specificato'}
- Tipo copertura: ${fotovoltaicoForm.tipo_copertura || 'Non specificato'}
- Orientamento tetto: ${fotovoltaicoForm.orientamento_tetto || 'Non specificato'}
- Presenza ombreggiature: ${fotovoltaicoForm.presenza_ombreggiature || 'Non specificato'}

⚡ CONSUMI E ESIGENZE:
- Spesa media mensile bolletta: ${fotovoltaicoForm.consumo_mensile || 'Non specificato'}
- Consumo annuo energia (kWh): ${fotovoltaicoForm.consumo_annuo_kwh || 'Non specificato'}
- Fasce orarie consumo: ${fotovoltaicoForm.fasce_orarie_consumo.length > 0 ? fotovoltaicoForm.fasce_orarie_consumo.join(', ') : 'Non specificato'}
- Potenza contatore: ${fotovoltaicoForm.potenza_contatore || 'Non specificato'}
- Anno impianto elettrico: ${fotovoltaicoForm.anno_impianto_elettrico || 'Non specificato'}
- Interesse incentivi fiscali: ${fotovoltaicoForm.interesse_incentivi.length > 0 ? fotovoltaicoForm.interesse_incentivi.join(', ') : 'Non specificato'}
- Interesse batterie accumulo: ${fotovoltaicoForm.interesse_batterie || 'Non specificato'}
- Interesse colonnina ricarica: ${fotovoltaicoForm.interesse_colonnina || 'Non specificato'}

💰 BUDGET E TEMPISTICHE:
- Budget indicativo: ${fotovoltaicoForm.budget_indicativo || 'Non specificato'}
- Tempistiche desiderate: ${fotovoltaicoForm.tempistiche || 'Non specificato'}

📝 NOTE AGGIUNTIVE:
${note || 'Nessuna'}
        `.trim();
      } else if (categoria === 'Efficientamento Energetico') {
        noteFinali = `
RICHIESTA ANALISI EFFICIENTAMENTO ENERGETICO

🏢 IMMOBILE:
- Tipo immobile: ${efficientamentoForm.tipo_immobile || 'Non specificato'}
- Anno costruzione: ${efficientamentoForm.anno_costruzione || 'Non specificato'}
- Superficie (mq): ${efficientamentoForm.superficie_mq || 'Non specificato'}
- Classe energetica attuale: ${efficientamentoForm.classe_energetica_attuale || 'Non specificato'}

🔥 IMPIANTI ATTUALI:
- Tipo riscaldamento: ${efficientamentoForm.tipo_riscaldamento || 'Non specificato'}
- Tipo raffrescamento: ${efficientamentoForm.tipo_raffrescamento || 'Non specificato'}
- Tipo infissi: ${efficientamentoForm.tipo_infissi || 'Non specificato'}
- Isolamento pareti: ${efficientamentoForm.isolamento_pareti || 'Non specificato'}
- Isolamento tetto: ${efficientamentoForm.isolamento_tetto || 'Non specificato'}

💰 CONSUMI E BUDGET:
- Spesa annua energia: ${efficientamentoForm.spesa_annua_energia || 'Non specificato'}
- Budget indicativo: ${efficientamentoForm.budget_indicativo || 'Non specificato'}

🔧 INTERVENTI DI INTERESSE:
${efficientamentoForm.interventi_interesse.length > 0 ? efficientamentoForm.interventi_interesse.join(', ') : 'Non specificato'}

📋 ALTRE INFO:
- Ha già preventivi: ${efficientamentoForm.ha_gia_preventivi || 'Non specificato'}
- Tempistiche: ${efficientamentoForm.tempistiche || 'Non specificato'}

📝 NOTE AGGIUNTIVE:
${note || 'Nessuna'}
        `.trim();
      } else if (categoria === 'Internet') {
        noteFinali = `
RICHIESTA ANALISI CONNESSIONE INTERNET

🌐 SITUAZIONE ATTUALE:
- Tipo utenza: ${internetForm.tipo_utenza || 'Non specificato'}
- Operatore attuale: ${internetForm.operatore_attuale || 'Non specificato'}
- Tipo connessione attuale: ${internetForm.tipo_connessione || 'Non specificato'}
- Velocità attuale: ${internetForm.velocita_attuale || 'Non specificato'}
- Spesa mensile attuale: ${internetForm.spesa_mensile || 'Non specificato'}
- Indirizzo: ${internetForm.indirizzo || 'Non specificato'}

📋 ESIGENZE:
${internetForm.esigenze.length > 0 ? internetForm.esigenze.join(', ') : 'Non specificato'}

❌ PROBLEMI RISCONTRATI:
${internetForm.problemi_attuali || 'Nessuno specificato'}

📝 NOTE AGGIUNTIVE:
${note || 'Nessuna'}
        `.trim();
      } else if (categoria === 'Spesa Telefonica') {
        noteFinali = `
RICHIESTA ANALISI SPESA TELEFONICA

📞 SITUAZIONE ATTUALE:
- Tipo utenza: ${telefonicaForm.tipo_utenza || 'Non specificato'}
- Operatore attuale: ${telefonicaForm.operatore_attuale || 'Non specificato'}
- Numero linee fisse: ${telefonicaForm.num_linee || 'Non specificato'}
- Numero interni: ${telefonicaForm.num_interni || 'Non specificato'}
- Numero linee mobili aziendali: ${telefonicaForm.num_mobile || 'Non specificato'}
- Spesa mensile attuale: ${telefonicaForm.spesa_mensile || 'Non specificato'}

📋 SERVIZI UTILIZZATI:
${telefonicaForm.servizi_utilizzati.length > 0 ? telefonicaForm.servizi_utilizzati.join(', ') : 'Non specificato'}

❌ PROBLEMI RISCONTRATI:
${telefonicaForm.problemi_attuali || 'Nessuno specificato'}

🔍 INTERESSI:
- Interesse fibra/internet: ${telefonicaForm.interesse_fibra || 'Non specificato'}
- Interesse mobile aziendale: ${telefonicaForm.interesse_mobile || 'Non specificato'}

📝 NOTE AGGIUNTIVE:
${note || 'Nessuna'}
        `.trim();
      }

      // Crea la richiesta
      await base44.entities.RichiestaRisparmio.create({
        user_email: user.email,
        user_name: user.company_name || user.full_name,
        user_phone: user.telefono_referente || '',
        categoria: categoria,
        foto_bolletta_url: fileUrl,
        note: noteFinali,
        status: 'pending'
      });

      // Notifica admin
      const adminUsers = await base44.entities.User.filter({ role: 'admin' });
      await Promise.all(adminUsers.map(admin =>
        base44.entities.Notification.create({
          user_email: admin.email,
          type: 'message',
          title: `Nuova richiesta ${categoria}`,
          content: `${user.company_name || user.full_name} ha inviato una richiesta per ${categoria}`,
          reference_id: categoria
        })
      ));

      // Invia email
      await base44.integrations.Core.SendEmail({
        to: 'consorzioimprenditori@gmail.com',
        subject: `🔔 Nuova Richiesta Risparmio - ${categoria}`,
        body: `
          <h2>Nuova Richiesta di Analisi ${categoria}</h2>
          <p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Telefono:</strong> ${user.telefono_referente || 'Non specificato'}</p>
          <p><strong>Categoria:</strong> ${categoria}</p>
          <hr/>
          <pre style="white-space: pre-wrap; font-family: inherit;">${noteFinali}</pre>
          ${fileUrl ? `<p><strong>Documento allegato:</strong> <a href="${fileUrl}">Visualizza</a></p>` : ''}
        `
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setUploadedFile(null);
      setPreviewUrl(null);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['mie-richieste-risparmio'] });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const info = CATEGORIE_INFO[categoria];
  const IconComponent = info?.icon || Lightbulb;

  if (!categoria || !info) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Categoria non trovata</p>
          <Link to={createPageUrl('RisparmioEnergetico')} className="text-lime-400 underline mt-2 block">
            Torna a Risparmio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('RisparmioEnergetico')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">{categoria}</h1>
        </div>

        {/* Hero Card */}
        <Card className={`bg-gradient-to-br ${info.color} border-0 mb-6`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <IconComponent className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">{categoria}</h2>
                <p className="text-white/80 text-sm">Servizio esclusivo Consorzio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {success && (
          <Alert className="mb-6 bg-green-500/20 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              Richiesta inviata con successo! Ti contatteremo al più presto.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Fotovoltaico */}
        {categoria === 'Fotovoltaico' ? (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-400" />
                Richiedi un preventivo gratuito
              </h3>
              <p className="text-slate-400 text-sm mb-4">Compila il form per ricevere un preventivo personalizzato per il tuo impianto fotovoltaico.</p>

              {/* Tipo immobile */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di immobile *</Label>
                <Select 
                  value={fotovoltaicoForm.tipo_immobile} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, tipo_immobile: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo immobile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abitazione_privata">🏠 Abitazione privata</SelectItem>
                    <SelectItem value="condominio">🏢 Condominio</SelectItem>
                    <SelectItem value="capannone_industriale">🏭 Capannone industriale</SelectItem>
                    <SelectItem value="ufficio_negozio">🏪 Ufficio / Negozio</SelectItem>
                    <SelectItem value="azienda_agricola">🌾 Azienda agricola</SelectItem>
                    <SelectItem value="altro">📦 Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Indirizzo */}
              <div className="space-y-2">
                <Label className="text-slate-300">Indirizzo installazione</Label>
                <Input
                  placeholder="Via, Città, CAP"
                  value={fotovoltaicoForm.indirizzo_installazione}
                  onChange={(e) => setFotovoltaicoForm({...fotovoltaicoForm, indirizzo_installazione: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              {/* Superficie tetto */}
              <div className="space-y-2">
                <Label className="text-slate-300">Superficie tetto disponibile (stimata)</Label>
                <Select 
                  value={fotovoltaicoForm.superficie_tetto} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, superficie_tetto: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona superficie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meno_30mq">Meno di 30 m²</SelectItem>
                    <SelectItem value="30_50mq">30 - 50 m²</SelectItem>
                    <SelectItem value="50_100mq">50 - 100 m²</SelectItem>
                    <SelectItem value="100_200mq">100 - 200 m²</SelectItem>
                    <SelectItem value="200_500mq">200 - 500 m²</SelectItem>
                    <SelectItem value="oltre_500mq">Oltre 500 m²</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo copertura */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di copertura</Label>
                <Select 
                  value={fotovoltaicoForm.tipo_copertura} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, tipo_copertura: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo copertura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tetto_spiovente_tegole">Tetto spiovente con tegole</SelectItem>
                    <SelectItem value="tetto_spiovente_lamiera">Tetto spiovente con lamiera</SelectItem>
                    <SelectItem value="tetto_piano">Tetto piano / terrazzo</SelectItem>
                    <SelectItem value="capannone_lamiera">Capannone con lamiera grecata</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Orientamento */}
              <div className="space-y-2">
                <Label className="text-slate-300">Orientamento prevalente del tetto</Label>
                <Select 
                  value={fotovoltaicoForm.orientamento_tetto} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, orientamento_tetto: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona orientamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sud">Sud (ottimale)</SelectItem>
                    <SelectItem value="sud_est">Sud-Est</SelectItem>
                    <SelectItem value="sud_ovest">Sud-Ovest</SelectItem>
                    <SelectItem value="est">Est</SelectItem>
                    <SelectItem value="ovest">Ovest</SelectItem>
                    <SelectItem value="nord">Nord</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ombreggiature */}
              <div className="space-y-2">
                <Label className="text-slate-300">Presenza di ombreggiature</Label>
                <Select 
                  value={fotovoltaicoForm.presenza_ombreggiature} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, presenza_ombreggiature: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nessuna">Nessuna ombreggiatura</SelectItem>
                    <SelectItem value="parziale">Ombreggiatura parziale (alberi, edifici vicini)</SelectItem>
                    <SelectItem value="significativa">Ombreggiatura significativa</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Consumo mensile */}
              <div className="space-y-2">
                <Label className="text-slate-300">Spesa media mensile in bolletta</Label>
                <Select 
                  value={fotovoltaicoForm.consumo_mensile} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, consumo_mensile: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona consumo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meno_100">Meno di €100/mese</SelectItem>
                    <SelectItem value="100_200">€100 - €200/mese</SelectItem>
                    <SelectItem value="200_500">€200 - €500/mese</SelectItem>
                    <SelectItem value="500_1000">€500 - €1.000/mese</SelectItem>
                    <SelectItem value="1000_2000">€1.000 - €2.000/mese</SelectItem>
                    <SelectItem value="oltre_2000">Oltre €2.000/mese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Consumo annuo kWh */}
              <div className="space-y-2">
                <Label className="text-slate-300">Consumo annuo di energia elettrica (kWh)</Label>
                <Input
                  type="number"
                  placeholder="Es. 3500"
                  value={fotovoltaicoForm.consumo_annuo_kwh}
                  onChange={(e) => setFotovoltaicoForm({...fotovoltaicoForm, consumo_annuo_kwh: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-slate-500 text-xs">Lo trovi in bolletta – voce "Consumo annuo"</p>
              </div>

              {/* Fasce orarie consumo */}
              <div className="space-y-2">
                <Label className="text-slate-300">Fasce orarie di consumo principali</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'giorno', label: '☀️ Giorno' },
                    { value: 'sera', label: '🌆 Sera' },
                    { value: 'notte', label: '🌙 Notte' },
                    { value: 'uniforme', label: '⚖️ Uniforme' }
                  ].map((fascia) => (
                    <label 
                      key={fascia.value}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        fotovoltaicoForm.fasce_orarie_consumo.includes(fascia.value)
                          ? 'bg-lime-400/20 border-lime-400 text-lime-400'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={fotovoltaicoForm.fasce_orarie_consumo.includes(fascia.value)}
                        onChange={(e) => {
                          const newFasce = e.target.checked
                            ? [...fotovoltaicoForm.fasce_orarie_consumo, fascia.value]
                            : fotovoltaicoForm.fasce_orarie_consumo.filter(f => f !== fascia.value);
                          setFotovoltaicoForm({...fotovoltaicoForm, fasce_orarie_consumo: newFasce});
                        }}
                        className="sr-only"
                      />
                      <span>{fascia.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Potenza contatore */}
              <div className="space-y-2">
                <Label className="text-slate-300">Potenza del contatore attuale (kW)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: '3kw', label: '3 kW' },
                    { value: '4.5kw', label: '4,5 kW' },
                    { value: '6kw', label: '6 kW' },
                    { value: 'oltre_6kw', label: '> 6 kW' }
                  ].map((potenza) => (
                    <label 
                      key={potenza.value}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        fotovoltaicoForm.potenza_contatore === potenza.value
                          ? 'bg-lime-400/20 border-lime-400 text-lime-400'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="potenza_contatore"
                        checked={fotovoltaicoForm.potenza_contatore === potenza.value}
                        onChange={() => setFotovoltaicoForm({...fotovoltaicoForm, potenza_contatore: potenza.value})}
                        className="sr-only"
                      />
                      <span>{potenza.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Anno impianto elettrico */}
              <div className="space-y-2">
                <Label className="text-slate-300">Anno dell'impianto elettrico</Label>
                <Select
                  value={fotovoltaicoForm.anno_impianto_elettrico}
                  onValueChange={(value) => setFotovoltaicoForm({...fotovoltaicoForm, anno_impianto_elettrico: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona anno" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                    <SelectItem value="prima_1975">Prima del 1975</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Interesse incentivi fiscali */}
              <div className="space-y-2">
                <Label className="text-slate-300">Interesse per incentivi fiscali</Label>
                <TooltipProvider>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { 
                        value: 'detrazione_fiscale', 
                        label: 'Detrazione fiscale',
                        tooltip: 'La detrazione fiscale ti permette di recuperare il 50% del costo dell\'impianto in 10 anni tramite la dichiarazione dei redditi. Esempio: se spendi €10.000, recuperi €5.000 (€500/anno per 10 anni).'
                      },
                      { 
                        value: 'comunita_energetica', 
                        label: 'Comunità energetica',
                        tooltip: 'Una Comunità Energetica Rinnovabile (CER) è un gruppo di cittadini, imprese o enti che condividono l\'energia prodotta da fonti rinnovabili. Permette di ottenere incentivi aggiuntivi (fino a 110€/MWh) e risparmiare condividendo l\'energia con i vicini.'
                      },
                      { value: 'nessun_incentivo', label: 'Nessun incentivo', tooltip: null },
                      { value: 'non_so', label: 'Non so', tooltip: null }
                    ].map((incentivo) => (
                      <label 
                        key={incentivo.value}
                        className={`flex items-center justify-between gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          fotovoltaicoForm.interesse_incentivi.includes(incentivo.value)
                            ? 'bg-lime-400/20 border-lime-400 text-lime-400'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={fotovoltaicoForm.interesse_incentivi.includes(incentivo.value)}
                            onChange={(e) => {
                              const newIncentivi = e.target.checked
                                ? [...fotovoltaicoForm.interesse_incentivi, incentivo.value]
                                : fotovoltaicoForm.interesse_incentivi.filter(i => i !== incentivo.value);
                              setFotovoltaicoForm({...fotovoltaicoForm, interesse_incentivi: newIncentivi});
                            }}
                            className="sr-only"
                          />
                          <span className="text-sm">{incentivo.label}</span>
                        </div>
                        {incentivo.tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild onClick={(e) => e.preventDefault()}>
                              <HelpCircle className="w-4 h-4 text-slate-400 hover:text-lime-400 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] bg-slate-800 border-slate-600 text-slate-200 p-3">
                              <p className="text-xs leading-relaxed">{incentivo.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </label>
                    ))}
                  </div>
                </TooltipProvider>
              </div>

              {/* Batterie accumulo */}
              <div className="space-y-2">
                <Label className="text-slate-300">Interesse per batterie di accumulo</Label>
                <Select 
                  value={fotovoltaicoForm.interesse_batterie} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, interesse_batterie: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sì, sono interessato</SelectItem>
                    <SelectItem value="no">No, solo pannelli</SelectItem>
                    <SelectItem value="valutare">Da valutare in base al preventivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Colonnina ricarica */}
              <div className="space-y-2">
                <Label className="text-slate-300">Interesse per colonnina ricarica auto elettrica</Label>
                <Select 
                  value={fotovoltaicoForm.interesse_colonnina} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, interesse_colonnina: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sì, sono interessato</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="futuro">Forse in futuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label className="text-slate-300">Budget indicativo (€)</Label>
                <Select 
                  value={fotovoltaicoForm.budget_indicativo} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, budget_indicativo: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fino_5k">Fino a €5.000</SelectItem>
                    <SelectItem value="5_10k">€5.000 - €10.000</SelectItem>
                    <SelectItem value="10_20k">€10.000 - €20.000</SelectItem>
                    <SelectItem value="oltre_20k">Oltre €20.000</SelectItem>
                    <SelectItem value="da_valutare">Da valutare con finanziamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tempistiche */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tempistiche desiderate</Label>
                <Select 
                  value={fotovoltaicoForm.tempistiche} 
                  onValueChange={(v) => setFotovoltaicoForm({...fotovoltaicoForm, tempistiche: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tempistiche" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">Il prima possibile</SelectItem>
                    <SelectItem value="3_mesi">Entro 3 mesi</SelectItem>
                    <SelectItem value="6_mesi">Entro 6 mesi</SelectItem>
                    <SelectItem value="1_anno">Entro 1 anno</SelectItem>
                    <SelectItem value="valutazione">Solo valutazione per ora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Note aggiuntive */}
              <div className="space-y-2">
                <Label className="text-slate-300">Note aggiuntive</Label>
                <Textarea
                  placeholder="Altre informazioni utili (es. vincoli paesaggistici, esigenze particolari...)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold"
                onClick={() => submitMutation.mutate()}
                disabled={isUploading || submitMutation.isPending || !fotovoltaicoForm.tipo_immobile}
              >
                {isUploading || submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Richiedi Preventivo Gratuito
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : categoria === 'Efficientamento Energetico' ? (
          /* Form Efficientamento Energetico */
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-400" />
                Richiedi un'analisi gratuita
              </h3>
              <p className="text-slate-400 text-sm mb-4">Compila il form per ricevere una valutazione del potenziale di risparmio energetico.</p>

              {/* Tipo immobile */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di immobile *</Label>
                <Select 
                  value={efficientamentoForm.tipo_immobile} 
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, tipo_immobile: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo immobile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abitazione_privata">🏠 Abitazione privata</SelectItem>
                    <SelectItem value="condominio">🏢 Condominio</SelectItem>
                    <SelectItem value="capannone_industriale">🏭 Capannone industriale</SelectItem>
                    <SelectItem value="ufficio">🏪 Ufficio</SelectItem>
                    <SelectItem value="negozio">🛒 Negozio</SelectItem>
                    <SelectItem value="hotel_ristorante">🏨 Hotel / Ristorante</SelectItem>
                    <SelectItem value="altro">📦 Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Anno costruzione */}
              <div className="space-y-2">
                <Label className="text-slate-300">Anno di costruzione</Label>
                <Select
                  value={efficientamentoForm.anno_costruzione}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, anno_costruzione: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prima_1970">Prima del 1970</SelectItem>
                    <SelectItem value="1970_1990">1970 - 1990</SelectItem>
                    <SelectItem value="1990_2005">1990 - 2005</SelectItem>
                    <SelectItem value="2005_2015">2005 - 2015</SelectItem>
                    <SelectItem value="dopo_2015">Dopo il 2015</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Superficie */}
              <div className="space-y-2">
                <Label className="text-slate-300">Superficie (mq)</Label>
                <Select
                  value={efficientamentoForm.superficie_mq}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, superficie_mq: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona superficie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meno_50">Meno di 50 mq</SelectItem>
                    <SelectItem value="50_100">50 - 100 mq</SelectItem>
                    <SelectItem value="100_200">100 - 200 mq</SelectItem>
                    <SelectItem value="200_500">200 - 500 mq</SelectItem>
                    <SelectItem value="500_1000">500 - 1.000 mq</SelectItem>
                    <SelectItem value="oltre_1000">Oltre 1.000 mq</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Classe energetica */}
              <div className="space-y-2">
                <Label className="text-slate-300">Classe energetica attuale (se conosciuta)</Label>
                <Select
                  value={efficientamentoForm.classe_energetica_attuale}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, classe_energetica_attuale: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (massima efficienza)</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                    <SelectItem value="G">G (minima efficienza)</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo riscaldamento */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di riscaldamento</Label>
                <Select
                  value={efficientamentoForm.tipo_riscaldamento}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, tipo_riscaldamento: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caldaia_gas">Caldaia a gas</SelectItem>
                    <SelectItem value="caldaia_condensazione">Caldaia a condensazione</SelectItem>
                    <SelectItem value="pompa_calore">Pompa di calore</SelectItem>
                    <SelectItem value="stufa_pellet">Stufa a pellet</SelectItem>
                    <SelectItem value="radiatori_elettrici">Radiatori elettrici</SelectItem>
                    <SelectItem value="teleriscaldamento">Teleriscaldamento</SelectItem>
                    <SelectItem value="nessuno">Nessuno</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo raffrescamento */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di raffrescamento</Label>
                <Select
                  value={efficientamentoForm.tipo_raffrescamento}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, tipo_raffrescamento: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="condizionatori_split">Condizionatori split</SelectItem>
                    <SelectItem value="pompa_calore">Pompa di calore (caldo/freddo)</SelectItem>
                    <SelectItem value="impianto_centralizzato">Impianto centralizzato</SelectItem>
                    <SelectItem value="ventilatori">Solo ventilatori</SelectItem>
                    <SelectItem value="nessuno">Nessuno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo infissi */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di infissi</Label>
                <Select
                  value={efficientamentoForm.tipo_infissi}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, tipo_infissi: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vetro_singolo">Vetro singolo</SelectItem>
                    <SelectItem value="doppio_vetro_vecchio">Doppio vetro (prima del 2000)</SelectItem>
                    <SelectItem value="doppio_vetro_recente">Doppio vetro (dopo il 2000)</SelectItem>
                    <SelectItem value="triplo_vetro">Triplo vetro</SelectItem>
                    <SelectItem value="misti">Misti</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Isolamento pareti */}
              <div className="space-y-2">
                <Label className="text-slate-300">Isolamento pareti</Label>
                <Select
                  value={efficientamentoForm.isolamento_pareti}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, isolamento_pareti: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nessuno">Nessun isolamento</SelectItem>
                    <SelectItem value="cappotto_esterno">Cappotto esterno</SelectItem>
                    <SelectItem value="isolamento_interno">Isolamento interno</SelectItem>
                    <SelectItem value="insufflaggio">Insufflaggio intercapedine</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Isolamento tetto */}
              <div className="space-y-2">
                <Label className="text-slate-300">Isolamento tetto/sottotetto</Label>
                <Select
                  value={efficientamentoForm.isolamento_tetto}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, isolamento_tetto: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nessuno">Nessun isolamento</SelectItem>
                    <SelectItem value="isolato">Isolato</SelectItem>
                    <SelectItem value="parziale">Parzialmente isolato</SelectItem>
                    <SelectItem value="non_applicabile">Non applicabile</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spesa annua energia */}
              <div className="space-y-2">
                <Label className="text-slate-300">Spesa annua energia (luce + gas)</Label>
                <Select
                  value={efficientamentoForm.spesa_annua_energia}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, spesa_annua_energia: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona spesa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meno_1000">Meno di €1.000/anno</SelectItem>
                    <SelectItem value="1000_2000">€1.000 - €2.000/anno</SelectItem>
                    <SelectItem value="2000_5000">€2.000 - €5.000/anno</SelectItem>
                    <SelectItem value="5000_10000">€5.000 - €10.000/anno</SelectItem>
                    <SelectItem value="10000_20000">€10.000 - €20.000/anno</SelectItem>
                    <SelectItem value="oltre_20000">Oltre €20.000/anno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Interventi di interesse */}
              <div className="space-y-2">
                <Label className="text-slate-300">Interventi per cui sarei interessato</Label>
                <TooltipProvider>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'cappotto', label: '🧱 Cappotto termico', risparmio: '25-40%' },
                    { value: 'infissi', label: '🪟 Sostituzione infissi', risparmio: '10-20%' },
                    { value: 'caldaia', label: '🔥 Caldaia a condensazione', risparmio: '15-30%' },
                    { value: 'pompa_calore', label: '❄️ Pompa di calore', risparmio: '30-50%' },
                    { value: 'fotovoltaico', label: '☀️ Impianto fotovoltaico', risparmio: '50-70%' },
                    { value: 'solare_termico', label: '🌡️ Solare termico', risparmio: '50-80%' },
                    { value: 'led', label: '💡 Illuminazione LED', risparmio: '50-75%' },
                    { value: 'domotica', label: '🏠 Domotica / termostati smart', risparmio: '10-25%' },
                    { value: 'audit', label: '📊 Solo audit energetico', risparmio: null, tooltip: "L'audit energetico è un'analisi dettagliata dei consumi del tuo immobile. Un tecnico specializzato valuta lo stato dell'edificio e degli impianti, identifica le inefficienze e propone gli interventi più convenienti con il relativo risparmio atteso." }
                  ].map((intervento) => (
                    <label 
                      key={intervento.value}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        efficientamentoForm.interventi_interesse.includes(intervento.value)
                          ? 'bg-green-400/20 border-green-400 text-green-400'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={efficientamentoForm.interventi_interesse.includes(intervento.value)}
                          onChange={(e) => {
                            const newInterventi = e.target.checked
                              ? [...efficientamentoForm.interventi_interesse, intervento.value]
                              : efficientamentoForm.interventi_interesse.filter(i => i !== intervento.value);
                            setEfficientamentoForm({...efficientamentoForm, interventi_interesse: newInterventi});
                          }}
                          className="sr-only"
                        />
                        <span>{intervento.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {intervento.risparmio && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            efficientamentoForm.interventi_interesse.includes(intervento.value)
                              ? 'bg-green-500/30 text-green-300'
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            -{intervento.risparmio}
                          </span>
                        )}
                        {intervento.tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild onClick={(e) => e.preventDefault()}>
                              <HelpCircle className="w-4 h-4 text-slate-400 hover:text-green-400 flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] bg-slate-800 border-slate-600 text-slate-200 p-3">
                              <p className="text-xs leading-relaxed">{intervento.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                </TooltipProvider>
                <p className="text-slate-500 text-xs mt-1">* Le percentuali di risparmio sono indicative e variano in base all'immobile</p>
              </div>

              {/* Ha già preventivi */}
              <div className="space-y-2">
                <Label className="text-slate-300">Hai già ricevuto preventivi?</Label>
                <Select
                  value={efficientamentoForm.ha_gia_preventivi}
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, ha_gia_preventivi: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sì, ho già preventivi</SelectItem>
                    <SelectItem value="no">No, è la prima richiesta</SelectItem>
                    <SelectItem value="in_corso">Sto raccogliendo preventivi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tempistiche */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tempistiche desiderate</Label>
                <Select 
                  value={efficientamentoForm.tempistiche} 
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, tempistiche: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tempistiche" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">Il prima possibile</SelectItem>
                    <SelectItem value="3_mesi">Entro 3 mesi</SelectItem>
                    <SelectItem value="6_mesi">Entro 6 mesi</SelectItem>
                    <SelectItem value="1_anno">Entro 1 anno</SelectItem>
                    <SelectItem value="valutazione">Solo valutazione per ora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label className="text-slate-300">Budget indicativo</Label>
                <Select 
                  value={efficientamentoForm.budget_indicativo} 
                  onValueChange={(v) => setEfficientamentoForm({...efficientamentoForm, budget_indicativo: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fino_5k">Fino a €5.000</SelectItem>
                    <SelectItem value="5_15k">€5.000 - €15.000</SelectItem>
                    <SelectItem value="15_30k">€15.000 - €30.000</SelectItem>
                    <SelectItem value="30_50k">€30.000 - €50.000</SelectItem>
                    <SelectItem value="oltre_50k">Oltre €50.000</SelectItem>
                    <SelectItem value="da_valutare">Da valutare con finanziamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Note aggiuntive */}
              <div className="space-y-2">
                <Label className="text-slate-300">Note aggiuntive</Label>
                <Textarea
                  placeholder="Altre informazioni utili (es. problemi specifici, vincoli, esigenze particolari...)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold"
                onClick={() => submitMutation.mutate()}
                disabled={isUploading || submitMutation.isPending || !efficientamentoForm.tipo_immobile}
              >
                {isUploading || submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Richiedi Analisi Gratuita
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : categoria === 'Internet' ? (
          /* Form Internet */
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-cyan-400" />
                Richiedi un'analisi gratuita
              </h3>
              <p className="text-slate-400 text-sm mb-4">Compila il form per ricevere una proposta personalizzata per la tua connessione internet.</p>

              {/* Tipo utenza */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di utenza *</Label>
                <Select 
                  value={internetForm.tipo_utenza} 
                  onValueChange={(v) => setInternetForm({...internetForm, tipo_utenza: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo utenza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aziendale">🏢 Aziendale</SelectItem>
                    <SelectItem value="partita_iva">💼 Partita IVA / Professionista</SelectItem>
                    <SelectItem value="privato">🏠 Privato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Indirizzo */}
              <div className="space-y-2">
                <Label className="text-slate-300">Indirizzo di installazione</Label>
                <Input
                  placeholder="Via, Città, CAP"
                  value={internetForm.indirizzo}
                  onChange={(e) => setInternetForm({...internetForm, indirizzo: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              {/* Operatore attuale */}
              <div className="space-y-2">
                <Label className="text-slate-300">Operatore attuale</Label>
                <Input
                  placeholder="Es. TIM, Vodafone, Fastweb..."
                  value={internetForm.operatore_attuale}
                  onChange={(e) => setInternetForm({...internetForm, operatore_attuale: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              {/* Tipo connessione */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di connessione attuale</Label>
                <Select 
                  value={internetForm.tipo_connessione} 
                  onValueChange={(v) => setInternetForm({...internetForm, tipo_connessione: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fibra_ftth">Fibra FTTH (fino a casa)</SelectItem>
                    <SelectItem value="fibra_fttc">Fibra FTTC (misto rame)</SelectItem>
                    <SelectItem value="adsl">ADSL</SelectItem>
                    <SelectItem value="fwa">FWA (wireless)</SelectItem>
                    <SelectItem value="nessuna">Non ho connessione fissa</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Velocità attuale */}
              <div className="space-y-2">
                <Label className="text-slate-300">Velocità attuale (download)</Label>
                <Select 
                  value={internetForm.velocita_attuale} 
                  onValueChange={(v) => setInternetForm({...internetForm, velocita_attuale: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona velocità" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fino_30">Fino a 30 Mbps</SelectItem>
                    <SelectItem value="30_100">30 - 100 Mbps</SelectItem>
                    <SelectItem value="100_300">100 - 300 Mbps</SelectItem>
                    <SelectItem value="300_1000">300 Mbps - 1 Gbps</SelectItem>
                    <SelectItem value="oltre_1000">Oltre 1 Gbps</SelectItem>
                    <SelectItem value="non_so">Non so</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spesa mensile */}
              <div className="space-y-2">
                <Label className="text-slate-300">Spesa mensile attuale (€)</Label>
                <Select 
                  value={internetForm.spesa_mensile} 
                  onValueChange={(v) => setInternetForm({...internetForm, spesa_mensile: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona spesa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meno_30">Meno di €30/mese</SelectItem>
                    <SelectItem value="30_50">€30 - €50/mese</SelectItem>
                    <SelectItem value="50_80">€50 - €80/mese</SelectItem>
                    <SelectItem value="80_150">€80 - €150/mese</SelectItem>
                    <SelectItem value="oltre_150">Oltre €150/mese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Esigenze */}
              <div className="space-y-2">
                <Label className="text-slate-300">Esigenze principali</Label>
                <TooltipProvider>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'velocita', label: '⚡ Più velocità', tooltip: null },
                    { value: 'stabilita', label: '🔒 Più stabilità', tooltip: null },
                    { value: 'risparmio', label: '💰 Risparmio', tooltip: null },
                    { value: 'ip_statico', label: '🌐 IP statico', tooltip: null },
                    { value: 'backup', label: '📡 Backup 4G/5G', tooltip: 'Una connessione di backup 4G/5G si attiva automaticamente quando la linea principale (fibra/ADSL) ha problemi, garantendo continuità di servizio. Ideale per aziende che non possono permettersi interruzioni.' },
                    { value: 'sla', label: '📋 SLA garantito', tooltip: 'SLA (Service Level Agreement) è un accordo che garantisce tempi massimi di intervento in caso di guasti (es. 4-8 ore). Include penali per il provider se non rispetta i tempi. Consigliato per attività che dipendono dalla connessione.' }
                  ].map((esigenza) => (
                    <label 
                      key={esigenza.value}
                      className={`flex items-center justify-between gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        internetForm.esigenze.includes(esigenza.value)
                          ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={internetForm.esigenze.includes(esigenza.value)}
                          onChange={(e) => {
                            const newEsigenze = e.target.checked
                              ? [...internetForm.esigenze, esigenza.value]
                              : internetForm.esigenze.filter(s => s !== esigenza.value);
                            setInternetForm({...internetForm, esigenze: newEsigenze});
                          }}
                          className="sr-only"
                        />
                        <span className="text-sm">{esigenza.label}</span>
                      </div>
                      {esigenza.tooltip && (
                        <Tooltip>
                          <TooltipTrigger asChild onClick={(e) => e.preventDefault()}>
                            <HelpCircle className="w-4 h-4 text-slate-400 hover:text-cyan-400 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px] bg-slate-800 border-slate-600 text-slate-200 p-3">
                            <p className="text-xs leading-relaxed">{esigenza.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </label>
                  ))}
                </div>
                </TooltipProvider>
              </div>

              {/* Problemi attuali */}
              <div className="space-y-2">
                <Label className="text-slate-300">Problemi riscontrati</Label>
                <Textarea
                  placeholder="Es. connessione lenta, disconnessioni frequenti, costi troppo alti..."
                  value={internetForm.problemi_attuali}
                  onChange={(e) => setInternetForm({...internetForm, problemi_attuali: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={2}
                />
              </div>

              {/* Note aggiuntive */}
              <div className="space-y-2">
                <Label className="text-slate-300">Note aggiuntive</Label>
                <Textarea
                  placeholder="Altre informazioni utili..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <Button
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold"
                onClick={() => submitMutation.mutate()}
                disabled={isUploading || submitMutation.isPending || !internetForm.tipo_utenza}
              >
                {isUploading || submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Richiedi Analisi Gratuita
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : categoria === 'Welfare Aziendale' ? (
          /* Sezione Welfare Aziendale */
          <div className="space-y-6">
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

                {/* Confronto A vs B */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Premio in busta paga */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Banknote className="w-5 h-5 text-red-400" />
                      <h4 className="text-red-400 font-semibold">Premio in busta paga</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Costo azienda:</span>
                        <span className="text-white font-medium">1.000 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valore netto al dipendente:</span>
                        <span className="text-red-400 font-medium">~600 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tassazione e contributi:</span>
                        <span className="text-red-400 font-medium">~400 €</span>
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs mt-3 pt-2 border-t border-slate-700">
                      Il 40% circa viene assorbito da tasse e contributi.
                    </p>
                  </div>

                  {/* Welfare Aziendale */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-pink-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="w-5 h-5 text-pink-400" />
                      <h4 className="text-pink-400 font-semibold">Welfare Aziendale</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Costo azienda:</span>
                        <span className="text-white font-medium">1.000 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valore per il dipendente:</span>
                        <span className="text-pink-400 font-medium">fino a 1.000 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tassazione:</span>
                        <span className="text-green-400 font-medium">Agevolata o nulla*</span>
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs mt-3 pt-2 border-t border-slate-700">
                      *Nei limiti previsti dalla normativa vigente (art. 51 TUIR).
                    </p>
                  </div>
                </div>

                {/* Spiegazione */}
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
                    <div>
                      <p className="text-slate-400 text-xs">Dipendenti</p>
                      <p className="text-white font-semibold">5</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Welfare mensile/dip.</p>
                      <p className="text-white font-semibold">100 €</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Spesa annua azienda:</span>
                      <span className="text-white font-semibold">6.000 €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Valore netto percepito:</span>
                      <span className="text-pink-400 font-semibold">fino a 6.000 €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Equivalente in busta paga:</span>
                      <span className="text-slate-300">~3.600 €</span>
                    </div>
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

            {/* SEZIONE 4 - Call to Action */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">
                  Vuoi vedere quanto puoi risparmiare?
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Richiedi un'analisi gratuita personalizzata sulla tua azienda. Ti contatteremo per raccogliere le informazioni necessarie e proporti una soluzione su misura.
                </p>

                {/* Note */}
                <Textarea
                  placeholder="Descrivi brevemente la tua azienda: numero dipendenti, settore, eventuali benefit già attivi..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white mb-4"
                  rows={3}
                />

                <Button
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold"
                  onClick={() => submitMutation.mutate()}
                  disabled={isUploading || submitMutation.isPending}
                >
                  {isUploading || submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Richiedi Analisi Gratuita
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : categoria === 'Spesa Telefonica' ? (
          /* Form Spesa Telefonica */
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Phone className="w-5 h-5 text-purple-400" />
                Richiedi un'analisi gratuita
              </h3>
              <p className="text-slate-400 text-sm mb-4">Compila il form per ricevere una proposta personalizzata per ridurre la tua spesa telefonica.</p>

              {/* Tipo utenza */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo di utenza *</Label>
                <Select 
                  value={telefonicaForm.tipo_utenza} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, tipo_utenza: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona tipo utenza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aziendale">🏢 Aziendale</SelectItem>
                    <SelectItem value="partita_iva">💼 Partita IVA / Professionista</SelectItem>
                    <SelectItem value="privato">🏠 Privato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Operatore attuale */}
              <div className="space-y-2">
                <Label className="text-slate-300">Operatore attuale</Label>
                <Input
                  placeholder="Es. TIM, Vodafone, WindTre..."
                  value={telefonicaForm.operatore_attuale}
                  onChange={(e) => setTelefonicaForm({...telefonicaForm, operatore_attuale: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              {/* Numero linee fisse */}
              <div className="space-y-2">
                <Label className="text-slate-300">Numero di linee fisse</Label>
                <Select 
                  value={telefonicaForm.num_linee} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, num_linee: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona numero linee" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Numero interni */}
              <div className="space-y-2">
                <Label className="text-slate-300">Numero d'interni</Label>
                <Select 
                  value={telefonicaForm.num_interni} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, num_interni: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona numero interni" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Numero linee mobili aziendali */}
              <div className="space-y-2">
                <Label className="text-slate-300">Numero di linee mobili aziendali (cellulari)</Label>
                <Select 
                  value={telefonicaForm.num_mobile} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, num_mobile: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona numero cellulari" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 21}, (_, i) => i).map(num => (
                      <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Spesa mensile */}
              <div className="space-y-2">
                <Label className="text-slate-300">Spesa mensile attuale (€)</Label>
                <Select 
                  value={telefonicaForm.spesa_mensile} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, spesa_mensile: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona spesa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meno_50">Meno di €50/mese</SelectItem>
                    <SelectItem value="50_100">€50 - €100/mese</SelectItem>
                    <SelectItem value="100_200">€100 - €200/mese</SelectItem>
                    <SelectItem value="200_500">€200 - €500/mese</SelectItem>
                    <SelectItem value="oltre_500">Oltre €500/mese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Servizi utilizzati */}
              <div className="space-y-2">
                <Label className="text-slate-300">Servizi attualmente utilizzati</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'fisso', label: '📞 Linea fissa' },
                    { value: 'mobile', label: '📱 Mobile' },
                    { value: 'internet', label: '🌐 Internet/Fibra' },
                    { value: 'centralino', label: '🔄 Centralino' }
                  ].map((servizio) => (
                    <label 
                      key={servizio.value}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        telefonicaForm.servizi_utilizzati.includes(servizio.value)
                          ? 'bg-purple-400/20 border-purple-400 text-purple-400'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={telefonicaForm.servizi_utilizzati.includes(servizio.value)}
                        onChange={(e) => {
                          const newServizi = e.target.checked
                            ? [...telefonicaForm.servizi_utilizzati, servizio.value]
                            : telefonicaForm.servizi_utilizzati.filter(s => s !== servizio.value);
                          setTelefonicaForm({...telefonicaForm, servizi_utilizzati: newServizi});
                        }}
                        className="sr-only"
                      />
                      <span>{servizio.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Problemi attuali */}
              <div className="space-y-2">
                <Label className="text-slate-300">Problemi riscontrati con l'operatore attuale</Label>
                <Textarea
                  placeholder="Es. costi troppo alti, scarsa copertura, assistenza lenta..."
                  value={telefonicaForm.problemi_attuali}
                  onChange={(e) => setTelefonicaForm({...telefonicaForm, problemi_attuali: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={2}
                />
              </div>

              {/* Interesse fibra */}
              <div className="space-y-2">
                <Label className="text-slate-300">Interesse per fibra/internet aziendale</Label>
                <Select 
                  value={telefonicaForm.interesse_fibra} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, interesse_fibra: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sì, sono interessato</SelectItem>
                    <SelectItem value="ho_gia">Ho già la fibra</SelectItem>
                    <SelectItem value="no">No, non mi interessa</SelectItem>
                    <SelectItem value="valutare">Da valutare</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Interesse mobile */}
              <div className="space-y-2">
                <Label className="text-slate-300">Interesse per piani mobile aziendali</Label>
                <Select 
                  value={telefonicaForm.interesse_mobile} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, interesse_mobile: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sì, sono interessato</SelectItem>
                    <SelectItem value="ho_gia">Ho già piani aziendali</SelectItem>
                    <SelectItem value="no">No, non mi interessa</SelectItem>
                    <SelectItem value="valutare">Da valutare</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Upload bolletta (opzionale) */}
              <div className="space-y-2">
                <Label className="text-slate-300">Allega bolletta (opzionale)</Label>
                <p className="text-slate-500 text-xs mb-2">Carica la tua bolletta per un'analisi più precisa</p>
                
                {previewUrl && (
                  <div className="mb-3 relative">
                    <img 
                      src={previewUrl} 
                      alt="Preview documento" 
                      className="w-full rounded-lg max-h-32 object-cover"
                    />
                    <button 
                      onClick={() => { setUploadedFile(null); setPreviewUrl(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="file" 
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 h-12 text-xs"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Scatta foto
                  </Button>

                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 h-12 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Carica file
                  </Button>
                </div>
              </div>

              {/* Note aggiuntive */}
              <div className="space-y-2">
                <Label className="text-slate-300">Note aggiuntive</Label>
                <Textarea
                  placeholder="Altre informazioni utili..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <Button
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold"
                onClick={() => submitMutation.mutate()}
                disabled={isUploading || submitMutation.isPending || !telefonicaForm.tipo_utenza}
              >
                {isUploading || submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Richiedi Analisi Gratuita
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Upload Section per altre categorie */
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-lime-400" />
                Invia la tua {info.tipoDocumento}
              </h3>
              <p className="text-slate-400 text-sm mb-4">{info.descrizione}</p>

              {/* Preview */}
              {previewUrl && (
                <div className="mb-4 relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview documento" 
                    className="w-full rounded-lg max-h-48 object-cover"
                  />
                  <button 
                    onClick={() => { setUploadedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input 
                  type="file" 
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="border-lime-400 text-lime-400 hover:bg-lime-400/20 h-20 flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Scatta foto</span>
                </Button>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="border-slate-500 text-slate-300 hover:bg-slate-700 h-20 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Carica file</span>
                </Button>
              </div>

              {/* Note */}
              <Textarea
                placeholder="Aggiungi note o richieste specifiche (opzionale)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mb-4"
                rows={3}
              />

              {/* Submit */}
              <Button
                className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
                onClick={() => submitMutation.mutate()}
                disabled={isUploading || submitMutation.isPending}
              >
                {isUploading || submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Invia Richiesta
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Richieste precedenti con risultati */}
        {mieRichieste.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Le tue richieste
              </h3>
              <div className="space-y-3">
                {mieRichieste.map((richiesta) => (
                  <div key={richiesta.id} className="bg-slate-900 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-300 text-sm">
                        {new Date(richiesta.created_date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        richiesta.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        richiesta.status === 'in_review' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {richiesta.status === 'completed' ? 'Completata' :
                         richiesta.status === 'in_review' ? 'In revisione' : 'In attesa'}
                      </span>
                    </div>
                    
                    {/* Mostra risparmio se completato */}
                    {richiesta.status === 'completed' && richiesta.costo_precedente && richiesta.nuovo_costo && (
                      <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-3 mb-2">
                          <TrendingDown className="w-6 h-6 text-green-400" />
                          <div>
                            <p className="text-green-400 font-bold text-lg">
                              €{((richiesta.costo_precedente - richiesta.nuovo_costo) * 12).toFixed(0)}/anno
                            </p>
                            <p className="text-green-400/70 text-xs">Risparmio ottenuto</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-3 pt-2 border-t border-green-500/20">
                          <div>
                            <p className="text-slate-400 text-xs">Prima</p>
                            <p className="text-red-400 font-semibold">€{richiesta.costo_precedente}/mese</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Dopo</p>
                            <p className="text-green-400 font-semibold">€{richiesta.nuovo_costo}/mese</p>
                          </div>
                        </div>
                        {richiesta.note_admin && (
                          <p className="text-slate-300 text-sm mt-2 pt-2 border-t border-green-500/20">
                            {richiesta.note_admin}
                          </p>
                        )}
                        {/* Documenti allegati */}
                        {richiesta.documenti_allegati?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-green-500/20">
                            <p className="text-slate-400 text-xs mb-1">Documenti:</p>
                            <div className="flex flex-wrap gap-2">
                              {richiesta.documenti_allegati.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 bg-slate-800 text-lime-400 text-xs px-2 py-1 rounded hover:bg-slate-700"
                                >
                                  <FileText className="w-3 h-3" />
                                  Doc {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Alert className="mt-6 bg-blue-500/10 border-blue-500/30">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-slate-300 text-sm">
            <strong className="text-blue-400">Come funziona?</strong><br />
            Riceverai un'analisi gratuita entro 48 ore lavorative con una proposta personalizzata di risparmio.
          </AlertDescription>
        </Alert>
      </main>

      <BottomNav currentPage="RisparmioEnergetico" unreadMessages={messages.length} />
    </div>
  );
}