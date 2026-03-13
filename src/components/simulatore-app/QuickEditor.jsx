import React, { useState } from "react";
import { Palette, GripVertical, ArrowUp, ArrowDown, Trash2, X, Check } from "lucide-react";

const COLOR_PRESETS = [
  "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981",
  "#06B6D4", "#3B82F6", "#6366F1", "#D946EF", "#F97316",
  "#84CC16", "#14B8A6", "#0EA5E9", "#A855F7", "#E11D48",
];

export default function QuickEditor({ appData, onUpdate, onClose }) {
  const [editMode, setEditMode] = useState("colors"); // "colors" | "sections"

  const handleColorChange = (field, color) => {
    onUpdate({ ...appData, [field]: color });
  };

  const moveSection = (index, direction) => {
    const sects = [...(appData.sections || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sects.length) return;
    [sects[index], sects[newIndex]] = [sects[newIndex], sects[index]];
    onUpdate({ ...appData, sections: sects });
  };

  const removeSection = (index) => {
    const sects = [...(appData.sections || [])];
    sects.splice(index, 1);
    onUpdate({ ...appData, sections: sects });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-[#12121f] rounded-t-3xl border-t border-white/10 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#12121f] z-10 px-4 pt-3 pb-2 border-b border-white/5">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">Modifica rapida</h3>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode("colors")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                editMode === "colors" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400"
              }`}
            >
              <Palette className="w-3 h-3" />
              Colori
            </button>
            <button
              onClick={() => setEditMode("sections")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                editMode === "sections" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400"
              }`}
            >
              <GripVertical className="w-3 h-3" />
              Sezioni
            </button>
          </div>
        </div>

        <div className="p-4">
          {editMode === "colors" && (
            <div className="space-y-4">
              {[
                { field: "primaryColor", label: "Colore Primario" },
                { field: "secondaryColor", label: "Colore Secondario" },
                { field: "accentColor", label: "Colore Accento" },
              ].map(({ field, label }) => (
                <div key={field}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{label}</span>
                    <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: appData[field] || "#8B5CF6" }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        onClick={() => handleColorChange(field, c)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          appData[field] === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#12121f] scale-110" : "hover:scale-110"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <span className="text-xs text-gray-400 mb-2 block">Modalità</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdate({ ...appData, darkMode: true })}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                      appData.darkMode !== false ? "bg-gray-900 border-purple-500/50 text-white" : "bg-white/5 border-white/10 text-gray-400"
                    }`}
                  >
                    🌙 Dark
                  </button>
                  <button
                    onClick={() => onUpdate({ ...appData, darkMode: false })}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                      appData.darkMode === false ? "bg-white border-purple-500/50 text-gray-900" : "bg-white/5 border-white/10 text-gray-400"
                    }`}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>
            </div>
          )}

          {editMode === "sections" && (
            <div className="space-y-2">
              {(appData.sections || []).map((section, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <GripVertical className="w-4 h-4 text-gray-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{section.title || section.type}</p>
                    <p className="text-[10px] text-gray-500">{section.type}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="p-1 text-gray-500 hover:text-white disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveSection(i, 1)} disabled={i === (appData.sections || []).length - 1} className="p-1 text-gray-500 hover:text-white disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeSection(i)} className="p-1 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {(!appData.sections || appData.sections.length === 0) && (
                <p className="text-center text-gray-500 text-xs py-4">Nessuna sezione</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}