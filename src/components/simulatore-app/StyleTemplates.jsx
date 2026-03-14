import React, { useState } from "react";
import { Sparkles, Palette, Check, Eye } from "lucide-react";
import TEMPLATE_LIBRARY, { CATEGORY_MAP } from "./templateLibrary";
import TemplatePhonePreview from "./TemplatePhonePreview";
import TemplateFullPreview from "./TemplateFullPreview";

export default function StyleTemplates({ businessType, websiteAnalysis, selected, onSelect, pdfMenuData }) {
  const [mode, setMode] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const hasWebsite = !!websiteAnalysis;

  // Filtra template per la categoria corrente, fallback a ristorazione
  const categoryKey = CATEGORY_MAP[businessType] || "ristorazione";
  const templates = TEMPLATE_LIBRARY.filter(t => t.category === categoryKey);

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

  // Se c'è un template in anteprima fullscreen, mostralo
  if (previewTemplate) {
    return (
      <TemplateFullPreview
        template={previewTemplate}
        onSelect={(customized) => {
          onSelect(customized);
          setPreviewTemplate(null);
        }}
        onBack={() => setPreviewTemplate(null)}
      />
    );
  }

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
          <p className="text-xs text-gray-400 text-center">{templates.length} template disponibili per il tuo settore</p>
          <div className="grid grid-cols-2 gap-3">
            {templates.map(t => {
              const isSelected = selected?.id === t.id;
              return (
                <div key={t.id} className="relative">
                  <button
                    onClick={() => setPreviewTemplate(t)}
                    className={`relative rounded-2xl border-2 overflow-hidden transition-all active:scale-[0.97] w-full text-left ${
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
                      {/* Tap overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
                        <div className="opacity-0 hover:opacity-100 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-white" />
                          <span className="text-[10px] text-white font-semibold">Anteprima</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-white/[0.03]">
                      <p className="text-[11px] font-bold text-white">{t.name}</p>
                      <p className="text-[8px] text-gray-500 mt-0.5 leading-tight line-clamp-1">{t.target}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: t.primaryColor }} />
                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: t.secondaryColor }} />
                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: t.accentColor }} />
                      </div>
                    </div>
                  </button>
                </div>
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