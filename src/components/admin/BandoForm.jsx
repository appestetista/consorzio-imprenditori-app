import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

const REGIONI_ITALIANE = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna", 
  "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche", 
  "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana", 
  "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

const FORME_GIURIDICHE = [
  "SRL", "SPA", "SAPA", "SNC", "SAS", "Ditta Individuale", "Cooperativa", "Consorzio"
];

export default function BandoForm({ bando, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState(bando || {
    title: '',
    description: '',
    ente_erogatore: '',
    livello: '',
    grant_type: '',
    macro_settore: '',
    funding_type: '',
    coverage_percentage: '',
    min_amount: '',
    max_amount: '',
    requires_cofinancing: false,
    min_years_activity: '',
    status: 'In apertura',
    opening_date: '',
    deadline: '',
    access_mode: '',
    easy_access: false,
    eligible_company_sizes: [],
    eligible_regions: [],
    eligible_ateco_codes: [],
    eligible_legal_forms: [],
    website_url: '',
    prezzo_istruttoria: '',
    percentuale_erogazione: ''
  });

  const [errors, setErrors] = useState([]);
  const [atecoInput, setAtecoInput] = useState('');

  const validate = () => {
    const newErrors = [];
    
    if (!formData.title) newErrors.push("Titolo obbligatorio");
    if (!formData.ente_erogatore) newErrors.push("Ente erogatore obbligatorio");
    if (!formData.livello) newErrors.push("Livello obbligatorio");
    if (!formData.grant_type) newErrors.push("Tipologia investimento obbligatoria");
    if (!formData.funding_type) newErrors.push("Forma agevolazione obbligatoria");
    if (!formData.access_mode) newErrors.push("Modalità accesso obbligatoria");
    if (!formData.prezzo_istruttoria || Number(formData.prezzo_istruttoria) < 0) newErrors.push("Costo istruttoria obbligatorio");
    if (!formData.percentuale_erogazione || Number(formData.percentuale_erogazione) < 0 || Number(formData.percentuale_erogazione) > 100) newErrors.push("Percentuale consulente (0-100) obbligatoria");
    
    if (formData.opening_date && formData.deadline) {
      if (new Date(formData.deadline) < new Date(formData.opening_date)) {
        newErrors.push("Data scadenza deve essere successiva alla data apertura");
      }
    }
    
    if (formData.min_amount && formData.max_amount) {
      if (Number(formData.max_amount) < Number(formData.min_amount)) {
        newErrors.push("Importo massimo deve essere maggiore del minimo");
      }
    }

    if (formData.eligible_company_sizes.length === 0 && 
        formData.eligible_regions.length === 0 && 
        formData.eligible_ateco_codes.length === 0 &&
        formData.eligible_legal_forms.length === 0) {
      newErrors.push("Attenzione: nessun requisito aziendale specificato - il bando sarà visibile a tutti");
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const addAtecoCode = () => {
    if (atecoInput && !formData.eligible_ateco_codes.includes(atecoInput)) {
      setFormData(prev => ({
        ...prev,
        eligible_ateco_codes: [...prev.eligible_ateco_codes, atecoInput]
      }));
      setAtecoInput('');
    }
  };

  const removeAtecoCode = (code) => {
    setFormData(prev => ({
      ...prev,
      eligible_ateco_codes: prev.eligible_ateco_codes.filter(c => c !== code)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <Alert className="bg-red-500/20 border-red-500/30">
          <AlertDescription className="text-red-400 text-sm space-y-1">
            {errors.map((error, idx) => (
              <div key={idx}>• {error}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="base" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800">
          <TabsTrigger value="base">Identificazione</TabsTrigger>
          <TabsTrigger value="requisiti">Requisiti</TabsTrigger>
          <TabsTrigger value="agevolazione">Agevolazione</TabsTrigger>
          <TabsTrigger value="operativo">Operativo</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-300">Titolo Bando *</Label>
            <Input
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white mt-1"
              placeholder="Es: Transizione 5.0 - Investimenti in digitalizzazione"
            />
          </div>

          <div>
            <Label className="text-slate-300">Descrizione</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white mt-1 h-24"
              placeholder="Descrizione dettagliata del bando..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Ente Erogatore *</Label>
              <Select value={formData.ente_erogatore} onValueChange={(v) => updateField('ente_erogatore', v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UE">UE</SelectItem>
                  <SelectItem value="Stato">Stato</SelectItem>
                  <SelectItem value="Regione">Regione</SelectItem>
                  <SelectItem value="Altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Livello *</Label>
              <Select value={formData.livello} onValueChange={(v) => updateField('livello', v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europeo">Europeo</SelectItem>
                  <SelectItem value="Nazionale">Nazionale</SelectItem>
                  <SelectItem value="Regionale">Regionale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Macro-settore</Label>
            <Input
              value={formData.macro_settore}
              onChange={(e) => updateField('macro_settore', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white mt-1"
              placeholder="Es: Manifatturiero, Servizi, Commercio..."
            />
          </div>

          <div>
            <Label className="text-slate-300">Link Bando Ufficiale</Label>
            <Input
              value={formData.website_url}
              onChange={(e) => updateField('website_url', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white mt-1"
              placeholder="https://..."
            />
          </div>
        </TabsContent>

        <TabsContent value="requisiti" className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-300 flex items-center gap-2">
              Dimensioni Aziendali Ammesse
              <Info className="w-4 h-4 text-slate-500" />
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["Micro", "Piccola", "Media", "Grande"].map(size => (
                <Badge
                  key={size}
                  className={`cursor-pointer ${
                    formData.eligible_company_sizes.includes(size)
                      ? 'bg-lime-400 text-slate-900'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                  onClick={() => toggleArrayValue('eligible_company_sizes', size)}
                >
                  {size}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Lascia vuoto per tutte le dimensioni</p>
          </div>

          <div>
            <Label className="text-slate-300">Forme Giuridiche Ammesse</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {FORME_GIURIDICHE.map(forma => (
                <Badge
                  key={forma}
                  className={`cursor-pointer ${
                    formData.eligible_legal_forms.includes(forma)
                      ? 'bg-lime-400 text-slate-900'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                  onClick={() => toggleArrayValue('eligible_legal_forms', forma)}
                >
                  {forma}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Lascia vuoto per tutte le forme</p>
          </div>

          <div>
            <Label className="text-slate-300">Regioni Ammesse</Label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto p-2 bg-slate-900 rounded">
              {REGIONI_ITALIANE.map(regione => (
                <Badge
                  key={regione}
                  className={`cursor-pointer ${
                    formData.eligible_regions.includes(regione)
                      ? 'bg-lime-400 text-slate-900'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                  onClick={() => toggleArrayValue('eligible_regions', regione)}
                >
                  {regione}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Lascia vuoto per tutte le regioni</p>
          </div>

          <div>
            <Label className="text-slate-300">Codici ATECO Ammessi</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={atecoInput}
                onChange={(e) => setAtecoInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAtecoCode())}
                className="bg-slate-900 border-slate-700 text-white"
                placeholder="Es: 25, 26.1, 62.02"
              />
              <Button type="button" onClick={addAtecoCode} variant="outline" className="border-lime-400 text-lime-400">
                Aggiungi
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.eligible_ateco_codes.map(code => (
                <Badge key={code} className="bg-slate-700 text-white">
                  {code}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => removeAtecoCode(code)}
                  />
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Lascia vuoto per tutti i settori</p>
          </div>

          <div>
            <Label className="text-slate-300">Anni Minimi di Attività</Label>
            <Input
              type="number"
              value={formData.min_years_activity}
              onChange={(e) => updateField('min_years_activity', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white mt-1"
              placeholder="Es: 2"
            />
          </div>
        </TabsContent>

        <TabsContent value="agevolazione" className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-300">Tipologia Investimento *</Label>
            <Select value={formData.grant_type} onValueChange={(v) => updateField('grant_type', v)}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Digitalizzazione">Digitalizzazione</SelectItem>
                <SelectItem value="Innovazione">Innovazione</SelectItem>
                <SelectItem value="Ricerca e Sviluppo">Ricerca e Sviluppo</SelectItem>
                <SelectItem value="Energia/Sostenibilità">Energia/Sostenibilità</SelectItem>
                <SelectItem value="Internazionalizzazione">Internazionalizzazione</SelectItem>
                <SelectItem value="Altro">Altro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Forma Agevolazione *</Label>
            <Select value={formData.funding_type} onValueChange={(v) => updateField('funding_type', v)}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Contributo a fondo perduto">Contributo a fondo perduto</SelectItem>
                <SelectItem value="Finanziamento agevolato">Finanziamento agevolato</SelectItem>
                <SelectItem value="Credito d'imposta">Credito d'imposta</SelectItem>
                <SelectItem value="Misto">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Intensità di Aiuto (%)</Label>
            <Input
              type="number"
              value={formData.coverage_percentage}
              onChange={(e) => updateField('coverage_percentage', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white mt-1"
              placeholder="Es: 45"
              min="0"
              max="100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Importo Minimo (€)</Label>
              <Input
                type="number"
                value={formData.min_amount}
                onChange={(e) => updateField('min_amount', e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="50000"
              />
            </div>
            <div>
              <Label className="text-slate-300">Importo Massimo (€)</Label>
              <Input
                type="number"
                value={formData.max_amount}
                onChange={(e) => updateField('max_amount', e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="2500000"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
            <Label className="text-slate-300 cursor-pointer" htmlFor="cofinancing">
              Cofinanziamento Richiesto
            </Label>
            <Switch
              id="cofinancing"
              checked={formData.requires_cofinancing}
              onCheckedChange={(checked) => updateField('requires_cofinancing', checked)}
            />
          </div>
        </TabsContent>

        <TabsContent value="operativo" className="space-y-4 mt-4">
          <div>
            <Label className="text-slate-300">Stato Bando</Label>
            <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In apertura">In apertura</SelectItem>
                <SelectItem value="Aperto">Aperto</SelectItem>
                <SelectItem value="Chiuso">Chiuso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Data Apertura</Label>
              <Input
                type="date"
                value={formData.opening_date}
                onChange={(e) => updateField('opening_date', e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Data Scadenza</Label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => updateField('deadline', e.target.value)}
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Modalità di Accesso *</Label>
            <Select value={formData.access_mode} onValueChange={(v) => updateField('access_mode', v)}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sportello">Sportello</SelectItem>
                <SelectItem value="Graduatoria">Graduatoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 bg-lime-400/10 rounded-lg border border-lime-400/30">
            <div>
              <Label className="text-lime-400 font-bold cursor-pointer" htmlFor="easy-access">
                Bando Attivabile Subito
              </Label>
              <p className="text-xs text-slate-400 mt-1">
                Iter semplificato, documentazione standard, no partenariato
              </p>
            </div>
            <Switch
              id="easy-access"
              checked={formData.easy_access}
              onCheckedChange={(checked) => updateField('easy_access', checked)}
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-blue-400 font-semibold">Condizioni Economiche del Bando *</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-sm">Costo Istruttoria (€) *</Label>
                <Input
                  type="number"
                  value={formData.prezzo_istruttoria}
                  onChange={(e) => updateField('prezzo_istruttoria', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="3000"
                  min="0"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Costo per analisi e gestione pratica
                </p>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Percentuale a Successo (%) *</Label>
                <Input
                  type="number"
                  value={formData.percentuale_erogazione}
                  onChange={(e) => updateField('percentuale_erogazione', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="5"
                  min="0"
                  max="100"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Percentuale su importo erogato (success fee)
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4 border-t border-slate-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-slate-600 text-slate-300"
        >
          Annulla
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
        >
          {isSubmitting ? 'Salvataggio...' : bando ? 'Aggiorna Bando' : 'Crea Bando'}
        </Button>
      </div>
    </form>
  );
}