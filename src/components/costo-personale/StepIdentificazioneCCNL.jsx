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
  { key: 'artigiana', label: 'Artigiana', desc: 'Iscritta all\'albo imprese artigiane (L. 443/85)', icon: '🔧' },
  { key: 'industriale', label: 'Industriale', desc: 'Impresa con struttura industriale', icon: '🏭' },
  { key: 'commerciale', label: 'Commerciale', desc: 'Impresa commerciale, servizi, terziario', icon: '🏪' },
  { key: 'cooperativa', label: 'Cooperativa', desc: 'Società cooperativa (di produzione, servizi, sociale, ecc.)', icon: '🤝' },
  { key: 'professionale', label: 'Professionale', desc: 'Studio associato, STP, attività professionale', icon: '📐' },
  { key: 'pubblico_esercizio', label: 'Pubblico esercizio', desc: 'Bar, ristoranti, pubblici esercizi, somministrazione', icon: '🍽' },
  { key: 'agricola', label: 'Agricola', desc: 'Impresa agricola, agriturismo, cooperativa agricola', icon: '🌾' },
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

// Risolvi la macro-categoria dalla singola attività
function getMacroFromAttivita(attivitaKey) {
  return ATTIVITA_TO_MACRO[attivitaKey] || null;
}

// Ottieni label dell'attività
function getAttivitaLabel(attivitaKey) {
  for (const mc of MACRO_CATEGORIE) {
    const found = mc.attivita.find(a => a.key === attivitaKey);
    if (found) return found.label;
  }
  return attivitaKey;
}

// Matrice di compatibilità: attività + natura + associazione → CCNL proposti
function calcolaCCNLCompatibili(attivita, natura, associazione) {
  const macro = getMacroFromAttivita(attivita);
  const risultati = [];

  const add = (key, label, pertinenza, nota) => {
    if (!risultati.find(r => r.key === key)) {
      risultati.push({ key, label, pertinenza, nota });
    }
  };

  // Commercio & Terziario
  if (macro === 'commercio_terziario') {
    if (['confcommercio', 'confesercenti', 'nessuna'].includes(associazione)) {
      add('Commercio', 'Commercio — Confcommercio / Confesercenti', 100, 'CCNL più applicato per commercio e servizi');
    } else {
      add('Commercio', 'Commercio — Confcommercio', 80, 'Applicabile anche se non associati');
    }
    if (attivita === 'farmacia' || attivita === 'parafarmacia') {
      add('Commercio', 'Commercio — Farmacie', 100, 'CCNL specifico per farmacie/parafarmacie');
    }
  }

  // Pubblici Esercizi
  if (macro === 'pubblici_esercizi') {
    add('Turismo', 'Turismo e Pubblici Esercizi — Confcommercio/FIPE', 100, 'CCNL principale per bar, ristoranti, catering');
    if (natura === 'artigiana') {
      add('Artigianato', 'Artigianato — Alimentazione e Ristorazione', 70, 'Per piccole attività artigiane di ristorazione');
    }
  }

  // Turismo
  if (macro === 'turismo') {
    add('Turismo', 'Turismo — Federalberghi/Confcommercio', 100, 'CCNL Turismo per strutture ricettive');
    if (attivita === 'agriturismo') {
      add('Altri CCNL', 'Agriturismo — CCNL specifico', 85, 'CCNL per attività agrituristiche');
    }
  }

  // Artigianato
  if (macro === 'artigianato') {
    add('Artigianato', 'Artigianato — Confartigianato/CNA', 100, 'CCNL Artigianato per il settore specifico');
    if (['centro_estetico', 'parrucchiere'].includes(attivita)) {
      add('Artigianato', 'Artigianato — Acconciatura ed Estetica', 100, 'CCNL specifico per settore benessere');
    }
    if (['officina_meccanica', 'carpenteria_metallica'].includes(attivita)) {
      add('Metalmeccanico', 'Metalmeccanico — Federmeccanica', 50, 'Alternativa per aziende più strutturate');
    }
  }

  // Industria
  if (macro === 'industria') {
    if (attivita === 'industria_metalmeccanica') {
      if (natura === 'artigiana' || ['confartigianato', 'cna'].includes(associazione)) {
        add('Artigianato', 'Artigianato — Area Meccanica', 95, 'CCNL artigianato metalmeccanico');
      }
      add('Metalmeccanico', 'Metalmeccanico — Federmeccanica/Assistal', 100, 'CCNL nazionale metalmeccanico');
      if (associazione === 'confapi') {
        add('Metalmeccanico', 'Metalmeccanico — Confapi/UNIONMECCANICA', 95, 'Per PMI metalmeccaniche');
      }
    } else if (attivita === 'industria_alimentare') {
      if (natura === 'industriale' || natura === 'cooperativa') {
        add('Industria', 'Industria Alimentare — Confindustria', 100, 'Per imprese con struttura industriale');
      } else if (natura === 'artigiana') {
        add('Artigianato', 'Artigianato Alimentare', 90, 'Per imprese artigiane del settore');
        add('Industria', 'Industria Alimentare', 60, 'Alternativa per artigiani con molti dipendenti');
      } else if (natura === 'commerciale') {
        add('Industria', 'Industria Alimentare', 85, 'CCNL standard del settore');
        add('Commercio', 'Commercio — Confcommercio', 50, 'Per attività prevalentemente commerciale');
      } else {
        add('Industria', 'Industria Alimentare', 85, 'CCNL standard del settore');
      }
    } else if (attivita === 'industria_chimica') {
      add('Industria', 'Industria Chimica — Federchimica', 100, 'CCNL chimico-farmaceutico');
    } else if (attivita === 'industria_farmaceutica') {
      add('Industria', 'Industria Chimica-Farmaceutica — Federchimica', 100, 'CCNL chimico-farmaceutico');
    } else if (attivita === 'industria_tessile') {
      add('Industria', 'Industria Tessile — SMI', 100, 'CCNL tessile-abbigliamento-moda');
    } else if (attivita === 'industria_plastica') {
      add('Industria', 'Industria Gomma-Plastica', 100, 'CCNL gomma plastica');
    } else if (attivita === 'industria_cartaria') {
      add('Industria', 'Industria Cartaria — Assocarta', 100, 'CCNL cartario-cartotecnico');
    } else if (attivita === 'industria_legno') {
      if (natura === 'artigiana') {
        add('Artigianato', 'Artigianato — Area Legno/Arredamento', 95, 'CCNL artigianato legno');
      }
      add('Industria', 'Industria Legno — FederlegnoArredo', 100, 'CCNL legno-arredamento industria');
    } else {
      add('Industria', 'Industria — Confindustria', 85, 'CCNL industriale generico');
    }
  }

  // Edilizia
  if (macro === 'edilizia') {
    if (natura === 'artigiana' || ['confartigianato', 'cna'].includes(associazione)) {
      add('Artigianato', 'Artigianato Edile', 90, 'Per imprese artigiane edili');
    }
    add('Edilizia', 'Edilizia Industria — ANCE', 100, 'CCNL principale per il settore edile');
  }

  // Trasporti & Logistica
  if (macro === 'trasporti_logistica') {
    add('Altri CCNL', 'Logistica, Trasporto Merci e Spedizioni — CCNL Logistica', 100, 'CCNL autotrasporto/logistica');
    if (natura === 'artigiana') {
      add('Artigianato', 'Artigianato — Trasporto', 70, 'Per piccole imprese artigiane di trasporto');
    }
  }

  // Sanità & Servizi alla Persona
  if (macro === 'sanita_servizi_persona') {
    if (['studio_medico', 'studio_dentistico'].includes(attivita)) {
      add('Altri CCNL', 'Studi Professionali — Confprofessioni', 100, 'CCNL studi professionali area sanitaria');
    } else if (attivita === 'clinica_privata') {
      add('Altri CCNL', 'Sanità Privata — AIOP/ARIS', 100, 'CCNL personale dipendente sanità privata');
    } else if (attivita === 'rsa' || attivita === 'cooperativa_sociale' || attivita === 'servizi_domiciliari') {
      add('Altri CCNL', 'Cooperative Sociali — CCNL Coop. Sociali', 100, 'CCNL per cooperative socio-sanitarie');
    }
  }

  // Studi Professionali
  if (macro === 'studi_professionali') {
    add('Altri CCNL', 'Studi Professionali — Confprofessioni', 100, 'CCNL studi professionali');
    add('Commercio', 'Commercio — Confcommercio', 50, 'Alternativa per studi con attività commerciale');
  }

  // Agricoltura
  if (macro === 'agricoltura') {
    add('Altri CCNL', 'Agricoltura — Operai Agricoli e Florovivaisti', 100, 'CCNL lavoratori agricoli');
    if (attivita === 'agriturismo') {
      add('Turismo', 'Turismo — CCNL Agriturismo', 80, 'Per attività ricettiva agricola');
    }
  }

  // Fallback
  if (risultati.length === 0) {
    add('Commercio', 'Commercio — Confcommercio', 70, 'Spesso applicato per attività non classificate');
    add('Altri CCNL', 'Altri CCNL registrati CNEL', 90, 'Per contratti specifici non in elenco');
  }

  // Sempre come opzione residuale
  add('Altri CCNL', 'Altri CCNL registrati CNEL', 30, 'Per CCNL specifici non elencati');

  return risultati.sort((a, b) => b.pertinenza - a.pertinenza);
}

// ─── SUB-STEPS ──────────────────────────────────────────────────────────────────

function SubStep1A({ value, onChange }) {
  const [expandedMacro, setExpandedMacro] = useState(null);
  const [search, setSearch] = useState('');

  // Trova la macro-categoria dell'attività selezionata
  const selectedMacro = value ? ATTIVITA_TO_MACRO[value] : null;

  // Filtra per ricerca
  const filteredMacro = useMemo(() => {
    if (!search.trim()) return MACRO_CATEGORIE;
    const q = search.toLowerCase();
    return MACRO_CATEGORIE.map(mc => {
      const filteredAtt = mc.attivita.filter(a => a.label.toLowerCase().includes(q));
      if (filteredAtt.length > 0) return { ...mc, attivita: filteredAtt };
      if (mc.label.toLowerCase().includes(q)) return mc;
      return null;
    }).filter(Boolean);
  }, [search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge className="bg-lime-400/20 text-lime-400 border-0 text-[10px]">1A</Badge>
        <h3 className="text-white font-semibold text-sm">Attività Economica</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
          <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
            <p className="text-xs">Seleziona la specifica attività della tua azienda. Le attività sono raggruppate per macro-settore.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Barra di ricerca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Cerca attività (es. ristorante, officina...)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 text-sm"
        />
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {filteredMacro.map(mc => {
          const isExpanded = expandedMacro === mc.key || (search.trim().length > 0);
          const hasSelection = mc.attivita.some(a => a.key === value);

          return (
            <div key={mc.key} className="rounded-lg border border-slate-700 overflow-hidden">
              {/* Header macro-categoria */}
              <button
                onClick={() => setExpandedMacro(isExpanded && !search ? null : mc.key)}
                className={`w-full text-left p-3 flex items-center gap-3 transition-all ${
                  hasSelection ? 'bg-lime-400/5 border-lime-400/20' : 'bg-slate-800 hover:bg-slate-800/80'
                }`}
              >
                <span className="text-lg">{mc.icon}</span>
                <span className={`text-sm font-medium flex-1 ${hasSelection ? 'text-lime-400' : 'text-white'}`}>{mc.label}</span>
                <span className="text-slate-500 text-[10px]">{mc.attivita.length} voci</span>
                <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {/* Lista attività espansa */}
              {isExpanded && (
                <div className="border-t border-slate-700 bg-slate-900/50">
                  {mc.attivita.map(a => (
                    <button
                      key={a.key}
                      onClick={() => onChange(a.key)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-2 border-b border-slate-800 last:border-0 transition-all ${
                        value === a.key
                          ? 'bg-lime-400/10'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <span className={`text-xs flex-1 ${value === a.key ? 'text-lime-400 font-medium' : 'text-slate-300'}`}>
                        {a.label}
                      </span>
                      {value === a.key && <CheckCircle className="w-4 h-4 text-lime-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filteredMacro.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-4">Nessuna attività trovata per "{search}"</p>
        )}
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
  const macroKey = ATTIVITA_TO_MACRO[attivita];
  const macroObj = MACRO_CATEGORIE.find(mc => mc.key === macroKey);
  const attLabel = getAttivitaLabel(attivita);
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
              <span className="text-white text-xs">{macroObj?.icon} {attLabel} ({macroObj?.label})</span>
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