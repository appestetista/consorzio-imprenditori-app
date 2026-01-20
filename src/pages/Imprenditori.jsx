import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Video, FileText, Heart, X, Play, ArrowLeft, MessageCircle, Send, EyeOff, ShieldCheck, Pencil, Trash2, MoreVertical } from 'lucide-react';
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
      setNewPost({ type: 'post', category: '', title: '', content: '', youtube_url: '' });
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
    return post.author_email === effectiveUser?.email || user?.role === 'admin';
  };

  const handleSubmit = () => {
    if (!newPost.title || !newPost.category) return;
    createPostMutation.mutate({
      ...newPost,
      author_email: effectiveUser?.email,
      author_name: effectiveUser?.company_name || effectiveUser?.full_name,
      likes: [],
      comments: [],
    });
  };

  const filteredPosts = selectedCategory === 'Tutti' 
    ? posts 
    : posts.filter(p => p.category === selectedCategory);

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
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <Badge 
            className={`cursor-pointer whitespace-nowrap ${selectedCategory === 'Tutti' ? 'bg-lime-400 text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            onClick={() => setSelectedCategory('Tutti')}
          >
            Tutti
          </Badge>
          {CATEGORIES.map(cat => (
            <Badge 
              key={cat.name}
              className={`cursor-pointer whitespace-nowrap ${selectedCategory === cat.name ? `${cat.color} text-white` : 'bg-slate-700 text-white hover:bg-slate-600'}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>

        {/* Lista post */}
        <div className="space-y-4">
          {filteredPosts.map(post => {
            const youtubeId = getYoutubeId(post.youtube_url);
            const hasLiked = (post.likes || []).includes(effectiveUser?.email);
            
            return (
              <div key={post.id} className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  {post.is_anonymous ? (
                    <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                      <EyeOff className="w-5 h-5 text-slate-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center">
                      {post.type === 'video' ? <Video className="w-5 h-5 text-slate-900" /> : <FileText className="w-5 h-5 text-slate-900" />}
                    </div>
                  )}
                  <div className="flex-1">
                    {post.is_anonymous ? (
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-lime-400 text-xs">
                          <ShieldCheck className="w-3 h-3" /> Verificato
                        </span>
                        <p className="text-white font-semibold">Anonimo</p>
                      </div>
                    ) : (
                      <p className="text-white font-semibold">{post.author_name}</p>
                    )}
                    <p className="text-slate-400 text-xs">{new Date(post.created_date).toLocaleDateString('it-IT')}</p>
                  </div>
                  <Badge className="bg-slate-700 text-lime-400">{post.category}</Badge>
                  {canEditPost(post) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-slate-400 hover:text-white p-1">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-700 border-slate-600">
                        <DropdownMenuItem 
                          className="text-white hover:bg-slate-600 cursor-pointer"
                          onClick={() => setEditingPost(post)}
                        >
                          <Pencil className="w-4 h-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-400 hover:bg-slate-600 cursor-pointer"
                          onClick={() => setDeletePostId(post.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <h3 className="text-white font-bold mb-2">{post.title}</h3>
                
                {post.type === 'video' && youtubeId && (
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}

                {post.content && (
                  <p className="text-slate-300 text-sm mb-3">{post.content}</p>
                )}

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => likeMutation.mutate(post)}
                    className="flex items-center gap-2 text-slate-400 hover:text-lime-400 transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${hasLiked ? 'fill-lime-400 text-lime-400' : ''}`} />
                    <span className="text-sm">{(post.likes || []).length}</span>
                  </button>
                  <button 
                    onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                    className="flex items-center gap-2 text-slate-400 hover:text-lime-400 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{(post.comments || []).length}</span>
                  </button>
                </div>

                {/* Sezione commenti */}
                {openComments === post.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    {(post.comments || []).map((comment, idx) => (
                      <div key={idx} className="bg-slate-700 rounded-lg p-3 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-lime-400 font-semibold text-sm">{comment.author_name}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(comment.created_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <p className="text-white text-sm">{comment.content}</p>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Scrivi un commento..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white flex-1"
                      />
                      <Button
                        onClick={() => {
                          if (newComment.trim()) {
                            addCommentMutation.mutate({ postId: post.id, comment: newComment });
                          }
                        }}
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                        className="bg-lime-400 text-slate-900 hover:bg-lime-500"
                        size="icon"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
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
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lime-400">Condividi un consiglio</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={newPost.type === 'post' ? 'default' : 'outline'}
                className={newPost.type === 'post' ? 'bg-lime-400 text-slate-900' : 'border-slate-600 text-white'}
                onClick={() => setNewPost({...newPost, type: 'post'})}
              >
                <FileText className="w-4 h-4 mr-2" /> Post
              </Button>
              <Button
                variant={newPost.type === 'video' ? 'default' : 'outline'}
                className={newPost.type === 'video' ? 'bg-lime-400 text-slate-900' : 'border-slate-600 text-white'}
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
                  <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
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
              <Input 
                placeholder="URL video YouTube"
                value={newPost.youtube_url}
                onChange={(e) => setNewPost({...newPost, youtube_url: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
              />
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
              disabled={!newPost.title || !newPost.category || createPostMutation.isPending}
              className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
            >
              Pubblica
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="Imprenditori" unreadMessages={messages.length} />

      {/* Dialog modifica post */}
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lime-400">Modifica post</DialogTitle>
          </DialogHeader>
          
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
                    <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
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