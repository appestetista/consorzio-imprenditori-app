import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Video, FileText, Heart, X, Play, ArrowLeft, MessageCircle, Send, EyeOff, ShieldCheck, Pencil, Trash2, MoreVertical, UserRoundX, Upload, Link, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';

const CATEGORIES = [
  { name: "Riduzione Costi", color: "bg-emerald-500" },
  { name: "Errori Fatti", color: "bg-red-500" },
  { name: "Programmi Affidabili", color: "bg-blue-500" },
  { name: "Fornitori Top", color: "bg-purple-500" },
  { name: "Come lo rifarei oggi", color: "bg-amber-500" },
  { name: "Consigli di Vita", color: "bg-pink-500" }
];

const getYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/shorts\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

export default function Imprenditori() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Tutti');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPost, setNewPost] = useState({ type: 'post', category: '', title: '', content: '', youtube_url: '', is_anonymous: false });
  const [openComments, setOpenComments] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [deletePostId, setDeletePostId] = useState(null);
  const [videoSource, setVideoSource] = useState('youtube'); // 'youtube', 'upload' o 'record'
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const { impersonation, appMode } = useImpersonation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (appMode === 'user-preview' && impersonation.previewUserId) {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          setEffectiveUser(users[0] || currentUser);
        } else {
          setEffectiveUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId]);

  const { data: posts = [] } = useQuery({
    queryKey: ['imprenditore-posts'],
    queryFn: () => base44.entities.ImprenditorePost.list('-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.ImprenditorePost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprenditore-posts'] });
      setShowAddDialog(false);
      setNewPost({ type: 'post', category: '', title: '', content: '', youtube_url: '', is_anonymous: false });
      setVideoSource('youtube');
      setUploadedVideoUrl(null);
      setUploadError(null);
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (post) => {
      const likes = post.likes || [];
      const hasLiked = likes.includes(effectiveUser?.email);
      const newLikes = hasLiked 
        ? likes.filter(e => e !== effectiveUser?.email)
        : [...likes, effectiveUser?.email];
      return base44.entities.ImprenditorePost.update(post.id, { likes: newLikes });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imprenditore-posts'] }),
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, comment }) => {
      const post = posts.find(p => p.id === postId);
      const comments = post.comments || [];
      return base44.entities.ImprenditorePost.update(postId, {
        comments: [...comments, {
          author_email: effectiveUser?.email,
          author_name: effectiveUser?.company_name || effectiveUser?.full_name,
          content: comment,
          created_at: new Date().toISOString()
        }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprenditore-posts'] });
      setNewComment('');
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImprenditorePost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprenditore-posts'] });
      setEditingPost(null);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id) => base44.entities.ImprenditorePost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprenditore-posts'] });
      setDeletePostId(null);
    },
  });

  const canEditPost = (post) => {
    // Solo l'autore del post o un admin reale (non in impersonation) può modificare/eliminare
    const isRealAdmin = user?.role === 'admin' && !impersonation.active;
    return post.author_email === effectiveUser?.email || isRealAdmin;
  };

  const handleSubmit = () => {
    if (!newPost.title || !newPost.category) return;
    
    const postData = {
      ...newPost,
      author_email: effectiveUser?.email,
      author_name: effectiveUser?.company_name || effectiveUser?.full_name,
      likes: [],
      comments: [],
    };
    
    // Se è un video caricato, usa l'URL del video uploadato
    if (newPost.type === 'video' && videoSource === 'upload' && uploadedVideoUrl) {
      postData.video_url = uploadedVideoUrl;
      postData.youtube_url = null;
    }
    
    createPostMutation.mutate(postData);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica tipo file
    if (!file.type.startsWith('video/')) {
      setUploadError('Seleziona un file video valido');
      return;
    }

    // Verifica dimensione (approssimativa per 2 minuti - circa 100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setUploadError('Il video è troppo grande. Massimo 100MB (circa 2 minuti)');
      return;
    }

    // Verifica durata
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = async () => {
      window.URL.revokeObjectURL(video.src);
      
      if (video.duration > 120) { // 2 minuti = 120 secondi
        setUploadError('Il video deve durare massimo 2 minuti');
        return;
      }

      // Upload del file
      setIsUploading(true);
      setUploadError(null);
      
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        setUploadedVideoUrl(result.file_url);
      } catch (err) {
        setUploadError('Errore durante il caricamento. Riprova.');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };

    video.src = URL.createObjectURL(file);
  };

  const resetVideoUpload = () => {
    setUploadedVideoUrl(null);
    setUploadError(null);
    setRecordedBlob(null);
    stopRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        
        // Ferma lo stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      // Timer per durata massima 2 minuti
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 120) {
            clearInterval(interval);
            recorder.stop();
            setIsRecording(false);
            return 120;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Errore accesso camera:', err);
      setUploadError('Impossibile accedere alla fotocamera. Verifica i permessi.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const uploadRecordedVideo = async () => {
    if (!recordedBlob) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const file = new File([recordedBlob], 'video-registrato.webm', { type: 'video/webm' });
      const result = await base44.integrations.Core.UploadFile({ file });
      setUploadedVideoUrl(result.file_url);
      setRecordedBlob(null);
    } catch (err) {
      setUploadError('Errore durante il caricamento. Riprova.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredPosts = selectedCategory === 'Tutti' 
    ? posts 
    : posts.filter(p => p.category === selectedCategory);

  const getCategoryColor = (categoryName) => {
    const cat = CATEGORIES.find(c => c.name === categoryName);
    return cat ? cat.color : 'bg-slate-700';
  };

  if (loading || !effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl('Home'))} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lime-400 text-xl font-bold">Da Imprenditore a Imprenditore</h1>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-lime-400 text-slate-900 hover:bg-lime-500"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Aggiungi
          </Button>
        </div>

        {/* Etichette categorie */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide -mx-4 px-4">
          <button 
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === 'Tutti' ? 'bg-lime-400 text-slate-900 shadow-lg shadow-lime-400/25' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'}`}
            onClick={() => setSelectedCategory('Tutti')}
          >
            Tutti
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat.name}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat.name ? `${cat.color} text-white shadow-lg` : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Lista post */}
        <div className="space-y-5">
          {filteredPosts.map(post => {
            const youtubeId = getYoutubeId(post.youtube_url);
            const hasLiked = (post.likes || []).includes(effectiveUser?.email);
            const categoryData = CATEGORIES.find(c => c.name === post.category);
            
            return (
              <div key={post.id} className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-2xl overflow-hidden shadow-lg border border-slate-700/50">
                {/* Video in alto se presente */}
                {post.type === 'video' && youtubeId ? (
                  <div className="relative aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                ) : post.type === 'video' && post.video_url ? (
                  <div className="relative aspect-video bg-black">
                    <video
                      src={post.video_url}
                      controls
                      className="w-full h-full"
                    />
                  </div>
                ) : post.is_anonymous ? (
                  <div className="relative aspect-video bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-slate-600/50 rounded-full flex items-center justify-center mb-4 border-2 border-slate-500/30">
                      <UserRoundX className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-white font-semibold text-lg mb-1">Contributo Anonimo</p>
                    <div className="flex items-center gap-2 text-lime-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-sm font-medium">Verificato dal Consorzio</span>
                    </div>
                  </div>
                ) : null}
                
                <div className="p-4">
                  {/* Header con autore e categoria */}
                  <div className="flex items-start gap-3 mb-3">
                    {post.is_anonymous ? (
                      <div className="w-11 h-11 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-inner">
                        <UserRoundX className="w-5 h-5 text-slate-300" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center shadow-md">
                        {post.type === 'video' ? <Video className="w-5 h-5 text-slate-900" /> : <FileText className="w-5 h-5 text-slate-900" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {post.is_anonymous ? (
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                            <span className="text-lime-400 text-xs font-medium">Verificato</span>
                          </div>
                          <p className="text-white font-semibold">Anonimo</p>
                        </div>
                      ) : (
                        <p className="text-white font-semibold">{post.author_name}</p>
                      )}
                      <p className="text-slate-500 text-xs">{new Date(post.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getCategoryColor(post.category)} text-white text-xs px-2.5 py-1 rounded-full shadow-sm`}>
                        {post.category}
                      </Badge>
                      {canEditPost(post) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-700 border-slate-600 rounded-xl shadow-xl">
                            <DropdownMenuItem 
                              className="text-white hover:bg-slate-600 cursor-pointer rounded-lg"
                              onClick={() => setEditingPost(post)}
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-400 hover:bg-slate-600 cursor-pointer rounded-lg"
                              onClick={() => setDeletePostId(post.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Titolo */}
                  <h3 className="text-white font-bold text-lg mb-2 leading-tight">{post.title}</h3>

                  {/* Contenuto */}
                  {post.content && (
                    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{post.content}</p>
                  )}

                  {/* Azioni */}
                  <div className="flex items-center gap-1 pt-2 border-t border-slate-700/50">
                    <button 
                      onClick={() => likeMutation.mutate(post)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${hasLiked ? 'bg-lime-400/10 text-lime-400' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                    >
                      <Heart className={`w-5 h-5 ${hasLiked ? 'fill-lime-400' : ''}`} />
                      <span className="text-sm font-medium">{(post.likes || []).length}</span>
                    </button>
                    <button 
                      onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${openComments === post.id ? 'bg-slate-700/50 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{(post.comments || []).length}</span>
                    </button>
                  </div>

                  {/* Sezione commenti */}
                  {openComments === post.id && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                      {(post.comments || []).map((comment, idx) => (
                        <div key={idx} className="bg-slate-700/40 backdrop-blur rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 bg-lime-400/20 rounded-full flex items-center justify-center">
                              <span className="text-lime-400 text-xs font-bold">{comment.author_name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                            <p className="text-lime-400 font-medium text-sm">{comment.author_name}</p>
                            <span className="text-slate-600">•</span>
                            <p className="text-slate-500 text-xs">
                              {new Date(comment.created_at).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <p className="text-white text-sm pl-8">{comment.content}</p>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <Input
                          placeholder="Scrivi un commento..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="bg-slate-700/50 border-slate-600/50 text-white rounded-xl flex-1 focus:border-lime-400/50"
                        />
                        <Button
                          onClick={() => {
                            if (newComment.trim()) {
                              addCommentMutation.mutate({ postId: post.id, comment: newComment });
                            }
                          }}
                          disabled={!newComment.trim() || addCommentMutation.isPending}
                          className="bg-lime-400 text-slate-900 hover:bg-lime-500 rounded-xl"
                          size="icon"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">Nessun contenuto in questa categoria</p>
            </div>
          )}
        </div>
      </main>

      {/* Dialog aggiungi post */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lime-400 text-lg font-semibold">Condividi un consiglio</h2>
            <button onClick={() => setShowAddDialog(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={newPost.type === 'post' ? 'default' : 'outline'}
                className={newPost.type === 'post' ? 'bg-lime-400 text-slate-900 [&>svg]:text-slate-900' : 'border-slate-600 text-slate-400 [&>svg]:text-slate-400 hover:text-slate-300 hover:[&>svg]:text-slate-300'}
                onClick={() => setNewPost({...newPost, type: 'post'})}
              >
                <FileText className="w-4 h-4 mr-2" /> Post
              </Button>
              <Button
                variant={newPost.type === 'video' ? 'default' : 'outline'}
                className={newPost.type === 'video' ? 'bg-lime-400 text-slate-900 [&>svg]:text-slate-900' : 'border-slate-600 text-slate-400 [&>svg]:text-slate-400 hover:text-slate-300 hover:[&>svg]:text-slate-300'}
                onClick={() => setNewPost({...newPost, type: 'video'})}
              >
                <Video className="w-4 h-4 mr-2" /> Video
              </Button>
            </div>

            <Select value={newPost.category} onValueChange={(v) => setNewPost({...newPost, category: v})}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.name} value={cat.name} className="text-white">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input 
              placeholder="Titolo"
              value={newPost.title}
              onChange={(e) => setNewPost({...newPost, title: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white"
            />

            {newPost.type === 'video' && (
              <div className="space-y-3">
                {/* Toggle sorgente video */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setVideoSource('youtube'); resetVideoUpload(); }}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border transition-all ${videoSource === 'youtube' ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-slate-300'}`}
                  >
                    <Link className={`w-4 h-4 ${videoSource === 'youtube' ? 'text-white' : 'text-slate-400'}`} />
                    <span className="text-xs">YouTube</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVideoSource('upload'); setNewPost({...newPost, youtube_url: ''}); }}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border transition-all ${videoSource === 'upload' ? 'bg-lime-500 border-lime-400 text-slate-900' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-slate-300'}`}
                  >
                    <Upload className={`w-4 h-4 ${videoSource === 'upload' ? 'text-slate-900' : 'text-slate-400'}`} />
                    <span className="text-xs">Carica</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVideoSource('record'); resetVideoUpload(); setNewPost({...newPost, youtube_url: ''}); }}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border transition-all ${videoSource === 'record' ? 'bg-blue-500 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-slate-300'}`}
                  >
                    <Video className={`w-4 h-4 ${videoSource === 'record' ? 'text-white' : 'text-slate-400'}`} />
                    <span className="text-xs">Registra</span>
                  </button>
                </div>

                {videoSource === 'youtube' ? (
                  <>
                    <Input 
                      placeholder="URL video YouTube"
                      value={newPost.youtube_url}
                      onChange={(e) => setNewPost({...newPost, youtube_url: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    {/* Anteprima YouTube */}
                    {getYoutubeId(newPost.youtube_url) && (
                      <div className="rounded-lg overflow-hidden">
                        <p className="text-slate-400 text-xs mb-2">Anteprima:</p>
                        <div className="aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${getYoutubeId(newPost.youtube_url)}`}
                            className="w-full h-full rounded-lg"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : videoSource === 'upload' ? (
                  <div className="space-y-3">
                    {!uploadedVideoUrl ? (
                      <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
                            <p className="text-slate-300 text-sm">Caricamento in corso...</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                            <p className="text-slate-300 text-sm mb-1">Carica un video (max 2 minuti)</p>
                            <p className="text-slate-500 text-xs mb-3">MP4, MOV, WebM - Max 100MB</p>
                            <label className="cursor-pointer">
                              <span className="bg-lime-400 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-lime-500 transition-colors">
                                Seleziona file
                              </span>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={handleVideoUpload}
                                className="hidden"
                              />
                            </label>
                          </>
                        )}
                        {uploadError && (
                          <p className="text-red-400 text-sm mt-3">{uploadError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-slate-400 text-xs">Anteprima video:</p>
                          <button
                            type="button"
                            onClick={resetVideoUpload}
                            className="text-red-400 text-xs hover:text-red-300 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Rimuovi
                          </button>
                        </div>
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <video
                            src={uploadedVideoUrl}
                            controls
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-lime-400 text-sm">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Video pronto per la pubblicazione</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Registrazione video diretta */
                  <div className="space-y-3">
                    {!uploadedVideoUrl ? (
                      !recordedBlob ? (
                        <div className="border-2 border-dashed border-slate-600 rounded-xl overflow-hidden">
                          {isRecording ? (
                            <div className="relative">
                              <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full aspect-video object-cover"
                              />
                              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <span className="text-white text-sm font-medium">{formatTime(recordingTime)} / 2:00</span>
                              </div>
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                                <button
                                  type="button"
                                  onClick={stopRecording}
                                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2"
                                >
                                  <div className="w-3 h-3 bg-white rounded-sm" />
                                  Stop
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 text-center">
                              <Video className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                              <p className="text-slate-300 text-sm mb-1">Registra un video (max 2 minuti)</p>
                              <p className="text-slate-500 text-xs mb-3">Usa la fotocamera del dispositivo</p>
                              <button
                                type="button"
                                onClick={startRecording}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto"
                              >
                                <div className="w-3 h-3 bg-white rounded-full" />
                                Inizia registrazione
                              </button>
                              {uploadError && (
                                <p className="text-red-400 text-sm mt-3">{uploadError}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-xs">Anteprima registrazione:</p>
                            <button
                              type="button"
                              onClick={() => setRecordedBlob(null)}
                              className="text-red-400 text-xs hover:text-red-300 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Riprova
                            </button>
                          </div>
                          <div className="aspect-video rounded-lg overflow-hidden bg-black">
                            <video
                              src={URL.createObjectURL(recordedBlob)}
                              controls
                              className="w-full h-full"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={uploadRecordedVideo}
                            disabled={isUploading}
                            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Caricamento...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Conferma e carica
                              </>
                            )}
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-slate-400 text-xs">Video registrato:</p>
                          <button
                            type="button"
                            onClick={resetVideoUpload}
                            className="text-red-400 text-xs hover:text-red-300 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Rimuovi
                          </button>
                        </div>
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <video
                            src={uploadedVideoUrl}
                            controls
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-lime-400 text-sm">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Video pronto per la pubblicazione</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Textarea 
              placeholder="Scrivi il tuo consiglio..."
              value={newPost.content}
              onChange={(e) => setNewPost({...newPost, content: e.target.value})}
              className="bg-slate-700 border-slate-600 text-white min-h-24"
            />

            {/* Toggle Anonimato */}
            <div 
              onClick={() => setNewPost({...newPost, is_anonymous: !newPost.is_anonymous})}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${newPost.is_anonymous ? 'bg-slate-600 border-lime-400' : 'bg-slate-700 border-slate-600'}`}
            >
              <EyeOff className={`w-5 h-5 ${newPost.is_anonymous ? 'text-lime-400' : 'text-slate-400'}`} />
              <div className="flex-1">
                <p className={`font-medium ${newPost.is_anonymous ? 'text-lime-400' : 'text-white'}`}>
                  Pubblica in anonimo
                </p>
                <p className="text-slate-400 text-xs">Il tuo nome non sarà visibile, ma il post sarà verificato dalla piattaforma</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${newPost.is_anonymous ? 'border-lime-400 bg-lime-400' : 'border-slate-500'}`}>
                {newPost.is_anonymous && <span className="text-slate-900 text-xs">✓</span>}
              </div>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={
                !newPost.title || 
                !newPost.category || 
                createPostMutation.isPending ||
                (newPost.type === 'video' && videoSource === 'upload' && !uploadedVideoUrl) ||
                isUploading
              }
              className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
            >
              {createPostMutation.isPending ? 'Pubblicazione...' : 'Pubblica'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="Imprenditori" unreadMessages={messages.length} />

      {/* Dialog modifica post */}
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lime-400 text-lg font-semibold">Modifica post</h2>
            <button onClick={() => setEditingPost(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {editingPost && (
            <div className="space-y-4">
              <Select 
                value={editingPost.category} 
                onValueChange={(v) => setEditingPost({...editingPost, category: v})}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.name} value={cat.name} className="text-white">{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input 
                placeholder="Titolo"
                value={editingPost.title}
                onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
              />

              {editingPost.type === 'video' && (
                <Input 
                  placeholder="URL video YouTube"
                  value={editingPost.youtube_url || ''}
                  onChange={(e) => setEditingPost({...editingPost, youtube_url: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              )}

              <Textarea 
                placeholder="Scrivi il tuo consiglio..."
                value={editingPost.content || ''}
                onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white min-h-24"
              />

              {/* Toggle Anonimato */}
              <div 
                onClick={() => setEditingPost({...editingPost, is_anonymous: !editingPost.is_anonymous})}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${editingPost.is_anonymous ? 'bg-slate-600 border-lime-400' : 'bg-slate-700 border-slate-600'}`}
              >
                <EyeOff className={`w-5 h-5 ${editingPost.is_anonymous ? 'text-lime-400' : 'text-slate-400'}`} />
                <div className="flex-1">
                  <p className={`font-medium ${editingPost.is_anonymous ? 'text-lime-400' : 'text-white'}`}>
                    Pubblica in anonimo
                  </p>
                  <p className="text-slate-400 text-xs">Il tuo nome non sarà visibile</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${editingPost.is_anonymous ? 'border-lime-400 bg-lime-400' : 'border-slate-500'}`}>
                  {editingPost.is_anonymous && <span className="text-slate-900 text-xs">✓</span>}
                </div>
              </div>

              <Button 
                onClick={() => updatePostMutation.mutate({ 
                  id: editingPost.id, 
                  data: { 
                    title: editingPost.title, 
                    content: editingPost.content, 
                    category: editingPost.category,
                    youtube_url: editingPost.youtube_url,
                    is_anonymous: editingPost.is_anonymous
                  } 
                })}
                disabled={!editingPost.title || !editingPost.category || updatePostMutation.isPending}
                className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
              >
                Salva modifiche
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Elimina post</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Sei sicuro di voler eliminare questo post? L'azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletePostMutation.mutate(deletePostId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}