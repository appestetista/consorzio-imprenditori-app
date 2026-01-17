import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Search, ChevronRight, Building2, Check, X, UserCheck
} from 'lucide-react';

export default function ConsultantAssignmentManager() {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch utenti (solo ruolo 'user')
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.filter({ role: 'user' })
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

  // Toggle assegnazione
  const toggleAssignmentMutation = useMutation({
    mutationFn: async ({ consultantId, userEmail, isCurrentlyAssigned, assignmentId }) => {
      if (isCurrentlyAssigned && assignmentId) {
        // Rimuovi
        await base44.entities.ConsultantAssignment.update(assignmentId, { is_assigned: false });
      } else if (assignmentId) {
        // Riattiva
        await base44.entities.ConsultantAssignment.update(assignmentId, { is_assigned: true });
      } else {
        // Crea nuovo
        await base44.entities.ConsultantAssignment.create({
          consultant_id: consultantId,
          user_email: userEmail,
          available_consultations: 1,
          is_assigned: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-assignments'] });
    }
  });

  // Filtra utenti escludendo pinko pallino
  const filteredUsers = users
    .filter(u => 
      !u.full_name?.toLowerCase().includes('pinko pallino') && 
      !u.company_name?.toLowerCase().includes('pinko pallino')
    )
    .filter(u =>
      u.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Conta consulenti assegnati per azienda
  const getAssignedCount = (userEmail) => {
    return allAssignments.filter(a => a.user_email === userEmail && a.is_assigned).length;
  };

  // Ottieni assegnazione per consulente/utente
  const getAssignment = (consultantId, userEmail) => {
    return allAssignments.find(a => a.consultant_id === consultantId && a.user_email === userEmail);
  };

  // Raggruppa consulenti per categoria
  const consultantsByCategory = consultants.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  // Vista lista aziende
  if (!selectedCompany) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-lime-400" />
            <h3 className="text-white font-medium text-sm">Assegna Consulenti</h3>
          </div>

          {/* Ricerca */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Cerca azienda o città..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white h-10 text-sm"
            />
          </div>

          {/* Lista aziende */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {filteredUsers.map((user) => {
              const assignedCount = getAssignedCount(user.email);
              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedCompany(user)}
                  className="flex items-center justify-between bg-slate-900 rounded-xl p-3 active:bg-slate-700 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-lime-400/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-lime-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {user.company_name || user.full_name}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        {user.city || 'Città non specificata'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignedCount > 0 ? (
                      <Badge className="bg-lime-400 text-slate-900 text-xs font-bold">
                        {assignedCount}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-700 text-slate-400 text-xs">
                        0
                      </Badge>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista dettaglio azienda con switch consulenti
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-3">
        {/* Header con back */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setSelectedCompany(null)}
            className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm truncate">
              {selectedCompany.company_name || selectedCompany.full_name}
            </p>
            <p className="text-slate-500 text-xs">
              {selectedCompany.city || selectedCompany.email}
            </p>
          </div>
        </div>

        {/* Lista consulenti per categoria */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {Object.entries(consultantsByCategory).map(([category, categoryConsultants]) => (
            <div key={category}>
              <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">
                {category}
              </p>
              <div className="space-y-2">
                {categoryConsultants.map((consultant) => {
                  const assignment = getAssignment(consultant.id, selectedCompany.email);
                  const isAssigned = assignment?.is_assigned ?? false;

                  return (
                    <div
                      key={consultant.id}
                      className={`flex items-center justify-between rounded-xl p-3 transition-colors ${
                        isAssigned ? 'bg-lime-400/10 border border-lime-400/30' : 'bg-slate-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium text-sm ${isAssigned ? 'text-lime-400' : 'text-white'}`}>
                          {consultant.name}
                        </p>
                        {consultant.referente && (
                          <p className="text-slate-500 text-xs truncate">
                            Ref: {consultant.referente}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={isAssigned}
                        onCheckedChange={() => {
                          toggleAssignmentMutation.mutate({
                            consultantId: consultant.id,
                            userEmail: selectedCompany.email,
                            isCurrentlyAssigned: isAssigned,
                            assignmentId: assignment?.id
                          });
                        }}
                        className="data-[state=checked]:bg-lime-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Riepilogo */}
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">Consulenti assegnati</p>
            <p className="text-lime-400 font-bold text-lg">
              {getAssignedCount(selectedCompany.email)} / {consultants.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}