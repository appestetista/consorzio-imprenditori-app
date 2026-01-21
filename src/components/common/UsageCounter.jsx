import React from 'react';
import { Zap } from 'lucide-react';

export default function UsageCounter({ usageCount, limit, label }) {
  const percentage = Math.min(100, (usageCount / limit) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;
  
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-lime-400'}`} />
          <span className="text-slate-400 text-xs">{label}</span>
        </div>
        <span className={`text-sm font-bold ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-lime-400'}`}>
          {usageCount}/{limit}
        </span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-lime-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}