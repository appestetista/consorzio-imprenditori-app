import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send, Sparkles, ArrowUp, Loader2, Menu, Mic, MicOff, X, LogOut, Settings, User, Eye, Phone, XCircle, Target, Scale, BarChart3, Bell, Globe, ShieldCheck, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser, isUserConsultant } from '../components/utils/normalizeUser';
import { cn } from '@/lib/utils';
import BottomNav from '../components/layout/BottomNav';
import ChatMessage from '../components/home/ChatMessage';
import DecisionResponse from '../components/home/DecisionResponse';
import CompareResult from '../components/home/CompareResult';
import ChatSidebar from '../components/home/ChatSidebar';
import ProfileOnboardingModal from '../components/home/ProfileOnboardingModal';
import NotificationsPanel, { useNotificationsBadge } from '../components/home/NotificationsPanel';
import { useQueryClient, useQuery as useRQQuery } from '@tanstack/react-query';

export default function Home() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation, setCurrentUserRole, appMode } = useImpersonation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastCategory, setLastCategory] = useState(null);
  const [lastClassification, setLastClassification] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeConvData, setActiveConvData] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [scenarioA, setScenarioA] = useState('');
  const [scenarioB, setScenarioB] = useState('');
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Caricamento utente
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) { setEffectiveUser(null); setLoading(false); return; }
        setUser(currentUser);
        setCurrentUserRole(currentUser.role);
        if (appMode === 'user-preview' && impersonation.previewUserId) {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          setEffectiveUser(users.length > 0 ? normalizeUser(users[0]) : null);
        } else {
          setEffectiveUser(normalizeUser(currentUser));
        }
      } catch (e) { setEffectiveUser(null); }
      finally { setLoading(false); }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId, setCurrentUserRole]);

  // Redirect admin
  useEffect(() => {
    if (!loading && effectiveUser?.role === 'admin' && !impersonation.active) {
      navigate(createPageUrl('AdminPanel'));
    }
  }, [loading, effectiveUser?.role, impersonation.active, navigate]);

  // Profilo onboarding check
  useEffect(() => {
    if (!loading && effectiveUser && effectiveUser.role !== 'admin' && !effectiveUser.profilo_completato) {
      setShowOnboarding(true);
    }
  }, [loading, effectiveUser]);

  // Assegnazione tipo utente
  useEffect(() => {
    const assignType = async () => {
      if (impersonation.active) return;
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role === 'admin' || currentUser?.user_type) return;
        const result = await base44.functions.invoke('assignUserType', {});
        if (result.data?.already_assigned || result.data?.already_registered) return;
        if (result.data?.success && result.data?.message?.includes('Consulente autorizzato')) return;
        if (result.data?.blocked) { window.location.reload(); return; }
        if (result.data?.success && result.data?.user_type && result.data.user_type !== 'consulente') {
          navigate(createPageUrl('MyProfile'));
        }
      } catch (e) {}
    };
    assignType();
  }, [impersonation.active, navigate]);

  // Scroll automatico ai nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const buildUserContext = () => {
    if (!effectiveUser) return '';
    const fields = [
      ['azienda', effectiveUser.company_name],
      ['settore', effectiveUser.settore],
      ['forma giuridica', effectiveUser.forma_giuridica],
      ['fatturato annuo', effectiveUser.fatturato_annuo],
      ['dipendenti', effectiveUser.numero_dipendenti],
      ['zona', effectiveUser.zona],
      ['città', effectiveUser.city],
      ['regime fiscale', effectiveUser.regime_fiscale],
      ['obiettivo', effectiveUser.obiettivo_principale],
    ];
    const parts = fields.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    return parts.length > 0 ? `CONTESTO AZIENDALE: ${parts.join(', ')}. Personalizza la risposta in base a questo contesto.\n\n` : '';
  };

  const runAnalysis = async ({ msg, category, sottocategoria, newMessages, convId }) => {
    const userContext = buildUserContext();

    // KB hint (solo titoli, wrappato in try/catch)
    let kbHint = '';
    try {
      const kbRecords = await base44.entities.KnowledgeBase.filter({ categoria: category, attivo: true });
      if (kbRecords.length > 0) {
        kbHint = 'Temi da verificare online: ' + kbRecords.map(r => r.titolo).join(', ') + '.\n';
      }
    } catch (e) { kbHint = ''; }

    // Strumento correlato
    const strumentiMap = {
      'Fiscale': { nome: 'Simulatore Fiscale', pagina: 'SimulatoreFiscale', descrizione: 'calcolo preciso imposte e confronto regimi' },
      'Personale/HR': { nome: 'Costo del Personale', pagina: 'SimulatoreCostoPersonale', descrizione: 'calcolo esatto costo dipendente con CCNL e contributi' },
      'Legale': { nome: 'Analisi Contratti', pagina: 'AnalisiContratti', descrizione: 'analisi clausole e rischi di contratti' },
      'Investimenti': { nome: 'Bandi e Finanziamenti', pagina: 'FinanziamentiAgevolati', descrizione: 'bandi attivi e finanziamenti agevolati' },
    };
    const msgLower = msg.toLowerCase();
    let strumentoSuggerito = strumentiMap[category] || null;
    if (msgLower.includes('import') || msgLower.includes('export') || msgLower.includes('dazio') || msgLower.includes('dogana')) {
      strumentoSuggerito = { nome: 'Import/Export', pagina: 'ImportExport', descrizione: 'analisi mercati, dazi doganali, codici HS con dati ufficiali' };
    }
    if (msgLower.includes('compliance') || msgLower.includes('sanzione') || msgLower.includes('gdpr') || msgLower.includes('sicurezza lavoro')) {
      strumentoSuggerito = { nome: 'Evita Sanzioni', pagina: 'ComplianceAziendale', descrizione: 'verifica compliance normativa e rischio sanzioni' };
    }
    if (msgLower.includes('welfare') || msgLower.includes('benefit') || msgLower.includes('buoni pasto') || msgLower.includes('fringe')) {
      strumentoSuggerito = { nome: 'Benefit Dipendenti', pagina: 'WelfareAziendale', descrizione: 'gestione welfare aziendale e normativa' };
    }
    if (msgLower.includes('fornitore') || msgLower.includes('fornitura') || msgLower.includes('preventivo')) {
      strumentoSuggerito = { nome: 'Ricerca Fornitori', pagina: 'Fornitori', descrizione: 'ricerca e valutazione fornitori verificati' };
    }
    if (msgLower.includes('consulente') || msgLower.includes('consulenza') || msgLower.includes('commercialista') || msgLower.includes('avvocato')) {
      strumentoSuggerito = { nome: 'Consulenze', pagina: 'Consulenze', descrizione: 'prenota una consulenza con un professionista' };
    }

    // Chiamata LLM con internet
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un consulente strategico senior per PMI italiane. HAI ACCESSO A INTERNET e DEVI usarlo.

3 REGOLE ASSOLUTE:
- MAI inventare dati, numeri, aliquote, leggi o statistiche
- Se NON trovi un dato: scrivi "dato non disponibile" o dai un range segnato come STIMA
- MAI restituire una risposta vuota o incompleta

PROCEDURA:
1. CERCA SU INTERNET dati aggiornati sulla domanda
2. Ogni dato trovato online: segna [VERIFICATO — nome fonte]
3. Ogni stima: segna [STIMA — su cosa si basa]
4. Ogni dato da verificare: segna [DA CONFERMARE — con chi]

DOVE CERCARE: Agenzia Entrate, INPS, INAIL, Gazzetta Ufficiale, MISE, MIMIT, Camere di Commercio, portali regionali, Fiscoetasse, Altalex, CNDCEC, Consulenti del Lavoro

REGOLE RISPOSTA:
- Numeri REALI trovati online, mai inventati
- Linguaggio diretto, operativo, concreto da consulente esperto
- La RACCOMANDAZIONE deve essere un'azione da fare DOMANI MATTINA
- Mai dire "come modello AI" o "non posso dare consulenza"
- Mai disclaimer legali automatici

${kbHint}${userContext}

Categoria: ${category} — ${sottocategoria}.
Domanda: ${msg}

FORMATO — JSON valido:
{
  "categoria": "stringa",
  "sintesi_decisionale": "max 5 righe con dati reali e tag [VERIFICATO — fonte] o [STIMA]",
  "impatto_economico": "cifre EUR con fonte o range stimato",
  "rischi_criticita": "rischi specifici con norme di riferimento",
  "tempo_attuazione": "timeline realistica",
  "raccomandazione_finale": "cosa fare DOMANI MATTINA alle 9 come primo passo",
  "fonti": [{"nome": "Nome Ente", "url": "link o vuoto", "tipo": "istituzionale|specializzata|media"}],
  "affidabilita": {"verificati": 4, "stimati": 1, "da_confermare": 1, "punteggio": 8},
  "followup_questions": ["domanda 1", "domanda 2", "domanda 3"],
  "strumento_correlato": ${strumentoSuggerito ? JSON.stringify(strumentoSuggerito) : 'null'}
}`,
      add_context_from_internet: true
    });

    // Parsing sicuro
    let parsed = result;
    if (typeof result === 'string') {
      try {
        let cleaned = result.trim();
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        parsed = JSON.parse(cleaned);
      } catch (e) { parsed = null; }
    }

    // Inietta strumento correlato se presente
    if (parsed && strumentoSuggerito) parsed.strumento_correlato = strumentoSuggerito;

    const assistantMsg = { role: 'assistant', content: parsed || result };
    const updatedMessages = [...newMessages, assistantMsg];
    setMessages(updatedMessages);
    const rispostaStr = typeof (parsed || result) === 'string' ? (parsed || result) : JSON.stringify(parsed || result);
    await base44.entities.ChatConversation.update(convId, {
      messages: updatedMessages,
      categoria: category,
      sottocategoria,
      risposta_json: rispostaStr,
    });
  };

  const handleDisambiguationSelect = async (disambiguation, selectedCategory) => {
    setIsTyping(true);
    setLastCategory(selectedCategory);
    setLastClassification({ categoria: selectedCategory, sottocategoria: disambiguation.sottocategoria, confidenza: 100 });
    // Rimuovi il messaggio di disambiguazione e sostituiscilo dopo l'analisi
    const msgsWithoutDisambig = messages.filter(m => !m.disambiguation);
    setMessages(msgsWithoutDisambig);
    try {
      await runAnalysis({
        msg: disambiguation.originalMsg,
        category: selectedCategory,
        sottocategoria: disambiguation.sottocategoria,
        newMessages: msgsWithoutDisambig,
        convId: disambiguation.convId,
      });
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      console.error('>>> DETTAGLIO:', JSON.stringify(e));
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
      const updated = [...msgsWithoutDisambig, errMsg];
      setMessages(updated);
      await base44.entities.ChatConversation.update(disambiguation.convId, { messages: updated });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (text) => {
    const msg = text || inputText.trim();
    if (!msg || !effectiveUser?.email) return;

    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    // Se è una nuova conversazione, creala
    let convId = activeConversationId;
    if (!convId) {
      const titolo = msg.length > 50 ? msg.substring(0, 50) + '...' : msg;
      const conv = await base44.entities.ChatConversation.create({
        user_email: effectiveUser.email,
        titolo,
        messages: newMessages
      });
      convId = conv.id;
      setActiveConversationId(convId);
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
    } else {
      await base44.entities.ChatConversation.update(convId, { messages: newMessages });
    }

    try {
      // FASE 1 – Classificazione intento
      console.log('>>> STEP 1: Inizio classificazione');
      const classResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Classifica questa richiesta in UNA sola categoria tra: Fiscale, Legale, Marketing, Personale/HR, Investimenti, Operativa, Strategica. Rispondi SOLO con un JSON: {"categoria": "nome", "confidenza": 85, "sottocategoria": "specifica"}

Richiesta: "${msg}"`,
        add_context_from_internet: true
      });
      let classificazione = classResult;
      if (typeof classResult === 'string') {
        try {
          let cleaned = classResult.trim();
          if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          classificazione = JSON.parse(cleaned);
        } catch (e) { classificazione = null; }
      }
      console.log('>>> STEP 2: Classificazione OK', classificazione);
      const category = classificazione?.categoria || 'Strategica';
      const confidenza = classificazione?.confidenza ?? 100;
      const sottocategoria = classificazione?.sottocategoria || '';
      setLastCategory(category);
      setLastClassification({ categoria: category, sottocategoria, confidenza });

      // Se confidenza bassa, chiedi disambiguazione
      if (confidenza < 70) {
        const disambigMsg = {
          role: 'assistant',
          content: null,
          disambiguation: {
            text: "Per un'analisi più precisa, in quale area rientra la tua domanda?",
            categories: ['Fiscale', 'Legale', 'Operativa', 'Strategica'],
            originalMsg: msg,
            sottocategoria,
            convId,
          }
        };
        const updatedMessages = [...newMessages, disambigMsg];
        setMessages(updatedMessages);
        await base44.entities.ChatConversation.update(convId, { messages: updatedMessages });
        setIsTyping(false);
        return;
      }

      // FASE 2 + 3 – Analisi con system prompt strutturato
      console.log('>>> STEP 3: Inizio analisi');
      await runAnalysis({ msg, category, sottocategoria, newMessages, convId });
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      console.error('>>> DETTAGLIO:', JSON.stringify(e));
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
      const updatedMessages = [...newMessages, errMsg];
      setMessages(updatedMessages);
      await base44.entities.ChatConversation.update(convId, { messages: updatedMessages });
    } finally {
      setIsTyping(false);
    }
  };

  const handleCompare = async () => {
    const a = scenarioA.trim();
    const b = scenarioB.trim();
    if (!a || !b || !effectiveUser?.email) return;

    const userMsg = { role: 'user', content: `⚖️ Confronto:\nA: ${a}\nB: ${b}` };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsTyping(true);

    // Crea conversazione
    let convId = activeConversationId;
    if (!convId) {
      const titolo = `Confronto: ${a.substring(0, 25)} vs ${b.substring(0, 25)}`;
      const conv = await base44.entities.ChatConversation.create({
        user_email: effectiveUser.email,
        titolo,
        messages: newMessages,
      });
      convId = conv.id;
      setActiveConversationId(convId);
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
    } else {
      await base44.entities.ChatConversation.update(convId, { messages: newMessages });
    }

    try {
      // Classificazione sul testo combinato
      const combinedText = `${a}. ${b}`;
      const classResult2 = await base44.integrations.Core.InvokeLLM({
        prompt: `Classifica questa richiesta in UNA sola categoria tra: Fiscale, Legale, Marketing, Personale/HR, Investimenti, Operativa, Strategica. Rispondi SOLO con un JSON: {"categoria": "nome", "confidenza": 85, "sottocategoria": "specifica"}\n\nRichiesta: "${combinedText}"`
      });
      let classificazione2 = classResult2;
      if (typeof classResult2 === 'string') {
        try {
          let cleaned = classResult2.trim();
          if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          classificazione2 = JSON.parse(cleaned);
        } catch (e) { classificazione2 = null; }
      }
      const category = classificazione2?.categoria || 'Strategica';
      const sottocategoria = classificazione2?.sottocategoria || '';
      setLastCategory('Confronto');
      setLastClassification({ categoria: 'Confronto', sottocategoria: `${category} — ${sottocategoria}` });

      // Contesto utente
      const userContext = buildUserContext();

      // Dati normativi KB
      let kbContext = '';
      const kbRecords = await base44.entities.KnowledgeBase.filter({ categoria: category, attivo: true });
      if (kbRecords.length > 0) {
        kbContext = `Dati normativi di riferimento:\n${kbRecords.map(r => `- ${r.titolo}: ${r.contenuto}`).join('\n')}\n\n`;
      }

      // Confronto LLM
      const compareResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Confronta questi scenari per un imprenditore italiano di PMI.
${userContext}${kbContext}
Scenario A: ${a}
Scenario B: ${b}

Rispondi SOLO con JSON valido con le chiavi: tema, scenari (array di 2 oggetti con: nome, costo, roi, tempo, rischio, vantaggio, punteggio numerico da 1 a 10), verdetto (quale è meglio e perché), scenario_consigliato ("A" o "B").`
      });

      let parsedCompare = compareResult;
      if (typeof compareResult === 'string') {
        try {
          let cleaned = compareResult.trim();
          if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          parsedCompare = JSON.parse(cleaned);
        } catch (e) { parsedCompare = null; }
      }

      const result = parsedCompare || compareResult;
      const assistantMsg = { role: 'assistant', content: result, isCompare: !!parsedCompare };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      const rispostaStr = typeof result === 'string' ? result : JSON.stringify(result);
      await base44.entities.ChatConversation.update(convId, {
        messages: updatedMessages,
        categoria: 'Confronto',
        sottocategoria: `${category} — ${sottocategoria}`,
        risposta_json: rispostaStr,
      });

      // Reset campi confronto
      setScenarioA('');
      setScenarioB('');
      setCompareMode(false);
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      console.error('>>> DETTAGLIO:', JSON.stringify(e));
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore nel confronto. Riprova tra un momento.' };
      const updated = [...newMessages, errMsg];
      setMessages(updated);
      await base44.entities.ChatConversation.update(convId, { messages: updated });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Il tuo browser non supporta il riconoscimento vocale.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalTranscript = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInputText(prev => {
        const base = prev.endsWith(' ') || prev === '' ? prev : prev + ' ';
        return finalTranscript ? base.trimEnd() + (base ? ' ' : '') + finalTranscript : base + interim;
      });
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setActiveConvData(null);
    setInputText('');
  };

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setActiveConvData(conv);
    setLastCategory(conv.categoria || null);
    setLastClassification(conv.categoria ? { categoria: conv.categoria, sottocategoria: conv.sottocategoria || '' } : null);
    setInputText('');
  };

  // Badge notifiche + scadenze urgenti
  const userRegime = effectiveUser?.regime_fiscale || null;
  const totalBadge = useNotificationsBadge(effectiveUser?.email, userRegime);

  // Notifiche non lette per badge messaggi (solo messaggi)
  const { data: notifications = [] } = useRQQuery({
    queryKey: ['home-notifications', effectiveUser?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
    refetchInterval: 10000,
  });
  const unreadCount = notifications.filter(n => n.type === 'message').length;

  // Logo utente
  const DEFAULT_LOGO = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop";
  const userLogo = effectiveUser?.company_logo || DEFAULT_LOGO;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  // Utente bloccato
  if (effectiveUser?.is_blocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white text-lg font-bold mb-2">Accesso non autorizzato</p>
          <p className="text-slate-400 text-sm mb-6">La tua email non è stata autorizzata. Contatta il consorzio per ottenere l'accesso.</p>
          <button onClick={() => base44.auth.logout()} className="px-6 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Esci</button>
        </div>
      </div>
    );
  }

  // Utente senza dati (non ancora caricato)
  if (!effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white text-lg font-bold mb-2">Sessione scaduta</p>
          <p className="text-slate-400 text-sm mb-6">Effettua nuovamente l'accesso.</p>
          <button onClick={() => base44.auth.redirectToLogin()} className="px-6 py-2 bg-lime-500 text-slate-900 rounded-lg text-sm font-semibold">Accedi</button>
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0f1a' }}>
      
      {/* Sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={effectiveUser?.email}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* Area messaggi / stato iniziale */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          {/* Sinistra: hamburger sidebar chat */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-14 h-14 rounded-xl flex items-center justify-center hover:bg-slate-800 active:bg-slate-700 transition-colors -webkit-tap-highlight-color-transparent touch-manipulation"
          >
            <Menu className="w-7 h-7 text-slate-400" />
          </button>

          {/* Destra: notifiche + messaggi */}
          <div className="flex items-center gap-2">
            <button onClick={() => setNotifPanelOpen(true)} className="relative p-1.5 rounded-xl hover:bg-slate-800 transition-colors">
              <Bell className="w-6 h-6 text-slate-400" />
              {totalBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
                  {totalBadge > 99 ? '99+' : totalBadge}
                </span>
              )}
            </button>
            <Link to={createPageUrl('Messaggi')} className="relative p-1">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/cd5e7b92b_Immagine_2026-02-03_182832-removebg-preview.png" 
                alt="Messaggi" 
                className="w-9 h-9 object-contain"
              />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {!hasMessages ? (
          // Stato iniziale
          <div className="flex-1 flex flex-col items-center justify-start px-5 pt-4 pb-32 overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center mb-4 shadow-lg shadow-[#d4af37]/20">
              <Target className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-white text-xl font-bold text-center mb-1.5 leading-tight">
              Centro Decisionale Imprenditore
            </h1>
            <p className="text-slate-400 text-sm text-center mb-5 max-w-xs leading-relaxed">
              Cerca dati reali su internet e ti dice cosa fare. Con le fonti.
            </p>

            {/* Card features */}
            <div className="w-full max-w-md space-y-2.5 mb-5">
              <div className="flex items-start gap-3 rounded-xl bg-slate-800/40 border border-slate-700/40 px-4 py-3 hover:border-[#d4af37]/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#d4af37]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Globe className="w-4.5 h-4.5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Cerca dati reali</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Normative, aliquote, bandi, costi cercati su internet in tempo reale</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-800/40 border border-slate-700/40 px-4 py-3 hover:border-[#d4af37]/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#d4af37]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4.5 h-4.5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Mai dati inventati</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Ogni numero ha la fonte. Le stime sono dichiarate. Zero allucinazioni.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-800/40 border border-slate-700/40 px-4 py-3 hover:border-[#d4af37]/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[#d4af37]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target className="w-4.5 h-4.5 text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Ti dice cosa fare</p>
                  <p className="text-xs text-slate-400 leading-relaxed">Un piano d'azione concreto con il primo passo da fare domani mattina</p>
                </div>
              </div>
            </div>

            {/* Chip esempio */}
            <div className="w-full max-w-md flex flex-wrap gap-2 justify-center">
              {[
                "Quanto mi costa un dipendente?",
                "Bandi aperti nella mia regione",
                "Come ridurre le tasse legalmente?",
                "Analizza il mio contratto di fornitura"
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="px-3.5 py-2 rounded-xl border border-slate-700/50 bg-slate-800/30 text-xs text-slate-300 hover:border-[#d4af37]/50 hover:text-white transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Conversazione attiva
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-32">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                msg.disambiguation ? (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 max-w-[92%] space-y-3">
                      <div className="bg-slate-800/60 rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-sm text-slate-200">{msg.disambiguation.text}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {msg.disambiguation.categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => handleDisambiguationSelect(msg.disambiguation, cat)}
                            disabled={isTyping}
                            className="text-left text-sm text-white px-4 py-2.5 rounded-xl border border-slate-600/50 bg-transparent hover:border-[#C8A951] transition-colors disabled:opacity-50"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : msg.role === 'assistant' && msg.isCompare ? (
                  <CompareResult key={i} data={typeof msg.content === 'string' ? (() => { try { return JSON.parse(msg.content); } catch { return null; } })() : msg.content} />
                ) : msg.role === 'assistant' ? (
                  <DecisionResponse key={i} message={msg} category={lastCategory} classification={lastClassification} onFollowup={(text) => handleSend(text)} conversationId={activeConversationId} existingPlan={activeConvData?.ha_piano ? activeConvData.piano_json : null} userQuestion={messages.slice(0, i).reverse().find(m => m.role === 'user')?.content} />
                ) : (
                  <ChatMessage key={i} message={msg} />
                )
              ))}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-800/60 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Campo di input */}
      <div className="fixed bottom-[88px] left-0 right-0 z-40 px-4 pb-3 pt-2" style={{ background: 'linear-gradient(to top, #0a0f1a 70%, transparent)' }}>
        <div className="max-w-2xl mx-auto">
          {!compareMode ? (
            <>
              <div className="relative flex items-end rounded-2xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-lg overflow-hidden" style={isRecording ? { borderColor: '#ef4444' } : {}}>
                {/* Microfono */}
                <button
                  onClick={toggleRecording}
                  className="flex-shrink-0 ml-2 mb-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: isRecording ? '#ef4444' : 'transparent' }}
                >
                  {isRecording ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? "Sto ascoltando..." : "Chiedi qualsiasi cosa... cerco dati reali e ti cito le fonti"}
                  rows={1}
                  className="flex-1 bg-transparent text-white text-sm px-3 py-3.5 resize-none outline-none placeholder:text-slate-500 max-h-32"
                  style={{ scrollbarWidth: 'none' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || isTyping}
                  className="flex-shrink-0 m-1.5 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{
                    backgroundColor: inputText.trim() && !isTyping ? '#d4af37' : '#334155',
                  }}
                >
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[11px] text-slate-500">
                  Dati verificati da fonti ufficiali. Mai inventati, mai stimati senza dirtelo.
                </p>
                <button
                  onClick={() => setCompareMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-700/50 bg-slate-800/60 hover:border-[#d4af37]/40 transition-colors flex-shrink-0"
                >
                  <Scale className="w-3 h-3 text-[#d4af37]" />
                  <span className="text-[11px] text-slate-400">Confronta scenari</span>
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-[#d4af37]/30 bg-slate-800/80 backdrop-blur-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-[#d4af37]" />
                <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider">Confronta Scenari</span>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={scenarioA}
                  onChange={(e) => setScenarioA(e.target.value)}
                  placeholder="Scenario A (es. Assumere dipendente)"
                  rows={2}
                  className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white text-sm px-3 py-2.5 resize-none outline-none placeholder:text-slate-500 focus:border-[#d4af37]/40"
                  style={{ scrollbarWidth: 'none' }}
                />
                <textarea
                  value={scenarioB}
                  onChange={(e) => setScenarioB(e.target.value)}
                  placeholder="Scenario B (es. Usare freelance)"
                  rows={2}
                  className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white text-sm px-3 py-2.5 resize-none outline-none placeholder:text-slate-500 focus:border-[#d4af37]/40"
                  style={{ scrollbarWidth: 'none' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setCompareMode(false); setScenarioA(''); setScenarioB(''); }}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← Torna a modalità singola
                </button>
                <button
                  onClick={handleCompare}
                  disabled={!scenarioA.trim() || !scenarioB.trim() || isTyping}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
                  style={{
                    backgroundColor: scenarioA.trim() && scenarioB.trim() && !isTyping ? '#d4af37' : '#334155',
                    color: scenarioA.trim() && scenarioB.trim() && !isTyping ? '#1a1a2e' : '#94a3b8',
                  }}
                >
                  {isTyping ? 'Analisi...' : 'Confronta'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Drawer */}
      <div className={cn(
        "fixed inset-0 z-50 transition-all duration-300",
        menuOpen ? "visible" : "invisible"
      )}>
        <div 
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMenuOpen(false)}
        />
        <div className={cn(
          "absolute right-0 top-0 h-full w-72 bg-slate-900 border-l border-lime-400/30 p-6 transition-transform duration-300",
          menuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={userLogo} alt="Profilo" className="w-10 h-10 rounded-full object-cover border-2 border-[#d4af37]/50" />
              <p className="text-lime-400 font-semibold text-sm">
                {effectiveUser?.company_name || effectiveUser?.full_name || 'Utente'}
              </p>
            </div>
            <button onClick={() => setMenuOpen(false)}>
              <X className="w-6 h-6 text-lime-400" />
            </button>
          </div>
          
          <div className="space-y-2">
            
            {impersonation.active && (
              <Link
                to={createPageUrl('Home')}
                onClick={() => { setMenuOpen(false); }}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 transition-colors w-full mb-3"
              >
                <XCircle className="w-5 h-5" />
                <span>Torna ad Admin</span>
              </Link>
            )}
            
            {effectiveUser?.role === 'admin' && !impersonation.active && (
              <>
                <Link
                  to={createPageUrl('AdminPanel')}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-5 h-5 text-lime-400" />
                  <span>Pannello Admin</span>
                </Link>
              </>
            )}

            {(effectiveUser?.role === 'user' || isUserConsultant(effectiveUser) || impersonation.active) && (
              <Link
                to={createPageUrl('MyProfile')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <User className="w-5 h-5 text-lime-400" />
                <span>Il Mio Profilo</span>
              </Link>
            )}

            <Link
              to={createPageUrl('Dashboard')}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-[#d4af37]" />
              <span>Dashboard Analisi</span>
            </Link>



            <Link
              to={createPageUrl('ContattaConsorzio')}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Phone className="w-5 h-5 text-lime-400" />
              <span>Contatta Consorzio</span>
            </Link>

            <button
              onClick={() => { setMenuOpen(false); base44.auth.logout(); }}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors w-full text-left"
            >
              <LogOut className="w-5 h-5 text-red-400" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      <NotificationsPanel
        open={notifPanelOpen}
        onClose={() => setNotifPanelOpen(false)}
        userEmail={effectiveUser?.email}
        userRegime={userRegime}
      />

      {/* Bottom Nav */}
      <BottomNav currentPage="Home" onMenuOpen={() => setMenuOpen(true)} />

      {/* Onboarding Modal */}
      {showOnboarding && (
        <ProfileOnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}