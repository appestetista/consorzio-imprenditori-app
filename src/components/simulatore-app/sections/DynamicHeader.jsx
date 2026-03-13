import React from "react";

export default function DynamicHeader({ appName, tagline, primaryColor, secondaryColor, style }) {
  const bg = style === "gradient"
    ? { background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor || primaryColor} 100%)` }
    : { backgroundColor: primaryColor };

  return (
    <div className="px-4 pt-6 pb-5" style={bg}>
      <h2 className="text-xl font-black text-white">{appName}</h2>
      {tagline && <p className="text-xs text-white/70 mt-0.5">{tagline}</p>}
    </div>
  );
}