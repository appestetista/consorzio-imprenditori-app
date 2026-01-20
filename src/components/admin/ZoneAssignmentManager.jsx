import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, X, Edit2, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Liste predefinite di zone (puoi personalizzarle)
const DEFAULT_ZONES = [
  'Zona Nord',
  'Zona Centro',
  'Zona Sud',
  'Zona Est',
  'Zona Ovest',
  'Milano e Provincia',
  'Roma e Provincia',
  'Napoli e Provincia',
  'Torino e Provincia',
  'Firenze e Provincia'
];

export default function ZoneAssignmentManager() {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [customZone, setCustomZone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-zones'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filtra solo utenti e consulenti (non admin)
  const filteredUsers = allUsers.filter(u => 
    u.role !== 'admin' &&
    (u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterZone === 'all' || 
     (filterZone === 'none' && !u.zona) ||
     u.zona === filterZone)
  );

  // Ottieni lista zone uniche dagli utenti
  const existingZones = [...new Set(allUsers.filter(u => u.zona).map(u => u.zona))];
  const allZones = [...new Set([...DEFAULT_ZONES, ...existingZones])].sort();

  const updateZoneMutation = useMutation({
    mutationFn: async ({ userId, zona }) => {
      await base44.entities.User.update(userId, { zona });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-zones'] });
      setShowAssignDialog(false);
      setSelectedUser(null);
      setSelectedZone('');
      setCustomZone('');
    }
  });

  const handleAssignZone = () => {
    const zoneToAssign = customZone.trim() || selectedZone;
    if (selectedUser && zoneToAssign) {
      updateZoneMutation.mutate({ userId: selectedUser.id, zona: zoneToAssign });
    }
  };

  const handleRemoveZone = (userId) => {
    updateZoneMutation.mutate({ userId, zona: null });
  };

  const getUsersByZone = (zona) => {
    return allUsers.filter(u => u.zona === zona && u.role !== 'admin');
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-lime-400" />
            Gestione Zone
          </h3>
          <Button 
            size="sm" 
            className="bg-lime-400 text-slate-900 h-7 text-xs"
            onClick={() => setShowAssignDialog(true)}
          >
            <Plus className="w-3 h-3 mr-1" /> Assegna
          </Button>
        </div>

        {/* Filtri */}
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Cerca utente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white text-xs h-8 flex-1"
          />
          <Select value={filterZone} onValueChange={setFilterZone}>
            <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs h-8 w-32">
              <SelectValue placeholder="Zona" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">Tutte</SelectItem>
              <SelectItem value="none" className="text-white">Senza zona</SelectItem>
              {allZones.map(zona => (
                <SelectItem key={zona} value={zona} className="text-white">{zona}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Riepilogo zone */}
        <div className="flex flex-wrap gap-1 mb-3">
          {allZones.slice(0, 5).map(zona => {
            const count = getUsersByZone(zona).length;
            if (count === 0) return null;
            return (
              <Badge 
                key={zona} 
                className="bg-lime-400/20 text-lime-400 text-[10px] cursor-pointer hover:bg-lime-400/30"
                onClick={() => setFilterZone(zona)}
              >
                {zona} ({count})
              </Badge>
            );
          })}
        </div>

        {/* Lista utenti */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-4">Nessun utente trovato</p>
          ) : (
            filteredUsers.map(user => (
              <div key={user.id} className="bg-slate-900 rounded-lg p-2 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">
                    {user.company_name || user.full_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-400 text-xs truncate">{user.email}</p>
                    {user.role === 'consulente' && (
                      <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">Consulente</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.zona ? (
                    <div className="flex items-center gap-1">
                      <Badge className="bg-lime-400/20 text-lime-400 text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {user.zona}
                      </Badge>
                      <button
                        onClick={() => handleRemoveZone(user.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-lime-400 h-6 text-xs"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowAssignDialog(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Zona
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Dialog assegnazione zona */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-lime-400" />
              Assegna Zona
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Selezione utente */}
            {!selectedUser ? (
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Seleziona utente</label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-900 rounded-lg p-2">
                  {allUsers
                    .filter(u => u.role !== 'admin')
                    .map(user => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700 text-left"
                      >
                        <div className="w-8 h-8 bg-lime-400/20 rounded-full flex items-center justify-center">
                          <span className="text-lime-400 text-xs font-bold">
                            {(user.company_name || user.full_name)?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{user.company_name || user.full_name}</p>
                          <p className="text-slate-400 text-xs truncate">{user.email}</p>
                        </div>
                        {user.zona && (
                          <Badge className="bg-slate-700 text-slate-300 text-[10px]">{user.zona}</Badge>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <>
                <div className="bg-slate-900 rounded-lg p-3">
                  <p className="text-white font-medium">{selectedUser.company_name || selectedUser.full_name}</p>
                  <p className="text-slate-400 text-xs">{selectedUser.email}</p>
                  {selectedUser.zona && (
                    <p className="text-lime-400 text-xs mt-1">Zona attuale: {selectedUser.zona}</p>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Seleziona zona esistente</label>
                  <Select value={selectedZone} onValueChange={(v) => { setSelectedZone(v); setCustomZone(''); }}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Scegli zona..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {allZones.map(zona => (
                        <SelectItem key={zona} value={zona} className="text-white">{zona}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-2 block">Oppure crea nuova zona</label>
                  <Input
                    placeholder="Nome nuova zona..."
                    value={customZone}
                    onChange={(e) => { setCustomZone(e.target.value); setSelectedZone(''); }}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300"
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedZone('');
                      setCustomZone('');
                    }}
                  >
                    Indietro
                  </Button>
                  <Button
                    className="flex-1 bg-lime-400 text-slate-900"
                    disabled={(!selectedZone && !customZone.trim()) || updateZoneMutation.isPending}
                    onClick={handleAssignZone}
                  >
                    {updateZoneMutation.isPending ? 'Salvataggio...' : 'Assegna'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}