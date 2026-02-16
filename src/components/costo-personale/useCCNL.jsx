import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook che carica i livelli CCNL dal database per un dato CCNL e anno.
 */
export function useCCNL(ccnl, anno = 2026) {
  const { data: livelli, isLoading } = useQuery({
    queryKey: ['ccnl-livelli', ccnl, anno],
    queryFn: () => base44.entities.TabellaCCNL.filter({ ccnl, anno }),
    enabled: !!ccnl,
    initialData: [],
  });

  return { livelli, isLoading };
}

export const CCNL_OPTIONS = [
  { key: 'Commercio', label: 'Commercio (Confcommercio)' },
  { key: 'Industria', label: 'Industria Alimentare' },
  { key: 'Metalmeccanico', label: 'Metalmeccanico (Federmeccanica)' },
  { key: 'Edilizia', label: 'Edilizia Industria (ANCE)' },
  { key: 'Turismo', label: 'Turismo (Federalberghi)' },
  { key: 'Artigianato', label: 'Artigianato (Area Meccanica)' },
  { key: 'Altri CCNL', label: 'Altri CCNL registrati CNEL' },
];

export const REGIONI = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia',
  'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
];

/**
 * Mappa qualifica INAIL in base alla combinazione CCNL + livello.
 * Restituisce il tipo INAIL corretto per il lookup nelle tabelle contributive.
 */
export function getQualificaINAIL(ccnl, livello) {
  if (!ccnl || !livello) return 'impiegato';
  const lUp = livello.toUpperCase();

  if (lUp === 'QUADRO' || lUp === 'DIRIGENTE') return lUp.toLowerCase();

  // Edilizia = operai per livelli bassi
  if (ccnl === 'Edilizia') {
    if (['1', 'A1'].includes(livello)) return 'quadro';
    return 'operaio_qualificato';
  }

  // Metalmeccanico
  if (ccnl === 'Metalmeccanico') {
    if (['D1', 'D2'].includes(livello)) return 'quadro';
    return 'impiegato';
  }

  // Default: impiegato (Commercio, Turismo, Industria, Artigianato livelli alti)
  return 'impiegato';
}