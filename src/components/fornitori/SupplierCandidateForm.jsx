import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { X, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BUSINESS_PHASES = [
  { value: 'partenza', label: 'Partenza' },
  { value: 'stabilizzazione', label: 'Stabilizzazione' },
  { value: 'crescita', label: 'Crescita' },
  { value: 'riduzione_costi', label: 'Riduzione costi' }
];

export default function SupplierCandidateForm({ request, user, supplierProfile, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    real_experience: supplierProfile?.years_experience ? `${supplierProfile.years_experience} anni di esperienza` : '',
    work_method: supplierProfile?.work_method || '',
    estimated_time: '',
    estimated_price: '',
    what_they_wont_do: supplierProfile?.what_they_dont_do || '',
    best_fit_phase: request?.business_phase || ''
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.SupplierCandidate.create({
        ...data,
        request_id: request.id,
        supplier_email: user.email,
        supplier_profile_id: supplierProfile?.id,
        status: 'in_attesa',
        contact_unlocked: false
      });
      
      // Aggiorna conteggio candidature
      await base44.entities.SupplierRequest.update(request.id, {
        candidates_count: (request.candidates_count || 0) + 1
      });
    },
    onSuccess: () => {
      onSuccess();
    }
  });

  const handleSubmit = () => {
    if (!formData.real_experience || !formData.work_method || !formData.estimated_time || !formData.estimated_price) {
      return;
    }
    createMutation.mutate(formData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lime-400 font-semibold">Candidati alla richiesta</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Riepilogo richiesta */}
      <div className="bg-slate-900 rounded-lg p-3 mb-4">
        <p className="text-white font-medium text-sm">{request?.service_type}</p>
        <p className="text-slate-400 text-xs mt-1 line-clamp-2">{request?.problem_to_solve}</p>
      </div>

      {/* Avviso */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-amber-200 text-xs">
          <strong>Nessuna autopromozione.</strong> Rispondi in modo concreto e onesto. 
          Non inserire link, numeri di telefono o riferimenti diretti alla tua azienda.
        </p>
      </div>

      <div className="space-y-4">
        {/* Esperienza reale */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Esperienza reale (anni/casi) *</label>
          <Textarea
            placeholder="Es: 8 anni nel settore, 15+ progetti simili completati..."
            value={formData.real_experience}
            onChange={(e) => updateField('real_experience', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white min-h-20"
          />
        </div>

        {/* Metodo di lavoro */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Metodo di lavoro proposto *</label>
          <Textarea
            placeholder="Come affronteresti questo problema? Quali step seguiresti?"
            value={formData.work_method}
            onChange={(e) => updateField('work_method', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white min-h-20"
          />
        </div>

        {/* Tempi stimati */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Tempi stimati *</label>
          <Input
            placeholder="Es: 2-3 settimane, 1 mese..."
            value={formData.estimated_time}
            onChange={(e) => updateField('estimated_time', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>

        {/* Prezzo indicativo */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Prezzo indicativo *</label>
          <Input
            placeholder="Es: 3.000-5.000 €, a partire da 2.000 €..."
            value={formData.estimated_price}
            onChange={(e) => updateField('estimated_price', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>

        {/* Cosa NON fanno */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Cosa NON farai per questo progetto</label>
          <Textarea
            placeholder="Es: Non ci occupiamo di manutenzione post-lancio, non gestiamo contenuti..."
            value={formData.what_they_wont_do}
            onChange={(e) => updateField('what_they_wont_do', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white min-h-16"
          />
        </div>

        {/* Fase aziendale più adatta */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Fase aziendale per cui sei più adatto</label>
          <Select value={formData.best_fit_phase} onValueChange={(v) => updateField('best_fit_phase', v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Seleziona fase" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {BUSINESS_PHASES.map(p => (
                <SelectItem key={p.value} value={p.value} className="text-white hover:bg-slate-600">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={createMutation.isPending || !formData.real_experience || !formData.work_method || 
                   !formData.estimated_time || !formData.estimated_price}
          className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
        >
          {createMutation.isPending ? 'Invio...' : 'Invia candidatura'}
        </Button>
      </div>
    </div>
  );
}