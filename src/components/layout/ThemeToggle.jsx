import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onPointerUp={(e) => { e.stopPropagation(); toggle(); }}
      className="w-10 h-10 flex items-center justify-center rounded-xl active:scale-90 transition-all"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      title={isDark ? 'Passa a modalità giorno' : 'Passa a modalità notte'}
    >
      {isDark ? (
        <Sun className="w-6 h-6 text-white" />
      ) : (
        <Moon className="w-6 h-6 text-slate-800" />
      )}
    </button>
  );
}