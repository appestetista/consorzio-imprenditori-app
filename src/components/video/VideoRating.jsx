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

  const ratingOptions = [
    { diamonds: 1, label: "Apprezzo l'azienda" },
    { diamonds: 2, label: "Molto interessante" },
    { diamonds: 3, label: "Ci collaborerei" }
  ];

  return (
    <div className="space-y-2">
      {/* Visualizzazioni */}
      <div className="flex items-center gap-1.5 text-slate-400">
        <Eye className="w-4 h-4" />
        <span className="text-sm">{viewsCount} visualizzazioni</span>
      </div>

      {/* Diamanti rating verticale */}
      <div className="flex flex-col gap-1">
        {ratingOptions.map(({ diamonds, label }) => (
          <button
            key={diamonds}
            onClick={() => handleRate(diamonds)}
            disabled={isRating}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-lg transition-all text-left",
              currentDiamonds === diamonds 
                ? "bg-amber-400/20 ring-1 ring-amber-400" 
                : "hover:bg-slate-700/50",
              isRating && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-0.5 w-14 justify-center">
              {Array.from({ length: diamonds }).map((_, i) => (
                <Gem 
                  key={i} 
                  className={cn(
                    "w-4 h-4",
                    currentDiamonds === diamonds ? "text-amber-400 fill-amber-400" : "text-slate-500"
                  )} 
                />
              ))}
            </div>
            <span className={cn(
              "text-xs",
              currentDiamonds === diamonds ? "text-amber-400" : "text-slate-400"
            )}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}