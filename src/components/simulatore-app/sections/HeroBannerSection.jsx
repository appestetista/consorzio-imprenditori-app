import React from "react";
import EditableField from "../EditableField";
import EditableImage from "../EditableImage";

export default function HeroBannerSection({ items, primaryColor, secondaryColor, accentColor, editable, onItemChange }) {
  const isDark = !secondaryColor || secondaryColor.startsWith("#0") || secondaryColor.startsWith("#1") || secondaryColor === "#000";
  const hero = items?.[0];
  if (!hero) return null;

  const hasImage = hero.image_url;
  const change = (field, val) => onItemChange?.(0, field, val);
  const ec = editable ? change : null;

  return (
    <div className="relative overflow-hidden" style={{ minHeight: hasImage ? 220 : "auto" }}>
      {hasImage && (
        <>
          {ec ? (
            <EditableImage src={hero.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" onChange={url => change("image_url", url)}>
              <img src={hero.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
            </EditableImage>
          ) : (
            <img src={hero.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </>
      )}

      {!hasImage && (
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${primaryColor}30 0%, transparent 60%)` }} />
      )}
      {!hasImage && (
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-15 blur-3xl" style={{ background: primaryColor }} />
      )}

      <div className="relative z-10 px-5 py-8" style={{ paddingTop: hasImage ? 80 : 32 }}>
        {hero.badge && (
          <span className="inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4"
            style={{ background: hasImage ? "rgba(255,255,255,0.15)" : primaryColor + "20", color: hasImage ? "#fff" : primaryColor, backdropFilter: hasImage ? "blur(8px)" : undefined }}>
            <EditableField value={hero.badge} onChange={ec ? v => change("badge", v) : null} />
          </span>
        )}
        <EditableField
          value={hero.headline}
          onChange={ec ? v => change("headline", v) : null}
          tag="h2"
          className={`text-2xl font-black leading-tight ${hasImage ? "text-white" : (isDark ? "text-white" : "text-gray-900")}`}
          style={{ fontFamily: "Georgia, serif", lineHeight: 1.15, textShadow: hasImage ? "0 2px 8px rgba(0,0,0,0.5)" : "none" }}
        />
        {hero.subtitle && (
          <EditableField
            value={hero.subtitle}
            onChange={ec ? v => change("subtitle", v) : null}
            tag="p"
            className={`text-sm mt-3 leading-relaxed font-light ${hasImage ? "text-white/60" : (isDark ? "text-white/60" : "text-gray-500")}`}
            style={{ textShadow: hasImage ? "0 1px 4px rgba(0,0,0,0.5)" : "none" }}
          />
        )}
        {hero.buttonText && (
          <button className="mt-5 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97]" style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})`,
            boxShadow: `0 4px 15px ${primaryColor}40`
          }}>
            <EditableField value={hero.buttonText} onChange={ec ? v => change("buttonText", v) : null} />
          </button>
        )}
      </div>
    </div>
  );
}