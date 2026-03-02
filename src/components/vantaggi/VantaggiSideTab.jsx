import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function VantaggiSideTab() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const togglePanel = () => {
    if (!isOpen) {
      setIsOpen(true);
      // Naviga alla pagina VantaggiIscritti dentro l'iframe/pannello
      navigate(createPageUrl('VantaggiIscritti'));
    } else {
      setIsOpen(false);
      // Torna alla pagina precedente (Home)
      navigate(-1);
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
    </>
  );
}