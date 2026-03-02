import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NotificationsPanel from '../home/NotificationsPanel';

export default function SectionHeaderIcons({ userEmail, userRegime = null, unreadCount = 0 }) {
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1 mr-1">
        {/* Icona Messaggi */}
        <Link to={createPageUrl('Messaggi')} className="relative p-2">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/cd5e7b92b_Immagine_2026-02-03_182832-removebg-preview.png" 
            alt="Messaggi" 
            className="w-8 h-8 object-contain"
          />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        {/* Campanella notifiche */}
        <button onClick={() => setNotifPanelOpen(true)} className="relative p-2 rounded-xl hover:bg-slate-800 transition-colors">
          <Bell className="w-5 h-5 text-slate-400" />
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