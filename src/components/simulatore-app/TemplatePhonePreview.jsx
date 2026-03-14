import React from "react";

// ═══════════════════════════════════════════════════════════
// Preview phone mockup per ogni layout style dei template
// Supporta: immersive, quick-actions, cards, dashboard,
//           minimal, offers, default (lista standard)
// ═══════════════════════════════════════════════════════════

function ImmersiveLayout({ template, p }) {
  return (
    <div className="w-full h-full relative" style={{ fontFamily: template.fontStyle === "serif" ? "Georgia, serif" : "system-ui, sans-serif" }}>
      <img src={p.heroImage || template.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 40%, rgba(0,0,0,0.65))" }} />
      <div className="absolute top-0 left-0 right-0 px-3 pt-7 pb-2 flex items-center justify-between z-10">
        <div className="w-4 h-4 rounded-full border-[1.5px]" style={{ borderColor: "rgba(255,255,255,0.6)" }} />
        <span className="text-[8px] font-bold tracking-[0.12em] text-white/80 uppercase">Brand</span>
        <div className="space-y-[1.5px]">
          <div className="w-3.5 h-[1px] bg-white/70 rounded" />
          <div className="w-3.5 h-[1px] bg-white/70 rounded" />
          <div className="w-3.5 h-[1px] bg-white/70 rounded" />
        </div>
      </div>
      <div className="absolute bottom-5 left-0 right-0 text-center z-10 px-3">
        <p className="text-[6px] tracking-[0.15em] text-white/50 uppercase mb-0.5">Benvenuto</p>
        <p className="text-[14px] font-bold text-white leading-tight" style={{ fontFamily: template.fontStyle === "serif" ? "Georgia, serif" : "system-ui" }}>{template.name}</p>
        <p className="text-[8px] text-white/60 mt-0.5">{template.target?.split(",")[0]}</p>
      </div>
    </div>
  );
}

function QuickActionsLayout({ template, p }) {
  const headerIsDark = p.headerText === "#ffffff";
  return (
    <div className="w-full h-full flex flex-col" style={{ background: p.bodyBg, fontFamily: "system-ui, sans-serif" }}>
      <div className="px-3 pt-7 pb-2" style={{ background: p.headerBg, borderRadius: headerIsDark ? "0 0 10px 10px" : undefined }}>
        <p className="text-[10px] font-bold" style={{ color: p.headerText }}>Benvenuto! 👋</p>
        <p className="text-[7px] mt-0.5" style={{ color: p.headerText, opacity: 0.7 }}>Cosa vuoi fare?</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 px-3 mt-3">
        {["📋 Menu", "📅 Prenota", "🛒 Ordina", "📍 Info"].map((action, i) => (
          <div key={i} className="p-2 rounded-xl text-center" style={{ background: p.cardBg, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <p className="text-[10px]">{action.split(" ")[0]}</p>
            <p className="text-[7px] font-semibold mt-0.5" style={{ color: p.accent }}>{action.split(" ")[1]}</p>
          </div>
        ))}
      </div>
      <div className="px-3 mt-3">
        <p className="text-[8px] font-bold mb-1.5" style={{ color: p.headerBg === p.bodyBg ? p.accent : p.headerText }}>Popolari</p>
        {template.previewItems.slice(0, 2).map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-1.5 mb-1 rounded-lg" style={{ background: p.cardBg, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden bg-gray-100">
              <img src={template.heroImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${i * 40}% center` }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold truncate" style={{ color: headerIsDark ? "#333" : p.headerText }}>{item}</p>
              <p className="text-[6px] text-gray-400">Descrizione</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-around py-2 mt-auto border-t" style={{ borderColor: "rgba(0,0,0,0.05)", background: p.cardBg || "#fff" }}>
        {["🏠", "📋", "📍", "👤"].map((icon, i) => (
          <div key={i} className="text-[11px]" style={{ opacity: i === 0 ? 1 : 0.4 }}>{icon}</div>
        ))}
      </div>
    </div>
  );
}

function CardsLayout({ template, p }) {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: p.bodyBg, fontFamily: template.fontStyle === "serif" ? "Georgia, serif" : "system-ui, sans-serif" }}>
      <div className="px-3 pt-7 pb-2 flex items-center justify-between" style={{ background: p.headerBg || p.bodyBg }}>
        <span className="text-[9px] font-bold" style={{ color: p.headerText }}>{template.name}</span>
        <div className="w-4 h-4 rounded-full" style={{ background: p.accent, opacity: 0.3 }} />
      </div>
      <div className="px-3 mt-2 space-y-2 flex-1">
        {template.previewItems.map((item, i) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ background: p.cardBg, boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}>
            <div className="h-16 overflow-hidden">
              <img src={template.heroImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${i * 25}% center` }} />
            </div>
            <div className="p-2">
              <p className="text-[8px] font-bold" style={{ color: p.headerText }}>{item}</p>
              <p className="text-[6px] mt-0.5" style={{ color: p.accent }}>Scopri di più →</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-around py-2 mt-auto border-t" style={{ borderColor: `${p.headerText}10` }}>
        {["🏠", "🔍", "❤️", "👤"].map((icon, i) => (
          <div key={i} className="text-[11px]" style={{ opacity: i === 0 ? 1 : 0.4 }}>{icon}</div>
        ))}
      </div>
    </div>
  );
}

function DashboardLayout({ template, p }) {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: p.bodyBg, fontFamily: "system-ui, sans-serif" }}>
      <div className="px-3 pt-7 pb-2" style={{ background: p.headerBg || p.bodyBg }}>
        <p className="text-[10px] font-bold" style={{ color: p.headerText }}>Dashboard</p>
        <p className="text-[7px] mt-0.5" style={{ color: p.headerText, opacity: 0.5 }}>Panoramica</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 px-3 mt-2">
        {["128", "42", "€2.4k", "96%"].map((val, i) => (
          <div key={i} className="p-2 rounded-lg" style={{ background: p.cardBg, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <p className="text-[11px] font-bold" style={{ color: p.accent }}>{val}</p>
            <p className="text-[6px] text-gray-400">{["Clienti", "Prenotazioni", "Ricavi", "Soddisfazione"][i]}</p>
          </div>
        ))}
      </div>
      <div className="px-3 mt-3">
        <p className="text-[7px] font-bold mb-1" style={{ color: p.headerText }}>Recenti</p>
        {template.previewItems.slice(0, 2).map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: `${p.headerText}08` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: p.accent }} />
            <p className="text-[7px] flex-1" style={{ color: p.headerText }}>{item}</p>
            <p className="text-[6px] text-gray-400">Oggi</p>
          </div>
        ))}
      </div>
      <div className="flex justify-around py-2 mt-auto border-t" style={{ borderColor: `${p.headerText}10` }}>
        {["📊", "📋", "💬", "⚙️"].map((icon, i) => (
          <div key={i} className="text-[11px]" style={{ opacity: i === 0 ? 1 : 0.4 }}>{icon}</div>
        ))}
      </div>
    </div>
  );
}

function MinimalLayout({ template, p }) {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: p.bodyBg, fontFamily: template.fontStyle === "serif" ? "Georgia, serif" : "system-ui, sans-serif" }}>
      <div className="px-4 pt-9 pb-3">
        <p className="text-[12px] font-bold" style={{ color: p.headerText }}>{template.name}</p>
        <p className="text-[7px] mt-1" style={{ color: p.headerText, opacity: 0.4 }}>{template.target?.split(",")[0]}</p>
      </div>
      <div className="mx-3 rounded-xl overflow-hidden h-24">
        <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="px-4 mt-4 space-y-3 flex-1">
        {template.previewItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: `${p.headerText}08` }}>
            <div>
              <p className="text-[8px] font-semibold" style={{ color: p.headerText }}>{item}</p>
              <p className="text-[6px]" style={{ color: p.headerText, opacity: 0.4 }}>Dettagli</p>
            </div>
            <span className="text-[7px]" style={{ color: p.accent }}>→</span>
          </div>
        ))}
      </div>
      <div className="flex justify-around py-2 mt-auto border-t" style={{ borderColor: `${p.headerText}10` }}>
        {["🏠", "📋", "📍", "👤"].map((icon, i) => (
          <div key={i} className="text-[11px]" style={{ opacity: i === 0 ? 1 : 0.4 }}>{icon}</div>
        ))}
      </div>
    </div>
  );
}

function OffersLayout({ template, p }) {
  return (
    <div className="w-full h-full flex flex-col" style={{ background: p.bodyBg, fontFamily: "system-ui, sans-serif" }}>
      <div className="px-3 pt-7 pb-1" style={{ background: p.headerBg || p.bodyBg }}>
        <p className="text-[6px] text-gray-400">‹ Scopri</p>
        <p className="text-[11px] font-black mt-0.5" style={{ color: p.headerText }}>Offerte</p>
      </div>
      <div className="px-3 mt-2 space-y-1.5 flex-1 overflow-hidden">
        {template.previewItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-1.5 rounded-xl" style={{ background: p.cardBg, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden">
              <img src={template.heroImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${i * 30}% center` }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold truncate" style={{ color: p.headerText }}>{item}</p>
              <p className="text-[5px] text-gray-400">Dettaglio offerta</p>
              <div className="mt-0.5 px-1.5 py-0.5 rounded-full border text-[5px] font-semibold inline-block" style={{ borderColor: p.accent, color: p.accent }}>
                Scopri
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-around py-2 mt-auto border-t border-gray-100" style={{ background: p.cardBg || "#fff" }}>
        {["🏠", "📋", "📍", "👤"].map((icon, i) => (
          <div key={i} className="text-[11px]" style={{ opacity: i === 0 ? 1 : 0.4 }}>{icon}</div>
        ))}
      </div>
    </div>
  );
}

// Fallback — layout lista classico
function DefaultLayout({ template, p }) {
  const headerIsDark = p.headerBg && p.headerBg !== p.bodyBg && p.headerText === "#ffffff";
  return (
    <div className="w-full h-full flex flex-col" style={{ background: p.bodyBg, fontFamily: template.fontStyle === "serif" ? "Georgia, serif" : "system-ui, sans-serif" }}>
      <div className="px-3 pt-7 pb-2 flex items-center justify-between" style={{ background: p.headerBg, borderRadius: headerIsDark ? "0 0 10px 10px" : undefined }}>
        <div>
          <div className="w-5 h-[1.5px] mb-1 rounded" style={{ background: p.headerText }} />
          <div className="w-3 h-[1.5px] rounded" style={{ background: p.headerText, opacity: 0.4 }} />
        </div>
        <span className="text-[9px] font-bold" style={{ color: p.headerText }}>Menu</span>
        <div className="w-3.5 h-3.5 rounded-full" style={{ background: headerIsDark ? "rgba(255,255,255,0.2)" : p.accent, opacity: 0.5 }} />
      </div>
      <div className="mx-3 mt-2 rounded-xl overflow-hidden h-24 relative">
        <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      <div className="flex gap-1 px-3 mt-2">
        {["Cat 1", "Cat 2", "Cat 3"].map((cat, i) => (
          <div key={cat} className="px-1.5 py-0.5 rounded-full text-[6px] font-semibold" style={{
            background: i === 0 ? p.accent : "transparent",
            color: i === 0 ? "#fff" : p.headerText,
            border: i === 0 ? "none" : `1px solid ${p.headerText}25`,
          }}>{cat}</div>
        ))}
      </div>
      <div className="px-3 mt-2 space-y-1.5 flex-1">
        {template.previewItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: p.cardBg, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="w-8 h-8 rounded-md flex-shrink-0 overflow-hidden">
              <img src={template.heroImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${i * 30}% center` }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[7px] font-bold truncate" style={{ color: p.headerText }}>{item}</p>
              <p className="text-[5px] opacity-40" style={{ color: p.headerText }}>Descrizione</p>
            </div>
            <span className="text-[7px] font-bold" style={{ color: p.accent }}>€{(8 + i * 4)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-around py-1.5 mt-auto border-t" style={{ borderColor: `${p.headerText}10`, background: p.headerBg }}>
        {["🏠", "📋", "📍", "👤"].map((icon, i) => (
          <div key={i} className="text-[10px] opacity-50">{icon}</div>
        ))}
      </div>
    </div>
  );
}

const LAYOUT_COMPONENTS = {
  "immersive": ImmersiveLayout,
  "quick-actions": QuickActionsLayout,
  "cards": CardsLayout,
  "dashboard": DashboardLayout,
  "minimal": MinimalLayout,
  "offers": OffersLayout,
};

export default function TemplatePhonePreview({ template }) {
  const p = template.preview;
  const layoutStyle = p.layoutStyle || "default";
  const LayoutComponent = LAYOUT_COMPONENTS[layoutStyle] || DefaultLayout;
  return <LayoutComponent template={template} p={p} />;
}