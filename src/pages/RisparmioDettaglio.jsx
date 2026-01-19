import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Upload, FileText, CheckCircle, Info, TrendingDown, Users, Clock, Send, Loader2, Shield, Lightbulb, Flame, Leaf, Sun, Phone, Wifi, Building2, Home, Factory, MapPin, HelpCircle } from 'lucide-react';
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
    spesa_mensile: '',
    servizi_utilizzati: [],
    problemi_attuali: '',
    interesse_fibra: '',
    interesse_mobile: ''
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
      } else if (categoria === 'Spesa Telefonica') {
        noteFinali = `
RICHIESTA ANALISI SPESA TELEFONICA

📞 SITUAZIONE ATTUALE:
- Tipo utenza: ${telefonicaForm.tipo_utenza || 'Non specificato'}
- Operatore attuale: ${telefonicaForm.operatore_attuale || 'Non specificato'}
- Numero linee/SIM: ${telefonicaForm.num_linee || 'Non specificato'}
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
                <Select 
                  value={telefonicaForm.operatore_attuale} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, operatore_attuale: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona operatore" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tim">TIM</SelectItem>
                    <SelectItem value="vodafone">Vodafone</SelectItem>
                    <SelectItem value="wind_tre">WindTre</SelectItem>
                    <SelectItem value="fastweb">Fastweb</SelectItem>
                    <SelectItem value="iliad">Iliad</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                    <SelectItem value="multipli">Più operatori</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Numero linee */}
              <div className="space-y-2">
                <Label className="text-slate-300">Numero di linee/SIM</Label>
                <Select 
                  value={telefonicaForm.num_linee} 
                  onValueChange={(v) => setTelefonicaForm({...telefonicaForm, num_linee: v})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Seleziona numero linee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 linea</SelectItem>
                    <SelectItem value="2_5">2-5 linee</SelectItem>
                    <SelectItem value="6_10">6-10 linee</SelectItem>
                    <SelectItem value="11_20">11-20 linee</SelectItem>
                    <SelectItem value="oltre_20">Oltre 20 linee</SelectItem>
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