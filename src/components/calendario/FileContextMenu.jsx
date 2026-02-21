import React from 'react';
import ReactDOM from 'react-dom';
import { Move, Palette, Share2, Bell, X } from 'lucide-react';

export default function FileContextMenu({ file, position, onAction, onClose }) {
  if (!file) return null;

  const actions = [
    { id: 'move', icon: Move, label: 'Sposta', color: '#3b82f6' },
    { id: 'colors', icon: Palette, label: 'Colori', color: '#f59e0b' },
    { id: 'share', icon: Share2, label: 'Condividi', color: '#22c55e' },
    { id: 'notify', icon: Bell, label: 'Notifica', color: '#a855f7' },
  ];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      {/* Sfondo scuro */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Menu radiale centrato sulla posizione del file */}
      <div
        className="absolute"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* File al centro */}
        <div 
          className="w-10 h-12 rounded-sm shadow-lg flex items-center justify-center relative z-10"
          style={{ 
            background: `linear-gradient(160deg, ${file.colore || '#06b6d4'} 0%, ${file.colore || '#06b6d4'}cc 100%)`,
            boxShadow: `0 4px 20px ${file.colore || '#06b6d4'}66`
          }}
        >
          <div className="flex flex-col gap-[2px]">
            <div className="w-5 h-[1.5px] rounded-full bg-white/40" />
            <div className="w-4 h-[1.5px] rounded-full bg-white/30" />
            <div className="w-5 h-[1.5px] rounded-full bg-white/25" />
          </div>
        </div>

        {/* 4 pulsanti disposti intorno */}
        {actions.map((action, i) => {
          const angle = (i * 90) - 45; // -45, 45, 135, 225
          const rad = (angle * Math.PI) / 180;
          const dist = 65;
          const ax = Math.cos(rad) * dist;
          const ay = Math.sin(rad) * dist;

          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="absolute flex flex-col items-center gap-1 transition-all duration-300"
              style={{
                left: `calc(50% + ${ax}px - 22px)`,
                top: `calc(50% + ${ay}px - 22px)`,
                animation: `fileMenuPop 0.3s ease-out ${i * 0.05}s both`
              }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
                style={{ 
                  backgroundColor: action.color,
                  boxShadow: `0 4px 15px ${action.color}55`
                }}
              >
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[8px] text-white font-semibold whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes fileMenuPop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}