import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function ZoneManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  const queryClient = useQueryClient();

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones-all'],
    queryFn: () => base44.entities.Zone.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Zone.create({ ...data, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-all'] });
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Zona creata');
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Zone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-all'] });
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Zona aggiornata');
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Zone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones-all'] });
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Zona eliminata');
    }
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingZone(null);
    setFormData({ name: '', description: '' });
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({ name: zone.name, description: zone.description || '' });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Inserisci il nome della zona');
      return;
    }
    if (editingZone) {
      updateMutation.mutate({ id: editingZone.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-lime-400" />
            <h3 className="text-white font-medium">Gestione Zone ({zones.length})</h3>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-lime-400 text-slate-900 hover:bg-lime-500"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuova
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 text-lime-400 animate-spin" />
          </div>
        ) : zones.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Nessuna zona. Creane una per iniziare.</p>
        ) : (
          <div className="space-y-2">
            {zones.map((zone) => (
              <div 
                key={zone.id} 
                className="bg-slate-900 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{zone.name}</p>
                  {zone.description && (
                    <p className="text-slate-400 text-xs">{zone.description}</p>
                  )}
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
              </div>
            ))}
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}