import React from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';

export default function GlobeCountryPanel({ country, data, loading, onClose }) {
  if (!country) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 max-h-[50vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <h4 className="text-white font-bold text-sm truncate">{country.name}</h4>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-slate-500 text-[10px] mb-3 flex gap-3">
        {country.iso_a2 && country.iso_a2 !== '-99' && (
          <span>ISO2: <span className="text-slate-300 font-mono">{country.iso_a2}</span></span>
        )}
        {country.iso_a3 && country.iso_a3 !== '-99' && (
          <span>ISO3: <span className="text-slate-300 font-mono">{country.iso_a3}</span></span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-slate-500 text-xs text-center py-6">Dati non disponibili</p>
      ) : (
        <div className="space-y-3">
          {data.kpis?.length > 0 && (
            <div className="space-y-1.5">
              {data.kpis.map((kpi, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-2">
                  <span className="text-slate-400 text-[11px]">{kpi.label}</span>
                  <span className="text-white text-[11px] font-semibold">{kpi.value || 'N/D'}</span>
                </div>
              ))}
            </div>
          )}

          {data.items?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">Dettagli</p>
              {data.items.map((item, i) => (
                <div key={i} className="bg-slate-800/60 rounded-lg px-3 py-2">
                  <p className="text-slate-400 text-[10px]">{item.title}</p>
                  <p className="text-white text-[11px] font-medium">{item.value || 'N/D'}</p>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                       className="text-emerald-400 text-[10px] hover:underline truncate block mt-0.5">
                      {item.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {(!data.kpis || data.kpis.length === 0) && (!data.items || data.items.length === 0) && (
            <p className="text-slate-500 text-xs text-center py-4">Nessun dato disponibile per questo paese</p>
          )}
        </div>
      )}
    </div>
  );
}