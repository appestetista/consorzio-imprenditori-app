import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Save, User, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import BottomNav from '../components/layout/BottomNav';

const REGIONI = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'
];

const SETTORI = ['Manifattura', 'Commercio', 'Servizi', 'Tecnologia', 'Ristorazione', 'Edilizia', 'Trasporti', 'Sanita', 'Professioni', 'Altro'];
const FORME_GIURIDICHE = ['Ditta individuale', 'SRL', 'SRLS', 'SAS', 'SNC', 'SPA', 'Cooperativa', 'Altro'];
const FATTURATI = ['Sotto 100K', '100K-500K', '500K-1M', '1M-5M', '5M-10M', 'Oltre 10M'];
const DIPENDENTI = ['Solo io', '1-5', '6-15', '16-50', '51-200', 'Oltre 200'];
const REGIMI = ['Forfettario', 'Semplificato', 'Ordinario', 'Non so'];
const OBIETTIVI = ['Crescita fatturato', 'Riduzione costi', 'Espansione', 'Digitalizzazione', 'Passaggio generazionale', 'Altro'];

function SelectField({ label, value, onValueChange, options, placeholder }) {
  return (
    <div>
      <Label className="text-slate-400 text-sm mb-1.5 block">{label}</Label>
      <Select value={value || undefined} onValueChange={onValueChange}>
        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder={placeholder || 'Seleziona...'} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ProfiloUtente() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    phone: '', city: '', zona: '', company_name: '',
    settore: '', forma_giuridica: '', fatturato_annuo: '',
    numero_dipendenti: '', regime_fiscale: '', obiettivo_principale: ''
  });

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      setForm({
        phone: u.phone || '',
        city: u.city || '',
        zona: u.zona || '',
        company_name: u.company_name || '',
        settore: u.settore || '',
        forma_giuridica: u.forma_giuridica || '',
        fatturato_annuo: u.fatturato_annuo || '',
        numero_dipendenti: u.numero_dipendenti || '',
        regime_fiscale: u.regime_fiscale || '',
        obiettivo_principale: u.obiettivo_principale || '',
      });
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await base44.auth.updateMe(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0f1a' }}>
        <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#0a0f1a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <Link to={createPageUrl('Home')} className="text-slate-400 hover:text-white transition-colors back-arrow-tap">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-white text-lg font-bold">Il mio profilo</h1>
      </div>

      <div className="px-5 max-w-lg mx-auto space-y-6">

        {/* SEZIONE 1: Informazioni personali */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-white font-semibold">Informazioni personali</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-500 text-sm mb-1.5 block">Nome completo</Label>
              <Input value={user?.full_name || ''} disabled className="bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed" />
            </div>
            <div>
              <Label className="text-slate-500 text-sm mb-1.5 block">Email</Label>
              <Input value={user?.email || ''} disabled className="bg-slate-800/50 border-slate-700 text-slate-400 cursor-not-allowed" />
            </div>
            <div>
              <Label className="text-slate-400 text-sm mb-1.5 block">Telefono</Label>
              <Input
                placeholder="Es: +39 333 1234567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-400 text-sm mb-1.5 block">Città</Label>
              <Input
                placeholder="Es: Milano"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <SelectField label="Zona (Regione)" value={form.zona} onValueChange={(v) => setForm({ ...form, zona: v })} options={REGIONI} placeholder="Seleziona regione" />
            <div>
              <Label className="text-slate-400 text-sm mb-1.5 block">Nome azienda</Label>
              <Input
                placeholder="Es: Rossi SRL"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Separatore */}
        <div className="border-t border-slate-800" />

        {/* SEZIONE 2: Profilo aziendale */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[#d4af37]" />
            <h2 className="text-white font-semibold">Profilo aziendale</h2>
          </div>
          <div className="space-y-4">
            <SelectField label="Settore" value={form.settore} onValueChange={(v) => setForm({ ...form, settore: v })} options={SETTORI} />
            <SelectField label="Forma giuridica" value={form.forma_giuridica} onValueChange={(v) => setForm({ ...form, forma_giuridica: v })} options={FORME_GIURIDICHE} />
            <SelectField label="Fatturato annuo" value={form.fatturato_annuo} onValueChange={(v) => setForm({ ...form, fatturato_annuo: v })} options={FATTURATI} />
            <SelectField label="Numero dipendenti" value={form.numero_dipendenti} onValueChange={(v) => setForm({ ...form, numero_dipendenti: v })} options={DIPENDENTI} />
            <SelectField label="Regime fiscale" value={form.regime_fiscale} onValueChange={(v) => setForm({ ...form, regime_fiscale: v })} options={REGIMI} />
            <SelectField label="Obiettivo principale" value={form.obiettivo_principale} onValueChange={(v) => setForm({ ...form, obiettivo_principale: v })} options={OBIETTIVI} />
          </div>
        </div>

        {/* Bottone salva */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: saved ? '#22c55e' : '#d4af37',
            color: '#0a0f1a',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvataggio...</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Profilo salvato!</>
          ) : (
            <><Save className="w-4 h-4" /> Salva modifiche</>
          )}
        </button>
      </div>

      <BottomNav currentPage="ProfiloUtente" />
    </div>
  );
}