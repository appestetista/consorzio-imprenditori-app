import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
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

  // Ascolta evento globale dal BottomNav per aprire il pannello
  useEffect(() => {
    const handler = () => {
      if (!isOpen) {
        setIsOpen(true);
        hideHeader();
      }
    };
    window.addEventListener('open-vantaggi-panel', handler);
    return () => window.removeEventListener('open-vantaggi-panel', handler);
  }, [isOpen]);

  // Ascolta evento globale per chiudere il pannello (es. da BottomNav)
  useEffect(() => {
    const handler = () => {
      if (isOpen) {
        setIsOpen(false);
        showHeader();
      }
    };
    window.addEventListener('close-vantaggi-panel', handler);
    return () => window.removeEventListener('close-vantaggi-panel', handler);
  }, [isOpen]);

  const togglePanel = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen) {
      hideHeader();
    }
  };

  return (
    <>
      {/* Linguette laterali rimosse — apertura gestita dal BottomNav */}

      {/* Overlay scuro dietro il pannello */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[24] transition-opacity duration-[1200ms]"
          onClick={() => { setIsOpen(false); showHeader(); }}
        />
      )}

      {/* Pannello Vantaggi - scorre da sinistra, larghezza 95% */}
      <div
        className={cn(
          "fixed transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]",
          "bg-slate-900 shadow-2xl rounded-r-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "z-[25]"
        )}
        style={{ display: 'flex', flexDirection: 'column', top: 0, left: 0, width: '90%', bottom: 0 }}
      >
        <VantaggiPanelContent onClose={() => { setIsOpen(false); showHeader(); }} />

        {/* Linguetta trapezoidale integrata — visibile solo quando aperto */}
        {isOpen && (
          <button
            onClick={() => { setIsOpen(false); showHeader(); }}
            className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center active:scale-95 transition-transform"
            style={{ right: '-22px', width: '22px', height: '72px' }}
          >
            <svg width="22" height="72" viewBox="0 0 22 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
              <path d="M0 0 L0 72 L22 60 L22 12 Z" fill="#0f172a" />
              <path d="M0 0 L0 72 L22 60 L22 12 Z" stroke="#334155" strokeWidth="1" strokeLinejoin="round" style={{ strokeDasharray: '0 72 22 60 22 12', clipPath: 'inset(0 0 0 1px)' }} />
            </svg>
            <ChevronLeft className="w-8 h-8 text-[#d4af37] relative z-10" />
          </button>
        )}
      </div>
    </>
  );
}