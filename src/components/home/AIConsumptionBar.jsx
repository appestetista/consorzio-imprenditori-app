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
        // Inizio mese corrente
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Recupera tutti i log dell'utente e filtra per mese lato client
        const logs = await base44.entities.UsageLog.filter({
          user_email: userEmail,
        }, '-created_date', 500);
        
        const monthLogs = logs.filter(log => {
          const logDate = new Date(log.timestamp || log.created_date);
          return logDate >= monthStart;
        });
        
        const totalUsd = monthLogs.reduce((sum, log) => sum + (log.cost_usd || 0), 0);
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
    <div className="flex flex-col items-center w-full gap-1">
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

      {/* Label sotto la barra */}
      <span className="text-[9px] font-medium tracking-wide text-slate-500 uppercase">AI consumata questo mese</span>
    </div>
  );
}

export { MONTHLY_BUDGET_EUR, USD_TO_EUR };