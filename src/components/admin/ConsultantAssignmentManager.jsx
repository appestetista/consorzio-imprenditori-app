import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, ChevronDown, ChevronUp, Plus, X, Users, Building2, 
  CheckCircle, Minus, UserPlus 
} from 'lucide-react';

export default function ConsultantAssignmentManager() {
  const [expandedConsultant, setExpandedConsultant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
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

  // Crea assegnazione
  const createAssignmentMutation = useMutation({
    mutationFn: async ({ consultant_id, user_email }) => {
      await base44.entities.ConsultantAssignment.create({
        consultant_id,
        user_email,
        available_consultations: 1,
        is_assigned: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-assignments'] });
    }
  });

  // Rimuovi assegnazione
  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId) => {
      await base44.entities.ConsultantAssignment.delete(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-assignments'] });
    }
  });

  // Ottieni aziende assegnate a un consulente
  const getAssignedCompanies = (consultantId) => {
    const assignments = allAssignments.filter(a => a.consultant_id === consultantId && a.is_assigned);
    return assignments.map(a => {
      const user = users.find(u => u.email === a.user_email);
      return { ...a, user };
    }).filter(a => a.user);
  };

  // Ottieni aziende NON assegnate a un consulente
  const getUnassignedCompanies = (consultantId) => {
    const assignedEmails = allAssignments
      .filter(a => a.consultant_id === consultantId && a.is_assigned)
      .map(a => a.user_email);
    
    return users.filter(u => !assignedEmails.includes(u.email));
  };

  // Filtra consulenti
  const filteredConsultants = consultants.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apri dialog per assegnare aziende
  const openAssignDialog = (consultant) => {
    setSelectedConsultant(consultant);
    setAssignSearchTerm('');
    setShowAssignDialog(true);
  };

  // Assegna azienda
  const handleAssign = async (userEmail) => {
    await createAssignmentMutation.mutateAsync({
      consultant_id: selectedConsultant.id,
      user_email: userEmail
    });
  };

  // Rimuovi assegnazione
  const handleRemove = async (assignmentId) => {
    await removeAssignmentMutation.mutateAsync(assignmentId);
  };

  // Aziende filtrate per dialog
  const unassignedForDialog = selectedConsultant 
    ? getUnassignedCompanies(selectedConsultant.id).filter(u =>
        u.company_name?.toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(assignSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(assignSearchTerm.toLowerCase())
      )
    : [];

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lime-400 text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Assegnazione Consulenti
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Ricerca consulenti */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Cerca consulente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white h-9 text-sm"
            />
          </div>

          {/* Lista consulenti */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredConsultants.map((consultant) => {
              const assignedCompanies = getAssignedCompanies(consultant.id);
              const isExpanded = expandedConsultant === consultant.id;

              return (
                <div key={consultant.id} className="bg-slate-900 rounded-lg overflow-hidden">
                  {/* Header consulente */}
                  <div 
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50"
                    onClick={() => setExpandedConsultant(isExpanded ? null : consultant.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{consultant.name}</p>
                        <Badge className="bg-slate-700 text-slate-300 text-[10px] border-0">
                          {assignedCompanies.length}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-xs truncate">{consultant.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-lime-400 hover:bg-lime-400/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignDialog(consultant);
                        }}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Lista aziende assegnate (espandibile) */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 p-2 bg-slate-800/30">
                      {assignedCompanies.length === 0 ? (
                        <p className="text-slate-500 text-xs text-center py-2">
                          Nessuna azienda assegnata
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {assignedCompanies.map((assignment) => (
                            <div 
                              key={assignment.id} 
                              className="flex items-center justify-between bg-slate-900 rounded px-2 py-1.5"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Building2 className="w-3.5 h-3.5 text-lime-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-white text-xs truncate">
                                    {assignment.user?.company_name || assignment.user?.full_name}
                                  </p>
                                  <p className="text-slate-500 text-[10px] truncate">
                                    {assignment.user?.city || assignment.user?.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge className="bg-lime-400/20 text-lime-400 text-[10px] border-0">
                                  {assignment.available_consultations} cons.
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-400 hover:bg-red-400/20"
                                  onClick={() => handleRemove(assignment.id)}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Pulsante aggiungi rapido */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full mt-2 h-7 text-xs text-lime-400 hover:bg-lime-400/20 border border-dashed border-lime-400/30"
                        onClick={() => openAssignDialog(consultant)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Aggiungi azienda
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Assegna Aziende */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-lime-400 text-base">
              Assegna a {selectedConsultant?.name}
            </DialogTitle>
            <p className="text-slate-400 text-xs">{selectedConsultant?.category}</p>
          </DialogHeader>

          {/* Ricerca aziende */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Cerca azienda..."
              value={assignSearchTerm}
              onChange={(e) => setAssignSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white h-9 text-sm"
              autoFocus
            />
          </div>

          {/* Lista aziende da assegnare */}
          <div className="space-y-1 max-h-[300px] overflow-y-auto mt-2">
            {unassignedForDialog.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">
                {assignSearchTerm ? 'Nessun risultato' : 'Tutte le aziende sono già assegnate'}
              </p>
            ) : (
              unassignedForDialog.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between bg-slate-800 rounded-lg p-2 hover:bg-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      {user.company_name || user.full_name}
                    </p>
                    <p className="text-slate-500 text-xs truncate">
                      {user.city ? `${user.city} • ` : ''}{user.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-lime-400 hover:bg-lime-500 text-slate-900 h-7 text-xs ml-2"
                    onClick={() => handleAssign(user.email)}
                    disabled={createAssignmentMutation.isPending}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Assegna
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Riepilogo aziende già assegnate */}
          {selectedConsultant && (
            <div className="border-t border-slate-700 pt-3 mt-3">
              <p className="text-slate-400 text-xs mb-2">
                Già assegnate: {getAssignedCompanies(selectedConsultant.id).length}
              </p>
              <div className="flex flex-wrap gap-1">
                {getAssignedCompanies(selectedConsultant.id).slice(0, 5).map((a) => (
                  <Badge key={a.id} className="bg-slate-800 text-slate-300 text-[10px] border-0">
                    {a.user?.company_name || a.user?.full_name}
                  </Badge>
                ))}
                {getAssignedCompanies(selectedConsultant.id).length > 5 && (
                  <Badge className="bg-slate-700 text-slate-400 text-[10px] border-0">
                    +{getAssignedCompanies(selectedConsultant.id).length - 5} altre
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}