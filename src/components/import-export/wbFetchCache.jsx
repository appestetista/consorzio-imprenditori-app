/**
 * Cache + concurrency limiter + retry con backoff per chiamate World Bank API.
 * 
 * - Cache in-memory con fallback sessionStorage, TTL 24h
 * - Max 3 fetch parallele, le altre in coda
 * - Retry con backoff esponenziale (1s, 2s, 4s) su errori di rete/server
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 ore
const MAX_CONCURRENT = 3;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// --- Cache in-memory ---
const memoryCache = new Map();

function getCacheKey(url) {
  return 'wb_' + url;
}

function getFromCache(url) {
  const key = getCacheKey(url);

  // 1. Memory cache (più veloce)
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.ts < CACHE_TTL_MS) {
    return mem.data;
  }

  // 2. SessionStorage fallback
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts < CACHE_TTL_MS) {
        // Ripristina anche in memory
        memoryCache.set(key, parsed);
        return parsed.data;
      }
      sessionStorage.removeItem(key);
    }
  } catch {
    // sessionStorage non disponibile o corrotto — ignora
  }

  return null;
}

function setInCache(url, data) {
  const key = getCacheKey(url);
  const entry = { data, ts: Date.now() };

  memoryCache.set(key, entry);

  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage pieno o non disponibile — ok, abbiamo memory cache
  }
}

// --- Concurrency limiter ---
let activeCount = 0;
const queue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    processQueue();
  });
}

function processQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const { fn, resolve, reject } = queue.shift();
    activeCount++;
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeCount--;
        processQueue();
      });
  }
}

// --- Retry con backoff esponenziale ---
async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp;

      // 429 o 5xx → retry
      if (resp.status === 429 || resp.status >= 500) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      // 4xx (non 429) → non riprova
      return resp;
    } catch (err) {
      // Errore di rete → retry
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// --- API pubblica ---

/**
 * Fetch con cache, concurrency limit e retry.
 * Restituisce la Response JSON parsata, o null su errore.
 */
export function fetchWBCached(url) {
  // Check cache prima di entrare in coda
  const cached = getFromCache(url);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return enqueue(async () => {
    // Ricontrolla cache (un'altra richiesta in coda potrebbe averla popolata)
    const cached2 = getFromCache(url);
    if (cached2 !== null) return cached2;

    try {
      const resp = await fetchWithRetry(url);
      if (!resp.ok) return null;
      const json = await resp.json();
      setInCache(url, json);
      return json;
    } catch (err) {
      console.error(`[wbFetchCache] Fetch failed after retries: ${url}`, err);
      return null;
    }
  });
}