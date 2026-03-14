import React, { useState, useMemo } from "react";
import { ArrowLeft, Sliders, Check } from "lucide-react";
import DynamicAppRenderer from "./DynamicAppRenderer";
import TemplateCustomizer from "./TemplateCustomizer";
import { buildTemplateSections } from "./templateSections";

export default function TemplateFullPreview({ template, onSelect, onBack }) {
  const originalAppData = useMemo(() => buildTemplateSections(template), [template]);
  const [appData, setAppData] = useState(originalAppData);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const handleConfirm = () => {
    const customizedTemplate = {
      ...template,
      primaryColor: appData.primaryColor,
      secondaryColor: appData.secondaryColor,
      accentColor: appData.accentColor,
      darkMode: appData.darkMode,
      fontStyle: appData.fontStyle,
      _mode: "template",
      _customizedAppData: appData,
    };
    onSelect(customizedTemplate);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0f1a] flex flex-col">
      <div className="sticky top-0 z-40 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Indietro</span>
          </button>
          <p className="text-sm font-bold text-white">{template.name}</p>
          <button
            onClick={() => setShowCustomizer(!showCustomizer)}
            className={`p-2 rounded-lg transition-colors ${showCustomizer ? "bg-purple-600/30 text-purple-300" : "bg-white/5 text-gray-400 hover:text-white"}`}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <DynamicAppRenderer
          data={appData}
          editable={true}
          onDataChange={setAppData}
        />
      </div>

      {showCustomizer && (
        <TemplateCustomizer
          appData={appData}
          onChange={setAppData}
          onClose={() => setShowCustomizer(false)}
          originalData={originalAppData}
        />
      )}

      {!showCustomizer && (
        <div className="sticky bottom-0 z-30 bg-[#0a0a14]/95 border-t border-white/[0.06] backdrop-blur-xl px-4 py-3">
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold bg-purple-600 text-white hover:bg-purple-500 active:scale-[0.97] transition-all"
          >
            <Check className="w-5 h-5" />
            Usa questo template
          </button>
        </div>
      )}
    </div>
  );
}