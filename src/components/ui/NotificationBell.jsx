import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationBell({ 
  count = 0, 
  className, 
  hasNewNotification = false,
  onViewed = () => {} 
}) {
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
          50% { transform: scale(1.15); }
        }
        @keyframes glowPulse {
          0%, 100% { 
            box-shadow: 0 0 6px 3px rgba(163, 230, 53, 0.5),
                        0 0 12px 6px rgba(163, 230, 53, 0.3),
                        0 0 18px 9px rgba(163, 230, 53, 0.15);
          }
          50% { 
            box-shadow: 0 0 10px 5px rgba(163, 230, 53, 0.7),
                        0 0 20px 10px rgba(163, 230, 53, 0.4),
                        0 0 30px 15px rgba(163, 230, 53, 0.2);
          }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
      
      {/* Glow effect container - giallo lime fluorescente */}
      {showGlow && (
        <div 
          className="absolute -inset-1 rounded-full"
          style={{ 
            animation: 'glowPulse 1.5s ease-in-out infinite',
            zIndex: -1
          }}
        />
      )}
      
      {/* Bell icon with breathing animation when has new notifications */}
      <Bell 
        className="w-5 h-5 text-lime-400" 
        style={showGlow ? { animation: 'breathe 2s ease-in-out infinite' } : {}}
      />
      
      {/* Pallino fucsia/magenta quando c'è nuova notifica */}
      {showGlow && (
        <span 
          className="absolute -top-1 -right-1 bg-fuchsia-500 rounded-full w-2.5 h-2.5"
          style={{ animation: 'dotPulse 1.5s ease-in-out infinite' }}
        />
      )}
    </div>
  );
}