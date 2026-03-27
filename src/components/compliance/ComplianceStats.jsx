import React from 'react';
import { Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const STATO_COLORS = {
  conforme: '#22c55e',
  da_migliorare: '#f97316',
  non_conforme: '#ef4444',
  non_verificato: '#6b7280'
};

const CATEGORIE = [
  "Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale",
  "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"
];

export default function ComplianceStats({
  filteredNorms,
  norms,
  selectedBranch,
  selectedCategoria,
  setSelectedCategoria,
}) {
  const stats = {
    conforme: filteredNorms.filter(n => n.stato === 'conforme' && n.documenti_urls?.length > 0).length,
    da_migliorare: filteredNorms.filter(n => n.stato === 'da_migliorare' && n.documenti_urls?.length > 0).length,
    non_conforme: filteredNorms.filter(n => n.stato === 'non_conforme' && n.documenti_urls?.length > 0).length,
    non_verificato: filteredNorms.filter(n => n.stato === 'non_verificato' || !n.documenti_urls?.length).length,
  };

  const pieData = [
    { name: 'Non verificato', value: stats.non_verificato, color: STATO_COLORS.non_verificato },
    { name: 'Conforme', value: stats.conforme, color: STATO_COLORS.conforme },
    { name: 'Da migliorare', value: stats.da_migliorare, color: STATO_COLORS.da_migliorare },
    { name: 'Non conforme', value: stats.non_conforme, color: STATO_COLORS.non_conforme },
  ].filter(d => d.value > 0);

  return (
    <>
      <Card className="bg-slate-900 border-slate-900 mb-6">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-4 text-center">Stato Conformità</h3>
          {filteredNorms.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nessuna normativa inserita</p>
              <p className="text-slate-500 text-sm">Aggiungi un ramo aziendale per generare gli adempimenti</p>
            </div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-slate-300 text-sm">Conforme ({stats.conforme})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-slate-300 text-sm">Da migliorare ({stats.da_migliorare})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-slate-300 text-sm">Non conforme ({stats.non_conforme})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-500"></div><span className="text-slate-300 text-sm">Non verificato ({stats.non_verificato})</span></div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {filteredNorms.length > 0 && (
        <div className="mb-4 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <Button variant={selectedCategoria === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategoria('all')} className={selectedCategoria === 'all' ? 'bg-slate-700 text-white' : 'border-slate-600 text-slate-300'}>Tutte</Button>
            {CATEGORIE.map((cat) => {
              const count = norms.filter(n => (selectedBranch === 'all' || n.branch_id === selectedBranch) && n.categoria === cat).length;
              if (count === 0) return null;
              return (
                <Button key={cat} variant={selectedCategoria === cat ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategoria(cat)} className={selectedCategoria === cat ? 'bg-slate-700 text-white' : 'border-slate-600 text-slate-300'}>
                  {cat} ({count})
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}