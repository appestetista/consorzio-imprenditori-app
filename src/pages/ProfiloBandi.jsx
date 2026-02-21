import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, FileText, Scale, Save, CheckCircle, Euro, Users, Briefcase, Globe, HelpCircle, Sparkles } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const HelpTooltip = ({ text }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors">
        <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="bg-slate-800 border-slate-700 text-slate-200 text-sm max-w-xs p-3">
      {text}
    </PopoverContent>
  </Popover>
);

const REGIONI_ITALIA = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'
];

const FORME_GIURIDICHE = [
  'Ditta individuale',
  'S.r.l.',
  'S.r.l.s.',
  'S.p.A.',
  'S.n.c.',
  'S.a.s.',
  'Cooperativa',
  'Consorzio',
  'Associazione',
  'Fondazione',
  'Start-up innovativa',
  'PMI innovativa',
  'Impresa sociale',
  'Altro'
];

const SETTORI = [
  'Agricoltura e Agroalimentare',
  'Artigianato',
  'Commercio al dettaglio',
  'Commercio all\'ingrosso',
  'Costruzioni ed Edilizia',
  'Cultura e Spettacolo',
  'Turismo e Ristorazione',
  'Energia e Utilities',
  'Ambiente e Rifiuti',
  'Industria Manifatturiera',
  'Industria Chimica e Farmaceutica',
  'Logistica e Trasporti',
  'Servizi alle Imprese',
  'Servizi alla Persona',
  'Sanità e Assistenza',
  'ICT e Tecnologia',
  'Ricerca e Sviluppo',
  'Formazione e Istruzione',
  'Credito e Finanza',
  'Immobiliare',
  'Altro'
];

const CLASSIFICAZIONE_RATING = [
  'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D', 'Non classificato'
];

export default function ProfiloBandi() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Verifica se arrivi dal pulsante AI
  const fromAI = searchParams.get('from') === 'ai';
  
  const [formData, setFormData] = useState({
    // Dati Aziendali Base
    company_size: '',
    legal_form: '',
    years_activity: '',
    founding_date: '',
    
    // Localizzazione
    region: '',
    province: '',
    is_in_southern_italy: false, // Zone ZES, Mezzogiorno
    is_in_crisis_area: false, // Aree di crisi
    is_in_inner_area: false, // Aree interne
    
    // Settore e Codice ATECO
    sector: '',
    ateco_code: '',
    secondary_ateco_codes: '',
    
    // Dati Economici
    annual_revenue: '',
    total_assets: '',
    employees_count: '',
    rating_class: '',
    is_in_difficulty: false, // Impresa in difficoltà (esclude molti bandi UE)
    has_pending_recovery: false, // Aiuti da recuperare (Deggendorf)
    
    // Caratteristiche Speciali
    is_startup: false,
    is_innovative_startup: false,
    is_innovative_pmi: false,
    is_female_owned: false, // Impresa femminile (>50% donne)
    is_youth_owned: false, // Impresa giovanile (<35 anni)
    is_social_enterprise: false,
    
    // Certificazioni e Requisiti
    has_iso_certification: false,
    has_environmental_certification: false,
    has_durc_regolare: true, // DURC regolare
    has_antimafia_clean: true, // Certificazione antimafia
    has_fiscal_regularity: true, // Regolarità fiscale
    has_safety_compliance: true, // Regolarità sicurezza lavoro D.Lgs 81/08
    can_comply_dnsh: true, // Rispetto principio DNSH (Do No Significant Harm)
    
    // Aree di Interesse per Investimenti
    interested_in_digital: false,
    interested_in_innovation: false,
    interested_in_sustainability: false,
    interested_in_energy: false,
    interested_in_training: false,
    interested_in_hiring: false,
    has_export: false,
    interested_in_rd: false, // Ricerca e Sviluppo
    
    // Esperienza con Bandi
    has_previous_grants: false,
    previous_grants_amount: '',
    can_cofinance: true, // Capacità di cofinanziamento
    
    // Regioni di interesse per bandi
    interested_regions: [] // Array di regioni per cui l'utente vuole ricevere bandi
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData(prev => ({
          ...prev,
          company_size: currentUser.company_size || '',
          legal_form: currentUser.legal_form || '',
          years_activity: currentUser.years_activity || '',
          founding_date: currentUser.founding_date || '',
          region: currentUser.region || '',
          province: currentUser.province || '',
          is_in_southern_italy: currentUser.is_in_southern_italy || false,
          is_in_crisis_area: currentUser.is_in_crisis_area || false,
          is_in_inner_area: currentUser.is_in_inner_area || false,
          sector: currentUser.sector || '',
          ateco_code: currentUser.ateco_code || '',
          secondary_ateco_codes: currentUser.secondary_ateco_codes || '',
          annual_revenue: currentUser.annual_revenue || '',
          total_assets: currentUser.total_assets || '',
          employees_count: currentUser.employees_count || '',
          rating_class: currentUser.rating_class || '',
          is_in_difficulty: currentUser.is_in_difficulty || false,
          has_pending_recovery: currentUser.has_pending_recovery || false,
          is_startup: currentUser.is_startup || false,
          is_innovative_startup: currentUser.is_innovative_startup || false,
          is_innovative_pmi: currentUser.is_innovative_pmi || false,
          is_female_owned: currentUser.is_female_owned || false,
          is_youth_owned: currentUser.is_youth_owned || false,
          is_social_enterprise: currentUser.is_social_enterprise || false,
          has_iso_certification: currentUser.has_iso_certification || false,
          has_environmental_certification: currentUser.has_environmental_certification || false,
          has_durc_regolare: currentUser.has_durc_regolare !== false,
          has_antimafia_clean: currentUser.has_antimafia_clean !== false,
          has_fiscal_regularity: currentUser.has_fiscal_regularity !== false,
          has_safety_compliance: currentUser.has_safety_compliance !== false,
          can_comply_dnsh: currentUser.can_comply_dnsh !== false,
          interested_in_digital: currentUser.interested_in_digital || false,
          interested_in_innovation: currentUser.interested_in_innovation || false,
          interested_in_sustainability: currentUser.interested_in_sustainability || false,
          interested_in_energy: currentUser.interested_in_energy || false,
          interested_in_training: currentUser.interested_in_training || false,
          interested_in_hiring: currentUser.interested_in_hiring || false,
          has_export: currentUser.has_export || false,
          interested_in_rd: currentUser.interested_in_rd || false,
          has_previous_grants: currentUser.has_previous_grants || false,
          previous_grants_amount: currentUser.previous_grants_amount || '',
          can_cofinance: currentUser.can_cofinance !== false,
          interested_regions: currentUser.interested_regions || (currentUser.region ? [currentUser.region] : [])
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return base44.auth.updateMe(data);
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => {
        // Se arrivi dal pulsante AI, torna con parametro per attivare la ricerca AI
        if (fromAI) {
          navigate(createPageUrl('FinanziamentiAgevolati') + '?autoSearch=ai');
        } else {
          navigate(createPageUrl('FinanziamentiAgevolati'));
        }
      }, 1500);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(createPageUrl('FinanziamentiAgevolati'))} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
            <ArrowLeft className="w-7 h-7" />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold">Profilo Bandi</h1>
            <p className="text-slate-400 text-sm">Configura per ricevere bandi mirati</p>
          </div>
        </div>

        {saved && (
          <Alert className="mb-6 bg-green-500/20 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              Profilo salvato! {fromAI ? 'Avvio ricerca AI bandi...' : 'Reindirizzamento ai bandi...'}
            </AlertDescription>
          </Alert>
        )}

        {/* Alert campi obbligatori AI */}
        {fromAI && (
          <Alert className="mb-6 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/50">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <AlertDescription className="text-purple-300">
              <strong>Compila i campi evidenziati in viola</strong> per attivare la ricerca AI dei bandi compatibili con il tuo profilo aziendale.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dati Aziendali */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Dati Aziendali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={fromAI && !formData.company_size ? 'ring-2 ring-purple-500 rounded-lg p-2 bg-purple-500/10' : ''}>
                <Label className={`text-sm flex items-center ${fromAI && !formData.company_size ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                  {fromAI && !formData.company_size && <Sparkles className="w-4 h-4 mr-1 text-purple-400" />}
                  Dimensione Azienda *
                  <HelpTooltip text="La classificazione UE distingue: Micro (meno di 10 dipendenti e fatturato/attivo ≤2M€), Piccola (meno di 50 dip. e fatturato/attivo ≤10M€), Media (meno di 250 dip. e fatturato ≤50M€ o attivo ≤43M€), Grande (oltre questi limiti). Molti bandi sono riservati alle PMI." />
                </Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => setFormData({...formData, company_size: value})}
                >
                  <SelectTrigger className={`mt-1 text-white ${fromAI && !formData.company_size ? 'bg-purple-900/50 border-purple-500' : 'bg-slate-900 border-slate-700'}`}>
                    <SelectValue placeholder="Seleziona dimensione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Micro">Micro (&lt;10 dip., &lt;2M€ fatturato)</SelectItem>
                    <SelectItem value="Piccola">Piccola (&lt;50 dip., &lt;10M€ fatturato)</SelectItem>
                    <SelectItem value="Media">Media (&lt;250 dip., &lt;50M€ fatturato)</SelectItem>
                    <SelectItem value="Grande">Grande (oltre 250 dip.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-sm flex items-center">
                  Forma Giuridica *
                  <HelpTooltip text="La forma societaria della tua azienda come risulta dalla visura camerale. Alcuni bandi sono riservati a specifiche forme giuridiche (es. solo società di capitali, o solo cooperative)." />
                </Label>
                <Select
                  value={formData.legal_form}
                  onValueChange={(value) => setFormData({...formData, legal_form: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona forma giuridica" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORME_GIURIDICHE.map((forma) => (
                      <SelectItem key={forma} value={forma}>{forma}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 text-sm flex items-center">
                    Data Costituzione
                    <HelpTooltip text="Data di iscrizione al Registro Imprese. Importante per bandi che richiedono un'anzianità minima (es. almeno 2 anni di attività) o massima (es. start-up entro 5 anni)." />
                  </Label>
                  <Input
                    type="date"
                    value={formData.founding_date}
                    onChange={(e) => setFormData({...formData, founding_date: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm flex items-center">
                    Anni di Attività
                    <HelpTooltip text="Numero di anni dall'inizio dell'attività. Alcuni bandi richiedono un minimo di anni operativi (es. 2 bilanci depositati), altri premiano le nuove imprese." />
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.years_activity}
                    onChange={(e) => setFormData({...formData, years_activity: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                    placeholder="Es: 5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localizzazione */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localizzazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={fromAI && !formData.region ? 'ring-2 ring-purple-500 rounded-lg p-2 bg-purple-500/10' : ''}>
                <Label className={`text-sm flex items-center ${fromAI && !formData.region ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                  {fromAI && !formData.region && <Sparkles className="w-4 h-4 mr-1 text-purple-400" />}
                  Regione Sede Legale *
                  <HelpTooltip text="La regione dove ha sede legale l'azienda. I bandi regionali sono accessibili solo alle imprese con sede nella regione. Alcuni bandi nazionali danno priorità a specifiche aree geografiche." />
                </Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => {
                    // Auto-aggiungi la regione sede alle regioni di interesse
                    const currentInterested = formData.interested_regions || [];
                    const newInterested = currentInterested.includes(value) 
                      ? currentInterested 
                      : [...currentInterested, value];
                    setFormData({...formData, region: value, interested_regions: newInterested});
                  }}
                >
                  <SelectTrigger className={`mt-1 text-white ${fromAI && !formData.region ? 'bg-purple-900/50 border-purple-500' : 'bg-slate-900 border-slate-700'}`}>
                    <SelectValue placeholder="Seleziona regione" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONI_ITALIA.map((regione) => (
                      <SelectItem key={regione} value={regione}>{regione}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-sm flex items-center">
                  Provincia
                  <HelpTooltip text="Sigla provincia della sede legale (es. MI per Milano). Utile per bandi provinciali o camerali e per verificare l'appartenenza a zone speciali." />
                </Label>
                <Input
                  value={formData.province}
                  onChange={(e) => setFormData({...formData, province: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: MI, RM, NA..."
                  maxLength={2}
                />
              </div>

              {/* Regioni di interesse per bandi */}
              <div className={`pt-4 border-t border-slate-700 mt-4 ${fromAI && (!formData.interested_regions || formData.interested_regions.length === 0) ? 'ring-2 ring-purple-500 rounded-lg p-3 bg-purple-500/10' : ''}`}>
                <Label className={`text-sm flex items-center mb-3 ${fromAI && (!formData.interested_regions || formData.interested_regions.length === 0) ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                  {fromAI && (!formData.interested_regions || formData.interested_regions.length === 0) && <Sparkles className="w-4 h-4 mr-2 text-purple-400" />}
                  <MapPin className="w-4 h-4 mr-2 text-lime-400" />
                  Regioni di interesse per bandi *
                  <HelpTooltip text="Seleziona le regioni per cui vuoi ricevere notifiche sui bandi. La regione della tua sede legale è selezionata automaticamente. Puoi aggiungere altre regioni se hai sedi operative o interessi in altre zone." />
                </Label>
                <p className="text-slate-400 text-xs mb-3">
                  Seleziona tutte le regioni per cui vuoi essere avvisato sui bandi disponibili:
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                  {REGIONI_ITALIA.map((regione) => {
                    const isSelected = formData.interested_regions?.includes(regione);
                    const isHomeRegion = formData.region === regione;
                    return (
                      <label 
                        key={regione} 
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-lime-400/20 border border-lime-400/50' 
                            : 'bg-slate-900 hover:bg-slate-900/70 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newRegions = e.target.checked
                              ? [...(formData.interested_regions || []), regione]
                              : (formData.interested_regions || []).filter(r => r !== regione);
                            setFormData({...formData, interested_regions: newRegions});
                          }}
                          className="w-4 h-4 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                        />
                        <span className={`text-sm ${isSelected ? 'text-lime-400 font-medium' : 'text-white'}`}>
                          {regione}
                          {isHomeRegion && <span className="text-xs text-slate-400 ml-1">(sede)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className={`text-xs mt-2 ${formData.interested_regions?.length ? 'text-slate-500' : 'text-red-400'}`}>
                  {formData.interested_regions?.length || 0} regioni selezionate {!formData.interested_regions?.length && '(seleziona almeno una regione)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400 text-sm flex items-center">
                  Zone Speciali (se applicabile)
                  <HelpTooltip text="Alcune aree geografiche hanno accesso a bandi dedicati con agevolazioni maggiorate. Verifica se la tua sede rientra in una di queste zone." />
                </Label>
                
                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                  <input
                    type="checkbox"
                    checked={formData.is_in_southern_italy}
                    onChange={(e) => setFormData({...formData, is_in_southern_italy: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                  />
                  <div className="flex-1">
                    <span className="text-white flex items-center">Mezzogiorno / ZES <HelpTooltip text="Zone Economiche Speciali: aree del Sud Italia (Abruzzo, Molise, Campania, Basilicata, Puglia, Calabria, Sicilia, Sardegna) con agevolazioni fiscali e contributive potenziate. Includono anche le ZES portuali." /></span>
                    <p className="text-slate-500 text-xs">Zone Economiche Speciali Sud Italia</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                  <input
                    type="checkbox"
                    checked={formData.is_in_crisis_area}
                    onChange={(e) => setFormData({...formData, is_in_crisis_area: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                  />
                  <div className="flex-1">
                    <span className="text-white flex items-center">Area di Crisi <HelpTooltip text="Zone di crisi industriale complessa: territori colpiti da crisi di grandi imprese con impatto sull'occupazione locale. Hanno accesso a bandi specifici per rilancio e reindustrializzazione." /></span>
                    <p className="text-slate-500 text-xs">Zone di crisi industriale complessa</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                  <input
                    type="checkbox"
                    checked={formData.is_in_inner_area}
                    onChange={(e) => setFormData({...formData, is_in_inner_area: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                  />
                  <div className="flex-1">
                    <span className="text-white flex items-center">Area Interna <HelpTooltip text="Aree Interne SNAI: territori distanti dai centri di offerta dei servizi essenziali (sanità, istruzione, mobilità). Beneficiano di bandi dedicati per contrastare lo spopolamento." /></span>
                    <p className="text-slate-500 text-xs">Aree marginali SNAI</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Settore e Codice ATECO */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Settore di Attività
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={fromAI && !formData.sector ? 'ring-2 ring-purple-500 rounded-lg p-2 bg-purple-500/10' : ''}>
                <Label className={`text-sm flex items-center ${fromAI && !formData.sector ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                  {fromAI && !formData.sector && <Sparkles className="w-4 h-4 mr-1 text-purple-400" />}
                  Settore Principale *
                  <HelpTooltip text="Il macro-settore in cui opera prevalentemente l'azienda. Molti bandi sono settoriali (es. solo manifatturiero, solo turismo) o escludono specifici settori." />
                </Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value) => setFormData({...formData, sector: value})}
                >
                  <SelectTrigger className={`mt-1 text-white ${fromAI && !formData.sector ? 'bg-purple-900/50 border-purple-500' : 'bg-slate-900 border-slate-700'}`}>
                    <SelectValue placeholder="Seleziona settore" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTORI.map((settore) => (
                      <SelectItem key={settore} value={settore}>{settore}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={fromAI && !formData.ateco_code ? 'ring-2 ring-purple-500 rounded-lg p-2 bg-purple-500/10' : ''}>
                <Label className={`text-sm flex items-center ${fromAI && !formData.ateco_code ? 'text-purple-400 font-semibold' : 'text-slate-300'}`}>
                  {fromAI && !formData.ateco_code && <Sparkles className="w-4 h-4 mr-1 text-purple-400" />}
                  Codice ATECO Principale *
                  <HelpTooltip text="Codice a 6 cifre che identifica l'attività economica (es. 62.01.00 = sviluppo software). Lo trovi sulla visura camerale. È il criterio principale per verificare l'ammissibilità ai bandi." />
                </Label>
                <Input
                  value={formData.ateco_code}
                  onChange={(e) => setFormData({...formData, ateco_code: e.target.value})}
                  className={`mt-1 text-white ${fromAI && !formData.ateco_code ? 'bg-purple-900/50 border-purple-500' : 'bg-slate-900 border-slate-700'}`}
                  placeholder="Es: 62.01.00"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Codice di classificazione attività economica (visura camerale)
                </p>
              </div>

              <div>
                <Label className="text-slate-300 text-sm flex items-center">
                  Codici ATECO Secondari
                  <HelpTooltip text="Altri codici ATECO registrati per attività secondarie. Possono ampliare l'accesso a bandi di settori diversi dal principale." />
                </Label>
                <Input
                  value={formData.secondary_ateco_codes}
                  onChange={(e) => setFormData({...formData, secondary_ateco_codes: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: 47.91.10, 82.99.99"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Separati da virgola (se presenti)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dati Economici */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Dati Economici
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 text-sm flex items-center">
                  Fatturato Annuo (€)
                  <HelpTooltip text="Ricavi delle vendite e prestazioni dell'ultimo bilancio approvato. È uno dei parametri per la classificazione dimensionale PMI e per alcuni requisiti di accesso ai bandi." />
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.annual_revenue}
                  onChange={(e) => setFormData({...formData, annual_revenue: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: 500000"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm flex items-center">
                  Totale Attivo di Bilancio (€)
                  <HelpTooltip text="Totale delle attività dello Stato Patrimoniale (ultimo bilancio). Insieme al fatturato, determina la dimensione aziendale secondo i criteri UE." />
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.total_assets}
                  onChange={(e) => setFormData({...formData, total_assets: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: 1000000"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm flex items-center">
                  Numero Dipendenti (ULA)
                  <HelpTooltip text="ULA = Unità Lavorative Anno. È la media annua dei dipendenti a tempo pieno. I part-time e stagionali si calcolano in proporzione. Fondamentale per la classificazione PMI." />
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.employees_count}
                  onChange={(e) => setFormData({...formData, employees_count: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: 15"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Unità Lavorative Anno (media annua)
                </p>
              </div>

              <div>
                <Label className="text-slate-300 text-sm flex items-center">
                  Classe di Rating
                  <HelpTooltip text="Valutazione del merito creditizio assegnata da banche o agenzie. Alcuni finanziamenti agevolati richiedono un rating minimo. Se non lo conosci, seleziona 'Non classificato'." />
                </Label>
                <Select
                  value={formData.rating_class}
                  onValueChange={(value) => setFormData({...formData, rating_class: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona rating (se noto)" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICAZIONE_RATING.map((rating) => (
                      <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-red-400 text-sm flex items-center">
                  ⚠️ Condizioni di Esclusione
                  <HelpTooltip text="ATTENZIONE: queste condizioni escludono l'accesso alla maggior parte dei bandi europei e nazionali. Rispondi con attenzione." />
                </Label>
                <p className="text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                  ⚠️ <strong>NON spuntare</strong> queste caselle se la tua azienda NON si trova in queste condizioni. Spunta solo se sei effettivamente in difficoltà o hai aiuti da recuperare.
                </p>
                
                <label className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-800/30 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_in_difficulty}
                    onChange={(e) => setFormData({...formData, is_in_difficulty: e.target.checked})}
                    className="w-5 h-5 rounded border-red-600 text-red-400 focus:ring-red-400"
                  />
                  <div className="flex-1">
                    <span className="text-white flex items-center">Impresa in difficoltà <HelpTooltip text="Definizione UE: patrimonio netto negativo, o perdite superiori al 50% del capitale, o in procedura concorsuale. Le imprese in difficoltà sono escluse da quasi tutti i bandi UE." /></span>
                    <p className="text-slate-500 text-xs">Secondo definizione UE (esclude molti bandi)</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-800/30 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_pending_recovery}
                    onChange={(e) => setFormData({...formData, has_pending_recovery: e.target.checked})}
                    className="w-5 h-5 rounded border-red-600 text-red-400 focus:ring-red-400"
                  />
                  <div className="flex-1">
                    <span className="text-white flex items-center">Aiuti da recuperare (Deggendorf) <HelpTooltip text="Clausola Deggendorf: se l'impresa ha ricevuto aiuti di Stato dichiarati illegali dalla Commissione UE e non li ha restituiti, non può ricevere nuovi aiuti fino al recupero completo." /></span>
                    <p className="text-slate-500 text-xs">Ordine di recupero aiuti di Stato pendente</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Caratteristiche Speciali */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <Users className="w-5 h-5" />
                Caratteristiche Speciali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-400 text-sm mb-2">
                Seleziona se applicabili (danno accesso a bandi dedicati):
              </p>
              <p className="text-blue-400 text-xs bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 mb-3">
                ℹ️ <strong>Importante:</strong> Le caratteristiche "Start-up Innovativa", "PMI Innovativa" e "Impresa Sociale" devono risultare dalla <strong>Visura Camerale</strong> (iscrizione alla sezione speciale del Registro Imprese). Per "Impresa Femminile" e "Impresa Giovanile" verifica che la composizione societaria rispetti i requisiti indicati.
              </p>
              
              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.is_startup}
                  onChange={(e) => setFormData({...formData, is_startup: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Start-up <HelpTooltip text="Impresa di nuova costituzione, generalmente entro 5 anni dalla fondazione. Molti bandi dedicati offrono agevolazioni specifiche per le nuove imprese." /></span>
                  <p className="text-slate-500 text-xs">Impresa costituita da meno di 5 anni</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.is_innovative_startup}
                  onChange={(e) => setFormData({...formData, is_innovative_startup: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Start-up Innovativa <HelpTooltip text="Società di capitali con requisiti specifici (es. spese R&S >15%, personale qualificato, brevetti). Iscritta alla sezione speciale del Registro Imprese. Ha accesso a incentivi fiscali e bandi dedicati. R&S = Ricerca e Sviluppo: attività sistematiche volte a creare nuova conoscenza (ricerca) e applicarla per sviluppare prodotti, servizi o processi innovativi (sviluppo)." /></span>
                  <p className="text-slate-500 text-xs">Iscritta alla sezione speciale del Registro Imprese</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.is_innovative_pmi}
                  onChange={(e) => setFormData({...formData, is_innovative_pmi: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">PMI Innovativa <HelpTooltip text="PMI con almeno 2 su 3 requisiti: spese R&S ≥3% del maggiore tra costo e valore produzione, personale qualificato ≥1/5, titolare di brevetto/software. Ha benefici simili alle start-up innovative. R&S = Ricerca e Sviluppo: investimenti in attività per creare innovazione, come sviluppo di nuovi prodotti, tecnologie, processi produttivi o miglioramento di quelli esistenti." /></span>
                  <p className="text-slate-500 text-xs">Iscritta alla sezione speciale PMI innovative</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.is_female_owned}
                  onChange={(e) => setFormData({...formData, is_female_owned: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Impresa Femminile <HelpTooltip text="Impresa con: partecipazione femminile ≥50% del capitale, oppure ≥2/3 dell'organo amministrativo composto da donne. Ha accesso a bandi dedicati (es. Fondo Impresa Donna) e punteggi premiali." /></span>
                  <p className="text-slate-500 text-xs">Partecipazione femminile &gt;50% o amministratore donna</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.is_youth_owned}
                  onChange={(e) => setFormData({...formData, is_youth_owned: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Impresa Giovanile <HelpTooltip text="Impresa con partecipazione maggioritaria (>50%) di soci under 35 anni, oppure con titolare/amministratore unico under 35. Accede a bandi specifici come Resto al Sud, ON - Oltre Nuove Imprese." /></span>
                  <p className="text-slate-500 text-xs">Partecipazione &gt;50% di under 35 anni</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.is_social_enterprise}
                  onChange={(e) => setFormData({...formData, is_social_enterprise: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Impresa Sociale / Terzo Settore <HelpTooltip text="Enti iscritti al RUNTS (Registro Unico Nazionale Terzo Settore) o con qualifica di impresa sociale. Accedono a bandi dedicati e hanno regime fiscale agevolato." /></span>
                  <p className="text-slate-500 text-xs">Iscritta al RUNTS o qualifica impresa sociale</p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Certificazioni e Requisiti */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Certificazioni e Requisiti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-400 text-sm mb-2">
                Requisiti obbligatori per partecipare ai bandi:
              </p>
              <p className="text-blue-400 text-xs bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 mb-3">
                ℹ️ <strong>Quando servono questi documenti?</strong> Spunta se li hai già O se intendi procurarteli prima della domanda. Il DURC e la regolarità fiscale sono richiesti al momento della presentazione della domanda. La certificazione antimafia viene acquisita d'ufficio per importi &gt;€150.000, ma devi comunque essere in regola.
              </p>
              
              <label className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_durc_regolare}
                  onChange={(e) => setFormData({...formData, has_durc_regolare: e.target.checked})}
                  className="w-5 h-5 rounded border-green-600 text-green-400 focus:ring-green-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">DURC Regolare <HelpTooltip text="Documento che attesta la regolarità nei pagamenti dei contributi INPS, INAIL e Cassa Edile. È OBBLIGATORIO per TUTTE le tipologie di impresa (società di capitali, società di persone, ditte individuali, cooperative, ecc.) che partecipano a bandi pubblici. Anche le ditte individuali senza dipendenti devono avere il DURC regolare per i contributi previdenziali del titolare. Richiedilo tramite il portale INPS." /></span>
                  <p className="text-slate-500 text-xs">Documento Unico Regolarità Contributiva</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_antimafia_clean}
                  onChange={(e) => setFormData({...formData, has_antimafia_clean: e.target.checked})}
                  className="w-5 h-5 rounded border-green-600 text-green-400 focus:ring-green-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Certificazione Antimafia <HelpTooltip text="Documentazione antimafia (comunicazione o informazione) che attesta l'assenza di tentativi di infiltrazione mafiosa. Richiesta per contributi superiori a €150.000." /></span>
                  <p className="text-slate-500 text-xs">Assenza cause interdittive antimafia</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_fiscal_regularity}
                  onChange={(e) => setFormData({...formData, has_fiscal_regularity: e.target.checked})}
                  className="w-5 h-5 rounded border-green-600 text-green-400 focus:ring-green-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Regolarità Fiscale <HelpTooltip text="Assenza di debiti tributari definitivamente accertati superiori a €5.000. Puoi verificare la tua posizione tramite il Cassetto Fiscale dell'Agenzia delle Entrate." /></span>
                  <p className="text-slate-500 text-xs">Nessun debito tributario rilevante</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_safety_compliance}
                  onChange={(e) => setFormData({...formData, has_safety_compliance: e.target.checked})}
                  className="w-5 h-5 rounded border-green-600 text-green-400 focus:ring-green-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Regolarità Sicurezza Lavoro <HelpTooltip text="Rispetto del D.Lgs. 81/2008 (Testo Unico Sicurezza): DVR aggiornato, formazione lavoratori, sorveglianza sanitaria. OBBLIGATORIO per Transizione 5.0 e tutti i bandi PNRR. Le imprese con violazioni gravi sono escluse." /></span>
                  <p className="text-slate-500 text-xs">DVR, formazione, D.Lgs. 81/08 - Richiesto per Transizione 5.0</p>
                </div>
              </label>

              <div className="pt-3 border-t border-slate-700 mt-3">
                <p className="text-orange-400 text-sm mb-2 flex items-center">
                  🔋 Requisiti specifici per Transizione 5.0 e bandi PNRR
                  <HelpTooltip text="Questi requisiti sono richiesti specificamente per accedere alla Transizione 5.0 e ad altri bandi finanziati dal PNRR. Le certificazioni tecniche (ex ante, ex post, perizia 4.0) verranno richieste dal consulente al momento della domanda." />
                </p>
                <p className="text-slate-400 text-xs bg-slate-700/50 rounded-lg p-2 mb-3">
                  Per la Transizione 5.0 servono anche certificazioni TECNICHE legate al singolo progetto (certificazione energetica ex ante/ex post, perizia 4.0, certificazione contabile). Queste verranno preparate dal consulente quando presenti domanda per un bando specifico.
                </p>
              </div>

              <label className="flex items-center gap-3 p-3 bg-orange-900/20 border border-orange-800/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.can_comply_dnsh}
                  onChange={(e) => setFormData({...formData, can_comply_dnsh: e.target.checked})}
                  className="w-5 h-5 rounded border-orange-600 text-orange-400 focus:ring-orange-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Rispetto principio DNSH <HelpTooltip text="DNSH = 'Do No Significant Harm' (Non arrecare danno significativo). Principio UE obbligatorio per tutti i bandi PNRR. L'impresa NON deve operare in: combustibili fossili, discariche, inceneritori, attività ad alte emissioni. Se la tua attività è 'normale' (manifattura, servizi, commercio, ecc.) puoi spuntare questa casella." /></span>
                  <p className="text-slate-500 text-xs">L'azienda non opera in settori esclusi dal PNRR</p>
                </div>
              </label>

              <div className="pt-3">
                <p className="text-slate-400 text-sm mb-2">Certificazioni opzionali (danno punteggi extra):</p>
                <p className="text-green-400 text-xs bg-green-500/10 border border-green-500/30 rounded-lg p-2 mb-3">
                  ✓ <strong>Queste certificazioni non sono obbligatorie</strong>, ma danno punteggi premiali in graduatoria. Spunta se le hai già: devono essere valide al momento della domanda. Se non le hai, puoi comunque partecipare ai bandi (salvo casi specifici).
                </p>
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.has_iso_certification}
                  onChange={(e) => setFormData({...formData, has_iso_certification: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Certificazione ISO <HelpTooltip text="Certificazioni di sistema di gestione: ISO 9001 (qualità), ISO 14001 (ambiente), ISO 45001 (sicurezza). Danno punteggi premiali in molti bandi e sono talvolta requisiti obbligatori." /></span>
                  <p className="text-slate-500 text-xs">ISO 9001, 14001, 45001 o altre</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.has_environmental_certification}
                  onChange={(e) => setFormData({...formData, has_environmental_certification: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Certificazione Ambientale <HelpTooltip text="EMAS (gestione ambientale UE), Ecolabel (marchio ecologico), EPD (dichiarazione ambientale prodotto). Sempre più richieste per bandi green e transizione ecologica." /></span>
                  <p className="text-slate-500 text-xs">EMAS, Ecolabel, EPD o similari</p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Aree di Interesse */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Aree di Interesse per Investimenti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-400 text-sm mb-3">
                Seleziona le aree per cui cerchi finanziamenti:
              </p>
              
              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_digital}
                  onChange={(e) => setFormData({...formData, interested_in_digital: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white flex items-center">Digitalizzazione e Industria 4.0 <HelpTooltip text="Investimenti in software, cloud, e-commerce, cybersecurity, macchinari interconnessi 4.0. Bandi: Transizione 4.0, voucher digitalizzazione, PNRR digitale." /></span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_innovation}
                  onChange={(e) => setFormData({...formData, interested_in_innovation: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white flex items-center">Innovazione Tecnologica <HelpTooltip text="Sviluppo di nuovi prodotti, processi o servizi innovativi. Include brevetti, design industriale, prototipi. Bandi: Nuova Sabatini, Smart&Start, Horizon Europe." /></span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_rd}
                  onChange={(e) => setFormData({...formData, interested_in_rd: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white flex items-center">Ricerca e Sviluppo <HelpTooltip text="Attività di ricerca fondamentale, industriale e sviluppo sperimentale. Credito d'imposta R&S, bandi MISE, progetti europei Horizon. Spesso richiedono collaborazione con università/enti di ricerca." /></span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_sustainability}
                  onChange={(e) => setFormData({...formData, interested_in_sustainability: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white flex items-center">Sostenibilità Ambientale <HelpTooltip text="Investimenti per ridurre l'impatto ambientale: economia circolare, riduzione emissioni, gestione rifiuti. Forte spinta dal PNRR e Green Deal europeo." /></span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_energy}
                  onChange={(e) => setFormData({...formData, interested_in_energy: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white flex items-center">Efficienza Energetica <HelpTooltip text="Interventi per ridurre i consumi: fotovoltaico, LED, coibentazione, cogenerazione. Bandi regionali, conto termico, certificati bianchi, comunità energetiche." /></span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.has_export}
                  onChange={(e) => setFormData({...formData, has_export: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white flex items-center">Export e Internazionalizzazione <HelpTooltip text="Supporto per espansione sui mercati esteri: fiere, certificazioni export, temporary export manager. Bandi SIMEST, SACE, ICE, voucher internazionalizzazione." /></span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_training}
                  onChange={(e) => setFormData({...formData, interested_in_training: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white flex items-center">Formazione del Personale <HelpTooltip text="Corsi di aggiornamento e riqualificazione dipendenti. Credito d'imposta formazione 4.0, Fondo Nuove Competenze, fondi interprofessionali (Fondimpresa, Fondirigenti, ecc.)." /></span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_hiring}
                  onChange={(e) => setFormData({...formData, interested_in_hiring: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white flex items-center">Assunzioni e Occupazione <HelpTooltip text="Incentivi per nuove assunzioni: bonus giovani, donne, over 50, decontribuzione Sud, apprendistato. Verificare requisiti specifici per ogni tipologia di incentivo." /></span>
              </label>
            </CardContent>
          </Card>

          {/* Esperienza con Bandi */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lime-400 text-base flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Esperienza e Capacità Finanziaria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.has_previous_grants}
                  onChange={(e) => setFormData({...formData, has_previous_grants: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Ho già ottenuto finanziamenti agevolati <HelpTooltip text="Indica se hai già ricevuto contributi pubblici. È importante per il calcolo del regime de minimis e per evitare il cumulo non consentito di aiuti." /></span>
                  <p className="text-slate-500 text-xs">Bandi UE, nazionali o regionali</p>
                </div>
              </label>

              {formData.has_previous_grants && (
                <div>
                                <Label className="text-slate-300 text-sm flex items-center">
                                  Importo totale ricevuto (€)
                                  <HelpTooltip text="Somma degli aiuti de minimis ricevuti negli ultimi 3 esercizi fiscali. Il limite è €200.000 (€100.000 per trasporto merci). Superato il limite, puoi accedere solo a bandi non de minimis." />
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={formData.previous_grants_amount}
                                  onChange={(e) => setFormData({...formData, previous_grants_amount: e.target.value})}
                                  className="bg-slate-900 border-slate-700 text-white mt-1"
                                  placeholder="Es: 50000"
                                />
                                <p className="text-slate-500 text-xs mt-1">
                                  Importante per il calcolo del de minimis (200.000€ in 3 anni)
                                </p>
                              </div>
              )}

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.can_cofinance}
                  onChange={(e) => setFormData({...formData, can_cofinance: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div className="flex-1">
                  <span className="text-white flex items-center">Capacità di cofinanziamento <HelpTooltip text="Molti bandi coprono solo una percentuale dell'investimento (es. 50%). Devi dimostrare di poter coprire la quota restante con mezzi propri o finanziamento bancario." /></span>
                  <p className="text-slate-500 text-xs">Disponibilità mezzi propri o accesso al credito</p>
                </div>
              </label>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className={`w-full py-6 text-lg font-bold ${fromAI ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white' : 'bg-lime-400 hover:bg-lime-500 text-slate-900'}`}
          >
            {saveMutation.isPending ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                Salvataggio...
              </>
            ) : fromAI ? (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Salva e Avvia Ricerca AI Bandi
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salva Profilo Bandi
              </>
            )}
          </Button>
        </form>
      </main>

      <BottomNav currentPage="FinanziamentiAgevolati" />
    </div>
  );
}