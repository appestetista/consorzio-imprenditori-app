import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send, Sparkles, ArrowUp, Loader2, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser } from '../components/utils/normalizeUser';
import BottomNav from '../components/layout/BottomNav';
import ChatMessage from '../components/home/ChatMessage';
import ChatSidebar from '../components/home/ChatSidebar';
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
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un assistente esperto per imprenditori e consulenti di un consorzio aziendale italiano. L'utente ti chiede aiuto su un problema aziendale. Rispondi in modo chiaro, pratico e conciso in italiano. Se il problema rientra in una delle sezioni disponibili nell'app (consulenze, bandi, fornitori, risparmio energetico, analisi contratti, welfare, simulatore fiscale, compliance, marketplace, import/export), suggerisci anche di visitare la sezione corrispondente nell'area Esplora dell'app.

Domanda dell'utente: ${msg}`,
      });

      const assistantMsg = { role: 'assistant', content: result };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      await base44.entities.ChatConversation.update(convId, { messages: updatedMessages });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
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
        
        {/* Top bar con hamburger */}
        <div className="flex items-center px-4 pt-4 pb-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {!hasMessages ? (
          // Stato iniziale
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center mb-6 shadow-lg shadow-[#d4af37]/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white text-2xl font-bold text-center mb-8 leading-tight">
              Scrivi il problema. Ti aiutiamo a risolverlo!
            </h1>
          </div>
        ) : (
          // Conversazione attiva
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-32">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
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
          <div className="relative flex items-end rounded-2xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-lg overflow-hidden">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descrivi il tuo problema..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm px-4 py-3.5 resize-none outline-none placeholder:text-slate-500 max-h-32"
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
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav currentPage="Home" />
    </div>
  );
}