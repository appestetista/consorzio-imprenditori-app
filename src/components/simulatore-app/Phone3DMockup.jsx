import React from "react";

// Mockup telefono 3D con prospettiva e ombre realistiche
export default function Phone3DMockup({ children, scale = 1, rotate = 0 }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 220 * scale,
        perspective: "1200px",
      }}
    >
      <div
        className="relative transition-transform duration-500"
        style={{
          transform: `rotateY(${rotate}deg) rotateX(2deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Ombra sotto il telefono */}
        <div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full blur-2xl opacity-40"
          style={{
            width: 180 * scale,
            height: 20 * scale,
            background: "radial-gradient(ellipse, rgba(120,80,255,0.5), transparent 70%)",
          }}
        />

        {/* Corpo telefono */}
        <div
          className="relative rounded-[28px] overflow-hidden border-[3px] border-gray-700/80 bg-black shadow-2xl"
          style={{
            width: 220 * scale,
            height: 440 * scale,
            boxShadow: `
              0 25px 60px rgba(0,0,0,0.6),
              0 10px 20px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.1),
              -5px 0 15px rgba(0,0,0,0.2),
              5px 0 15px rgba(0,0,0,0.2)
            `,
          }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[90px] h-[22px] bg-black rounded-b-2xl" />
          
          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 z-10 h-[28px] bg-black/60 backdrop-blur-sm flex items-end justify-between px-5 pb-0.5">
            <span className="text-[8px] text-white/70 font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 border border-white/50 rounded-sm">
                <div className="w-2 h-full bg-white/70 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Contenuto schermo */}
          <div className="absolute inset-0 rounded-[25px] overflow-hidden">
            {children}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20 w-[80px] h-[3px] bg-white/30 rounded-full" />
        </div>

        {/* Riflesso laterale */}
        <div
          className="absolute top-2 -right-0.5 bottom-2 w-[2px] rounded-full opacity-20"
          style={{
            background: "linear-gradient(to bottom, transparent, white 30%, white 70%, transparent)",
          }}
        />
      </div>
    </div>
  );
}