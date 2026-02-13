import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Eye } from 'lucide-react';

export default function StoricoSimulazioni({ userEmail, onSelect }) {
  const { data: simulazioni = [], isLoading } = useQuery({
    queryKey: ['simulazioni-fiscali', userEmail],
    queryFn: () => base44.entities.SimulazioneFiscale.filter({ user_email: userEmail }, '-created_date', 20),
    enabled: !!userEmail,
  });

  const formatEuro = (n) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
  };

  const handleDelete = async (id) => {
    await base44.entities.SimulazioneFiscale.delete(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#d4af37]"></div>
      </div>
    );
  }

  if (simulazioni.length === 0) {
    return (
      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-6 text-center">
          <p className="text-slate-400 text-sm">Nessuna simulazione salvata.</p>
          <p className="text-slate-500 text-xs mt-1">Crea il tuo primo scenario per vederlo qui.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {simulazioni.map(sim => (
        <Card key={sim.id} className="bg-[#0a2540] border-[#1a3a5c]">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white text-sm font-medium">{sim.nome_scenario || 'Scenario'}</p>
                <p className="text-slate-500 text-xs">{sim.regime} · {new Date(sim.created_date).toLocaleDateString('it-IT')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelect(sim)}
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(sim.id)}
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-slate-500 text-[10px]">Fatturato</p>
                <p className="text-white text-xs font-medium">{formatEuro(sim.fatturato)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Imposte</p>
                <p className="text-red-400 text-xs font-medium">{formatEuro(sim.imposte_totali)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Netto</p>
                <p className="text-green-400 text-xs font-medium">{formatEuro(sim.netto_finale)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}