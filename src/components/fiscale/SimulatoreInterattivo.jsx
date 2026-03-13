import React, { useState, useMemo } from "react";
import { HelpCircle, X } from "lucide-react";
import PianificatoreMensile from "./PianificatoreMensile";

/* Tooltip spiegazione ❓ */
function Tip({ text }) {
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
   PARAMETRI FISCALI ITALIA 2026
   Fonti:
   - IRPEF: Legge di Bilancio 2026 (3 scaglioni: 23% fino 28k, 33% 28k-50k, 43% oltre 50k)
   - IRES: art. 77 TUIR — 24% ordinaria
   - IRAP: art. 16 D.Lgs. 446/1997 — 3,9% base
   - INPS GS co.co.co.: Circ. INPS n.8 del 03/02/2026 — 35,03% (IVS 33% + accessorie 2,03%)
   - INPS GS massimale: 122.295€ (Circ. INPS 8/2026)
   - INPS GS ripartizione: 2/3 committente, 1/3 collaboratore
   - Dividendi: art. 27 DPR 600/1973 — ritenuta 26% a titolo d'imposta
   - Deduzione contributi INPS: art. 10 TUIR — integralmente deducibili dal reddito
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

/* ═══════════════════════════════════════════════════════
   VOCI DI COSTO — Art. 2425 c.c. Sez. B + C.17
   ═══════════════════════════════════════════════════════ */
const GRUPPI = [
  {
    id: "prod", label: "Acquisti e produzione", icon: "🏭", col: "#EF4444",
    voci: [
      { k: "materie_prime",   l: "Materie prime e componenti" },
      { k: "semilavorati",    l: "Semilavorati e lav. c/terzi" },
      { k: "imballaggi",      l: "Imballaggi e confezionamento" },
      { k: "consumabili",     l: "Consumabili, utensileria, DPI" },
      { k: "rifiuti",         l: "Smaltimento rifiuti e ambiente" },
    ]
  },
  {
    id: "pers", label: "Personale dipendente", icon: "👷", col: "#3B82F6",
    voci: [
      { k: "salari",          l: "Salari e stipendi lordi" },
      { k: "oneri_sociali",   l: "Oneri sociali (INPS/INAIL)" },
      { k: "tfr",             l: "TFR accantonato" },
      { k: "interinali",      l: "Interinali / somministrati" },
      { k: "formazione",      l: "Formazione e sicurezza" },
    ]
  },
  {
    id: "strutt", label: "Struttura e utenze", icon: "🏢", col: "#8B5CF6",
    voci: [
      { k: "affitto",         l: "Affitto capannone / uffici" },
      { k: "elettricita",     l: "Energia elettrica" },
      { k: "gas",             l: "Gas e riscaldamento" },
      { k: "acqua",           l: "Acqua" },
      { k: "manutenzione",    l: "Manutenzione impianti e macc." },
      { k: "pulizie",         l: "Pulizie e vigilanza" },
    ]
  },
  {
    id: "serv", label: "Servizi esterni", icon: "📋", col: "#F59E0B",
    voci: [
      { k: "trasporti",       l: "Trasporti e logistica" },
      { k: "commercialista",  l: "Commercialista e consulenze" },
      { k: "legali",          l: "Spese legali e notarili" },
      { k: "telefonia",       l: "Telefonia e internet" },
      { k: "software",        l: "Software e abbonamenti" },
      { k: "marketing",       l: "Marketing, pubblicità, fiere" },
    ]
  },
  {
    id: "fin", label: "Ammortamenti e finanza", icon: "🏦", col: "#10B981",
    voci: [
      { k: "amm_macchinari",  l: "Amm.to macchinari e attrezz." },
      { k: "amm_immobili",    l: "Amm.to fabbricato e migliorie" },
      { k: "leasing",         l: "Leasing e noleggio operativo" },
      { k: "interessi",       l: "Interessi passivi su mutui" },
    ]
  },
  {
    id: "altro", label: "Oneri diversi", icon: "📦", col: "#6B7280",
    voci: [
      { k: "assicurazioni",   l: "Assicurazioni aziendali" },
      { k: "imu_tari",        l: "IMU, TARI e tributi locali" },
      { k: "viaggi",          l: "Viaggi e trasferte" },
      { k: "rappresentanza",  l: "Rappresentanza e omaggi" },
      { k: "varie",           l: "Varie e imprevisti" },
    ]
  },
];

const ALL_KEYS = GRUPPI.flatMap(g => g.voci.map(v => v.k));

/* ═══════════════════════════════════════════════════════
   PRESET ATECO — % sul fatturato per ogni voce
   ═══════════════════════════════════════════════════════ */
const ATECO = {
  "10": {
    n: "Alimentare",
    v: { materie_prime:30, semilavorati:8, imballaggi:5, consumabili:2, rifiuti:1,
         salari:12, oneri_sociali:5, tfr:1.5, interinali:2, formazione:0.5,
         affitto:4, elettricita:3, gas:1.5, acqua:0.5, manutenzione:2, pulizie:0.5,
         trasporti:4, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:1.5,
         amm_macchinari:4, amm_immobili:1.5, leasing:1, interessi:0.8,
         assicurazioni:1.2, imu_tari:0.8, viaggi:0.5, rappresentanza:0.5, varie:1 }
  },
  "16": {
    n: "Legno",
    v: { materie_prime:25, semilavorati:6, imballaggi:3, consumabili:3, rifiuti:1.5,
         salari:14, oneri_sociali:5.5, tfr:1.5, interinali:2, formazione:0.5,
         affitto:4, elettricita:3.5, gas:2, acqua:0.3, manutenzione:3, pulizie:0.5,
         trasporti:3, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:1,
         amm_macchinari:5, amm_immobili:2, leasing:1.5, interessi:1,
         assicurazioni:1.2, imu_tari:1, viaggi:0.5, rappresentanza:0.3, varie:1 }
  },
  "25": {
    n: "Prodotti in metallo",
    v: { materie_prime:22, semilavorati:8, imballaggi:2, consumabili:3, rifiuti:1,
         salari:16, oneri_sociali:6.5, tfr:2, interinali:3, formazione:0.5,
         affitto:3.5, elettricita:3, gas:1.5, acqua:0.3, manutenzione:3, pulizie:0.5,
         trasporti:3, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:0.8,
         amm_macchinari:5, amm_immobili:1.5, leasing:2, interessi:1,
         assicurazioni:1, imu_tari:0.8, viaggi:0.5, rappresentanza:0.3, varie:1 }
  },
  "28": {
    n: "Macchinari",
    v: { materie_prime:20, semilavorati:10, imballaggi:2, consumabili:2, rifiuti:0.5,
         salari:15, oneri_sociali:6, tfr:2, interinali:2, formazione:1,
         affitto:3, elettricita:2.5, gas:1, acqua:0.2, manutenzione:2.5, pulizie:0.5,
         trasporti:4, commercialista:1.5, legali:0.5, telefonia:0.4, software:1, marketing:2,
         amm_macchinari:5, amm_immobili:1.5, leasing:2, interessi:1,
         assicurazioni:1, imu_tari:0.8, viaggi:1.5, rappresentanza:0.5, varie:1 }
  },
  "31": {
    n: "Mobili",
    v: { materie_prime:22, semilavorati:8, imballaggi:4, consumabili:2, rifiuti:1,
         salari:15, oneri_sociali:5.5, tfr:1.5, interinali:2, formazione:0.5,
         affitto:4, elettricita:2.5, gas:1, acqua:0.3, manutenzione:2, pulizie:0.5,
         trasporti:4, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:3,
         amm_macchinari:5, amm_immobili:2, leasing:1.5, interessi:1,
         assicurazioni:1, imu_tari:0.8, viaggi:0.8, rappresentanza:0.5, varie:1 }
  },
};

/* ═══════════════════════════════════════════════════════
   MOTORE DI CALCOLO FISCALE
   ═══════════════════════════════════════════════════════ */
function calcolaIrpef(imponibile) {
  let imposta = 0;
  for (const scaglione of FISCO.irpef) {
    if (imponibile <= scaglione.min) break;
    imposta += (Math.min(imponibile, scaglione.max) - scaglione.min) * scaglione.aliquota;
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
  // IRAP è un costo della società ma non riduce l'utile distribuibile ai fini civilistici
  // L'utile netto distribuibile = utile ante imposte - IRES (l'IRAP è costo a CE separato)
  const utileNetto = utileAnteImposte - ires;
  const dividendiLordi = Math.max(0, utileNetto) * (percDividendi / 100);
  const ritenutaDividendi = dividendiLordi * FISCO.ritenuta_dividendi;
  const dividendiNetti = dividendiLordi - ritenutaDividendi;
  // I contributi INPS a carico dell'amministratore sono integralmente deducibili (art. 10 TUIR)
  const imponibileIrpef = Math.max(0, compensoLordo - inpsAmministratore);
  const irpef = calcolaIrpef(imponibileIrpef);
  const addRegionale = imponibileIrpef * FISCO.add_regionale;
  const addComunale = imponibileIrpef * FISCO.add_comunale;
  const nettoCompenso = Math.max(0, compensoLordo - inpsAmministratore - irpef - addRegionale - addComunale);
  const totaleTasca = dividendiNetti + nettoCompenso;
  const pressioneFiscale = margine > 0 ? ((margine - totaleTasca) / margine) * 100 : 0;

  const steps = [
    { l: "💰 Il tuo fatturato", v: fatturato, d: 0, t: "start" },
    { l: "📦 Costi dell'attività", d: -costiTotali, t: "costo" },
    { l: "💼 Compenso + contrib. INPS", d: -costoCompensoPerSocieta, t: "costo" },
    { l: "🏛️ IRAP (tassa regionale)", d: -irap, t: "tassa" },
    { l: "🏛️ IRES (tassa sugli utili)", d: -ires, t: "tassa" },
    ...(dividendiLordi > 0 ? [
      { l: `🏦 Utile che resta in azienda`, d: -(Math.max(0, utileNetto) - dividendiLordi), t: "neutro" },
      { l: "💎 Tassa sui dividendi (26%)", d: -ritenutaDividendi, t: "tassa" },
    ] : []),
  ];

  return {
    steps, fatturato, costiTotali, margine,
    compensoLordo, inpsTotale, inpsAzienda, inpsAmministratore,
    costoCompensoPerSocieta, utileAnteImposte, irap, ires, utileNetto,
    dividendiLordi, ritenutaDividendi, dividendiNetti,
    imponibileIrpef, irpef, addRegionale, addComunale,
    nettoCompenso, totaleTasca, pressioneFiscale,
  };
}

/* ═══════════════════════════════════════════════════════
   UTILITÀ
   ═══════════════════════════════════════════════════════ */
const fmt = n => new Intl.NumberFormat("it-IT", {
  style: "currency", currency: "EUR", maximumFractionDigits: 0
}).format(n);

/* ═══════════════════════════════════════════════════════
   COMPONENTI UI
   ═══════════════════════════════════════════════════════ */

function Slider({ label, value, onChange, min, max, step, suffix = "€", sub }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-xl font-bold text-white">
          {suffix === "%" ? `${value}%` : fmt(value)}
        </span>
      </div>
      {sub && <p className="text-xs text-gray-500 mb-1">{sub}</p>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #3B82F6 ${((value - min) / (max - min)) * 100}%, #374151 ${((value - min) / (max - min)) * 100}%)` }} />
    </div>
  );
}

function DetailRow({ label, value, color = "text-white", note }) {
  return (
    <div>
      <div className={`flex justify-between text-[11px] py-0.5 ${color}`}>
        <span className="pr-2">{label}</span>
        <span className="font-mono whitespace-nowrap">{fmt(value)}</span>
      </div>
      {note && <div className="text-[9px] text-gray-600 pl-1 pb-1">{note}</div>}
    </div>
  );
}

function WBar({ step, maxVal }) {
  const pct = Math.abs(step.d || step.v) / maxVal * 100;
  const col = { start: "#3B82F6", costo: "#F59E0B", tassa: "#EF4444", neutro: "#4B5563" };
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-32 sm:w-48 text-right text-xs font-medium text-gray-300 shrink-0">{step.l}</div>
      <div className="flex-1 h-7">
        <div className="h-full rounded-sm flex items-center transition-all duration-500"
          style={{ width: `${Math.max(pct, 2.5)}%`, backgroundColor: col[step.t], opacity: 0.85 }}>
          <span className="text-xs font-bold text-white px-2 whitespace-nowrap">
            {step.t === "start" ? fmt(step.v) : fmt(step.d)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPALE
   ═══════════════════════════════════════════════════════ */
export default function SimulatoreInterattivo({ user }) {
  const initVals = {};
  ALL_KEYS.forEach(k => { initVals[k] = 0; });
  Object.assign(initVals, {
    materie_prime:66000, semilavorati:24000, imballaggi:6000, consumabili:6000, rifiuti:3000,
    salari:42000, oneri_sociali:16500, tfr:4500, interinali:6000, formazione:1500,
    affitto:12000, elettricita:9000, gas:4500, acqua:900, manutenzione:7500, pulizie:1500,
    trasporti:9000, commercialista:3000, legali:900, telefonia:900, software:1500, marketing:3000,
    amm_macchinari:15000, amm_immobili:4500, leasing:4500, interessi:3000,
    assicurazioni:3000, imu_tari:2400, viaggi:1500, rappresentanza:900, varie:3000,
  });

  const [fatt, setFatt] = useState(300000);
  const [cv, setCv] = useState(initVals);
  const [comp, setComp] = useState(36000);
  const [pDiv, setPDiv] = useState(80);
  const [detCosti, setDetCosti] = useState(false);
  const [openGruppi, setOpenGruppi] = useState({});
  const [detComp, setDetComp] = useState(false);
  const [confronto, setConfronto] = useState(false);
  const [compB, setCompB] = useState(60000);
  const [pDivB, setPDivB] = useState(50);
  const [showAteco, setShowAteco] = useState(false);
  const [showPianificatore, setShowPianificatore] = useState(false);

  const costi = useMemo(() => Object.values(cv).reduce((a, b) => a + b, 0), [cv]);

  const updCat = (k, v) => setCv(prev => ({ ...prev, [k]: v }));
  const toggleGruppo = (id) => setOpenGruppi(prev => ({ ...prev, [id]: !prev[id] }));

  const scalaCosti = (target) => {
    const ratio = target / Math.max(1, costi);
    const n = {};
    Object.entries(cv).forEach(([k, val]) => { n[k] = Math.round(val * ratio); });
    setCv(n);
  };

  const applyAteco = (code) => {
    const p = ATECO[code].v;
    const n = {};
    ALL_KEYS.forEach(k => { n[k] = Math.round(fatt * (p[k] || 0) / 100); });
    setCv(n);
    setShowAteco(false);
  };

  const gruppoTotale = (g) => g.voci.reduce((s, v) => s + (cv[v.k] || 0), 0);

  const A = useMemo(() => calcolaScenario({
    fatturato: fatt, costiTotali: costi, compensoLordo: comp, percDividendi: pDiv
  }), [fatt, costi, comp, pDiv]);

  const B = useMemo(() => calcolaScenario({
    fatturato: fatt, costiTotali: costi, compensoLordo: compB, percDividendi: pDivB
  }), [fatt, costi, compB, pDivB]);

  return (
    <div className="space-y-4">

      {/* HEADER CONFRONTO */}
      <div className="flex justify-end">
        <button onClick={() => setConfronto(!confronto)}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            confronto ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}>
          {confronto ? "✕ Chiudi confronto" : "⚖️ Confronta scenari"}
        </button>
      </div>

      {/* ═══ PARAMETRI ═══ */}
      <div className="rounded-xl p-5"
        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>

        {/* FATTURATO — slider + input manuale */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-300">Fatturato annuo</label>
            <input
              type="text"
              inputMode="numeric"
              value={fatt.toLocaleString("it-IT")}
              onChange={e => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                const v = Math.max(0, Number(raw));
                const r = v / Math.max(1, fatt);
                setFatt(v);
                const n = {};
                Object.entries(cv).forEach(([k2, val2]) => { n[k2] = Math.round(val2 * r); });
                setCv(n);
              }}
              className="text-xl font-bold text-white text-right bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none w-36 px-1"
            />
          </div>
          <input type="range" min={0} max={5000000} step={5000} value={Math.min(fatt, 5000000)}
            onChange={e => {
              const v = Number(e.target.value);
              const r = v / Math.max(1, fatt);
              setFatt(v);
              const n = {};
              Object.entries(cv).forEach(([k2, val2]) => { n[k2] = Math.round(val2 * r); });
              setCv(n);
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #3B82F6 ${(Math.min(fatt, 5000000) / 5000000) * 100}%, #374151 ${(Math.min(fatt, 5000000) / 5000000) * 100}%)` }} />
          {fatt > 5000000 && <p className="text-[10px] text-amber-400 mt-1">Valore oltre il max della barra — usa il campo sopra per valori superiori</p>}
        </div>

        {/* COSTI — slider + input manuale */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-300">Costi operativi</label>
            <input
              type="text"
              inputMode="numeric"
              value={costi.toLocaleString("it-IT")}
              onChange={e => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                const v = Math.max(0, Number(raw));
                scalaCosti(v);
              }}
              className="text-xl font-bold text-amber-400 text-right bg-transparent border-b border-gray-600 focus:border-amber-500 outline-none w-36 px-1"
            />
          </div>
          <p className="text-xs text-gray-500 mb-1">
            {fatt > 0 ? ((costi / fatt) * 100).toFixed(0) : 0}% del fatturato · Margine {fmt(fatt - costi)}
          </p>
          <input type="range" min={0} max={5000000} step={500} value={Math.min(costi, 5000000)}
            onChange={e => scalaCosti(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #F59E0B ${(Math.min(costi, 5000000) / 5000000) * 100}%, #374151 ${(Math.min(costi, 5000000) / 5000000) * 100}%)` }} />
          {costi > 5000000 && <p className="text-[10px] text-amber-400 mt-1">Valore oltre il max della barra — usa il campo sopra</p>}
        </div>

        {/* BOTTONE DETTAGLIO */}
        <button onClick={() => setDetCosti(!detCosti)}
          className="w-full py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center gap-1.5"
          style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
          <span style={{ fontSize: "8px" }}>{detCosti ? "▼" : "▶"}</span>
          {detCosti ? "Chiudi dettaglio" : "Dettaglio per voce di costo"}
        </button>

        {/* ─── DETTAGLIO COSTI A GRUPPI ACCORDION ─── */}
        {detCosti && (
          <div className="mt-3 space-y-2">
            {/* Barra composizione */}
            <div className="flex gap-px h-3 rounded-full overflow-hidden mb-3">
              {GRUPPI.map(g => {
                const tot = gruppoTotale(g);
                const pct = costi > 0 ? (tot / costi) * 100 : 0;
                return pct > 0.5 ? (
                  <div key={g.id} className="transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: g.col }} />
                ) : null;
              })}
            </div>
            {/* Legenda */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
              {GRUPPI.map(g => {
                const tot = gruppoTotale(g);
                return tot > 0 ? (
                  <div key={g.id} className="flex items-center gap-1 text-xs text-gray-400">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: g.col }} />
                    {g.label} <span className="text-gray-500">
                      {((tot / costi) * 100).toFixed(0)}%
                    </span>
                  </div>
                ) : null;
              })}
            </div>

            {/* Gruppi accordion */}
            {GRUPPI.map(g => {
              const tot = gruppoTotale(g);
              const isOpen = openGruppi[g.id];
              return (
                <div key={g.id} className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${isOpen ? g.col + "40" : "rgba(255,255,255,0.05)"}` }}>
                  <button onClick={() => toggleGruppo(g.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-white/5"
                    style={{ backgroundColor: isOpen ? g.col + "10" : "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-2">
                      <span>{g.icon}</span>
                      <span className="text-sm font-medium text-gray-200">{g.label}</span>
                      <span className="text-xs text-gray-500">({g.voci.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{fmt(tot)}</span>
                      <span style={{ fontSize: "8px", color: "#9CA3AF" }}>
                        {isOpen ? "▼" : "▶"}
                      </span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 py-2 space-y-2"
                      style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                      {g.voci.map(v => {
                        const val = cv[v.k] || 0;
                        const mx = Math.round(fatt * 0.4);
                        return (
                          <div key={v.k}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-gray-400">{v.l}</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={val}
                                onChange={e => updCat(v.k, Math.max(0, Number(e.target.value) || 0))}
                                className="text-xs font-bold text-gray-200 text-right bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none w-20 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <input type="range" min={0} max={mx} step={500} value={val}
                              onChange={e => updCat(v.k, Number(e.target.value))}
                              className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                              style={{ background: `linear-gradient(to right, ${g.col} ${(val / mx) * 100}%, #1F2937 ${(val / mx) * 100}%)` }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Totale + ATECO */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <div className="relative">
                <button onClick={() => setShowAteco(!showAteco)}
                  className="text-xs text-blue-400 hover:text-blue-300">
                  🎯 Pre-compila dal settore
                </button>
                {showAteco && (
                  <div className="absolute left-0 bottom-7 z-50 rounded-xl p-2 w-52 shadow-2xl"
                    style={{ backgroundColor: "#1E293B", border: "1px solid rgba(59,130,246,0.3)" }}>
                    {Object.entries(ATECO).map(([c, d]) => (
                      <button key={c} onClick={() => applyAteco(c)}
                        className="w-full text-left px-3 py-1.5 rounded text-xs text-gray-300 hover:bg-gray-700 hover:text-white">
                        <span className="text-blue-400 font-bold">{c}</span> {d.n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-base font-bold text-amber-400">{fmt(costi)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Come ti paghi */}
      <div className="rounded-xl p-5"
        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          {confronto ? "Scenario A" : "💼 Come ti paghi"}
        </h2>
        <p className="text-[11px] text-gray-500 mb-4">Ci sono due modi per portare i soldi dalla SRL alla tua tasca. Regola entrambi per trovare il mix migliore.</p>
        <Slider label="Compenso amministratore (lordo annuo)" value={comp}
          onChange={setComp} min={0} max={120000} step={3000}
          sub="È lo 'stipendio' che ti dai come amministratore. Viene tassato con IRPEF + contributi INPS, ma riduce le tasse della società." />
        <Slider label="Quanta % dell'utile distribuisci come dividendi?" value={pDiv}
          onChange={setPDiv} min={0} max={100} step={5} suffix="%"
          sub="I dividendi sono la quota di utili che prelevi. Paghi il 26% secco. Il resto può restare in azienda senza pagare questa tassa." />
        {confronto && (
          <>
            <div className="border-t border-gray-800 my-4" />
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">
              Scenario B
            </h2>
            <Slider label="Compenso Amm.re (lordo)" value={compB}
              onChange={setCompB} min={0} max={120000} step={3000} />
            <Slider label="% utile → dividendi" value={pDivB}
              onChange={setPDivB} min={0} max={100} step={5} suffix="%" />
          </>
        )}
      </div>

      {/* ═══ RISULTATI ═══ */}

      {/* QUANTO TI RESTA IN TASCA */}
      <div className="rounded-xl p-6 text-center" style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.1) 100%)",
        border: "1px solid rgba(16,185,129,0.2)",
      }}>
        <div className="text-sm text-gray-400 mb-1">
          💰 Quanto ti resta davvero in tasca, dopo tutte le tasse
          <Tip text="Questo è il totale che arriva sul tuo conto personale in un anno, sommando ciò che ricevi come compenso (il tuo 'stipendio' da amministratore) e ciò che ricevi come dividendi (la tua quota di utili). Tutte le tasse sono già tolte." />
        </div>
        <div className="text-5xl font-black text-green-400 tracking-tight">
          {fmt(A.totaleTasca)}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Cioè circa <strong className="text-white">{fmt(A.totaleTasca / 12)} al mese</strong> sul tuo conto
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Pressione fiscale: <span className="text-amber-400 font-bold">{A.pressioneFiscale.toFixed(1)}%</span>
          <Tip text={`Significa che su ogni €100 di margine (fatturato meno costi), ${A.pressioneFiscale.toFixed(0)} euro vanno in tasse e contributi. Il resto è tuo.`} />
        </div>
        {/* Dettaglio: da dove arrivano i soldi */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-left">
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-[10px] text-gray-500">
              Dal compenso amm.re
              <Tip text="Questa è la parte del tuo reddito che arriva dallo 'stipendio' che ti sei dato come amministratore. Ha già pagato IRPEF, contributi INPS e addizionali." />
            </div>
            <div className="text-lg font-bold text-blue-400">{fmt(A.nettoCompenso)}</div>
            <div className="text-[10px] text-gray-600">{fmt(A.nettoCompenso / 12)}/mese netti</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-[10px] text-gray-500">
              Dai dividendi
              <Tip text="Questa è la parte del tuo reddito che arriva dalla distribuzione degli utili della società. Ha già pagato IRES (24%) a livello societario e la ritenuta del 26% a livello personale." />
            </div>
            <div className="text-lg font-bold text-violet-400">{fmt(A.dividendiNetti)}</div>
            <div className="text-[10px] text-gray-600">dopo ritenuta 26%</div>
          </div>
        </div>
        {confronto && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-xs text-gray-500 mb-1">Scenario B</div>
            <div className="text-3xl font-bold text-amber-400">{fmt(B.totaleTasca)}</div>
            <div className={`text-sm mt-1 font-semibold ${
              B.totaleTasca > A.totaleTasca ? "text-green-400" : "text-red-400"
            }`}>
              {B.totaleTasca > A.totaleTasca ? "▲" : "▼"}{" "}
              {fmt(Math.abs(B.totaleTasca - A.totaleTasca))}/anno
              <span className="text-gray-500 font-normal ml-1">
                ({fmt(Math.abs(B.totaleTasca - A.totaleTasca) / 12)}/mese)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* RIEPILOGO TASSE — spiegato semplice */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
          📊 Dettaglio delle tasse che paghi
        </h2>
        <p className="text-[10px] text-gray-500 mb-3">Ecco dove vanno i tuoi soldi, voce per voce. Tocca i ❓ per capire cosa significa ogni tassa.</p>
        <div className="grid grid-cols-2 gap-3">
          {/* IRPEF */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="text-xs text-gray-400 mb-1">
              IRPEF (tassa sul reddito)
              <Tip text="L'IRPEF è la tassa personale che paghi sul tuo compenso da amministratore. È progressiva: i primi €28.000 pagano il 23%, da €28k a €50k il 33%, oltre €50k il 43%. Più alto il compenso, più alta la percentuale." />
            </div>
            <div className="text-xl font-bold text-red-400">{fmt(A.irpef)}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {comp <= 28000 ? "Fascia 23% — la più bassa ✅" : comp <= 50000 ? "Fascia fino al 33%" : "Fascia fino al 43%"}
            </div>
          </div>
          {/* INPS */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="text-xs text-gray-400 mb-1">
              INPS (contributi pensione)
              <Tip text={`L'INPS Gestione Separata è il contributo previdenziale che si paga sul compenso dell'amministratore. L'aliquota è del 35,03%. Di questa, 2/3 li paga la società (${fmt(A.inpsAzienda)}) e 1/3 lo paghi tu (${fmt(A.inpsAmministratore)}). Servono per la tua pensione.`} />
            </div>
            <div className="text-xl font-bold text-amber-400">{fmt(A.inpsTotale)}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              Società paga {fmt(A.inpsAzienda)} · tu paghi {fmt(A.inpsAmministratore)}
            </div>
          </div>
          {/* IRES */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="text-xs text-gray-400 mb-1">
              IRES (tassa sugli utili)
              <Tip text="L'IRES è la tassa che paga la SRL sui suoi utili. L'aliquota è fissa al 24%. Si calcola sull'utile della società DOPO aver tolto il tuo compenso e i costi. Quindi più compenso ti dai, meno IRES paga la società." />
            </div>
            <div className="text-xl font-bold text-red-400">{fmt(A.ires)}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">24% fisso sull'utile della società</div>
          </div>
          {/* IRAP */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="text-xs text-gray-400 mb-1">
              IRAP (tassa regionale)
              <Tip text="L'IRAP è un'imposta regionale che si paga sul margine (fatturato - costi). L'aliquota base è del 3,9%. Non puoi dedurre il compenso dell'amministratore dall'IRAP, quindi si calcola sul margine pieno." />
            </div>
            <div className="text-xl font-bold text-red-400">{fmt(A.irap)}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">3,9% sul margine lordo</div>
          </div>
          {/* Ritenuta dividendi */}
          {A.dividendiLordi > 0 && (
            <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <div className="text-xs text-gray-400 mb-1">
                Ritenuta dividendi
                <Tip text="Quando prelevi gli utili dalla SRL come dividendi, paghi una tassa secca del 26%. Questa si aggiunge all'IRES già pagata dalla società. Per questo i dividendi costano in totale circa il 43,8%." />
              </div>
              <div className="text-xl font-bold text-violet-400">{fmt(A.ritenutaDividendi)}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">26% secco sui dividendi lordi</div>
            </div>
          )}
          {/* Addizionali */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            <div className="text-xs text-gray-400 mb-1">
              Addizionali IRPEF
              <Tip text="Sono tasse aggiuntive regionali (~1,7%) e comunali (~0,8%) che si pagano oltre all'IRPEF, calcolate sul tuo compenso. Variano da regione a regione e da comune a comune." />
            </div>
            <div className="text-xl font-bold text-white">{fmt(A.addRegionale + A.addComunale)}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">regionale + comunale</div>
          </div>
        </div>
      </div>

      {/* WATERFALL — Dove vanno i tuoi soldi */}
      <div className="rounded-xl p-5"
        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            🔍 Dove vanno i tuoi soldi
          </h2>
          <button onClick={() => setDetComp(!detComp)}
            className="text-xs text-blue-400 hover:text-blue-300">
            {detComp ? "Chiudi dettaglio" : "📋 Vedi calcoli compenso"}
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mb-3">Dal fatturato, ogni barra mostra quanto viene "tolto" — ciò che resta alla fine è tuo.</p>
        {A.steps.map((s, i) => <WBar key={i} step={s} maxVal={fatt} />)}
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="flex items-center gap-3 py-1.5">
            <div className="w-32 sm:w-48 text-right text-xs font-bold text-green-400 shrink-0">
              💰 IN TASCA AL SOCIO
            </div>
            <div className="flex-1 h-8">
              <div className="h-full rounded-sm flex items-center transition-all duration-500"
                style={{
                  width: `${Math.max((A.totaleTasca / fatt) * 100, 5)}%`,
                  background: "linear-gradient(90deg, #10B981, #34D399)",
                }}>
                <span className="text-sm font-black text-white px-2 whitespace-nowrap">
                  {fmt(A.totaleTasca)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETTAGLIO COMPENSO — calcolo passo passo */}
      {detComp && (
        <div className="rounded-xl p-5"
          style={{ backgroundColor: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <h2 className="text-sm font-semibold text-blue-400 mb-1">
            💼 Come viene calcolato il tuo compenso
          </h2>
          <p className="text-[10px] text-gray-500 mb-3">Ecco passo per passo cosa succede ai soldi del tuo compenso da amministratore:</p>
          <div className="space-y-1">
            <DetailRow label="Il tuo compenso lordo (quanto deliberi in assemblea)" value={comp} color="text-white" />
            <DetailRow label="− I tuoi contributi INPS (1/3 del 35,03%)" value={-A.inpsAmministratore} color="text-red-400"
              note="Questa quota INPS la paghi tu. Serve per la tua pensione. È integralmente deducibile dal reddito (art. 10 TUIR)." />
            <DetailRow label="= Reddito su cui si calcola l'IRPEF" value={A.imponibileIrpef} color="text-gray-300"
              note="Dopo aver dedotto i tuoi contributi INPS (integralmente deducibili), questo è l'importo su cui calcoli l'IRPEF." />
            <DetailRow label={`− IRPEF (tassa sul reddito: ${comp <= 28000 ? '23%' : comp <= 50000 ? 'fino al 33%' : 'fino al 43%'})`} value={-A.irpef} color="text-red-400"
              note={comp <= 28000 ? "Ottimo: resti nel primo scaglione, paghi solo il 23%!" : comp <= 50000 ? "Sei entrato nel secondo scaglione: da €28k a €50k paghi il 33%." : "Attenzione: oltre €50k paghi il 43% su ogni euro in più."} />
            <DetailRow label="− Addizionali regionali e comunali (~2,5%)" value={-(A.addRegionale + A.addComunale)} color="text-red-400"
              note="Sono tasse locali aggiuntive. Variano in base a dove vivi." />
            <div className="border-t border-blue-500/20 pt-2 mt-2">
              <DetailRow label="= Quello che arriva sul tuo conto" value={A.nettoCompenso} color="text-green-400 font-bold" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                Costo totale per la SRL (il tuo compenso + i 2/3 di INPS che paga la società)
                <Tip text="La società paga il tuo compenso LORDO + i 2/3 dei contributi INPS. Tutto questo è un costo deducibile per la SRL, quindi riduce l'utile su cui si paga IRES (24%). È per questo che il compenso conviene: riduce le tasse della società." />
              </span>
              <span className="font-mono text-gray-300">{fmt(A.costoCompensoPerSocieta)}</span>
            </div>
          </div>
        </div>
      )}

      {/* INSIGHTS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-xs text-gray-400 mb-1">
            💡 Se fatturi {fmt(50000)} in più
          </div>
          <div className="text-lg font-bold text-green-400">
            +{fmt(calcolaScenario({
              fatturato: fatt + 50000,
              costiTotali: costi + Math.round(50000 * costi / fatt),
              compensoLordo: comp,
              percDividendi: pDiv
            }).totaleTasca - A.totaleTasca)}
          </div>
          <div className="text-xs text-gray-500">netti in più in tasca</div>
        </div>
        <div className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-xs text-gray-400 mb-1">
            💡 Ogni €1.000 di costo in più
          </div>
          <div className="text-lg font-bold text-red-400">
            {fmt(calcolaScenario({
              fatturato: fatt,
              costiTotali: costi + 1000,
              compensoLordo: comp,
              percDividendi: pDiv
            }).totaleTasca - A.totaleTasca)}
          </div>
          <div className="text-xs text-gray-500">effetto netto in tasca</div>
        </div>
      </div>

      {/* PIANIFICATORE MENSILE */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.15)" }}>
        <button onClick={() => setShowPianificatore(!showPianificatore)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
              <span className="text-sm font-bold text-white block">Pianificatore Mensile</span>
              <span className="text-[10px] text-gray-400">Inserisci fatturato mese per mese — ottimizzazione automatica compenso/dividendi</span>
            </div>
          </div>
          <span className="text-gray-500 text-xs">{showPianificatore ? '▼' : '▶'}</span>
        </button>
        {showPianificatore && (
          <div className="px-4 pb-5">
            <PianificatoreMensile costiPerc={Math.round((costi / fatt) * 100)} />
          </div>
        )}
      </div>

      {/* DISCLAIMER */}
      <div className="text-center text-xs text-gray-600 px-2">
        ⚠️ Simulazione orientativa — non sostituisce il commercialista.
        IRPEF 2026: 23%/33%/43% (L. Bilancio 2026).
        INPS GS co.co.co.: 35,03% su max €122.295 (Circ. INPS 8/2026), 2/3 azienda + 1/3 amm.re.
        Contributi INPS amm.re integralmente deducibili (art. 10 TUIR).
        IRES 24% (art. 77 TUIR). IRAP 3,9% base (D.Lgs. 446/97).
        Dividendi: ritenuta 26% a titolo d'imposta (art. 27 DPR 600/73).
        Addizionali IRPEF: medie nazionali (~1,7% reg. + ~0,8% com.) — verificare localmente.
      </div>
    </div>
  );
}