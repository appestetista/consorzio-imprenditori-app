import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Loader2, Trash2, Search, CheckCircle, Clock } from 'lucide-react';

const ZONE_OPTIONS = [
  'PROVINCIA DI PESARO',
  'PROVINCIA DI ANCONA', 
  'PROVINCIA DI MACERATA',
  'PROVINCIA DI FERMO',
  'PROVINCIA DI ASCOLI PICENO'
];

export default function PreAuthEmailForm({ zones = [], onSuccess }) {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('utente');
  const [zona, setZona] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterZona, setFilterZona] = useState('all');
  const queryClient = useQueryClient();

  const { data: pendingInvites = [], isLoading } = useQuery({
    queryKey: ['pending-invites'],
    queryFn: () => base44.entities.PendingInvite.list('-created_date'),
  });

  const addEmailMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PendingInvite.create({
        email: data.email.toLowerCase().trim(),
        user_type: data.userType,
        zona: data.zona || null,
        is_registered: false,
        invited_by: 'pre-auth'
      });
    },
    onSuccess: () => {
      toast.success('Email autorizzata aggiunta con successo');
      setEmail('');
      setZona('');
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Errore: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingInvite.delete(id),
    onSuccess: () => {
      toast.success('Email rimossa');
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    },
    onError: () => toast.error('Errore nella rimozione')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Inserisci una email');
      return;
    }
    addEmailMutation.mutate({ email, userType, zona });
  };

  const filteredInvites = pendingInvites.filter(invite => {
    const matchesSearch = !searchTerm || 
      invite.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.zona?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || invite.user_type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'registered' && invite.is_registered) ||
      (filterStatus === 'pending' && !invite.is_registered);
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Form aggiungi */}
      <form onSubmit={handleSubmit} className="space-y-3 pb-4 border-b border-slate-700">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-slate-300 text-xs">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@esempio.com"
              className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Tipo</Label>
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utente">Membro</SelectItem>
                <SelectItem value="consulente">Consulente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={zona} onValueChange={setZona}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-8 text-xs flex-1">
              <SelectValue placeholder="Zona (opzionale)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Nessuna zona</SelectItem>
              {(zones.length > 0 ? zones.map(z => z.name) : ZONE_OPTIONS).map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            type="submit" 
            disabled={addEmailMutation.isPending}
            className="bg-lime-400 hover:bg-lime-500 text-slate-900 h-8 text-xs"
          >
            {addEmailMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
          </Button>
        </div>
      </form>

      {/* Filtri */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca email o zona..."
            className="bg-slate-900 border-slate-700 text-white h-8 text-xs pl-7"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="utente">Membri</SelectItem>
              <SelectItem value="consulente">Consulenti</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">In attesa</SelectItem>
              <SelectItem value="registered">Registrati</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista email */}
      <div className="max-h-64 overflow-y-auto space-y-1">
        {isLoading ? (
          <div className="text-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-lime-400 mx-auto" />
          </div>
        ) : filteredInvites.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-4">Nessuna email trovata</p>
        ) : (
          filteredInvites.map((invite) => (
            <div key={invite.id} className="bg-slate-900 rounded p-2 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  {invite.is_registered ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                  <p className="text-white text-xs truncate">{invite.email}</p>
                </div>
                <div className="flex gap-2 text-[10px] text-slate-400">
                  <span className={invite.user_type === 'consulente' ? 'text-blue-400' : 'text-lime-400'}>
                    {invite.user_type === 'consulente' ? 'Consulente' : 'Membro'}
                  </span>
                  {invite.zona && <span>• {invite.zona}</span>}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                onClick={() => deleteMutation.mutate(invite.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </div>
      <p className="text-slate-500 text-[10px] text-center">
        {filteredInvites.length} email {filterStatus === 'all' ? '' : filterStatus === 'registered' ? 'registrate' : 'in attesa'}
      </p>
    </div>
  );
}