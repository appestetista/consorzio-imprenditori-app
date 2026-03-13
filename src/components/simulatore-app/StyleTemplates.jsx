import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";

// 5 TEMI VISIVI universali — ogni business type li usa tutti, cambia solo il contenuto
const VISUAL_THEMES = [
  {
    id: "dark_elegance",
    themeName: "Scuro Elegante",
    themeTag: "DARK",
    primaryColor: "#D4A574",
    secondaryColor: "#0a0a0a",
    accentColor: "#E8C9A0",
    darkMode: true,
    fontStyle: "serif",
    bgGradient: "linear-gradient(180deg, #0a0a0a 0%, #1a1020 50%, #0a0a0a 100%)",
    cardBg: "#141414",
    textColor: "#FFFFFF",
    mutedColor: "#888",
  },
  {
    id: "light_clean",
    themeName: "Chiaro Pulito",
    themeTag: "LIGHT",
    primaryColor: "#1565C0",
    secondaryColor: "#FFFFFF",
    accentColor: "#42A5F5",
    darkMode: false,
    fontStyle: "sans-serif",
    bgGradient: "linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 50%, #F8FAFC 100%)",
    cardBg: "#FFFFFF",
    textColor: "#1a1a2e",
    mutedColor: "#94a3b8",
  },
  {
    id: "vivid_bold",
    themeName: "Colori Accesi",
    themeTag: "VIVID",
    primaryColor: "#E53935",
    secondaryColor: "#FFFFFF",
    accentColor: "#FF6D00",
    darkMode: false,
    fontStyle: "sans-serif",
    bgGradient: "linear-gradient(180deg, #FFF5F5 0%, #FFF0E6 50%, #FFF5F5 100%)",
    cardBg: "#FFFFFF",
    textColor: "#1a1a2e",
    mutedColor: "#94a3b8",
  },
  {
    id: "pastel_soft",
    themeName: "Pastello Morbido",
    themeTag: "PASTEL",
    primaryColor: "#A78BFA",
    secondaryColor: "#FDF4FF",
    accentColor: "#F9A8D4",
    darkMode: false,
    fontStyle: "sans-serif",
    bgGradient: "linear-gradient(180deg, #FDF4FF 0%, #F0F4FF 50%, #FFF1F2 100%)",
    cardBg: "#FFFFFF",
    textColor: "#3B1F6E",
    mutedColor: "#a78bfa",
  },
  {
    id: "neon_fluo",
    themeName: "Fluo Neon",
    themeTag: "NEON",
    primaryColor: "#00E5FF",
    secondaryColor: "#050510",
    accentColor: "#AEEA00",
    darkMode: true,
    fontStyle: "sans-serif",
    bgGradient: "linear-gradient(180deg, #050510 0%, #0a0a20 50%, #050510 100%)",
    cardBg: "#0d0d1f",
    textColor: "#FFFFFF",
    mutedColor: "#555",
  },
];

// Contenuti per business type
const BUSINESS_CONTENT = {
  ristorazione: {
    appName: "Gusto App",
    heroImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=260&fit=crop",
    items: ["Carbonara Classica", "Pizza Margherita", "Tiramisù", "Antipasto Misto"],
    prices: ["€ 14", "€ 10", "€ 7", "€ 12"],
    badge: "Popolare",
    cta: "Prenota un Tavolo",
    category: "Ristorante",
  },
  beauty: {
    appName: "Beauty Studio",
    heroImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=260&fit=crop",
    items: ["Taglio & Piega", "Manicure Gel", "Trattamento Viso", "Extension Ciglia"],
    prices: ["€ 35", "€ 28", "€ 55", "€ 45"],
    badge: "Richiesto",
    cta: "Prenota Ora",
    category: "Salone",
  },
  fitness: {
    appName: "FitZone",
    heroImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=260&fit=crop",
    items: ["Abbonamento Open", "PT Sessione", "Corso Yoga", "Boxe Fitness"],
    prices: ["€ 49/m", "€ 40", "€ 15", "€ 20"],
    badge: "Nuovo",
    cta: "Iscriviti Ora",
    category: "Palestra",
  },
  ecommerce: {
    appName: "ShopNow",
    heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=260&fit=crop",
    items: ["Giacca in Pelle", "Sneakers Ltd", "Borsa Tote", "Occhiali"],
    prices: ["€ 189", "€ 129", "€ 95", "€ 75"],
    badge: "Best Seller",
    cta: "Acquista",
    category: "Fashion",
  },
  _default: {
    appName: "MyBusiness",
    heroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=260&fit=crop",
    items: ["Consulenza Base", "Piano Premium", "Assistenza", "Formazione"],
    prices: ["€ 99", "€ 199", "€ 49", "€ 79"],
    badge: "Consigliato",
    cta: "Inizia Ora",
    category: "Servizi",
  },
};
["servizi", "immobiliare", "salute", "turismo", "educazione", "altro"].forEach(k => {
  if (!BUSINESS_CONTENT[k]) BUSINESS_CONTENT[k] = BUSINESS_CONTENT._default;
});


// Mini mockup di un telefono con contenuto reale
function PhoneMockup({ theme, content, isCenter, isSelected, onClick }) {
  const dark = theme.darkMode;

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 transition-all duration-300 ease-out focus:outline-none"
      style={{
        width: isCenter ? 200 : 160,
        opacity: isCenter ? 1 : 0.55,
        transform: `scale(${isCenter ? 1 : 0.88})`,
      }}
    >
      {/* Phone frame */}
      <div
        className={`relative rounded-[24px] overflow-hidden border-[2.5px] transition-all duration-300 ${
          isSelected
            ? "border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            : dark ? "border-white/10" : "border-black/10"
        }`}
        style={{ 
          background: theme.bgGradient,
          aspectRatio: "9/18",
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60px] h-[14px] rounded-b-xl z-20"
          style={{ background: dark ? "#000" : "#e2e8f0" }}
        />

        {/* Content inside phone */}
        <div className="absolute inset-0 pt-[18px] px-[8px] pb-[8px] overflow-hidden">
          {/* Status bar */}
          <div className="flex justify-between items-center px-2 mb-2">
            <span style={{ color: theme.mutedColor, fontSize: 6 }}>9:41</span>
            <div className="flex gap-0.5">
              <div className="w-2 h-1.5 rounded-sm" style={{ background: theme.mutedColor }} />
              <div className="w-2 h-1.5 rounded-sm" style={{ background: theme.mutedColor }} />
              <div className="w-3 h-1.5 rounded-sm" style={{ background: theme.mutedColor }} />
            </div>
          </div>

          {/* App name */}
          <div className="px-2 mb-2">
            <span style={{ color: theme.primaryColor, fontSize: 10, fontWeight: 800, fontFamily: theme.fontStyle }}>
              {content.appName}
            </span>
          </div>

          {/* Hero image */}
          <div className="relative rounded-lg overflow-hidden mb-2" style={{ height: 68 }}>
            <img src={content.heroImage} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${theme.secondaryColor}CC, transparent)` }} />
            <div className="absolute bottom-1 left-2">
              <span style={{ color: "#fff", fontSize: 8, fontWeight: 700 }}>{content.cta}</span>
            </div>
          </div>

          {/* Badge */}
          <div className="px-2 mb-1.5">
            <span
              className="inline-block rounded-full px-2 py-0.5"
              style={{ background: theme.primaryColor + "22", color: theme.primaryColor, fontSize: 6, fontWeight: 700 }}
            >
              ★ {content.badge}
            </span>
          </div>

          {/* Items list */}
          <div className="space-y-[4px] px-1">
            {content.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-2 py-[5px]"
                style={{ background: theme.cardBg, border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[18px] rounded-md" style={{ background: theme.primaryColor + "20" }}>
                    <div className="w-full h-full rounded-md" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}44, ${theme.accentColor}44)` }} />
                  </div>
                  <span style={{ color: theme.textColor, fontSize: 7, fontWeight: 500 }}>{item}</span>
                </div>
                <span style={{ color: theme.primaryColor, fontSize: 7, fontWeight: 700 }}>{content.prices[i]}</span>
              </div>
            ))}
          </div>

          {/* Bottom nav */}
          <div
            className="absolute bottom-0 left-0 right-0 flex justify-around items-center py-1.5 px-2"
            style={{ background: theme.cardBg, borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}
          >
            {["●", "◎", "☰", "♡"].map((icon, i) => (
              <span key={i} style={{ color: i === 0 ? theme.primaryColor : theme.mutedColor, fontSize: 8 }}>{icon}</span>
            ))}
          </div>
        </div>

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute top-5 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center z-30">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Theme label under phone */}
      <div className="mt-2 text-center">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
          style={{
            background: theme.primaryColor + "18",
            color: theme.primaryColor,
          }}
        >
          {theme.themeTag}
        </span>
        <p className="text-[10px] text-gray-400 mt-0.5">{theme.themeName}</p>
      </div>
    </button>
  );
}


export default function StyleTemplates({ businessType, websiteAnalysis, selected, onSelect }) {
  const content = BUSINESS_CONTENT[businessType] || BUSINESS_CONTENT._default;
  const scrollRef = useRef(null);
  const [centerIdx, setCenterIdx] = useState(2); // Start with middle item

  // Scroll to center on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      const phoneWidth = 200;
      const gap = 12;
      const containerWidth = el.offsetWidth;
      const scrollTo = (2 * (phoneWidth + gap)) - (containerWidth / 2) + (phoneWidth / 2);
      el.scrollTo({ left: Math.max(0, scrollTo), behavior: "auto" });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Track which phone is centered
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollCenter = el.scrollLeft + el.offsetWidth / 2;
    const phoneWidth = 200;
    const gap = 12;
    const padding = 80;
    let closestIdx = 0;
    let closestDist = Infinity;
    VISUAL_THEMES.forEach((_, i) => {
      const itemCenter = padding + i * (phoneWidth + gap) + phoneWidth / 2;
      const dist = Math.abs(scrollCenter - itemCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });
    setCenterIdx(closestIdx);
  }, []);

  const handleSelect = (theme) => {
    onSelect({
      id: theme.id,
      name: `${content.appName} — ${theme.themeName}`,
      category: content.category,
      description: theme.themeName,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      darkMode: theme.darkMode,
      fontStyle: theme.fontStyle,
      previewItems: content.items,
      heroImage: content.heroImage,
      preview: { bg: "", accent: theme.primaryColor, text: theme.accentColor, card: "" },
    });
  };

  // Snap to nearest phone center on scroll end
  const snapTimeout = useRef(null);
  const handleScrollEnd = useCallback(() => {
    clearTimeout(snapTimeout.current);
    snapTimeout.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const phoneWidth = 200;
      const gap = 12;
      const padding = 80;
      const targetLeft = padding + centerIdx * (phoneWidth + gap) - (el.offsetWidth / 2) + (phoneWidth / 2);
      el.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }, 120);
  }, [centerIdx]);

  return (
    <div className="space-y-4 -mx-4">
      <div className="text-center mb-2 px-4">
        <h2 className="text-lg font-black text-white">Scegli lo stile</h2>
        <p className="text-xs text-gray-400 mt-1">Scorri per esplorare i 5 temi — tocca per selezionare</p>
      </div>

      {/* Horizontal scrollable carousel */}
      <div
        ref={scrollRef}
        onScroll={() => { handleScroll(); handleScrollEnd(); }}
        className="flex gap-3 overflow-x-auto pb-4 pt-2 no-scrollbar"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          paddingLeft: 80,
          paddingRight: 80,
        }}
      >
        {VISUAL_THEMES.map((theme, i) => (
          <div key={theme.id} style={{ scrollSnapAlign: "center" }}>
            <PhoneMockup
              theme={theme}
              content={content}
              isCenter={i === centerIdx}
              isSelected={selected?.id === theme.id}
              onClick={() => handleSelect(theme)}
            />
          </div>
        ))}
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 px-4">
        {VISUAL_THEMES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === centerIdx ? 18 : 5,
              height: 5,
              background: i === centerIdx ? VISUAL_THEMES[centerIdx].primaryColor : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>

      {/* Custom / scratch option */}
      <div className="px-4">
        <button
          onClick={() => onSelect({
            id: "from_scratch",
            name: "Creazione personalizzata",
            description: websiteAnalysis ? "Basata sul tuo sito web" : "L'AI creerà un'app unica per te",
            primaryColor: websiteAnalysis?.primaryColor || "#6366F1",
            secondaryColor: websiteAnalysis?.secondaryColor || "#1a1a2e",
            accentColor: websiteAnalysis?.secondaryColor || "#818CF8",
            darkMode: true,
            fontStyle: "sans-serif",
            preview: { bg: "", accent: "#6366F1", text: "#818CF8", card: "" },
          })}
          className={`w-full flex items-center gap-3 rounded-2xl border p-3 transition-all active:scale-[0.98] ${
            selected?.id === "from_scratch"
              ? "border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/5"
              : "border-white/[0.08] border-dashed hover:border-white/20"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-white">Crea da zero con AI</h3>
            <p className="text-[10px] text-gray-500 leading-relaxed">Stile completamente personalizzato</p>
          </div>
        </button>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}