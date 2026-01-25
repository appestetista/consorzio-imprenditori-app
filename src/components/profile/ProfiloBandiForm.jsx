import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Building2, MapPin, FileText, Scale, Save, CheckCircle, Euro, Users, Briefcase, Globe, HelpCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useImpersonation } from '../admin/ImpersonationContext';

// Campi obbligatori per il matching bandi
const REQUIRED_FIELDS = ['company_size', 'region', 'interested_regions', 'sector', 'ateco_code', 'legal_form'];

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
  'Ditta individuale', 'S.r.l.', 'S.r.l.s.', 'S.p.A.', 'S.n.c.', 'S.a.s.',
  'Cooperativa', 'Consorzio', 'Associazione', 'Fondazione',
  'Start-up innovativa', 'PMI innovativa', 'Impresa sociale', 'Altro'
];

const SETTORI = [
  'Agricoltura e Agroalimentare', 'Artigianato', 'Commercio al dettaglio',
  'Commercio all\'ingrosso', 'Costruzioni ed Edilizia', 'Cultura e Spettacolo',
  'Turismo e Ristorazione', 'Energia e Utilities', 'Ambiente e Rifiuti',
  'Industria Manifatturiera', 'Industria Chimica e Farmaceutica',
  'Logistica e Trasporti', 'Servizi alle Imprese', 'Servizi alla Persona',
  'Sanità e Assistenza', 'ICT e Tecnologia', 'Ricerca e Sviluppo',
  'Formazione e Istruzione', 'Credito e Finanza', 'Immobiliare', 'Altro'
];

const CLASSIFICAZIONE_RATING = [
  'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D', 'Non classificato'
];

export default function ProfiloBandiForm({ user, onSaved }) {
  const [saved, setSaved] = useState(false);
  const { impersonation } = useImpersonation();
  
  const [formData, setFormData] = useState({
    company_size: '', legal_form: '', years_activity: '', founding_date: '',
    region: '', province: '', is_in_southern_italy: false, is_in_crisis_area: false, is_in_inner_area: false,
    interested_regions: [],
    sector: '', ateco_code: '', secondary_ateco_codes: '',
    annual_revenue: '', total_assets: '', employees_count: '', rating_class: '',
    is_in_difficulty: false, has_pending_recovery: false,
    is_startup: false, is_innovative_startup: false, is_innovative_pmi: false,
    is_female_owned: false, is_youth_owned: false, is_social_enterprise: false,
    has_iso_certification: false, has_environmental_certification: false,
    has_durc_regolare: true, has_antimafia_clean: true, has_fiscal_regularity: true,
    has_safety_compliance: true, can_comply_dnsh: true,
    interested_in_digital: false, interested_in_innovation: false, interested_in_sustainability: false,
    interested_in_energy: false, interested_in_training: false, interested_in_hiring: false,
    has_export: false, interested_in_rd: false,
    has_previous_grants: false, previous_grants_amount: '', can_cofinance: true
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        company_size: user.company_size || '',
        legal_form: user.legal_form || '',
        years_activity: user.years_activity || '',
        founding_date: user.founding_date || '',
        region: user.region || '',
        province: user.province || '',
        is_in_southern_italy: user.is_in_southern_italy || false,
        is_in_crisis_area: user.is_in_crisis_area || false,
        is_in_inner_area: user.is_in_inner_area || false,
        sector: user.sector || '',
        ateco_code: user.ateco_code || '',
        secondary_ateco_codes: user.secondary_ateco_codes || '',
        annual_revenue: user.annual_revenue || '',
        total_assets: user.total_assets || '',
        employees_count: user.employees_count || '',
        rating_class: user.rating_class || '',
        is_in_difficulty: user.is_in_difficulty || false,
        has_pending_recovery: user.has_pending_recovery || false,
        is_startup: user.is_startup || false,
        is_innovative_startup: user.is_innovative_startup || false,
        is_innovative_pmi: user.is_innovative_pmi || false,
        is_female_owned: user.is_female_owned || false,
        is_youth_owned: user.is_youth_owned || false,
        is_social_enterprise: user.is_social_enterprise || false,
        has_iso_certification: user.has_iso_certification || false,
        has_environmental_certification: user.has_environmental_certification || false,
        has_durc_regolare: user.has_durc_regolare !== false,
        has_antimafia_clean: user.has_antimafia_clean !== false,
        has_fiscal_regularity: user.has_fiscal_regularity !== false,
        has_safety_compliance: user.has_safety_compliance !== false,
        can_comply_dnsh: user.can_comply_dnsh !== false,
        interested_in_digital: user.interested_in_digital || false,
        interested_in_innovation: user.interested_in_innovation || false,
        interested_in_sustainability: user.interested_in_sustainability || false,
        interested_in_energy: user.interested_in_energy || false,
        interested_in_training: user.interested_in_training || false,
        interested_in_hiring: user.interested_in_hiring || false,
        has_export: user.has_export || false,
        interested_in_rd: user.interested_in_rd || false,
        has_previous_grants: user.has_previous_grants || false,
        previous_grants_amount: user.previous_grants_amount || '',
        can_cofinance: user.can_cofinance !== false,
        interested_regions: user.interested_regions?.length 
          ? user.interested_regions 
          : (user.region ? [user.region] : [])
      }));
    }
  }, [user]);

  // Quando cambia la regione sede, aggiungila automaticamente alle regioni di interesse
  useEffect(() => {
    if (formData.region && !formData.interested_regions?.includes(formData.region)) {
      setFormData(prev => ({
        ...prev,
        interested_regions: [...(prev.interested_regions || []), prev.region]
      }));
    }
  }, [formData.region]);

  // Funzione per salvare: usa User.update se impersonificazione attiva, altrimenti updateMe
  const saveData = async (data) => {
    if (impersonation.active && impersonation.previewUserId && impersonation.role === 'user') {
      return base44.entities.User.update(impersonation.previewUserId, data);
    } else {
      return base44.auth.updateMe(data);
    }
  };

  const saveMutation = useMutation({
    mutationFn: saveData,
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (onSaved) onSaved();
    }
  });

  // Funzione per aggiornare un campo e salvarlo automaticamente
  const updateAndSave = async (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    try {
      await saveData({ [field]: value });
    } catch (err) {
      console.error('Errore salvataggio:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  // Verifica campi obbligatori mancanti
  const getMissingRequiredFields = () => {
    const missing = [];
    if (!formData.company_size) missing.push('Dimensione Azienda');
    if (!formData.region) missing.push('Regione Sede Legale');
    if (!formData.interested_regions?.length) missing.push('Regioni di Interesse');
    if (!formData.sector) missing.push('Settore Principale');
    if (!formData.ateco_code) missing.push('Codice ATECO');
    if (!formData.legal_form) missing.push('Forma Giuridica');
    return missing;
  };

  const missingFields = getMissingRequiredFields();
  const hasAllRequired = missingFields.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert campi obbligatori mancanti */}
      {!hasAllRequired && (
        <Alert className="bg-lime-500/20 border-lime-500/50">
          <AlertTriangle className="h-5 w-5 text-lime-400" />
          <AlertDescription className="text-lime-300">
            <p className="font-bold mb-2">⚠️ Completa i campi obbligatori per vedere i bandi compatibili:</p>
            <ul className="list-disc list-inside space-y-1">
              {missingFields.map((field) => (
                <li key={field} className="text-lime-400">{field}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert className="bg-green-500/20 border-green-500/30">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-400">Profilo bandi salvato con successo!</AlertDescription>
        </Alert>
      )}

      {/* Dati Aziendali */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Dati Aziendali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className={`text-sm flex items-center ${!formData.company_size ? 'text-lime-400' : 'text-slate-300'}`}>
              Dimensione Azienda <span className="text-lime-400 ml-1">*</span>
              <HelpTooltip text="Micro (<10 dip., <2M€), Piccola (<50 dip., <10M€), Media (<250 dip., <50M€), Grande (oltre)" />
            </Label>
            <Select value={formData.company_size} onValueChange={(value) => updateAndSave('company_size', value)}>
              <SelectTrigger 
                className="bg-slate-900 text-white mt-1"
                style={!formData.company_size ? { border: '3px solid #a3e635' } : { border: '1px solid rgb(51 65 85)' }}
              >
                <SelectValue placeholder="Seleziona dimensione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Micro">Micro (&lt;10 dip., &lt;2M€)</SelectItem>
                <SelectItem value="Piccola">Piccola (&lt;50 dip., &lt;10M€)</SelectItem>
                <SelectItem value="Media">Media (&lt;250 dip., &lt;50M€)</SelectItem>
                <SelectItem value="Grande">Grande (oltre 250 dip.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={`text-sm flex items-center ${!formData.legal_form ? 'text-lime-400' : 'text-slate-300'}`}>
              Forma Giuridica <span className="text-lime-400 ml-1">*</span>
              <HelpTooltip text="La forma societaria come risulta dalla visura camerale." />
            </Label>
            <Select value={formData.legal_form} onValueChange={(value) => updateAndSave('legal_form', value)}>
              <SelectTrigger 
                className="bg-slate-900 text-white mt-1"
                style={!formData.legal_form ? { border: '3px solid #a3e635', boxShadow: '0 0 0 1px #a3e635' } : {}}
              >
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
              <Input type="date" value={formData.founding_date} onChange={(e) => updateAndSave('founding_date', e.target.value)} className="bg-slate-900 border-slate-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Anni di Attività</Label>
              <Input type="number" min="0" value={formData.years_activity} onBlur={(e) => updateAndSave('years_activity', e.target.value)} onChange={(e) => setFormData({...formData, years_activity: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" placeholder="Es: 5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Localizzazione */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Localizzazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className={`text-sm flex items-center ${!formData.region ? 'text-lime-400' : 'text-slate-300'}`}>
              Regione Sede Legale <span className="text-lime-400 ml-1">*</span>
            </Label>
            <Select value={formData.region} onValueChange={async (value) => {
              const currentInterested = formData.interested_regions || [];
              const newInterested = currentInterested.includes(value) 
                ? currentInterested 
                : [...currentInterested, value];
              setFormData({...formData, region: value, interested_regions: newInterested});
              try {
                await saveData({ region: value, interested_regions: newInterested });
              } catch (err) {
                console.error('Errore salvataggio regione:', err);
              }
            }}>
              <SelectTrigger 
                className="bg-slate-900 text-white mt-1"
                style={!formData.region ? { border: '3px solid #a3e635' } : { border: '1px solid rgb(51 65 85)' }}
              >
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
            <Input value={formData.province} onBlur={(e) => updateAndSave('province', e.target.value)} onChange={(e) => setFormData({...formData, province: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" placeholder="Es: MI, RM, NA..." maxLength={2} />
          </div>

          {/* Regioni di interesse per bandi */}
          <div className={`pt-4 border-t mt-4 ${!formData.interested_regions?.length ? 'border-lime-400 border-t-[3px]' : 'border-slate-700'}`}>
            <Label className={`text-sm flex items-center mb-3 ${!formData.interested_regions?.length ? 'text-lime-400' : 'text-slate-300'}`}>
              <MapPin className="w-4 h-4 mr-2 text-lime-400" />
              Regioni di interesse per bandi <span className="text-lime-400 ml-1">*</span>
              <HelpTooltip text="Seleziona le regioni per cui vuoi ricevere notifiche sui bandi. La regione della tua sede legale è selezionata automaticamente." />
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
                      onChange={async (e) => {
                        const newRegions = e.target.checked
                          ? [...(formData.interested_regions || []), regione]
                          : (formData.interested_regions || []).filter(r => r !== regione);
                        setFormData({...formData, interested_regions: newRegions});
                        // Salvataggio automatico delle regioni di interesse
                        try {
                          await saveData({ interested_regions: newRegions });
                        } catch (err) {
                          console.error('Errore salvataggio regioni:', err);
                        }
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
            <p className={`text-xs mt-2 ${formData.interested_regions?.length ? 'text-slate-500' : 'text-lime-400'}`}>
              {formData.interested_regions?.length || 0} regioni selezionate {!formData.interested_regions?.length && '(seleziona almeno una regione)'}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-400 text-sm">Zone Speciali</Label>
            {[
              { key: 'is_in_southern_italy', label: 'Mezzogiorno / ZES', desc: 'Zone Economiche Speciali Sud Italia' },
              { key: 'is_in_crisis_area', label: 'Area di Crisi', desc: 'Zone di crisi industriale complessa' },
              { key: 'is_in_inner_area', label: 'Area Interna', desc: 'Aree marginali SNAI' }
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
                <input type="checkbox" checked={formData[key]} onChange={(e) => updateAndSave(key, e.target.checked)} className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400" />
                <div className="flex-1">
                  <span className="text-white">{label}</span>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settore e Codice ATECO */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <FileText className="w-5 h-5" /> Settore di Attività
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className={`text-sm ${!formData.sector ? 'text-lime-400' : 'text-slate-300'}`}>
              Settore Principale <span className="text-lime-400">*</span>
            </Label>
            <Select value={formData.sector} onValueChange={(value) => updateAndSave('sector', value)}>
              <SelectTrigger 
                className="bg-slate-900 text-white mt-1"
                style={!formData.sector ? { border: '3px solid #a3e635' } : { border: '1px solid rgb(51 65 85)' }}
              >
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
            <Label className={`text-sm ${!formData.ateco_code ? 'text-lime-400' : 'text-slate-300'}`}>
              Codice ATECO Principale <span className="text-lime-400">*</span>
            </Label>
            <Input 
              value={formData.ateco_code} 
              onBlur={(e) => updateAndSave('ateco_code', e.target.value)} 
              onChange={(e) => setFormData({...formData, ateco_code: e.target.value})} 
              className="bg-slate-900 text-white mt-1"
              style={!formData.ateco_code ? { border: '3px solid #a3e635' } : { border: '1px solid rgb(51 65 85)' }}
              placeholder="Es: 62.01.00" 
            />
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Codici ATECO Secondari</Label>
            <Input value={formData.secondary_ateco_codes} onBlur={(e) => updateAndSave('secondary_ateco_codes', e.target.value)} onChange={(e) => setFormData({...formData, secondary_ateco_codes: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" placeholder="Es: 47.91.10, 82.99.99" />
          </div>
        </CardContent>
      </Card>

      {/* Dati Economici */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <Euro className="w-5 h-5" /> Dati Economici
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-300 text-sm">Fatturato Annuo (€)</Label>
            <Input type="number" min="0" value={formData.annual_revenue} onBlur={(e) => updateAndSave('annual_revenue', e.target.value)} onChange={(e) => setFormData({...formData, annual_revenue: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" placeholder="Es: 500000" />
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Totale Attivo di Bilancio (€)</Label>
            <Input type="number" min="0" value={formData.total_assets} onBlur={(e) => updateAndSave('total_assets', e.target.value)} onChange={(e) => setFormData({...formData, total_assets: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" placeholder="Es: 1000000" />
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Numero Dipendenti (ULA)</Label>
            <Input type="number" min="0" value={formData.employees_count} onBlur={(e) => updateAndSave('employees_count', e.target.value)} onChange={(e) => setFormData({...formData, employees_count: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" placeholder="Es: 15" />
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Classe di Rating</Label>
            <Select value={formData.rating_class} onValueChange={(value) => updateAndSave('rating_class', value)}>
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
            {[
              { key: 'is_in_difficulty', label: 'Impresa in difficoltà', desc: 'Secondo definizione UE (esclude molti bandi)' },
              { key: 'has_pending_recovery', label: 'Aiuti da recuperare (Deggendorf)', desc: 'Ordine di recupero aiuti di Stato pendente' }
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-800/30 rounded-lg cursor-pointer">
                <input type="checkbox" checked={formData[key]} onChange={(e) => setFormData({...formData, [key]: e.target.checked})} className="w-5 h-5 rounded border-red-600 text-red-400 focus:ring-red-400" />
                <div className="flex-1">
                  <span className="text-white">{label}</span>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Caratteristiche Speciali */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <Users className="w-5 h-5" /> Caratteristiche Speciali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'is_startup', label: 'Start-up', desc: 'Impresa costituita da meno di 5 anni' },
            { key: 'is_innovative_startup', label: 'Start-up Innovativa', desc: 'Iscritta alla sezione speciale Registro Imprese' },
            { key: 'is_innovative_pmi', label: 'PMI Innovativa', desc: 'Iscritta alla sezione speciale PMI innovative' },
            { key: 'is_female_owned', label: 'Impresa Femminile', desc: 'Partecipazione femminile >50%' },
            { key: 'is_youth_owned', label: 'Impresa Giovanile', desc: 'Partecipazione >50% di under 35' },
            { key: 'is_social_enterprise', label: 'Impresa Sociale / Terzo Settore', desc: 'Iscritta al RUNTS' }
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
              <input type="checkbox" checked={formData[key]} onChange={(e) => updateAndSave(key, e.target.checked)} className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400" />
              <div className="flex-1">
                <span className="text-white">{label}</span>
                <p className="text-slate-500 text-xs">{desc}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Certificazioni e Requisiti */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <Briefcase className="w-5 h-5" /> Certificazioni e Requisiti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-400 text-sm mb-2">Requisiti obbligatori:</p>
          {[
            { key: 'has_durc_regolare', label: 'DURC Regolare', desc: 'Documento Unico Regolarità Contributiva', color: 'green' },
            { key: 'has_antimafia_clean', label: 'Certificazione Antimafia', desc: 'Assenza cause interdittive', color: 'green' },
            { key: 'has_fiscal_regularity', label: 'Regolarità Fiscale', desc: 'Nessun debito tributario rilevante', color: 'green' },
            { key: 'has_safety_compliance', label: 'Regolarità Sicurezza Lavoro', desc: 'DVR, formazione - D.Lgs. 81/08', color: 'green' },
            { key: 'can_comply_dnsh', label: 'Rispetto principio DNSH', desc: 'No settori esclusi PNRR', color: 'orange' }
          ].map(({ key, label, desc, color }) => (
            <label key={key} className={`flex items-center gap-3 p-3 bg-${color}-900/20 border border-${color}-800/30 rounded-lg cursor-pointer`}>
              <input type="checkbox" checked={formData[key]} onChange={(e) => setFormData({...formData, [key]: e.target.checked})} className={`w-5 h-5 rounded border-${color}-600 text-${color}-400 focus:ring-${color}-400`} />
              <div className="flex-1">
                <span className="text-white">{label}</span>
                <p className="text-slate-500 text-xs">{desc}</p>
              </div>
            </label>
          ))}

          <p className="text-slate-400 text-sm mt-4 mb-2">Certificazioni opzionali (punteggi extra):</p>
          {[
            { key: 'has_iso_certification', label: 'Certificazione ISO', desc: 'ISO 9001, 14001, 45001 o altre' },
            { key: 'has_environmental_certification', label: 'Certificazione Ambientale', desc: 'EMAS, Ecolabel, EPD' }
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
              <input type="checkbox" checked={formData[key]} onChange={(e) => updateAndSave(key, e.target.checked)} className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400" />
              <div className="flex-1">
                <span className="text-white">{label}</span>
                <p className="text-slate-500 text-xs">{desc}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Aree di Interesse */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <Scale className="w-5 h-5" /> Aree di Interesse per Investimenti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'interested_in_digital', label: 'Digitalizzazione e Industria 4.0' },
            { key: 'interested_in_innovation', label: 'Innovazione Tecnologica' },
            { key: 'interested_in_rd', label: 'Ricerca e Sviluppo' },
            { key: 'interested_in_sustainability', label: 'Sostenibilità Ambientale' },
            { key: 'interested_in_energy', label: 'Efficienza Energetica' },
            { key: 'has_export', label: 'Export e Internazionalizzazione' },
            { key: 'interested_in_training', label: 'Formazione del Personale' },
            { key: 'interested_in_hiring', label: 'Assunzioni e Occupazione' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
              <input type="checkbox" checked={formData[key]} onChange={(e) => updateAndSave(key, e.target.checked)} className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400" />
              <span className="text-white">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Esperienza con Bandi */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <Globe className="w-5 h-5" /> Esperienza e Capacità Finanziaria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
            <input type="checkbox" checked={formData.has_previous_grants} onChange={(e) => setFormData({...formData, has_previous_grants: e.target.checked})} className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400" />
            <div className="flex-1">
              <span className="text-white">Ho già ottenuto finanziamenti agevolati</span>
              <p className="text-slate-500 text-xs">Bandi UE, nazionali o regionali</p>
            </div>
          </label>

          {formData.has_previous_grants && (
            <div>
              <Label className="text-slate-300 text-sm">Importo totale ricevuto (€)</Label>
              <Input type="number" min="0" value={formData.previous_grants_amount} onBlur={(e) => updateAndSave('previous_grants_amount', e.target.value)} onChange={(e) => setFormData({...formData, previous_grants_amount: e.target.value})} className="bg-slate-900 border-slate-700 text-white mt-1" placeholder="Es: 50000" />
            </div>
          )}

          <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/70">
            <input type="checkbox" checked={formData.can_cofinance} onChange={(e) => setFormData({...formData, can_cofinance: e.target.checked})} className="w-5 h-5 rounded border-slate-600 text-lime-400 focus:ring-lime-400" />
            <div className="flex-1">
              <span className="text-white">Capacità di cofinanziamento</span>
              <p className="text-slate-500 text-xs">Disponibilità mezzi propri o accesso al credito</p>
            </div>
          </label>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={saveMutation.isPending}
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
  );
}