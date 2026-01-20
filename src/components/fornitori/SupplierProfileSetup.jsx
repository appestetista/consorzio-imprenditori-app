import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Shield, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const SERVICE_CATEGORIES = [
  'IT e Digital',
  'Marketing e Comunicazione',
  'Consulenza Fiscale/Legale',
  'Logistica e Trasporti',
  'Produzione e Manifattura',
  'Risorse Umane',
  'Formazione',
  'Facility Management',
  'Energia e Utilities',
  'Altro'
];

const BUSINESS_PHASES = [
  { value: 'partenza', label: 'Partenza' },
  { value: 'stabilizzazione', label: 'Stabilizzazione' },
  { value: 'crescita', label: 'Crescita' },
  { value: 'riduzione_costi', label: 'Riduzione costi' }
];

export default function SupplierProfileSetup({ user, existingProfile }) {
  const [formData, setFormData] = useState({
    company_name: existingProfile?.company_name || user?.company_name || '',
    service_categories: existingProfile?.service_categories || [],
    years_experience: existingProfile?.years_experience || '',
    work_method: existingProfile?.work_method || '',
    average_times: existingProfile?.average_times || '',
    what_they_dont_do: existingProfile?.what_they_dont_do || '',
    best_fit_phases: existingProfile?.best_fit_phases || []
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingProfile) {
        return base44.entities.SupplierProfile.update(existingProfile.id, data);
      } else {
        return base44.entities.SupplierProfile.create({
          ...data,
          user_email: user.email,
          is_verified: false,
          badges: [],
          aggregated_stats: {
            total_reviews: 0,
            would_redo_percentage: 0,
            avg_real_cost: '',
            common_problems: [],
            reliability_score: 0
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-profile'] });
    }
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (cat) => {
    setFormData(prev => ({
      ...prev,
      service_categories: prev.service_categories.includes(cat)
        ? prev.service_categories.filter(c => c !== cat)
        : [...prev.service_categories, cat]
    }));
  };

  const togglePhase = (phase) => {
    setFormData(prev => ({
      ...prev,
      best_fit_phases: prev.best_fit_phases.includes(phase)
        ? prev.best_fit_phases.filter(p => p !== phase)
        : [...prev.best_fit_phases, phase]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header profilo */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-lime-400/20 rounded-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-lime-400" />
          </div>
          <div>
            <h3 className="text-white font-medium">{formData.company_name || 'Il tuo profilo fornitore'}</h3>
            <div className="flex items-center gap-2">
              {existingProfile?.is_verified ? (
                <Badge className="bg-green-500/20 text-green-400">
                  <Shield className="w-3 h-3 mr-1" /> Verificato
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400">In attesa di verifica</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Statistiche aggregate */}
        {existingProfile?.aggregated_stats?.total_reviews > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700">
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <p className="text-lime-400 text-2xl font-bold">{existingProfile.aggregated_stats.would_redo_percentage}%</p>
              <p className="text-slate-500 text-xs">Lo rifarebbero</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-3 text-center">
              <p className="text-white text-2xl font-bold">{existingProfile.aggregated_stats.total_reviews}</p>
              <p className="text-slate-500 text-xs">Recensioni</p>
            </div>
          </div>
        )}

        {/* Badge */}
        {existingProfile?.badges?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {existingProfile.badges.map(badge => (
              <Badge key={badge} className={
                badge === 'affidabile' ? 'bg-green-500/20 text-green-400' :
                badge === 'complesso' ? 'bg-amber-500/20 text-amber-400' :
                badge === 'dispendioso' ? 'bg-orange-500/20 text-orange-400' :
                'bg-red-500/20 text-red-400'
              }>
                {badge}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Form profilo */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        <h4 className="text-white font-medium">Informazioni profilo</h4>

        {/* Nome azienda */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Nome azienda *</label>
          <Input
            value={formData.company_name}
            onChange={(e) => updateField('company_name', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
          />
        </div>

        {/* Categorie servizi */}
        <div>
          <label className="text-slate-400 text-sm mb-2 block">Categorie di servizi offerti *</label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  formData.service_categories.includes(cat)
                    ? 'bg-lime-400 text-slate-900'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {formData.service_categories.includes(cat) && <Check className="w-3 h-3 inline mr-1" />}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Anni esperienza */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Anni di esperienza</label>
          <Input
            type="number"
            value={formData.years_experience}
            onChange={(e) => updateField('years_experience', parseInt(e.target.value) || '')}
            className="bg-slate-700 border-slate-600 text-white"
            placeholder="Es: 10"
          />
        </div>

        {/* Metodo di lavoro */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Metodo di lavoro standard</label>
          <Textarea
            value={formData.work_method}
            onChange={(e) => updateField('work_method', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white min-h-20"
            placeholder="Descrivi come lavori tipicamente con i clienti..."
          />
        </div>

        {/* Tempi medi */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Tempi medi di consegna</label>
          <Input
            value={formData.average_times}
            onChange={(e) => updateField('average_times', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
            placeholder="Es: 2-4 settimane"
          />
        </div>

        {/* Cosa NON fanno */}
        <div>
          <label className="text-slate-400 text-sm mb-1.5 block">Cosa NON fai</label>
          <Textarea
            value={formData.what_they_dont_do}
            onChange={(e) => updateField('what_they_dont_do', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white min-h-16"
            placeholder="Es: Non gestiamo contenuti, non offriamo manutenzione..."
          />
        </div>

        {/* Fasi aziendali */}
        <div>
          <label className="text-slate-400 text-sm mb-2 block">Per quali fasi aziendali sei più adatto</label>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_PHASES.map(phase => (
              <button
                key={phase.value}
                type="button"
                onClick={() => togglePhase(phase.value)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  formData.best_fit_phases.includes(phase.value)
                    ? 'bg-lime-400 text-slate-900'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {formData.best_fit_phases.includes(phase.value) && <Check className="w-3 h-3 inline mr-1" />}
                {phase.label}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={() => saveMutation.mutate(formData)}
          disabled={saveMutation.isPending || !formData.company_name || formData.service_categories.length === 0}
          className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
        >
          {saveMutation.isPending ? 'Salvataggio...' : existingProfile ? 'Aggiorna profilo' : 'Crea profilo fornitore'}
        </Button>
      </div>
    </div>
  );
}