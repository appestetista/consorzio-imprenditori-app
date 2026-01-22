import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Banknote, Download, Upload, FileText, CheckCircle, Loader2, Info, AlertCircle, X, CreditCard, ShoppingBag, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const CONTRATTI = [
  {
    id: 'buoni_pasto',
    nome: 'Buoni Pasto',
    descrizione: 'Buoni pasto digitali con esenzione fiscale fino a 8€',
    icon: CreditCard,
    color: 'from-orange-500 to-amber-500',
    pdfUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/ea57c4ec0_buonipasto.pdf',
    vantaggi: [
      'Esenti da oneri fiscali e previdenziali',
      'Deducibili al 100% rispetto a IRAP e IRES',
      'IVA al 4% interamente detraibile',
      'Limite esenzione fiscale 8€ per buono'
    ]
  },
  {
    id: 'buoni_spesa',
    nome: 'Buoni Spesa',
    descrizione: 'Buoni spesa per supermercati e negozi convenzionati',
    icon: ShoppingBag,
    color: 'from-green-500 to-emerald-500',
    pdfUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/b5d924b9f_buonispesa.pdf',
    vantaggi: [
      'Commissione 5% sul valore',
      'Attivazione in 24 ore',
      'Scadenza annuale',
      'Gestione digitale tramite piattaforma Toduba'
    ]
  },
  {
    id: 'buoni_omaggio',
    nome: 'Buoni Omaggio',
    descrizione: 'Buoni regalo per premi e omaggi ai collaboratori',
    icon: Gift,
    color: 'from-purple-500 to-violet-500',
    pdfUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/fc5af5d1b_buoniomaggio.pdf',
    vantaggi: [
      'Commissione 5% sul valore',
      'Attivazione in 24 ore',
      'Scadenza annuale',
      'Ideale per premi e incentivi'
    ]
  }
];

export default function WelfareOrdina() {
  const [user, setUser] = useState(null);
  const [uploadedContracts, setUploadedContracts] = useState({});
  const [uploading, setUploading] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [showExcelExample, setShowExcelExample] = useState(false);
  const queryClient = useQueryClient();

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

  // Carica richieste esistenti
  const { data: existingRequests = [] } = useQuery({
    queryKey: ['welfare-requests', user?.email],
    queryFn: () => base44.entities.RichiestaRisparmio.filter({ 
      user_email: user?.email,
      categoria: 'Welfare Aziendale'
    }),
    enabled: !!user?.email,
  });

  const hasPendingRequest = existingRequests.some(r => r.status === 'pending' || r.status === 'in_review');

  const handleDownload = (pdfUrl, nome) => {
    window.open(pdfUrl, '_blank');
  };

  const handleUpload = async (contractId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [contractId]: true }));
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedContracts(prev => ({
        ...prev,
        [contractId]: { url: file_url, name: file.name }
      }));
    } catch (err) {
      console.error('Errore upload:', err);
    } finally {
      setUploading(prev => ({ ...prev, [contractId]: false }));
      e.target.value = '';
    }
  };

  const removeUpload = (contractId) => {
    setUploadedContracts(prev => {
      const newState = { ...prev };
      delete newState[contractId];
      return newState;
    });
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingExcel(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setExcelFile({ url: file_url, name: file.name });
    } catch (err) {
      console.error('Errore upload Excel:', err);
    } finally {
      setUploadingExcel(false);
      e.target.value = '';
    }
  };

  // Verifica se serve il file Excel (buoni spesa o buoni omaggio)
  const needsExcelFile = uploadedContracts['buoni_spesa'] || uploadedContracts['buoni_omaggio'];

  const submitMutation = useMutation({
    mutationFn: async () => {
      const uploadedKeys = Object.keys(uploadedContracts);
      const contrattiNomi = uploadedKeys.map(k => CONTRATTI.find(c => c.id === k)?.nome).join(', ');
      
      // Prepara documenti allegati
      const documentiUrls = Object.values(uploadedContracts).map(c => c.url);
      if (excelFile) {
        documentiUrls.push(excelFile.url);
      }
      
      // Crea richiesta welfare
      await base44.entities.RichiestaRisparmio.create({
        user_email: user.email,
        user_name: user.company_name || user.full_name,
        user_phone: user.telefono_referente || '',
        categoria: 'Welfare Aziendale',
        note: `Contratti caricati: ${contrattiNomi}${excelFile ? ' | File Excel dipendenti: ' + excelFile.name : ''}`,
        foto_bolletta_url: documentiUrls.join(', '),
        status: 'pending'
      });

      // Notifica admin
      const adminUsers = await base44.entities.User.filter({ role: 'admin' });
      
      await Promise.all(adminUsers.map(admin =>
        base44.entities.Notification.create({
          user_email: admin.email,
          type: 'consultation',
          title: 'Nuova richiesta Welfare Aziendale',
          content: `${user.company_name || user.full_name} ha caricato contratti welfare: ${contrattiNomi}`
        })
      ));

      // Invia email
      await base44.integrations.Core.SendEmail({
        to: 'consorzioimprenditori@gmail.com',
        subject: '📋 Nuova Richiesta Welfare Aziendale',
        body: `
          <h2>Nuova Richiesta Welfare</h2>
          <p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Telefono:</strong> ${user.telefono_referente || 'Non specificato'}</p>
          <p><strong>Contratti caricati:</strong> ${contrattiNomi}</p>
          <br>
          <p>Accedi al pannello per visualizzare i documenti e procedere.</p>
        `
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['welfare-requests'] });
    }
  });

  const uploadedCount = Object.keys(uploadedContracts).length;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('WelfareAziendale')} className="text-pink-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Scegli e Ordina</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Banknote className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Scegli e Ordina</h2>
                <p className="text-white/80 text-sm">Scarica, compila e carica i contratti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {submitted || hasPendingRequest ? (
          <Card className="bg-green-500/20 border-green-500/50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-green-400 font-bold text-xl mb-2">Richiesta Inviata!</h3>
              <p className="text-green-200 text-sm mb-4">
                Abbiamo ricevuto i tuoi contratti. Ti contatteremo entro 48 ore per procedere con l'attivazione.
              </p>
              <Alert className="bg-blue-500/20 border-blue-500/30 text-left">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200 text-sm">
                  <strong>Prossimo passo:</strong> Ti invieremo un file Excel da compilare con la lista dei dipendenti beneficiari dei buoni.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Istruzioni */}
            <Alert className="mb-6 bg-blue-500/20 border-blue-500/30">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200 text-sm">
                <strong>Come procedere:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Scarica i contratti che ti interessano (anche uno solo)</li>
                  <li>Stampa, compila e firma i contratti</li>
                  <li>Carica i contratti firmati (foto o scansione)</li>
                  <li>Invia la richiesta</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Lista Contratti */}
            <div className="space-y-4 mb-6">
              {CONTRATTI.map((contratto) => {
                const Icon = contratto.icon;
                const isUploaded = uploadedContracts[contratto.id];
                const isUploading = uploading[contratto.id];

                return (
                  <Card key={contratto.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${contratto.color}`} />
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${contratto.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold">{contratto.nome}</h3>
                          <p className="text-slate-400 text-sm">{contratto.descrizione}</p>
                        </div>
                      </div>

                      {/* Vantaggi */}
                      <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                        <p className="text-slate-400 text-xs mb-2 font-medium">Vantaggi:</p>
                        <ul className="space-y-1">
                          {contratto.vantaggi.map((v, i) => (
                            <li key={i} className="text-slate-300 text-xs flex items-start gap-2">
                              <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                              {v}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Azioni */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDownload(contratto.pdfUrl, contratto.nome)}
                          variant="outline"
                          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Scarica PDF
                        </Button>

                        {isUploaded ? (
                          <div className="flex-1 bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                              <span className="text-green-400 text-sm truncate">{isUploaded.name}</span>
                            </div>
                            <button onClick={() => removeUpload(contratto.id)} className="text-red-400 hover:text-red-300 ml-2">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex-1 cursor-pointer">
                            <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                              isUploading 
                                ? 'bg-slate-700 text-slate-400' 
                                : 'bg-pink-500 hover:bg-pink-600 text-white'
                            }`}>
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Caricamento...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  Carica Firmato
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleUpload(contratto.id, e)}
                              className="hidden"
                              disabled={isUploading}
                            />
                          </label>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Sezione Upload Excel - solo per buoni spesa e omaggio */}
            {needsExcelFile && (
              <Card className="bg-slate-800 border-slate-700 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold">File Excel Dipendenti</h3>
                      <p className="text-slate-400 text-sm">Compila e carica la tabella con i dati dei beneficiari</p>
                    </div>
                  </div>

                  {/* Esempio immagine */}
                  <div className="mb-4">
                    <button 
                      onClick={() => setShowExcelExample(!showExcelExample)}
                      className="text-emerald-400 text-sm flex items-center gap-1 hover:underline mb-2"
                    >
                      <Info className="w-4 h-4" />
                      {showExcelExample ? 'Nascondi esempio' : 'Vedi esempio formato tabella'}
                    </button>
                    
                    {showExcelExample && (
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-slate-300 text-xs mb-2">La tabella Excel deve contenere le seguenti colonne:</p>
                        <img 
                          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/5d6491c18_esempiotabellaexcel.png"
                          alt="Esempio formato Excel"
                          className="w-full rounded-lg border border-slate-600"
                        />
                        <div className="mt-3 bg-slate-800 rounded-lg p-3">
                          <p className="text-slate-400 text-xs font-medium mb-2">Colonne richieste:</p>
                          <ul className="text-slate-300 text-xs space-y-1">
                            <li>• <strong>Nome</strong> - Nome del dipendente</li>
                            <li>• <strong>Cognome</strong> - Cognome del dipendente</li>
                            <li>• <strong>Email</strong> - Email del dipendente</li>
                            <li>• <strong>Importo (€)</strong> - Valore del buono da assegnare</li>
                            <li>• <strong>Codice Fiscale</strong> - Codice fiscale del dipendente</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upload Excel */}
                  {excelFile ? (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-3 py-2 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-green-400 text-xs truncate">{excelFile.name}</span>
                      </div>
                      <button 
                        onClick={() => setExcelFile(null)} 
                        className="text-red-400 hover:text-red-300 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed transition-colors ${
                        uploadingExcel 
                          ? 'border-slate-600 bg-slate-700/50 text-slate-400' 
                          : 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}>
                        {uploadingExcel ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Caricamento...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            <span>Carica File Excel (.xlsx, .xls)</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelUpload}
                        className="hidden"
                        disabled={uploadingExcel}
                      />
                    </label>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Riepilogo e Invio */}
            {uploadedCount > 0 && (
              <Card className="bg-slate-800 border-slate-700 mb-4">
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-3">Riepilogo Contratti Caricati</h3>
                  <div className="space-y-2 mb-4">
                    {Object.keys(uploadedContracts).map(key => {
                      const contratto = CONTRATTI.find(c => c.id === key);
                      return (
                        <div key={key} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                          <FileText className="w-4 h-4 text-pink-400" />
                          <span className="text-white text-sm">{contratto?.nome}</span>
                          <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    {uploadedCount} contratt{uploadedCount === 1 ? 'o' : 'i'} pront{uploadedCount === 1 ? 'o' : 'i'} per l'invio
                  </p>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={uploadedCount === 0 || submitMutation.isPending}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold h-12 disabled:opacity-50"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Invia Richiesta ({uploadedCount} contratt{uploadedCount === 1 ? 'o' : 'i'})
                </>
              )}
            </Button>
          </>
        )}
      </main>

      <BottomNav currentPage="WelfareAziendale" unreadMessages={messages.length} />
    </div>
  );
}