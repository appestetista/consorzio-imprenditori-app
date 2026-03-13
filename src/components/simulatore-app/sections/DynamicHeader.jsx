import React from "react";
import EditableField from "../EditableField";

export default function DynamicHeader({ appName, tagline, primaryColor, secondaryColor, style, fontStyle, darkMode, editable, onAppNameChange, onTaglineChange }) {
  const isSerif = fontStyle === "serif";

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 160 }}>
      <div className="absolute inset-0" style={{
        background: style === "gradient"
          ? `linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor || primaryColor}90 50%, #0f0f1a 100%)`
          : primaryColor
      }} />
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-20 blur-3xl" style={{ background: primaryColor }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 blur-3xl" style={{ background: secondaryColor || primaryColor }} />
      
      <div className="absolute right-2 top-4 bottom-4 flex items-center">
        <span className="text-[8px] text-white/10 tracking-[0.3em] font-semibold uppercase" style={{ writingMode: "vertical-rl" }}>
          DISCOVER
        </span>
      </div>

      <div className="relative z-10 px-5 pt-10 pb-6">
        <EditableField
          value={appName}
          onChange={onAppNameChange}
          tag="h1"
          className="text-white leading-tight tracking-tight"
          style={{ 
            fontSize: 28, fontWeight: 800,
            fontFamily: isSerif ? "Georgia, 'Times New Roman', serif" : "inherit",
            letterSpacing: isSerif ? "-0.02em" : "-0.01em",
            lineHeight: 1.15,
          }}
        />
        {tagline && (
          <EditableField
            value={tagline}
            onChange={onTaglineChange}
            tag="p"
            className="text-white/45 mt-2 text-sm font-light leading-relaxed"
            style={{ maxWidth: "85%" }}
          />
        )}
        <div className="mt-4 w-10 h-[1px] opacity-30" style={{ background: primaryColor }} />
      </div>
    </div>
  );
}