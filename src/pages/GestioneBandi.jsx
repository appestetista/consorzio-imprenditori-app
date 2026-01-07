import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, Edit, Copy, Archive, Eye, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import BandoStats from '../components/admin/BandoStats';
import BandoForm from '../components/admin/BandoForm';

export default function GestioneBandi() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBando, setEditingBando] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMatchingPreview, setShowMatchingPreview] = useState(false);
  const [selectedBandoForPreview, setSelectedBandoForPreview] = useState(null);
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

  const { data: allGrants = [], isLoading } = useQuery({
    queryKey: ['admin-grants'],
    queryFn: () => base44.entities.FinancialGrant.filter({ is_archived: false }, '-created_date'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-matching'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const createBandoMutation = useMutation({
    mutationFn: async (data) => {
      const newGrant = await base44.entities.FinancialGrant.create({
        ...data,
        created_by_email: user.email,
        last_modified_by_email: user.email
      });
      
      // Invia notifica a tutti gli utenti per il nuovo bando
      const allUsers = await base44.entities.User.list();
      const notificationPromises = allUsers.map(u =>
        base44.entities.Notification.create({
          user_email: u.email,
          type: 'event',
          title: 'Nuovo bando disponibile',
          content: `È stato pubblicato un nuovo bando: ${data.title}`,
          reference_id: newGrant.id
        })
      );
      
      await Promise.all(notificationPromises);
      
      return newGrant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-grants'] });
      setShowForm(false);
      setEditingBando(null);
    }
  });

  const updateBandoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.FinancialGrant.update(id, {
        ...data,
        last_modified_by_email: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-grants'] });
      setShowForm(false);
      setEditingBando(null);
    }
  });

  const archiveBandoMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.FinancialGrant.update(id, { is_archived: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-grants'] });
    }
  });

  const duplicateBandoMutation = useMutation({
    mutationFn: async (bando) => {
      const { id, created_date, updated_date, created_by, ...bandoData } = bando;
      return base44.entities.FinancialGrant.create({
        ...bandoData,
        title: `${bando.title} (Copia)`,
        status: 'In apertura',
        created_by_email: user.email,
        last_modified_by_email: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-grants'] });
    }
  });

  const handleFormSubmit = (data) => {
    if (editingBando) {
      updateBandoMutation.mutate({ id: editingBando.id, data });
    } else {
      createBandoMutation.mutate(data);
    }
  };

  const handleEdit = (bando) => {
    setEditingBando(bando);
    setShowForm(true);
  };

  const handleDuplicate = (bando) => {
    duplicateBandoMutation.mutate(bando);
  };

  const handleArchive = (id) => {
    if (confirm('Archiviare questo bando?')) {
      archiveBandoMutation.mutate(id);
    }
  };

  const getMatchingUsers = (bando) => {
    return allUsers.filter(u => {
      if (bando.eligible_company_sizes?.length > 0 && u.company_size) {
        if (!bando.eligible_company_sizes.includes(u.company_size)) return false;
      }
      if (bando.eligible_regions?.length > 0 && u.region) {
        if (!bando.eligible_regions.includes(u.region)) return false;
      }
      if (bando.eligible_ateco_codes?.length > 0 && u.ateco_code) {
        const hasMatch = bando.eligible_ateco_codes.some(code => 
          u.ateco_code.startsWith(code) || code.startsWith(u.ateco_code.substring(0, 2))
        );
        if (!hasMatch) return false;
      }
      if (bando.eligible_legal_forms?.length > 0 && u.legal_form) {
        if (!bando.eligible_legal_forms.includes(u.legal_form)) return false;
      }
      return true;
    });
  };

  const filteredGrants = allGrants
    .filter(g => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      const searchLower = searchTerm.toLowerCase();
      return g.title?.toLowerCase().includes(searchLower) || 
             g.description?.toLowerCase().includes(searchLower);
    });

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AdminPanel')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-white text-xl font-bold">Gestione Bandi</h1>
              <p className="text-slate-400 text-sm">Pannello amministratore</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingBando(null);
              setShowForm(true);
            }}
            className="bg-lime-400 hover:bg-lime-500 text-slate-900"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Bando
          </Button>
        </div>

        {/* Dashboard Stats */}
        <div className="mb-6">
          <BandoStats grants={allGrants} />
        </div>

        {/* Search and Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cerca bandi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="Aperto">Aperti</SelectItem>
                  <SelectItem value="In apertura">In apertura</SelectItem>
                  <SelectItem value="Chiuso">Chiusi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grants List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredGrants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Nessun bando trovato</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGrants.map((grant) => {
              const matchingUsers = getMatchingUsers(grant);
              const daysUntilDeadline = grant.deadline 
                ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <Card key={grant.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="text-white font-medium">{grant.title}</h3>
                          {grant.easy_access && (
                            <Badge className="bg-lime-400 text-slate-900 text-xs">Attivabile</Badge>
                          )}
                          <Badge className={
                            grant.status === 'Aperto' ? 'bg-green-500' :
                            grant.status === 'In apertura' ? 'bg-yellow-500' : 'bg-red-500'
                          }>
                            {grant.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-slate-400">{grant.ente_erogatore}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{grant.livello}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{grant.grant_type}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-lime-400">{matchingUsers.length} aziende compatibili</span>
                        </div>
                        {daysUntilDeadline !== null && daysUntilDeadline > 0 && daysUntilDeadline <= 30 && (
                          <Alert className="mt-2 bg-orange-500/20 border-orange-500/30 py-2">
                            <AlertDescription className="text-orange-400 text-xs">
                              Scadenza tra {daysUntilDeadline} giorni
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                        onClick={() => handleEdit(grant)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                        onClick={() => {
                          setSelectedBandoForPreview(grant);
                          setShowMatchingPreview(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Anteprima ({matchingUsers.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                        onClick={() => handleDuplicate(grant)}
                        disabled={duplicateBandoMutation.isPending}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Duplica
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400"
                        onClick={() => handleArchive(grant.id)}
                        disabled={archiveBandoMutation.isPending}
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        Archivia
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingBando(null);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingBando ? 'Modifica Bando' : 'Nuovo Bando'}
            </DialogTitle>
          </DialogHeader>
          <BandoForm
            bando={editingBando}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingBando(null);
            }}
            isSubmitting={createBandoMutation.isPending || updateBandoMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Matching Preview Dialog */}
      <Dialog open={showMatchingPreview} onOpenChange={setShowMatchingPreview}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Anteprima Matching: {selectedBandoForPreview?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBandoForPreview && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="text-lime-400 font-medium mb-2">Criteri di Eligibilità</h4>
                <div className="space-y-2 text-sm">
                  {selectedBandoForPreview.eligible_company_sizes?.length > 0 && (
                    <div>
                      <span className="text-slate-400">Dimensioni:</span>
                      <span className="text-white ml-2">{selectedBandoForPreview.eligible_company_sizes.join(', ')}</span>
                    </div>
                  )}
                  {selectedBandoForPreview.eligible_regions?.length > 0 && (
                    <div>
                      <span className="text-slate-400">Regioni:</span>
                      <span className="text-white ml-2">{selectedBandoForPreview.eligible_regions.join(', ')}</span>
                    </div>
                  )}
                  {selectedBandoForPreview.eligible_ateco_codes?.length > 0 && (
                    <div>
                      <span className="text-slate-400">ATECO:</span>
                      <span className="text-white ml-2">{selectedBandoForPreview.eligible_ateco_codes.join(', ')}</span>
                    </div>
                  )}
                  {selectedBandoForPreview.eligible_legal_forms?.length > 0 && (
                    <div>
                      <span className="text-slate-400">Forme giuridiche:</span>
                      <span className="text-white ml-2">{selectedBandoForPreview.eligible_legal_forms.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">
                  Aziende Compatibili ({getMatchingUsers(selectedBandoForPreview).length})
                </h4>
                <div className="space-y-2">
                  {getMatchingUsers(selectedBandoForPreview).length === 0 ? (
                    <Alert className="bg-yellow-500/20 border-yellow-500/30">
                      <AlertDescription className="text-yellow-400 text-sm">
                        Attenzione: nessuna azienda corrisponde ai criteri. Verifica i requisiti.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    getMatchingUsers(selectedBandoForPreview).map((user) => (
                      <div key={user.id} className="bg-slate-700 rounded-lg p-3">
                        <p className="text-white font-medium">{user.company_name || user.full_name}</p>
                        <div className="flex gap-3 text-xs text-slate-400 mt-1">
                          {user.company_size && <span>Dim: {user.company_size}</span>}
                          {user.region && <span>• {user.region}</span>}
                          {user.ateco_code && <span>• ATECO: {user.ateco_code}</span>}
                          {user.legal_form && <span>• {user.legal_form}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="GestioneBandi" unreadMessages={messages.length} />
    </div>
  );
}