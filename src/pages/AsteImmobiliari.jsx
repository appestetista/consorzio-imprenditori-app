import React, { useState, useEffect, useMemo } from 'react';
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
  Bookmark,
  BookmarkCheck,
  Car,
  Ship,
  Monitor,
  Sofa,
  Wrench,
  Home,
  Factory,
  Store,
  Package,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Bell,
  Mountain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// CATEGORIE PRINCIPALI
const CATEGORIE_MOBILI = [
  { id: 'Nautica', label: 'Nautica', icon: Ship },
  { id: 'Informatica E Elettronica', label: 'Informatica', icon: Monitor },
  { id: 'Autoveicoli', label: 'Autoveicoli', icon: Car },
  { id: 'Arredamento ed Elettrodomestici', label: 'Arredamento', icon: Sofa },
  { id: 'Macchinari, Utensili, Materie Prime', label: 'Macchinari', icon: Wrench },
];

const CATEGORIE_IMMOBILI = [
  { id: 'Immobile Residenziale', label: 'Residenziale', icon: Home },
  { id: 'Immobile Commerciale', label: 'Commerciale', icon: Store },
  { id: 'Immobile Industriale', label: 'Industriale', icon: Factory },
  { id: 'Terreni', label: 'Terreni', icon: Mountain },
];

export default function AsteImmobiliari() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Filtri
  const [macroCategoria, setMacroCategoria] = useState('tutti'); // 'tutti', 'mobili', 'immobili'
  const [categoriaAttiva, setCategoriaAttiva] = useState(null);
  const [zonaAttiva, setZonaAttiva] = useState(null);
  const [budgetMassimo, setBudgetMassimo] = useState('');

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Carica aste attive (escludi quelle con data passata)
  const { data: aste = [], isLoading } = useQuery({
    queryKey: ['aste-immobiliari'],
    queryFn: async () => {
      const allAste = await base44.entities.AstaImmobiliare.filter({ is_active: true });
      // Filtra solo aste con data futura o odierna
      const oggi = new Date().toISOString().split('T')[0];
      return allAste.filter(a => !a.data_asta || a.data_asta >= oggi);
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
    if (!data) return 999;
    const oggi = new Date();
    const dataAsta = new Date(data);
    return Math.ceil((dataAsta - oggi) / (1000 * 60 * 60 * 24));
  };

  // Estrai zone uniche dagli annunci
  const zoneDisponibili = useMemo(() => {
    const zoneSet = new Set();
    aste.forEach(a => {
      if (a.provincia && a.provincia !== 'Altra') {
        zoneSet.add(a.provincia);
      }
    });
    return Array.from(zoneSet).sort();
  }, [aste]);

  // Determina se una tipologia è mobile o immobile
  const isMobile = (tipologia) => {
    return CATEGORIE_MOBILI.some(c => c.id === tipologia);
  };

  const isImmobile = (tipologia) => {
    return CATEGORIE_IMMOBILI.some(c => c.id === tipologia);
  };

  // Filtra aste
  const asteFiltrate = useMemo(() => {
    return aste.filter(asta => {
      // Filtro macro categoria
      if (macroCategoria === 'mobili' && !isMobile(asta.tipologia)) return false;
      if (macroCategoria === 'immobili' && !isImmobile(asta.tipologia)) return false;
      
      // Filtro categoria specifica
      if (categoriaAttiva && asta.tipologia !== categoriaAttiva) return false;
      
      // Filtro zona
      if (zonaAttiva && asta.provincia !== zonaAttiva) return false;
      
      // Filtro budget massimo
      if (budgetMassimo) {
        const budget = parseFloat(budgetMassimo);
        if (!isNaN(budget) && asta.prezzo_base > budget) return false;
      }
      
      return true;
    });
  }, [aste, macroCategoria, categoriaAttiva, zonaAttiva, budgetMassimo]);

  // Ordina per termine presentazione offerte (dal più vicino al più lontano)
      const asteOrdinate = [...asteFiltrate].sort((a, b) => {
        const getTermineDate = (asta) => {
          const termine = asta.termine_presentazione_offerte || asta.raw_data?.offer_submission_deadline_0;
          if (!termine) return new Date('2099-12-31');
          // Formato: "17/03/2026 13:00"
          const [datePart, timePart] = termine.split(' ');
          const [day, month, year] = datePart.split('/');
          return new Date(`${year}-${month}-${day}T${timePart || '00:00'}`);
        };
        return getTermineDate(a) - getTermineDate(b);
      });

  // Conteggi
  const countMobili = aste.filter(a => isMobile(a.tipologia)).length;
  const countImmobili = aste.filter(a => isImmobile(a.tipologia)).length;

  const formatPrezzo = (prezzo) => {
    if (!prezzo) return '€ 0';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prezzo);
  };

  const formatData = (data) => {
    if (!data) return 'N/D';
    return new Date(data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const resetFiltri = () => {
    setMacroCategoria('tutti');
    setCategoriaAttiva(null);
    setZonaAttiva(null);
    setBudgetMassimo('');
  };

  const hasActiveFilters = macroCategoria !== 'tutti' || categoriaAttiva || zonaAttiva || budgetMassimo;

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
            <ArrowLeft className="w-7 h-7" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">Aste Giudiziarie</h1>
            <p className="text-slate-400 text-sm">{asteOrdinate.length} annunci</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl('AsteSalvate')}>
              <Button 
                size="sm" 
                className={`relative ${
                  asteSalvate.length > 0 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span className="ml-1.5 font-bold">Salvate</span>
                {asteSalvate.length > 0 && (
                  <span className="ml-1.5 bg-white text-amber-600 rounded-full px-1.5 py-0.5 text-xs font-bold min-w-[20px]">
                    {asteSalvate.length}
                  </span>
                )}
              </Button>
            </Link>
            {asteSalvate.length > 0 && (
              <Link to={createPageUrl('PromemoriaAste')}>
                <Button 
                  size="sm" 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Bell className="w-4 h-4 animate-pulse" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* MACRO FILTRI - Mobili / Immobili */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => {
              setMacroCategoria(macroCategoria === 'mobili' ? 'tutti' : 'mobili');
              setCategoriaAttiva(null);
            }}
            className={`p-4 rounded-xl border-2 transition-all ${
              macroCategoria === 'mobili'
                ? 'bg-lime-400/20 border-lime-400 text-lime-400'
                : 'bg-slate-800/50 border-slate-700 text-white hover:border-slate-500'
            }`}
          >
            <Package className="w-8 h-8 mx-auto mb-2" />
            <p className="font-bold text-lg">{countMobili}</p>
            <p className="text-sm opacity-80">Beni Mobili</p>
          </button>
          
          <button
            onClick={() => {
              setMacroCategoria(macroCategoria === 'immobili' ? 'tutti' : 'immobili');
              setCategoriaAttiva(null);
            }}
            className={`p-4 rounded-xl border-2 transition-all ${
              macroCategoria === 'immobili'
                ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                : 'bg-slate-800/50 border-slate-700 text-white hover:border-slate-500'
            }`}
          >
            <Building2 className="w-8 h-8 mx-auto mb-2" />
            <p className="font-bold text-lg">{countImmobili}</p>
            <p className="text-sm opacity-80">Immobili</p>
          </button>
        </div>

        {/* SOTTO-CATEGORIE */}
        {macroCategoria === 'mobili' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Tipologia bene mobile</p>
              <p className="text-lime-400 text-xs animate-pulse">← scorri →</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIE_MOBILI.map(cat => {
                const Icon = cat.icon;
                const count = aste.filter(a => a.tipologia === cat.id).length;
                const isActive = categoriaAttiva === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaAttiva(isActive ? null : cat.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-lime-400/20 border-lime-400 text-lime-400'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{cat.label}</span>
                    <Badge variant="outline" className={`text-xs ${isActive ? 'border-lime-400 text-lime-400' : 'border-slate-600 text-slate-400'}`}>
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {macroCategoria === 'immobili' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Tipologia immobile</p>
              <p className="text-amber-400 text-xs animate-pulse">← scorri →</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIE_IMMOBILI.map(cat => {
                const Icon = cat.icon;
                const count = aste.filter(a => a.tipologia === cat.id).length;
                const isActive = categoriaAttiva === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaAttiva(isActive ? null : cat.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{cat.label}</span>
                    <Badge variant="outline" className={`text-xs ${isActive ? 'border-amber-400 text-amber-400' : 'border-slate-600 text-slate-400'}`}>
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* FILTRO LOCALITÀ - sempre visibile */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Località
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setZonaAttiva(null)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                !zonaAttiva
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Tutte
            </button>
            {zoneDisponibili.map(zona => (
              <button
                key={zona}
                onClick={() => setZonaAttiva(zonaAttiva === zona ? null : zona)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  zonaAttiva === zona
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {zona}
              </button>
            ))}
          </div>
        </div>

        {/* FILTRO INVESTIMENTO MASSIMO */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-2 flex items-center gap-1">
            <Euro className="w-3.5 h-3.5" /> Investimento massimo
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="number"
                placeholder="es. 100000"
                value={budgetMassimo}
                onChange={(e) => setBudgetMassimo(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-lime-400 focus:outline-none"
              />
            </div>
            {budgetMassimo && (
              <button
                onClick={() => setBudgetMassimo('')}
                className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {budgetMassimo && (
            <p className="text-lime-400 text-xs mt-1">
              Mostrando aste fino a {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(parseFloat(budgetMassimo))}
            </p>
          )}
        </div>

        {/* Reset filtri */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetFiltri}
            className="w-full mb-4 border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4 mr-2" />
            Rimuovi tutti i filtri
          </Button>
        )}

        {/* LISTA ASTE */}
        <div className="space-y-3">
          {asteOrdinate.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">Nessuna asta trovata</p>
                <p className="text-slate-400 text-sm mt-1">Prova a modificare i filtri</p>
              </CardContent>
            </Card>
          ) : (
            asteOrdinate.map((asta) => {
              const giorni = giorniAllaAsta(asta.data_asta);
              const isScaduta = giorni < 0;
              
              return (
                <Card 
                  key={asta.id}
                  className={`border transition-all overflow-hidden ${
                    isScaduta 
                      ? 'bg-slate-800/50 border-slate-700 opacity-60'
                      : asta.livello_interesse === 'Molto interessante'
                      ? 'bg-gradient-to-r from-green-900/30 to-slate-800 border-green-500/30'
                      : asta.livello_interesse === 'Interessante'
                      ? 'bg-gradient-to-r from-amber-900/20 to-slate-800 border-amber-500/30'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <CardContent className="p-4">
                    {/* Header con badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                            {asta.tipologia || 'Altro'}
                          </Badge>
                          {!isScaduta && asta.livello_interesse === 'Molto interessante' && (
                            <Badge className="bg-green-500 text-white text-xs">⭐ Top</Badge>
                          )}
                          {isScaduta && (
                            <Badge className="bg-red-500/50 text-red-200 text-xs">Scaduta</Badge>
                          )}
                        </div>
                        <h3 className="text-white font-medium line-clamp-2">{asta.titolo}</h3>
                        
                        {/* Info rapide sotto il titolo */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                          {asta.raw_data?.['property_included_in_lot_-_category_0'] && (
                            <span><span className="text-slate-500">Tipologia:</span> {asta.raw_data['property_included_in_lot_-_category_0'].replace('Tipologia', '')}</span>
                          )}
                          {asta.raw_data?.sale_mode_0 && (
                            <span><span className="text-slate-500">Modalità:</span> {asta.raw_data.sale_mode_0}</span>
                          )}
                          {(asta.superficie || asta.raw_data?.data_3?.match(/(\d+[\.,]?\d*)\s*mq/i)) && (
                            <span><span className="text-slate-500">Superficie:</span> {asta.superficie || asta.raw_data?.data_3?.match(/(\d+[\.,]?\d*)\s*mq/i)?.[0]}</span>
                          )}
                          {asta.raw_data?.sale_type_0 && (
                            <span><span className="text-slate-500">Vendita:</span> {asta.raw_data.sale_type_0.replace('Tipologia', '').trim()}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSalvaMutation.mutate(asta.id)}
                        disabled={toggleSalvaMutation.isPending}
                        className={`p-2 rounded-lg transition-colors ${
                          asteSalvateIds.has(asta.id)
                            ? 'bg-amber-400/20 text-amber-400'
                            : 'bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {asteSalvateIds.has(asta.id) ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Info principali */}
                    <div className="space-y-2 mb-3">
                      {/* Prezzo base e data/ora */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                          <span className="text-slate-500 text-xs">Valore del tribunale</span>
                          <div className="flex items-center gap-2">
                            <Euro className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-bold">{formatPrezzo(asta.prezzo_base)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-500 text-xs">Data vendita</span>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-400" />
                            <span className={`text-sm ${isScaduta ? 'text-red-400' : giorni < 30 ? 'text-amber-400' : 'text-slate-300'}`}>
                              {asta.data_ora_vendita || (isScaduta ? 'Scaduta' : `${giorni} giorni`)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Termine presentazione offerte */}
                        {(asta.termine_presentazione_offerte || asta.raw_data?.offer_submission_deadline_0) && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Termine presentazione offerte:</span>
                            <span className="text-orange-400 font-medium">
                              {asta.termine_presentazione_offerte || asta.raw_data?.offer_submission_deadline_0}
                            </span>
                          </div>
                        )}

                        {/* Delegato alla vendita */}
                        {(asta.raw_data?.delegate_name_0 || asta.raw_data?.delegate_surname_0) && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">Delegato:</span>
                            <span className="text-slate-300 font-medium">
                              {[asta.raw_data?.delegate_name_0, asta.raw_data?.delegate_surname_0].filter(Boolean).join(' ')}
                            </span>
                          </div>
                        )}

                      {/* Offerta minima e rilancio minimo */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {asta.offerta_minima > 0 && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <span className="text-slate-500">Offerta minima:</span>
                            <span className="text-blue-400 font-medium">{formatPrezzo(asta.offerta_minima)}</span>
                          </div>
                        )}
                        {asta.rilancio_minimo > 0 && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <span className="text-slate-500">Rilancio minimo:</span>
                            <span className="text-purple-400 font-medium">{formatPrezzo(asta.rilancio_minimo)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Località */}
                    <div className="flex items-start gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-400 text-sm line-clamp-1">{asta.localita}</span>
                    </div>

                    {/* Motivo interesse */}
                    {asta.motivo_interesse && (
                      <p className="text-xs text-slate-500 mb-3">{asta.motivo_interesse}</p>
                    )}

                    {/* Descrizione */}
                    {asta.raw_data?.data_3 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-400 leading-relaxed">{asta.raw_data.data_3}</p>
                      </div>
                    )}

                    {/* CTA */}
                    <a
                      href={asta.link_ufficiale}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-lime-400 hover:bg-lime-500 text-slate-900 font-medium rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Vedi annuncio
                    </a>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <p className="text-slate-500 text-xs text-center mt-6">
          Dati aggiornati settimanalmente • Fonte: PVP Giustizia
        </p>
      </main>

      <BottomNav currentPage="AsteImmobiliari" />
    </div>
  );
}