import React from 'react';

const formatEuro = (n) => {
  if (n === undefined || n === null || isNaN(n)) return '€0';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

export default function KPICards({ result, features, forma }) {
  const cards = [];

  // === SOCIETÀ DI CAPITALI (SRL, SRLU, SPA, SAPA, SE) ===
  if (result.tipo === 'capitale') {
    if (features.hasCompenso && result.compensoAmm > 0) {
      cards.push({
        label: 'Netto da compenso',
        value: formatEuro(result.nettoCompenso || result.nettoAmm),
        sub: `IRPEF ${formatEuro(result.totaleIrpefAmm || result.irpefAmm)} + INPS (tua quota) ${formatEuro(result.inpsGS?.quotaAmministratore || 0)}`,
        color: 'text-sky-400'
      });
    }
    if (features.hasDividendi && result.dividendiNetti > 0) {
      cards.push({
        label: 'Dividendi netti',
        value: formatEuro(result.dividendiNetti),
        sub: `Ritenuta 26%: ${formatEuro(result.ritenutaDividendi || result.impostaDividendi)}`,
        color: 'text-violet-400'
      });
    }
    cards.push({
      label: 'IRES + IRAP società',
      value: formatEuro((result.ires || 0) + (result.irap || 0)),
      sub: `IRES ${formatEuro(result.ires)} + IRAP ${formatEuro(result.irap)}`,
      color: 'text-red-400'
    });
    if (result.inpsGS?.totale > 0) {
      cards.push({
        label: 'INPS GS totale',
        value: formatEuro(result.inpsGS.totale),
        sub: `${(result.inpsGS.aliquota * 100).toFixed(1)}% — Azienda ${formatEuro(result.inpsGS.quotaAzienda)}, Amm. ${formatEuro(result.inpsGS.quotaAmministratore)}`,
        color: 'text-yellow-400'
      });
    }
    if (result.utileRitenuto > 0) {
      cards.push({
        label: 'Utile trattenuto',
        value: formatEuro(result.utileRitenuto),
        sub: 'Rimane in società (autofinanziamento)',
        color: 'text-slate-400'
      });
    }
  }

  // === FORFETTARIO ===
  if (result.tipo === 'forfettario') {
    cards.push({
      label: 'Imposta sostitutiva',
      value: formatEuro(result.impostaSostitutiva || result.imposta),
      sub: `${(result.aliquota * 100).toFixed(0)}% su ${formatEuro(result.redditoImponibile)}`,
      color: 'text-red-400'
    });
    cards.push({
      label: `INPS ${result.gestioneINPS || 'IVS'}`,
      value: formatEuro(result.inps),
      sub: `${result.riduzione35 ? 'Con riduzione 35% — ' : ''}Minimale €18.555`,
      color: 'text-yellow-400'
    });
    cards.push({
      label: 'Reddito forfettario',
      value: formatEuro(result.redditoForfettario),
      sub: `Coeff. ${(result.coefficiente * 100).toFixed(0)}% × ${formatEuro(result.fatturato)}`,
      color: 'text-sky-400'
    });
  }

  // === SOCIETÀ DI PERSONE (Ditta, SNC, SAS, SS) ===
  if (result.tipo === 'personale') {
    cards.push({
      label: 'IRPEF + addizionali',
      value: formatEuro(result.irpefAmm),
      sub: result.addizionali
        ? `IRPEF ${formatEuro(result.irpefLorda || result.irpefNetta || 0)} + Add. ${formatEuro(result.addizionali?.totale || 0)}`
        : 'Scaglioni progressivi',
      color: 'text-red-400'
    });
    if (result.inps > 0 || result.inpsAmm > 0) {
      const inpsVal = result.inps || result.inpsAmm || 0;
      cards.push({
        label: `INPS ${result.gestioneINPS || 'IVS'}`,
        value: formatEuro(inpsVal),
        sub: result.gestioneINPS === 'artigiani' ? 'Gestione Artigiani (24%)' :
             result.gestioneINPS === 'commercianti' ? 'Gestione Commercianti (24.48%)' : '',
        color: 'text-yellow-400'
      });
    }
    if (result.irap > 0) {
      cards.push({
        label: 'IRAP',
        value: formatEuro(result.irap),
        sub: `3.9% su ${formatEuro(result.baseIRAP || result.utile)}`,
        color: 'text-orange-400'
      });
    }
    if (['SNC', 'SAS'].includes(forma) && result.numSoci > 1) {
      cards.push({
        label: `Reddito socio (${(100 / result.numSoci).toFixed(0)}%)`,
        value: formatEuro(result.redditoSocio),
        sub: `Reddito totale società: ${formatEuro(result.redditoSocieta)}`,
        color: 'text-sky-400'
      });
    }
  }

  // === COOPERATIVA ===
  if (result.tipo === 'cooperativa') {
    cards.push({
      label: 'IRES agevolata',
      value: formatEuro(result.ires),
      sub: `24% su ${formatEuro(result.baseIRES)} (${result.mutualitaPrevalente ? '30%' : '70%'} utile)`,
      color: 'text-red-400'
    });
    cards.push({
      label: 'IRAP',
      value: formatEuro(result.irap),
      sub: `3.9% su valore produzione`,
      color: 'text-orange-400'
    });
    if (result.ristorni > 0) {
      cards.push({
        label: 'Ristorni ai soci',
        value: formatEuro(result.ristorni),
        sub: `${result.percRistorni}% dell'utile netto`,
        color: 'text-violet-400'
      });
    }
  }

  // Totale prelievo (sempre)
  cards.push({
    label: 'Totale prelievo fiscale',
    value: formatEuro(result.totaleTasse),
    sub: 'Imposte + contributi',
    color: 'text-orange-400'
  });

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((c, i) => (
        <div key={i} className="bg-[#0a2540] border border-[#1a3a5c] rounded-xl p-3">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{c.label}</p>
          <p className={`font-bold text-lg ${c.color}`}>{c.value}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}