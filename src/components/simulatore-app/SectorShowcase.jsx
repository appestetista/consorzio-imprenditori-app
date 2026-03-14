import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import SHOWCASE_APPS from "./showcaseAppsData";
import AppShowcaseCard from "./AppShowcaseCard";

export default function SectorShowcase({ sectorKey, sectorLabel, onSelectApp, onBack }) {
  const apps = SHOWCASE_APPS[sectorKey] || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  const scrollTo = (index) => {
    setCurrentIndex(index);
    scrollRef.current?.scrollTo({ left: index * scrollRef.current.offsetWidth, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
    if (idx !== currentIndex) setCurrentIndex(idx);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">{sectorLabel}</h1>
          <span className="text-[10px] text-gray-500 ml-auto">{currentIndex + 1}/{apps.length}</span>
        </div>
      </div>

      {/* Titolo */}
      <div className="text-center pt-5 pb-3 px-4">
        <h2 className="text-lg font-black text-white">Le migliori app del settore</h2>
        <p className="text-xs text-gray-400 mt-1">Scorri per esplorare le app di riferimento</p>
      </div>

      {/* Carousel orizzontale */}
      <div className="flex-1 relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          {apps.map((app, i) => (
            <div
              key={app.id}
              className="w-full flex-shrink-0 snap-center flex flex-col items-center justify-center px-6 py-4"
            >
              <AppShowcaseCard app={app} onSelect={onSelectApp} />
            </div>
          ))}
        </div>

        {/* Frecce navigazione */}
        {currentIndex > 0 && (
          <button
            onClick={() => scrollTo(currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {currentIndex < apps.length - 1 && (
          <button
            onClick={() => scrollTo(currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 pb-6">
        {apps.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex ? "bg-purple-500 w-5" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}