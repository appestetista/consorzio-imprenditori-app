import React, { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";

// 5 visual themes
const THEMES = [
  {
    id: "dark_elegance",
    tag: "DARK",
    label: "Scuro Elegante",
    primary: "#D4A574", secondary: "#0a0a0a", accent: "#E8C9A0",
    dark: true, font: "serif",
    bg: "#0a0a0a", card: "#151515", text: "#fff", muted: "#666",
  },
  {
    id: "light_clean",
    tag: "LIGHT",
    label: "Chiaro Minimal",
    primary: "#1565C0", secondary: "#FFFFFF", accent: "#42A5F5",
    dark: false, font: "sans-serif",
    bg: "#F7F8FC", card: "#FFFFFF", text: "#111827", muted: "#94a3b8",
  },
  {
    id: "vivid_bold",
    tag: "VIVID",
    label: "Acceso e Forte",
    primary: "#E53935", secondary: "#FFFFFF", accent: "#FF6D00",
    dark: false, font: "sans-serif",
    bg: "#FFFAF5", card: "#FFFFFF", text: "#1a1a2e", muted: "#a1a1aa",
  },
  {
    id: "pastel_soft",
    tag: "PASTEL",
    label: "Pastello Morbido",
    primary: "#A78BFA", secondary: "#FDF4FF", accent: "#F9A8D4",
    dark: false, font: "sans-serif",
    bg: "#FDF4FF", card: "#FFFFFF", text: "#3B1F6E", muted: "#c4b5fd",
  },
  {
    id: "neon_fluo",
    tag: "NEON",
    label: "Fluo Neon",
    primary: "#00E5FF", secondary: "#050510", accent: "#AEEA00",
    dark: true, font: "sans-serif",
    bg: "#050510", card: "#0c0c1e", text: "#fff", muted: "#444",
  },
];

const CONTENT = {
  ristorazione: {
    fallbackName: "La Tua Trattoria",
    hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=280&fit=crop",
    items: [
      { n: "Carbonara Classica", p: "€ 14", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=80&h=80&fit=crop" },
      { n: "Pizza Margherita", p: "€ 10", img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=80&h=80&fit=crop" },
      { n: "Tiramisù", p: "€ 7", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop" },
      { n: "Antipasto Misto", p: "€ 12", img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=80&h=80&fit=crop" },
    ],
    cta: "Prenota un Tavolo",
  },
  beauty: {
    fallbackName: "Beauty Studio",
    hero: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=280&fit=crop",
    items: [
      { n: "Taglio & Piega", p: "€ 35", img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=80&h=80&fit=crop" },
      { n: "Manicure Gel", p: "€ 28", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop" },
      { n: "Trattamento Viso", p: "€ 55", img: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=80&h=80&fit=crop" },
      { n: "Extension Ciglia", p: "€ 45", img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop" },
    ],
    cta: "Prenota Ora",
  },
  fitness: {
    fallbackName: "FitZone",
    hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=280&fit=crop",
    items: [
      { n: "Abbonamento Open", p: "€ 49/m", img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop" },
      { n: "PT Sessione", p: "€ 40", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=80&h=80&fit=crop" },
      { n: "Corso Yoga", p: "€ 15", img: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=80&h=80&fit=crop" },
      { n: "Boxe Fitness", p: "€ 20", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=80&h=80&fit=crop" },
    ],
    cta: "Iscriviti",
  },
  ecommerce: {
    fallbackName: "ShopNow",
    hero: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=280&fit=crop",
    items: [
      { n: "Giacca in Pelle", p: "€ 189", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=80&h=80&fit=crop" },
      { n: "Sneakers Ltd", p: "€ 129", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop" },
      { n: "Borsa Tote", p: "€ 95", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&h=80&fit=crop" },
      { n: "Occhiali", p: "€ 75", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop" },
    ],
    cta: "Acquista",
  },
  _default: {
    fallbackName: "MyBusiness",
    hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=280&fit=crop",
    items: [
      { n: "Consulenza Base", p: "€ 99", img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=80&h=80&fit=crop" },
      { n: "Piano Premium", p: "€ 199", img: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=80&h=80&fit=crop" },
      { n: "Assistenza", p: "€ 49", img: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=80&h=80&fit=crop" },
      { n: "Formazione", p: "€ 79", img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=80&h=80&fit=crop" },
    ],
    cta: "Inizia Ora",
  },
};
["servizi","immobiliare","salute","turismo","educazione","altro"].forEach(k => {
  if (!CONTENT[k]) CONTENT[k] = CONTENT._default;
});

// ─── 5 layout completamente diversi ───────────────────────────

function LayoutDark({ t, c, name, logo }) {
  // Layout 1: Hero full + lista elegante serif
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Georgia, serif" }}>
      <div style={{ position: "relative", height: 110 }}>
        <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 20%, ${t.bg})` }} />
        <div style={{ position: "absolute", bottom: 8, left: 10 }}>
          {logo && <img src={logo} style={{ height: 18, marginBottom: 3, borderRadius: 3 }} alt="" />}
          <div style={{ color: t.primary, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{name}</div>
        </div>
      </div>
      <div style={{ padding: "6px 8px" }}>
        <div style={{ color: t.muted, fontSize: 6, textTransform: "uppercase", letterSpacing: 2, marginBottom: 5 }}>Menu del giorno</div>
        {c.items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${t.primary}15` }}>
            <span style={{ color: t.text, fontSize: 7, fontWeight: 500 }}>{it.n}</span>
            <span style={{ color: t.primary, fontSize: 7, fontWeight: 700 }}>{it.p}</span>
          </div>
        ))}
      </div>
      <div style={{ margin: "8px 8px", padding: "6px", borderRadius: 8, background: t.primary, textAlign: "center" }}>
        <span style={{ color: t.bg, fontSize: 7, fontWeight: 700 }}>{c.cta}</span>
      </div>
    </div>
  );
}

function LayoutLight({ t, c, name, logo }) {
  // Layout 2: Card-based, header top, griglia 2 colonne
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "12px 10px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {logo && <img src={logo} style={{ height: 16, borderRadius: 3 }} alt="" />}
          <span style={{ color: t.text, fontSize: 10, fontWeight: 800 }}>{name}</span>
        </div>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: t.primary + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 7, color: t.primary }}>☰</span>
        </div>
      </div>
      <div style={{ margin: "0 8px", borderRadius: 10, overflow: "hidden", height: 55 }}>
        <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
      </div>
      <div style={{ padding: "6px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 4 }}>
        {c.items.map((it, i) => (
          <div key={i} style={{ background: t.card, borderRadius: 8, padding: 5, border: `1px solid ${t.primary}12`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <img src={it.img} style={{ width: "100%", height: 32, objectFit: "cover", borderRadius: 5, marginBottom: 3 }} alt="" />
            <div style={{ fontSize: 6, fontWeight: 700, color: t.text }}>{it.n}</div>
            <div style={{ fontSize: 6, color: t.primary, fontWeight: 700, marginTop: 1 }}>{it.p}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutVivid({ t, c, name, logo }) {
  // Layout 3: Bold header band + horizontal scroll items + big CTA
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: t.primary, padding: "10px 10px 20px", borderRadius: "0 0 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {logo && <img src={logo} style={{ height: 16, borderRadius: 3, filter: "brightness(10)" }} alt="" />}
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>{name}</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 6, marginTop: 3 }}>Scopri le nostre offerte</p>
      </div>
      <div style={{ padding: "8px 8px 0", display: "flex", gap: 6, overflowX: "hidden", marginTop: -10 }}>
        {c.items.slice(0, 3).map((it, i) => (
          <div key={i} style={{ minWidth: 70, background: t.card, borderRadius: 10, overflow: "hidden", border: `1px solid ${t.primary}18`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <img src={it.img} style={{ width: "100%", height: 42, objectFit: "cover" }} alt="" />
            <div style={{ padding: "3px 5px 5px" }}>
              <div style={{ fontSize: 6, fontWeight: 700, color: t.text }}>{it.n}</div>
              <div style={{ fontSize: 7, fontWeight: 800, color: t.primary }}>{it.p}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 8px" }}>
        <div style={{ fontSize: 7, fontWeight: 800, color: t.text, marginBottom: 4 }}>🔥 Più richiesti</div>
        {c.items.slice(0, 2).map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 4, background: t.card, borderRadius: 8, padding: 4, border: `1px solid ${t.primary}10` }}>
            <img src={it.img} style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} alt="" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 6, fontWeight: 600, color: t.text }}>{it.n}</div>
              <div style={{ fontSize: 6, color: t.accent, fontWeight: 700 }}>{it.p}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ margin: "4px 8px", padding: "6px", borderRadius: 10, background: `linear-gradient(135deg, ${t.primary}, ${t.accent})`, textAlign: "center" }}>
        <span style={{ color: "#fff", fontSize: 7, fontWeight: 800 }}>{c.cta} →</span>
      </div>
    </div>
  );
}

function LayoutPastel({ t, c, name, logo }) {
  // Layout 4: Rounded/bubbly, avatar circles, soft shadows
  return (
    <div style={{ background: `linear-gradient(180deg, ${t.primary}10, ${t.accent}08, ${t.bg})`, height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "12px 10px 8px", textAlign: "center" }}>
        {logo ? <img src={logo} style={{ height: 20, margin: "0 auto 4px", borderRadius: 5 }} alt="" /> : (
          <div style={{ width: 28, height: 28, borderRadius: 14, background: `linear-gradient(135deg, ${t.primary}, ${t.accent})`, margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>{name[0]}</span>
          </div>
        )}
        <div style={{ color: t.text, fontSize: 10, fontWeight: 800 }}>{name}</div>
        <p style={{ color: t.muted, fontSize: 6, marginTop: 1 }}>Benvenuto ✨</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "0 10px", marginBottom: 6 }}>
        {c.items.slice(0, 3).map((it, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, overflow: "hidden", border: `2px solid ${t.primary}30`, margin: "0 auto" }}>
              <img src={it.img} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </div>
            <div style={{ fontSize: 5, color: t.text, fontWeight: 600, marginTop: 2, maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.n}</div>
          </div>
        ))}
      </div>
      <div style={{ margin: "0 8px", borderRadius: 14, overflow: "hidden", height: 55, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
      </div>
      <div style={{ padding: "6px 8px" }}>
        {c.items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", marginBottom: 3, borderRadius: 10, background: t.card, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
            <span style={{ fontSize: 6, fontWeight: 600, color: t.text }}>{it.n}</span>
            <span style={{ fontSize: 6, fontWeight: 700, color: t.primary, background: t.primary + "15", borderRadius: 6, padding: "1px 5px" }}>{it.p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutNeon({ t, c, name, logo }) {
  // Layout 5: Glowing borders, cyberpunk feel, gradient accents
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "10px 10px 6px", display: "flex", alignItems: "center", gap: 5 }}>
        {logo && <img src={logo} style={{ height: 16, borderRadius: 3 }} alt="" />}
        <span style={{ fontSize: 10, fontWeight: 900, background: `linear-gradient(90deg, ${t.primary}, ${t.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{name}</span>
      </div>
      <div style={{ margin: "0 8px", position: "relative", borderRadius: 10, overflow: "hidden", height: 60, border: `1px solid ${t.primary}30`, boxShadow: `0 0 15px ${t.primary}20` }}>
        <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.7) contrast(1.2)" }} alt="" />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 8px", background: `linear-gradient(to top, ${t.bg}, transparent)` }}>
          <span style={{ color: t.primary, fontSize: 7, fontWeight: 800 }}>{c.cta}</span>
        </div>
      </div>
      <div style={{ padding: "6px 8px", marginTop: 4 }}>
        <div style={{ fontSize: 6, fontWeight: 800, color: t.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>⚡ Top Picks</div>
        {c.items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 4, padding: "4px 6px", borderRadius: 8, background: t.card, border: `1px solid ${i === 0 ? t.primary + "40" : t.primary + "10"}`, boxShadow: i === 0 ? `0 0 8px ${t.primary}15` : "none" }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, overflow: "hidden", flexShrink: 0, border: `1px solid ${t.primary}25` }}>
              <img src={it.img} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 6, fontWeight: 600, color: t.text }}>{it.n}</div>
            </div>
            <span style={{ fontSize: 7, fontWeight: 800, color: t.primary }}>{it.p}</span>
          </div>
        ))}
      </div>
      <div style={{ margin: "2px 8px", height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${t.primary}, ${t.accent}, ${t.primary})` }} />
    </div>
  );
}

const LAYOUTS = [LayoutDark, LayoutLight, LayoutVivid, LayoutPastel, LayoutNeon];

// ─── Wrapper telefono ────────────────────────────────────────

function PhoneFrame({ theme, content, Layout, isCenter, isSelected, onClick, name, logo }) {
  const PHONE_W = 165;
  const PHONE_H = 310;

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 focus:outline-none transition-all duration-300"
      style={{
        width: PHONE_W,
        transform: `scale(${isCenter ? 1.08 : 0.85})`,
        opacity: isCenter ? 1 : 0.5,
        zIndex: isCenter ? 10 : 1,
        filter: isCenter ? "none" : "brightness(0.8)",
      }}
    >
      <div
        className="relative overflow-hidden transition-shadow duration-300"
        style={{
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: 22,
          border: isSelected ? "2.5px solid #a855f7" : `2.5px solid ${theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          boxShadow: isSelected
            ? "0 0 24px rgba(168,85,247,0.35)"
            : isCenter
              ? "0 8px 30px rgba(0,0,0,0.4)"
              : "0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        {/* Notch */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 50, height: 12, borderRadius: "0 0 10px 10px", background: theme.dark ? "#000" : "#d1d5db", zIndex: 20 }} />
        {/* Content */}
        <div style={{ position: "absolute", inset: 0, paddingTop: 14, overflow: "hidden" }}>
          <Layout t={theme} c={content} name={name} logo={logo} />
        </div>
        {/* Selected check */}
        {isSelected && (
          <div style={{ position: "absolute", top: 16, right: 6, width: 18, height: 18, borderRadius: 9, background: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          </div>
        )}
      </div>
      {/* Label */}
      <div style={{ marginTop: 8, textAlign: "center" }}>
        <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, padding: "2px 8px", borderRadius: 10, background: theme.primary + "20", color: theme.primary }}>{theme.tag}</span>
        <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{theme.label}</p>
      </div>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────

export default function StyleTemplates({ businessType, websiteAnalysis, selected, onSelect }) {
  const c = CONTENT[businessType] || CONTENT._default;
  const appName = websiteAnalysis?.name || c.fallbackName;
  const logo = websiteAnalysis?.logoUrl || null;

  const scrollRef = useRef(null);
  const [centerIdx, setCenterIdx] = useState(2);

  // Scroll to middle on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const containerW = el.offsetWidth;
      const phoneW = 165;
      const gap = 16;
      const scrollTo = 2 * (phoneW + gap) - containerW / 2 + phoneW / 2;
      el.scrollLeft = Math.max(0, scrollTo);
    });
  }, []);

  const detectCenter = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollCenter = el.scrollLeft + el.offsetWidth / 2;
    const phoneW = 165;
    const gap = 16;
    const pad = el.offsetWidth / 2 - phoneW / 2;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < 5; i++) {
      const itemCenter = pad + i * (phoneW + gap) + phoneW / 2;
      const d = Math.abs(scrollCenter - itemCenter);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setCenterIdx(best);
  }, []);

  // Snap on scroll end
  const snapTimer = useRef(null);
  const onScroll = useCallback(() => {
    detectCenter();
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const phoneW = 165;
      const gap = 16;
      const pad = el.offsetWidth / 2 - phoneW / 2;
      const target = pad + centerIdx * (phoneW + gap) - (el.offsetWidth / 2 - phoneW / 2);
      el.scrollTo({ left: target, behavior: "smooth" });
    }, 150);
  }, [detectCenter, centerIdx]);

  const handleSelect = (theme) => {
    onSelect({
      id: theme.id,
      name: `${appName} — ${theme.label}`,
      category: businessType,
      description: theme.label,
      primaryColor: theme.primary,
      secondaryColor: theme.secondary,
      accentColor: theme.accent,
      darkMode: theme.dark,
      fontStyle: theme.font,
      previewItems: c.items.map(i => i.n),
      heroImage: c.hero,
      preview: { bg: "", accent: theme.primary, text: theme.accent, card: "" },
    });
  };

  return (
    <div className="space-y-4 -mx-4">
      <div className="text-center px-4 mb-1">
        <h2 className="text-lg font-black text-white">Scegli lo stile</h2>
        <p className="text-xs text-gray-400 mt-1">Scorri e tocca il design che preferisci</p>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex gap-4 overflow-x-auto pb-4 pt-2"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Padding spacers for centering first/last items */}
        <div className="flex-shrink-0" style={{ width: `calc(50vw - 82px)` }} />
        {THEMES.map((theme, i) => (
          <div key={theme.id} style={{ scrollSnapAlign: "center" }}>
            <PhoneFrame
              theme={theme}
              content={c}
              Layout={LAYOUTS[i]}
              isCenter={i === centerIdx}
              isSelected={selected?.id === theme.id}
              onClick={() => handleSelect(theme)}
              name={appName}
              logo={logo}
            />
          </div>
        ))}
        <div className="flex-shrink-0" style={{ width: `calc(50vw - 82px)` }} />
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {THEMES.map((_, i) => (
          <div key={i} className="rounded-full transition-all duration-300" style={{
            width: i === centerIdx ? 20 : 5,
            height: 5,
            background: i === centerIdx ? THEMES[centerIdx].primary : "rgba(255,255,255,0.12)",
          }} />
        ))}
      </div>

      {/* Scratch option */}
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
            <p className="text-[10px] text-gray-500">Stile completamente personalizzato</p>
          </div>
        </button>
      </div>

      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}