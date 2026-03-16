import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wrench, Gift, Calendar, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, bgColor = null }) {
  const [tappedItem, setTappedItem] = useState(null);
  const navigate = useNavigate();

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
          background: `linear-gradient(to top, ${bgColor || '#0a0f1a'} 75%, transparent 100%)`,
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
                <div className="absolute inset-0 rounded-[16px]" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)' }} />
                <div className="absolute inset-0 rounded-[16px] p-[2.5px]" style={{
                  background: isHighlighted
                    ? 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)'
                    : 'linear-gradient(145deg, #c0c0c0 0%, #a8a8a8 25%, #808080 50%, #c0c0c0 75%, #e8e8e8 100%)',
                  transition: 'background 0.3s ease'
                }}>
                  <div className="relative w-full h-full rounded-[14px] flex flex-col items-center justify-center overflow-hidden" style={{
                    background: isHighlighted
                      ? 'linear-gradient(160deg, #2a2a2a 0%, #152040 50%, #1a2850 100%)'
                      : 'linear-gradient(160deg, #1a1a1a 0%, #001d3b 50%, #001530 100%)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)'
                  }}>
                    <item.icon
                      className={cn(
                        "w-8 h-8 mb-0.5 relative z-10 transition-all duration-200",
                        isHighlighted ? "text-[#d4af37] stroke-[2px]" : "text-slate-400"
                      )}
                      style={{ filter: isHighlighted ? 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' : 'none' }}
                    />
                    <span className={cn(
                      "text-[10px] font-semibold relative z-10 tracking-wide transition-colors duration-200",
                      isHighlighted ? "text-[#d4af37]" : "text-slate-400"
                    )}>
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