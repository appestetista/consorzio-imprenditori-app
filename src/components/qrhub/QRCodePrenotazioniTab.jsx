import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Gift, Clock, Check, Calendar, Building2, Lock, Send, Info, User, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const MAX_ATTIVE = 5;
const CONSORZIO_EMAIL = 'imprenditori@gmail.com';
const TAB_DISCLAIMERS = {
  ricevute: "Qui trovi le prenotazioni che le altre aziende hanno fatto sulle offerte che tu hai pubblicato.",
  attive: "Qui trovi le prenotazioni che tu hai fatto sui vantaggi offerti dalle altre attività. Ricordati di far scansionare il tuo QR Code!",
  utilizzate: "Storico dei vantaggi che hai effettivamente utilizzato: quelli dove c'è stato il match del QR Code."
};

export default function QRCodePrenotazioniTab({ user }) {
  const [subTab, setSubTab] = useState('ricevute');
  const [unlockMessage, setUnlockMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const navigate = useNavigate();

  const { data: miePrenotazioni = [], isLoading } = useQuery({
    queryKey: ['mie-prenotazioni', user?.email],
    queryFn: () => base44.entities.PrenotazioneVantaggio.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: mieiVantaggi = [] } = useQuery({
    queryKey: ['miei-vantaggi-creati', user?.email],
    queryFn: () => base44.entities.Vantaggio.filter({ creator_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: tuttePrenotazioni = [] } = useQuery({
    queryKey: ['tutte-prenotazioni-globali'],
    queryFn: () => base44.entities.PrenotazioneVantaggio.list(),
    enabled: !!user?.email && mieiVantaggi.length > 0,
  });

  const { data: vantaggi = [] } = useQuery({ queryKey: ['tutti-vantaggi'], queryFn: () => base44.entities.Vantaggio.list() });
  const { data: consultants = [] } = useQuery({ queryKey: ['consultants-vantaggi'], queryFn: () => base44.entities.Consultant.list() });
  const { data: allUsers = [] } = useQuery({ queryKey: ['users-vantaggi'], queryFn: async () => { const r = await base44.functions.invoke('listMembers'); return r.data?.users || []; } });

  const mieiVantaggiIds = mieiVantaggi.map(v => v.id);
  const prenotazioniRicevute = tuttePrenotazioni.filter(p => mieiVantaggiIds.includes(p.vantaggio_id) && p.user_email !== user?.email);
  const prenotazioniAttive = miePrenotazioni.filter(p => p.status === 'attiva');
  const prenotazioniUtilizzate = miePrenotazioni.filter(p => p.status === 'utilizzata');
  const isBloccato = prenotazioniAttive.length >= MAX_ATTIVE;

  const getVantaggioDetails = (id) => vantaggi.find(v => v.id === id);
  const getCreatorInfo = (v) => {
    if (!v) return { name: '-', logo: null, email: null };
    if (v.creator_type === 'consulente') { const c = consultants.find(x => x.email === v.creator_email); return { name: c?.name || 'Consulente', logo: c?.logo_url, email: v.creator_email }; }
    const a = allUsers.find(x => x.email === v.creator_email); return { name: a?.company_name || 'Azienda', logo: a?.logo_url, email: v.creator_email };
  };
  const getUserInfo = (email) => { const u = allUsers.find(x => x.email === email); return u?.company_name || u?.full_name || email; };

  const handleSendUnlockRequest = async () => {
    if (!unlockMessage.trim()) { toast.error('Scrivi un messaggio'); return; }
    setSendingMessage(true);
    await base44.integrations.Core.SendEmail({ to: CONSORZIO_EMAIL, subject: `Richiesta sblocco vantaggi - ${user?.full_name || user?.email}`, body: `<h2>Richiesta sblocco</h2><p>Utente: ${user?.full_name} (${user?.email})</p><p>Attive: ${prenotazioniAttive.length}</p><p>${unlockMessage.replace(/\n/g, '<br/>')}</p>` });
    setSendingMessage(false); setUnlockMessage(''); toast.success('Richiesta inviata!');
  };

  const statusColors = { attiva: 'bg-lime-500', utilizzata: 'bg-green-600', annullata: 'bg-red-500', scaduta: 'bg-slate-500' };
  const statusLabels = { attiva: 'Attiva', utilizzata: 'Utilizzata', annullata: 'Annullata', scaduta: 'Scaduta' };

  const renderPrenotazione = (p, isRicevuta = false) => {
    const v = getVantaggioDetails(p.vantaggio_id);
    const creator = getCreatorInfo(v);
    return (
      <Card key={p.id} className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {v?.foto_url ? <img src={v.foto_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" /> : <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0"><Gift className="w-6 h-6 text-slate-500" /></div>}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2"><h3 className="text-white font-bold text-sm">{v?.titolo || 'Vantaggio non disponibile'}</h3><Badge className={`${statusColors[p.status]} text-white text-[10px]`}>{statusLabels[p.status]}</Badge></div>
              {v?.valore && <p className="text-[#d4af37] font-bold">{v.valore}</p>}
              {isRicevuta ? (
                <div className="flex items-center gap-1 text-amber-400 text-xs mt-1"><Building2 className="w-3 h-3" /><span>Da: <strong>{getUserInfo(p.user_email)}</strong></span></div>
              ) : (
                <button onClick={() => creator.email && navigate(createPageUrl('Messaggi') + `?contact=${creator.email}`)} className="flex items-center gap-1 text-slate-400 text-xs mt-1 hover:text-[#d4af37] transition-colors">
                  {creator.logo ? <img src={creator.logo} alt="" className="w-4 h-4 rounded-full" /> : <Building2 className="w-3 h-3" />}<span className="underline">{creator.name}</span>
                </button>
              )}
              <div className="flex items-center gap-1 text-slate-500 text-xs mt-1"><Calendar className="w-3 h-3" /><span>Prenotato: {new Date(p.created_date).toLocaleDateString('it-IT')}</span></div>
              {p.data_utilizzo && <div className="flex items-center gap-1 text-green-400 text-xs mt-1"><Check className="w-3 h-3" /><span>Utilizzato: {new Date(p.data_utilizzo).toLocaleDateString('it-IT')}</span></div>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
      <TabsList className="w-full bg-slate-800 border border-slate-700 mb-3">
        <TabsTrigger value="ricevute" className="flex-1 data-[state=active]:bg-amber-400 data-[state=active]:text-slate-900 text-xs">Ricevute ({prenotazioniRicevute.length})</TabsTrigger>
        <TabsTrigger value="attive" className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 text-xs">Attive ({prenotazioniAttive.length})</TabsTrigger>
        <TabsTrigger value="utilizzate" className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white text-xs">Utilizzate ({prenotazioniUtilizzate.length})</TabsTrigger>
      </TabsList>

      <div className={`rounded-xl p-3 mb-4 flex items-start gap-2 border ${subTab === 'ricevute' ? 'bg-amber-400/10 border-amber-400/30' : subTab === 'attive' ? 'bg-lime-400/10 border-lime-400/30' : 'bg-green-500/10 border-green-500/30'}`}>
        <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${subTab === 'ricevute' ? 'text-amber-400' : subTab === 'attive' ? 'text-lime-400' : 'text-green-400'}`} />
        <p className={`text-xs leading-relaxed ${subTab === 'ricevute' ? 'text-amber-300' : subTab === 'attive' ? 'text-lime-300' : 'text-green-300'}`}>{TAB_DISCLAIMERS[subTab]}</p>
      </div>

      {isBloccato && subTab === 'attive' && (
        <Card className="bg-red-900/30 border-red-500/50 mb-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2"><Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" /><div><p className="text-red-300 font-bold text-sm">Prenotazioni bloccate</p><p className="text-red-400/80 text-xs mt-1">Hai {prenotazioniAttive.length} prenotazioni attive senza scansione QR Code.</p></div></div>
            <div className="border-t border-red-500/30 pt-3">
              <Textarea value={unlockMessage} onChange={(e) => setUnlockMessage(e.target.value)} placeholder="Spiega perché non hai potuto utilizzare il QR Code..." className="bg-slate-900 border-slate-700 text-white text-sm min-h-[80px]" />
              <Button onClick={handleSendUnlockRequest} disabled={sendingMessage || !unlockMessage.trim()} className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white">
                {sendingMessage ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <><Send className="w-4 h-4 mr-2" />Invia richiesta al consorzio</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <TabsContent value="ricevute">
        {isLoading ? <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto"></div></div> : prenotazioniRicevute.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700"><CardContent className="p-8 text-center"><Gift className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400 text-sm">Nessuna prenotazione ricevuta</p></CardContent></Card>
        ) : <div className="space-y-3">{prenotazioniRicevute.map(p => renderPrenotazione(p, true))}</div>}
      </TabsContent>

      <TabsContent value="attive">
        {prenotazioniAttive.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700"><CardContent className="p-8 text-center"><Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Nessuna prenotazione attiva</p></CardContent></Card>
        ) : <div className="space-y-3">{prenotazioniAttive.map(p => renderPrenotazione(p, false))}</div>}
      </TabsContent>

      <TabsContent value="utilizzate">
        {prenotazioniUtilizzate.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700"><CardContent className="p-8 text-center"><Check className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Nessun vantaggio utilizzato</p></CardContent></Card>
        ) : <div className="space-y-3">{prenotazioniUtilizzate.map(p => renderPrenotazione(p, false))}</div>}
      </TabsContent>
    </Tabs>
  );
}