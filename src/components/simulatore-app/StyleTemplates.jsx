import React from "react";

// 3 template per ogni categoria — ispirati a design reali di alto livello
const TEMPLATES = {
  ristorazione: [
    {
      id: "rist_elegante",
      name: "Elegante & Scuro",
      description: "Sfondo nero, accenti dorati, tipografia raffinata. Perfetto per ristoranti gourmet e fine dining",
      primaryColor: "#D4A574",
      secondaryColor: "#1a1a1a",
      accentColor: "#E8C9A0",
      darkMode: true,
      fontStyle: "serif",
      preview: {
        bg: "linear-gradient(135deg, #0f0f0f 0%, #1a1510 100%)",
        accent: "#D4A574",
        text: "#E8C9A0",
        card: "rgba(212,165,116,0.08)",
      },
    },
    {
      id: "rist_moderno",
      name: "Rosso Moderno",
      description: "Stile delivery/fast casual. Bianco e rosso, foto grandi, layout dinamico con card",
      primaryColor: "#E53935",
      secondaryColor: "#FFFFFF",
      accentColor: "#FF7043",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #FFF5F5 0%, #FFFFFF 100%)",
        accent: "#E53935",
        text: "#1a1a1a",
        card: "rgba(229,57,53,0.06)",
      },
    },
    {
      id: "rist_natura",
      name: "Verde Naturale",
      description: "Toni verdi e crema, stile biologico e naturale. Perfetto per bistrot, vegan, farm-to-table",
      primaryColor: "#2E7D32",
      secondaryColor: "#FFF8E1",
      accentColor: "#66BB6A",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #F1F8E9 0%, #FFF8E1 100%)",
        accent: "#2E7D32",
        text: "#1B5E20",
        card: "rgba(46,125,50,0.06)",
      },
    },
  ],
  beauty: [
    {
      id: "beauty_rosa",
      name: "Rosa Delicato",
      description: "Palette soft rosa e bianco, look pulito e femminile. Per centri estetici e parrucchieri",
      primaryColor: "#E91E63",
      secondaryColor: "#FCE4EC",
      accentColor: "#F48FB1",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #FFF0F3 0%, #FCE4EC 100%)",
        accent: "#E91E63",
        text: "#880E4F",
        card: "rgba(233,30,99,0.06)",
      },
    },
    {
      id: "beauty_lusso",
      name: "Lusso Nero & Oro",
      description: "Sfondo scuro, accenti dorati. Spa di lusso, centri benessere premium",
      primaryColor: "#CFB991",
      secondaryColor: "#0D0D0D",
      accentColor: "#E8D5B5",
      darkMode: true,
      fontStyle: "serif",
      preview: {
        bg: "linear-gradient(135deg, #0D0D0D 0%, #1a1510 100%)",
        accent: "#CFB991",
        text: "#E8D5B5",
        card: "rgba(207,185,145,0.08)",
      },
    },
    {
      id: "beauty_acqua",
      name: "Acquamarina Fresco",
      description: "Turchese e bianco, fresco e moderno. Barber shop, centri unisex",
      primaryColor: "#00BCD4",
      secondaryColor: "#E0F7FA",
      accentColor: "#4DD0E1",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #E0F7FA 0%, #FFFFFF 100%)",
        accent: "#00BCD4",
        text: "#006064",
        card: "rgba(0,188,212,0.06)",
      },
    },
  ],
  fitness: [
    {
      id: "fit_neon",
      name: "Neon & Nero",
      description: "Nero profondo con accenti lime neon. Energia pura per palestre e CrossFit",
      primaryColor: "#AEEA00",
      secondaryColor: "#0a0a0a",
      accentColor: "#C6FF00",
      darkMode: true,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #0a0a0a 0%, #111111 100%)",
        accent: "#AEEA00",
        text: "#C6FF00",
        card: "rgba(174,234,0,0.06)",
      },
    },
    {
      id: "fit_arancio",
      name: "Arancio Energia",
      description: "Arancio e nero, dinamico e potente. Personal trainer, bootcamp",
      primaryColor: "#FF6D00",
      secondaryColor: "#121212",
      accentColor: "#FF9100",
      darkMode: true,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #121212 0%, #1a1208 100%)",
        accent: "#FF6D00",
        text: "#FF9100",
        card: "rgba(255,109,0,0.08)",
      },
    },
    {
      id: "fit_blu",
      name: "Blu Sportivo",
      description: "Blu e bianco, pulito e professionale. Centri sportivi, piscine, yoga",
      primaryColor: "#1565C0",
      secondaryColor: "#E3F2FD",
      accentColor: "#42A5F5",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%)",
        accent: "#1565C0",
        text: "#0D47A1",
        card: "rgba(21,101,192,0.06)",
      },
    },
  ],
  ecommerce: [
    {
      id: "ecom_minimal",
      name: "Minimalista Bianco",
      description: "Design pulito Apple-style. Bianco e nero con accento colore. Moda e accessori",
      primaryColor: "#212121",
      secondaryColor: "#FFFFFF",
      accentColor: "#FF4081",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #FAFAFA 0%, #FFFFFF 100%)",
        accent: "#212121",
        text: "#212121",
        card: "rgba(33,33,33,0.04)",
      },
    },
    {
      id: "ecom_vivace",
      name: "Vivace & Colorato",
      description: "Viola e arancio, layout dinamico con card colorate. Marketplace",
      primaryColor: "#7C4DFF",
      secondaryColor: "#FFFFFF",
      accentColor: "#FF6E40",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #F3E5F5 0%, #FFFFFF 100%)",
        accent: "#7C4DFF",
        text: "#4A148C",
        card: "rgba(124,77,255,0.06)",
      },
    },
    {
      id: "ecom_dark",
      name: "Dark Premium",
      description: "Sfondo scuro, layout ricco. Elettronica, tech, prodotti premium",
      primaryColor: "#00E5FF",
      secondaryColor: "#121212",
      accentColor: "#18FFFF",
      darkMode: true,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #0a0a14 0%, #121220 100%)",
        accent: "#00E5FF",
        text: "#18FFFF",
        card: "rgba(0,229,255,0.06)",
      },
    },
  ],
  _default: [
    {
      id: "def_professionale",
      name: "Professionale Blu",
      description: "Classico e affidabile. Studi professionali, consulenze, agenzie",
      primaryColor: "#1565C0",
      secondaryColor: "#FFFFFF",
      accentColor: "#42A5F5",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #E8EAF6 0%, #FFFFFF 100%)",
        accent: "#1565C0",
        text: "#0D47A1",
        card: "rgba(21,101,192,0.06)",
      },
    },
    {
      id: "def_scuro",
      name: "Scuro Elegante",
      description: "Sfondo scuro con accenti viola. Premium e moderno",
      primaryColor: "#BB86FC",
      secondaryColor: "#121212",
      accentColor: "#CF6679",
      darkMode: true,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #121212 0%, #1a1a2e 100%)",
        accent: "#BB86FC",
        text: "#CF6679",
        card: "rgba(187,134,252,0.08)",
      },
    },
    {
      id: "def_fresco",
      name: "Fresco Turchese",
      description: "Leggero e moderno, turchese e bianco. Startup e servizi innovativi",
      primaryColor: "#00897B",
      secondaryColor: "#E0F2F1",
      accentColor: "#26A69A",
      darkMode: false,
      fontStyle: "sans-serif",
      preview: {
        bg: "linear-gradient(135deg, #E0F2F1 0%, #FFFFFF 100%)",
        accent: "#00897B",
        text: "#004D40",
        card: "rgba(0,137,123,0.06)",
      },
    },
  ],
};

// Alias per categorie senza template specifici
["servizi", "immobiliare", "salute", "turismo", "educazione", "altro"].forEach(cat => {
  if (!TEMPLATES[cat]) TEMPLATES[cat] = TEMPLATES._default;
});

function TemplatePreview({ template, isSelected, onClick }) {
  const p = template.preview;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border overflow-hidden transition-all active:scale-[0.98] ${
        isSelected
          ? "border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10"
          : "border-white/[0.08] hover:border-white/20"
      }`}
    >
      {/* Mini mockup */}
      <div className="h-[200px] relative overflow-hidden" style={{ background: p.bg }}>
        {/* Status bar */}
        <div className="h-5 flex items-center justify-between px-3" style={{ background: template.darkMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)" }}>
          <span style={{ color: p.text, fontSize: 7, opacity: 0.5 }}>9:41</span>
          <div className="flex gap-1">
            <div className="w-2 h-1.5 rounded-sm" style={{ background: p.text, opacity: 0.3 }} />
            <div className="w-2 h-1.5 rounded-sm" style={{ background: p.text, opacity: 0.3 }} />
          </div>
        </div>

        {/* Header */}
        <div className="px-3 pt-3 pb-2">
          <div className="w-16 h-1.5 rounded-full mb-1" style={{ background: p.accent }} />
          <div className="w-24 h-2.5 rounded-full" style={{ background: p.text, opacity: 0.7 }} />
          <div className="w-32 h-1.5 rounded-full mt-1" style={{ background: p.text, opacity: 0.3 }} />
        </div>

        {/* Cards */}
        <div className="px-3 space-y-2 mt-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex gap-2 rounded-lg p-2" style={{ background: p.card, border: `1px solid ${p.accent}15` }}>
              <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: `${p.accent}20` }} />
              <div className="flex-1 space-y-1 pt-1">
                <div className="h-1.5 rounded-full w-16" style={{ background: p.text, opacity: 0.6 }} />
                <div className="h-1 rounded-full w-12" style={{ background: p.text, opacity: 0.25 }} />
              </div>
              <div className="h-4 w-8 rounded-full mt-1" style={{ background: `${p.accent}30` }} />
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-around px-4" style={{ background: template.darkMode ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)", borderTop: `1px solid ${p.accent}15` }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: i === 0 ? p.accent : `${p.text}30` }} />
              <div className="w-5 h-0.5 rounded-full" style={{ background: i === 0 ? p.accent : `${p.text}20` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-[#0f0f1a]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 rounded-full" style={{ background: template.primaryColor }} />
          <div className="w-3 h-3 rounded-full" style={{ background: template.accentColor }} />
          <span className="text-xs font-bold text-white ml-1">{template.name}</span>
        </div>
        <p className="text-[10px] text-gray-500 leading-tight">{template.description}</p>
      </div>
    </button>
  );
}

export default function StyleTemplates({ businessType, websiteAnalysis, selected, onSelect }) {
  const templates = TEMPLATES[businessType] || TEMPLATES._default;

  // Se c'è analisi sito, aggiungi un template "Dal tuo sito" come primo
  const allTemplates = [];
  if (websiteAnalysis?.primaryColor) {
    allTemplates.push({
      id: "from_website",
      name: "Dal tuo sito web",
      description: `Colori e stile estratti dal tuo sito. ${websiteAnalysis.style || ""}`,
      primaryColor: websiteAnalysis.primaryColor || "#6366F1",
      secondaryColor: websiteAnalysis.secondaryColor || "#1a1a2e",
      accentColor: websiteAnalysis.secondaryColor || websiteAnalysis.primaryColor || "#818CF8",
      darkMode: true,
      fontStyle: "sans-serif",
      preview: {
        bg: `linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)`,
        accent: websiteAnalysis.primaryColor || "#6366F1",
        text: websiteAnalysis.secondaryColor || "#818CF8",
        card: `${websiteAnalysis.primaryColor || "#6366F1"}10`,
      },
    });
  }
  allTemplates.push(...templates);

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-lg font-black text-white">Scegli lo stile</h2>
        <p className="text-xs text-gray-400 mt-1">Seleziona il template che preferisci — potrai personalizzarlo dopo</p>
      </div>
      <div className="space-y-3">
        {allTemplates.map(t => (
          <TemplatePreview
            key={t.id}
            template={t}
            isSelected={selected?.id === t.id}
            onClick={() => onSelect(t)}
          />
        ))}
      </div>
    </div>
  );
}