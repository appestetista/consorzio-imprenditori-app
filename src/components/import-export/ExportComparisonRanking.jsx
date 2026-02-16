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

export default function ExportComparisonRanking({ metriche, macroData }) {
  if (!metriche || metriche.length < 2) return null;

  // Sort by import_totale_eur descending
  const sorted = [...metriche]
    .filter(m => m.import_totale_eur > 0)
    .sort((a, b) => (b.import_totale_eur || 0) - (a.import_totale_eur || 0));

  if (sorted.length < 2) return null;

  const medalColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-4">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Classifica Comparativa Mercati
        </h3>
        <div className="space-y-2">
          {sorted.map((m, i) => {
            const macro = macroData?.[m.paese_code];
            const flagUrl = getFlagUrl(m.paese_code);
            const crescita = m.crescita_3_anni ? parseFloat(m.crescita_3_anni) : null;
            const isPos = crescita !== null && crescita > 5;
            const isNeg = crescita !== null && crescita < -2;

            return (
              <div key={m.paese_code} className={`flex items-center gap-3 bg-slate-700/50 rounded-lg p-2.5 ${i === 0 ? 'border border-yellow-500/30' : ''}`}>
                <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <span className={`text-sm font-black ${medalColors[i] || 'text-slate-400'}`}>{i + 1}</span>
                </div>
                {m.paese_code !== 'WLD' ? (
                  <img src={flagUrl} alt="" className="w-7 h-5 object-cover rounded-sm shadow flex-shrink-0" />
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{m.paese_nome}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">Import: {formatVal(m.import_totale_eur)}</span>
                    {macro?.pil_nominale && (
                      <span className="text-slate-500 text-[10px]">PIL: {formatVal(macro.pil_nominale)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {crescita !== null ? (
                    <div className="flex items-center gap-1">
                      {isPos ? <TrendingUp className="w-3 h-3 text-green-400" /> :
                       isNeg ? <TrendingDown className="w-3 h-3 text-red-400" /> :
                       <Minus className="w-3 h-3 text-yellow-400" />}
                      <span className={`text-xs font-bold ${isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-yellow-400'}`}>
                        {crescita > 0 ? '+' : ''}{m.crescita_3_anni}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">N/D</span>
                  )}
                  <p className="text-slate-500 text-[10px]">3Y</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}