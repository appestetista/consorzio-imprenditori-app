import React from "react";
import Phone3DMockup from "./Phone3DMockup";
import { ArrowRight, Star, Zap } from "lucide-react";

export default function AppShowcaseCard({ app, onSelect }) {
  return (
    <div className="flex flex-col items-center">
      {/* Telefono 3D con screenshot */}
      <Phone3DMockup scale={0.85}>
        <img
          src={app.screenshot}
          alt={app.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </Phone3DMockup>

      {/* Info app */}
      <div className="mt-5 w-full max-w-[260px] text-center">
        <h3 className="text-base font-black text-white">{app.name}</h3>
        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{app.description}</p>

        {/* Feature tags */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          {app.features.slice(0, 3).map((f, i) => (
            <span
              key={i}
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: `${app.color}20`,
                color: app.color === "#000000" || app.color === "#111111" ? "#a78bfa" : app.color,
                border: `1px solid ${app.color === "#000000" || app.color === "#111111" ? "rgba(167,139,250,0.3)" : app.color + "30"}`,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onSelect(app)}
        className="mt-4 w-full max-w-[260px] flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20"
      >
        <Zap className="w-4 h-4" />
        Voglio un'app così
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}