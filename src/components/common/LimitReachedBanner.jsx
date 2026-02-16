import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AI_LIMIT_LABELS } from '@/components/hooks/useAILimits';

export default function LimitReachedBanner({ actionType, usageCount, limit, isWeekly }) {
  const label = AI_LIMIT_LABELS[actionType] || actionType;
  const periodLabel = isWeekly ? 'questa settimana' : 'questo mese';
  const resetLabel = isWeekly ? 'Il limite si resetterà lunedì prossimo.' : 'Il limite si resetterà il 1° del prossimo mese.';
  
  return (
    <Card className="bg-red-500/20 border-red-500/50 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-red-500/30 rounded-full flex items-center justify-center flex-shrink-0">
            <Lock className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-red-400 font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Limite {isWeekly ? 'settimanale' : 'mensile'} raggiunto
            </h3>
            <p className="text-red-200 text-sm mt-1">
              Hai utilizzato tutte le <strong>{limit}</strong> {label.toLowerCase()} disponibili {periodLabel}.
            </p>
            <p className="text-red-300/70 text-xs mt-2">
              {resetLabel} Utilizzi: {usageCount}/{limit}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}