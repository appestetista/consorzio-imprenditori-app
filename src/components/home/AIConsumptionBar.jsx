import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles } from 'lucide-react';

const MONTHLY_BUDGET_EUR = 10;
const USD_TO_EUR = 0.92; // Approssimazione stabile

/**
 * Barra futuristica di consumo AI mensile.
 * Calcola il consumo reale da UsageLog (cost_usd) per l'utente corrente nel mese in corso.
 */
export default function AIConsumptionBar({ userEmail }) {
  const [costEur, setCostEur] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    
    const fetchCost = async () => {
      try {
        // Inizio mese corrente (UTC)
        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
        
        const logs = await base44.entities.UsageLog.filter({
          user_email: userEmail,
          action_type: 'chat_ai',
          timestamp: { $gte: monthStart },
        });
        
        const totalUsd = logs.reduce((sum, log) => sum + (log.cost_usd || 0), 0);
        setCostEur(totalUsd * USD_TO_EUR);
      } catch (e) {
        console.warn('[AIConsumption] Errore fetch:', e?.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCost();

    // Sottoscrivi aggiornamenti in tempo reale
    const unsub = base44.entities.UsageLog.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === userEmail) {
        setCostEur(prev => prev + (event.data.cost_usd || 0) * USD_TO_EUR);
      }
    });

    return unsub;
  }, [userEmail]);

  const pct = useMemo(() => Math.min((costEur / MONTHLY_BUDGET_EUR) * 100, 100), [costEur]);
  const isNearLimit = pct >= 80;
  const isExhausted = pct >= 100;

  // Formatta il costo con 4 decimali
  const costDisplay = costEur < 0.01 ? costEur.toFixed(4) : costEur.toFixed(2);

  return (
    <div className="flex items-center gap-2.5 w-full max-w-[220px]">
      {/* Label AI */}
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="text-[10px] font-bold tracking-wider" style={{ color: '#d4af37' }}>AI</span>
        <span className="text-[7px] text-slate-500 leading-none whitespace-nowrap">consumo mese</span>
      </div>

      {/* Barra futuristica */}
      <div className="flex-1 relative">
        {/* Track esterno con bordo sottile */}
        <div 
          className="relative h-[10px] rounded-full overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0a0f1a 0%, #111827 100%)',
            border: '1px solid rgba(212,175,55,0.15)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
          }}
        >
          {/* Barra interna con glow oro */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.max(pct, 1)}%`,
              background: isExhausted
                ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                : isNearLimit
                  ? 'linear-gradient(90deg, #d4af37 0%, #f97316 100%)'
                  : 'linear-gradient(90deg, #b8860b 0%, #d4af37 50%, #f0e68c 100%)',
              boxShadow: isExhausted
                ? '0 0 8px rgba(239,68,68,0.6), 0 0 2px rgba(239,68,68,0.8)'
                : `0 0 8px rgba(212,175,55,${0.3 + pct * 0.005}), 0 0 2px rgba(212,175,55,0.8)`,
            }}
          />

          {/* Scanline effect */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)',
            }}
          />
        </div>

        {/* Costo sotto */}
        <div className="flex justify-between mt-0.5">
          <span className="text-[7px] text-slate-600">€{costDisplay}</span>
          <span className="text-[7px] text-slate-600">€{MONTHLY_BUDGET_EUR}</span>
        </div>
      </div>
    </div>
  );
}

export { MONTHLY_BUDGET_EUR, USD_TO_EUR };