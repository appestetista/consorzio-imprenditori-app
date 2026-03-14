import React from "react";
import { buildTemplateSections } from "./templateSections";

// Mini versione fedele dell'app reale — mostra hero, primi items, bottomnav
export default function TemplatePhonePreview({ template }) {
  const appData = buildTemplateSections(template, null);
  const t = template;
  const p = t.preview || {};
  const isDark = t.darkMode;
  const bgColor = isDark ? "#0a0a0a" : (t.secondaryColor || "#fafafa");
  const textColor = isDark ? "#fff" : "#1a1a1a";
  const textMuted = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const cardBg = p.cardBg || (isDark ? "#1a1a2e" : "#ffffff");
  const isSerif = t.fontStyle === "serif";
  const fontFamily = isSerif ? "Georgia, serif" : "system-ui, sans-serif";

  // Trova le sezioni utili
  const heroSection = appData.sections?.find(s => s.type === "hero_banner");
  const heroItem = heroSection?.items?.[0];
  const contentSections = (appData.sections || []).filter(s => 
    s.type !== "hero_banner" && s.type !== "menu_nav"
  );
  const firstContent = contentSections[0];
  const bottomNav = appData.bottomNav || [];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bgColor, fontFamily }}>
      
      {/* Hero compatto */}
      {heroItem?.image_url ? (
        <div className="relative" style={{ height: "42%" }}>
          <img src={heroItem.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7))" }} />
          <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 z-10">
            <p className="text-[10px] font-bold text-white leading-tight" style={{ fontFamily, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
              {t.name}
            </p>
            <p className="text-[6px] text-white/50 mt-0.5 leading-tight">{t.target?.split(",")[0]}</p>
            <div className="mt-1.5 inline-block px-2 py-0.5 rounded-md text-[5px] font-bold text-white" style={{ background: t.primaryColor }}>
              {heroItem.buttonText || "Scopri"}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-2.5 pt-6 pb-2" style={{ background: bgColor }}>
          <p className="text-[10px] font-bold leading-tight" style={{ color: textColor, fontFamily }}>{t.name}</p>
          <p className="text-[6px] mt-0.5" style={{ color: textMuted }}>{t.target?.split(",")[0]}</p>
          <div className="mt-2 w-6 h-[1px] opacity-30" style={{ background: t.primaryColor }} />
        </div>
      )}

      {/* Contenuti — primi items dalla prima sezione reale */}
      <div className="flex-1 px-2 pt-1.5 overflow-hidden">
        {firstContent && (
          <>
            {firstContent.title && (
              <p className="text-[7px] font-bold mb-1 px-0.5" style={{ color: textColor }}>{firstContent.title}</p>
            )}
            
            {/* Menu list / Service list items */}
            {(firstContent.type === "menu_list" || firstContent.type === "service_list") && (
              <div className="space-y-1">
                {(firstContent.items || []).slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-1 rounded-lg" style={{ background: cardBg, boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.04)" }}>
                    {item.image_url ? (
                      <div className="w-7 h-7 rounded-md flex-shrink-0 overflow-hidden">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${i * 30}% center` }} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-md flex-shrink-0" style={{ background: t.primaryColor + "15" }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[6px] font-bold truncate" style={{ color: textColor }}>{item.name}</p>
                      {item.description && <p className="text-[5px] truncate" style={{ color: textMuted }}>{item.description}</p>}
                    </div>
                    {item.price && (
                      <span className="text-[6px] font-bold flex-shrink-0" style={{ color: t.accentColor || t.primaryColor }}>
                        {item.price.startsWith("€") || item.price.startsWith("E") ? item.price : `€${item.price}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Product grid items */}
            {firstContent.type === "product_grid" && (
              <div className="grid grid-cols-2 gap-1">
                {(firstContent.items || []).slice(0, 4).map((item, i) => (
                  <div key={i} className="rounded-lg overflow-hidden" style={{ background: cardBg, boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.04)" }}>
                    <div className="h-10 overflow-hidden">
                      <img src={item.image_url || t.heroImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${i * 25}% center` }} />
                    </div>
                    <div className="p-1">
                      <p className="text-[5px] font-bold truncate" style={{ color: textColor }}>{item.name}</p>
                      {item.price && <p className="text-[5px]" style={{ color: t.accentColor }}>{item.price}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats grid */}
            {firstContent.type === "stats_grid" && (
              <div className="grid grid-cols-2 gap-1">
                {(firstContent.items || []).slice(0, 4).map((item, i) => (
                  <div key={i} className="p-1.5 rounded-lg text-center" style={{ background: cardBg }}>
                    <p className="text-[9px] font-bold" style={{ color: t.accentColor || t.primaryColor }}>{item.value}</p>
                    <p className="text-[5px]" style={{ color: textMuted }}>{item.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Gallery */}
            {firstContent.type === "gallery" && (
              <div className="grid grid-cols-2 gap-1">
                {(firstContent.items || []).slice(0, 4).map((item, i) => (
                  <div key={i} className="rounded-lg overflow-hidden h-12">
                    <img src={item.image_url || t.heroImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${i * 25}% center` }} />
                  </div>
                ))}
              </div>
            )}

            {/* Features */}
            {firstContent.type === "features" && (
              <div className="space-y-1">
                {(firstContent.items || []).slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-1 rounded-lg" style={{ background: cardBg }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.primaryColor + "20" }}>
                      <span className="text-[6px]" style={{ color: t.primaryColor }}>✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[6px] font-bold truncate" style={{ color: textColor }}>{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Testimonials */}
            {firstContent.type === "testimonials" && (
              <div className="space-y-1">
                {(firstContent.items || []).slice(0, 2).map((item, i) => (
                  <div key={i} className="p-1.5 rounded-lg" style={{ background: cardBg }}>
                    <p className="text-[5px] italic" style={{ color: textMuted }}>"{item.text}"</p>
                    <p className="text-[5px] font-bold mt-0.5" style={{ color: textColor }}>— {item.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pricing */}
            {firstContent.type === "pricing" && (
              <div className="grid grid-cols-2 gap-1">
                {(firstContent.items || []).slice(0, 2).map((item, i) => (
                  <div key={i} className="p-1.5 rounded-lg text-center" style={{ background: cardBg, border: item.badge ? `1px solid ${t.accentColor}40` : "none" }}>
                    <p className="text-[6px] font-bold" style={{ color: textColor }}>{item.name}</p>
                    <p className="text-[8px] font-bold mt-0.5" style={{ color: t.accentColor || t.primaryColor }}>{item.price}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Nav compatta */}
      {bottomNav.length > 0 && (
        <div className="flex justify-around py-1 border-t mt-auto" style={{ 
          borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)", 
          background: isDark ? "rgba(10,10,20,0.9)" : (cardBg || "#fff")
        }}>
          {bottomNav.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-[8px]" style={{ opacity: item.active ? 1 : 0.35 }}>{item.icon}</span>
              <span className="text-[4px] font-semibold" style={{ color: item.active ? (t.primaryColor) : textMuted }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}