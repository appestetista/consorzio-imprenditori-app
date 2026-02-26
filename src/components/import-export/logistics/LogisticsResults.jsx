import React from 'react';
import { Ship, Plane, Truck, AlertTriangle, CheckCircle, XCircle, Clock, ExternalLink, Shield } from 'lucide-react';

function SourceBadge({ source }) {
  if (!source) return null;
  return (
    <div className="bg-slate-700/40 rounded-lg p-2 mt-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Shield className="w-3 h-3 text-slate-500" />
        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Fonte</span>
      </div>
      <p className="text-slate-400 text-[10px]">{source.name}{source.endpoint ? ` — ${source.endpoint}` : ''}</p>
      {source.retrieved_at && (
        <p className="text-slate-500 text-[9px] mt-0.5">Ultimo aggiornamento: {new Date(source.retrieved_at).toLocaleString('it-IT')}</p>
      )}
    </div>
  );
}

function ConfidenceBadge({ level }) {
  const styles = {
    high: 'bg-green-500/15 text-green-400',
    medium: 'bg-amber-500/15 text-amber-400',
    low: 'bg-red-500/15 text-red-400',
    unavailable: 'bg-slate-500/15 text-slate-400',
  };
  const labels = { high: 'Alta affidabilità', medium: 'Media affidabilità', low: 'Bassa affidabilità', unavailable: 'Non disponibile' };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${styles[level] || styles.unavailable}`}>
      {labels[level] || level}
    </span>
  );
}

function QuoteCard({ quote }) {
  const isOcean = quote.mode === 'ocean';
  const Icon = isOcean ? Ship : Plane;
  const iconColor = isOcean ? 'text-blue-400' : 'text-purple-400';
  const borderColor = isOcean ? 'border-blue-500/20' : 'border-purple-500/20';
  const bgColor = isOcean ? 'bg-blue-500/5' : 'bg-purple-500/5';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <div>
            <span className="text-white font-bold text-sm">{isOcean ? 'Via Mare' : 'Via Aerea'}</span>
            {quote.carrier && <span className="text-slate-400 text-[10px] ml-2">— {quote.carrier}</span>}
          </div>
        </div>
        <ConfidenceBadge level={quote.confidence} />
      </div>

      {quote.total_price?.amount != null ? (
        <div className="bg-slate-800/80 rounded-lg p-3 mb-3">
          <p className="text-slate-500 text-[10px] mb-1">Prezzo totale</p>
          <p className="text-white text-2xl font-black">
            {quote.total_price.currency === 'EUR' ? '€' : '$'}{quote.total_price.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
          {quote.total_price.currency && <p className="text-slate-500 text-[10px]">{quote.total_price.currency}</p>}
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-200 text-xs">Prezzo non disponibile dalla fonte indicata</p>
        </div>
      )}

      {/* Line items */}
      {quote.line_items?.length > 0 && (
        <div className="space-y-1 mb-3">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Breakdown costi</p>
          {quote.line_items.map((li, i) => (
            <div key={i} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
              <span className="text-slate-400 text-[10px]">{li.description}</span>
              <span className="text-white text-[10px] font-semibold">
                {li.currency === 'EUR' ? '€' : '$'}{li.amount?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {quote.transit_time_days != null && (
          <div className="bg-slate-700/40 rounded-lg p-2">
            <p className="text-slate-500 text-[10px]">Transit time</p>
            <p className="text-white text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{quote.transit_time_days} giorni</p>
          </div>
        )}
        {quote.valid_until && (
          <div className="bg-slate-700/40 rounded-lg p-2">
            <p className="text-slate-500 text-[10px]">Validità</p>
            <p className="text-white text-xs font-bold">{new Date(quote.valid_until).toLocaleDateString('it-IT')}</p>
          </div>
        )}
      </div>

      {quote.provider && (
        <p className="text-slate-500 text-[10px] mt-2">Provider: <span className="text-slate-300">{quote.provider}</span></p>
      )}
      {quote.notes && <p className="text-slate-400 text-[10px] mt-1 italic">{quote.notes}</p>}

      <SourceBadge source={quote.source} />
    </div>
  );
}

function CongestionCard({ data }) {
  if (!data) return null;
  return (
    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-orange-400" />
        <span className="text-white font-bold text-sm">Rischio & Congestione Portuale</span>
        <ConfidenceBadge level={data.metrics ? 'medium' : 'unavailable'} />
      </div>
      {data.metrics ? (
        <div className="space-y-2">
          {data.metrics.congestion_level && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-slate-400 text-xs">Livello congestione</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                data.metrics.congestion_level === 'high' ? 'bg-red-500/15 text-red-400' :
                data.metrics.congestion_level === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'
              }`}>{data.metrics.congestion_level}</span>
            </div>
          )}
          {data.metrics.vessels_in_port != null && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-slate-400 text-xs">Navi in porto</span>
              <span className="text-white text-xs font-semibold">{data.metrics.vessels_in_port}</span>
            </div>
          )}
          {data.metrics.avg_waiting_time_hours != null && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-slate-400 text-xs">Attesa media</span>
              <span className="text-white text-xs font-semibold">{data.metrics.avg_waiting_time_hours}h</span>
            </div>
          )}
          {data.metrics.description && <p className="text-slate-400 text-[10px] mt-1">{data.metrics.description}</p>}
          <SourceBadge source={data.source} />
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-slate-400 text-xs">
            {data.error || 'Dati di congestione portuale non disponibili. Richiede API MarineTraffic con chiave configurata.'}
          </p>
        </div>
      )}
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
        <p className="text-slate-400 text-xs">
          {data?.message || 'Ultimo miglio non disponibile: integrazione corriere/aggregatore mancante. Richiede API contrattuale con provider di spedizioni locali.'}
        </p>
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
      {/* Header risultati */}
      <div className="bg-slate-800/60 border border-white/5 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">Risultati Quotazione Logistica</p>
            <p className="text-slate-500 text-[10px]">Request ID: {results.request_id}</p>
          </div>
          <p className="text-slate-500 text-[10px]">{new Date(results.timestamp_utc).toLocaleString('it-IT')}</p>
        </div>
      </div>

      {/* Errori globali */}
      {results.errors?.length > 0 && (
        <div className="space-y-2">
          {results.errors.map((err, i) => (
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

      {/* 1) Mare */}
      {oceanQuotes.length > 0 ? (
        <div className="space-y-3">
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-wider px-1">🚢 Quotazioni Via Mare</p>
          {oceanQuotes.map((q, i) => <QuoteCard key={i} quote={q} />)}
        </div>
      ) : (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ship className="w-5 h-5 text-blue-400" />
            <span className="text-white font-bold text-sm">Via Mare</span>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-400 text-xs">Nessuna quotazione marittima disponibile dalle API collegate.</p>
          </div>
        </div>
      )}

      {/* 2) Aereo */}
      {airQuotes.length > 0 ? (
        <div className="space-y-3">
          <p className="text-purple-400 text-[10px] font-bold uppercase tracking-wider px-1">✈️ Quotazioni Via Aerea</p>
          {airQuotes.map((q, i) => <QuoteCard key={i} quote={q} />)}
        </div>
      ) : (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-5 h-5 text-purple-400" />
            <span className="text-white font-bold text-sm">Via Aerea</span>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-400 text-xs">Tariffe aeree non disponibili: manca provider tariffe/contratto (TACT/WorldACD).</p>
          </div>
        </div>
      )}

      {/* 3) Congestione */}
      <CongestionCard data={results.port_congestion} />

      {/* 4) Ultimo Miglio */}
      <LastMileCard data={results.last_mile} />

      {/* Inputs normalizzati */}
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