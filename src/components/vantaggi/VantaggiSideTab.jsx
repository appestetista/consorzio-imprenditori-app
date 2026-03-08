import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import VantaggiPanelContent from './VantaggiPanelContent.jsx';
import { usePanels } from '../layout/GlobalTopIcons';

export default function VantaggiSideTab() {
  const [isOpen, setIsOpen] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const { hideHeader, showHeader } = usePanels();

  // Ascolta toggle della bottom nav
  useEffect(() => {
    const handler = (e) => setNavExpanded(e.detail?.expanded ?? false);
    window.addEventListener('bottomnav-toggle', handler);
    return () => window.removeEventListener('bottomnav-toggle', handler);
  }, []);

  // Quando il pannello si chiude (anche per navigazione), ripristina l'header
  useEffect(() => {
    if (!isOpen) {
      showHeader();
    }
  }, [isOpen]);

  // Safety: se il componente viene smontato con pannello aperto, ripristina l'header
  useEffect(() => {
    return () => showHeader();
  }, []);

  const togglePanel = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen) {
      hideHeader();
    }
  };

  return (
    <>
      {/* Linguetta VANTAGGI - stile 3D premium come il calendario */}
      <button
        onClick={togglePanel}
        className={cn(
          "fixed left-0 z-40 transition-all duration-300",
          "flex flex-col items-center justify-center",
          "active:scale-[0.96]",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{
          width: '42px',
          height: '120px',
          bottom: navExpanded ? '195px' : '0px',
          top: 'auto',
          transform: 'none',
          transition: 'bottom 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)'
        }}
      >
        {/* Ombra esterna flottante */}
        <div 
          className="absolute inset-0 rounded-r-[14px]"
          style={{
            boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)'
          }}
        />
        {/* Cornice metallica oro */}
        <div 
          className="absolute inset-0 rounded-r-[14px] p-[2.5px]"
          style={{
            background: 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)'
          }}
        >
          {/* Superficie interna scura */}
          <div 
            className="relative w-full h-full rounded-r-[12px] flex flex-col items-center justify-center gap-1.5 overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1a1a1a 0%, #001d3b 50%, #001530 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)'
            }}
          >
            {/* Testo VANTAGGI */}
            <span 
              className="text-[14px] font-bold tracking-wider leading-none whitespace-nowrap text-[#d4af37]"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' }}
            >
              VANTAGGI
            </span>
          </div>
        </div>
      </button>

      {/* Linguetta CHIUDI - stile 3D premium */}
      <div
        className={cn(
          "fixed left-0 z-[60] transition-all duration-300",
          "flex flex-col items-center justify-center",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{
          width: '42px',
          height: '120px',
          bottom: navExpanded ? '195px' : '0px',
          top: 'auto',
          transform: 'none',
          transition: 'bottom 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.3s'
        }}
      >
        {/* Ombra esterna */}
        <div 
          className="absolute inset-0 rounded-r-[14px]"
          style={{
            boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)'
          }}
        />
        {/* Cornice metallica oro (attivo) */}
        <div 
          className="absolute inset-0 rounded-r-[14px] p-[2.5px]"
          style={{
            background: 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)'
          }}
        >
          <button
            onClick={() => { setIsOpen(false); showHeader(); }}
            className="relative w-full h-full rounded-r-[12px] flex items-center justify-center active:scale-[0.96] overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #2a2a2a 0%, #152040 50%, #1a2850 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed'
            }}
          >
            <span className="text-[13px] font-bold tracking-widest leading-none whitespace-nowrap text-[#d4af37]" style={{ transform: 'rotate(180deg)', filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' }}>CHIUDI</span>
          </button>
        </div>
      </div>

      {/* Pannello Vantaggi - scorre da sinistra a destra (speculare al calendario) */}
      <div
        className={cn(
          "fixed inset-0 transition-transform duration-[800ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          "bg-slate-900 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "z-[55]"
        )}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <VantaggiPanelContent onClose={() => setIsOpen(false)} />
      </div>
    </>
  );
}