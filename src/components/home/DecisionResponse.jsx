import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import { Sparkles, Target, TrendingUp, AlertTriangle, Clock, CheckCircle2, ArrowRight, Star, Send, Loader2 } from 'lucide-react';

const SECTIONS = [
  { key: 'sintesi', label: 'Sintesi Decisionale', icon: Target, color: 'text-[#d4af37]', bg: 'bg-[#d4af37]/10', border: 'border-[#d4af37]/30' },
  { key: 'impatto', label: 'Impatto Economico Stimato', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  { key: 'rischi', label: 'Rischi e Criticità', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  { key: 'tempo', label: 'Tempo di Attuazione', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { key: 'raccomandazione', label: 'Raccomandazione Finale', icon: CheckCircle2, color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/30' },
];

function parseStructuredResponse(content) {
  if (!content) return null;

  // Prova JSON.parse diretto (content può essere stringa JSON o già oggetto)
  let json = null;
  if (typeof content === 'object' && content !== null) {
    json = content;
  } else if (typeof content === 'string') {
    try {
      json = JSON.parse(content);
    } catch (e) {
      // Non è JSON valido
    }
  }

  if (json && json.sintesi_decisionale && json.impatto_economico && json.rischi_criticita && json.tempo_attuazione && json.raccomandazione_finale) {
    return {
      sintesi: json.sintesi_decisionale,
      impatto: json.impatto_economico,
      rischi: json.rischi_criticita,
      tempo: json.tempo_attuazione,
      raccomandazione: json.raccomandazione_finale,
      followup_questions: json.followup_questions || [],
    };
  }

  return null;
}

function RatingSection({ conversationId }) {
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
    <div className="mt-2 pt-3 border-t border-slate-700/30">
      <p className="text-[11px] text-slate-500 mb-2">Quanto è utile questa analisi?</p>
      <div className="flex items-center gap-1 mb-2">
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
              className="w-5 h-5 transition-colors"
              fill={(hovered || rating) >= v ? '#C8A951' : 'transparent'}
              stroke={(hovered || rating) >= v ? '#C8A951' : '#475569'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {saved && rating <= 2 && !commentSent && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cosa potremmo migliorare?"
            className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#C8A951]/50"
          />
          <button
            onClick={handleSendComment}
            disabled={!comment.trim() || sendingComment}
            className="p-1.5 rounded-lg bg-[#C8A951]/20 text-[#C8A951] hover:bg-[#C8A951]/30 transition-colors disabled:opacity-40"
          >
            {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {saved && rating <= 2 && commentSent && (
        <p className="text-[11px] text-slate-500">Grazie per il feedback!</p>
      )}

      {saved && rating >= 4 && (
        <p className="text-[11px] text-slate-500">Grazie! Analisi salvata nel tuo storico.</p>
      )}

      {saved && rating === 3 && (
        <p className="text-[11px] text-slate-500">Grazie per la valutazione.</p>
      )}
    </div>
  );
}

export default function DecisionResponse({ message, category, classification, onFollowup, conversationId }) {
  const [showPlanCTA, setShowPlanCTA] = useState(true);
  const parsed = parseStructuredResponse(message.content);

  if (!parsed) {
    // Fallback: render come markdown normale
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="max-w-[85%] bg-slate-800/60 rounded-2xl rounded-tl-sm px-4 py-3">
          <ReactMarkdown
            className="text-sm text-slate-200 leading-relaxed prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
              strong: ({ children }) => <strong className="text-[#d4af37] font-semibold">{children}</strong>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[92%] space-y-3">
        {/* Category badge */}
        {(classification?.categoria || category) && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
            <span className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">
              {classification?.categoria || category}{classification?.sottocategoria ? ` — ${classification.sottocategoria}` : ''}
            </span>
          </div>
        )}

        {/* Structured sections */}
        {SECTIONS.map((section) => {
          const content = parsed[section.key];
          if (!content) return null;
          const Icon = section.icon;

          return (
            <div key={section.key} className={`rounded-xl border ${section.border} ${section.bg} px-4 py-3`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${section.color}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${section.color}`}>{section.label}</span>
              </div>
              <ReactMarkdown
                className="text-sm text-slate-200 leading-relaxed prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          );
        })}

        {/* Follow-up questions */}
        {parsed.followup_questions?.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {parsed.followup_questions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => onFollowup?.(q)}
                className="text-left text-sm text-white px-4 py-2.5 rounded-xl border border-slate-600/50 bg-transparent hover:border-[#C8A951] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* CTA piano operativo */}
        {showPlanCTA && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">Vuoi trasformare questa analisi in piano operativo?</span>
            <ArrowRight className="w-4 h-4 text-[#d4af37]" />
          </div>
        )}

        {/* Rating */}
        <RatingSection conversationId={conversationId} />
      </div>
    </div>
  );
}