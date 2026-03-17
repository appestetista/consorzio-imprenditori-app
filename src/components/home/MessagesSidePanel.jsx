import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, ChevronRight, MessageCircle, Filter, ShoppingBag, Video, Phone, Briefcase, Globe, FileCheck, Calendar, BookOpen, TrendingUp, Handshake, Truck, Heart, Shield, Gavel, Gift, Zap, Flame, Leaf, Sun, Wifi, Euro, Star, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useImpersonation } from '../admin/ImpersonationContext';

const sourceConfig = {
  diretto: { label: 'Diretto', icon: MessageCircle, color: 'bg-slate-500', key: 'diretto' },
  marketplace: { label: 'Market Place', icon: ShoppingBag, color: 'bg-purple-500', key: 'marketplace' },
  video: { label: 'Video interv...', icon: Video, color: 'bg-blue-500', key: 'video' },
  contatta_consorzio: { label: 'Contatta Co...', icon: Phone, color: 'bg-green-500', key: 'contatta_consorzio' },
  consulenze: { label: 'Consulenze', icon: Briefcase, color: 'bg-orange-500', key: 'consulenze' },
  import_export: { label: 'Import / Ex...', icon: Globe, color: 'bg-teal-500', key: 'import_export' },
  analisi_contratti: { label: 'Analisi Cont...', icon: FileCheck, color: 'bg-indigo-500', key: 'analisi_contratti' },
  calendario: { label: 'Calendario i...', icon: Calendar, color: 'bg-pink-500', key: 'calendario' },
  cultura_aziendale: { label: 'Academy', icon: BookOpen, color: 'bg-amber-500', key: 'cultura_aziendale' },
  finanziamenti: { label: 'Finanziamenti', icon: TrendingUp, color: 'bg-emerald-500', key: 'finanziamenti' },
  imprenditori: { label: 'Imprenditori', icon: Handshake, color: 'bg-cyan-500', key: 'imprenditori' },
  fornitori: { label: 'Fornitori', icon: Truck, color: 'bg-rose-500', key: 'fornitori' },
  welfare: { label: 'Benefit', icon: Heart, color: 'bg-red-500', key: 'welfare' },
  compliance: { label: 'Sanzioni', icon: Shield, color: 'bg-sky-500', key: 'compliance' },
  aste: { label: 'Aste', icon: Gavel, color: 'bg-violet-500', key: 'aste' },
  vantaggi: { label: 'Vantaggi', icon: Gift, color: 'bg-amber-500', key: 'vantaggi' },
  risparmio_assicurazioni: { label: 'Assicurazioni', icon: Shield, color: 'bg-green-600', key: 'risparmio_assicurazioni' },
  risparmio_luce: { label: 'Luce', icon: Zap, color: 'bg-yellow-500', key: 'risparmio_luce' },
  risparmio_gas: { label: 'Gas', icon: Flame, color: 'bg-orange-600', key: 'risparmio_gas' },
  risparmio_efficientamento: { label: 'Efficientam.', icon: Leaf, color: 'bg-green-500', key: 'risparmio_efficientamento' },
  risparmio_fotovoltaico: { label: 'Fotovoltaico', icon: Sun, color: 'bg-yellow-600', key: 'risparmio_fotovoltaico' },
  risparmio_telefonia: { label: 'Telefonia', icon: Phone, color: 'bg-green-700', key: 'risparmio_telefonia' },
  risparmio_internet: { label: 'Internet', icon: Wifi, color: 'bg-green-600', key: 'risparmio_internet' },
  fiscalita_energetica: { label: 'Fisc. Energ.', icon: Euro, color: 'bg-green-800', key: 'fiscalita_energetica' }
};

export default function MessagesSidePanel({ open, onClose, userEmail }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const queryClient = useQueryClient();
  const { impersonation } = useImpersonation();

  const effectiveEmail = impersonation?.active ? impersonation?.targetEmail : userEmail;

  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['side-panel-messages', effectiveEmail],
    queryFn: async () => {
      if (!effectiveEmail) return [];
      const sent = await base44.entities.Message.filter({ from_email: effectiveEmail });
      const received = await base44.entities.Message.filter({ to_email: effectiveEmail });
      return [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!effectiveEmail && open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list-panel'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listMembers');
      return response.data?.users || [];
    },
    enabled: !!effectiveEmail && open,
  });

  const getOtherUser = (email) => users.find(u => u.email === email);

  // Group messages by conversation
  const conversations = useMemo(() => {
    const convMap = {};
    allMessages.forEach(msg => {
      const otherEmail = msg.from_email === effectiveEmail ? msg.to_email : msg.from_email;
      const source = msg.source || 'diretto';
      const key = `${otherEmail}_${source}`;
      if (!convMap[key]) {
        convMap[key] = { email: otherEmail, source, messages: [] };
      }
      convMap[key].messages.push(msg);
    });
    return convMap;
  }, [allMessages, effectiveEmail]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (activeFilter === 'all') return conversations;
    return Object.fromEntries(
      Object.entries(conversations).filter(([_, conv]) => conv.source === activeFilter)
    );
  }, [conversations, activeFilter]);

  // Count unread per source
  const unreadBySource = useMemo(() => {
    const counts = { all: 0 };
    Object.values(sourceConfig).forEach(s => { counts[s.key] = 0; });
    allMessages.forEach(msg => {
      if (msg.to_email === effectiveEmail && !msg.is_read) {
        counts.all++;
        const source = msg.source || 'diretto';
        if (counts[source] !== undefined) counts[source]++;
      }
    });
    return counts;
  }, [allMessages, effectiveEmail]);

  // Reset filter when panel opens
  useEffect(() => {
    if (open) {
      setActiveFilter('all');
      setFiltersCollapsed(false);
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />}

      {/* Panel slide-up */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[61] flex justify-center pointer-events-none"
        style={{ top: 0 }}
      >
        <div
          className="w-full max-w-md flex flex-col pointer-events-auto shadow-2xl rounded-t-2xl transition-transform duration-300 ease-out"
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: open ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
            top: '56px',
            height: 'auto',
            backgroundColor: '#1a1a2e',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-black/15 flex-shrink-0" style={{ backgroundColor: '#fef200' }}>
            <MessageCircle className="w-5 h-5 text-black" />
            <h2 className="text-black font-bold text-lg">Messaggi</h2>
            {activeFilter !== 'all' && (
              <>
                <span className="text-black/40">›</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sourceConfig[activeFilter]?.color || 'bg-lime-400'} text-white`}>
                  {sourceConfig[activeFilter]?.label || 'Tutti'}
                </span>
              </>
            )}
          </div>

          {/* Content: 2-column layout */}
          <div className="flex gap-2 flex-1 min-h-0 p-2">
            {/* Left: Filters */}
            <div
              className="flex-shrink-0 overflow-y-auto overflow-x-hidden bg-white/10 rounded-xl p-2 transition-all duration-300 ease-in-out cursor-pointer"
              style={{ width: filtersCollapsed ? '52px' : '176px' }}
              onClick={() => filtersCollapsed && setFiltersCollapsed(false)}
            >
              <div
                className="flex flex-col gap-1.5 transition-all duration-300 ease-in-out"
                style={{
                  transform: filtersCollapsed ? 'translateX(-124px)' : 'translateX(0)',
                  width: '160px'
                }}
              >
                {/* All filter */}
                <button
                  onClick={(e) => {
                    if (!filtersCollapsed) {
                      e.stopPropagation();
                      setActiveFilter('all');
                      setFiltersCollapsed(true);
                    }
                  }}
                  className={`flex items-center px-3 py-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    activeFilter === 'all' ? 'bg-lime-400 text-black font-bold' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Filter className="w-4 h-4 flex-shrink-0 mr-2" />
                  <span className="w-[80px] text-left truncate">Tutti</span>
                  <span className={`w-6 h-5 flex items-center justify-center rounded-full text-[10px] ${
                    activeFilter === 'all' ? 'bg-black text-lime-400' : unreadBySource.all > 0 ? 'bg-red-500 text-white' : 'bg-white/10 text-white'
                  }`}>
                    {unreadBySource.all || 0}
                  </span>
                </button>

                {/* Category filters */}
                {Object.values(sourceConfig).map((source) => {
                  const SourceIcon = source.icon;
                  const count = unreadBySource[source.key] || 0;
                  return (
                    <button
                      key={source.key}
                      onClick={(e) => {
                        if (!filtersCollapsed) {
                          e.stopPropagation();
                          setActiveFilter(source.key);
                          setFiltersCollapsed(true);
                        }
                      }}
                      className={`flex items-center px-3 py-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeFilter === source.key ? `${source.color} text-white` : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <SourceIcon className="w-4 h-4 flex-shrink-0 mr-2" />
                      <span className="w-[80px] text-left truncate">{source.label}</span>
                      <span className={`w-6 h-5 flex items-center justify-center rounded-full text-[10px] ${
                        activeFilter === source.key ? 'bg-white/20 text-white' : count > 0 ? 'bg-red-500 text-white' : 'bg-white/10 text-white'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-6 h-6 border-2 border-lime-400 border-t-transparent rounded-full" />
                </div>
              ) : Object.keys(filteredConversations).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <User className="w-10 h-10 text-white/30 mb-2" />
                  <p className="text-white text-xs font-medium">
                    {activeFilter === 'all' ? 'Nessuna conversazione' : 'Nessun messaggio'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-1">
                  {Object.entries(filteredConversations)
                    .sort((a, b) => {
                      const lastA = a[1].messages[a[1].messages.length - 1];
                      const lastB = b[1].messages[b[1].messages.length - 1];
                      return new Date(lastB?.created_date) - new Date(lastA?.created_date);
                    })
                    .map(([key, conv]) => {
                      const otherUser = getOtherUser(conv.email);
                      const msgs = conv.messages;
                      const lastMessage = msgs[msgs.length - 1];
                      const unreadCount = msgs.filter(m => m.to_email === effectiveEmail && !m.is_read).length;
                      const sourceInfo = sourceConfig[conv.source] || sourceConfig.diretto;
                      const SourceIcon = sourceInfo.icon;

                      return (
                        <Link
                          key={key}
                          to={createPageUrl(`Messaggi?contact=${encodeURIComponent(conv.email)}`)}
                          onClick={onClose}
                        >
                          <Card className="bg-white/10 border-white/10 p-3 cursor-pointer hover:bg-white/15 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-lime-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`${sourceInfo.color} text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5`}>
                                    <SourceIcon className="w-2.5 h-2.5" />
                                    {sourceInfo.label}
                                  </span>
                                  {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5">
                                      {unreadCount}
                                    </span>
                                  )}
                                </div>
                                <p className="text-white font-bold text-sm truncate">
                                  {otherUser?.company_name || otherUser?.full_name || conv.email}
                                </p>
                                <p className="text-white/80 text-xs truncate">
                                  {lastMessage?.content ? lastMessage.content.charAt(0).toUpperCase() + lastMessage.content.slice(1).toLowerCase() : ''}
                                </p>
                                <p className="text-white/60 text-[10px]">
                                  {format(new Date(lastMessage?.created_date), 'd MMM, HH:mm', { locale: it })}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-lime-400 flex-shrink-0" />
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}