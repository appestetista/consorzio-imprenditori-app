import React, { useState } from 'react';
import { Globe, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, Truck } from 'lucide-react';
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

export default function CountryInfoCard({ countryCode, countryName, macroData, metrics, isCompact = false }) {
  const [showStability, setShowStability] = useState(false);
  const flagUrl = getFlagUrl(countryCode);
  const stabilityScore = computeStabilityScore(macroData);

  if (isCompact) {
    return (
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
        {countryCode !== 'WLD' ? (
          <img src={flagUrl} alt="" className="w-8 h-5.5 object-cover rounded-sm shadow" />
        ) : (
          <Globe className="w-7 h-5 text-blue-400" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{countryName}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {macroData?.popolazione && <span className="text-slate-400 text-[10px]">👤 {formatPop(macroData.popolazione)}</span>}
            {macroData?.pil_nominale && <span className="text-slate-400 text-[10px]">💰 {formatBigNum(macroData.pil_nominale)}</span>}
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
    <div className="bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 px-4 py-3 flex items-center gap-3">
        {countryCode !== 'WLD' ? (
          <img src={flagUrl} alt="" className="w-10 h-7 object-cover rounded shadow" />
        ) : (
          <Globe className="w-8 h-6 text-blue-400" />
        )}
        <div className="flex-1">
          <p className="text-white font-bold">{countryName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-400 text-xs">{countryCode}</span>
            {stabilityScore !== null && <StabilityBadge score={stabilityScore} />}
          </div>
        </div>
        {metrics?.crescita_3_anni !== undefined && (
          <div className="text-right">
            <p className="text-slate-500 text-[10px]">Crescita 3Y</p>
            <GrowthIndicator value={metrics.crescita_3_anni} />
          </div>
        )}
      </div>

      {/* Dati macro base */}
      {macroData && (
        <div className="border-t border-slate-700">
          <div className="grid grid-cols-3 gap-0">
            <div className="px-3 py-2 border-r border-slate-700">
              <p className="text-slate-500 text-[10px]">Popolazione</p>
              <p className="text-white text-xs font-semibold">{formatPop(macroData.popolazione)}</p>
              {macroData.popolazione_anno && <p className="text-slate-600 text-[9px]">{macroData.popolazione_anno}</p>}
            </div>
            <div className="px-3 py-2 border-r border-slate-700">
              <p className="text-slate-500 text-[10px]">PIL nominale</p>
              <p className="text-white text-xs font-semibold">{formatBigNum(macroData.pil_nominale)}</p>
              {macroData.pil_nominale_anno && <p className="text-slate-600 text-[9px]">{macroData.pil_nominale_anno}</p>}
            </div>
            <div className="px-3 py-2">
              <p className="text-slate-500 text-[10px]">PIL pro capite</p>
              <p className="text-white text-xs font-semibold">{formatBigNum(macroData.pil_pro_capite)}</p>
              {macroData.pil_pro_capite_anno && <p className="text-slate-600 text-[9px]">{macroData.pil_pro_capite_anno}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Stabilità Economica — espandibile */}
      {hasStabilityData && (
        <div className="border-t border-slate-700">
          <button
            onClick={() => setShowStability(!showStability)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              {stabilityScore >= 55 ? (
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              )}
              <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                Stabilità economica & logistica
              </span>
            </div>
            {showStability ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
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
              {macroData.lpi_score !== null && (
                <MacroRow 
                  label="🚛 Logistics Performance"
                  value={`${macroData.lpi_score}/5`}
                  anno={macroData.lpi_anno}
                  style={getLPIStyle(macroData.lpi_score)}
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
              <div className="px-3 pt-1.5">
                <p className="text-slate-600 text-[9px]">Fonte: World Bank API — tutti dati ufficiali, nessuna stima</p>
              </div>
            </div>
          )}
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