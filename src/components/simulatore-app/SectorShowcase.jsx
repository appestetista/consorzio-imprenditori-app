import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SHOWCASE_APPS from "./showcaseAppsData";
import ShowcasePerspectiveStage from "./ShowcasePerspectiveStage";

export default function SectorShowcase({ sectorKey, sectorLabel, onSelectApp, onBack }) {
  const apps = SHOWCASE_APPS[sectorKey] || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentApp = apps[currentIndex];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!currentApp) return null;

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#0a0f1a] text-white flex flex-col">
      <div className="z-30 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-white/90">{sectorLabel}</p>
          <span className="ml-auto text-[10px] text-gray-500">{currentIndex + 1}/{apps.length}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-6 flex flex-col">
        <div className="flex-1 min-h-0">
          <ShowcasePerspectiveStage apps={apps} currentIndex={currentIndex} onChange={setCurrentIndex} />
        </div>

        <div className="shrink-0 text-center pt-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Template selezionato</p>
          <h2 className="mt-3 text-2xl md:text-3xl font-black tracking-tight text-white min-h-[64px] flex items-center justify-center px-4">
            {currentApp.name}
          </h2>

          <button
            onClick={() => onSelectApp(currentApp)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition active:scale-[0.98] hover:bg-slate-100"
          >
            Voglio un'app così
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}