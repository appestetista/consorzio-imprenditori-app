import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../context/ThemeContext';

export default function ChatMessage({ message, onEdit }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const { isDark } = useTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    setCopied(true);
    toast.success('Copiato negli appunti');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3" style={{
          backgroundColor: 'var(--app-accent)',
          color: 'var(--app-text-inverse)'
        }}>
          <p className="text-lg leading-relaxed font-medium">{message.content}</p>
        </div>
        <div className="flex items-center gap-1 mr-1">
          <button onClick={handleCopy} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--app-text-muted)' }} title="Copia">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onEdit && (
            <button onClick={() => onEdit(message.content)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--app-text-muted)' }} title="Modifica">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[85%] space-y-1">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{
          backgroundColor: isDark ? 'rgba(30,41,59,0.6)' : 'var(--app-bg-card)',
          border: isDark ? 'none' : '1px solid var(--app-border)',
        }}>
          <ReactMarkdown
            className="text-base leading-relaxed prose prose-base max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1.5 leading-relaxed" style={{ color: 'var(--app-text-secondary)' }}>{children}</p>,
              ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc" style={{ color: 'var(--app-text-secondary)' }}>{children}</ul>,
              ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal" style={{ color: 'var(--app-text-secondary)' }}>{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--app-accent)' }}>{children}</strong>,
              a: ({ children, ...props }) => (
                <a {...props} className="underline" style={{ color: 'var(--app-accent)' }} target="_blank" rel="noopener noreferrer">{children}</a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2 rounded-lg" style={{ border: '1px solid var(--app-border)' }}>
                  <table className="w-full text-xs text-left">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead style={{ backgroundColor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(241,245,249,0.8)', color: 'var(--app-accent)' }}>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr>{children}</tr>,
              th: ({ children }) => <th className="px-3 py-2 font-semibold text-xs whitespace-nowrap">{children}</th>,
              td: ({ children }) => <td className="px-3 py-2" style={{ color: 'var(--app-text-secondary)' }}>{children}</td>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <div className="flex items-center gap-1 ml-1">
          <button onClick={handleCopy} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--app-text-muted)' }} title="Copia">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}