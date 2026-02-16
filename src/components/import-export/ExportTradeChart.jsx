import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

function formatUsd(val) {
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val;
  if (isNaN(num) || !num) return 'N/D';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

export default function ExportTradeChart({ serieStorica, paeseNome }) {
  if (!serieStorica || serieStorica.length === 0) return null;

  const data = serieStorica
    .map(s => ({
      anno: s.anno,
      valore: parseFloat(String(s.valore_usd).replace(/[^0-9.]/g, '')) || 0,
    }))
    .filter(d => d.valore > 0)
    .sort((a, b) => a.anno - b.anno);

  if (data.length === 0) return null;

  return (
    <Card className="bg-slate-700/50 border-slate-600">
      <CardContent className="p-3">
        <p className="text-slate-400 text-xs mb-2">📈 Import {paeseNome} — Serie storica HS (USD)</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="anno" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 9 }} 
                tickFormatter={formatUsd}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
                formatter={(v) => [formatUsd(v), 'Import']}
              />
              <Bar dataKey="valore" fill="#a3e635" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}