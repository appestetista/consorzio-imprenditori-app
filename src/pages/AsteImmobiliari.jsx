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
  Clock, 
  TrendingUp,
  Sparkles,
  AlertCircle,
  Star,
  Bookmark,
  BookmarkCheck,
  Home,
  Factory,
  Truck,
  Wrench,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Categorie con icone per filtri rapidi (Box/Garage rimosso - esclusi dal fetch)
const CATEGORIE_FILTRO = [
  { id: 'tutte', label: 'Tutte', icon: null },
  { id: 'Abitativo', label: 'Casa', icon: Home },
  { id: 'Commerciale', label: 'Azienda', icon: Building2 },
  { id: 'Industriale', label: 'Industriale', icon: Factory },
  { id: 'Mezzi', label: 'Mezzi', icon: Truck },
  { id: 'Attrezzatura', label: 'Attrezzatura', icon: Wrench },
];

export default function AsteImmobiliari() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Filtri
  const [budgetMax, setBudgetMax] = useState('');
  const [categoriaAttiva, setCategoriaAttiva] = useState('tutte');
  const [filtroScadenza, setFiltroScadenza] = useState('tutte'); // 'tutte', 'immediate', 'normali', 'oltre90'

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Carica aste
  const { data: aste = [], isLoading } = useQuery({
    queryKey: ['aste-immobiliari'],
    queryFn: async () => {
      const allAste = await base44.entities.AstaImmobiliare.filter({ is_active: true });
      return allAste;
    },
  });

  // Carica aste salvate
  const { data: asteSalvate = [] } = useQuery({
    queryKey: ['aste-salvate', user?.email],
    queryFn: () => base44.entities.AstaSalvata.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const asteSalvateIds = new Set(asteSalvate.map(s => s.asta_id));

  // Salva/Rimuovi asta
  const toggleSalvaMutation = useMutation({
    mutationFn: async (astaId) => {
      const esistente = asteSalvate.find(s => s.asta_id === astaId);
      if (esistente) {
        await base44.entities.AstaSalvata.delete(esistente.id);
      } else {
        await base44.entities.AstaSalvata.create({ user_email: user.email, asta_id: astaId });
      }
    },
    onSuccess: (_, astaId) => {
      queryClient.invalidateQueries({ queryKey: ['aste-salvate'] });
      const wasRemoved = asteSalvateIds.has(astaId);
      toast.success(wasRemoved ? 'Rimossa dai salvati' : 'Asta salvata!');
    },
  });

  // Calcola giorni alla asta
  const giorniAllaAsta = (data) => {
    const oggi = new Date();
    const dataAsta = new Date(data);
    return Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
  };

  // Filtra aste
  const asteFiltrateBase = aste.filter(asta => {
    // Filtro budget (se inserito)
    if (budgetMax && parseInt(budgetMax) > 0 && asta.prezzo_base > parseInt(budgetMax)) {
      return false;
    }
    // Filtro categoria
    if (categoriaAttiva !== 'tutte' && asta.tipologia !== categoriaAttiva) {
      return false;
    }
    return true;
  });

  // Separa immediate (<30 giorni) da normali (30-90 giorni)
  const asteImmediate = asteFiltrateBase
    .filter(a => giorniAllaAsta(a.data_asta) < 30 && giorniAllaAsta(a.data_asta) >= 0)
    .sort((a, b) => new Date(a.data_asta) - new Date(b.data_asta));

  const asteNormali = asteFiltrateBase
    .filter(a => giorniAllaAsta(a.data_asta) >= 30)
    .sort((a, b) => {
      const ordineInteresse = { 'Molto interessante': 0, 'Interessante': 1, 'Da valutare': 2 };
      return ordineInteresse[a.livello_interesse] - ordineInteresse[b.livello_interesse];
    });

  // Conteggi per stats
  const totaleAste = aste.length;
  const asteImmediateCount = aste.filter(a => giorniAllaAsta(a.data_asta) < 30 && giorniAllaAsta(a.data_asta) >= 0).length;

  const formatPrezzo = (prezzo) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prezzo);
  };

  const formatData = (data) => {
    return new Date(data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
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

  // Card singola asta
  const AstaCard = ({ asta, isImmediate = false }) => {
    const giorni = giorniAllaAsta(asta.data_asta);
    
    return (
      <Card 
        className={`border transition-all ${
          isImmediate 
            ? 'bg-gradient-to-r from-red-900/30 to-slate-800 border-red-500/30'
            : asta.livello_interesse === 'Molto interessante' 
            ? 'bg-gradient-to-r from-green-900/30 to-slate-800 border-green-500/30' 
            : asta.livello_interesse === 'Interessante'
            ? 'bg-gradient-to-r from-amber-900/20 to-slate-800 border-amber-500/30'
            : 'bg-slate-800 border-slate-700'
        }`}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              {isImmediate ? (
                <Badge className="bg-red-500 text-white"><Zap className="w-3 h-3 mr-1" /> Immediata</Badge>
              ) : (
                getInteresseBadge(asta.livello_interesse)
              )}
              <h3 className="text-white font-medium mt-2 line-clamp-2">{asta.titolo}</h3>
            </div>
          </div>

          {/* Le 3 domande chiave */}
          <div className="bg-slate-900/50 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-400 text-xs font-semibold">Quando devo decidere?</p>
                <p className="text-white text-sm">
                  Asta il <span className="font-bold">{formatData(asta.data_asta)}</span> — 
                  <span className={giorni < 30 ? 'text-red-400 font-bold' : 'text-lime-400'}>
                    {' '}{giorni} giorni
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
                </p>
                <p className="text-slate-400 text-xs">
                  Cauzione (10%): <span className="text-white font-medium">{formatPrezzo(asta.cauzione_stimata || asta.prezzo_base * 0.1)}</span>
                </p>
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => toggleSalvaMutation.mutate(asta.id)}
              disabled={toggleSalvaMutation.isPending}
              className={`flex-shrink-0 ${
                asteSalvateIds.has(asta.id) 
                  ? 'bg-amber-400/20 border-amber-400 text-amber-400' 
                  : 'border-slate-600 text-slate-300 hover:border-lime-400 hover:text-lime-400'
              }`}
            >
              {asteSalvateIds.has(asta.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </Button>
            <a
              href={asta.link_ufficiale}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-500 text-slate-900 font-medium py-2 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Vedi dettagli
            </a>
          </div>
        </CardContent>
      </Card>
    );
  };

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
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">Aste Immobiliari</h1>
            <p className="text-slate-400 text-sm">{totaleAste} aste disponibili</p>
          </div>
          <Link to={createPageUrl('AsteSalvate')}>
            <Button variant="outline" size="sm" className="border-amber-400 text-amber-400">
              <Bookmark className="w-4 h-4" />
              {asteSalvate.length > 0 && <span className="ml-1">{asteSalvate.length}</span>}
            </Button>
          </Link>
        </div>

        {/* BUDGET - Campo prominente */}
        <Card className="bg-slate-800 border-lime-400/50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Euro className="w-6 h-6 text-lime-400 flex-shrink-0" />
              <div className="flex-1">
                <label className="text-white font-medium block mb-1">Il tuo budget massimo</label>
                <Input
                  type="number"
                  placeholder="Inserisci importo... (vuoto = mostra tutto)"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white text-lg h-12"
                />
              </div>
              {budgetMax && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setBudgetMax('')}
                  className="text-slate-400 hover:text-white"
                >
                  Reset
                </Button>
              )}
            </div>
            {budgetMax && (
              <p className="text-lime-400 text-sm mt-2">
                Mostrando aste fino a {formatPrezzo(parseInt(budgetMax))}
              </p>
            )}
          </CardContent>
        </Card>

        {/* FILTRI CATEGORIA - Pulsanti con icone */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {CATEGORIE_FILTRO.map(cat => {
            const Icon = cat.icon;
            const isActive = categoriaAttiva === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoriaAttiva(cat.id)}
                className={`flex-shrink-0 ${
                  isActive 
                    ? 'bg-lime-400 text-slate-900 hover:bg-lime-500' 
                    : 'border-slate-600 text-slate-300 hover:border-lime-400 hover:text-lime-400'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 mr-1" />}
                {cat.label}
              </Button>
            );
          })}
        </div>

        {/* Stats rapide */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="bg-red-500/20 border-red-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-red-400 text-2xl font-bold">{asteImmediate.length}</p>
              <p className="text-red-300 text-xs">⚡ Immediate (&lt;30gg)</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-700/50 border-slate-600">
            <CardContent className="p-3 text-center">
              <p className="text-white text-2xl font-bold">{asteNormali.length}</p>
              <p className="text-slate-400 text-xs">📅 Normali (30-90gg)</p>
            </CardContent>
          </Card>
        </div>

        {/* SEZIONE ASTE IMMEDIATE */}
        {asteImmediate.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-red-400" />
              <h2 className="text-red-400 font-bold text-lg">Aste Immediate</h2>
              <Badge className="bg-red-500 text-white text-xs">&lt; 30 giorni</Badge>
            </div>
            <div className="space-y-3">
              {asteImmediate.map(asta => (
                <AstaCard key={asta.id} asta={asta} isImmediate={true} />
              ))}
            </div>
          </div>
        )}

        {/* SEZIONE ASTE NORMALI */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-lime-400" />
            <h2 className="text-white font-bold text-lg">Aste 30-90 giorni</h2>
          </div>
          <div className="space-y-3">
            {asteNormali.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-white font-medium">Nessuna asta trovata</p>
                  <p className="text-slate-400 text-sm">Prova a modificare il budget o la categoria</p>
                </CardContent>
              </Card>
            ) : (
              asteNormali.map(asta => (
                <AstaCard key={asta.id} asta={asta} />
              ))
            )}
          </div>
        </div>

        {/* Info aggiornamento */}
        <p className="text-slate-500 text-xs text-center mt-6">
          Dati aggiornati quotidianamente • Fonte: IVG Marche e IVG Rimini
        </p>
      </main>

      <BottomNav currentPage="AsteImmobiliari" />
    </div>
  );
}