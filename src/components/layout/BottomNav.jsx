import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wrench, Home, UserRound, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import AIConsumptionBar from '../home/AIConsumptionBar';

export default function BottomNav({ currentPage, unreadMessages = 0, activeTab = null, isAdmin = false, onMenuOpen, menuOpen = false, hideBackground = false, bgColor = null, consulenzeUsate = 0, maxConsulenze = 50, userEmail = '' }) {
  const [expanded, setExpanded] = useState(false);

  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home', tab: null },
    { name: 'strumenti', label: 'Strumenti', icon: Wrench, page: 'Esplora?tab=strumenti', tab: 'strumenti' },
    { name: 'menu', label: 'My Profilo', icon: UserRound, page: 'MyProfile', tab: null },
  ];

  return (
    <>
      {/* Handle / freccia per espandere/collassare — sempre visibile in basso */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="fixed left-0 right-0 z-30 flex items-center justify-center"
        style={{
          bottom: expanded ? '195px' : '0px',
          height: '28px',
          transition: 'bottom 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      >
        {/* Sfondo sfumato per la handle */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            background: `linear-gradient(to top, ${bgColor || '#0a0f1a'} 60%, transparent 100%)` 
          }} 
        />
        {/* Freccia indicatore */}
        <div 
          className="relative z-10 flex items-center justify-center rounded-full transition-all duration-300"
          style={{
            width: '48px',
            height: '24px',
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.4), 0 0 8px rgba(212,175,55,0.1)',
          }}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#d4af37]" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[#d4af37] animate-bounce" />
          )}
        </div>
      </button>

      {/* Pannello che sale dal basso */}
      <nav 
        className="fixed left-0 right-0 z-29"
        style={{ 
          bottom: expanded ? '0px' : '-200px',
          height: '195px',
          transition: 'bottom 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'flex-end', 
          paddingBottom: '20px',
        }}
      >
        {/* Sfondo solido */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ background: bgColor || '#0a0f1a' }} 
        />
        {/* Bordo superiore decorativo */}
        <div 
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(212,175,55,0.25) 50%, transparent 90%)' }}
        />

        {/* Barra consumo AI */}
        <div className="relative z-10 w-full flex justify-center mb-2" style={{ maxWidth: '260px', margin: '0 auto 8px auto', paddingLeft: '4px', paddingRight: '4px', paddingTop: '12px', overflow: 'visible' }}>
          <AIConsumptionBar userEmail={userEmail} />
        </div>

        {/* Pulsanti navigazione */}
        <div className="px-2 relative z-10">
          <div>
            <div className="flex justify-center items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.name === 'home'
                  ? currentPage === 'Home'
                  : item.name === 'menu'
                    ? currentPage === 'MyProfile'
                    : activeTab === item.tab;
                
                const Wrapper = item.disabled ? 'div' : Link;
                const wrapperProps = item.disabled ? {} : { to: createPageUrl(item.page) };
                
                return (
                  <Wrapper
                    key={item.name}
                    {...wrapperProps}
                    className="flex-1 flex justify-center"
                  >
                    {/* Pulsante 3D Premium con cornice oro */}
                    <div 
                      className={cn(
                        "relative w-[80px] h-[80px] transition-transform duration-100 ease-out",
                        !item.disabled && "active:scale-[0.96]",
                        item.disabled && "opacity-40"
                      )}
                    >
                      {/* Ombra esterna per effetto flottante */}
                      <div 
                        className="absolute inset-0 rounded-[16px]"
                        style={{
                          boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)'
                        }}
                      />

                      {/* Cornice metallica argento/oro */}
                      <div 
                        className="absolute inset-0 rounded-[16px] p-[2.5px]"
                        style={{
                          background: isActive 
                            ? 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)'
                            : 'linear-gradient(145deg, #c0c0c0 0%, #a8a8a8 25%, #808080 50%, #c0c0c0 75%, #e8e8e8 100%)'
                        }}
                      >
                        {/* Superficie interna nero → blu scuro */}
                        <div 
                          className="relative w-full h-full rounded-[14px] flex flex-col items-center justify-center overflow-hidden"
                          style={{
                            background: isActive 
                              ? 'linear-gradient(160deg, #2a2a2a 0%, #152040 50%, #1a2850 100%)' 
                              : 'linear-gradient(160deg, #1a1a1a 0%, #001d3b 50%, #001530 100%)',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)'
                          }}
                        >
                          {/* Icona */}
                          {item.customImage ? (
                            <img 
                              src={item.customImage} 
                              alt="QR" 
                              className={cn(
                                "w-10 h-10 relative z-10 object-contain transition-all duration-150",
                                isActive ? "brightness-125" : "brightness-75 grayscale"
                              )}
                              style={{
                                filter: isActive 
                                  ? 'drop-shadow(0 0 6px rgba(212,175,55,0.5)) brightness(1.25) sepia(1) hue-rotate(5deg) saturate(3)' 
                                  : 'brightness(0.6) grayscale(0.5)'
                              }}
                            />
                          ) : item.icon ? (
                            <item.icon 
                              className={cn(
                                "w-7 h-7 mb-1 relative z-10 transition-all duration-150",
                                isActive 
                                  ? "text-[#d4af37] stroke-[2px]" 
                                  : "text-[#a0a0a0]"
                              )}
                              style={{
                                filter: isActive ? 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' : 'none'
                              }}
                            />
                          ) : null}

                          {/* Label */}
                          {item.label && (
                            <span 
                              className={cn(
                                "text-[11px] font-semibold relative z-10 tracking-wide",
                                isActive ? "text-[#d4af37]" : "text-[#909090]"
                              )}
                            >
                              {item.label}
                            </span>
                          )}

                          {/* Badge notifiche */}
                          {item.badge > 0 && (
                            <span 
                              className="absolute top-1 right-1 bg-red-500 text-white text-[8px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold z-20"
                              style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}