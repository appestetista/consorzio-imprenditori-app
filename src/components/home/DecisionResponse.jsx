import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Target, TrendingUp, AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

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

export default function DecisionResponse({ message, category }) {
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
        {category && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30">
            <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
            <span className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">{category}</span>
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

        {/* CTA piano operativo */}
        {showPlanCTA && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">Vuoi trasformare questa analisi in piano operativo?</span>
            <ArrowRight className="w-4 h-4 text-[#d4af37]" />
          </div>
        )}
      </div>
    </div>
  );
}