import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, MapPin, Upload, Loader2, Sparkles, Tag, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import CategorySelector from './CategorySelector';

const URGENCY_OPTIONS = [
  { value: 'immediata', label: 'Immediata' },
  { value: 'entro_1_mese', label: 'Entro 1 mese' },
  { value: 'entro_3_mesi', label: 'Entro 3 mesi' },
  { value: 'nessuna_fretta', label: 'Nessuna fretta' }
];

const BUDGET_RANGES = [
  { value: '0-500', label: '0 - 500 €' },
  { value: '500-1000', label: '500 - 1.000 €' },
  { value: '1000-2500', label: '1.000 - 2.500 €' },
  { value: '2500-5000', label: '2.500 - 5.000 €' },
  { value: '5000-10000', label: '5.000 - 10.000 €' },
  { value: '10000-25000', label: '10.000 - 25.000 €' },
  { value: '25000-50000', label: '25.000 - 50.000 €' },
  { value: '50000-100000', label: '50.000 - 100.000 €' },
  { value: 'oltre_100000', label: 'Oltre 100.000 €' }
];

const PAYMENT_FREQUENCY = [
  { value: 'una_tantum', label: 'Una tantum' },
  { value: 'totale_budget', label: 'Totale budget' },
  { value: 'giornaliero', label: 'Giornaliero' },
  { value: 'mensile', label: 'Mensile' },
  { value: 'trimestrale', label: 'Trimestrale' },
  { value: 'annuale', label: 'Annuale' }
];

const RADIUS_OPTIONS = [10, 25, 50, 100, 200];

export default function SupplierRequestWizard({ user, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1=categoria, 2=dettagli, 3=conferma
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    problem_to_solve: '',
    company_context: '',
    locality: '',
    radius_km: 50,
    budget_range: '',
    payment_frequency: 'una_tantum',
    urgency: '',
    service_type: ''
  });
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierRequest.create(data),
    onSuccess: () => setShowSuccess(true)
  });

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setFormData(prev => ({ ...prev, service_type: cat.category }));
    setStep(2);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ url: file_url, name: file.name });
    }
    setAttachments(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!formData.problem_to_solve || !formData.urgency) return;
    createMutation.mutate({
      author_email: user.email,
      category: selectedCategory.category,
      subcategory: selectedCategory.subcategory,
      macro_sector: selectedCategory.macro_sector,
      service_type: formData.service_type,
      company_context: formData.company_context || undefined,
      problem_to_solve: formData.problem_to_solve,
      locality: formData.locality || undefined,
      radius_km: formData.radius_km,
      budget_range: formData.budget_range || undefined,
      payment_frequency: formData.payment_frequency,
      urgency: formData.urgency,
      search_keywords: keywords.length > 0 ? keywords : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'aperta',
      candidates_count: 0,
      max_suppliers_to_contact: 5
    });
  };

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // Success screen
  if (showSuccess) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-lime-400" />
        </div>
        <h3 className="text-white text-lg font-semibold">Richiesta inviata!</h3>
        <p className="text-slate-400 text-sm">
          La tua richiesta per <span className="text-lime-400 font-medium">{selectedCategory?.category}</span> è stata pubblicata in anonimato.
        </p>
        <div className="bg-slate-800 rounded-lg p-3 text-left">
          <p className="text-slate-400 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lime-400" />
            Riceverai notifica quando arriveranno candidature o preventivi.
          </p>
        </div>
        <Button onClick={onSuccess} className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500">
          Torna alle richieste
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="text-lime-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lime-400 font-semibold">
            {step === 1 && 'Scegli categoria'}
            {step === 2 && 'Dettagli richiesta'}
          </h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">Annulla</button>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-4">
        {[1, 2].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-lime-400' : 'bg-slate-700'}`} />
        ))}
      </div>

      {/* Step 1: Category selection */}
      {step === 1 && <CategorySelector onSelect={handleCategorySelect} />}

      {/* Step 2: Details form */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Selected category badge */}
          <div className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs">Categoria selezionata</p>
              <p className="text-white text-sm font-medium">{selectedCategory?.category}</p>
              <p className="text-slate-500 text-xs">{selectedCategory?.macro_sector}</p>
            </div>
            <button onClick={() => setStep(1)} className="text-lime-400 text-xs hover:underline">Cambia</button>
          </div>

          {/* Anonimato banner */}
          <div className="bg-slate-900 rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
            <p className="text-slate-400 text-xs">
              Richiesta <span className="text-lime-400 font-medium">completamente anonima</span>.
              I fornitori non vedranno la tua identità.
            </p>
          </div>

          {/* Problema */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Problema da risolvere *</label>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mb-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-amber-200 text-xs">
                  Descrivi il <strong>problema</strong>, non la soluzione. 
                  Es: "Perdo clienti perché non rispondo in tempo" → NON "Mi serve un CRM"
                </p>
              </div>
            </div>
            <Textarea
              placeholder="Qual è il problema che stai cercando di risolvere?"
              value={formData.problem_to_solve}
              onChange={e => updateField('problem_to_solve', e.target.value)}
              className="bg-slate-700 border-slate-600 text-white min-h-24"
            />
          </div>

          {/* Parole chiave */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Parole chiave (facoltativo)
            </label>
            <p className="text-slate-500 text-xs mb-2">
              Aggiungi termini specifici che conosci per migliorare la ricerca AI. 
              Es: "stampa offset", "packaging alimentare", "saldatura TIG". 
              Più sono precise, migliori saranno i risultati.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Scrivi una parola chiave e premi +"
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && keywordInput.trim()) {
                    e.preventDefault();
                    if (!keywords.includes(keywordInput.trim())) {
                      setKeywords(prev => [...prev, keywordInput.trim()]);
                    }
                    setKeywordInput('');
                  }
                }}
                className="bg-slate-700 border-slate-600 text-white flex-1"
              />
              <Button
                type="button"
                size="icon"
                disabled={!keywordInput.trim()}
                onClick={() => {
                  if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
                    setKeywords(prev => [...prev, keywordInput.trim()]);
                  }
                  setKeywordInput('');
                }}
                className="bg-lime-400 text-slate-900 hover:bg-lime-500 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((kw, i) => (
                  <Badge key={i} className="bg-lime-400/15 text-lime-300 border border-lime-400/30 text-xs pr-1">
                    {kw}
                    <button
                      onClick={() => setKeywords(prev => prev.filter((_, j) => j !== i))}
                      className="ml-1.5 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Località e raggio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">
                <MapPin className="w-3 h-3 inline mr-1" />Località
              </label>
              <Input
                placeholder="Es: Milano"
                value={formData.locality}
                onChange={e => updateField('locality', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Raggio (km)</label>
              <Select value={String(formData.radius_km)} onValueChange={v => updateField('radius_km', Number(v))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {RADIUS_OPTIONS.map(r => (
                    <SelectItem key={r} value={String(r)} className="text-white hover:bg-slate-600">{r} km</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contesto aziendale */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Contesto aziendale</label>
            <Select value={formData.company_context} onValueChange={v => updateField('company_context', v)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Seleziona (facoltativo)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {COMPANY_CONTEXTS.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-white hover:bg-slate-600">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Budget</label>
              <Select value={formData.budget_range} onValueChange={v => updateField('budget_range', v)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Facoltativo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {BUDGET_RANGES.map(b => (
                    <SelectItem key={b.value} value={b.value} className="text-white hover:bg-slate-600">{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Frequenza</label>
              <Select value={formData.payment_frequency} onValueChange={v => updateField('payment_frequency', v)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {PAYMENT_FREQUENCY.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-white hover:bg-slate-600">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Urgenza */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Urgenza *</label>
            <Select value={formData.urgency} onValueChange={v => updateField('urgency', v)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Seleziona urgenza" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {URGENCY_OPTIONS.map(u => (
                  <SelectItem key={u.value} value={u.value} className="text-white hover:bg-slate-600">{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Allegati */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Allegati / preventivo esistente</label>
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 text-center">
              <input
                type="file"
                id="file-upload"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-lime-400 mx-auto" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs">Carica file (PDF, immagini, documenti)</p>
                  </>
                )}
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-slate-300 border-slate-600 text-xs">
                    {a.name}
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                      className="ml-1 text-slate-500 hover:text-red-400"
                    >×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !formData.problem_to_solve || !formData.urgency}
            className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500 font-semibold"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Invio in corso...</>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" /> Pubblica richiesta anonima
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}