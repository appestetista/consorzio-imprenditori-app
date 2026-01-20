import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Video, FileText, Heart, X, Play, ArrowLeft, MessageCircle, Send, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';

const CATEGORIES = [
  "Riduzione Costi",
  "Errori Fatti",
  "Programmi Affidabili",
  "Fornitori Top",
  "Come lo rifarei oggi",
  "Consigli di Vita"
];

const getYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/);
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

  const handleSubmit = () => {
    if (!newPost.title || !newPost.category) return;
    createPostMutation.mutate({
      ...newPost,
      author_email: effectiveUser?.email,
      author_name: effectiveUser?.company_name || effectiveUser?.full_name,
      likes: [],
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
              key={cat}
              className={`cursor-pointer whitespace-nowrap ${selectedCategory === cat ? 'bg-lime-400 text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
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
                  <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center">
                    {post.type === 'video' ? <Video className="w-5 h-5 text-slate-900" /> : <FileText className="w-5 h-5 text-slate-900" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{post.author_name}</p>
                    <p className="text-slate-400 text-xs">{new Date(post.created_date).toLocaleDateString('it-IT')}</p>
                  </div>
                  <Badge className="bg-slate-700 text-lime-400">{post.category}</Badge>
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

                <button 
                  onClick={() => likeMutation.mutate(post)}
                  className="flex items-center gap-2 text-slate-400 hover:text-lime-400 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${hasLiked ? 'fill-lime-400 text-lime-400' : ''}`} />
                  <span className="text-sm">{(post.likes || []).length}</span>
                </button>
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
    </div>
  );
}