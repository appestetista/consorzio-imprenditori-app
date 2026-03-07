import React from 'react';
import { Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const markdownComponents = {
  p: ({ children }) => <p className="my-1.5 text-[15px] leading-[1.65] text-slate-200">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-[15px] leading-[1.65] text-slate-200">{children}</li>,
  strong: ({ children }) => <strong className="text-yellow-300 font-bold">{children}</strong>,
  h2: ({ children }) => <h2 className="text-base font-bold text-yellow-400 mt-3 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[15px] font-semibold text-yellow-300 mt-2 mb-1">{children}</h3>,
  a: ({ children, ...props }) => (
    <a {...props} className="text-yellow-400 underline" target="_blank" rel="noopener noreferrer">{children}</a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-yellow-500/50 pl-3 my-2 text-slate-300 italic">{children}</blockquote>
  ),
  code: ({ inline, children }) => inline ? (
    <code className="px-1 py-0.5 rounded bg-yellow-900/30 text-yellow-200 text-xs">{children}</code>
  ) : (
    <pre className="bg-slate-900 rounded-lg p-3 overflow-x-auto my-2"><code className="text-xs text-slate-200">{children}</code></pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-yellow-600/30">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-yellow-900/30 text-yellow-300">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-yellow-700/20">{children}</tbody>,
  th: ({ children }) => <th className="px-3 py-2 font-semibold text-sm">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-slate-300">{children}</td>,
};

export default function WebSearchBanner({ loading, result }) {
  return (
    <AnimatePresence>
      {(loading || result) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mt-3"
        >
          {/* Banner stato */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-t-xl border-t border-x ${
            loading 
              ? 'bg-yellow-900/20 border-yellow-600/30' 
              : 'bg-yellow-900/15 border-yellow-600/25'
          }`}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                <span className="text-sm font-medium text-yellow-400">
                  Stiamo verificando fonti aggiornate dal web...
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">
                  Fonti verificate dal web
                </span>
                <Globe className="w-3.5 h-3.5 text-yellow-500/60 ml-auto" />
              </>
            )}
          </div>

          {/* Contenuto risultato */}
          {result && (
            <div className="rounded-b-xl border-b border-x border-yellow-600/25 bg-slate-800/40 px-5 py-4">
              <ReactMarkdown
                className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={markdownComponents}
              >
                {result}
              </ReactMarkdown>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}