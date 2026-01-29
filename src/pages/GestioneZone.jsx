import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MapPin, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import ZoneManagerSimple from '../components/admin/ZoneManagerSimple';

export default function GestioneZone() {
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl('Home'));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl('AdminPanel'))} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Gestione Zone</h1>
              <p className="text-slate-400 text-xs">{zones.length} zone</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-lime-400 text-slate-900 hover:bg-lime-500"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuova
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
          </div>
        ) : zones.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nessuna zona. Creane una per iniziare.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {zones.map((zone) => (
              <Card key={zone.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-lime-400/20 p-2 rounded-lg">
                      <MapPin className="w-5 h-5 text-lime-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{zone.name}</p>
                      {zone.description && (
                        <p className="text-slate-400 text-xs">{zone.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(zone)}
                      className="text-lime-400 hover:bg-lime-400/20"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:bg-red-400/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Eliminare questa zona?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Questa azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMutation.mutate(zone.id)}
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

        {/* Assegnazione Zone agli utenti */}
        <div className="mt-6">
          <ZoneAssignmentManager />
        </div>

        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingZone ? 'Modifica Zona' : 'Nuova Zona'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-slate-300 text-sm">Nome Zona *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Es: Nord Italia"
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Descrizione</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione opzionale"
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={resetForm}
                className="border-slate-600 text-slate-400"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-lime-400 text-slate-900 hover:bg-lime-500"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingZone ? 'Salva' : 'Crea'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav currentPage="AdminPanel" />
    </div>
  );
}