import React from 'react';

const formatEuro = (n) => {
  if (!n || isNaN(n)) return '€0';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

function WaterfallBar({ label, value, maxValue, color }) {
  const perc = maxValue > 0 ? Math.min((Math.abs(value) / maxValue) * 100, 100) : 0;
  const colorMap = {
    green: 'bg-emerald-500', red: 'bg-red-500', orange: 'bg-orange-500',
    yellow: 'bg-yellow-500', blue: 'bg-sky-500', violet: 'bg-violet-500',
    emerald: 'bg-emerald-400', slate: 'bg-slate-500',
  };
  return (
    <div className="flex items-center gap-2 py-1.5 min-w-0 w-full overflow-hidden">
      <div className="w-[100px] flex-shrink-0">
        <p className="text-slate-400 text-[11px] leading-tight truncate">{label}</p>
      </div>
      <div className="flex-1 min-w-0 h-7 bg-slate-800/50 rounded-md overflow-hidden relative">
        <div
          className={`h-full ${colorMap[color] || 'bg-slate-500'} rounded-md transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(perc, 12)}%` }}
        >
          <span className="text-white text-[10px] font-bold whitespace-nowrap drop-shadow">{formatEuro(value)}</span>
        </div>
      </div>
    </div>
  );
}

export default function WaterfallChart({ result, features }) {
  const items = [];
  const maxVal = result.fatturato || 1;

  items.push({ label: 'Fatturato', value: result.fatturato, color: 'green' });

  if (features.hasCosti && (result.costiOperativi || result.costi) > 0) {
    items.push({ label: 'Costi operativi', value: result.costiOperativi || result.costi, color: 'orange' });
  }

  if (result.tipo === 'capitale') {
    if (result.compensoAmm > 0) items.push({ label: 'Compenso Amm.re', value: result.compensoAmm, color: 'blue' });
    if (result.inpsGS?.quotaAzienda > 0) items.push({ label: 'INPS GS (az.)', value: result.inpsGS.quotaAzienda, color: 'yellow' });
    if (result.irap > 0) items.push({ label: 'IRAP (3.9%)', value: result.irap, color: 'red' });
    if (result.ires > 0) items.push({ label: 'IRES (24%)', value: result.ires, color: 'red' });
    if (result.totaleIrpefAmm > 0) items.push({ label: 'IRPEF + add. Amm.', value: result.totaleIrpefAmm, color: 'red' });
    if (result.inpsGS?.quotaAmministratore > 0) items.push({ label: 'INPS GS (amm.)', value: result.inpsGS.quotaAmministratore, color: 'yellow' });
    if (result.ritenutaDividendi > 0 || result.impostaDividendi > 0) {
      items.push({ label: 'Ritenuta dividendi', value: result.ritenutaDividendi || result.impostaDividendi, color: 'violet' });
    }
    if (result.utileRitenuto > 0) items.push({ label: 'Utile trattenuto', value: result.utileRitenuto, color: 'slate' });
  }

  if (result.tipo === 'forfettario') {
    const aliqLabel = `Imposta sost. (${(result.aliquota * 100).toFixed(0)}%)`;
    if (result.impostaSostitutiva > 0 || result.imposta > 0) {
      items.push({ label: aliqLabel, value: result.impostaSostitutiva || result.imposta, color: 'red' });
    }
    if (result.inps > 0) items.push({ label: `INPS ${result.gestioneINPS || 'IVS'}`, value: result.inps, color: 'yellow' });
  }

  if (result.tipo === 'personale') {
    if (result.irap > 0) items.push({ label: 'IRAP', value: result.irap, color: 'red' });
    if (result.irpefLorda > 0 || result.irpefNetta > 0) {
      items.push({ label: 'IRPEF', value: result.irpefLorda || result.irpefNetta || result.irpefAmm, color: 'red' });
    }
    if (result.addizionali?.totale > 0) items.push({ label: 'Addizionali IRPEF', value: result.addizionali.totale, color: 'red' });
    const inpsVal = result.inps || result.inpsSocio || result.inpsAmm;
    if (inpsVal > 0) items.push({ label: `INPS ${result.gestioneINPS || 'IVS'}`, value: inpsVal, color: 'yellow' });
  }

  if (result.tipo === 'cooperativa') {
    if (result.irap > 0) items.push({ label: 'IRAP', value: result.irap, color: 'red' });
    if (result.ires > 0) items.push({ label: 'IRES (agev.)', value: result.ires, color: 'red' });
    if (result.ristorni > 0) items.push({ label: 'Ristorni ai soci', value: result.ristorni, color: 'violet' });
  }

  items.push({ label: '💰 In tasca', value: result.inTascaSocio, color: 'emerald' });

  return (
    <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-2xl p-4 w-full overflow-hidden">
      <h3 className="text-white font-bold text-sm mb-3">CASCATA: DOVE VANNO I TUOI SOLDI</h3>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <WaterfallBar key={i} label={item.label} value={Math.abs(item.value)} maxValue={maxVal} color={item.color} />
        ))}
      </div>
    </div>
  );
}