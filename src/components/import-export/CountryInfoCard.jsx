import React from 'react';
import { Globe, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

export default function CountryInfoCard({ countryCode, countryName, macroData, metrics, isCompact = false }) {
  const flagUrl = getFlagUrl(countryCode);

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
          <p className="text-slate-400 text-xs">{countryCode}</p>
        </div>
        {metrics?.crescita_3_anni !== undefined && (
          <div className="text-right">
            <p className="text-slate-500 text-[10px]">Crescita 3Y</p>
            <GrowthIndicator value={metrics.crescita_3_anni} />
          </div>
        )}
      </div>

      {/* Dati macro World Bank */}
      {macroData && (
        <div className="grid grid-cols-3 gap-0 border-t border-slate-700">
          <div className="px-3 py-2 border-r border-slate-700">
            <p className="text-slate-500 text-[10px]">Popolazione</p>
            <p className="text-white text-xs font-semibold">{formatPop(macroData.popolazione)}</p>
          </div>
          <div className="px-3 py-2 border-r border-slate-700">
            <p className="text-slate-500 text-[10px]">PIL nominale</p>
            <p className="text-white text-xs font-semibold">{formatBigNum(macroData.pil_nominale)}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-slate-500 text-[10px]">PIL pro capite</p>
            <p className="text-white text-xs font-semibold">{formatBigNum(macroData.pil_pro_capite)}</p>
          </div>
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
    </div>
  );
}