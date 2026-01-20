import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { X, MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COMPANY_CONTEXTS = [
  { value: 'micro', label: 'Micro impresa' },
  { value: 'pmi', label: 'PMI' },
  { value: 'srl_piccola', label: 'SRL piccola' },
  { value: 'srl_media', label: 'SRL media' },
  { value: 'srl_grande', label: 'SRL grande' }
];

const DURATIONS = [
  { value: 'meno_1_mese', label: 'Meno di 1 mese' },
  { value: '1_3_mesi', label: '1-3 mesi' },
  { value: '3_6_mesi', label: '3-6 mesi' },
  { value: '6_12_mesi', label: '6-12 mesi' },
  { value: 'oltre_1_anno', label: 'Oltre 1 anno' }
];

const COHERENCE_OPTIONS = [
  { value: 'coerente', label: 'Coerente - Ha mantenuto le promesse' },
  { value: 'parziale', label: 'Parziale - Alcune cose diverse dal previsto' },
  { value: 'incoerente', label: 'Incoerente - Molto diverso da quanto promesso' }
];

const COST_OPTIONS = [
  { value: 'inferiore_atteso', label: 'Inferiore alle aspettative' },
  { value: 'in_linea', label: 'In linea con le aspettative' },
  { value: 'superiore_atteso', label: 'Superiore alle aspettative' },
  { value: 'molto_superiore', label: 'Molto superiore alle aspettative' }
];

const TIME_OPTIONS = [
  { value: 'minimo', label: 'Minimo - Quasi autonomo' },
  { value: 'moderato', label: 'Moderato - Qualche chiamata/riunione' },
  { value: 'significativo', label: 'Significativo - Molto coinvolgimento' },
  { value: 'eccessivo', label: 'Eccessivo - Ha richiesto troppo tempo' }
];

const PROBLEMS = [
  { value: 'ritardi_consegna', label: 'Ritardi nelle consegne' },
  { value: 'costi_nascosti', label: 'Costi nascosti/imprevisti' },
  { value: 'scarsa_comunicazione', label: 'Scarsa comunicazione' },
  { value: 'qualita_inferiore', label: 'Qualità inferiore alle attese' },
  { value: 'mancato_supporto', label: 'Mancato supporto post-lavoro' },
  { value: 'problemi_tecnici', label: 'Problemi tecnici' },
  { value: 'conflitti_contrattuali', label: 'Conflitti contrattuali' },
  { value: 'nessun_problema', label: 'Nessun problema riscontrato' }
];

const REDO_OPTIONS = [
  { value: 'si', label: 'Sì, lo rifarei' },
  { value: 'no', label: 'No, non lo rifarei' },
  { value: 'solo_in_certi_casi', label: 'Solo in certi casi' }
];

export default function SupplierReviewForm({ request, candidate, user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    company_context: request?.company_context || '',
    collaboration_duration: '',
    promise_reality_coherence: '',
    real_cost_assessment: '',
    time_investment: '',
    problems_generated: [],
    would_redo: '',
    would_redo_conditions: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierReview.create({
      ...data,
      request_id: request.id,
      candidate_id: candidate.id,
      supplier_email: candidate.supplier_email,
      reviewer_email: user.email
    }),
    onSuccess: () => {
      onSuccess();
    }
  });

  const handleSubmit = () => {
    if (!formData.company_context || !formData.collaboration_duration || !formData.promise_reality_coherence ||
        !formData.real_cost_assessment || !formData.time_investment || formData.problems_generated.length === 0 ||
        !formData.would_redo) {
      return;
    }
    createMutation.mutate(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleProblem = (problem) => {
    setFormData(prev => {
      const current = prev.problems_generated;
      
      // Se seleziona "nessun problema", deseleziona tutto il resto
      if (problem === 'nessun_problema') {
        return { ...prev, problems_generated: current.includes(problem) ? [] : ['nessun_problema'] };
      }
      
      // Se seleziona un problema, rimuovi "nessun problema"
      const withoutNone = current.filter(p => p !== 'nessun_problema');
      
      if (withoutNone.includes(problem)) {
        return { ...prev, problems_generated: withoutNone.filter(p => p !== problem) };
      } else {
        return { ...prev, problems_generated: [...withoutNone, problem] };
      }
    });
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-lime-400/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-lime-400" />
          <h2 className="text-lime-400 font-semibold">Recensione strutturata</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-slate-400 text-sm mb-4">
        La tua recensione è anonima e serve a migliorare il sistema di matching. Non sarà pubblicata singolarmente.
      </p>

      <div className="space-y-4">
        {/* Contesto aziendale */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Contesto aziendale al momento della collaborazione *</label>
          <Select value={formData.company_context} onValueChange={(v) => updateField('company_context', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {COMPANY_CONTEXTS.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-white hover:bg-slate-600">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Durata collaborazione */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Durata della collaborazione *</label>
          <Select value={formData.collaboration_duration} onValueChange={(v) => updateField('collaboration_duration', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {DURATIONS.map(d => (
                <SelectItem key={d.value} value={d.value} className="text-white hover:bg-slate-600">{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Coerenza promessa/realtà */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Coerenza tra promesse e realtà *</label>
          <Select value={formData.promise_reality_coherence} onValueChange={(v) => updateField('promise_reality_coherence', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {COHERENCE_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-white hover:bg-slate-600">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Costo reale */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Costo reale rispetto alle aspettative *</label>
          <Select value={formData.real_cost_assessment} onValueChange={(v) => updateField('real_cost_assessment', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {COST_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-white hover:bg-slate-600">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tempo richiesto */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Tempo richiesto a te *</label>
          <Select value={formData.time_investment} onValueChange={(v) => updateField('time_investment', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {TIME_OPTIONS.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-white hover:bg-slate-600">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Problemi riscontrati */}
        <div>
          <label className="text-slate-400 text-sm mb-2 block">Problemi riscontrati *</label>
          <div className="space-y-2">
            {PROBLEMS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => toggleProblem(p.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  formData.problems_generated.includes(p.value)
                    ? 'bg-lime-400/20 border-lime-400 text-lime-400'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  formData.problems_generated.includes(p.value)
                    ? 'border-lime-400 bg-lime-400'
                    : 'border-slate-500'
                }`}>
                  {formData.problems_generated.includes(p.value) && <Check className="w-3 h-3 text-slate-900" />}
                </div>
                <span className="text-sm">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lo rifaresti */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Lo rifaresti oggi? *</label>
          <Select value={formData.would_redo} onValueChange={(v) => updateField('would_redo', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {REDO_OPTIONS.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-white hover:bg-slate-600">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Condizioni per "solo in certi casi" */}
        {formData.would_redo === 'solo_in_certi_casi' && (
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">In quali casi lo rifaresti?</label>
            <Textarea
              placeholder="Descrivi le condizioni..."
              value={formData.would_redo_conditions}
              onChange={(e) => updateField('would_redo_conditions', e.target.value)}
              className="bg-slate-700 border-slate-600 text-white min-h-16"
            />
          </div>
        )}

        <Button 
          onClick={handleSubmit}
          disabled={createMutation.isPending || !formData.company_context || !formData.collaboration_duration ||
                   !formData.promise_reality_coherence || !formData.real_cost_assessment || !formData.time_investment ||
                   formData.problems_generated.length === 0 || !formData.would_redo}
          className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
        >
          {createMutation.isPending ? 'Invio...' : 'Invia recensione'}
        </Button>
      </div>
    </div>
  );
}