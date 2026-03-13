import React from "react";

export default function PhoneFrame({ children }) {
  return (
    <div className="flex justify-center">
      <div className="relative w-[300px]">
        {/* Cornice telefono */}
        <div className="rounded-[2.5rem] border-[3px] border-gray-700 bg-black overflow-hidden shadow-2xl shadow-black/50">
          {/* Notch */}
          <div className="flex justify-center pt-2 pb-1 bg-black">
            <div className="w-20 h-5 bg-gray-900 rounded-full" />
          </div>
          {/* Schermo */}
          <div className="h-[560px] overflow-y-auto overflow-x-hidden scrollbar-hide">
            {children}
          </div>
          {/* Home indicator */}
          <div className="flex justify-center py-2 bg-black">
            <div className="w-28 h-1 bg-gray-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}