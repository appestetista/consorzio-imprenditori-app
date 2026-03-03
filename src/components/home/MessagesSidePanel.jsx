import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { X, User, ChevronRight, MessageCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function MessagesSidePanel({ open, onClose, userEmail }) {
  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['side-panel-messages', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const sent = await base44.entities.Message.filter({ from_email: userEmail });
      const received = await base44.entities.Message.filter({ to_email: userEmail });
      return [...sent, ...received].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!userEmail && open,
  });

  // Raggruppa per conversazione (email + source)
  const conversations = React.useMemo(() => {
    const convMap = {};
    allMessages.forEach(msg => {
      const otherEmail = msg.from_email === userEmail ? msg.to_email : msg.from_email;
      const source = msg.source || 'diretto';
      const key = `${otherEmail}_${source}`;
      if (!convMap[key]) {
        convMap[key] = { email: otherEmail, source, messages: [], lastMessage: msg, unread: 0 };
      }
      convMap[key].messages.push(msg);
      if (msg.to_email === userEmail && !msg.is_read) {
        convMap[key].unread++;
      }
      if (new Date(msg.created_date) > new Date(convMap[key].lastMessage.created_date)) {
        convMap[key].lastMessage = msg;
      }
    });
    return Object.entries(convMap)
      .sort(([, a], [, b]) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date))
      .slice(0, 30);
  }, [allMessages, userEmail]);

  const totalUnread = allMessages.filter(m => m.to_email === userEmail && !m.is_read).length;

  if (!open) return null;

  return (
    <>
      {/* Backdrop scuro — click chiude */}
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Pannello overlay full-width centrato */}
      <div className="fixed inset-0 z-[61] flex items-stretch justify-center pointer-events-none">
        <div className="w-full max-w-md bg-slate-900 flex flex-col pointer-events-auto shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#d4af37]" />
              <h2 className="text-white font-semibold text-sm">Tutti i messaggi</h2>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Link
                to={createPageUrl('Messaggi')}
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-800 transition-colors"
                title="Apri pagina completa"
              >
                <ExternalLink className="w-4 h-4 text-[#d4af37]" />
              </Link>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Lista conversazioni */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <MessageCircle className="w-8 h-8 text-slate-600 mb-3" />
                <p className="text-slate-400 text-xs">Nessun messaggio</p>
              </div>
            ) : (
              conversations.map(([key, conv]) => {
                const sourceLabels = {
                  marketplace: '🏪 Marketplace',
                  video: '🎬 Video',
                  contatta_consorzio: '📞 Consorzio',
                  consulenze: '💼 Consulenza',
                  diretto: '✉️ Diretto',
                };
                return (
                  <Link
                    key={key}
                    to={createPageUrl(`Messaggi?contact=${encodeURIComponent(conv.email)}`)}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border-b border-slate-700/30 hover:bg-slate-800/60 transition-colors",
                      conv.unread > 0 && "bg-slate-800/30"
                    )}
                  >
                    <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("text-xs truncate", conv.unread > 0 ? "text-white font-semibold" : "text-slate-300 font-medium")}>
                          {conv.email}
                        </p>
                        {conv.unread > 0 && (
                          <span className="bg-red-500 text-white text-[8px] rounded-full min-w-3.5 h-3.5 px-1 flex items-center justify-center font-bold flex-shrink-0">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {conv.lastMessage.content?.substring(0, 60)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-600">{sourceLabels[conv.source] || conv.source}</span>
                        <span className="text-[10px] text-slate-600">
                          {format(new Date(conv.lastMessage.created_date), 'd MMM, HH:mm', { locale: it })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}