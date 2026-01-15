import React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationBell({ count = 0, className }) {
  const hasNotifications = count > 0;

  return (
    <div className={cn("relative", className)}>
      <style>{`
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          10% { transform: rotate(-15deg) scale(1.2); }
          20% { transform: rotate(15deg) scale(0.9); }
          30% { transform: rotate(-15deg) scale(1.2); }
          40% { transform: rotate(15deg) scale(0.9); }
          50% { transform: rotate(0deg) scale(1.1); }
          60% { transform: rotate(-10deg) scale(1); }
          70% { transform: rotate(10deg) scale(1.15); }
          80% { transform: rotate(-5deg) scale(0.95); }
          90% { transform: rotate(5deg) scale(1.1); }
        }
      `}</style>
      <Bell 
        className="w-5 h-5 text-lime-400" 
        style={hasNotifications ? { animation: 'bellShake 1.5s ease-in-out infinite' } : {}}
      />
      {hasNotifications && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}