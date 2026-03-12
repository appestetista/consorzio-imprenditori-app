import React, { useState, useMemo } from 'react';
import { Info, AlertTriangle, Users } from 'lucide-react';
import { calcolaImposteLocale, getRegimeFeatures, mapFormaToRegime } from './motoreCalcoloFiscale';
import WaterfallChart from './WaterfallChart';
import QuickInsights from './QuickInsights';
import ResultHero from './ResultHero';
import KPICards from './KPICards';
import GoldSlider from './GoldSlider';

const formatEuro = (n) => {
  if (n === undefined || n === null || isNaN(n)) return '€0';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

const COST_PRESETS = [50, 60, 70, 80];

export default function SimulatoreInterattivo({ user }) {
  const forma = user?.forma_giuridica || 'SRL';
  const regime = mapFormaToRegime(forma);
  const features = getRegimeFeatures(forma);
  const userGestione = user?.gestione_inps;

  // State parametri
  const [fatturato, setFatturato] = useState(300000);
  const [costiPerc, setCostiPerc] = useState(70);
  const [compensoAmm, setCompensoAmm] = useState(38000);
  const [percDividendi, setPercDividendi] = useState(80);
  const [coefficiente, setCoefficiente] = useState(0.78);
  const [aliquotaForfettario, setAliquotaForfettario] = useState('ordinario');
  const [gestioneINPS, setGestioneINPS] = useState(
    userGestione === 'Gestione Artigiani' ? 'artigiani' : 'commercianti'
  );
  const [riduzione35, setRiduzione35] = useState(user?.riduzione_contributiva_forfettario || false);
  const [numSoci, setNumSoci] = useState(user?.numero_soci || 2);
  const [tipoSocio, setTipoSocio] = useState('accomandatario');
  const [mutualitaPrevalente, setMutualitaPrevalente] = useState(user?.mutualita_prevalente !== false);
  const [percRistorni, setPercRistorni] = useState(0);

  const buildParams = () => ({
    regime, fatturato, costiPerc,
    compensoAmm: features.hasCompenso ? compensoAmm : 0,
    percDividendi: features.hasDividendi ? percDividendi : 0,
    coefficiente: features.hasCoeffRedditivita ? coefficiente : 0.78,
    aliquotaForfettario,
    gestioneINPS: features.hasGestioneINPS ? gestioneINPS : 'commercianti',
    riduzione35: features.hasRiduzione35 ? riduzione35 : false,
    numSoci: features.hasNumSoci ? numSoci : 2,
    tipoSocio: features.hasTipoSocio ? tipoSocio : 'accomandatario',
    mutualitaPrevalente: features.hasMutualita ? mutualitaPrevalente : true,
    percRistorni: features.hasRistorni ? percRistorni : 0,
    haIRAP: features.hasIRAP !== false,
    forma,
  });

  const result = useMemo(() => calcolaImposteLocale(buildParams()), [
    regime, fatturato, costiPerc, compensoAmm, percDividendi, coefficiente,
    aliquotaForfettario, gestioneINPS, riduzione35, numSoci, tipoSocio,
    mutualitaPrevalente, percRistorni
  ]);

  const resultPlus50k = useMemo(() => {
    return calcolaImposteLocale({ ...buildParams(), fatturato: fatturato + 50000 });
  }, [result]);

  const resultPlusCosti = useMemo(() => {
    const newCostiPerc = fatturato > 0 ? ((fatturato * costiPerc / 100 + 1000) / fatturato) * 100 : costiPerc;
    return calcolaImposteLocale({ ...buildParams(), costiPerc: Math.min(newCostiPerc, 100) });
  }, [result]);

  const costiEuro = fatturato * (costiPerc / 100);

  return (
    <div className="space-y-4">
      {/* Warning forfettario soglia */}
      {result.superaSoglia && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-500/40 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-xs font-semibold">
              {result.uscitaImmediata
                ? 'Attenzione: superi €100.000 → uscita immediata dal forfettario con effetto retroattivo!'
                : 'Attenzione: superi €85.000 → dal prossimo anno passi al regime ordinario.'}
            </p>
          </div>
        </div>
      )}

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
          <GoldSlider value={fatturato} min={10000} max={5000000} step={10000} onChange={setFatturato} formatValue={formatEuro} />
        </div>

        {/* Costi operativi */}
        {features.hasCosti && (
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-slate-300 text-sm font-medium">Costi operativi</span>
              <span className="text-white font-bold text-xl">{formatEuro(costiEuro)}</span>
            </div>
            <p className="text-slate-500 text-[11px] mb-2">{costiPerc}% del fatturato — Margine: {formatEuro(fatturato - costiEuro)}</p>
            <div className="flex gap-2 mb-3">
              {COST_PRESETS.map(p => (
                <button key={p} onClick={() => setCostiPerc(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    costiPerc === p ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}>{p}%</button>
              ))}
            </div>
            <GoldSlider value={costiPerc} min={10} max={95} step={1} onChange={setCostiPerc} formatValue={(v) => `${v}%`} />
          </div>
        )}

        {/* Coefficiente forfettario */}
        {features.hasCoeffRedditivita && (
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-slate-300 text-sm font-medium">Coefficiente redditività</span>
              <span className="text-white font-bold text-lg">{(coefficiente * 100).toFixed(0)}%</span>
            </div>
            <p className="text-slate-500 text-[10px] mb-2">Determinato dal codice ATECO{user?.ateco_code ? ` (${user.ateco_code})` : ''}</p>
            <GoldSlider value={coefficiente * 100} min={40} max={86} step={1} onChange={(v) => setCoefficiente(v / 100)} formatValue={(v) => `${v}%`} />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setAliquotaForfettario('ordinario')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  aliquotaForfettario === 'ordinario' ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}>Ordinario 15%</button>
              <button onClick={() => setAliquotaForfettario('startup')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  aliquotaForfettario === 'startup' ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}>Startup 5%</button>
            </div>
          </div>
        )}

        {/* Gestione INPS: Artigiani vs Commercianti */}
        {features.hasGestioneINPS && (
          <div>
            <span className="text-slate-400 text-xs block mb-2">Gestione INPS</span>
            <div className="flex gap-2">
              <button onClick={() => setGestioneINPS('artigiani')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  gestioneINPS === 'artigiani' ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}>Artigiani (24%)</button>
              <button onClick={() => setGestioneINPS('commercianti')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  gestioneINPS === 'commercianti' ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}>Commercianti (24.48%)</button>
            </div>
          </div>
        )}

        {/* Riduzione 35% INPS per forfettari */}
        {features.hasRiduzione35 && (
          <button onClick={() => setRiduzione35(!riduzione35)}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all border ${
              riduzione35
                ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
            {riduzione35 ? '✓ ' : ''}Riduzione contributi INPS 35% (forfettari)
          </button>
        )}

        {/* Numero soci (SNC, SAS, SS) */}
        {features.hasNumSoci && (
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-slate-300 text-sm font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />Numero soci
              </span>
              <span className="text-white font-bold text-lg">{numSoci}</span>
            </div>
            <GoldSlider value={numSoci} min={2} max={10} step={1} onChange={setNumSoci} formatValue={(v) => `${v}`} />
            <p className="text-slate-500 text-[10px] mt-1">
              Calcolo per quota {(100 / numSoci).toFixed(0)}% = {formatEuro(Math.round((fatturato * (1 - costiPerc / 100)) / numSoci))} di reddito
            </p>
          </div>
        )}

        {/* Tipo socio SAS */}
        {features.hasTipoSocio && (
          <div>
            <span className="text-slate-400 text-xs block mb-2">Tipo di socio (simulazione per)</span>
            <div className="flex gap-2">
              <button onClick={() => setTipoSocio('accomandatario')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  tipoSocio === 'accomandatario' ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}>Accomandatario</button>
              <button onClick={() => setTipoSocio('accomandante')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  tipoSocio === 'accomandante' ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800 text-slate-400'
                }`}>Accomandante</button>
            </div>
            <p className="text-slate-500 text-[10px] mt-1.5">
              {tipoSocio === 'accomandatario'
                ? 'Resp. illimitata — paga IRPEF + INPS IVS sulla quota di reddito'
                : 'Resp. limitata al capitale — paga solo IRPEF sulla quota (no INPS)'}
            </p>
          </div>
        )}

        {/* Cooperativa: mutualità */}
        {features.hasMutualita && (
          <button onClick={() => setMutualitaPrevalente(!mutualitaPrevalente)}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all border ${
              mutualitaPrevalente
                ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
            {mutualitaPrevalente ? '✓ ' : ''}Mutualità prevalente (IRES agevolata al 30%)
          </button>
        )}
      </div>

      {/* COME TI PAGHI (società di capitali) */}
      {(features.hasCompenso || features.hasDividendi) && (
        <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-2xl p-5 space-y-5">
          <h2 className="text-white font-bold text-base">COME TI PAGHI</h2>
          {features.hasCompenso && (
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-300 text-sm font-medium">Compenso Amm.re (lordo)</span>
                <span className="text-white font-bold text-lg">{formatEuro(compensoAmm)}</span>
              </div>
              <p className="text-slate-500 text-[10px] mb-2">
                INPS GS: 2/3 a carico società ({formatEuro(result.inpsGS?.quotaAzienda || 0)}) + 1/3 a carico tuo ({formatEuro(result.inpsGS?.quotaAmministratore || 0)})
              </p>
              <GoldSlider value={compensoAmm} min={0} max={200000} step={1000} onChange={setCompensoAmm} formatValue={formatEuro} />
            </div>
          )}
          {features.hasDividendi && (
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-300 text-sm font-medium">% utile distribuito come dividendi</span>
                <span className="text-white font-bold text-lg">{percDividendi}%</span>
              </div>
              <GoldSlider value={percDividendi} min={0} max={100} step={5} onChange={setPercDividendi} formatValue={(v) => `${v}%`} />
            </div>
          )}
        </div>
      )}

      {/* Cooperativa: ristorni */}
      {features.hasRistorni && (
        <div className="bg-gradient-to-br from-[#0a2540] to-[#0d2f4f] border border-[#1a3a5c] rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-bold text-base">RISTORNI AI SOCI</h2>
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-slate-300 text-sm font-medium">% utile netto come ristorni</span>
              <span className="text-white font-bold text-lg">{percRistorni}%</span>
            </div>
            <GoldSlider value={percRistorni} min={0} max={80} step={5} onChange={setPercRistorni} formatValue={(v) => `${v}%`} />
          </div>
        </div>
      )}

      {/* RISULTATO */}
      <ResultHero result={result} features={features} forma={forma} />
      <KPICards result={result} features={features} forma={forma} />
      <WaterfallChart result={result} features={features} />
      <QuickInsights result={result} resultPlus50k={resultPlus50k} resultPlusCosti={resultPlusCosti} features={features} />

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-amber-300/80 text-[10px] leading-relaxed">
          Simulazione basata su aliquote 2025/2026. IRPEF: 23% (0-28k), 33% (28-50k), 43% (oltre). IRES 24%. IRAP 3.9%. 
          INPS artigiani 24% / commercianti 24.48% con minimale €18.555. Gestione separata 35.72% (co.co.co). 
          Dividendi 26%. Addizionali stimate (media nazionale). Non sostituisce il commercialista.
        </p>
      </div>
    </div>
  );
}