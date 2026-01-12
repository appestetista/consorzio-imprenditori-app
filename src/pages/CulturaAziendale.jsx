import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Filter, BookOpen, Tag, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const { impersonation } = useImpersonation();

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

  const filteredVideos = videos.filter(video => {
    return selectedCategoria === 'all' || video.categoria === selectedCategoria;
  });

  const permissions = effectiveUser?.permissions || {};
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
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-lime-400 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">Academy</h1>
              <p className="text-slate-400 text-sm">Contenuti formativi per il tuo team</p>
            </div>
          </div>
        </div>

        {/* Filtri */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-lime-400 font-semibold">
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
                  {CATEGORIE.map(cat => (
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
                    <div className="bg-lime-400 text-slate-900 text-sm font-bold px-3 py-1">
                      CATEGORIA: {video.categoria?.toUpperCase()}
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
    </div>
  );
}