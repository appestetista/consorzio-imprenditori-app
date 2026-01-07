import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Video, ThumbsUp, MessageCircle, Plus, ArrowLeft, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

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
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [contactMessage, setContactMessage] = useState('');
  const queryClient = useQueryClient();

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

  const isAdmin = user?.role === 'admin';

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => base44.entities.Video.list('-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

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

  const sendContactMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVideo || !contactMessage.trim()) return;
      
      const conversationId = [user.email, selectedVideo.company_email].sort().join('-');
      
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: selectedVideo.company_email,
        content: `[Riguardo video: ${selectedVideo.company_name}]\n\n${contactMessage}`,
        conversation_id: conversationId
      });
    },
    onSuccess: () => {
      setShowContactModal(false);
      setContactMessage('');
      setSelectedVideo(null);
    }
  });

  const hasUserLiked = (video) => {
    return video.likes?.includes(user?.email);
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
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Nome Azienda"
                    value={newVideo.company_name}
                    onChange={(e) => setNewVideo({...newVideo, company_name: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Titolo Video"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Link YouTube"
                    value={newVideo.youtube_url}
                    onChange={(e) => setNewVideo({...newVideo, youtube_url: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
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
                    disabled={createVideoMutation.isPending}
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
        <div className="bg-lime-400 rounded-xl p-4 mb-6 flex items-center justify-between">
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
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-lime-400 hover:bg-lime-500 text-slate-900 border-0"
                        onClick={() => {
                          setSelectedVideo(video);
                          setShowContactModal(true);
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        contatta l'azienda
                      </Button>
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Contatta {selectedVideo?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Textarea
              placeholder="Scrivi il tuo messaggio..."
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white min-h-[120px]"
            />
            <Button 
              onClick={() => sendContactMessageMutation.mutate()}
              disabled={sendContactMessageMutation.isPending || !contactMessage.trim()}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              {sendContactMessageMutation.isPending ? 'Invio...' : 'Invia Messaggio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="VideoInterviste" unreadMessages={messages.length} />
    </div>
  );
}