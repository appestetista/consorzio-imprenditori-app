import React, { useState } from 'react';
import { Globe, TrendingUp, TrendingDown, Minus, ShieldCheck, ShieldAlert, Truck, X } from 'lucide-react';
import { getFlagUrl } from './CountrySearchSelect';
import CountryRiskProfileCard from './CountryRiskProfileCard';

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
    <div className="flex items-center justify-between py-1.5 px-3">
      <span className="text-slate-400 text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold ${style?.color || 'text-white'}`}>{value}</span>
        {style?.label && <span className={`text-[10px] ${style.color}`}>({style.label})</span>}
        {anno && <span className="text-slate-500 text-[10px]">{anno}</span>}
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
  const [showLPIInfo, setShowLPIInfo] = useState(false);
  const [showVolatilitaInfo, setShowVolatilitaInfo] = useState(false);
  const [showInflazioneInfo, setShowInflazioneInfo] = useState(false);
  const [showDoingBusinessInfo, setShowDoingBusinessInfo] = useState(false);
  const [showPartiteCorrentiInfo, setShowPartiteCorrentiInfo] = useState(false);
  const [showStabilitaInfo, setShowStabilitaInfo] = useState(false);
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
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-white/5">
        {countryCode !== 'WLD' ? (
          <img src={flagUrl} alt="" className="w-12 h-8 object-cover rounded-md shadow" />
        ) : (
          <Globe className="w-10 h-7 text-blue-400" />
        )}
        <div className="flex-1">
          <p className="text-white font-bold text-base">{countryName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-400 text-sm">{countryCode}</span>
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
        <div className="border-t border-white/5">
          <div className="grid grid-cols-3 gap-0">
            <div className="px-3 py-2.5 border-r border-white/5">
              <p className="text-slate-400 text-[10px] font-medium">Popolazione</p>
              <p className="text-white text-sm font-semibold">{formatPop(macroData.popolazione)}</p>
              <p className="text-amber-400/70 text-[9px] font-medium mt-0.5">{macroData.popolazione_anno ? `Anno ${macroData.popolazione_anno}` : 'Anno N/D'}</p>
            </div>
            <div className="px-3 py-2.5 border-r border-white/5">
              <p className="text-slate-400 text-[10px] font-medium">PIL nominale</p>
              <p className="text-white text-sm font-semibold">{formatBigNum(macroData.pil_nominale)}</p>
              <p className="text-amber-400/70 text-[9px] font-medium mt-0.5">{macroData.pil_nominale_anno ? `Anno ${macroData.pil_nominale_anno}` : 'Anno N/D'}</p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-slate-400 text-[10px] font-medium">PIL p.c.</p>
              <p className="text-white text-sm font-semibold">{formatBigNum(macroData.pil_pro_capite)}</p>
              <p className="text-amber-400/70 text-[9px] font-medium mt-0.5">{macroData.pil_pro_capite_anno ? `Anno ${macroData.pil_pro_capite_anno}` : 'Anno N/D'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stabilità Economica — sempre aperto */}
      {hasStabilityData && (
        <div className="border-t border-white/5">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              {stabilityScore >= 55 ? (
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              )}
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                Stabilità economica
              </span>
              <button onClick={(e) => { e.stopPropagation(); setShowStabilitaInfo(true); }}
              className="w-5 h-5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors">
              <span className="text-white text-[10px] font-bold leading-none">?</span>
              </button>
            </div>
          </div>
          
            <div className="pb-2 divide-y divide-slate-700/30">
              {macroData.inflazione !== null && (
                <div className="flex items-center justify-between py-1.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-xs">📈 Inflazione (CPI)</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowInflazioneInfo(true); }}
                      className="w-5 h-5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors">
                      <span className="text-white text-[10px] font-bold leading-none">?</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold ${getInflazioneStyle(macroData.inflazione)?.color || 'text-white'}`}>{macroData.inflazione}%</span>
                    {getInflazioneStyle(macroData.inflazione)?.label && <span className={`text-[10px] ${getInflazioneStyle(macroData.inflazione).color}`}>({getInflazioneStyle(macroData.inflazione).label})</span>}
                    {macroData.inflazione_anno && <span className="text-slate-500 text-[10px]">{macroData.inflazione_anno}</span>}
                  </div>
                </div>
              )}
              {macroData.doing_business_score !== null && (
                <div className="flex items-center justify-between py-1.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-xs">🏢 Doing Business</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowDoingBusinessInfo(true); }}
                      className="w-5 h-5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors">
                      <span className="text-white text-[10px] font-bold leading-none">?</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold ${getDoingBusinessStyle(macroData.doing_business_score)?.color || 'text-white'}`}>{macroData.doing_business_score}/100</span>
                    {getDoingBusinessStyle(macroData.doing_business_score)?.label && <span className={`text-[10px] ${getDoingBusinessStyle(macroData.doing_business_score).color}`}>({getDoingBusinessStyle(macroData.doing_business_score).label})</span>}
                    {macroData.doing_business_anno && <span className="text-slate-500 text-[10px]">{macroData.doing_business_anno}</span>}
                  </div>
                </div>
              )}
              {/* Volatilità cambio BCE con ? info */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">💱 Volatilità cambio EUR/{macroData.volatilita_valuta || '?'}</span>
                  <button onClick={(e) => { e.stopPropagation(); setShowVolatilitaInfo(true); }}
                   className="w-5 h-5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors">
                   <span className="text-white text-[10px] font-bold leading-none">?</span>
                  </button>
                </div>
                {macroData.volatilita_cambio !== null && macroData.volatilita_cambio !== undefined ? (
                  <div className="space-y-1.5">
                    {/* Riga 1: volatilità 3 anni */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">3 anni (annualizzata)</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${getVolatilitaCambioStyle(macroData.volatilita_cambio)?.color || 'text-white'}`}>
                          {macroData.volatilita_cambio}%
                        </span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                          macroData.volatilita_livello === 'bassa' ? 'bg-green-500/15 text-green-400' :
                          macroData.volatilita_livello === 'media' ? 'bg-yellow-500/15 text-yellow-400' :
                          macroData.volatilita_livello === 'alta' ? 'bg-orange-500/15 text-orange-400' :
                          macroData.volatilita_livello === 'molto_alta' ? 'bg-red-500/15 text-red-400' :
                          macroData.volatilita_livello === 'nessuna' ? 'bg-green-500/15 text-green-400' :
                          'bg-slate-500/15 text-slate-400'
                        }`}>
                          {macroData.volatilita_livello === 'nessuna' ? 'Stessa valuta' : 
                           macroData.volatilita_livello === 'bassa' ? 'Bassa' :
                           macroData.volatilita_livello === 'media' ? 'Media' :
                           macroData.volatilita_livello === 'alta' ? 'Alta' :
                           macroData.volatilita_livello === 'molto_alta' ? 'Molto alta' : macroData.volatilita_livello}
                        </span>
                      </div>
                    </div>
                    {/* Riga 2: volatilità recente 6 mesi */}
                    {macroData.volatilita_cambio_recente !== null && macroData.volatilita_cambio_recente !== undefined && macroData.volatilita_livello !== 'nessuna' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Ultimi 6 mesi</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${getVolatilitaCambioStyle(macroData.volatilita_cambio_recente)?.color || 'text-white'}`}>
                            {macroData.volatilita_cambio_recente}%
                          </span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                            macroData.volatilita_livello_recente === 'bassa' ? 'bg-green-500/15 text-green-400' :
                            macroData.volatilita_livello_recente === 'media' ? 'bg-yellow-500/15 text-yellow-400' :
                            macroData.volatilita_livello_recente === 'alta' ? 'bg-orange-500/15 text-orange-400' :
                            macroData.volatilita_livello_recente === 'molto_alta' ? 'bg-red-500/15 text-red-400' :
                            'bg-slate-500/15 text-slate-400'
                          }`}>
                            {macroData.volatilita_livello_recente === 'bassa' ? 'Bassa' :
                             macroData.volatilita_livello_recente === 'media' ? 'Media' :
                             macroData.volatilita_livello_recente === 'alta' ? 'Alta' :
                             macroData.volatilita_livello_recente === 'molto_alta' ? 'Molto alta' : macroData.volatilita_livello_recente}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Riga 3: trend */}
                    {macroData.volatilita_trend && macroData.volatilita_trend !== 'non_disponibile' && macroData.volatilita_livello !== 'nessuna' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[10px]">Trend</span>
                        <span className={`text-[10px] font-medium ${
                          macroData.volatilita_trend === 'in_aumento' ? 'text-red-400' :
                          macroData.volatilita_trend === 'in_calo' ? 'text-green-400' : 'text-slate-400'
                        }`}>
                          {macroData.volatilita_trend === 'in_aumento' ? '↗ In aumento' :
                           macroData.volatilita_trend === 'in_calo' ? '↘ In calo' : '→ Stabile'}
                        </span>
                      </div>
                    )}
                    {/* Tasso corrente */}
                    {macroData.volatilita_tasso_corrente && macroData.volatilita_livello !== 'nessuna' && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-slate-500 text-[10px]">Tasso corrente</span>
                        <span className="text-white text-[10px] font-mono">1 EUR = {macroData.volatilita_tasso_corrente} {macroData.volatilita_valuta}</span>
                      </div>
                    )}
                    {/* Fonte */}
                    {macroData.volatilita_cambio_fonte && (
                      <p className="text-slate-600 text-[9px]">{macroData.volatilita_cambio_fonte}{macroData.volatilita_periodo ? ` · ${macroData.volatilita_periodo}` : ''}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-500 text-xs italic">Non disponibile per questa valuta</span>
                    {macroData.volatilita_cambio_fonte && <p className="text-slate-600 text-[9px] mt-0.5">{macroData.volatilita_cambio_fonte}</p>}
                  </div>
                )}
              </div>
              {macroData.partite_correnti_usd !== null && macroData.partite_correnti_usd !== undefined && (
                <div className="flex items-center justify-between py-1.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-xs">⚖️ Saldo partite correnti</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowPartiteCorrentiInfo(true); }}
                      className="w-5 h-5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors">
                      <span className="text-white text-[10px] font-bold leading-none">?</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const raw = macroData.partite_correnti_usd;
                      const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.\-]/g, ''));
                      if (isNaN(num)) return <span className="text-slate-500 text-sm">N/D</span>;
                      const mld = num / 1e9;
                      const isNeg = mld < 0;
                      const abs = Math.abs(mld);
                      // Formatta con 1 decimale, separatore europeo
                      const parts = abs.toFixed(1).split('.');
                      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                      const formatted = `${intPart},${parts[1]}`;
                      const sign = isNeg ? '−' : '';
                      const label = isNeg ? '(deficit)' : '(surplus)';
                      const color = isNeg ? 'text-red-400' : 'text-green-400';
                      return (
                        <>
                          <span className={`text-sm font-semibold ${color}`}>
                            {sign}{formatted} mld USD
                          </span>
                          <span className={`text-[10px] font-medium ${color}`}>{label}</span>
                        </>
                      );
                    })()}
                    {macroData.partite_correnti_anno && <span className="text-slate-500 text-[10px]">{macroData.partite_correnti_anno}</span>}
                  </div>
                </div>
              )}

              {/* Indici di Performance Logistica (LPI) con benchmark */}
              {macroData.lpi_score !== null && (
                <div className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider">Indici di Performance Logistica</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowLPIInfo(true); }}
                      className="w-5 h-5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors ml-0.5">
                      <span className="text-white text-[10px] font-bold leading-none">?</span>
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
                <p className="text-slate-600 text-[9px]">Fonti: World Bank API + BCE — tutti dati ufficiali, nessuna stima</p>
              </div>
            </div>
        </div>
      )}

      {/* Profilo Rischio Paese — subito dopo Stabilità Economica */}
      {macroData?.risk_profile && typeof macroData.risk_profile === 'object' && (
        <div className="border-t border-white/5">
          <CountryRiskProfileCard data={macroData.risk_profile} loading={false} />
        </div>
      )}

      {/* Popup Volatilità Cambio Info */}
      {showVolatilitaInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 overflow-y-auto" onClick={() => setShowVolatilitaInfo(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Volatilità del Cambio</h3>
              <button onClick={() => setShowVolatilitaInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-2">
                <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cos'è e perché è importante per l'export</p>
                <p className="text-slate-300 text-xs">La volatilità del cambio indica quanto il tasso EUR/valuta locale oscilla nel tempo. <strong className="text-white">Per chi esporta</strong>, una volatilità alta significa che i margini di profitto possono variare in modo imprevedibile: il prezzo pattuito oggi potrebbe valere molto di più o molto di meno domani. Monitorarla ti aiuta a decidere se proteggerti con coperture finanziarie o clausole contrattuali.</p>
              </div>
              <p>
                Calcolata sui <strong className="text-amber-400">tassi giornalieri BCE</strong> (Banca Centrale Europea), usando la <strong className="text-white">volatilità annualizzata</strong> dei rendimenti logaritmici giornalieri (formula standard: σ × √252).
              </p>
              <p className="text-slate-400">
                Mostriamo due orizzonti: <strong className="text-white">3 anni</strong> (visione strutturale) e <strong className="text-white">6 mesi</strong> (situazione attuale). Il confronto tra i due indica se il rischio sta aumentando o diminuendo.
              </p>
              <div className="bg-slate-800 rounded-lg p-3 mt-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Come leggere il valore</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-green-400">&lt; 4%</span><span className="text-slate-400">Bassa (rischio minimo)</span></div>
                  <div className="flex justify-between"><span className="text-yellow-400">4% – 8%</span><span className="text-slate-400">Media (monitorare)</span></div>
                  <div className="flex justify-between"><span className="text-orange-400">8% – 15%</span><span className="text-slate-400">Alta (copertura consigliata)</span></div>
                  <div className="flex justify-between"><span className="text-red-400">&gt; 15%</span><span className="text-slate-400">Molto alta (rischio critico)</span></div>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 mt-3">
                <p className="text-blue-400 text-[10px] font-bold mb-1">📊 Trend</p>
                <ul className="text-slate-400 text-[10px] space-y-0.5">
                  <li><strong className="text-red-400">↗ In aumento</strong> — la volatilità recente è &gt;30% superiore alla media 3 anni</li>
                  <li><strong className="text-green-400">↘ In calo</strong> — la volatilità recente è &lt;30% inferiore alla media 3 anni</li>
                  <li><strong className="text-slate-300">→ Stabile</strong> — il rischio cambio è costante</li>
                </ul>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-3">
                <p className="text-amber-400 text-[10px] font-bold mb-1">💡 Cosa fare se è alta?</p>
                <ul className="text-slate-400 text-[10px] space-y-0.5">
                  <li>• Fatturare in EUR anziché valuta locale</li>
                  <li>• Usare coperture forward (hedging)</li>
                  <li>• Inserire clausole di revisione prezzo</li>
                  <li>• Preferire pagamenti anticipati o L/C</li>
                </ul>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Fonte: BCE — Euro foreign exchange reference rates (tassi giornalieri)</p>
            </div>
          </div>
        </div>
      )}

      {/* Popup Inflazione Info */}
      {showInflazioneInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 overflow-y-auto" onClick={() => setShowInflazioneInfo(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Inflazione (CPI)</h3>
              <button onClick={() => setShowInflazioneInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-2">
                <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cos'è e perché è importante per l'export</p>
                <p className="text-slate-300 text-xs">L'inflazione (CPI - Consumer Price Index) misura l'aumento medio dei prezzi al consumo in un paese. <strong className="text-white">Per chi esporta</strong>, un'inflazione alta nel paese target significa che i consumatori perdono potere d'acquisto, riducendo la domanda di beni importati. Inoltre può causare instabilità dei prezzi e svalutazione della valuta locale, complicando la pianificazione dei margini.</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Come leggere il valore</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-green-400">&lt; 3%</span><span className="text-slate-400">Stabile (situazione ideale)</span></div>
                  <div className="flex justify-between"><span className="text-yellow-400">3% – 6%</span><span className="text-slate-400">Moderata (monitorare)</span></div>
                  <div className="flex justify-between"><span className="text-orange-400">6% – 10%</span><span className="text-slate-400">Elevata (rischio prezzi)</span></div>
                  <div className="flex justify-between"><span className="text-red-400">&gt; 10%</span><span className="text-slate-400">Critica (forte rischio)</span></div>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Fonte: World Bank API</p>
            </div>
          </div>
        </div>
      )}

      {/* Popup Doing Business Info */}
      {showDoingBusinessInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 overflow-y-auto" onClick={() => setShowDoingBusinessInfo(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Ease of Doing Business</h3>
              <button onClick={() => setShowDoingBusinessInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-2">
                <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cos'è e perché è importante per l'export</p>
                <p className="text-slate-300 text-xs">L'indice Ease of Doing Business (World Bank) misura quanto è facile fare impresa in un paese: burocrazia, tempi di apertura attività, accesso al credito, protezione degli investitori. <strong className="text-white">Per chi esporta</strong>, un punteggio alto indica che trovare partner locali, aprire filiali o gestire contratti sarà più semplice e prevedibile.</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Come leggere il valore</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-green-400">≥ 75</span><span className="text-slate-400">Favorevole</span></div>
                  <div className="flex justify-between"><span className="text-lime-400">60 – 74</span><span className="text-slate-400">Discreto</span></div>
                  <div className="flex justify-between"><span className="text-yellow-400">45 – 59</span><span className="text-slate-400">Medio</span></div>
                  <div className="flex justify-between"><span className="text-red-400">&lt; 45</span><span className="text-slate-400">Difficile</span></div>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Fonte: World Bank — Ease of Doing Business</p>
            </div>
          </div>
        </div>
      )}

      {/* Popup Partite Correnti Info */}
      {showPartiteCorrentiInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 overflow-y-auto" onClick={() => setShowPartiteCorrentiInfo(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Saldo Partite Correnti</h3>
              <button onClick={() => setShowPartiteCorrentiInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-2">
                <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cos'è e perché è importante per l'export</p>
                <p className="text-slate-300 text-xs">Il saldo delle partite correnti indica la differenza tra ciò che un paese esporta e ciò che importa (beni, servizi, redditi). <strong className="text-white">Per chi esporta</strong>, un saldo fortemente negativo significa che il paese importa molto — potenzialmente un buon mercato per i tuoi prodotti. Tuttavia, deficit persistenti possono portare a svalutazione della valuta e restrizioni commerciali.</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Come leggere il valore</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-green-400">Positivo</span><span className="text-slate-400">Paese esportatore netto</span></div>
                  <div className="flex justify-between"><span className="text-red-400">Negativo</span><span className="text-slate-400">Paese importatore netto (opportunità)</span></div>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Fonte: World Bank API</p>
            </div>
          </div>
        </div>
      )}

      {/* Popup Stabilità Economica Info */}
      {showStabilitaInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 overflow-y-auto" onClick={() => setShowStabilitaInfo(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Stabilità Economica</h3>
              <button onClick={() => setShowStabilitaInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-2">
                <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cos'è e perché è importante per l'export</p>
                <p className="text-slate-300 text-xs">La sezione Stabilità Economica raggruppa i principali indicatori macroeconomici che influenzano il rischio di esportare in un mercato. <strong className="text-white">Per chi esporta</strong>, questi dati aiutano a valutare se il paese è economicamente stabile, se la valuta è affidabile, se è facile fare affari e se la logistica funziona.</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Indicatori inclusi</p>
                <div className="space-y-1.5 text-[11px]">
                  <div><strong className="text-white">Inflazione (CPI)</strong> — aumento prezzi al consumo</div>
                  <div><strong className="text-white">Doing Business</strong> — facilità di fare impresa</div>
                  <div><strong className="text-white">Volatilità Cambio</strong> — rischio valutario</div>
                  <div><strong className="text-white">Partite Correnti</strong> — bilancia commerciale</div>
                  <div><strong className="text-white">LPI</strong> — efficienza logistica</div>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Fonti: World Bank API + BCE</p>
            </div>
          </div>
        </div>
      )}

      {/* Popup LPI Info */}
      {showLPIInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 overflow-y-auto" onClick={() => setShowLPIInfo(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Logistics Performance Index (LPI)</h3>
              <button onClick={() => setShowLPIInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 mb-2">
                <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cos'è e perché è importante per l'export</p>
                <p className="text-slate-300 text-xs">L'LPI misura quanto è efficiente la logistica di un paese: dogane, infrastrutture, spedizioni e puntualità. <strong className="text-white">Per chi esporta</strong>, un LPI alto significa che le merci arriveranno in tempo, con meno burocrazia e costi di trasporto più prevedibili. Un LPI basso indica possibili ritardi, costi extra e rischi operativi.</p>
              </div>
              <p>
                Indice della <strong className="text-white">World Bank</strong> su scala da <strong className="text-blue-400">1</strong> (peggiore) a <strong className="text-blue-400">5</strong> (migliore).
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



      {!macroData && (
        <div className="px-3 py-1 border-t border-slate-700/50">
          <p className="text-slate-600 text-[9px]">Fonte: World Bank API</p>
        </div>
      )}
    </div>
  );
}