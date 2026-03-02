import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gift, Clock, Check, Calendar, Building2, Lock, Send, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { toast } from 'sonner';

const MAX_ATTIVE_SENZA_UTILIZZO = 5;
const CONSORZIO_EMAIL = 'imprenditori@gmail.com';

const TAB_DISCLAIMERS = {
  ricevute: "Qui trovi le prenotazioni che le altre aziende hanno fatto sulle offerte che tu hai pubblicato. Se non hai ancora pubblicato nessuna offerta, crea il tuo primo vantaggio per iniziare a ricevere prenotazioni.",
  attive: "Qui trovi le prenotazioni che tu hai fatto sui vantaggi offerti dalle altre attività. Ricordati di andare in negozio e far scansionare il tuo QR Code per utilizzarle!",
  utilizzate: "Storico dei vantaggi che hai effettivamente utilizzato: quelli dove c'è stato il match del QR Code in negozio."
};

export default function MiePrenotazioniVantaggi() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ricevute');
  const [unlockMessage, setUnlockMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const { impersonation } = useImpersonation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      if (impersonation.active && impersonation.targetEmail) {
        const users = await base44.entities.User.filter({ email: impersonation.targetEmail });
        setUser(users[0] || currentUser);
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    };
    loadUser();
  }, [impersonation]);

  // Le MIE prenotazioni (quelle che IO ho fatto su vantaggi altrui)
  const { data: miePrenotazioni = [], isLoading: loadingMie } = useQuery({
    queryKey: ['mie-prenotazioni', user?.email],
    queryFn: () => base44.entities.PrenotazioneVantaggio.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  // I vantaggi creati da ME (per trovare le prenotazioni ricevute)
  const { data: mieiVantaggi = [] } = useQuery({
    queryKey: ['miei-vantaggi-creati', user?.email],
    queryFn: () => base44.entities.Vantaggio.filter({ creator_email: user?.email }),
    enabled: !!user?.email,
  });

  // Tutte le prenotazioni (per trovare quelle fatte da ALTRI sui MIEI vantaggi)
  const { data: tuttePrenotazioni = [] } = useQuery({
    queryKey: ['tutte-prenotazioni-globali'],
    queryFn: () => base44.entities.PrenotazioneVantaggio.list(),
    enabled: !!user?.email && mieiVantaggi.length > 0,
  });

  // Tutti i vantaggi (per dettagli)
  const { data: vantaggi = [] } = useQuery({
    queryKey: ['tutti-vantaggi'],
    queryFn: () => base44.entities.Vantaggio.list(),
  });

  // Consulenti e utenti per info
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

  // === LOGICA FILTRI ===

  // RICEVUTE: prenotazioni fatte da ALTRI sui MIEI vantaggi
  const mieiVantaggiIds = mieiVantaggi.map(v => v.id);
  const prenotazioniRicevute = tuttePrenotazioni.filter(p =>
    mieiVantaggiIds.includes(p.vantaggio_id) && p.user_email !== user?.email
  );

  // ATTIVE: prenotazioni fatte da ME, status attiva (non ancora usato QR)
  const prenotazioniAttive = miePrenotazioni.filter(p => p.status === 'attiva');

  // UTILIZZATE: prenotazioni fatte da ME, con match QR (status utilizzata)
  const prenotazioniUtilizzate = miePrenotazioni.filter(p => p.status === 'utilizzata');

  // BLOCCO: se >= 5 attive senza utilizzo
  const isBloccato = prenotazioniAttive.length >= MAX_ATTIVE_SENZA_UTILIZZO;

  const getVantaggioDetails = (vantaggioId) => vantaggi.find(v => v.id === vantaggioId);

  const getCreatorInfo = (vantaggio) => {
    if (!vantaggio) return { name: '-', logo: null, email: null };
    if (vantaggio.creator_type === 'consulente') {
      const consultant = consultants.find(c => c.email === vantaggio.creator_email);
      return { name: consultant?.name || 'Consulente', logo: consultant?.logo_url, email: vantaggio.creator_email };
    }
    const azienda = allUsers.find(u => u.email === vantaggio.creator_email);
    return { name: azienda?.company_name || 'Azienda', logo: azienda?.logo_url, email: vantaggio.creator_email };
  };

  const getUserInfo = (email) => {
    const u = allUsers.find(x => x.email === email);
    return u?.company_name || u?.full_name || email;
  };

  const handleSendUnlockRequest = async () => {
    if (!unlockMessage.trim()) {
      toast.error('Scrivi un messaggio per spiegare la situazione');
      return;
    }
    setSendingMessage(true);
    await base44.integrations.Core.SendEmail({
      to: CONSORZIO_EMAIL,
      subject: `Richiesta sblocco vantaggi - ${user?.full_name || user?.email}`,
      body: `<div style="font-family: Arial, sans-serif;">
        <h2>Richiesta sblocco prenotazioni vantaggi</h2>
        <p><strong>Utente:</strong> ${user?.full_name || '-'}</p>
        <p><strong>Email:</strong> ${user?.email}</p>
        <p><strong>Prenotazioni attive non utilizzate:</strong> ${prenotazioniAttive.length}</p>
        <hr/>
        <p><strong>Messaggio dell'utente:</strong></p>
        <p>${unlockMessage.replace(/\n/g, '<br/>')}</p>
      </div>`
    });
    setSendingMessage(false);
    setUnlockMessage('');
    toast.success('Richiesta inviata al consorzio!');
  };

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

  const renderPrenotazione = (prenotazione, isRicevuta = false) => {
    const vantaggio = getVantaggioDetails(prenotazione.vantaggio_id);
    const creator = getCreatorInfo(vantaggio);

    return (
      <Card key={prenotazione.id} className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {vantaggio?.foto_url ? (
              <img src={vantaggio.foto_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
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

              {isRicevuta ? (
                <div className="flex items-center gap-1 text-amber-400 text-xs mt-1">
                  <Building2 className="w-3 h-3" />
                  <span>Prenotato da: <strong>{getUserInfo(prenotazione.user_email)}</strong></span>
                </div>
              ) : (
                <button
                  onClick={() => creator.email && navigate(createPageUrl('Messaggi') + `?contact=${creator.email}`)}
                  className="flex items-center gap-1 text-slate-400 text-xs mt-1 hover:text-lime-400 transition-colors"
                >
                  {creator.logo ? (
                    <img src={creator.logo} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <Building2 className="w-3 h-3" />
                  )}
                  <span className="underline">{creator.name}</span>
                </button>
              )}

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
    <div className="min-h-screen bg-slate-900 pb-64">
      <Header user={user} />

      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('VantaggiIscritti')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <Gift className="w-6 h-6 text-amber-400" />
          <h1 className="text-white text-xl font-bold">Le Mie Prenotazioni</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-3">
            <TabsTrigger value="ricevute" className="flex-1 data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900 text-xs">
              Ricevute ({prenotazioniRicevute.length})
            </TabsTrigger>
            <TabsTrigger value="attive" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 text-xs">
              Attive ({prenotazioniAttive.length})
            </TabsTrigger>
            <TabsTrigger value="utilizzate" className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white text-xs">
              Utilizzate ({prenotazioniUtilizzate.length})
            </TabsTrigger>
          </TabsList>

          {/* Disclaimer dinamico */}
          <div className={`rounded-xl p-3 mb-4 flex items-start gap-2 border ${
            activeTab === 'ricevute' ? 'bg-amber-400/10 border-amber-400/30' :
            activeTab === 'attive' ? 'bg-lime-400/10 border-lime-400/30' :
            'bg-green-500/10 border-green-500/30'
          }`}>
            <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              activeTab === 'ricevute' ? 'text-amber-400' :
              activeTab === 'attive' ? 'text-lime-400' :
              'text-green-400'
            }`} />
            <p className={`text-xs leading-relaxed ${
              activeTab === 'ricevute' ? 'text-amber-300' :
              activeTab === 'attive' ? 'text-lime-300' :
              'text-green-300'
            }`}>{TAB_DISCLAIMERS[activeTab]}</p>
          </div>

          {/* BLOCCO prenotazioni */}
          {isBloccato && activeTab === 'attive' && (
            <Card className="bg-red-900/30 border-red-500/50 mb-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-bold text-sm">Prenotazioni bloccate</p>
                    <p className="text-red-400/80 text-xs mt-1">
                      Hai {prenotazioniAttive.length} prenotazioni attive senza scansione QR Code. 
                      Non risulta che tu abbia effettivamente utilizzato questi vantaggi in negozio. 
                      Le nuove prenotazioni sono temporaneamente bloccate.
                    </p>
                  </div>
                </div>

                <div className="border-t border-red-500/30 pt-3">
                  <p className="text-slate-300 text-xs mb-2">
                    Se ritieni sia un errore, scrivi al consorzio spiegando la situazione:
                  </p>
                  <Textarea
                    value={unlockMessage}
                    onChange={(e) => setUnlockMessage(e.target.value)}
                    placeholder="Spiega perché non hai potuto utilizzare il QR Code..."
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 text-sm min-h-[80px]"
                  />
                  <Button
                    onClick={handleSendUnlockRequest}
                    disabled={sendingMessage || !unlockMessage.trim()}
                    className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white"
                  >
                    {sendingMessage ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Invia richiesta al consorzio
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB RICEVUTE */}
          <TabsContent value="ricevute">
            {loadingMie ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : prenotazioniRicevute.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Gift className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Nessuna prenotazione ricevuta</p>
                  <p className="text-slate-500 text-xs mt-2">Pubblica la tua prima offerta per iniziare a ricevere prenotazioni dalle altre aziende</p>
                  <Link to={createPageUrl('VantaggiIscritti')}>
                    <Button className="mt-4 bg-amber-400 hover:bg-amber-500 text-black text-sm">
                      Crea la tua prima offerta
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {prenotazioniRicevute.map(p => renderPrenotazione(p, true))}
              </div>
            )}
          </TabsContent>

          {/* TAB ATTIVE */}
          <TabsContent value="attive">
            {loadingMie ? (
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
                {prenotazioniAttive.map(p => renderPrenotazione(p, false))}
              </div>
            )}
          </TabsContent>

          {/* TAB UTILIZZATE */}
          <TabsContent value="utilizzate">
            {prenotazioniUtilizzate.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                  <Check className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nessun vantaggio utilizzato</p>
                  <p className="text-slate-500 text-xs mt-2">Qui vedrai lo storico dei vantaggi che hai usato con il QR Code</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {prenotazioniUtilizzate.map(p => renderPrenotazione(p, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav currentPage="MiePrenotazioniVantaggi" />
    </div>
  );
}