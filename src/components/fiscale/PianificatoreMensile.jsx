import React, { useState, useMemo } from "react";
import { ChevronDown, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   PARAMETRI FISCALI — stessi del SimulatoreInterattivo
   ═══════════════════════════════════════════════════════ */
const FISCO = {
  ires: 0.24,
  irap: 0.039,
  inps_gs_totale: 0.3503,
  inps_gs_quota_azienda: 2 / 3,
  inps_gs_quota_admin: 1 / 3,
  inps_gs_max: 122295,
  irpef: [
    { min: 0, max: 28000, aliquota: 0.23 },
    { min: 28000, max: 50000, aliquota: 0.33 },
    { min: 50000, max: Infinity, aliquota: 0.43 },
  ],
  add_regionale: 0.017,
  add_comunale: 0.008,
  ritenuta_dividendi: 0.26,
};

const MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

const fmt = n => new Intl.NumberFormat("it-IT", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0
}).format(n);

const fmtK = n => {
  if (Math.abs(n) >= 1000) return `${(n/1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
};

/* ═══════════════════════════════════════════════════════
   MOTORE DI CALCOLO
   ═══════════════════════════════════════════════════════ */
function calcolaIrpef(imponibile) {
  let imposta = 0;
  for (const s of FISCO.irpef) {
    if (imponibile <= s.min) break;
    imposta += (Math.min(imponibile, s.max) - s.min) * s.aliquota;
  }
  return imposta;
}

function aliquotaMarginaleIrpef(imponibile) {
  for (let i = FISCO.irpef.length - 1; i >= 0; i--) {
    if (imponibile > FISCO.irpef[i].min) return FISCO.irpef[i].aliquota;
  }
  return FISCO.irpef[0].aliquota;
}

function calcolaScenario({ fatturato, costiTotali, compensoLordo, percDividendi }) {
  const margine = fatturato - costiTotali;
  const baseInps = Math.min(compensoLordo, FISCO.inps_gs_max);
  const inpsTotale = baseInps * FISCO.inps_gs_totale;
  const inpsAzienda = inpsTotale * FISCO.inps_gs_quota_azienda;
  const inpsAmministratore = inpsTotale * FISCO.inps_gs_quota_admin;
  const costoCompensoPerSocieta = compensoLordo + inpsAzienda;
  const utileAnteImposte = margine - costoCompensoPerSocieta;
  const irap = Math.max(0, margine * FISCO.irap);
  const ires = Math.max(0, utileAnteImposte * FISCO.ires);
  const utileNetto = utileAnteImposte - irap - ires;
  const dividendiLordi = Math.max(0, utileNetto) * (percDividendi / 100);
  const ritenutaDividendi = dividendiLordi * FISCO.ritenuta_dividendi;
  const dividendiNetti = dividendiLordi - ritenutaDividendi;
  const deduzioneInps = inpsAmministratore * 0.5;
  const imponibileIrpef = Math.max(0, compensoLordo - deduzioneInps);
  const irpef = calcolaIrpef(imponibileIrpef);
  const addRegionale = imponibileIrpef * FISCO.add_regionale;
  const addComunale = imponibileIrpef * FISCO.add_comunale;
  const nettoCompenso = Math.max(0, compensoLordo - inpsAmministratore - irpef - addRegionale - addComunale);
  const totaleTasca = dividendiNetti + nettoCompenso;
  const totaleImposte = irap + ires + irpef + addRegionale + addComunale + ritenutaDividendi + inpsTotale;
  const pressioneFiscale = margine > 0 ? ((margine - totaleTasca) / margine) * 100 : 0;
  return { totaleTasca, pressioneFiscale, nettoCompenso, dividendiNetti, totaleImposte, irap, ires, irpef, inpsTotale, ritenutaDividendi, utileNetto, margine, addRegionale, addComunale, inpsAzienda, inpsAmministratore };
}

/* ═══════════════════════════════════════════════════════
   OTTIMIZZATORE FISCALE — Logica da commercialista
   
   Strategia di ottimizzazione del compenso:
   
   1. Il costo fiscale del compenso per € ha 3 componenti:
      - INPS GS: 35,03% (di cui 1/3 a carico amm.re, 2/3 azienda)
      - IRPEF: progressiva (23% / 33% / 43%) + addizionali ~2,5%
      - Il compenso è deducibile dal reddito società → riduce IRES 24%
      
   2. Il costo fiscale dei dividendi:
      - IRES 24% sull'utile (non deducibile)
      - Ritenuta secca 26% sui dividendi lordi
      - Costo complessivo: 1 - (1-0.24)*(1-0.26) = ~43,76%
      
   3. Break-even analysis:
      Compenso conviene quando il suo costo totale < costo dividendo
      
      Costo compenso per €1:
      - INPS az. (2/3 * 35,03%): +23,35% costo per società
      - INPS amm. (1/3 * 35,03%): -11,68% dal lordo
      - IRPEF + add. sul lordo netto ded. INPS
      - Risparmio IRES: -24% * (1 + 23,35%) = deduce compenso+INPS az.
      
      Nella fascia 23% IRPEF (< €28k):
        Costo netto ≈ 23% + 2,5% + 11,68% - 24%*(1+23,35%) ≈ 7,6%
        vs Dividendi ≈ 43,76%  → COMPENSO CONVIENE MOLTO
        
      Nella fascia 33% (€28k-50k):
        Costo netto ≈ 33% + 2,5% + 11,68% - 29,6% ≈ 17,6%
        vs Dividendi ≈ 43,76%  → COMPENSO CONVIENE ANCORA
        
      Nella fascia 43% (> €50k):
        Costo netto ≈ 43% + 2,5% + 11,68% - 29,6% ≈ 27,6%
        vs Dividendi ≈ 43,76%  → COMPENSO CONVIENE ANCORA (ma meno)
      
   CONCLUSIONE: Il compenso conviene SEMPRE fino al massimale INPS.
   Ma conviene di PIÙ nei primi €28k, poi diminuisce il vantaggio.
   L'ottimizzatore trova il compenso che massimizza il netto in tasca.
   ═══════════════════════════════════════════════════════ */
function ottimizzaCompenso(fatturato, costiTotali) {
  const margine = fatturato - costiTotali;
  if (margine <= 0) return { compenso: 0, percDiv: 0 };
  
  let maxNetto = 0;
  let bestCompenso = 0;
  let bestDiv = 0;
  
  // Brute force con step di €1.000 — max compenso limitato al margine disponibile
  const maxComp = Math.min(margine * 0.8, 150000);
  
  for (let c = 0; c <= maxComp; c += 1000) {
    for (let d = 0; d <= 100; d += 5) {
      const r = calcolaScenario({ fatturato, costiTotali, compensoLordo: c, percDividendi: d });
      if (r.totaleTasca > maxNetto) {
        maxNetto = r.totaleTasca;
        bestCompenso = c;
        bestDiv = d;
      }
    }
  }
  
  // Raffinamento: step €500 attorno al migliore
  for (let c = Math.max(0, bestCompenso - 2000); c <= bestCompenso + 2000; c += 500) {
    for (let d = Math.max(0, bestDiv - 10); d <= Math.min(100, bestDiv + 10); d += 5) {
      const r = calcolaScenario({ fatturato, costiTotali, compensoLordo: c, percDividendi: d });
      if (r.totaleTasca > maxNetto) {
        maxNetto = r.totaleTasca;
        bestCompenso = c;
        bestDiv = d;
      }
    }
  }
  
  return { compenso: bestCompenso, percDiv: bestDiv, nettoOttimale: maxNetto };
}

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPALE
   ═══════════════════════════════════════════════════════ */
export default function PianificatoreMensile({ costiPerc = 65 }) {
  // Fatturato mensile — l'utente inserisce mese per mese
  const [mesi, setMesi] = useState(() => Array(12).fill(25000));
  const [costiPercLocal, setCostiPercLocal] = useState(costiPerc);
  const [showMesi, setShowMesi] = useState(true);
  const [showDettaglio, setShowDettaglio] = useState(false);

  const updateMese = (idx, val) => {
    setMesi(prev => { const n = [...prev]; n[idx] = val; return n; });
  };

  // Distribuisci uniformemente
  const distribuisciUniforme = (totale) => {
    const perMese = Math.round(totale / 12);
    setMesi(Array(12).fill(perMese));
  };

  // Calcolo progressivo mensile con ottimizzazione
  const analisi = useMemo(() => {
    const risultati = [];
    let fattCumulato = 0;
    
    for (let i = 0; i < 12; i++) {
      fattCumulato += mesi[i];
      const costiCumulati = Math.round(fattCumulato * costiPercLocal / 100);
      const margineCumulato = fattCumulato - costiCumulati;
      
      // Ottimizza compenso/dividendi sul cumulato
      const opt = ottimizzaCompenso(fattCumulato, costiCumulati);
      const scenarioOtt = calcolaScenario({
        fatturato: fattCumulato, costiTotali: costiCumulati,
        compensoLordo: opt.compenso, percDividendi: opt.percDiv
      });
      
      // Scenario "piatto" (tutto dividendi, zero compenso)
      const scenarioDiv = calcolaScenario({
        fatturato: fattCumulato, costiTotali: costiCumulati,
        compensoLordo: 0, percDividendi: 100
      });
      
      // Scenario "tutto compenso" 
      const maxComp = Math.min(margineCumulato * 0.7, 120000);
      const scenarioComp = calcolaScenario({
        fatturato: fattCumulato, costiTotali: costiCumulati,
        compensoLordo: Math.max(0, maxComp), percDividendi: 0
      });
      
      const risparmioVsDiv = scenarioOtt.totaleTasca - scenarioDiv.totaleTasca;
      
      risultati.push({
        mese: MESI[i],
        fatturato: mesi[i],
        fattCumulato,
        costiCumulati,
        margineCumulato,
        compensoOttimale: opt.compenso,
        divOttimale: opt.percDiv,
        nettoOttimale: scenarioOtt.totaleTasca,
        pressioneOttimale: scenarioOtt.pressioneFiscale,
        nettoSoloDiv: scenarioDiv.totaleTasca,
        nettoSoloComp: scenarioComp.totaleTasca,
        risparmioVsDiv,
        imposteOttimali: scenarioOtt.totaleImposte,
        aliquotaMarginale: aliquotaMarginaleIrpef(opt.compenso * 0.94), // approx post deduzione
        dettaglio: scenarioOtt,
      });
    }
    return risultati;
  }, [mesi, costiPercLocal]);

  const totFatturato = mesi.reduce((a, b) => a + b, 0);
  const ultimo = analisi[11];
  const consigli = useMemo(() => generaConsigli(analisi, costiPercLocal), [analisi, costiPercLocal]);

  return (
    <div className="space-y-4">
      {/* TITOLO */}
      <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(59,130,246,0.05) 100%)", border: "1px solid rgba(212,175,55,0.15)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📊</span>
          <h2 className="text-white font-bold text-base">Pianificatore Mensile</h2>
        </div>
        <p className="text-gray-400 text-xs">Inserisci il fatturato previsto mese per mese — il sistema ottimizza compenso e dividendi per massimizzare il tuo netto.</p>
      </div>

      {/* INPUT FATTURATO MENSILE */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowMesi(!showMesi)} className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            📅 Fatturato mensile
            <ChevronDown className={`w-4 h-4 transition-transform ${showMesi ? 'rotate-180' : ''}`} />
          </button>
          <span className="text-sm font-bold text-white">{fmt(totFatturato)}/anno</span>
        </div>
        
        {showMesi && (
          <>
            {/* Quick fill */}
            <div className="flex gap-2 mb-3">
              {[200000, 300000, 500000, 800000].map(t => (
                <button key={t} onClick={() => distribuisciUniforme(t)}
                  className={`flex-1 py-1.5 rounded text-xs font-semibold transition-colors ${
                    Math.abs(totFatturato - t) < t * 0.05
                      ? "bg-blue-900 text-blue-300 border border-blue-700"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-transparent"
                  }`}>{fmtK(t)}</button>
              ))}
            </div>
            
            {/* Grid mesi */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MESI.map((m, i) => (
                <div key={i}>
                  <label className="text-[10px] text-gray-500 block mb-0.5">{m}</label>
                  <input
                    type="number"
                    value={mesi[i] || ''}
                    onChange={e => updateMese(i, parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white text-right focus:border-blue-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            
            {/* Barra visuale distribuzione */}
            <div className="flex gap-px h-8 rounded-lg overflow-hidden mt-3">
              {mesi.map((m, i) => {
                const maxM = Math.max(...mesi, 1);
                const h = Math.max((m / maxM) * 100, 5);
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end" title={`${MESI[i]}: ${fmt(m)}`}>
                    <div className="rounded-t-sm transition-all duration-300" style={{ height: `${h}%`, backgroundColor: m > 0 ? '#3B82F6' : '#1F2937' }} />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Costi % */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-gray-400">Costi operativi:</span>
          <input type="range" min={30} max={90} step={1} value={costiPercLocal}
            onChange={e => setCostiPercLocal(Number(e.target.value))}
            className="flex-1 h-1.5 rounded appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #F59E0B ${((costiPercLocal-30)/(90-30))*100}%, #374151 ${((costiPercLocal-30)/(90-30))*100}%)` }} />
          <span className="text-xs font-bold text-amber-400 w-10 text-right">{costiPercLocal}%</span>
        </div>
      </div>

      {/* ═══ RISULTATO OTTIMIZZATO ═══ */}
      {ultimo && (
        <div className="rounded-xl p-5 text-center" style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.1) 100%)",
          border: "1px solid rgba(16,185,129,0.2)",
        }}>
          <div className="text-xs text-gray-400 mb-1">🎯 Netto ottimizzato in tasca</div>
          <div className="text-4xl font-black text-green-400 tracking-tight">{fmt(ultimo.nettoOttimale)}</div>
          <div className="text-sm text-gray-400 mt-1">
            Pressione fiscale: <span className="text-amber-400 font-bold">{ultimo.pressioneOttimale.toFixed(1)}%</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-left">
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-[10px] text-gray-500">Compenso amm.re ottimale</div>
              <div className="text-lg font-bold text-blue-400">{fmt(ultimo.compensoOttimale)}</div>
              <div className="text-[10px] text-gray-500">{fmt(ultimo.compensoOttimale / 12)}/mese lordi</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-[10px] text-gray-500">Dividendi distribuiti</div>
              <div className="text-lg font-bold text-violet-400">{ultimo.divOttimale}%</div>
              <div className="text-[10px] text-gray-500">dell'utile netto</div>
            </div>
          </div>
          {ultimo.risparmioVsDiv > 0 && (
            <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
              <span className="text-green-400 text-xs font-semibold">
                💰 Risparmi {fmt(ultimo.risparmioVsDiv)} rispetto a soli dividendi
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══ CONSIGLI DA COMMERCIALISTA ═══ */}
      {consigli.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h3 className="text-amber-400 text-sm font-bold">Consigli strategici</h3>
          </div>
          <div className="space-y-2">
            {consigli.map((c, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs mt-0.5">{c.icon}</span>
                <div>
                  <p className="text-xs text-gray-300">{c.testo}</p>
                  {c.dettaglio && <p className="text-[10px] text-gray-500 mt-0.5">{c.dettaglio}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TABELLA PROGRESSIVA ═══ */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => setShowDettaglio(!showDettaglio)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5">
          <span>📈 Progressivo mensile</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDettaglio ? 'rotate-180' : ''}`} />
        </button>
        
        {showDettaglio && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Mese</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Fatt.</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Cumulato</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Comp. ott.</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Div. %</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Netto</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Press.</th>
                </tr>
              </thead>
              <tbody>
                {analisi.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5">
                    <td className="px-3 py-2 text-gray-300 font-medium">{r.mese}</td>
                    <td className="px-3 py-2 text-right text-white">{fmt(r.fatturato)}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{fmt(r.fattCumulato)}</td>
                    <td className="px-3 py-2 text-right text-blue-400">{fmt(r.compensoOttimale)}</td>
                    <td className="px-3 py-2 text-right text-violet-400">{r.divOttimale}%</td>
                    <td className="px-3 py-2 text-right text-green-400 font-bold">{fmt(r.nettoOttimale)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={r.pressioneOttimale > 50 ? 'text-red-400' : r.pressioneOttimale > 40 ? 'text-amber-400' : 'text-green-400'}>
                        {r.pressioneOttimale.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ CONFRONTO RAPIDO ═══ */}
      {ultimo && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            <div className="text-[10px] text-gray-500 mb-1">Solo dividendi</div>
            <div className="text-sm font-bold text-gray-400">{fmt(ultimo.nettoSoloDiv)}</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div className="text-[10px] text-green-400 mb-1">🎯 Ottimizzato</div>
            <div className="text-sm font-bold text-green-400">{fmt(ultimo.nettoOttimale)}</div>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            <div className="text-[10px] text-gray-500 mb-1">Solo compenso</div>
            <div className="text-sm font-bold text-gray-400">{fmt(ultimo.nettoSoloComp)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GENERATORE CONSIGLI — Logica da commercialista
   ═══════════════════════════════════════════════════════ */
function generaConsigli(analisi, costiPerc) {
  const consigli = [];
  const ultimo = analisi[11];
  if (!ultimo) return consigli;

  const fatt = ultimo.fattCumulato;
  const margine = ultimo.margineCumulato;
  const compOtt = ultimo.compensoOttimale;

  // 1. Compenso sotto soglia primo scaglione IRPEF
  if (compOtt > 0 && compOtt <= 28000) {
    consigli.push({
      icon: "✅",
      testo: `Compenso ottimale a ${fmt(compOtt)}: resti nel primo scaglione IRPEF al 23%.`,
      dettaglio: "Ogni euro in più di compenso oltre €28.000 viene tassato al 33% + addizionali."
    });
  } else if (compOtt > 28000 && compOtt <= 50000) {
    consigli.push({
      icon: "⚠️",
      testo: `Compenso a ${fmt(compOtt)}: entri nel secondo scaglione IRPEF (33%).`,
      dettaglio: "Conviene comunque rispetto ai dividendi perché il compenso è deducibile IRES e il costo complessivo dividendi è ~43,8%."
    });
  } else if (compOtt > 50000) {
    consigli.push({
      icon: "🔴",
      testo: `Compenso alto (${fmt(compOtt)}): sei nel terzo scaglione IRPEF al 43%.`,
      dettaglio: "A questi livelli, il vantaggio del compenso vs dividendi si riduce molto. Valuta di limitare il compenso a €50k."
    });
  }

  // 2. Risparmio ottimizzazione
  if (ultimo.risparmioVsDiv > 1000) {
    consigli.push({
      icon: "💰",
      testo: `L'ottimizzazione compenso+dividendi ti fa risparmiare ${fmt(ultimo.risparmioVsDiv)} rispetto a soli dividendi.`,
      dettaglio: "Il compenso è deducibile dall'utile → riduce IRES 24%. I dividendi pagano il 26% secco su utile già tassato IRES."
    });
  }

  // 3. Stagionalità
  const maxMese = Math.max(...analisi.map(a => a.fatturato));
  const minMese = Math.min(...analisi.map(a => a.fatturato));
  if (maxMese > 0 && minMese < maxMese * 0.3) {
    const mesiAlti = analisi.filter(a => a.fatturato > maxMese * 0.7).map(a => a.mese);
    consigli.push({
      icon: "📅",
      testo: `Fatturato molto stagionale: picchi a ${mesiAlti.join(', ')}.`,
      dettaglio: "Con fatturato irregolare, anticipare costi deducibili nei mesi forti riduce l'utile imponibile quando è più alto."
    });
  }

  // 4. INPS GS massimale
  if (compOtt > FISCO.inps_gs_max * 0.9) {
    consigli.push({
      icon: "📌",
      testo: "Attenzione: il compenso si avvicina al massimale INPS GS (€122.295).",
      dettaglio: "Oltre il massimale non si versano più contributi INPS: il compenso in eccesso ha solo IRPEF + addizionali."
    });
  }

  // 5. Pressione fiscale alta
  if (ultimo.pressioneOttimale > 50) {
    consigli.push({
      icon: "🔥",
      testo: `Pressione fiscale al ${ultimo.pressioneOttimale.toFixed(1)}%: più della metà del margine va in tasse.`,
      dettaglio: "Valuta se è possibile aumentare i costi deducibili (investimenti, formazione, R&D) per ridurre l'utile imponibile."
    });
  }

  // 6. Costi bassi
  if (costiPerc < 45) {
    consigli.push({
      icon: "📊",
      testo: `Costi al ${costiPerc}%: margine alto ma anche imposte alte.`,
      dettaglio: "Con margini elevati, valuta investimenti deducibili: macchinari (amm.to), formazione, R&D, welfare aziendale."
    });
  }

  // 7. Distribuzione dividendi
  if (ultimo.divOttimale < 50 && ultimo.divOttimale > 0) {
    consigli.push({
      icon: "🏦",
      testo: `Distribuire solo il ${ultimo.divOttimale}% dell'utile: il resto rimane in azienda tax-free.`,
      dettaglio: "L'utile trattenuto in società non paga la ritenuta 26% ed è disponibile per investimenti, riserve o distribuzione futura."
    });
  }

  return consigli;
}