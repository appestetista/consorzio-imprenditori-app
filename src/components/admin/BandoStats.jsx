import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react';

export default function BandoStats({ grants }) {
  const total = grants.length;
  const aperti = grants.filter(g => g.status === 'Aperto').length;
  const inApertura = grants.filter(g => g.status === 'In apertura').length;
  const chiusi = grants.filter(g => g.status === 'Chiuso').length;
  const attivabiliSubito = grants.filter(g => g.easy_access).length;
  
  const inScadenza = grants.filter(g => {
    if (!g.deadline || g.status === 'Chiuso') return false;
    const daysUntil = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  }).length;

  const stats = [
    { label: 'Totali', value: total, icon: FileText, color: 'text-slate-400' },
    { label: 'Aperti', value: aperti, icon: CheckCircle, color: 'text-green-400' },
    { label: 'In apertura', value: inApertura, icon: Clock, color: 'text-yellow-400' },
    { label: 'In scadenza', value: inScadenza, icon: AlertCircle, color: 'text-orange-400' },
    { label: 'Attivabili subito', value: attivabiliSubito, icon: Zap, color: 'text-lime-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-slate-400 text-xs">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}