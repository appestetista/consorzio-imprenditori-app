import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  Sparkles, Target, TrendingUp, AlertTriangle, Clock, CheckCircle2,
  Star, Send, Loader2, ListChecks, Download, ArrowRight,
  Globe, Landmark, BookOpen, Newspaper, Wrench, HelpCircle, TriangleAlert
} from 'lucide-react';
import OperationalPlan from './OperationalPlan';
import generateAnalysisPdf from './generateAnalysisPdf';
import StreamingReveal from './StreamingReveal';

// Colori badge categoria
const CATEGORY_COLORS = {
  'Fiscale':       { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  'Legale':        { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  'Marketing':     { bg: 'bg-violet-500/15', border: 'border-violet-500/30', text: 'text-violet-400', dot: 'bg-violet-400' },
  'Personale/HR':  { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  'Investimenti':  { bg: 'bg-[#d4af37]/15', border: 'border-[#d4af37]/30', text: 'text-[#d4af37]', dot: 'bg-[#d4af37]' },
  'Operativa':     { bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  'Strategica':    { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
  'Confronto':     { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-400', dot: 'bg-indigo-400' },
};
const DEFAULT_CAT_COLOR = { bg: 'bg-slate-500/15', border: 'border-slate-500/30', text: 'text-slate-400', dot: 'bg-slate-400' };

// Trasforma tag inline in badge
function renderTaggedText(text) {
  if (!text || typeof text !== 'string') return text;
  // Regex per i tag
  const regex = /\[(VERIFICATO)\s*[—–-]\s*([^\]]+)\]|\[(STIMA)\s*[—–-]\s*([^\]]+)\]|\[(STIMA)\]|\[(DA CONFERMARE)\s*[—–-]\s*([^\]]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] === 'VERIFICATO') {
      parts.push(
        <span key={match.index} className="inline-flex items-center gap-1 mx-0.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
          <span className="text-[10px] text-emerald-400">{match[2]}</span>
        </span>
      );
    } else if (match[3] === 'STIMA') {
      parts.push(
        <span key={match.index} className="inline-flex items-center gap-1 mx-0.5">
          <TriangleAlert className="w-3 h-3 text-yellow-400 inline" />
          <span className="text-[10px] text-yellow-400">{match[4]}</span>
        </span>
      );
    } else if (match[5] === 'STIMA') {
      parts.push(
        <span key={match.index} className="inline-flex items-center mx-0.5">
          <TriangleAlert className="w-3 h-3 text-yellow-400 inline" />
        </span>
      );
    } else if (match[6] === 'DA CONFERMARE') {
      parts.push(
        <span key={match.index} className="inline-flex items-center gap-1 mx-0.5">
          <HelpCircle className="w-3 h-3 text-red-400 inline" />
          <span className="text-[10px] text-red-400">{match[7]}</span>
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

// Componente testo con tag
function TaggedContent({ text }) {
  if (!text) return null;
  const hasTag = /\[(VERIFICATO|STIMA|DA CONFERMARE)/.test(text);
  if (!hasTag) {
    return (
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
        {text}
      </ReactMarkdown>
    );
  }
  // Splitta per righe e rende tag inline
  const lines = text.split('\n');
  return (
    <div className="text-sm text-slate-200 leading-relaxed space-y-1">
      {lines.map((line, i) => (
        <p key={i}>{renderTaggedText(line)}</p>
      ))}
    </div>
  );
}

// Barra affidabilità
function AffidabilitaBar({ affidabilita }) {
  const punteggio = affidabilita?.punteggio ?? 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(punteggio * 10), 50);
    return () => clearTimeout(t);
  }, [punteggio]);

  if (!affidabilita) return null;

  let barColor, label;
  if (punteggio >= 8) { barColor = '#22c55e'; label = 'Alta affidabilità — Dati verificati'; }
  else if (punteggio >= 5) { barColor = '#f59e0b'; label = 'Media affidabilità — Alcuni dati stimati'; }
  else { barColor = '#ef4444'; label = 'Bassa affidabilità — Verifica necessaria'; }

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className="text-xs font-bold" style={{ color: barColor }}>{punteggio}/10</span>
      </div>
      <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex items-center gap-4 mt-2">
        {affidabilita.verificati != null && (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {affidabilita.verificati} verificati
          </span>
        )}
        {affidabilita.stimati != null && (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> {affidabilita.stimati} stimati
          </span>
        )}
        {affidabilita.da_confermare != null && (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {affidabilita.da_confermare} da confermare
          </span>
        )}
      </div>
    </div>
  );
}

// Fonti
function FontiSection({ fonti }) {
  if (!fonti || fonti.length === 0) return null;
  const tipoIcon = (tipo) => {
    if (tipo === 'istituzionale') return <Landmark className="w-3.5 h-3.5 text-slate-400" />;
    if (tipo === 'specializzata') return <BookOpen className="w-3.5 h-3.5 text-slate-400" />;
    if (tipo === 'media') return <Newspaper className="w-3.5 h-3.5 text-slate-400" />;
    return <Globe className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Fonti consultate</span>
      </div>
      <div className="space-y-1.5">
        {fonti.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            {tipoIcon(f.tipo)}
            <span className="text-xs text-slate-300">{f.nome}</span>
            {f.url && (
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#d4af37] hover:underline truncate max-w-[180px]">
                {f.url}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Strumento correlato
function StrumentoCorrelato({ strumento }) {
  const navigate = useNavigate();
  if (!strumento || !strumento.nome) return null;

  const handleNavigate = () => {
    let url = createPageUrl(strumento.pagina);
    const paramsObj = strumento.parametri_utente || {};
    if (Object.keys(paramsObj).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(paramsObj).forEach(([key, val]) => {
        if (val) searchParams.set(key, String(val));
      });
      searchParams.set('from_chat', '1');
      url += (url.includes('?') ? '&' : '?') + searchParams.toString();
    }
    navigate(url);
  };

  const hasParams = strumento.parametri_utente && Object.keys(strumento.parametri_utente).length > 0;

  return (
    <div onClick={handleNavigate} className="rounded-xl border border-[#d4af37]/50 bg-gradient-to-r from-[#d4af37]/10 to-transparent px-4 py-3 cursor-pointer hover:border-[#d4af37] transition-all group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#d4af37]/30 transition-colors">
          <Wrench className="w-5 h-5 text-[#d4af37]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-[#d4af37]">{strumento.nome}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] font-semibold uppercase">Sezione Dedicata</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{strumento.descrizione}</p>
          {hasParams && (
            <p className="text-[10px] text-emerald-400 mt-1">✓ I tuoi dati verranno inseriti automaticamente</p>
          )}
        </div>
        <ArrowRight className="w-5 h-5 text-[#d4af37] flex-shrink-0 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}

// Rating
function RatingSection({ conversationId }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [saved, setSaved] = useState(false);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentSent, setCommentSent] = useState(false);
  const [thankVisible, setThankVisible] = useState(true);

  const handleRate = async (value) => {
    setRating(value);
    setSaved(true);
    if (conversationId) {
      await base44.entities.ChatConversation.update(conversationId, { rating: value });
    }
    if (value >= 4) {
      setTimeout(() => setThankVisible(false), 2000);
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
    <div className="flex items-center gap-3">
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
              className="w-5 h-5 transition-colors"
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

      {saved && rating <= 2 && commentSent && (
        <span className="text-[11px] text-slate-500">Grazie per il feedback!</span>
      )}

      {saved && rating >= 4 && thankVisible && (
        <span className="text-[11px] text-slate-500 transition-opacity">Grazie!</span>
      )}

      {saved && rating === 3 && (
        <span className="text-[11px] text-slate-500">Grazie.</span>
      )}
    </div>
  );
}

// --- MAIN ---
export default function DecisionResponse({ message, category, classification, onFollowup, conversationId, existingPlan, userQuestion, isNew = false }) {
  const [planLoading, setPlanLoading] = useState(false);
  const [showPlanCTA, setShowPlanCTA] = useState(true);
  const [plan, setPlan] = useState(() => {
    if (!existingPlan) return null;
    if (typeof existingPlan === 'object') return existingPlan;
    try { return JSON.parse(existingPlan); } catch { return null; }
  });
  // Parse JSON
  let parsed = null;
  const content = message.content;
  if (typeof content === 'object' && content !== null && content.sintesi_decisionale) {
    parsed = content;
  } else if (typeof content === 'string') {
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const obj = JSON.parse(cleaned);
      if (obj.sintesi_decisionale) parsed = obj;
    } catch { /* fallback markdown */ }
  }

  const handleGeneratePlan = async () => {
    if (!conversationId || !parsed) return;
    setPlanLoading(true);
    setShowPlanCTA(false);

    const rispostaJson = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    let userContext = '';
    try {
      const me = await base44.auth.me();
      if (me) {
        const fields = [['azienda', me.company_name], ['settore', me.settore], ['forma giuridica', me.forma_giuridica], ['fatturato', me.fatturato_annuo], ['dipendenti', me.numero_dipendenti], ['regime fiscale', me.regime_fiscale], ['obiettivo', me.obiettivo_principale]];
        userContext = fields.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
      }
    } catch { /* ignora */ }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un project manager operativo per PMI italiane. HAI ACCESSO A INTERNET e DEVI usarlo.
Basandoti su questa analisi: ${rispostaJson}
${userContext ? `Profilo aziendale: ${userContext}` : ''}

CERCA SU INTERNET costi reali di professionisti e servizi in Italia. Per ogni costo: [VERIFICATO — fonte] o [STIMA]. MAI inventare prezzi.

Genera un piano operativo in JSON con: titolo_piano, durata_totale, budget_stimato, fasi (lista con: numero, nome, durata, azioni come lista di stringhe, responsabile, costo_stimato), primo_passo_domani, fonti (lista con: nome, url, tipo tra istituzionale/specializzata/media), affidabilita (oggetto con: verificati, stimati, da_confermare, punteggio da 1 a 10). SOLO JSON valido.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          titolo_piano: { type: "string" },
          durata_totale: { type: "string" },
          budget_stimato: { type: "string" },
          fasi: { type: "array", items: { type: "object", properties: { numero: { type: "number" }, nome: { type: "string" }, durata: { type: "string" }, azioni: { type: "array", items: { type: "string" } }, responsabile: { type: "string" }, costo_stimato: { type: "string" } } } },
          primo_passo_domani: { type: "string" },
          fonti: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, url: { type: "string" }, tipo: { type: "string" } } } },
          affidabilita: { type: "object", properties: { verificati: { type: "number" }, stimati: { type: "number" }, da_confermare: { type: "number" }, punteggio: { type: "number" } } }
        },
        required: ["titolo_piano", "fasi", "primo_passo_domani"]
      }
    });

    let planData = typeof result === 'object' ? result : null;
    if (!planData && typeof result === 'string') {
      try { planData = JSON.parse(result); } catch { /* ignore */ }
    }
    setPlan(planData);
    setPlanLoading(false);
    await base44.entities.ChatConversation.update(conversationId, { ha_piano: true, piano_json: JSON.stringify(planData) });
  };

  // Fallback markdown
  if (!parsed) {
    const rawText = typeof content === 'string' ? content : JSON.stringify(content);
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
            {rawText}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  // Helper per passare dati al pdf
  const parsedForPdf = {
    sintesi: parsed.sintesi_decisionale,
    impatto: parsed.impatto_economico,
    rischi: parsed.rischi_criticita,
    tempo: parsed.tempo_attuazione,
    raccomandazione: parsed.raccomandazione_finale,
    followup_questions: parsed.followup_questions || [],
    affidabilita: parsed.affidabilita || null,
    fonti: parsed.fonti || [],
  };

  const catKey = classification?.categoria || category || '';
  const catColor = CATEGORY_COLORS[catKey] || DEFAULT_CAT_COLOR;

  return (
    <div className="flex items-start gap-3" style={{ touchAction: 'pan-y' }}>
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[92%] space-y-3">
        <StreamingReveal delay={180} enabled={isNew}>

        {/* BADGE CATEGORIA */}
        {catKey && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${catColor.bg} border ${catColor.border}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${catColor.dot}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${catColor.text}`}>{catKey}</span>
            </div>
            {classification?.sottocategoria && (
              <span className="text-[11px] text-slate-500">{classification.sottocategoria}</span>
            )}
          </div>
        )}

        {/* STRUMENTO CORRELATO in alto */}
        {parsed.strumento_correlato && <StrumentoCorrelato strumento={parsed.strumento_correlato} />}

        {/* RISPOSTA FLUIDA — un unico blocco discorsivo */}
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 px-5 py-4 space-y-4">
          
          {/* Sintesi principale */}
          {parsed.sintesi_decisionale && (
            <div>
              <TaggedContent text={parsed.sintesi_decisionale} />
            </div>
          )}

          {/* Impatto economico inline */}
          {parsed.impatto_economico && (
            <div className="border-l-2 border-emerald-400/50 pl-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Impatto economico</span>
              </div>
              <TaggedContent text={parsed.impatto_economico} />
            </div>
          )}

          {/* Rischi inline */}
          {parsed.rischi_criticita && (
            <div className="border-l-2 border-red-400/50 pl-4">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">Rischi</span>
              </div>
              <TaggedContent text={parsed.rischi_criticita} />
            </div>
          )}

          {/* Tempi inline */}
          {parsed.tempo_attuazione && (
            <div className="border-l-2 border-violet-400/50 pl-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">Tempi</span>
              </div>
              <TaggedContent text={parsed.tempo_attuazione} />
            </div>
          )}

          {/* Raccomandazione finale evidenziata */}
          {parsed.raccomandazione_finale && (
            <div className="mt-2 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af37]">Da fare subito</span>
              </div>
              <div className="text-sm text-white leading-relaxed">
                <TaggedContent text={parsed.raccomandazione_finale} />
              </div>
            </div>
          )}
        </div>

        {/* FONTI compatte */}
        {parsed.fonti?.length > 0 && <FontiSection fonti={parsed.fonti} />}

        {/* FOLLOWUP */}
        {parsed.followup_questions?.length > 0 && (
          <div className="flex flex-col gap-2">
            {parsed.followup_questions.map((q, idx) => (
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

        {/* Solo PDF, no piano operativo */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateAnalysisPdf({ parsed: parsedForPdf, classification, category, userQuestion, plan: null })}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/50 bg-transparent hover:border-slate-600 transition-colors text-sm text-slate-400"
          >
            <Download className="w-4 h-4" />
            Scarica PDF
          </button>
        </div>

        {/* RATING */}
        <RatingSection conversationId={conversationId} />

        </StreamingReveal>
      </div>
    </div>
  );
}