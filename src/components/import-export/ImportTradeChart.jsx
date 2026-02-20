import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from 'recharts';

function fmtVal(val, prefix = '€') {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num) || !num) return 'N/D';
  if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${prefix}${(num / 1e3).toFixed(0)}K`;
  return `${prefix}${num.toFixed(0)}`;
}

function fmtQty(val) {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num) || !num) return 'N/D';
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)} mld`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)} mln`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toLocaleString('it-IT');
}

export default function ImportTradeChart({ flussiComtrade, flussiConvertitiEur, tassoCambio, unita }) {
  if (!flussiComtrade?.serie_storica?.length) return null;

  const hasEur = flussiConvertitiEur?.serie_storica_eur?.length > 0;
  
  const data = flussiComtrade.serie_storica.map((s, i) => {
    const eurVal = hasEur && flussiConvertitiEur.serie_storica_eur[i]?.valore_eur > 0 
      ? flussiConvertitiEur.serie_storica_eur[i].valore_eur 
      : null;
    const valoreUsd = parseFloat(String(s.valore_usd).replace(/[^0-9.]/g, '')) || 0;
    const quantita = s.quantita ? parseFloat(String(s.quantita).replace(/[^0-9.]/g, '')) || 0 : 0;
    return {
      anno: s.anno,
      valore: eurVal || valoreUsd,
      quantita,
    };
  }).filter(d => d.valore > 0).sort((a, b) => a.anno - b.anno);

  if (data.length === 0) return null;

  const hasQuantita = data.some(d => d.quantita > 0);
  const currency = hasEur ? '€' : '$';
  const unitLabel = unita || 'kg';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-bold text-sm mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className={`text-xs ${p.dataKey === 'valore' ? 'text-lime-400' : 'text-blue-400'}`}>
            {p.dataKey === 'valore' ? `Valore: ${fmtVal(p.value, currency)}` : `Quantità: ${fmtQty(p.value)} ${unitLabel}`}
          </p>
        ))}
      </div>
    );
  };

  // Calcolo crescita % YoY
  let crescitaYoY = null;
  if (data.length >= 2) {
    const primo = data[0].valore;
    const ultimo = data[data.length - 1].valore;
    if (primo > 0) {
      crescitaYoY = ((ultimo - primo) / primo * 100).toFixed(1);
    }
  }

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold flex items-center gap-2">
            📊 Flussi Import Cina → Italia
          </h3>
          {crescitaYoY && (
            <div className={`px-2 py-1 rounded-full text-xs font-bold ${
              parseFloat(crescitaYoY) > 5 ? 'bg-green-500/15 text-green-400' :
              parseFloat(crescitaYoY) > 0 ? 'bg-lime-500/15 text-lime-400' :
              parseFloat(crescitaYoY) > -5 ? 'bg-yellow-500/15 text-yellow-400' :
              'bg-red-500/15 text-red-400'
            }`}>
              {parseFloat(crescitaYoY) > 0 ? '+' : ''}{crescitaYoY}% periodo
            </div>
          )}
        </div>
        <p className="text-slate-500 text-[10px] mb-2">
          Fonte: {flussiComtrade.fonte || 'UN Comtrade'} — Valori in {hasEur ? 'EUR' : 'USD'}
        </p>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="anno" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#64748b', fontSize: 9 }} 
                tickFormatter={(v) => fmtVal(v, currency)}
                axisLine={false} tickLine={false}
              />
              {hasQuantita && (
                <YAxis 
                  yAxisId="right" orientation="right"
                  tick={{ fill: '#64748b', fontSize: 9 }} 
                  tickFormatter={(v) => fmtQty(v)}
                  axisLine={false} tickLine={false}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              {hasQuantita && <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />}
              <Bar yAxisId="left" dataKey="valore" name={`Valore (${currency})`} fill="url(#importGradient)" radius={[6, 6, 0, 0]} />
              {hasQuantita && (
                <Line yAxisId="right" type="monotone" dataKey="quantita" name={`Quantità (${unitLabel})`} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
              )}
              <defs>
                <linearGradient id="importGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Valori sotto il grafico */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {flussiComtrade.import_italia_da_cina_usd && (
            <div className="bg-slate-700/40 rounded-lg p-2">
              <p className="text-slate-400 text-[10px]">Import ultimo anno</p>
              <p className="text-lime-400 font-bold">
                {flussiConvertitiEur?.import_italia_da_cina_eur 
                  ? `€${flussiConvertitiEur.import_italia_da_cina_eur.toLocaleString('it-IT')}`
                  : flussiComtrade.import_italia_da_cina_usd
                }
              </p>
              <p className="text-slate-600 text-[9px]">{flussiComtrade.anno}</p>
            </div>
          )}
          {flussiComtrade.import_italia_da_cina_quantita && (
            <div className="bg-slate-700/40 rounded-lg p-2">
              <p className="text-slate-400 text-[10px]">Quantità ultimo anno</p>
              <p className="text-blue-400 font-bold">
                {fmtQty(flussiComtrade.import_italia_da_cina_quantita)} {flussiComtrade.import_italia_da_cina_unita || unitLabel}
              </p>
              <p className="text-slate-600 text-[9px]">{flussiComtrade.anno}</p>
            </div>
          )}
        </div>

        {tassoCambio && hasEur && (
          <p className="text-blue-400/60 text-[9px] mt-2">💱 {tassoCambio.nota}</p>
        )}
      </CardContent>
    </Card>
  );
}