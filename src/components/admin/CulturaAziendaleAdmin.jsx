import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, X, BookOpen } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const CATEGORIE = [
  "Psicologia aziendale",
  "Finanza",
  "Strumenti digitali",
  "Fiscalità",
  "Intelligenza Artificiale (AI)",
  "Competenze"
];

export default function CulturaAziendaleAdmin() {
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    youtube_url: '',
    description: '',
    categoria: ''
  });
  const [errors, setErrors] = useState([]);
  const queryClient = useQueryClient();

  const { data: videos = [] } = useQuery({
    queryKey: ['cultura-aziendale-videos'],
    queryFn: () => base44.entities.CulturaAziendaleVideo.list('-created_date'),
  });

  const createVideoMutation = useMutation({
    mutationFn: async (videoData) => {
      const newVideo = await base44.entities.CulturaAziendaleVideo.create(videoData);
      
      // Invia notifiche a tutti i membri attivi
      const users = await base44.entities.User.list();
      const activeUsers = users.filter(u => !u.is_blocked && u.role !== 'admin');
      
      const notifications = activeUsers.map(user => ({
        user_email: user.email,
        type: 'cultura_aziendale',
        title: 'Nuovo video in Academy',
        content: `"${videoData.title}" - Categoria: ${videoData.categoria}`,
        reference_id: newVideo.id
      }));
      
      await base44.entities.Notification.bulkCreate(notifications);
      
      return newVideo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cultura-aziendale-videos'] });
      setShowAddVideo(false);
      resetForm();
    }
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (videoId) => base44.entities.CulturaAziendaleVideo.delete(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cultura-aziendale-videos'] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      youtube_url: '',
      description: '',
      categoria: ''
    });
    setErrors([]);
  };

  const validate = () => {
    const newErrors = [];
    if (!formData.title) newErrors.push('Titolo obbligatorio');
    if (!formData.youtube_url) newErrors.push('Link YouTube obbligatorio');
    if (!formData.categoria) newErrors.push('Categoria obbligatoria');
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createVideoMutation.mutate(formData);
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-lime-400" />
          Cultura Aziendale
        </CardTitle>
        <Button
          onClick={() => setShowAddVideo(true)}
          className="bg-lime-400 hover:bg-lime-500 text-slate-900"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuovo Video
        </Button>
      </CardHeader>
      <CardContent>
        {videos.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Nessun video caricato</p>
        ) : (
          <div className="space-y-3">
            {videos.map(video => (
              <div key={video.id} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">{video.title}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className="bg-lime-400/20 text-lime-400 border-0 text-xs">
                        {video.categoria}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-xs">
                      {new Date(video.created_date).toLocaleDateString('it-IT')}
                    </p>
                  </div>
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
                        <AlertDialogTitle className="text-white">Eliminare questo video?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Il video verrà rimosso definitivamente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">
                          Annulla
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => deleteVideoMutation.mutate(video.id)}
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
      </CardContent>

      {/* Dialog Nuovo Video */}
      <Dialog open={showAddVideo} onOpenChange={(open) => {
        setShowAddVideo(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Nuovo Video - Cultura Aziendale</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowAddVideo(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          <div className="space-y-4 mt-4">
            {errors.length > 0 && (
              <div className="bg-red-500/20 border border-red-500/30 rounded p-3">
                {errors.map((error, idx) => (
                  <p key={idx} className="text-red-400 text-sm">• {error}</p>
                ))}
              </div>
            )}

            <div>
              <Label className="text-slate-300">Titolo Video *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="Es: Come migliorare la leadership in azienda"
              />
            </div>

            <div>
              <Label className="text-slate-300">Link YouTube *</Label>
              <Input
                value={formData.youtube_url}
                onChange={(e) => setFormData({...formData, youtube_url: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div>
              <Label className="text-slate-300">Descrizione (facoltativo)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white mt-1 h-20"
                placeholder="Breve descrizione del contenuto..."
              />
            </div>

            <div>
              <Label className="text-slate-300">Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIE.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={createVideoMutation.isPending}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {createVideoMutation.isPending ? 'Salvataggio...' : 'Carica Video e Notifica Membri'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}