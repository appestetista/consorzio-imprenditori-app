import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gift, Clock, Check, X, Calendar, Building2, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';

export default function MiePrenotazioniVantaggi() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation } = useImpersonation();
  const navigate = useNavigate();

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

  // Tutte le prenotazioni dell'utente
  const { data: prenotazioni = [], isLoading: loadingPrenotazioni } = useQuery({
    queryKey: ['tutte-prenotazioni-vantaggi', user?.email],
    queryFn: () => base44.entities.PrenotazioneVantaggio.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  // Tutti i vantaggi (per dettagli)
  const { data: vantaggi = [] } = useQuery({
    queryKey: ['tutti-vantaggi'],
    queryFn: () => base44.entities.Vantaggio.list(),
  });

  // Consulenti e utenti per info creator
  const { data: consultants = [] } = useQuery({
    queryKey: ['consultants-vantaggi'],
    queryFn: () => base44.entities.Consultant.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-vantaggi'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    },
  });

  const getVantaggioDetails = (vantaggioId) => {
    return vantaggi.find(v => v.id === vantaggioId);
  };

  const getCreatorInfo = (vantaggio) => {
    if (!vantaggio) return { name: '-', logo: null, email: null };
    if (vantaggio.creator_type === 'consulente') {
      const consultant = consultants.find(c => c.email === vantaggio.creator_email);
      return { name: consultant?.name || 'Consulente', logo: consultant?.logo_url, email: vantaggio.creator_email };
    } else {
      const azienda = allUsers.find(u => u.email === vantaggio.creator_email);
      return { name: azienda?.company_name || 'Azienda', logo: azienda?.logo_url, email: vantaggio.creator_email };
    }
  };

  const handleContactCreator = (email) => {
    if (email) {
      navigate(createPageUrl('Messaggi') + `?contact=${email}`);
    }
  };

  const prenotazioniAttive = prenotazioni.filter(p => p.status === 'attiva');
  const prenotazioniUtilizzate = prenotazioni.filter(p => p.status === 'utilizzata');

  const statusColors = {
    attiva: 'bg-lime-500',
    utilizzata: 'bg-green-600',
    annullata: 'bg-red-500',
    scaduta: 'bg-slate-500'
  };

  const statusLabels = {
    attiva: 'Attiva',
    utilizzata: 'Utilizzata',
    annullata: 'Annullata',
    scaduta: 'Scaduta'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const renderPrenotazione = (prenotazione) => {
    const vantaggio = getVantaggioDetails(prenotazione.vantaggio_id);
    const creator = getCreatorInfo(vantaggio);

    return (
      <Card key={prenotazione.id} className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Foto vantaggio */}
            {vantaggio?.foto_url ? (
              <img 
                src={vantaggio.foto_url} 
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-slate-500" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-white font-bold text-sm">
                  {vantaggio?.titolo || 'Vantaggio non disponibile'}
                </h3>
                <Badge className={`${statusColors[prenotazione.status]} text-white text-[10px]`}>
                  {statusLabels[prenotazione.status]}
                </Badge>
              </div>

              {vantaggio?.valore && (
                <p className="text-lime-400 font-bold">{vantaggio.valore}</p>
              )}

              <button 
                onClick={() => handleContactCreator(creator.email)}
                className="flex items-center gap-1 text-slate-400 text-xs mt-1 hover:text-lime-400 transition-colors"
              >
                {creator.logo ? (
                  <img src={creator.logo} alt="" className="w-4 h-4 rounded-full" />
                ) : (
                  <Building2 className="w-3 h-3" />
                )}
                <span className="underline">{creator.name}</span>
              </button>

              <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                <Calendar className="w-3 h-3" />
                <span>Prenotato: {new Date(prenotazione.created_date).toLocaleDateString('it-IT')}</span>
              </div>

              {prenotazione.data_utilizzo && (
                <div className="flex items-center gap-1 text-green-400 text-xs mt-1">
                  <Check className="w-3 h-3" />
                  <span>Utilizzato: {new Date(prenotazione.data_utilizzo).toLocaleDateString('it-IT')}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />

      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('VantaggiIscritti')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <Gift className="w-6 h-6 text-amber-400" />
          <h1 className="text-white text-xl font-bold">Le Mie Prenotazioni</h1>
        </div>

        <Tabs defaultValue="attive" className="w-full">
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4">
            <TabsTrigger value="attive" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
              <Clock className="w-4 h-4 mr-2" />
              Attive ({prenotazioniAttive.length})
            </TabsTrigger>
            <TabsTrigger value="utilizzate" className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Check className="w-4 h-4 mr-2" />
              Utilizzate ({prenotazioniUtilizzate.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attive">
            {loadingPrenotazioni ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : prenotazioniAttive.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nessuna prenotazione attiva</p>
                  <Link to={createPageUrl('VantaggiIscritti')} className="text-lime-400 text-sm mt-2 inline-block hover:underline">
                    Scopri i vantaggi disponibili →
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {prenotazioniAttive.map(renderPrenotazione)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="utilizzate">
            {prenotazioniUtilizzate.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Check className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nessun vantaggio utilizzato</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {prenotazioniUtilizzate.map(renderPrenotazione)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav currentPage="MiePrenotazioniVantaggi" />
    </div>
  );
}