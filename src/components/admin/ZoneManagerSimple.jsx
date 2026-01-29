import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Edit, Trash2, Save, X, Users, Briefcase, ChevronDown, ChevronUp, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function ZoneManagerSimple() {
  const [expandedZone, setExpandedZone] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [showAddZone, setShowAddZone] = useState(false);
  const [addZoneName, setAddZoneName] = useState('');
  
  // Dialog per assegnare consulenti/utenti
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignType, setAssignType] = useState('consulente'); // 'consulente' o 'utente'
  const [assignZoneId, setAssignZoneId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery({
    queryKey: ['zones-simple'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true }),
  });

  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants-simple'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-simple'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filtra solo utenti normali (no admin, no consulenti)
  const normalUsers = users.filter(u => u.role !== 'admin' && u.user_type !== 'consulente');

  // Helper per ottenere consulenti di una zona (usa zone_ids per ID-based)
  const getConsultantsInZone = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return [];
    
    return consultants.filter(c => {
      // Supporta sia zone_ids (nuovo) che zona/zone_assegnate (vecchio)
      if (c.zone_ids?.includes(zoneId)) return true;
      if (c.zona === zone.name) return true;
      if (c.zone_assegnate?.includes(zone.name)) return true;
      return false;
    });
  };

  // Helper per ottenere utenti di una zona
  const getUsersInZone = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return [];
    
    return normalUsers.filter(u => {
      if (u.zone_ids?.includes(zoneId)) return true;
      if (u.zona === zone.name) return true;
      if (u.zone_assegnate?.includes(zone.name)) return true;
      return false;
    });
  };

  // Mutation per creare zona
  const createZoneMutation = useMutation({
    mutationFn: (name) => base44.entities.Zone.create({ name, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-simple'] });
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Zona creata');
      setShowAddZone(false);
      setAddZoneName('');
    }
  });

  // Mutation per rinominare zona
  const renameZoneMutation = useMutation({
    mutationFn: async ({ zoneId, oldName, newName }) => {
      // 1. Aggiorna il nome della zona
      await base44.entities.Zone.update(zoneId, { name: newName });
      
      // 2. Aggiorna tutti i consulenti che usano il vecchio nome
      const affectedConsultants = consultants.filter(c => 
        c.zona === oldName || c.zone_assegnate?.includes(oldName)
      );
      
      for (const c of affectedConsultants) {
        const updates = {};
        if (c.zona === oldName) updates.zona = newName;
        if (c.zone_assegnate?.includes(oldName)) {
          updates.zone_assegnate = c.zone_assegnate.map(z => z === oldName ? newName : z);
        }
        // Aggiungi anche zone_ids per futuro
        if (!c.zone_ids?.includes(zoneId)) {
          updates.zone_ids = [...(c.zone_ids || []), zoneId];
        }
        await base44.entities.Consultant.update(c.id, updates);
      }
      
      // 3. Aggiorna tutti gli utenti che usano il vecchio nome
      const affectedUsers = normalUsers.filter(u => 
        u.zona === oldName || u.zone_assegnate?.includes(oldName)
      );
      
      for (const u of affectedUsers) {
        const updates = {};
        if (u.zona === oldName) updates.zona = newName;
        if (u.zone_assegnate?.includes(oldName)) {
          updates.zone_assegnate = u.zone_assegnate.map(z => z === oldName ? newName : z);
        }
        if (!u.zone_ids?.includes(zoneId)) {
          updates.zone_ids = [...(u.zone_ids || []), zoneId];
        }
        await base44.entities.User.update(u.id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-simple'] });
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['consultants-simple'] });
      queryClient.invalidateQueries({ queryKey: ['users-simple'] });
      toast.success('Zona rinominata');
      setEditingZone(null);
      setNewZoneName('');
    }
  });

  // Mutation per eliminare zona
  const deleteZoneMutation = useMutation({
    mutationFn: async (zoneId) => {
      const zone = zones.find(z => z.id === zoneId);
      if (!zone) return;
      
      // Rimuovi la zona dai consulenti
      const affectedConsultants = getConsultantsInZone(zoneId);
      for (const c of affectedConsultants) {
        const updates = {};
        if (c.zona === zone.name) updates.zona = null;
        if (c.zone_assegnate?.includes(zone.name)) {
          updates.zone_assegnate = c.zone_assegnate.filter(z => z !== zone.name);
        }
        if (c.zone_ids?.includes(zoneId)) {
          updates.zone_ids = c.zone_ids.filter(id => id !== zoneId);
        }
        await base44.entities.Consultant.update(c.id, updates);
      }
      
      // Rimuovi la zona dagli utenti
      const affectedUsers = getUsersInZone(zoneId);
      for (const u of affectedUsers) {
        const updates = {};
        if (u.zona === zone.name) updates.zona = null;
        if (u.zone_assegnate?.includes(zone.name)) {
          updates.zone_assegnate = u.zone_assegnate.filter(z => z !== zone.name);
        }
        if (u.zone_ids?.includes(zoneId)) {
          updates.zone_ids = u.zone_ids.filter(id => id !== zoneId);
        }
        await base44.entities.User.update(u.id, updates);
      }
      
      // Elimina la zona
      await base44.entities.Zone.delete(zoneId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-simple'] });
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.invalidateQueries({ queryKey: ['consultants-simple'] });
      queryClient.invalidateQueries({ queryKey: ['users-simple'] });
      toast.success('Zona eliminata');
    }
  });

  // Mutation per aggiungere/rimuovere consulente da zona
  const toggleConsultantInZoneMutation = useMutation({
    mutationFn: async ({ consultantId, zoneId, add }) => {
      const consultant = consultants.find(c => c.id === consultantId);
      const zone = zones.find(z => z.id === zoneId);
      if (!consultant || !zone) return;
      
      const currentZones = consultant.zone_assegnate || [];
      const currentIds = consultant.zone_ids || [];
      
      if (add) {
        await base44.entities.Consultant.update(consultantId, {
          zone_assegnate: [...new Set([...currentZones, zone.name])],
          zone_ids: [...new Set([...currentIds, zoneId])],
          zona: consultant.zona || zone.name
        });
      } else {
        const newZones = currentZones.filter(z => z !== zone.name);
        const newIds = currentIds.filter(id => id !== zoneId);
        await base44.entities.Consultant.update(consultantId, {
          zone_assegnate: newZones,
          zone_ids: newIds,
          zona: consultant.zona === zone.name ? (newZones[0] || null) : consultant.zona
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants-simple'] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });

  // Mutation per aggiungere/rimuovere utente da zona
  const toggleUserInZoneMutation = useMutation({
    mutationFn: async ({ userId, zoneId, add }) => {
      const user = normalUsers.find(u => u.id === userId);
      const zone = zones.find(z => z.id === zoneId);
      if (!user || !zone) return;
      
      const currentZones = user.zone_assegnate || [];
      const currentIds = user.zone_ids || [];
      
      if (add) {
        await base44.entities.User.update(userId, {
          zone_assegnate: [...new Set([...currentZones, zone.name])],
          zone_ids: [...new Set([...currentIds, zoneId])],
          zona: user.zona || zone.name
        });
      } else {
        const newZones = currentZones.filter(z => z !== zone.name);
        const newIds = currentIds.filter(id => id !== zoneId);
        await base44.entities.User.update(userId, {
          zone_assegnate: newZones,
          zone_ids: newIds,
          zona: user.zona === zone.name ? (newZones[0] || null) : user.zona
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-simple'] });
      queryClient.invalidateQueries({ queryKey: ['all-users-zones'] });
    }
  });

  const [zoneFilter, setZoneFilter] = useState('all');

  const openAssignDialog = (zoneId, type) => {
    setAssignZoneId(zoneId);
    setAssignType(type);
    setSearchFilter('');
    setCategoryFilter('all');
    setZoneFilter('all');
    setShowAssignDialog(true);
  };

  // Categorie uniche dei consulenti per il filtro
  const consultantCategories = [...new Set(consultants.map(c => c.category).filter(Boolean))];

  // Helper per verificare se un consulente è in una zona specifica
  const consultantBelongsToZone = (consultant, zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return false;
    if (consultant.zone_ids?.includes(zoneId)) return true;
    if (consultant.zona === zone.name) return true;
    if (consultant.zone_assegnate?.includes(zone.name)) return true;
    return false;
  };

  // Helper per verificare se un utente è in una zona specifica
  const userBelongsToZone = (user, zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return false;
    if (user.zone_ids?.includes(zoneId)) return true;
    if (user.zona === zone.name) return true;
    if (user.zone_assegnate?.includes(zone.name)) return true;
    return false;
  };

  // Filtro consulenti
  const filteredConsultants = consultants.filter(c => {
    const matchesSearch = !searchFilter || 
      c.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesZone = zoneFilter === 'all' || 
      zoneFilter === 'none' ? !zones.some(z => consultantBelongsToZone(c, z.id)) : consultantBelongsToZone(c, zoneFilter);
    return matchesSearch && matchesCategory && matchesZone;
  });

  // Filtro utenti
  const filteredUsers = normalUsers.filter(u => {
    const matchesSearch = !searchFilter || 
      u.full_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.company_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesZone = zoneFilter === 'all' || 
      zoneFilter === 'none' ? !zones.some(z => userBelongsToZone(u, z.id)) : userBelongsToZone(u, zoneFilter);
    return matchesSearch && matchesZone;
  });

  const isConsultantInZone = (consultantId, zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    const consultant = consultants.find(c => c.id === consultantId);
    if (!zone || !consultant) return false;
    
    if (consultant.zone_ids?.includes(zoneId)) return true;
    if (consultant.zona === zone.name) return true;
    if (consultant.zone_assegnate?.includes(zone.name)) return true;
    return false;
  };

  const isUserInZone = (userId, zoneId) => {
    const zone = zones.find(z => z.id === zoneId);
    const user = normalUsers.find(u => u.id === userId);
    if (!zone || !user) return false;
    
    if (user.zone_ids?.includes(zoneId)) return true;
    if (user.zona === zone.name) return true;
    if (user.zone_assegnate?.includes(zone.name)) return true;
    return false;
  };

  return (
    <div className="space-y-3">
      {/* Header con pulsante aggiungi */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-lime-400" />
          Gestione Zone
        </h3>
        <Button
          size="sm"
          onClick={() => setShowAddZone(true)}
          className="bg-lime-400 text-slate-900 h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Nuova Zona
        </Button>
      </div>

      {/* Form aggiungi zona */}
      {showAddZone && (
        <Card className="bg-lime-400/10 border-lime-400/30">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Input
                value={addZoneName}
                onChange={(e) => setAddZoneName(e.target.value)}
                placeholder="Nome nuova zona..."
                className="bg-slate-900 border-slate-700 text-white h-8 text-sm flex-1"
              />
              <Button
                size="sm"
                onClick={() => addZoneName.trim() && createZoneMutation.mutate(addZoneName.trim())}
                disabled={!addZoneName.trim() || createZoneMutation.isPending}
                className="bg-lime-400 text-slate-900 h-8"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowAddZone(false); setAddZoneName(''); }}
                className="text-slate-400 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista zone */}
      {zones.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nessuna zona. Crea la prima!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {zones.map((zone) => {
            const zoneConsultants = getConsultantsInZone(zone.id);
            const zoneUsers = getUsersInZone(zone.id);
            const isExpanded = expandedZone === zone.id;
            const isEditing = editingZone === zone.id;

            return (
              <Card key={zone.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-3">
                  {/* Header zona */}
                  <div className="flex items-center gap-2">
                    <div className="bg-lime-400/20 p-1.5 rounded">
                      <MapPin className="w-4 h-4 text-lime-400" />
                    </div>
                    
                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          className="bg-slate-900 border-slate-600 text-white h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newZoneName.trim() && newZoneName !== zone.name) {
                              renameZoneMutation.mutate({ 
                                zoneId: zone.id, 
                                oldName: zone.name, 
                                newName: newZoneName.trim() 
                              });
                            } else {
                              setEditingZone(null);
                            }
                          }}
                          disabled={renameZoneMutation.isPending}
                          className="bg-lime-400 text-slate-900 h-7 w-7 p-0"
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingZone(null)}
                          className="text-slate-400 h-7 w-7 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-white font-medium text-sm flex-1">{zone.name}</span>
                        <div className="flex items-center gap-1">
                          <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">
                            {zoneConsultants.length} cons.
                          </Badge>
                          <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">
                            {zoneUsers.length} utenti
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingZone(zone.id); setNewZoneName(zone.name); }}
                          className="text-lime-400 h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-red-400 h-6 w-6 p-0">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Eliminare "{zone.name}"?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                I consulenti e utenti assegnati perderanno questa zona.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600"
                                onClick={() => deleteZoneMutation.mutate(zone.id)}
                              >
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                          className="text-slate-400 h-6 w-6 p-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Contenuto espanso */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-slate-700 pt-3">
                      {/* Consulenti */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-400 text-xs font-medium flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            Consulenti ({zoneConsultants.length})
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openAssignDialog(zone.id, 'consulente')}
                            className="text-purple-400 h-5 text-[10px] px-2"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Aggiungi
                          </Button>
                        </div>
                        {zoneConsultants.length === 0 ? (
                          <p className="text-slate-500 text-[10px]">Nessun consulente assegnato</p>
                        ) : (
                          <div className="space-y-1">
                            {zoneConsultants.map(c => (
                              <div key={c.id} className="flex items-center justify-between bg-slate-900 rounded p-1.5">
                                <div className="min-w-0 flex-1">
                                  <p className="text-white text-[11px] truncate">{c.name}</p>
                                  <p className="text-slate-500 text-[9px]">{c.category}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleConsultantInZoneMutation.mutate({ 
                                    consultantId: c.id, 
                                    zoneId: zone.id, 
                                    add: false 
                                  })}
                                  className="text-red-400 h-5 w-5 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Utenti */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-400 text-xs font-medium flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Utenti ({zoneUsers.length})
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openAssignDialog(zone.id, 'utente')}
                            className="text-blue-400 h-5 text-[10px] px-2"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Aggiungi
                          </Button>
                        </div>
                        {zoneUsers.length === 0 ? (
                          <p className="text-slate-500 text-[10px]">Nessun utente assegnato</p>
                        ) : (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {zoneUsers.map(u => (
                              <div key={u.id} className="flex items-center justify-between bg-slate-900 rounded p-1.5">
                                <p className="text-white text-[11px] truncate flex-1">{u.company_name || u.full_name}</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleUserInZoneMutation.mutate({ 
                                    userId: u.id, 
                                    zoneId: zone.id, 
                                    add: false 
                                  })}
                                  className="text-red-400 h-5 w-5 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
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

      {/* Dialog per assegnare consulenti/utenti */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white text-sm flex items-center gap-2">
              {assignType === 'consulente' ? (
                <><Briefcase className="w-4 h-4 text-purple-400" /> Aggiungi consulenti</>
              ) : (
                <><Users className="w-4 h-4 text-blue-400" /> Aggiungi utenti</>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {/* Filtri */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={assignType === 'consulente' ? "Cerca consulente..." : "Cerca utente o azienda..."}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white h-8 pl-8 text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              {assignType === 'consulente' && consultantCategories.length > 1 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex-1 h-8 bg-slate-900 border border-slate-700 text-white text-xs rounded-md px-2"
                >
                  <option value="all">Tutte le categorie</option>
                  {consultantCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="flex-1 h-8 bg-slate-900 border border-slate-700 text-white text-xs rounded-md px-2"
              >
                <option value="all">Tutte le zone</option>
                <option value="none">Senza zona</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto">
            {assignType === 'consulente' ? (
              filteredConsultants.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  {searchFilter || categoryFilter !== 'all' ? 'Nessun risultato' : 'Nessun consulente'}
                </p>
              ) : (
                filteredConsultants.map(c => {
                  const isInZone = isConsultantInZone(c.id, assignZoneId);
                  return (
                    <div 
                      key={c.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        isInZone ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-slate-900 hover:bg-slate-700'
                      }`}
                      onClick={() => toggleConsultantInZoneMutation.mutate({
                        consultantId: c.id,
                        zoneId: assignZoneId,
                        add: !isInZone
                      })}
                    >
                      <Checkbox checked={isInZone} className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{c.name}</p>
                        <p className="text-slate-400 text-[10px]">{c.category}</p>
                      </div>
                      {isInZone && <Check className="w-4 h-4 text-purple-400" />}
                    </div>
                  );
                })
              )
            ) : (
              filteredUsers.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  {searchFilter ? 'Nessun risultato' : 'Nessun utente'}
                </p>
              ) : (
                filteredUsers.map(u => {
                  const isInZone = isUserInZone(u.id, assignZoneId);
                  return (
                    <div 
                      key={u.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        isInZone ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-slate-900 hover:bg-slate-700'
                      }`}
                      onClick={() => toggleUserInZoneMutation.mutate({
                        userId: u.id,
                        zoneId: assignZoneId,
                        add: !isInZone
                      })}
                    >
                      <Checkbox checked={isInZone} className="pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{u.company_name || u.full_name}</p>
                        <p className="text-slate-400 text-[10px]">{u.email}</p>
                      </div>
                      {isInZone && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                  );
                })
              )
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowAssignDialog(false)}
              className="w-full bg-lime-400 text-slate-900"
            >
              Fatto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}