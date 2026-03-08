import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  FileSearch, Shield, PiggyBank, Euro, Globe, Calculator, Briefcase, Heart, 
  Users, Truck, ShoppingBag, Star, Video, Megaphone, Monitor, User, Handshake, 
  TrendingUp, Gavel, X, Calendar, Phone, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  FileSearch, Shield, PiggyBank, Euro, Globe, Calculator, Briefcase, Heart,
  Users, Truck, ShoppingBag, Star, Video, Megaphone, Monitor, User, Handshake,
  TrendingUp, Gavel, Calendar, Phone, Gift
};

const DEFAULT_TOOLS = [
  { id: 'analisi_contratti', title: 'Analisi Contratti', icon: 'FileSearch', page: 'AnalisiContratti' },
  { id: 'compliance', title: 'Evita Sanzioni', icon: 'Shield', page: 'ComplianceAziendale' },
  { id: 'risparmio', title: 'Risparmio', icon: 'PiggyBank', page: 'RisparmioEnergetico' },
  { id: 'bandi', title: 'Bandi', icon: 'Euro', page: 'FinanziamentiAgevolati' },
  { id: 'import_export', title: 'Import / Export', icon: 'Globe', page: 'ImportExport' },
  { id: 'simulatore', title: 'Simulatore Fiscale', icon: 'Calculator', page: 'SimulatoreFiscale' },
  { id: 'consulenze', title: 'Consulenze', icon: 'Briefcase', page: 'Consulenze' },
  { id: 'welfare', title: 'Benefit Dipendenti', icon: 'Heart', page: 'WelfareAziendale' },
  { id: 'costo_personale', title: 'Costo Personale', icon: 'Users', page: 'SimulatoreCostoPersonale' },
  { id: 'fornitori', title: 'Ricerca Fornitori', icon: 'Truck', page: 'Fornitori' },
  { id: 'marketplace', title: 'Market Place', icon: 'ShoppingBag', page: 'Marketplace' },
  { id: 'video_recensioni', title: 'Video Recensioni', icon: 'Star', page: 'VideoRecensioni' },
  { id: 'video_interviste', title: 'Video Interviste', icon: 'Video', page: 'VideoInterviste' },
  { id: 'contatta_imprenditori', title: 'Contatta Imprenditori', icon: 'User', page: 'GestioneMembri' },
  { id: 'consigli', title: 'Consigli Imprenditori', icon: 'Handshake', page: 'Imprenditori' },
  { id: 'aste', title: 'Aste Immobiliari', icon: 'Gavel', page: 'AsteImmobiliari' },
  { id: 'profilo', title: 'Il Mio Profilo', icon: 'User', page: 'MyProfile' },
];

const STORAGE_KEY = 'tools_drawer_order';

function getStoredOrder() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveOrder(order) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch {}
}

export default function ToolsDrawer() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [tools, setTools] = useState(() => {
    const stored = getStoredOrder();
    if (stored) {
      // Merge stored order with defaults (in case new tools were added)
      const storedMap = new Map(stored.map((id, i) => [id, i]));
      const sorted = [...DEFAULT_TOOLS].sort((a, b) => {
        const ai = storedMap.has(a.id) ? storedMap.get(a.id) : 999;
        const bi = storedMap.has(b.id) ? storedMap.get(b.id) : 999;
        return ai - bi;
      });
      return sorted;
    }
    return DEFAULT_TOOLS;
  });

  // Drag state — ghost follows finger anywhere on screen
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 }); // posizione fantasma
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const dragItemRef = useRef(null);
  const longPressTimer = useRef(null);
  const listRef = useRef(null);
  const ghostOrigin = useRef({ x: 0, y: 0 }); // punto di partenza per offset

  // Swipe-to-open state
  const tabRef = useRef(null);
  const swipeStartX = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const DRAWER_WIDTH = 170;

  const handleTouchStartTab = (e) => {
    swipeStartX.current = e.touches[0].clientX;
  };

  const handleTouchMoveTab = (e) => {
    if (swipeStartX.current === null) return;
    const dx = e.touches[0].clientX - swipeStartX.current;
    if (dx > 0) {
      setSwipeOffset(Math.min(dx, DRAWER_WIDTH));
    }
  };

  const handleTouchEndTab = () => {
    if (swipeOffset > DRAWER_WIDTH * 0.35) {
      setIsOpen(true);
    }
    setSwipeOffset(0);
    swipeStartX.current = null;
  };

  // Long-press (3s) per attivare drag
  const handleItemTouchStart = (e, idx) => {
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    dragItemRef.current = idx;
    longPressTimer.current = setTimeout(() => {
      setDragIdx(idx);
      setDragActive(true);
      ghostOrigin.current = { x: touch.clientX, y: touch.clientY };
      setGhostPos({ x: touch.clientX, y: touch.clientY });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 3000);
  };

  const handleItemTouchMove = (e) => {
    if (!dragActive && longPressTimer.current) {
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      if (dy > 10 || dx > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleItemTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Ghost drag: segue il dito ovunque sullo schermo, calcola drop target dalla lista
  const handleDragTouchMove = useCallback((e) => {
    if (dragIdx === null) return;
    const touch = e.touches[0];
    setGhostPos({ x: touch.clientX, y: touch.clientY });

    // Calcola drop target in base alla Y del dito rispetto agli item nella lista
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-tool-idx]');
      let found = false;
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (touch.clientY < midY) {
          setDragOverIdx(i);
          found = true;
          break;
        }
      }
      if (!found && items.length > 0) {
        setDragOverIdx(items.length - 1);
      }
    }
  }, [dragIdx]);

  const handleDragTouchEnd = useCallback(() => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      setTools(prev => {
        const newTools = [...prev];
        const [moved] = newTools.splice(dragIdx, 1);
        newTools.splice(dragOverIdx, 0, moved);
        saveOrder(newTools.map(t => t.id));
        return newTools;
      });
    }
    setDragIdx(null);
    setDragOverIdx(null);
    setDragActive(false);
    setGhostPos({ x: 0, y: 0 });
    touchStartY.current = null;
    touchStartX.current = null;
    dragItemRef.current = null;
  }, [dragIdx, dragOverIdx]);

  useEffect(() => {
    if (dragActive) {
      document.addEventListener('touchmove', handleDragTouchMove, { passive: false });
      document.addEventListener('touchend', handleDragTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleDragTouchMove);
        document.removeEventListener('touchend', handleDragTouchEnd);
      };
    }
  }, [dragActive, handleDragTouchMove, handleDragTouchEnd]);

  // Chiudi drawer se si clicca/tocca ovunque fuori dal drawer (incluso BottomNav, etc.)
  const drawerRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick, true);
    return () => document.removeEventListener('pointerdown', handleOutsideClick, true);
  }, [isOpen]);

  // Actual drawer translateX
  const drawerX = isOpen ? 0 : (swipeOffset > 0 ? swipeOffset - DRAWER_WIDTH : -DRAWER_WIDTH);

  return (
    <>
      {/* Linguetta trasparente — sporge sul bordo sinistro sotto l'hamburger */}
      {!isOpen && (
        <div
          ref={tabRef}
          onTouchStart={handleTouchStartTab}
          onTouchMove={handleTouchMoveTab}
          onTouchEnd={handleTouchEndTab}
          onClick={() => setIsOpen(true)}
          className="fixed z-[45] flex items-center justify-center"
          style={{
            left: 0,
            top: '100px',
            width: '18px',
            height: '60px',
            background: 'linear-gradient(90deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)',
            borderTopRightRadius: '10px',
            borderBottomRightRadius: '10px',
            borderRight: '1.5px solid rgba(212,175,55,0.3)',
            borderTop: '1px solid rgba(212,175,55,0.15)',
            borderBottom: '1px solid rgba(212,175,55,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex flex-col gap-[3px]">
            <div className="w-[3px] h-[3px] rounded-full bg-[#d4af37]/50" />
            <div className="w-[3px] h-[3px] rounded-full bg-[#d4af37]/50" />
            <div className="w-[3px] h-[3px] rounded-full bg-[#d4af37]/50" />
          </div>
        </div>
      )}

      {/* Overlay scuro */}
      {(isOpen || swipeOffset > 0) && (
        <div 
          className="fixed inset-0 z-[49] transition-opacity duration-300"
          style={{ 
            backgroundColor: `rgba(0,0,0,${isOpen ? 0.5 : (swipeOffset / DRAWER_WIDTH) * 0.5})`,
            pointerEvents: isOpen ? 'auto' : 'none'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 bottom-0 z-[50] flex flex-col"
        style={{
          left: 0,
          width: `${DRAWER_WIDTH}px`,
          transform: `translateX(${drawerX}px)`,
          transition: swipeOffset > 0 ? 'none' : 'transform 0.35s cubic-bezier(0.25,0.1,0.25,1)',
          background: 'linear-gradient(180deg, #0c1425 0%, #0a0f1a 100%)',
          borderRight: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-16 pb-2 border-b border-[#d4af37]/15">
          <span className="text-[#d4af37] text-xs font-bold tracking-wider">STRUMENTI</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 transition-transform"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <p className="text-slate-500 text-[9px] px-3 py-1">Tieni premuto 3 sec. per riordinare</p>

        {/* Lista strumenti scrollabile — pulsanti grandi 3D verticali */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
          {tools.map((tool, idx) => {
            const Icon = ICON_MAP[tool.icon] || FileSearch;
            const isDragging = dragIdx === idx;
            const isDragOver = dragOverIdx === idx && dragIdx !== idx;

            return (
              <div
                key={tool.id}
                data-tool-idx={idx}
                className="relative transition-all duration-150"
                style={{
                  opacity: isDragging ? 0.25 : 1,
                }}
              >
                {/* Linea indicatore drop sopra */}
                {isDragOver && (
                  <div className="absolute -top-1 left-4 right-4 h-[2px] rounded-full bg-[#d4af37]" style={{ boxShadow: '0 0 8px rgba(212,175,55,0.6)' }} />
                )}
                <div
                  role="button"
                  onClick={() => { if (dragActive) return; setIsOpen(false); navigate(createPageUrl(tool.page)); }}
                  onContextMenu={(e) => e.preventDefault()}
                  onTouchStart={(e) => handleItemTouchStart(e, idx)}
                  onTouchMove={handleItemTouchMove}
                  onTouchEnd={handleItemTouchEnd}
                  className={cn("flex justify-center w-full active:scale-[0.96] transition-transform duration-100 cursor-pointer select-none", dragActive && !isDragging && "pointer-events-none")}
                >
                  <div className="w-[140px]" style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)' }}>
                    <div className="rounded-[14px] p-[2px]" style={{
                      background: 'linear-gradient(145deg, #c0c0c0 0%, #a8a8a8 25%, #808080 50%, #c0c0c0 75%, #e8e8e8 100%)'
                    }}>
                      <div className="rounded-[12px] flex flex-col items-center justify-center py-5" style={{
                        background: 'linear-gradient(160deg, #1a1a1a 0%, #001d3b 50%, #001530 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)'
                      }}>
                        <Icon className="w-6 h-6 text-[#d4af37] mb-1.5" style={{ filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.4))' }} />
                        <span className="text-slate-200 text-[11px] font-semibold tracking-wide">{tool.title}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ghost flottante — segue il dito ovunque sullo schermo */}
      {dragActive && dragIdx !== null && (() => {
        const tool = tools[dragIdx];
        const GhostIcon = ICON_MAP[tool?.icon] || FileSearch;
        return (
          <div
            className="fixed pointer-events-none"
            style={{
              zIndex: 9999,
              left: ghostPos.x - 70,
              top: ghostPos.y - 40,
              width: '140px',
              opacity: 0.9,
              transform: 'scale(1.1) rotate(-2deg)',
              transition: 'transform 0.1s ease-out',
              filter: 'drop-shadow(0 12px 24px rgba(212,175,55,0.4)) drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
            }}
          >
            <div className="rounded-[14px] p-[2px]" style={{
              background: 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)'
            }}>
              <div className="rounded-[12px] flex flex-col items-center justify-center py-5" style={{
                background: 'linear-gradient(160deg, #1a1a1a 0%, #001d3b 50%, #001530 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)'
              }}>
                <GhostIcon className="w-6 h-6 text-[#d4af37] mb-1.5" style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.6))' }} />
                <span className="text-slate-200 text-[11px] font-semibold tracking-wide">{tool?.title}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}