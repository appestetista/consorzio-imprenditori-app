import React, { useState } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';

export default function ApplicationReadStatus({ isRead }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex items-center gap-1.5 relative">
      <div className="flex items-center gap-0.5">
        <Check 
          className={`w-3.5 h-3.5 ${isRead ? 'text-sky-400' : 'text-slate-500'}`} 
        />
        <Check 
          className={`w-3.5 h-3.5 -ml-2 ${isRead ? 'text-sky-400' : 'text-slate-500'}`} 
        />
      </div>
      
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowHelp(!showHelp);
        }}
        className="text-slate-500 hover:text-slate-400"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {showHelp && (
        <div className="absolute bottom-full right-0 mb-2 bg-slate-700 border border-slate-600 rounded-lg p-3 shadow-lg z-50 w-52">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowHelp(false);
            }}
            className="absolute top-1 right-1 text-slate-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-white text-xs leading-relaxed">
            <span className="flex items-center gap-1 mb-1">
              <Check className="w-3 h-3 text-slate-500" />
              <Check className="w-3 h-3 -ml-1.5 text-slate-500" />
              <span className="ml-1">= Non ancora letta</span>
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-sky-400" />
              <Check className="w-3 h-3 -ml-1.5 text-sky-400" />
              <span className="ml-1">= Letta dall'azienda</span>
            </span>
          </p>
        </div>
      )}
    </div>
  );
}