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

      {/* Pulsante CHIUDI 3D — in basso a sinistra */}
      {isOpen && (
        <button
          onClick={() => {
            setIsOpen(false);
            showHeader();
          }}
          className="fixed z-[56] active:scale-95 transition-transform duration-100"
          style={{
            left: '16px',
            bottom: '24px',
          }}
        >
          <div style={{
            boxShadow: '0 6px 18px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)',
            borderRadius: '14px',
          }}>
            <div style={{
              borderRadius: '14px',
              padding: '2px',
              background: 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)',
            }}>
              <div style={{
                borderRadius: '12px',
                padding: '10px 24px',
                background: 'linear-gradient(160deg, #2a2a2a 0%, #152040 50%, #1a2850 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)',
              }}>
                <span className="text-[12px] font-bold tracking-widest text-[#d4af37]" style={{ filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.5))' }}>
                  CHIUDI
                </span>
              </div>
            </div>
          </div>
        </button>
      )}
    </>
  );
}