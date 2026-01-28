import React, { useState } from 'react';
import { Gem, Eye, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function VideoRating({ 
  video, 
  userEmail, 
  onRate, 
  onView,
  isRating = false,
  allUsers = []
}) {
  const [showVotersDialog, setShowVotersDialog] = useState(false);
  const [selectedDiamonds, setSelectedDiamonds] = useState(null);
  
  const viewsCount = video.views_count || 0;
  const ratings = video.ratings || [];
  const userRating = ratings.find(r => r.user_email === userEmail);
  const currentDiamonds = userRating?.diamonds || 0;
  const totalRatings = ratings.length;

  const handleRate = (diamonds) => {
    if (isRating) return;
    onRate(diamonds);
  };

  const handleShowVoters = (diamonds, e) => {
    e.stopPropagation();
    setSelectedDiamonds(diamonds);
    setShowVotersDialog(true);
  };

  const getVotersForDiamonds = (diamonds) => {
    return ratings
      .filter(r => r.diamonds === diamonds)
      .map(r => {
        const user = allUsers.find(u => u.email === r.user_email);
        return {
          email: r.user_email,
          name: user?.company_name || user?.full_name || r.user_email
        };
      });
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
          <span 
            className={cn("w-5 text-right text-[11px] text-amber-400/70", diamondStats[1] > 0 && "cursor-pointer hover:text-amber-400")}
            onClick={diamondStats[1] > 0 ? (e) => handleShowVoters(1, e) : undefined}
          >{diamondStats[1] > 0 ? diamondStats[1] : ''}</span>
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
          <span 
            className={cn("w-5 text-right text-[11px] text-amber-400/70", diamondStats[2] > 0 && "cursor-pointer hover:text-amber-400")}
            onClick={diamondStats[2] > 0 ? (e) => handleShowVoters(2, e) : undefined}
          >{diamondStats[2] > 0 ? diamondStats[2] : ''}</span>
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
          <span 
            className={cn("w-5 text-right text-[11px] text-amber-400/70", diamondStats[3] > 0 && "cursor-pointer hover:text-amber-400")}
            onClick={diamondStats[3] > 0 ? (e) => handleShowVoters(3, e) : undefined}
          >{diamondStats[3] > 0 ? diamondStats[3] : ''}</span>
        </button>
      </div>

      {/* Dialog lista votanti */}
      <Dialog open={showVotersDialog} onOpenChange={setShowVotersDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedDiamonds && (
                <>
                  {Array.from({ length: selectedDiamonds }).map((_, i) => (
                    <Gem key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="ml-2">{ratingOptions[selectedDiamonds - 1]?.label}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            {selectedDiamonds && getVotersForDiamonds(selectedDiamonds).length > 0 ? (
              <ul className="space-y-2">
                {getVotersForDiamonds(selectedDiamonds).map((voter, idx) => (
                  <li key={idx} className="text-slate-300 text-sm py-1 border-b border-slate-700 last:border-0">
                    {voter.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">Nessun voto</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}