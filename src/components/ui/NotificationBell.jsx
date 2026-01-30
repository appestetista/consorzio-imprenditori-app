import React, { useState, useEffect } from 'react';
import { Bell, Sparkles } from 'lucide-react';
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
    <div className={cn("relative cursor-pointer", className)} onClick={handleClick}>
      <style>{`
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-15deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-10deg); }
          50% { transform: rotate(5deg); }
          60% { transform: rotate(-5deg); }
          70% { transform: rotate(0deg); }
        }
        @keyframes glowPulse {
          0%, 100% { 
            box-shadow: 0 0 8px 4px rgba(163, 230, 53, 0.6),
                        0 0 16px 8px rgba(163, 230, 53, 0.3);
          }
          50% { 
            box-shadow: 0 0 12px 6px rgba(163, 230, 53, 0.8),
                        0 0 24px 12px rgba(163, 230, 53, 0.4);
          }
        }
        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.3) rotate(180deg); opacity: 0.8; }
        }
      `}</style>
      
      {/* Glow effect container */}
      {showGlow && (
        <div 
          className="absolute -inset-2 rounded-full bg-lime-400/20"
          style={{ 
            animation: 'glowPulse 1.5s ease-in-out infinite',
            zIndex: -1
          }}
        />
      )}
      
      {/* Bell icon with shake animation when has new notifications */}
      <Bell 
        className={cn("w-5 h-5", showGlow ? "text-lime-300" : "text-lime-400")}
        style={showGlow ? { animation: 'bellShake 1s ease-in-out infinite' } : {}}
      />
      
      {/* Icona stellina animata quando c'è nuova notifica */}
      {showGlow && (
        <div 
          className="absolute -top-1.5 -right-1.5 bg-lime-400 rounded-full w-4 h-4 flex items-center justify-center"
          style={{ animation: 'sparkle 1.5s ease-in-out infinite' }}
        >
          <Sparkles className="w-2.5 h-2.5 text-slate-900" />
        </div>
      )}
    </div>
  );
}