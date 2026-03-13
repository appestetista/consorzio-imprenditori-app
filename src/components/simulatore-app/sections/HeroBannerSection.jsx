import React from "react";

export default function HeroBannerSection({ items, primaryColor, secondaryColor }) {
  const hero = items?.[0];
  if (!hero) return null;

  const hasImage = hero.image_url;

  return (
    <div className="relative overflow-hidden" style={{ minHeight: hasImage ? 220 : "auto" }}>
      {/* Background image */}
      {hasImage && (
        <>
          <img
            src={hero.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </>
      )}

      {/* No-image fallback gradient */}
      {!hasImage && (
        <div className="absolute inset-0" style={{
          background: `linear-gradient(160deg, ${primaryColor}30 0%, transparent 60%)`
        }} />
      )}

      {/* Atmospheric glow */}
      {!hasImage && (
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15 blur-3xl" style={{ background: primaryColor }} />
      )}

      <div className="relative z-10 px-5 py-8" style={{ paddingTop: hasImage ? 80 : 32 }}>
        {hero.badge && (
          <span className="inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4"
            style={{ background: hasImage ? "rgba(255,255,255,0.15)" : primaryColor + "20", color: hasImage ? "#fff" : primaryColor, backdropFilter: hasImage ? "blur(8px)" : undefined }}>
            {hero.badge}
          </span>
        )}
        <h2 className="text-2xl font-black text-white leading-tight" style={{ fontFamily: "Georgia, serif", lineHeight: 1.15, textShadow: hasImage ? "0 2px 8px rgba(0,0,0,0.5)" : "none" }}>
          {hero.headline}
        </h2>
        {hero.subtitle && (
          <p className="text-sm text-white/60 mt-3 leading-relaxed font-light" style={{ textShadow: hasImage ? "0 1px 4px rgba(0,0,0,0.5)" : "none" }}>
            {hero.subtitle}
          </p>
        )}
        {hero.buttonText && (
          <button className="mt-5 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97]" style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})`,
            boxShadow: `0 4px 15px ${primaryColor}40`
          }}>
            {hero.buttonText}
          </button>
        )}
      </div>
    </div>
  );
}