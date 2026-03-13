import React, { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";

const THEMES = [
  { id: "dark_elegance", tag: "DARK", label: "Scuro Elegante", primary: "#D4A574", secondary: "#0a0a0a", accent: "#E8C9A0", dark: true, font: "serif", bg: "#0a0a0a", card: "#151515", text: "#fff", muted: "#666" },
  { id: "light_clean", tag: "LIGHT", label: "Chiaro Minimal", primary: "#1565C0", secondary: "#FFFFFF", accent: "#42A5F5", dark: false, font: "sans-serif", bg: "#F7F8FC", card: "#FFFFFF", text: "#111827", muted: "#94a3b8" },
  { id: "vivid_bold", tag: "VIVID", label: "Acceso e Forte", primary: "#E53935", secondary: "#FFFFFF", accent: "#FF6D00", dark: false, font: "sans-serif", bg: "#FFFAF5", card: "#FFFFFF", text: "#1a1a2e", muted: "#a1a1aa" },
  { id: "pastel_soft", tag: "PASTEL", label: "Pastello Morbido", primary: "#A78BFA", secondary: "#FDF4FF", accent: "#F9A8D4", dark: false, font: "sans-serif", bg: "#FDF4FF", card: "#FFFFFF", text: "#3B1F6E", muted: "#c4b5fd" },
  { id: "neon_fluo", tag: "NEON", label: "Fluo Neon", primary: "#00E5FF", secondary: "#050510", accent: "#AEEA00", dark: true, font: "sans-serif", bg: "#050510", card: "#0c0c1e", text: "#fff", muted: "#444" },
];

const FALLBACK = {
  ristorazione: { name: "La Tua Trattoria", hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=280&fit=crop", items: [{ n: "Carbonara", p: "€ 14", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=80&h=80&fit=crop" }, { n: "Margherita", p: "€ 10", img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=80&h=80&fit=crop" }, { n: "Tiramisù", p: "€ 7", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop" }, { n: "Antipasto", p: "€ 12", img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=80&h=80&fit=crop" }], cta: "Prenota" },
  beauty: { name: "Beauty Studio", hero: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=280&fit=crop", items: [{ n: "Taglio & Piega", p: "€ 35", img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=80&h=80&fit=crop" }, { n: "Manicure", p: "€ 28", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop" }, { n: "Trattamento Viso", p: "€ 55", img: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=80&h=80&fit=crop" }, { n: "Extension", p: "€ 45", img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop" }], cta: "Prenota" },
  fitness: { name: "FitZone", hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=280&fit=crop", items: [{ n: "Open Gym", p: "€ 49/m", img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop" }, { n: "PT Session", p: "€ 40", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=80&h=80&fit=crop" }, { n: "Yoga", p: "€ 15", img: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=80&h=80&fit=crop" }, { n: "Boxe", p: "€ 20", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=80&h=80&fit=crop" }], cta: "Iscriviti" },
  ecommerce: { name: "ShopNow", hero: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=280&fit=crop", items: [{ n: "Giacca", p: "€ 189", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=80&h=80&fit=crop" }, { n: "Sneakers", p: "€ 129", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop" }, { n: "Borsa", p: "€ 95", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&h=80&fit=crop" }, { n: "Occhiali", p: "€ 75", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop" }], cta: "Acquista" },
  _default: { name: "MyBusiness", hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=280&fit=crop", items: [{ n: "Consulenza", p: "€ 99", img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=80&h=80&fit=crop" }, { n: "Premium", p: "€ 199", img: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=80&h=80&fit=crop" }, { n: "Assistenza", p: "€ 49", img: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=80&h=80&fit=crop" }, { n: "Formazione", p: "€ 79", img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=80&h=80&fit=crop" }], cta: "Inizia" },
};
["servizi","immobiliare","salute","turismo","educazione","altro"].forEach(k => { if (!FALLBACK[k]) FALLBACK[k] = FALLBACK._default; });

// Merge dati reali dal sito con fallback
function buildContent(businessType, wa) {
  const fb = FALLBACK[businessType] || FALLBACK._default;
  const name = wa?.name || fb.name;
  const logo = wa?.logoUrl || null;
  // Hero: prima immagine "hero" dal sito, oppure fallback
  const heroImg = wa?.siteImages?.find(i => /hero|banner|header|main|copertina/i.test(i.context))?.url || fb.hero;
  // Items: dal sito (menuItems) o fallback
  let items = fb.items;
  if (wa?.menuItems?.length >= 2) {
    items = wa.menuItems.slice(0, 4).map((mi, idx) => ({
      n: mi.name || `Prodotto ${idx + 1}`,
      p: mi.price || "",
      img: mi.image_url || wa?.siteImages?.[idx]?.url || fb.items[idx % fb.items.length]?.img || "",
    }));
  }
  const cta = fb.cta;
  return { name, logo, hero: heroImg, items, cta };
}

// ─── Clickable item with ripple ─────────────────────────────

function Tap({ children, style, className }) {
  const [tapped, setTapped] = useState(false);
  return (
    <div
      className={className}
      style={{ ...style, position: "relative", cursor: "pointer", transition: "transform 0.1s", transform: tapped ? "scale(0.95)" : "scale(1)" }}
      onPointerDown={() => setTapped(true)}
      onPointerUp={() => setTimeout(() => setTapped(false), 150)}
      onPointerLeave={() => setTapped(false)}
    >
      {children}
      {tapped && <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: "rgba(255,255,255,0.12)", pointerEvents: "none" }} />}
    </div>
  );
}

// ─── 5 LAYOUT completamente diversi e interattivi ───────────

function LayoutDark({ t, c }) {
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Georgia, serif" }}>
      <div style={{ position: "relative", height: 105 }}>
        <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 20%, ${t.bg})` }} />
        <div style={{ position: "absolute", bottom: 6, left: 8, right: 8, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            {c.logo && <img src={c.logo} style={{ height: 14, marginBottom: 2, borderRadius: 2 }} alt="" onError={e => e.target.style.display = 'none'} />}
            <div style={{ color: t.primary, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>{c.name}</div>
          </div>
          <Tap><div style={{ background: t.primary, borderRadius: 6, padding: "3px 8px" }}><span style={{ color: t.bg, fontSize: 6, fontWeight: 700 }}>{c.cta}</span></div></Tap>
        </div>
      </div>
      <div style={{ padding: "5px 8px" }}>
        <div style={{ color: t.muted, fontSize: 5, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Menu</div>
        {c.items.map((it, i) => (
          <Tap key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${t.primary}12` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img src={it.img} style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }} alt="" onError={e => e.target.style.display = 'none'} />
                <span style={{ color: t.text, fontSize: 6.5, fontWeight: 500 }}>{it.n}</span>
              </div>
              <span style={{ color: t.primary, fontSize: 6.5, fontWeight: 700 }}>{it.p}</span>
            </div>
          </Tap>
        ))}
      </div>
      <BottomBar t={t} />
    </div>
  );
}

function LayoutLight({ t, c }) {
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "10px 8px 5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {c.logo ? <img src={c.logo} style={{ height: 14, borderRadius: 2 }} alt="" onError={e => e.target.style.display = 'none'} /> : null}
          <span style={{ color: t.text, fontSize: 9, fontWeight: 800 }}>{c.name}</span>
        </div>
        <Tap><div style={{ width: 16, height: 16, borderRadius: 8, background: t.primary + "15", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 6, color: t.primary }}>☰</span></div></Tap>
      </div>
      <Tap>
        <div style={{ margin: "0 8px", borderRadius: 8, overflow: "hidden", height: 48, position: "relative" }}>
          <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 7, fontWeight: 700, background: t.primary, padding: "2px 8px", borderRadius: 5 }}>{c.cta}</span>
          </div>
        </div>
      </Tap>
      <div style={{ padding: "5px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4 }}>
        {c.items.map((it, i) => (
          <Tap key={i}>
            <div style={{ background: t.card, borderRadius: 7, padding: 4, border: `1px solid ${t.primary}10`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <img src={it.img} style={{ width: "100%", height: 28, objectFit: "cover", borderRadius: 4, marginBottom: 2 }} alt="" onError={e => e.target.style.display = 'none'} />
              <div style={{ fontSize: 5.5, fontWeight: 700, color: t.text }}>{it.n}</div>
              <div style={{ fontSize: 5.5, color: t.primary, fontWeight: 700, marginTop: 1 }}>{it.p}</div>
            </div>
          </Tap>
        ))}
      </div>
      <BottomBar t={t} />
    </div>
  );
}

function LayoutVivid({ t, c }) {
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})`, padding: "10px 8px 18px", borderRadius: "0 0 18px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
          {c.logo ? <img src={c.logo} style={{ height: 14, borderRadius: 2, filter: "brightness(10)" }} alt="" onError={e => e.target.style.display = 'none'} /> : null}
          <span style={{ color: "#fff", fontSize: 10, fontWeight: 900 }}>{c.name}</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 5.5 }}>Scopri le nostre offerte</p>
      </div>
      <div style={{ padding: "6px 8px 0", display: "flex", gap: 5, overflowX: "hidden", marginTop: -8 }}>
        {c.items.slice(0, 3).map((it, i) => (
          <Tap key={i}>
            <div style={{ minWidth: 65, background: t.card, borderRadius: 8, overflow: "hidden", border: `1px solid ${t.primary}15`, boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
              <img src={it.img} style={{ width: "100%", height: 36, objectFit: "cover" }} alt="" onError={e => e.target.style.display = 'none'} />
              <div style={{ padding: "2px 4px 4px" }}>
                <div style={{ fontSize: 5.5, fontWeight: 700, color: t.text }}>{it.n}</div>
                <div style={{ fontSize: 6, fontWeight: 800, color: t.primary }}>{it.p}</div>
              </div>
            </div>
          </Tap>
        ))}
      </div>
      <div style={{ padding: "5px 8px" }}>
        <div style={{ fontSize: 6, fontWeight: 800, color: t.text, marginBottom: 3 }}>🔥 Più richiesti</div>
        {c.items.slice(0, 2).map((it, i) => (
          <Tap key={i}>
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3, background: t.card, borderRadius: 6, padding: 3, border: `1px solid ${t.primary}08` }}>
              <img src={it.img} style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} alt="" onError={e => e.target.style.display = 'none'} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 5.5, fontWeight: 600, color: t.text }}>{it.n}</div></div>
              <span style={{ fontSize: 5.5, color: t.accent, fontWeight: 700 }}>{it.p}</span>
            </div>
          </Tap>
        ))}
      </div>
      <Tap>
        <div style={{ margin: "3px 8px", padding: "5px", borderRadius: 8, background: `linear-gradient(135deg, ${t.primary}, ${t.accent})`, textAlign: "center" }}>
          <span style={{ color: "#fff", fontSize: 6, fontWeight: 800 }}>{c.cta} →</span>
        </div>
      </Tap>
      <BottomBar t={t} />
    </div>
  );
}

function LayoutPastel({ t, c }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${t.primary}10, ${t.accent}08, ${t.bg})`, height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "10px 8px 6px", textAlign: "center" }}>
        {c.logo ? <img src={c.logo} style={{ height: 18, margin: "0 auto 3px", borderRadius: 4 }} alt="" onError={e => e.target.style.display = 'none'} /> : (
          <div style={{ width: 26, height: 26, borderRadius: 13, background: `linear-gradient(135deg, ${t.primary}, ${t.accent})`, margin: "0 auto 3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>{c.name[0]}</span>
          </div>
        )}
        <div style={{ color: t.text, fontSize: 9, fontWeight: 800 }}>{c.name}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 7, padding: "0 8px", marginBottom: 5 }}>
        {c.items.slice(0, 3).map((it, i) => (
          <Tap key={i}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: 15, overflow: "hidden", border: `2px solid ${t.primary}30`, margin: "0 auto" }}>
                <img src={it.img} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => e.target.style.display = 'none'} />
              </div>
              <div style={{ fontSize: 4.5, color: t.text, fontWeight: 600, marginTop: 2, maxWidth: 36, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.n}</div>
            </div>
          </Tap>
        ))}
      </div>
      <Tap>
        <div style={{ margin: "0 8px", borderRadius: 10, overflow: "hidden", height: 48, boxShadow: "0 3px 15px rgba(0,0,0,0.05)" }}>
          <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        </div>
      </Tap>
      <div style={{ padding: "5px 8px" }}>
        {c.items.map((it, i) => (
          <Tap key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 5px", marginBottom: 2, borderRadius: 8, background: t.card, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 5.5, fontWeight: 600, color: t.text }}>{it.n}</span>
              <span style={{ fontSize: 5.5, fontWeight: 700, color: t.primary, background: t.primary + "15", borderRadius: 5, padding: "1px 4px" }}>{it.p}</span>
            </div>
          </Tap>
        ))}
      </div>
      <BottomBar t={t} />
    </div>
  );
}

function LayoutNeon({ t, c }) {
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "10px 8px 5px", display: "flex", alignItems: "center", gap: 4 }}>
        {c.logo ? <img src={c.logo} style={{ height: 14, borderRadius: 2 }} alt="" onError={e => e.target.style.display = 'none'} /> : null}
        <span style={{ fontSize: 9, fontWeight: 900, background: `linear-gradient(90deg, ${t.primary}, ${t.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{c.name}</span>
      </div>
      <Tap>
        <div style={{ margin: "0 8px", position: "relative", borderRadius: 8, overflow: "hidden", height: 52, border: `1px solid ${t.primary}30`, boxShadow: `0 0 12px ${t.primary}20` }}>
          <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.7) contrast(1.2)" }} alt="" />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "2px 6px", background: `linear-gradient(to top, ${t.bg}, transparent)` }}>
            <span style={{ color: t.primary, fontSize: 6, fontWeight: 800 }}>{c.cta} ⚡</span>
          </div>
        </div>
      </Tap>
      <div style={{ padding: "5px 8px", marginTop: 3 }}>
        <div style={{ fontSize: 5, fontWeight: 800, color: t.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 3 }}>⚡ Top Picks</div>
        {c.items.map((it, i) => (
          <Tap key={i}>
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3, padding: "3px 5px", borderRadius: 6, background: t.card, border: `1px solid ${i === 0 ? t.primary + "40" : t.primary + "10"}`, boxShadow: i === 0 ? `0 0 6px ${t.primary}15` : "none" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, overflow: "hidden", flexShrink: 0, border: `1px solid ${t.primary}20` }}>
                <img src={it.img} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => e.target.style.display = 'none'} />
              </div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 5.5, fontWeight: 600, color: t.text }}>{it.n}</div></div>
              <span style={{ fontSize: 6, fontWeight: 800, color: t.primary }}>{it.p}</span>
            </div>
          </Tap>
        ))}
      </div>
      <div style={{ margin: "3px 8px", height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${t.primary}, ${t.accent}, ${t.primary})` }} />
      <BottomBar t={t} />
    </div>
  );
}

// Shared bottom nav bar
function BottomBar({ t }) {
  const icons = ["●", "◎", "☰", "♡"];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "4px 6px", background: t.card, borderTop: `1px solid ${t.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
      {icons.map((ic, i) => (
        <Tap key={i}><span style={{ color: i === 0 ? t.primary : t.muted, fontSize: 7, padding: "2px 6px" }}>{ic}</span></Tap>
      ))}
    </div>
  );
}

const LAYOUTS = [LayoutDark, LayoutLight, LayoutVivid, LayoutPastel, LayoutNeon];

// ─── Phone wrapper ──────────────────────────────────────────

function PhoneFrame({ theme, content, LayoutComp, isCenter, isSelected, onClick }) {
  const W = 165, H = 310;
  return (
    <button onClick={onClick} className="flex-shrink-0 focus:outline-none transition-all duration-300" style={{
      width: W, transform: `scale(${isCenter ? 1.08 : 0.85})`, opacity: isCenter ? 1 : 0.5,
      zIndex: isCenter ? 10 : 1, filter: isCenter ? "none" : "brightness(0.8)",
    }}>
      <div className="relative overflow-hidden transition-shadow duration-300" style={{
        width: W, height: H, borderRadius: 22,
        border: isSelected ? "2.5px solid #a855f7" : `2.5px solid ${theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        boxShadow: isSelected ? "0 0 24px rgba(168,85,247,0.35)" : isCenter ? "0 8px 30px rgba(0,0,0,0.4)" : "0 2px 10px rgba(0,0,0,0.2)",
      }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 50, height: 12, borderRadius: "0 0 10px 10px", background: theme.dark ? "#000" : "#d1d5db", zIndex: 20 }} />
        <div style={{ position: "absolute", inset: 0, paddingTop: 14, overflow: "hidden" }}>
          <LayoutComp t={theme} c={content} />
        </div>
        {isSelected && (
          <div style={{ position: "absolute", top: 16, right: 6, width: 18, height: 18, borderRadius: 9, background: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, textAlign: "center" }}>
        <span style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, padding: "2px 8px", borderRadius: 10, background: theme.primary + "20", color: theme.primary }}>{theme.tag}</span>
        <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{theme.label}</p>
      </div>
    </button>
  );
}

// ─── Main ───────────────────────────────────────────────────

export default function StyleTemplates({ businessType, websiteAnalysis, selected, onSelect }) {
  const content = buildContent(businessType, websiteAnalysis);
  const scrollRef = useRef(null);
  const [centerIdx, setCenterIdx] = useState(2);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const phoneW = 165, gap = 16;
      const pad = el.offsetWidth / 2 - phoneW / 2;
      el.scrollLeft = pad + 2 * (phoneW + gap) - (el.offsetWidth / 2 - phoneW / 2);
    });
  }, []);

  const detectCenter = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollCenter = el.scrollLeft + el.offsetWidth / 2;
    const phoneW = 165, gap = 16, pad = el.offsetWidth / 2 - phoneW / 2;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < 5; i++) {
      const d = Math.abs(scrollCenter - (pad + i * (phoneW + gap) + phoneW / 2));
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setCenterIdx(best);
  }, []);

  const snapTimer = useRef(null);
  const onScroll = useCallback(() => {
    detectCenter();
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const phoneW = 165, gap = 16, pad = el.offsetWidth / 2 - phoneW / 2;
      el.scrollTo({ left: pad + centerIdx * (phoneW + gap) - (el.offsetWidth / 2 - phoneW / 2), behavior: "smooth" });
    }, 150);
  }, [detectCenter, centerIdx]);

  const handleSelect = (theme) => {
    onSelect({
      id: theme.id, name: `${content.name} — ${theme.label}`, category: businessType,
      description: theme.label, primaryColor: theme.primary, secondaryColor: theme.secondary,
      accentColor: theme.accent, darkMode: theme.dark, fontStyle: theme.font,
      previewItems: content.items.map(i => i.n), heroImage: content.hero,
      preview: { bg: "", accent: theme.primary, text: theme.accent, card: "" },
    });
  };

  return (
    <div className="space-y-4 -mx-4">
      <div className="text-center px-4 mb-1">
        <h2 className="text-lg font-black text-white">Scegli lo stile</h2>
        <p className="text-xs text-gray-400 mt-1">Scorri e tocca il design che preferisci</p>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="flex gap-4 overflow-x-auto pb-4 pt-2"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div className="flex-shrink-0" style={{ width: "calc(50vw - 82px)" }} />
        {THEMES.map((theme, i) => (
          <div key={theme.id} style={{ scrollSnapAlign: "center" }}>
            <PhoneFrame theme={theme} content={content} LayoutComp={LAYOUTS[i]}
              isCenter={i === centerIdx} isSelected={selected?.id === theme.id}
              onClick={() => handleSelect(theme)} />
          </div>
        ))}
        <div className="flex-shrink-0" style={{ width: "calc(50vw - 82px)" }} />
      </div>

      <div className="flex justify-center gap-1.5">
        {THEMES.map((_, i) => (
          <div key={i} className="rounded-full transition-all duration-300" style={{
            width: i === centerIdx ? 20 : 5, height: 5,
            background: i === centerIdx ? THEMES[centerIdx].primary : "rgba(255,255,255,0.12)",
          }} />
        ))}
      </div>

      <div className="px-4">
        <button onClick={() => onSelect({
          id: "from_scratch", name: "Creazione personalizzata",
          description: websiteAnalysis ? "Basata sul tuo sito web" : "L'AI creerà un'app unica per te",
          primaryColor: websiteAnalysis?.primaryColor || "#6366F1", secondaryColor: websiteAnalysis?.secondaryColor || "#1a1a2e",
          accentColor: websiteAnalysis?.secondaryColor || "#818CF8", darkMode: true, fontStyle: "sans-serif",
          preview: { bg: "", accent: "#6366F1", text: "#818CF8", card: "" },
        })} className={`w-full flex items-center gap-3 rounded-2xl border p-3 transition-all active:scale-[0.98] ${
          selected?.id === "from_scratch" ? "border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/5" : "border-white/[0.08] border-dashed hover:border-white/20"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-white">Crea da zero con AI</h3>
            <p className="text-[10px] text-gray-500">Stile completamente personalizzato</p>
          </div>
        </button>
      </div>

      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}