import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Calendar, AlertTriangle, Clock, CheckCircle2, User as UserIcon, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

function getUpcomingScadenze(scadenze, userRegime) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 90);

  const results = [];

  for (const s of scadenze) {
    // Filtra per regime
    if (s.regime !== 'tutti' && userRegime && s.regime !== userRegime) continue;
    if (!userRegime && s.regime !== 'tutti') continue;

    if (!s.data_scadenza) continue;
    const scadDate = new Date(s.data_scadenza);
    scadDate.setHours(0, 0, 0, 0);

    if (scadDate < now || scadDate > limit) continue;

    const diffDays = Math.round((scadDate - now) / (1000 * 60 * 60 * 24));

    results.push({
      ...s,
      nextDate: scadDate,
      daysLeft: diffDays,
    });
  }

  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}

function NotificationItem({ notif, onMarkRead, onDelete, expanded, onToggleExpand }) {
  const handleClick = () => {
    // Al click: espandi/comprimi e segna come letta
    if (!notif.is_read) {
      onMarkRead(notif.id);
    }
    onToggleExpand(notif.id);
  };

  return (
    <div 
      className={cn(
        "px-4 py-3 border-b border-black/10 last:border-b-0 transition-colors cursor-pointer hover:bg-black/10",
        !notif.is_read ? "bg-black/10" : ""
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {!notif.is_read && <span className="w-2 h-2 rounded-full bg-black flex-shrink-0" />}
            <p className="text-xs font-bold text-black truncate">{notif.title}</p>
          </div>
          {notif.content && (
            <p className={cn("text-[11px] text-black mt-0.5", expanded ? "whitespace-pre-wrap" : "line-clamp-2")}>
              {notif.content}
            </p>
          )}
          <p className="text-[10px] text-black/70 font-medium mt-1">
            {notif.created_date ? new Date(notif.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }} 
            className="p-1 rounded-full hover:bg-red-500/20 transition-colors"
            title="Elimina notifica"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ScadenzaItem({ scadenza }) {
  const dateStr = scadenza.nextDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  const badgeConfig = scadenza.daysLeft < 7
    ? { label: 'Urgente', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
    : scadenza.daysLeft < 15
    ? { label: 'In arrivo', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' }
    : { label: 'In programma', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };

  return (
    <div className="px-4 py-3 border-b border-black/15 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-black truncate">{scadenza.titolo}</p>
            <span className={cn("flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold border", badgeConfig.bg, badgeConfig.text, badgeConfig.border)}>
              {badgeConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Calendar className="w-3 h-3 text-black" />
            <span className="text-[10px] text-black font-medium">{dateStr} — {scadenza.daysLeft === 0 ? 'oggi' : scadenza.daysLeft === 1 ? 'domani' : `tra ${scadenza.daysLeft} giorni`}</span>
          </div>
          {scadenza.sanzione_ritardo && (
            <p className="text-[10px] text-red-700 font-semibold mt-1 leading-snug">⚠ {scadenza.sanzione_ritardo}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPanel({ open, onClose, userEmail, userRegime }) {
  const [tab, setTab] = useState('notifiche');
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();

  // Notifiche
  const { data: allNotifications = [] } = useQuery({
    queryKey: ['panel-notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ user_email: userEmail }, '-created_date', 50),
    enabled: !!userEmail && open,
  });

  // Scadenze
  const { data: scadenzeRaw = [] } = useQuery({
    queryKey: ['scadenze-fiscali'],
    queryFn: () => base44.entities.ScadenzaFiscale.list('-data_scadenza', 200),
    enabled: open,
  });

  const upcomingScadenze = getUpcomingScadenze(scadenzeRaw, userRegime);
  const urgentCount = upcomingScadenze.filter(s => s.daysLeft < 7).length;

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['home-notifications'] });
    },
  });

  const markAllRead = async () => {
    const unread = allNotifications.filter(n => !n.is_read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
    queryClient.invalidateQueries({ queryKey: ['panel-notifications'] });
    queryClient.invalidateQueries({ queryKey: ['home-notifications'] });
  };

  const deleteNotifMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['home-notifications'] });
    },
  });

  const unreadNotifs = allNotifications.filter(n => !n.is_read).length;

  return (
    <>
      {/* Backdrop scuro — click chiude */}
      {open && <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />}

      {/* Pannello slide-up dal basso — arriva fino al bordo inferiore dell'header */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[61] flex justify-center pointer-events-none"
        style={{ top: 0 }}
      >
      <div
        className="w-full max-w-md flex flex-col pointer-events-auto shadow-2xl rounded-t-2xl transition-transform duration-300 ease-out"
        style={{
          backgroundColor: '#fef200',
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: open ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
          top: '56px',
          height: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-black" />
            <h2 className="text-black font-semibold text-sm">Notifiche</h2>
            {unreadNotifs > 0 && (
              <span className="bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
                {unreadNotifs}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/10 transition-colors">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black/15 px-4">
          <button
            onClick={() => setTab('notifiche')}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors",
              tab === 'notifiche' ? 'border-black text-black' : 'border-transparent text-black/50 hover:text-black/70'
            )}
          >
            Notifiche {unreadNotifs > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">{unreadNotifs}</span>}
          </button>
          <button
            onClick={() => setTab('scadenze')}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors",
              tab === 'scadenze' ? 'border-black text-black' : 'border-transparent text-black/50 hover:text-black/70'
            )}
          >
            Scadenze {urgentCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">{urgentCount}</span>}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'notifiche' ? (
            <>
              {unreadNotifs > 0 && (
                <div className="px-4 py-2 flex justify-end">
                  <button onClick={markAllRead} className="text-[10px] text-black font-bold hover:underline">Segna tutte come lette</button>
                </div>
              )}
              {allNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Bell className="w-8 h-8 text-black/40 mb-3" />
                  <p className="text-black text-xs font-medium">Nessuna notifica</p>
                </div>
              ) : (
                allNotifications.map(n => (
                  <NotificationItem 
                    key={n.id} 
                    notif={n} 
                    onMarkRead={(id) => markReadMutation.mutate(id)} 
                    onDelete={(id) => deleteNotifMutation.mutate(id)}
                    expanded={expandedId === n.id}
                    onToggleExpand={(id) => setExpandedId(prev => prev === id ? null : id)}
                  />
                ))
              )}
            </>
          ) : (
            <>
              {!userRegime && (
                <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-black/10 border border-black/20">
                  <div className="flex items-start gap-2">
                    <UserIcon className="w-4 h-4 text-black mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] text-black font-bold">Completa il profilo per vedere tutte le scadenze</p>
                      <Link
                        to={createPageUrl('ProfiloUtente')}
                        onClick={onClose}
                        className="text-[10px] text-black font-bold hover:underline mt-1 inline-block"
                      >
                        Vai al profilo →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {upcomingScadenze.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CheckCircle2 className="w-8 h-8 text-black/40 mb-3" />
                  <p className="text-black text-xs font-medium">Nessuna scadenza nei prossimi 90 giorni</p>
                </div>
              ) : (
                <div className="mt-1">
                  {upcomingScadenze.map((s, i) => (
                    <ScadenzaItem key={s.id || i} scadenza={s} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

// Export helper per badge count
// Campanella = notifiche non lette ESCLUSE quelle di tipo "message" + scadenze urgenti
// Busta = messaggi non letti dall'entità Message (non dalle Notification)
export function useNotificationsBadge(userEmail, userRegime) {
  const { data: unreadNotifs = [] } = useQuery({
    queryKey: ['home-notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ user_email: userEmail, is_read: false }),
    enabled: !!userEmail,
    refetchInterval: 10000,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['unread-messages-badge', userEmail],
    queryFn: () => base44.entities.Message.filter({ to_email: userEmail, is_read: false }),
    enabled: !!userEmail,
    refetchInterval: 10000,
  });

  const { data: scadenzeRaw = [] } = useQuery({
    queryKey: ['scadenze-fiscali-badge'],
    queryFn: () => base44.entities.ScadenzaFiscale.list('-data_scadenza', 200),
    enabled: !!userEmail,
    refetchInterval: 60000,
  });

  const urgentCount = getUpcomingScadenze(scadenzeRaw, userRegime).filter(s => s.daysLeft < 7).length;
  const nonMessageNotifs = unreadNotifs.filter(n => n.type !== 'message');

  return { totalBadge: nonMessageNotifs.length + urgentCount, unreadMessageCount: unreadMessages.length };
}