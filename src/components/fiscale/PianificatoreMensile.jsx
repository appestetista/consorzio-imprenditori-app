import React, { useState, useMemo } from "react";
import { ChevronDown, HelpCircle, X } from "lucide-react";

/* ═══════════════════════════════════════════════════════
   PARAMETRI FISCALI ITALIA 2026
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

const MESI_NOMI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MESI_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

const fmt = n => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

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
  return {
    totaleTasca, pressioneFiscale, nettoCompenso, dividendiNetti, totaleImposte,
    irap, ires, irpef, inpsTotale, ritenutaDividendi, utileNetto, margine,
    addRegionale, addComunale, inpsAzienda, inpsAmministratore,
    compensoLordo, costoCompensoPerSocieta, dividendiLordi, utileAnteImposte,
  };
}

function ottimizzaCompenso(fatturato, costiTotali) {
  const margine = fatturato - costiTotali;
  if (margine <= 0) return { compenso: 0, percDiv: 0, nettoOttimale: 0 };
  let maxNetto = 0, bestCompenso = 0, bestDiv = 0;
  const maxComp = Math.min(margine * 0.8, 150000);
  for (let c = 0; c <= maxComp; c += 1000) {
    for (let d = 0; d <= 100; d += 5) {
      const r = calcolaScenario({ fatturato, costiTotali, compensoLordo: c, percDividendi: d });
      if (r.totaleTasca > maxNetto) { maxNetto = r.totaleTasca; bestCompenso = c; bestDiv = d; }
    }
  }
  for (let c = Math.max(0, bestCompenso - 2000); c <= bestCompenso + 2000; c += 500) {
    for (let d = Math.max(0, bestDiv - 10); d <= Math.min(100, bestDiv + 10); d += 5) {
      const r = calcolaScenario({ fatturato, costiTotali, compensoLordo: c, percDividendi: d });
      if (r.totaleTasca > maxNetto) { maxNetto = r.totaleTasca; bestCompenso = c; bestDiv = d; }
    }
  }
  return { compenso: bestCompenso, percDiv: bestDiv, nettoOttimale: maxNetto };
}

/* ═══════════════════════════════════════════════════════
   TOOLTIP "?"  — spiega PERCHÉ
   ═══════════════════════════════════════════════════════ */
function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button onClick={() => setOpen(!open)} className="align-middle">
        <HelpCircle className="w-3.5 h-3.5 text-amber-400/70 hover:text-amber-400 inline" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 sm:w-72">
          <div className="bg-[#1a2744] border border-amber-500/30 rounded-xl p-3 shadow-2xl text-xs text-gray-300 leading-relaxed">
            {text}
            <button onClick={() => setOpen(false)} className="absolute top-1.5 right-1.5">
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   SEPARATORE STRATEGICO — spiega perché questa scelta
   ═══════════════════════════════════════════════════════ */
function StrategySeparator({ icon, title, description, highlight }) {
  return (
    <div className="rounded-xl p-4 my-1" style={{
      background: highlight
        ? "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)"
        : "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(59,130,246,0.02) 100%)",
      border: `1px solid ${highlight ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.15)'}`,
    }}>
      <div className="flex items-start gap-2.5">
        <span className="text-base mt-0.5">{icon}</span>
        <div>
          <p className={`text-xs font-bold ${highlight ? 'text-green-400' : 'text-blue-400'}`}>{title}</p>
          <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPALE
   ═══════════════════════════════════════════════════════ */
export default function PianificatoreMensile({ costiPerc = 65 }) {
  const [mesi, setMesi] = useState(() => Array(12).fill(25000));
  const [costiPercLocal, setCostiPercLocal] = useState(costiPerc);
  const [showDettaglio, setShowDettaglio] = useState(false);

  const updateMese = (idx, val) => {
    setMesi(prev => { const n = [...prev]; n[idx] = val; return n; });
  };

  const distribuisciUniforme = (totale) => {
    setMesi(Array(12).fill(Math.round(totale / 12)));
  };

  const totFatturato = mesi.reduce((a, b) => a + b, 0);
  const costiTotali = Math.round(totFatturato * costiPercLocal / 100);
  const margine = totFatturato - costiTotali;

  // Ottimizzazione annuale
  const opt = useMemo(() => ottimizzaCompenso(totFatturato, costiTotali), [totFatturato, costiTotali]);
  const scenarioOtt = useMemo(() => calcolaScenario({
    fatturato: totFatturato, costiTotali, compensoLordo: opt.compenso, percDividendi: opt.percDiv
  }), [totFatturato, costiTotali, opt]);

  // Scenari alternativi per confronto
  const scenarioSoloDiv = useMemo(() => calcolaScenario({
    fatturato: totFatturato, costiTotali, compensoLordo: 0, percDividendi: 100
  }), [totFatturato, costiTotali]);

  const scenarioSoloComp = useMemo(() => {
    const mc = Math.min(Math.max(0, margine * 0.7), 120000);
    return calcolaScenario({ fatturato: totFatturato, costiTotali, compensoLordo: mc, percDividendi: 0 });
  }, [totFatturato, costiTotali, margine]);

  // Progressivo mensile
  const analisiMensile = useMemo(() => {
    const r = [];
    let cum = 0;
    for (let i = 0; i < 12; i++) {
      cum += mesi[i];
      const cc = Math.round(cum * costiPercLocal / 100);
      const o = ottimizzaCompenso(cum, cc);
      const s = calcolaScenario({ fatturato: cum, costiTotali: cc, compensoLordo: o.compenso, percDividendi: o.percDiv });
      r.push({ mese: MESI_SHORT[i], fatturato: mesi[i], cum, comp: o.compenso, div: o.percDiv, netto: s.totaleTasca, press: s.pressioneFiscale });
    }
    return r;
  }, [mesi, costiPercLocal]);

  const risparmioVsDiv = scenarioOtt.totaleTasca - scenarioSoloDiv.totaleTasca;

  // Determina lo scaglione IRPEF del compenso ottimale
  const scaglioneInfo = opt.compenso <= 28000
    ? { fascia: "1°", aliquota: "23%", colore: "text-green-400", stato: "ottimale" }
    : opt.compenso <= 50000
    ? { fascia: "2°", aliquota: "33%", colore: "text-amber-400", stato: "accettabile" }
    : { fascia: "3°", aliquota: "43%", colore: "text-red-400", stato: "alto" };

  if (totFatturato <= 0) {
    return (
      <div className="space-y-4">
        <IntroSection />
        <FatturatoInput mesi={mesi} updateMese={updateMese} totFatturato={totFatturato} distribuisciUniforme={distribuisciUniforme} />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ─── INTRO ─── */}
      <IntroSection />

      {/* ══════════════════════════════════════════════════
         STEP 1: INSERISCI IL FATTURATO
         ══════════════════════════════════════════════════ */}
      <StepHeader number="1" title="Quanto fatturi ogni mese?" tooltip="Il fatturato è il punto di partenza di tutto. Da qui si calcolano i costi, il margine, e di conseguenza quanto puoi pagarti. Inserisci i valori reali o previsti mese per mese — anche approssimativi vanno bene." />
      <FatturatoInput mesi={mesi} updateMese={updateMese} totFatturato={totFatturato} distribuisciUniforme={distribuisciUniforme} />

      {/* ══════════════════════════════════════════════════
         STEP 2: COSTI OPERATIVI
         ══════════════════════════════════════════════════ */}
      <StepHeader number="2" title="Quanti costi ha la tua attività?" tooltip="I costi operativi (stipendi, affitto, materie prime, consulenze…) si sottraggono dal fatturato. Più costi deducibili hai, meno tasse paghi. Il margine che resta è quello su cui lo Stato applica IRES, IRAP, IRPEF." />

      <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            Costi operativi sul fatturato
            <InfoTip text="Indica la percentuale media dei tuoi costi rispetto al fatturato. Es: un'azienda manifatturiera ha costi intorno al 70-80%, un'azienda di servizi 40-60%. Più costi hai (legittimi e documentati), meno paghi di IRES e IRAP." />
          </span>
          <span className="text-base font-bold text-amber-400">{costiPercLocal}%</span>
        </div>
        <input type="range" min={30} max={90} step={1} value={costiPercLocal}
          onChange={e => setCostiPercLocal(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #F59E0B ${((costiPercLocal-30)/60)*100}%, #374151 ${((costiPercLocal-30)/60)*100}%)` }} />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>30% (servizi leggeri)</span>
          <span>90% (industria pesante)</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-black/20 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-500">Costi stimati</div>
            <div className="text-sm font-bold text-amber-400">{fmt(costiTotali)}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-2.5">
            <div className="text-[10px] text-gray-500">Margine lordo
              <InfoTip text="Il margine lordo è ciò che resta dopo i costi. Su questo margine vengono calcolate TUTTE le imposte: IRES (24%), IRAP (3,9%), e da qui si decide quanto pagarsi come compenso o dividendi." />
            </div>
            <div className="text-sm font-bold text-white">{fmt(margine)}</div>
          </div>
        </div>
      </div>

      <StrategySeparator
        icon="💡"
        title="STRATEGIA: Più costi deducibili = meno tasse"
        description="Ogni euro di costo deducibile riduce l'utile su cui paghi IRES (24%) e IRAP (3,9%). Se puoi anticipare investimenti (macchinari, formazione, consulenze) fallo: risparmi il 27,9% su ogni euro speso."
      />

      {/* ══════════════════════════════════════════════════
         STEP 3: COME TI PAGHI — IL CUORE DELL'OTTIMIZZAZIONE
         ══════════════════════════════════════════════════ */}
      <StepHeader number="3" title="Come ti conviene pagarti?" tooltip="Questa è la scelta più importante. Hai due modi per portare soldi dalla SRL alla tua tasca: il compenso da amministratore e i dividendi. Hanno tassazioni diverse. Il sistema ha calcolato il mix perfetto per pagare meno tasse possibile." />

      {/* RISULTATO GRANDE */}
      <div className="rounded-xl p-5 text-center" style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.08) 100%)",
        border: "1px solid rgba(16,185,129,0.2)",
      }}>
        <div className="text-[11px] text-gray-400 mb-1">
          🎯 Il massimo che puoi portare a casa, al netto di tutte le tasse
        </div>
        <div className="text-4xl font-black text-green-400 tracking-tight">{fmt(scenarioOtt.totaleTasca)}</div>
        <div className="text-xs text-gray-400 mt-1">
          = {fmt(scenarioOtt.totaleTasca / 12)} al mese netti · pressione fiscale {scenarioOtt.pressioneFiscale.toFixed(1)}%
        </div>
      </div>

      {/* ─── SPIEGAZIONE COMPENSO ─── */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-blue-400">
            💼 COMPENSO AMMINISTRATORE
            <InfoTip text="È lo 'stipendio' che ti auto-assegni come amministratore della SRL. Viene tassato con IRPEF progressiva (23%, 33%, 43%) + INPS Gestione Separata (35,03%). MA è un costo deducibile per la società: riduce l'utile su cui si paga IRES (24%)." />
          </span>
        </div>
        <div className="text-2xl font-bold text-blue-400">{fmt(opt.compenso)}</div>
        <div className="text-[11px] text-gray-500">{fmt(opt.compenso / 12)}/mese lordi → {fmt(scenarioOtt.nettoCompenso)}/anno netti in tasca</div>
        
        {/* Dettaglio tassazione compenso */}
        <div className="mt-3 bg-black/20 rounded-lg p-3 space-y-1.5">
          <div className="text-[10px] text-gray-500 font-semibold mb-1">Come viene tassato:</div>
          <TaxRow label="Compenso lordo" value={opt.compenso} color="text-white" />
          <TaxRow label={`INPS a tuo carico (1/3 di 35,03%)`} value={-scenarioOtt.inpsAmministratore} color="text-red-400" sub="Il contributo previdenziale che paghi tu" />
          <TaxRow label={`IRPEF — sei nel ${scaglioneInfo.fascia} scaglione al ${scaglioneInfo.aliquota}`} value={-scenarioOtt.irpef} color="text-red-400" sub={opt.compenso <= 28000 ? "Ottimo! Resti nella fascia più bassa" : opt.compenso <= 50000 ? "Conviene ancora rispetto ai dividendi" : "Fascia alta: ogni euro in più costa il 43%"} />
          <TaxRow label="Addizionali regionali + comunali (~2,5%)" value={-(scenarioOtt.addRegionale + scenarioOtt.addComunale)} color="text-red-400" />
          <div className="border-t border-gray-700 pt-1.5">
            <TaxRow label="= Netto in tasca dal compenso" value={scenarioOtt.nettoCompenso} color="text-green-400 font-bold" />
          </div>
        </div>

        {opt.compenso > 0 && (
          <div className="mt-2 text-[10px] text-gray-500 flex items-start gap-1.5">
            <span>ℹ️</span>
            <span>L'azienda paga anche i 2/3 dell'INPS ({fmt(scenarioOtt.inpsAzienda)}) — ma questo costo è deducibile, quindi riduce IRES e IRAP.</span>
          </div>
        )}
      </div>

      {/* PERCHÉ QUESTA SCELTA - SEPARATORE */}
      <StrategySeparator
        icon={opt.compenso <= 28000 ? "🏆" : opt.compenso <= 50000 ? "✅" : "⚠️"}
        title={
          opt.compenso <= 28000
            ? "PERCHÉ €" + (opt.compenso / 1000).toFixed(0) + "k DI COMPENSO: Resti al 23% IRPEF"
            : opt.compenso <= 50000
            ? "PERCHÉ €" + (opt.compenso / 1000).toFixed(0) + "k DI COMPENSO: Il mix ottimale"
            : "COMPENSO ALTO: Serve perché il margine è molto elevato"
        }
        description={
          opt.compenso <= 28000
            ? "Fino a €28.000 paghi solo il 23% di IRPEF. Ogni euro di compenso in più oltre questa soglia salta al 33%. Il sistema ha trovato il punto esatto dove conviene fermarsi col compenso e passare ai dividendi."
            : opt.compenso <= 50000
            ? "Superi i €28.000 (IRPEF al 33%), ma conviene ancora rispetto ai dividendi che costano ~43,8% complessivo (IRES 24% + ritenuta 26%). Il vantaggio si riduce, ma c'è ancora."
            : "Con un margine così alto, il compenso conviene perché è deducibile da IRES. Anche al 43% di IRPEF, il costo netto del compenso (~27,6%) è inferiore al costo dei dividendi (~43,8%)."
        }
        highlight={opt.compenso <= 28000}
      />

      {/* ─── SPIEGAZIONE DIVIDENDI ─── */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-violet-400">
            💎 DIVIDENDI
            <InfoTip text="I dividendi sono la distribuzione degli utili della società al socio. Vengono tassati in modo diverso: prima la società paga IRES (24%) sull'utile, poi tu paghi una ritenuta secca del 26% su ciò che ricevi. Costo totale: circa il 43,8%." />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-violet-400">{opt.percDiv}%</span>
          <span className="text-xs text-gray-500">dell'utile netto distribuito</span>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">{fmt(scenarioOtt.dividendiNetti)}/anno netti in tasca</div>

        <div className="mt-3 bg-black/20 rounded-lg p-3 space-y-1.5">
          <div className="text-[10px] text-gray-500 font-semibold mb-1">Come funziona il percorso dividendi:</div>
          <TaxRow label="Margine dopo compenso" value={scenarioOtt.utileAnteImposte} color="text-white" sub="Utile lordo su cui la società paga le imposte" />
          <TaxRow label="IRES (24%) — imposta società" value={-scenarioOtt.ires} color="text-red-400" />
          <TaxRow label="IRAP (3,9%) — imposta regionale" value={-scenarioOtt.irap} color="text-red-400" />
          <TaxRow label="= Utile netto disponibile" value={scenarioOtt.utileNetto} color="text-white" />
          {opt.percDiv < 100 && (
            <TaxRow label={`Trattenuto in azienda (${100 - opt.percDiv}%)`} value={-(scenarioOtt.utileNetto - scenarioOtt.dividendiLordi)} color="text-gray-500" sub="Non paga il 26% — resta in azienda per investimenti" />
          )}
          <TaxRow label="Ritenuta dividendi (26%)" value={-scenarioOtt.ritenutaDividendi} color="text-red-400" sub="Tassa secca: la paghi quando incassi i dividendi" />
          <div className="border-t border-gray-700 pt-1.5">
            <TaxRow label="= Netto in tasca dai dividendi" value={scenarioOtt.dividendiNetti} color="text-green-400 font-bold" />
          </div>
        </div>
      </div>

      {/* PERCHÉ DISTRIBUZIONE DIVIDENDI */}
      {opt.percDiv < 100 && opt.percDiv > 0 && (
        <StrategySeparator
          icon="🏦"
          title={`PERCHÉ DISTRIBUIRE SOLO IL ${opt.percDiv}% DELL'UTILE`}
          description={`L'utile che resta in azienda NON paga la ritenuta del 26%. Puoi usarlo per investimenti, riserve, o distribuirlo negli anni successivi quando magari hai meno reddito e paghi meno tasse. Trattenere ${100 - opt.percDiv}% dell'utile ti fa risparmiare ${fmt((scenarioOtt.utileNetto - scenarioOtt.dividendiLordi) * 0.26)} di ritenuta.`}
          highlight
        />
      )}

      {/* ══════════════════════════════════════════════════
         STEP 4: QUANTO RISPARMI CON L'OTTIMIZZAZIONE
         ══════════════════════════════════════════════════ */}
      <StepHeader number="4" title="Quanto risparmi con questa strategia?" tooltip="Confrontiamo 3 scenari: pagarti solo coi dividendi (la scelta più comune e spesso sbagliata), pagarti solo col compenso, oppure il mix ottimizzato che il sistema ha trovato per te. La differenza è il risparmio fiscale." />

      <div className="grid grid-cols-3 gap-2">
        <ScenarioCard
          label="Solo dividendi"
          sublabel="Scelta comune"
          value={scenarioSoloDiv.totaleTasca}
          sublabel2="La più tassata"
          isWorst
        />
        <ScenarioCard
          label="🎯 Ottimizzato"
          sublabel="La scelta migliore"
          value={scenarioOtt.totaleTasca}
          sublabel2={risparmioVsDiv > 0 ? `+${fmt(risparmioVsDiv)} vs soli div.` : ""}
          isBest
        />
        <ScenarioCard
          label="Solo compenso"
          sublabel="Senza dividendi"
          value={scenarioSoloComp.totaleTasca}
          sublabel2=""
        />
      </div>

      {risparmioVsDiv > 500 && (
        <StrategySeparator
          icon="💰"
          title={`RISPARMI ${fmt(risparmioVsDiv)} ALL'ANNO`}
          description={`Rispetto a chi si paga solo con i dividendi (l'errore più comune), la strategia compenso + dividendi ottimizzata ti fa tenere ${fmt(risparmioVsDiv)} in più (${fmt(risparmioVsDiv/12)}/mese in più). Il compenso è deducibile da IRES: per ogni euro di compenso, la società risparmia fino a 24 centesimi di IRES.`}
          highlight
        />
      )}

      {/* ══════════════════════════════════════════════════
         STEP 5: ANDAMENTO MESE PER MESE
         ══════════════════════════════════════════════════ */}
      <StepHeader number="5" title="Andamento progressivo mese per mese" tooltip="Questa tabella ti mostra come evolvono i numeri man mano che fatturi durante l'anno. Il compenso ottimale e la percentuale dividendi cambiano perché l'IRPEF è progressiva: nei primi mesi con meno fatturato cumulato, il mix ideale è diverso da fine anno." />

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => setShowDettaglio(!showDettaglio)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors">
          <span>📈 Apri la tabella mensile</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDettaglio ? 'rotate-180' : ''}`} />
        </button>
        {showDettaglio && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-3 py-2 text-gray-500">Mese</th>
                  <th className="text-right px-3 py-2 text-gray-500">Fatturato</th>
                  <th className="text-right px-3 py-2 text-gray-500">Cumulato</th>
                  <th className="text-right px-3 py-2 text-gray-500">
                    Comp.
                    <InfoTip text="Compenso amministratore ottimale calcolato sul fatturato cumulato fino a quel mese." />
                  </th>
                  <th className="text-right px-3 py-2 text-gray-500">
                    Div.
                    <InfoTip text="Percentuale dell'utile netto da distribuire come dividendi per massimizzare il netto." />
                  </th>
                  <th className="text-right px-3 py-2 text-gray-500">Netto</th>
                  <th className="text-right px-3 py-2 text-gray-500">Press.</th>
                </tr>
              </thead>
              <tbody>
                {analisiMensile.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5">
                    <td className="px-3 py-2 text-gray-300 font-medium">{r.mese}</td>
                    <td className="px-3 py-2 text-right text-white">{fmt(r.fatturato)}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{fmt(r.cum)}</td>
                    <td className="px-3 py-2 text-right text-blue-400">{fmt(r.comp)}</td>
                    <td className="px-3 py-2 text-right text-violet-400">{r.div}%</td>
                    <td className="px-3 py-2 text-right text-green-400 font-bold">{fmt(r.netto)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={r.press > 50 ? 'text-red-400' : r.press > 40 ? 'text-amber-400' : 'text-green-400'}>
                        {r.press.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ RIEPILOGO FINALE ═══ */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-xs font-bold text-gray-400 mb-3">📋 RIEPILOGO ANNUALE</div>
        <div className="space-y-1.5">
          <SummaryRow label="Fatturato totale" value={totFatturato} />
          <SummaryRow label={`Costi operativi (${costiPercLocal}%)`} value={-costiTotali} color="text-amber-400" />
          <div className="border-t border-gray-800 my-1" />
          <SummaryRow label="Margine lordo" value={margine} />
          <SummaryRow label={`Compenso amm.re + INPS aziendale`} value={-(scenarioOtt.costoCompensoPerSocieta)} color="text-blue-400" />
          <SummaryRow label="IRES (24%)" value={-scenarioOtt.ires} color="text-red-400" />
          <SummaryRow label="IRAP (3,9%)" value={-scenarioOtt.irap} color="text-red-400" />
          <SummaryRow label="IRPEF + addizionali su compenso" value={-(scenarioOtt.irpef + scenarioOtt.addRegionale + scenarioOtt.addComunale)} color="text-red-400" />
          <SummaryRow label="INPS amm.re (1/3)" value={-scenarioOtt.inpsAmministratore} color="text-red-400" />
          <SummaryRow label="Ritenuta dividendi (26%)" value={-scenarioOtt.ritenutaDividendi} color="text-violet-400" />
          <div className="border-t border-gray-700 pt-2 mt-2">
            <SummaryRow label="💰 NETTO IN TASCA" value={scenarioOtt.totaleTasca} color="text-green-400 text-base font-black" bold />
          </div>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="text-center text-[10px] text-gray-600 px-2 leading-relaxed">
        ⚠️ Simulazione orientativa basata sulla normativa 2026. Non sostituisce il commercialista. L'ottimizzazione non tiene conto di eventuali detrazioni personali, redditi esteri, o regimi particolari.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SOTTO-COMPONENTI
   ═══════════════════════════════════════════════════════ */
function IntroSection() {
  return (
    <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(59,130,246,0.05) 100%)", border: "1px solid rgba(212,175,55,0.15)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🧮</span>
        <h2 className="text-white font-bold text-base">Pianificatore Fiscale Mensile</h2>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">
        Inserisci il tuo fatturato previsto mese per mese e il sistema calcolerà <strong className="text-white">automaticamente</strong> la strategia migliore per pagare meno tasse: quanto pagarti come compenso, quanto distribuire in dividendi, e quanto trattenere in azienda.
      </p>
      <p className="text-[10px] text-gray-500 mt-2">
        Tocca i <span className="text-amber-400">❓</span> per capire il perché di ogni scelta.
      </p>
    </div>
  );
}

function StepHeader({ number, title, tooltip }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-blue-400">{number}</span>
      </div>
      <div className="flex items-center gap-1">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {tooltip && <InfoTip text={tooltip} />}
      </div>
    </div>
  );
}

function FatturatoInput({ mesi, updateMese, totFatturato, distribuisciUniforme }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">Fatturato annuo totale:</span>
        <span className="text-base font-bold text-white">{new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totFatturato)}</span>
      </div>

      {/* Quick fill */}
      <div className="flex gap-2 mb-3">
        {[200000, 300000, 500000, 800000].map(t => {
          const label = t >= 1000000 ? `${t/1000000}M` : `${t/1000}k`;
          const active = Math.abs(totFatturato - t) < t * 0.05;
          return (
            <button key={t} onClick={() => distribuisciUniforme(t)}
              className={`flex-1 py-1.5 rounded text-xs font-semibold transition-colors ${
                active ? "bg-blue-900 text-blue-300 border border-blue-700" : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-transparent"
              }`}>{label}</button>
          );
        })}
      </div>

      {/* Grid mesi */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {MESI_NOMI.map((m, i) => (
          <div key={i}>
            <label className="text-[10px] text-gray-500 block mb-0.5">{m.slice(0,3)}</label>
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

      {/* Barra visuale */}
      <div className="flex gap-px h-8 rounded-lg overflow-hidden mt-3">
        {mesi.map((m, i) => {
          const maxM = Math.max(...mesi, 1);
          const h = Math.max((m / maxM) * 100, 5);
          return (
            <div key={i} className="flex-1 flex flex-col justify-end" title={`${MESI_SHORT[i]}: ${new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(m)}`}>
              <div className="rounded-t-sm transition-all duration-300" style={{ height: `${h}%`, backgroundColor: m > 0 ? '#3B82F6' : '#1F2937' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaxRow({ label, value, color = "text-white", sub }) {
  const f = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  return (
    <div>
      <div className={`flex justify-between text-[11px] ${color}`}>
        <span>{label}</span>
        <span className="font-mono">{f}</span>
      </div>
      {sub && <div className="text-[9px] text-gray-600 mt-0.5 pl-1">{sub}</div>}
    </div>
  );
}

function ScenarioCard({ label, sublabel, value, sublabel2, isBest, isWorst }) {
  const f = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  return (
    <div className="rounded-lg p-3 text-center" style={{
      backgroundColor: isBest ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
      border: isBest ? "1px solid rgba(16,185,129,0.25)" : isWorst ? "1px solid rgba(239,68,68,0.2)" : "1px solid transparent",
    }}>
      <div className={`text-[10px] mb-0.5 ${isBest ? 'text-green-400 font-bold' : isWorst ? 'text-red-400' : 'text-gray-500'}`}>{label}</div>
      <div className={`text-sm font-bold ${isBest ? 'text-green-400' : isWorst ? 'text-red-400' : 'text-gray-400'}`}>{f}</div>
      <div className="text-[9px] text-gray-600 mt-0.5">{sublabel}</div>
      {sublabel2 && <div className={`text-[9px] mt-0.5 ${isBest ? 'text-green-500' : 'text-gray-600'}`}>{sublabel2}</div>}
    </div>
  );
}

function SummaryRow({ label, value, color = "text-white", bold }) {
  const f = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  return (
    <div className={`flex justify-between text-xs ${color}`}>
      <span>{label}</span>
      <span className={`font-mono ${bold ? 'font-black' : ''}`}>{f}</span>
    </div>
  );
}