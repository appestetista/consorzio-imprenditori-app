import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook che carica la lista di tutti i CCNL distinti dal database.
 * Restituisce un array di oggetti { ccnl_nome, codice_cnel, settore, categoria, data_tabella, sheet_name }
 */
export function useCCNLList() {
  const { data: allRecords, isLoading } = useQuery({
    queryKey: ['ccnl-all-list'],
    queryFn: () => base44.entities.TabellaCCNL.filter({ tipo_tabella: 'qualificati' }, '-ccnl_nome', 5000),
    initialData: [],
    staleTime: 1000 * 60 * 30, // cache 30 min
  });

  // Deduplicate by ccnl_nome to get unique CCNLs
  const ccnlMap = {};
  (allRecords || []).forEach(r => {
    if (!ccnlMap[r.ccnl_nome]) {
      ccnlMap[r.ccnl_nome] = {
        ccnl_nome: r.ccnl_nome,
        codice_cnel: r.codice_cnel || '',
        settore: r.settore || '',
        categoria: r.categoria || '',
        data_tabella: r.data_tabella || '',
        sheet_name: r.sheet_name || '',
      };
    }
  });

  return {
    ccnlList: Object.values(ccnlMap).sort((a, b) => (a.categoria || a.ccnl_nome).localeCompare(b.categoria || b.ccnl_nome)),
    isLoading,
  };
}

/**
 * Hook che carica i livelli qualificati e apprendisti per un dato CCNL.
 */
export function useCCNLLivelli(ccnlNome) {
  const { data: qualificati, isLoading: loadingQ } = useQuery({
    queryKey: ['ccnl-livelli-q', ccnlNome],
    queryFn: () => base44.entities.TabellaCCNL.filter({ ccnl_nome: ccnlNome, tipo_tabella: 'qualificati' }),
    enabled: !!ccnlNome,
    initialData: [],
    staleTime: 1000 * 60 * 30,
  });

  const { data: apprendisti, isLoading: loadingA } = useQuery({
    queryKey: ['ccnl-livelli-a', ccnlNome],
    queryFn: () => base44.entities.TabellaCCNL.filter({ ccnl_nome: ccnlNome, tipo_tabella: 'apprendisti' }),
    enabled: !!ccnlNome,
    initialData: [],
    staleTime: 1000 * 60 * 30,
  });

  return {
    qualificati: qualificati || [],
    apprendisti: apprendisti || [],
    isLoading: loadingQ || loadingA,
  };
}

/**
 * CCNL che prevedono la 14ª mensilità (tredicesima + quattordicesima).
 * Fonte: tabelle ufficiali CCNL aggiornate.
 * I CCNL non presenti in questa lista hanno solo la 13ª (default).
 * 
 * Le keyword sono in minuscolo e matchate con includes() sul ccnl_nome.
 */
const CCNL_CON_QUATTORDICESIMA = [
  'agenzie immobiliari',
  'agenzie marittime',
  'agenzie aeree',
  'agricoltura',         // Cooperative e Contoterzisti
  'contoterzisti',
  'alimentari',          // Piccola/Media Industria e Panificazione Artigianato
  'panificazione',
  'assicurazioni agenzie',
  'unapass',
  'sna',
  'autoferrotranvieri',
  'autotrasporto',       // Dirigenti Aziende Autotrasporto
  'dirigenti aziende cooperative',
  'dirigenti terziario',
  'dirigenti aziende terziario',
  'farmacie',            // Private e Municipalizzate
  'gas acqua',
  'ortofrutticoli',
  'agrumari',
  'pompe funebri',
  'trasporti funebri',
  'porti',
  'recapito telegrammi',
  'sacristi',
  'studi professionali',
  'tabacco',
  'terziario',           // Confcommercio, Confesercenti, Federdistribuzione
  'confcommercio',
  'confesercenti',
  'federdistribuzione',
  'turismo',
  'pubblici esercizi',
  'pulizie',
  'multiservizi',
  'trasporto merci',
  'logistica',
  'vigilanza privata',
  'ceramica',
  'edilizia artigianato',
  'cooperative sociali',
];

/**
 * Determina il numero di mensilità per un dato CCNL.
 * Se il nome del CCNL corrisponde a uno dei contratti con 14ª → 14.
 * Altrimenti → 13 (tredicesima standard).
 */
function getMensilitaCCNL(ccnlNome) {
  if (!ccnlNome) return 13;
  const nome = ccnlNome.toLowerCase();
  const ha14 = CCNL_CON_QUATTORDICESIMA.some(kw => nome.includes(kw));
  return ha14 ? 14 : 13;
}

// Legacy hook for backward compat
export function useCCNL(ccnl, anno = 2026) {
  const { qualificati, isLoading } = useCCNLLivelli(ccnl);
  
  const mensilita = getMensilitaCCNL(ccnl);

  // Map to old format
  const livelli = (qualificati || []).map(l => ({
    livello: l.livello,
    minimo_tabellare_mensile: l.paga_base || 0,
    contingenza: l.contingenza || 0,
    edr: 0,
    terzo_elemento: l.terzo_elemento || 0,
    totale: l.totale || 0,
    mensilita,
    ral_minima_annua: (l.totale || 0) * mensilita,
    apprendistato_previsto: true,
    fonte_normativa: `${l.ccnl_nome} - ${l.codice_cnel || 'N/A'}`,
    data_decorrenza: l.data_tabella || '',
    importo_scatto: l.importo_scatto || 0,
    divisore_orario: l.divisore_orario || 0,
  }));

  return { livelli, isLoading };
}

export const REGIONI = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
  'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia',
  'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
];

/**
 * Mappa qualifica INAIL in base al settore e livello.
 */
export function getQualificaINAIL(ccnlNome, livello) {
  if (!ccnlNome || !livello) return 'impiegato';
  const lUp = livello.toUpperCase();

  if (lUp === 'QUADRO' || lUp === 'DIRIGENTE') return lUp.toLowerCase();

  const nome = ccnlNome.toUpperCase();

  // Edilizia
  if (nome.includes('EDILIZIA')) {
    return 'operaio_qualificato';
  }

  // Metalmeccanica operai bassi
  if (nome.includes('METALMECCANICA')) {
    if (['D1', 'D2'].includes(livello)) return 'quadro';
    return 'impiegato';
  }

  return 'impiegato';
}