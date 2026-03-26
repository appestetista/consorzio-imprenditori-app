import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, MessageSquare, Search, Filter, Lock, Unlock, Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import ContattaMembri from '../pages/ContattaMembri';
import AdminGuard from '../components/admin/AdminGuard';

export default function ContattaMembriAdmin() {
  return (
    <AdminGuard>
      {(user) => <ContattaMembriAdminContent user={user} />}
    </AdminGuard>
  );
}

function ContattaMembriAdminContent({ user }) {
  const [activeTab, setActiveTab] = useState('gestione');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ userId, isBlocked }) => {
      await base44.entities.User.update(userId, { is_blocked: !isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    }
  });

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && !u.is_blocked) ||
      (statusFilter === 'blocked' && u.is_blocked);
    
    const matchesRole = 
      roleFilter === 'all' || u.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('AdminPanel')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-lime-400" />
            Utenti
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-b border-slate-700">
            <TabsTrigger 
              value="contatta"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-lime-400 text-slate-400"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contatta
            </TabsTrigger>
            <TabsTrigger 
              value="gestione"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-lime-400 text-slate-400"
            >
              <Users className="w-4 h-4 mr-2" />
              Gestione
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contatta" className="mt-6">
            <ContattaMembri isAdminView={true} />
          </TabsContent>

          <TabsContent value="gestione" className="mt-6">
            {/* Search and Filters */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cerca per nome, email, azienda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white pl-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="active">Attivi</SelectItem>
                    <SelectItem value="blocked">Bloccati</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <Users className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i ruoli</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="consulente">Consulente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Users List */}
            <div className="space-y-3">
              <p className="text-slate-400 text-sm">
                {filteredUsers.length} utent{filteredUsers.length !== 1 ? 'i' : 'e'} trovat{filteredUsers.length !== 1 ? 'i' : 'o'}
              </p>

              {filteredUsers.map((u) => (
                <Card key={u.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium truncate">
                            {u.company_name || u.full_name || 'Senza nome'}
                          </p>
                          {u.is_blocked && (
                            <Badge variant="destructive" className="bg-red-600 text-white text-xs">
                              Bloccato
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm truncate">{u.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {u.role === 'admin' ? 'Admin' : u.role === 'consulente' ? 'Consulente' : 'User'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-900 hover:bg-slate-700 text-lime-400 border-lime-400/30"
                          onClick={() => {
                            setSelectedUser(u);
                            setShowUserDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`${
                            u.is_blocked 
                              ? 'bg-green-900/20 hover:bg-green-900/30 text-green-400 border-green-400/30' 
                              : 'bg-red-900/20 hover:bg-red-900/30 text-red-400 border-red-400/30'
                          }`}
                          onClick={() => toggleBlockMutation.mutate({ userId: u.id, isBlocked: u.is_blocked })}
                          disabled={toggleBlockMutation.isPending}
                        >
                          {u.is_blocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav currentPage="AdminPanel" />

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span>Dettagli Utente</span>
              <button
                onClick={() => setShowUserDetails(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-slate-400 text-xs mb-1">Nome Completo</p>
                <p className="text-white">{selectedUser.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Email</p>
                <p className="text-white">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Azienda</p>
                <p className="text-white">{selectedUser.company_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Ruolo</p>
                <Badge variant="outline">
                  {selectedUser.role === 'admin' ? 'Amministratore' : selectedUser.role === 'consulente' ? 'Consulente' : 'Utente'}
                </Badge>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Telefono</p>
                <p className="text-white">{selectedUser.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Indirizzo</p>
                <p className="text-white">{selectedUser.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Città</p>
                <p className="text-white">{selectedUser.city || 'N/A'} {selectedUser.province ? `(${selectedUser.province})` : ''}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">P.IVA</p>
                <p className="text-white">{selectedUser.vat_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Stato Account</p>
                <Badge variant={selectedUser.is_blocked ? "destructive" : "default"} className={selectedUser.is_blocked ? "bg-red-600" : "bg-green-600"}>
                  {selectedUser.is_blocked ? 'Bloccato' : 'Attivo'}
                </Badge>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Registrato il</p>
                <p className="text-white text-sm">{new Date(selectedUser.created_date).toLocaleDateString('it-IT')}</p>
              </div>

              <Button
                className={`w-full ${
                  selectedUser.is_blocked 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
                onClick={() => {
                  toggleBlockMutation.mutate({ userId: selectedUser.id, isBlocked: selectedUser.is_blocked });
                  setShowUserDetails(false);
                }}
              >
                {selectedUser.is_blocked ? (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Sblocca Utente
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Blocca Utente
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}