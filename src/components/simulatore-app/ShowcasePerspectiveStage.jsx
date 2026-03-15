import React, { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Phone3DMockup from "./Phone3DMockup";

const POSITION_CONFIG = {
  "-2": { x: -190, scale: 0.58, rotate: 38, opacity: 0.26, zIndex: 10 },
  "-1": { x: -104, scale: 0.72, rotate: 24, opacity: 0.52, zIndex: 20 },
  "0": { x: 0, scale: 0.92, rotate: 0, opacity: 1, zIndex: 40 },
  "1": { x: 104, scale: 0.72, rotate: -24, opacity: 0.52, zIndex: 20 },
  "2": { x: 190, scale: 0.58, rotate: -38, opacity: 0.26, zIndex: 10 },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getInterpolatedConfig = (phase) => {
  const safePhase = clamp(phase, -2, 2);
  const startKey = Math.floor(safePhase);
  const endKey = Math.ceil(safePhase);
  const progress = safePhase - startKey;
  const start = POSITION_CONFIG[startKey];
  const end = POSITION_CONFIG[endKey];

  if (!start || !end || startKey === endKey) {
    return POSITION_CONFIG[Math.round(safePhase)] || POSITION_CONFIG[0];
  }

  return {
    x: start.x + (end.x - start.x) * progress,
    scale: start.scale + (end.scale - start.scale) * progress,
    rotate: start.rotate + (end.rotate - start.rotate) * progress,
    opacity: start.opacity + (end.opacity - start.opacity) * progress,
    zIndex: Math.round(start.zIndex + (end.zIndex - start.zIndex) * progress),
  };
};

export default function ShowcasePerspectiveStage({ apps, currentIndex, onChange }) {
  const pointerStartX = useRef(0);
  const isDragging = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  const dragRatio = clamp(dragOffset / 180, -1, 1);

  const visibleApps = useMemo(
    () => [-2, -1, 0, 1, 2]
      .map((offset) => ({ offset, app: apps[currentIndex + offset] }))
      .filter(({ app }) => !!app),
    [apps, currentIndex]
  );

  const handlePointerDown = (event) => {
    isDragging.current = true;
    pointerStartX.current = event.clientX;
  };

  const handlePointerMove = (event) => {
    if (!isDragging.current) return;
    setDragOffset(event.clientX - pointerStartX.current);
  };

  const handlePointerEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (dragOffset <= -60 && currentIndex < apps.length - 1) {
      onChange(currentIndex + 1);
    } else if (dragOffset >= 60 && currentIndex > 0) {
      onChange(currentIndex - 1);
    }

    setDragOffset(0);
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden touch-pan-y"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="absolute inset-x-0 top-8 bottom-16 rounded-[40px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22),rgba(30,41,59,0.18)_45%,transparent_72%)]" />
      <div className="absolute left-1/2 bottom-10 h-20 w-[72%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.34),rgba(37,99,235,0.12)_45%,transparent_72%)] blur-3xl" />

      {visibleApps.map(({ offset, app }) => {
        const config = getInterpolatedConfig(offset + dragRatio * -1);
        const isCenter = Math.abs(offset + dragRatio * -1) < 0.5;

        return (
          <div
            key={app.id}
            className={`absolute left-1/2 top-1/2 ${isDragging.current ? "duration-75" : "duration-500"} transition-all ease-out`}
            style={{
              transform: `translate(-50%, -50%) translateX(${config.x}px)`,
              opacity: config.opacity,
              zIndex: config.zIndex,
            }}
          >
            <div className={isCenter ? "drop-shadow-[0_18px_55px_rgba(0,0,0,0.55)]" : "drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]"}>
              <Phone3DMockup scale={config.scale} rotate={config.rotate}>
                <img src={app.screenshot} alt={app.name} className="w-full h-full object-cover select-none pointer-events-none" loading="lazy" draggable="false" />
              </Phone3DMockup>
            </div>
          </div>
        );
      })}

      {currentIndex > 0 && (
        <button
          onClick={() => onChange(currentIndex - 1)}
          className="absolute left-3 top-1/2 z-50 -translate-y-1/2 rounded-full border border-white/10 bg-white/8 p-3 text-white backdrop-blur-md transition hover:bg-white/14"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {currentIndex < apps.length - 1 && (
        <button
          onClick={() => onChange(currentIndex + 1)}
          className="absolute right-3 top-1/2 z-50 -translate-y-1/2 rounded-full border border-white/10 bg-white/8 p-3 text-white backdrop-blur-md transition hover:bg-white/14"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}