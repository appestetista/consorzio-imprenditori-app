import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Globe, Plus } from 'lucide-react';
import CountrySearchSelect from '../import-export/CountrySearchSelect';
import ExportProductCard from './ExportProductCard';

const EXPORTER_COUNTRIES = [
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Germania' },
  { code: 'FR', name: 'Francia' },
  { code: 'ES', name: 'Spagna' },
  { code: 'NL', name: 'Paesi Bassi' },
  { code: 'BE', name: 'Belgio' },
  { code: 'AT', name: 'Austria' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portogallo' },
];

const EMPTY_PRODUCT = {
  prodotto: '', settore: '', capacita_produttiva: '', unita_capacita: '',
  posizionamento: '', prezzo_medio: '', business_model: '', canale_preferito: '',
  costo_industriale: '', margine_disponibile: '',
  peso_kg: '', lunghezza_cm: '', larghezza_cm: '', altezza_cm: '',
  shelf_life_valore: '', shelf_life_unita: '',
  esperienza_export: '', obiettivo_export: '', certificazioni: []
};

export default function ExportProfileSection({ formData, setFormData }) {
  const prodotti = Array.isArray(formData.export_prodotti) && formData.export_prodotti.length > 0
    ? formData.export_prodotti
    : [{ ...EMPTY_PRODUCT }];

  const updateProduct = (index, updatedProduct) => {
    const updated = [...prodotti];
    updated[index] = updatedProduct;
    setFormData({ ...formData, export_prodotti: updated });
  };

  const addProduct = () => {
    setFormData({ ...formData, export_prodotti: [...prodotti, { ...EMPTY_PRODUCT }] });
  };

  const removeProduct = (index) => {
    const updated = prodotti.filter((_, i) => i !== index);
    setFormData({ ...formData, export_prodotti: updated.length > 0 ? updated : [{ ...EMPTY_PRODUCT }] });
  };

  return (
    <div className="space-y-4 mb-4" id="export-profile-section">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-lime-400" />
            Dati Export Generali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-1 block">Fatturato annuo</label>
            <Select value={formData.export_fatturato_annuo || undefined} onValueChange={(value) => setFormData({ ...formData, export_fatturato_annuo: value })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="< 500k">{'< 500.000€'}</SelectItem>
                <SelectItem value="500k-1M">500k - 1M €</SelectItem>
                <SelectItem value="1M-5M">1M - 5M €</SelectItem>
                <SelectItem value="5M-10M">5M - 10M €</SelectItem>
                <SelectItem value="> 10M">{'> 10M €'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Paese esportatore</label>
            <Select value={formData.export_paese_esportatore || 'IT'} onValueChange={(value) => setFormData({ ...formData, export_paese_esportatore: value })}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPORTER_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1 block">Mercati target (max 5)</label>
            <CountrySearchSelect
              selected={formData.export_mercati_target || []}
              onChange={(codes) => setFormData({ ...formData, export_mercati_target: codes })}
              maxSelections={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prodotti export */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          Prodotti Export ({prodotti.length})
        </h3>
        <Button onClick={addProduct} size="sm" className="bg-lime-400 hover:bg-lime-500 text-slate-900 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi prodotto
        </Button>
      </div>

      {prodotti.map((product, i) => (
        <ExportProductCard
          key={i}
          product={product}
          index={i}
          onChange={updateProduct}
          onRemove={removeProduct}
          canRemove={prodotti.length > 1}
        />
      ))}
    </div>
  );
}