import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileSearch, Upload, FileText, Loader2, CheckCircle, AlertTriangle, Info, Scale, Send, X, History, ChevronRight, Trash2, Paperclip, Camera, Mail, MessageSquare, Clock } from 'lucide-react';
import { useAILimits } from '@/components/hooks/useAILimits';
import LimitReachedBanner from '@/components/common/LimitReachedBanner';
import UsageCounter from '@/components/common/UsageCounter';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ContractMessagesSection from '@/components/analisi-contratti/ContractMessagesSection';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import ContractHistorySection from '@/components/profile/ContractHistorySection';
import PremiumAIGate from '@/components/common/PremiumAIGate';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';

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
  const [activeTab, setActiveTab] = useState('analisi'); // 'analisi' | 'storico' | 'messaggi'
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswers, setFollowUpAnswers] = useState([]);
  const [askingFollowUp, setAskingFollowUp] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    window.scrollTo(0, 0);
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

  // Messaggi specifici per Analisi Contratti (ricevuti dall'utente)
  const { data: contractMessages = [] } = useQuery({
    queryKey: ['contract-messages', user?.email],
    queryFn: async () => {
      const received = await base44.entities.Message.filter({ 
        to_email: user?.email, 
        source: 'analisi_contratti' 
      }, '-created_date');
      const sent = await base44.entities.Message.filter({ 
        from_email: user?.email, 
        source: 'analisi_contratti' 
      }, '-created_date');
      return [...received, ...sent].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.email,
  });

  const unreadContractMessages = contractMessages.filter(m => m.to_email === user?.email && !m.is_read).length;

  const { data: historyAnalyses = [] } = useQuery({
    queryKey: ['contract-analyses', user?.email],
    queryFn: () => base44.entities.ContractAnalysis.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Limiti AI - solo quando user è disponibile
  const { usageCount, limit, remaining, isLimitReached, trackUsage } = useAILimits(user?.email || '', 'contract_analysis');


  const { data: avvocati = [] } = useQuery({
    queryKey: ['avvocati'],
    queryFn: () => base44.entities.Consultant.filter({ category: 'Avvocato' }),
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/'))) {
      setFiles(prev => [...prev, selectedFile]);
      setError(null);
      e.target.value = ''; // Reset input per permettere di caricare lo stesso file
    } else {
      setError('Per favore carica un file PDF o un\'immagine');
    }
  };

  const handlePhotoCapture = (e) => {
    const capturedFiles = Array.from(e.target.files || []);
    if (capturedFiles.length > 0) {
      setFiles(prev => [...prev, ...capturedFiles]);
      setError(null);
    }
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
        if (files.length === 0) return;

        // Verifica limite
        if (isLimitReached) {
          setError('Hai raggiunto il limite mensile di analisi contratti.');
          return;
        }

        setUploading(true);
        setError(null);

        try {
          // Traccia utilizzo
          await trackUsage();

          // Upload di tutti i file
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      setUploading(false);
      setAnalyzing(true);

      // Analisi con LLM - consulenza legale approfondita da avvocato esperto
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un avvocato civilista italiano con 20 anni di esperienza in diritto commerciale e contrattualistica d'impresa. Stai fornendo una consulenza legale professionale a un imprenditore che ti ha portato ${files.length > 1 ? 'questi documenti contrattuali' : 'questo documento contrattuale'}.

REGOLE FONDAMENTALI DI ANALISI:
1. DETERMINISMO: La tua analisi deve essere oggettiva e basata esclusivamente sul testo. Se analizzi lo stesso documento più volte, l'esito deve essere identico.
2. SOLO FATTI: Analizza SOLO ciò che è scritto nel documento. Non ipotizzare, non inventare, non aggiungere informazioni non presenti.
3. CITAZIONI NORMATIVE: Per ogni criticità, cita l'articolo di legge specifico (Codice Civile, Codice del Consumo D.Lgs. 206/2005, normative di settore).
4. LINGUAGGIO PROFESSIONALE: Scrivi come un avvocato che spiega al cliente, chiaro ma tecnicamente preciso.

STRUTTURA DELL'ANALISI LEGALE:

§1. QUALIFICAZIONE GIURIDICA
- Tipo contrattuale (vendita, appalto, somministrazione, locazione, prestazione d'opera, mandato, agenzia, franchising, etc.)
- Normativa di riferimento con articoli specifici
- Schema negoziale adottato

§2. SOGGETTI CONTRATTUALI
- Identificazione precisa delle parti come risulta dal documento
- Analisi dell'eventuale squilibrio contrattuale (B2B, B2C, rapporto tra imprese di diversa dimensione)
- Verifica requisiti soggettivi se rilevanti

§3. OGGETTO E PRESTAZIONI
- Determinatezza dell'oggetto (art. 1346 c.c.)
- Chiarezza delle obbligazioni reciproche
- Corrispettivo e modalità di pagamento

§4. CLAUSOLE CRITICHE E VESSATORIE (SEZIONE PRIORITARIA)
Per OGNI clausola problematica rilevata, indica:
- Contenuto testuale o parafrasi fedele della clausola
- Motivazione giuridica della criticità
- Norma violata o di riferimento (es. art. 1341 comma 2 c.c., artt. 33-38 Codice del Consumo)
- Se necessita doppia sottoscrizione ai sensi dell'art. 1341 c.c.
- Conseguenze pratiche per il cliente

§5. LACUNE CONTRATTUALI
- Clausole assenti che la prassi o la legge consigliano
- Rischi derivanti dalle omissioni
- Integrazioni suggerite

§6. TERMINI, DURATA E RECESSO
- Durata contrattuale
- Modalità e termini di recesso/disdetta
- Rinnovi taciti (attenzione all'art. 1899 c.c. per assicurazioni, normative specifiche)
- Penali: verifica proporzionalità

§7. VALUTAZIONE DEL RISCHIO
- Livello di rischio complessivo (basso/medio/alto) con motivazione
- Raccomandazione: procedere, negoziare modifiche, o non firmare

§8. AZIONI CONSIGLIATE PRIMA DELLA FIRMA
- Modifiche specifiche da richiedere alla controparte
- Clausole da eliminare o rinegoziare
- Integrazioni necessarie`,
        file_urls: uploadedUrls,
        response_json_schema: {
          type: "object",
          properties: {
            tipo_contratto: { type: "string", description: "Qualifica giuridica e normativa applicabile" },
            parti_coinvolte: { type: "array", items: { type: "string" } },
            oggetto: { type: "string" },
            durata: { type: "string" },
            scadenze: { type: "array", items: { type: "string" }, description: "Termini e scadenze critiche con date se presenti" },
            clausole_principali: { type: "array", items: { type: "string" } },
            clausole_vessatorie: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  clausola: { type: "string", description: "Testo o descrizione della clausola" },
                  problema: { type: "string", description: "Perché è sfavorevole o rischiosa" },
                  riferimento_legge: { type: "string", description: "Articolo di legge pertinente" },
                  richiede_doppia_firma: { type: "boolean" }
                }
              },
              description: "Clausole vessatorie, abusive o particolarmente sfavorevoli" 
            },
            clausole_mancanti: { type: "array", items: { type: "string" }, description: "Elementi che dovrebbero essere presenti ma mancano" },
            criticita: { type: "array", items: { type: "string" }, description: "Altri punti di attenzione con riferimenti normativi" },
            livello_rischio: { type: "string", enum: ["basso", "medio", "alto"], description: "Valutazione complessiva del rischio" },
            consigli: { type: "array", items: { type: "string" }, description: "Azioni concrete da intraprendere prima di firmare" },
            riepilogo: { type: "string", description: "Sintesi della consulenza in 3-4 frasi" }
          }
        }
      });

      setAnalysis(result);

      // Salva nello storico con URL dei file
      await base44.entities.ContractAnalysis.create({
        user_email: user.email,
        file_names: files.map(f => f.name),
        file_urls: uploadedUrls,
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
    setFollowUpQuestion('');
    setFollowUpAnswers([]);
    setFollowUpCount(0);
  };



  const handleAskFollowUp = async () => {
    if (!followUpQuestion.trim() || !analysis) return;

    // Verifica limite domande
    if (followUpCount >= 3) {
      setFollowUpAnswers(prev => [...prev, {
        question: followUpQuestion,
        answer: "⚠️ Il tuo piano non prevede un approfondimento ulteriore. Se vuoi un piano superiore con domande illimitate, contatta il Consorzio.",
        isLimit: true
      }]);
      setFollowUpQuestion('');
      return;
    }

    setAskingFollowUp(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un assistente legale AI specializzato in contrattualistica d'impresa. Hai appena analizzato un contratto per un cliente e questa è stata la tua analisi:

ANALISI PRECEDENTE:
- Tipo contratto: ${analysis.tipo_contratto}
- Oggetto: ${analysis.oggetto}
- Parti: ${analysis.parti_coinvolte?.join(', ')}
- Durata: ${analysis.durata}
- Livello rischio: ${analysis.livello_rischio}
- Riepilogo: ${analysis.riepilogo}
${analysis.clausole_vessatorie?.length > 0 ? `- Clausole vessatorie rilevate: ${analysis.clausole_vessatorie.map(c => c.clausola).join('; ')}` : ''}
${analysis.criticita?.length > 0 ? `- Criticità: ${analysis.criticita.join('; ')}` : ''}

Il cliente ti fa questa domanda di approfondimento:
"${followUpQuestion}"

REGOLE DI RISPOSTA:
1. Rispondi in modo professionale ma comprensibile
2. Cita articoli di legge pertinenti se rilevanti
3. Sii conciso ma esaustivo
4. NON firmarti MAI con un nome (es. "Avv. Rossi", "Cordiali saluti", etc.)
5. NON concludere con formule di cortesia o firme
6. Se la domanda esula dall'analisi contrattuale, indica che non puoi rispondere a domande non pertinenti

Rispondi direttamente alla domanda senza preamboli inutili e senza firmarti alla fine.`
      });

      // Aggiungi disclaimer alla risposta
      const disclaimerText = "\n\n---\n⚠️ Questa è solo un'analisi AI. Per ulteriori dubbi o approfondimenti vi invitiamo a contattare un avvocato del gruppo del Consorzio, potete trovarli qui sotto.";

      setFollowUpAnswers(prev => [...prev, {
        question: followUpQuestion,
        answer: response + disclaimerText,
        isLimit: false
      }]);
      setFollowUpCount(prev => prev + 1);
      setFollowUpQuestion('');
    } catch (err) {
      console.error('Errore follow-up:', err);
      setFollowUpAnswers(prev => [...prev, {
        question: followUpQuestion,
        answer: "Mi dispiace, si è verificato un errore. Riprova.",
        isLimit: false
      }]);
    } finally {
      setAskingFollowUp(false);
    }
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

      // Genera conversation_id univoco per raggruppare i messaggi
      const conversationId = [user.email, avvocato.email].sort().join('-') + '_analisi_contratti';

      // Crea messaggio
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: avvocato.email,
        content: `**Richiesta verifica contratto**\n\nOggetto: ${contactForm.subject}\n\n${contactForm.message}`,
        source: 'analisi_contratti',
        source_reference: contactForm.subject,
        conversation_id: conversationId,
        attachments: contactForm.attachments.map(a => ({ url: a.url, name: a.name, type: 'document' }))
      });

      // Invia email all'avvocato con tutti i riferimenti del cliente
      const clientInfo = `
RIFERIMENTI CLIENTE:
- Azienda: ${user.company_name || 'Non specificata'}
- Nome: ${user.full_name || 'Non specificato'}
- Email: ${user.email}
- Telefono: ${user.phone || 'Non specificato'}
- Città: ${user.city || 'Non specificata'}
`;
      
      await base44.integrations.Core.SendEmail({
        to: avvocato.email,
        subject: `[Analisi Contratti] Nuova richiesta: ${contactForm.subject}`,
        body: `Hai ricevuto una nuova richiesta di verifica contratto tramite l'app Consorzio Imprenditori.

${clientInfo}
---
OGGETTO RICHIESTA: ${contactForm.subject}

MESSAGGIO:
${contactForm.message}

${contactForm.attachments.length > 0 ? `\nALLEGATI: ${contactForm.attachments.length} documento/i allegato/i (visualizzabili nell'app)` : ''}

---
Accedi all'app per visualizzare gli allegati e rispondere direttamente al cliente.`
      });

      // Notifica in-app per l'avvocato
      await base44.entities.Notification.create({
        user_email: avvocato.email,
        type: 'message',
        title: 'Nuova richiesta - Analisi Contratti',
        content: `${user.company_name || user.full_name}: ${contactForm.subject}`,
        reference_id: conversationId
      });

      // Notifica admin
      const adminUsers = await base44.entities.User.filter({ role: 'admin' });
      await Promise.all(adminUsers.map(admin => 
        base44.entities.Notification.create({
          user_email: admin.email,
          type: 'message',
          title: 'Nuova richiesta Avvocato - Analisi Contratti',
          content: `${user.company_name || user.full_name} ha contattato ${avvocato.name}: ${contactForm.subject}`,
          reference_id: conversationId
        })
      ));

      // Email admin
      if (adminUsers.length > 0) {
        await base44.integrations.Core.SendEmail({
          to: adminUsers[0].email,
          subject: `🔔 Nuova richiesta Avvocato - Analisi Contratti`,
          body: `<h2>Nuova richiesta di verifica contratto</h2>
            <p><strong>Utente:</strong> ${user.company_name || user.full_name} (${user.email})</p>
            <p><strong>Avvocato contattato:</strong> ${avvocato.name}</p>
            <p><strong>Oggetto:</strong> ${contactForm.subject}</p>
            <p><strong>Messaggio:</strong></p>
            <p>${contactForm.message}</p>
            ${contactForm.attachments.length > 0 ? `<p><strong>Allegati:</strong> ${contactForm.attachments.length} documento/i</p>` : ''}`
        });
      }
    },
    onSuccess: () => {
      setContactSent(true);
      setContactForm({ subject: '', message: '', avvocatoId: '', attachments: [] });
      queryClient.invalidateQueries({ queryKey: ['contract-messages', user?.email] });
    }
  });

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <h1 className="text-white text-xl font-bold">Analisi Contratti AI</h1>
          </div>
          {/* Icone gestite dal GlobalHeader */}
        </div>

        {/* Tab Switch */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('analisi')}
            className={`flex-1 h-11 ${activeTab === 'analisi' ? 'bg-lime-400 text-slate-900 font-bold hover:bg-lime-500' : 'bg-slate-800 text-white border border-slate-600 hover:bg-slate-700'}`}
          >
            <FileSearch className="w-4 h-4 mr-2" />
            Nuova Analisi
          </Button>
          <Button
            onClick={() => setActiveTab('storico')}
            className={`flex-1 h-11 ${activeTab === 'storico' ? 'bg-lime-400 text-slate-900 font-bold hover:bg-lime-500' : 'bg-slate-800 text-white border border-slate-600 hover:bg-slate-700'}`}
          >
            <History className="w-4 h-4 mr-2" />
            Storico
          </Button>
        </div>

        {activeTab === 'storico' ? (
                        <ContractHistorySection user={user} />
                      ) : (
                        <>
                          {/* Pannello Consulenti per questa sezione */}
                          {user && (
                            <div className="mb-6">
                              <SectionConsultantPanel 
                                sectionId="analisi_contratti" 
                                sectionLabel="Analisi Contratti" 
                                user={user} 
                              />
                            </div>
                          )}

                          {/* Limite Raggiunto Banner */}
                          {isLimitReached && (
                            <LimitReachedBanner 
                              actionType="contract_analysis" 
                              usageCount={usageCount} 
                              limit={limit} 
                            />
                          )}

                          {/* Contatore Utilizzo */}
                          {!isLimitReached && user && (
                            <UsageCounter 
                              usageCount={usageCount} 
                              limit={limit} 
                              label="Analisi contratti disponibili questo mese" 
                            />
                          )}

            

        {/* Storico inline rimosso - ora è un tab separato */}

        {/* Vista dettaglio storico */}
        {selectedHistory ? (
          <>

            <div className="space-y-4">
              {/* Documenti caricati */}
              {selectedHistory.file_urls?.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-lime-400" />
                      Documenti Analizzati
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedHistory.file_urls.map((url, idx) => {
                        const fileName = selectedHistory.file_names?.[idx] || `File ${idx + 1}`;
                        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes('image');
                        return (
                          <a 
                            key={idx} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-slate-900 border border-slate-700 rounded-lg p-2 hover:border-lime-400 transition-colors"
                          >
                            {isImage ? (
                              <div className="aspect-square rounded overflow-hidden bg-slate-800 mb-1">
                                <img src={url} alt={fileName} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="aspect-square rounded bg-slate-800 flex items-center justify-center mb-1">
                                <FileText className="w-8 h-8 text-lime-400" />
                              </div>
                            )}
                            <p className="text-white text-[10px] truncate">{fileName}</p>
                          </a>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

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

              {/* Livello di Rischio */}
              {selectedHistory.livello_rischio && (
                <Card className={`border ${
                  selectedHistory.livello_rischio === 'alto' ? 'bg-red-500/20 border-red-500/50' :
                  selectedHistory.livello_rischio === 'medio' ? 'bg-orange-500/20 border-orange-500/50' :
                  'bg-green-500/20 border-green-500/50'
                }`}>
                  <CardContent className="p-4">
                    <h3 className={`font-semibold mb-1 flex items-center gap-2 ${
                      selectedHistory.livello_rischio === 'alto' ? 'text-red-400' :
                      selectedHistory.livello_rischio === 'medio' ? 'text-orange-400' :
                      'text-green-400'
                    }`}>
                      <Scale className="w-5 h-5" />
                      Livello di Rischio: {selectedHistory.livello_rischio.toUpperCase()}
                    </h3>
                  </CardContent>
                </Card>
              )}

              {/* Clausole Vessatorie */}
              {selectedHistory.clausole_vessatorie?.length > 0 && (
                <Card className="bg-red-500/20 border-red-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      ⚠️ Clausole Vessatorie o Sfavorevoli
                    </h3>
                    <div className="space-y-4">
                      {selectedHistory.clausole_vessatorie.map((cv, i) => (
                        <div key={i} className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
                          <p className="text-white text-sm font-medium mb-1">{cv.clausola}</p>
                          <p className="text-red-200 text-sm mb-2">❌ {cv.problema}</p>
                          {cv.riferimento_legge && (
                            <p className="text-red-300 text-xs italic">📜 Rif. normativo: {cv.riferimento_legge}</p>
                          )}
                          {cv.richiede_doppia_firma && (
                            <p className="text-yellow-400 text-xs mt-1 font-semibold">✍️ Richiede doppia sottoscrizione specifica</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Clausole Mancanti */}
              {selectedHistory.clausole_mancanti?.length > 0 && (
                <Card className="bg-yellow-500/20 border-yellow-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Clausole Mancanti o Incomplete
                    </h3>
                    <ul className="space-y-1">
                      {selectedHistory.clausole_mancanti.map((mancante, i) => (
                        <li key={i} className="text-yellow-200 text-sm">• {mancante}</li>
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
                      Altri Punti di Attenzione
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
                    <h3 className="text-green-400 font-semibold mb-2">💡 Cosa Fare Prima di Firmare</h3>
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
                <div className="grid grid-cols-2 gap-3">
                  {/* Upload PDF */}
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-slate-600 rounded-xl p-4 text-center hover:border-lime-400 transition-colors h-full flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 text-slate-500 mb-2" />
                      <p className="text-slate-400 text-sm">Carica PDF</p>
                      <p className="text-slate-500 text-xs">o immagine</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* Scatta Foto */}
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-slate-600 rounded-xl p-4 text-center hover:border-lime-400 transition-colors h-full flex flex-col items-center justify-center">
                      <Camera className="w-8 h-8 text-slate-500 mb-2" />
                      <p className="text-slate-400 text-sm">Scatta Foto</p>
                      <p className="text-slate-500 text-xs">al documento</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-slate-500 text-xs text-center mt-3">Puoi caricare più file o scattare più foto</p>
              </CardContent>
            </Card>

            {/* File Thumbnails */}
            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="bg-slate-800 border border-slate-700 rounded-lg p-2 relative"
                  >
                    {file.type.startsWith('image/') ? (
                      <div className="aspect-square rounded overflow-hidden bg-slate-900">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square rounded bg-slate-900 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-lime-400" />
                      </div>
                    )}
                    <p className="text-white text-[10px] font-medium truncate mt-1">{file.name}</p>
                    <button 
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
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
                                disabled={files.length === 0 || uploading || analyzing || isLimitReached || user?.piano_abbonamento !== 'impresa_39'}
                                className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold h-12 animate-pulse disabled:opacity-50 disabled:animate-none"
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
                  Contatta un Avvocato del Consorzio
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
                          <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm h-full">
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

              {/* Livello di Rischio */}
              {analysis.livello_rischio && (
                <Card className={`border ${
                  analysis.livello_rischio === 'alto' ? 'bg-red-500/20 border-red-500/50' :
                  analysis.livello_rischio === 'medio' ? 'bg-orange-500/20 border-orange-500/50' :
                  'bg-green-500/20 border-green-500/50'
                }`}>
                  <CardContent className="p-4">
                    <h3 className={`font-semibold mb-1 flex items-center gap-2 ${
                      analysis.livello_rischio === 'alto' ? 'text-red-400' :
                      analysis.livello_rischio === 'medio' ? 'text-orange-400' :
                      'text-green-400'
                    }`}>
                      <Scale className="w-5 h-5" />
                      Livello di Rischio: {analysis.livello_rischio.toUpperCase()}
                    </h3>
                    <p className={`text-sm ${
                      analysis.livello_rischio === 'alto' ? 'text-red-200' :
                      analysis.livello_rischio === 'medio' ? 'text-orange-200' :
                      'text-green-200'
                    }`}>
                      {analysis.livello_rischio === 'alto' && 'Questo contratto presenta criticità significative. Si consiglia vivamente di consultare un avvocato prima di firmare.'}
                      {analysis.livello_rischio === 'medio' && 'Il contratto presenta alcuni punti da verificare. Valuta attentamente le clausole segnalate.'}
                      {analysis.livello_rischio === 'basso' && 'Il contratto appare equilibrato. Verifica comunque i punti evidenziati.'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Clausole Vessatorie */}
              {analysis.clausole_vessatorie?.length > 0 && (
                <Card className="bg-red-500/20 border-red-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      ⚠️ Clausole Vessatorie o Sfavorevoli
                    </h3>
                    <div className="space-y-4">
                      {analysis.clausole_vessatorie.map((cv, i) => (
                        <div key={i} className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
                          <p className="text-white text-sm font-medium mb-1">{cv.clausola}</p>
                          <p className="text-red-200 text-sm mb-2">❌ {cv.problema}</p>
                          {cv.riferimento_legge && (
                            <p className="text-red-300 text-xs italic">📜 Rif. normativo: {cv.riferimento_legge}</p>
                          )}
                          {cv.richiede_doppia_firma && (
                            <p className="text-yellow-400 text-xs mt-1 font-semibold">✍️ Richiede doppia sottoscrizione specifica (art. 1341 c.c.)</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Clausole Mancanti */}
              {analysis.clausole_mancanti?.length > 0 && (
                <Card className="bg-yellow-500/20 border-yellow-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Clausole Mancanti o Incomplete
                    </h3>
                    <ul className="space-y-1">
                      {analysis.clausole_mancanti.map((mancante, i) => (
                        <li key={i} className="text-yellow-200 text-sm">• {mancante}</li>
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
                      Altri Punti di Attenzione
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
                    <h3 className="text-green-400 font-semibold mb-2">💡 Cosa Fare Prima di Firmare</h3>
                    <ul className="space-y-1">
                      {analysis.consigli.map((consiglio, i) => (
                        <li key={i} className="text-green-200 text-sm">• {consiglio}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Sezione Domande all'AI */}
              <Card className="bg-slate-800 border-lime-400/50">
                <CardContent className="p-4">
                  <h3 className="text-lime-400 font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Hai domande sull'analisi?
                  </h3>
                  <p className="text-slate-400 text-sm mb-3">
                    Puoi fare fino a 3 domande di approfondimento sul contratto analizzato.
                    {followUpCount > 0 && <span className="text-lime-400 ml-1">({3 - followUpCount} rimaste)</span>}
                  </p>
                  
                  {/* Storico domande e risposte */}
                  {followUpAnswers.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {followUpAnswers.map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="bg-slate-700 rounded-lg p-3">
                            <p className="text-white text-sm font-medium">📝 {item.question}</p>
                          </div>
                          <div className={`rounded-lg p-3 ${item.isLimit ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-slate-900'}`}>
                            <p className={`text-sm whitespace-pre-wrap ${item.isLimit ? 'text-orange-300' : 'text-slate-300'}`}>
                              {item.answer}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input domanda */}
                  {followUpCount < 3 && (
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Es: Cosa rischio se firmo senza modifiche? Posso recedere anticipatamente?"
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white min-h-[60px] flex-1"
                        disabled={askingFollowUp}
                      />
                      <Button
                        onClick={handleAskFollowUp}
                        disabled={!followUpQuestion.trim() || askingFollowUp}
                        className="bg-lime-400 hover:bg-lime-500 text-slate-900 px-4"
                      >
                        {askingFollowUp ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                    Contatta un Avvocato del Consorzio
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
        </>
        )}
      </main>

      <BottomNavWithMenu currentPage="AnalisiContratti" unreadMessages={messages.length} />
    </div>
  );
}