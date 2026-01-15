import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Video, ThumbsUp, MessageCircle, Plus, ArrowLeft, Play, Trash2, X, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';

function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function VideoInterviste() {
  const [user, setUser] = useState(null);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: '', company_name: '', youtube_url: '', company_email: '' });
  const [editingVideo, setEditingVideo] = useState(null);
  const [showEditVideo, setShowEditVideo] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const queryClient = useQueryClient();
  const { impersonation } = useImpersonation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin' && !impersonation.active;

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => base44.entities.Video.list('-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  // Marca come lette tutte le notifiche video quando l'utente apre la sezione
  useEffect(() => {
    const markVideoNotificationsAsRead = async () => {
      if (!user?.email) return;
      
      const videoNotifications = await base44.entities.Notification.filter({
        user_email: user.email,
        type: 'video',
        is_read: false
      });
      
      for (const notif of videoNotifications) {
        await base44.entities.Notification.update(notif.id, { is_read: true });
      }
    };
    
    markVideoNotificationsAsRead();
  }, [user?.email]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const createVideoMutation = useMutation({
    mutationFn: async (videoData) => {
      const video = await base44.entities.Video.create({
        ...videoData,
        likes: []
      });
      
      // Create notifications for all users
      if (isAdmin && allUsers.length > 0) {
        const notifications = allUsers.map(u => ({
          user_email: u.email,
          type: 'video',
          title: 'Nuova Video Intervista',
          content: `È stata caricata una nuova video intervista: ${videoData.company_name}`,
          reference_id: video.id
        }));
        await base44.entities.Notification.bulkCreate(notifications);
      }
      
      return video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setShowAddVideo(false);
      setNewVideo({ title: '', company_name: '', youtube_url: '', company_email: '' });
    }
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ videoId, video }) => {
      const likes = video.likes || [];
      const userLiked = likes.includes(user.email);
      
      const updatedLikes = userLiked
        ? likes.filter(e => e !== user.email)
        : [...likes, user.email];
      
      return base44.entities.Video.update(videoId, { likes: updatedLikes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    }
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Video.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setShowEditVideo(false);
      setEditingVideo(null);
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId) => {
      return base44.entities.Video.delete(videoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    }
  });

  const sendContactMessageMutation = useMutation({
    mutationFn: async (video) => {
      const response = await base44.functions.invoke('contactCompany', {
        videoId: video.id,
        companyEmail: video.company_email
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.alreadyExists) {
        alert('Hai già inviato una richiesta di contatto a questa azienda');
      } else {
        alert(data.message);
      }
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'Errore durante l\'invio della richiesta');
    }
  });

  const requestInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!requestMessage.trim()) return;
      
      await base44.integrations.Core.SendEmail({
        from_name: 'Piattaforma Consorzio',
        to: 'consorzioimprenditori@gmail.com',
        subject: `Richiesta Video Intervista - ${user.company_name || user.full_name}`,
        body: `
Nuova richiesta di video intervista dalla piattaforma:

AZIENDA: ${user.company_name || 'N/A'}
REFERENTE: ${user.full_name || 'N/A'}
EMAIL: ${user.email}
TELEFONO: ${user.phone || 'N/A'}

MESSAGGIO:
${requestMessage}

---
Questa è una richiesta automatica dalla piattaforma del Consorzio Imprenditori.
        `
      });
    },
    onSuccess: () => {
      setShowRequestModal(false);
      setRequestMessage('');
    }
  });

  const hasUserLiked = (video) => {
    return video.likes?.includes(user?.email);
  };

  const handleEditVideo = (video) => {
    setEditingVideo(video);
    setShowEditVideo(true);
  };

  const handleUpdateVideo = () => {
    updateVideoMutation.mutate({
      id: editingVideo.id,
      data: {
        title: editingVideo.title,
        company_name: editingVideo.company_name,
        youtube_url: editingVideo.youtube_url,
        company_email: editingVideo.company_email
      }
    });
  };

  const handleDeleteVideo = (video) => {
    if (window.confirm(`Sei sicuro di voler eliminare il video "${video.title}"?\n\nQuesta azione è irreversibile.`)) {
      deleteVideoMutation.mutate(video.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-white text-xl font-bold">Video Interviste</h1>
          </div>
          
          {isAdmin && (
            <Dialog open={showAddVideo} onOpenChange={setShowAddVideo}>
              <DialogTrigger asChild>
                <Button className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                  <Plus className="w-5 h-5 mr-1" />
                  Nuovo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Nuovo Video</DialogTitle>
                </DialogHeader>
                <button
                  onClick={() => setShowAddVideo(false)}
                  className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Titolo Video *"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  <Input
                    placeholder="Nome Azienda *"
                    value={newVideo.company_name}
                    onChange={(e) => setNewVideo({...newVideo, company_name: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  <Input
                    placeholder="Link YouTube *"
                    value={newVideo.youtube_url}
                    onChange={(e) => setNewVideo({...newVideo, youtube_url: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    required
                  />
                  <Input
                    placeholder="Email Azienda (per contatti)"
                    type="email"
                    value={newVideo.company_email}
                    onChange={(e) => setNewVideo({...newVideo, company_email: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Button 
                    onClick={() => createVideoMutation.mutate(newVideo)}
                    disabled={createVideoMutation.isPending || !newVideo.title || !newVideo.company_name || !newVideo.youtube_url}
                    className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                  >
                    {createVideoMutation.isPending ? 'Caricamento...' : 'Aggiungi Video'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Banner richiesta video */}
        <div 
          className="bg-lime-400 rounded-xl p-4 mb-6 flex items-center justify-between cursor-pointer hover:bg-lime-500 transition-colors"
          onClick={() => setShowRequestModal(true)}
        >
          <div>
            <p className="text-slate-900 text-sm font-medium">richiedi la tua video intervista</p>
            <p className="text-slate-700 text-xs">annuale compresa nel prezzo d'iscrizione</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-900 text-xs">clicca qui</span>
            <div className="bg-slate-900 rounded-lg p-2">
              <Video className="w-6 h-6 text-lime-400" />
            </div>
          </div>
        </div>

        <h2 className="text-white text-lg font-bold mb-4 text-center">VIDEO INTERVISTE</h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nessun video disponibile</p>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => {
              const youtubeId = getYouTubeId(video.youtube_url);
              const likesCount = video.likes?.length || 0;
              
              return (
                <Card key={video.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                  <div className="relative">
                    <div className="bg-lime-400 text-slate-900 text-sm font-bold px-3 py-1">
                      AZIENDA {video.company_name?.toUpperCase()}
                    </div>
                    
                    {video.title && (
                      <div className="bg-slate-900 px-3 py-2 border-b border-slate-700">
                        <h3 className="text-white font-semibold text-base">{video.title}</h3>
                      </div>
                    )}
                    
                    {youtubeId ? (
                      <div className="relative aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${youtubeId}`}
                          title={video.title}
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-slate-700 flex items-center justify-center">
                        <Play className="w-16 h-16 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-lime-400 hover:bg-lime-500 text-slate-900 border-0"
                        onClick={() => sendContactMessageMutation.mutate(video)}
                        disabled={sendContactMessageMutation.isPending}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {sendContactMessageMutation.isPending ? 'Invio...' : 'contatta l\'azienda'}
                      </Button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleLikeMutation.mutate({ videoId: video.id, video })}
                          className="flex items-center gap-1"
                        >
                          <ThumbsUp 
                            className={`w-5 h-5 ${hasUserLiked(video) ? 'text-lime-400 fill-lime-400' : 'text-slate-400'}`} 
                          />
                          {likesCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                              {likesCount}
                            </span>
                          )}
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEditVideo(video)}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                              title="Modifica video"
                            >
                              <Edit className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(video)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Elimina video"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Request Interview Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Richiedi la tua Video Intervista</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowRequestModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
          <div className="space-y-4 mt-4">
            <div className="bg-lime-400/20 rounded-lg p-4 border border-lime-400/30">
              <p className="text-lime-400 text-sm font-medium mb-2">✓ Servizio Incluso</p>
              <p className="text-slate-300 text-xs">
                La video intervista annuale è compresa nel prezzo di iscrizione. 
                Ti contatteremo per organizzare le riprese.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-slate-300 text-sm font-medium">I tuoi dati:</p>
              <div className="bg-slate-900 rounded-lg p-3 space-y-1">
                <p className="text-white text-sm">{user?.company_name || user?.full_name}</p>
                <p className="text-slate-400 text-xs">{user?.email}</p>
                {user?.phone && <p className="text-slate-400 text-xs">{user.phone}</p>}
              </div>
            </div>

            <Textarea
              placeholder="Aggiungi eventuali note o preferenze per la tua video intervista..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white min-h-[120px]"
            />
            
            <Button 
              onClick={() => requestInterviewMutation.mutate()}
              disabled={requestInterviewMutation.isPending || !requestMessage.trim()}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {requestInterviewMutation.isPending ? 'Invio...' : 'Invia Richiesta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="VideoInterviste" unreadMessages={messages.length} />

      {/* Dialog Modifica Video */}
      <Dialog open={showEditVideo} onOpenChange={setShowEditVideo}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Modifica Video</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowEditVideo(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
          {editingVideo && (
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Titolo Video *"
                value={editingVideo.title}
                onChange={(e) => setEditingVideo({...editingVideo, title: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                required
              />
              <Input
                placeholder="Nome Azienda *"
                value={editingVideo.company_name}
                onChange={(e) => setEditingVideo({...editingVideo, company_name: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                required
              />
              <Input
                placeholder="Link YouTube *"
                value={editingVideo.youtube_url}
                onChange={(e) => setEditingVideo({...editingVideo, youtube_url: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
                required
              />
              <Input
                placeholder="Email Azienda (per contatti)"
                type="email"
                value={editingVideo.company_email || ''}
                onChange={(e) => setEditingVideo({...editingVideo, company_email: e.target.value})}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Button 
                onClick={handleUpdateVideo}
                disabled={updateVideoMutation.isPending || !editingVideo.title || !editingVideo.company_name || !editingVideo.youtube_url}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                {updateVideoMutation.isPending ? 'Aggiornamento...' : 'Aggiorna Video'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}