import React from 'react';
import { X, FileText } from 'lucide-react';

const MONTH_COLORS = [
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#22c55e','#eab308',
  '#f97316','#ef4444','#06b6d4','#a855f7','#6366f1','#0ea5e9'
];

export default function DayNotesSummaryPopup({ notes = [], files = [], cartelleMap = {}, selectedDate, monthColor, onClose, onNoteClick }) {
  // Unifica note e file in un unico array ordinato per orario
  const allItems = [
    ...notes.map(n => ({ ...n, _type: 'nota' })),
    ...files.map(f => ({ ...f, title: f.titolo, _type: 'file' }))
  ].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  // Orario corrente arrotondato a 5 min
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = Math.floor(now.getMinutes() / 5) * 5;
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  // Verifica se oggi
  const today = new Date();
  const isToday = selectedDate &&
    new Date(selectedDate).getDate() === today.getDate() &&
    new Date(selectedDate).getMonth() === today.getMonth() &&
    new Date(selectedDate).getFullYear() === today.getFullYear();

  // Data formattata
  const dateLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="w-[90vw] max-w-sm max-h-[80vh] flex flex-col overflow-hidden bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/60">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div>
            <h3 className="text-white font-bold text-sm">📋 Appuntamenti del giorno</h3>
            <p className="text-[11px] capitalize" style={{ color: monthColor }}>{dateLabel}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600">
            <X className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: 'none' }}>
          {allItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">Nessun appuntamento per oggi</div>
          ) : (
            allItems.map((item, idx) => {
              const itemTime = item.time || '00:00';
              const isFile = item._type === 'file';
              const cart = item.cartella_id ? cartelleMap[item.cartella_id] : null;
              const itemMonth = item.data ? parseInt(item.data.split('-')[1]) - 1 : new Date().getMonth();
              const itemColor = isFile
                ? (item.colore || cart?.colore || '#64748b')
                : (cart?.colore || MONTH_COLORS[itemMonth]);

              const isCurrentSlot = isToday && itemTime === currentTimeStr;
              const isClosest = isToday && !allItems.some(n => n.time === currentTimeStr) &&
                itemTime <= currentTimeStr &&
                (idx === allItems.length - 1 || (allItems[idx + 1]?.time || '23:59') > currentTimeStr);
              const showNowDot = isCurrentSlot || isClosest;

              return (
                <div
                  key={item.id || idx}
                  className="flex items-start gap-2.5 py-2.5 border-b border-slate-800/60 last:border-b-0 cursor-pointer hover:bg-slate-800/40 rounded-lg px-2 transition-colors"
                  onClick={() => onNoteClick?.(item)}
                >
                  {/* Orario + puntino now */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5" style={{ minWidth: '60px' }}>
                    {showNowDot ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse shadow-lg shadow-lime-400/40 flex-shrink-0" />
                    ) : (
                      <div className="w-2.5 h-2.5 flex-shrink-0" />
                    )}
                    <span className="text-xs font-mono font-bold" style={{ color: itemColor }}>{itemTime}</span>
                  </div>

                  {/* Dettagli */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isFile ? (
                        <FileText className="w-3 h-3 flex-shrink-0" style={{ color: itemColor, fill: itemColor }} />
                      ) : (
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: itemColor }} />
                      )}
                      <span className="text-sm font-semibold text-white truncate">{item.title}</span>
                      {isFile && <span className="text-[9px] text-slate-500 flex-shrink-0">nota</span>}
                    </div>
                    {cart && (
                      <span className="text-[10px] mt-0.5 block" style={{ color: cart.colore }}>
                        📁 {cart.nome}
                      </span>
                    )}
                    {item.content && !isFile && (
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{item.content}</p>
                    )}
                    {isFile && item.contenuto && (
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{item.contenuto}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {item.checklist_items?.length > 0 && (
                        <span className="text-[10px] text-slate-500">
                          ☑ {item.checklist_items.filter(c => c.checked).length}/{item.checklist_items.length}
                        </span>
                      )}
                      {(item.attachments?.length > 0 || item.allegati?.length > 0) && (
                        <span className="text-[10px] text-slate-500">
                          📎 {(item.attachments || item.allegati || []).length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con conteggio */}
        <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">{allItems.length} {allItems.length === 1 ? 'elemento' : 'elementi'}</span>
          {isToday && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-[10px] text-lime-400">ora: {currentTimeStr}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}