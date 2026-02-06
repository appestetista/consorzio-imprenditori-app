import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Calendar, 
  Euro, 
  ExternalLink, 
  Trash2,
  Clock,
  TrendingUp,
  Sparkles,
  Star,
  AlertCircle,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AsteSalvate() {
  const [user, setUser] = useState(null);
  const [ordinamento, setOrdinamento] = useState('data_salvataggio');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Carica aste salvate dell'utente
  const { data: asteSalvate = [], isLoading: loadingSalvate } = useQuery({
    queryKey: ['aste-salvate', user?.email],
    queryFn: () => base44.entities.AstaSalvata.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  // Carica dettagli delle aste
  const { data: aste = [], isLoading: loadingAste } = useQuery({
    queryKey: ['aste-dettagli', asteSalvate.map(s => s.asta_id)],
    queryFn: async () => {
      if (asteSalvate.length === 0) return [];
      const allAste = await base44.entities.AstaImmobiliare.list();
      const asteIds = new Set(asteSalvate.map(s => s.asta_id));
      return allAste.filter(a => asteIds.has(a.id));
    },
    enabled: asteSalvate.length > 0,
  });

  // Rimuovi dai salvati
  const removeMutation = useMutation({
    mutationFn: async (salvatoId) => {
      await base44.entities.AstaSalvata.delete(salvatoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aste-salvate'] });
      toast.success('Asta rimossa dai salvati');
    },
  });

  // Combina dati aste con info salvataggio
  const asteConSalvataggio = aste.map(asta => {
    const salvato = asteSalvate.find(s => s.asta_id === asta.id);
    return { ...asta, salvato_id: salvato?.id, salvato_date: salvato?.created_date };
  });

  // Ordina
  const asteOrdinate = [...asteConSalvataggio].sort((a, b) => {
    switch (ordinamento) {
      case 'data_salvataggio':
        return new Date(b.salvato_date) - new Date(a.salvato_date);
      case 'interesse':
        const ordineInteresse = { 'Molto interessante': 0, 'Interessante': 1, 'Da valutare': 2 };
        return ordineInteresse[a.livello_interesse] - ordineInteresse[b.livello_interesse];
      case 'prezzo_asc':
        return a.prezzo_base - b.prezzo_base;
      case 'data_asta':
        return new Date(a.data_asta) - new Date(b.data_asta);
      default:
        return 0;
    }
  });

  const formatPrezzo = (prezzo) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prezzo);
  };

  const formatData = (data) => {
    return new Date(data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const giorniAllaAsta = (data) => {
    const oggi = new Date();
    const dataAsta = new Date(data);
    return Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
  };

  const getInteresseBadge = (livello) => {
    switch (livello) {
      case 'Molto interessante':
        return <Badge className="bg-green-500 text-white"><Sparkles className="w-3 h-3 mr-1" /> Top</Badge>;
      case 'Interessante':
        return <Badge className="bg-amber-500 text-white"><Star className="w-3 h-3 mr-1" /> Buona</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400"><AlertCircle className="w-3 h-3 mr-1" /> Valutare</Badge>;
    }
  };

  const isLoading = loadingSalvate || loadingAste;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#001d3b' }}>
      <Header user={user} />

      <main className="px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('AsteImmobiliari')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">Le mie aste salvate</h1>
            <p className="text-slate-400 text-sm">{asteOrdinate.length} {asteOrdinate.length === 1 ? 'asta salvata' : 'aste salvate'}</p>
          </div>
        </div>

        {/* Ordinamento */}
        {asteOrdinate.length > 0 && (
          <div className="mb-4">
            <Select value={ordinamento} onValueChange={setOrdinamento}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-full">
                <SelectValue placeholder="Ordina per..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data_salvataggio">Salvate di recente</SelectItem>
                <SelectItem value="interesse">Livello interesse</SelectItem>
                <SelectItem value="prezzo_asc">Prezzo (crescente)</SelectItem>
                <SelectItem value="data_asta">Data asta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Lista aste */}
        <div className="space-y-3">
          {asteOrdinate.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">Nessuna asta salvata</p>
                <p className="text-slate-400 text-sm mb-4">Salva le aste che ti interessano per trovarle facilmente</p>
                <Link to={createPageUrl('AsteImmobiliari')}>
                  <Button className="bg-lime-400 hover:bg-lime-500 text-slate-900">
                    Esplora aste
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            asteOrdinate.map(asta => (
              <Card 
                key={asta.id} 
                className={`border transition-all ${
                  asta.livello_interesse === 'Molto interessante' 
                    ? 'bg-gradient-to-r from-green-900/30 to-slate-800 border-green-500/30' 
                    : asta.livello_interesse === 'Interessante'
                    ? 'bg-gradient-to-r from-amber-900/20 to-slate-800 border-amber-500/30'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <CardContent className="p-4">
                  {/* Header card */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {getInteresseBadge(asta.livello_interesse)}
                      <h3 className="text-white font-medium mt-2 line-clamp-2">{asta.titolo}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMutation.mutate(asta.salvato_id)}
                      disabled={removeMutation.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Info principali */}
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-amber-400 text-xs font-semibold">Quando devo decidere?</p>
                        <p className="text-white text-sm">
                          {asta.data_ora_vendita ? (
                            <span className="font-bold">{asta.data_ora_vendita}</span>
                          ) : (
                            <>
                              Asta il <span className="font-bold">{formatData(asta.data_asta)}</span>
                            </>
                          )}
                          {' — '}
                          <span className={giorniAllaAsta(asta.data_asta) < 40 ? 'text-red-400' : 'text-lime-400'}>
                            {giorniAllaAsta(asta.data_asta)} giorni
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Euro className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-green-400 text-xs font-semibold">Quanti soldi devo immobilizzare?</p>
                        <p className="text-white text-sm">
                          Prezzo base: <span className="font-bold">{formatPrezzo(asta.prezzo_base)}</span>
                          <span className="text-slate-400 text-xs ml-2">
                            (Cauzione: {formatPrezzo(asta.cauzione_stimata || asta.prezzo_base * 0.1)})
                          </span>
                        </p>
                        {(asta.offerta_minima > 0 || asta.rilancio_minimo > 0) && (
                          <p className="text-slate-300 text-xs mt-1">
                            {asta.offerta_minima > 0 && (
                              <span>Min: <span className="text-blue-400 font-medium">{formatPrezzo(asta.offerta_minima)}</span></span>
                            )}
                            {asta.offerta_minima > 0 && asta.rilancio_minimo > 0 && ' • '}
                            {asta.rilancio_minimo > 0 && (
                              <span>Rilancio: <span className="text-purple-400 font-medium">{formatPrezzo(asta.rilancio_minimo)}</span></span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-lime-400 text-xs font-semibold">Perché dovrei aprirla?</p>
                        <p className="text-white text-sm">{asta.motivo_interesse || 'Opportunità da analizzare'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info rapide */}
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      <span>{asta.localita} ({asta.provincia})</span>
                    </div>
                    <Badge variant="outline" className="text-slate-400">
                      {asta.tipologia}
                    </Badge>
                  </div>

                  {/* CTA */}
                  <a
                    href={asta.link_ufficiale}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-500 text-slate-900 font-medium py-2 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Vedi dettagli ufficiali
                  </a>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <BottomNav currentPage="AsteSalvate" />
    </div>
  );
}