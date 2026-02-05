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
  Filter, 
  Star, 
  Clock, 
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const PROVINCE = ['Pesaro-Urbino', 'Ancona', 'Macerata', 'Fermo', 'Ascoli Piceno', 'Rimini'];
const TIPOLOGIE = ['Abitativo', 'Commerciale', 'Industriale', 'Attrezzatura', 'Mezzi', 'Arredamento attività'];

export default function AsteImmobiliari() {
  const [user, setUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const queryClient = useQueryClient();

  // Filtri locali
  const [filtroZona, setFiltroZona] = useState('tutte');
  const [filtroTipologia, setFiltroTipologia] = useState('tutte');
  const [filtroPrezzoMax, setFiltroPrezzoMax] = useState('');
  const [filtroInteresse, setFiltroInteresse] = useState('tutti');
  const [ordinamento, setOrdinamento] = useState('interesse');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Carica preferenze utente
  const { data: preferenze } = useQuery({
    queryKey: ['asta-preferenze', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.AstaPreferenze.filter({ user_email: user.email });
      return prefs[0] || null;
    },
    enabled: !!user?.email,
  });

  // Carica aste
  const { data: aste = [], isLoading } = useQuery({
    queryKey: ['aste-immobiliari'],
    queryFn: async () => {
      const allAste = await base44.entities.AstaImmobiliare.filter({ is_active: true });
      return allAste;
    },
  });

  // Salva preferenze
  const savePreferencesMutation = useMutation({
    mutationFn: async (data) => {
      if (preferenze?.id) {
        await base44.entities.AstaPreferenze.update(preferenze.id, data);
      } else {
        await base44.entities.AstaPreferenze.create({ user_email: user.email, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asta-preferenze'] });
      toast.success('Preferenze salvate!');
      setShowPreferences(false);
    },
  });

  // Filtra e ordina aste
  const asteFiltrate = aste
    .filter(asta => {
      if (filtroZona !== 'tutte' && asta.provincia !== filtroZona) return false;
      if (filtroTipologia !== 'tutte' && asta.tipologia !== filtroTipologia) return false;
      if (filtroPrezzoMax && asta.prezzo_base > parseInt(filtroPrezzoMax)) return false;
      if (filtroInteresse !== 'tutti' && asta.livello_interesse !== filtroInteresse) return false;
      
      // Filtra anche per preferenze utente se impostate
      if (preferenze?.zone_interesse?.length > 0 && !preferenze.zone_interesse.includes(asta.provincia)) {
        return false;
      }
      if (preferenze?.tipologie_interesse?.length > 0 && !preferenze.tipologie_interesse.includes(asta.tipologia)) {
        return false;
      }
      // Filtra per budget utente
      if (preferenze?.budget_massimo && asta.prezzo_base > preferenze.budget_massimo) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (ordinamento) {
        case 'interesse':
          const ordineInteresse = { 'Molto interessante': 0, 'Interessante': 1, 'Da valutare': 2 };
          return ordineInteresse[a.livello_interesse] - ordineInteresse[b.livello_interesse];
        case 'prezzo_asc':
          return a.prezzo_base - b.prezzo_base;
        case 'prezzo_desc':
          return b.prezzo_base - a.prezzo_base;
        case 'data':
          return new Date(a.data_asta) - new Date(b.data_asta);
        default:
          return 0;
      }
    });

  // Conteggi per badge
  const moltoInteressanti = aste.filter(a => a.livello_interesse === 'Molto interessante').length;
  const interessanti = aste.filter(a => a.livello_interesse === 'Interessante').length;

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
        {/* Header con back */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">Aste Immobiliari</h1>
            <p className="text-slate-400 text-sm">Opportunità selezionate per te</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreferences(true)}
            className="border-lime-400 text-lime-400"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Banner budget non impostato */}
        {!preferenze?.budget_massimo && (
          <Card className="bg-amber-500/20 border-amber-500/30 mb-4">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium">Imposta il tuo budget</p>
                <p className="text-amber-200 text-sm">Per vedere aste personalizzate, indica quanto vuoi investire</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowPreferences(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-900"
              >
                Imposta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats rapide */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-green-500/20 border-green-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-green-400 text-2xl font-bold">{moltoInteressanti}</p>
              <p className="text-green-300 text-xs">Top opportunità</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/20 border-amber-500/30">
            <CardContent className="p-3 text-center">
              <p className="text-amber-400 text-2xl font-bold">{interessanti}</p>
              <p className="text-amber-300 text-xs">Interessanti</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-700/50 border-slate-600">
            <CardContent className="p-3 text-center">
              <p className="text-white text-2xl font-bold">{aste.length}</p>
              <p className="text-slate-400 text-xs">Totale attive</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtri */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between text-white"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-lime-400" />
                <span className="font-medium">Filtri</span>
                {(filtroZona !== 'tutte' || filtroTipologia !== 'tutte' || filtroPrezzoMax || filtroInteresse !== 'tutti') && (
                  <Badge className="bg-lime-400 text-slate-900 text-xs">Attivi</Badge>
                )}
              </div>
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFilters && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-400 text-xs">Zona</Label>
                    <Select value={filtroZona} onValueChange={setFiltroZona}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutte">Tutte le zone</SelectItem>
                        {PROVINCE.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Tipologia</Label>
                    <Select value={filtroTipologia} onValueChange={setFiltroTipologia}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutte">Tutte</SelectItem>
                        {TIPOLOGIE.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-400 text-xs">Prezzo max (€)</Label>
                    <Input
                      type="number"
                      placeholder="Es. 200000"
                      value={filtroPrezzoMax}
                      onChange={(e) => setFiltroPrezzoMax(e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Interesse</Label>
                    <Select value={filtroInteresse} onValueChange={setFiltroInteresse}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutti">Tutti</SelectItem>
                        <SelectItem value="Molto interessante">Solo Top</SelectItem>
                        <SelectItem value="Interessante">Interessanti</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Ordina per</Label>
                  <Select value={ordinamento} onValueChange={setOrdinamento}>
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interesse">Livello interesse</SelectItem>
                      <SelectItem value="prezzo_asc">Prezzo (crescente)</SelectItem>
                      <SelectItem value="prezzo_desc">Prezzo (decrescente)</SelectItem>
                      <SelectItem value="data">Data asta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFiltroZona('tutte');
                    setFiltroTipologia('tutte');
                    setFiltroPrezzoMax('');
                    setFiltroInteresse('tutti');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3 mr-1" /> Reset filtri
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista aste */}
        <div className="space-y-3">
          {asteFiltrate.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-white font-medium">Nessuna asta trovata</p>
                <p className="text-slate-400 text-sm">Prova a modificare i filtri</p>
              </CardContent>
            </Card>
          ) : (
            asteFiltrate.map(asta => (
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
                  </div>



                  {/* Le 3 domande chiave */}
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-3 space-y-2">
                    {/* Quando devo decidere? */}
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-amber-400 text-xs font-semibold">Quando devo decidere?</p>
                        <p className="text-white text-sm">
                          Asta il <span className="font-bold">{formatData(asta.data_asta)}</span> — 
                          <span className={giorniAllaAsta(asta.data_asta) < 40 ? 'text-red-400' : 'text-lime-400'}>
                            {' '}{giorniAllaAsta(asta.data_asta)} giorni
                          </span> per analizzare
                        </p>
                      </div>
                    </div>

                    {/* Quanti soldi devo immobilizzare? */}
                    <div className="flex items-start gap-2">
                      <Euro className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-green-400 text-xs font-semibold">Quanti soldi devo immobilizzare?</p>
                        <p className="text-white text-sm">
                          Prezzo base: <span className="font-bold">{formatPrezzo(asta.prezzo_base)}</span>
                        </p>
                        <p className="text-slate-400 text-xs">
                          Cauzione (10%): <span className="text-white font-medium">{formatPrezzo(asta.cauzione_stimata || asta.prezzo_base * 0.1)}</span> da versare per partecipare
                        </p>
                      </div>
                    </div>

                    {/* Perché dovrei aprirla? */}
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
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-500 text-slate-900 font-medium py-2 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Vedi dettagli ufficiali
                  </a>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info aggiornamento */}
        <p className="text-slate-500 text-xs text-center mt-6">
          Dati aggiornati settimanalmente • Fonte: IVG Marche e IVG Rimini
        </p>
      </main>

      {/* Dialog Preferenze */}
      <PreferencesDialog
        open={showPreferences}
        onClose={() => setShowPreferences(false)}
        preferenze={preferenze}
        onSave={(data) => savePreferencesMutation.mutate(data)}
        saving={savePreferencesMutation.isPending}
      />

      <BottomNav currentPage="AsteImmobiliari" />
    </div>
  );
}

function PreferencesDialog({ open, onClose, preferenze, onSave, saving }) {
  const [budgetMassimo, setBudgetMassimo] = useState(preferenze?.budget_massimo || '');
  const [zoneInteresse, setZoneInteresse] = useState(preferenze?.zone_interesse || []);
  const [tipologieInteresse, setTipologieInteresse] = useState(preferenze?.tipologie_interesse || []);

  useEffect(() => {
    if (preferenze) {
      setBudgetMassimo(preferenze.budget_massimo || '');
      setZoneInteresse(preferenze.zone_interesse || []);
      setTipologieInteresse(preferenze.tipologie_interesse || []);
    }
  }, [preferenze]);

  const toggleZona = (zona) => {
    setZoneInteresse(prev => 
      prev.includes(zona) ? prev.filter(z => z !== zona) : [...prev, zona]
    );
  };

  const toggleTipologia = (tipo) => {
    setTipologieInteresse(prev =>
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    );
  };

  const handleSave = () => {
    if (!budgetMassimo || parseInt(budgetMassimo) <= 0) {
      toast.error('Inserisci il tuo budget massimo per continuare');
      return;
    }
    onSave({
      budget_massimo: parseInt(budgetMassimo),
      zone_interesse: zoneInteresse,
      tipologie_interesse: tipologieInteresse,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-lime-400" />
            Le tue preferenze
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zone di interesse */}
          <div>
            <Label className="text-slate-300 mb-2 block">Zone di interesse</Label>
            <p className="text-slate-500 text-xs mb-2">Seleziona le province che ti interessano (lascia vuoto per tutte)</p>
            <div className="grid grid-cols-2 gap-2">
              {PROVINCE.map(zona => (
                <label key={zona} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 cursor-pointer">
                  <Checkbox
                    checked={zoneInteresse.includes(zona)}
                    onCheckedChange={() => toggleZona(zona)}
                    className="border-slate-600 data-[state=checked]:bg-lime-400"
                  />
                  <span className="text-sm text-slate-300">{zona}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tipologie */}
          <div>
            <Label className="text-slate-300 mb-2 block">Tipologie di interesse</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOLOGIE.map(tipo => (
                <label key={tipo} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 cursor-pointer">
                  <Checkbox
                    checked={tipologieInteresse.includes(tipo)}
                    onCheckedChange={() => toggleTipologia(tipo)}
                    className="border-slate-600 data-[state=checked]:bg-lime-400"
                  />
                  <span className="text-sm text-slate-300">{tipo}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Budget massimo - OBBLIGATORIO */}
          <div>
            <Label className="text-slate-300 mb-2 block">
              Budget massimo di investimento (€) <span className="text-red-400">*</span>
            </Label>
            <p className="text-slate-500 text-xs mb-2">
              Indica quanto sei disposto a investire (max €200.000). Vedrai solo aste nel tuo budget.
            </p>
            <Input
              type="number"
              placeholder="Es. 80000"
              value={budgetMassimo}
              onChange={(e) => setBudgetMassimo(e.target.value)}
              max={200000}
              className="bg-slate-900 border-slate-600 text-white"
            />
            {budgetMassimo && parseInt(budgetMassimo) > 200000 && (
              <p className="text-amber-400 text-xs mt-1">Il sistema mostra aste fino a €200.000</p>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
          >
            {saving ? 'Salvataggio...' : 'Salva preferenze'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}