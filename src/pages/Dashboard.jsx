import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BarChart3, Star, TrendingUp, Calendar, Tag, ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_COLORS = {
  'Fiscale': '#d4af37',
  'Legale': '#60a5fa',
  'Marketing': '#f472b6',
  'Personale/HR': '#a78bfa',
  'Investimenti': '#34d399',
  'Operativa': '#fb923c',
  'Strategica': '#38bdf8',
  'Confronto': '#c084fc',
};

function StatCard({ icon: Icon, label, value, sub, iconColor }) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ backgroundColor: 'var(--app-bg-card)', borderColor: 'var(--app-border)' }}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor || 'text-[#d4af37]'}`} />
        <span className="text-[10px] text-app-muted uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-app-primary">{value}</p>
      {sub && <p className="text-[10px] text-app-muted">{sub}</p>}
    </div>
  );
}

function StarsDisplay({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-xl font-bold text-app-primary mr-1">{rating > 0 ? rating.toFixed(1) : '—'}</span>
      {[1, 2, 3, 4, 5].map(v => (
        <Star key={v} className="w-3.5 h-3.5" fill={rating >= v ? '#d4af37' : 'transparent'} stroke={rating >= v ? '#d4af37' : '#475569'} strokeWidth={1.5} />
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 shadow-lg border" style={{ backgroundColor: 'var(--app-bg-card)', borderColor: 'var(--app-border)' }}>
      <p className="text-xs text-app-primary font-medium">{payload[0].payload.name}</p>
      <p className="text-xs text-[#d4af37]">{payload[0].value} analisi</p>
    </div>
  );
};

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Carica solo conversazioni con categoria degli ultimi 6 mesi, max 200
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoISO = sixMonthsAgo.toISOString();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['dashboard-conversations', user?.email],
    queryFn: () => base44.entities.ChatConversation.filter(
      { user_email: user.email, categoria: { $ne: null }, created_date: { $gte: sixMonthsAgoISO } },
      '-created_date',
      200
    ),
    enabled: !!user?.email,
  });

  // Analisi questo mese
  const now = new Date();
  const thisMonthAnalyses = analyses.filter(c => {
    const d = new Date(c.created_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Rating medio
  const rated = analyses.filter(c => c.rating > 0);
  const avgRating = rated.length > 0 ? rated.reduce((s, c) => s + c.rating, 0) / rated.length : 0;

  // Categoria più frequente
  const catCount = {};
  analyses.forEach(c => { catCount[c.categoria] = (catCount[c.categoria] || 0) + 1; });
  const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  // Dati grafico — ultimi 3 mesi
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentAnalyses = analyses.filter(c => new Date(c.created_date) >= threeMonthsAgo);
  const recentCatCount = {};
  recentAnalyses.forEach(c => { recentCatCount[c.categoria] = (recentCatCount[c.categoria] || 0) + 1; });
  const chartData = Object.entries(recentCatCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Ultime 5
  const latest5 = analyses.slice(0, 5);

  const notEnough = analyses.length === 0;

  return (
    <div className="min-h-screen pb-8 bg-app">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Link to={createPageUrl('Home')} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg-card)' }}>
          <ArrowLeft className="w-5 h-5 text-app-muted" />
        </Link>
        <div>
          <h1 className="text-app-primary text-lg font-bold">Dashboard Analisi</h1>
          <p className="text-app-muted text-xs">Le tue decisioni in sintesi</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#d4af37]" />
        </div>
      ) : notEnough ? (
        <div className="px-4 flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl border flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--app-bg-card)', borderColor: 'var(--app-border)' }}>
            <BarChart3 className="w-8 h-8 text-app-muted" />
          </div>
          <p className="text-app-primary font-semibold text-center mb-2">Dashboard non disponibile</p>
          <p className="text-app-primary font-semibold text-center mb-2">Fai la tua prima analisi!</p>
          <p className="text-app-secondary text-sm text-center mb-6 max-w-xs">
            Inizia a usare il consulente AI per vedere le tue statistiche qui.
          </p>
          <Link
            to={createPageUrl('Home')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--app-accent)', color: 'var(--app-text-inverse)' }}
          >
            Vai al consulente AI →
          </Link>
        </div>
      ) : (
        <div className="px-4 space-y-5">
          {/* 4 stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={BarChart3} label="Analisi totali" value={analyses.length} iconColor="text-[#d4af37]" />
            <StatCard icon={Calendar} label="Questo mese" value={thisMonthAnalyses.length} iconColor="text-blue-400" />
            <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ backgroundColor: 'var(--app-bg-card)', borderColor: 'var(--app-border)' }}>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#d4af37]" />
                <span className="text-[10px] text-app-muted uppercase tracking-wider font-medium">Rating medio</span>
              </div>
              <StarsDisplay rating={avgRating} />
              {rated.length > 0 && <p className="text-[10px] text-app-muted">{rated.length} valutazion{rated.length === 1 ? 'e' : 'i'}</p>}
            </div>
            <StatCard icon={Tag} label="Top categoria" value={topCategory} sub={`${catCount[topCategory] || 0} analisi`} iconColor="text-emerald-400" />
          </div>

          {/* Grafico distribuzione */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--app-bg-card)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#d4af37]" />
              <span className="text-xs font-semibold text-app-primary">Analisi per categoria (ultimi 3 mesi)</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212,175,55,0.08)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={CATEGORY_COLORS[entry.name] || '#60a5fa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ultime 5 analisi */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--app-bg-card)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-app-primary">Ultime analisi</span>
            </div>
            <div className="space-y-2">
              {latest5.map(conv => {
                const firstUserMsg = conv.messages?.find(m => m.role === 'user');
                const preview = firstUserMsg?.content?.substring(0, 60) || conv.titolo || '—';
                const date = conv.created_date ? new Date(conv.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
                const catColor = CATEGORY_COLORS[conv.categoria] || '#60a5fa';

                return (
                  <Link
                    key={conv.id}
                    to={createPageUrl('Home')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors app-card-hover"
                    style={{ backgroundColor: 'var(--app-bg-secondary)' }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-app-primary truncate">{preview}{preview.length >= 60 ? '…' : ''}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium" style={{ color: catColor }}>{conv.categoria}</span>
                        <span className="text-[10px] text-app-muted">{date}</span>
                        {conv.rating > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5" fill="#d4af37" stroke="#d4af37" />
                            <span className="text-[10px] text-app-secondary">{conv.rating}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-app-muted flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}