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
          "fixed inset-0 transition-transform duration-[800ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          "bg-slate-900 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "z-[55]"
        )}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <VantaggiPanelContent onClose={() => setIsOpen(false)} />
      </div>

      {/* Pulsante CHIUDI laterale — sul bordo destro del pannello Vantaggi */}
      {isOpen && (
        <button
          onClick={() => {
            setIsOpen(false);
            showHeader();
          }}
          className="fixed z-[56] flex items-center justify-center"
          style={{
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '42px',
            height: '120px',
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px',
            borderLeft: '2px solid rgba(212,175,55,0.27)',
            borderTop: '1px solid rgba(212,175,55,0.2)',
            borderBottom: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '-4px 0 12px rgba(0,0,0,0.3)',
          }}
        >
          <span 
            className="text-[10px] font-bold tracking-widest"
            style={{ 
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              color: '#d4af37',
              letterSpacing: '0.15em'
            }}
          >
            CHIUDI
          </span>
        </button>
      )}
    </>
  );
}