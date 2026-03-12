import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Info } from 'lucide-react';
import WaterfallChart from './WaterfallChart';
import QuickInsights from './QuickInsights';

const formatEuro = (n) => {
  if (n === undefined || n === null || isNaN(n)) return '€0';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

// Percentuali costi operativi preimpostate
const COST_PRESETS = [50, 60, 70, 80];

// Calcolo imposte client-side (deterministico) 
function calcolaImposteLocale({ regime, fatturato, costiPerc, compensoAmm, percDividendi, coefficiente, aliquotaForfettario }) {
  const costi = fatturato * (costiPerc / 100);
  
  if (regime === 'SRL' || regime === 'SRLU' || regime === 'SPA' || regime === 'SAPA' || regime === 'SE') {
    const utile = Math.max(0, fatturato - costi - compensoAmm);
    const ires = utile * 0.24;
    const irap = utile * 0.039;
    const utileNetto = utile - ires - irap;
    
    // IRPEF su compenso amministratore (scaglioni 2026)
    let irpefAmm = 0;
    if (compensoAmm > 0) {
      if (compensoAmm <= 28000) {
        irpefAmm = compensoAmm * 0.23;
      } else if (compensoAmm <= 50000) {
        irpefAmm = 28000 * 0.23 + (compensoAmm - 28000) * 0.33;
      } else {
        irpefAmm = 28000 * 0.23 + 22000 * 0.33 + (compensoAmm - 50000) * 0.43;
      }
    }
    
    // INPS gestione separata su compenso
    const inpsAmm = compensoAmm * 0.2672;
    const nettoAmm = compensoAmm - irpefAmm - inpsAmm;
    
    // Dividendi
    const dividendiLordi = utileNetto * (percDividendi / 100);
    const impostaDividendi = dividendiLordi * 0.26;
    const dividendiNetti = dividendiLordi - impostaDividendi;
    
    // Utile trattenuto in società  
    const utileRitenuto = utileNetto - dividendiLordi;

    const totaleTasse = ires + irap + irpefAmm + inpsAmm + impostaDividendi;
    const inTascaSocio = nettoAmm + dividendiNetti;
    const pressioneFiscale = fatturato > 0 ? (totaleTasse / fatturato) * 100 : 0;

    return {
      fatturato, costi, compensoAmm, utile, 
      ires, irap, irpefAmm, inpsAmm, nettoAmm,
      utileNetto, dividendiLordi, impostaDividendi, dividendiNetti,
      utileRitenuto, totaleTasse, inTascaSocio, pressioneFiscale,
      tipo: 'capitale'
    };
  }
  
  if (regime === 'RF') {
    const coeff = coefficiente || 0.78;
    const redditoImponibile = fatturato * coeff;
    const aliq = aliquotaForfettario === 'startup' ? 0.05 : 0.15;
    const imposta = redditoImponibile * aliq;
    const inps = redditoImponibile * 0.2672;
    const netto = fatturato - imposta - inps;
    const totaleTasse = imposta + inps;
    
    return {
      fatturato, costi: 0, compensoAmm: 0, utile: redditoImponibile,
      ires: 0, irap: 0, irpefAmm: 0, inpsAmm: 0, nettoAmm: 0,
      utileNetto: 0, dividendiLordi: 0, impostaDividendi: 0, dividendiNetti: 0,
      utileRitenuto: 0, totaleTasse, inTascaSocio: netto, pressioneFiscale: fatturato > 0 ? (totaleTasse / fatturato) * 100 : 0,
      imposta, inps, redditoImponibile, coefficiente: coeff, aliquota: aliq,
      tipo: 'forfettario'
    };
  }
  
  // Ditta individuale / SNC / SAS / SS / COOP
  const utile = Math.max(0, fatturato - costi);
  let irpef = 0;
  if (utile <= 28000) {
    irpef = utile * 0.23;
  } else if (utile <= 50000) {
    irpef = 28000 * 0.23 + (utile - 28000) * 0.33;
  } else {
    irpef = 28000 * 0.23 + 22000 * 0.33 + (utile - 50000) * 0.43;
  }
  const irap = utile * 0.039;
  const inps = utile * 0.2672;
  const totaleTasse = irpef + irap + inps;
  const netto = utile - totaleTasse;
  
  return {
    fatturato, costi, compensoAmm: 0, utile,
    ires: 0, irap, irpefAmm: irpef, inpsAmm: inps, nettoAmm: 0,
    utileNetto: 0, dividendiLordi: 0, impostaDividendi: 0, dividendiNetti: 0,
    utileRitenuto: 0, totaleTasse, inTascaSocio: netto, pressioneFiscale: fatturato > 0 ? (totaleTasse / fatturato) * 100 : 0,
    tipo: 'personale'
  };
}

// Slider con thumb dorato
function GoldSlider({ value, min, max, step, onChange, label, formatValue }) {
  const perc = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-slate-400 text-xs">{label}</span>
        <span className="text-white font-bold text-sm">{formatValue ? formatValue(value) : value}</span>
      </div>
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-1.5 bg-slate-700 rounded-full">
          <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#f0d060] rounded-full" style={{ width: `${perc}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute w-5 h-5 rounded-full bg-gradient-to-b from-[#f7d774] to-[#c6921b] border-2 border-white shadow-lg pointer-events-none"
          style={{ left: `calc(${perc}% - 10px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}

// Determina se tipo società usa costi/compenso/dividendi
function getRegimeFeatures(forma) {
  const capitali = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'];
  const personali = ['Ditta individuale', 'SS', 'SNC', 'SAS'];
  
  if (forma === 'RF') return { hasCosti: false, hasCompenso: false, hasDividendi: false, hasCoeffRedditivita: true };
  if (capitali.includes(forma)) return { hasCosti: true, hasCompenso: true, hasDividendi: true, hasCoeffRedditivita: false };
  if (forma === 'COOP') return { hasCosti: true, hasCompenso: false, hasDividendi: false, hasCoeffRedditivita: false };
  // personali
  return { hasCosti: true, hasCompenso: false, hasDividendi: false, hasCoeffRedditivita: false };
}

function mapFormaToRegime(fg) {
  if (fg === 'RF') return 'RF';
  if (['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'].includes(fg)) return fg;
  if (fg === 'COOP') return 'COOP';
  return fg || 'SRL';
}

export default function SimulatoreInterattivo({ user }) {
  const forma = user?.forma_giuridica || 'SRL';
  const regime = mapFormaToRegime(forma);
  const features = getRegimeFeatures(forma);
  
  const [fatturato, setFatturato] = useState(300000);
  const [costiPerc, setCostiPerc] = useState(70);
  const [compensoAmm, setCompensoAmm] = useState(38000);
  const [percDividendi, setPercDividendi] = useState(80);
  const [coefficiente, setCoefficiente] = useState(0.78);
  const [aliquotaForfettario, setAliquotaForfettario] = useState('ordinario');
  const [showDettaglio, setShowDettaglio] = useState(false);

  const result = useMemo(() => {
    return calcolaImposteLocale({
      regime, fatturato, costiPerc, compensoAmm: features.hasCompenso ? compensoAmm : 0,
      percDividendi: features.hasDividendi ? percDividendi : 0,
      coefficiente: features.hasCoeffRedditivita ? coefficiente : 0.78,
      aliquotaForfettario
    });
  }, [regime, fatturato, costiPerc, compensoAmm, percDividendi, coefficiente, aliquotaForfettario, features]);

  // Per quick insights: +50k fatturato
  const resultPlus50k = useMemo(() => {
    return calcolaImposteLocale({
      regime, fatturato: fatturato + 50000, costiPerc, compensoAmm: features.hasCompenso ? compensoAmm : 0,
      percDividendi: features.hasDividendi ? percDividendi : 0,
      coefficiente, aliquotaForfettario
    });
  }, [result]);

  // +1000€ costi
  const resultPlusCosti = useMemo(() => {
    const newCostiPerc = fatturato > 0 ? ((fatturato * costiPerc / 100 + 1000) / fatturato) * 100 : costiPerc;
    return calcolaImposteLocale({
      regime, fatturato, costiPerc: Math.min(newCostiPerc, 100), compensoAmm: features.hasCompenso ? compensoAmm : 0,
      percDividendi: features.hasDividendi ? percDividendi : 0,
      coefficiente, aliquotaForfettario
    });
  }, [result]);

  const costiEuro = fatturato * (costiPerc / 100);
  const marginePerc = 100 - costiPerc;

  return (
    <div className="space-y-4">
      {/* SEZIONE INPUT: LA TUA AZIENDA */}
      <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-base">LA TUA AZIENDA</h2>
          <span className="text-slate-500 text-xs bg-slate-800/60 px-2 py-1 rounded">{forma}</span>
        </div>

        {/* Fatturato */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-slate-300 text-sm font-medium">Fatturato annuo</span>
            <span className="text-white font-bold text-xl">{formatEuro(fatturato)}</span>
          </div>
          <GoldSlider
            value={fatturato} min={10000} max={5000000} step={10000}
            onChange={setFatturato}
            label="" formatValue={formatEuro}
          />
        </div>

        {/* Costi operativi con preset % */}
        {features.hasCosti && (
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-slate-300 text-sm font-medium">Costi operativi totali</span>
              <span className="text-white font-bold text-xl">{formatEuro(costiEuro)}</span>
            </div>
            <p className="text-slate-500 text-[11px] mb-2">{costiPerc}% del fatturato — Margine: {formatEuro(fatturato - costiEuro)}</p>
            <div className="flex gap-2 mb-3">
              {COST_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setCostiPerc(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    costiPerc === p 
                      ? 'bg-[#d4af37] text-slate-900' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
            <GoldSlider
              value={costiPerc} min={10} max={95} step={1}
              onChange={setCostiPerc}
              label="" formatValue={(v) => `${v}%`}
            />
            <button 
              onClick={() => setShowDettaglio(!showDettaglio)}
              className="text-[#d4af37] text-xs mt-2 flex items-center gap-1 hover:underline"
            >
              <Info className="w-3 h-3" />
              Entra nel dettaglio per categoria / ATECO
            </button>
          </div>
        )}

        {/* Coefficiente forfettario */}
        {features.hasCoeffRedditivita && (
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-slate-300 text-sm font-medium">Coefficiente redditività</span>
              <span className="text-white font-bold text-lg">{(coefficiente * 100).toFixed(0)}%</span>
            </div>
            <GoldSlider
              value={coefficiente * 100} min={40} max={86} step={1}
              onChange={(v) => setCoefficiente(v / 100)}
              label="" formatValue={(v) => `${v}%`}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setAliquotaForfettario('ordinario')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  aliquotaForfettario === 'ordinario' ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Ordinario 15%
              </button>
              <button
                onClick={() => setAliquotaForfettario('startup')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  aliquotaForfettario === 'startup' ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Startup 5%
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COME TI PAGHI (solo società di capitali) */}
      {(features.hasCompenso || features.hasDividendi) && (
        <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-2xl p-5 space-y-5">
          <h2 className="text-white font-bold text-base">COME TI PAGHI</h2>
          
          {features.hasCompenso && (
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-300 text-sm font-medium">Compenso Amm.re (lordo)</span>
                <span className="text-white font-bold text-lg">{formatEuro(compensoAmm)}</span>
              </div>
              <GoldSlider
                value={compensoAmm} min={0} max={150000} step={1000}
                onChange={setCompensoAmm}
                label="" formatValue={formatEuro}
              />
            </div>
          )}

          {features.hasDividendi && (
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-300 text-sm font-medium">% utile distribuito come dividendi</span>
                <span className="text-white font-bold text-lg">{percDividendi}%</span>
              </div>
              <GoldSlider
                value={percDividendi} min={0} max={100} step={5}
                onChange={setPercDividendi}
                label="" formatValue={(v) => `${v}%`}
              />
            </div>
          )}
        </div>
      )}

      {/* RISULTATO GRANDE: IN TASCA AL SOCIO */}
      <ResultHero result={result} />

      {/* KPI Cards */}
      <KPICards result={result} features={features} />

      {/* Cascata */}
      <WaterfallChart result={result} features={features} />

      {/* Quick Insights */}
      <QuickInsights 
        result={result} 
        resultPlus50k={resultPlus50k} 
        resultPlusCosti={resultPlusCosti}
        features={features}
      />

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-amber-300/80 text-[10px] leading-relaxed">
          Simulazione semplificata a scopo informativo. Non sostituisce la consulenza del commercialista. Aliquote IRPEF 2026: 23% (0-28k), 33% (28k-50k), 43% (oltre 50k). IRES 24%, IRAP 3.9%, Dividendi 26%.
        </p>
      </div>
    </div>
  );
}

function ResultHero({ result }) {
  return (
    <div className="bg-gradient-to-br from-[#0b1e33] to-[#0a2540] border-2 border-emerald-500/30 rounded-2xl p-5 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
      <p className="text-slate-400 text-xs mb-1">Il tuo reddito netto annuo reale</p>
      <p className="text-emerald-400 font-black text-4xl tracking-tight">
        {formatEuro(result.inTascaSocio)}
      </p>
      <div className="flex items-center justify-center gap-4 mt-2">
        <span className="text-slate-400 text-xs">{formatEuro(Math.round(result.inTascaSocio / 12))}/mese netti</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400 text-xs">Pressione fiscale effettiva <strong className="text-white">{result.pressioneFiscale.toFixed(1)}%</strong></span>
      </div>
      <div className="mt-3 inline-flex items-center gap-2 bg-emerald-900/40 border border-emerald-500/30 px-4 py-1.5 rounded-full">
        <span className="text-emerald-400 text-xs font-bold">💰 IN TASCA AL SOCIO</span>
        <span className="text-white font-black text-lg">{formatEuro(result.inTascaSocio)}</span>
      </div>
    </div>
  );
}

function KPICards({ result, features }) {
  const cards = [];

  if (features.hasCompenso && result.compensoAmm > 0) {
    cards.push({
      label: 'Da compenso Amm.',
      value: formatEuro(result.nettoAmm),
      sub: `IRPEF ${formatEuro(result.irpefAmm)} + INPS ${formatEuro(result.inpsAmm)}`,
      color: 'text-sky-400'
    });
  }

  if (features.hasDividendi && result.dividendiNetti > 0) {
    cards.push({
      label: 'Da dividendi netti',
      value: formatEuro(result.dividendiNetti),
      sub: `Ritenuta 26%: ${formatEuro(result.impostaDividendi)}`,
      color: 'text-violet-400'
    });
  }

  if (result.tipo === 'capitale') {
    cards.push({
      label: 'IRES + IRAP',
      value: formatEuro(result.ires + result.irap),
      sub: `${formatEuro(result.ires)} + ${formatEuro(result.irap)}`,
      color: 'text-red-400'
    });
  }

  if (result.tipo === 'forfettario') {
    cards.push({
      label: 'Imposta sostitutiva',
      value: formatEuro(result.imposta),
      sub: `${(result.aliquota * 100).toFixed(0)}% su ${formatEuro(result.redditoImponibile)}`,
      color: 'text-red-400'
    });
    cards.push({
      label: 'INPS',
      value: formatEuro(result.inps),
      sub: `26.72% su reddito imponibile`,
      color: 'text-yellow-400'
    });
  }

  if (result.tipo === 'personale') {
    cards.push({
      label: 'IRPEF',
      value: formatEuro(result.irpefAmm),
      sub: 'Scaglioni progressivi',
      color: 'text-red-400'
    });
    cards.push({
      label: 'INPS',
      value: formatEuro(result.inpsAmm),
      sub: '26.72%',
      color: 'text-yellow-400'
    });
  }

  cards.push({
    label: 'Totale prelievo',
    value: formatEuro(result.totaleTasse),
    sub: 'Tasse + contributi',
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