import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Receipt, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];

export default function DashboardEconomica({ fatture }) {
  const stats = useMemo(() => {
    const attive = fatture.filter(f => f.direction === 'outgoing');
    const passive = fatture.filter(f => f.direction === 'incoming');

    const fatturatoAttivo = attive.reduce((s, f) => s + (f.imponibile || 0), 0);
    const ivaAttiva = attive.reduce((s, f) => s + (f.iva || 0), 0);
    const costiPassivi = passive.reduce((s, f) => s + (f.imponibile || 0), 0);
    const ivaPassiva = passive.reduce((s, f) => s + (f.iva || 0), 0);

    const utileOperativo = fatturatoAttivo - costiPassivi;
    const posizioneIva = ivaAttiva - ivaPassiva;

    // Raggruppamento mensile
    const monthlyData = {};
    fatture.forEach(f => {
      if (!f.data_emissione) return;
      const month = f.data_emissione.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = { month, ricavi: 0, costi: 0 };
      if (f.direction === 'outgoing') monthlyData[month].ricavi += (f.imponibile || 0);
      else monthlyData[month].costi += (f.imponibile || 0);
    });
    const monthlyArray = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    return {
      fatturatoAttivo, ivaAttiva,
      costiPassivi, ivaPassiva,
      utileOperativo, posizioneIva,
      numAttive: attive.length, numPassive: passive.length,
      monthlyArray
    };
  }, [fatture]);

  const fmt = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
  const fmtMonth = (m) => {
    const [y, mo] = m.split('-');
    const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    return `${months[parseInt(mo) - 1]} ${y.slice(2)}`;
  };

  const pieData = [
    { name: 'Ricavi', value: stats.fatturatoAttivo },
    { name: 'Costi', value: stats.costiPassivi }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={TrendingUp} iconColor="text-green-400" label="Fatturato Attivo" value={fmt(stats.fatturatoAttivo)} sub={`${stats.numAttive} fatture`} />
        <KPICard icon={TrendingDown} iconColor="text-red-400" label="Costi Passivi" value={fmt(stats.costiPassivi)} sub={`${stats.numPassive} fatture`} />
        <KPICard icon={Wallet} iconColor="text-blue-400" label="Utile Operativo" value={fmt(stats.utileOperativo)} sub={stats.utileOperativo >= 0 ? 'Positivo' : 'Negativo'} highlight={stats.utileOperativo >= 0 ? 'green' : 'red'} />
        <KPICard icon={Receipt} iconColor="text-amber-400" label="Posizione IVA" value={fmt(stats.posizioneIva)} sub={stats.posizioneIva >= 0 ? 'IVA a debito' : 'IVA a credito'} highlight={stats.posizioneIva >= 0 ? 'red' : 'green'} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Ricavi vs Costi</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.fatturatoAttivo > 0 || stats.costiPassivi > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">Nessun dato</div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart mensile */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Andamento Mensile</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlyArray.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.monthlyArray}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} labelFormatter={fmtMonth} />
                  <Bar dataKey="ricavi" name="Ricavi" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="costi" name="Costi" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">Nessun dato</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, iconColor, label, value, sub, highlight }) {
  const borderClass = highlight === 'green' ? 'border-green-500/30' : highlight === 'red' ? 'border-red-500/30' : 'border-slate-700';
  return (
    <Card className={`bg-slate-800/50 ${borderClass}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-slate-400 text-xs">{label}</span>
        </div>
        <p className="text-white font-bold text-lg">{value}</p>
        <p className="text-slate-500 text-xs mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}