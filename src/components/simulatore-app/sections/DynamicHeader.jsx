import React from "react";
import EditableField from "../EditableField";

export default function DynamicHeader({ appName, tagline, primaryColor, secondaryColor, logoUrl, style, fontStyle, darkMode, editable, onAppNameChange, onTaglineChange }) {
  const isSerif = fontStyle === "serif";
  const bgColor = darkMode === false ? (secondaryColor || "#F5F0E8") : "#0a0a0a";

  return (
    <div className="relative overflow-hidden" style={{ minHeight: logoUrl ? 130 : 160 }}>
      <div className="absolute inset-0" style={{
        background: style === "gradient"
          ? `linear-gradient(145deg, ${primaryColor}30 0%, ${bgColor} 100%)`
          : bgColor
      }} />
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 blur-3xl" style={{ background: primaryColor }} />

      <div className="relative z-10 px-5 pt-8 pb-5">
        {/* Logo */}
        {logoUrl && (
          <div className="mb-3">
            <img 
              src={logoUrl} 
              alt={appName} 
              className="h-12 object-contain" 
              style={{ maxWidth: 160 }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        
        {!logoUrl && (
          <EditableField
            value={appName}
            onChange={onAppNameChange}
            tag="h1"
            className="leading-tight tracking-tight"
            style={{ 
              fontSize: 28, fontWeight: 800,
              color: darkMode === false ? "#1a1a1a" : "#fff",
              fontFamily: isSerif ? "Georgia, 'Times New Roman', serif" : "inherit",
              letterSpacing: isSerif ? "-0.02em" : "-0.01em",
              lineHeight: 1.15,
            }}
          />
        )}
        
        {tagline && (
          <EditableField
            value={tagline}
            onChange={onTaglineChange}
            tag="p"
            className="mt-2 text-sm font-light leading-relaxed"
            style={{ 
              maxWidth: "85%",
              color: darkMode === false ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.45)",
            }}
          />
        )}
        <div className="mt-4 w-10 h-[1px] opacity-30" style={{ background: primaryColor }} />
      </div>
    </div>
  );
}