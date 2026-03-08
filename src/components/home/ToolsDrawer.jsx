import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  FileSearch, Shield, PiggyBank, Euro, Globe, Calculator, Briefcase, Heart, 
  Users, Truck, ShoppingBag, Star, Video, Megaphone, Monitor, User, Handshake, 
  TrendingUp, Gavel, GripVertical, X, Calendar, Phone, Gift
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
  { id: 'calendario', title: 'Calendario', icon: 'Calendar', page: 'CalendarioIncontri' },
  { id: 'contatta_consorzio', title: 'Contatta Consorzio', icon: 'Phone', page: 'ContattaConsorzio' },
  { id: 'prenotazioni', title: 'Le Mie Prenotazioni', icon: 'Gift', page: 'MiePrenotazioniVantaggi' },
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

  // Drag state
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const touchStartY = useRef(null);
  const dragItemRef = useRef(null);
  const listRef = useRef(null);

  // Swipe-to-open state
  const tabRef = useRef(null);
  const swipeStartX = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const DRAWER_WIDTH = 220;

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

  // Drag-and-drop via touch
  const handleDragTouchStart = (e, idx) => {
    touchStartY.current = e.touches[0].clientY;
    setDragIdx(idx);
    dragItemRef.current = idx;
  };

  const handleDragTouchMove = useCallback((e) => {
    if (dragIdx === null || !listRef.current) return;
    const touch = e.touches[0];
    const items = listRef.current.querySelectorAll('[data-tool-idx]');
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        setDragOverIdx(i);
        break;
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
    touchStartY.current = null;
    dragItemRef.current = null;
  }, [dragIdx, dragOverIdx]);

  useEffect(() => {
    if (dragIdx !== null) {
      document.addEventListener('touchmove', handleDragTouchMove, { passive: false });
      document.addEventListener('touchend', handleDragTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleDragTouchMove);
        document.removeEventListener('touchend', handleDragTouchEnd);
      };
    }
  }, [dragIdx, handleDragTouchMove, handleDragTouchEnd]);

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
        <div className="flex items-center justify-between px-3 pt-12 pb-2 border-b border-[#d4af37]/15">
          <span className="text-[#d4af37] text-xs font-bold tracking-wider">STRUMENTI</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        <p className="text-slate-500 text-[9px] px-3 py-1">Tieni premuto ≡ per riordinare</p>

        {/* Lista strumenti scrollabile */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-1 px-1.5">
          {tools.map((tool, idx) => {
            const Icon = ICON_MAP[tool.icon] || FileSearch;
            const isDragging = dragIdx === idx;
            const isDragOver = dragOverIdx === idx && dragIdx !== idx;

            return (
              <div
                key={tool.id}
                data-tool-idx={idx}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all mb-0.5",
                  isDragging && "opacity-50 scale-95 bg-[#d4af37]/10",
                  isDragOver && "border-t-2 border-[#d4af37]",
                  !isDragging && !isDragOver && "active:bg-white/5"
                )}
              >
                {/* Grip handle */}
                <div
                  onTouchStart={(e) => handleDragTouchStart(e, idx)}
                  className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1"
                >
                  <GripVertical className="w-3.5 h-3.5 text-slate-600" />
                </div>

                {/* Tool button */}
                <Link
                  to={createPageUrl(tool.page)}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(145deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.05) 100%)',
                      border: '1px solid rgba(212,175,55,0.2)',
                    }}
                  >
                    <Icon className="w-4 h-4 text-[#d4af37]" />
                  </div>
                  <span className="text-slate-200 text-xs font-medium truncate">{tool.title}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}