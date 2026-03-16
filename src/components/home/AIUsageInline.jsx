import React from 'react';
import { Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MAX_CONSULENZE = 50;

/**
 * Riga compatta color oro che mostra il consumo AI.
 * Sta su una sola riga tra la barra di ricerca e i pulsanti BottomNav.
 */
export default function AIUsageInline({ usate = 0 }) {
  const { isDark } = useTheme();
  const count = usate || 0;
  const remaining = MAX_CONSULENZE - count;
  const pct = Math.min((count / MAX_CONSULENZE) * 100, 100);

  let barColor = isDark ? '#d4af37' : '#0055ff';
  let textColor = isDark ? barColor : '#000000';
  let label = `${count}/${MAX_CONSULENZE} consumo AI`;
  if (remaining <= 2) {
    barColor = '#ef4444';
    textColor = isDark ? barColor : '#000000';
    label = `${count}/${MAX_CONSULENZE} — ultime ${remaining}!`;
  } else if (remaining <= 10) {
    barColor = '#f97316';
    textColor = isDark ? barColor : '#000000';
    label = `${count}/${MAX_CONSULENZE} — ${remaining} rimaste`;
  }

  return (
    <div className="flex items-center gap-2 px-1">
      <Zap className="w-3 h-3 flex-shrink-0" style={{ color: textColor }} />
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--app-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-[10px] flex-shrink-0 font-medium" style={{ color: textColor }}>
        {label}
      </span>
    </div>
  );
}