import React from "react";

export default function PhoneMockup({ children, className = "" }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative" style={{ width: 320, height: 640 }}>
        {/* iPhone frame */}
        <div className="absolute inset-0 rounded-[40px] bg-gradient-to-b from-gray-200 to-gray-300 shadow-2xl" />
        <div className="absolute inset-[3px] rounded-[37px] bg-black" />
        
        {/* Notch */}
        <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-20" />
        
        {/* Status bar */}
        <div className="absolute top-[6px] left-[24px] right-[24px] h-[22px] z-30 flex items-center justify-between px-2">
          <span className="text-white text-[10px] font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 border border-white/80 rounded-sm relative">
              <div className="absolute inset-[1px] bg-white/80 rounded-[1px]" style={{ width: '70%' }} />
            </div>
          </div>
        </div>
        
        {/* Screen area */}
        <div className="absolute top-[12px] left-[12px] right-[12px] bottom-[12px] rounded-[28px] overflow-hidden bg-white">
          <div className="w-full h-full overflow-y-auto">
            {children}
          </div>
        </div>
        
        {/* Home indicator */}
        <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-gray-400 rounded-full z-20" />
      </div>
    </div>
  );
}