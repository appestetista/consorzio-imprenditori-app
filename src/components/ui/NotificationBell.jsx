import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationBell({ 
  count = 0, 
  className, 
  hasNewNotification = false,
  onViewed = () => {} 
}) {
  const hasNotifications = count > 0;
  const [showGlow, setShowGlow] = useState(hasNewNotification);
  const [wasViewed, setWasViewed] = useState(false);

  useEffect(() => {
    if (hasNewNotification && !wasViewed) {
      setShowGlow(true);
    }
  }, [hasNewNotification, wasViewed]);

  const handleClick = () => {
    setShowGlow(false);
    setWasViewed(true);
    onViewed();
  };

  return (
    <div className={cn("relative", className)} onClick={handleClick}>
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes glowPulse {
          0%, 100% { 
            box-shadow: 0 0 8px 4px rgba(236, 72, 153, 0.6),
                        0 0 16px 8px rgba(236, 72, 153, 0.4),
                        0 0 24px 12px rgba(236, 72, 153, 0.2);
          }
          50% { 
            box-shadow: 0 0 12px 6px rgba(236, 72, 153, 0.8),
                        0 0 24px 12px rgba(236, 72, 153, 0.5),
                        0 0 36px 18px rgba(236, 72, 153, 0.3);
          }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
      
      {/* Glow effect container */}
      {showGlow && hasNotifications && (
        <div 
          className="absolute inset-0 rounded-full"
          style={{ 
            animation: 'glowPulse 1.5s ease-in-out infinite',
            zIndex: -1
          }}
        />
      )}
      
      {/* Bell icon with breathing animation when has new notifications */}
      <Bell 
        className="w-5 h-5 text-lime-400" 
        style={showGlow && hasNotifications ? { animation: 'breathe 2s ease-in-out infinite' } : {}}
      />
      
      {/* Notification badge - fuxia when new, shows only count when viewed */}
      {hasNotifications && (
        <span 
          className={cn(
            "absolute -top-2 -right-2 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold",
            showGlow ? "bg-pink-500" : "bg-slate-600"
          )}
          style={showGlow ? { animation: 'dotPulse 1.5s ease-in-out infinite' } : {}}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}