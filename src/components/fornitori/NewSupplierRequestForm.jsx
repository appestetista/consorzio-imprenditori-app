import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { X, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COMPANY_CONTEXTS = [
  { value: 'ditta_individuale', label: 'Ditta individuale' },
  { value: 'libero_professionista', label: 'Libero professionista' },
  { value: 'snc', label: 'SNC' },
  { value: 'sas', label: 'SAS' },
  { value: 'srl', label: 'SRL' },
  { value: 'srls', label: 'SRLS' },
  { value: 'spa', label: 'SPA' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'associazione', label: 'Associazione' },
  { value: 'altro', label: 'Altro' }
];

const REVENUE_RANGES = [
  { value: '0-100k', label: '0 - 100.000 €' },
  { value: '100k-500k', label: '100.000 - 500.000 €' },
  { value: '500k-1M', label: '500.000 - 1 milione €' },
  { value: '1M-5M', label: '1 - 5 milioni €' },
  { value: '5M-10M', label: '5 - 10 milioni €' },
  { value: 'oltre_10M', label: 'Oltre 10 milioni €' }
];



const URGENCY_OPTIONS = [
  { value: 'immediata', label: 'Immediata' },
  { value: 'entro_1_mese', label: 'Entro 1 mese' },
  { value: 'entro_3_mesi', label: 'Entro 3 mesi' },
  { value: 'nessuna_fretta', label: 'Nessuna fretta' }
];



export default function NewSupplierRequestForm({ user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    service_type: '',
    company_context: '',
    revenue_range: '',
    problem_to_solve: '',
    budget_amount: '',
    urgency: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierRequest.create({
      ...data,
      author_email: user.email,
      status: 'aperta',
      candidates_count: 0
    }),
    onSuccess: () => {
      onSuccess();
    }
  });

  const handleSubmit = () => {
    if (!formData.service_type || !formData.company_context || 
        !formData.problem_to_solve || !formData.budget_amount || !formData.urgency) {
      return;
    }
    createMutation.mutate(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lime-400 font-semibold">Nuova richiesta fornitore</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Avviso anonimato */}
      <div className="bg-slate-900 rounded-lg p-3 mb-4 flex items-start gap-2">
        <Shield className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
        <p className="text-slate-400 text-xs">
          La tua richiesta sarà <span className="text-lime-400 font-medium">completamente anonima</span>. 
          Nessun fornitore vedrà il tuo nome, azienda o contatti finché non deciderai tu di sbloccarlo.
        </p>
      </div>

      <div className="space-y-4">
        {/* Tipo di servizio */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Tipo di servizio richiesto *</label>
          <Input
            placeholder="Es: Sviluppo sito web, Consulenza fiscale..."
            value={formData.service_type}
            onChange={(e) => updateField('service_type', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>

        {/* Contesto aziendale */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Contesto aziendale *</label>
          <Select value={formData.company_context} onValueChange={(v) => updateField('company_context', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona contesto" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {COMPANY_CONTEXTS.map(ctx => (
                <SelectItem key={ctx.value} value={ctx.value} className="text-white hover:bg-slate-600">{ctx.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Range fatturato */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Range fatturato</label>
          <Select value={formData.revenue_range} onValueChange={(v) => updateField('revenue_range', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona range" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {REVENUE_RANGES.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-white hover:bg-slate-600">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Problema da risolvere */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Problema da risolvere *</label>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mb-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-amber-200 text-xs">
                Descrivi il <strong>problema</strong>, non il servizio che pensi ti serva. 
                Es: "Perdo clienti perché non riesco a rispondere velocemente" invece di "Mi serve un CRM"
              </p>
            </div>
          </div>
          <Textarea
            placeholder="Qual è il problema che stai cercando di risolvere?"
            value={formData.problem_to_solve}
            onChange={(e) => updateField('problem_to_solve', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white min-h-24"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Budget indicativo (€) *</label>
          <Input
            placeholder="Es: 5000"
            value={formData.budget_amount}
            onChange={(e) => updateField('budget_amount', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
            type="number"
          />
        </div>

        {/* Urgenza */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Urgenza *</label>
          <Select value={formData.urgency} onValueChange={(v) => updateField('urgency', v)}>
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

        <Button 
          onClick={handleSubmit}
          disabled={createMutation.isPending || !formData.service_type || 
                   !formData.company_context || !formData.problem_to_solve || !formData.budget_amount || 
                   !formData.urgency}
          className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
        >
          {createMutation.isPending ? 'Pubblicazione...' : 'Pubblica richiesta anonima'}
        </Button>
      </div>
    </div>
  );
}