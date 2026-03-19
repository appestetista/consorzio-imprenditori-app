import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Ship, Plane, Package, AlertTriangle } from 'lucide-react';

const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'];
const CONTAINER_TYPES = ['20\' Standard','40\' Standard','40\' High Cube','20\' Reefer','40\' Reefer','LCL (groupage)'];

export default function LogisticsForm({ onSubmit, loading, countryOrigin, countryDest, hsCode, productDescription }) {
  const [form, setForm] = useState({
    incoterm: 'FOB',
    origin_country: countryOrigin || 'IT',
    origin_city: '',
    origin_locode: '',
    dest_country: countryDest || '',
    dest_city: '',
    dest_locode: '',
    preferred_port: '',
    product_description: productDescription || '',
    hs_code: hsCode || '',
    weight_kg: '',
    volume_m3: '',
    colli: '',
    container_type: '20\' Standard',
    dangerous_goods: false,
    urgency_days: '',
    ready_date: '',
    cargo_value_eur: '',
    preferred_currency: 'EUR',
    last_mile_address: '',
    last_mile_zip: '',
    last_mile_delivery_type: '',
    email: '',
  });

  const [errors, setErrors] = useState({});

  const update = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.origin_city.trim()) e.origin_city = 'Obbligatorio';
    if (!form.dest_city.trim()) e.dest_city = 'Obbligatorio';
    if (!form.hs_code.trim()) e.hs_code = 'Obbligatorio';
    if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) e.weight_kg = 'Obbligatorio';
    if (!form.cargo_value_eur || parseFloat(form.cargo_value_eur) <= 0) e.cargo_value_eur = 'Obbligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form);
  };

  const fieldClass = (key) => `bg-slate-800/60 border-white/10 text-white h-10 rounded-xl text-xs placeholder:text-slate-500 ${errors[key] ? 'border-red-500 border-2' : ''}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Ship className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Modulo Logistica Operativo</h3>
          <p className="text-slate-400 text-[10px]">Quotazioni reali da API carrier • Nessun dato inventato</p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-amber-200 text-[10px] leading-relaxed">
          Questo modulo interroga API reali di carrier marittimi/aerei. Le quotazioni dipendono dalla disponibilità dei provider. 
          Se un'API non è configurata o non risponde, verrà segnalato esplicitamente "Dato non disponibile".
        </p>
      </div>

      {/* Incoterm */}
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1.5 block">Incoterm *</label>
        <Select value={form.incoterm} onValueChange={v => update('incoterm', v)}>
          <SelectTrigger className={fieldClass('incoterm')}><SelectValue /></SelectTrigger>
          <SelectContent>
            {INCOTERMS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Origine */}
      <div>
        <p className="text-slate-300 text-xs font-semibold mb-2">📍 Origine</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Paese</label>
            <Input value={form.origin_country} onChange={e => update('origin_country', e.target.value)} placeholder="IT" className={fieldClass('origin_country')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Città *</label>
            <Input value={form.origin_city} onChange={e => update('origin_city', e.target.value)} placeholder="Es. Genova" className={fieldClass('origin_city')} />
            {errors.origin_city && <p className="text-red-400 text-[10px] mt-0.5">{errors.origin_city}</p>}
          </div>
        </div>
        <div className="mt-2">
          <label className="text-slate-500 text-[10px] mb-1 block">UN/LOCODE (opzionale, es. ITGOA)</label>
          <Input value={form.origin_locode} onChange={e => update('origin_locode', e.target.value.toUpperCase())} placeholder="Es. ITGOA" className={fieldClass('origin_locode')} />
        </div>
      </div>

      {/* Destinazione */}
      <div>
        <p className="text-slate-300 text-xs font-semibold mb-2">📍 Destinazione</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Paese</label>
            <Input value={form.dest_country} onChange={e => update('dest_country', e.target.value)} placeholder="US" className={fieldClass('dest_country')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Città *</label>
            <Input value={form.dest_city} onChange={e => update('dest_city', e.target.value)} placeholder="Es. New York" className={fieldClass('dest_city')} />
            {errors.dest_city && <p className="text-red-400 text-[10px] mt-0.5">{errors.dest_city}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">UN/LOCODE (opzionale)</label>
            <Input value={form.dest_locode} onChange={e => update('dest_locode', e.target.value.toUpperCase())} placeholder="Es. USNYC" className={fieldClass('dest_locode')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Porto/Aeroporto preferito</label>
            <Input value={form.preferred_port} onChange={e => update('preferred_port', e.target.value)} placeholder="Es. Port of Los Angeles" className={fieldClass('preferred_port')} />
          </div>
        </div>
      </div>

      {/* Merce */}
      <div>
        <p className="text-slate-300 text-xs font-semibold mb-2">📦 Merce</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Descrizione merce</label>
            <Input value={form.product_description} onChange={e => update('product_description', e.target.value)} placeholder="Es. Olio d'oliva" className={fieldClass('product_description')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Codice HS *</label>
            <Input value={form.hs_code} onChange={e => update('hs_code', e.target.value)} placeholder="Es. 1509" className={fieldClass('hs_code')} />
            {errors.hs_code && <p className="text-red-400 text-[10px] mt-0.5">{errors.hs_code}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Peso (kg) *</label>
            <Input type="number" min="0" value={form.weight_kg} onChange={e => update('weight_kg', e.target.value)} placeholder="0" className={fieldClass('weight_kg')} />
            {errors.weight_kg && <p className="text-red-400 text-[10px] mt-0.5">{errors.weight_kg}</p>}
            <div className="flex gap-2 mt-1.5">
              <button type="button" onClick={() => update('weight_type', 'confezione')}
                className={`text-[9px] px-2 py-1 rounded-lg border transition-colors ${form.weight_type === 'confezione' ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                📦 Singola confezione
              </button>
              <button type="button" onClick={() => update('weight_type', 'bancale')}
                className={`text-[9px] px-2 py-1 rounded-lg border transition-colors ${form.weight_type === 'bancale' ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 font-bold' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                🏗️ Bancale/pallet
              </button>
            </div>
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Volume (m³)</label>
            <Input type="number" min="0" step="0.01" value={form.volume_m3} onChange={e => update('volume_m3', e.target.value)} placeholder="0" className={fieldClass('volume_m3')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Colli</label>
            <Input type="number" min="0" value={form.colli} onChange={e => update('colli', e.target.value)} placeholder="0" className={fieldClass('colli')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Tipo container</label>
            <Select value={form.container_type} onValueChange={v => update('container_type', v)}>
              <SelectTrigger className={fieldClass('container_type')}><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.dangerous_goods} onChange={e => update('dangerous_goods', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500" />
              <span className="text-slate-400 text-xs">Merce pericolosa (DG)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Urgenza & Valore */}
      <div>
        <p className="text-slate-300 text-xs font-semibold mb-2">⏱️ Tempi & Valore</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Urgenza (giorni)</label>
            <Input type="number" min="0" value={form.urgency_days} onChange={e => update('urgency_days', e.target.value)} placeholder="30" className={fieldClass('urgency_days')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Data pronta merce</label>
            <Input type="date" value={form.ready_date} onChange={e => update('ready_date', e.target.value)} className={fieldClass('ready_date')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Valore merce (€) *</label>
            <Input type="number" min="0" step="0.01" value={form.cargo_value_eur} onChange={e => update('cargo_value_eur', e.target.value)} placeholder="10000" className={fieldClass('cargo_value_eur')} />
            {errors.cargo_value_eur && <p className="text-red-400 text-[10px] mt-0.5">{errors.cargo_value_eur}</p>}
          </div>
        </div>
      </div>

      {/* Ultimo Miglio */}
      <div>
        <p className="text-slate-300 text-xs font-semibold mb-2">🚚 Ultimo Miglio (opzionale)</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Indirizzo/Città</label>
            <Input value={form.last_mile_address} onChange={e => update('last_mile_address', e.target.value)} placeholder="Es. Brooklyn, NY" className={fieldClass('last_mile_address')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">CAP</label>
            <Input value={form.last_mile_zip} onChange={e => update('last_mile_zip', e.target.value)} placeholder="11201" className={fieldClass('last_mile_zip')} />
          </div>
          <div>
            <label className="text-slate-500 text-[10px] mb-1 block">Tipo consegna</label>
            <Select value={form.last_mile_delivery_type} onValueChange={v => update('last_mile_delivery_type', v)}>
              <SelectTrigger className={fieldClass('last_mile_delivery_type')}><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="B2B">B2B (magazzino/azienda)</SelectItem>
                <SelectItem value="B2C">B2C (consumatore finale)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Email opzionale */}
      <div>
        <label className="text-slate-500 text-[10px] mb-1 block">Email per invio report (opzionale)</label>
        <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="export@azienda.it" className={fieldClass('email')} />
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={loading}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50">
        {loading ? (
          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Interrogazione API carrier in corso...</>
        ) : (
          <><Ship className="w-5 h-5 mr-2" /> Richiedi Quotazione Logistica</>
        )}
      </Button>
    </div>
  );
}