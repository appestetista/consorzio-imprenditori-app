import React, { useState, useMemo, useCallback } from "react";
import { HelpCircle, X } from "lucide-react";
import PianificatoreMensile from "./PianificatoreMensile";
import CaricaBilancioButton from "./CaricaBilancioButton";

/* Tooltip spiegazione ❓ */
function Tip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button onClick={() => setOpen(!open)} className="align-middle">
        <HelpCircle className="w-3.5 h-3.5 text-black hover:text-black/70 inline" />
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
   - IRAP: art. 5 e 16 D.Lgs. 446/1997 — 3,9% base su valore produzione netta
   - IRAP indeducibilità: costo personale, compensi amm.re, interessi passivi (art. 5 co.1)
   - IRAP impatto CE: riduce utile distribuibile (voce B.14 art. 2425 c.c.)
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
   VOCI INDEDUCIBILI AI FINI IRAP (D.Lgs. 446/97, art. 5)
   Per società di capitali, NON sono deducibili dalla base IRAP:
   - Costo del lavoro dipendente (salari, oneri, TFR, interinali, ecc.)
   - Compensi amministratori e relativi oneri previdenziali
   - Interessi passivi e oneri finanziari assimilati
   ═══════════════════════════════════════════════════════ */
const IRAP_INDEDUCIBILI_KEYS = [
  // Personale dipendente — art. 5 co. 1 D.Lgs. 446/97
  "salari", "oneri_sociali", "tfr", "interinali", "formazione",
  "buoni_pasto", "straordinari", "trasferte_dip", "welfare_aziendale",
  // Oneri finanziari — art. 5 co. 1 D.Lgs. 446/97
  "interessi", "interessi_fido", "commissioni_bancarie",
];

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
      { k: "lav_esterne",     l: "Lavorazioni esterne / terzisti" },
      { k: "magazzino",       l: "Costi di magazzino e stoccaggio" },
      { k: "controllo_qualita", l: "Controllo qualità e certificazioni" },
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
      { k: "buoni_pasto",     l: "Buoni pasto e benefit" },
      { k: "straordinari",    l: "Straordinari e premi produzione" },
      { k: "trasferte_dip",   l: "Trasferte e rimborsi dipendenti" },
      { k: "welfare_aziendale", l: "Welfare aziendale" },
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
      { k: "condominio",      l: "Spese condominiali" },
      { k: "sicurezza_sede",  l: "Sicurezza sede (allarmi, estintori)" },
      { k: "smaltimento_rifiuti_sede", l: "Rifiuti speciali sede" },
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
      { k: "consulenze_tecniche", l: "Consulenze tecniche e ingegneria" },
      { k: "postali_corrieri", l: "Spese postali e corrieri" },
      { k: "certificazioni",  l: "Certificazioni (ISO, CE, ecc.)" },
      { k: "outsourcing",     l: "Outsourcing IT / amministrativo" },
    ]
  },
  {
    id: "fin", label: "Ammortamenti e finanza", icon: "🏦", col: "#10B981",
    voci: [
      { k: "amm_macchinari",  l: "Amm.to macchinari e attrezz." },
      { k: "amm_immobili",    l: "Amm.to fabbricato e migliorie" },
      { k: "leasing",         l: "Leasing e noleggio operativo" },
      { k: "interessi",       l: "Interessi passivi su mutui" },
      { k: "amm_automezzi",   l: "Amm.to automezzi" },
      { k: "amm_software",    l: "Amm.to software e brevetti" },
      { k: "commissioni_bancarie", l: "Commissioni e spese bancarie" },
      { k: "interessi_fido",  l: "Interessi fido e anticipi fatture" },
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
      { k: "bolli_vidimazioni", l: "Bolli, vidimazioni e diritti" },
      { k: "abbonamenti_riviste", l: "Abbonamenti e riviste tecniche" },
      { k: "contributi_associativi", l: "Contributi associativi (CNA, Confindustria...)" },
      { k: "auto_aziendali",  l: "Carburante e gestione auto aziendali" },
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
         lav_esterne:2, magazzino:1.5, controllo_qualita:1,
         salari:12, oneri_sociali:5, tfr:1.5, interinali:2, formazione:0.5,
         buoni_pasto:0.8, straordinari:1, trasferte_dip:0.3, welfare_aziendale:0.3,
         affitto:4, elettricita:3, gas:1.5, acqua:0.5, manutenzione:2, pulizie:0.5,
         condominio:0.3, sicurezza_sede:0.2, smaltimento_rifiuti_sede:0.2,
         trasporti:4, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:1.5,
         consulenze_tecniche:0.3, postali_corrieri:0.2, certificazioni:0.5, outsourcing:0.2,
         amm_macchinari:4, amm_immobili:1.5, leasing:1, interessi:0.8,
         amm_automezzi:0.5, amm_software:0.3, commissioni_bancarie:0.3, interessi_fido:0.4,
         assicurazioni:1.2, imu_tari:0.8, viaggi:0.5, rappresentanza:0.5, varie:1,
         bolli_vidimazioni:0.1, abbonamenti_riviste:0.1, contributi_associativi:0.2, auto_aziendali:0.5 }
  },
  "16": {
    n: "Legno",
    v: { materie_prime:25, semilavorati:6, imballaggi:3, consumabili:3, rifiuti:1.5,
         lav_esterne:2, magazzino:1, controllo_qualita:0.5,
         salari:14, oneri_sociali:5.5, tfr:1.5, interinali:2, formazione:0.5,
         buoni_pasto:0.7, straordinari:1.2, trasferte_dip:0.3, welfare_aziendale:0.2,
         affitto:4, elettricita:3.5, gas:2, acqua:0.3, manutenzione:3, pulizie:0.5,
         condominio:0.3, sicurezza_sede:0.2, smaltimento_rifiuti_sede:0.3,
         trasporti:3, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:1,
         consulenze_tecniche:0.3, postali_corrieri:0.1, certificazioni:0.3, outsourcing:0.2,
         amm_macchinari:5, amm_immobili:2, leasing:1.5, interessi:1,
         amm_automezzi:0.6, amm_software:0.2, commissioni_bancarie:0.3, interessi_fido:0.5,
         assicurazioni:1.2, imu_tari:1, viaggi:0.5, rappresentanza:0.3, varie:1,
         bolli_vidimazioni:0.1, abbonamenti_riviste:0.1, contributi_associativi:0.2, auto_aziendali:0.6 }
  },
  "25": {
    n: "Prodotti in metallo",
    v: { materie_prime:22, semilavorati:8, imballaggi:2, consumabili:3, rifiuti:1,
         lav_esterne:3, magazzino:1, controllo_qualita:0.5,
         salari:16, oneri_sociali:6.5, tfr:2, interinali:3, formazione:0.5,
         buoni_pasto:0.8, straordinari:1.5, trasferte_dip:0.3, welfare_aziendale:0.3,
         affitto:3.5, elettricita:3, gas:1.5, acqua:0.3, manutenzione:3, pulizie:0.5,
         condominio:0.2, sicurezza_sede:0.2, smaltimento_rifiuti_sede:0.2,
         trasporti:3, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:0.8,
         consulenze_tecniche:0.5, postali_corrieri:0.1, certificazioni:0.4, outsourcing:0.2,
         amm_macchinari:5, amm_immobili:1.5, leasing:2, interessi:1,
         amm_automezzi:0.5, amm_software:0.2, commissioni_bancarie:0.3, interessi_fido:0.5,
         assicurazioni:1, imu_tari:0.8, viaggi:0.5, rappresentanza:0.3, varie:1,
         bolli_vidimazioni:0.1, abbonamenti_riviste:0.1, contributi_associativi:0.2, auto_aziendali:0.5 }
  },
  "28": {
    n: "Macchinari",
    v: { materie_prime:20, semilavorati:10, imballaggi:2, consumabili:2, rifiuti:0.5,
         lav_esterne:3, magazzino:1, controllo_qualita:1,
         salari:15, oneri_sociali:6, tfr:2, interinali:2, formazione:1,
         buoni_pasto:0.8, straordinari:1.2, trasferte_dip:0.5, welfare_aziendale:0.3,
         affitto:3, elettricita:2.5, gas:1, acqua:0.2, manutenzione:2.5, pulizie:0.5,
         condominio:0.2, sicurezza_sede:0.2, smaltimento_rifiuti_sede:0.1,
         trasporti:4, commercialista:1.5, legali:0.5, telefonia:0.4, software:1, marketing:2,
         consulenze_tecniche:0.8, postali_corrieri:0.2, certificazioni:0.5, outsourcing:0.3,
         amm_macchinari:5, amm_immobili:1.5, leasing:2, interessi:1,
         amm_automezzi:0.6, amm_software:0.4, commissioni_bancarie:0.3, interessi_fido:0.5,
         assicurazioni:1, imu_tari:0.8, viaggi:1.5, rappresentanza:0.5, varie:1,
         bolli_vidimazioni:0.1, abbonamenti_riviste:0.1, contributi_associativi:0.3, auto_aziendali:0.7 }
  },
  "31": {
    n: "Mobili",
    v: { materie_prime:22, semilavorati:8, imballaggi:4, consumabili:2, rifiuti:1,
         lav_esterne:2, magazzino:1.5, controllo_qualita:0.5,
         salari:15, oneri_sociali:5.5, tfr:1.5, interinali:2, formazione:0.5,
         buoni_pasto:0.7, straordinari:1, trasferte_dip:0.3, welfare_aziendale:0.2,
         affitto:4, elettricita:2.5, gas:1, acqua:0.3, manutenzione:2, pulizie:0.5,
         condominio:0.3, sicurezza_sede:0.2, smaltimento_rifiuti_sede:0.1,
         trasporti:4, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:3,
         consulenze_tecniche:0.3, postali_corrieri:0.2, certificazioni:0.3, outsourcing:0.2,
         amm_macchinari:5, amm_immobili:2, leasing:1.5, interessi:1,
         amm_automezzi:0.5, amm_software:0.3, commissioni_bancarie:0.3, interessi_fido:0.4,
         assicurazioni:1, imu_tari:0.8, viaggi:0.8, rappresentanza:0.5, varie:1,
         bolli_vidimazioni:0.1, abbonamenti_riviste:0.1, contributi_associativi:0.2, auto_aziendali:0.6 }
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

/* calcolaScenario — costiIndeducibiliIrap = somma delle voci costo NON deducibili IRAP
   (personale dip. + interessi/oneri finanziari) già incluse in costiTotali.
   Il compenso amm.re + INPS az. sono anch'essi indeducibili IRAP e vengono aggiunti internamente. */
function calcolaScenario({ fatturato, costiTotali, compensoLordo, percDividendi, costiIndeducibiliIrap = 0 }) {
  const margine = fatturato - costiTotali;
  const baseInps = Math.min(compensoLordo, FISCO.inps_gs_max);
  const inpsTotale = baseInps * FISCO.inps_gs_totale;
  const inpsAzienda = inpsTotale * FISCO.inps_gs_quota_azienda;
  const inpsAmministratore = inpsTotale * FISCO.inps_gs_quota_admin;
  const costoCompensoPerSocieta = compensoLordo + inpsAzienda;
  const utileAnteImposte = margine - costoCompensoPerSocieta;

  /* ── IRAP — D.Lgs. 446/97 art. 5 ──
     Base IRAP = valore della produzione netta
     = fatturato − costi DEDUCIBILI IRAP
     Le voci indeducibili (personale dip., compensi amm.re, oneri finanziari)
     vanno ri-aggiunte al margine per ottenere la base corretta. */
  const baseIrap = margine + costiIndeducibiliIrap + costoCompensoPerSocieta;
  const irap = Math.max(0, baseIrap * FISCO.irap);

  const ires = Math.max(0, utileAnteImposte * FISCO.ires);

  /* ── Utile netto distribuibile (civilistico) ──
     L'IRAP è costo a CE (voce B.14 art. 2425 c.c.) e riduce l'utile distribuibile.
     Utile netto = utile ante imposte − IRES − IRAP */
  const utileNetto = utileAnteImposte - ires - irap;

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

  /* ── Pressione fiscale ──
     Totale imposte e contributi / margine operativo */
  const totaleImposteContributi = irpef + addRegionale + addComunale + inpsTotale + ires + irap + ritenutaDividendi;
  const pressioneFiscale = margine > 0 ? (totaleImposteContributi / margine) * 100 : 0;
  // Quota margine che resta in tasca (per info)
  const percTasca = margine > 0 ? (totaleTasca / margine) * 100 : 0;

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
    steps, fatturato, costiTotali, margine, baseIrap,
    compensoLordo, inpsTotale, inpsAzienda, inpsAmministratore,
    costoCompensoPerSocieta, utileAnteImposte, irap, ires, utileNetto,
    dividendiLordi, ritenutaDividendi, dividendiNetti,
    imponibileIrpef, irpef, addRegionale, addComunale,
    nettoCompenso, totaleTasca, pressioneFiscale, percTasca,
    totaleImposteContributi,
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
        <label className="text-sm font-medium text-black">{label}</label>
        <span className="text-xl font-bold text-black">
          {suffix === "%" ? `${value}%` : fmt(value)}
        </span>
      </div>
      {sub && <p className="text-xs text-black/60 mb-1">{sub}</p>}
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
      {note && <div className="text-[9px] text-black/50 pl-1 pb-1">{note}</div>}
    </div>
  );
}

function WBar({ step, maxVal }) {
  const pct = Math.abs(step.d || step.v) / maxVal * 100;
  const col = { start: "#3B82F6", costo: "#F59E0B", tassa: "#EF4444", neutro: "#4B5563" };
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-32 sm:w-48 text-right text-xs font-medium text-black shrink-0">{step.l}</div>
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

  const [fatt, setFatt] = useState(0);
  const [cv, setCv] = useState(initVals);
  const [comp, setComp] = useState(0);
  const [pDiv, setPDiv] = useState(0);
  const [detCosti, setDetCosti] = useState(false);
  const [openGruppi, setOpenGruppi] = useState({});
  const [detComp, setDetComp] = useState(false);
  const [showAteco, setShowAteco] = useState(false);
  const [showPianificatore, setShowPianificatore] = useState(false);
  const [bilancioApplicato, setBilancioApplicato] = useState(false);

  const CAPITALI = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE', 'COOP'];
  const isSocieta = CAPITALI.includes(user?.forma_giuridica);

  /* Callback dal componente CaricaBilancioButton — mappa i dati estratti sugli slider */
  const handleBilancioData = useCallback((data) => {
    if (data.ricavi) setFatt(Math.round(data.ricavi));

    if (data.costi_produzione) {
      // Distribuisci costi proporzionalmente ai default
      const totalDefault = Object.values(cv).reduce((a, b) => a + b, 0);
      const target = Math.round(data.costi_produzione);
      const ratio = target / Math.max(1, totalDefault);
      const nuovi = {};
      Object.entries(cv).forEach(([k, val]) => { nuovi[k] = Math.round(val * ratio); });

      // Se ci sono dati specifici, sovrascrivili
      if (data.costo_personale) {
        const persKeys = ["salari","oneri_sociali","tfr","interinali","formazione","buoni_pasto","straordinari","trasferte_dip","welfare_aziendale"];
        const persTotal = persKeys.reduce((s, k) => s + (nuovi[k] || 0), 0);
        if (persTotal > 0) {
          const persRatio = data.costo_personale / persTotal;
          persKeys.forEach(k => { nuovi[k] = Math.round((nuovi[k] || 0) * persRatio); });
        }
      }
      if (data.ammortamenti) {
        const ammKeys = ["amm_macchinari","amm_immobili","amm_automezzi","amm_software"];
        const ammTotal = ammKeys.reduce((s, k) => s + (nuovi[k] || 0), 0);
        if (ammTotal > 0) {
          const ammRatio = data.ammortamenti / ammTotal;
          ammKeys.forEach(k => { nuovi[k] = Math.round((nuovi[k] || 0) * ammRatio); });
        }
      }
      if (data.oneri_finanziari) {
        const finKeys = ["interessi","interessi_fido","commissioni_bancarie"];
        const finTotal = finKeys.reduce((s, k) => s + (nuovi[k] || 0), 0);
        if (finTotal > 0) {
          const finRatio = data.oneri_finanziari / finTotal;
          finKeys.forEach(k => { nuovi[k] = Math.round((nuovi[k] || 0) * finRatio); });
        }
      }

      setCv(nuovi);
    }

    if (data.compensi_amministratori) {
      setComp(Math.round(data.compensi_amministratori));
    }

    setBilancioApplicato(true);
  }, [cv]);

  const costi = useMemo(() => Object.values(cv).reduce((a, b) => a + b, 0), [cv]);

  // Somma voci indeducibili IRAP (personale dip. + oneri finanziari) — D.Lgs. 446/97 art. 5
  const costiIndeducibiliIrap = useMemo(() =>
    IRAP_INDEDUCIBILI_KEYS.reduce((s, k) => s + (cv[k] || 0), 0), [cv]);

  const updCat = (k, v) => setCv(prev => ({ ...prev, [k]: v }));
  const toggleGruppo = (id) => setOpenGruppi(prev => ({ ...prev, [id]: !prev[id] }));

  // Pesi default per distribuire i costi quando sono tutti a zero
  const DEFAULT_WEIGHTS = {
    materie_prime:22, semilavorati:8, imballaggi:2, consumabili:2, rifiuti:1,
    lav_esterne:2, magazzino:1, controllo_qualita:0.5,
    salari:14, oneri_sociali:5.5, tfr:1.5, interinali:2, formazione:0.5,
    buoni_pasto:1, straordinari:1.5, trasferte_dip:0.5, welfare_aziendale:0.5,
    affitto:4, elettricita:3, gas:1.5, acqua:0.3, manutenzione:2.5, pulizie:0.5,
    condominio:0.4, sicurezza_sede:0.2, smaltimento_rifiuti_sede:0.2,
    trasporti:3, commercialista:1, legali:0.3, telefonia:0.3, software:0.5, marketing:1,
    consulenze_tecniche:0.5, postali_corrieri:0.2, certificazioni:0.3, outsourcing:0.4,
    amm_macchinari:5, amm_immobili:1.5, leasing:1.5, interessi:1,
    amm_automezzi:0.8, amm_software:0.5, commissioni_bancarie:0.4, interessi_fido:0.6,
    assicurazioni:1, imu_tari:0.8, viaggi:0.5, rappresentanza:0.3, varie:1,
    bolli_vidimazioni:0.15, abbonamenti_riviste:0.1, contributi_associativi:0.2, auto_aziendali:0.8,
  };

  const scalaCosti = (target) => {
    if (costi === 0) {
      // Distribuisci proporzionalmente ai pesi default
      const totalWeight = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
      const n = {};
      ALL_KEYS.forEach(k => { n[k] = Math.round(target * (DEFAULT_WEIGHTS[k] || 0) / totalWeight); });
      setCv(n);
    } else {
      const ratio = target / costi;
      const n = {};
      Object.entries(cv).forEach(([k, val]) => { n[k] = Math.round(val * ratio); });
      setCv(n);
    }
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
    fatturato: fatt, costiTotali: costi, compensoLordo: comp, percDividendi: pDiv,
    costiIndeducibiliIrap,
  }), [fatt, costi, comp, pDiv, costiIndeducibiliIrap]);




  return (
    <div className="space-y-4">

      {/* HEADER — Carica bilancio per società */}
      {isSocieta && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {bilancioApplicato && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                ✓ Dati da bilancio applicati
              </span>
            )}
            <div className="ml-auto" />
          </div>
          <CaricaBilancioButton onDataExtracted={handleBilancioData} />
        </div>
      )}

      {/* ═══ PARAMETRI ═══ */}
      <div className="rounded-xl p-5"
        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>

        {/* FATTURATO — slider + input manuale */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-black">Fatturato annuo</label>
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
              className="text-xl font-bold text-black text-right bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none w-36 px-1"
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
            <label className="text-sm font-medium text-black">Costi operativi</label>
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
          <p className="text-xs text-black/60 mb-1">
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
          className="w-full py-2 rounded-lg text-xs font-medium text-black hover:text-black/80 transition-colors flex items-center justify-center gap-1.5"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>
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
                  <div key={g.id} className="flex items-center gap-1 text-xs text-black">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: g.col }} />
                    {g.label} <span className="text-black/60">
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
                  style={{ border: `1px solid ${isOpen ? g.col + "40" : "rgba(0,0,0,0.15)"}` }}>
                  <button onClick={() => toggleGruppo(g.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-white/5"
                    style={{ backgroundColor: isOpen ? g.col + "10" : "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-2">
                      <span>{g.icon}</span>
                      <span className="text-sm font-medium text-black">{g.label}</span>
                      <span className="text-xs text-black/50">({g.voci.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-black">{fmt(tot)}</span>
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
                              <span className="text-xs text-white">{v.l}</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={val}
                                onChange={e => updCat(v.k, Math.max(0, Number(e.target.value) || 0))}
                                className="text-xs font-bold text-white text-right bg-slate-800 border border-slate-600 focus:border-blue-500 rounded px-2 py-0.5 outline-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>
        <h2 className="text-sm font-semibold text-black uppercase tracking-wider mb-1">
          💼 Come ti paghi
        </h2>
        <p className="text-[11px] text-black/60 mb-4">Ci sono due modi per portare i soldi dalla SRL alla tua tasca. Regola entrambi per trovare il mix migliore.</p>
        <Slider label="Compenso amministratore (lordo annuo)" value={comp}
          onChange={setComp} min={0} max={120000} step={3000}
          sub="È lo 'stipendio' che ti dai come amministratore. Viene tassato con IRPEF + contributi INPS, ma riduce le tasse della società." />
        <Slider label="Quanta % dell'utile distribuisci come dividendi?" value={pDiv}
          onChange={setPDiv} min={0} max={100} step={5} suffix="%"
          sub={`I dividendi sono la quota di utili che prelevi. Paghi il 26% secco. Il resto può restare in azienda senza pagare questa tassa.\n→ Dividendi netti in tasca: ${fmt(A.dividendiNetti)} · Lordi: ${fmt(A.dividendiLordi)}`} />


      </div>

      {/* ═══ RISULTATI ═══ */}
      {fatt === 0 && (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>
          <div className="text-3xl mb-2">☝️</div>
          <p className="text-sm font-medium" style={{ color: 'var(--app-text-primary)' }}>Inserisci il tuo fatturato per vedere i risultati</p>
          <p className="text-xs mt-1" style={{ color: 'var(--app-text-secondary)' }}>Sposta lo slider del fatturato oppure digita un valore nel campo sopra</p>
        </div>
      )}

      {fatt > 0 && <>
      {/* QUANTO TI RESTA IN TASCA */}
      <div className="rounded-xl p-6 text-center" style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(59,130,246,0.1) 100%)",
        border: "1px solid rgba(0,0,0,0.15)",
      }}>
        <div className="text-sm text-black mb-1">
          💰 Quanto ti resta davvero in tasca, dopo tutte le tasse
          <Tip text="Questo è il totale che arriva sul tuo conto personale in un anno, sommando ciò che ricevi come compenso (il tuo 'stipendio' da amministratore) e ciò che ricevi come dividendi (la tua quota di utili). Tutte le tasse sono già tolte." />
        </div>
        <div className="text-5xl font-black text-green-400 tracking-tight">
          {fmt(A.totaleTasca)}
        </div>
        <div className="text-xs text-black/60 mt-2">
          Cioè circa <strong className="text-black">{fmt(A.totaleTasca / 12)} al mese</strong> sul tuo conto
        </div>
        <div className="text-xs text-black/60 mt-1">
          Pressione fiscale: <span className="text-amber-400 font-bold">{A.pressioneFiscale.toFixed(1)}%</span>
          <Tip text={`Totale imposte e contributi (${fmt(A.totaleImposteContributi)}) diviso il margine operativo (${fmt(A.margine)}). Misura quanto del margine viene assorbito dal fisco.`} />
          {A.percTasca > 0 && (
            <span className="ml-2">· In tasca: <span className="text-green-400 font-bold">{A.percTasca.toFixed(1)}%</span> del margine</span>
          )}
        </div>
        {/* Dettaglio: da dove arrivano i soldi */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-left">
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-[10px] text-black/60">
              Dal compenso amm.re
              <Tip text="Questa è la parte del tuo reddito che arriva dallo 'stipendio' che ti sei dato come amministratore. Ha già pagato IRPEF, contributi INPS e addizionali." />
            </div>
            <div className="text-lg font-bold text-blue-400">{fmt(A.nettoCompenso)}</div>
            <div className="text-[10px] text-black/50">{fmt(A.nettoCompenso / 12)}/mese netti</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3">
            <div className="text-[10px] text-black/60">
              Dai dividendi
              <Tip text="Questa è la parte del tuo reddito che arriva dalla distribuzione degli utili della società. Ha già pagato IRES (24%) a livello societario e la ritenuta del 26% a livello personale." />
            </div>
            <div className="text-lg font-bold text-violet-400">{fmt(A.dividendiNetti)}</div>
            <div className="text-[10px] text-black/50">dopo ritenuta 26%</div>
          </div>
        </div>


      </div>

      {/* RIEPILOGO TASSE — spiegato semplice */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>
        <h2 className="text-sm font-semibold text-black uppercase tracking-wider mb-1">
          📊 Dettaglio delle tasse che paghi
        </h2>
        <p className="text-[10px] text-black/60 mb-3">Ecco dove vanno i tuoi soldi, voce per voce. Tocca i ❓ per capire cosa significa ogni tassa.</p>
        <div className="grid grid-cols-2 gap-3">
          {/* IRPEF */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(0,0,0,0.15)" }}>
            <div className="text-xs text-black mb-1">
              IRPEF (tassa sul reddito)
              <Tip text="L'IRPEF è la tassa personale che paghi sul tuo compenso da amministratore. È progressiva: i primi €28.000 pagano il 23%, da €28k a €50k il 33%, oltre €50k il 43%. Più alto il compenso, più alta la percentuale." />
            </div>
            <div className="text-xl font-bold text-red-400">{fmt(A.irpef)}</div>
            <div className="text-[10px] text-black/60 mt-0.5">
              {comp <= 28000 ? "Fascia 23% — la più bassa ✅" : comp <= 50000 ? "Fascia fino al 33%" : "Fascia fino al 43%"}
            </div>
          </div>
          {/* INPS */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(0,0,0,0.15)" }}>
            <div className="text-xs text-black mb-1">
              INPS (contributi pensione)
              <Tip text={`L'INPS Gestione Separata è il contributo previdenziale che si paga sul compenso dell'amministratore. L'aliquota è del 35,03%. Di questa, 2/3 li paga la società (${fmt(A.inpsAzienda)}) e 1/3 lo paghi tu (${fmt(A.inpsAmministratore)}). Servono per la tua pensione.`} />
            </div>
            <div className="text-xl font-bold text-amber-400">{fmt(A.inpsTotale)}</div>
            <div className="text-[10px] text-black/60 mt-0.5">
              Società paga {fmt(A.inpsAzienda)} · tu paghi {fmt(A.inpsAmministratore)}
            </div>
          </div>
          {/* IRES */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(0,0,0,0.15)" }}>
            <div className="text-xs text-black mb-1">
              IRES (tassa sugli utili)
              <Tip text="L'IRES è la tassa che paga la SRL sui suoi utili. L'aliquota è fissa al 24%. Si calcola sull'utile della società DOPO aver tolto il tuo compenso e i costi. Quindi più compenso ti dai, meno IRES paga la società." />
            </div>
            <div className="text-xl font-bold text-red-400">{fmt(A.ires)}</div>
            <div className="text-[10px] text-black/60 mt-0.5">24% fisso sull'utile della società</div>
          </div>
          {/* IRAP */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(0,0,0,0.15)" }}>
            <div className="text-xs text-black mb-1">
              IRAP (tassa regionale)
              <Tip text="L'IRAP si calcola sul valore della produzione netta (D.Lgs. 446/97 art. 5). Il costo del personale, il compenso amministratore e gli interessi passivi NON sono deducibili dalla base IRAP. Quindi la base è più alta del margine contabile." />
            </div>
            <div className="text-xl font-bold text-red-400">{fmt(A.irap)}</div>
            <div className="text-[10px] text-black/60 mt-0.5">3,9% su base {fmt(A.baseIrap)}</div>
          </div>
          {/* Ritenuta dividendi */}
          {A.dividendiLordi > 0 && (
            <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(0,0,0,0.15)" }}>
              <div className="text-xs text-black mb-1">
                Ritenuta dividendi
                <Tip text="Quando prelevi gli utili dalla SRL come dividendi, paghi una tassa secca del 26%. Questa si aggiunge all'IRES già pagata dalla società. Per questo i dividendi costano in totale circa il 43,8%." />
              </div>
              <div className="text-xl font-bold text-violet-400">{fmt(A.ritenutaDividendi)}</div>
              <div className="text-[10px] text-black/60 mt-0.5">26% secco sui dividendi lordi</div>
            </div>
          )}
          {/* Addizionali */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,0,0,0.15)" }}>
            <div className="text-xs text-black mb-1">
              Addizionali IRPEF
              <Tip text="Sono tasse aggiuntive regionali (~1,7%) e comunali (~0,8%) che si pagano oltre all'IRPEF, calcolate sul tuo compenso. Variano da regione a regione e da comune a comune." />
            </div>
            <div className="text-xl font-bold text-black">{fmt(A.addRegionale + A.addComunale)}</div>
            <div className="text-[10px] text-black/60 mt-0.5">regionale + comunale</div>
          </div>
        </div>
      </div>

      {/* WATERFALL — Dove vanno i tuoi soldi */}
      <div className="rounded-xl p-5"
        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-black uppercase tracking-wider">
            🔍 Dove vanno i tuoi soldi
          </h2>
          <button onClick={() => setDetComp(!detComp)}
            className="text-xs text-blue-400 hover:text-blue-300">
            {detComp ? "Chiudi dettaglio" : "📋 Vedi calcoli compenso"}
          </button>
        </div>
        <p className="text-[10px] text-black/60 mb-3">Dal fatturato, ogni barra mostra quanto viene "tolto" — ciò che resta alla fine è tuo.</p>
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
          style={{ backgroundColor: "rgba(59,130,246,0.04)", border: "1px solid rgba(0,0,0,0.15)" }}>
          <h2 className="text-sm font-semibold text-blue-400 mb-1">
            💼 Come viene calcolato il tuo compenso
          </h2>
          <p className="text-[10px] text-black/60 mb-3">Ecco passo per passo cosa succede ai soldi del tuo compenso da amministratore:</p>
          <div className="space-y-1">
            <DetailRow label="Il tuo compenso lordo (quanto deliberi in assemblea)" value={comp} color="text-black" />
            <DetailRow label="− I tuoi contributi INPS (1/3 del 35,03%)" value={-A.inpsAmministratore} color="text-red-400"
              note="Questa quota INPS la paghi tu. Serve per la tua pensione. È integralmente deducibile dal reddito (art. 10 TUIR)." />
            <DetailRow label="= Reddito su cui si calcola l'IRPEF" value={A.imponibileIrpef} color="text-black/70"
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
            <div className="flex justify-between text-xs text-black/60">
              <span>
                Costo totale per la SRL (il tuo compenso + i 2/3 di INPS che paga la società)
                <Tip text="La società paga il tuo compenso LORDO + i 2/3 dei contributi INPS. Tutto questo è un costo deducibile per la SRL, quindi riduce l'utile su cui si paga IRES (24%). È per questo che il compenso conviene: riduce le tasse della società." />
              </span>
              <span className="font-mono text-black">{fmt(A.costoCompensoPerSocieta)}</span>
            </div>
          </div>
        </div>
      )}

      {/* INSIGHTS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>
          <div className="text-xs text-black mb-1">
            💡 Se fatturi {fmt(50000)} in più
          </div>
          <div className="text-lg font-bold text-green-400">
            +{fmt(calcolaScenario({
              fatturato: fatt + 50000,
              costiTotali: costi + Math.round(50000 * costi / fatt),
              compensoLordo: comp,
              percDividendi: pDiv,
              costiIndeducibiliIrap,
            }).totaleTasca - A.totaleTasca)}
          </div>
          <div className="text-xs text-black/60">netti in più in tasca</div>
        </div>
        <div className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>
          <div className="text-xs text-black mb-1">
            💡 Ogni €1.000 di costo in più
          </div>
          <div className="text-lg font-bold text-red-400">
            {fmt(calcolaScenario({
              fatturato: fatt,
              costiTotali: costi + 1000,
              compensoLordo: comp,
              percDividendi: pDiv,
              costiIndeducibiliIrap,
            }).totaleTasca - A.totaleTasca)}
          </div>
          <div className="text-xs text-black/60">effetto netto in tasca</div>
        </div>
      </div>

      {/* PIANIFICATORE MENSILE */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,0,0,0.15)" }}>
        <button onClick={() => setShowPianificatore(!showPianificatore)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
              <span className="text-sm font-bold text-black block">Pianificatore Mensile</span>
              <span className="text-[10px] text-black/60">Inserisci fatturato mese per mese — ottimizzazione automatica compenso/dividendi</span>
            </div>
          </div>
          <span className="text-black/50 text-xs">{showPianificatore ? '▼' : '▶'}</span>
        </button>
        {showPianificatore && (
          <div className="px-4 pb-5">
            <PianificatoreMensile costiPerc={Math.round((costi / fatt) * 100)} />
          </div>
        )}
      </div>

      </>}

      {/* DISCLAIMER */}
      <div className="text-center text-xs text-black/50 px-2">
        ⚠️ Simulazione orientativa — non sostituisce il commercialista.
        IRPEF 2026: 23%/33%/43% (L. Bilancio 2026).
        INPS GS co.co.co.: 35,03% su max €122.295 (Circ. INPS 8/2026), 2/3 azienda + 1/3 amm.re.
        Contributi INPS amm.re integralmente deducibili (art. 10 TUIR).
        IRES 24% (art. 77 TUIR).
        IRAP 3,9% base (D.Lgs. 446/97 art. 5 e 16) — base = valore produzione netta, esclusi costi personale, compensi amm.re e interessi passivi.
        IRAP dedotta dall'utile distribuibile (voce B.14 art. 2425 c.c.).
        Dividendi: ritenuta 26% a titolo d'imposta (art. 27 DPR 600/73).
        Addizionali IRPEF: medie nazionali (~1,7% reg. + ~0,8% com.) — verificare localmente.
        Deduzioni IRAP cuneo fiscale (art. 11 D.Lgs. 446/97) non applicate per semplicità.
      </div>
    </div>
  );
}