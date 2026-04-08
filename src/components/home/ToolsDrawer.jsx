import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  FileSearch, Shield, PiggyBank, Euro, Globe, Calculator, Briefcase, Heart, 
  Users, Truck, ShoppingBag, Star, Video, Megaphone, Monitor, User, Handshake, 
  TrendingUp, Gavel, X, Calendar, Phone, Gift, Bell, Ship, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '../context/ThemeContext';

// Mappa source messaggi → tool id nel drawer
const SOURCE_TO_TOOL = {
  consulenze: 'consulenze',
  marketplace: 'marketplace',
  video: 'video_interviste',
  cultura_aziendale: 'video_recensioni',
  import_export: 'export',
  analisi_contratti: 'analisi_contratti',
  calendario: null, // non c'è nel drawer
  finanziamenti: 'bandi',
  imprenditori: 'consigli',
  fornitori: 'fornitori',
  welfare: 'welfare',
  compliance: 'compliance',
  aste: 'aste',
  vantaggi: null,
  risparmio_assicurazioni: 'risparmio',
  risparmio_luce: 'risparmio',
  risparmio_gas: 'risparmio',
  risparmio_efficientamento: 'risparmio',
  risparmio_fotovoltaico: 'risparmio',
  risparmio_telefonia: 'risparmio',
  risparmio_internet: 'risparmio',
  fiscalita_energetica: 'risparmio',
};

// Mappa tipo notifica → tool id
const NOTIF_TYPE_TO_TOOL = {
  consultation: 'consulenze',
  video: 'video_interviste',
  cultura_aziendale: 'video_recensioni',
};

const ICON_MAP = {
  FileSearch, Shield, PiggyBank, Euro, Globe, Calculator, Briefcase, Heart,
  Users, Truck, ShoppingBag, Star, Video, Megaphone, Monitor, User, Handshake,
  TrendingUp, Gavel, Calendar, Phone, Gift, Ship
};

const DEFAULT_TOOLS = [
  // Soldi e Finanza
  { id: 'bandi', title: 'Bandi', icon: 'Euro', page: 'FinanziamentiAgevolati' },
  { id: 'simulatore', title: 'Simulatore Fiscale', icon: 'Calculator', page: 'SimulatoreFiscale' },
  { id: 'risparmio', title: 'Risparmio Bollette', icon: 'PiggyBank', page: 'RisparmioEnergetico' },
  // Protezione legale
  { id: 'compliance', title: 'Evita Sanzioni', icon: 'Shield', page: 'ComplianceAziendale' },
  { id: 'analisi_contratti', title: 'Analisi Contratti', icon: 'FileSearch', page: 'AnalisiContratti' },
  // Crescita e operatività
  { id: 'export', title: 'Export', icon: 'Globe', page: 'ImportExport' },
  { id: 'import', title: 'Import', icon: 'Ship', page: 'ImportExport?tab=import' },
  { id: 'consulenze', title: 'Consulenze', icon: 'Briefcase', page: 'Consulenze' },
  { id: 'costo_personale', title: 'Costo Personale', icon: 'Users', page: 'SimulatoreCostoPersonale' },
  { id: 'fornitori', title: 'Ricerca Fornitori', icon: 'Truck', page: 'Fornitori' },
  // HR e welfare
  { id: 'welfare', title: 'Benefit Dipendenti', icon: 'Heart', page: 'WelfareAziendale' },
  { id: 'marketplace', title: 'Market Place', icon: 'ShoppingBag', page: 'Marketplace' },
  // Networking
  { id: 'contatta_imprenditori', title: 'Contatta Imprenditori', icon: 'User', page: 'GestioneMembri' },
  { id: 'consigli', title: 'Consigli Imprenditori', icon: 'Handshake', page: 'Imprenditori' },
  { id: 'video_interviste', title: 'Video Interviste', icon: 'Video', page: 'VideoInterviste' },
  { id: 'video_recensioni', title: 'Video Recensioni', icon: 'Star', page: 'VideoRecensioni' },
  { id: 'aste', title: 'Aste Immobiliari', icon: 'Gavel', page: 'AsteImmobiliari' },
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
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentEmail(u?.email)).catch(() => {});
  }, []);

  // Messaggi non letti per l'utente corrente
  const { data: unreadMessages = [] } = useQuery({
    queryKey: ['drawer-unread-messages', currentEmail],
    queryFn: () => base44.entities.Message.filter({ to_email: currentEmail, is_read: false }),
    enabled: !!currentEmail,
    refetchInterval: 15000,
  });

  // Notifiche non lette (non-message) per l'utente corrente
  const { data: unreadNotifs = [] } = useQuery({
    queryKey: ['drawer-unread-notifs', currentEmail],
    queryFn: () => base44.entities.Notification.filter({ user_email: currentEmail, is_read: false }),
    enabled: !!currentEmail,
    refetchInterval: 15000,
  });

  // Calcola badge per ogni tool
  const toolBadges = React.useMemo(() => {
    const counts = {};
    // Conta messaggi non letti per source
    for (const msg of unreadMessages) {
      const source = msg.source || 'diretto';
      const toolId = SOURCE_TO_TOOL[source];
      if (toolId) {
        counts[toolId] = (counts[toolId] || 0) + 1;
      }
    }
    // Conta notifiche non lette per tipo (escluse message, già coperte sopra)
    for (const notif of unreadNotifs) {
      if (notif.type === 'message') continue;
      const toolId = NOTIF_TYPE_TO_TOOL[notif.type];
      if (toolId) {
        counts[toolId] = (counts[toolId] || 0) + 1;
      }
    }
    return counts;
  }, [unreadMessages, unreadNotifs]);

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
  const [justDroppedId, setJustDroppedId] = useState(null); // id del tool appena spostato (resta dorato)
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

  // Long-press (2s) per attivare drag
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
    }, 1000);
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
    let movedToolId = null;
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      setTools(prev => {
        const newTools = [...prev];
        const [moved] = newTools.splice(dragIdx, 1);
        movedToolId = moved.id;
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
    // Evidenzia il pulsante spostato con bordo dorato per 1.5s
    if (movedToolId) {
      setJustDroppedId(movedToolId);
      setTimeout(() => setJustDroppedId(null), 1500);
    }
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

  // Ascolta evento globale per chiudere il drawer (es. da BottomNav)
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener('close-tools-drawer', handler);
    return () => window.removeEventListener('close-tools-drawer', handler);
  }, []);

  // Actual drawer translateX
  const drawerX = isOpen ? 0 : (swipeOffset > 0 ? swipeOffset - DRAWER_WIDTH : -DRAWER_WIDTH);

  return (
    <>
      {/* Linguetta verde fluo — sporge sul bordo destro */}
      {!isOpen && (
        <div
          ref={tabRef}
          onTouchStart={handleTouchStartTab}
          onTouchMove={handleTouchMoveTab}
          onTouchEnd={handleTouchEndTab}
          onClick={() => setIsOpen(true)}
          className="fixed z-[45] flex items-center justify-center"
          style={{
            right: 0,
            top: '100px',
            width: '18px',
            height: '60px',
            background: isDark
              ? 'linear-gradient(270deg, rgba(254,242,0,0.3) 0%, transparent 100%)'
              : 'linear-gradient(270deg, rgba(0,80,255,0.6) 0%, rgba(0,80,255,0.15) 100%)',
            borderTopLeftRadius: '10px',
            borderBottomLeftRadius: '10px',
            borderLeft: isDark ? '1.5px solid rgba(254,242,0,0.6)' : '2px solid rgba(0,80,255,0.85)',
            borderTop: isDark ? '1px solid rgba(254,242,0,0.3)' : '1.5px solid rgba(0,80,255,0.5)',
            borderBottom: isDark ? '1px solid rgba(254,242,0,0.3)' : '1.5px solid rgba(0,80,255,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex flex-col gap-[3px]">
            <div className="w-[3.5px] h-[3.5px] rounded-full" style={{ backgroundColor: isDark ? '#fef200' : '#0050ff' }} />
            <div className="w-[3.5px] h-[3.5px] rounded-full" style={{ backgroundColor: isDark ? '#fef200' : '#0050ff' }} />
            <div className="w-[3.5px] h-[3.5px] rounded-full" style={{ backgroundColor: isDark ? '#fef200' : '#0050ff' }} />
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
          background: isDark ? 'linear-gradient(180deg, #0c1425 0%, #0a0f1a 100%)' : 'var(--app-bg)',
          borderRight: `1px solid var(--app-border-accent)`,
          boxShadow: isDark ? '4px 0 20px rgba(0,0,0,0.5)' : '4px 0 20px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-16 pb-2 border-b border-[#d4af37]/15">
          <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--app-text-primary)' }}>STRUMENTI</span>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 transition-transform"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <p className="text-[9px] px-3 py-1" style={{ color: 'var(--app-text-secondary)' }}>Tieni premuto 1 sec. per riordinare</p>

        {/* Lista strumenti scrollabile — pulsanti grandi 3D verticali */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2 px-2 pb-40">
          {tools.map((tool, idx) => {
            const Icon = ICON_MAP[tool.icon] || FileSearch;
            const isDragging = dragIdx === idx;
            const isJustDropped = justDroppedId === tool.id;
            // Calcola se questo item deve spostarsi per fare posto al drop
            const shouldMakeSpace = dragActive && dragIdx !== null && dragOverIdx !== null && idx !== dragIdx;
            // Se l'item draggato viene inserito PRIMA di questo idx, questo deve scendere
            // Se viene inserito DOPO, quelli tra dragIdx e dragOverIdx salgono
            let translateY = 0;
            if (shouldMakeSpace) {
              const ITEM_HEIGHT = 82; // altezza approssimativa di ogni item con margine
              if (dragIdx < dragOverIdx) {
                // Drag verso il basso: gli item tra dragIdx+1 e dragOverIdx salgono
                if (idx > dragIdx && idx <= dragOverIdx) translateY = -ITEM_HEIGHT;
              } else if (dragIdx > dragOverIdx) {
                // Drag verso l'alto: gli item tra dragOverIdx e dragIdx-1 scendono
                if (idx >= dragOverIdx && idx < dragIdx) translateY = ITEM_HEIGHT;
              }
            }

            return (
              <div
                key={tool.id}
                data-tool-idx={idx}
                className="relative"
                style={{
                  opacity: isDragging ? 0.15 : 1,
                  transform: `translateY(${translateY}px)`,
                  transition: dragActive ? 'transform 0.3s cubic-bezier(0.25,0.1,0.25,1), opacity 0.2s ease' : 'none',
                  marginBottom: '6px',
                }}
              >
                <div
                  role="button"
                  onClick={() => { if (dragActive) return; setIsOpen(false); navigate(createPageUrl(tool.page)); }}
                  onContextMenu={(e) => e.preventDefault()}
                  onTouchStart={(e) => handleItemTouchStart(e, idx)}
                  onTouchMove={handleItemTouchMove}
                  onTouchEnd={handleItemTouchEnd}
                  className={cn("flex justify-center w-full active:scale-[0.96] transition-transform duration-100 cursor-pointer select-none", dragActive && !isDragging && "pointer-events-none")}
                >
                  <div className="w-[140px]" style={{ boxShadow: 'var(--app-shadow-card)' }}>
                  <div className="rounded-[14px] p-[2px]" style={{
                    background: (isDragging && dragActive) || isJustDropped
                      ? 'var(--app-gradient-border-active)'
                      : 'var(--app-gradient-border-inactive)',
                    transition: 'background 0.6s ease',
                  }}>
                      <div className="rounded-[12px] flex flex-col items-center justify-center py-5 relative" style={{
                        background: isDark ? 'var(--app-gradient-card)' : '#fef200',
                        boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)' : 'inset 0 2px 4px rgba(0,0,0,0.06), inset 0 -1px 2px rgba(255,255,255,0.5)'
                      }}>
                        {/* Campanella notifiche — angolo alto destra */}
                        <div className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center">
                          <Bell className={`w-3.5 h-3.5 ${toolBadges[tool.id] > 0 ? 'text-[#d4af37]' : 'text-slate-600'}`} />
                          {toolBadges[tool.id] > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center shadow-lg">
                              {toolBadges[tool.id] > 99 ? '99+' : toolBadges[tool.id]}
                            </span>
                          )}
                        </div>
                        <Icon className="w-6 h-6 mb-1.5" style={{ color: 'var(--app-accent)', filter: `drop-shadow(0 0 5px var(--app-accent-glow))` }} />
                        <span className="text-[11px] font-semibold tracking-wide" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>{tool.title}</span>
                        {/* Icona video tutorial — angolo basso sinistra */}
                        <div className="absolute bottom-1.5 left-1.5 z-10">
                          <Play className="w-3 h-3 text-slate-500" />
                        </div>
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
            className="fixed pointer-events-none will-change-transform"
            style={{
              zIndex: 9999,
              transform: `translate3d(${ghostPos.x - 70}px, ${ghostPos.y - 40}px, 0) scale(1.08) rotate(-1.5deg)`,
              width: '140px',
              opacity: 0.92,
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