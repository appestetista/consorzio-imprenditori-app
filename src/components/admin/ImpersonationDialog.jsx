import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Eye, User, Briefcase } from 'lucide-react';

export default function ImpersonationDialog({ open, onClose, onStart }) {
  const [selectedRole, setSelectedRole] = useState('user');
  const [selectedTarget, setSelectedTarget] = useState(null);

  // Fetch utenti - sempre fresco quando si apre il dialog
  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['all-users-impersonation'],
    queryFn: () => base44.entities.User.list(),
    enabled: open && selectedRole === 'user',
    staleTime: 0, // Sempre considerato stale
    refetchOnMount: 'always',
  });

  // Forza refetch quando si apre il dialog
  React.useEffect(() => {
    if (open && selectedRole === 'user') {
      refetchUsers();
    }
  }, [open, selectedRole]);

  // Fetch consulenti - sempre fresco quando si apre il dialog
  const { data: consultants = [], refetch: refetchConsultants } = useQuery({
    queryKey: ['all-consultants-impersonation'],
    queryFn: () => base44.entities.Consultant.list(),
    enabled: open && selectedRole === 'consulente',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Forza refetch quando si apre il dialog per consulenti
  React.useEffect(() => {
    if (open && selectedRole === 'consulente') {
      refetchConsultants();
    }
  }, [open, selectedRole]);

  const handleStart = async () => {
    if (!selectedTarget) return;

    const list = selectedRole === 'user' ? users : consultants;
    const target = list.find(item => item.id === selectedTarget);

    if (target) {
      const targetName = selectedRole === 'user' 
        ? (target.company_name || target.full_name || target.email)
        : target.name;

      await onStart(selectedRole, target.id, target.email || null, targetName, target);
      onClose();
      setSelectedTarget(null);
    }
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setSelectedTarget(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-lime-400 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Visualizza come...
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Seleziona Ruolo</label>
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Utente
                  </span>
                </SelectItem>
                <SelectItem value="consulente">
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Consulente
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRole === 'user' && (
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Seleziona Utente</label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Scegli un utente..." />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== 'admin').map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.company_name || user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedRole === 'consulente' && (
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Seleziona Consulente</label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Scegli un consulente..." />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map(consultant => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              Annulla
            </Button>
            <Button
              onClick={handleStart}
              disabled={!selectedTarget}
              className="flex-1 bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              Avvia Visualizzazione
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}