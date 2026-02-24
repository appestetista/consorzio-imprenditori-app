import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#d4af37] text-slate-900 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm leading-relaxed font-medium">{message.content}</p>
        </div>
      </div>
    );
  }

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
            ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc">{children}</ul>,
            ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="my-0.5">{children}</li>,
            strong: ({ children }) => <strong className="text-[#d4af37] font-semibold">{children}</strong>,
            a: ({ children, ...props }) => (
              <a {...props} className="text-[#d4af37] underline" target="_blank" rel="noopener noreferrer">{children}</a>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}