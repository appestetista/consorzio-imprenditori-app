import React, { useState } from 'react';
import { Ship, Plane, ChevronDown, ChevronUp, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LogisticsForm from './LogisticsForm';
import LogisticsResults from './LogisticsResults';
import Cargo3DVisualizer from './Cargo3DVisualizer';
import ShippingComparator from './ShippingComparator';

export default function LogisticsModule({ countryOrigin, countryDest, hsCode, productDescription }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [lastFormData, setLastFormData] = useState(null);

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

  return (
    <div className="mt-3">
      {/* Bottone Logistica */}
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
            <p className="text-slate-400 text-[10px]">Quotazioni reali Mare / Aereo + Congestione</p>
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
  );
}