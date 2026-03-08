import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wrench, Home, UserRound, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import AIConsumptionBar from '../home/AIConsumptionBar';

export default function BottomNav({ currentPage, unreadMessages = 0, activeTab = null, isAdmin = false, onMenuOpen, menuOpen = false, hideBackground = false, bgColor = null, consulenzeUsate = 0, maxConsulenze = 50, userEmail = '' }) {
  const [expanded, setExpanded] = useState(false);

  // Broadcast stato expanded per i pannelli laterali
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('bottomnav-toggle', { detail: { expanded } }));
  }, [expanded]);

  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home', tab: null },
    { name: 'strumenti', label: 'Strumenti', icon: Wrench, page: 'Esplora?tab=strumenti', tab: 'strumenti' },
    { name: 'menu', label: 'My Profilo', icon: UserRound, page: 'MyProfile', tab: null },
  ];

  // Altezza pannello pulsanti (senza barra AI)
  const PANEL_HEIGHT = 120; // px: pulsanti + padding

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
        {/* Sfondo sfumato dietro barra AI */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            background: `linear-gradient(to top, ${bgColor || '#0a0f1a'} 70%, transparent 100%)`,
          }} 
        />
        {/* Barra AI */}
        <div className="relative z-10 w-full flex justify-center" style={{ maxWidth: '260px', paddingLeft: '4px', paddingRight: '4px', paddingTop: '12px', paddingBottom: '4px', pointerEvents: 'auto' }}>
          <AIConsumptionBar userEmail={userEmail} />
        </div>
        {/* Handle / freccia toggle — sotto la barra AI */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="relative z-10 flex items-center justify-center mb-1"
          style={{ pointerEvents: 'auto' }}
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

      {/* Pannello pulsanti — sale dal basso */}
      <nav 
        className="fixed left-0 right-0 z-29"
        style={{ 
          bottom: expanded ? '0px' : `-${PANEL_HEIGHT}px`,
          height: `${PANEL_HEIGHT}px`,
          transition: 'bottom 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
        }}
      >
        {/* Sfondo solido */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ background: bgColor || '#0a0f1a' }} 
        />

        {/* Pulsanti navigazione */}
        <div className="px-2 relative z-10">
          <div>
            <div className="flex justify-center items-center gap-1">
              {navItems.map((item) => {
...
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}