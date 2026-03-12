import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import GoldSlider from './GoldSlider';
import ResultHero from './ResultHero';
import KPICards from './KPICards';
import WaterfallChart from './WaterfallChart';
import QuickInsights from './QuickInsights';
import CostDetailPanel from './CostDetailPanel';
import { calcolaImposteLocale, getRegimeFeatures, mapFormaToRegime } from './motoreCalcoloFiscale';
import {
  defaultItemValues, rescaleItems, totalFromItems, applyPreset
} from './costGroups';

const formatEuro = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

const SHORTCUT_PERCS = [50, 60, 70, 80];

export default function SimulatoreInterattivo({ user }) {
  const forma = user?.forma_giuridica || 'SRL';
  const regime = mapFormaToRegime(forma);
  const features = getRegimeFeatures(forma);

  const [fatturato, setFatturato] = useState(500000);
  const [costiPerc, setCostiPerc] = useState(60);
  const [compensoAmm, setCompensoAmm] = useState(features.hasCompenso ? 60000 : 0);
  const [percDividendi, setPercDividendi] = useState(features.hasDividendi ? 80 : 0);
  const [coefficiente, setCoefficiente] = useState(0.78);
  const [showDetail, setShowDetail] = useState(false);

  const [itemValues, setItemValues] = useState(() =>
    defaultItemValues(Math.round(fatturato * (costiPerc / 100)))
  );

  const totaleCostiDaVoci = useMemo(() => totalFromItems(itemValues), [itemValues]);

  useEffect(() => {
    if (fatturato > 0 && showDetail) {
      const newPerc = Math.round((totaleCostiDaVoci / fatturato) * 100);
      if (Math.abs(newPerc - costiPerc) >= 1) {
        setCostiPerc(Math.min(newPerc, 95));
      }
    }
  }, [totaleCostiDaVoci, fatturato, showDetail]);

  const handleFatturatoChange = useCallback((newFatt) => {
    setFatturato(newFatt);
    const newTotal = Math.round(newFatt * (costiPerc / 100));
    setItemValues(prev => rescaleItems(prev, newTotal));
  }, [costiPerc]);

  const handleCostiPercChange = useCallback((newPerc) => {
    setCostiPerc(newPerc);
    const newTotal = Math.round(fatturato * (newPerc / 100));
    setItemValues(prev => rescaleItems(prev, newTotal));
  }, [fatturato]);

  const handleItemChange = useCallback((itemId, newValue) => {
    setItemValues(prev => ({ ...prev, [itemId]: newValue }));
  }, []);

  const handleApplyPreset = useCallback((presetName) => {
    const totaleCosti = Math.round(fatturato * (costiPerc / 100));
    const newValues = applyPreset(totaleCosti, presetName);
    if (newValues) setItemValues(newValues);
  }, [fatturato, costiPerc]);

  const costiPercEffettivo = showDetail
    ? (fatturato > 0 ? (totaleCostiDaVoci / fatturato) * 100 : 0)
    : costiPerc;

  const buildParams = useCallback((overrides = {}) => ({
    regime,
    fatturato: overrides.fatturato ?? fatturato,
    costiPerc: overrides.costiPerc ?? costiPercEffettivo,
    compensoAmm: overrides.compensoAmm ?? compensoAmm,
    percDividendi: overrides.percDividendi ?? percDividendi,
    coefficiente,
    gestioneINPS: user?.gestione_inps || 'commercianti',
    forma,
  }), [regime, fatturato, costiPercEffettivo, compensoAmm, percDividendi, coefficiente, forma, user]);

  const result = useMemo(() => calcolaImposteLocale(buildParams()), [buildParams]);
  const resultPlus50k = useMemo(() => calcolaImposteLocale(buildParams({ fatturato: fatturato + 50000 })), [buildParams, fatturato]);
  const resultPlusCosti = useMemo(() => calcolaImposteLocale(buildParams({ costiPerc: costiPercEffettivo + (1000 / fatturato) * 100 })), [buildParams, costiPercEffettivo, fatturato]);

  const totaleCosti = showDetail ? totaleCostiDaVoci : Math.round(fatturato * (costiPerc / 100));

  return (
    <div className="space-y-4">
      <GoldSlider
        value={fatturato} min={50000} max={5000000} step={10000}
        onChange={handleFatturatoChange}
        label="Fatturato annuo"
        formatValue={formatEuro}
      />

      {features.hasCosti && (
        <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-2xl p-4">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-slate-400 text-xs">Costi operativi</span>
            <div className="text-right">
              <span className="text-white font-black text-xl">{formatEuro(totaleCosti)}</span>
              <span className="text-slate-500 text-xs ml-2">
                ({fatturato > 0 ? Math.round((totaleCosti / fatturato) * 100) : 0}% del fatturato)
              </span>
            </div>
          </div>

          <div className="mt-2">
            <GoldSlider
              value={costiPerc} min={10} max={95} step={1}
              onChange={handleCostiPercChange}
              formatValue={(v) => `${v}%`}
            />
          </div>

          <div className="flex gap-2 mt-2">
            {SHORTCUT_PERCS.map(p => (
              <button
                key={p}
                onClick={() => handleCostiPercChange(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  Math.abs(costiPerc - p) < 2
                    ? 'bg-[#d4af37] text-[#0a0f1a]'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowDetail(!showDetail)}
            className="w-full flex items-center justify-center gap-1.5 mt-3 text-[#d4af37] text-xs font-semibold hover:underline"
          >
            {showDetail ? '▲ Chiudi dettaglio' : '▶ Dettaglio per voce di costo'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetail ? 'rotate-180' : ''}`} />
          </button>

          {showDetail && (
            <CostDetailPanel
              itemValues={itemValues}
              fatturato={fatturato}
              onItemChange={handleItemChange}
              onApplyPreset={handleApplyPreset}
            />
          )}
        </div>
      )}

      {features.hasCompenso && (
        <GoldSlider
          value={compensoAmm} min={0} max={Math.max(200000, fatturato * 0.5)} step={5000}
          onChange={setCompensoAmm}
          label="Compenso amministratore"
          formatValue={formatEuro}
        />
      )}

      {features.hasDividendi && (
        <GoldSlider
          value={percDividendi} min={0} max={100} step={5}
          onChange={setPercDividendi}
          label="Distribuzione dividendi"
          formatValue={(v) => `${v}%`}
        />
      )}

      {features.hasCoeffRedditivita && (
        <GoldSlider
          value={Math.round(coefficiente * 100)} min={40} max={86} step={1}
          onChange={(v) => setCoefficiente(v / 100)}
          label="Coefficiente di redditività"
          formatValue={(v) => `${v}%`}
        />
      )}

      <ResultHero result={result} features={features} forma={forma} />
      <KPICards result={result} features={features} forma={forma} />
      <WaterfallChart result={result} features={features} />
      <QuickInsights result={result} resultPlus50k={resultPlus50k} resultPlusCosti={resultPlusCosti} features={features} />
    </div>
  );
}