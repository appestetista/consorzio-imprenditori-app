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
  { id: 'tutte', label: 'Tutte', icon: null, emoji: '📋' },
  { id: 'Abitativo', label: 'Casa', icon: Home, emoji: '🏠' },
  { id: 'Commerciale', label: 'Azienda', icon: Building2, emoji: '🏢' },
  { id: 'Industriale', label: 'Industriale', icon: Factory, emoji: '🏭' },
  { id: 'Mezzi', label: 'Mezzi', icon: Truck, emoji: '🚚' },
  { id: 'Attrezzatura', label: 'Attrezzatura', icon: Wrench, emoji: '🔧' },
];

export default function AsteImmobiliari() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Filtri
  const [budgetMax, setBudgetMax] = useState('');
  const [categoriaAttiva, setCategoriaAttiva] = useState('tutte');
  const [filtroScadenza, setFiltroScadenza] = useState('tutte'); // 'tutte', 'immediate', 'normali', 'oltre90'
  const [filtroLocalita, setFiltroLocalita] = useState('tutte'); // 'tutte' o nome località

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Carica mappa tribunali -> località
  const { data: tribunaliLocalita = [] } = useQuery({
    queryKey: ['tribunali-localita'],
    queryFn: () => base44.entities.TribunaleLocalita.list(),
  });

  // Mappa tribunale -> località per lookup rapido
  const tribunaleToLocalita = React.useMemo(() => {
    const map = {};
    tribunaliLocalita.forEach(t => {
      map[t.tribunale] = t.localita;
    });
    return map;
  }, [tribunaliLocalita]);

  // Mappa località -> lista tribunali (per filtro inverso)
  const localitaToTribunali = React.useMemo(() => {
    const map = {};
    tribunaliLocalita.forEach(t => {
      if (!map[t.localita]) map[t.localita] = [];
      map[t.localita].push(t.tribunale);
    });
    return map;
  }, [tribunaliLocalita]);

  // Carica aste e normalizza i dati (i campi sono sempre in .data)
  const { data: aste = [], isLoading } = useQuery({
    queryKey: ['aste-immobiliari'],
    queryFn: async () => {
      const allAste = await base44.entities.AstaImmobiliare.filter({ is_active: true });
      // Normalizza: estrai i campi da .data al primo livello
      const normalized = allAste.map(a => {
        // I dati utili sono sempre in a.data, li estraiamo mantenendo l'id
        const astaData = a.data || {};
        return {
          id: a.id,
          created_date: a.created_date,
          ...astaData
        };
      });
      console.log('[AsteImmobiliari] Normalizzate:', normalized.length, 'aste. Tribunali trovati:', [...new Set(normalized.map(a => a.provincia))]);
      return normalized;
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

  // Funzione filtro principale - applica TUTTI i filtri in AND
  const applicaTuttiFiltri = React.useCallback((listaAste, { skipBudget, skipCategoria, skipLocalita, skipScadenza } = {}) => {
    return listaAste.filter(asta => {
      // Filtro BUDGET
      if (!skipBudget && budgetMax && parseInt(budgetMax) > 0) {
        if (asta.prezzo_base > parseInt(budgetMax)) return false;
      }
      // Filtro TIPOLOGIA
      if (!skipCategoria && categoriaAttiva !== 'tutte') {
        if (asta.tipologia !== categoriaAttiva) return false;
      }
      // Filtro LOCALITÀ (derivato dal Tribunale)
      if (!skipLocalita && filtroLocalita !== 'tutte') {
        // Recupera i tribunali associati alla località selezionata
        const tribunaliDellaLocalita = localitaToTribunali[filtroLocalita] || [];
        // Il campo provincia contiene il tribunale
        if (!tribunaliDellaLocalita.includes(asta.provincia)) return false;
      }
      // Filtro SCADENZA
      if (!skipScadenza && filtroScadenza !== 'tutte') {
        const giorni = giorniAllaAsta(asta.data_asta);
        if (filtroScadenza === 'immediate' && (giorni < 0 || giorni >= 30)) return false;
        if (filtroScadenza === 'normali' && (giorni < 30 || giorni > 90)) return false;
        if (filtroScadenza === 'oltre90' && giorni <= 90) return false;
      }
      return true;
    });
  }, [budgetMax, categoriaAttiva, filtroLocalita, filtroScadenza, localitaToTribunali]);

  // Lista aste filtrate finali (tutti i filtri attivi)
  const asteFiltrate = React.useMemo(() => applicaTuttiFiltri(aste), [aste, applicaTuttiFiltri]);

  // Lista aste ordinate per interesse
  const asteOrdinate = [...asteFiltrate].sort((a, b) => {
    const ordineInteresse = { 'Molto interessante': 0, 'Interessante': 1, 'Da valutare': 2 };
    return (ordineInteresse[a.livello_interesse] ?? 3) - (ordineInteresse[b.livello_interesse] ?? 3);
  });

  // Conteggi per TIPOLOGIA (skip filtro categoria per vedere quante ce ne sono per ogni tipo)
  const conteggioCategorie = React.useMemo(() => {
    const astePerConteggio = applicaTuttiFiltri(aste, { skipCategoria: true });
    const conteggi = { tutte: astePerConteggio.length };
    CATEGORIE_FILTRO.forEach(cat => {
      if (cat.id !== 'tutte') {
        conteggi[cat.id] = astePerConteggio.filter(a => a.tipologia === cat.id).length;
      }
    });
    return conteggi;
  }, [aste, budgetMax, filtroLocalita, filtroScadenza, applicaTuttiFiltri]);

  // Conteggi per SCADENZA (skip filtro scadenza per vedere quante ce ne sono per ogni fascia)
  const conteggioScadenze = React.useMemo(() => {
    const astePerConteggio = applicaTuttiFiltri(aste, { skipScadenza: true });
    return {
      immediate: astePerConteggio.filter(a => {
        const g = giorniAllaAsta(a.data_asta);
        return g >= 0 && g < 30;
      }).length,
      normali: astePerConteggio.filter(a => {
        const g = giorniAllaAsta(a.data_asta);
        return g >= 30 && g <= 90;
      }).length,
      oltre90: astePerConteggio.filter(a => giorniAllaAsta(a.data_asta) > 90).length
    };
  }, [aste, budgetMax, categoriaAttiva, filtroLocalita, applicaTuttiFiltri]);

  // Conteggi per LOCALITÀ (derivata dal Tribunale tramite tabella tribunali_localita)
  const localitaConConteggi = React.useMemo(() => {
    const astePerConteggio = applicaTuttiFiltri(aste, { skipLocalita: true });

    // Conta per località (derivata dal tribunale)
    const conteggi = {};
    astePerConteggio.forEach(a => {
      if (a.provincia) {
        const localita = tribunaleToLocalita[a.provincia];
        if (localita) {
          conteggi[localita] = (conteggi[localita] || 0) + 1;
        }
      }
    });

    // Totale per "Tutte"
    const totale = astePerConteggio.length;

    // Ordina località: prima quella dell'utente, poi le altre in ordine alfabetico
    const userCity = user?.city || user?.province || '';
    const localitaArray = Object.keys(conteggi).sort();

    // Metti località utente in testa se esiste
    let result;
    const userLocalitaMatch = localitaArray.find(l => l.toLowerCase() === userCity.toLowerCase());
    if (userLocalitaMatch) {
      const filtered = localitaArray.filter(l => l !== userLocalitaMatch);
      result = [{ nome: userLocalitaMatch, count: conteggi[userLocalitaMatch], isUser: true }, 
              ...filtered.map(l => ({ nome: l, count: conteggi[l], isUser: false }))];
    } else {
      result = localitaArray.map(l => ({ nome: l, count: conteggi[l], isUser: false }));
    }

    return { localita: result, totale };
  }, [aste, budgetMax, categoriaAttiva, filtroScadenza, user?.city, user?.province, tribunaleToLocalita, applicaTuttiFiltri]);

  // Totale aste filtrate (per header)
  const totaleAsteFiltrate = asteOrdinate.length;

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
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>{asta.localita}</span>
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
            <p className="text-slate-400 text-sm">{totaleAsteFiltrate} aste trovate</p>
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

        {/* FILTRI CATEGORIA - Scorrevoli */}
        <div className="mb-3">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">🏠 Tipologia</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIE_FILTRO.map(cat => {
              const isActive = categoriaAttiva === cat.id;
              const countCat = conteggioCategorie[cat.id] || 0;
              
              return (
                <Card 
                  key={cat.id}
                  className={`cursor-pointer transition-all flex-shrink-0 min-w-[90px] ${
                    isActive 
                      ? 'bg-lime-500/40 border-lime-400 ring-2 ring-lime-400' 
                      : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                  }`}
                  onClick={() => setCategoriaAttiva(cat.id)}
                >
                  <CardContent className="p-3 text-center">
                    <p className={`text-xl font-bold ${isActive ? 'text-lime-400' : 'text-white'}`}>{countCat}</p>
                    <p className={`text-xs font-medium ${isActive ? 'text-lime-300' : 'text-slate-400'}`}>{cat.emoji} {cat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FILTRI LOCALITÀ - Scorrevoli (derivata dal Tribunale) */}
        <div className="mb-3">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">📍 Località</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Card 
              className={`cursor-pointer transition-all flex-shrink-0 min-w-[90px] ${
                filtroLocalita === 'tutte' 
                  ? 'bg-amber-500/40 border-amber-400 ring-2 ring-amber-400' 
                  : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
              }`}
              onClick={() => setFiltroLocalita('tutte')}
            >
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${filtroLocalita === 'tutte' ? 'text-amber-400' : 'text-white'}`}>
                  {localitaConConteggi.totale}
                </p>
                <p className={`text-xs font-medium ${filtroLocalita === 'tutte' ? 'text-amber-300' : 'text-slate-400'}`}>🗺️ Tutte</p>
              </CardContent>
            </Card>
            {localitaConConteggi.localita.map((loc) => {
              const isActive = filtroLocalita === loc.nome;
              return (
                <Card 
                  key={loc.nome}
                  className={`cursor-pointer transition-all flex-shrink-0 min-w-[90px] ${
                    isActive 
                      ? 'bg-amber-500/40 border-amber-400 ring-2 ring-amber-400' 
                      : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                  }`}
                  onClick={() => setFiltroLocalita(loc.nome)}
                >
                  <CardContent className="p-3 text-center">
                    <p className={`text-xl font-bold ${isActive ? 'text-amber-400' : 'text-white'}`}>{loc.count}</p>
                    <p className={`text-xs font-medium ${isActive ? 'text-amber-300' : 'text-slate-400'}`}>
                      {loc.isUser && isActive ? '📍' : ''}{loc.nome}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FILTRI SCADENZA - Scorrevoli */}
        <div className="mb-5">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">⏰ Scadenza asta</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Card 
              className={`cursor-pointer transition-all flex-shrink-0 min-w-[90px] ${filtroScadenza === 'immediate' ? 'bg-red-500/40 border-red-400 ring-2 ring-red-400' : 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30'}`}
              onClick={() => setFiltroScadenza(filtroScadenza === 'immediate' ? 'tutte' : 'immediate')}
            >
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${filtroScadenza === 'immediate' ? 'text-red-300' : 'text-red-400'}`}>{conteggioScadenze.immediate}</p>
                <p className={`text-xs font-medium ${filtroScadenza === 'immediate' ? 'text-red-200' : 'text-red-300'}`}>⚡ &lt;30gg</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all flex-shrink-0 min-w-[90px] ${filtroScadenza === 'normali' ? 'bg-lime-500/40 border-lime-400 ring-2 ring-lime-400' : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'}`}
              onClick={() => setFiltroScadenza(filtroScadenza === 'normali' ? 'tutte' : 'normali')}
            >
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${filtroScadenza === 'normali' ? 'text-lime-400' : 'text-white'}`}>{conteggioScadenze.normali}</p>
                <p className={`text-xs font-medium ${filtroScadenza === 'normali' ? 'text-lime-300' : 'text-slate-400'}`}>📅 30-90gg</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all flex-shrink-0 min-w-[90px] ${filtroScadenza === 'oltre90' ? 'bg-blue-500/40 border-blue-400 ring-2 ring-blue-400' : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'}`}
              onClick={() => setFiltroScadenza(filtroScadenza === 'oltre90' ? 'tutte' : 'oltre90')}
            >
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${filtroScadenza === 'oltre90' ? 'text-blue-400' : 'text-white'}`}>{conteggioScadenze.oltre90}</p>
                <p className={`text-xs font-medium ${filtroScadenza === 'oltre90' ? 'text-blue-300' : 'text-slate-400'}`}>📆 &gt;90gg</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* LISTA ASTE FILTRATE */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {filtroScadenza === 'immediate' && <><Zap className="w-5 h-5 text-red-400" /><h2 className="text-red-400 font-bold text-lg">Aste Immediate (&lt;30gg)</h2></>}
            {filtroScadenza === 'normali' && <><Calendar className="w-5 h-5 text-lime-400" /><h2 className="text-lime-400 font-bold text-lg">Aste 30-90 giorni</h2></>}
            {filtroScadenza === 'oltre90' && <><Calendar className="w-5 h-5 text-blue-400" /><h2 className="text-blue-400 font-bold text-lg">Aste oltre 90 giorni</h2></>}
            {filtroScadenza === 'tutte' && <><Building2 className="w-5 h-5 text-white" /><h2 className="text-white font-bold text-lg">Tutte le aste</h2></>}
            <Badge variant="outline" className="text-slate-400 ml-auto">{asteOrdinate.length} risultati</Badge>
          </div>
          <div className="space-y-3">
            {asteOrdinate.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center">
                  <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-white font-medium">Nessuna asta trovata</p>
                  <p className="text-slate-400 text-sm">Prova a modificare i filtri</p>
                </CardContent>
              </Card>
            ) : (
              asteOrdinate.map(asta => (
                <AstaCard key={asta.id} asta={asta} isImmediate={giorniAllaAsta(asta.data_asta) < 30} />
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