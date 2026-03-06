import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Star, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StreamingReveal from './StreamingReveal';
import AIThinkingAnimation from './AIThinkingAnimation';
import ContextFollowup from './ContextFollowup';
import EntertainQuestions from './EntertainQuestions';

function RatingInline({ conversationId }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);

  const handleRate = async (value) => {
    setRating(value);
    setSaved(true);
    if (conversationId) {
      await base44.entities.ChatConversation.update(conversationId, { rating: value });
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !conversationId) return;
    setSendingComment(true);
    await base44.entities.ChatConversation.update(conversationId, { commento_feedback: comment.trim() });
    setSendingComment(false);
    setCommentSent(true);
  };

  if (!conversationId) return null;

  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-slate-500">Utile?</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => handleRate(v)}
            onMouseEnter={() => setHovered(v)}
            onMouseLeave={() => setHovered(0)}
            disabled={saved}
            className="p-0.5 transition-transform hover:scale-110 disabled:hover:scale-100"
          >
            <Star
              className="w-4 h-4 transition-colors"
              fill={(hovered || rating) >= v ? '#d4af37' : 'transparent'}
              stroke={(hovered || rating) >= v ? '#d4af37' : '#475569'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      {saved && rating <= 2 && !commentSent && (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cosa migliorare?"
            className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#d4af37]/50"
          />
          <button
            onClick={handleSendComment}
            disabled={!comment.trim() || sendingComment}
            className="p-1.5 rounded-lg bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30 transition-colors disabled:opacity-40"
          >
            {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      {saved && rating <= 2 && commentSent && <span className="text-[11px] text-slate-500">Grazie!</span>}
      {saved && rating >= 3 && <span className="text-[11px] text-slate-500">Grazie!</span>}
    </div>
  );
}

const markdownComponents = {
  p: ({ children }) => <p className="my-2 text-[17px] leading-[1.7]">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1.5">{children}</ol>,
  li: ({ children }) => <li className="my-0.5 text-[17px] leading-[1.7]">{children}</li>,
  strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
  h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-5 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-[#d4af37] mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[17px] font-semibold text-white mt-4 mb-1.5">{children}</h3>,
  a: ({ children, ...props }) => (
    <a {...props} className="text-[#d4af37] underline" target="_blank" rel="noopener noreferrer">{children}</a>
  ),
  img: (imgProps) => (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/40">
      <img src={imgProps.src} alt={imgProps.alt || ''} className="w-full max-h-[400px] object-contain bg-slate-900/50" loading="lazy" />
      {imgProps.alt && <p className="text-xs text-slate-400 px-3 py-1.5 bg-slate-800/60 italic">{imgProps.alt}</p>}
    </div>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#d4af37]/50 pl-3 my-2 text-slate-300 italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) => inline ? (
    <code className="px-1 py-0.5 rounded bg-slate-700 text-slate-200 text-xs">{children}</code>
  ) : (
    <pre className="bg-slate-900 rounded-lg p-3 overflow-x-auto my-2">
      <code className="text-xs text-slate-200">{children}</code>
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-slate-700/60">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-700/50 text-[#d4af37]">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-700/40">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-slate-700/20 transition-colors">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 font-semibold text-sm whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-slate-300">{children}</td>,
};

/**
 * Estrae i suggerimenti dalla sezione SUGGERIMENTI a fine risposta.
 * Restituisce { cleanText, suggestions } dove cleanText è senza la sezione e suggestions è un array.
 */
function extractSuggestions(text) {
  if (!text) return { cleanText: '', suggestions: [] };
  
  // Cerca la sezione SUGGERIMENTI (con o senza ---) alla fine del testo
  const sugPattern = /\n---\s*\n\*\*SUGGERIMENTI\*\*\s*\n([\s\S]*?)$/i;
  const sugPattern2 = /\n\*\*SUGGERIMENTI\*\*\s*\n([\s\S]*?)$/i;
  
  let match = text.match(sugPattern) || text.match(sugPattern2);
  if (!match) return { cleanText: text, suggestions: [] };
  
  const sugBlock = match[1].trim();
  const cleanText = text.substring(0, match.index).trimEnd();
  
  // Estrai le singole voci numerate
  const lines = sugBlock.split('\n').filter(l => l.trim());
  const suggestions = [];
  for (const line of lines) {
    const cleaned = line.replace(/^\d+\.\s*/, '').trim();
    if (cleaned && cleaned.length > 5) {
      suggestions.push(cleaned);
    }
  }
  
  return { cleanText, suggestions: suggestions.slice(0, 2) };
}

export default function SimpleAIResponse({ content, onFollowup, conversationId, isNew = false, isStreaming = false, contextQuestion = '', entertainQuestions = '', onContextSelect }) {
  const rawRisposta = content?.risposta || '';
  const { cleanText: fullRisposta, suggestions } = useMemo(() => extractSuggestions(rawRisposta), [rawRisposta]);
  const followups = content?.followup_questions || [];

  // ── Stato per animazione "pensiero" + typewriter ──
  const [thinkingDone, setThinkingDone] = useState(!isStreaming && !isNew);
  const [displayedText, setDisplayedText] = useState(!isStreaming && !isNew ? fullRisposta : '');
  const [typewriterDone, setTypewriterDone] = useState(!isStreaming && !isNew);
  const prevLengthRef = useRef(0);
  const typewriterRef = useRef(null);

  // Quando il thinking finisce, inizia il typewriter
  const handleThinkingFinished = useCallback(() => {
    setThinkingDone(true);
  }, []);

  // L'animazione viene chiusa (dismiss) solo quando arriva testo reale dal backend
  const shouldDismissThinking = !thinkingDone && !!fullRisposta && fullRisposta.length > 0;

  // Typewriter: rivela il testo carattere per carattere man mano che arriva
  useEffect(() => {
    if (!thinkingDone) return;
    if (!fullRisposta) return;

    // Se non è streaming e non è nuovo, mostra tutto subito
    if (!isStreaming && !isNew) {
      setDisplayedText(fullRisposta);
      setTypewriterDone(true);
      return;
    }

    // Typewriter incrementale: aggiungi i nuovi caratteri uno alla volta
    const targetLength = fullRisposta.length;
    if (targetLength <= prevLengthRef.current && displayedText.length >= targetLength) return;

    // Pulisci timer precedente
    if (typewriterRef.current) clearInterval(typewriterRef.current);

    let currentIdx = displayedText.length;
    typewriterRef.current = setInterval(() => {
      const currentTarget = fullRisposta.length; // può crescere nel frattempo
      if (currentIdx >= currentTarget) {
        // Se lo streaming è finito e abbiamo raggiunto la fine
        if (!isStreaming) {
          clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          setTypewriterDone(true);
        }
        return;
      }
      // Velocità variabile per effetto scrittura naturale
      const nextChar = fullRisposta[currentIdx] || '';
      // Pausa più lunga dopo punteggiatura, più breve su lettere normali
      let step = 1;
      if (nextChar === ' ') step = 2;
      if (nextChar === '\n') step = 1;
      step = Math.min(step, currentTarget - currentIdx);
      currentIdx += step;
      const slice = fullRisposta.substring(0, currentIdx);
      setDisplayedText(slice);
      prevLengthRef.current = currentIdx;
    }, 6);

    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
    };
  }, [thinkingDone, fullRisposta, isStreaming, isNew]);

  // Cleanup quando lo streaming finisce: rivela il testo rimanente
  useEffect(() => {
    if (!isStreaming && thinkingDone && fullRisposta && displayedText.length < fullRisposta.length) {
      // Lo streaming è finito, lascia il typewriter finire il rimanente
      // Non fare nulla, il typewriter lo gestisce
    }
  }, [isStreaming]);

  // ── Fase 1: Animazione pensiero — frasi rotanti + puntini nella bolla + domande propositives ──
  if (isStreaming && !thinkingDone) {
    return (
      <div className="space-y-4">
        {/* Animazione centrale con frasi */}
        <AIThinkingAnimation onFinished={handleThinkingFinished} dismiss={shouldDismissThinking} />
        {/* Domanda di chiarimento con opzioni — appare durante l'attesa */}
        {contextQuestion && (
          <ContextFollowup
            question={contextQuestion}
            visible={!!contextQuestion}
            onSelect={(q) => onContextSelect?.(q)}
          />
        )}
        {/* Bolla con puntini che ballano */}
        <div className="flex items-start gap-3" style={{ touchAction: 'pan-y' }}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 max-w-[92%]">
            <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 px-5 py-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Fase 2: Typewriter in corso ──
  if (isStreaming || (isNew && !typewriterDone)) {
    return (
      <div className="flex items-start gap-3" style={{ touchAction: 'pan-y' }}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 max-w-[92%]">
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 px-5 py-4">
            {displayedText ? (
              <div className="relative">
                <ReactMarkdown
                  className="text-[17px] text-slate-200 leading-[1.7] prose prose-base prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={markdownComponents}
                >
                  {displayedText}
                </ReactMarkdown>
                <span className="inline-block w-0.5 h-4 bg-[#d4af37] animate-pulse ml-0.5 -mb-0.5" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Fase 3: Risposta completa ──
  return (
    <div className="flex items-start gap-3" style={{ touchAction: 'pan-y' }}>
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[92%] space-y-3">
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 px-5 py-4">
          <ReactMarkdown
            className="text-[17px] text-slate-200 leading-[1.7] prose prose-base prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={markdownComponents}
          >
            {fullRisposta}
          </ReactMarkdown>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            {suggestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onFollowup?.(q)}
                className="text-left text-sm text-white px-4 py-2.5 rounded-xl border border-slate-600/50 bg-transparent hover:border-[#d4af37]/60 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <RatingInline conversationId={conversationId} />
      </div>
    </div>
  );
}