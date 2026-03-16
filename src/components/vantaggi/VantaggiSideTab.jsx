import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

      {/* Pannello Vantaggi - scorre da sinistra a destra (speculare al calendario) */}
      <div
        className={cn(
          "fixed transition-transform duration-[800ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          "bg-slate-900 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "z-[25]"
        )}
        style={{ display: 'flex', flexDirection: 'column', top: 0, left: 0, right: 0, bottom: '0px' }}
      >
        <VantaggiPanelContent onClose={() => { setIsOpen(false); showHeader(); }} />

        {/* X chiudi in alto a destra */}
        <button
          onClick={() => { setIsOpen(false); showHeader(); }}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-800/80 border border-slate-600/50 flex items-center justify-center active:scale-90 transition-transform backdrop-blur-sm"
        >
          <X className="w-5 h-5 text-slate-300" />
        </button>
      </div>
    </>
  );
}