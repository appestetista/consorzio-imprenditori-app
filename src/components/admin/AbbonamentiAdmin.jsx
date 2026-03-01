import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, CreditCard, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_CONFIG = {
  in_attesa: { label: 'In attesa', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  attivo: { label: 'Attivo', color: 'bg-green-500/20 text-green-400', icon: Check },
  cancellato: { label: 'Cancellato', color: 'bg-red-500/20 text-red-400', icon: X },
};

export default function AbbonamentiAdmin() {
  const [filterStato, setFilterStato] = useState('in_attesa');
  const queryClient = useQueryClient();

  const { data: richieste = [], isLoading } = useQuery({
    queryKey: ['richieste-abbonamento'],
    queryFn: () => base44.entities.RichiestaAbbonamento.list('-created_date'),
  });

  const filtered = richieste.filter(r => filterStato === 'all' || r.stato === filterStato);

  const attivaMutation = useMutation({
    mutationFn: async (richiesta) => {
      const now = new Date();
      const meseCorrente = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Aggiorna richiesta
      await base44.entities.RichiestaAbbonamento.update(richiesta.id, { stato: 'attivo' });
      
      // Aggiorna utente
      const users = await base44.entities.User.filter({ email: richiesta.email });
      if (users.length > 0) {
        await base44.entities.User.update(users[0].id, {
          piano_abbonamento: 'impresa_39',
          consulenze_usate_mese: 0,
          mese_reset_consulenze: meseCorrente,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['richieste-abbonamento'] }),
  });

  const disattivaMutation = useMutation({
    mutationFn: async (richiesta) => {
      await base44.entities.RichiestaAbbonamento.update(richiesta.id, { stato: 'cancellato' });
      
      const users = await base44.entities.User.filter({ email: richiesta.email });
      if (users.length > 0) {
        await base44.entities.User.update(users[0].id, { piano_abbonamento: 'free' });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['richieste-abbonamento'] }),
  });

  const isBusy = attivaMutation.isPending || disattivaMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#d4af37]" />
          Richieste Abbonamento
        </h3>
        <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="in_attesa">In attesa</SelectItem>
            <SelectItem value="attivo">Attivi</SelectItem>
            <SelectItem value="cancellato">Cancellati</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#d4af37] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-xs text-center py-6">Nessuna richiesta {filterStato !== 'all' ? STATUS_CONFIG[filterStato]?.label.toLowerCase() : ''}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const cfg = STATUS_CONFIG[r.stato] || STATUS_CONFIG.in_attesa;
            const Icon = cfg.icon;
            return (
              <div key={r.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white text-sm font-medium">{r.email}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      {r.created_date ? new Date(r.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                  <Badge className={`${cfg.color} border-0 text-[10px] gap-1`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </Badge>
                </div>
                <p className="text-slate-400 text-xs">Piano: <span className="text-[#d4af37] font-medium">Impresa 39€/mese</span></p>
                {r.note && <p className="text-slate-500 text-xs mt-1">Note: {r.note}</p>}

                {r.stato === 'in_attesa' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() => attivaMutation.mutate(r)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                    >
                      {attivaMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Attiva</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => disattivaMutation.mutate(r)}
                      className="flex-1 border-red-600 text-red-400 hover:bg-red-600/20 h-7 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />Rifiuta
                    </Button>
                  </div>
                )}

                {r.stato === 'attivo' && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => disattivaMutation.mutate(r)}
                      className="w-full border-red-600 text-red-400 hover:bg-red-600/20 h-7 text-xs"
                    >
                      {disattivaMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" />Disattiva abbonamento</>}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}