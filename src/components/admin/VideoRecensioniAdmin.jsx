import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Film, Star, Check, Clock, Trash2, Eye, Plus, Save, X, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending: { text: 'In attesa', color: 'bg-yellow-500' },
  in_progress: { text: 'In lavorazione', color: 'bg-blue-500' },
  completed: { text: 'Completato', color: 'bg-green-500' },
  cancelled: { text: 'Annullato', color: 'bg-red-500' },
};

export default function VideoRecensioniAdmin({ user }) {
  const [searchReq, setSearchReq] = useState('');
  const [searchVideo, setSearchVideo] = useState('');
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({ title: '', company_name: '', youtube_url: '', company_email: '' });
  const queryClient = useQueryClient();

  // Richieste video recensioni
  const { data: allRequests = [] } = useQuery({
    queryKey: ['admin-video-review-requests'],
    queryFn: () => base44.entities.VideoReviewRequest.list('-created_date'),
  });

  // Video pubblicati
  const { data: videos = [] } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: () => base44.entities.Video.list('-created_date'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.VideoReviewRequest.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-video-review-requests'] }),
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id) => base44.entities.VideoReviewRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-video-review-requests'] }),
  });

  const saveVideoMutation = useMutation({
    mutationFn: async () => {
      const isNew = !editingVideo;
      if (editingVideo) {
        await base44.entities.Video.update(editingVideo.id, videoForm);
      } else {
        await base44.entities.Video.create(videoForm);
      }
      // Notifica tutti gli utenti quando viene pubblicato un nuovo video
      if (isNew) {
        try {
          const allUsers = await base44.entities.User.list();
          const notifiche = allUsers
            .filter(u => u.email !== user.email)
            .map(u => ({
              user_email: u.email,
              type: 'video',
              title: 'Nuovo Video Pubblicato',
              content: `È stata pubblicata una nuova video recensione: "${videoForm.title}" di ${videoForm.company_name}`,
              is_read: false
            }));
          if (notifiche.length > 0) {
            await base44.entities.Notification.bulkCreate(notifiche);
          }
        } catch (e) {
          console.log('Errore invio notifiche video:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      setShowVideoForm(false);
      setEditingVideo(null);
      setVideoForm({ title: '', company_name: '', youtube_url: '', company_email: '' });
      toast.success(editingVideo ? 'Video aggiornato' : 'Video aggiunto');
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id) => base44.entities.Video.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-videos'] }),
  });

  const openEditVideo = (video) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title || '',
      company_name: video.company_name || '',
      youtube_url: video.youtube_url || '',
      company_email: video.company_email || '',
    });
    setShowVideoForm(true);
  };

  const openNewVideo = () => {
    setEditingVideo(null);
    setVideoForm({ title: '', company_name: '', youtube_url: '', company_email: '' });
    setShowVideoForm(true);
  };

  const pendingCount = allRequests.filter(r => r.status === 'pending').length;

  const filteredRequests = allRequests.filter(r => {
    const term = searchReq.toLowerCase();
    if (!term) return true;
    return r.requester_company?.toLowerCase().includes(term) ||
      r.client_name?.toLowerCase().includes(term) ||
      r.requester_email?.toLowerCase().includes(term);
  });

  const filteredVideos = videos.filter(v => {
    const term = searchVideo.toLowerCase();
    if (!term) return true;
    return v.title?.toLowerCase().includes(term) ||
      v.company_name?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="richieste" className="w-full">
        <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-2">
          <TabsTrigger value="richieste" className="text-xs data-[state=active]:bg-[#d4af37] data-[state=active]:text-slate-900 relative">
            <Star className="w-3.5 h-3.5 mr-1" /> Richieste
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="video" className="text-xs data-[state=active]:bg-[#d4af37] data-[state=active]:text-slate-900">
            <Film className="w-3.5 h-3.5 mr-1" /> Video ({videos.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB RICHIESTE */}
        <TabsContent value="richieste" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cerca richieste..." value={searchReq} onChange={(e) => setSearchReq(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white pl-9 h-9 text-sm" />
          </div>

          {filteredRequests.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-sm">Nessuna richiesta</p>
          ) : (
            filteredRequests.map(req => {
              const st = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              return (
                <Card key={req.id} className={`border ${req.status === 'pending' ? 'bg-slate-800 border-[#d4af37]/50' : 'bg-slate-800 border-slate-700'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold text-xs truncate">{req.requester_company}</h3>
                      <Badge className={`${st.color} text-white text-[10px]`}>{st.text}</Badge>
                    </div>
                    <p className="text-[#d4af37] text-[10px] font-semibold">
                      {req.plan_type === 'abbonamento' ? '📦 Abbonamento' : '🎬 Singolo'}
                    </p>
                    <div className="bg-slate-900 rounded-lg p-2 mt-2 space-y-0.5">
                      <p className="text-white text-xs">Cliente: {req.client_name}</p>
                      <p className="text-slate-400 text-[10px]">Tel: {req.client_phone}</p>
                      {req.client_email && <p className="text-slate-400 text-[10px]">Email: {req.client_email}</p>}
                      {req.notes && <p className="text-slate-300 text-[10px] mt-1">{req.notes}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-slate-500 text-[10px]">
                        {new Date(req.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </p>
                      <div className="flex gap-1">
                        {req.status === 'pending' && (
                          <Button size="sm" variant="outline" className="border-blue-500 text-blue-400 hover:bg-blue-500/20 h-6 text-[10px] px-2"
                            onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'in_progress' })}>
                            <Eye className="w-3 h-3 mr-1" /> Lavora
                          </Button>
                        )}
                        {req.status === 'in_progress' && (
                          <Button size="sm" variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/20 h-6 text-[10px] px-2"
                            onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'completed' })}>
                            <Check className="w-3 h-3 mr-1" /> Fatto
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader><AlertDialogTitle className="text-white">Eliminare?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600" onClick={() => deleteRequestMutation.mutate(req.id)}>Elimina</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* TAB VIDEO */}
        <TabsContent value="video" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Cerca video..." value={searchVideo} onChange={(e) => setSearchVideo(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white pl-9 h-9 text-sm" />
            </div>
            <Button size="sm" onClick={openNewVideo} className="bg-[#d4af37] hover:bg-[#c49b2f] text-slate-900 h-9">
              <Plus className="w-4 h-4 mr-1" /> Nuovo
            </Button>
          </div>

          {filteredVideos.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-sm">Nessun video</p>
          ) : (
            filteredVideos.map(video => (
              <Card key={video.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-xs truncate">{video.title}</p>
                      <p className="text-[#d4af37] text-[10px]">{video.company_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-slate-400 text-[10px]">👁 {video.views_count || 0}</span>
                        <span className="text-slate-400 text-[10px]">❤️ {video.likes?.length || 0}</span>
                        <span className="text-slate-400 text-[10px]">⭐ {video.ratings?.length || 0} voti</span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditVideo(video)} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-800 border-slate-700">
                          <AlertDialogHeader><AlertDialogTitle className="text-white">Eliminare questo video?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600" onClick={() => deleteVideoMutation.mutate(video.id)}>Elimina</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Crea/Modifica Video */}
      <Dialog open={showVideoForm} onOpenChange={setShowVideoForm}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{editingVideo ? 'Modifica Video' : 'Nuovo Video'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-slate-300 text-sm">Titolo *</Label>
              <Input value={videoForm.title} onChange={(e) => setVideoForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titolo del video" className="bg-slate-800 border-slate-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Azienda *</Label>
              <Input value={videoForm.company_name} onChange={(e) => setVideoForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder="Nome azienda" className="bg-slate-800 border-slate-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">URL YouTube *</Label>
              <Input value={videoForm.youtube_url} onChange={(e) => setVideoForm(f => ({ ...f, youtube_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..." className="bg-slate-800 border-slate-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Email azienda (opzionale)</Label>
              <Input value={videoForm.company_email} onChange={(e) => setVideoForm(f => ({ ...f, company_email: e.target.value }))}
                placeholder="email@azienda.it" className="bg-slate-800 border-slate-700 text-white mt-1" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowVideoForm(false)} className="border-slate-600 text-slate-400">
              <X className="w-4 h-4 mr-1" /> Annulla
            </Button>
            <Button onClick={() => saveVideoMutation.mutate()}
              disabled={!videoForm.title || !videoForm.company_name || !videoForm.youtube_url || saveVideoMutation.isPending}
              className="bg-[#d4af37] hover:bg-[#c49b2f] text-slate-900">
              <Save className="w-4 h-4 mr-1" /> {saveVideoMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}