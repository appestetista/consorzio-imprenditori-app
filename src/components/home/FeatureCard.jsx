import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FeatureCard({ 
  title, 
  icon: Icon, 
  pageName, 
  notificationCount = 0, 
  disabled = false, 
  variant = 'default', 
  bottomBadge = null, 
  bottomBadgeType = 'consultations',
  hasNewNotification = false,
  onNotificationViewed = () => {},
  eventCount = 0
}) {
  const isPink = variant === 'pink';
  const isBlue = variant === 'blue';
  const accentColor = isPink ? 'text-pink-400' : isBlue ? 'text-blue-400' : 'text-lime-400';
  
  // SOLO per Calendario Incontri: campanella e glow
  const isCalendar = pageName === 'CalendarioIncontri';
  const leftBadgeCount = isCalendar ? eventCount : 0;
  const bellNotificationCount = isCalendar ? notificationCount : 0;
  
  // Glow SOLO per calendario - attivo quando ci sono inviti SENZA RISPOSTA (notificationCount > 0)
  // Il bagliore sparisce SOLO quando l'utente risponde (accetta o rifiuta), non quando clicca sulla card
  const shouldGlow = isCalendar && bellNotificationCount > 0;
  
  const content = (
    <div className="relative">
      {/* Glow effect attorno alla card */}
      <style>{`
        @keyframes cardGlow {
          0%, 100% { 
            box-shadow: 0 0 10px 3px rgba(163, 230, 53, 0.4),
                        0 0 20px 6px rgba(163, 230, 53, 0.2);
          }
          50% { 
            box-shadow: 0 0 15px 5px rgba(163, 230, 53, 0.6),
                        0 0 30px 10px rgba(163, 230, 53, 0.3);
          }
        }
      `}</style>
      
      <div 
        className={cn(
          "relative bg-slate-800/90 rounded-xl flex flex-col items-center justify-center min-h-[120px] transition-all duration-300 overflow-hidden",
          disabled ? "opacity-50 cursor-not-allowed border-red-500/50" : "hover:bg-slate-700/90 hover:scale-105 cursor-pointer border-slate-700/50",
          "border",
          bottomBadge ? "pb-0" : "p-6"
        )}
        style={shouldGlow && !disabled ? { animation: 'cardGlow 2s ease-in-out infinite' } : {}}
      >
        <div className={cn("flex flex-col items-center justify-center flex-1", bottomBadge ? "p-6 pb-3" : "")}>
          {/* Cerchio contatore a sinistra - SOLO per calendario mostra numero eventi */}
          {!disabled && leftBadgeCount > 0 && (
            <div className="absolute top-3 left-3">
              <span className="bg-lime-400 text-slate-900 text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {leftBadgeCount}
              </span>
            </div>
          )}
          
          {/* Lucchetto per card disabilitate */}
          {disabled && (
            <div className="absolute top-3 right-3">
              <Lock className="w-4 h-4 text-red-400" />
            </div>
          )}
          
          {/* Campanella notifica - SOLO per Calendario Incontri */}
          {!disabled && isCalendar && (
            <div className="absolute top-3 right-3">
              <div 
                className={cn(
                  "relative w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  bellNotificationCount > 0 
                    ? "bg-[#bd0449]" 
                    : "bg-slate-900 border-2 border-lime-400"
                )}
              >
                <Bell className={cn(
                  "w-4 h-4",
                  bellNotificationCount > 0 ? "text-white" : "text-lime-400"
                )} />
                {/* Badge numerico bianco con numero nero - SOLO quando ci sono notifiche */}
                {bellNotificationCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-slate-900 text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-md">
                    {bellNotificationCount > 99 ? '99+' : bellNotificationCount}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {Icon && <Icon className={cn("w-8 h-8 mb-3", disabled ? "text-red-400" : accentColor)} />}
          <span className={cn("text-sm font-medium text-center leading-tight break-words w-full px-1", disabled ? "text-red-300" : (isPink || isBlue) ? accentColor : "text-white")}>{title}</span>
        </div>
        {bottomBadge && (
          <div className={cn(
            "w-full text-xs font-bold text-center py-1.5 border-t",
            bottomBadgeType === 'requests' 
              ? "bg-amber-400/20 text-amber-400 border-amber-400/30" 
              : "bg-lime-400/20 text-lime-400 border-lime-400/30"
          )}>
            {bottomBadgeType === 'requests' 
              ? `📋 ${bottomBadge} ${bottomBadge === 1 ? 'richiesta' : 'richieste'}`
              : `🎁 ${bottomBadge} consulenze gratuite`
            }
          </div>
        )}
      </div>
    </div>
  );

  if (disabled) {
    return content;
  }

  const pageUrl = createPageUrl(pageName);

  return (
    <Link to={pageUrl} className="cursor-pointer block">
      {content}
    </Link>
  );
}