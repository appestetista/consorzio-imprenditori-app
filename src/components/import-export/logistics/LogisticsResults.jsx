import React from 'react';
import { Ship, Plane, Truck, AlertTriangle, CheckCircle, XCircle, Clock, Shield, Info, Landmark } from 'lucide-react';

function SourceBadge({ source }) {
  if (!source) return null;
  return (
    <div className="bg-slate-700/40 rounded-lg p-2 mt-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Shield className="w-3 h-3 text-slate-500" />
        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Fonte</span>
      </div>
      <p className="text-slate-400 text-[10px]">{source.name}</p>
      {source.endpoint && (
        <a href={source.endpoint} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-[10px] hover:underline break-all">{source.endpoint}</a>
      )}
      {source.data_date && <p className="text-slate-500 text-[9px] mt-0.5">Data dato: {source.data_date}</p>}
      <p className="text-slate-500 text-[9px]">Recuperato: {new Date(source.retrieved_at).toLocaleString('it-IT')}</p>
    </div>
  );
}

function ConfidenceBadge({ level }) {
  const styles = {
    high: 'bg-green-500/15 text-green-400',
    medium: 'bg-amber-500/15 text-amber-400',
    low: 'bg-orange-500/15 text-orange-400',
    unavailable: 'bg-slate-500/15 text-slate-400',
  };
  const labels = { 
    high: 'Alta affidabilità', 
    medium: 'Media (fonti web)', 
    low: 'Bassa (stima)', 
    unavailable: 'Non disponibile' 
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${styles[level] || styles.unavailable}`}>
      {labels[level] || level}
    </span>
  );
}

function formatPrice(price) {
  if (!price) return null;
  const sym = price.currency === 'EUR' ? '€' : '$';
  if (price.is_range && price.amount_max) {
    return `${sym}${price.amount.toLocaleString('it-IT')} — ${sym}${price.amount_max.toLocaleString('it-IT')}`;
  }
  return `${sym}${price.amount.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`;
}

function OceanQuoteCard({ quote }) {
  return (
    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ship className="w-5 h-5 text-blue-400" />
          <div>
            <span className="text-white font-bold text-sm">Via Mare</span>
            {quote.carrier && <span className="text-slate-400 text-[10px] ml-2">— {quote.carrier}</span>}
          </div>
        </div>
        <ConfidenceBadge level={quote.confidence} />
      </div>

      {quote.total_price ? (
        <div className="bg-slate-800/80 rounded-lg p-3 mb-3">
          <p className="text-slate-500 text-[10px] mb-1">
            {quote.total_price.is_range ? 'Range prezzo container' : 'Prezzo stimato container'}
          </p>
          <p className="text-white text-2xl font-black">{formatPrice(quote.total_price)}</p>
          <p className="text-slate-500 text-[10px]">{quote.total_price.currency}</p>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-200 text-xs">Prezzo non reperibile dalla fonte indicata</p>
        </div>
      )}

      {/* Surcharges */}
      {quote.line_items?.length > 0 && (
        <div className="space-y-1 mb-3">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Surcharges noti</p>
          {quote.line_items.map((li, i) => (
            <div key={i} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
              <span className="text-slate-400 text-[10px]">{li.description}</span>
              <span className="text-white text-[10px] font-semibold">{li.amount_text || li.note}</span>
            </div>
          ))}
        </div>
      )}

      {/* Transit time */}
      <div className="flex gap-2 flex-wrap">
        {quote.transit_time_days != null && (
          <div className="bg-slate-700/40 rounded-lg p-2 flex-1 min-w-[100px]">
            <p className="text-slate-500 text-[10px]">Transit time</p>
            <p className="text-white text-xs font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {quote.transit_time_days}{quote.transit_time_days_max ? `–${quote.transit_time_days_max}` : ''} giorni
            </p>
          </div>
        )}
      </div>

      {quote.notes && <p className="text-slate-400 text-[10px] mt-2 italic">{quote.notes}</p>}
      <SourceBadge source={quote.source} />
    </div>
  );
}

function AirQuoteCard({ quote }) {
  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-purple-400" />
          <div>
            <span className="text-white font-bold text-sm">Via Aerea</span>
            {quote.carrier && <span className="text-slate-400 text-[10px] ml-2">— {quote.carrier}</span>}
          </div>
        </div>
        <ConfidenceBadge level={quote.confidence} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {quote.price_per_kg && (
          <div className="bg-slate-800/80 rounded-lg p-3">
            <p className="text-slate-500 text-[10px] mb-1">Prezzo/kg</p>
            <p className="text-white text-lg font-black">
              ${quote.price_per_kg.min}{quote.price_per_kg.max ? `–${quote.price_per_kg.max}` : ''}/kg
            </p>
          </div>
        )}
        {quote.total_price && (
          <div className="bg-slate-800/80 rounded-lg p-3">
            <p className="text-slate-500 text-[10px] mb-1">Stima totale</p>
            <p className="text-white text-lg font-black">{formatPrice(quote.total_price)}</p>
          </div>
        )}
      </div>

      {quote.transit_time_days != null && (
        <div className="bg-slate-700/40 rounded-lg p-2 mb-2">
          <p className="text-slate-500 text-[10px]">Transit time</p>
          <p className="text-white text-xs font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {quote.transit_time_days}{quote.transit_time_days_max ? `–${quote.transit_time_days_max}` : ''} giorni
          </p>
        </div>
      )}

      {quote.notes && <p className="text-slate-400 text-[10px] mt-2 italic">{quote.notes}</p>}
      <SourceBadge source={quote.source} />
    </div>
  );
}

function CongestionCard({ data }) {
  if (!data) return null;

  const renderPort = (label, port, level, notes) => (
    <div className="mb-2">
      <div className="flex items-center justify-between py-1.5">
        <span className="text-slate-400 text-xs">{label}: {port}</span>
        {level && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            level === 'high' ? 'bg-red-500/15 text-red-400' :
            level === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'
          }`}>{level}</span>
        )}
      </div>
      {notes && <p className="text-slate-400 text-[10px]">{notes}</p>}
    </div>
  );

  return (
    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-orange-400" />
        <span className="text-white font-bold text-sm">Congestione Portuale</span>
        <ConfidenceBadge level={data.confidence} />
      </div>
      {data.origin?.port && renderPort('Origine', data.origin.port, data.origin.congestion_level, data.origin.notes)}
      {data.destination?.port && renderPort('Destinazione', data.destination.port, data.destination.congestion_level, data.destination.notes)}
      <SourceBadge source={data.source} />
    </div>
  );
}

function CustomsCard({ data }) {
  if (!data) return null;
  return (
    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Landmark className="w-5 h-5 text-indigo-400" />
        <span className="text-white font-bold text-sm">Dazi & Imposte</span>
        <ConfidenceBadge level={data.confidence} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between py-1.5 border-b border-white/5">
          <span className="text-slate-400 text-xs">HS Code</span>
          <span className="text-white text-xs font-mono">{data.hs_code}</span>
        </div>
        {data.duty_rate && (
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-slate-400 text-xs">Dazio</span>
            <span className="text-white text-xs">{data.duty_rate}</span>
          </div>
        )}
        {data.vat_gst && (
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-slate-400 text-xs">IVA/GST</span>
            <span className="text-white text-xs">{data.vat_gst}</span>
          </div>
        )}
        {data.anti_dumping && data.anti_dumping !== 'N/A' && data.anti_dumping !== 'Nessuno' && (
          <div className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-slate-400 text-xs">Anti-dumping</span>
            <span className="text-amber-400 text-xs">{data.anti_dumping}</span>
          </div>
        )}
      </div>
      {data.notes && <p className="text-slate-400 text-[10px] mt-2 italic">{data.notes}</p>}
      <SourceBadge source={data.source} />
    </div>
  );
}

function LastMileCard({ data }) {
  return (
    <div className="bg-slate-700/30 border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-5 h-5 text-teal-400" />
        <span className="text-white font-bold text-sm">Ultimo Miglio</span>
        <ConfidenceBadge level="unavailable" />
      </div>
      <div className="flex items-start gap-2">
        <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-slate-400 text-xs">{data?.message || 'Non disponibile: integrazione corriere mancante.'}</p>
      </div>
    </div>
  );
}

export default function LogisticsResults({ results }) {
  if (!results) return null;

  const oceanQuotes = results.quotes?.filter(q => q.mode === 'ocean') || [];
  const airQuotes = results.quotes?.filter(q => q.mode === 'air') || [];

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="bg-slate-800/60 border border-white/5 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">Risultati Quotazione Logistica</p>
            <p className="text-slate-500 text-[10px]">ID: {results.request_id}</p>
          </div>
          <p className="text-slate-500 text-[10px]">{new Date(results.timestamp_utc).toLocaleString('it-IT')}</p>
        </div>
      </div>

      {/* Disclaimer */}
      {results.data_disclaimer && (
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-blue-200 text-[10px] leading-relaxed">{results.data_disclaimer}</p>
        </div>
      )}

      {/* Summary comparativo */}
      {results.comparison_summary && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
          <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Riepilogo Comparativo</p>
          <p className="text-emerald-100 text-xs leading-relaxed">{results.comparison_summary}</p>
        </div>
      )}

      {/* Errori */}
      {results.errors?.filter(e => e.area !== 'warning').length > 0 && (
        <div className="space-y-2">
          {results.errors.filter(e => e.area !== 'warning').map((err, i) => (
            <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-xs font-bold">{err.area}</p>
                <p className="text-red-200 text-[10px]">{err.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {results.errors?.filter(e => e.area === 'warning').length > 0 && (
        <div className="space-y-1">
          {results.errors.filter(e => e.area === 'warning').map((w, i) => (
            <div key={i} className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-2 flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-200 text-[10px]">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* 1) Mare */}
      {oceanQuotes.length > 0 ? (
        oceanQuotes.map((q, i) => <OceanQuoteCard key={i} quote={q} />)
      ) : (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ship className="w-5 h-5 text-blue-400" />
            <span className="text-white font-bold text-sm">Via Mare</span>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-400 text-xs">Nessuna quotazione marittima trovata per questa rotta.</p>
          </div>
        </div>
      )}

      {/* 2) Aereo */}
      {airQuotes.length > 0 ? (
        airQuotes.map((q, i) => <AirQuoteCard key={i} quote={q} />)
      ) : (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-5 h-5 text-purple-400" />
            <span className="text-white font-bold text-sm">Via Aerea</span>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-400 text-xs">Tariffe aeree non disponibili per questa rotta.</p>
          </div>
        </div>
      )}

      {/* 3) Congestione */}
      <CongestionCard data={results.port_congestion} />

      {/* 4) Dazi */}
      <CustomsCard data={results.customs} />

      {/* 5) Ultimo Miglio */}
      <LastMileCard data={results.last_mile} />

      {/* Debug */}
      {results.inputs_normalized && (
        <details className="bg-slate-800/40 border border-white/5 rounded-xl">
          <summary className="px-4 py-2 text-slate-500 text-[10px] cursor-pointer hover:text-slate-300">
            Parametri normalizzati (debug)
          </summary>
          <pre className="px-4 pb-3 text-slate-500 text-[9px] overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(results.inputs_normalized, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}