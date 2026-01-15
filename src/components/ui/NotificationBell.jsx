import React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationBell({ count = 0, className }) {
  const hasNotifications = count > 0;

  return (
    <div className={cn("relative", className)}>
      <style>{`
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
      <Bell className="w-5 h-5 text-lime-400" />
      {hasNotifications && (
        <span 
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
          style={{ animation: 'dotPulse 1.5s ease-in-out infinite' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}