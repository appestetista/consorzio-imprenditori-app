import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send, Sparkles, ArrowUp, Loader2, Menu, Mic, MicOff, X, LogOut, Settings, User, Eye, Phone, XCircle, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser, isUserConsultant } from '../components/utils/normalizeUser';
import { cn } from '@/lib/utils';
import BottomNav from '../components/layout/BottomNav';
import ChatMessage from '../components/home/ChatMessage';
import DecisionResponse from '../components/home/DecisionResponse';
import ChatSidebar from '../components/home/ChatSidebar';
import ProfileOnboardingModal from '../components/home/ProfileOnboardingModal';
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

  const runAnalysis = async ({ msg, category, sottocategoria, newMessages, convId }) => {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Categoria identificata: ${category} — ${sottocategoria}.

Agisci come un consulente strategico per imprenditori italiani di PMI con responsabilità fiscale e finanziaria.

Ogni richiesta deve essere analizzata con logica imprenditoriale.

Valuta sempre obbligatoriamente:
- Impatto sul flusso di cassa
- Ritorno sull'investimento (ROI)
- Rischio normativo e fiscale
- Scalabilità
- Tempo di implementazione

Fornisci numeri stimati quando possibile.
Evita risposte teoriche.
Evita consigli vaghi.
Fornisci solo analisi operative.

Non usare tono da assistente virtuale.
Non dire mai "come modello AI".
Non fornire disclaimer legali automatici.
Mantieni linguaggio professionale, concreto e orientato al risultato.

Richiesta dell'imprenditore: ${msg}

FORMATO OBBLIGATORIO: Rispondi SOLO con un oggetto JSON valido. Nessun testo prima o dopo il JSON. Nessun markdown. Nessun backtick. Le chiavi devono essere: categoria, sintesi_decisionale, impatto_economico, rischi_criticita, tempo_attuazione, raccomandazione_finale, followup_questions (lista di 3 domande pertinenti)`,
      response_json_schema: {
        type: "object",
        properties: {
          categoria: { type: "string" },
          sintesi_decisionale: { type: "string" },
          impatto_economico: { type: "string" },
          rischi_criticita: { type: "string" },
          tempo_attuazione: { type: "string" },
          raccomandazione_finale: { type: "string" },
          followup_questions: { type: "array", items: { type: "string" } }
        },
        required: ["categoria", "sintesi_decisionale", "impatto_economico", "rischi_criticita", "tempo_attuazione", "raccomandazione_finale", "followup_questions"]
      }
    });

    const assistantMsg = { role: 'assistant', content: result };
    const updatedMessages = [...newMessages, assistantMsg];
    setMessages(updatedMessages);
    await base44.entities.ChatConversation.update(convId, { messages: updatedMessages });
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
      const classificazione = await base44.integrations.Core.InvokeLLM({
        prompt: `Classifica questa richiesta in UNA sola categoria tra: Fiscale, Legale, Marketing, Personale/HR, Investimenti, Operativa, Strategica. Rispondi SOLO con un JSON: {"categoria": "nome", "confidenza": 85, "sottocategoria": "specifica"}

Richiesta: "${msg}"`,
        response_json_schema: {
          type: "object",
          properties: {
            categoria: { type: "string" },
            confidenza: { type: "number" },
            sottocategoria: { type: "string" }
          },
          required: ["categoria", "confidenza", "sottocategoria"]
        }
      });
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
      await runAnalysis({ msg, category, sottocategoria, newMessages, convId });
    } catch (e) {
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
      const updatedMessages = [...newMessages, errMsg];
      setMessages(updatedMessages);
      await base44.entities.ChatConversation.update(convId, { messages: updatedMessages });
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
    setInputText('');
  };

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setInputText('');
  };

  // Notifiche non lette per badge messaggi
  const { data: notifications = [] } = useRQQuery({
    queryKey: ['home-notifications', effectiveUser?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
    refetchInterval: 10000,
  });
  const unreadCount = notifications.length;

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

          {/* Destra: messaggi */}
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

        {!hasMessages ? (
          // Stato iniziale
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center mb-5 shadow-lg shadow-[#d4af37]/20">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white text-xl font-bold text-center mb-2 leading-tight">
              Centro Decisionale Imprenditore
            </h1>
            <p className="text-slate-400 text-sm text-center mb-6 max-w-xs leading-relaxed">
              Analizza rischi, costi e opportunità prima di decidere.
            </p>
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
                ) : msg.role === 'assistant' ? (
                  <DecisionResponse key={i} message={msg} category={lastCategory} classification={lastClassification} onFollowup={(text) => handleSend(text)} />
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
              placeholder={isRecording ? "Sto ascoltando..." : "Descrivi una decisione aziendale o un problema operativo…"}
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
          <p className="text-center text-[11px] text-slate-500 mt-2">
            Ogni analisi valuta ROI, rischio e impatto sul flusso di cassa.
          </p>
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

      {/* Bottom Nav */}
      <BottomNav currentPage="Home" onMenuOpen={() => setMenuOpen(true)} />

      {/* Onboarding Modal */}
      {showOnboarding && (
        <ProfileOnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}