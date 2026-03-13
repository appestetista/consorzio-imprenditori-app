import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import DynamicAppRenderer from "./DynamicAppRenderer";

export default function VersionCompare({ versions, currentData, onRestore, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(versions.length - 1);

  if (!versions || versions.length === 0) return null;

  const selected = versions[selectedIndex];
  let parsedData = null;
  try { parsedData = JSON.parse(selected.data); } catch {}

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="h-full flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            <div>
              <h3 className="text-sm font-bold text-white">Versione {selected.version}</h3>
              <p className="text-[10px] text-gray-500">
                {new Date(selected.timestamp).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {" — "}{selected.prompt}
              </p>
            </div>
          </div>
          <button
            onClick={() => onRestore(selected)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Ripristina
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 py-2 border-b border-white/5">
          <button
            onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
            disabled={selectedIndex === 0}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-1.5">
            {versions.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === selectedIndex ? "bg-purple-500 scale-125" : "bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setSelectedIndex(Math.min(versions.length - 1, selectedIndex + 1))}
            disabled={selectedIndex === versions.length - 1}
            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto">
          {parsedData ? (
            <DynamicAppRenderer data={parsedData} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm">Anteprima non disponibile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}