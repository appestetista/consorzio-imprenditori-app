import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, Bell, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useVideoVisit } from '../context/VideoVisitContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  latestVideoDate = null,
  consulenzeMessagesCount = 0,
  contractUsageCount = 0,
  contractUsageLimit = 5,
  contractMessagesCount = 0,
  vantaggiNotifications = 0
}) {
  const isPink = variant === 'pink';
  const isBlue = variant === 'blue';
  const isGold = variant === 'gold';
  const accentColor = isPink ? 'text-pink-400' : isBlue ? 'text-blue-400' : isGold ? 'text-[#d4af37]' : 'text-lime-400';
  
  const isCalendar = pageName === 'CalendarioIncontri';
  const isVideo = pageName === 'VideoInterviste';
  const isConsulenze = pageName === 'Consulenze';
  const isAnalisiContratti = pageName === 'AnalisiContratti';
  const isVantaggi = pageName === 'VantaggiIscritti';
  
  // Vantaggi: campanella oro con notifiche prenotazioni
  const hasVantaggiNotifications = isVantaggi && (vantaggiNotifications > 0 || notificationCount > 0);
  const vantaggiNotifCount = vantaggiNotifications || notificationCount;
  
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
  
  // Consulenze: campanella oro con messaggi non letti
  const hasConsulenzeMessages = isConsulenze && consulenzeMessagesCount > 0;
  
  // Analisi Contratti: campanella con messaggi non letti
  const hasContractMessages = isAnalisiContratti && contractMessagesCount > 0;
  
  const hasGenericNotifications = !isCalendar && !isVideo && !isConsulenze && !isAnalisiContratti && !isVantaggi && notificationCount > 0;
  const shouldGlow = (isCalendar && (bellNotificationCount > 0 || hasPendingInvites)) || hasUnseenNewVideos || hasConsulenzeMessages || hasContractMessages || hasVantaggiNotifications || hasGenericNotifications;
  const hasBottomBadge = bottomBadge || (isCalendar && eventCount > 0) || hasUnseenNewVideos;
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { markVideosAsVisited } = useVideoVisit();
  const [showHelpVideo, setShowHelpVideo] = useState(false);
  
  // Mappa dei video help per ogni pagina
  const helpVideos = {
    'AnalisiContratti': 'https://youtube.com/shorts/ABoFWp_q_Qc'
  };
  
  const hasHelpVideo = helpVideos[pageName];

  const saveScrollPosition = () => {
    try { sessionStorage.setItem('home_scroll_y', String(window.scrollY)); } catch {}
  };

  const handleVideoCardClick = async (e) => {
    e.preventDefault();
    saveScrollPosition();
    markVideosAsVisited();
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
                {/* Icona Video Help - posizionata sull'angolo esterno in basso a sinistra */}
                {!disabled && hasHelpVideo && (
                  <div 
                    className="absolute -bottom-2 -left-2 z-40 cursor-pointer hover:scale-110 transition-transform"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowHelpVideo(true);
                    }}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-[#a0a0a0] flex items-center justify-center bg-slate-900">
                      <Video className="w-5 h-5 text-[#a0a0a0]" />
                    </div>
                  </div>
                )}
                <style>{`
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 10px 3px rgba(212, 175, 55, 0.4), 0 0 20px 6px rgba(212, 175, 55, 0.2); }
          50% { box-shadow: 0 0 15px 5px rgba(212, 175, 55, 0.6), 0 0 30px 10px rgba(212, 175, 55, 0.3); }
        }
      `}</style>
      
      {/* Contenitore con effetto glassmorphism trasparente + 3D */}
      <div 
        key={shouldGlow ? 'glow' : 'no-glow'}
        className={cn(
          "relative min-h-[120px] transition-all duration-150",
          disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.96] cursor-pointer hover:scale-[1.02]"
        )}
        style={{
          borderRadius: '20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)',
          ...(shouldGlow && !disabled ? { animation: 'cardGlow 2s ease-in-out infinite' } : {})
        }}
      >
        {/* Bordo sottile vetro con riflesso superiore */}
        <div 
          className="absolute inset-0 rounded-[20px] p-[1px]"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.35) 0%, rgba(180,210,255,0.2) 30%, rgba(255,255,255,0.08) 70%, rgba(150,180,220,0.15) 100%)'
          }}
        >
          {/* Superficie glass trasparente */}
          <div 
            className={cn(
              "relative w-full h-full rounded-[19px] flex flex-col overflow-hidden backdrop-blur-sm",
              hasBottomBadge ? "" : ""
            )}
            style={{
              background: 'rgba(20, 40, 80, 0.28)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.1)'
            }}
          >

            
            <div className={cn("flex flex-col items-center justify-center flex-1 relative z-10", hasBottomBadge ? "p-6 pb-3" : "p-6")}>
              {disabled && (
                <div className="absolute top-3 right-3">
                  <Lock className="w-4 h-4 text-red-400" />
                </div>
              )}
              
              {/* Icona Video Help - in basso a sinistra con cerchio, fuori dal contenuto */}
              
              {!disabled && isCalendar && (
                <div className="absolute top-3 right-3">
                  <div className={cn(
                    "relative w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    (bellNotificationCount > 0 || hasPendingInvites) ? "bg-[#bd0449]" : "bg-slate-900/80 border-2 border-slate-500"
                  )}>
                    <Bell className={cn("w-4 h-4", (bellNotificationCount > 0 || hasPendingInvites) ? "text-white animate-bounce" : "text-slate-400")} />
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
                      : "bg-transparent border-2 border-slate-500 text-slate-400"
                  )}>
                    {totalVideosCount > 99 ? '99+' : totalVideosCount}
                  </div>
                </div>
              )}
              
              {/* Campanella Consulenze */}
              {!disabled && isConsulenze && (
                <div className="absolute top-3 right-3">
                  <div className={cn(
                    "relative w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    hasConsulenzeMessages ? "bg-lime-400" : "bg-slate-900/80 border-2 border-slate-500"
                  )}>
                    <Bell className={cn("w-4 h-4", hasConsulenzeMessages ? "text-slate-900 animate-bounce" : "text-slate-400")} />
                    {hasConsulenzeMessages && (
                      <span className="absolute -top-2 -right-2 bg-white text-slate-900 text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-md animate-pulse">
                        {consulenzeMessagesCount > 99 ? '99+' : consulenzeMessagesCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Campanella Analisi Contratti */}
              {!disabled && isAnalisiContratti && (
                <div className="absolute top-3 right-3">
                  <div className={cn(
                    "relative w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    hasContractMessages ? "bg-lime-400" : "bg-slate-900/80 border-2 border-slate-500"
                  )}>
                    <Bell className={cn("w-4 h-4", hasContractMessages ? "text-slate-900 animate-bounce" : "text-slate-400")} />
                    {hasContractMessages && (
                      <span className="absolute -top-2 -right-2 bg-white text-slate-900 text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-md animate-pulse">
                        {contractMessagesCount > 99 ? '99+' : contractMessagesCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Campanella Vantaggi Iscritti */}
              {!disabled && isVantaggi && (
                <div className="absolute top-3 right-3">
                  <div className={cn(
                    "relative w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    hasVantaggiNotifications ? "bg-[#d4af37]" : "bg-slate-900/80 border-2 border-slate-500"
                  )}>
                    <Bell className={cn("w-4 h-4", hasVantaggiNotifications ? "text-slate-900 animate-bounce" : "text-slate-400")} />
                    {hasVantaggiNotifications && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-md animate-pulse">
                        {vantaggiNotifCount > 99 ? '99+' : vantaggiNotifCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Campanella generica per tutte le altre card con notifiche */}
              {!disabled && !isCalendar && !isVideo && !isConsulenze && !isAnalisiContratti && !isVantaggi && (
                <div className="absolute top-3 right-3">
                  <div className={cn(
                    "relative w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    notificationCount > 0 ? "bg-lime-400" : "bg-slate-900/80 border-2 border-slate-500"
                  )}>
                    <Bell className={cn("w-4 h-4", notificationCount > 0 ? "text-slate-900 animate-bounce" : "text-slate-400")} />
                    {notificationCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-md animate-pulse">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {Icon && <Icon className={cn("w-8 h-8 mb-2", disabled ? "text-red-400" : isGold ? "text-[#d4af37]" : "text-white/90")} />}
              <span className={cn("text-sm font-medium text-center leading-tight break-words w-full px-1", disabled ? "text-red-300" : "text-white/95", isAnalisiContratti && "whitespace-nowrap")}>{title}</span>
              
              {/* Progress bar per Analisi Contratti - sotto il titolo */}
              {isAnalisiContratti && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-300 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (contractUsageCount / contractUsageLimit) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-white/70 font-medium">{contractUsageCount}/{contractUsageLimit}</span>
                </div>
              )}
            </div>
            
            {isCalendar && eventCount > 0 && (
            <div className="w-full text-xs font-bold text-center py-1.5 border-t bg-white/5 text-white/80 border-white/10 relative z-10">
              {eventCount} {eventCount === 1 ? 'incontro' : 'incontri'} per te
            </div>
            )}
            {isVideo && hasUnseenNewVideos && newVideosCount > 0 && (
              <div className="w-full text-xs font-bold text-center py-1.5 border-t bg-[#bd0449]/20 text-[#bd0449] border-[#bd0449]/30 relative z-10">
                {newVideosCount} {newVideosCount === 1 ? 'nuovo video' : 'nuovi video'}
              </div>
            )}
            {bottomBadge && !isCalendar && !isVideo && !isAnalisiContratti && (
                                                <div className={cn(
                                                  "w-full text-xs font-bold text-center py-1.5 -mt-1 border-t relative z-10",
                                                  bottomBadgeType === 'requests' ? "bg-amber-400/15 text-amber-300 border-amber-400/20" : "bg-white/5 text-white/80 border-white/10"
                                                )}>
                                                  {bottomBadgeType === 'requests' ? `${bottomBadge} ${bottomBadge === 1 ? 'richiesta' : 'richieste'}` : `${bottomBadge} cons. gratuite`}
                                                </div>
                                              )}
                                              

          </div>
          </div>
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
    <>
      <Link to={createPageUrl(pageName)} onClick={saveScrollPosition} className="cursor-pointer block">
        {content}
      </Link>
      
      {/* Popup Video Help */}
      <Dialog open={showHelpVideo} onOpenChange={setShowHelpVideo}>
        <DialogContent className="sm:max-w-[280px] p-0 bg-black border-slate-700 overflow-hidden">
          <button 
            onClick={() => setShowHelpVideo(false)}
            className="absolute top-2 right-2 z-50 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="aspect-[9/16] w-full">
            <iframe
              src={`https://www.youtube.com/embed/${helpVideos[pageName]?.split('/').pop()}?autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}