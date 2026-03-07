import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send } from 'lucide-react';

export default function GlobalSearchBar({ currentPageName }) {
  const navigate = useNavigate();

  // Non mostrare sulla Home (ha già la sua barra) e su pagine fullscreen
  if (currentPageName === 'Home') return null;

  const handleFocus = () => {
    // Naviga alla Home per usare la chat AI
    navigate(createPageUrl('Home'));
  };

  return (
    <div className="fixed z-40 px-1 pb-1 pt-1" style={{ left: '44px', right: '44px', bottom: '155px' }}>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={handleFocus}
          className="w-full relative flex items-center rounded-xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-lg overflow-hidden"
        >
          <span className="flex-1 text-left text-slate-500 text-sm px-4 py-2.5">
            Chiedi qualsiasi cosa...
          </span>
          <div
            className="flex-shrink-0 m-1 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#334155' }}
          >
            <Send className="w-4 h-4 text-slate-500" />
          </div>
        </button>
      </div>
    </div>
  );
}