import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import VantaggiPanelContent from './VantaggiPanelContent.jsx';
import { usePanels } from '../layout/GlobalTopIcons';

export default function VantaggiSideTab() {
  const [isOpen, setIsOpen] = useState(false);
  const { hideHeader, showHeader } = usePanels();

  const togglePanel = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen) {
      hideHeader();
    } else {
      showHeader();
    }
  };

  return (
    <>
      {/* Linguetta VANTAGGI - in sovraimpressione sul lato sinistro */}
      <button
        onClick={togglePanel}
        className={cn(
          "fixed left-0 z-40 transition-all duration-300",
          "bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-slate-900",
          "rounded-r-xl shadow-lg shadow-[#d4af37]/20",
          "flex items-center justify-center",
          "hover:pl-2 active:scale-95",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{
          width: '42px',
          height: '140px',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          bottom: '0px',
          top: 'auto',
        }}
      >
        <span className="text-[13px] font-bold tracking-wider leading-none whitespace-nowrap" style={{ transform: 'rotate(180deg)' }}>VANTAGGI</span>
      </button>

      {/* Linguetta CHIUDI - visibile solo quando il pannello è aperto */}
      {isOpen && (
        <button
          onClick={() => { setIsOpen(false); showHeader(); }}
          className="fixed left-0 z-[60] bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-slate-900 rounded-r-xl shadow-lg shadow-[#d4af37]/20 flex items-center justify-center hover:opacity-70 active:scale-95"
          style={{
            width: '42px',
            height: '140px',
            bottom: '0px',
            top: 'auto',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          <span className="text-[13px] font-bold tracking-wider leading-none whitespace-nowrap" style={{ transform: 'rotate(180deg)' }}>CHIUDI</span>
        </button>
      )}

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