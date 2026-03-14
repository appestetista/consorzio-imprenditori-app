import React, { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles } from "lucide-react";

const THEMES = [
  { id: "gourmet_dark", tag: "GOURMET", label: "Scuro Elegante", primary: "#C4964A", secondary: "#0a0a0a", accent: "#D4A95A", dark: true, font: "serif", bg: "#0a0a0a", card: "#141414", text: "#fff", muted: "#666", border: "#222" },
  { id: "classic_cream", tag: "CLASSICO", label: "Crema Raffinato", primary: "#8B6914", secondary: "#F5EDE0", accent: "#A0845C", dark: false, font: "serif", bg: "#F5EDE0", card: "#FFFFFF", text: "#2a2014", muted: "#8a7a6a", border: "#E0D5C5" },
  { id: "green_fresh", tag: "FRESH", label: "Verde Naturale", primary: "#2D5A3D", secondary: "#F5F0E6", accent: "#3A7D53", dark: false, font: "sans-serif", bg: "#F5F0E6", card: "#FFFFFF", text: "#1a1a1a", muted: "#7a7a6a", border: "#E8E0D0" },
  { id: "portal_immersive", tag: "PORTAL", label: "Fullscreen Immersivo", primary: "#C8B89A", secondary: "#1a1a2e", accent: "#D4C4A8", dark: true, font: "serif", bg: "#1a1a2e", card: "#1a1a1a", text: "#fff", muted: "#999", border: "#333" },
  { id: "luxury_minimal", tag: "LUSSO", label: "Lusso Minimale", primary: "#B8860B", secondary: "#0E0E0E", accent: "#DAA520", dark: true, font: "serif", bg: "#0E0E0E", card: "#161616", text: "#F5F0E8", muted: "#666", border: "#252525" },
];

const FALLBACK = {
  ristorazione: { name: "La Tua Trattoria", hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=280&fit=crop", items: [{ n: "Carbonara", p: "€ 14", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=80&h=80&fit=crop", desc: "Guanciale croccante, pecorino DOP" }, { n: "Margherita", p: "€ 10", img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=80&h=80&fit=crop", desc: "Pomodoro bio, mozzarella fiordilatte" }, { n: "Tiramisù", p: "€ 7", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop", desc: "Mascarpone, caffè espresso" }, { n: "Grigliata mista", p: "€ 23", img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=80&h=80&fit=crop", desc: "Pesce fresco del giorno" }], cta: "Prenota" },
  beauty: { name: "Beauty Studio", hero: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=280&fit=crop", items: [{ n: "Taglio & Piega", p: "€ 35", img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=80&h=80&fit=crop", desc: "Styling professionale" }, { n: "Manicure", p: "€ 28", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop", desc: "Semipermanente incluso" }, { n: "Trattamento Viso", p: "€ 55", img: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=80&h=80&fit=crop", desc: "Pulizia profonda" }, { n: "Extension", p: "€ 45", img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop", desc: "Ciglia volume naturale" }], cta: "Prenota" },
  fitness: { name: "FitZone", hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=280&fit=crop", items: [{ n: "Open Gym", p: "€ 49/m", img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop", desc: "Accesso illimitato" }, { n: "PT Session", p: "€ 40", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=80&h=80&fit=crop", desc: "Personal trainer dedicato" }, { n: "Yoga", p: "€ 15", img: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=80&h=80&fit=crop", desc: "Vinyasa flow" }, { n: "Boxe", p: "€ 20", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=80&h=80&fit=crop", desc: "Tecniche base e avanzate" }], cta: "Iscriviti" },
  ecommerce: { name: "ShopNow", hero: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=280&fit=crop", items: [{ n: "Giacca", p: "€ 189", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=80&h=80&fit=crop", desc: "Pelle italiana" }, { n: "Sneakers", p: "€ 129", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop", desc: "Limited edition" }, { n: "Borsa", p: "€ 95", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&h=80&fit=crop", desc: "Artigianale" }, { n: "Occhiali", p: "€ 75", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop", desc: "UV400" }], cta: "Acquista" },
  _default: { name: "MyBusiness", hero: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=280&fit=crop", items: [{ n: "Consulenza", p: "€ 99", img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=80&h=80&fit=crop", desc: "1 ora dedicata" }, { n: "Premium", p: "€ 199", img: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=80&h=80&fit=crop", desc: "Pacchetto completo" }, { n: "Assistenza", p: "€ 49", img: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=80&h=80&fit=crop", desc: "Supporto dedicato" }, { n: "Formazione", p: "€ 79", img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=80&h=80&fit=crop", desc: "Workshop pratico" }], cta: "Inizia" },
};
["servizi","immobiliare","salute","turismo","educazione","altro"].forEach(k => { if (!FALLBACK[k]) FALLBACK[k] = FALLBACK._default; });

function buildContent(businessType, wa) {
  const fb = FALLBACK[businessType] || FALLBACK._default;
  const name = wa?.name || fb.name;
  const logo = wa?.logoUrl || null;
  const heroImg = wa?.siteImages?.find(i => /hero|banner|header|main|copertina/i.test(i.context))?.url || fb.hero;
  let items = fb.items;
  if (wa?.menuItems?.length >= 2) {
    items = wa.menuItems.slice(0, 4).map((mi, idx) => ({
      n: mi.name || `Prodotto ${idx + 1}`,
      p: mi.price || "",
      desc: mi.description || "",
      img: mi.image_url || wa?.siteImages?.[idx]?.url || fb.items[idx % fb.items.length]?.img || "",
    }));
  }
  return { name, logo, hero: heroImg, items, cta: fb.cta };
}

// Tap interaction
function Tap({ children, style, className }) {
  const [tapped, setTapped] = useState(false);
  return (
    <div className={className} style={{ ...style, position: "relative", cursor: "pointer", transition: "transform 0.1s", transform: tapped ? "scale(0.97)" : "scale(1)" }}
      onPointerDown={() => setTapped(true)} onPointerUp={() => setTimeout(() => setTapped(false), 150)} onPointerLeave={() => setTapped(false)}>
      {children}
    </div>
  );
}

// ─── Layout 1: GOURMET DARK — Scuro con serif, oro su nero ──
function LayoutGourmetDark({ t, c }) {
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Georgia, serif" }}>
      {/* Header con logo/nome */}
      <div style={{ padding: "10px 8px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {c.logo ? <img src={c.logo} style={{ height: 16, borderRadius: 2 }} alt="" onError={e => e.target.style.display='none'} /> : null}
          <span style={{ color: t.primary, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{c.name}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, border: `1px solid ${t.primary}40`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 5, color: t.primary }}>☰</span></div>
        </div>
      </div>
      {/* Hero */}
      <div style={{ margin: "4px 8px", borderRadius: 10, overflow: "hidden", height: 72, position: "relative" }}>
        <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", bottom: 5, left: 6 }}>
          <div style={{ color: "#fff", fontSize: 7.5, fontWeight: 700 }}>{c.name}</div>
          <div style={{ color: t.primary, fontSize: 5, fontWeight: 600, marginTop: 1 }}>dal 1977 • Fano</div>
        </div>
      </div>
      {/* Sottotitolo menu */}
      <div style={{ padding: "5px 8px 2px" }}>
        <div style={{ color: t.primary, fontSize: 5, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>Il Nostro Menu</div>
        <div style={{ width: 20, height: 1, background: t.primary + "40", marginTop: 2 }} />
      </div>
      {/* Items */}
      <div style={{ padding: "4px 8px" }}>
        {c.items.map((it, i) => (
          <Tap key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 0", borderBottom: `1px solid ${t.border}` }}>
              <img src={it.img} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover" }} alt="" onError={e => e.target.style.display='none'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 6, fontWeight: 700, color: t.text }}>{it.n}</div>
                {it.desc && <div style={{ fontSize: 4.5, color: t.muted, marginTop: 0.5 }}>{it.desc}</div>}
              </div>
              <span style={{ fontSize: 6.5, fontWeight: 800, color: t.primary }}>{it.p}</span>
            </div>
          </Tap>
        ))}
      </div>
      <BottomBar t={t} />
    </div>
  );
}

// ─── Layout 2: CLASSIC CREAM — Sfondo crema, elegante ──
function LayoutClassicCream({ t, c }) {
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Georgia, serif" }}>
      <div style={{ padding: "10px 8px 3px", textAlign: "center" }}>
        {c.logo ? <img src={c.logo} style={{ height: 20, margin: "0 auto", borderRadius: 3 }} alt="" onError={e => e.target.style.display='none'} /> :
          <span style={{ color: t.text, fontSize: 11, fontWeight: 800, letterSpacing: -0.5 }}>{c.name}</span>}
      </div>
      <div style={{ textAlign: "center", margin: "2px 0 4px" }}>
        <span style={{ fontSize: 4.5, color: t.muted, textTransform: "uppercase", letterSpacing: 2 }}>Ristorante • Pizzeria</span>
      </div>
      {/* Hero card */}
      <Tap>
        <div style={{ margin: "0 8px", borderRadius: 10, overflow: "hidden", height: 56, position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
          <div style={{ position: "absolute", bottom: 4, left: 6 }}>
            <div style={{ background: t.primary, borderRadius: 5, padding: "2px 6px" }}>
              <span style={{ color: "#fff", fontSize: 5, fontWeight: 700 }}>{c.cta}</span>
            </div>
          </div>
        </div>
      </Tap>
      {/* Menu items con card bianche */}
      <div style={{ padding: "5px 8px", display: "flex", flexDirection: "column", gap: 3, marginTop: 3 }}>
        {c.items.map((it, i) => (
          <Tap key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: 4, background: t.card, borderRadius: 8, border: `1px solid ${t.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <img src={it.img} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover" }} alt="" onError={e => e.target.style.display='none'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 6, fontWeight: 700, color: t.text }}>{it.n}</div>
                {it.desc && <div style={{ fontSize: 4.5, color: t.muted }}>{it.desc}</div>}
              </div>
              <div style={{ background: t.primary + "15", borderRadius: 5, padding: "2px 4px" }}>
                <span style={{ fontSize: 6, fontWeight: 800, color: t.primary }}>{it.p}</span>
              </div>
            </div>
          </Tap>
        ))}
      </div>
      <BottomBar t={t} />
    </div>
  );
}

// ─── Layout 3: GREEN FRESH — Come da screenshot: header verde arrotondato, pills, hero, griglia card, bottom bar verde ──
function LayoutGreenFresh({ t, c }) {
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Inter, -apple-system, sans-serif", position: "relative" }}>
      {/* Header verde con bordi arrotondati in basso */}
      <div style={{ background: t.primary, borderRadius: "0 0 16px 16px", padding: "8px 8px 6px", marginBottom: 0 }}>
        {/* Riga top: freccia + nome + icone */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, fontWeight: 300 }}>‹</span>
            {c.logo ? <img src={c.logo} style={{ height: 14, borderRadius: 2 }} alt="" onError={e => e.target.style.display='none'} /> : null}
            <span style={{ color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: -0.3 }}>{c.name}</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 6, color: "#fff" }}>🔍</span>
            </div>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 5, color: "#fff" }}>☰</span>
            </div>
          </div>
        </div>
        {/* Pills categorie dentro l'header verde */}
        <div style={{ display: "flex", gap: 3, overflow: "hidden", paddingBottom: 2 }}>
          {["Tutti", "Primi", "Secondi", "Pizze", "Dolci"].map((cat, i) => (
            <div key={i} style={{
              padding: "3px 8px", borderRadius: 14, whiteSpace: "nowrap",
              background: i === 0 ? "#fff" : "rgba(255,255,255,0.12)",
              border: i !== 0 ? "1px solid rgba(255,255,255,0.18)" : "none",
            }}>
              <span style={{ fontSize: 5, fontWeight: 700, color: i === 0 ? t.primary : "rgba(255,255,255,0.8)" }}>{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero image — grande, bordi molto arrotondati, con gradient e testo */}
      <Tap>
        <div style={{ margin: "6px 8px", borderRadius: 16, overflow: "hidden", height: 68, position: "relative", boxShadow: "0 3px 12px rgba(0,0,0,0.08)" }}>
          <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />
          {/* Badge in alto a sinistra */}
          <div style={{ position: "absolute", top: 5, left: 5, background: t.primary, borderRadius: 8, padding: "1.5px 5px" }}>
            <span style={{ color: "#fff", fontSize: 4, fontWeight: 700, letterSpacing: 0.5 }}>⭐ Consigliato</span>
          </div>
          {/* Testo overlay in basso */}
          <div style={{ position: "absolute", bottom: 5, left: 6, right: 6 }}>
            <div style={{ color: "#fff", fontSize: 6.5, fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,0.6)", lineHeight: 1.15 }}>I Nostri Piatti Migliori</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 4.5, marginTop: 1 }}>Ingredienti freschi • di stagione</div>
          </div>
        </div>
      </Tap>

      {/* Barra "Sfoglia il Menu" con icona filtro a destra */}
      <div style={{ padding: "5px 8px 2px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 6.5, fontWeight: 800, color: t.text }}>Sfoglia il Menu</span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 5, color: t.primary, fontWeight: 700 }}>€</span>
          <div style={{ width: 12, height: 12, borderRadius: 4, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 5.5, color: t.muted }}>⇅</span>
          </div>
        </div>
      </div>

      {/* Griglia prodotti 2 colonne — card bianche, bordi molto arrotondati, immagine grande */}
      <div style={{ padding: "3px 8px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {c.items.map((it, i) => (
          <Tap key={i}>
            <div style={{ background: t.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${t.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              {/* Immagine con pulsante + sovrapposto */}
              <div style={{ position: "relative", height: 36 }}>
                <img src={it.img} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => { e.target.style.background = t.primary + "10"; }} />
                <div style={{
                  position: "absolute", bottom: -5, right: 5,
                  width: 13, height: 13, borderRadius: 7,
                  background: t.primary, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)", border: "1.5px solid #fff",
                }}>
                  <span style={{ color: "#fff", fontSize: 8, fontWeight: 700, lineHeight: 1, marginTop: -0.5 }}>+</span>
                </div>
              </div>
              {/* Info prodotto */}
              <div style={{ padding: "6px 5px 5px" }}>
                <div style={{ fontSize: 5.5, fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{it.n}</div>
                {it.desc && <div style={{ fontSize: 4, color: t.muted, marginTop: 1.5, lineHeight: 1.3 }}>{it.desc.slice(0, 28)}</div>}
                {/* Riga prezzo + stelline */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 6.5, fontWeight: 900, color: t.primary }}>{it.p}</span>
                  <span style={{ fontSize: 4, color: "#e0a800" }}>★★★★☆</span>
                </div>
              </div>
            </div>
          </Tap>
        ))}
      </div>

      {/* Bottom nav verde scuro con icone e pulsante centrale */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "4px 8px 5px",
        background: t.primary,
        borderRadius: "14px 14px 0 0",
      }}>
        {["🏠", "📋"].map((ic, i) => (
          <Tap key={i}><span style={{ color: i === 0 ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 8, padding: "2px 6px" }}>{ic}</span></Tap>
        ))}
        {/* Pulsante centrale prominente */}
        <Tap>
          <div style={{
            width: 22, height: 22, borderRadius: 11,
            background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            marginTop: -8, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", border: `2px solid ${t.primary}`,
          }}>
            <span style={{ fontSize: 10, color: t.primary, fontWeight: 900, lineHeight: 1 }}>+</span>
          </div>
        </Tap>
        {["🔍", "♡"].map((ic, i) => (
          <Tap key={i}><span style={{ color: "rgba(255,255,255,0.5)", fontSize: 8, padding: "2px 6px" }}>{ic}</span></Tap>
        ))}
      </div>
    </div>
  );
}

// ─── Layout 4: PORTAL IMMERSIVE — Hero fullscreen, logo circolare, testo centrato, "DISCOVER" verticale ──
function LayoutPortalImmersive({ t, c }) {
  return (
    <div style={{ background: "#000", height: "100%", fontFamily: "Georgia, 'Times New Roman', serif", position: "relative", overflow: "hidden" }}>
      {/* Immagine fullscreen di sfondo */}
      <img src={c.hero} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} alt="" />
      {/* Gradient overlay — leggero in alto (rosa/violetto), scuro in basso */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(180,130,170,0.15) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.6) 100%)" }} />

      {/* Header: logo circolare + nome a sinistra, hamburger a destra */}
      <div style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {/* Logo circolare con anello — come Portal */}
          {c.logo ? (
            <img src={c.logo} style={{ width: 22, height: 22, borderRadius: 11, border: "1.5px solid rgba(255,255,255,0.6)", objectFit: "cover" }} alt="" onError={e => e.target.style.display='none'} />
          ) : (
            <div style={{ width: 22, height: 22, borderRadius: 11, border: "1.5px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)" }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, border: "1px solid rgba(255,255,255,0.7)", background: "transparent" }} />
            </div>
          )}
          <span style={{ color: "#fff", fontSize: 7, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase" }}>{c.name.split(' ')[0]}</span>
        </div>
        {/* Hamburger 3 linee */}
        <Tap>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: 3 }}>
            <div style={{ width: 14, height: 1.2, background: "rgba(255,255,255,0.8)", borderRadius: 1 }} />
            <div style={{ width: 14, height: 1.2, background: "rgba(255,255,255,0.8)", borderRadius: 1 }} />
            <div style={{ width: 14, height: 1.2, background: "rgba(255,255,255,0.8)", borderRadius: 1 }} />
          </div>
        </Tap>
      </div>

      {/* Contenuto centrale — titolo grande serif */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 5, textAlign: "center", padding: "0 12px" }}>
        {/* Sottotitolo spaziato sopra il titolo */}
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 4, letterSpacing: 4, textTransform: "uppercase", marginBottom: 4 }}>{c.name.split(' ')[0]}</div>
        {/* Titolo grande serif — 2 righe come "Nature Powered" */}
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 400, lineHeight: 1.1, fontStyle: "italic" }}>
          {c.items[0]?.n || "Nature"}
        </div>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 400, lineHeight: 1.1, fontStyle: "italic", marginTop: 1 }}>
          {c.items[1]?.n || "Powered"}
        </div>
        {/* Sottotitolo elegante */}
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 5.5, fontWeight: 300, marginTop: 6, letterSpacing: 0.5 }}>
          {c.items[0]?.desc || "Health and Productivity."}
        </div>
      </div>

      {/* "DISCOVER" verticale in basso a sinistra con linea */}
      <div style={{ position: "absolute", bottom: 12, left: 8, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 4, letterSpacing: 3, textTransform: "uppercase", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Discover</span>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.25)" }} />
      </div>

      {/* Caption in basso a destra — come "Dawn at Skogafoss" */}
      <div style={{ position: "absolute", bottom: 8, right: 8, zIndex: 10 }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 4, fontStyle: "italic" }}>{c.items[2]?.n || c.name}</span>
      </div>
    </div>
  );
}

// ─── Layout 5: LUXURY MINIMAL — Spazi ampi, serif, oro ──
function LayoutLuxuryMinimal({ t, c }) {
  return (
    <div style={{ background: t.bg, height: "100%", fontFamily: "Georgia, serif" }}>
      <div style={{ padding: "12px 10px 4px", textAlign: "center" }}>
        {c.logo ? <img src={c.logo} style={{ height: 22, margin: "0 auto", borderRadius: 3 }} alt="" onError={e => e.target.style.display='none'} /> : (
          <div>
            <div style={{ width: 20, height: 20, borderRadius: 10, border: `1.5px solid ${t.primary}`, margin: "0 auto 3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 8, color: t.primary, fontWeight: 700 }}>{c.name[0]}</span>
            </div>
            <span style={{ color: t.text, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{c.name}</span>
          </div>
        )}
      </div>
      <div style={{ textAlign: "center", marginBottom: 5 }}>
        <div style={{ width: 30, height: 1, background: t.primary + "40", margin: "3px auto" }} />
        <span style={{ fontSize: 4.5, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Cucina d'eccellenza</span>
      </div>
      {/* Single featured image */}
      <Tap>
        <div style={{ margin: "0 10px", borderRadius: 8, overflow: "hidden", height: 50, border: `1px solid ${t.border}` }}>
          <img src={c.hero} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.9)" }} alt="" />
        </div>
      </Tap>
      {/* Elegant list */}
      <div style={{ padding: "6px 10px" }}>
        {c.items.map((it, i) => (
          <Tap key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderBottom: `1px solid ${t.border}` }}>
              <div>
                <div style={{ fontSize: 6.5, fontWeight: 700, color: t.text, letterSpacing: 0.3 }}>{it.n}</div>
                {it.desc && <div style={{ fontSize: 4, color: t.muted, fontStyle: "italic", marginTop: 1 }}>{it.desc}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <div style={{ width: 20, height: 1, background: t.primary + "20" }} />
                <span style={{ fontSize: 6, fontWeight: 700, color: t.primary }}>{it.p}</span>
              </div>
            </div>
          </Tap>
        ))}
      </div>
      <BottomBar t={t} />
    </div>
  );
}

function BottomBar({ t }) {
  const icons = ["🏠", "📋", "🔍", "♡"];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "4px 6px", background: t.card, borderTop: `1px solid ${t.border}` }}>
      {icons.map((ic, i) => (
        <Tap key={i}><span style={{ color: i === 0 ? t.primary : t.muted, fontSize: 7, padding: "2px 6px" }}>{ic}</span></Tap>
      ))}
    </div>
  );
}

const LAYOUTS = [LayoutGourmetDark, LayoutClassicCream, LayoutGreenFresh, LayoutPortalImmersive, LayoutLuxuryMinimal];

// ─── Phone Frame ──────────────────────────────────────────
function PhoneFrame({ theme, content, LayoutComp, isCenter, isSelected, onClick }) {
  const W = 165, H = 310;
  return (
    <button onClick={onClick} className="flex-shrink-0 focus:outline-none transition-all duration-300" style={{
      width: W, transform: `scale(${isCenter ? 1.08 : 0.85})`, opacity: isCenter ? 1 : 0.5,
      zIndex: isCenter ? 10 : 1, filter: isCenter ? "none" : "brightness(0.8)",
    }}>
      <div className="relative overflow-hidden transition-shadow duration-300" style={{
        width: W, height: H, borderRadius: 22,
        border: isSelected ? `2.5px solid ${theme.primary}` : `2.5px solid ${theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        boxShadow: isSelected ? `0 0 24px ${theme.primary}50` : isCenter ? "0 8px 30px rgba(0,0,0,0.4)" : "0 2px 10px rgba(0,0,0,0.2)",
      }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 50, height: 12, borderRadius: "0 0 10px 10px", background: theme.dark ? "#000" : "#d1d5db", zIndex: 20 }} />
        <div style={{ position: "absolute", inset: 0, paddingTop: 14, overflow: "hidden" }}>
          <LayoutComp t={theme} c={content} />
        </div>
        {isSelected && (
          <div style={{ position: "absolute", top: 16, right: 6, width: 18, height: 18, borderRadius: 9, background: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
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

  // Se abbiamo colori dal sito web, sovrascriviamo i colori dei temi
  const themesWithSiteColors = THEMES.map(theme => {
    if (websiteAnalysis?.primaryColor) {
      return { ...theme, primary: websiteAnalysis.primaryColor, accent: websiteAnalysis.secondaryColor || theme.accent };
    }
    return theme;
  });

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
      preview: { bg: theme.bg, accent: theme.primary, text: theme.accent, card: theme.card },
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
        {themesWithSiteColors.map((theme, i) => (
          <div key={theme.id} style={{ scrollSnapAlign: "center" }}>
            <PhoneFrame theme={theme} content={content} LayoutComp={LAYOUTS[i]}
              isCenter={i === centerIdx} isSelected={selected?.id === theme.id}
              onClick={() => handleSelect(theme)} />
          </div>
        ))}
        <div className="flex-shrink-0" style={{ width: "calc(50vw - 82px)" }} />
      </div>

      <div className="flex justify-center gap-1.5">
        {themesWithSiteColors.map((t, i) => (
          <div key={i} className="rounded-full transition-all duration-300" style={{
            width: i === centerIdx ? 20 : 5, height: 5,
            background: i === centerIdx ? themesWithSiteColors[centerIdx].primary : "rgba(255,255,255,0.12)",
          }} />
        ))}
      </div>

      <div className="px-4">
        <button onClick={() => onSelect({
          id: "from_scratch", name: "Creazione personalizzata",
          description: websiteAnalysis ? "Basata sul tuo sito web" : "L'AI creerà un'app unica per te",
          primaryColor: websiteAnalysis?.primaryColor || "#C4964A", secondaryColor: websiteAnalysis?.secondaryColor || "#0a0a0a",
          accentColor: websiteAnalysis?.secondaryColor || "#D4A95A", darkMode: true, fontStyle: "serif",
          preview: { bg: "", accent: "#C4964A", text: "#D4A95A", card: "" },
        })} className={`w-full flex items-center gap-3 rounded-2xl border p-3 transition-all active:scale-[0.98] ${
          selected?.id === "from_scratch" ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5" : "border-white/[0.08] border-dashed hover:border-white/20"
        }`}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
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