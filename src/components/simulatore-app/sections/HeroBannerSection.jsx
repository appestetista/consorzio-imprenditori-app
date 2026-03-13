import React from "react";

export default function HeroBannerSection({ items, primaryColor, secondaryColor }) {
  const hero = items?.[0];
  if (!hero) return null;

  return (
    <div className="relative overflow-hidden px-5 py-8" style={{
      background: `linear-gradient(160deg, ${primaryColor}30 0%, transparent 60%)`
    }}>
      {/* Atmospheric glow */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15 blur-3xl" style={{ background: primaryColor }} />
      
      {hero.badge && (
        <span className="inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4" style={{ background: primaryColor + "20", color: primaryColor }}>
          {hero.badge}
        </span>
      )}
      <h2 className="text-2xl font-black text-white leading-tight" style={{ fontFamily: "Georgia, serif", lineHeight: 1.15 }}>
        {hero.headline}
      </h2>
      {hero.subtitle && (
        <p className="text-sm text-white/40 mt-3 leading-relaxed font-light">{hero.subtitle}</p>
      )}
      {hero.buttonText && (
        <button className="mt-5 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97]" style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})`
        }}>
          {hero.buttonText}
        </button>
      )}
    </div>
  );
}