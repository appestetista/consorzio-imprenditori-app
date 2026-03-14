import React, { useState } from "react";
import { Sparkles, Palette, Check } from "lucide-react";

const TEMPLATES = [
  {
    id: "organic_beige",
    name: "Organic Beige",
    category: "ristorazione",
    primaryColor: "#3d3d3d",
    secondaryColor: "#f5f0e8",
    accentColor: "#6b8f4a",
    darkMode: false,
    fontStyle: "serif",
    heroImage: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600",
    previewItems: ["Falafel Bis", "Mushroom Soup", "Spring Rolls"],
    preview: {
      headerBg: "#f5f0e8",
      headerText: "#3d3d3d",
      cardBg: "#ffffff",
      accent: "#6b8f4a",
      bodyBg: "#f5f0e8",
    },
  },
  {
    id: "green_natural",
    name: "Green Natural",
    category: "ristorazione",
    primaryColor: "#2c4a2a",
    secondaryColor: "#f0f4ec",
    accentColor: "#5a8a3c",
    darkMode: false,
    fontStyle: "sans-serif",
    heroImage: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
    previewItems: ["Bay Leaf Bowl", "Herb Risotto", "Green Smoothie"],
    preview: {
      headerBg: "#f0f4ec",
      headerText: "#2c4a2a",
      cardBg: "#ffffff",
      accent: "#5a8a3c",
      bodyBg: "#f0f4ec",
    },
  },
  {
    id: "dark_elegant",
    name: "Dark Elegant",
    category: "ristorazione",
    primaryColor: "#c9a96e",
    secondaryColor: "#1a1a1a",
    accentColor: "#c9a96e",
    darkMode: true,
    fontStyle: "serif",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
    previewItems: ["Filetto al Tartufo", "Risotto Zafferano", "Crème Brûlée"],
    preview: {
      headerBg: "#1a1a1a",
      headerText: "#c9a96e",
      cardBg: "#2a2a2a",
      accent: "#c9a96e",
      bodyBg: "#111111",
    },
  },
  {
    id: "warm_terracotta",
    name: "Warm Terracotta",
    category: "ristorazione",
    primaryColor: "#b84c2a",
    secondaryColor: "#fdf6ec",
    accentColor: "#d4763a",
    darkMode: false,
    fontStyle: "serif",
    heroImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
    previewItems: ["Pizza Margherita", "Lasagne al Forno", "Cannoli Siciliani"],
    preview: {
      headerBg: "#fdf6ec",
      headerText: "#b84c2a",
      cardBg: "#ffffff",
      accent: "#d4763a",
      bodyBg: "#fdf6ec",
    },
  },
  {
    id: "clean_white",
    name: "Clean White",
    category: "ristorazione",
    primaryColor: "#333333",
    secondaryColor: "#fafafa",
    accentColor: "#7aab5e",
    darkMode: false,
    fontStyle: "sans-serif",
    heroImage: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
    previewItems: ["Avocado Toast", "Poke Bowl", "Matcha Latte"],
    preview: {
      headerBg: "#fafafa",
      headerText: "#333333",
      cardBg: "#ffffff",
      accent: "#7aab5e",
      bodyBg: "#f7f7f7",
    },
  },
  {
    id: "ocean_blue",
    name: "Ocean Blue",
    category: "ristorazione",
    primaryColor: "#1e3a5f",
    secondaryColor: "#eef4f8",
    accentColor: "#3498db",
    darkMode: false,
    fontStyle: "sans-serif",
    heroImage: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=600",
    previewItems: ["Spaghetti Scoglio", "Frittura Mista", "Tartare di Tonno"],
    preview: {
      headerBg: "#eef4f8",
      headerText: "#1e3a5f",
      cardBg: "#ffffff",
      accent: "#3498db",
      bodyBg: "#eef4f8",
    },
  },
];

function TemplatePhonePreview({ template }) {
  const p = template.preview;
  return (
    <div className="w-full h-full flex flex-col" style={{ background: p.bodyBg, fontFamily: template.fontStyle === "serif" ? "Georgia, serif" : "system-ui, sans-serif" }}>
      <div className="px-4 pt-8 pb-3 flex items-center justify-between" style={{ background: p.headerBg }}>
        <div>
          <div className="w-6 h-0.5 mb-1 rounded" style={{ background: p.headerText }} />
          <div className="w-4 h-0.5 rounded" style={{ background: p.headerText, opacity: 0.5 }} />
        </div>
        <span className="text-[10px] font-bold" style={{ color: p.headerText }}>Il Tuo Locale</span>
        <div className="w-4 h-4 rounded-full" style={{ background: p.accent, opacity: 0.4 }} />
      </div>
      <div className="mx-3 mt-2 rounded-xl overflow-hidden h-28 relative">
        <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="flex gap-1.5 px-3 mt-3">
        {["Antipasti", "Primi", "Dolci"].map((cat, i) => (
          <div key={cat} className="px-2 py-0.5 rounded-full text-[7px] font-semibold" style={{
            background: i === 0 ? p.accent : "transparent",
            color: i === 0 ? "#fff" : p.headerText,
            border: i === 0 ? "none" : `1px solid ${p.headerText}30`,
          }}>{cat}</div>
        ))}
      </div>
      <div className="px-3 mt-3 space-y-2 flex-1">
        {template.previewItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: p.cardBg, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
              <img src={template.heroImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${i * 30}% center` }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold truncate" style={{ color: p.headerText }}>{item}</p>
              <p className="text-[7px] opacity-50" style={{ color: p.headerText }}>Descrizione breve</p>
            </div>
            <span className="text-[8px] font-bold" style={{ color: p.accent }}>€{(8 + i * 4)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-around py-2 mt-auto border-t" style={{ borderColor: `${p.headerText}15`, background: p.headerBg }}>
        {["🏠", "📋", "📍", "👤"].map((icon, i) => (
          <div key={i} className="text-[12px] opacity-60">{icon}</div>
        ))}
      </div>
    </div>
  );
}

export default function StyleTemplates({ businessType, websiteAnalysis, selected, onSelect }) {
  const [mode, setMode] = useState(null);

  const hasWebsite = !!websiteAnalysis;

  const handleAIChoice = () => {
    setMode("ai");
    onSelect({
      id: "from_scratch",
      name: "Generata dall'AI",
      primaryColor: websiteAnalysis?.primaryColor || "#6366F1",
      secondaryColor: websiteAnalysis?.secondaryColor || "#1a1a2e",
      accentColor: websiteAnalysis?.secondaryColor || "#818CF8",
      darkMode: true,
      fontStyle: "sans-serif",
      _mode: "ai",
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-black text-white">Come vuoi la tua app?</h2>
        <p className="text-xs text-gray-400 mt-1">Scegli lo stile della tua applicazione</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleAIChoice}
          className={`relative p-4 rounded-2xl border-2 transition-all active:scale-[0.97] text-center ${
            mode === "ai"
              ? "border-purple-500 bg-purple-600/20 ring-2 ring-purple-500/30"
              : "border-white/10 bg-white/[0.03] hover:border-purple-500/30"
          }`}
        >
          {mode === "ai" && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-bold text-white">Lascia fare all'AI</p>
          <p className="text-[10px] text-gray-400 mt-1 leading-tight">
            {hasWebsite ? "Design basato sui colori e lo stile del tuo sito" : "L'AI creerà un design unico per te"}
          </p>
          {hasWebsite && websiteAnalysis?.primaryColor && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: websiteAnalysis.primaryColor }} />
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: websiteAnalysis.secondaryColor }} />
              <span className="text-[9px] text-gray-500">dal tuo sito</span>
            </div>
          )}
        </button>

        <button
          onClick={() => { setMode("template"); if (selected?._mode === "ai") onSelect(null); }}
          className={`relative p-4 rounded-2xl border-2 transition-all active:scale-[0.97] text-center ${
            mode === "template"
              ? "border-amber-500 bg-amber-600/20 ring-2 ring-amber-500/30"
              : "border-white/10 bg-white/[0.03] hover:border-amber-500/30"
          }`}
        >
          {mode === "template" && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-2">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-bold text-white">Scegli un Template</p>
          <p className="text-[10px] text-gray-400 mt-1 leading-tight">Seleziona un layout pronto e personalizzalo</p>
        </button>
      </div>

      {mode === "template" && (
        <div className="space-y-4 mt-2">
          <p className="text-xs text-gray-400 text-center">Tocca un template per selezionarlo</p>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map(t => {
              const isSelected = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelect({ ...t, _mode: "template" })}
                  className={`relative rounded-2xl border-2 overflow-hidden transition-all active:scale-[0.97] ${
                    isSelected
                      ? "border-amber-400 ring-2 ring-amber-400/30"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="w-full aspect-[9/16] relative bg-gray-900">
                    <div className="absolute inset-1 rounded-xl overflow-hidden">
                      <TemplatePhonePreview template={t} />
                    </div>
                  </div>
                  <div className="p-2 bg-white/[0.03]">
                    <p className="text-[11px] font-bold text-white">{t.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: t.primaryColor }} />
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: t.secondaryColor }} />
                      <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: t.accentColor }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === "ai" && selected?._mode === "ai" && (
        <div className="rounded-2xl bg-purple-600/10 border border-purple-500/20 p-4 text-center mt-2">
          <p className="text-sm font-bold text-purple-300">✨ L'AI creerà il design perfetto per te</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {hasWebsite ? "Basato sui colori e lo stile del tuo sito web" : "Un design moderno e personalizzato per la tua attività"}
          </p>
        </div>
      )}
    </div>
  );
}