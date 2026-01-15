import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, FileText, Scale, Save, CheckCircle, Euro, Users, Briefcase, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

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
    can_cofinance: true // Capacità di cofinanziamento
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
          can_cofinance: currentUser.can_cofinance !== false
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
        navigate(createPageUrl('FinanziamentiAgevolati'));
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
          <Link to={createPageUrl('FinanziamentiAgevolati')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-white text-xl font-bold">Profilo Bandi</h1>
            <p className="text-slate-400 text-sm">Configura per ricevere bandi mirati</p>
          </div>
        </div>

        {saved && (
          <Alert className="mb-6 bg-green-500/20 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-400">
              Profilo salvato! Reindirizzamento ai bandi...
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
              <div>
                <Label className="text-slate-300 text-sm">Dimensione Azienda *</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => setFormData({...formData, company_size: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
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
                <Label className="text-slate-300 text-sm">Forma Giuridica *</Label>
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
                  <Label className="text-slate-300 text-sm">Data Costituzione</Label>
                  <Input
                    type="date"
                    value={formData.founding_date}
                    onChange={(e) => setFormData({...formData, founding_date: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm">Anni di Attività</Label>
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
              <div>
                <Label className="text-slate-300 text-sm">Regione Sede Legale *</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({...formData, region: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
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
                <Label className="text-slate-300 text-sm">Provincia</Label>
                <Input
                  value={formData.province}
                  onChange={(e) => setFormData({...formData, province: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: MI, RM, NA..."
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400 text-sm">Zone Speciali (se applicabile)</Label>
                
                <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                  <input
                    type="checkbox"
                    checked={formData.is_in_southern_italy}
                    onChange={(e) => setFormData({...formData, is_in_southern_italy: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                  />
                  <div>
                    <span className="text-white">Mezzogiorno / ZES</span>
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
                  <div>
                    <span className="text-white">Area di Crisi</span>
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
                  <div>
                    <span className="text-white">Area Interna</span>
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
              <div>
                <Label className="text-slate-300 text-sm">Settore Principale *</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value) => setFormData({...formData, sector: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Seleziona settore" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTORI.map((settore) => (
                      <SelectItem key={settore} value={settore}>{settore}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Codice ATECO Principale *</Label>
                <Input
                  value={formData.ateco_code}
                  onChange={(e) => setFormData({...formData, ateco_code: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                  placeholder="Es: 62.01.00"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Codice di classificazione attività economica (visura camerale)
                </p>
              </div>

              <div>
                <Label className="text-slate-300 text-sm">Codici ATECO Secondari</Label>
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
                <Label className="text-slate-300 text-sm">Fatturato Annuo (€)</Label>
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
                <Label className="text-slate-300 text-sm">Totale Attivo di Bilancio (€)</Label>
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
                <Label className="text-slate-300 text-sm">Numero Dipendenti (ULA)</Label>
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
                <Label className="text-slate-300 text-sm">Classe di Rating</Label>
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
                <Label className="text-red-400 text-sm">⚠️ Condizioni di Esclusione</Label>
                
                <label className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-800/30 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_in_difficulty}
                    onChange={(e) => setFormData({...formData, is_in_difficulty: e.target.checked})}
                    className="w-5 h-5 rounded border-red-600 text-red-400 focus:ring-red-400"
                  />
                  <div>
                    <span className="text-white">Impresa in difficoltà</span>
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
                  <div>
                    <span className="text-white">Aiuti da recuperare (Deggendorf)</span>
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
              
              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.is_startup}
                  onChange={(e) => setFormData({...formData, is_startup: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div>
                  <span className="text-white">Start-up</span>
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
                <div>
                  <span className="text-white">Start-up Innovativa</span>
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
                <div>
                  <span className="text-white">PMI Innovativa</span>
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
                <div>
                  <span className="text-white">Impresa Femminile</span>
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
                <div>
                  <span className="text-white">Impresa Giovanile</span>
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
                <div>
                  <span className="text-white">Impresa Sociale / Terzo Settore</span>
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
              
              <label className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_durc_regolare}
                  onChange={(e) => setFormData({...formData, has_durc_regolare: e.target.checked})}
                  className="w-5 h-5 rounded border-green-600 text-green-400 focus:ring-green-400"
                />
                <div>
                  <span className="text-white">DURC Regolare</span>
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
                <div>
                  <span className="text-white">Certificazione Antimafia</span>
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
                <div>
                  <span className="text-white">Regolarità Fiscale</span>
                  <p className="text-slate-500 text-xs">Nessun debito tributario rilevante</p>
                </div>
              </label>

              <div className="pt-3">
                <p className="text-slate-400 text-sm mb-2">Certificazioni opzionali (danno punteggi extra):</p>
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.has_iso_certification}
                  onChange={(e) => setFormData({...formData, has_iso_certification: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <div>
                  <span className="text-white">Certificazione ISO</span>
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
                <div>
                  <span className="text-white">Certificazione Ambientale</span>
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
                <span className="text-white">Digitalizzazione e Industria 4.0</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_innovation}
                  onChange={(e) => setFormData({...formData, interested_in_innovation: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Innovazione Tecnologica</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_rd}
                  onChange={(e) => setFormData({...formData, interested_in_rd: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Ricerca e Sviluppo</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_sustainability}
                  onChange={(e) => setFormData({...formData, interested_in_sustainability: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Sostenibilità Ambientale</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_energy}
                  onChange={(e) => setFormData({...formData, interested_in_energy: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Efficienza Energetica</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.has_export}
                  onChange={(e) => setFormData({...formData, has_export: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Export e Internazionalizzazione</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_training}
                  onChange={(e) => setFormData({...formData, interested_in_training: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Formazione del Personale</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input
                  type="checkbox"
                  checked={formData.interested_in_hiring}
                  onChange={(e) => setFormData({...formData, interested_in_hiring: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400"
                />
                <span className="text-white">Assunzioni e Occupazione</span>
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
                <div>
                  <span className="text-white">Ho già ottenuto finanziamenti agevolati</span>
                  <p className="text-slate-500 text-xs">Bandi UE, nazionali o regionali</p>
                </div>
              </label>

              {formData.has_previous_grants && (
                <div>
                  <Label className="text-slate-300 text-sm">Importo totale ricevuto (€)</Label>
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
                <div>
                  <span className="text-white">Capacità di cofinanziamento</span>
                  <p className="text-slate-500 text-xs">Disponibilità mezzi propri o accesso al credito</p>
                </div>
              </label>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={saveMutation.isPending || !formData.company_size || !formData.region || !formData.sector || !formData.ateco_code}
            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 py-6 text-lg font-bold"
          >
            {saveMutation.isPending ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mr-2"></div>
                Salvataggio...
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