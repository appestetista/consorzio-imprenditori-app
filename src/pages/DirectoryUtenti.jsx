import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, User, Building2, MapPin, Mail, Phone, Shield, ShieldOff, Eye, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

export default function DirectoryUtenti() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToToggle, setUserToToggle] = useState(null);
  const queryClient = useQueryClient();

  // Carica utente corrente
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  // Carica tutti gli utenti
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      console.log('[DirectoryUtenti] Utenti caricati:', allUsers.length, allUsers.map(u => ({ id: u.id, email: u.email, company_name: u.company_name })));
      return allUsers;
    },
    enabled: currentUser?.role === 'admin',
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Mutation per bloccare/sbloccare utente
  const toggleBlockMutation = useMutation({
    mutationFn: async ({ userId, isBlocked }) => {
      await base44.entities.User.update(userId, { is_blocked: isBlocked });
    },
    onSuccess: (_, { isBlocked }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      toast.success(isBlocked ? 'Utente bloccato' : 'Utente sbloccato');
      setUserToToggle(null);
    },
    onError: () => {
      toast.error('Errore durante l\'operazione');
    }
  });

  // Filtra utenti
  const filteredUsers = React.useMemo(() => {
    if (!searchTerm) return users;
    const search = searchTerm.toLowerCase();
    return users.filter(user =>
      user.full_name?.toLowerCase().includes(search) ||
      user.company_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.city?.toLowerCase().includes(search)
    );
  }, [users, searchTerm]);

  // Separa admin e utenti normali
  const adminUsers = filteredUsers.filter(u => u.role === 'admin');
  const normalUsers = filteredUsers.filter(u => u.role !== 'admin');

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg">Accesso riservato agli amministratori</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={currentUser} />

      <main className="px-4 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('AdminPanel')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Directory Utenti</h1>
          <Badge className="bg-lime-400/20 text-lime-400 ml-auto">
            {users.length} utenti
          </Badge>
        </div>

        {/* Ricerca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Cerca per nome, azienda, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Admin */}
            {adminUsers.length > 0 && (
              <div>
                <h2 className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Amministratori ({adminUsers.length})
                </h2>
                <div className="space-y-2">
                  {adminUsers.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onView={() => setSelectedUser(user)}
                      onToggleBlock={() => setUserToToggle(user)}
                      isCurrentUser={user.email === currentUser?.email}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Utenti normali */}
            <div>
              <h2 className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Membri ({normalUsers.length})
              </h2>
              {normalUsers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Nessun utente trovato</p>
              ) : (
                <div className="space-y-2">
                  {normalUsers.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onView={() => setSelectedUser(user)}
                      onToggleBlock={() => setUserToToggle(user)}
                      isCurrentUser={user.email === currentUser?.email}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <BottomNav currentPage="DirectoryUtenti" />

      {/* Dialog dettagli utente */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              {selectedUser?.logo_url ? (
                <img src={selectedUser.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-slate-500" />
                </div>
              )}
              <div>
                <p>{selectedUser?.company_name || selectedUser?.full_name || 'Utente'}</p>
                {selectedUser?.role === 'admin' && (
                  <Badge className="bg-amber-400/20 text-amber-400 text-xs">Admin</Badge>
                )}
                {selectedUser?.is_blocked && (
                  <Badge className="bg-red-500/20 text-red-400 text-xs ml-1">Bloccato</Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem icon={User} label="Nome" value={selectedUser.full_name} />
                <InfoItem icon={Building2} label="Azienda" value={selectedUser.company_name} />
                <InfoItem icon={Mail} label="Email" value={selectedUser.email} />
                <InfoItem icon={Phone} label="Telefono" value={selectedUser.phone} />
                <InfoItem icon={MapPin} label="Città" value={selectedUser.city} />
                <InfoItem label="Provincia" value={selectedUser.province} />
                <InfoItem label="Settore" value={selectedUser.business_sector} />
                <InfoItem label="Referente" value={selectedUser.referente} />
              </div>

              {selectedUser.partita_iva && (
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-xs">Partita IVA</p>
                  <p className="text-white">{selectedUser.partita_iva}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setSelectedUser(null)}
              className="border-slate-600 text-slate-300"
            >
              Chiudi
            </Button>
            {selectedUser?.email !== currentUser?.email && (
              <Button
                onClick={() => {
                  setUserToToggle(selectedUser);
                  setSelectedUser(null);
                }}
                className={selectedUser?.is_blocked 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
                }
              >
                {selectedUser?.is_blocked ? (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sblocca
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-4 h-4 mr-2" />
                    Blocca
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conferma blocco/sblocco */}
      <AlertDialog open={!!userToToggle} onOpenChange={() => setUserToToggle(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {userToToggle?.is_blocked ? 'Sblocca utente?' : 'Blocca utente?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {userToToggle?.is_blocked
                ? `Vuoi sbloccare ${userToToggle?.company_name || userToToggle?.full_name}? L'utente potrà accedere nuovamente all'app.`
                : `Vuoi bloccare ${userToToggle?.company_name || userToToggle?.full_name}? L'utente non potrà più accedere all'app.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleBlockMutation.mutate({
                userId: userToToggle.id,
                isBlocked: !userToToggle.is_blocked
              })}
              disabled={toggleBlockMutation.isPending}
              className={userToToggle?.is_blocked
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
              }
            >
              {toggleBlockMutation.isPending ? 'Attendere...' : (userToToggle?.is_blocked ? 'Sblocca' : 'Blocca')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserCard({ user, onView, onToggleBlock, isCurrentUser }) {
  return (
    <Card className="bg-slate-800 border-slate-700 p-4">
      <div className="flex items-center gap-3">
        {user.logo_url ? (
          <img src={user.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-slate-500" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium truncate">
              {user.company_name || user.full_name || 'Utente'}
            </p>
            {user.role === 'admin' && (
              <Badge className="bg-amber-400/20 text-amber-400 text-xs">Admin</Badge>
            )}
            {user.is_blocked && (
              <Badge className="bg-red-500/20 text-red-400 text-xs">Bloccato</Badge>
            )}
            {isCurrentUser && (
              <Badge className="bg-lime-400/20 text-lime-400 text-xs">Tu</Badge>
            )}
          </div>
          <p className="text-slate-400 text-sm truncate">{user.email}</p>
          {user.city && (
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {user.city}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onView}
            className="text-slate-400 hover:text-lime-400 hover:bg-slate-700"
          >
            <Eye className="w-5 h-5" />
          </Button>
          {!isCurrentUser && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleBlock}
              className={user.is_blocked 
                ? "text-green-400 hover:text-green-300 hover:bg-slate-700"
                : "text-slate-400 hover:text-red-400 hover:bg-slate-700"
              }
            >
              {user.is_blocked ? <Shield className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-slate-400 text-xs flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className="text-white text-sm">{value}</p>
    </div>
  );
}