import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Trash2, Search, Calculator, Settings, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import GestioneAliquoteIRAP from '../fiscale/GestioneAliquoteIRAP';

export default function SimulatoreFiscaleAdmin({ user, onBack }) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();

  const { data: simulazioni = [], isLoading } = useQuery({
    queryKey: ['admin-simulazioni'],
    queryFn: () => base44.entities.SimulazioneFiscale.list('-created_date', 100),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-sim'],
    queryFn: () => base44.entities.User.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SimulazioneFiscale.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-simulazioni'] }),
  });

  const filtered = simulazioni.filter(s => {
    const term = search.toLowerCase();
    if (!term) return true;
    const userObj = allUsers.find(u => u.email === s.user_email);
    return (
      s.user_email?.toLowerCase().includes(term) ||
      s.nome_scenario?.toLowerCase().includes(term) ||
      s.regime?.toLowerCase().includes(term) ||
      userObj?.full_name?.toLowerCase().includes(term) ||
      userObj?.company_name?.toLowerCase().includes(term)
    );
  });

  const fmt = (n) => n != null ? `€${Math.round(n).toLocaleString('it-IT')}` : 'N/D';

  const regimeColors = {
    SRL: 'bg-blue-500/20 text-blue-400',
    Forfettario: 'bg-green-500/20 text-green-400',
    DittaOrdinaria: 'bg-purple-500/20 text-purple-400',
  };

  // Stats
  const totalSim = simulazioni.length;
  const uniqueUsers = [...new Set(simulazioni.map(s => s.user_email))].length;
  const regimeCounts = simulazioni.reduce((acc, s) => { acc[s.regime] = (acc[s.regime] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <Tabs defaultValue="simulazioni" className="w-full">
        <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-2">
          <TabsTrigger value="simulazioni" className="text-xs data-[state=active]:bg-[#d4af37] data-[state=active]:text-slate-900">
            <Calculator className="w-3.5 h-3.5 mr-1" /> Simulazioni utenti
          </TabsTrigger>
          <TabsTrigger value="aliquote" className="text-xs data-[state=active]:bg-[#d4af37] data-[state=active]:text-slate-900">
            <Settings className="w-3.5 h-3.5 mr-1" /> Aliquote IRAP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulazioni" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold text-white">{totalSim}</p>
                <p className="text-slate-400 text-[10px]">Simulazioni</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold text-white">{uniqueUsers}</p>
                <p className="text-slate-400 text-[10px]">Utenti</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-2 text-center">
                <div className="flex justify-center gap-1 flex-wrap">
                  {Object.entries(regimeCounts).map(([r, c]) => (
                    <Badge key={r} className={`${regimeColors[r] || 'bg-slate-600 text-white'} border-0 text-[9px]`}>{r}: {c}</Badge>
                  ))}
                </div>
                <p className="text-slate-400 text-[10px] mt-1">Per regime</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cerca per utente, scenario, regime..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white pl-9 h-9 text-sm"
            />
          </div>

          {/* List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-sm">Nessuna simulazione trovata</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(sim => {
                const userObj = allUsers.find(u => u.email === sim.user_email);
                const isExpanded = expandedId === sim.id;
                return (
                  <Card key={sim.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium text-xs truncate">
                              {userObj?.company_name || userObj?.full_name || sim.user_email}
                            </span>
                            <Badge className={`${regimeColors[sim.regime] || 'bg-slate-600 text-white'} border-0 text-[9px]`}>
                              {sim.regime}
                            </Badge>
                          </div>
                          <p className="text-slate-500 text-[10px] truncate">{sim.nome_scenario}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-slate-400 text-[10px]">Fatt: {fmt(sim.fatturato)}</span>
                            <span className="text-[#d4af37] text-[10px] font-bold">Netto: {fmt(sim.netto_finale)}</span>
                            <span className="text-red-400 text-[10px]">Imposte: {fmt(sim.imposte_totali)}</span>
                          </div>
                          <p className="text-slate-600 text-[10px]">
                            {new Date(sim.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : sim.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-800 border-slate-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Eliminare questa simulazione?</AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(sim.id)}>Elimina</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {isExpanded && sim.dettaglio_calcolo && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <pre className="text-slate-300 text-[10px] whitespace-pre-wrap leading-relaxed bg-slate-900 rounded-lg p-3 max-h-60 overflow-y-auto">
                            {sim.dettaglio_calcolo}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="aliquote">
          <GestioneAliquoteIRAP user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}