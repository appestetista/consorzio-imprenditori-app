import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileSearch, Upload, FileText, Loader2, CheckCircle, AlertTriangle, Info, Scale, Send, X, History, ChevronRight, Trash2, Paperclip, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function AnalisiContratti() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [contactForm, setContactForm] = useState({ subject: '', message: '', avvocatoId: '', attachments: [] });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
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

  const { data: historyAnalyses = [] } = useQuery({
    queryKey: ['contract-analyses', user?.email],
    queryFn: () => base44.entities.ContractAnalysis.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: avvocati = [] } = useQuery({
    queryKey: ['avvocati'],
    queryFn: () => base44.entities.Consultant.filter({ category: 'Avvocato' }),
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFiles(prev => [...prev, selectedFile]);
      setError(null);
      e.target.value = ''; // Reset input per permettere di caricare lo stesso file
    } else {
      setError('Per favore carica un file PDF');
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Upload di tutti i file
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      setUploading(false);
      setAnalyzing(true);

      // Analisi con LLM
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un esperto legale italiano. Analizza ${files.length > 1 ? 'questi contratti' : 'questo contratto'} e fornisci:
1. Tipo di contratto
2. Parti coinvolte
3. Oggetto del contratto
4. Durata e scadenze importanti
5. Clausole principali
6. Eventuali criticità o punti di attenzione
7. Consigli per il cliente

Sii dettagliato ma chiaro, usando un linguaggio comprensibile.`,
        file_urls: uploadedUrls,
        response_json_schema: {
          type: "object",
          properties: {
            tipo_contratto: { type: "string" },
            parti_coinvolte: { type: "array", items: { type: "string" } },
            oggetto: { type: "string" },
            durata: { type: "string" },
            scadenze: { type: "array", items: { type: "string" } },
            clausole_principali: { type: "array", items: { type: "string" } },
            criticita: { type: "array", items: { type: "string" } },
            consigli: { type: "array", items: { type: "string" } },
            riepilogo: { type: "string" }
          }
        }
      });

      setAnalysis(result);

      // Salva nello storico
      await base44.entities.ContractAnalysis.create({
        user_email: user.email,
        file_names: files.map(f => f.name),
        ...result
      });
      queryClient.invalidateQueries({ queryKey: ['contract-analyses', user?.email] });
    } catch (e) {
      console.error(e);
      setError('Errore durante l\'analisi del contratto. Riprova.');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const deleteHistoryItem = async (id) => {
    await base44.entities.ContractAnalysis.delete(id);
    queryClient.invalidateQueries({ queryKey: ['contract-analyses', user?.email] });
    if (selectedHistory?.id === id) {
      setSelectedHistory(null);
    }
  };

  const viewHistoryItem = (item) => {
    setSelectedHistory(item);
    setShowHistory(false);
  };

  const resetAnalysis = () => {
    setFiles([]);
    setAnalysis(null);
    setError(null);
    setContactForm({ subject: '', message: '', avvocatoId: '', attachments: [] });
    setContactSent(false);
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingAttachment(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setContactForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, { name: file.name, url: file_url }]
      }));
    } catch (err) {
      console.error('Errore upload:', err);
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setContactForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const sendContactMutation = useMutation({
    mutationFn: async () => {
      const avvocato = avvocati.find(a => a.id === contactForm.avvocatoId);
      
      if (!avvocato) {
        throw new Error('Seleziona un avvocato');
      }

      // Crea messaggio
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: avvocato.email,
        content: `**Richiesta verifica contratto**\n\nOggetto: ${contactForm.subject}\n\n${contactForm.message}\n\n---\nInviato da: ${user.company_name || user.full_name}\nEmail: ${user.email}`,
        source: 'consulenze',
        source_reference: 'Analisi Contratti AI',
        attachments: contactForm.attachments.map(a => ({ url: a.url, name: a.name, type: 'document' }))
      });

      // Crea notifica per l'avvocato
      await base44.entities.Notification.create({
        user_email: avvocato.email,
        type: 'consultation',
        title: 'Nuova richiesta verifica contratto',
        content: `${user.company_name || user.full_name} richiede verifica contratto: ${contactForm.subject}`
      });
    },
    onSuccess: () => {
      setContactSent(true);
      setContactForm({ subject: '', message: '', avvocatoId: '', attachments: [] });
    }
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Analisi Contratti</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <FileSearch className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Analisi AI</h2>
                <p className="text-white/80 text-sm">Carica un contratto PDF per analizzarlo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pulsante Storico */}
        {historyAnalyses.length > 0 && !analysis && !selectedHistory && (
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant="outline"
            className="w-full bg-sky-200 hover:bg-sky-300 text-black border-0 mb-4"
          >
            <History className="w-4 h-4 mr-2" />
            Storico Analisi ({historyAnalyses.length})
            <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </Button>
        )}

        {/* Lista Storico */}
        {showHistory && (
          <div className="space-y-2 mb-4">

            {historyAnalyses.map((item) => (
              <Card key={item.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0" onClick={() => viewHistoryItem(item)} style={{ cursor: 'pointer' }}>
                    <p className="text-white text-sm font-medium truncate">
                      {item.tipo_contratto || 'Contratto'}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {new Date(item.created_date).toLocaleDateString('it-IT')} - {item.file_names?.join(', ') || 'File'}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight 
                    className="w-4 h-4 text-slate-500 cursor-pointer" 
                    onClick={() => viewHistoryItem(item)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Vista dettaglio storico */}
        {selectedHistory ? (
          <>

            <div className="space-y-4">
              {/* Riepilogo */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-lime-400 font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Riepilogo
                  </h3>
                  <p className="text-slate-300 text-sm">{selectedHistory.riepilogo}</p>
                  <p className="text-slate-500 text-xs mt-2">
                    Analizzato il {new Date(selectedHistory.created_date).toLocaleDateString('it-IT')}
                  </p>
                </CardContent>
              </Card>

              {/* Tipo e Parti */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-3">Informazioni Generali</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 text-sm">Tipo:</span>
                      <p className="text-white">{selectedHistory.tipo_contratto}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Parti coinvolte:</span>
                      <ul className="text-white text-sm">
                        {selectedHistory.parti_coinvolte?.map((parte, i) => (
                          <li key={i}>• {parte}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Oggetto:</span>
                      <p className="text-white text-sm">{selectedHistory.oggetto}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Durata:</span>
                      <p className="text-white text-sm">{selectedHistory.durata}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scadenze */}
              {selectedHistory.scadenze?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-2">📅 Scadenze Importanti</h3>
                    <ul className="space-y-1">
                      {selectedHistory.scadenze.map((scadenza, i) => (
                        <li key={i} className="text-slate-300 text-sm">• {scadenza}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Clausole */}
              {selectedHistory.clausole_principali?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-2">📋 Clausole Principali</h3>
                    <ul className="space-y-1">
                      {selectedHistory.clausole_principali.map((clausola, i) => (
                        <li key={i} className="text-slate-300 text-sm">• {clausola}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Criticità */}
              {selectedHistory.criticita?.length > 0 && (
                <Card className="bg-orange-500/20 border-orange-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Punti di Attenzione
                    </h3>
                    <ul className="space-y-1">
                      {selectedHistory.criticita.map((critica, i) => (
                        <li key={i} className="text-orange-200 text-sm">• {critica}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Consigli */}
              {selectedHistory.consigli?.length > 0 && (
                <Card className="bg-green-500/20 border-green-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-green-400 font-semibold mb-2">💡 Consigli</h3>
                    <ul className="space-y-1">
                      {selectedHistory.consigli.map((consiglio, i) => (
                        <li key={i} className="text-green-200 text-sm">• {consiglio}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() => setSelectedHistory(null)}
                variant="outline"
                className="w-full border-slate-600 text-slate-400 hover:bg-slate-800"
              >
                Torna indietro
              </Button>
            </div>
          </>
        ) : !analysis ? (
          <>
            {/* Upload Area */}
            <Card className="bg-slate-800 border-slate-700 mb-4">
              <CardContent className="p-6">
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center hover:border-lime-400 transition-colors">
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-slate-500 mx-auto" />
                      <p className="text-slate-400">Clicca per caricare un PDF</p>
                      <p className="text-slate-500 text-sm">Contratti, accordi, documenti legali</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </CardContent>
            </Card>

            {/* File Thumbnails */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="bg-slate-800 border border-slate-700 rounded-lg p-2 flex items-center gap-2 max-w-[180px]"
                  >
                    <FileText className="w-8 h-8 text-lime-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs font-medium truncate">{file.name}</p>
                      <p className="text-slate-400 text-[10px]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={files.length === 0 || uploading || analyzing}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold h-12 animate-pulse"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  <FileSearch className="w-5 h-5 mr-2" />
                  Analizza Contratto
                </>
              )}
            </Button>

            {/* Form Contatto Avvocato - sempre visibile */}
            <Card className="bg-slate-800 border-slate-700 mt-4">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-lime-400" />
                  Contatta l'Avvocato del Consorzio
                </h3>
                
                {contactSent ? (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-medium">Richiesta inviata!</p>
                    <p className="text-green-200 text-sm mt-1">L'avvocato ti contatterà al più presto.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Select
                      value={contactForm.avvocatoId}
                      onValueChange={(value) => setContactForm({ ...contactForm, avvocatoId: value })}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Seleziona un avvocato" />
                      </SelectTrigger>
                      <SelectContent>
                        {avvocati.map((avv) => (
                          <SelectItem key={avv.id} value={avv.id}>
                            {avv.name} {avv.city ? `- ${avv.city}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Oggetto (es. Verifica contratto di fornitura)"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <Textarea
                      placeholder="Descrivi brevemente cosa vorresti far verificare..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
                    />
                    
                    {/* Allegati */}
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                            <Paperclip className="w-4 h-4" />
                            Allega documento
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={handleAttachmentUpload}
                            className="hidden"
                            disabled={uploadingAttachment}
                          />
                        </label>
                        <label className="cursor-pointer">
                          <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                            <Camera className="w-4 h-4" />
                            Scatta foto
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleAttachmentUpload}
                            className="hidden"
                            disabled={uploadingAttachment}
                          />
                        </label>
                      </div>
                      
                      {uploadingAttachment && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Caricamento in corso...
                        </div>
                      )}
                      
                      {contactForm.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {contactForm.attachments.map((att, idx) => (
                            <div key={idx} className="bg-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-lime-400" />
                              <span className="text-white truncate max-w-[120px]">{att.name}</span>
                              <button onClick={() => removeAttachment(idx)} className="text-red-400 hover:text-red-300">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => sendContactMutation.mutate()}
                      disabled={!contactForm.avvocatoId || !contactForm.subject || !contactForm.message || sendContactMutation.isPending || uploadingAttachment}
                      className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
                    >
                      {sendContactMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Invia Richiesta all'Avvocato
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Risultati Analisi */}
            <div className="space-y-4">
              {/* Riepilogo */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-lime-400 font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Riepilogo
                  </h3>
                  <p className="text-slate-300 text-sm">{analysis.riepilogo}</p>
                </CardContent>
              </Card>

              {/* Tipo e Parti */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-3">Informazioni Generali</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 text-sm">Tipo:</span>
                      <p className="text-white">{analysis.tipo_contratto}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Parti coinvolte:</span>
                      <ul className="text-white text-sm">
                        {analysis.parti_coinvolte?.map((parte, i) => (
                          <li key={i}>• {parte}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Oggetto:</span>
                      <p className="text-white text-sm">{analysis.oggetto}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Durata:</span>
                      <p className="text-white text-sm">{analysis.durata}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scadenze */}
              {analysis.scadenze?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-2">📅 Scadenze Importanti</h3>
                    <ul className="space-y-1">
                      {analysis.scadenze.map((scadenza, i) => (
                        <li key={i} className="text-slate-300 text-sm">• {scadenza}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Clausole */}
              {analysis.clausole_principali?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-2">📋 Clausole Principali</h3>
                    <ul className="space-y-1">
                      {analysis.clausole_principali.map((clausola, i) => (
                        <li key={i} className="text-slate-300 text-sm">• {clausola}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Criticità */}
              {analysis.criticita?.length > 0 && (
                <Card className="bg-orange-500/20 border-orange-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Punti di Attenzione
                    </h3>
                    <ul className="space-y-1">
                      {analysis.criticita.map((critica, i) => (
                        <li key={i} className="text-orange-200 text-sm">• {critica}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Consigli */}
              {analysis.consigli?.length > 0 && (
                <Card className="bg-green-500/20 border-green-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-green-400 font-semibold mb-2">💡 Consigli</h3>
                    <ul className="space-y-1">
                      {analysis.consigli.map((consiglio, i) => (
                        <li key={i} className="text-green-200 text-sm">• {consiglio}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Disclaimer AI */}
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-200 text-sm">
                      <strong>Attenzione:</strong> L'analisi AI potrebbe contenere errori. Ti consigliamo di verificare le informazioni su più fonti. 
                      Se hai bisogno di una consulenza approfondita, puoi far verificare il contratto da un legale del Consorzio Imprenditori.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Form Contatto Avvocato */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-lime-400" />
                    Contatta l'Avvocato del Consorzio
                  </h3>
                  
                  {contactSent ? (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-medium">Richiesta inviata!</p>
                      <p className="text-green-200 text-sm mt-1">L'avvocato ti contatterà al più presto.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Select
                        value={contactForm.avvocatoId}
                        onValueChange={(value) => setContactForm({ ...contactForm, avvocatoId: value })}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                          <SelectValue placeholder="Seleziona un avvocato" />
                        </SelectTrigger>
                        <SelectContent>
                          {avvocati.map((avv) => (
                            <SelectItem key={avv.id} value={avv.id}>
                              {avv.name} {avv.city ? `- ${avv.city}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Oggetto (es. Verifica contratto di fornitura)"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                      <Textarea
                        placeholder="Descrivi brevemente cosa vorresti far verificare..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
                      />

                      {/* Allegati */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                              <Paperclip className="w-4 h-4" />
                              Allega documento
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={handleAttachmentUpload}
                              className="hidden"
                              disabled={uploadingAttachment}
                            />
                          </label>
                          <label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                              <Camera className="w-4 h-4" />
                              Scatta foto
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleAttachmentUpload}
                              className="hidden"
                              disabled={uploadingAttachment}
                            />
                          </label>
                        </div>

                        {uploadingAttachment && (
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Caricamento in corso...
                          </div>
                        )}

                        {contactForm.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {contactForm.attachments.map((att, idx) => (
                              <div key={idx} className="bg-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                                <FileText className="w-4 h-4 text-lime-400" />
                                <span className="text-white truncate max-w-[120px]">{att.name}</span>
                                <button onClick={() => removeAttachment(idx)} className="text-red-400 hover:text-red-300">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => sendContactMutation.mutate()}
                        disabled={!contactForm.avvocatoId || !contactForm.subject || !contactForm.message || sendContactMutation.isPending || uploadingAttachment}
                        className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
                      >
                        {sendContactMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Invio in corso...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Invia Richiesta all'Avvocato
                          </>
                        )}
                      </Button>
                      </div>
                      )}
                      </CardContent>
                      </Card>

                      <Button
                      onClick={resetAnalysis}
                variant="outline"
                className="w-full border-slate-600 text-slate-400 hover:bg-slate-800"
              >
                Analizza un altro contratto
              </Button>
            </div>
          </>
        )}
      </main>

      <BottomNav currentPage="AnalisiContratti" unreadMessages={messages.length} />
    </div>
  );
}