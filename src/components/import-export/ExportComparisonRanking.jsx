import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getFlagUrl } from './CountrySearchSelect';

function formatVal(val) {
  if (!val && val !== 0) return 'N/D';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 'N/D';
  if (num >= 1e9) return `€${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `€${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `€${(num / 1e3).toFixed(0)}K`;
  return `€${num.toFixed(0)}`;
}

export default function ExportComparisonRanking({ metriche, macroData, mercatiAnalisi }) {
  if (!metriche || metriche.length < 2) return null;

  // Sort by punteggio_opportunita from AI analysis (descending), fallback to import_totale_eur
  const sorted = [...metriche]
    .filter(m => m.import_totale_eur > 0)
    .sort((a, b) => {
      const scoreA = mercatiAnalisi?.find(ma => ma.paese_code === a.paese_code)?.punteggio_opportunita || 0;
      const scoreB = mercatiAnalisi?.find(ma => ma.paese_code === b.paese_code)?.punteggio_opportunita || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.import_totale_eur || 0) - (a.import_totale_eur || 0);
    });

  if (sorted.length < 2) return null;

  const medalColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];

  return (
    <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
      <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        Classifica Mercati
      </p>
      <div className="space-y-2">
        {sorted.map((m, i) => {
          const flagUrl = getFlagUrl(m.paese_code);
          const score = mercatiAnalisi?.find(ma => ma.paese_code === m.paese_code)?.punteggio_opportunita;
          const crescita = m.crescita_3_anni ? parseFloat(m.crescita_3_anni) : null;
          const isPos = crescita !== null && crescita > 5;
          const isNeg = crescita !== null && crescita < -2;

          return (
            <div key={m.paese_code} className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
              i === 0 ? 'bg-yellow-500/10 border border-yellow-500/15' : 'bg-white/[0.03] hover:bg-white/[0.05]'
            }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                i === 0 ? 'bg-yellow-500/20' : i === 1 ? 'bg-slate-400/10' : i === 2 ? 'bg-amber-700/20' : 'bg-white/5'
              }`}>
                <span className={`text-sm font-black ${medalColors[i] || 'text-slate-400'}`}>{i + 1}</span>
              </div>
              {m.paese_code !== 'WLD' ? (
                <img src={flagUrl} alt="" className="w-7 h-5 object-cover rounded-sm shadow flex-shrink-0" />
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{m.paese_nome}</p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px]">Import: {formatVal(m.import_totale_eur)}</span>
                  {crescita !== null && (
                    <span className={`text-[10px] font-bold ${isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-yellow-400'}`}>
                      {crescita > 0 ? '+' : ''}{m.crescita_3_anni}% 3Y
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {score != null ? (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                    score >= 7 ? 'bg-green-500/20 text-green-400' :
                    score >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {score}
                  </div>
                ) : (
                  <span className="text-slate-500 text-xs">N/D</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}