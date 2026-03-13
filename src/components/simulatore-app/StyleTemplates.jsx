import React, { useState } from "react";
import { Sparkles, Plus } from "lucide-react";

// Prototipi completi di app reali — ognuno è un'app finita con contenuti, immagini e sezioni
const APP_PROTOTYPES = {
  ristorazione: [
    {
      id: "rist_sushi",
      name: "Sakura Sushi",
      category: "Ristorante Giapponese",
      heroImage: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop",
      primaryColor: "#D4A574",
      secondaryColor: "#1a1a1a",
      accentColor: "#E8C9A0",
      darkMode: true,
      fontStyle: "serif",
      screenshots: [
        "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1553621042-f6e147245754?w=300&h=500&fit=crop",
      ],
      description: "Elegante e scuro, accenti dorati. Perfetto per ristoranti gourmet e fine dining.",
      previewItems: ["Sashimi Misto", "Ramen Tonkotsu", "Gyoza", "Matcha Tiramisu"],
    },
    {
      id: "rist_pizza",
      name: "Napoli Express",
      category: "Pizzeria & Delivery",
      heroImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop",
      primaryColor: "#E53935",
      secondaryColor: "#FFFFFF",
      accentColor: "#FF7043",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=500&fit=crop",
      ],
      description: "Rosso e bianco, layout dinamico. Ideale per pizzerie, delivery, fast casual.",
      previewItems: ["Margherita DOP", "Diavola", "Calzone Fritto", "Tiramisù"],
    },
    {
      id: "rist_bio",
      name: "Verde & Crudo",
      category: "Bistrot Bio & Vegan",
      heroImage: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
      primaryColor: "#2E7D32",
      secondaryColor: "#FFF8E1",
      accentColor: "#66BB6A",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=300&h=500&fit=crop",
      ],
      description: "Toni verdi e crema, stile naturale. Bistrot, vegan, farm-to-table.",
      previewItems: ["Buddha Bowl", "Smoothie Verde", "Avocado Toast", "Poke Bowl"],
    },
  ],
  beauty: [
    {
      id: "beauty_glam",
      name: "Glam Studio",
      category: "Salone di Bellezza",
      heroImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop",
      primaryColor: "#E91E63",
      secondaryColor: "#FCE4EC",
      accentColor: "#F48FB1",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=500&fit=crop",
      ],
      description: "Rosa delicato, look femminile e pulito. Centri estetici e parrucchieri.",
      previewItems: ["Taglio & Piega", "Manicure Gel", "Trattamento Viso", "Extension Ciglia"],
    },
    {
      id: "beauty_spa",
      name: "Oasi Wellness",
      category: "Spa & Centro Benessere",
      heroImage: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=400&fit=crop",
      primaryColor: "#CFB991",
      secondaryColor: "#0D0D0D",
      accentColor: "#E8D5B5",
      darkMode: true,
      fontStyle: "serif",
      screenshots: [
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=300&h=500&fit=crop",
      ],
      description: "Nero e oro, lusso premium. Spa, centri benessere esclusivi.",
      previewItems: ["Massaggio Hot Stone", "Percorso Termale", "Facial Luxury", "Scrub Corpo"],
    },
    {
      id: "beauty_barber",
      name: "The Barber Club",
      category: "Barbiere & Grooming",
      heroImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop",
      primaryColor: "#00BCD4",
      secondaryColor: "#E0F7FA",
      accentColor: "#4DD0E1",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=300&h=500&fit=crop",
      ],
      description: "Turchese e bianco, fresco e moderno. Barber shop e centri unisex.",
      previewItems: ["Taglio Classico", "Barba & Baffi", "Trattamento Scalpo", "Rasatura Luxury"],
    },
  ],
  fitness: [
    {
      id: "fit_crossfit",
      name: "Iron Box",
      category: "CrossFit & Functional",
      heroImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop",
      primaryColor: "#AEEA00",
      secondaryColor: "#0a0a0a",
      accentColor: "#C6FF00",
      darkMode: true,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=500&fit=crop",
      ],
      description: "Nero con neon lime. Energia pura per palestre e CrossFit.",
      previewItems: ["WOD del Giorno", "Abbonamento Monthly", "PT 1-to-1", "Open Gym"],
    },
    {
      id: "fit_pt",
      name: "FitPro Training",
      category: "Personal Trainer",
      heroImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop",
      primaryColor: "#FF6D00",
      secondaryColor: "#121212",
      accentColor: "#FF9100",
      darkMode: true,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=500&fit=crop",
      ],
      description: "Arancio e nero, dinamico e potente. Personal trainer, bootcamp.",
      previewItems: ["Scheda Personalizzata", "Sessione PT", "Nutrizione", "Check-up Corpo"],
    },
    {
      id: "fit_yoga",
      name: "Zen Flow",
      category: "Yoga & Pilates",
      heroImage: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=400&fit=crop",
      primaryColor: "#1565C0",
      secondaryColor: "#E3F2FD",
      accentColor: "#42A5F5",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&h=500&fit=crop",
      ],
      description: "Blu e bianco, armonioso. Centri yoga, pilates, meditazione.",
      previewItems: ["Hatha Yoga", "Pilates Reformer", "Meditazione", "Stretching"],
    },
  ],
  ecommerce: [
    {
      id: "ecom_fashion",
      name: "Maison Style",
      category: "Moda & Accessori",
      heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop",
      primaryColor: "#212121",
      secondaryColor: "#FFFFFF",
      accentColor: "#FF4081",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&h=500&fit=crop",
      ],
      description: "Minimalista Apple-style. Bianco e nero con accento rosa. Moda e accessori.",
      previewItems: ["Giacca in Pelle", "Sneakers Limited", "Borsa Tote", "Occhiali da Sole"],
    },
    {
      id: "ecom_marketplace",
      name: "ShopZone",
      category: "Marketplace Generale",
      heroImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
      primaryColor: "#7C4DFF",
      secondaryColor: "#FFFFFF",
      accentColor: "#FF6E40",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=500&fit=crop",
      ],
      description: "Viola e arancio, vivace e dinamico. Marketplace multi-categoria.",
      previewItems: ["Elettronica", "Casa & Design", "Sport", "Beauty"],
    },
    {
      id: "ecom_tech",
      name: "TechVault",
      category: "Elettronica & Tech",
      heroImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop",
      primaryColor: "#00E5FF",
      secondaryColor: "#121212",
      accentColor: "#18FFFF",
      darkMode: true,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=500&fit=crop",
      ],
      description: "Dark premium, accenti cyan. Elettronica, tech, prodotti premium.",
      previewItems: ["AirPods Pro", "Smart Watch", "Speaker BT", "Drone Mini"],
    },
  ],
  _default: [
    {
      id: "def_studio",
      name: "Studio Pro",
      category: "Studio Professionale",
      heroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop",
      primaryColor: "#1565C0",
      secondaryColor: "#FFFFFF",
      accentColor: "#42A5F5",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=300&h=500&fit=crop",
      ],
      description: "Blu professionale, affidabile. Studi professionali, consulenze, agenzie.",
      previewItems: ["Consulenza", "Assistenza", "Formazione", "Analisi"],
    },
    {
      id: "def_creative",
      name: "Creative Agency",
      category: "Agenzia Creativa",
      heroImage: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=400&fit=crop",
      primaryColor: "#BB86FC",
      secondaryColor: "#121212",
      accentColor: "#CF6679",
      darkMode: true,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=500&fit=crop",
      ],
      description: "Scuro con viola, moderno e creativo. Agenzie, startup, tech.",
      previewItems: ["Branding", "Web Design", "Social Media", "Campagne ADV"],
    },
    {
      id: "def_green",
      name: "EcoService",
      category: "Servizi Innovativi",
      heroImage: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600&h=400&fit=crop",
      primaryColor: "#00897B",
      secondaryColor: "#E0F2F1",
      accentColor: "#26A69A",
      darkMode: false,
      fontStyle: "sans-serif",
      screenshots: [
        "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=300&h=500&fit=crop",
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=300&h=500&fit=crop",
      ],
      description: "Turchese e bianco, fresco. Startup e servizi innovativi.",
      previewItems: ["Audit Energetico", "Consulenza Green", "Report ESG", "Formazione"],
    },
  ],
};

// Alias
["servizi", "immobiliare", "salute", "turismo", "educazione", "altro"].forEach(cat => {
  if (!APP_PROTOTYPES[cat]) APP_PROTOTYPES[cat] = APP_PROTOTYPES._default;
});

function PrototypeCard({ proto, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border overflow-hidden transition-all active:scale-[0.98] ${
        isSelected
          ? "border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10"
          : "border-white/[0.08] hover:border-white/20"
      }`}
    >
      {/* Hero image reale */}
      <div className="relative h-[180px] overflow-hidden">
        <img
          src={proto.heroImage}
          alt={proto.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* App name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white/80">
            {proto.category}
          </span>
          <h3 className="text-lg font-black text-white mt-2 leading-tight">{proto.name}</h3>
        </div>

        {/* Color dots */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          <div className="w-5 h-5 rounded-full border-2 border-white/30 shadow-lg" style={{ background: proto.primaryColor }} />
          <div className="w-5 h-5 rounded-full border-2 border-white/30 shadow-lg" style={{ background: proto.accentColor }} />
        </div>

        {isSelected && (
          <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Preview items */}
      <div className="p-3 bg-[#0f0f1a]">
        <p className="text-[10px] text-gray-500 mb-2">{proto.description}</p>
        <div className="flex flex-wrap gap-1">
          {proto.previewItems.map((item, i) => (
            <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/5">
              {item}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function ScratchCard({ isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border overflow-hidden transition-all active:scale-[0.98] ${
        isSelected
          ? "border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10"
          : "border-white/[0.08] border-dashed hover:border-white/20"
      }`}
    >
      <div className="py-8 px-4 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-purple-500/5 to-transparent">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Plus className="w-6 h-6 text-purple-400" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-white">Crea da zero</h3>
          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed max-w-[200px]">
            L'AI genererà un'app unica basata sulla tua descrizione e preferenze
          </p>
        </div>
      </div>
    </button>
  );
}

export default function StyleTemplates({ businessType, websiteAnalysis, selected, onSelect }) {
  const prototypes = APP_PROTOTYPES[businessType] || APP_PROTOTYPES._default;

  // "Da zero" template con colori default o dal sito
  const scratchTemplate = {
    id: "from_scratch",
    name: "Creazione personalizzata",
    description: websiteAnalysis ? `Basata sul tuo sito web (${websiteAnalysis.style || "personalizzata"})` : "L'AI creerà un'app unica per te",
    primaryColor: websiteAnalysis?.primaryColor || "#6366F1",
    secondaryColor: websiteAnalysis?.secondaryColor || "#1a1a2e",
    accentColor: websiteAnalysis?.secondaryColor || "#818CF8",
    darkMode: true,
    fontStyle: "sans-serif",
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-lg font-black text-white">Scegli un prototipo</h2>
        <p className="text-xs text-gray-400 mt-1">Seleziona un'app da personalizzare oppure crea da zero</p>
      </div>

      <div className="space-y-3">
        {prototypes.map(proto => (
          <PrototypeCard
            key={proto.id}
            proto={proto}
            isSelected={selected?.id === proto.id}
            onClick={() => onSelect({
              ...proto,
              // Manteniamo i campi che handleComplete si aspetta
              preview: { bg: "", accent: proto.primaryColor, text: proto.accentColor, card: "" },
            })}
          />
        ))}

        {/* Opzione crea da zero */}
        <ScratchCard
          isSelected={selected?.id === "from_scratch"}
          onClick={() => onSelect(scratchTemplate)}
        />
      </div>
    </div>
  );
}