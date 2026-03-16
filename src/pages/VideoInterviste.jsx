import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Video, MessageCircle, Plus, ArrowLeft, Play, Trash2, X, Edit, Mail, Eye, Clock, Bell } from 'lucide-react';
import VideoRating from '../components/video/VideoRating';
import AdminVideoUploadPanel from '../components/video/AdminVideoUploadPanel';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import SectionHeaderIcons from '../components/layout/SectionHeaderIcons';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import useNotificationSound from '../components/hooks/useNotificationSound';

function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function VideoInterviste() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: '', company_name: '', youtube_url: '', company_email: '', selected_user_id: '' });
  const [editingVideo, setEditingVideo] = useState(null);
  const [showEditVideo, setShowEditVideo] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [selectedVideoForContact, setSelectedVideoForContact] = useState(null);
  const queryClient = useQueryClient();
  const { impersonation, appMode } = useImpersonation();
  const { playSound } = useNotificationSound();
  const [prevPendingCount, setPrevPendingCount] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Se in modalità preview utente, carica l'utente impersonato
        if (appMode === 'user-preview' && impersonation.previewUserId) {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          if (users.length > 0) {
            setEffectiveUser(users[0]);
          } else {
            setEffectiveUser(currentUser);
          }
        } else {
          setEffectiveUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId]);

  const isAdmin = user?.role === 'admin' && !impersonation.active && appMode === 'admin';

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => base44.entities.Video.list('-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  // Messaggi video non letti per badge
  const { data: unreadVideoMessages = [] } = useQuery({
    queryKey: ['unread-video-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ 
      to_email: effectiveUser?.email, 
      source: 'video',
      is_read: false 
    }),
    enabled: !!effectiveUser?.email,
  });

  // Marca come lette tutte le notifiche video e aggiorna last_video_view_at
  useEffect(() => {
    const markVideoNotificationsAsRead = async () => {
      if (!effectiveUser?.email) return;
      
      // Aggiorna il timestamp dell'ultima visita ai video
      try {
        await base44.auth.updateMe({ last_video_view_at: new Date().toISOString() });
      } catch (e) {
        console.log('Errore aggiornamento last_video_view_at:', e);
      }
      
      const videoNotifications = await base44.entities.Notification.filter({
        user_email: effectiveUser.email,
        type: 'video',
        is_read: false
      });
      
      for (const notif of videoNotifications) {
        await base44.entities.Notification.update(notif.id, { is_read: true });
      }
    };
    
    markVideoNotificationsAsRead();
  }, [effectiveUser?.email]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Lista aziende per menu a tendina (utenti con company_name)
  const companyUsers = allUsers.filter(u => u.company_name && u.role !== 'admin');

  const handleSelectCompany = (userId) => {
    const selectedUser = companyUsers.find(u => u.id === userId);
    if (selectedUser) {
      setNewVideo({
        ...newVideo,
        selected_user_id: userId,
        company_name: selectedUser.company_name,
        company_email: selectedUser.email
      });
    }
  };

  const { data: videoInterviewRequests = [] } = useQuery({
    queryKey: ['video-interview-requests'],
    queryFn: () => base44.entities.VideoInterviewRequest.list('-created_date'),
    enabled: isAdmin,
  });

  const pendingVideoRequests = videoInterviewRequests.filter(r => r.status === 'pending');

  // Notifica sonora per admin quando arriva nuova richiesta
  useEffect(() => {
    if (isAdmin && pendingVideoRequests.length > prevPendingCount && prevPendingCount > 0) {
      playSound();
    }
    setPrevPendingCount(pendingVideoRequests.length);
  }, [pendingVideoRequests.length, isAdmin, prevPendingCount, playSound]);

  const markVideoRequestReadMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.VideoInterviewRequest.update(requestId, { status: 'read' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-interview-requests'] });
    }
  });

  const deleteVideoRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.VideoInterviewRequest.delete(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-interview-requests'] });
    }
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
      setNewVideo({ title: '', company_name: '', youtube_url: '', company_email: '', selected_user_id: '' });
    }
  });

  const rateMutation = useMutation({
    mutationFn: async ({ videoId, video, diamonds }) => {
      const ratings = video.ratings || [];
      const existingIndex = ratings.findIndex(r => r.user_email === effectiveUser.email);
      
      let updatedRatings;
      let updateData = {};
      
      if (existingIndex >= 0) {
        // Aggiorna voto esistente (no nuova visualizzazione)
        updatedRatings = [...ratings];
        updatedRatings[existingIndex] = { user_email: effectiveUser.email, diamonds };
        updateData = { ratings: updatedRatings };
      } else {
        // Nuovo voto = aggiungi anche una visualizzazione
        updatedRatings = [...ratings, { user_email: effectiveUser.email, diamonds }];
        const views = video.views || [];
        const viewsCount = (video.views_count || 0) + 1;
        const newView = {
          user_email: effectiveUser.email,
          viewed_at: new Date().toISOString()
        };
        updateData = { 
          ratings: updatedRatings,
          views: [...views, newView],
          views_count: viewsCount
        };
      }
      
      return base44.entities.Video.update(videoId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    }
  });

  const trackViewMutation = useMutation({
    mutationFn: async ({ videoId, video }) => {
      const views = video.views || [];
      const viewsCount = (video.views_count || 0) + 1;
      
      // Registra la visualizzazione
      const newView = {
        user_email: effectiveUser.email,
        viewed_at: new Date().toISOString()
      };
      
      return base44.entities.Video.update(videoId, { 
        views: [...views, newView],
        views_count: viewsCount
      });
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
    mutationFn: async ({ video, message }) => {
      if (!message.trim()) throw new Error('Messaggio vuoto');
      if (!video.company_email) throw new Error('Email azienda non disponibile');
      
      // Chiama la backend function che gestisce tutto (email + messaggio in-app)
      const response = await base44.functions.invoke('contactCompany', {
        videoId: video.id,
        companyEmail: video.company_email,
        customMessage: message,
        source: 'video'
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      setShowContactModal(false);
      setContactMessage('');
      setSelectedVideoForContact(null);
      queryClient.invalidateQueries({ queryKey: ['unread-video-messages'] });
      if (data.alreadyExists) {
        alert('Hai già inviato una richiesta di contatto a questa azienda nelle ultime 24 ore');
      } else {
        alert('Messaggio inviato con successo!');
      }
    },
    onError: (error) => {
      alert(error.response?.data?.error || error.message || 'Errore durante l\'invio del messaggio');
    }
  });

  const openContactModal = (video) => {
    if (!video.company_email) {
      alert('Questa azienda non ha un\'email di contatto configurata');
      return;
    }
    setSelectedVideoForContact(video);
    setContactMessage('');
    setShowContactModal(true);
  };

  const requestInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!requestMessage.trim()) throw new Error('Messaggio vuoto');
      
      // Usa sempre user (l'utente reale loggato), non effectiveUser
      const requestingUser = user || effectiveUser;
      if (!requestingUser) throw new Error('Utente non trovato');
      
      // Salva la richiesta nel database
      const request = await base44.entities.VideoInterviewRequest.create({
        requester_email: requestingUser.email,
        requester_name: requestingUser.company_name || requestingUser.full_name,
        requester_phone: requestingUser.phone || '',
        message: requestMessage,
        status: 'pending'
      });
      
      // Operazioni secondarie in background (non bloccano il successo)
      setTimeout(async () => {
        try {
          const admins = await base44.entities.User.filter({ role: 'admin' });
          for (const admin of admins) {
            await base44.entities.Notification.create({
              user_email: admin.email,
              type: 'video',
              title: 'Nuova Richiesta Video Intervista',
              content: `${requestingUser.company_name || requestingUser.full_name} ha richiesto una video intervista`,
              reference_id: request.id,
              is_read: false
            });
          }
        } catch (e) {
          console.log('Errore creazione notifiche admin:', e);
        }
        
        try {
          await base44.integrations.Core.SendEmail({
            from_name: 'Piattaforma Consorzio',
            to: 'consorzioimprenditori@gmail.com',
            subject: `Richiesta Video Intervista - ${requestingUser.company_name || requestingUser.full_name}`,
            body: `
Nuova richiesta di video intervista dalla piattaforma:

AZIENDA: ${requestingUser.company_name || 'N/A'}
REFERENTE: ${requestingUser.full_name || 'N/A'}
EMAIL: ${requestingUser.email}
TELEFONO: ${requestingUser.phone || 'N/A'}

MESSAGGIO:
${requestMessage}

---
Questa è una richiesta automatica dalla piattaforma del Consorzio Imprenditori.
            `
          });
        } catch (e) {
          console.log('Errore invio email:', e);
        }
      }, 100);
      
      return request;
    },
    onSuccess: () => {
      setRequestSent(true);
    },
    onError: (error) => {
      console.error('[VIDEO] Errore invio richiesta:', error);
      // Non mostriamo alert, solo log
    }
  });

  const handleVideoPlay = (video) => {
    trackViewMutation.mutate({ videoId: video.id, video });
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
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 pt-16 pb-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold truncate">Video Interviste</h1>
          {isAdmin && (
            <AdminVideoUploadPanel companyUsers={companyUsers} allUsers={allUsers} />
          )}
        </div>

        {/* Banner richiesta video - solo per utenti non admin */}
        {!isAdmin && (
          <div 
            className="bg-[#d4af37] rounded-xl p-4 mb-6 flex items-center justify-between cursor-pointer hover:bg-[#b8960c] transition-colors"
            onClick={() => setShowRequestModal(true)}
          >
            <div>
              <p className="text-slate-900 text-sm font-medium">richiedi la tua video intervista</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-900 text-xs">clicca qui</span>
              <div className="bg-slate-900 rounded-lg p-2">
                <Video className="w-6 h-6 text-[#d4af37]" />
              </div>
            </div>
          </div>
        )}

        {/* Vista Admin con Tabs */}
        {isAdmin ? (
          <Tabs defaultValue="videos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-4">
              <TabsTrigger value="videos" className="data-[state=active]:bg-[#d4af37] data-[state=active]:text-slate-900">
                <Video className="w-4 h-4 mr-2" />
                Video ({videos.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="data-[state=active]:bg-[#d4af37] data-[state=active]:text-slate-900 relative">
                <Mail className="w-4 h-4 mr-2" />
                Richieste
                {pendingVideoRequests.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {pendingVideoRequests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto"></div>
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
                            <div 
                              className="relative aspect-video"
                              onClick={() => handleVideoPlay(video)}
                            >
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
                        <CardContent className="p-3 space-y-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 border-0"
                            onClick={() => sendContactMessageMutation.mutate(video)}
                            disabled={sendContactMessageMutation.isPending}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            {sendContactMessageMutation.isPending ? 'Invio...' : 'contatta l\'azienda'}
                          </Button>
                          
                          <VideoRating 
                            video={video}
                            userEmail={effectiveUser?.email}
                            onRate={(diamonds) => rateMutation.mutate({ videoId: video.id, video, diamonds })}
                            onView={() => handleVideoPlay(video)}
                            isRating={rateMutation.isPending}
                            allUsers={allUsers}
                          />
                          
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests">
              {videoInterviewRequests.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nessuna richiesta ricevuta</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {videoInterviewRequests.map((request) => (
                    <Card key={request.id} className={`border ${request.status === 'pending' ? 'bg-slate-800 border-[#d4af37]/50' : 'bg-slate-800 border-slate-700'}`}>
                      <CardContent className="p-4">
                        {/* Header con nome e badge NUOVO */}
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white font-bold">{request.requester_name}</h3>
                          {request.status === 'pending' && (
                            <span className="bg-[#d4af37] text-slate-900 text-xs font-bold px-2 py-1 rounded">NUOVO</span>
                          )}
                        </div>
                        
                        {/* Info contatto */}
                        <div className="text-slate-400 text-sm mb-3 space-y-1">
                          <p className="break-all">{request.requester_email}</p>
                          {request.requester_phone && (
                            <p>{request.requester_phone}</p>
                          )}
                        </div>
                        
                        {/* Messaggio */}
                        <div className="bg-slate-900 rounded-lg p-3 mb-3">
                          <p className="text-white text-sm whitespace-pre-wrap break-words">{request.message}</p>
                        </div>
                        
                        {/* Footer con data e azioni */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-slate-500 text-xs flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {new Date(request.created_date).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {request.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/20 h-7 text-xs px-2"
                                onClick={() => markVideoRequestReadMutation.mutate(request.id)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Letto
                              </Button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm('Eliminare questa richiesta?')) {
                                  deleteVideoRequestMutation.mutate(request.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-500 p-1 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Vista Utente normale */
          <>
            <h2 className="text-white text-lg font-bold mb-4 text-center">VIDEO INTERVISTE</h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto"></div>
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
                  
                  return (
                    <Card key={video.id} className="bg-[#0a2540] border-[#1a3a5c] overflow-hidden">
                      <div className="relative">
                        <div className="bg-[#0d2d4a] text-[#d4af37] text-sm font-bold px-3 py-1">
                          AZIENDA {video.company_name?.toUpperCase()}
                        </div>
                        
                        {video.title && (
                          <div className="bg-[#0d2d4a] px-3 py-2 border-b border-[#1a3a5c]">
                            <h3 className="text-white font-semibold text-base">{video.title}</h3>
                          </div>
                        )}
                        
                        {youtubeId ? (
                          <div 
                            className="relative aspect-video bg-[#0d2d4a]"
                            onClick={() => handleVideoPlay(video)}
                          >
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
                          <div className="aspect-video bg-[#0d2d4a] flex items-center justify-center">
                            <Play className="w-16 h-16 text-slate-500" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3 space-y-3">
                        <button
                          onClick={() => openContactModal(video)}
                          className="w-full h-10 cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 text-slate-900 font-semibold text-sm"
                          style={{
                            background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
                            borderRadius: '16px',
                            boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.6), inset 0 -6px 8px rgba(0,0,0,0.45), 0 10px 22px rgba(0,0,0,0.6)',
                            border: 'none'
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          contatta l'azienda
                        </button>
                        
                        <VideoRating 
                          video={video}
                          userEmail={effectiveUser?.email}
                          onRate={(diamonds) => rateMutation.mutate({ videoId: video.id, video, diamonds })}
                          onView={() => handleVideoPlay(video)}
                          isRating={rateMutation.isPending}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
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
            <div className="bg-[#d4af37]/20 rounded-lg p-4 border border-[#d4af37]/30">
              <p className="text-[#d4af37] text-base font-bold mb-2">Costo del servizio: € 500 + IVA</p>
              <p className="text-slate-300 text-sm mb-1">
                Intervista + montaggio + pubblicazione nell'app <span className="text-[#d4af37] font-semibold">compresa nel prezzo</span>
              </p>
              <p className="text-slate-300 text-sm">
                + Diritti di utilizzo del video per i tuoi canali e materiale promozionale
              </p>
            </div>
            
            {/* Dati utente */}
            <div className="space-y-2">
              <p className="text-slate-300 text-sm font-medium">I tuoi dati:</p>
              <div className="bg-slate-900 rounded-lg p-3 space-y-2">
                {user?.company_name && (
                  <p className="text-white text-sm font-medium">{user.company_name}</p>
                )}
                {user?.full_name && (
                  <p className="text-slate-300 text-sm">{user.full_name}</p>
                )}
                <p className="text-slate-400 text-xs">{user?.email}</p>
                {user?.phone && <p className="text-slate-400 text-xs">Tel: {user.phone}</p>}
                {user?.city && <p className="text-slate-400 text-xs">Città: {user.city}</p>}
                {user?.address && <p className="text-slate-400 text-xs">Indirizzo: {user.address}</p>}
              </div>
            </div>

            {requestSent ? (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                <p className="text-green-400 font-medium">✓ Richiesta inviata</p>
                <p className="text-slate-400 text-sm mt-1">Verrai contattato a breve</p>
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="Aggiungi eventuali note o preferenze per la tua video intervista..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white min-h-[120px]"
                />
                
                <Button 
                  onClick={() => requestInterviewMutation.mutate()}
                  disabled={requestInterviewMutation.isPending || !requestMessage.trim()}
                  className="w-full bg-[#d4af37] hover:bg-[#b8960c] text-slate-900"
                >
                  {requestInterviewMutation.isPending ? 'Invio...' : 'Invia Richiesta'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="VideoInterviste" unreadMessages={messages.length} />

      {/* Modal Contatta Azienda */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Contatta {selectedVideoForContact?.company_name}</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowContactModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
          <div className="space-y-4 mt-4">
            <p className="text-slate-400 text-sm">
              Scrivi un messaggio all'azienda. Riceveranno una notifica e un'email.
            </p>
            
            <Textarea
              placeholder="Scrivi il tuo messaggio..."
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white min-h-[120px]"
            />
            
            <button
              onClick={() => sendContactMessageMutation.mutate({ 
                video: selectedVideoForContact, 
                message: contactMessage 
              })}
              disabled={sendContactMessageMutation.isPending || !contactMessage.trim()}
              className="w-full h-10 cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-slate-900 font-semibold text-sm"
              style={{
                background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
                borderRadius: '16px',
                boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.6), inset 0 -6px 8px rgba(0,0,0,0.45), 0 10px 22px rgba(0,0,0,0.6)',
                border: 'none'
              }}
            >
              <Mail className="w-4 h-4" />
              {sendContactMessageMutation.isPending ? 'Invio...' : 'Invia all\'azienda'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

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