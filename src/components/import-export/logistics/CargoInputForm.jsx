import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Package, Ruler, Truck, AlertTriangle, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { validateCargoInputs, PALLET_DB, VEHICLE_DB } from './cargoValidator';

function Field({ label, unit, value, onChange, error, placeholder }) {
  return (
    <div>
      <label className="text-slate-500 text-[10px] mb-1 block">{label} {unit && <span className="text-slate-600">({unit})</span>}</label>
      <Input
        type="number" min="0" step="any"
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '0'}
        className={`bg-slate-800/60 border-white/10 text-white h-9 rounded-xl text-xs placeholder:text-slate-600 ${error ? 'border-red-500 border-2' : ''}`}
      />
    </div>
  );
}

export default function CargoInputForm({ onValidated }) {
  const [form, setForm] = useState({
    lunghezza_collo: '', larghezza_collo: '', altezza_collo: '',
    peso_collo: '', quantita: '',
    pallet_preset: 'epal1',
    lunghezza_pallet: '', larghezza_pallet: '', altezza_max_pallet: '',
    mezzo_preset: 'container20',
    lunghezza_mezzo: '', larghezza_mezzo: '', altezza_mezzo: '', peso_max_mezzo: '',
    use_custom_pallet: false,
    use_custom_mezzo: false,
  });
  const [errors, setErrors] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handlePalletPreset = (id) => {
    update('pallet_preset', id);
    const p = PALLET_DB.find(x => x.id === id);
    if (p && !form.use_custom_pallet) {
      setForm(prev => ({
        ...prev, pallet_preset: id,
        lunghezza_pallet: String(p.l_cm), larghezza_pallet: String(p.w_cm),
        altezza_max_pallet: String(p.max_h_container_cm),
      }));
    }
  };

  const handleMezzoPreset = (id) => {
    update('mezzo_preset', id);
    const v = VEHICLE_DB.find(x => x.id === id);
    if (v && !form.use_custom_mezzo) {
      setForm(prev => ({
        ...prev, mezzo_preset: id,
        lunghezza_mezzo: String(v.l_cm), larghezza_mezzo: String(v.w_cm),
        altezza_mezzo: String(v.h_cm), peso_max_mezzo: String(v.max_kg),
      }));
    }
  };

  const handleCalculate = () => {
    // Se non custom, popola da preset
    let raw = { ...form };
    if (!form.use_custom_pallet) {
      const p = PALLET_DB.find(x => x.id === form.pallet_preset);
      if (p) {
        raw.lunghezza_pallet = String(p.l_cm);
        raw.larghezza_pallet = String(p.w_cm);
        raw.altezza_max_pallet = String(p.max_h_container_cm);
      }
    }
    if (!form.use_custom_mezzo) {
      const v = VEHICLE_DB.find(x => x.id === form.mezzo_preset);
      if (v) {
        raw.lunghezza_mezzo = String(v.l_cm);
        raw.larghezza_mezzo = String(v.w_cm);
        raw.altezza_mezzo = String(v.h_cm);
        raw.peso_max_mezzo = String(v.max_kg);
      }
    }

    const result = validateCargoInputs(raw);
    setErrors(result.errors);
    if (result.valid) {
      // Aggiungi info preset selezionato
      const palletInfo = PALLET_DB.find(x => x.id === form.pallet_preset);
      const mezzoInfo = VEHICLE_DB.find(x => x.id === form.mezzo_preset);
      onValidated({
        ...result.data,
        pallet_info: form.use_custom_pallet ? null : palletInfo,
        mezzo_info: form.use_custom_mezzo ? null : mezzoInfo,
        // Sovrascrivi con preset se non custom
        lunghezza_pallet: parseFloat(raw.lunghezza_pallet),
        larghezza_pallet: parseFloat(raw.larghezza_pallet),
        altezza_max_pallet: parseFloat(raw.altezza_max_pallet),
        lunghezza_mezzo: parseFloat(raw.lunghezza_mezzo),
        larghezza_mezzo: parseFloat(raw.larghezza_mezzo),
        altezza_mezzo: parseFloat(raw.altezza_mezzo),
        peso_max_mezzo: parseFloat(raw.peso_max_mezzo),
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* SEZIONE 1: Colli */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-cyan-400" />
          <p className="text-white text-xs font-bold">Dimensioni Collo</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Lunghezza" unit="cm" value={form.lunghezza_collo} onChange={v => update('lunghezza_collo', v)} placeholder="60" />
          <Field label="Larghezza" unit="cm" value={form.larghezza_collo} onChange={v => update('larghezza_collo', v)} placeholder="40" />
          <Field label="Altezza" unit="cm" value={form.altezza_collo} onChange={v => update('altezza_collo', v)} placeholder="30" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Field label="Peso per collo" unit="kg" value={form.peso_collo} onChange={v => update('peso_collo', v)} placeholder="25" />
          <Field label="Quantità colli" unit="" value={form.quantita} onChange={v => update('quantita', v)} placeholder="100" />
        </div>
      </div>

      {/* SEZIONE 2: Pallet (preset o custom) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-orange-400" />
          <p className="text-white text-xs font-bold">Tipo Pallet</p>
        </div>
        <Select value={form.pallet_preset} onValueChange={handlePalletPreset}>
          <SelectTrigger className="bg-slate-800/60 border-white/10 text-white h-9 rounded-xl text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PALLET_DB.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.l_cm}×{p.w_cm} cm, max {p.dynamic_kg} kg din.)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle custom */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 mt-2 text-slate-500 text-[10px] hover:text-slate-300 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Personalizza pallet e mezzo
        </button>

        {showAdvanced && (
          <div className="mt-2 space-y-3 bg-slate-700/20 rounded-xl p-3">
            {/* Custom Pallet */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={form.use_custom_pallet} onChange={e => update('use_custom_pallet', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500" />
                <span className="text-slate-400 text-[10px]">Dimensioni pallet personalizzate</span>
              </label>
              {form.use_custom_pallet && (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Lung. pallet" unit="cm" value={form.lunghezza_pallet} onChange={v => update('lunghezza_pallet', v)} placeholder="120" />
                  <Field label="Larg. pallet" unit="cm" value={form.larghezza_pallet} onChange={v => update('larghezza_pallet', v)} placeholder="80" />
                  <Field label="Alt. max carico" unit="cm" value={form.altezza_max_pallet} onChange={v => update('altezza_max_pallet', v)} placeholder="235" />
                </div>
              )}
            </div>

            {/* Custom Mezzo */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={form.use_custom_mezzo} onChange={e => update('use_custom_mezzo', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500" />
                <span className="text-slate-400 text-[10px]">Dimensioni mezzo personalizzate</span>
              </label>
              {!form.use_custom_mezzo && (
                <Select value={form.mezzo_preset} onValueChange={handleMezzoPreset}>
                  <SelectTrigger className="bg-slate-800/60 border-white/10 text-white h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_DB.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.l_cm}×{v.w_cm}×{v.h_cm} cm, max {(v.max_kg/1000).toFixed(1)} t)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {form.use_custom_mezzo && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Field label="Lung. mezzo" unit="cm" value={form.lunghezza_mezzo} onChange={v => update('lunghezza_mezzo', v)} placeholder="1360" />
                  <Field label="Larg. mezzo" unit="cm" value={form.larghezza_mezzo} onChange={v => update('larghezza_mezzo', v)} placeholder="245" />
                  <Field label="Alt. mezzo" unit="cm" value={form.altezza_mezzo} onChange={v => update('altezza_mezzo', v)} placeholder="270" />
                  <Field label="Peso max mezzo" unit="kg" value={form.peso_max_mezzo} onChange={v => update('peso_max_mezzo', v)} placeholder="24000" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Errori */}
      {errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-300 text-xs font-bold">Errori di validazione</span>
          </div>
          <ul className="space-y-0.5">
            {errors.map((e, i) => (
              <li key={i} className="text-red-200/80 text-[10px]">• {e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Calcola */}
      <Button
        onClick={handleCalculate}
        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold h-10 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
      >
        <Calculator className="w-4 h-4 mr-2" /> Valida e Calcola Ingombri
      </Button>

      {/* Tabella di riferimento pallet */}
      <details className="group">
        <summary className="text-slate-500 text-[10px] cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1">
          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
          Tabella di riferimento pallet
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[8px]">
            <thead>
              <tr className="text-slate-500 border-b border-white/10">
                <th className="text-left py-1 pr-1">Tipo</th>
                <th className="text-center py-1 px-0.5">Dim.</th>
                <th className="text-center py-1 px-0.5">H</th>
                <th className="text-center py-1 px-0.5">Din.</th>
                <th className="text-center py-1 px-0.5">Stat.</th>
                <th className="text-center py-1 px-0.5">H camion</th>
                <th className="text-center py-1 px-0.5">H container</th>
              </tr>
            </thead>
            <tbody>
              {PALLET_DB.map(p => (
                <tr key={p.id} className="border-b border-white/5 text-slate-400">
                  <td className="py-1 pr-1 text-white">{p.name}</td>
                  <td className="text-center">{p.l_cm}×{p.w_cm}</td>
                  <td className="text-center">{p.h_cm}</td>
                  <td className="text-center">{p.dynamic_kg.toLocaleString()}</td>
                  <td className="text-center">{p.static_kg.toLocaleString()}</td>
                  <td className="text-center">{p.max_h_truck_cm}</td>
                  <td className="text-center">{p.max_h_container_cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}