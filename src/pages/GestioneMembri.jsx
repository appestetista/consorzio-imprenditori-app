import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Lock, Unlock, Trash2, Settings, Search, Shield, ShieldOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const PERMISSIONS_LIST = [
  { key: 'calendario', label: 'Calendario Incontri' },
  { key: 'video_interviste', label: 'Video Interviste' },
  { key: 'consulenze', label: 'Consulenze' },
  { key: 'contatta_membri', label: 'Contatta Membri' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'risparmio_energetico', label: 'Risparmio Energetico' }
];

export default function GestioneMembri() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl('Home'));
          return;
        }
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, [navigate]);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['all-members'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ memberId, isBlocked }) => {
      return base44.entities.User.update(memberId, { is_blocked: !isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ memberId, permissions }) => {
      return base44.entities.User.update(memberId, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      setShowPermissions(false);
      setSelectedMember(null);
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      return base44.entities.User.delete(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
    }
  });

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.company_name?.toLowerCase().includes(searchLower) ||
      member.full_name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  const handlePermissionChange = (key, value) => {
    if (!selectedMember) return;
    const currentPermissions = selectedMember.permissions || {};
    setSelectedMember({
      ...selectedMember,
      permissions: {
        ...currentPermissions,
        [key]: value
      }
    });
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('AdminPanel')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Gestione Membri</h1>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Cerca membri..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white pl-10"
          />
        </div>

        {/* Members List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      member.is_blocked ? 'bg-red-500/20' : 'bg-lime-400/20'
                    }`}>
                      <User className={`w-6 h-6 ${member.is_blocked ? 'text-red-400' : 'text-lime-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium truncate">
                          {member.company_name || member.full_name || 'N/A'}
                        </p>
                        {member.role === 'admin' && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {member.is_blocked && (
                          <Badge className="bg-red-500/20 text-red-400 border-0">
                            Bloccato
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm truncate">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className={member.is_blocked 
                        ? 'flex-1 border-green-600 text-green-400 hover:bg-green-600/20'
                        : 'flex-1 border-red-600 text-red-400 hover:bg-red-600/20'}
                      onClick={() => toggleBlockMutation.mutate({ memberId: member.id, isBlocked: member.is_blocked })}
                      disabled={toggleBlockMutation.isPending}
                    >
                      {member.is_blocked ? (
                        <>
                          <Unlock className="w-4 h-4 mr-1" />
                          Sblocca
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-1" />
                          Blocca
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      onClick={() => {
                        setSelectedMember(member);
                        setShowPermissions(true);
                      }}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Eliminare questo membro?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Questa azione non può essere annullata. Il membro verrà rimosso permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMemberMutation.mutate(member.id)}
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Permissions Dialog */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Permessi - {selectedMember?.company_name || selectedMember?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {PERMISSIONS_LIST.map((perm) => {
              const isEnabled = selectedMember?.permissions?.[perm.key] !== false;
              return (
                <div key={perm.key} className="flex items-center justify-between">
                  <Label className="text-slate-300">{perm.label}</Label>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handlePermissionChange(perm.key, checked)}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => updatePermissionsMutation.mutate({ 
                memberId: selectedMember.id, 
                permissions: selectedMember.permissions 
              })}
              disabled={updatePermissionsMutation.isPending}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {updatePermissionsMutation.isPending ? 'Salvataggio...' : 'Salva Permessi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="GestioneMembri" unreadMessages={messages.length} />
    </div>
  );
}