import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ArrowLeft, MessageCircle, Send, EyeOff, ShieldCheck, Pencil, Trash2, MoreVertical, UserRoundX, BarChart3, Check, Users, Image, Video, Upload, Loader2, Camera, AtSign, Globe, Bell, User, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import useNotificationSound from '../components/hooks/useNotificationSound';
import SectionHeaderIcons from '../components/layout/SectionHeaderIcons';

export default function Imprenditori() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [newPoll, setNewPoll] = useState({ 
    title: '', 
    content: '', 
    options: [{ id: '1', text: '', votes: [] }, { id: '2', text: '', votes: [] }],
    is_anonymous: false,
    is_multiple_choice: false,
    media_url: null,
    media_type: null,
    target_type: 'all',
    target_users: []
  });
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [openComments, setOpenComments] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false); // Nuova: anteprima camera attiva
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = frontale, 'environment' = posteriore
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const [newComment, setNewComment] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [deletePostId, setDeletePostId] = useState(null);
  const [showVotersDialog, setShowVotersDialog] = useState(null);
  const { impersonation, appMode } = useImpersonation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { playSound } = useNotificationSound();

  useEffect(() => {
    window.scrollTo(0, 0);
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

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-polls'],
    queryFn: () => base44.entities.User.list(),
  });

  // Conta sondaggi non visualizzati dall'utente corrente (solo quelli visibili a lui)
  const unviewedPollsCount = posts.filter(post => {
    // Prima verifica se l'utente può vedere questo sondaggio
    if (post.target_type === 'specific') {
      const isAuthor = post.author_email === effectiveUser?.email;
      const isTargetUser = post.target_users?.includes(effectiveUser?.email);
      const isRealAdmin = user?.role === 'admin' && !impersonation?.active;
      if (!isAuthor && !isTargetUser && !isRealAdmin) return false;
    }
    // Poi verifica se lo ha già visto
    if (!post.viewed_by) return true;
    return !post.viewed_by.includes(effectiveUser?.email);
  }).length;

  // Subscribe alle notifiche per sondaggi indirizzati specificamente
  useEffect(() => {
    if (!effectiveUser?.email) return;

    const unsubscribe = base44.entities.ImprenditorePost.subscribe((event) => {
      if (event.type === 'create' && event.data) {
        // Se il post è indirizzato specificamente a questo utente, suona notifica
        if (event.data.target_type === 'specific' && 
            event.data.target_users?.includes(effectiveUser.email)) {
          playSound();
        }
        queryClient.invalidateQueries({ queryKey: ['imprenditore-posts'] });
      }
    });

    return unsubscribe;
  }, [effectiveUser?.email, queryClient, playSound]);

  // Segna post come visualizzati e notifiche come lette quando l'utente entra nella pagina
  useEffect(() => {
    const markAsViewed = async () => {
      if (!effectiveUser?.email || posts.length === 0) return;
      
      const unviewedPosts = posts.filter(post => {
        // Prima verifica se l'utente può vedere questo sondaggio
        if (post.target_type === 'specific') {
          const isAuthor = post.author_email === effectiveUser?.email;
          const isTargetUser = post.target_users?.includes(effectiveUser?.email);
          const isRealAdmin = user?.role === 'admin' && !impersonation?.active;
          if (!isAuthor && !isTargetUser && !isRealAdmin) return false;
        }
        // Poi verifica se lo ha già visto
        if (!post.viewed_by) return true;
        return !post.viewed_by.includes(effectiveUser.email);
      });

      for (const post of unviewedPosts) {
        const viewedBy = post.viewed_by || [];
        if (!viewedBy.includes(effectiveUser.email)) {
          await base44.entities.ImprenditorePost.update(post.id, {
            viewed_by: [...viewedBy, effectiveUser.email]
          });
        }
      }
      
      // Segna le notifiche di sondaggi come lette
      const notifications = await base44.entities.Notification.filter({
        user_email: effectiveUser.email,
        type: 'cultura_aziendale',
        is_read: false
      });
      
      for (const notif of notifications) {
        await base44.entities.Notification.update(notif.id, { is_read: true });
      }
    };

    markAsViewed();
  }, [effectiveUser?.email, posts, user?.role, impersonation?.active]);

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      const post = await base44.entities.ImprenditorePost.create(data);
      
      // Se il sondaggio è indirizzato a utenti specifici, crea notifiche
      if (data.target_type === 'specific' && data.target_users?.length > 0) {
        for (const targetEmail of data.target_users) {
          await base44.entities.Notification.create({
            user_email: targetEmail,
            type: 'cultura_aziendale', // riuso tipo esistente per sondaggi
            title: 'Nuovo sondaggio per te',
            content: `${data.author_name} ti ha chiesto un parere: "${data.title}"`,
            is_read: false,
            reference_id: post.id
          });
        }
      }
      
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imprenditore-posts'] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setNewPoll({ 
      title: '', 
      content: '', 
      options: [{ id: '1', text: '', votes: [] }, { id: '2', text: '', votes: [] }],
      is_anonymous: false,
      is_multiple_choice: false,
      media_url: null,
      media_type: null,
      target_type: 'all',
      target_users: []
    });
    setUploadError(null);
    setRecordedBlob(null);
    stopRecording();
    setShowUserSelector(false);
    setUserSearchQuery('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Seleziona un file immagine valido');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewPoll({ ...newPoll, media_url: result.file_url, media_type: 'image' });
    } catch (err) {
      setUploadError('Errore durante il caricamento. Riprova.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setUploadError('Seleziona un file video valido');
      return;
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Il video è troppo grande. Massimo 100MB');
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = async () => {
      window.URL.revokeObjectURL(video.src);
      
      if (video.duration > 120) {
        setUploadError('Il video deve durare massimo 2 minuti');
        return;
      }

      setIsUploading(true);
      setUploadError(null);
      
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        setNewPoll({ ...newPoll, media_url: result.file_url, media_type: 'video' });
      } catch (err) {
        setUploadError('Errore durante il caricamento. Riprova.');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };

    video.src = URL.createObjectURL(file);
  };

  // Apre l'anteprima della camera (senza registrare)
  const openCameraPreview = async (mode = facingMode) => {
    try {
      // Prima imposta isPreviewing per rendere visibile il video element
      setIsPreviewing(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode }, 
        audio: true 
      });
      streamRef.current = stream;
      
      // Usa setTimeout per assicurarsi che il video element sia renderizzato
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err) {
      console.error('Errore accesso camera:', err);
      setUploadError('Impossibile accedere alla fotocamera. Verifica i permessi.');
      setIsPreviewing(false);
    }
  };

  // Avvia la registrazione (dalla modalità anteprima)
  const startRecording = async () => {
    if (!streamRef.current) return;
    
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordedBlob(blob);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsPreviewing(false);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 120) {
          clearInterval(timerRef.current);
          recorder.stop();
          setIsRecording(false);
          return 120;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // Chiude l'anteprima senza registrare
  const closeCameraPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsPreviewing(false);
    setIsRecording(false);
  };

  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    
    // Ferma lo stream corrente
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (isRecording) {
      // Se stava registrando, ferma la registrazione
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      setIsRecording(false);
    }
    
    // Riapri con la nuova camera
    setTimeout(() => openCameraPreview(newMode), 100);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    // Non fermare lo stream qui, viene fermato in recorder.onstop
    setIsRecording(false);
  };

  const uploadRecordedVideo = async () => {
    if (!recordedBlob) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const file = new File([recordedBlob], 'video-registrato.webm', { type: 'video/webm' });
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewPoll({ ...newPoll, media_url: result.file_url, media_type: 'video' });
      setRecordedBlob(null);
    } catch (err) {
      setUploadError('Errore durante il caricamento. Riprova.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeMedia = () => {
    setNewPoll({ ...newPoll, media_url: null, media_type: null });
    setRecordedBlob(null);
    setUploadError(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const voteMutation = useMutation({
    mutationFn: async ({ postId, optionId }) => {
      const post = posts.find(p => p.id === postId);
      const newOptions = post.options.map(opt => {
        // Rimuovi il voto da tutte le opzioni se non è scelta multipla
        let newVotes = opt.votes || [];
        if (!post.is_multiple_choice) {
          newVotes = newVotes.filter(email => email !== effectiveUser?.email);
        }
        
        // Aggiungi o rimuovi il voto dall'opzione selezionata
        if (opt.id === optionId) {
          if (newVotes.includes(effectiveUser?.email)) {
            newVotes = newVotes.filter(email => email !== effectiveUser?.email);
          } else {
            newVotes = [...newVotes, effectiveUser?.email];
          }
        }
        
        return { ...opt, votes: newVotes };
      });
      
      return base44.entities.ImprenditorePost.update(postId, { options: newOptions });
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
    const isRealAdmin = user?.role === 'admin' && !impersonation.active;
    return post.author_email === effectiveUser?.email || isRealAdmin;
  };

  const handleSubmit = () => {
    if (!newPoll.title || newPoll.options.filter(o => o.text.trim()).length < 2) return;
    
    const filteredOptions = newPoll.options.filter(o => o.text.trim()).map((o, idx) => ({
      id: String(idx + 1),
      text: o.text.trim(),
      votes: []
    }));
    
    const postData = {
      type: 'sondaggio',
      title: newPoll.title,
      content: newPoll.content,
      options: filteredOptions,
      is_anonymous: newPoll.is_anonymous,
      is_multiple_choice: newPoll.is_multiple_choice,
      is_closed: false,
      author_email: effectiveUser?.email,
      author_name: effectiveUser?.company_name || effectiveUser?.full_name,
      comments: [],
      media_url: newPoll.media_url,
      media_type: newPoll.media_type,
      target_type: newPoll.target_type,
      target_users: newPoll.target_type === 'specific' ? newPoll.target_users : [],
      viewed_by: [effectiveUser?.email]
    };
    
    createPostMutation.mutate(postData);
  };

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll({
        ...newPoll,
        options: [...newPoll.options, { id: String(newPoll.options.length + 1), text: '', votes: [] }]
      });
    }
  };

  const removeOption = (idx) => {
    if (newPoll.options.length > 2) {
      const newOptions = newPoll.options.filter((_, i) => i !== idx);
      setNewPoll({ ...newPoll, options: newOptions });
    }
  };

  const updateOption = (idx, text) => {
    const newOptions = [...newPoll.options];
    newOptions[idx] = { ...newOptions[idx], text };
    setNewPoll({ ...newPoll, options: newOptions });
  };

  const getTotalVotes = (post) => {
    if (!post.options) return 0;
    const allVoters = new Set();
    post.options.forEach(opt => (opt.votes || []).forEach(v => allVoters.add(v)));
    return allVoters.size;
  };

  const getOptionPercentage = (post, option) => {
    const totalVoters = getTotalVotes(post);
    if (totalVoters === 0) return 0;
    return Math.round(((option.votes || []).length / totalVoters) * 100);
  };

  const hasVoted = (post) => {
    if (!post.options) return false;
    return post.options.some(opt => (opt.votes || []).includes(effectiveUser?.email));
  };

  if (loading || !effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(createPageUrl('Esplora?tab=strumenti'))} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
                <ArrowLeft className="w-7 h-7" />
              </button>
              <h1 className="text-lime-400 text-xl font-bold">Decisioni Condivise</h1>
            </div>
            <SectionHeaderIcons userEmail={effectiveUser?.email} />
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500 animate-pulse h-11 text-sm font-semibold"
          >
            <Plus className="w-4 h-4 mr-1" /> Nuova decisione da prendere
          </Button>
        </div>

        {/* Info banner con bottone esempio */}
        <div className="relative mb-6">
          <div className="bg-gradient-to-r from-lime-400/10 to-emerald-400/10 border border-lime-400/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-lime-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Chiedi consiglio alla community</p>
                <p className="text-slate-400 text-sm">Crea sondaggi e prendi decisioni insieme agli altri imprenditori</p>
              </div>
            </div>
          </div>
          
          {/* Linguetta "Esempio" attaccata sotto al bordo inferiore, a destra */}
          {!showExample && (
            <button
              onClick={() => setShowExample(true)}
              className="absolute top-full right-2 w-20 h-5 bg-gradient-to-r from-lime-400/10 to-emerald-400/10 border border-t-0 border-lime-400/30 rounded-b-lg flex items-center justify-center hover:bg-lime-400/20 transition-all"
            >
              <span className="text-lime-400 text-[10px] font-bold">Esempio</span>
            </button>
          )}
          
          {/* Pannello esempio che scende dall'alto */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showExample ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-2xl overflow-hidden shadow-lg border border-slate-700/50">
              {/* Header con X per chiudere */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <p className="text-lime-400 font-bold text-sm">Esempio di sondaggio</p>
                <button
                  onClick={() => setShowExample(false)}
                  className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Sondaggio esempio - replica esatta della card reale */}
              <div className="p-4 pt-0">
                {/* Header con autore */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center shadow-md">
                    <BarChart3 className="w-5 h-5 text-slate-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">Mario Rossi Srl</p>
                    <p className="text-slate-500 text-xs">28 gen 2026</p>
                  </div>
                </div>

                {/* Domanda */}
                <h3 className="text-white font-bold text-lg mb-2 leading-tight">Assumo un nuovo dipendente o esternalizzo il servizio?</h3>
                <p className="text-slate-400 text-sm mb-4">Ho bisogno di supporto per la gestione amministrativa. Cosa mi consigliate?</p>

                {/* Opzioni di voto */}
                <div className="space-y-2 mb-4">
                  <button className="w-full text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full border-2 border-lime-400 bg-lime-400 flex items-center justify-center">
                        <Check className="w-3 h-3 text-slate-900" />
                      </div>
                      <span className="text-sm flex-1 text-lime-400 font-medium">Assumi un dipendente</span>
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-300" />
                        </div>
                        <span className="text-sm text-lime-400">12</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden ml-7">
                      <div className="h-full bg-lime-400 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </button>
                  
                  <button className="w-full text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full border-2 border-slate-500 flex items-center justify-center"></div>
                      <span className="text-sm flex-1 text-white">Esternalizza il servizio</span>
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-300" />
                        </div>
                        <span className="text-sm text-slate-400">8</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden ml-7">
                      <div className="h-full bg-slate-500 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </button>
                </div>

                {/* Info voti */}
                <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-slate-400" />
                    </div>
                    <span>20 voti</span>
                  </div>
                </div>

                {/* Bottone commenti */}
                <div className="flex items-center gap-1 pt-3 mt-3 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">5 commenti</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista sondaggi */}
        <div className="space-y-5">
          {posts
            .filter(post => {
              // Se il sondaggio è per tutti, mostralo
              if (post.target_type === 'all' || !post.target_type) return true;
              
              // Se è per utenti specifici, mostralo solo a:
              // - L'autore del sondaggio
              // - Gli utenti destinatari
              // - Gli admin (non in impersonation)
              const isAuthor = post.author_email === effectiveUser?.email;
              const isTargetUser = post.target_users?.includes(effectiveUser?.email);
              const isRealAdmin = user?.role === 'admin' && !impersonation.active;
              
              return isAuthor || isTargetUser || isRealAdmin;
            })
            .map(post => {
            const totalVotes = getTotalVotes(post);
            const userHasVoted = hasVoted(post);
            
            return (
              <div key={post.id} className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-2xl overflow-hidden shadow-lg border border-slate-700/50">
                {/* Media allegato */}
                {post.media_url && post.media_type === 'image' && (
                  <div className="aspect-video bg-slate-900">
                    <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {post.media_url && post.media_type === 'video' && (
                  <div className="aspect-video bg-black">
                    <video src={post.media_url} controls className="w-full h-full" />
                  </div>
                )}
                
                <div className="p-4">
                  {/* Header con autore */}
                  <div className="flex items-start gap-3 mb-4">
                    {post.is_anonymous ? (
                      <div className="w-11 h-11 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-inner">
                        <UserRoundX className="w-5 h-5 text-slate-300" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center shadow-md">
                        <BarChart3 className="w-5 h-5 text-slate-900" />
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
                      {post.is_closed && (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">Chiuso</Badge>
                      )}
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
                              className="text-white hover:bg-slate-600 cursor-pointer rounded-lg"
                              onClick={() => updatePostMutation.mutate({ 
                                id: post.id, 
                                data: { is_closed: !post.is_closed } 
                              })}
                            >
                              {post.is_closed ? '🔓 Riapri' : '🔒 Chiudi'} sondaggio
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

                  {/* Domanda */}
                  <h3 className="text-white font-bold text-lg mb-2 leading-tight">{post.title}</h3>
                  
                  {post.content && (
                    <p className="text-slate-400 text-sm mb-4">{post.content}</p>
                  )}

                  {/* Opzioni di voto */}
                  <div className="space-y-2 mb-4">
                    {(post.options || []).map((option) => {
                      const votesCount = (option.votes || []).length;
                      const isSelected = (option.votes || []).includes(effectiveUser?.email);
                      const canVote = !post.is_closed;
                      const percentage = getOptionPercentage(post, option);

                      return (
                        <button
                          key={option.id}
                          onClick={() => canVote && voteMutation.mutate({ postId: post.id, optionId: option.id })}
                          disabled={!canVote}
                          className={`w-full text-left ${!canVote ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'border-lime-400 bg-lime-400' 
                                : 'border-slate-500'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-slate-900" />}
                            </div>
                            <span className={`text-sm flex-1 ${isSelected ? 'text-lime-400 font-medium' : 'text-white'}`}>
                              {option.text}
                            </span>
                            <div className="flex items-center gap-1">
                              {votesCount > 0 && (
                                <div className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center">
                                  <User className="w-3 h-3 text-slate-300" />
                                </div>
                              )}
                              <span className={`text-sm ${isSelected ? 'text-lime-400' : 'text-slate-400'}`}>
                                {votesCount}
                              </span>
                            </div>
                          </div>
                          {/* Barra progresso sotto */}
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden ml-7">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                isSelected ? 'bg-lime-400' : 'bg-slate-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Info voti */}
                  <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-slate-700/50">
                    <button 
                      onClick={() => totalVotes > 0 && setShowVotersDialog(post.id)}
                      className={`flex items-center gap-2 ${totalVotes > 0 ? 'hover:text-lime-400 cursor-pointer' : ''}`}
                      disabled={totalVotes === 0}
                    >
                      <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <span>{totalVotes} {totalVotes === 1 ? 'voto' : 'voti'}</span>
                    </button>
                    {post.is_multiple_choice && (
                      <span className="text-xs bg-slate-700 px-2 py-1 rounded-full">Scelta multipla</span>
                    )}
                  </div>

                  {/* Bottone commenti */}
                  <div className="flex items-center gap-1 pt-3 mt-3 border-t border-slate-700/50">
                    <button 
                      onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${openComments === post.id ? 'bg-slate-700/50 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{(post.comments || []).length} commenti</span>
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

          {posts.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">Nessun sondaggio ancora</p>
              <p className="text-slate-500 text-sm">Crea il primo sondaggio per chiedere consiglio alla community</p>
            </div>
          )}
        </div>
      </main>

      {/* Dialog crea sondaggio */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[85vh] overflow-y-auto [&>button]:hidden p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lime-400 text-lg font-semibold">Crea sondaggio</h2>
            <button onClick={() => setShowAddDialog(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-1 block">La tua domanda</label>
              <Input 
                placeholder="Es: Quale fornitore consigliate per...?"
                value={newPoll.title}
                onChange={(e) => setNewPoll({...newPoll, title: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1 block">Descrizione (opzionale)</label>
              <Textarea 
                placeholder="Aggiungi dettagli alla tua domanda..."
                value={newPoll.content}
                onChange={(e) => setNewPoll({...newPoll, content: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white min-h-16"
              />
            </div>

            {/* Sezione media */}
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Aggiungi foto o video (opzionale)</label>
              
              {!newPoll.media_url && !recordedBlob && !isPreviewing ? (
                <div className="space-y-3">
                  {/* Pulsante Apri Camera - grande e in evidenza */}
                  <button
                    type="button"
                    onClick={() => openCameraPreview()}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-dashed border-slate-500 bg-slate-700/50 hover:bg-slate-600/50 hover:border-lime-400/50 transition-all"
                  >
                    <Camera className="w-6 h-6 text-lime-400" />
                    <span className="text-slate-200 font-medium">Apri Camera</span>
                  </button>
                  
                  {/* Oppure carica file */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-slate-600"></div>
                    <span className="text-slate-500 text-xs">oppure carica</span>
                    <div className="flex-1 h-px bg-slate-600"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Carica foto */}
                    <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 cursor-pointer transition-all">
                      <Image className="w-4 h-4 text-lime-400" />
                      <span className="text-xs text-slate-300">Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    
                    {/* Carica video */}
                    <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 cursor-pointer transition-all">
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-slate-300">Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : isPreviewing ? (
                <div className={`border-2 ${isRecording ? 'border-red-500' : 'border-lime-400'} rounded-xl overflow-hidden`}>
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full aspect-video object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    
                    {/* Timer (solo se sta registrando) */}
                    {isRecording && (
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-sm font-medium">{formatTime(recordingTime)} / 2:00</span>
                      </div>
                    )}
                    
                    {/* Pulsante switch camera */}
                    <button
                      type="button"
                      onClick={switchCamera}
                      className="absolute top-3 right-3 bg-slate-800/70 hover:bg-slate-700 text-white p-2 rounded-full"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    
                    {/* Controlli in basso */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
                      {!isRecording ? (
                        <>
                          {/* Pulsante chiudi */}
                          <button
                            type="button"
                            onClick={closeCameraPreview}
                            className="bg-slate-700/80 hover:bg-slate-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Chiudi
                          </button>
                          {/* Pulsante avvia registrazione */}
                          <button
                            type="button"
                            onClick={startRecording}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2"
                          >
                            <div className="w-3 h-3 bg-white rounded-full" />
                            Avvia
                          </button>
                        </>
                      ) : (
                        /* Pulsante stop */
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2"
                        >
                          <div className="w-3 h-3 bg-white rounded-sm" />
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : recordedBlob ? (
                <div className="space-y-2">
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
              ) : newPoll.media_url ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-xs">Media caricato:</p>
                    <button
                      type="button"
                      onClick={removeMedia}
                      className="text-red-400 text-xs hover:text-red-300 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Rimuovi
                    </button>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    {newPoll.media_type === 'image' ? (
                      <img src={newPoll.media_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={newPoll.media_url} controls className="w-full h-full" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-lime-400 text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pronto per la pubblicazione</span>
                  </div>
                </div>
              ) : null}
              
              {isUploading && !recordedBlob && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 text-lime-400 animate-spin" />
                  <span className="text-slate-300 text-sm">Caricamento in corso...</span>
                </div>
              )}
              
              {uploadError && (
                <p className="text-red-400 text-sm mt-2">{uploadError}</p>
              )}
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-2 block">Opzioni di risposta</label>
              <div className="space-y-2">
                {newPoll.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder={`Opzione ${idx + 1}`}
                      value={opt.text}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white flex-1"
                    />
                    {newPoll.options.length > 2 && (
                      <button
                        onClick={() => removeOption(idx)}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {newPoll.options.length < 6 && (
                <button
                  onClick={addOption}
                  className="text-lime-400 text-sm mt-2 hover:text-lime-300"
                >
                  + Aggiungi opzione
                </button>
              )}
            </div>

            {/* Toggle scelta multipla */}
            <div 
              onClick={() => setNewPoll({...newPoll, is_multiple_choice: !newPoll.is_multiple_choice})}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${newPoll.is_multiple_choice ? 'bg-slate-600 border-lime-400' : 'bg-slate-700 border-slate-600'}`}
            >
              <Check className={`w-5 h-5 ${newPoll.is_multiple_choice ? 'text-lime-400' : 'text-slate-400'}`} />
              <div className="flex-1">
                <p className={`font-medium ${newPoll.is_multiple_choice ? 'text-lime-400' : 'text-white'}`}>
                  Scelta multipla
                </p>
                <p className="text-slate-400 text-xs">Permetti di selezionare più opzioni</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${newPoll.is_multiple_choice ? 'border-lime-400 bg-lime-400' : 'border-slate-500'}`}>
                {newPoll.is_multiple_choice && <span className="text-slate-900 text-xs">✓</span>}
              </div>
            </div>

            {/* Toggle Anonimato */}
            <div 
              onClick={() => setNewPoll({...newPoll, is_anonymous: !newPoll.is_anonymous})}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${newPoll.is_anonymous ? 'bg-slate-600 border-lime-400' : 'bg-slate-700 border-slate-600'}`}
            >
              <EyeOff className={`w-5 h-5 ${newPoll.is_anonymous ? 'text-lime-400' : 'text-slate-400'}`} />
              <div className="flex-1">
                <p className={`font-medium ${newPoll.is_anonymous ? 'text-lime-400' : 'text-white'}`}>
                  Pubblica in anonimo
                </p>
                <p className="text-slate-400 text-xs">Il tuo nome non sarà visibile</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${newPoll.is_anonymous ? 'border-lime-400 bg-lime-400' : 'border-slate-500'}`}>
                {newPoll.is_anonymous && <span className="text-slate-900 text-xs">✓</span>}
              </div>
            </div>

            {/* Selezione destinatari */}
            <div>
              <label className="text-slate-400 text-sm mb-2 block">Destinatari</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setNewPoll({...newPoll, target_type: 'all', target_users: []})}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                    newPoll.target_type === 'all' 
                      ? 'bg-lime-400/20 border-lime-400 text-lime-400' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">Tutti</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewPoll({...newPoll, target_type: 'specific'});
                    setShowUserSelector(true);
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                    newPoll.target_type === 'specific' 
                      ? 'bg-lime-400/20 border-lime-400 text-lime-400' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <AtSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Specifici</span>
                </button>
              </div>

              {newPoll.target_type === 'specific' && (
                <div className="space-y-2">
                  {newPoll.target_users.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newPoll.target_users.map(email => {
                        const targetUser = allUsers.find(u => u.email === email);
                        return (
                          <div key={email} className="flex items-center gap-1 bg-lime-400/20 text-lime-400 px-2 py-1 rounded-full text-xs">
                            <Bell className="w-3 h-3" />
                            <span>{targetUser?.company_name || targetUser?.full_name || email}</span>
                            <button
                              type="button"
                              onClick={() => setNewPoll({
                                ...newPoll,
                                target_users: newPoll.target_users.filter(e => e !== email)
                              })}
                              className="hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="bg-slate-700 rounded-lg border border-slate-600 p-2">
                    <Input
                      placeholder="Cerca utente..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="bg-slate-600 border-slate-500 text-white text-sm mb-2"
                    />
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {allUsers
                        .filter(u => {
                          // Escludi te stesso e utenti già selezionati
                          if (u.email === effectiveUser?.email) return false;
                          if (newPoll.target_users.includes(u.email)) return false;
                          
                          // Escludi admin
                          if (u.role === 'admin') return false;
                          
                          // Filtra per zona (se l'utente corrente ha una zona assegnata)
                          // Mostra solo utenti della stessa zona o consulenti della stessa zona
                          if (effectiveUser?.zona && u.zona && u.zona !== effectiveUser.zona) return false;
                          
                          // Filtra per ricerca
                          const matchSearch = 
                            u.company_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
                          
                          return matchSearch;
                        })
                        .slice(0, 10)
                        .map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setNewPoll({
                              ...newPoll,
                              target_users: [...newPoll.target_users, u.email]
                            })}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-600 text-left transition-colors"
                          >
                            <div className="w-7 h-7 bg-lime-400/20 rounded-full flex items-center justify-center">
                              <span className="text-lime-400 text-xs font-bold">
                                {(u.company_name || u.full_name)?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">{u.company_name || u.full_name}</p>
                              <p className="text-slate-400 text-xs truncate">{u.email}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    Gli utenti selezionati riceveranno una notifica sonora
                  </p>
                </div>
              )}
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={!newPoll.title || newPoll.options.filter(o => o.text.trim()).length < 2 || (newPoll.target_type === 'specific' && newPoll.target_users.length === 0) || createPostMutation.isPending}
              className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
            >
              {createPostMutation.isPending ? 'Pubblicazione...' : 'Pubblica sondaggio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="Imprenditori" unreadMessages={messages.length} />

      {/* Dialog modifica sondaggio */}
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md [&>button]:hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lime-400 text-lg font-semibold">Modifica sondaggio</h2>
            <button onClick={() => setEditingPost(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {editingPost && (
            <div className="space-y-4">
              <Input 
                placeholder="Domanda"
                value={editingPost.title}
                onChange={(e) => setEditingPost({...editingPost, title: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
              />

              <Textarea 
                placeholder="Descrizione (opzionale)"
                value={editingPost.content || ''}
                onChange={(e) => setEditingPost({...editingPost, content: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white min-h-16"
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
                    is_anonymous: editingPost.is_anonymous
                  } 
                })}
                disabled={!editingPost.title || updatePostMutation.isPending}
                className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
              >
                Salva modifiche
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog lista votanti */}
      <Dialog open={!!showVotersDialog} onOpenChange={() => setShowVotersDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm [&>button]:hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lime-400 text-lg font-semibold">Chi ha votato</h2>
            <button onClick={() => setShowVotersDialog(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {showVotersDialog && (() => {
            const post = posts.find(p => p.id === showVotersDialog);
            if (!post) return null;
            
            return (
              <div className="space-y-3">
                {(post.options || []).map((option) => {
                  const voters = option.votes || [];
                  if (voters.length === 0) return null;
                  
                  return (
                    <div key={option.id} className="bg-slate-900 rounded-lg p-3">
                      <p className="text-white font-medium text-sm mb-2">{option.text}</p>
                      <div className="space-y-2">
                        {voters.map((email, idx) => {
                          const voter = allUsers.find(u => u.email === email);
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-lime-400/20 rounded-full flex items-center justify-center">
                                <span className="text-lime-400 text-xs font-bold">
                                  {(voter?.company_name || voter?.full_name || email)?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">
                                  {voter?.company_name || voter?.full_name || 'Utente'}
                                </p>
                                {voter?.role === 'consulente' && (
                                  <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">Consulente</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Elimina sondaggio</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Sei sicuro di voler eliminare questo sondaggio? L'azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white">
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