import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { TrendingUp, Ship } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ImportExportSplitCard({ disabled = false }) {
  const navigate = useNavigate();
  const [pressedSide, setPressedSide] = useState(null);

  const saveScrollPosition = () => {
    try { sessionStorage.setItem('esplora_scroll_y', String(window.scrollY)); } catch {}
  };

  const handleClick = (tab) => {
    if (disabled) return;
    saveScrollPosition();
    navigate(createPageUrl('ImportExport') + `?tab=${tab}`);
  };

  return (
    <div className="col-span-2">
      <style>{`
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 10px 3px rgba(212, 175, 55, 0.4), 0 0 20px 6px rgba(212, 175, 55, 0.2); }
          50% { box-shadow: 0 0 15px 5px rgba(212, 175, 55, 0.6), 0 0 30px 10px rgba(212, 175, 55, 0.3); }
        }
      `}</style>

      <div
        className={cn(
          "relative min-h-[120px] transition-all duration-150",
          disabled ? "opacity-50 cursor-not-allowed" : ""
        )}
        style={{
          borderRadius: '20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)',
        }}
      >
        {/* Bordo vetro */}
        <div
          className="absolute inset-0 rounded-[20px] p-[1px]"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.35) 0%, rgba(180,210,255,0.2) 30%, rgba(255,255,255,0.08) 70%, rgba(150,180,220,0.15) 100%)'
          }}
        >
          {/* Superficie glass */}
          <div
            className="relative w-full h-full rounded-[19px] flex overflow-hidden backdrop-blur-sm"
            style={{
              background: 'rgba(20, 40, 80, 0.28)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {/* Metà sinistra - EXPORT */}
            <button
              onClick={() => handleClick('export')}
              onPointerDown={() => setPressedSide('export')}
              onPointerUp={() => setPressedSide(null)}
              onPointerLeave={() => setPressedSide(null)}
              disabled={disabled}
              className={cn(
                "flex-1 flex flex-col items-center justify-center p-5 relative z-10 transition-all duration-100 border-r border-white/10",
                !disabled && "active:bg-white/10 hover:bg-white/5",
                pressedSide === 'export' && !disabled && "scale-[0.95] bg-white/10"
              )}
              style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-transform duration-100",
                pressedSide === 'export' && "scale-90"
              )}
                style={{ background: 'linear-gradient(135deg, #84cc16, #22c55e)' }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/95">Export</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Analisi mercati</span>
            </button>

            {/* Metà destra - IMPORT */}
            <button
              onClick={() => handleClick('import')}
              onPointerDown={() => setPressedSide('import')}
              onPointerUp={() => setPressedSide(null)}
              onPointerLeave={() => setPressedSide(null)}
              disabled={disabled}
              className={cn(
                "flex-1 flex flex-col items-center justify-center p-5 relative z-10 transition-all duration-100",
                !disabled && "active:bg-white/10 hover:bg-white/5",
                pressedSide === 'import' && !disabled && "scale-[0.95] bg-white/10"
              )}
              style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-transform duration-100",
                pressedSide === 'import' && "scale-90"
              )}
                style={{ background: 'linear-gradient(135deg, #ef4444, #f43f5e)' }}
              >
                <Ship className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/95">Import</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Dalla Cina</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}