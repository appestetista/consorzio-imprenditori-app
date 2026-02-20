import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Trophy, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

function fmtNum(val, prefix = '$') {
  if (!val && val !== 0) return 'N/D';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 'N/D';
  if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${prefix}${(num / 1e3).toFixed(0)}K`;
  return `${prefix}${num.toFixed(0)}`;
}

function fmtQty(val, unit) {
  if (!val) return 'N/D';
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return val;
  const u = unit || 'pz';
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)} mld ${u}`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)} mln ${u}`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K ${u}`;
  return `${num.toLocaleString('it-IT')} ${u}`;
}

const COLORS = [
  '#a3e635', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f59e0b', '#ef4444', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#0ea5e9', '#d946ef', '#10b981'
];

export default function ImportTopImportersChart({ topImportatori, landedCost }) {
  const [viewMode, setViewMode] = useState('bar'); // 'bar' | 'pie' | 'table'

  if (!topImportatori?.classifica?.length) return null;

  const classifica = topImportatori.classifica;
  const unit = topImportatori.unita_misura || 'kg';

  // Chart data
  const chartData = classifica.slice(0, 15).map((c, i) => ({
    name: c.paese?.length > 12 ? c.paese.substring(0, 10) + '…' : c.paese,
    fullName: c.paese,
    valore: parseFloat(String(c.valore_usd || '0').replace(/[^0-9.]/g, '')) || 0,
    quantita: parseFloat(String(c.quantita || '0').replace(/[^0-9.]/g, '')) || 0,
    quota: parseFloat(String(c.quota_percentuale || '0').replace(/[^0-9.]/g, '')) || 0,
    fill: COLORS[i % COLORS.length],
  }));

  // Evidenzia Italia
  const italiaIdx = classifica.findIndex(c => 
    c.codice_iso === 'IT' || c.paese?.toLowerCase().includes('ital')
  );

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-bold text-sm">{d.fullName}</p>
        <p className="text-lime-400 text-xs">Valore: {fmtNum(d.valore)}</p>
        {d.quantita > 0 && <p className="text-blue-400 text-xs">Quantità: {fmtQty(d.quantita, unit)}</p>}
        {d.quota > 0 && <p className="text-slate-400 text-xs">Quota: {d.quota.toFixed(1)}%</p>}
      </div>
    );
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Classifica Top Importatori Mondiali
          </h3>
          <div className="flex gap-1">
            <Button size="sm" variant={viewMode === 'bar' ? 'default' : 'ghost'} className="h-7 px-2" onClick={() => setViewMode('bar')}>
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant={viewMode === 'pie' ? 'default' : 'ghost'} className="h-7 px-2" onClick={() => setViewMode('pie')}>
              <PieChartIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <p className="text-slate-500 text-[10px] mb-3">
          HS {topImportatori.hs_heading} — Anno: {topImportatori.anno_riferimento} — Fonte: {topImportatori.fonte || 'UN Comtrade'}
        </p>

        {viewMode === 'bar' && (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(v) => fmtNum(v)} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 10 }} width={90} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valore" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, i) => {
                    const isItaly = classifica[i]?.codice_iso === 'IT' || classifica[i]?.paese?.toLowerCase().includes('ital');
                    return <Cell key={i} fill={isItaly ? '#f59e0b' : entry.fill} stroke={isItaly ? '#f59e0b' : 'none'} strokeWidth={isItaly ? 2 : 0} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'pie' && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.slice(0, 10)}
                  dataKey="valore"
                  nameKey="fullName"
                  cx="50%" cy="50%"
                  outerRadius={100}
                  label={({ fullName, quota }) => `${fullName?.substring(0, 8)} ${quota.toFixed(1)}%`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {chartData.slice(0, 10).map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabella dettagliata sempre visibile sotto */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-500 font-medium py-2 px-1">#</th>
                <th className="text-left text-slate-500 font-medium py-2 px-1">Paese</th>
                <th className="text-right text-slate-500 font-medium py-2 px-1">Valore (USD)</th>
                <th className="text-right text-slate-500 font-medium py-2 px-1">Quantità</th>
                <th className="text-right text-slate-500 font-medium py-2 px-1">Quota %</th>
              </tr>
            </thead>
            <tbody>
              {classifica.map((c, i) => {
                const isItaly = c.codice_iso === 'IT' || c.paese?.toLowerCase().includes('ital');
                return (
                  <tr key={i} className={`border-b border-slate-700/50 ${isItaly ? 'bg-amber-500/10' : 'hover:bg-slate-700/30'}`}>
                    <td className="py-1.5 px-1">
                      <span className={`text-xs font-bold ${i < 3 ? 'text-yellow-400' : 'text-slate-500'}`}>{c.posizione || i + 1}</span>
                    </td>
                    <td className="py-1.5 px-1">
                      <span className={`font-medium ${isItaly ? 'text-amber-400' : 'text-white'}`}>
                        {isItaly ? '🇮🇹 ' : ''}{c.paese}
                      </span>
                    </td>
                    <td className="py-1.5 px-1 text-right text-lime-400 font-semibold">{fmtNum(c.valore_usd)}</td>
                    <td className="py-1.5 px-1 text-right text-blue-400">{c.quantita ? fmtQty(c.quantita, unit) : 'N/D'}</td>
                    <td className="py-1.5 px-1 text-right text-slate-300">
                      {c.quota_percentuale ? `${c.quota_percentuale}%` : 'N/D'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {italiaIdx >= 0 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-amber-400 text-xs font-bold">
              🇮🇹 Italia è #{classifica[italiaIdx].posizione || italiaIdx + 1} al mondo
              per import di questa categoria
              {classifica[italiaIdx].quota_percentuale && ` (${classifica[italiaIdx].quota_percentuale}% del totale)`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}