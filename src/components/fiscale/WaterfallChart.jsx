import React from 'react';

const formatEuro = (n) => {
  if (!n || isNaN(n)) return '€0';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

// Singola barra della cascata
function WaterfallBar({ label, value, maxValue, color, isPositive }) {
  const perc = maxValue > 0 ? Math.min((Math.abs(value) / maxValue) * 100, 100) : 0;
  const colorMap = {
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-sky-500',
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-400',
  };
  const bgClass = colorMap[color] || 'bg-slate-500';

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-[110px] flex-shrink-0">
        <p className="text-slate-400 text-[11px] leading-tight">{label}</p>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-7 bg-slate-800/50 rounded-md overflow-hidden relative">
          <div
            className={`h-full ${bgClass} rounded-md transition-all duration-500 flex items-center justify-end pr-2`}
            style={{ width: `${Math.max(perc, 8)}%` }}
          >
            <span className="text-white text-[11px] font-bold whitespace-nowrap drop-shadow">
              {formatEuro(value)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaterfallChart({ result, features }) {
  const items = [];
  const maxVal = result.fatturato || 1;

  items.push({ label: 'Fatturato', value: result.fatturato, color: 'green' });

  if (features.hasCosti && result.costi > 0) {
    items.push({ label: 'Costi operativi', value: -result.costi, color: 'orange' });
  }

  if (features.hasCompenso && result.compensoAmm > 0) {
    items.push({ label: 'Compenso Amm.re', value: -result.compensoAmm, color: 'blue' });
  }

  if (result.tipo === 'capitale') {
    if (result.irap > 0) items.push({ label: `IRAP (3.9%)`, value: -result.irap, color: 'red' });
    if (result.ires > 0) items.push({ label: `IRES (24%)`, value: -result.ires, color: 'red' });
    if (result.irpefAmm > 0) items.push({ label: 'IRPEF Amm.', value: -result.irpefAmm, color: 'red' });
    if (result.inpsAmm > 0) items.push({ label: 'INPS Amm.', value: -result.inpsAmm, color: 'yellow' });
    if (result.impostaDividendi > 0) items.push({ label: 'Ritenuta dividendi (26%)', value: -result.impostaDividendi, color: 'violet' });
    if (result.utileRitenuto > 0) items.push({ label: 'Utile trattenuto', value: -result.utileRitenuto, color: 'orange' });
  }

  if (result.tipo === 'forfettario') {
    if (result.imposta > 0) items.push({ label: `Imposta sost. (${(result.aliquota*100).toFixed(0)}%)`, value: -result.imposta, color: 'red' });
    if (result.inps > 0) items.push({ label: 'INPS', value: -result.inps, color: 'yellow' });
  }

  if (result.tipo === 'personale') {
    if (result.irap > 0) items.push({ label: 'IRAP', value: -result.irap, color: 'red' });
    if (result.irpefAmm > 0) items.push({ label: 'IRPEF', value: -result.irpefAmm, color: 'red' });
    if (result.inpsAmm > 0) items.push({ label: 'INPS', value: -result.inpsAmm, color: 'yellow' });
  }

  items.push({ label: '💰 In tasca', value: result.inTascaSocio, color: 'emerald' });

  return (
    <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">CASCATA: DOVE VANNO I TUOI SOLDI</h3>
        <button className="text-[#d4af37] text-[10px] font-semibold hover:underline">Inserisci dettaglio</button>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <WaterfallBar
            key={i}
            label={item.label}
            value={Math.abs(item.value)}
            maxValue={maxVal}
            color={item.color}
          />
        ))}
      </div>
    </div>
  );
}