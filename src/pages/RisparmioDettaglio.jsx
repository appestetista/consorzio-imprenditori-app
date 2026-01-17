import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Upload, FileText, CheckCircle, Info, TrendingDown, Users, Clock, Send, Loader2, Shield, Lightbulb, Flame, Leaf, Sun, Phone, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const CATEGORIE_INFO = {
  'Assicurazioni': {
    icon: Shield,
    color: 'from-blue-500 to-blue-600',
    vantaggi: [
      'Polizze collettive a tariffe agevolate',
      'Coperture personalizzate per PMI',
      'Consulenza gratuita con broker dedicato',
      'Gestione sinistri semplificata'
    ],
    descrizione: 'Carica la tua polizza attuale e ricevi un\'analisi gratuita con proposte di risparmio.',
    tipoDocumento: 'polizza assicurativa'
  },
  'Luce': {
    icon: Lightbulb,
    color: 'from-yellow-500 to-orange-500',
    vantaggi: [
      'Tariffe energia elettrica scontate fino al 20%',
      'Energia 100% da fonti rinnovabili',
      'Nessun costo di attivazione',
      'Fatturazione trasparente'
    ],
    descrizione: 'Inviaci la tua bolletta della luce e ti proporremo la tariffa più conveniente.',
    tipoDocumento: 'bolletta della luce'
  },
  'Gas': {
    icon: Flame,
    color: 'from-orange-500 to-red-500',
    vantaggi: [
      'Prezzi gas metano competitivi',
      'Contratti flessibili',
      'Assistenza clienti dedicata',
      'Bonus per consumi elevati'
    ],
    descrizione: 'Carica la tua bolletta del gas per ricevere un preventivo personalizzato.',
    tipoDocumento: 'bolletta del gas'
  },
  'Efficientamento Energetico': {
    icon: Leaf,
    color: 'from-green-500 to-emerald-600',
    vantaggi: [
      'Audit energetico gratuito',
      'Accesso a incentivi e detrazioni fiscali',
      'Riduzione consumi fino al 40%',
      'Certificazione energetica'
    ],
    descrizione: 'Invia le tue bollette per una valutazione del potenziale di risparmio.',
    tipoDocumento: 'bollette recenti'
  },
  'Fotovoltaico': {
    icon: Sun,
    color: 'from-amber-400 to-yellow-500',
    vantaggi: [
      'Preventivi impianti fotovoltaici',
      'Accesso a incentivi statali',
      'Finanziamenti agevolati',
      'Manutenzione inclusa'
    ],
    descrizione: 'Carica le tue bollette per calcolare il dimensionamento ideale dell\'impianto.',
    tipoDocumento: 'bollette energia'
  },
  'Spesa Telefonica': {
    icon: Phone,
    color: 'from-purple-500 to-violet-600',
    vantaggi: [
      'Piani business a tariffe ridotte',
      'Minuti e GB illimitati',
      'Dispositivi a rate agevolate',
      'Assistenza prioritaria'
    ],
    descrizione: 'Inviaci la tua bolletta telefonica per un\'offerta su misura.',
    tipoDocumento: 'bolletta telefonica'
  },
  'Internet': {
    icon: Wifi,
    color: 'from-cyan-500 to-blue-500',
    vantaggi: [
      'Fibra ultraveloce fino a 10 Gbps',
      'IP statico incluso',
      'SLA garantito per aziende',
      'Backup 4G/5G incluso'
    ],
    descrizione: 'Carica la tua bolletta internet e scopri le offerte dedicate.',
    tipoDocumento: 'bolletta internet'
  }
};

export default function RisparmioDettaglio() {
  const [user, setUser] = useState(null);
  const [categoria, setCategoria] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCategoria(params.get('categoria') || '');
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  // Richieste precedenti dell'utente per questa categoria
  const { data: mieRichieste = [] } = useQuery({
    queryKey: ['mie-richieste-risparmio', user?.email, categoria],
    queryFn: () => base44.entities.RichiestaRisparmio.filter({ 
      user_email: user?.email, 
      categoria: categoria 
    }),
    enabled: !!user?.email && !!categoria,
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    
    // Crea preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      
      let fileUrl = null;
      if (uploadedFile) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: uploadedFile });
        fileUrl = uploadResult.file_url;
      }

      // Crea la richiesta
      await base44.entities.RichiestaRisparmio.create({
        user_email: user.email,
        user_name: user.company_name || user.full_name,
        user_phone: user.telefono_referente || '',
        categoria: categoria,
        foto_bolletta_url: fileUrl,
        note: note,
        status: 'pending'
      });

      // Notifica admin
      const adminUsers = await base44.entities.User.filter({ role: 'admin' });
      await Promise.all(adminUsers.map(admin =>
        base44.entities.Notification.create({
          user_email: admin.email,
          type: 'message',
          title: `Nuova richiesta ${categoria}`,
          content: `${user.company_name || user.full_name} ha inviato una richiesta per ${categoria}`,
          reference_id: categoria
        })
      ));

      // Invia email
      await base44.integrations.Core.SendEmail({
        to: 'consorzioimprenditori@gmail.com',
        subject: `🔔 Nuova Richiesta Risparmio - ${categoria}`,
        body: `
          <h2>Nuova Richiesta di Analisi ${categoria}</h2>
          <p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Telefono:</strong> ${user.telefono_referente || 'Non specificato'}</p>
          <p><strong>Categoria:</strong> ${categoria}</p>
          <p><strong>Note:</strong> ${note || 'Nessuna nota'}</p>
          ${fileUrl ? `<p><strong>Documento allegato:</strong> <a href="${fileUrl}">Visualizza</a></p>` : '<p><em>Nessun documento allegato</em></p>'}
        `
      });
    },
    onSuccess: () => {
      setSuccess(true);
      setUploadedFile(null);
      setPreviewUrl(null);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['mie-richieste-risparmio'] });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const info = CATEGORIE_INFO[categoria];
  const IconComponent = info?.icon || Lightbulb;

  if (!categoria || !info) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Categoria non trovata</p>
          <Link to={createPageUrl('RisparmioEnergetico')} className="text-lime-400 underline mt-2 block">
            Torna a Risparmio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('RisparmioEnergetico')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">{categoria}</h1>
        </div>

        {/* Hero Card */}
        <Card className={`bg-gradient-to-br ${info.color} border-0 mb-6`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <IconComponent className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">{categoria}</h2>
                <p className="text-white/80 text-sm">Servizio esclusivo Consorzio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {success && (
          <Alert className="mb-6 bg-green-500/20 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">
              Richiesta inviata con successo! Ti contatteremo al più presto.
            </AlertDescription>
          </Alert>
        )}

        {/* Vantaggi */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <h3 className="text-lime-400 font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              I tuoi vantaggi
            </h3>
            <ul className="space-y-2">
              {info.vantaggi.map((vantaggio, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-300 text-sm">
                  <CheckCircle className="w-4 h-4 text-lime-400 flex-shrink-0 mt-0.5" />
                  {vantaggio}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-lime-400" />
              Invia la tua {info.tipoDocumento}
            </h3>
            <p className="text-slate-400 text-sm mb-4">{info.descrizione}</p>

            {/* Preview */}
            {previewUrl && (
              <div className="mb-4 relative">
                <img 
                  src={previewUrl} 
                  alt="Preview documento" 
                  className="w-full rounded-lg max-h-48 object-cover"
                />
                <button 
                  onClick={() => { setUploadedFile(null); setPreviewUrl(null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input 
                type="file" 
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="border-lime-400 text-lime-400 hover:bg-lime-400/20 h-20 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Scatta foto</span>
              </Button>

              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="border-slate-500 text-slate-300 hover:bg-slate-700 h-20 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs">Carica file</span>
              </Button>
            </div>

            {/* Note */}
            <Textarea
              placeholder="Aggiungi note o richieste specifiche (opzionale)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white mb-4"
              rows={3}
            />

            {/* Submit */}
            <Button
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
              onClick={() => submitMutation.mutate()}
              disabled={isUploading || submitMutation.isPending}
            >
              {isUploading || submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Invia Richiesta
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Richieste precedenti con risultati */}
        {mieRichieste.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Le tue richieste
              </h3>
              <div className="space-y-3">
                {mieRichieste.map((richiesta) => (
                  <div key={richiesta.id} className="bg-slate-900 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-300 text-sm">
                        {new Date(richiesta.created_date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        richiesta.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        richiesta.status === 'in_review' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {richiesta.status === 'completed' ? 'Completata' :
                         richiesta.status === 'in_review' ? 'In revisione' : 'In attesa'}
                      </span>
                    </div>
                    
                    {/* Mostra risparmio se completato */}
                    {richiesta.status === 'completed' && richiesta.costo_precedente && richiesta.nuovo_costo && (
                      <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-3 mb-2">
                          <TrendingDown className="w-6 h-6 text-green-400" />
                          <div>
                            <p className="text-green-400 font-bold text-lg">
                              €{((richiesta.costo_precedente - richiesta.nuovo_costo) * 12).toFixed(0)}/anno
                            </p>
                            <p className="text-green-400/70 text-xs">Risparmio ottenuto</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-3 pt-2 border-t border-green-500/20">
                          <div>
                            <p className="text-slate-400 text-xs">Prima</p>
                            <p className="text-red-400 font-semibold">€{richiesta.costo_precedente}/mese</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Dopo</p>
                            <p className="text-green-400 font-semibold">€{richiesta.nuovo_costo}/mese</p>
                          </div>
                        </div>
                        {richiesta.note_admin && (
                          <p className="text-slate-300 text-sm mt-2 pt-2 border-t border-green-500/20">
                            {richiesta.note_admin}
                          </p>
                        )}
                        {/* Documenti allegati */}
                        {richiesta.documenti_allegati?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-green-500/20">
                            <p className="text-slate-400 text-xs mb-1">Documenti:</p>
                            <div className="flex flex-wrap gap-2">
                              {richiesta.documenti_allegati.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 bg-slate-800 text-lime-400 text-xs px-2 py-1 rounded hover:bg-slate-700"
                                >
                                  <FileText className="w-3 h-3" />
                                  Doc {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Alert className="mt-6 bg-blue-500/10 border-blue-500/30">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-slate-300 text-sm">
            <strong className="text-blue-400">Come funziona?</strong><br />
            Riceverai un'analisi gratuita entro 48 ore lavorative con una proposta personalizzata di risparmio.
          </AlertDescription>
        </Alert>
      </main>

      <BottomNav currentPage="RisparmioEnergetico" unreadMessages={messages.length} />
    </div>
  );
}