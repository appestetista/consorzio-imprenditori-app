import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { 
  ArrowLeft, 
  Bell, 
  BellOff,
  Calendar,
  Euro,
  MapPin,
  ExternalLink,
  Trash2,
  Check,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const OPZIONI_GIORNI = [
  { value: 30, label: '30 giorni' },
  { value: 14, label: '14 giorni' },
  { value: 7, label: '7 giorni' },
  { value: 3, label: '3 giorni' },
  { value: 1, label: '1 giorno' },
];

export default function PromemoriaAste() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  // Carica aste salvate
  const { data: asteSalvate = [], isLoading: loadingSalvate } = useQuery({
    queryKey: ['aste-salvate', user?.email],
    queryFn: () => base44.entities.AstaSalvata.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  // Carica dettagli aste
  const { data: asteDettagli = [], isLoading: loadingAste } = useQuery({
    queryKey: ['aste-dettagli', asteSalvate.map(s => s.asta_id)],
    queryFn: async () => {
      if (asteSalvate.length === 0) return [];
      const allAste = await base44.entities.AstaImmobiliare.list();
      return allAste.filter(a => asteSalvate.some(s => s.asta_id === a.id));
    },
    enabled: asteSalvate.length > 0,
  });

  // Combina dati
  const asteConPromemoria = asteSalvate.map(salvata => {
    const dettaglio = asteDettagli.find(a => a.id === salvata.asta_id);
    return {
      ...salvata,
      ...dettaglio,
      salvato_id: salvata.id,
      promemoria_attivo: salvata.promemoria_attivo ?? true,
      giorni_promemoria: salvata.giorni_promemoria || [7, 3, 1]
    };
  }).filter(a => a.titolo); // Solo quelle con dettagli caricati

  // Mutation per aggiornare promemoria
  const updateMutation = useMutation({
    mutationFn: async ({ salvatoId, data }) => {
      await base44.entities.AstaSalvata.update(salvatoId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aste-salvate'] });
      toast.success('Promemoria aggiornato');
    },
  });

  // Calcola giorni mancanti
  const giorniMancanti = (dataAsta) => {
    if (!dataAsta) return null;
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const data = new Date(dataAsta);
    data.setHours(0, 0, 0, 0);
    return Math.ceil((data - oggi) / (1000 * 60 * 60 * 24));
  };

  const formatPrezzo = (prezzo) => {
    if (!prezzo) return '€ 0';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prezzo);
  };

  const isLoading = loadingSalvate || loadingAste || !user;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#001d3b' }}>
      <Header user={user} />

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('AsteImmobiliari')} className="text-blue-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Promemoria Scadenze
            </h1>
            <p className="text-slate-400 text-sm">{asteConPromemoria.length} aste salvate</p>
          </div>
        </div>

        {/* Info box */}
        <Card className="bg-blue-900/30 border-blue-500/30 mb-6">
          <CardContent className="p-4">
            <p className="text-blue-300 text-sm">
              <Bell className="w-4 h-4 inline mr-2" />
              Configura quando ricevere le notifiche per ogni asta salvata. Riceverai un promemoria nei giorni selezionati prima della scadenza.
            </p>
          </CardContent>
        </Card>

        {/* Lista aste */}
        {asteConPromemoria.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-white font-medium">Nessuna asta salvata</p>
              <p className="text-slate-400 text-sm mt-1">Salva delle aste per configurare i promemoria</p>
              <Link to={createPageUrl('AsteImmobiliari')}>
                <Button className="mt-4 bg-blue-500 hover:bg-blue-600">
                  Vai alle Aste
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {asteConPromemoria.map((asta) => {
              const giorni = giorniMancanti(asta.data_asta);
              const isScaduta = giorni !== null && giorni < 0;
              
              return (
                <Card 
                  key={asta.salvato_id}
                  className={`border overflow-hidden ${
                    isScaduta 
                      ? 'bg-slate-800/50 border-slate-700 opacity-60'
                      : asta.promemoria_attivo
                      ? 'bg-slate-800 border-blue-500/30'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <CardContent className="p-4">
                    {/* Header asta */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-medium text-sm line-clamp-2">{asta.titolo}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <span className="line-clamp-1">{asta.localita || asta.provincia || 'N/D'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-sm">{formatPrezzo(asta.prezzo_base)}</p>
                        {giorni !== null && (
                          <Badge className={`text-xs mt-1 ${
                            isScaduta ? 'bg-red-500/20 text-red-400' :
                            giorni <= 7 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {isScaduta ? 'Scaduta' : `${giorni} giorni`}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Toggle promemoria */}
                    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg mb-3">
                      <div className="flex items-center gap-2">
                        {asta.promemoria_attivo ? (
                          <Bell className="w-4 h-4 text-blue-400" />
                        ) : (
                          <BellOff className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="text-white text-sm">Promemoria</span>
                      </div>
                      <button
                        onClick={() => updateMutation.mutate({
                          salvatoId: asta.salvato_id,
                          data: { promemoria_attivo: !asta.promemoria_attivo }
                        })}
                        disabled={updateMutation.isPending}
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          asta.promemoria_attivo ? 'bg-blue-500' : 'bg-slate-600'
                        }`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          asta.promemoria_attivo ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {/* Selezione giorni */}
                    {asta.promemoria_attivo && !isScaduta && (
                      <div className="space-y-2">
                        <p className="text-slate-400 text-xs">Avvisami:</p>
                        <div className="flex flex-wrap gap-2">
                          {OPZIONI_GIORNI.map(opzione => {
                            const isSelected = asta.giorni_promemoria.includes(opzione.value);
                            // Non mostrare opzioni per giorni già passati
                            if (giorni !== null && opzione.value > giorni) return null;
                            
                            return (
                              <button
                                key={opzione.value}
                                onClick={() => {
                                  const newGiorni = isSelected
                                    ? asta.giorni_promemoria.filter(g => g !== opzione.value)
                                    : [...asta.giorni_promemoria, opzione.value].sort((a, b) => b - a);
                                  updateMutation.mutate({
                                    salvatoId: asta.salvato_id,
                                    data: { giorni_promemoria: newGiorni }
                                  });
                                }}
                                disabled={updateMutation.isPending}
                                className={`px-3 py-1.5 rounded-full text-xs transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                {opzione.label} prima
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Link all'asta */}
                    {asta.link_ufficiale && (
                      <a
                        href={asta.link_ufficiale}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full mt-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Vedi annuncio
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav currentPage="PromemoriaAste" />
    </div>
  );
}