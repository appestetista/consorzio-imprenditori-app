import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import NotificationsPanel, { useNotificationsBadge } from '../home/NotificationsPanel';

export default function TopRightIcons({ userEmail, userRegime }) {
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['top-icons-notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ user_email: userEmail, is_read: false }),
    enabled: !!userEmail,
    refetchInterval: 10000,
  });

  const unreadCount = notifications.filter(n => n.type === 'message').length;
  const totalBadge = useNotificationsBadge(userEmail, userRegime);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link to={createPageUrl('Messaggi')} className="relative p-1">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/cd5e7b92b_Immagine_2026-02-03_182832-removebg-preview.png" 
            alt="Messaggi" 
            className="w-9 h-9 object-contain"
          />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <button onClick={() => setNotifPanelOpen(true)} className="relative p-1.5 rounded-xl hover:bg-slate-800 transition-colors">
          <Bell className="w-6 h-6 text-slate-400" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
              {totalBadge > 99 ? '99+' : totalBadge}
            </span>
          )}
        </button>
      </div>

      <NotificationsPanel
        open={notifPanelOpen}
        onClose={() => setNotifPanelOpen(false)}
        userEmail={userEmail}
        userRegime={userRegime}
      />
    </>
  );
}