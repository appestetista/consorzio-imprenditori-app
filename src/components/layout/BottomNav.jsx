import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wrench, UserRound, ChevronUp, ChevronDown, Gift, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import AIConsumptionBar from '../home/AIConsumptionBar';

export default function BottomNav({ currentPage, unreadMessages = 0, activeTab = null, isAdmin = false, onMenuOpen, menuOpen = false, hideBackground = false, bgColor = null, consulenzeUsate = 0, maxConsulenze = 50, userEmail = '' }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('bottomnav-toggle', { detail: { expanded } }));
  }, [expanded]);

  const navItems = [
    { name: 'vantaggi', label: 'Vantaggi', icon: Gift, action: 'vantaggi' },
    { name: 'strumenti', label: 'Strumenti', icon: Wrench, page: 'Esplora?tab=strumenti', tab: 'strumenti' },
    { name: 'menu', label: 'My Profilo', icon: UserRound, page: 'MyProfile' },
    { name: 'calendario', label: 'Calendario', icon: Calendar, action: 'calendario' },
  ];

  const PANEL_HEIGHT = 120;

  const handleNavClick = (item) => {
    if (item.action === 'vantaggi') {
      // Emetti evento globale per aprire il pannello Vantaggi
      window.dispatchEvent(new CustomEvent('open-vantaggi-panel'));
      setExpanded(false);
    } else if (item.action === 'calendario') {
      // Emetti evento globale per aprire il pannello Calendario
      window.dispatchEvent(new CustomEvent('open-calendario-panel'));
      setExpanded(false);
    } else if (item.page) {
      navigate(createPageUrl(item.page));
    }
  };

  const isHomeActive = currentPage === 'Home';

  return (
    <>
      {/* Barra consumo AI — SEMPRE visibile fissa in basso */}
      <div 
        className="fixed left-0 right-0 z-30 flex flex-col items-center"
        style={{ 
          bottom: expanded ? `${PANEL_HEIGHT}px` : '0px',
          transition: 'bottom 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          pointerEvents: 'none',
        }}
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${bgColor || '#0a0f1a'} 70%, transparent 100%)` }} 
        />
        <div className="relative z-10 w-full flex justify-center" style={{ maxWidth: '260px', paddingLeft: '4px', paddingRight: '4px', paddingTop: '12px', paddingBottom: '4px', pointerEvents: 'auto' }}>
          <AIConsumptionBar userEmail={userEmail} />
        </div>

        {/* Riga con pulsante HOME + freccia toggle */}
        <div className="relative z-10 flex items-center justify-center gap-2 mb-1" style={{ pointerEvents: 'auto' }}>
          {/* Pulsante HOME — stesso stile della freccia ma più largo, solo scritta */}
          <Link
            to={createPageUrl('Home')}
            className="flex items-center justify-center rounded-full transition-all duration-300 active:scale-[0.96]"
            style={{
              width: '80px',
              height: '22px',
              background: isHomeActive
                ? 'linear-gradient(145deg, #2a2a2a 0%, #152040 50%, #1a2850 100%)'
                : 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
              border: isHomeActive
                ? '1px solid rgba(212,175,55,0.6)'
                : '1px solid rgba(212,175,55,0.35)',
              boxShadow: isHomeActive
                ? '0 2px 8px rgba(212,175,55,0.3), 0 0 6px rgba(212,175,55,0.2)'
                : '0 2px 8px rgba(0,0,0,0.4), 0 0 6px rgba(212,175,55,0.1)',
            }}
          >
            <span className={cn(
              "text-[11px] font-bold tracking-wider",
              isHomeActive ? "text-[#d4af37]" : "text-[#d4af37]/70"
            )} style={{ filter: isHomeActive ? 'drop-shadow(0 0 4px rgba(212,175,55,0.5))' : 'none' }}>
              HOME
            </span>
          </Link>

          {/* Freccia toggle */}
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="flex items-center justify-center"
          >
            <div 
              className="flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: '48px',
                height: '22px',
                background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                border: '1px solid rgba(212,175,55,0.35)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 6px rgba(212,175,55,0.1)',
              }}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-[#d4af37]" />
              ) : (
                <ChevronUp className="w-4 h-4 text-[#d4af37] animate-bounce" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Pannello pulsanti — sale dal basso */}
      <nav 
        className="fixed left-0 right-0"
        style={{ 
          bottom: expanded ? '0px' : `-${PANEL_HEIGHT}px`,
          height: `${PANEL_HEIGHT}px`,
          transition: 'bottom 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 29,
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: bgColor || '#0a0f1a' }} />

        <div className="px-2 relative z-10">
          <div className="flex justify-center items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.name === 'menu'
                ? currentPage === 'MyProfile'
                : item.name === 'strumenti'
                  ? activeTab === item.tab
                  : false;

              const isLink = item.page && !item.action;

              const content = (
                <div className={cn(
                  "relative w-[80px] h-[80px] transition-transform duration-100 ease-out active:scale-[0.96]"
                )}>
                  <div className="absolute inset-0 rounded-[16px]" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)' }} />
                  <div className="absolute inset-0 rounded-[16px] p-[2.5px]" style={{
                    background: isActive 
                      ? 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)'
                      : 'linear-gradient(145deg, #c0c0c0 0%, #a8a8a8 25%, #808080 50%, #c0c0c0 75%, #e8e8e8 100%)'
                  }}>
                    <div className="relative w-full h-full rounded-[14px] flex flex-col items-center justify-center overflow-hidden" style={{
                      background: isActive 
                        ? 'linear-gradient(160deg, #2a2a2a 0%, #152040 50%, #1a2850 100%)' 
                        : 'linear-gradient(160deg, #1a1a1a 0%, #001d3b 50%, #001530 100%)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)'
                    }}>
                      <item.icon 
                        className={cn(
                          "w-7 h-7 mb-1 relative z-10 transition-all duration-150",
                          isActive ? "text-[#d4af37] stroke-[2px]" : "text-[#a0a0a0]"
                        )}
                        style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' : 'none' }}
                      />
                      <span className={cn(
                        "text-[11px] font-semibold relative z-10 tracking-wide",
                        isActive ? "text-[#d4af37]" : "text-[#909090]"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
              
              if (isLink) {
                return (
                  <Link key={item.name} to={createPageUrl(item.page)} className="flex-1 flex justify-center">
                    {content}
                  </Link>
                );
              }

              return (
                <button key={item.name} onClick={() => handleNavClick(item)} className="flex-1 flex justify-center">
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}