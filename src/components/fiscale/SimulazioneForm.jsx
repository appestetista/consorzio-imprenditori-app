import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calculator, Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import IndicatoreImpattoFiscale from './IndicatoreImpattoFiscale';
import AtecoSearchInput from './AtecoSearchInput';
import CategoriaIRAPBadge from './CategoriaIRAPBadge';
import useRaccordoATECO from './useRaccordoATECO';

const coefficientiAteco = [
  { label: '40% – Industrie alimentari e bevande', value: '0.40' },
  { label: '54% – Costruzioni e attività immobiliari', value: '0.54' },
  { label: '62% – Commercio all\'ingrosso e al dettaglio', value: '0.62' },
  { label: '67% – Attività di alloggio e ristorazione', value: '0.67' },
  { label: '78% – Servizi professionali e tecnici', value: '0.78' },
  { label: '86% – Commercio ambulante (non alimentare)', value: '0.86' },
];

export default function SimulazioneForm({ onSubmit, loading, userProfile }) {
  // Mappa forma giuridica → regime form
  const mapFormaToRegime = (fg, rf) => {
    if (fg === 'RF' || rf === 'Forfettario') return 'Forfettario';
    if (['SRL', 'SRLU', 'SPA', 'SAPA', 'SE', 'COOP'].includes(fg)) return 'SRL';
    if (['Ditta individuale', 'SS', 'SNC', 'SAS'].includes(fg) && rf === 'Ordinario') return 'DittaOrdinaria';
    return '';
  };

  const [form, setForm] = useState({
    regime: mapFormaToRegime(userProfile?.forma_giuridica, userProfile?.regime_fiscale),
    fatturato: '',
    costi_deducibili: '',
    coefficiente_redditivita: '0.78',
    aliquota_forfettario: 'ordinario',
    distribuzione_dividendi: false,
    compenso_amministratore: '',
    base_imponibile_irap: '',
    nome_scenario: '',
    anno: 2026,
    regione: userProfile?.regione || userProfile?.region || '',
    categoria_irap: '',
    codice_ateco: userProfile?.ateco_code || ''
  });

  // Raccordo automatico ATECO → IRAP
  const raccordo = useRaccordoATECO({ 
    codiceAteco: form.codice_ateco, 
    regione: form.regione, 
    anno: form.anno 
  });

  // Sincronizza categoria IRAP dal raccordo automatico
  useEffect(() => {
    if (!raccordo.loading && raccordo.categoriaIrap) {
      setForm(prev => ({ ...prev, categoria_irap: raccordo.categoriaIrap }));
    }
  }, [raccordo.categoriaIrap, raccordo.loading]);

  const handleSubmit = () => {
    if (!form.regime || !form.fatturato) return;
    onSubmit({
      ...form,
      fatturato: parseFloat(form.fatturato),
      costi_deducibili: parseFloat(form.costi_deducibili) || 0,
      compenso_amministratore: parseFloat(form.compenso_amministratore) || 0,
      base_imponibile_irap: form.base_imponibile_irap ? parseFloat(form.base_imponibile_irap) : undefined,
      regione: form.regione || undefined,
      categoria_irap: form.categoria_irap || undefined,
      coefficiente_redditivita: parseFloat(form.coefficiente_redditivita),
      anno: parseInt(form.anno)
    });
  };

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      {/* Spiegazione chiara */}
      <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-2xl p-5">
        <h2 className="text-white font-bold text-base mb-2">📊 Simula le tue imposte annuali</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-3">
          Inserisci il tuo <strong className="text-white">fatturato</strong>, il <strong className="text-white">regime fiscale</strong> e i <strong className="text-white">costi</strong>: 
          ti calcoleremo <strong className="text-[#d4af37]">IRPEF, IRES, IRAP, INPS e contributi</strong> che dovrai pagare quest'anno.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800/60 rounded-lg py-2 px-1">
            <p className="text-[10px] text-slate-500 uppercase">Cosa inserisci</p>
            <p className="text-white text-xs font-semibold mt-0.5">Fatturato e costi</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg py-2 px-1">
            <p className="text-[10px] text-slate-500 uppercase">Cosa calcola</p>
            <p className="text-white text-xs font-semibold mt-0.5">Tutte le imposte</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg py-2 px-1">
            <p className="text-[10px] text-slate-500 uppercase">Cosa ottieni</p>
            <p className="text-[#d4af37] text-xs font-semibold mt-0.5">Netto finale</p>
          </div>
        </div>
      </div>

      {/* Indicatore Impatto Fiscale - live */}
      <IndicatoreImpattoFiscale form={form} />

      {/* Step 1: Regime */}
      <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-xl p-4 space-y-3">
        <p className="text-[#d4af37] text-xs font-bold uppercase tracking-wider">① Che tipo di azienda hai?</p>
        <Select value={form.regime} onValueChange={(v) => update('regime', v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Seleziona regime fiscale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SRL">S.R.L.</SelectItem>
            <SelectItem value="Forfettario">Forfettario</SelectItem>
            <SelectItem value="DittaOrdinaria">Ditta Individuale Ordinaria</SelectItem>
          </SelectContent>
        </Select>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Nome scenario (opzionale)</label>
          <Input
            placeholder="es. Scenario ottimistico 2026"
            value={form.nome_scenario}
            onChange={(e) => update('nome_scenario', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Step 2: Numeri */}
      <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-xl p-4 space-y-3">
        <p className="text-[#d4af37] text-xs font-bold uppercase tracking-wider">② Quanto fatturi e spendi?</p>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Fatturato annuo (€) *</label>
          <Input
            type="number"
            placeholder="es. 100000"
            value={form.fatturato}
            onChange={(e) => update('fatturato', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        {/* Costi deducibili - solo SRL e DittaOrdinaria */}
        {(form.regime === 'SRL' || form.regime === 'DittaOrdinaria') && (
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1 block">Costi deducibili (€)</label>
            <Input
              type="number"
              placeholder="es. 30000"
              value={form.costi_deducibili}
              onChange={(e) => update('costi_deducibili', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        )}
      </div>

      {/* Campi specifici Forfettario */}
      {form.regime === 'Forfettario' && (
        <>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1 block">Coefficiente di redditività</label>
            <Select value={form.coefficiente_redditivita} onValueChange={(v) => update('coefficiente_redditivita', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coefficientiAteco.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1 block">Tipo aliquota</label>
            <Select value={form.aliquota_forfettario} onValueChange={(v) => update('aliquota_forfettario', v)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ordinario">Ordinario (15%)</SelectItem>
                <SelectItem value="startup">Startup (5%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Campi specifici SRL */}
      {form.regime === 'SRL' && (
        <>
          {/* Regione */}
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1 block">Regione *</label>
            <Select value={form.regione} onValueChange={(v) => { update('regione', v); update('categoria_irap', ''); update('codice_ateco', ''); }}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Seleziona regione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Marche">Marche</SelectItem>
                <SelectItem value="Emilia-Romagna">Emilia-Romagna</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Codice ATECO + Categoria IRAP automatica */}
          {form.regione && (
            <>
              <AtecoSearchInput 
                value={form.codice_ateco} 
                onChange={(v) => update('codice_ateco', v)} 
              />
              <CategoriaIRAPBadge 
                categoriaIrap={raccordo.categoriaIrap}
                aliquotaIrap={raccordo.aliquotaIrap}
                fonte={raccordo.fonte}
                loading={raccordo.loading}
              />
            </>
          )}

          <div>
            <label className="text-slate-400 text-xs font-medium mb-1 block">Compenso amministratore (€)</label>
            <Input
              type="number"
              placeholder="es. 30000 (opzionale)"
              value={form.compenso_amministratore}
              onChange={(e) => update('compenso_amministratore', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium mb-1 block">Base imponibile IRAP (€)</label>
            <Input
              type="number"
              placeholder="Lascia vuoto per stima automatica"
              value={form.base_imponibile_irap}
              onChange={(e) => update('base_imponibile_irap', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-slate-500 text-[10px] mt-1">Se vuoto, verrà stimata pari all'utile. Nella realtà può differire.</p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
            <Label className="text-slate-300 text-sm">Distribuzione dividendi</Label>
            <Switch
              checked={form.distribuzione_dividendi}
              onCheckedChange={(v) => update('distribuzione_dividendi', v)}
            />
          </div>
        </>
      )}

      {/* Anno */}
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1 block">Anno di riferimento</label>
        <Select value={String(form.anno)} onValueChange={(v) => update('anno', v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !form.regime || !form.fatturato || (form.regime === 'SRL' && !form.regione)}
        className="w-full h-12 cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-slate-900 font-bold text-sm"
        style={{
          background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
          borderRadius: '16px',
          boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.6), inset 0 -6px 8px rgba(0,0,0,0.45), 0 10px 22px rgba(0,0,0,0.6)',
          border: 'none'
        }}
      >
        <Calculator className="w-5 h-5" />
        {loading ? 'Calcolo in corso...' : 'Calcola Imposte'}
      </button>
    </div>
  );
}