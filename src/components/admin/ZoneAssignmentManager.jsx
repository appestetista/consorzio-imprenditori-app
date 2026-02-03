import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, X, Users, Briefcase, ArrowRight, Check, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function ZoneAssignmentManager() {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignType, setAssignType] = useState('utente'); // 'utente' o 'consulente'
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedZones, setSelectedZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [expandedZone, setExpandedZone] = useState(null);
  const [activeTab, setActiveTab] = useState('utenti');
  
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-zones'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allConsultants = [] } = useQuery({
    queryKey: ['all-consultants-zones'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: zonesFromDb = [] } = useQuery({
    queryKey: ['zones-all'],
    queryFn: () => base44.entities.Zone.list(),
  });

  const activeZones = zonesFromDb.filter(z => z.is_active !== false).map(z => z.name).sort();

  // Helper per ottenere le zone di un utente/consulente
  const getZones = (item, isConsultant = false) => {
    const zoneAssegnate = item.zone_assegnate || [];
    const zonaSingola = item.zona ? [item.zona] : [];
    const allZones = [...new Set([...zoneAssegnate, ...zonaSingola])];
    return allZones.filter(z => z);
  };

  // Filtra utenti (non admin, non consulenti)
  const filteredUsers = allUsers.filter(u => {
    if (u.role === 'admin') return false;
    if (u.user_type === 'consulente') return false;
    
    const matchesSearch = !searchQuery || 
      u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const userZones = getZones(u);
    const matchesZone = filterZone === 'all' || 
      (filterZone === 'none' && userZones.length === 0) ||
      userZones.includes(filterZone);
    
    return matchesSearch && matchesZone;
  });

  // Filtra consulenti
  const filteredConsultants = allConsultants.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const consultantZones = getZones(c, true);
    const matchesZone = filterZone === 'all' || 
      (filterZone === 'none' && consultantZones.length === 0) ||
      consultantZones.includes(filterZone);
    
    return matchesSearch && matchesZone;
  });

  // Normalizza zona per confronto case-insensitive
  const normalizeZone = (z) => z?.toLowerCase().trim();

  // Conta utenti/consulenti per zona
  const getUsersInZone = (zoneName) => {
    const zoneNorm = normalizeZone(zoneName);
    return allUsers.filter(u => {
      if (u.role === 'admin' || u.user_type === 'consulente') return false;
      const zones = getZones(u);
      return zones.some(z => normalizeZone(z) === zoneNorm);
    });
  };

  const getConsultantsInZone = (zoneName) => {
    const zoneNorm = normalizeZone(zoneName);
    return allConsultants.filter(c => {
      const zones = getZones(c, true);
      return zones.some(z => normalizeZone(z) === zoneNorm);
    });
  };

  const updateUserZonesMutation = useMutation({
    mutationFn: async ({ userId, zones }) => {
      await base44.entities.User.update(userId, { 
        zone_assegnate: zones,
        zona: zones.length > 0 ? zones[0] : null // Mantieni retrocompatibilità
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-zones'] });
      toast.success('Zone aggiornate');
      closeDialog();
    }
  });

  const updateConsultantZonesMutation = useMutation({
    mutationFn: async ({ consultantId, zones, email }) => {
      await base44.entities.Consultant.update(consultantId, { 
        zone_assegnate: zones,
        zona: zones.length > 0 ? zones[0] : null
      });
      // Aggiorna anche l'utente collegato se esiste
      if (email) {
        const users = await base44.entities.User.filter({ email: email.toLowerCase() });
        if (users.length > 0) {
          await base44.entities.User.update(users[0].id, { 
            zone_assegnate: zones,
            zona: zones.length > 0 ? zones[0] : null
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-consultants-zones'] });
      queryClient.invalidateQueries({ queryKey: ['all-users-zones'] });
      toast.success('Zone consulente aggiornate');
      closeDialog();
    }
  });

  const closeDialog = () => {
    setShowAssignDialog(false);
    setSelectedItem(null);
    setSelectedZones([]);
  };

  const openAssignDialog = (item, type) => {
    setAssignType(type);
    setSelectedItem(item);
    const currentZones = getZones(item, type === 'consulente');
    setSelectedZones(currentZones);
    setShowAssignDialog(true);
  };

  const toggleZone = (zoneName) => {
    setSelectedZones(prev => 
      prev.includes(zoneName) 
        ? prev.filter(z => z !== zoneName)
        : [...prev, zoneName]
    );
  };

  const handleSaveZones = () => {
    if (assignType === 'consulente') {
      updateConsultantZonesMutation.mutate({
        consultantId: selectedItem.id,
        zones: selectedZones,
        email: selectedItem.email
      });
    } else {
      updateUserZonesMutation.mutate({
        userId: selectedItem.id,
        zones: selectedZones
      });
    }
  };

  const removeZoneFromItem = (item, zoneName, isConsultant) => {
    const currentZones = getZones(item, isConsultant);
    const newZones = currentZones.filter(z => z !== zoneName);
    
    if (isConsultant) {
      updateConsultantZonesMutation.mutate({
        consultantId: item.id,
        zones: newZones,
        email: item.email
      });
    } else {
      updateUserZonesMutation.mutate({
        userId: item.id,
        zones: newZones
      });
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-lime-400" />
            Assegnazione Zone
          </h3>
        </div>

        {/* Tabs per Utenti e Consulenti */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-slate-900 border border-slate-700 mb-3 grid grid-cols-2">
            <TabsTrigger value="utenti" className="text-xs data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <Users className="w-3 h-3 mr-1" />
              Utenti ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="consulenti" className="text-xs data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <Briefcase className="w-3 h-3 mr-1" />
              Consulenti ({filteredConsultants.length})
            </TabsTrigger>
          </TabsList>

          {/* Filtri */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <Input
                placeholder="Cerca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white text-xs h-8 pl-7"
              />
            </div>
            <Select value={filterZone} onValueChange={setFilterZone}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-8 w-28">
                <SelectValue placeholder="Zona" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white text-xs">Tutte</SelectItem>
                <SelectItem value="none" className="text-white text-xs">Senza zona</SelectItem>
                {activeZones.map(zona => (
                  <SelectItem key={zona} value={zona} className="text-white text-xs">{zona}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Riepilogo zone con espansione */}
          <div className="space-y-2 mb-3">
            {activeZones.map(zona => {
              const usersCount = getUsersInZone(zona).length;
              const consultantsCount = getConsultantsInZone(zona).length;
              const isExpanded = expandedZone === zona;
              
              return (
                <div key={zona} className="bg-slate-900 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedZone(isExpanded ? null : zona)}
                    className="w-full flex items-center justify-between p-2 hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-lime-400" />
                      <span className="text-white text-xs font-medium">{zona}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
                        {usersCount} utenti
                      </Badge>
                      <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">
                        {consultantsCount} cons.
                      </Badge>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-2">
                      {/* Utenti nella zona */}
                      {usersCount > 0 && (
                        <div>
                          <p className="text-slate-400 text-[10px] mb-1">Utenti:</p>
                          <div className="space-y-1">
                            {getUsersInZone(zona).map(u => (
                              <div key={u.id} className="flex items-center justify-between bg-slate-800 rounded p-1.5">
                                <span className="text-white text-[10px] truncate flex-1">{u.company_name || u.full_name}</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-lime-400 hover:bg-lime-400/20"
                                    onClick={() => openAssignDialog(u, 'utente')}
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-red-400 hover:bg-red-400/20"
                                    onClick={() => removeZoneFromItem(u, zona, false)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Consulenti nella zona */}
                      {consultantsCount > 0 && (
                        <div>
                          <p className="text-slate-400 text-[10px] mb-1">Consulenti:</p>
                          <div className="space-y-1">
                            {getConsultantsInZone(zona).map(c => (
                              <div key={c.id} className="flex items-center justify-between bg-slate-800 rounded p-1.5">
                                <div className="flex-1 min-w-0">
                                  <span className="text-white text-[10px] truncate block">{c.name}</span>
                                  <span className="text-slate-400 text-[8px]">{c.category}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-lime-400 hover:bg-lime-400/20"
                                    onClick={() => openAssignDialog(c, 'consulente')}
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 text-red-400 hover:bg-red-400/20"
                                    onClick={() => removeZoneFromItem(c, zona, true)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* TAB UTENTI */}
          <TabsContent value="utenti" className="mt-0">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Nessun utente trovato</p>
              ) : (
                filteredUsers.map(user => {
                  const userZones = getZones(user);
                  return (
                    <div key={user.id} className="bg-slate-900 rounded-lg p-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">
                          {user.company_name || user.full_name}
                        </p>
                        <p className="text-slate-400 text-xs truncate">{user.email}</p>
                        {userZones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {userZones.map(z => (
                              <Badge key={z} className="bg-lime-400/20 text-lime-400 text-[10px]">
                                {z}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-lime-400 hover:bg-lime-400/20 h-7 text-xs"
                        onClick={() => openAssignDialog(user, 'utente')}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {userZones.length > 0 ? 'Modifica' : 'Assegna'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* TAB CONSULENTI */}
          <TabsContent value="consulenti" className="mt-0">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredConsultants.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Nessun consulente trovato</p>
              ) : (
                filteredConsultants.map(consultant => {
                  const consultantZones = getZones(consultant, true);
                  return (
                    <div key={consultant.id} className="bg-slate-900 rounded-lg p-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium truncate">{consultant.name}</p>
                        <p className="text-blue-400 text-xs truncate">{consultant.category}</p>
                        {consultantZones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {consultantZones.map(z => (
                              <Badge key={z} className="bg-purple-400/20 text-purple-400 text-[10px]">
                                {z}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-lime-400 hover:bg-lime-400/20 h-7 text-xs"
                        onClick={() => openAssignDialog(consultant, 'consulente')}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {consultantZones.length > 0 ? 'Modifica' : 'Assegna'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog assegnazione zone multiple */}
      <Dialog open={showAssignDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-lime-400" />
              {assignType === 'consulente' ? 'Zone Consulente' : 'Zone Utente'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4 mt-4">
              {/* Info item selezionato */}
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-white font-medium">
                  {assignType === 'consulente' ? selectedItem.name : (selectedItem.company_name || selectedItem.full_name)}
                </p>
                <p className="text-slate-400 text-xs">{selectedItem.email}</p>
                {assignType === 'consulente' && (
                  <p className="text-blue-400 text-xs">{selectedItem.category}</p>
                )}
              </div>

              {/* Selezione zone multiple */}
              <div>
                <Label className="text-slate-400 text-sm mb-2 block">
                  Seleziona zone (può vederne più di una)
                </Label>
                <div className="bg-slate-900 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {activeZones.map(zona => (
                    <div 
                      key={zona}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedZones.includes(zona) ? 'bg-lime-400/20' : 'hover:bg-slate-800'
                      }`}
                      onClick={() => toggleZone(zona)}
                    >
                      <Checkbox
                        checked={selectedZones.includes(zona)}
                        onCheckedChange={() => toggleZone(zona)}
                        className="border-slate-600 data-[state=checked]:bg-lime-400 data-[state=checked]:border-lime-400"
                      />
                      <span className="text-white text-sm flex-1">{zona}</span>
                      <div className="flex gap-1">
                        <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
                          {getUsersInZone(zona).length}
                        </Badge>
                        <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">
                          {getConsultantsInZone(zona).length}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  {selectedZones.length === 0 
                    ? 'Nessuna zona selezionata' 
                    : `${selectedZones.length} zona/e selezionata/e: ${selectedZones.join(', ')}`
                  }
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                  onClick={closeDialog}
                >
                  Annulla
                </Button>
                <Button
                  className="flex-1 bg-lime-400 text-slate-900 hover:bg-lime-500"
                  disabled={updateUserZonesMutation.isPending || updateConsultantZonesMutation.isPending}
                  onClick={handleSaveZones}
                >
                  {(updateUserZonesMutation.isPending || updateConsultantZonesMutation.isPending) 
                    ? 'Salvataggio...' 
                    : 'Salva Zone'
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}