import React from 'react';
import { Check } from 'lucide-react';

export default function ApplicationReadStatus({ isRead }) {
  return (
    <div className="flex items-center gap-0.5">
      <Check 
        className={`w-3.5 h-3.5 ${isRead ? 'text-blue-400' : 'text-slate-500'}`} 
      />
      <Check 
        className={`w-3.5 h-3.5 -ml-2 ${isRead ? 'text-blue-400' : 'text-slate-500'}`} 
      />
    </div>
  );
}