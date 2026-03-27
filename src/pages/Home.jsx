import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send, Sparkles, ArrowUp, Loader2, Mic, MicOff, X, Target, Scale, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser, isUserConsultant } from '../components/utils/normalizeUser';
import { cn } from '@/lib/utils';
import { useTheme } from '../components/context/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import BottomNav from '../components/layout/BottomNav';
import ChatMessage from '../components/home/ChatMessage';

import SimpleAIResponse from '../components/home/SimpleAIResponse';
import CompareResult from '../components/home/CompareResult';
import ChatSidebar from '../components/home/ChatSidebar';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import AIUsageBar, { AIUsageBadge } from '../components/home/AIUsageBar';
import AIUsageInline from '../components/home/AIUsageInline';
import AttachmentMenu from '../components/home/AttachmentMenu';
import useStreamingAI from '../components/home/useStreamingAI';
import { useQueryClient } from '@tanstack/react-query';

export default function Home() {
  const { user } = useAuth();
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation, setCurrentUserRole, appMode } = useImpersonation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();

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
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextQuestion, setContextQuestion] = useState('');
  const [entertainQuestions, setEntertainQuestions] = useState('');
  const [pendingContextAnswer, setPendingContextAnswer] = useState('');
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [webSearchResult, setWebSearchResult] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const { streamAI } = useStreamingAI();
  const recognitionRef = useRef(null);
  const pendingContextRef = useRef('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Caricamento effectiveUser basato su user da AuthContext
  useEffect(() => {
    if (!user) { setLoading(true); return; }
    const loadEffective = async () => {
      setLoading(true);
      setCurrentUserRole(user.role);
      if (appMode === 'user-preview' && impersonation.previewUserId) {
        const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
        setEffectiveUser(users.length > 0 ? normalizeUser(users[0]) : null);
      } else {
        // user da AuthContext è già normalizzato
        setEffectiveUser(user);
      }
      setLoading(false);
    };
    loadEffective();
  }, [user, appMode, impersonation.previewUserId, setCurrentUserRole]);

  // Redirect admin
  useEffect(() => {
    if (!loading && effectiveUser?.role === 'admin' && !impersonation.active) {
      navigate(createPageUrl('AdminPanel'));
    }
  }, [loading, effectiveUser?.role, impersonation.active, navigate]);

  // Sync stato abbonamento e consulenze (sola lettura — il reset è gestito dal cron resetMonthlyConsulenze)
  useEffect(() => {
    if (!effectiveUser || effectiveUser.role === 'admin') return;
    setPianoAbbonamento(effectiveUser.piano_abbonamento || 'free');
    setConsulenzeUsate(effectiveUser.consulenze_usate_mese || 0);
  }, [effectiveUser]);

  // (onboarding rimosso — ora i dati vengono chiesti contestualmente nella chat)

  // Assegnazione tipo utente
  useEffect(() => {
    if (!user || impersonation.active) return;
    const assignType = async () => {
      if (user.role === 'admin' || user.user_type) return;
      try {
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
  }, [user, impersonation.active, navigate]);

  // Scroll: quando l'utente invia un messaggio, scrolla per mostrare la domanda + i puntini di typing in alto.
  // Quando arriva la risposta AI, scrolla fino alla RISPOSTA (non al fondo) e lascia che l'utente scorra con il dito.
  const lastUserMsgRef = useRef(null);
  const lastAssistantMsgRef = useRef(null);

  // Scroll alla domanda utente quando inizia il typing/streaming
  useEffect(() => {
    if ((isTyping || isStreaming) && lastUserMsgRef.current) {
      setTimeout(() => {
        lastUserMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [isTyping, isStreaming]);

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

  // Ascolta evento globale per caricare conversazione dalla sidebar del Layout
  useEffect(() => {
    const handleLoadConv = (e) => {
      const conv = e.detail;
      if (conv && conv.id) {
        handleSelectConversation(conv);
      }
    };
    const handleNewChatEvent = () => {
      handleNewChat();
    };
    window.addEventListener('load-conversation', handleLoadConv);
    window.addEventListener('new-chat', handleNewChatEvent);
    return () => {
      window.removeEventListener('load-conversation', handleLoadConv);
      window.removeEventListener('new-chat', handleNewChatEvent);
    };
  }, []);

  const buildHistoryBlock = (msgs) => {
    const previousMsgs = msgs.slice(0, -1);
    if (previousMsgs.length === 0) return '';
    const historyParts = [];
    let totalChars = 0;
    // Max 3000 char — meno token = meno CPU = meno timeout
    const MAX_TOTAL = 3000;
    // Ultimi 6 messaggi max (3 scambi)
    const recentMsgs = previousMsgs.slice(-6);
    for (let i = recentMsgs.length - 1; i >= 0; i--) {
      const m = recentMsgs[i];
      let part = null;
      if (m.role === 'user') part = 'U: ' + (m.content || '').substring(0, 300);
      else if (m.role === 'assistant' && m.content) {
        const c = m.content;
        const raw = typeof c === 'object' && c.risposta ? c.risposta : (typeof c === 'string' ? c : '');
        part = 'A: ' + (raw.length > 400 ? raw.substring(0, 400) + '…' : raw);
      }
      if (part) {
        if (totalChars + part.length > MAX_TOTAL) break;
        historyParts.unshift(part);
        totalChars += part.length;
      }
    }
    return historyParts.join('\n');
  };

  const saveConversation = async (allMessages, convId) => {
    const messagesForDB = allMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'object' && m.content !== null ? JSON.stringify(m.content) : (m.content || ''),
      ...(m.isAI ? { isAI: true } : {}),
      ...(m.isCompare ? { isCompare: true } : {}),
      ...(m.usageCount ? { usageCount: m.usageCount } : {}),
      ...(m.isDetail ? { isDetail: true } : {}),
    }));
    const lastAssistant = allMessages.filter(m => m.role === 'assistant').pop();
    const rispostaStr = lastAssistant ? (typeof lastAssistant.content === 'string' ? lastAssistant.content : JSON.stringify(lastAssistant.content)) : '';
    await base44.entities.ChatConversation.update(convId, { messages: messagesForDB, risposta_json: rispostaStr });
  };

  const runAnalysis = async ({ msg, newMessages, convPromise }) => {
    const historyBlock = buildHistoryBlock(newMessages);

    // Mostra subito il messaggio assistente vuoto per lo streaming
    const newCount = (consulenzeUsate || 0) + 1;
    setIsStreaming(true);
    setStreamingText('');

    // Reset context/entertain/web per nuova richiesta
    setContextQuestion('');
    setEntertainQuestions('');
    setPendingContextAnswer('');
    setWebSearchLoading(false);
    setWebSearchResult(null);

    // Aggiungi un messaggio assistente placeholder che si aggiorna in tempo reale
    const streamingMsg = { role: 'assistant', content: '', isAI: true, usageCount: newCount, isNew: true, isStreaming: true };
    setMessages([...newMessages, streamingMsg]);

    return new Promise((resolve, reject) => {
      streamAI({
        message: msg,
        conversationHistory: historyBlock,
        userEmail: effectiveUser?.email || '',
        onContextQuestion: (question) => {
          console.log('[AI] Context question received:', question);
          setContextQuestion(question);
        },
        onEntertainQuestions: (questions) => {
          console.log('[AI] Entertain questions received:', questions);
          setEntertainQuestions(questions);
        },
        onStarted: () => {
          console.log('[AI] Backend started processing');
        },
        onChunk: (fullText) => {
          setStreamingText(fullText);
          // Aggiorna il messaggio in tempo reale
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].isStreaming) {
              updated[lastIdx] = { ...updated[lastIdx], content: fullText };
            }
            return updated;
          });
        },
        onDone: async (fullText, metadata) => {
          console.log('[AI] Streaming done', metadata?.response_time_ms + 'ms', 'cache:' + !!metadata?.cache_hit);
          
          const finalContent = fullText || 'Risposta non disponibile. Riprova.';
          const assistantMsg = { role: 'assistant', content: finalContent, isAI: true, usageCount: newCount, isNew: true };
          const updatedMessages = [...newMessages, assistantMsg];
          setMessages(updatedMessages);
          setIsStreaming(false);
          setStreamingText('');

          // Attendi il convId dal salvataggio parallelo
          const resolvedConvId = await convPromise;
          await saveConversation(updatedMessages, resolvedConvId);
          setConsulenzeUsate(newCount);
          await base44.auth.updateMe({ consulenze_usate_mese: newCount });

          // Update conversation title if generated by AI
          if (metadata?.generated_title) {
            base44.entities.ChatConversation.update(resolvedConvId, { titolo: metadata.generated_title }).catch(() => {});
            queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
          }
          
          // Se c'è una risposta di contesto in attesa, inviala automaticamente
          // (letto dal ref per avere il valore aggiornato)
          const pending = pendingContextRef.current;
          if (pending) {
            console.log('[AI] Auto-sending pending context answer:', pending);
            setPendingContextAnswer('');
            setContextQuestion('');
            pendingContextRef.current = '';
            // Piccolo delay per far vedere la risposta prima di inviare la nuova
            setTimeout(() => {
              handleSend(pending);
            }, 800);
          } else {
            // Nascondi la domanda di contesto dopo 15 secondi se non usata
            setTimeout(() => setContextQuestion(''), 15000);
          }
          resolve();
        },
        onWebSearchStart: () => {
          console.log('[AI] Web search started in parallel');
          setWebSearchLoading(true);
        },
        onWebSearchDone: (result) => {
          console.log('[AI] Web search done', result ? 'with result' : 'no result');
          setWebSearchLoading(false);
          if (result) {
            setWebSearchResult(result);
          }
        },
        onError: async (error) => {
          console.error('[AI] Streaming error:', error?.message);
          setIsStreaming(false);
          setStreamingText('');
          setContextQuestion('');
          setEntertainQuestions('');
          setWebSearchLoading(false);
          
          // Fallback rapido: un solo retry con history ridotta, poi messaggio chiaro
          let parsed = null;
          try {
            // Retry con history azzerata (meno token = meno CPU)
            const retryResponse = await base44.functions.invoke('consultaAI', {
              message: msg,
              conversationHistory: '',
            });
            if (retryResponse.data?.success && retryResponse.data?.data) {
              parsed = retryResponse.data.data;
            }
          } catch {}

          const finalContent = parsed || 'Fammi riformulare la risposta in modo più mirato. Puoi ripetere la domanda o chiedermi qualcosa di più specifico? Così posso darti informazioni più precise.';
          const assistantMsg = { role: 'assistant', content: finalContent, isAI: true, usageCount: newCount, isNew: true };
          const updatedMessages = [...newMessages, assistantMsg];
          setMessages(updatedMessages);

          const resolvedConvId = await convPromise.catch(() => null);
          if (resolvedConvId) await saveConversation(updatedMessages, resolvedConvId);
          setConsulenzeUsate(newCount);
          await base44.auth.updateMe({ consulenze_usate_mese: newCount }).catch(() => {});
          resolve();
        },
      });
    });
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

    // Fire-and-forget: salva conversazione in parallelo, non blocca la pipeline AI
    let convId = activeConversationId;
    const convPromise = (async () => {
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
        base44.entities.ChatConversation.update(convId, { messages: newMessages }).catch(() => {});
      }
      return convId;
    })();

    try {
      // Lancia la pipeline AI subito, senza aspettare il DB
      // convPromise viene passata per il salvataggio finale
      await runAnalysis({ msg, newMessages, convPromise });
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      console.error('>>> DETTAGLIO:', JSON.stringify(e));
      const errMsg = { role: 'assistant', content: 'Scusa, stavo elaborando troppi dati insieme. Riformula la domanda in modo più specifico e ti rispondo subito.' };
      const updatedMessages = [...newMessages, errMsg];
      setMessages(updatedMessages);
      const resolvedId = await convPromise.catch(() => convId);
      if (resolvedId) await base44.entities.ChatConversation.update(resolvedId, { messages: updatedMessages }).catch(() => {});
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
      const errMsg = { role: 'assistant', content: 'Ho bisogno di qualche dettaglio in più per confrontare questi scenari. Prova a descriverli con più precisione e ci riprovo subito.' };
      const updated = [...newMessages, errMsg];
      setMessages(updated);
      await base44.entities.ChatConversation.update(convId, { messages: updated });
    } finally {
      setIsTyping(false);
    }
  };



  const handleKeyDown = (e) => {
    // Enter fa solo "a capo" — l'invio avviene solo col pulsante freccia
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
      // CRITICO: mai isNew o isStreaming su messaggi caricati dal DB
      restored.isNew = false;
      restored.isStreaming = false;
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
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--app-accent)' }}></div>
      </div>
    );
  }

  // Utente bloccato
  if (effectiveUser?.is_blocked) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-app-primary text-lg font-bold mb-2">Accesso non autorizzato</p>
          <p className="text-app-secondary text-sm mb-6">La tua email non è stata autorizzata. Contatta il consorzio per ottenere l'accesso.</p>
          <button onClick={() => base44.auth.logout()} className="px-6 py-2 bg-red-500 text-app-inverse rounded-lg text-sm font-semibold">Esci</button>
        </div>
      </div>
    );
  }

  // Utente senza dati (non ancora caricato)
  if (!effectiveUser) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-app-primary text-lg font-bold mb-2">Sessione scaduta</p>
          <p className="text-app-secondary text-sm mb-6">Effettua nuovamente l'accesso.</p>
          <button onClick={() => base44.auth.redirectToLogin()} className="px-6 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: 'var(--app-accent-secondary)', color: 'var(--app-text-inverse)' }}>Accedi</button>
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ backgroundColor: 'var(--app-bg)' }}>
      
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ background: 'linear-gradient(to bottom right, var(--app-accent), #b8860b)', boxShadow: `0 10px 25px ${isDark ? 'rgba(212,175,55,0.2)' : 'rgba(161,128,30,0.15)'}` }}>
              <Target className="w-7 h-7" style={{ color: 'var(--app-text-inverse)' }} />
            </div>
            <h1 className="text-xl font-bold text-center mb-1.5 leading-tight" style={{ color: 'var(--app-text-primary)' }}>
              Come posso aiutarti oggi?
            </h1>


          </div>
        ) : (
          // Conversazione attiva
          <div ref={messagesContainerRef} className="flex-1 overflow-y-scroll px-4" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', paddingTop: '56px', paddingBottom: '200px' }}>
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
                  const textContent = typeof msg.content === 'object' && msg.content !== null
                    ? (msg.content.risposta || msg.content.sintesi_decisionale || JSON.stringify(msg.content))
                    : (msg.content || '');
                  
                  return (
                  <div key={i} ref={isLastAssistant ? lastAssistantMsgRef : null} className="space-y-3">
                  <SimpleAIResponse 
                    content={{ risposta: textContent }} 
                    onFollowup={(text) => handleSend(text)} 
                    conversationId={activeConversationId}
                    isNew={!!msg.isNew && !msg.isStreaming}
                    isStreaming={!!msg.isStreaming}
                    entertainQuestions={isLastAssistant && msg.isStreaming ? entertainQuestions : ''}
                    contextQuestion={isLastAssistant && (msg.isStreaming || msg.isNew) ? contextQuestion : ''}
                    userMessage={(() => { const prevUser = messages.slice(0, i).filter(m => m.role === 'user').pop(); return prevUser?.content || ''; })()}
                    webSearchLoading={isLastAssistant ? webSearchLoading : false}
                    webSearchResult={isLastAssistant ? webSearchResult : null}
                        onContextSelect={(q) => {
                          if (isStreaming || isTyping) {
                            // L'utente ha scelto un'opzione mentre l'AI sta ancora rispondendo
                            // Salva la selezione — quando lo streaming finisce, verrà inviata come followup
                            setPendingContextAnswer(q);
                            pendingContextRef.current = q;
                            setContextQuestion('');
                          } else {
                            setContextQuestion('');
                            handleSend(q);
                          }
                        }}
                      />

                    </div>
                  );
                }
                return (
                  <div key={i} ref={isLastUser ? lastUserMsgRef : null}>
                    <ChatMessage message={msg} onEdit={(text) => setInputText(text)} />
                  </div>
                );
              })}

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
          className="fixed z-50 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full border flex items-center justify-center shadow-lg backdrop-blur-sm transition-all"
          style={{ backgroundColor: 'var(--app-bg-card)', borderColor: 'var(--app-border)' }}
          style={{ bottom: '180px' }}
        >
          <ArrowUp className="w-4 h-4 text-app-secondary rotate-180" />
        </button>
      )}

      {/* Campo di input */}
      <div className="fixed z-40 px-2 pb-2 pt-10 left-0 right-0" style={{ bottom: '100px', background: `linear-gradient(to top, var(--app-bg) 80%, transparent 100%)` }}>
        <div className="max-w-2xl mx-auto space-y-1.5">
          <AIUsageInline usate={consulenzeUsate} piano={pianoAbbonamento} />
          {!compareMode ? (
            <>
              <div className="flex items-end gap-2">
                <div className="flex-1 relative flex flex-col rounded-xl backdrop-blur-lg overflow-hidden" style={{ border: `1px solid ${isRecording ? '#ef4444' : 'var(--app-border)'}`, backgroundColor: 'var(--app-bg-input)' }}>
                  {/* File allegati preview */}
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-2 pt-2">
                      {attachedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-secondary" style={{ backgroundColor: 'var(--app-bg-card)' }}>
                          <span className="truncate max-w-[120px]">{f.name}</span>
                          <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-app-muted hover:text-app-primary">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end">
                  <AttachmentMenu
                    disabled={isTyping}
                    onFileUploaded={(url, name) => setAttachedFiles(prev => [...prev, { url, name }])}
                  />
                  <button
                    onClick={toggleRecording}
                    className="flex-shrink-0 mb-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{ backgroundColor: isRecording ? '#ef4444' : 'transparent' }}
                  >
                    {isRecording ? (
                      <MicOff className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-app-muted" />
                    )}
                  </button>
                  <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 220) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={isRecording ? "Sto ascoltando..." : "Chiedi qualsiasi cosa..."}
                    rows={1}
                    className="flex-1 bg-transparent text-base px-2 py-2.5 resize-none outline-none"
                    style={{ scrollbarWidth: 'none', maxHeight: '220px', overflow: 'auto', color: 'var(--app-text-primary)', '::placeholder': { color: 'var(--app-text-muted)' } }}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isTyping || chatBlocked}
                    className="flex-shrink-0 m-1 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                    style={{
                      backgroundColor: inputText.trim() && !isTyping && !chatBlocked ? 'var(--app-accent)' : 'var(--app-btn-disabled-bg)',
                    }}
                  >
                    {isTyping ? (
                      <Loader2 className="w-4 h-4 text-app-muted animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-white" />
                    )}
                  </button>
                  </div>
                </div>
                {/* Pupino My Profilo */}
                <button
                  onClick={() => navigate(createPageUrl('MyProfile'))}
                  className="flex-shrink-0 w-10 h-10 rounded-xl backdrop-blur-lg flex items-center justify-center active:scale-95 transition-transform mb-0.5"
                  style={{ border: '1px solid var(--app-border)', backgroundColor: 'var(--app-bg-input)' }}
                >
                  <UserRound className="w-5 h-5" style={{ color: 'var(--app-text-secondary)' }} />
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl backdrop-blur-lg p-4 space-y-3 relative" style={{ border: '1px solid var(--app-border-accent)', backgroundColor: 'var(--app-bg-card)' }}>
              {/* X per chiudere */}
              <button
                onClick={() => { setCompareMode(false); setScenarioA(''); setScenarioB(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--app-bg-card-hover)' }}
              >
                <X className="w-4 h-4 text-app-secondary" />
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
                  className="flex-1 rounded-xl text-app-primary text-sm px-3 py-2.5 resize-none outline-none"
                  style={{ backgroundColor: 'var(--app-bg-input)', border: '1px solid var(--app-border)' }}
                  style={{ scrollbarWidth: 'none' }}
                />
                <textarea
                  value={scenarioB}
                  onChange={(e) => setScenarioB(e.target.value)}
                  placeholder="Scenario B (es. Usare freelance)"
                  rows={2}
                  className="flex-1 rounded-xl text-app-primary text-sm px-3 py-2.5 resize-none outline-none"
                  style={{ backgroundColor: 'var(--app-bg-input)', border: '1px solid var(--app-border)' }}
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
      <BottomNav currentPage="Home" onMenuOpen={() => window.location.href = createPageUrl('MyProfile')} menuOpen={false} bgColor={null} consulenzeUsate={consulenzeUsate} maxConsulenze={50} userEmail={effectiveUser?.email} />


    </div>
  );
}