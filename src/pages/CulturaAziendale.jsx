import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Filter, BookOpen, Tag, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CATEGORIE = [
  "Psicologia aziendale",
  "Finanza",
  "Strumenti digitali",
  "Fiscalità",
  "Intelligenza Artificiale (AI)"
];

const COMPETENZE = [
  "Leadership",
  "Gestione del tempo",
  "Controllo di gestione",
  "Marketing e vendite",
  "Analisi finanziaria",
  "Automazione dei processi",
  "Uso pratico dell'AI",
  "Organizzazione aziendale",
  "Compliance e normativa",
  "Pianificazione strategica"
];

const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export default function CulturaAziendale() {
  const [user, setUser] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  const [selectedCompetenze, setSelectedCompetenze] = useState([]);

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

  const { data: videos = [] } = useQuery({
    queryKey: ['cultura-aziendale-videos'],
    queryFn: () => base44.entities.CulturaAziendaleVideo.list('-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const toggleCompetenza = (competenza) => {
    setSelectedCompetenze(prev =>
      prev.includes(competenza)
        ? prev.filter(c => c !== competenza)
        : [...prev, competenza]
    );
  };

  const filteredVideos = videos.filter(video => {
    const categoriaMatch = selectedCategoria === 'all' || video.categoria === selectedCategoria;
    const competenzeMatch = selectedCompetenze.length === 0 || 
      selectedCompetenze.some(comp => video.competenze?.includes(comp));
    return categoriaMatch && competenzeMatch;
  });

  const permissions = user?.permissions || {};
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
      <Header user={user} />
      
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
              <h1 className="text-white text-2xl font-bold">Cultura Aziendale</h1>
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

            {/* Filtro Competenze */}
            <div>
              <label className="text-slate-300 text-sm font-medium mb-2 block">Competenze</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                  >
                    <span>
                      {selectedCompetenze.length === 0
                        ? 'Tutte le competenze'
                        : `${selectedCompetenze.length} selezionate`}
                    </span>
                    <Filter className="w-4 h-4 ml-2 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-slate-900 border-slate-700 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {selectedCompetenze.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCompetenze([])}
                        className="w-full text-slate-400 hover:text-white"
                      >
                        Rimuovi tutti i filtri
                      </Button>
                    )}
                    {COMPETENZE.map((comp) => (
                      <div key={comp} className="flex items-center space-x-2">
                        <Checkbox
                          id={comp}
                          checked={selectedCompetenze.includes(comp)}
                          onCheckedChange={() => toggleCompetenza(comp)}
                          className="border-slate-600"
                        />
                        <label
                          htmlFor={comp}
                          className="text-sm text-slate-300 cursor-pointer flex-1"
                        >
                          {comp}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Lista Video */}
        {filteredVideos.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nessun video disponibile con questi filtri</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredVideos.map((video) => {
              const videoId = getYouTubeId(video.youtube_url);
              return (
                <Card key={video.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Video Player */}
                    {videoId && (
                      <div className="aspect-video bg-black">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    
                    {/* Info Video */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-white text-lg font-semibold">{video.title}</h3>
                      
                      {video.description && (
                        <p className="text-slate-400 text-sm">{video.description}</p>
                      )}

                      {/* Categoria */}
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-lime-400" />
                        <Badge className="bg-lime-400/20 text-lime-400 border-0">
                          {video.categoria}
                        </Badge>
                      </div>

                      {/* Competenze */}
                      {video.competenze && video.competenze.length > 0 && (
                        <div>
                          <p className="text-slate-500 text-xs mb-2">Competenze sviluppate:</p>
                          <div className="flex flex-wrap gap-2">
                            {video.competenze.map(comp => (
                              <Badge 
                                key={comp}
                                className="bg-blue-500/20 text-blue-400 border-0 text-xs"
                              >
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
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