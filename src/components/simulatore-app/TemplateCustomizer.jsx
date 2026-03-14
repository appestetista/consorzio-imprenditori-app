import React, { useState } from "react";
import { X, Palette, Type, RotateCcw } from "lucide-react";

const FONT_OPTIONS = [
  { id: "sans-serif", label: "Moderno", family: "system-ui, sans-serif" },
  { id: "serif", label: "Elegante", family: "Georgia, serif" },
  { id: "mono", label: "Tech", family: "ui-monospace, monospace" },
];

const COLOR_PRESETS = [
  { name: "Oro Nero", primary: "#c9a96e", secondary: "#0a0a0a", accent: "#e8c49a", dark: true },
  { name: "Rosso Fuoco", primary: "#e63946", secondary: "#ffffff", accent: "#ff6b6b", dark: false },
  { name: "Blu Navy", primary: "#1e3a5f", secondary: "#f4f6f9", accent: "#3498db", dark: false },
  { name: "Viola Neon", primary: "#6c5ce7", secondary: "#0d0d1a", accent: "#a29bfe", dark: true },
  { name: "Verde Natura", primary: "#2e7d32", secondary: "#e8f5e9", accent: "#66bb6a", dark: false },
  { name: "Rosa Cipria", primary: "#e91e63", secondary: "#fff5f8", accent: "#f48fb1", dark: false },
  { name: "Nero Puro", primary: "#1a1a1a", secondary: "#ffffff", accent: "#333333", dark: false },
  { name: "Arancione", primary: "#ff6f00", secondary: "#ffffff", accent: "#ffa726", dark: false },
];

export default function TemplateCustomizer({ appData, onChange, onClose, originalData }) {
  const [tab, setTab] = useState("colors");

  const updateColor = (field, value) => {
    onChange({ ...appData, [field]: value });
  };

  const applyPreset = (preset) => {
    onChange({
      ...appData,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
      darkMode: preset.dark,
    });
  };

  const resetToOriginal = () => {
    if (originalData) onChange({ ...originalData });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#12122a]/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl max-h-[55%] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("colors")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              tab === "colors" ? "bg-purple-600/30 text-purple-300" : "text-gray-400"
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> Colori
          </button>
          <button
            onClick={() => setTab("font")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              tab === "font" ? "bg-purple-600/30 text-purple-300" : "text-gray-400"
            }`}
          >
            <Type className="w-3.5 h-3.5" /> Font
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetToOriginal} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "colors" && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Palette Pronte</p>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="p-2 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all active:scale-95"
                  >
                    <div className="flex gap-0.5 justify-center mb-1">
                      <div className="w-4 h-4 rounded-full" style={{ background: preset.primary }} />
                      <div className="w-4 h-4 rounded-full" style={{ background: preset.secondary, border: preset.dark ? "none" : "1px solid rgba(0,0,0,0.1)" }} />
                      <div className="w-4 h-4 rounded-full" style={{ background: preset.accent }} />
                    </div>
                    <p className="text-[8px] text-gray-400 text-center">{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Colori Personalizzati</p>
              <div className="space-y-2">
                {[
                  { field: "primaryColor", label: "Primario" },
                  { field: "secondaryColor", label: "Sfondo" },
                  { field: "accentColor", label: "Accento" },
                ].map(({ field, label }) => (
                  <div key={field} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                    <input
                      type="color"
                      value={appData[field] || "#000000"}
                      onChange={(e) => updateColor(field, e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-white font-semibold">{label}</p>
                      <p className="text-[10px] text-gray-500 font-mono">{appData[field]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-xs text-white font-semibold">Dark Mode</span>
              <button
                onClick={() => onChange({ ...appData, darkMode: !appData.darkMode })}
                className={`w-10 h-5 rounded-full transition-all ${appData.darkMode ? "bg-purple-500" : "bg-gray-600"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appData.darkMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        )}

        {tab === "font" && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Stile Tipografico</p>
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.id}
                onClick={() => onChange({ ...appData, fontStyle: font.id })}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  appData.fontStyle === font.id
                    ? "border-purple-500/50 bg-purple-600/10"
                    : "border-white/5 bg-white/[0.02] hover:border-white/10"
                }`}
              >
                <p className="text-sm font-bold text-white" style={{ fontFamily: font.family }}>{font.label}</p>
                <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: font.family }}>
                  Il template userà questo stile
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}