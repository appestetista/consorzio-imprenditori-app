import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, User, Trash2, Eye, EyeOff, Calendar, Search, ArrowLeft, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function VantaggiAdminPanel({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCreatorType, setFilterCreatorType] = useState('all');
  const [filterTipoVantaggio, setFilterTipoVantaggio] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  // Tutti i vantaggi
  const { data: vantaggi = [], isLoading: loadingVantaggi } = useQuery({
    queryKey: ['admin-vantaggi'],
    queryFn: () => base44.entities.Vantaggio.list('-created_date'),
  });

  // Tutte le prenotazioni
  const { data: prenotazioni = [], isLoading: loadingPrenotazioni } = useQuery({
    queryKey: ['admin-prenotazioni-vantaggi'],
    queryFn: () => base44.entities.PrenotazioneVantaggio.list('-created_date'),
  });

  // Utenti per mostrare i nomi
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-vantaggi'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    },
  });

  // Consulenti per mostrare i nomi
  const { data: consultants = [] } = useQuery({
    queryKey: ['admin-consultants-vantaggi'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  // Mutation per eliminare un vantaggio
  const deleteVantaggioMutation = useMutation({
    mutationFn: async (vantaggioId) => {
      // Prima elimina tutte le prenotazioni associate
      const prenotazioniAssociate = prenotazioni.filter(p => p.vantaggio_id === vantaggioId);
      for (const p of prenotazioniAssociate) {
        await base44.entities.PrenotazioneVantaggio.delete(p.id);
      }
      // Poi elimina il vantaggio
      await base44.entities.Vantaggio.delete(vantaggioId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vantaggi'] });
      queryClient.invalidateQueries({ queryKey: ['admin-prenotazioni-vantaggi'] });
      toast.success('Vantaggio eliminato');
    },
    onError: () => {
      toast.error('Errore durante l\'eliminazione');
    },
  });

  // Mutation per attivare/disattivare un vantaggio
  const toggleVantaggioMutation = useMutation({
    mutationFn: async ({ vantaggioId, isActive }) => {
      await base44.entities.Vantaggio.update(vantaggioId, { is_active: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vantaggi'] });
      toast.success('Stato aggiornato');
    },
  });

  // Mutation per eliminare una prenotazione
  const deletePrenotazioneMutation = useMutation({
    mutationFn: async (prenotazioneId) => {
      await base44.entities.PrenotazioneVantaggio.delete(prenotazioneId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prenotazioni-vantaggi'] });
      toast.success('Prenotazione eliminata');
    },
  });

  // Helper per ottenere nome creatore
  const getCreatorName = (email, type) => {
    if (type === 'consulente') {
      const consultant = consultants.find(c => c.email === email);
      return consultant?.name || email;
    }
    const user = users.find(u => u.email === email);
    return user?.company_name || user?.full_name || email;
  };

  // Helper per ottenere nome utente
  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.company_name || user?.full_name || email;
  };

  // Filtra vantaggi
  const filteredVantaggi = vantaggi.filter(v => {
    const matchesSearch = v.titolo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.creator_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCreatorType = filterCreatorType === 'all' || v.creator_type === filterCreatorType;
    const matchesTipo = filterTipoVantaggio === 'all' || v.tipo_vantaggio === filterTipoVantaggio;
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && v.is_active) ||
                          (filterStatus === 'inactive' && !v.is_active);
    return matchesSearch && matchesCreatorType && matchesTipo && matchesStatus;
  });

  // Statistiche
  const stats = {
    totaleVantaggi: vantaggi.length,
    vantaggiAttivi: vantaggi.filter(v => v.is_active).length,
    prenotazioniAttive: prenotazioni.filter(p => p.status === 'attiva').length,
    prenotazioniUtilizzate: prenotazioni.filter(p => p.status === 'utilizzata').length,
  };

  const tipiVantaggio = [
    'Sconto percentuale',
    'Sconto fisso',
    'Consulenza gratuita',
    'Omaggio',
    'Promozione speciale',
    'Prova gratuita',
    'Vantaggio progressivo',
    'Altro'
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            Gestione Vantaggi
          </h2>
          <p className="text-slate-400 text-xs">Controllo vantaggi e prenotazioni</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <Gift className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{stats.totaleVantaggi}</p>
            <p className="text-slate-400 text-[9px]">Totali</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{stats.vantaggiAttivi}</p>
            <p className="text-slate-400 text-[9px]">Attivi</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{stats.prenotazioniAttive}</p>
            <p className="text-slate-400 text-[9px]">Prenotazioni</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <TrendingUp className="w-4 h-4 text-lime-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{stats.prenotazioniUtilizzate}</p>
            <p className="text-slate-400 text-[9px]">Utilizzate</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vantaggi" className="w-full">
        <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-2">
          <TabsTrigger value="vantaggi" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            Vantaggi ({vantaggi.length})
          </TabsTrigger>
          <TabsTrigger value="prenotazioni" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            Prenotazioni ({prenotazioni.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB VANTAGGI */}
        <TabsContent value="vantaggi" className="space-y-3">
          {/* Filtri */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cerca vantaggi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white pl-9 h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={filterCreatorType} onValueChange={setFilterCreatorType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]">
                  <SelectValue placeholder="Creatore" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="utente">Aziende</SelectItem>
                  <SelectItem value="consulente">Consulenti</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTipoVantaggio} onValueChange={setFilterTipoVantaggio}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  {tipiVantaggio.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-[10px]">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="active">Attivi</SelectItem>
                  <SelectItem value="inactive">Disattivi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista vantaggi */}
          {loadingVantaggi ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredVantaggi.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Nessun vantaggio trovato</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filteredVantaggi.map((vantaggio) => {
                const prenotazioniVantaggio = prenotazioni.filter(p => p.vantaggio_id === vantaggio.id);
                const prenotazioniAttive = prenotazioniVantaggio.filter(p => p.status === 'attiva').length;
                
                return (
                  <Card key={vantaggio.id} className={`border ${vantaggio.is_active ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/50 border-red-500/30'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-white font-medium text-sm truncate">{vantaggio.titolo}</h3>
                            {!vantaggio.is_active && (
                              <Badge className="bg-red-500/20 text-red-400 border-0 text-[9px]">Disattivo</Badge>
                            )}
                          </div>
                          <p className="text-amber-400 text-xs">{vantaggio.tipo_vantaggio}</p>
                          <p className="text-slate-400 text-[10px]">
                            {vantaggio.creator_type === 'consulente' ? '👔' : '👤'} {getCreatorName(vantaggio.creator_email, vantaggio.creator_type)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {prenotazioniAttive > 0 && (
                            <Badge className="bg-blue-500 text-white text-[9px]">{prenotazioniAttive} attive</Badge>
                          )}
                        </div>
                      </div>

                      {vantaggio.valore && (
                        <p className="text-lime-400 text-xs mb-2">Valore: {vantaggio.valore}</p>
                      )}

                      <div className="flex gap-1 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleVantaggioMutation.mutate({ vantaggioId: vantaggio.id, isActive: vantaggio.is_active })}
                          className={`flex-1 h-7 text-[10px] ${vantaggio.is_active ? 'border-orange-500 text-orange-400 hover:bg-orange-500/20' : 'border-green-500 text-green-400 hover:bg-green-500/20'}`}
                        >
                          {vantaggio.is_active ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                          {vantaggio.is_active ? 'Disattiva' : 'Attiva'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20 h-7 w-7 p-0">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Eliminare questo vantaggio?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                {prenotazioniVantaggio.length > 0 
                                  ? `Attenzione: ci sono ${prenotazioniVantaggio.length} prenotazioni associate che verranno eliminate.`
                                  : 'Questa azione non può essere annullata.'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteVantaggioMutation.mutate(vantaggio.id)}
                              >
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {/* Lista utenti che hanno prenotato */}
                      {prenotazioniVantaggio.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                          <p className="text-slate-500 text-[9px] mb-1">Prenotazioni:</p>
                          <div className="flex flex-wrap gap-1">
                            {prenotazioniVantaggio.slice(0, 5).map(p => (
                              <Badge key={p.id} className={`text-[8px] ${p.status === 'attiva' ? 'bg-blue-500/20 text-blue-400' : p.status === 'utilizzata' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
                                {getUserName(p.user_email).split(' ')[0]}
                              </Badge>
                            ))}
                            {prenotazioniVantaggio.length > 5 && (
                              <Badge className="bg-slate-600/50 text-slate-400 text-[8px]">+{prenotazioniVantaggio.length - 5}</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB PRENOTAZIONI */}
        <TabsContent value="prenotazioni" className="space-y-3">
          {loadingPrenotazioni ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full"></div>
            </div>
          ) : prenotazioni.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Nessuna prenotazione</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {prenotazioni.map((prenotazione) => {
                const vantaggio = vantaggi.find(v => v.id === prenotazione.vantaggio_id);
                
                const statusColors = {
                  attiva: 'bg-blue-500',
                  utilizzata: 'bg-green-500',
                  annullata: 'bg-red-500',
                  scaduta: 'bg-slate-500',
                };
                const statusLabels = {
                  attiva: 'Attiva',
                  utilizzata: 'Utilizzata',
                  annullata: 'Annullata',
                  scaduta: 'Scaduta',
                };

                return (
                  <Card key={prenotazione.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${statusColors[prenotazione.status] || 'bg-slate-500'} text-white text-[9px]`}>
                              {statusLabels[prenotazione.status] || prenotazione.status}
                            </Badge>
                            {prenotazione.step_corrente > 1 && (
                              <Badge className="bg-purple-500/20 text-purple-400 text-[9px]">
                                Step {prenotazione.step_corrente}
                              </Badge>
                            )}
                          </div>
                          <p className="text-white font-medium text-sm truncate">{vantaggio?.titolo || 'Vantaggio rimosso'}</p>
                          <p className="text-slate-400 text-[10px]">
                            <User className="w-3 h-3 inline mr-1" />
                            {getUserName(prenotazione.user_email)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 text-[9px]">
                            {new Date(prenotazione.created_date).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>

                      {vantaggio && (
                        <p className="text-amber-400 text-[10px] mb-2">
                          Offerto da: {getCreatorName(vantaggio.creator_email, vantaggio.creator_type)}
                        </p>
                      )}

                      {prenotazione.data_utilizzo && (
                        <p className="text-green-400 text-[10px]">
                          Utilizzato: {new Date(prenotazione.data_utilizzo).toLocaleDateString('it-IT')}
                        </p>
                      )}

                      <div className="flex gap-1 mt-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20 h-7 text-[10px] flex-1">
                              <Trash2 className="w-3 h-3 mr-1" />
                              Elimina
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Eliminare questa prenotazione?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Questa azione non può essere annullata.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deletePrenotazioneMutation.mutate(prenotazione.id)}
                              >
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}