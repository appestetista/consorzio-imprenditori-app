import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

function formatVal(val, isEur) {
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val;
  if (isNaN(num) || !num) return 'N/D';
  const prefix = isEur ? '€' : '$';
  if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${prefix}${(num / 1e3).toFixed(0)}K`;
  return `${prefix}${num.toFixed(0)}`;
}

export default function ExportTradeChart({ serieStorica, serieStoricaEur, paeseNome, tassoCambio }) {
  if (!serieStorica || serieStorica.length === 0) return null;

  const hasEur = serieStoricaEur && serieStoricaEur.length > 0 && serieStoricaEur.some(s => s.valore_eur > 0);

  const data = serieStorica
    .map((s, i) => ({
      anno: s.anno,
      valore: hasEur && serieStoricaEur[i]?.valore_eur > 0
        ? serieStoricaEur[i].valore_eur
        : parseFloat(String(s.valore_usd).replace(/[^0-9.]/g, '')) || 0,
    }))
    .filter(d => d.valore > 0)
    .sort((a, b) => a.anno - b.anno);

  if (data.length === 0) return null;

  const formatter = (v) => formatVal(v, hasEur);

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
        Import {paeseNome} — Serie storica ({hasEur ? 'EUR' : 'USD'})
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="anno" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 9 }} 
              tickFormatter={formatter}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: '#fff' }}
              formatter={(v) => [formatter(v), 'Import']}
            />
            <Bar dataKey="valore" fill="url(#chartGradient)" radius={[6, 6, 0, 0]} />
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a3e635" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {tassoCambio && hasEur && (
        <p className="text-slate-600 text-[10px] mt-1">
          💱 {tassoCambio.nota}
        </p>
      )}
    </div>
  );
}