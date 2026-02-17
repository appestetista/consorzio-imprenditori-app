import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, ChevronLeft, HelpCircle, Building2, Factory, Users2, FileCheck, CheckCircle, Search, Info, AlertTriangle } from 'lucide-react';

// ─── DATI STATICI ───────────────────────────────────────────────────────────────

// Macro-categorie con le singole attività
const MACRO_CATEGORIE = [
  {
    key: 'commercio_terziario', label: 'Commercio & Terziario', icon: '🏢',
    attivita: [
      { key: 'negozio_abbigliamento', label: 'Negozio abbigliamento' },
      { key: 'negozio_alimentari', label: 'Negozio alimentari' },
      { key: 'supermercato', label: 'Supermercato' },
      { key: 'grande_distribuzione', label: 'Grande distribuzione' },
      { key: 'ecommerce', label: 'E-commerce' },
      { key: 'agenzia_immobiliare', label: 'Agenzia immobiliare' },
      { key: 'agenzia_viaggi', label: 'Agenzia viaggi' },
      { key: 'centro_servizi', label: 'Centro servizi' },
      { key: 'call_center', label: 'Call center' },
      { key: 'azienda_marketing', label: 'Azienda marketing' },
      { key: 'centro_assistenza_clienti', label: 'Centro assistenza clienti' },
      { key: 'farmacia', label: 'Farmacia' },
      { key: 'parafarmacia', label: 'Parafarmacia' },
    ]
  },
  {
    key: 'pubblici_esercizi', label: 'Pubblici Esercizi', icon: '🍽',
    attivita: [
      { key: 'bar', label: 'Bar' },
      { key: 'ristorante', label: 'Ristorante' },
      { key: 'pizzeria', label: 'Pizzeria' },
      { key: 'pub', label: 'Pub' },
      { key: 'catering', label: 'Catering' },
      { key: 'mensa_aziendale', label: 'Mensa aziendale' },
      { key: 'gelateria', label: 'Gelateria' },
      { key: 'pasticceria', label: 'Pasticceria' },
      { key: 'stabilimento_balneare', label: 'Stabilimento balneare' },
    ]
  },
  {
    key: 'turismo', label: 'Turismo', icon: '🏨',
    attivita: [
      { key: 'hotel', label: 'Hotel' },
      { key: 'bb', label: 'B&B' },
      { key: 'villaggio_turistico', label: 'Villaggio turistico' },
      { key: 'resort', label: 'Resort' },
      { key: 'campeggio', label: 'Campeggio' },
      { key: 'struttura_extralberghiera', label: 'Struttura ricettiva extralberghiera' },
    ]
  },
  {
    key: 'artigianato', label: 'Artigianato', icon: '🛠',
    attivita: [
      { key: 'centro_estetico', label: 'Centro estetico' },
      { key: 'parrucchiere', label: 'Parrucchiere' },
      { key: 'officina_meccanica', label: 'Officina meccanica' },
      { key: 'falegnameria', label: 'Falegnameria' },
      { key: 'carpenteria_metallica', label: 'Carpenteria metallica' },
      { key: 'impresa_impiantistica', label: 'Impresa impiantistica' },
      { key: 'idraulico', label: 'Idraulico' },
      { key: 'elettricista', label: 'Elettricista' },
      { key: 'azienda_serramenti', label: 'Azienda serramenti' },
    ]
  },
  {
    key: 'industria', label: 'Industria', icon: '🏭',
    attivita: [
      { key: 'industria_metalmeccanica', label: 'Industria metalmeccanica' },
      { key: 'industria_chimica', label: 'Industria chimica' },
      { key: 'industria_alimentare', label: 'Industria alimentare' },
      { key: 'industria_tessile', label: 'Industria tessile' },
      { key: 'industria_plastica', label: 'Industria plastica' },
      { key: 'industria_farmaceutica', label: 'Industria farmaceutica' },
      { key: 'industria_cartaria', label: 'Industria cartaria' },
      { key: 'industria_legno', label: 'Industria legno' },
    ]
  },
  {
    key: 'edilizia', label: 'Edilizia', icon: '🏗',
    attivita: [
      { key: 'impresa_edile', label: 'Impresa edile' },
      { key: 'ristrutturazioni', label: 'Ristrutturazioni' },
      { key: 'costruzioni_industriali', label: 'Costruzioni industriali' },
      { key: 'movimento_terra', label: 'Movimento terra' },
    ]
  },
  {
    key: 'trasporti_logistica', label: 'Trasporti & Logistica', icon: '🚛',
    attivita: [
      { key: 'autotrasporto_merci', label: 'Autotrasporto merci' },
      { key: 'logistica_magazzino', label: 'Logistica magazzino' },
      { key: 'corriere_espresso', label: 'Corriere espresso' },
      { key: 'spedizioni_internazionali', label: 'Spedizioni internazionali' },
    ]
  },
  {
    key: 'sanita_servizi_persona', label: 'Sanità & Servizi alla Persona', icon: '🧑‍⚕️',
    attivita: [
      { key: 'studio_medico', label: 'Studio medico' },
      { key: 'studio_dentistico', label: 'Studio dentistico' },
      { key: 'clinica_privata', label: 'Clinica privata' },
      { key: 'rsa', label: 'RSA' },
      { key: 'cooperativa_sociale', label: 'Cooperativa sociale' },
      { key: 'servizi_domiciliari', label: 'Servizi domiciliari' },
    ]
  },
  {
    key: 'studi_professionali', label: 'Studi Professionali', icon: '💼',
    attivita: [
      { key: 'studio_commercialista', label: 'Studio commercialista' },
      { key: 'studio_legale', label: 'Studio legale' },
      { key: 'studio_consulente_lavoro', label: 'Studio consulente del lavoro' },
      { key: 'studio_tecnico', label: 'Studio tecnico' },
      { key: 'studio_ingegneria', label: 'Studio ingegneria' },
    ]
  },
  {
    key: 'agricoltura', label: 'Agricoltura', icon: '🌾',
    attivita: [
      { key: 'azienda_agricola', label: 'Azienda agricola' },
      { key: 'agriturismo', label: 'Agriturismo' },
      { key: 'cooperativa_agricola', label: 'Cooperativa agricola' },
    ]
  },
];

// Mappa piatta per lookup veloce: key attività → macro-categoria key
const ATTIVITA_TO_MACRO = {};
MACRO_CATEGORIE.forEach(mc => {
  mc.attivita.forEach(a => {
    ATTIVITA_TO_MACRO[a.key] = mc.key;
  });
});

const NATURE_AZIENDA = [
  { key: 'industriale', label: 'Impresa industriale', desc: 'Oltre 15 dipendenti, struttura industriale', icon: '🏭' },
  { key: 'artigiana', label: 'Impresa artigiana', desc: 'Iscritta all\'albo imprese artigiane (L. 443/85)', icon: '🔧' },
  { key: 'cooperativa', label: 'Cooperativa', desc: 'Società cooperativa (di produzione, servizi, ecc.)', icon: '🤝' },
  { key: 'commerciale_pmi', label: 'Impresa commerciale / PMI', desc: 'Fino a 50 dipendenti, settore commerciale o servizi', icon: '🏪' },
  { key: 'professionale', label: 'Studio professionale', desc: 'Studio associato, STP, attività professionale', icon: '📐' },
];

const ASSOCIAZIONI = [
  { key: 'confindustria', label: 'Confindustria', desc: 'Sistema Confindustria e federazioni settoriali' },
  { key: 'confcommercio', label: 'Confcommercio', desc: 'Confederazione Generale Italiana del Commercio' },
  { key: 'confesercenti', label: 'Confesercenti', desc: 'Confederazione degli esercenti' },
  { key: 'confartigianato', label: 'Confartigianato', desc: 'Confederazione Nazionale Artigianato' },
  { key: 'cna', label: 'CNA', desc: 'Confederazione Nazionale Artigianato e PMI' },
  { key: 'confapi', label: 'Confapi', desc: 'Confederazione italiana della piccola e media industria' },
  { key: 'federalberghi', label: 'Federalberghi', desc: 'Federazione Nazionale Alberghi' },
  { key: 'ance', label: 'ANCE', desc: 'Associazione Nazionale Costruttori Edili' },
  { key: 'nessuna', label: 'Nessuna / Non so', desc: 'Non iscritto ad alcuna associazione datoriale' },
];

// Matrice di compatibilità: attività + natura + associazione → CCNL proposti
// Restituisce un array ordinato per pertinenza
function calcolaCCNLCompatibili(attivita, natura, associazione) {
  const risultati = [];

  const add = (key, label, pertinenza, nota) => {
    if (!risultati.find(r => r.key === key)) {
      risultati.push({ key, label, pertinenza, nota });
    }
  };

  // Commercio
  if (attivita === 'commercio') {
    if (['confcommercio', 'confesercenti', 'nessuna'].includes(associazione)) {
      add('Commercio', 'Commercio — Confcommercio / Confesercenti', 100, 'CCNL più applicato per commercio e servizi');
    } else {
      add('Commercio', 'Commercio — Confcommercio', 80, 'Applicabile anche se non associati');
    }
  }

  // Industria alimentare
  if (attivita === 'industria_alimentare') {
    if (natura === 'industriale' || natura === 'cooperativa') {
      add('Industria', 'Industria Alimentare — Confindustria', 100, 'Per imprese con struttura industriale');
    } else if (natura === 'artigiana') {
      add('Artigianato', 'Artigianato Alimentare', 90, 'Per imprese artigiane del settore alimentare');
      add('Industria', 'Industria Alimentare', 60, 'Alternativa per artigiani con molti dipendenti');
    } else {
      add('Industria', 'Industria Alimentare', 85, 'CCNL standard del settore');
    }
  }

  // Metalmeccanica
  if (attivita === 'metalmeccanica') {
    if (natura === 'artigiana' || ['confartigianato', 'cna'].includes(associazione)) {
      add('Artigianato', 'Artigianato — Area Meccanica', 100, 'CCNL artigianato metalmeccanico');
      add('Metalmeccanico', 'Metalmeccanico — Federmeccanica', 50, 'Alternativa per aziende più strutturate');
    } else {
      add('Metalmeccanico', 'Metalmeccanico — Federmeccanica/Assistal', 100, 'CCNL nazionale per il settore');
      if (associazione === 'confapi') {
        add('Metalmeccanico', 'Metalmeccanico — Confapi/UNIONMECCANICA', 95, 'Per PMI metalmeccaniche');
      }
    }
  }

  // Edilizia
  if (attivita === 'edilizia') {
    if (natura === 'artigiana' || ['confartigianato', 'cna'].includes(associazione)) {
      add('Artigianato', 'Artigianato Edile', 90, 'Per imprese artigiane edili');
    }
    add('Edilizia', 'Edilizia Industria — ANCE', 100, 'CCNL principale per il settore edile');
  }

  // Turismo
  if (attivita === 'turismo') {
    add('Turismo', 'Turismo — Federalberghi/Confcommercio', 100, 'CCNL Turismo e pubblici esercizi');
    if (natura === 'artigiana') {
      add('Artigianato', 'Artigianato — Ristorazione/Alimentazione', 60, 'Per piccole attività artigiane');
    }
  }

  // Artigianato
  if (attivita === 'artigianato') {
    add('Artigianato', 'Artigianato — Area Meccanica/Tessile/Legno', 100, 'CCNL Artigianato per tutti i settori');
  }

  // Altro / fallback
  if (attivita === 'altro' || risultati.length === 0) {
    add('Commercio', 'Commercio — Confcommercio', 70, 'Spesso applicato per attività non classificate');
    add('Altri CCNL', 'Altri CCNL registrati CNEL', 90, 'Per contratti specifici non in elenco');
  }

  // Aggiungi sempre "Altri CCNL" come opzione residuale
  add('Altri CCNL', 'Altri CCNL registrati CNEL', 30, 'Per CCNL specifici non elencati');

  return risultati.sort((a, b) => b.pertinenza - a.pertinenza);
}

// ─── SUB-STEPS ──────────────────────────────────────────────────────────────────

function SubStep1A({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge className="bg-lime-400/20 text-lime-400 border-0 text-[10px]">1A</Badge>
        <h3 className="text-white font-semibold text-sm">Attività Economica</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
          <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
            <p className="text-xs">Seleziona il macro-settore che meglio descrive l'attività principale della tua azienda. Questa scelta guiderà l'identificazione del CCNL corretto.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-2">
        {ATTIVITA_ECONOMICHE.map(a => (
          <button
            key={a.key}
            onClick={() => onChange(a.key)}
            className={`w-full text-left rounded-lg border p-3 transition-all ${
              value === a.key
                ? 'bg-lime-400/10 border-lime-400 ring-1 ring-lime-400/50'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${value === a.key ? 'text-lime-400' : 'text-white'}`}>{a.label}</p>
                <p className="text-slate-400 text-[11px] leading-tight">{a.desc}</p>
              </div>
              {value === a.key && <CheckCircle className="w-5 h-5 text-lime-400 flex-shrink-0" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubStep1B({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge className="bg-lime-400/20 text-lime-400 border-0 text-[10px]">1B</Badge>
        <h3 className="text-white font-semibold text-sm">Natura Azienda</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
          <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
            <p className="text-xs">La forma giuridica e la dimensione dell'azienda influenzano il CCNL applicabile e le aliquote contributive.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-2">
        {NATURE_AZIENDA.map(n => (
          <button
            key={n.key}
            onClick={() => onChange(n.key)}
            className={`w-full text-left rounded-lg border p-3 transition-all ${
              value === n.key
                ? 'bg-lime-400/10 border-lime-400 ring-1 ring-lime-400/50'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${value === n.key ? 'text-lime-400' : 'text-white'}`}>{n.label}</p>
                <p className="text-slate-400 text-[11px] leading-tight">{n.desc}</p>
              </div>
              {value === n.key && <CheckCircle className="w-5 h-5 text-lime-400 flex-shrink-0" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubStep1C({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge className="bg-lime-400/20 text-lime-400 border-0 text-[10px]">1C</Badge>
        <h3 className="text-white font-semibold text-sm">Associazione Datoriale</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
          <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
            <p className="text-xs">L'associazione datoriale a cui l'azienda è iscritta determina quale versione del CCNL viene applicata. Se non sei iscritto, seleziona "Nessuna".</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-2">
        {ASSOCIAZIONI.map(a => (
          <button
            key={a.key}
            onClick={() => onChange(a.key)}
            className={`w-full text-left rounded-lg border p-3 transition-all ${
              value === a.key
                ? 'bg-lime-400/10 border-lime-400 ring-1 ring-lime-400/50'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${value === a.key ? 'text-lime-400' : 'text-white'}`}>{a.label}</p>
                <p className="text-slate-400 text-[11px] leading-tight">{a.desc}</p>
              </div>
              {value === a.key && <CheckCircle className="w-5 h-5 text-lime-400 flex-shrink-0" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubStep1D({ ccnlOptions, value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge className="bg-lime-400/20 text-lime-400 border-0 text-[10px]">1D</Badge>
        <h3 className="text-white font-semibold text-sm">CCNL Compatibili</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
          <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
            <p className="text-xs">In base ai dati inseriti, questi sono i CCNL più pertinenti. Il primo è quello consigliato. Seleziona quello effettivamente applicato nella tua azienda.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {ccnlOptions.length === 0 ? (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-400 text-xs">Nessun CCNL compatibile trovato. Completa i passaggi precedenti.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ccnlOptions.map((c, idx) => (
            <button
              key={c.key}
              onClick={() => onChange(c.key)}
              className={`w-full text-left rounded-lg border p-3 transition-all ${
                value === c.key
                  ? 'bg-lime-400/10 border-lime-400 ring-1 ring-lime-400/50'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-medium ${value === c.key ? 'text-lime-400' : 'text-white'}`}>{c.label}</p>
                    {idx === 0 && (
                      <Badge className="bg-lime-400/30 text-lime-300 border-0 text-[9px]">Consigliato</Badge>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-tight">{c.nota}</p>
                  <div className="mt-1">
                    <div className="w-full bg-slate-700 rounded-full h-1">
                      <div className="bg-lime-400 h-1 rounded-full" style={{ width: `${c.pertinenza}%` }} />
                    </div>
                    <p className="text-slate-500 text-[9px] mt-0.5">Pertinenza: {c.pertinenza}%</p>
                  </div>
                </div>
                {value === c.key && <CheckCircle className="w-5 h-5 text-lime-400 flex-shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SubStep1E({ attivita, natura, associazione, ccnl, ccnlLabel }) {
  const attObj = ATTIVITA_ECONOMICHE.find(a => a.key === attivita);
  const natObj = NATURE_AZIENDA.find(n => n.key === natura);
  const assObj = ASSOCIAZIONI.find(a => a.key === associazione);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge className="bg-lime-400/20 text-lime-400 border-0 text-[10px]">1E</Badge>
        <h3 className="text-white font-semibold text-sm">Conferma e Salvataggio</h3>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="w-5 h-5 text-lime-400" />
            <p className="text-lime-400 font-semibold text-sm">Riepilogo Identificazione CCNL</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-slate-500 text-xs w-28 flex-shrink-0">Attività:</span>
              <span className="text-white text-xs">{attObj?.icon} {attObj?.label}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-500 text-xs w-28 flex-shrink-0">Natura azienda:</span>
              <span className="text-white text-xs">{natObj?.icon} {natObj?.label}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-500 text-xs w-28 flex-shrink-0">Associazione:</span>
              <span className="text-white text-xs">{assObj?.label}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 mt-2">
              <div className="flex items-start gap-2">
                <span className="text-lime-400 text-xs w-28 flex-shrink-0 font-bold">CCNL scelto:</span>
                <span className="text-lime-400 text-xs font-bold">{ccnlLabel || ccnl}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-blue-300 text-[11px] leading-relaxed">
            Confermando, il CCNL selezionato verrà utilizzato per calcolare minimi tabellari, mensilità e disciplina contributiva. 
            Potrai sempre tornare indietro per modificare la scelta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE ──────────────────────────────────────────────────────

export default function StepIdentificazioneCCNL({ onComplete, onBack }) {
  const [subStep, setSubStep] = useState('1A');
  const [attivita, setAttivita] = useState('');
  const [natura, setNatura] = useState('');
  const [associazione, setAssociazione] = useState('');
  const [ccnlScelto, setCcnlScelto] = useState('');

  const ccnlOptions = useMemo(() => {
    if (!attivita || !natura || !associazione) return [];
    return calcolaCCNLCompatibili(attivita, natura, associazione);
  }, [attivita, natura, associazione]);

  const ccnlLabel = ccnlOptions.find(c => c.key === ccnlScelto)?.label || '';

  const subSteps = ['1A', '1B', '1C', '1D', '1E'];
  const subStepIdx = subSteps.indexOf(subStep);

  const canNext = () => {
    switch (subStep) {
      case '1A': return !!attivita;
      case '1B': return !!natura;
      case '1C': return !!associazione;
      case '1D': return !!ccnlScelto;
      case '1E': return !!ccnlScelto;
      default: return false;
    }
  };

  const goNext = () => {
    if (subStep === '1E') {
      onComplete(ccnlScelto);
      return;
    }
    const nextIdx = subStepIdx + 1;
    if (nextIdx < subSteps.length) {
      setSubStep(subSteps[nextIdx]);
    }
  };

  const goPrev = () => {
    if (subStepIdx === 0) {
      onBack?.();
      return;
    }
    setSubStep(subSteps[subStepIdx - 1]);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-white font-bold text-sm mb-1">Step 1 — Identificazione del Contratto Collettivo Applicabile</h3>
          <p className="text-slate-400 text-[11px]">Procedura guidata in 5 fasi per determinare il CCNL corretto</p>
        </div>

        {/* Mini progress */}
        <div className="flex items-center gap-1">
          {subSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= subStepIdx ? 'bg-lime-400' : 'bg-slate-700'
              }`} />
            </div>
          ))}
        </div>

        {/* Sub-step content */}
        {subStep === '1A' && <SubStep1A value={attivita} onChange={setAttivita} />}
        {subStep === '1B' && <SubStep1B value={natura} onChange={setNatura} />}
        {subStep === '1C' && <SubStep1C value={associazione} onChange={setAssociazione} />}
        {subStep === '1D' && <SubStep1D ccnlOptions={ccnlOptions} value={ccnlScelto} onChange={setCcnlScelto} />}
        {subStep === '1E' && <SubStep1E attivita={attivita} natura={natura} associazione={associazione} ccnl={ccnlScelto} ccnlLabel={ccnlLabel} />}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button onClick={goPrev} variant="outline" className="border-slate-600 text-slate-400 hover:bg-slate-800">
            <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
          </Button>
          <div className="flex-1" />
          <Button onClick={goNext} disabled={!canNext()} className="bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold">
            {subStep === '1E' ? (
              <>
                <FileCheck className="w-4 h-4 mr-1" /> Conferma CCNL
              </>
            ) : (
              <>
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}