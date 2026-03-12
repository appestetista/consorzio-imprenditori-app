import React from 'react';

const formatEuro = (n) => {
  if (n === undefined || n === null || isNaN(n)) return '€0';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

export default function ResultHero({ result, features, forma }) {
  const isSocPers = ['SNC', 'SAS', 'SS'].includes(forma);
  const isCoop = forma === 'COOP';
  
  let heroLabel = 'Il tuo reddito netto annuo reale';
  let heroSubLabel = '💰 IN TASCA AL SOCIO';
  
  if (isSocPers) {
    heroLabel = `Netto in tasca al socio (quota ${(100 / (result.numSoci || 2)).toFixed(0)}%)`;
    heroSubLabel = '💰 NETTO SOCIO';
  }
  if (isCoop) {
    heroLabel = 'Utile netto disponibile per la cooperativa';
    heroSubLabel = '🏢 UTILE NETTO COOP';
  }

  return (
    <div className="bg-gradient-to-br from-[#0b1e33] to-[#0a2540] border-2 border-emerald-500/30 rounded-2xl p-5 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
      <p className="text-slate-400 text-xs mb-1">{heroLabel}</p>
      <p className="text-emerald-400 font-black text-4xl tracking-tight">
        {formatEuro(result.inTascaSocio)}
      </p>
      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
        <span className="text-slate-400 text-xs">{formatEuro(Math.round(result.inTascaSocio / 12))}/mese</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400 text-xs">
          Pressione fiscale <strong className="text-white">{result.pressioneFiscale.toFixed(1)}%</strong>
        </span>
      </div>
      <div className="mt-3 inline-flex items-center gap-2 bg-emerald-900/40 border border-emerald-500/30 px-4 py-1.5 rounded-full">
        <span className="text-emerald-400 text-xs font-bold">{heroSubLabel}</span>
        <span className="text-white font-black text-lg">{formatEuro(result.inTascaSocio)}</span>
      </div>
    </div>
  );
}