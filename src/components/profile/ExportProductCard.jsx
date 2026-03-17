import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Package, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const SETTORI = [
  'Alimentare e bevande', 'Moda e tessile', 'Arredamento e design',
  'Meccanica e automazione', 'Cosmetica e cura persona', 'Tecnologia e elettronica',
  'Automotive e componentistica', 'Farmaceutico e medicale', 'Agricoltura e agroalimentare',
  'Chimica e materiali', 'Metallurgia e lavorazioni metalli', 'Plastica e gomma',
  'Vetro, ceramiche e materiali lapidei', 'Carta, cartone e imballaggi',
  'Edilizia e materiali da costruzione', 'Energia e ambiente', 'Altro'
];

const CERTIFICAZIONI = [
  { value: 'CE', label: 'CE', desc: 'Conformità Europea' },
  { value: 'ISO 9001', label: 'ISO 9001', desc: 'Qualità aziendale' },
  { value: 'BIO', label: 'BIO', desc: 'Biologico' },
  { value: 'FDA', label: 'FDA', desc: 'USA alim./farmaceutico' },
  { value: 'HACCP', label: 'HACCP', desc: 'Sicurezza alimentare' },
  { value: 'ISO 14001', label: 'ISO 14001', desc: 'Ambiente' },
  { value: 'ISO 22000', label: 'ISO 22000', desc: 'Sicurezza alimentare' },
  { value: 'REACH', label: 'REACH', desc: 'Sostanze chimiche UE' },
];

export default function ExportProductCard({ product, index, onChange, onRemove, canRemove }) {
  const [expanded, setExpanded] = useState(true);

  const update = (field, value) => {
    onChange(index, { ...product, [field]: value });
  };

  const toggleCert = (certValue) => {
    const certs = Array.isArray(product.certificazioni) ? product.certificazioni : [];
    const updated = certs.includes(certValue) ? certs.filter(c => c !== certValue) : [...certs, certValue];
    update('certificazioni', updated);
  };

  const certs = Array.isArray(product.certificazioni) ? product.certificazioni : [];
  const isFoodSector = product.settore === 'Alimentare e bevande' || product.settore === 'Agricoltura e agroalimentare';

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-white flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-lime-400" />
          <span className="flex-1">{product.prodotto || `Prodotto ${index + 1}`}</span>
          {canRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(index); }} className="text-red-400 hover:text-red-300 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3 pt-2">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Nome prodotto *</label>
            <Input value={product.prodotto || ''} onChange={(e) => update('prodotto', e.target.value)}
              placeholder="Es. Olio d'oliva extravergine" className="bg-slate-900 border-slate-700 text-white text-sm" />
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Settore *</label>
            <Select value={product.settore || undefined} onValueChange={(v) => update('settore', v)}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm"><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>{SETTORI.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Capacità produttiva</label>
              <Input value={product.capacita_produttiva || ''} onChange={(e) => update('capacita_produttiva', e.target.value)}
                placeholder="Es. 1000" className="bg-slate-900 border-slate-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Unità</label>
              <Select value={product.unita_capacita || undefined} onValueChange={(v) => update('unita_capacita', v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm"><SelectValue placeholder="Unità" /></SelectTrigger>
                <SelectContent>
                  {['pezzi/anno', 'kg/anno', 't/anno', 'L/anno', 'm³/anno', 'm²/anno', 'kWh/anno'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Posizionamento</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['Entry Level', 'Mid-range', 'Premium', 'Luxury'].map(p => (
                <button key={p} onClick={() => update('posizionamento', product.posizionamento === p ? '' : p)}
                  className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${product.posizionamento === p ? 'bg-lime-400 text-slate-900 border-lime-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>{p}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Prezzo medio (€)</label>
              <Input type="number" step="0.01" min="0" value={product.prezzo_medio || ''} onChange={(e) => update('prezzo_medio', e.target.value)}
                placeholder="15.00" className="bg-slate-900 border-slate-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">COGS (€)</label>
              <Input type="number" step="0.01" min="0" value={product.costo_industriale || ''} onChange={(e) => update('costo_industriale', e.target.value)}
                placeholder="5.00" className="bg-slate-900 border-slate-700 text-white text-sm" />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Margine disponibile (%)</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[{ label: 'Basso 10-20%', value: '15' }, { label: 'Medio 20-40%', value: '30' }, { label: 'Alto 40%+', value: '50' }].map(opt => (
                <button key={opt.value} onClick={() => update('margine_disponibile', opt.value)}
                  className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${product.margine_disponibile === opt.value ? 'bg-lime-400 text-slate-900 border-lime-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>{opt.label}</button>
              ))}
            </div>
            <Input type="number" step="1" min="0" max="100" value={product.margine_disponibile || ''} onChange={(e) => update('margine_disponibile', e.target.value)}
              placeholder="Valore personalizzato %" className="bg-slate-900 border-slate-700 text-white text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Business Model</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['B2B', 'B2C'].map(bm => (
                  <button key={bm} onClick={() => update('business_model', product.business_model === bm ? '' : bm)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold border text-center transition-all ${product.business_model === bm ? 'bg-lime-400 text-slate-900 border-lime-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>{bm}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Canale preferito</label>
              <Select value={product.canale_preferito || undefined} onValueChange={(v) => update('canale_preferito', v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online / Marketplace</SelectItem>
                  <SelectItem value="Distributore">Distributore / Agente</SelectItem>
                  <SelectItem value="Retail">Retail fisico / GDO</SelectItem>
                  <SelectItem value="Diretto">Export diretto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Peso e dimensioni</label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="0.01" min="0" placeholder="Peso (kg)" value={product.peso_kg || ''} onChange={(e) => update('peso_kg', e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" />
              <Input type="number" step="0.1" min="0" placeholder="L (cm)" value={product.lunghezza_cm || ''} onChange={(e) => update('lunghezza_cm', e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" />
              <Input type="number" step="0.1" min="0" placeholder="W (cm)" value={product.larghezza_cm || ''} onChange={(e) => update('larghezza_cm', e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" />
              <Input type="number" step="0.1" min="0" placeholder="H (cm)" value={product.altezza_cm || ''} onChange={(e) => update('altezza_cm', e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" />
            </div>
          </div>

          {isFoodSector && (
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Shelf Life</label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="1" placeholder="Valore" value={product.shelf_life_valore || ''} onChange={(e) => update('shelf_life_valore', e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" />
                <Select value={product.shelf_life_unita || undefined} onValueChange={(v) => update('shelf_life_unita', v)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-sm"><SelectValue placeholder="Unità" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="giorni">Giorni</SelectItem>
                    <SelectItem value="mesi">Mesi</SelectItem>
                    <SelectItem value="anni">Anni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Esperienza Export</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[{ label: 'Nessuna', value: 'nessuna' }, { label: 'Europa (UE)', value: 'europa' }, { label: 'Extra UE', value: 'extra_ue' }].map(opt => (
                <button key={opt.value} onClick={() => update('esperienza_export', product.esperienza_export === opt.value ? '' : opt.value)}
                  className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${product.esperienza_export === opt.value ? 'bg-lime-400 text-slate-900 border-lime-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Obiettivo Export</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[{ label: 'Test mercato', value: 'test_mercato' }, { label: 'Crescita', value: 'crescita' }, { label: 'Distribuzione stabile', value: 'distribuzione_stabile' }, { label: 'Smaltire stock', value: 'smaltire_stock' }].map(opt => (
                <button key={opt.value} onClick={() => update('obiettivo_export', product.obiettivo_export === opt.value ? '' : opt.value)}
                  className={`px-1.5 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${product.obiettivo_export === opt.value ? 'bg-lime-400 text-slate-900 border-lime-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Certificazioni</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CERTIFICAZIONI.map(cert => (
                <button key={cert.value} onClick={() => toggleCert(cert.value)}
                  className={`px-2 py-1.5 rounded-lg text-left border transition-all ${certs.includes(cert.value) ? 'bg-lime-400 text-slate-900 border-lime-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>
                  <span className="text-xs font-bold block">{cert.label}</span>
                  <span className={`text-[10px] ${certs.includes(cert.value) ? 'text-slate-700' : 'text-slate-500'}`}>{cert.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}