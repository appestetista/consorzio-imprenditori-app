import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calculator, RefreshCw, Coins, MessageSquare, ArrowRightLeft, AlertCircle } from 'lucide-react';

const INPUT_TOKEN_PRICE = 0.00000015;  // $0.15 per 1M token
const OUTPUT_TOKEN_PRICE = 0.00000060; // $0.60 per 1M token
const AVG_TOKENS_PER_CONVERSATION = 300;
const MAX_EURO = 10000;
const EXCHANGE_RATE_CACHE_KEY = 'eur_usd_rate_cache';
const EXCHANGE_RATE_CACHE_TS_KEY = 'eur_usd_rate_ts';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minuti
const FALLBACK_RATE = 1.08;

function formatNumber(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace('.0', '') + ' mld';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return n.toLocaleString('it-IT');
  return n.toString();
}

export default function EuroTokenConverter() {
  const [euro, setEuro] = useState(10);
  const [exchangeRate, setExchangeRate] = useState(() => {
    const cached = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
    return cached ? parseFloat(cached) : FALLBACK_RATE;
  });
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(() => {
    const ts = localStorage.getItem(EXCHANGE_RATE_CACHE_TS_KEY);
    return ts ? new Date(parseInt(ts)) : null;
  });

  const fetchExchangeRate = useCallback(async () => {
    setRateLoading(true);
    setRateError(false);
    try {
      const res = await fetch('https://api.exchangerate.host/latest?base=EUR&symbols=USD');
      if (!res.ok) throw new Error('API non raggiungibile');
      const data = await res.json();
      const rate = data?.rates?.USD;
      if (!rate || typeof rate !== 'number') throw new Error('Tasso non valido');
      
      setExchangeRate(rate);
      localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, rate.toString());
      localStorage.setItem(EXCHANGE_RATE_CACHE_TS_KEY, Date.now().toString());
      setLastUpdate(new Date());
    } catch (e) {
      console.warn('[EuroTokenConverter] Errore fetch tasso:', e.message);
      setRateError(true);
      // Usa ultimo valore salvato (già in state)
    } finally {
      setRateLoading(false);
    }
  }, []);

  // Fetch iniziale + refresh ogni 60 min
  useEffect(() => {
    const cachedTs = localStorage.getItem(EXCHANGE_RATE_CACHE_TS_KEY);
    const isStale = !cachedTs || (Date.now() - parseInt(cachedTs)) > CACHE_DURATION_MS;
    if (isStale) fetchExchangeRate();

    const interval = setInterval(fetchExchangeRate, CACHE_DURATION_MS);
    return () => clearInterval(interval);
  }, [fetchExchangeRate]);

  const result = useMemo(() => {
    if (!euro || euro <= 0) return null;
    const clampedEuro = Math.min(euro, MAX_EURO);
    const usd = clampedEuro * exchangeRate;
    const input_tokens = Math.floor(usd / INPUT_TOKEN_PRICE);
    const output_tokens = Math.floor(usd / OUTPUT_TOKEN_PRICE);
    const conversations = Math.floor(output_tokens / AVG_TOKENS_PER_CONVERSATION);
    return { euro: clampedEuro, usd, input_tokens, output_tokens, conversations };
  }, [euro, exchangeRate]);

  // Valori precompilati per efficienza
  const tokenPerEuroInput = useMemo(() => Math.floor(exchangeRate / INPUT_TOKEN_PRICE), [exchangeRate]);
  const tokenPerEuroOutput = useMemo(() => Math.floor(exchangeRate / OUTPUT_TOKEN_PRICE), [exchangeRate]);

  return (
    <div className="rounded-2xl border border-slate-700/50 overflow-hidden" style={{ backgroundColor: '#0d1320' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Convertitore Euro → Token AI</h3>
          <p className="text-[11px] text-slate-500">Modello GPT-4o mini · Tempo reale</p>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Input Euro */}
        <div>
          <label className="text-[11px] text-slate-500 uppercase tracking-wider mb-1.5 block">Inserisci importo (€)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">€</span>
            <input
              type="number"
              min="0"
              max={MAX_EURO}
              step="1"
              value={euro}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (isNaN(v)) { setEuro(''); return; }
                setEuro(Math.min(v, MAX_EURO));
              }}
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-white text-lg font-bold focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="10"
            />
          </div>
          {euro > MAX_EURO && (
            <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Massimo {MAX_EURO.toLocaleString('it-IT')}€
            </p>
          )}
        </div>

        {/* Tasso di cambio */}
        <div className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] text-slate-400">
              1 EUR = <span className="text-white font-semibold">{exchangeRate.toFixed(4)} USD</span>
            </span>
          </div>
          <button 
            onClick={fetchExchangeRate} 
            disabled={rateLoading}
            className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
            title="Aggiorna tasso"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rateLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {rateError && (
          <p className="text-[10px] text-amber-400 -mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Tasso non aggiornato — uso ultimo valore salvato
          </p>
        )}

        {/* Risultati */}
        {result && euro > 0 ? (
          <div className="space-y-3">
            {/* USD */}
            <div className="bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Equivalente USD</p>
              <p className="text-white font-bold text-lg">${result.usd.toFixed(2)}</p>
            </div>

            {/* Token grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-xl px-3.5 py-3 border border-cyan-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] text-cyan-300/70 uppercase tracking-wider font-medium">Token Input</span>
                </div>
                <p className="text-white font-bold text-lg leading-tight">{formatNumber(result.input_tokens)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{formatNumber(tokenPerEuroInput)} tk/€</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl px-3.5 py-3 border border-purple-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-purple-300/70 uppercase tracking-wider font-medium">Token Output</span>
                </div>
                <p className="text-white font-bold text-lg leading-tight">{formatNumber(result.output_tokens)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{formatNumber(tokenPerEuroOutput)} tk/€</p>
              </div>
            </div>

            {/* Conversazioni stimate — evidenziato */}
            <div className="bg-gradient-to-r from-[#d4af37]/10 to-[#b8860b]/5 rounded-xl px-4 py-4 border border-[#d4af37]/25">
              <div className="flex items-center gap-2 mb-1.5">
                <MessageSquare className="w-4 h-4 text-[#d4af37]" />
                <span className="text-[11px] text-[#d4af37]/80 uppercase tracking-wider font-semibold">Risposte AI stimate</span>
              </div>
              <p className="text-white font-extrabold text-2xl">≈ {formatNumber(result.conversations)}</p>
              <p className="text-[10px] text-slate-500 mt-1">Basato su ~{AVG_TOKENS_PER_CONVERSATION} token/risposta media</p>
            </div>

            {/* Riepilogo testuale */}
            <div className="bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-800/60">
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="text-white font-bold">{result.euro}€</span> corrispondono a circa{' '}
                <span className="text-cyan-400 font-bold">{formatNumber(result.input_tokens)}</span> token input,{' '}
                <span className="text-purple-400 font-bold">{formatNumber(result.output_tokens)}</span> token output,{' '}
                ovvero <span className="text-[#d4af37] font-bold">≈ {formatNumber(result.conversations)} risposte AI</span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500">Inserisci un importo per vedere la conversione</p>
          </div>
        )}

        {/* Footer info */}
        <div className="text-[10px] text-slate-600 space-y-0.5 pt-1">
          <p>Prezzi GPT-4o mini: input $0.15/1M tk · output $0.60/1M tk</p>
          {lastUpdate && (
            <p>Tasso aggiornato: {lastUpdate.toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
          )}
        </div>
      </div>
    </div>
  );
}