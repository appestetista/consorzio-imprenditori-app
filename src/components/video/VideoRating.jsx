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
  const totalRatings = ratings.length;

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

  const ratingOptions = [
    { diamonds: 1, label: "Apprezzo l'azienda" },
    { diamonds: 2, label: "Molto interessante" },
    { diamonds: 3, label: "Ci collaborerei" }
  ];

  return (
    <div className="space-y-0">
      {/* Prima riga: Visualizzazioni a sinistra, 1 diamante a destra */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Eye className="w-4 h-4" />
          <span className="text-sm">{viewsCount}</span>
        </div>
        <button
          onClick={() => handleRate(1)}
          disabled={isRating}
          className={cn(
            "flex items-center py-0.5 rounded transition-all",
            currentDiamonds === 1 
              ? "bg-amber-400/20" 
              : "hover:bg-slate-700/50",
            isRating && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className={cn("text-[11px] text-right whitespace-nowrap mr-2", currentDiamonds === 1 ? "text-amber-400" : "text-slate-400")}>
            {ratingOptions[0].label}
          </span>
          <div className="w-12 flex justify-end">
            <Gem className={cn("w-3.5 h-3.5", currentDiamonds === 1 ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
          </div>
          <span className="w-5 text-right text-[11px] text-amber-400/70">{diamondStats[1] > 0 ? diamondStats[1] : ''}</span>
        </button>
      </div>

      {/* Seconda riga: 2 diamanti */}
      <div className="flex justify-end">
        <button
          onClick={() => handleRate(2)}
          disabled={isRating}
          className={cn(
            "flex items-center py-0.5 rounded transition-all",
            currentDiamonds === 2 
              ? "bg-amber-400/20" 
              : "hover:bg-slate-700/50",
            isRating && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className={cn("text-[11px] text-right whitespace-nowrap mr-2", currentDiamonds === 2 ? "text-amber-400" : "text-slate-400")}>
            {ratingOptions[1].label}
          </span>
          <div className="w-12 flex justify-end gap-0.5">
            <Gem className={cn("w-3.5 h-3.5", currentDiamonds === 2 ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
            <Gem className={cn("w-3.5 h-3.5", currentDiamonds === 2 ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
          </div>
          <span className="w-5 text-right text-[11px] text-amber-400/70">{diamondStats[2] > 0 ? diamondStats[2] : ''}</span>
        </button>
      </div>

      {/* Terza riga: 3 diamanti */}
      <div className="flex justify-end">
        <button
          onClick={() => handleRate(3)}
          disabled={isRating}
          className={cn(
            "flex items-center py-0.5 rounded transition-all",
            currentDiamonds === 3 
              ? "bg-amber-400/20" 
              : "hover:bg-slate-700/50",
            isRating && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className={cn("text-[11px] text-right whitespace-nowrap mr-2", currentDiamonds === 3 ? "text-amber-400" : "text-slate-400")}>
            {ratingOptions[2].label}
          </span>
          <div className="w-12 flex justify-end gap-0.5">
            <Gem className={cn("w-3.5 h-3.5", currentDiamonds === 3 ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
            <Gem className={cn("w-3.5 h-3.5", currentDiamonds === 3 ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
            <Gem className={cn("w-3.5 h-3.5", currentDiamonds === 3 ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
          </div>
          <span className="w-5 text-right text-[11px] text-amber-400/70">{diamondStats[3] > 0 ? diamondStats[3] : ''}</span>
        </button>
      </div>
    </div>
  );
}