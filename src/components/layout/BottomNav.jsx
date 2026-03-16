import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wrench, Gift, Calendar, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '../context/ThemeContext';

export default function BottomNav({ currentPage, bgColor = null }) {
  const [tappedItem, setTappedItem] = useState(null);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Pagine che fanno parte degli "Strumenti" — il pulsante resta evidenziato
  const strumentiPages = [
    'Esplora', 'AnalisiContratti', 'ComplianceAziendale', 'RisparmioEnergetico',
    'FinanziamentiAgevolati', 'ImportExport', 'SimulatoreFiscale', 'Consulenze',
    'WelfareAziendale', 'WelfareNormativa', 'WelfareTipologie', 'WelfareOrdina', 'WelfareStorico',
    'SimulatoreCostoPersonale', 'Fornitori', 'Marketplace',
    'VideoRecensioni', 'VideoInterviste', 'GestioneMembri', 'Imprenditori',
    'AsteImmobiliari', 'AsteSalvate', 'PromemoriaAste',
    'CulturaAziendale', 'FiscalitaEnergetica',
    'RisparmioDettaglio', 'ProfiloBandi', 'CruscottoFiscale',
    'VantaggiIscritti', 'MiePrenotazioniVantaggi', 'GestioneVantaggi', 'ScannerQRVantaggi',
    'ContattaConsorzio', 'ContattaMembri', 'DirectoryUtenti',
    'SimulatoreApp', 'RichiestaWelfare', 'CatalogoBuoniPasto',
    'QRCodeHub', 'MioQRCode', 'Messaggi', 'Pricing',
  ];

  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home' },
    { name: 'vantaggi', label: 'Vantaggi', icon: Gift, action: 'vantaggi' },
    { name: 'strumenti', label: 'Strumenti', icon: Wrench, page: 'Esplora?tab=strumenti' },
    { name: 'calendario', label: 'Calendario', icon: Calendar, action: 'calendario' },
  ];

  const handleNavClick = (item) => {
    setTappedItem(item.name);
    setTimeout(() => setTappedItem(null), 600);
    if (item.action === 'vantaggi') {
      window.dispatchEvent(new CustomEvent('open-vantaggi-panel'));
    } else if (item.action === 'calendario') {
      window.dispatchEvent(new CustomEvent('close-vantaggi-panel'));
      window.dispatchEvent(new CustomEvent('close-tools-drawer'));
      window.dispatchEvent(new CustomEvent('open-calendario-panel'));
    } else if (item.page) {
      window.dispatchEvent(new CustomEvent('close-vantaggi-panel'));
      window.dispatchEvent(new CustomEvent('close-tools-drawer'));
      navigate(createPageUrl(item.page));
    }
  };

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-[30]"
      style={{ pointerEvents: 'none' }}
    >
      {/* Sfondo sfumato che sale sopra i pulsanti */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to top, var(--app-bg, ${bgColor || '#0a0f1a'}) 75%, transparent 100%)`,
          top: '-40px',
        }}
      />

      <div className="relative z-10 flex justify-center items-end pb-3 pt-1 px-2" style={{ pointerEvents: 'auto' }}>
        <div className="flex justify-center items-center gap-1.5">
          {navItems.map((item) => {
            const isActive =
              item.name === 'home' ? currentPage === 'Home' :
              item.name === 'strumenti' ? strumentiPages.includes(currentPage) :
              false;
            const isTapped = tappedItem === item.name;
            const isHighlighted = isActive || isTapped;

            const content = (
              <div className={cn("relative w-[78px] h-[78px] transition-transform duration-100 ease-out active:scale-[0.96]")}>
                <div className="absolute inset-0 rounded-[16px]" style={{ boxShadow: 'var(--app-shadow-card)' }} />
                <div className="absolute inset-0 rounded-[16px] p-[2.5px]" style={{
                  background: isHighlighted
                    ? 'var(--app-gradient-border-active)'
                    : 'var(--app-gradient-border-inactive)',
                  transition: 'background 0.3s ease'
                }}>
                  <div className="relative w-full h-full rounded-[14px] flex flex-col items-center justify-center overflow-hidden" style={{
                    background: isHighlighted
                      ? (isDark ? 'linear-gradient(160deg, #2a2a2a 0%, #152040 50%, #1a2850 100%)' : 'linear-gradient(160deg, #e8e0d0 0%, #f5f0e5 50%, #ede5d5 100%)')
                      : 'var(--app-gradient-card)',
                    boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)' : 'inset 0 2px 4px rgba(0,0,0,0.06), inset 0 -1px 2px rgba(255,255,255,0.5)'
                  }}>
                    <item.icon
                      className="w-8 h-8 mb-0.5 relative z-10 transition-all duration-200"
                      style={{
                        color: isHighlighted ? 'var(--app-accent)' : (isDark ? 'var(--app-text-muted)' : '#000000'),
                        strokeWidth: isHighlighted ? 2 : undefined,
                        filter: isHighlighted ? `drop-shadow(0 0 6px var(--app-accent-glow))` : 'none'
                      }}
                    />
                    <span className="text-[10px] font-semibold relative z-10 tracking-wide transition-colors duration-200" style={{
                      color: isHighlighted ? 'var(--app-accent)' : (isDark ? 'var(--app-text-muted)' : '#000000')
                    }}>
                      {item.label}
                    </span>
                  </div>
                </div>
              </div>
            );

            if (item.page && !item.action) {
              return (
                <button key={item.name} onClick={() => handleNavClick(item)}>
                  {content}
                </button>
              );
            }

            return (
              <button key={item.name} onClick={() => handleNavClick(item)}>
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}