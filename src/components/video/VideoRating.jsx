import React, { useState } from 'react';
import { Gem, Eye, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VideoRating({ 
  video, 
  userEmail, 
  onRate, 
  onView,
  isRating = false 
}) {
  const [showLegend, setShowLegend] = useState(false);
  const viewsCount = video.views_count || 0;
  const ratings = video.ratings || [];
  const userRating = ratings.find(r => r.user_email === userEmail);
  const currentDiamonds = userRating?.diamonds || 0;
  const totalRatings = ratings.length;

  const handleRate = (diamonds) => {
    if (isRating) return;
    onRate(diamonds);
  };

  const ratingLabels = {
    1: "Apprezzo",
    2: "Interessante", 
    3: "Collaborerei"
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      {/* Visualizzazioni */}
      <div className="flex items-center gap-1.5 text-slate-400">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">{viewsCount}</span>
      </div>

      {/* Diamanti rating inline */}
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((diamonds) => (
          <button
            key={diamonds}
            onClick={() => handleRate(diamonds)}
            disabled={isRating}
            title={ratingLabels[diamonds]}
            className={cn(
              "relative flex items-center justify-center w-8 h-8 rounded-full transition-all",
              currentDiamonds === diamonds 
                ? "bg-amber-400/20 ring-1 ring-amber-400" 
                : "hover:bg-slate-700/50",
              isRating && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-px">
              {Array.from({ length: diamonds }).map((_, i) => (
                <Gem 
                  key={i} 
                  className={cn(
                    "w-3.5 h-3.5",
                    currentDiamonds >= diamonds ? "text-amber-400 fill-amber-400" : "text-slate-500"
                  )} 
                />
              ))}
            </div>
          </button>
        ))}
        
        {/* Contatore voti totali */}
        {totalRatings > 0 && (
          <span className="text-xs text-amber-400 ml-1">({totalRatings})</span>
        )}
        
        {/* Info tooltip */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="ml-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", showLegend && "rotate-180")} />
        </button>
      </div>

      {/* Leggenda espandibile */}
      {showLegend && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-lg text-xs whitespace-nowrap">
          <div className="flex items-center gap-2 text-slate-300 py-0.5">
            <Gem className="w-3 h-3 text-amber-400" /> Apprezzo l'azienda
          </div>
          <div className="flex items-center gap-2 text-slate-300 py-0.5">
            <Gem className="w-3 h-3 text-amber-400" /><Gem className="w-3 h-3 text-amber-400" /> Molto interessante
          </div>
          <div className="flex items-center gap-2 text-slate-300 py-0.5">
            <Gem className="w-3 h-3 text-amber-400" /><Gem className="w-3 h-3 text-amber-400" /><Gem className="w-3 h-3 text-amber-400" /> Ci collaborerei
          </div>
        </div>
      )}
    </div>
  );
}