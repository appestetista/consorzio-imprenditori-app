import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useVideoVisit } from '../context/VideoVisitContext';

export default function FeatureCard({ 
  title, 
  icon: Icon, 
  pageName, 
  notificationCount = 0, 
  disabled = false, 
  variant = 'default', 
  bottomBadge = null, 
  bottomBadgeType = 'consultations',
  eventCount = 0,
  pendingInvites = 0,
  newVideosCount = 0,
  totalVideosCount = 0,
  hasVisitedVideos = false,
  latestVideoDate = null
}) {
  const isPink = variant === 'pink';
  const isBlue = variant === 'blue';
  const accentColor = isPink ? 'text-pink-400' : isBlue ? 'text-blue-400' : 'text-lime-400';
  
  const isCalendar = pageName === 'CalendarioIncontri';
  const isVideo = pageName === 'VideoInterviste';
  
  // Usa il context con timestamp per confronto con nuovi video (sessione corrente)
  const { lastVisitTimestamp, hasNewVideosSince } = useVideoVisit();
  
  // Calendario: campanella + badge con pendingInvites
  const bellNotificationCount = isCalendar ? notificationCount : 0;
  const hasPendingInvites = isCalendar && pendingInvites > 0;
  
  // Video: logica basata su timestamp
  // newVideosCount > 0 significa che ci sono video più recenti di last_video_view_at (dal DB)
  // Se newVideosCount === 0, l'utente ha già visto tutti i video (non mostrare rosso/fascia/glow)
  // Se newVideosCount > 0 E ha visitato nella sessione corrente, non mostrare rosso/fascia/glow
  const hasVisitedThisSession = lastVisitTimestamp && latestVideoDate && !hasNewVideosSince(latestVideoDate);
  const hasUnseenNewVideos = isVideo && newVideosCount > 0 && !hasVisitedThisSession;
  const showVideoBadge = isVideo && totalVideosCount > 0;
  const videoBadgeIsRed = hasUnseenNewVideos;
  
  // Debug log per video
  if (isVideo) {
    console.log('[FeatureCard Video]', {
      newVideosCount,
      totalVideosCount,
      latestVideoDate,
      lastVisitTimestamp,
      hasVisitedThisSession,
      hasUnseenNewVideos,
      videoBadgeIsRed
    });
  }
  
  const shouldGlow = (isCalendar && (bellNotificationCount > 0 || hasPendingInvites)) || hasUnseenNewVideos;
  const hasBottomBadge = bottomBadge || (isCalendar && eventCount > 0) || hasUnseenNewVideos;
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { markVideosAsVisited } = useVideoVisit();

  const handleVideoCardClick = async (e) => {
    e.preventDefault();
    // Segna come visitato nel context PRIMA di tutto (per aggiornare UI immediatamente)
    markVideosAsVisited();
    // Aggiorna last_video_view_at in background
    try {
      await base44.auth.updateMe({ last_video_view_at: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['videos-data'] });
    } catch (err) {
      console.error('[FeatureCard] Errore aggiornamento last_video_view_at:', err);
    }
    navigate(createPageUrl(pageName));
  };

  const content = (
    <div className="relative">
      <style>{`
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 10px 3px rgba(163, 230, 53, 0.4), 0 0 20px 6px rgba(163, 230, 53, 0.2); }
          50% { box-shadow: 0 0 15px 5px rgba(163, 230, 53, 0.6), 0 0 30px 10px rgba(163, 230, 53, 0.3); }
        }
      `}</style>
      
      <div 
        key={shouldGlow ? 'glow' : 'no-glow'}
        className={cn(
          "relative bg-slate-800/90 rounded-xl flex flex-col items-center justify-center min-h-[120px] transition-all duration-300 overflow-hidden border",
          disabled ? "opacity-50 cursor-not-allowed border-red-500/50" : "hover:bg-slate-700/90 hover:scale-105 cursor-pointer border-slate-700/50",
          hasBottomBadge ? "pb-0" : "p-6"
        )}
        style={shouldGlow && !disabled ? { animation: 'cardGlow 2s ease-in-out infinite' } : {}}
      >
        <div className={cn("flex flex-col items-center justify-center flex-1", hasBottomBadge ? "p-6 pb-3" : "")}>
          {disabled && (
            <div className="absolute top-3 right-3">
              <Lock className="w-4 h-4 text-red-400" />
            </div>
          )}
          
          {!disabled && isCalendar && (
            <div className="absolute top-3 right-3">
              <div className={cn(
                "relative w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                (bellNotificationCount > 0 || hasPendingInvites) ? "bg-[#bd0449]" : "bg-slate-900 border-2 border-lime-400"
              )}>
                <Bell className={cn("w-4 h-4", (bellNotificationCount > 0 || hasPendingInvites) ? "text-white animate-bounce" : "text-lime-400")} />
                {(bellNotificationCount > 0 || hasPendingInvites) && (
                  <span className="absolute -top-2 -right-2 bg-white text-slate-900 text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-md animate-pulse">
                    {pendingInvites > 99 ? '99+' : pendingInvites}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {!disabled && isVideo && showVideoBadge && (
            <div className="absolute top-3 right-3">
              <div className={cn(
                "min-w-[28px] h-[28px] rounded-full flex items-center justify-center px-1.5 text-sm font-bold transition-colors",
                videoBadgeIsRed 
                  ? "bg-[#bd0449] text-white" 
                  : "bg-transparent border-2 border-lime-400 text-lime-400"
              )}>
                {totalVideosCount > 99 ? '99+' : totalVideosCount}
              </div>
            </div>
          )}
          
          {Icon && <Icon className={cn("w-8 h-8 mb-3", disabled ? "text-red-400" : accentColor)} />}
          <span className={cn("text-sm font-medium text-center leading-tight break-words w-full px-1", disabled ? "text-red-300" : (isPink || isBlue) ? accentColor : "text-white")}>{title}</span>
        </div>
        
        {isCalendar && eventCount > 0 && (
          <div className="w-full text-xs font-bold text-center py-1.5 border-t bg-lime-400/20 text-lime-400 border-lime-400/30">
            {eventCount} {eventCount === 1 ? 'incontro' : 'incontri'} per te
          </div>
        )}
        {isVideo && hasUnseenNewVideos && newVideosCount > 0 && (
          <div className="w-full text-xs font-bold text-center py-1.5 border-t bg-[#bd0449]/20 text-[#bd0449] border-[#bd0449]/30">
            {newVideosCount} {newVideosCount === 1 ? 'nuovo video' : 'nuovi video'}
          </div>
        )}
        {bottomBadge && !isCalendar && !isVideo && (
          <div className={cn(
            "w-full text-xs font-bold text-center py-1.5 border-t",
            bottomBadgeType === 'requests' ? "bg-amber-400/20 text-amber-400 border-amber-400/30" : "bg-lime-400/20 text-lime-400 border-lime-400/30"
          )}>
            {bottomBadgeType === 'requests' ? `${bottomBadge} ${bottomBadge === 1 ? 'richiesta' : 'richieste'}` : `${bottomBadge} consulenze gratuite`}
          </div>
        )}
      </div>
    </div>
  );

  if (disabled) {
    return content;
  }

  // Per Video Interviste, usa handler custom che aggiorna lo stato PRIMA della navigazione
  if (isVideo) {
    return (
      <div onClick={handleVideoCardClick} className="cursor-pointer block">
        {content}
      </div>
    );
  }

  return (
    <Link to={createPageUrl(pageName)} className="cursor-pointer block">
      {content}
    </Link>
  );
}