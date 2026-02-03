import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronRight, Building2, X, UserCheck, Users, Briefcase, MapPin, Eye, EyeOff, ChevronLeft
} from 'lucide-react';

export default function ConsultantAssignmentManager() {
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();

  // Fetch zone
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.filter({ is_active: true })
  });

  // Fetch utenti (solo ruolo 'user' e tipo 'utente')
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.role === 'user' && u.user_type !== 'consulente');
    }
  });

  // Fetch consulenti
  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list()
  });

  // Fetch tutte le assegnazioni
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['all-assignments'],
    queryFn: () => base44.entities.ConsultantAssignment.list()
  });

  // Filtra per zona selezionata (case-insensitive)
  const normalizeZone = (z) => z?.toLowerCase().trim();
  const selectedZoneNorm = normalizeZone(selectedZone);
  
  const zoneConsultants = consultants.filter(c => 
    normalizeZone(c.zona) === selectedZoneNorm || 
    c.zone_assegnate?.some(z => normalizeZone(z) === selectedZoneNorm)
  );
  const zoneUsers = users.filter(u => normalizeZone(u.zona) === selectedZoneNorm);

  // Toggle visibilità: consulente -> utente
  const toggleConsultantUserVisibility = useMutation({
    mutationFn: async ({ consultantId, userEmail, shouldBeVisible }) => {
      const assignment = allAssignments.find(
        a => a.consultant_id === consultantId && a.user_email === userEmail
      );
      
      if (shouldBeVisible) {
        // Rimuovi blocco (o riattiva assegnazione)
        if (assignment) {
          await base44.entities.ConsultantAssignment.update(assignment.id, { is_assigned: true });
        }
        // Se non esiste assegnazione, di default è visibile quindi non serve crearla
      } else {
        // Blocca visibilità
        if (assignment) {
          await base44.entities.ConsultantAssignment.update(assignment.id, { is_assigned: false });
        } else {
          // Crea assegnazione con is_assigned: false per bloccare
          await base44.entities.ConsultantAssignment.create({
            consultant_id: consultantId,
            user_email: userEmail,
            available_consultations: 0,
            is_assigned: false
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-assignments'] });
    }
  });

  // Verifica se utente vede consulente (default: true, false solo se esiste assegnazione con is_assigned: false)
  const canUserSeeConsultant = (consultantId, userEmail) => {
    const assignment = allAssignments.find(
      a => a.consultant_id === consultantId && a.user_email === userEmail
    );
    // Se non esiste assegnazione, di default vede tutto
    if (!assignment) return true;
    return assignment.is_assigned !== false;
  };

  // Conta quanti utenti sono bloccati per un consulente
  const getBlockedUsersCount = (consultantId) => {
    return allAssignments.filter(
      a => a.consultant_id === consultantId && a.is_assigned === false
    ).length;
  };

  // Conta quanti consulenti sono bloccati per un utente
  const getBlockedConsultantsCount = (userEmail) => {
    return allAssignments.filter(
      a => a.user_email === userEmail && a.is_assigned === false
    ).length;
  };

  // Vista selezione zona
  if (!selectedZone) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-lime-400" />
            <h3 className="text-white font-medium">Gestione Visibilità</h3>
          </div>

          <p className="text-slate-400 text-sm mb-4">
            Seleziona una zona per gestire chi vede chi tra consulenti e utenti.
            Di default tutti vedono tutti.
          </p>

          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="Seleziona zona..." />
            </SelectTrigger>
            <SelectContent>
              {zones.map(zone => (
                <SelectItem key={zone.id} value={zone.name}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-lime-400" />
                    {zone.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  // Vista dettaglio consulente -> gestisci utenti
  if (selectedConsultant) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSelectedConsultant(null)}
              className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{selectedConsultant.name}</p>
              <p className="text-slate-400 text-xs">{selectedConsultant.category}</p>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border-0">
              <Briefcase className="w-3 h-3 mr-1" />
              Consulente
            </Badge>
          </div>

          <p className="text-slate-400 text-xs mb-3">
            Gestisci quali utenti possono vedere questo consulente. Di default tutti lo vedono.
          </p>

          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {zoneUsers.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Nessun utente in questa zona</p>
            ) : (
              zoneUsers.map(user => {
                const canSee = canUserSeeConsultant(selectedConsultant.id, user.email);
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      canSee ? 'bg-slate-900' : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        canSee ? 'bg-lime-400/20' : 'bg-red-500/20'
                      }`}>
                        <Building2 className={`w-4 h-4 ${canSee ? 'text-lime-400' : 'text-red-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium text-sm truncate ${canSee ? 'text-white' : 'text-red-400'}`}>
                          {user.company_name || user.full_name}
                        </p>
                        <p className="text-slate-500 text-xs truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canSee ? (
                        <Eye className="w-4 h-4 text-lime-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-red-400" />
                      )}
                      <Switch
                        checked={canSee}
                        onCheckedChange={(checked) => {
                          toggleConsultantUserVisibility.mutate({
                            consultantId: selectedConsultant.id,
                            userEmail: user.email,
                            shouldBeVisible: checked
                          });
                        }}
                        className="data-[state=checked]:bg-lime-400 data-[state=unchecked]:bg-red-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista dettaglio utente -> gestisci consulenti
  if (selectedUser) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">{selectedUser.company_name || selectedUser.full_name}</p>
              <p className="text-slate-400 text-xs">{selectedUser.email}</p>
            </div>
            <Badge className="bg-lime-400/20 text-lime-400 border-0">
              <Building2 className="w-3 h-3 mr-1" />
              Utente
            </Badge>
          </div>

          <p className="text-slate-400 text-xs mb-3">
            Gestisci quali consulenti questo utente può vedere. Di default vede tutti.
          </p>

          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {zoneConsultants.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Nessun consulente in questa zona</p>
            ) : (
              zoneConsultants.map(consultant => {
                const canSee = canUserSeeConsultant(consultant.id, selectedUser.email);
                return (
                  <div
                    key={consultant.id}
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      canSee ? 'bg-slate-900' : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        canSee ? 'bg-blue-500/20' : 'bg-red-500/20'
                      }`}>
                        <Briefcase className={`w-4 h-4 ${canSee ? 'text-blue-400' : 'text-red-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium text-sm truncate ${canSee ? 'text-white' : 'text-red-400'}`}>
                          {consultant.name}
                        </p>
                        <p className="text-slate-500 text-xs truncate">{consultant.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canSee ? (
                        <Eye className="w-4 h-4 text-lime-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-red-400" />
                      )}
                      <Switch
                        checked={canSee}
                        onCheckedChange={(checked) => {
                          toggleConsultantUserVisibility.mutate({
                            consultantId: consultant.id,
                            userEmail: selectedUser.email,
                            shouldBeVisible: checked
                          });
                        }}
                        className="data-[state=checked]:bg-lime-400 data-[state=unchecked]:bg-red-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista principale: zona selezionata con due tab (Consulenti / Utenti)
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        {/* Header con zona */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedZone('')}
              className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div>
              <p className="text-white font-bold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-lime-400" />
                {selectedZone}
              </p>
              <p className="text-slate-400 text-xs">
                {zoneConsultants.length} consulenti • {zoneUsers.length} utenti
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="consultants" className="w-full">
          <TabsList className="w-full bg-slate-900 border border-slate-700 mb-4 grid grid-cols-2">
            <TabsTrigger 
              value="consultants" 
              className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Briefcase className="w-3 h-3 mr-1" />
              Consulenti ({zoneConsultants.length})
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="text-xs data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900"
            >
              <Users className="w-3 h-3 mr-1" />
              Utenti ({zoneUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB CONSULENTI */}
          <TabsContent value="consultants" className="space-y-2">
            <p className="text-slate-400 text-xs mb-2">
              Clicca su un consulente per gestire quali utenti possono vederlo.
            </p>
            {zoneConsultants.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Nessun consulente in questa zona</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {zoneConsultants.map(consultant => {
                  const blockedCount = getBlockedUsersCount(consultant.id);
                  return (
                    <div
                      key={consultant.id}
                      onClick={() => setSelectedConsultant(consultant)}
                      className="flex items-center justify-between bg-slate-900 rounded-lg p-3 cursor-pointer hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm truncate">{consultant.name}</p>
                          <p className="text-slate-500 text-xs truncate">{consultant.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {blockedCount > 0 ? (
                          <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            {blockedCount} bloccati
                          </Badge>
                        ) : (
                          <Badge className="bg-lime-400/20 text-lime-400 border-0 text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Tutti
                          </Badge>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB UTENTI */}
          <TabsContent value="users" className="space-y-2">
            <p className="text-slate-400 text-xs mb-2">
              Clicca su un utente per gestire quali consulenti può vedere.
            </p>
            {zoneUsers.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Nessun utente in questa zona</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {zoneUsers.map(user => {
                  const blockedCount = getBlockedConsultantsCount(user.email);
                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center justify-between bg-slate-900 rounded-lg p-3 cursor-pointer hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-lime-400/20 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-lime-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {user.company_name || user.full_name}
                          </p>
                          <p className="text-slate-500 text-xs truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {blockedCount > 0 ? (
                          <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            {blockedCount} bloccati
                          </Badge>
                        ) : (
                          <Badge className="bg-lime-400/20 text-lime-400 border-0 text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Tutti
                          </Badge>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}