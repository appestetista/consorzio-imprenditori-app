import React, { useState } from 'react';
import { Globe, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, Truck, HelpCircle, X } from 'lucide-react';
import { getFlagUrl } from './CountrySearchSelect';

function formatBigNum(val) {
  if (!val && val !== 0) return 'N/D';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 'N/D';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPop(val) {
  if (!val && val !== 0) return 'N/D';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 'N/D';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)} mld`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)} mln`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)} K`;
  return `${num}`;
}

function GrowthIndicator({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-500 text-xs">N/D</span>;
  const num = parseFloat(value);
  if (isNaN(num)) return <span className="text-slate-500 text-xs">N/D</span>;
  const isPos = num > 5;
  const isNeg = num < -2;
  return (
    <div className="flex items-center gap-1">
      {isPos ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> :
       isNeg ? <TrendingDown className="w-3.5 h-3.5 text-red-400" /> :
       <Minus className="w-3.5 h-3.5 text-yellow-400" />}
      <span className={`text-xs font-bold ${isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-yellow-400'}`}>
        {num > 0 ? '+' : ''}{value}%
      </span>
    </div>
  );
}

function getInflazioneStyle(val) {
  if (val === null || val === undefined) return null;
  if (val < 3) return { color: 'text-green-400', label: 'Stabile' };
  if (val < 6) return { color: 'text-yellow-400', label: 'Moderata' };
  if (val < 10) return { color: 'text-orange-400', label: 'Elevata' };
  return { color: 'text-red-400', label: 'Critica' };
}

function getLPIStyle(val) {
  if (val === null || val === undefined) return null;
  if (val >= 3.5) return { color: 'text-green-400', label: 'Eccellente' };
  if (val >= 3.0) return { color: 'text-lime-400', label: 'Buona' };
  if (val >= 2.5) return { color: 'text-yellow-400', label: 'Media' };
  return { color: 'text-red-400', label: 'Scarsa' };
}

function getDoingBusinessStyle(val) {
  if (val === null || val === undefined) return null;
  if (val >= 75) return { color: 'text-green-400', label: 'Favorevole' };
  if (val >= 60) return { color: 'text-lime-400', label: 'Discreto' };
  if (val >= 45) return { color: 'text-yellow-400', label: 'Medio' };
  return { color: 'text-red-400', label: 'Difficile' };
}

function getVolatilitaCambioStyle(val) {
  if (val === null || val === undefined) return null;
  if (val < 3) return { color: 'text-green-400', label: 'Stabile' };
  if (val < 8) return { color: 'text-yellow-400', label: 'Moderata' };
  if (val < 15) return { color: 'text-orange-400', label: 'Elevata' };
  return { color: 'text-red-400', label: 'Molto alta' };
}

/**
 * Calcola un punteggio sintetico di stabilità economica (0-100) basato su indicatori World Bank.
 * Nessuna AI — solo aritmetica su dati ufficiali.
 */
function computeStabilityScore(macro) {
  if (!macro) return null;
  let score = 0;
  let weight = 0;

  // Inflazione (peso 25) — <3% = 25, <6% = 18, <10% = 10, >10% = 3
  if (macro.inflazione !== null) {
    const infl = Math.abs(macro.inflazione);
    score += infl < 3 ? 25 : infl < 6 ? 18 : infl < 10 ? 10 : 3;
    weight += 25;
  }

  // Doing Business (peso 25) — score diretto normalizzato
  if (macro.doing_business_score !== null) {
    score += (macro.doing_business_score / 100) * 25;
    weight += 25;
  }

  // LPI (peso 25) — 1-5 scala, normalizzato
  if (macro.lpi_score !== null) {
    score += ((macro.lpi_score - 1) / 4) * 25;
    weight += 25;
  }

  // Volatilità cambio (peso 25) — <3% = 25, <8% = 18, <15% = 10, >15% = 3
  if (macro.volatilita_cambio !== null) {
    score += macro.volatilita_cambio < 3 ? 25 : macro.volatilita_cambio < 8 ? 18 : macro.volatilita_cambio < 15 ? 10 : 3;
    weight += 25;
  }

  if (weight === 0) return null;
  return Math.round((score / weight) * 100);
}

function StabilityBadge({ score }) {
  if (score === null) return null;
  let color, label;
  if (score >= 75) { color = 'bg-green-500/20 text-green-400 border-green-500/30'; label = 'Stabile'; }
  else if (score >= 55) { color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; label = 'Medio'; }
  else if (score >= 35) { color = 'bg-orange-500/20 text-orange-400 border-orange-500/30'; label = 'Rischio'; }
  else { color = 'bg-red-500/20 text-red-400 border-red-500/30'; label = 'Critico'; }

  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {score}/100 — {label}
    </span>
  );
}

function MacroRow({ label, value, anno, style }) {
  return (
    <div className="flex items-center justify-between py-1 px-3">
      <span className="text-slate-500 text-[10px]">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold ${style?.color || 'text-white'}`}>{value}</span>
        {style?.label && <span className={`text-[9px] ${style.color}`}>({style.label})</span>}
        {anno && <span className="text-slate-600 text-[9px]">{anno}</span>}
      </div>
    </div>
  );
}

// Benchmark LPI noti (World Bank 2023)
const LPI_BENCHMARKS = [
  { code: 'IT', name: 'Italia', lpi: 3.69 },
  { code: 'DE', name: 'Germania', lpi: 4.09 },
  { code: 'BR', name: 'Brasile', lpi: 2.95 },
];

function LPIBenchmarkBar({ countryName, countryLPI }) {
  // Combina benchmark + paese corrente
  const all = [...LPI_BENCHMARKS.filter(b => b.name !== countryName)];
  // Aggiungi il paese corrente
  if (countryLPI !== null && countryLPI !== undefined) {
    all.push({ code: '??', name: countryName, lpi: countryLPI, isCurrent: true });
  }
  all.sort((a, b) => b.lpi - a.lpi);

  return (
    <div className="space-y-1.5 mt-2">
      {all.map((item, i) => {
        const pct = Math.min(((item.lpi - 1) / 4) * 100, 100); // scala 1-5
        const color = item.isCurrent ? 'bg-amber-400' : 'bg-slate-500';
        const textColor = item.isCurrent ? 'text-amber-400 font-bold' : 'text-slate-400';
        return (
          <div key={i} className="flex items-center gap-2">
            <span className={`text-[10px] w-20 truncate ${textColor}`}>{item.name}</span>
            <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[10px] w-8 text-right ${textColor}`}>{item.lpi}</span>
          </div>
        );
      })}
      <p className="text-slate-600 text-[9px] mt-1">Scala: 1 (scarso) → 5 (eccellente) · Fonte: World Bank LPI 2023</p>
    </div>
  );
}

export default function CountryInfoCard({ countryCode, countryName, macroData, metrics, isCompact = false }) {
  const [showStability, setShowStability] = useState(true);
  const [showLPIInfo, setShowLPIInfo] = useState(false);
  const flagUrl = getFlagUrl(countryCode);
  const stabilityScore = computeStabilityScore(macroData);

  if (isCompact) {
    return (
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center gap-3">
        {countryCode !== 'WLD' ? (
          <img src={flagUrl} alt="" className="w-8 h-5.5 object-cover rounded-md shadow" />
        ) : (
          <Globe className="w-7 h-5 text-blue-400" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{countryName}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {macroData?.popolazione && <span className="text-slate-500 text-[10px]">👤 {formatPop(macroData.popolazione)}</span>}
            {macroData?.pil_nominale && <span className="text-slate-500 text-[10px]">💰 {formatBigNum(macroData.pil_nominale)}</span>}
          </div>
        </div>
        {metrics?.crescita_3_anni !== undefined && (
          <GrowthIndicator value={metrics.crescita_3_anni} />
        )}
      </div>
    );
  }

  const hasStabilityData = macroData && (
    macroData.inflazione !== null || macroData.doing_business_score !== null || 
    macroData.lpi_score !== null || macroData.volatilita_cambio !== null
  );

  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        {countryCode !== 'WLD' ? (
          <img src={flagUrl} alt="" className="w-10 h-7 object-cover rounded-md shadow" />
        ) : (
          <Globe className="w-8 h-6 text-blue-400" />
        )}
        <div className="flex-1">
          <p className="text-white font-bold text-sm">{countryName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-500 text-xs">{countryCode}</span>
            {stabilityScore !== null && <StabilityBadge score={stabilityScore} />}
          </div>
        </div>
        {metrics?.crescita_3_anni !== undefined && (
          <div className="text-right">
            <p className="text-slate-600 text-[9px]">Crescita 3Y</p>
            <GrowthIndicator value={metrics.crescita_3_anni} />
          </div>
        )}
      </div>

      {/* Dati macro base */}
      {macroData && (
        <div className="border-t border-white/5">
          <div className="grid grid-cols-3 gap-0">
            <div className="px-3 py-2.5 border-r border-white/5">
              <p className="text-slate-600 text-[9px] font-medium">Popolazione</p>
              <p className="text-white text-xs font-semibold">{formatPop(macroData.popolazione)}</p>
            </div>
            <div className="px-3 py-2.5 border-r border-white/5">
              <p className="text-slate-600 text-[9px] font-medium">PIL nominale</p>
              <p className="text-white text-xs font-semibold">{formatBigNum(macroData.pil_nominale)}</p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-slate-600 text-[9px] font-medium">PIL p.c.</p>
              <p className="text-white text-xs font-semibold">{formatBigNum(macroData.pil_pro_capite)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stabilità Economica — espandibile, aperto di default */}
      {hasStabilityData && (
        <div className="border-t border-white/5">
          <button
            onClick={() => setShowStability(!showStability)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              {stabilityScore >= 55 ? (
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              )}
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                Stabilità economica
              </span>
            </div>
            {showStability ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
          </button>
          
          {showStability && (
            <div className="pb-2 divide-y divide-slate-700/30">
              {macroData.inflazione !== null && (
                <MacroRow 
                  label="📈 Inflazione (CPI)"
                  value={`${macroData.inflazione}%`}
                  anno={macroData.inflazione_anno}
                  style={getInflazioneStyle(macroData.inflazione)}
                />
              )}
              {macroData.doing_business_score !== null && (
                <MacroRow 
                  label="🏢 Ease of Doing Business"
                  value={`${macroData.doing_business_score}/100`}
                  anno={macroData.doing_business_anno}
                  style={getDoingBusinessStyle(macroData.doing_business_score)}
                />
              )}
              {macroData.volatilita_cambio !== null && (
                <MacroRow 
                  label="💱 Volatilità cambio"
                  value={`${macroData.volatilita_cambio}%`}
                  style={getVolatilitaCambioStyle(macroData.volatilita_cambio)}
                />
              )}
              {macroData.partite_correnti_usd !== null && (
                <MacroRow 
                  label="⚖️ Saldo partite correnti"
                  value={formatBigNum(macroData.partite_correnti_usd)}
                  anno={macroData.partite_correnti_anno}
                  style={macroData.partite_correnti_usd < 0 ? { color: 'text-red-400' } : { color: 'text-green-400' }}
                />
              )}

              {/* Indici di Performance Logistica (LPI) con benchmark */}
              {macroData.lpi_score !== null && (
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider">Indici di Performance Logistica</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowLPIInfo(true); }}
                      className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center hover:border-blue-400 transition-colors ml-0.5">
                      <span className="text-slate-400 text-[9px] font-bold leading-none">?</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-bold">{macroData.lpi_score}/5</span>
                    <span className={`text-[10px] font-semibold ${getLPIStyle(macroData.lpi_score)?.color || 'text-white'}`}>
                      {getLPIStyle(macroData.lpi_score)?.label || ''} {macroData.lpi_anno && `(${macroData.lpi_anno})`}
                    </span>
                  </div>
                  <LPIBenchmarkBar countryName={countryName} countryLPI={macroData.lpi_score} />
                </div>
              )}

              <div className="px-3 pt-1.5">
                <p className="text-slate-600 text-[9px]">Fonte: World Bank API — tutti dati ufficiali, nessuna stima</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popup LPI Info */}
      {showLPIInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowLPIInfo(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Logistics Performance Index (LPI)</h3>
              <button onClick={() => setShowLPIInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <p>
                L'<strong className="text-white">LPI</strong> è un indice della <strong className="text-white">World Bank</strong> che misura l'efficienza logistica di un paese su una scala da <strong className="text-blue-400">1</strong> (peggiore) a <strong className="text-blue-400">5</strong> (migliore).
              </p>
              <p>Valuta 6 dimensioni chiave:</p>
              <ul className="space-y-1 text-slate-400">
                <li>🏛️ <strong className="text-slate-300">Dogane</strong> — efficienza sdoganamento</li>
                <li>🛣️ <strong className="text-slate-300">Infrastrutture</strong> — qualità trasporti e IT</li>
                <li>📦 <strong className="text-slate-300">Spedizioni internazionali</strong> — facilità di organizzazione</li>
                <li>🏅 <strong className="text-slate-300">Competenza logistica</strong> — qualità operatori</li>
                <li>📍 <strong className="text-slate-300">Tracciabilità</strong> — tracking spedizioni</li>
                <li>⏱️ <strong className="text-slate-300">Puntualità</strong> — rispetto dei tempi</li>
              </ul>
              <div className="bg-slate-800 rounded-lg p-3 mt-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Come leggere il punteggio</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-green-400">≥ 3.5</span><span className="text-slate-400">Eccellente (top performer)</span></div>
                  <div className="flex justify-between"><span className="text-lime-400">3.0 – 3.4</span><span className="text-slate-400">Buona</span></div>
                  <div className="flex justify-between"><span className="text-yellow-400">2.5 – 2.9</span><span className="text-slate-400">Media</span></div>
                  <div className="flex justify-between"><span className="text-red-400">&lt; 2.5</span><span className="text-slate-400">Scarsa (rischi logistici)</span></div>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Fonte: World Bank Logistics Performance Index 2023</p>
            </div>
          </div>
        </div>
      )}

      {macroData?.dati_mancanti && (
        <div className="px-3 py-1.5 border-t border-slate-700/50">
          <p className="text-yellow-400/70 text-[9px]">⚠ Non disponibili: {macroData.dati_mancanti.join(', ')}</p>
        </div>
      )}

      {/* Dati commerciali */}
      {metrics && (
        <div className="grid grid-cols-2 gap-0 border-t border-slate-700">
          <div className="px-3 py-2 border-r border-slate-700">
            <p className="text-slate-500 text-[10px]">Import totale HS</p>
            <p className="text-white text-xs font-semibold">
              {metrics.import_totale_eur ? `€${(metrics.import_totale_eur >= 1e6 ? (metrics.import_totale_eur / 1e6).toFixed(1) + 'M' : metrics.import_totale_eur >= 1e3 ? (metrics.import_totale_eur / 1e3).toFixed(0) + 'K' : metrics.import_totale_eur)}` : 'N/D'}
            </p>
          </div>
          <div className="px-3 py-2">
            <p className="text-slate-500 text-[10px]">Ranking import</p>
            <p className="text-white text-xs font-semibold">{metrics.ranking_import || 'N/D'}</p>
          </div>
        </div>
      )}

      {!macroData && (
        <div className="px-3 py-1 border-t border-slate-700/50">
          <p className="text-slate-600 text-[9px]">Fonte: World Bank API</p>
        </div>
      )}
    </div>
  );
}