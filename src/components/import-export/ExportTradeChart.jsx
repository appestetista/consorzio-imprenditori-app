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
    <Card className="bg-slate-700/50 border-slate-600">
      <CardContent className="p-3">
        <p className="text-slate-400 text-xs mb-2">
          📈 Import {paeseNome} — Serie storica HS ({hasEur ? 'EUR' : 'USD'})
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="anno" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 9 }} 
                tickFormatter={formatter}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
                formatter={(v) => [formatter(v), 'Import']}
              />
              <Bar dataKey="valore" fill="#a3e635" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {tassoCambio && hasEur && (
          <p className="text-blue-400/70 text-[10px] mt-1">
            💱 {tassoCambio.nota}
          </p>
        )}
      </CardContent>
    </Card>
  );
}