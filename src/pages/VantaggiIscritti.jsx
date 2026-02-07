import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gift, Tag, Calendar, MapPin, Check, Clock, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { toast } from 'sonner';

export default function VantaggiIscritti() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation } = useImpersonation();
  const queryClient = useQueryClient();

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (impersonation.active && impersonation.targetEmail) {
          const users = await base44.entities.User.filter({ email: impersonation.targetEmail });
          setUser(users[0] || currentUser);
        } else {
          setUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [impersonation]);

  // Vantaggi attivi
  const { data: vantaggi = [], isLoading: loadingVantaggi } = useQuery({
    queryKey: ['vantaggi-attivi'],
    queryFn: async () => {
      const all = await base44.entities.Vantaggio.filter({ is_active: true });
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      // Filtra: non scaduti e con utilizzi disponibili
      return all.filter(v => {
        if (v.data_scadenza) {
          const scadenza = new Date(v.data_scadenza);
          if (scadenza < oggi) return false;
        }
        if (v.utilizzi_massimi && v.utilizzi_effettuati >= v.utilizzi_massimi) return false;
        return true;
      });
    },
  });

  // Prenotazioni attive dell'utente
  const { data: miePrenotazioni = [] } = useQuery({
    queryKey: ['mie-prenotazioni-vantaggi', user?.email],
    queryFn: () => base44.entities.PrenotazioneVantaggio.filter({ 
      user_email: user?.email, 
      status: 'attiva' 
    }),
    enabled: !!user?.email,
  });

  // Consulenti (per nome/logo)
  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants-vantaggi'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  // Utenti (per aziende)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-vantaggi'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    },
  });

  // Mutation per prenotare
  const prenotaMutation = useMutation({
    mutationFn: async (vantaggioId) => {
      await base44.entities.PrenotazioneVantaggio.create({
        user_email: user.email,
        vantaggio_id: vantaggioId,
        status: 'attiva'
      });
    },
    onSuccess: () => {
      toast.success('Vantaggio prenotato! Mostra il tuo QR in negozio per utilizzarlo.');
      queryClient.invalidateQueries({ queryKey: ['mie-prenotazioni-vantaggi'] });
    },
    onError: () => {
      toast.error('Errore durante la prenotazione');
    }
  });

  const getCreatorInfo = (vantaggio) => {
    if (vantaggio.creator_type === 'consulente') {
      const consultant = consultants.find(c => c.email === vantaggio.creator_email);
      return {
        name: consultant?.name || 'Consulente',
        logo: consultant?.logo_url,
        type: 'consulente'
      };
    } else {
      const azienda = allUsers.find(u => u.email === vantaggio.creator_email);
      return {
        name: azienda?.company_name || 'Azienda',
        logo: azienda?.logo_url,
        type: 'azienda'
      };
    }
  };

  const isPrenotato = (vantaggioId) => {
    return miePrenotazioni.some(p => p.vantaggio_id === vantaggioId);
  };

  const getTipoVantaggioColor = (tipo) => {
    switch (tipo) {
      case 'Sconto percentuale': return 'bg-green-500';
      case 'Sconto fisso': return 'bg-blue-500';
      case 'Consulenza gratuita': return 'bg-purple-500';
      case 'Omaggio': return 'bg-pink-500';
      case 'Promozione speciale': return 'bg-amber-500';
      case 'Prova gratuita': return 'bg-cyan-500';
      default: return 'bg-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
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
          <Gift className="w-6 h-6 text-lime-400" />
          <h1 className="text-white text-xl font-bold">Vantaggi per gli Iscritti</h1>
        </div>

        {/* Info box */}
        <div className="bg-lime-400/10 border border-lime-400/30 rounded-xl p-4 mb-6">
          <p className="text-lime-300 text-sm">
            💡 Questi sono vantaggi esclusivi riservati ai membri del Consorzio. 
            Prenota il vantaggio e mostra il tuo QR code in negozio per utilizzarlo!
          </p>
        </div>

        {/* Lista vantaggi */}
        {loadingVantaggi ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : vantaggi.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Gift className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nessun vantaggio disponibile al momento</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {vantaggi.map((vantaggio) => {
              const creator = getCreatorInfo(vantaggio);
              const prenotato = isPrenotato(vantaggio.id);
              const utilizziRimasti = vantaggio.utilizzi_massimi 
                ? vantaggio.utilizzi_massimi - (vantaggio.utilizzi_effettuati || 0)
                : null;

              return (
                <Card key={vantaggio.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Foto */}
                      {vantaggio.foto_url ? (
                        <div className="w-28 h-28 flex-shrink-0">
                          <img 
                            src={vantaggio.foto_url} 
                            alt={vantaggio.titolo}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-28 h-28 flex-shrink-0 bg-slate-700 flex items-center justify-center">
                          <Gift className="w-10 h-10 text-slate-500" />
                        </div>
                      )}

                      {/* Contenuto */}
                      <div className="flex-1 p-3">
                        {/* Header con tipo e creator */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge className={`${getTipoVantaggioColor(vantaggio.tipo_vantaggio)} text-white text-[10px]`}>
                            {vantaggio.tipo_vantaggio}
                          </Badge>
                          <div className="flex items-center gap-1 text-slate-400 text-xs">
                            {creator.logo ? (
                              <img src={creator.logo} alt="" className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              creator.type === 'consulente' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />
                            )}
                            <span className="truncate max-w-[80px]">{creator.name}</span>
                          </div>
                        </div>

                        {/* Titolo e valore */}
                        <h3 className="text-white font-bold text-sm mb-1">{vantaggio.titolo}</h3>
                        {vantaggio.valore && (
                          <p className="text-lime-400 font-bold text-lg">{vantaggio.valore}</p>
                        )}

                        {/* Descrizione */}
                        {vantaggio.descrizione && (
                          <p className="text-slate-400 text-xs mt-1 line-clamp-2">{vantaggio.descrizione}</p>
                        )}

                        {/* Info aggiuntive */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {vantaggio.data_scadenza && (
                            <span className="text-slate-500 text-[10px] flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Scade: {new Date(vantaggio.data_scadenza).toLocaleDateString('it-IT')}
                            </span>
                          )}
                          {utilizziRimasti !== null && (
                            <span className="text-slate-500 text-[10px] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {utilizziRimasti} rimasti
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer con azione */}
                    <div className="px-3 pb-3">
                      {prenotato ? (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 flex items-center justify-center gap-2">
                          <Check className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-medium">Prenotato</span>
                        </div>
                      ) : vantaggio.richiede_prenotazione ? (
                        <Button
                          onClick={() => prenotaMutation.mutate(vantaggio.id)}
                          disabled={prenotaMutation.isPending}
                          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-bold"
                          size="sm"
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          Prenota
                        </Button>
                      ) : (
                        <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-2 text-center">
                          <span className="text-amber-400 text-sm">Mostra il QR in negozio</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Link al mio QR e prenotazioni */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link to={createPageUrl('MioQRCode')}>
            <Button variant="outline" className="w-full border-lime-400 text-lime-400 hover:bg-lime-400/10">
              Il Mio QR Code
            </Button>
          </Link>
          <Link to={createPageUrl('MiePrenotazioniVantaggi')}>
            <Button variant="outline" className="w-full border-amber-400 text-amber-400 hover:bg-amber-400/10">
              Le Mie Prenotazioni
            </Button>
          </Link>
        </div>
      </main>

      <BottomNav currentPage="VantaggiIscritti" />
    </div>
  );
}