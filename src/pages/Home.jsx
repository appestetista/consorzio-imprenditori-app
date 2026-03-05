import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send, Sparkles, ArrowUp, Loader2, Mic, MicOff, X, Target, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser, isUserConsultant } from '../components/utils/normalizeUser';
import { cn } from '@/lib/utils';
import BottomNav from '../components/layout/BottomNav';
import ChatMessage from '../components/home/ChatMessage';

import SimpleAIResponse from '../components/home/SimpleAIResponse';
import CompareResult from '../components/home/CompareResult';
import ChatSidebar from '../components/home/ChatSidebar';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import AIUsageBar, { AIUsageBadge } from '../components/home/AIUsageBar';

import { useQueryClient } from '@tanstack/react-query';

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
  const [activeConvData, setActiveConvData] = useState(null);
  // missingFieldsPopup rimosso — ora i dati vengono estratti in background dalla chat
  const [compareMode, setCompareMode] = useState(false);
  const [scenarioA, setScenarioA] = useState('');
  const [scenarioB, setScenarioB] = useState('');
  // pannelli messaggi/notifiche gestiti globalmente via PanelProvider
  const [consulenzeUsate, setConsulenzeUsate] = useState(0);
  const [pianoAbbonamento, setPianoAbbonamento] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

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

  // Reset mensile consulenze + sync stato abbonamento
  useEffect(() => {
    if (!effectiveUser || effectiveUser.role === 'admin') return;
    const piano = effectiveUser.piano_abbonamento || 'free';
    setPianoAbbonamento(piano);
    setConsulenzeUsate(effectiveUser.consulenze_usate_mese || 0);

    // Controlla se il mese è cambiato → reset
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (effectiveUser.mese_reset_consulenze && effectiveUser.mese_reset_consulenze !== currentMonth) {
      // Reset asincrono
      (async () => {
        await base44.auth.updateMe({ consulenze_usate_mese: 0, mese_reset_consulenze: currentMonth });
        setConsulenzeUsate(0);
      })();
    } else if (!effectiveUser.mese_reset_consulenze) {
      // Prima volta: inizializza
      (async () => {
        await base44.auth.updateMe({ consulenze_usate_mese: 0, mese_reset_consulenze: currentMonth });
        setConsulenzeUsate(0);
      })();
    }
  }, [effectiveUser]);

  // (onboarding rimosso — ora i dati vengono chiesti contestualmente nella chat)

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

  // Scroll: quando l'utente invia un messaggio, scrolla per mostrare la domanda + i puntini di typing in alto.
  // Quando arriva la risposta AI, scrolla fino alla RISPOSTA (non al fondo) e lascia che l'utente scorra con il dito.
  const lastUserMsgRef = useRef(null);
  const lastAssistantMsgRef = useRef(null);

  // Scroll alla domanda utente quando sta digitando (typing)
  useEffect(() => {
    if (isTyping && lastUserMsgRef.current) {
      // Scrolla portando la domanda utente visibile in alto
      setTimeout(() => {
        lastUserMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [isTyping]);

  // Quando arriva una nuova risposta (isTyping passa da true a false), scrolla alla DOMANDA utente (non alla risposta)
  // Così l'utente vede: domanda in alto → risposta sotto, e può scrollare col dito
  const prevIsTyping = useRef(false);
  useEffect(() => {
    if (prevIsTyping.current && !isTyping && lastUserMsgRef.current) {
      setTimeout(() => {
        lastUserMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
    prevIsTyping.current = isTyping;
  }, [isTyping]);

  // Rileva scroll per mostrare freccia "scroll to bottom"
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let timeout;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        setShowScrollDown(false);
      } else {
        setShowScrollDown(true);
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // Gestisce parametri URL: loadConv (carica conversazione) e newChat (nuova chat)
  // Al caricamento senza parametri → sempre nuova chat pulita
  useEffect(() => {
    if (!effectiveUser?.email) return;
    const params = new URLSearchParams(window.location.search);
    const loadConvId = params.get('loadConv');
    
    if (loadConvId) {
      // Carica la conversazione specificata
      (async () => {
        const convs = await base44.entities.ChatConversation.filter({ user_email: effectiveUser.email });
        const conv = convs.find(c => c.id === loadConvId);
        if (conv) {
          handleSelectConversation(conv);
        }
      })();
      // Pulisci URL
      const url = new URL(window.location);
      url.searchParams.delete('loadConv');
      window.history.replaceState({}, '', url.toString());
    } else {
      // Nessun parametro o newChat=1 → sempre nuova chat pulita
      setMessages([]);
      setActiveConversationId(null);
      setActiveConvData(null);
      setInputText('');
      // Pulisci eventuali parametri rimasti
      const url = new URL(window.location);
      if (url.searchParams.has('newChat')) {
        url.searchParams.delete('newChat');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [effectiveUser?.email]);

  const runAnalysis = async ({ msg, newMessages, convId }) => {
    // Storicità conversazione — ultime 6 coppie (12 msg), 800 char/msg, cap 10.000 char totali
    let historyBlock = '';
    const previousMsgs = newMessages.slice(0, -1);
    if (previousMsgs.length > 0) {
      const recent = previousMsgs.slice(-12);
      const historyParts = [];
      let totalChars = 0;
      const MAX_TOTAL = 10000;
      const MAX_PER_MSG = 800;
      
      for (const m of recent) {
        let part = null;
        if (m.role === 'user') {
          part = 'UTENTE: ' + (m.content || '').substring(0, MAX_PER_MSG);
        } else if (m.role === 'assistant' && m.content) {
          const c = m.content;
          if (typeof c === 'object' && c.risposta) part = 'ASSISTENTE: ' + c.risposta.substring(0, MAX_PER_MSG);
          else if (typeof c === 'string') part = 'ASSISTENTE: ' + c.substring(0, MAX_PER_MSG);
        }
        if (part) {
          if (totalChars + part.length > MAX_TOTAL) break;
          historyParts.push(part);
          totalChars += part.length;
        }
      }
      
      if (historyParts.length > 0) {
        historyBlock = 'CONVERSAZIONE PRECEDENTE (per contesto, rispondi SOLO alla domanda corrente):\n' 
          + historyParts.join('\n') + '\n\n';
      }
    }

    // Chiamata consultaAI — nessun contesto profilo, nessuna classificazione
    let parsed = null;
    try {
      const aiResponse = await base44.functions.invoke('consultaAI', {
        message: msg,
        conversationHistory: historyBlock,
      });
      if (aiResponse.data?.success && aiResponse.data?.data) {
        parsed = aiResponse.data.data;
        console.log('[AI]', aiResponse.data.model_used, aiResponse.data.provider, aiResponse.data.response_time_ms + 'ms', '$' + aiResponse.data.cost_usd?.toFixed(5), 'web:' + aiResponse.data.web_search_used);
      }
    } catch (e) {
      console.error('[AI] Errore:', e?.message);
    }
    if (!parsed) {
      try {
        const fallbackResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Rispondi in modo completo e dettagliato.\nDomanda: ${msg}`,
          add_context_from_internet: true,
        });
        parsed = fallbackResult || 'Risposta non disponibile.';
      } catch (e2) { parsed = 'Errore. Riprova.'; }
    }

    const newCount = (consulenzeUsate || 0) + 1;
    const finalContent = parsed || 'Risposta non disponibile. Riprova.';
    const assistantMsg = { role: 'assistant', content: finalContent, isAI: true, usageCount: newCount, isNew: true };
    const updatedMessages = [...newMessages, assistantMsg];
    setMessages(updatedMessages);
    
    const messagesForDB = updatedMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'object' && m.content !== null ? JSON.stringify(m.content) : (m.content || ''),
      ...(m.isAI ? { isAI: true } : {}),
      ...(m.isCompare ? { isCompare: true } : {}),
      ...(m.usageCount ? { usageCount: m.usageCount } : {}),
      ...(m.isDetail ? { isDetail: true } : {}),
    }));
    
    const rispostaStr = typeof finalContent === 'string' ? finalContent : JSON.stringify(finalContent);
    await base44.entities.ChatConversation.update(convId, {
      messages: messagesForDB,
      risposta_json: rispostaStr,
    });

    setConsulenzeUsate(newCount);
    await base44.auth.updateMe({ consulenze_usate_mese: newCount });
  };

  const chatBlocked = false;

  const handleSend = async (text) => {
    const msg = text || inputText.trim();
    if (!msg || !effectiveUser?.email || chatBlocked || isTyping) return;

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
      // Chiamata diretta all'AI — nessun condizionamento
      await runAnalysis({ msg, newMessages, convId });
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
    if (!a || !b || !effectiveUser?.email || chatBlocked || isTyping) return;

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
      // Confronto via consultaAI — nessun contesto profilo
      let compareResult;
      try {
        const aiResp = await base44.functions.invoke('consultaAI', {
          message: `Confronta questi due scenari:\nScenario A: ${a}\nScenario B: ${b}\nPer ciascuno calcola impatto economico, rischi, tempi. Indica quale conviene e perché con numeri concreti.`,
          conversationHistory: '',
        });
        if (aiResp.data?.success && aiResp.data?.data) {
          compareResult = aiResp.data.data;
        }
      } catch (e) {
        console.error('[AI] Errore confronto:', e?.message);
      }
      if (!compareResult) {
        compareResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Confronta:\nA: ${a}\nB: ${b}`,
          add_context_from_internet: true,
        });
      }

      let parsedCompare = compareResult;

      const newCount = (consulenzeUsate || 0) + 1;
      const result = parsedCompare || compareResult;
      const assistantMsg = { role: 'assistant', content: result, isCompare: true, isAI: true, usageCount: newCount, isNew: true };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      // Per il database: TUTTI i content devono essere stringhe
      const messagesForDB = updatedMessages.map(m => ({
        role: m.role,
        content: typeof m.content === 'object' && m.content !== null ? JSON.stringify(m.content) : (m.content || ''),
        ...(m.isAI ? { isAI: true } : {}),
        ...(m.isCompare ? { isCompare: true } : {}),
        ...(m.usageCount ? { usageCount: m.usageCount } : {}),
        ...(m.isDetail ? { isDetail: true } : {}),
      }));
      const rispostaStr = typeof result === 'string' ? result : JSON.stringify(result);
      await base44.entities.ChatConversation.update(convId, {
        messages: messagesForDB,
        risposta_json: rispostaStr,
      });

      // Incrementa contatore consulenze
      setConsulenzeUsate(newCount);
      await base44.auth.updateMe({ consulenze_usate_mese: newCount });

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

  const restoreMessages = (rawMessages) => {
    return rawMessages.map(m => {
      const restored = { ...m };
      // Ri-parsa i content JSON stringificati in oggetti per il rendering
      if (m.role === 'assistant' && typeof m.content === 'string') {
        try {
          const obj = JSON.parse(m.content);
          if (obj && (obj.risposta || obj.sintesi_decisionale)) restored.content = obj;
        } catch { /* resta stringa */ }
      }
      // Preserva flag booleani per il rendering corretto
      if (m.isAI) restored.isAI = true;
      if (m.isCompare) restored.isCompare = true;
      if (m.isDetail) restored.isDetail = true;
      if (m.usageCount) restored.usageCount = m.usageCount;
      return restored;
    });
  };

  const handleSelectConversation = async (conv) => {
    setActiveConversationId(conv.id);
    setActiveConvData(conv);
    setInputText('');
    
    // Ricarica la conversazione completa dal database per avere tutti i messages
    try {
      const fullConvList = await base44.entities.ChatConversation.filter({ id: conv.id });
      const fullConv = fullConvList.length > 0 ? fullConvList[0] : conv;
      const rawMessages = fullConv.messages || conv.messages || [];
      setMessages(restoreMessages(rawMessages));
      setActiveConvData(fullConv);
    } catch (e) {
      console.error('Errore caricamento conversazione:', e);
      setMessages(restoreMessages(conv.messages || []));
    }
  };



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
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: '#0a0f1a' }}>
      
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

        {!hasMessages ? (
          // Stato iniziale - schermata pulita stile ChatGPT
          <div className="flex-1 flex flex-col items-center justify-center px-5 pb-32">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center mb-4 shadow-lg shadow-[#d4af37]/20">
              <Target className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-white text-xl font-bold text-center mb-1.5 leading-tight">
              Centro Decisionale Imprenditore
            </h1>
            <p className="text-slate-400 text-sm text-center max-w-xs leading-relaxed">
              Come posso aiutarti oggi?
            </p>
          </div>
        ) : (
          // Conversazione attiva
          <div ref={messagesContainerRef} className="flex-1 overflow-y-scroll px-4 pb-32" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', paddingTop: '56px' }}>
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg, i) => {
                // Calcola se è l'ultimo messaggio utente o l'ultimo assistente
                const isLastUser = msg.role === 'user' && !messages.slice(i + 1).some(m => m.role === 'user');
                const isLastAssistant = msg.role === 'assistant' && !messages.slice(i + 1).some(m => m.role === 'assistant');

                if (msg.role === 'assistant' && msg.isCompare) return (
                  <div key={i} ref={isLastAssistant ? lastAssistantMsgRef : null}>
                    <CompareResult data={typeof msg.content === 'string' ? (() => { try { return JSON.parse(msg.content); } catch { return null; } })() : msg.content} />
                  </div>
                );
                if (msg.role === 'assistant') {
                  // Risposta AI: sempre testo markdown diretto (nessun filtro/parsing)
                  const textContent = typeof msg.content === 'object' && msg.content !== null
                    ? (msg.content.risposta || msg.content.sintesi_decisionale || JSON.stringify(msg.content))
                    : (msg.content || '');
                  
                  return (
                    <div key={i} ref={isLastAssistant ? lastAssistantMsgRef : null} className="space-y-3">
                      <SimpleAIResponse 
                        content={{ risposta: textContent }} 
                        onFollowup={(text) => handleSend(text)} 
                        conversationId={activeConversationId}
                        isNew={!!msg.isNew}
                      />
                      <AIUsageBadge isAIResponse={msg.isAI} usate={msg.usageCount || consulenzeUsate} />
                    </div>
                  );
                }
                return (
                  <div key={i} ref={isLastUser ? lastUserMsgRef : null}>
                    <ChatMessage message={msg} />
                  </div>
                );
              })}
              {isTyping && (
                <div ref={lastAssistantMsgRef} className="flex items-start gap-3">
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

      {/* Freccia scroll to bottom */}
      {hasMessages && showScrollDown && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowScrollDown(false);
          }}
          className="fixed z-50 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-slate-700/90 border border-slate-600/50 flex items-center justify-center shadow-lg backdrop-blur-sm transition-all hover:bg-slate-600/90"
          style={{ bottom: '200px' }}
        >
          <ArrowUp className="w-4 h-4 text-slate-200 rotate-180" />
        </button>
      )}

      {/* Campo di input */}
      <div className="fixed z-40 px-2 pb-1 pt-1 left-0 right-0" style={{ bottom: '141px', backgroundColor: '#0a0f1a' }}>
        <div className="max-w-2xl mx-auto space-y-1">
          {!compareMode ? (
            <>
              <div className="relative flex items-end rounded-xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-lg overflow-hidden" style={isRecording ? { borderColor: '#ef4444' } : {}}>
                <button
                  onClick={toggleRecording}
                  className="flex-shrink-0 ml-2 mb-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: isRecording ? '#ef4444' : 'transparent' }}
                >
                  {isRecording ? (
                    <MicOff className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? "Sto ascoltando..." : "Chiedi qualsiasi cosa..."}
                  rows={1}
                  className="flex-1 bg-transparent text-white text-sm px-2 py-2.5 resize-none outline-none placeholder:text-slate-500 max-h-28"
                  style={{ scrollbarWidth: 'none' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || isTyping || chatBlocked}
                  className="flex-shrink-0 m-1 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                  style={{
                    backgroundColor: inputText.trim() && !isTyping && !chatBlocked ? '#d4af37' : '#334155',
                  }}
                >
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-[#d4af37]/30 bg-slate-800/80 backdrop-blur-lg p-4 space-y-3 relative">
              {/* X per chiudere */}
              <button
                onClick={() => { setCompareMode(false); setScenarioA(''); setScenarioB(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-700/80 hover:bg-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
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
              <div className="flex items-center justify-end">
                <button
                  onClick={handleCompare}
                  disabled={!scenarioA.trim() || !scenarioB.trim() || isTyping || chatBlocked}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
                  style={{
                    backgroundColor: scenarioA.trim() && scenarioB.trim() && !isTyping && !chatBlocked ? '#d4af37' : '#334155',
                    color: scenarioA.trim() && scenarioB.trim() && !isTyping && !chatBlocked ? '#1a1a2e' : '#94a3b8',
                  }}
                >
                  <Send className="w-4 h-4" />
                  {isTyping ? 'Analisi...' : 'Confronta'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Drawer rimosso - il pulsante Menu naviga direttamente a MyProfile */}

      {/* Pannelli messaggi/notifiche gestiti globalmente nel Layout */}

      {/* Bottom Nav */}
      <BottomNav currentPage="Home" onMenuOpen={() => window.location.href = createPageUrl('MyProfile')} menuOpen={false} bgColor="#0a0f1a" />


    </div>
  );
}