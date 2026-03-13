import React, { useState } from "react";
import { Paintbrush, X, ChevronUp } from "lucide-react";

const PRESET_COLORS = [
  "#E53935", "#D81B60", "#8E24AA", "#5E35B1", "#3949AB",
  "#1E88E5", "#039BE5", "#00ACC1", "#00897B", "#43A047",
  "#7CB342", "#C0CA33", "#FDD835", "#FFB300", "#FB8C00",
  "#F4511E", "#6D4C41", "#757575", "#546E7A", "#212121",
  "#D4A574", "#CFB991", "#E8C9A0", "#BB86FC", "#00E5FF",
];

export default function ColorPickerPanel({ appData, onUpdate }) {
  const [open, setOpen] = useState(false);

  if (!appData) return null;

  const colors = {
    primaryColor: { label: "Primario", value: appData.primaryColor || "#6366F1" },
    secondaryColor: { label: "Secondario", value: appData.secondaryColor || "#1a1a2e" },
    accentColor: { label: "Accento", value: appData.accentColor || "#818CF8" },
  };

  const handleChange = (key, value) => {
    const updated = { ...appData, [key]: value };
    onUpdate(updated);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-[10px] hover:text-amber-300 rounded-full px-2 py-1 transition-all ${
          open ? "text-amber-300 bg-amber-600/20" : "text-amber-400 bg-amber-600/10"
        }`}
      >
        <Paintbrush className="w-3 h-3" />
        Colori
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-0 bg-[#0d0d1a]/98 border-t border-white/[0.06] backdrop-blur-xl animate-in slide-in-from-bottom duration-200 z-50">
          <div className="px-4 py-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white">Campionatore Colori</span>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Color sliders */}
            <div className="space-y-3">
              {Object.entries(colors).map(([key, { label, value }]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-mono">{value}</span>
                      <div className="w-5 h-5 rounded-full border border-white/20 shadow-inner" style={{ background: value }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white/20"
                    />
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hexToHue(value)}
                      onChange={(e) => handleChange(key, hueToHex(parseInt(e.target.value), value))}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Dark mode toggle */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Dark Mode</span>
              <button
                onClick={() => onUpdate({ ...appData, darkMode: !appData.darkMode })}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  appData.darkMode ? "bg-purple-600" : "bg-gray-600"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                  appData.darkMode ? "left-5.5 translate-x-0" : "left-0.5"
                }`} style={{ left: appData.darkMode ? 22 : 2 }} />
              </button>
            </div>

            {/* Preset palette */}
            <div className="mt-3 pt-3 border-t border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Palette rapide</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => handleChange("primaryColor", c)}
                    onDoubleClick={() => handleChange("accentColor", c)}
                    className="w-6 h-6 rounded-full border border-white/10 hover:scale-110 hover:border-white/30 transition-all active:scale-95"
                    style={{ background: c }}
                    title={`Click: primario | Doppio click: accento — ${c}`}
                  />
                ))}
              </div>
              <p className="text-[9px] text-gray-600 mt-1.5">Tap = colore primario · Doppio tap = accento</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Utility: hex to hue (rough)
function hexToHue(hex) {
  if (!hex || hex.length < 7) return 0;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  let h = 0;
  const d = max - min;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return Math.round(h * 360);
}

// Utility: set hue on existing hex (keep saturation/lightness)
function hueToHex(hue, originalHex) {
  if (!originalHex || originalHex.length < 7) return `hsl(${hue}, 70%, 50%)`;
  const r = parseInt(originalHex.slice(1, 3), 16) / 255;
  const g = parseInt(originalHex.slice(3, 5), 16) / 255;
  const b = parseInt(originalHex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return hslToHex(hue, Math.max(s * 100, 30), Math.max(l * 100, 20));
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}