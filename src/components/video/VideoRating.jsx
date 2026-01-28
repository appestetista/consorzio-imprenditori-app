import React from 'react';
import { Gem, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VideoRating({ 
  video, 
  userEmail, 
  onRate, 
  onView,
  isRating = false 
}) {
  const viewsCount = video.views_count || 0;
  const ratings = video.ratings || [];
  const userRating = ratings.find(r => r.user_email === userEmail);
  const currentDiamonds = userRating?.diamonds || 0;

  const handleRate = (diamonds) => {
    if (isRating) return;
    onRate(diamonds);
  };

  // Calcola statistiche voti
  const diamondStats = {
    1: ratings.filter(r => r.diamonds === 1).length,
    2: ratings.filter(r => r.diamonds === 2).length,
    3: ratings.filter(r => r.diamonds === 3).length,
  };

  return (
    <div className="space-y-3">
      {/* Visualizzazioni */}
      <div className="flex items-center gap-2 text-slate-400">
        <Eye className="w-4 h-4" />
        <span className="text-sm">{viewsCount} visualizzazioni</span>
      </div>

      {/* Sistema di voto con diamanti */}
      <div className="bg-slate-900/50 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((diamonds) => (
            <button
              key={diamonds}
              onClick={() => handleRate(diamonds)}
              disabled={isRating}
              className={cn(
                "flex items-center gap-1 px-3 py-2 rounded-lg transition-all",
                currentDiamonds === diamonds 
                  ? "bg-amber-400/30 ring-2 ring-amber-400" 
                  : "bg-slate-800 hover:bg-slate-700",
                isRating && "opacity-50 cursor-not-allowed"
              )}
            >
              {Array.from({ length: diamonds }).map((_, i) => (
                <Gem 
                  key={i} 
                  className={cn(
                    "w-5 h-5",
                    currentDiamonds === diamonds ? "text-amber-400 fill-amber-400" : "text-slate-400"
                  )} 
                />
              ))}
            </button>
          ))}
        </div>

        {/* Leggenda */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="text-slate-400">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              <Gem className="w-3 h-3 text-amber-400" />
            </div>
            <span>Apprezzo l'azienda</span>
            {diamondStats[1] > 0 && <span className="text-amber-400 block">({diamondStats[1]})</span>}
          </div>
          <div className="text-slate-400">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              <Gem className="w-3 h-3 text-amber-400" />
              <Gem className="w-3 h-3 text-amber-400" />
            </div>
            <span>Molto interessante</span>
            {diamondStats[2] > 0 && <span className="text-amber-400 block">({diamondStats[2]})</span>}
          </div>
          <div className="text-slate-400">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              <Gem className="w-3 h-3 text-amber-400" />
              <Gem className="w-3 h-3 text-amber-400" />
              <Gem className="w-3 h-3 text-amber-400" />
            </div>
            <span>Ci collaborerei</span>
            {diamondStats[3] > 0 && <span className="text-amber-400 block">({diamondStats[3]})</span>}
          </div>
        </div>
      </div>
    </div>
  );
}