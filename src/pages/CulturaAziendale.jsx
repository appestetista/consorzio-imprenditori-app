import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, BookOpen, Tag, ArrowLeft, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { createPageUrl } from '@/utils';
import SectionHeaderIcons from '../components/layout/SectionHeaderIcons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CATEGORIE = [
  "Psicologia aziendale",
  "Finanza",
  "Strumenti digitali",
  "Fiscalità",
  "Intelligenza Artificiale (AI)",
  "Competenze"
];

const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export default function CulturaAziendale() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [formData, setFormData] = useState({ title: '', youtube_url: '', categoria: '' });
  const [errors, setErrors] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const { impersonation } = useImpersonation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Se impersonation attiva, carica dati utente impersonato
        if (impersonation.active && impersonation.role === 'user') {
          const impersonatedUser = await base44.entities.User.filter({ id: impersonation.targetId });
          if (impersonatedUser.length > 0) {
            setEffectiveUser(impersonatedUser[0]);
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
  }, [impersonation.active, impersonation.targetId]);

  const { data: videos = [] } = useQuery({
    queryKey: ['cultura-aziendale-videos'],
    queryFn: () => base44.entities.CulturaAziendaleVideo.list('-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const createVideoMutation = useMutation({
    mutationFn: async (videoData) => {
      const newVideo = await base44.entities.CulturaAziendaleVideo.create(videoData);
      
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
      setFormData({ title: '', youtube_url: '', categoria: '' });
      setErrors([]);
    }
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CulturaAziendaleVideo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cultura-aziendale-videos'] });
      setEditingVideo(null);
      setShowAddVideo(false);
      setFormData({ title: '', youtube_url: '', categoria: '' });
      setErrors([]);
    }
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (videoId) => base44.entities.CulturaAziendaleVideo.delete(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cultura-aziendale-videos'] });
    }
  });

  // Calcola tutte le categorie (predefinite + custom dai video esistenti)
  const allCategories = [...new Set([...CATEGORIE, ...videos.map(v => v.categoria).filter(Boolean), ...customCategories])];

  const handleEditVideo = (video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      youtube_url: video.youtube_url,
      categoria: video.categoria
    });
    setShowAddVideo(true);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !allCategories.includes(newCategory.trim())) {
      setCustomCategories([...customCategories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (cat) => {
    // Rimuovi solo dalle custom, non dalle predefinite
    if (!CATEGORIE.includes(cat)) {
      setCustomCategories(customCategories.filter(c => c !== cat));
    }
  };

  const handleRenameCategory = async (oldName, newName) => {
    if (!newName.trim() || oldName === newName.trim()) {
      setEditingCategory(null);
      return;
    }
    
    // Aggiorna tutti i video con la vecchia categoria
    const videosToUpdate = videos.filter(v => v.categoria === oldName);
    for (const video of videosToUpdate) {
      await base44.entities.CulturaAziendaleVideo.update(video.id, { categoria: newName.trim() });
    }
    
    // Se era custom, aggiorna anche l'array customCategories
    if (!CATEGORIE.includes(oldName)) {
      setCustomCategories(prev => prev.map(c => c === oldName ? newName.trim() : c));
    }
    
    queryClient.invalidateQueries({ queryKey: ['cultura-aziendale-videos'] });
    setEditingCategory(null);
    setEditedCategoryName('');
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
    if (editingVideo) {
      updateVideoMutation.mutate({ id: editingVideo.id, data: formData });
    } else {
      createVideoMutation.mutate(formData);
    }
  };

  const filteredVideos = videos.filter(video => {
    return selectedCategoria === 'all' || video.categoria === selectedCategoria;
  });

  const permissions = effectiveUser?.permissions || {};
  const isAdmin = user?.role === 'admin' && !impersonation.active;
  if (permissions.cultura_aziendale === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Sezione Non Accessibile</h1>
          <p className="text-slate-400">Non hai i permessi per accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 pt-16 pb-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            <div className="w-12 h-12 bg-[#d4af37] rounded-full flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-slate-900" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-2xl font-bold truncate">Academy</h1>
              <p className="text-slate-400 text-sm truncate">Contenuti formativi per il tuo team</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin && (
              <Button
                onClick={() => setShowAddVideo(true)}
                className="bg-[#d4af37] hover:bg-[#b8960b] text-slate-900"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Carica Video
              </Button>
            )}
          </div>
        </div>

        {/* Filtri */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-[#d4af37] font-semibold">
              <Filter className="w-5 h-5" />
              <span>Filtra contenuti</span>
            </div>

            {/* Filtro Categoria */}
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">Categoria</label>
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista Video */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nessun video disponibile con questi filtri</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVideos.map((video) => {
              const youtubeId = getYouTubeId(video.youtube_url);
              
              return (
                <Card key={video.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                  <div className="relative">
                    <div className="bg-[#d4af37] text-slate-900 text-sm font-bold px-3 py-1">
                      CATEGORIA: {video.categoria?.toUpperCase()}
                    </div>
                    
                    {video.title && (
                      <div className="bg-slate-900 px-3 py-2 border-b border-slate-700 flex items-center justify-between">
                        <h3 className="text-white font-semibold text-base">{video.title}</h3>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVideo(video)}
                              className="text-[#d4af37] hover:bg-[#d4af37]/20 h-8 w-8 p-0"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:bg-red-600/20 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Eliminare questo video?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    Il video verrà rimosso definitivamente dall'Academy.
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
                        )}
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
                        <BookOpen className="w-16 h-16 text-slate-500" />
                      </div>
                    )}
                  </div>
                  {video.description && (
                    <CardContent className="p-3">
                      <p className="text-slate-400 text-sm">{video.description}</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav currentPage="CulturaAziendale" unreadMessages={messages.length} />

      {/* Dialog Carica/Modifica Video */}
      <Dialog open={showAddVideo} onOpenChange={(open) => {
        setShowAddVideo(open);
        if (!open) {
          setEditingVideo(null);
          setFormData({ title: '', youtube_url: '', categoria: '' });
          setErrors([]);
        }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingVideo ? 'Modifica Video' : 'Carica Video Academy'}
            </DialogTitle>
          </DialogHeader>

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
                placeholder="Titolo del video"
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
              <Label className="text-slate-300">Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gestione Categorie (solo admin) */}
            <div className="border-t border-slate-700 pt-4">
              <Label className="text-slate-300 mb-2 block">Gestisci Categorie</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nuova categoria..."
                  className="bg-slate-900 border-slate-700 text-white flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <Button
                  type="button"
                  onClick={handleAddCategory}
                  className="bg-[#d4af37] hover:bg-[#b8960b] text-slate-900"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => (
                  <div key={cat} className="flex items-center">
                    {editingCategory === cat ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editedCategoryName}
                          onChange={(e) => setEditedCategoryName(e.target.value)}
                          className="bg-slate-900 border-slate-600 text-white h-7 w-32 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameCategory(cat, editedCategoryName);
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 bg-[#d4af37] hover:bg-[#b8960b] text-slate-900"
                          onClick={() => handleRenameCategory(cat, editedCategoryName)}
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-slate-400"
                          onClick={() => setEditingCategory(null)}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Badge 
                        className={`${CATEGORIE.includes(cat) ? 'bg-slate-700 text-slate-300' : 'bg-[#d4af37]/20 text-[#d4af37]'} flex items-center gap-1 cursor-pointer`}
                        onClick={() => {
                          setEditingCategory(cat);
                          setEditedCategoryName(cat);
                        }}
                      >
                        {cat}
                        <Pencil className="w-3 h-3 ml-1 opacity-50" />
                        {!CATEGORIE.includes(cat) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCategory(cat);
                            }}
                            className="ml-1 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-2">Clicca su una categoria per rinominarla. Le categorie custom (verdi) possono essere eliminate.</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={createVideoMutation.isPending || updateVideoMutation.isPending}
              className="w-full bg-[#d4af37] hover:bg-[#b8960b] text-slate-900"
            >
              {(createVideoMutation.isPending || updateVideoMutation.isPending) 
                ? 'Salvataggio...' 
                : editingVideo 
                  ? 'Salva Modifiche' 
                  : 'Carica Video'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}