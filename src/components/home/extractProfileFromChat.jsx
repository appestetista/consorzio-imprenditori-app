/**
 * Estrae dati del profilo aziendale dal messaggio dell'utente,
 * MA solo se l'utente sta parlando della PROPRIA azienda (quella loggata).
 * Non salva mai dati se sta chiedendo informazioni generiche o su terzi.
 */
import { base44 } from '@/api/base44Client';

// Mapping: regex pattern → campo profilo + valore normalizzato
const EXTRACTION_RULES = [
  // Settore
  { field: 'settore', patterns: [
    { regex: /(?:la mia azienda|la mia impresa|la mia attività|io|noi)\s+(?:si occup[ao]|operi?a?m?o?|lavori?a?m?o?|facci?a?m?o?|siamo)\s+(?:in|nel|nell[ao']?|di)\s+(manifattura|commercio|servizi|tecnologia|ristorazione|edilizia|trasporti|sanità|professioni)/i, group: 1, normalize: capitalizeFirst },
    { regex: /(?:sono|siamo)\s+(?:nel settore|nel campo)\s+(?:dell?[ao']?\s+)?(manifattura|commercio|servizi|tecnologia|ristorazione|edilizia|trasporti|sanità|professioni)/i, group: 1, normalize: capitalizeFirst },
    { regex: /(?:il mio settore|il nostro settore)\s+è\s+(manifattura|commercio|servizi|tecnologia|ristorazione|edilizia|trasporti|sanità|professioni)/i, group: 1, normalize: capitalizeFirst },
    { regex: /(?:ho un|ho una|gestisco un|gestisco una|abbiamo un|abbiamo una)\s+(?:azienda|impresa|attività|ditta|negozio|ristorante|studio|laboratorio)\s+(?:di|nel|nell[ao']?)\s+(manifattura|commercio|servizi|tecnologia|ristorazione|edilizia|trasporti|sanità|professioni)/i, group: 1, normalize: capitalizeFirst },
  ]},
  // Forma giuridica
  { field: 'forma_giuridica', patterns: [
    { regex: /(?:la mia|la nostra|sono una?|siamo una?|abbiamo una?|ho una?)\s+(?:azienda|impresa|attività|ditta|società)?\s*(srl|srls|sas|snc|spa|s\.r\.l\.?|s\.r\.l\.?s\.?|s\.a\.s\.?|s\.n\.c\.?|s\.p\.a\.?|ditta individuale|cooperativa)/i, group: 1, normalize: normalizeFormaGiuridica },
    { regex: /(?:come|in qualità di|forma giuridica)\s*(srl|srls|sas|snc|spa|ditta individuale|cooperativa)/i, group: 1, normalize: normalizeFormaGiuridica },
  ]},
  // Regime fiscale
  { field: 'regime_fiscale', patterns: [
    { regex: /(?:sono|siamo|ho|abbiamo)\s+(?:in|il|nel)\s+(?:regime\s+)?(forfettario|semplificato|ordinario)/i, group: 1, normalize: capitalizeFirst },
    { regex: /(?:il mio|il nostro)\s+regime\s+(?:è|fiscale è)\s+(?:il\s+)?(forfettario|semplificato|ordinario)/i, group: 1, normalize: capitalizeFirst },
  ]},
  // Numero dipendenti
  { field: 'numero_dipendenti', patterns: [
    { regex: /(?:ho|abbiamo|siamo in)\s+(\d+)\s+dipendent[ei]/i, group: 1, normalize: normalizeDipendenti },
    { regex: /(\d+)\s+dipendent[ei]/i, group: 1, normalize: normalizeDipendenti },
    { regex: /(?:sono solo|lavoro da solo|non ho dipendenti|zero dipendenti)/i, group: 0, normalize: () => 'Solo io' },
  ]},
  // Fatturato
  { field: 'fatturato_annuo', patterns: [
    { regex: /fattur(?:o|iamo|ato)\s+(?:circa\s+)?(\d[\d.,]*)\s*(?:k|mila|mille|€|euro|milioni?)/i, group: 0, normalize: normalizeFatturato },
    { regex: /(?:il mio|il nostro)\s+fatturato\s+(?:è|annuo è|annuo)\s+(?:di\s+)?(?:circa\s+)?(\d[\d.,]*)\s*(?:k|mila|mille|€|euro|milioni?)/i, group: 0, normalize: normalizeFatturato },
  ]},
];

// Indicatori che l'utente parla della propria azienda
const SELF_REFERENCE_INDICATORS = [
  'la mia azienda', 'la mia impresa', 'la mia attività', 'la mia ditta',
  'la nostra azienda', 'la nostra impresa', 'la nostra attività',
  'io ho', 'noi abbiamo', 'sono un', 'sono una', 'siamo un', 'siamo una',
  'il mio', 'il nostro', 'nella mia', 'nel mio', 'nella nostra', 'nel nostro',
  'ho un\'azienda', 'ho una ditta', 'ho un negozio', 'ho un ristorante',
  'gestisco', 'abbiamo', 'fatturiamo', 'fatturo',
  'i miei dipendenti', 'i nostri dipendenti',
  'lavoro da solo', 'lavoro in proprio',
  'il mio settore', 'il nostro settore',
  'il mio regime', 'il nostro regime',
];

// Indicatori che l'utente sta parlando di altri / generico
const THIRD_PARTY_INDICATORS = [
  'un\'azienda che', 'un amico', 'un cliente', 'un concorrente',
  'se un\'azienda', 'se uno', 'ipotizziamo', 'supponiamo',
  'in generale', 'genericamente', 'teoricamente',
  'quanto costa a un', 'quanto costa per un',
];

function capitalizeFirst(val) {
  if (!val) return val;
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
}

function normalizeFormaGiuridica(val) {
  if (!val) return val;
  const v = val.toUpperCase().replace(/\./g, '').replace(/\s/g, '');
  if (v === 'SRL' || v === 'SRL') return 'SRL';
  if (v === 'SRLS') return 'SRLS';
  if (v === 'SAS') return 'SAS';
  if (v === 'SNC') return 'SNC';
  if (v === 'SPA') return 'SPA';
  if (val.toLowerCase().includes('ditta individuale')) return 'Ditta individuale';
  if (val.toLowerCase().includes('cooperativa')) return 'Cooperativa';
  return capitalizeFirst(val);
}

function normalizeDipendenti(val) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n === 0) return 'Solo io';
  if (n <= 5) return '1-5';
  if (n <= 15) return '6-15';
  if (n <= 50) return '16-50';
  if (n <= 200) return '51-200';
  return 'Oltre 200';
}

function normalizeFatturato(fullMatch) {
  if (!fullMatch) return null;
  const lower = fullMatch.toLowerCase();
  // Estrai il numero
  const numMatch = lower.match(/(\d[\d.,]*)/);
  if (!numMatch) return null;
  let num = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'));
  
  if (lower.includes('milion') || lower.includes('m€') || (lower.includes('m') && num < 100)) {
    num = num * 1000000;
  } else if (lower.includes('k') || lower.includes('mila') || lower.includes('mille')) {
    num = num * 1000;
  }
  
  if (num < 100000) return 'Sotto 100K';
  if (num <= 500000) return '100K-500K';
  if (num <= 1000000) return '500K-1M';
  if (num <= 5000000) return '1M-5M';
  if (num <= 10000000) return '5M-10M';
  return 'Oltre 10M';
}

/**
 * Analizza il messaggio e, se l'utente sta parlando della propria azienda,
 * estrae i dati mancanti dal profilo e li salva automaticamente.
 * Non mostra popup, non blocca il flusso.
 * 
 * @param {string} message - messaggio utente
 * @param {object} currentUser - dati utente corrente
 * @param {function} setEffectiveUser - setter per aggiornare lo stato locale
 * @returns {object|null} - dati estratti e salvati, o null se niente da salvare
 */
export async function extractProfileDataFromChat(message, currentUser, setEffectiveUser) {
  if (!message || !currentUser) return null;
  
  const msgLower = message.toLowerCase();
  
  // Step 1: verifica che l'utente parli della PROPRIA azienda
  const isSelfReference = SELF_REFERENCE_INDICATORS.some(ind => msgLower.includes(ind));
  const isThirdParty = THIRD_PARTY_INDICATORS.some(ind => msgLower.includes(ind));
  
  // Se parla di terzi oppure non ci sono riferimenti personali → non estrarre
  if (isThirdParty || !isSelfReference) return null;
  
  // Step 2: prova ad estrarre dati
  const extracted = {};
  
  for (const rule of EXTRACTION_RULES) {
    // Salta se l'utente ha già questo campo compilato
    const existingVal = currentUser[rule.field] || currentUser?._originalData?.[rule.field];
    if (existingVal && typeof existingVal === 'string' && existingVal.trim() !== '') continue;
    
    for (const pattern of rule.patterns) {
      const match = message.match(pattern.regex);
      if (match) {
        const rawValue = pattern.group === 0 ? match[0] : match[pattern.group];
        const normalized = pattern.normalize(rawValue);
        if (normalized) {
          extracted[rule.field] = normalized;
          break; // prendi il primo match per questo campo
        }
      }
    }
  }
  
  // Step 3: salva solo se c'è qualcosa di nuovo
  if (Object.keys(extracted).length === 0) return null;
  
  console.log('[Profile Extract] Dati estratti dalla chat:', extracted);
  
  // Salva nel profilo
  await base44.auth.updateMe(extracted);
  
  // Aggiorna stato locale
  if (setEffectiveUser) {
    setEffectiveUser(prev => ({ ...prev, ...extracted }));
  }
  
  return extracted;
}