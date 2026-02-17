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
  { key: 'confapi', label: 'Confapi', desc: 'Confederazione italiana della piccola e media industria' },
  { key: 'confcommercio', label: 'Confcommercio', desc: 'Confederazione Generale Italiana del Commercio' },
  { key: 'confesercenti', label: 'Confesercenti', desc: 'Confederazione degli esercenti' },
  { key: 'cna', label: 'CNA', desc: 'Confederazione Nazionale Artigianato e PMI' },
  { key: 'confartigianato', label: 'Confartigianato', desc: 'Confederazione Nazionale Artigianato' },
  { key: 'nessuna', label: 'Nessuna', desc: 'Non iscritto ad alcuna associazione datoriale' },
  { key: 'non_so', label: 'Non so', desc: 'Non conosco l\'associazione di riferimento' },
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

// ─── DATABASE CCNL ──────────────────────────────────────────────────────────────
// Ogni CCNL ha: key, nome, codice_cnel, settore, associazione_firmataria, ultimo_rinnovo, stato
const CCNL_DATABASE = {
  commercio_confcommercio: {
    key: 'Commercio', nome: 'CCNL Terziario, Distribuzione e Servizi',
    codice_cnel: 'H011', settore: 'Commercio e Terziario',
    associazione_firmataria: 'Confcommercio — FILCAMS CGIL, FISASCAT CISL, UILTuCS',
    ultimo_rinnovo: '22/03/2024', stato: 'Vigente'
  },
  commercio_confesercenti: {
    key: 'Commercio', nome: 'CCNL Commercio — Confesercenti',
    codice_cnel: 'H01K', settore: 'Commercio e Terziario',
    associazione_firmataria: 'Confesercenti — FILCAMS CGIL, FISASCAT CISL, UILTuCS',
    ultimo_rinnovo: '12/12/2019', stato: 'In attesa di rinnovo'
  },
  commercio_farmacie: {
    key: 'Commercio', nome: 'CCNL Farmacie Private',
    codice_cnel: 'H01S', settore: 'Commercio — Farmacie',
    associazione_firmataria: 'Federfarma — FILCAMS CGIL, FISASCAT CISL, UILTuCS',
    ultimo_rinnovo: '07/09/2021', stato: 'Vigente'
  },
  turismo_confcommercio: {
    key: 'Turismo', nome: 'CCNL Turismo — Confcommercio',
    codice_cnel: 'H052', settore: 'Turismo e Pubblici Esercizi',
    associazione_firmataria: 'Federalberghi, FIPE — FILCAMS CGIL, FISASCAT CISL, UILTuCS',
    ultimo_rinnovo: '05/07/2024', stato: 'Vigente'
  },
  turismo_confesercenti: {
    key: 'Turismo', nome: 'CCNL Turismo — Confesercenti',
    codice_cnel: 'H05K', settore: 'Turismo e Pubblici Esercizi',
    associazione_firmataria: 'Confesercenti, FIEPET — FILCAMS CGIL, FISASCAT CISL, UILTuCS',
    ultimo_rinnovo: '05/07/2024', stato: 'Vigente'
  },
  metalmeccanico_confindustria: {
    key: 'Metalmeccanico', nome: 'CCNL Metalmeccanico — Federmeccanica/Assistal',
    codice_cnel: 'C011', settore: 'Industria Metalmeccanica',
    associazione_firmataria: 'Federmeccanica, Assistal — FIM CISL, FIOM CGIL, UILM',
    ultimo_rinnovo: '05/02/2021', stato: 'In attesa di rinnovo'
  },
  metalmeccanico_confapi: {
    key: 'Metalmeccanico', nome: 'CCNL Metalmeccanico PMI — Confapi/UNIONMECCANICA',
    codice_cnel: 'C013', settore: 'Industria Metalmeccanica PMI',
    associazione_firmataria: 'Confapi UNIONMECCANICA — FIM CISL, FIOM CGIL, UILM',
    ultimo_rinnovo: '26/05/2021', stato: 'In attesa di rinnovo'
  },
  artigianato_metalmeccanico: {
    key: 'Artigianato', nome: 'CCNL Artigianato — Area Meccanica',
    codice_cnel: 'T011', settore: 'Artigianato Metalmeccanico',
    associazione_firmataria: 'Confartigianato, CNA, Casartigiani — FIM CISL, FIOM CGIL, UILM',
    ultimo_rinnovo: '24/01/2024', stato: 'Vigente'
  },
  artigianato_estetica: {
    key: 'Artigianato', nome: 'CCNL Acconciatura ed Estetica',
    codice_cnel: 'T071', settore: 'Artigianato — Benessere',
    associazione_firmataria: 'Confartigianato Benessere, CNA — FILCAMS CGIL, FISASCAT CISL, UILTuCS',
    ultimo_rinnovo: '10/10/2022', stato: 'Vigente'
  },
  artigianato_generico: {
    key: 'Artigianato', nome: 'CCNL Area Comunicazione, Legno, Chimica, Tessile Artigianato',
    codice_cnel: 'T0A1', settore: 'Artigianato — Aree varie',
    associazione_firmataria: 'Confartigianato, CNA, Casartigiani, CLAAI — CGIL, CISL, UIL',
    ultimo_rinnovo: '24/01/2024', stato: 'Vigente'
  },
  artigianato_alimentare: {
    key: 'Artigianato', nome: 'CCNL Artigianato — Area Alimentazione e Panificazione',
    codice_cnel: 'T031', settore: 'Artigianato Alimentare',
    associazione_firmataria: 'Confartigianato, CNA, Casartigiani — FAI CISL, FLAI CGIL, UILA',
    ultimo_rinnovo: '06/12/2023', stato: 'Vigente'
  },
  artigianato_edile: {
    key: 'Artigianato', nome: 'CCNL Edilizia — Artigianato',
    codice_cnel: 'T051', settore: 'Artigianato Edile',
    associazione_firmataria: 'Confartigianato Edilizia, CNA — FENEAL UIL, FILCA CISL, FILLEA CGIL',
    ultimo_rinnovo: '04/05/2022', stato: 'Vigente'
  },
  artigianato_trasporto: {
    key: 'Artigianato', nome: 'CCNL Artigianato — Area Trasporto',
    codice_cnel: 'T061', settore: 'Artigianato Trasporti',
    associazione_firmataria: 'Confartigianato Trasporti, CNA FITA — FILT CGIL, FIT CISL, UILTrasporti',
    ultimo_rinnovo: '24/01/2024', stato: 'Vigente'
  },
  industria_alimentare: {
    key: 'Industria', nome: 'CCNL Industria Alimentare',
    codice_cnel: 'E012', settore: 'Industria Alimentare',
    associazione_firmataria: 'Confindustria — FAI CISL, FLAI CGIL, UILA',
    ultimo_rinnovo: '01/03/2024', stato: 'Vigente'
  },
  industria_chimica: {
    key: 'Industria', nome: 'CCNL Industria Chimica Farmaceutica',
    codice_cnel: 'E014', settore: 'Industria Chimica e Farmaceutica',
    associazione_firmataria: 'Federchimica, Farmindustria — FILCTEM CGIL, FEMCA CISL, UILTEC',
    ultimo_rinnovo: '13/06/2022', stato: 'Vigente'
  },
  industria_tessile: {
    key: 'Industria', nome: 'CCNL Tessile Abbigliamento Moda — Industria',
    codice_cnel: 'D011', settore: 'Industria Tessile',
    associazione_firmataria: 'SMI Confindustria Moda — FILCTEM CGIL, FEMCA CISL, UILTEC',
    ultimo_rinnovo: '28/07/2021', stato: 'In attesa di rinnovo'
  },
  industria_gomma_plastica: {
    key: 'Industria', nome: 'CCNL Gomma Plastica — Industria',
    codice_cnel: 'E015', settore: 'Industria Gomma e Plastica',
    associazione_firmataria: 'Federazione Gomma Plastica — FILCTEM CGIL, FEMCA CISL, UILTEC',
    ultimo_rinnovo: '29/12/2022', stato: 'Vigente'
  },
  industria_cartaria: {
    key: 'Industria', nome: 'CCNL Industria Cartaria e Cartotecnica',
    codice_cnel: 'D021', settore: 'Industria Cartaria',
    associazione_firmataria: 'Assocarta, Assografici — SLC CGIL, FISTEL CISL, UILCOM',
    ultimo_rinnovo: '28/07/2021', stato: 'In attesa di rinnovo'
  },
  industria_legno: {
    key: 'Industria', nome: 'CCNL Legno e Arredamento — Industria',
    codice_cnel: 'F011', settore: 'Industria Legno e Arredamento',
    associazione_firmataria: 'FederlegnoArredo — FILCA CISL, FILLEA CGIL, FENEAL UIL',
    ultimo_rinnovo: '30/10/2020', stato: 'In attesa di rinnovo'
  },
  artigianato_legno: {
    key: 'Artigianato', nome: 'CCNL Artigianato — Area Legno e Arredamento',
    codice_cnel: 'T041', settore: 'Artigianato Legno',
    associazione_firmataria: 'Confartigianato Legno, CNA — FILCA CISL, FILLEA CGIL, FENEAL UIL',
    ultimo_rinnovo: '24/01/2024', stato: 'Vigente'
  },
  edilizia_industria: {
    key: 'Edilizia', nome: 'CCNL Edilizia — Industria',
    codice_cnel: 'F012', settore: 'Edilizia e Costruzioni',
    associazione_firmataria: 'ANCE — FENEAL UIL, FILCA CISL, FILLEA CGIL',
    ultimo_rinnovo: '03/03/2022', stato: 'Vigente'
  },
  logistica: {
    key: 'Logistica', nome: 'CCNL Logistica, Trasporto Merci e Spedizioni',
    codice_cnel: 'I011', settore: 'Trasporti e Logistica',
    associazione_firmataria: 'Confetra, Assologistica — FILT CGIL, FIT CISL, UILTrasporti',
    ultimo_rinnovo: '06/12/2024', stato: 'Vigente'
  },
  studi_professionali: {
    key: 'Studi Professionali', nome: 'CCNL Studi Professionali',
    codice_cnel: 'H042', settore: 'Studi Professionali',
    associazione_firmataria: 'Confprofessioni — FILCAMS CGIL, FISASCAT CISL, UILTuCS',
    ultimo_rinnovo: '16/02/2024', stato: 'Vigente'
  },
  sanita_privata: {
    key: 'Sanità Privata', nome: 'CCNL Sanità Privata — Personale non medico',
    codice_cnel: 'J012', settore: 'Sanità e Assistenza',
    associazione_firmataria: 'AIOP, ARIS — FP CGIL, CISL FP, UIL FPL',
    ultimo_rinnovo: '10/10/2020', stato: 'In attesa di rinnovo'
  },
  cooperative_sociali: {
    key: 'Cooperative Sociali', nome: 'CCNL Cooperative Sociali',
    codice_cnel: 'J021', settore: 'Cooperazione Sociale',
    associazione_firmataria: 'Confcooperative, Legacoop, AGCI — FP CGIL, CISL FP, UIL FPL',
    ultimo_rinnovo: '21/05/2019', stato: 'In attesa di rinnovo'
  },
  agricoltura_operai: {
    key: 'Agricoltura', nome: 'CCNL Operai Agricoli e Florovivaisti',
    codice_cnel: 'A012', settore: 'Agricoltura',
    associazione_firmataria: 'Confagricoltura, Coldiretti, CIA — FLAI CGIL, FAI CISL, UILA',
    ultimo_rinnovo: '23/05/2022', stato: 'Vigente'
  },
  agriturismo: {
    key: 'Turismo', nome: 'CCNL Agriturismi',
    codice_cnel: 'A021', settore: 'Agriturismo',
    associazione_firmataria: 'Confagricoltura, Coldiretti, CIA — FLAI CGIL, FAI CISL, UILA',
    ultimo_rinnovo: '06/06/2018', stato: 'In attesa di rinnovo'
  },
  industria_generica: {
    key: 'Industria', nome: 'CCNL Industria — Confindustria (generico)',
    codice_cnel: 'C0XX', settore: 'Industria',
    associazione_firmataria: 'Confindustria — CGIL, CISL, UIL',
    ultimo_rinnovo: '—', stato: 'Variabile per settore'
  },
};

// Matrice di compatibilità: attività + natura + associazione → CCNL proposti
function calcolaCCNLCompatibili(attivita, natura, associazione) {
  const macro = getMacroFromAttivita(attivita);
  const risultati = [];

  const add = (dbKey, pertinenza) => {
    const ccnl = CCNL_DATABASE[dbKey];
    if (!ccnl || risultati.find(r => r.dbKey === dbKey)) return;
    risultati.push({ ...ccnl, dbKey, pertinenza });
  };

  // Commercio & Terziario
  if (macro === 'commercio_terziario') {
    if (attivita === 'farmacia' || attivita === 'parafarmacia') {
      add('commercio_farmacie', 100);
    }
    if (['confcommercio', 'nessuna', 'non_so'].includes(associazione)) {
      add('commercio_confcommercio', 95);
    }
    if (associazione === 'confesercenti') {
      add('commercio_confesercenti', 95);
    }
    add('commercio_confcommercio', 70);
    add('commercio_confesercenti', 50);
  }

  // Pubblici Esercizi
  if (macro === 'pubblici_esercizi') {
    if (associazione === 'confesercenti') {
      add('turismo_confesercenti', 100);
    } else {
      add('turismo_confcommercio', 100);
    }
    add('turismo_confesercenti', 60);
    if (natura === 'artigiana') {
      add('artigianato_alimentare', 70);
    }
  }

  // Turismo
  if (macro === 'turismo') {
    if (attivita === 'agriturismo') {
      add('agriturismo', 95);
    }
    if (associazione === 'confesercenti') {
      add('turismo_confesercenti', 100);
    } else {
      add('turismo_confcommercio', 100);
    }
    add('turismo_confesercenti', 50);
  }

  // Artigianato
  if (macro === 'artigianato') {
    if (['centro_estetico', 'parrucchiere'].includes(attivita)) {
      add('artigianato_estetica', 100);
    }
    if (['officina_meccanica', 'carpenteria_metallica', 'impresa_impiantistica'].includes(attivita)) {
      add('artigianato_metalmeccanico', 100);
      if (natura === 'industriale') add('metalmeccanico_confindustria', 60);
    }
    if (['falegnameria', 'azienda_serramenti'].includes(attivita)) {
      add('artigianato_legno', 100);
      if (natura === 'industriale') add('industria_legno', 60);
    }
    if (['idraulico', 'elettricista'].includes(attivita)) {
      add('artigianato_metalmeccanico', 95);
    }
    add('artigianato_generico', 50);
  }

  // Industria
  if (macro === 'industria') {
    if (attivita === 'industria_metalmeccanica') {
      if (natura === 'artigiana' || ['confartigianato', 'cna'].includes(associazione)) {
        add('artigianato_metalmeccanico', 95);
      }
      if (associazione === 'confapi') {
        add('metalmeccanico_confapi', 100);
      } else {
        add('metalmeccanico_confindustria', 100);
      }
      add('metalmeccanico_confapi', 60);
    } else if (attivita === 'industria_alimentare') {
      if (natura === 'artigiana') {
        add('artigianato_alimentare', 95);
      }
      add('industria_alimentare', natura === 'artigiana' ? 60 : 100);
    } else if (attivita === 'industria_chimica' || attivita === 'industria_farmaceutica') {
      add('industria_chimica', 100);
    } else if (attivita === 'industria_tessile') {
      add('industria_tessile', 100);
      if (natura === 'artigiana') add('artigianato_generico', 70);
    } else if (attivita === 'industria_plastica') {
      add('industria_gomma_plastica', 100);
    } else if (attivita === 'industria_cartaria') {
      add('industria_cartaria', 100);
    } else if (attivita === 'industria_legno') {
      if (natura === 'artigiana') add('artigianato_legno', 95);
      add('industria_legno', natura === 'artigiana' ? 70 : 100);
    } else {
      add('industria_generica', 80);
    }
  }

  // Edilizia
  if (macro === 'edilizia') {
    if (natura === 'artigiana' || ['confartigianato', 'cna'].includes(associazione)) {
      add('artigianato_edile', 95);
    }
    add('edilizia_industria', natura === 'artigiana' ? 60 : 100);
  }

  // Trasporti & Logistica
  if (macro === 'trasporti_logistica') {
    add('logistica', 100);
    if (natura === 'artigiana') add('artigianato_trasporto', 80);
  }

  // Sanità & Servizi alla Persona
  if (macro === 'sanita_servizi_persona') {
    if (['studio_medico', 'studio_dentistico'].includes(attivita)) {
      add('studi_professionali', 100);
    } else if (attivita === 'clinica_privata') {
      add('sanita_privata', 100);
    } else if (['rsa', 'cooperativa_sociale', 'servizi_domiciliari'].includes(attivita)) {
      add('cooperative_sociali', 100);
      add('sanita_privata', 50);
    }
  }

  // Studi Professionali
  if (macro === 'studi_professionali') {
    add('studi_professionali', 100);
    add('commercio_confcommercio', 40);
  }

  // Agricoltura
  if (macro === 'agricoltura') {
    add('agricoltura_operai', 100);
    if (attivita === 'agriturismo') add('agriturismo', 85);
  }

  // Fallback
  if (risultati.length === 0) {
    add('commercio_confcommercio', 60);
  }

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
        <h3 className="text-white font-semibold text-sm">L'azienda è:</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
          <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
            <p className="text-xs">La natura dell'azienda influenza il CCNL applicabile e le aliquote contributive.</p>
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
        <h3 className="text-white font-semibold text-sm">Sei associato a:</h3>
        <Tooltip>
          <TooltipTrigger><HelpCircle className="w-4 h-4 text-slate-500" /></TooltipTrigger>
          <TooltipContent className="max-w-[280px] bg-slate-700 text-white border-slate-600">
            <p className="text-xs">L'associazione datoriale a cui l'azienda è iscritta determina quale versione del CCNL viene applicata.</p>
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
        <div className="space-y-3">
          {ccnlOptions.map((c, idx) => {
            const isSelected = value === c.dbKey;
            const statoColor = c.stato === 'Vigente'
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : c.stato === 'In attesa di rinnovo'
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                : 'bg-slate-600/20 text-slate-400 border-slate-500/30';

            return (
              <button
                key={c.dbKey}
                onClick={() => onChange(c.dbKey)}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  isSelected
                    ? 'bg-lime-400/10 border-lime-400 ring-1 ring-lime-400/50'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Nome + badge consigliato */}
                    <div className="flex items-start gap-2">
                      <p className={`text-sm font-semibold leading-tight ${isSelected ? 'text-lime-400' : 'text-white'}`}>
                        {c.nome}
                      </p>
                      {idx === 0 && (
                        <Badge className="bg-lime-400/30 text-lime-300 border-0 text-[9px] flex-shrink-0">Consigliato</Badge>
                      )}
                    </div>

                    {/* Dettagli in griglia */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <span className="text-slate-500 text-[10px]">Codice CNEL</span>
                        <p className="text-slate-300 text-[11px] font-mono">{c.codice_cnel}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Settore</span>
                        <p className="text-slate-300 text-[11px]">{c.settore}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 text-[10px]">Associazione firmataria</span>
                        <p className="text-slate-300 text-[11px] leading-tight">{c.associazione_firmataria}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Ultimo rinnovo</span>
                        <p className="text-slate-300 text-[11px]">{c.ultimo_rinnovo}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px]">Stato</span>
                        <Badge className={`${statoColor} border text-[9px] mt-0.5`}>{c.stato}</Badge>
                      </div>
                    </div>

                    {/* Barra pertinenza */}
                    <div>
                      <div className="w-full bg-slate-700 rounded-full h-1">
                        <div className="bg-lime-400 h-1 rounded-full" style={{ width: `${c.pertinenza}%` }} />
                      </div>
                      <p className="text-slate-500 text-[9px] mt-0.5">Coerenza: {c.pertinenza}%</p>
                    </div>
                  </div>
                  {isSelected && <CheckCircle className="w-5 h-5 text-lime-400 flex-shrink-0 mt-1" />}
                </div>
              </button>
            );
          })}
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

  const ccnlSelezionato = ccnlOptions.find(c => c.dbKey === ccnlScelto);
  const ccnlLabel = ccnlSelezionato?.nome || '';

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