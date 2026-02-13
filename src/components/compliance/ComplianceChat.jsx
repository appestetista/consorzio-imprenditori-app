import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, MessageCircle, X, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

export default function ComplianceChat({ effectiveUser, norms = [], branches = [] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const buildContext = () => {
    const branchInfo = branches.map(b => 
      `- ${b.nome}: ${b.tipo_attivita}, ATECO ${b.codice_ateco || 'N/A'}, ${b.numero_dipendenti || '?'} dipendenti`
    ).join('\n');

    const nonConformi = norms.filter(n => n.stato === 'non_conforme');
    const daMigliorare = norms.filter(n => n.stato === 'da_migliorare');
    const nonVerificati = norms.filter(n => !n.documenti_urls?.length);

    let normSummary = `Totale adempimenti: ${norms.length}\n`;
    normSummary += `Non conformi: ${nonConformi.length}\n`;
    normSummary += `Da migliorare: ${daMigliorare.length}\n`;
    normSummary += `Non verificati (senza documenti): ${nonVerificati.length}\n`;
    
    if (nonConformi.length > 0) {
      normSummary += `\nAdempimenti NON CONFORMI:\n`;
      nonConformi.forEach(n => {
        normSummary += `- ${n.nome} (${n.categoria})${n.sanzione_prevista ? ' — Sanzione: ' + n.sanzione_prevista : ''}\n`;
      });
    }

    return `
DATI AZIENDA:
- Ragione sociale: ${effectiveUser?.company_name || 'Non specificata'}
- Email: ${effectiveUser?.email || 'N/A'}
- Codice ATECO: ${effectiveUser?.ateco_code || 'Non specificato'}
- Regione: ${effectiveUser?.region || 'Non specificata'}

RAMI AZIENDALI:
${branchInfo || 'Nessun ramo configurato'}

STATO COMPLIANCE:
${normSummary}`;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const conversationHistory = messages.map(m => 
      `${m.role === 'user' ? 'UTENTE' : 'ASSISTENTE'}: ${m.content}`
    ).join('\n\n');

    const prompt = `Sei un consulente esperto di compliance aziendale italiana. Rispondi SEMPRE in italiano.
Sei specializzato in: sicurezza sul lavoro (D.Lgs. 81/08), privacy (GDPR), normativa ambientale (D.Lgs. 152/06), antincendio, HACCP, fiscalità.

REGOLE:
- Cita SEMPRE i riferimenti normativi precisi (articoli di legge, decreti)
- Indica le sanzioni previste quando pertinente
- Usa un linguaggio chiaro ma professionale
- Se non sei sicuro, dillo chiaramente
- Rispondi in modo conciso ma completo
- Cerca contesto aggiornato da internet quando serve per normative recenti

CONTESTO AZIENDA DELL'UTENTE:
${buildContext()}

${conversationHistory ? `CONVERSAZIONE PRECEDENTE:\n${conversationHistory}\n\n` : ''}DOMANDA DELL'UTENTE: ${text}`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Errore chat:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Si è verificato un errore. Riprova tra qualche secondo.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-28 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          boxShadow: '0 4px 20px rgba(34,197,94,0.4)'
        }}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Assistente Compliance</h3>
            <p className="text-slate-400 text-xs">Chiedi su normative, sanzioni, adempimenti</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Cancella chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">Come posso aiutarti?</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
              Chiedi qualsiasi cosa su normative, sanzioni, adempimenti obbligatori per la tua azienda.
            </p>
            <div className="space-y-2 max-w-xs mx-auto">
              {[
                "Quali sanzioni rischio senza il DVR?",
                "Quando devo rinnovare il corso antincendio?",
                "Serve il medico competente nel mio caso?",
                "Cosa prevede il GDPR per la mia azienda?"
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(suggestion); }}
                  className="w-full text-left bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-300 text-sm hover:border-green-500/50 hover:bg-slate-800/80 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-green-600 text-white' 
                : 'bg-slate-800 border border-slate-700'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <div className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="my-1.5 text-slate-200 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="text-green-400 font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc text-slate-300">{children}</ul>,
                      ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal text-slate-300">{children}</ol>,
                      li: ({ children }) => <li className="my-0.5">{children}</li>,
                      h1: ({ children }) => <h1 className="text-base font-bold text-white my-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold text-white my-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold text-white my-1.5">{children}</h3>,
                      code: ({ children }) => <code className="bg-slate-900 px-1.5 py-0.5 rounded text-green-400 text-xs">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-green-500 pl-3 my-2 text-slate-400 italic">{children}</blockquote>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
              <span className="text-slate-400 text-sm">Sto cercando informazioni...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 bg-slate-800 px-4 py-3 pb-safe">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Scrivi la tua domanda..."
            rows={1}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 resize-none focus:outline-none focus:border-green-500/50 max-h-32"
            style={{ minHeight: '44px' }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-11 w-11 rounded-xl p-0 bg-green-600 hover:bg-green-700 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}