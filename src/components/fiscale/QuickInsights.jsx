import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const formatEuro = (n) => {
  if (!n || isNaN(n)) return '€0';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

export default function QuickInsights({ result, resultPlus50k, resultPlusCosti, features }) {
  const deltaNetto50k = resultPlus50k.inTascaSocio - result.inTascaSocio;
  const deltaCosti = resultPlusCosti.inTascaSocio - result.inTascaSocio;

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-xl p-3.5">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400 text-[10px] font-semibold uppercase">Se fatturi +€50k...</span>
        </div>
        <p className={`font-bold text-lg ${deltaNetto50k >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {deltaNetto50k >= 0 ? '+' : ''}{formatEuro(deltaNetto50k)}
        </p>
        <p className="text-slate-500 text-[10px] mt-1">In tasca in più</p>
      </div>
      <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-xl p-3.5">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          <span className="text-slate-400 text-[10px] font-semibold uppercase">+€1.000 costi...</span>
        </div>
        <p className={`font-bold text-lg ${deltaCosti <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
          {deltaCosti >= 0 ? '+' : ''}{formatEuro(deltaCosti)}
        </p>
        <p className="text-slate-500 text-[10px] mt-1">
          {deltaCosti < 0 ? 'Riduci il netto in tasca' : 'Risparmio fiscale netto'}
        </p>
      </div>
    </div>
  );
}