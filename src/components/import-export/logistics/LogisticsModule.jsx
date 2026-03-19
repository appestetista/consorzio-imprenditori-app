import React, { useState } from 'react';
import { Ship, Plane, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LogisticsForm from './LogisticsForm';
import LogisticsResults from './LogisticsResults';
import Cargo3DVisualizer from './Cargo3DVisualizer';
import ShippingComparator from './ShippingComparator';
import CargoInputForm from './CargoInputForm';
import CargoResultPanel from './CargoResultPanel';

export default function LogisticsModule({ countryOrigin, countryDest, hsCode, productDescription }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [lastFormData, setLastFormData] = useState(null);
  const [cargoData, setCargoData] = useState(null);
  const [activeTab, setActiveTab] = useState('ingombri'); // 'ingombri' | 'quotazione'

  const handleSubmit = async (formData) => {
    setLoading(true);
    setResults(null);
    setLastFormData(formData);
    try {
      const response = await base44.functions.invoke('logisticsQuote', formData);
      setResults(response.data);
    } catch (err) {
      console.error('[LogisticsModule] Error:', err);
      setResults({
        request_id: 'error-' + Date.now(),
        timestamp_utc: new Date().toISOString(),
        inputs_normalized: formData,
        quotes: [],
        port_congestion: null,
        last_mile: null,
        errors: [{ area: 'system', message: 'Errore di comunicazione con il backend: ' + (err?.message || 'sconosciuto') }]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCargoValidated = (data) => {
    setCargoData(data);
  };

  const tabs = [
    { id: 'ingombri', label: 'Calcolo Ingombri', icon: Package },
    { id: 'quotazione', label: 'Quotazione Logistica', icon: Ship },
  ];

  return (
    <div className="mt-3">
      {/* Bottone apertura */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
          open 
            ? 'bg-blue-500/15 border-blue-500/30 shadow-lg shadow-blue-500/10' 
            : 'bg-slate-700/30 border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Ship className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-xs">Modulo Logistica</p>
            <p className="text-slate-400 text-[10px]">Ingombri, Pallet, Quotazioni Mare / Aereo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-purple-400" />
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Pannello aperto */}
      {open && (
        <div className="mt-3 bg-slate-800/40 border border-white/5 rounded-xl p-4">
          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 bg-slate-900/50 rounded-xl p-1">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-semibold transition-all ${
                    active 
                      ? 'bg-blue-500/20 text-blue-400 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab: Calcolo Ingombri */}
          {activeTab === 'ingombri' && (
            <div>
              <CargoInputForm onValidated={handleCargoValidated} />
              <CargoResultPanel data={cargoData} />
              
              {/* Se ha dati validati, offri link alla quotazione */}
              {cargoData && (
                <button
                  onClick={() => setActiveTab('quotazione')}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs font-semibold hover:bg-blue-500/10 transition-colors"
                >
                  <Ship className="w-4 h-4" />
                  Passa alla Quotazione Logistica →
                </button>
              )}
            </div>
          )}

          {/* Tab: Quotazione Logistica (il form originale) */}
          {activeTab === 'quotazione' && (
            <div>
              <LogisticsForm
                onSubmit={handleSubmit}
                loading={loading}
                countryOrigin={countryOrigin}
                countryDest={countryDest}
                hsCode={hsCode}
                productDescription={productDescription}
              />
              <LogisticsResults results={results} />
              {lastFormData && (lastFormData.volume_m3 || lastFormData.weight_kg) && (
                <>
                  <ShippingComparator formData={lastFormData} />
                  {parseFloat(lastFormData.volume_m3) > 0 && (
                    <Cargo3DVisualizer volumeM3={lastFormData.volume_m3} weightKg={lastFormData.weight_kg} />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}