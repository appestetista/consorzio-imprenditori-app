import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity } from 'lucide-react';

function formatUsd(val) {
  if (!val && val !== 0) return 'N/D';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 'N/D';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function TrendBadge({ value, label }) {
  if (value === null || value === undefined) {
    return (
      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
        <p className="text-slate-500 text-[10px] font-medium mb-1">{label}</p>
        <p className="text-slate-600 text-xs">N/D</p>
      </div>
    );
  }

  const num = parseFloat(value);
  const isPositive = num > 0;
  const isNeutral = Math.abs(num) < 1;

  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
      <p className="text-slate-500 text-[10px] font-medium mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {isNeutral ? (
          <Minus className="w-3.5 h-3.5 text-slate-400" />
        ) : isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className={`font-bold text-sm ${isNeutral ? 'text-slate-300' : isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{value}%
        </span>
      </div>
    </div>
  );
}

function formatEur(val) {
  if (!val && val !== 0) return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  if (num >= 1e9) return `€${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `€${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `€${(num / 1e3).toFixed(0)}K`;
  return `€${num.toFixed(0)}`;
}

export default function ExportMetricsCard({ mercatoData, metrics, tassoCambio }) {
  if (!mercatoData) return null;

  const volatilitaLevel = metrics?.volatilita 
    ? parseFloat(metrics.volatilita) < 15 ? 'Stabile' 
      : parseFloat(metrics.volatilita) < 30 ? 'Moderata' 
      : 'Alta'
    : null;

  const volatilitaColor = volatilitaLevel === 'Stabile' ? 'text-green-400' 
    : volatilitaLevel === 'Moderata' ? 'text-yellow-400' 
    : volatilitaLevel === 'Alta' ? 'text-red-400' 
    : 'text-slate-400';

  return (
    <div className="space-y-2">
      {/* Riga 1: Import totale + Export Italia */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <p className="text-slate-500 text-[10px] font-medium mb-1">Import totale paese</p>
          <p className="text-white font-bold text-sm">
            {metrics?.import_totale_eur ? formatEur(metrics.import_totale_eur) : mercatoData.import_totale?.valore_usd || 'N/D'}
          </p>
          {metrics?.import_totale_eur && (
            <p className="text-slate-600 text-[10px]">{mercatoData.import_totale?.valore_usd}</p>
          )}
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <p className="text-slate-500 text-[10px] font-medium mb-1">Export ITA→paese</p>
          <p className="text-white font-bold text-sm">
            {metrics?.export_italia_eur ? formatEur(metrics.export_italia_eur) : mercatoData.export_italia?.valore_usd || 'N/D'}
          </p>
          {metrics?.export_italia_eur && (
            <p className="text-slate-600 text-[10px]">{mercatoData.export_italia?.valore_usd}</p>
          )}
        </div>
      </div>

      {/* Riga 2: Metriche calcolate */}
      <div className="grid grid-cols-3 gap-2">
        <TrendBadge value={metrics?.crescita_3_anni} label="Crescita 3Y" />
        <TrendBadge value={metrics?.cagr} label="CAGR" />
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <p className="text-slate-500 text-[10px] font-medium mb-1">Volatilità</p>
          <div className="flex items-center gap-1.5">
            <Activity className={`w-3.5 h-3.5 ${volatilitaColor}`} />
            <span className={`font-bold text-sm ${volatilitaColor}`}>
              {metrics?.volatilita ? `${metrics.volatilita}%` : 'N/D'}
            </span>
          </div>
          {volatilitaLevel && (
            <p className={`text-[10px] mt-0.5 ${volatilitaColor}`}>{volatilitaLevel}</p>
          )}
        </div>
      </div>

      {/* Riga 3: Posizione + Quota */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <p className="text-slate-500 text-[10px] font-medium mb-1">Posizione esportatore</p>
          <p className="text-white font-semibold text-sm">{metrics?.posizione_exporter || mercatoData.posizione_italia || mercatoData.posizione_exporter || 'N/D'}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <p className="text-slate-500 text-[10px] font-medium mb-1">Quota esportatore</p>
          <p className="text-white font-semibold text-sm">{metrics?.quota_exporter || mercatoData.quota_italia || mercatoData.quota_exporter || 'N/D'}</p>
        </div>
      </div>

      {/* Fonti */}
      {tassoCambio && (
        <p className="text-slate-600 text-[10px]">
          💱 1 EUR = {tassoCambio.tasso} USD ({tassoCambio.fonte})
        </p>
      )}
    </div>
  );
}