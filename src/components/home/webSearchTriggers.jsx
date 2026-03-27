/**
 * Lista di trigger che attivano la ricerca web parallela.
 * Se il messaggio dell'utente contiene uno di questi trigger (case-insensitive),
 * viene lanciata una ricerca web in parallelo alla risposta LLM standard.
 */

const WEB_SEARCH_TRIGGERS = [
  "cerca sul web",
  "cerca online",
  "cerca su internet",
  "verifica sul web",
  "controlla online",
  "trova informazioni online",
  "consulta fonti online",
  "recupera dati dal web",
  "dammi le fonti",
  "includi le fonti",
  "mostra i link",
  "inserisci link alle fonti",
  "fonti ufficiali",
  "fonti affidabili",
  "documenti ufficiali",
  "dati aggiornati",
  "dati recenti",
  "ultimi dati disponibili",
  "ultime informazioni disponibili",
  "ultime statistiche disponibili",
  "studi scientifici pubblicati",
  "ricerche accademiche pubblicate",
  "pubblicazioni scientifiche",
  "articoli scientifici",
  "rapporti governativi",
  "report industriali",
  "analisi di mercato aggiornata",
  "dati economici recenti",
  "dimensione del mercato",
  "crescita del settore",
  "casi studio documentati",
  "esempi applicativi reali",
  "benchmark di settore",
  "confronto tra tecnologie",
  "vantaggi e svantaggi",
  "migliori pratiche operative",
  "guida pratica ufficiale",
  "documentazione tecnica ufficiale",
  "white paper tecnico",
  "specifiche tecniche ufficiali",
  "normativa vigente",
  "aggiornamenti legislativi",
  "regolamenti recenti",
  "tendenze del settore",
  "trend tecnologici",
  "stato dell'arte scientifico",
  "dati verificabili pubblicamente",
  "fonti con riferimenti",
  "studi comparativi",
  "sintesi basata su fonti esterne",
  "ultime notizie",
  "news di oggi",
  "cosa è successo oggi",
  "aggiornamento di oggi",
];

/**
 * Controlla se il messaggio contiene un trigger per la ricerca web.
 * @param {string} message - Il messaggio dell'utente
 * @returns {boolean} true se contiene almeno un trigger
 */
export function detectWebTrigger(message) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return WEB_SEARCH_TRIGGERS.some(trigger => lower.includes(trigger));
}

export default WEB_SEARCH_TRIGGERS;