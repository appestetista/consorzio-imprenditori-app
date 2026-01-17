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
import { Plus, Trash2, X, BookOpen, Pencil, Play } from 'lucide-react';
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
  const [editingVideo, setEditingVideo] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    youtube_url: '',
    categoria: ''
  });
  const [errors, setErrors] = useState([]);
  const queryClient = useQueryClient();

  // Estrae ID video YouTube per thumbnail
  const getYoutubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match ? match[1] : null;
  };

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

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CulturaAziendaleVideo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cultura-aziendale-videos'] });
      setEditingVideo(null);
      resetForm();
    }
  });

  const openEditDialog = (video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      youtube_url: video.youtube_url,
      categoria: video.categoria
    });
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingVideo) {
      updateVideoMutation.mutate({ id: editingVideo.id, data: formData });
    } else {
      createVideoMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      youtube_url: '',
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
          Academy
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
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {videos.map(video => {
              const videoId = getYoutubeId(video.youtube_url);
              return (
                <div key={video.id} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex gap-3">
                    {/* Thumbnail Video */}
                    <div className="relative flex-shrink-0 w-28 h-20 rounded overflow-hidden bg-slate-900">
                      {videoId ? (
                        <>
                          <img 
                            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{video.title}</p>
                      <Badge className="bg-lime-400/20 text-lime-400 border-0 text-xs mt-1">
                        {video.categoria}
                      </Badge>
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date(video.created_date).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    
                    {/* Azioni */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-lime-400 text-lime-400 hover:bg-lime-400/20 h-8 w-8 p-0"
                        onClick={() => openEditDialog(video)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-400 hover:bg-red-600/20 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Annulla</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteVideoMutation.mutate(video.id)}>
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog Nuovo/Modifica Video */}
      <Dialog open={showAddVideo || !!editingVideo} onOpenChange={(open) => {
        if (!open) {
          setShowAddVideo(false);
          setEditingVideo(null);
          resetForm();
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingVideo ? 'Modifica Video' : 'Nuovo Video Academy'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {errors.length > 0 && (
              <div className="bg-red-500/20 border border-red-500/30 rounded p-3">
                {errors.map((error, idx) => (
                  <p key={idx} className="text-red-400 text-sm">• {error}</p>
                ))}
              </div>
            )}

            {/* Anteprima video se URL valido */}
            {formData.youtube_url && getYoutubeId(formData.youtube_url) && (
              <div className="rounded-lg overflow-hidden">
                <img 
                  src={`https://img.youtube.com/vi/${getYoutubeId(formData.youtube_url)}/mqdefault.jpg`}
                  alt="Anteprima"
                  className="w-full h-32 object-cover"
                />
              </div>
            )}

            <div>
              <Label className="text-slate-300 text-sm">Titolo Video *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="Es: Come migliorare la leadership"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm">Link YouTube *</Label>
              <Input
                value={formData.youtube_url}
                onChange={(e) => setFormData({...formData, youtube_url: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white mt-1"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm">Categoria *</Label>
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
              onClick={handleSave}
              disabled={createVideoMutation.isPending || updateVideoMutation.isPending}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {(createVideoMutation.isPending || updateVideoMutation.isPending) 
                ? 'Salvataggio...' 
                : editingVideo 
                  ? 'Salva Modifiche' 
                  : 'Carica Video e Notifica Membri'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}