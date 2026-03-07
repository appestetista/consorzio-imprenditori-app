import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, ArrowRight } from 'lucide-react';

const DEFAULT_TOKEN_LIMIT = 500000; // 500k token/mese default
const USD_TO_EUR = 0.92;

/**
 * Barra futuristica di consumo AI mensile.
 * Mostra token usati / limite personalizzato per utente (gpt-4o-mini).
 */
export default function AIConsumptionBar({ userEmail }) {
  const [totalTokens, setTotalTokens] = useState(0);
  const [tokenLimit, setTokenLimit] = useState(DEFAULT_TOKEN_LIMIT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    
    const fetchData = async () => {
      try {
        // Carica limite personalizzato dall'utente
        const me = await base44.auth.me();
        const limit = me?.monthly_token_limit;
        // 0 = illimitato, null/undefined = default
        if (limit !== null && limit !== undefined) {
          setTokenLimit(limit === 0 ? Infinity : limit);
        }

        // Inizio mese corrente
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const logs = await base44.entities.UsageLog.filter({
          user_email: userEmail,
        }, '-created_date', 500);
        
        const monthLogs = logs.filter(log => {
          const logDate = new Date(log.timestamp || log.created_date);
          return logDate >= monthStart;
        });
        
        const tokens = monthLogs.reduce((sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0), 0);
        setTotalTokens(tokens);
      } catch (e) {
        console.warn('[AIConsumption] Errore fetch:', e?.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // Sottoscrivi aggiornamenti in tempo reale
    const unsub = base44.entities.UsageLog.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === userEmail) {
        setTotalTokens(prev => prev + (event.data.input_tokens || 0) + (event.data.output_tokens || 0));
      }
    });

    return unsub;
  }, [userEmail]);

  const pct = useMemo(() => {
    if (tokenLimit === Infinity) return Math.min((totalTokens / DEFAULT_TOKEN_LIMIT) * 100, 100);
    return Math.min((totalTokens / tokenLimit) * 100, 100);
  }, [totalTokens, tokenLimit]);
  const isNearLimit = pct >= 80;
  const isExhausted = pct >= 100;

  // Formatta i token in modo leggibile (es. 12.4k)
  const formatTokens = (n) => {
    if (n === Infinity) return '∞';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  };
  const tokenDisplay = formatTokens(totalTokens);
  const limitDisplay = formatTokens(tokenLimit);

  const planLabel = tokenLimit === Infinity ? 'Illimitato' : `${limitDisplay} token`;

  return (
    <div className="flex flex-col items-center w-full gap-1">
      {/* Riga piano + CTA sopra la barra */}
      <div className="flex items-center justify-between w-full px-0.5">
        <span className="text-[9px] font-medium text-slate-400">
          Il tuo piano: <span className="font-bold text-white">{planLabel}</span>
        </span>
        <Link 
          to={createPageUrl('Pricing')}
          className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ color: '#d4af37' }}
        >
          Passa a PRO <ArrowRight className="w-2.5 h-2.5" />
        </Link>
      </div>

      {/* Barra + label AI a destra */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 relative">
          <div 
            className="relative h-[8px] rounded-full overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #0a0f1a 0%, #111827 100%)',
              border: '1px solid rgba(57,255,20,0.4)',
              boxShadow: '0 0 6px rgba(57,255,20,0.15), inset 0 1px 3px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.max(pct, 1)}%`,
                background: isExhausted
                  ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                  : isNearLimit
                    ? 'linear-gradient(90deg, #39ff14 0%, #f97316 100%)'
                    : 'linear-gradient(90deg, #1a8a09 0%, #39ff14 50%, #7fff6a 100%)',
                boxShadow: isExhausted
                  ? '0 0 8px rgba(239,68,68,0.6)'
                  : `0 0 8px rgba(57,255,20,${0.3 + pct * 0.005}), 0 0 3px rgba(57,255,20,0.6)`,
              }}
            />
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)',
              }}
            />
          </div>
        </div>

        {/* AI a destra */}
        <span className="text-[11px] font-bold tracking-wider flex-shrink-0" style={{ color: '#39ff14' }}>AI</span>
      </div>

      {/* Label sotto la barra con token */}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-medium tracking-wide uppercase" style={{ color: '#39ff14' }}>AI questo mese</span>
        <span className="text-[9px] font-bold" style={{ color: isExhausted ? 'rgba(239,68,68,0.9)' : 'rgba(57,255,20,0.7)' }}>• {tokenDisplay} / {limitDisplay} tk</span>
      </div>
    </div>
  );
}

export { DEFAULT_TOKEN_LIMIT, USD_TO_EUR };