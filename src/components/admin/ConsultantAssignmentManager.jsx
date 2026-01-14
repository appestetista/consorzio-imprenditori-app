import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Edit, Save, X } from 'lucide-react';

export default function ConsultantAssignmentManager() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAssignments, setEditingAssignments] = useState({});
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.filter({ role: 'user' })
  });

  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants'],
    queryFn: () => base44.entities.Consultant.list()
  });

  const { data: assignments = [], refetch: refetchAssignments } = useQuery({
    queryKey: ['assignments', selectedUser?.email],
    queryFn: () => base44.entities.ConsultantAssignment.filter({ user_email: selectedUser.email }),
    enabled: !!selectedUser
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ConsultantAssignment.create(data);
      await recalculateTotalConsultations(data.user_email);
    },
    onSuccess: () => {
      refetchAssignments();
    }
  });

  const recalculateTotalConsultations = async (userEmail) => {
    const allAssignments = await base44.entities.ConsultantAssignment.filter({ 
      user_email: userEmail,
      is_assigned: true 
    });
    const total = allAssignments.reduce((sum, a) => sum + (a.available_consultations || 0), 0);
    
    const users = await base44.entities.User.filter({ email: userEmail });
    if (users.length > 0) {
      await base44.entities.User.update(users[0].id, {
        consulenze_gratuite_totali: total
      });
    }
  };

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, data, userEmail }) => {
      await base44.entities.ConsultantAssignment.update(id, data);
      await recalculateTotalConsultations(userEmail);
    },
    onSuccess: () => {
      refetchAssignments();
      setEditingAssignments({});
    }
  });

  const initializeUserAssignments = async (userEmail) => {
    // Crea assegnazioni per tutti i consulenti se non esistono
    const existingAssignments = await base44.entities.ConsultantAssignment.filter({ user_email: userEmail });
    const existingConsultantIds = existingAssignments.map(a => a.consultant_id);
    
    for (const consultant of consultants) {
      if (!existingConsultantIds.includes(consultant.id)) {
        await createAssignmentMutation.mutateAsync({
          user_email: userEmail,
          consultant_id: consultant.id,
          available_consultations: 1,
          is_assigned: true
        });
      }
    }
  };

  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    setEditingAssignments({});
    
    // Inizializza le assegnazioni se necessario
    await initializeUserAssignments(user.email);
  };

  const handleToggleAssignment = async (consultantId) => {
    const assignment = assignments.find(a => a.consultant_id === consultantId);
    
    if (assignment) {
      await updateAssignmentMutation.mutateAsync({
        id: assignment.id,
        data: { is_assigned: !assignment.is_assigned },
        userEmail: selectedUser.email
      });
    } else {
      await createAssignmentMutation.mutateAsync({
        user_email: selectedUser.email,
        consultant_id: consultantId,
        available_consultations: 1,
        is_assigned: true
      });
    }
  };

  const handleUpdateConsultations = async (assignmentId, value) => {
    await updateAssignmentMutation.mutateAsync({
      id: assignmentId,
      data: { available_consultations: parseInt(value) || 0 },
      userEmail: selectedUser.email
    });
  };

  const filteredUsers = users.filter(u => 
    u.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lime-400">Gestione Assegnazioni Consulenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Cerca membro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900 border-lime-400/30 text-white"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
              >
                <p className="text-white font-medium">{user.company_name || user.full_name}</p>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-slate-900 border-lime-400/30 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lime-400">
              Consulenti per {selectedUser?.company_name || selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {consultants.map((consultant) => {
              const assignment = assignments.find(a => a.consultant_id === consultant.id);
              const isAssigned = assignment?.is_assigned ?? false;
              const consultations = assignment?.available_consultations ?? 1;

              return (
                <div key={consultant.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={() => handleToggleAssignment(consultant.id)}
                  />
                  
                  <div className="flex-1">
                    <p className="text-white font-medium">{consultant.name}</p>
                    <p className="text-slate-400 text-sm">{consultant.category}</p>
                  </div>

                  {isAssigned && (
                    <div className="flex items-center gap-2">
                      {editingAssignments[consultant.id] ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            value={editingAssignments[consultant.id]}
                            onChange={(e) => setEditingAssignments(prev => ({
                              ...prev,
                              [consultant.id]: e.target.value
                            }))}
                            className="w-20 bg-slate-900 border-lime-400/30 text-white"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              handleUpdateConsultations(assignment.id, editingAssignments[consultant.id]);
                            }}
                            className="bg-lime-400 hover:bg-lime-500 text-slate-900"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingAssignments(prev => {
                              const newState = { ...prev };
                              delete newState[consultant.id];
                              return newState;
                            })}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-lime-400 font-bold text-lg">{consultations}</span>
                          <span className="text-slate-400 text-sm">consulenze</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingAssignments(prev => ({
                              ...prev,
                              [consultant.id]: consultations
                            }))}
                          >
                            <Edit className="w-4 h-4 text-lime-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}