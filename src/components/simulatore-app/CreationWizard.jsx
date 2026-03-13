import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Sparkles, Globe, Loader2, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StyleTemplates from "./StyleTemplates";

const BUSINESS_TYPES = [
  { id: "ristorazione", label: "Ristorazione", emoji: "🍽️", desc: "Ristoranti, bar, pizzerie, pasticcerie" },
  { id: "beauty", label: "Beauty & Wellness", emoji: "💆", desc: "Estetica, parrucchieri, spa, centri benessere" },
  { id: "fitness", label: "Fitness & Sport", emoji: "💪", desc: "Palestre, personal trainer, centri sportivi" },
  { id: "ecommerce", label: "E-commerce", emoji: "🛍️", desc: "Vendita online, abbigliamento, accessori" },
  { id: "servizi", label: "Servizi professionali", emoji: "💼", desc: "Consulenze, studi, agenzie" },
  { id: "immobiliare", label: "Immobiliare", emoji: "🏠", desc: "Agenzie, costruttori, interior design" },
  { id: "salute", label: "Salute & Medico", emoji: "🏥", desc: "Cliniche, studi medici, farmacie" },
  { id: "turismo", label: "Turismo & Ospitalità", emoji: "✈️", desc: "Hotel, B&B, tour operator, guide" },
  { id: "educazione", label: "Formazione", emoji: "📚", desc: "Scuole, corsi, coaching, tutoring" },
  { id: "altro", label: "Altro", emoji: "✨", desc: "Qualsiasi altro tipo di attività" },
];

const FEATURES_BY_CATEGORY = {
  ristorazione: [
    { id: "menu", label: "Menu digitale" },
    { id: "prenotazioni", label: "Prenotazione tavolo" },
    { id: "ordini", label: "Ordini al tavolo / Asporto" },
    { id: "galleria", label: "Galleria piatti" },
    { id: "recensioni", label: "Recensioni clienti" },
    { id: "contatti", label: "Contatti & Mappa" },
    { id: "offerte", label: "Offerte & Promozioni" },
  ],
  beauty: [
    { id: "servizi", label: "Listino servizi" },
    { id: "prenotazioni", label: "Prenotazione appuntamento" },
    { id: "galleria", label: "Portfolio lavori" },
    { id: "team", label: "Team & Professionisti" },
    { id: "recensioni", label: "Recensioni clienti" },
    { id: "contatti", label: "Contatti & Mappa" },
    { id: "offerte", label: "Promozioni" },
  ],
  fitness: [
    { id: "corsi", label: "Corsi & Orari" },
    { id: "prenotazioni", label: "Prenota lezione" },
    { id: "abbonamenti", label: "Piani abbonamento" },
    { id: "team", label: "Trainer & Staff" },
    { id: "galleria", label: "Galleria" },
    { id: "contatti", label: "Contatti & Mappa" },
    { id: "stats", label: "Statistiche & Risultati" },
  ],
  ecommerce: [
    { id: "catalogo", label: "Catalogo prodotti" },
    { id: "carrello", label: "Carrello & Checkout" },
    { id: "offerte", label: "Offerte & Sconti" },
    { id: "recensioni", label: "Recensioni" },
    { id: "categorie", label: "Categorie" },
    { id: "contatti", label: "Contatti & Assistenza" },
    { id: "wishlist", label: "Wishlist / Preferiti" },
  ],
  _default: [
    { id: "servizi", label: "Servizi / Prodotti" },
    { id: "prenotazioni", label: "Prenotazioni" },
    { id: "galleria", label: "Galleria" },
    { id: "contatti", label: "Contatti & Mappa" },
    { id: "recensioni", label: "Recensioni" },
    { id: "team", label: "Team" },
    { id: "offerte", label: "Promozioni" },
  ],
};

const TECH_FEATURES = [
  { id: "pagamenti", label: "Pagamenti online", icon: "💳" },
  { id: "notifiche", label: "Notifiche push", icon: "🔔" },
  { id: "login", label: "Login utenti", icon: "🔐" },
  { id: "loyalty", label: "Fidelity / Punti", icon: "⭐" },
];

export default function CreationWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    businessType: "",
    businessName: "",
    description: "",
    websiteUrl: "",
    websiteAnalysis: null,
    selectedTemplate: null,
    features: [],
    techFeatures: [],
  });
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisPhase, setAnalysisPhase] = useState("");
  const progressInterval = useRef(null);

  const totalSteps = 5; // categoria, info+sito, template, funzionalità, conferma

  // Barra finta di progresso
  const startFakeProgress = () => {
    setAnalysisProgress(0);
    setAnalysisPhase("Connessione al sito web...");
    const phases = [
      { at: 10, text: "Analisi struttura del sito..." },
      { at: 25, text: "Estrazione colori e logo..." },
      { at: 40, text: "Lettura contenuti e immagini..." },
      { at: 55, text: "Ricerca menu e listini PDF..." },
      { at: 70, text: "Analisi prodotti e servizi..." },
      { at: 85, text: "Elaborazione dati finali..." },
    ];
    let current = 0;
    progressInterval.current = setInterval(() => {
      current += Math.random() * 3 + 0.5;
      if (current > 92) current = 92;
      setAnalysisProgress(current);
      const phase = [...phases].reverse().find(p => current >= p.at);
      if (phase) setAnalysisPhase(phase.text);
    }, 300);
  };

  const stopFakeProgress = () => {
    clearInterval(progressInterval.current);
    setAnalysisProgress(100);
    setAnalysisPhase("Completato!");
    setTimeout(() => setAnalyzingWebsite(false), 600);
  };

  const analyzeWebsite = async () => {
    if (!data.websiteUrl.trim()) return;
    setAnalyzingWebsite(true);
    startFakeProgress();
    try {
      // Step 1: Analisi sito + ricerca PDF menu
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analizza in dettaglio questo sito web: ${data.websiteUrl}

Estrai TUTTE queste informazioni:
1. Nome dell'attività
2. Colore primario (hex esatto dal sito)
3. Colore secondario (hex esatto dal sito)
4. Stile grafico generale (moderno, classico, minimalista, lusso, rustico, ecc.)
5. Descrizione dell'attività (cosa fa, cosa offre)
6. Tipo di attività (ristorazione, beauty, fitness, ecommerce, servizi, ecc.)
7. Le SEZIONI del sito nell'ORDINE ESATTO in cui appaiono (es: hero, menu, chi siamo, gallery, recensioni, contatti...)
8. I CONTENUTI principali: nomi di piatti/servizi/prodotti, prezzi, categorie, descrizioni che trovi nel sito
9. URL del logo se visibile (URL COMPLETO, non relativo)
10. Orari di apertura, indirizzo, telefono se presenti
11. TUTTE le URL delle immagini presenti nel sito (hero, prodotti, gallery, banner, ecc.). Estrai gli URL completi assoluti delle immagini (jpg, png, webp). Per ogni immagine indica a cosa si riferisce.
12. CERCA link a file PDF nel sito (menu PDF, catalogo PDF, listino prezzi PDF). Se trovi un link a un PDF, riportalo nel campo pdfMenuUrl.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nome attività" },
            primaryColor: { type: "string", description: "Colore primario hex" },
            secondaryColor: { type: "string", description: "Colore secondario hex" },
            style: { type: "string", description: "Stile grafico" },
            description: { type: "string", description: "Descrizione attività" },
            businessType: { type: "string", description: "Tipo attività" },
            sectionsOrder: { type: "array", items: { type: "string" }, description: "Ordine sezioni del sito" },
            menuItems: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, price: { type: "string" }, category: { type: "string" }, image_url: { type: "string" } } }, description: "Piatti/servizi/prodotti trovati" },
            categories: { type: "array", items: { type: "string" }, description: "Categorie" },
            siteImages: { type: "array", items: { type: "object", properties: { url: { type: "string" }, context: { type: "string" } } }, description: "Immagini dal sito" },
            address: { type: "string" },
            phone: { type: "string" },
            hours: { type: "string" },
            logoUrl: { type: "string", description: "URL completo assoluto del logo" },
            pdfMenuUrl: { type: "string", description: "URL di un PDF menu/catalogo/listino trovato nel sito (vuoto se non trovato)" },
          },
        },
        model: "gemini_3_flash",
      });

      let finalResult = { ...result };

      // Step 2: Se c'è un PDF menu, analizzalo con ExtractDataFromUploadedFile
      if (result.pdfMenuUrl && result.pdfMenuUrl.trim()) {
        try {
          console.log("[Wizard] PDF menu trovato:", result.pdfMenuUrl);
          const pdfExtraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: result.pdfMenuUrl,
            json_schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nome piatto/servizio/prodotto" },
                      description: { type: "string", description: "Descrizione" },
                      price: { type: "string", description: "Prezzo (es. € 12.00)" },
                      category: { type: "string", description: "Categoria (es. Antipasti, Primi, Secondi, Dolci, Bevande)" },
                    },
                  },
                },
              },
            },
          });
          if (pdfExtraction?.status === "success" && pdfExtraction.output?.items?.length > 0) {
            console.log("[Wizard] Estratti", pdfExtraction.output.items.length, "items dal PDF");
            // Unisci: items dal PDF hanno priorità se il sito ne aveva pochi
            const pdfItems = pdfExtraction.output.items.map(it => ({
              name: it.name || "",
              description: it.description || "",
              price: it.price || "",
              category: it.category || "",
              image_url: "",
            }));
            if (!finalResult.menuItems || finalResult.menuItems.length < pdfItems.length) {
              finalResult.menuItems = pdfItems;
            } else {
              // Aggiungi quelli dal PDF non già presenti
              const existingNames = new Set((finalResult.menuItems || []).map(i => i.name?.toLowerCase()));
              pdfItems.forEach(pi => {
                if (!existingNames.has(pi.name?.toLowerCase())) {
                  finalResult.menuItems.push(pi);
                }
              });
            }
            // Estrai categorie dal PDF
            const pdfCategories = [...new Set(pdfItems.map(i => i.category).filter(Boolean))];
            if (pdfCategories.length > 0) {
              finalResult.categories = [...new Set([...(finalResult.categories || []), ...pdfCategories])];
            }
            finalResult.pdfAnalyzed = true;
            finalResult.pdfItemsCount = pdfItems.length;
          }
        } catch (pdfErr) {
          console.warn("[Wizard] Errore analisi PDF:", pdfErr);
        }
      }

      setData(prev => ({
        ...prev,
        websiteAnalysis: finalResult,
        businessName: prev.businessName || finalResult.name || "",
        description: prev.description || finalResult.description || "",
      }));
    } catch (err) {
      console.error("Errore analisi sito:", err);
    } finally {
      stopFakeProgress();
    }
  };

  const features = FEATURES_BY_CATEGORY[data.businessType] || FEATURES_BY_CATEGORY._default;

  const toggleFeature = (id) => {
    setData(prev => ({
      ...prev,
      features: prev.features.includes(id) ? prev.features.filter(f => f !== id) : [...prev.features, id],
    }));
  };

  const toggleTechFeature = (id) => {
    setData(prev => ({
      ...prev,
      techFeatures: prev.techFeatures.includes(id) ? prev.techFeatures.filter(f => f !== id) : [...prev.techFeatures, id],
    }));
  };

  const canProceed = () => {
    if (step === 0) return !!data.businessType;
    if (step === 1) return !!data.businessName.trim();
    if (step === 2) return !!data.selectedTemplate;
    return true;
  };

  const handleComplete = () => {
    const template = data.selectedTemplate;
    const wa = data.websiteAnalysis;

    let siteInfo = "";
    if (wa) {
      siteInfo = `\n--- DATI ESTRATTI DAL SITO WEB ---\n`;
      siteInfo += `Colori dal sito: primario ${wa.primaryColor}, secondario ${wa.secondaryColor}. Stile: ${wa.style}.\n`;
      if (wa.sectionsOrder?.length > 0) {
        siteInfo += `ORDINE SEZIONI DAL SITO (RISPETTA QUESTO ORDINE): ${wa.sectionsOrder.join(" → ")}.\n`;
      }
      if (wa.menuItems?.length > 0) {
        siteInfo += `PRODOTTI/SERVIZI REALI DAL SITO (usa QUESTI nomi, prezzi, descrizioni e image_url):\n`;
        wa.menuItems.forEach(item => {
          siteInfo += `- ${item.name}${item.price ? ` — ${item.price}` : ""}${item.description ? ` — ${item.description}` : ""}${item.category ? ` [${item.category}]` : ""}${item.image_url ? ` | image_url: ${item.image_url}` : ""}\n`;
        });
      }
      if (wa.siteImages?.length > 0) {
        siteInfo += `\nIMMAGINI ORIGINALI DAL SITO (PRIORITÀ MASSIMA — usa queste invece di Unsplash quando pertinenti):\n`;
        wa.siteImages.forEach(img => {
          siteInfo += `- ${img.context}: ${img.url}\n`;
        });
      }
      if (wa.categories?.length > 0) {
        siteInfo += `Categorie: ${wa.categories.join(", ")}.\n`;
      }
      if (wa.address) siteInfo += `Indirizzo: ${wa.address}.\n`;
      if (wa.phone) siteInfo += `Telefono: ${wa.phone}.\n`;
      if (wa.hours) siteInfo += `Orari: ${wa.hours}.\n`;
      siteInfo += `--- FINE DATI SITO ---\n`;
    }

    const isFromScratch = template.id === "from_scratch";
    const protoInfo = !isFromScratch && template.previewItems
      ? `\nPROTOTIPO BASE SCELTO: "${template.name}" (${template.category}). L'utente vuole un'app simile a questa, con lo stesso stile e struttura ma personalizzata per la sua attività "${data.businessName}". Esempio items del prototipo: ${template.previewItems.join(", ")}. Immagine hero del prototipo: ${template.heroImage || ""}.`
      : "";

    const prompt = `Crea un'app per "${data.businessName}" — settore: ${data.businessType}.
${data.description ? `Descrizione: ${data.description}.` : ""}
${protoInfo}
${siteInfo}
Colore primario: ${template.primaryColor}, secondario: ${template.secondaryColor}, accento: ${template.accentColor}. Dark mode: ${template.darkMode}. Font style: ${template.fontStyle}.
Sezioni richieste: ${data.features.join(", ") || "automatiche per il settore"}.
${data.techFeatures.length > 0 ? `Funzionalità tecniche (features_requested): ${data.techFeatures.join(", ")}.` : ""}

REGOLE IMPORTANTI:
- Usa ESATTAMENTE i colori indicati.
${!isFromScratch ? "- L'utente ha scelto un prototipo esistente: ISPIRATI alla struttura e allo stile di quell'app, ma personalizzala con il nome, i contenuti e il settore dell'utente." : "- L'utente vuole un'app creata da zero: genera una struttura originale e unica."}
- Se ci sono dati dal sito web, USA I CONTENUTI REALI (nomi, prezzi, descrizioni) e RISPETTA L'ORDINE DELLE SEZIONI del sito.
- Per ogni item, aggiungi un campo "image_url". PRIORITÀ: 1) usa le immagini ORIGINALI dal sito dell'utente quando disponibili e pertinenti 2) solo se non ci sono immagini dal sito, usa Unsplash (formato: https://images.unsplash.com/photo-XXXX?w=400&h=300&fit=crop).
- Non inventare prodotti/piatti se ci sono quelli reali dal sito.
- Le immagini del sito dell'utente sono di sua proprietà, quindi puoi riutilizzarle liberamente.`;

    onComplete(prompt, data);
  };

  return (
    <div className="flex-1 px-4 max-w-lg mx-auto w-full py-6 overflow-y-auto">
      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 rounded-full flex-1 transition-all ${i <= step ? "bg-purple-500" : "bg-white/10"}`} />
        ))}
      </div>

      {/* Step 0: Categoria */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-black text-white">Che tipo di attività hai?</h2>
            <p className="text-xs text-gray-400 mt-1">Seleziona la categoria</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setData(prev => ({ ...prev, businessType: t.id }))}
                className={`text-left p-3 rounded-xl border transition-all active:scale-[0.97] ${
                  data.businessType === t.id
                    ? "bg-purple-600/20 border-purple-500/50 ring-1 ring-purple-500/30"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <p className="text-xs font-bold text-white mt-1">{t.label}</p>
                <p className="text-[10px] text-gray-500 leading-tight">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Nome + Sito Web */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-black text-white">Parlaci della tua attività</h2>
            <p className="text-xs text-gray-400 mt-1">Inserisci il nome e il sito web se ce l'hai</p>
          </div>

          {/* Nome */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nome dell'attività *</label>
            <input
              value={data.businessName}
              onChange={e => setData(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="Es. Ristorante Da Mario"
              className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
            />
          </div>

          {/* Sito web — solo input, senza pulsante Analizza */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Sito web (opzionale)</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={data.websiteUrl}
                onChange={e => setData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="www.miosito.it"
                className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
              />
            </div>
            {data.websiteUrl.trim() && !data.websiteAnalysis && (
              <p className="text-[10px] text-purple-400 mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Analizzeremo il sito automaticamente al prossimo step
              </p>
            )}
          </div>
        </div>
      )}

      {/* Popup analisi sito */}
      {analyzingWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12122a] border border-white/10 rounded-2xl p-6 mx-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <Globe className="w-7 h-7 text-purple-400 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white">Stiamo analizzando il sito</h3>
              <p className="text-xs text-gray-400 mt-1">Estraiamo logo, colori, immagini, prodotti e molto altro</p>
            </div>
            <div className="space-y-3">
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${analysisProgress}%`,
                    background: "linear-gradient(90deg, #a855f7, #6366f1)",
                  }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{analysisPhase}</span>
                <span className="text-[10px] text-purple-400 font-bold">{Math.round(analysisProgress)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Template con anteprima */}
      {step === 2 && (
        <StyleTemplates
          businessType={data.businessType}
          websiteAnalysis={data.websiteAnalysis}
          selected={data.selectedTemplate}
          onSelect={(template) => setData(prev => ({ ...prev, selectedTemplate: template }))}
        />
      )}

      {/* Step 3: Funzionalità */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-black text-white">Cosa vuoi nell'app?</h2>
            <p className="text-xs text-gray-400 mt-1">Seleziona le sezioni che vuoi mostrare</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {features.map(f => (
              <button
                key={f.id}
                onClick={() => toggleFeature(f.id)}
                className={`text-left p-3 rounded-xl border transition-all active:scale-[0.97] ${
                  data.features.includes(f.id)
                    ? "bg-purple-600/20 border-purple-500/50"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
                }`}
              >
                <p className="text-xs font-bold text-white">{f.label}</p>
              </button>
            ))}
          </div>

          {/* Funzionalità tecniche */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-amber-400 font-bold mb-2">⚙️ Funzionalità avanzate (gestite dall'admin)</p>
            <div className="grid grid-cols-2 gap-2">
              {TECH_FEATURES.map(f => (
                <button
                  key={f.id}
                  onClick={() => toggleTechFeature(f.id)}
                  className={`text-left p-3 rounded-xl border transition-all active:scale-[0.97] ${
                    data.techFeatures.includes(f.id)
                      ? "bg-amber-600/20 border-amber-500/50"
                      : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
                  }`}
                >
                  <span>{f.icon}</span>
                  <p className="text-xs font-bold text-white mt-0.5">{f.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Riepilogo e conferma */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-black text-white">Tutto pronto!</h2>
            <p className="text-xs text-gray-400 mt-1">Controlla il riepilogo e genera la tua app</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Attività</span>
              <span className="text-sm font-bold text-white">{data.businessName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Categoria</span>
              <span className="text-sm text-white">{BUSINESS_TYPES.find(t => t.id === data.businessType)?.label}</span>
            </div>
            {data.selectedTemplate && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Stile</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ background: data.selectedTemplate.primaryColor }} />
                  <span className="text-sm text-white">{data.selectedTemplate.name}</span>
                </div>
              </div>
            )}
            {data.features.length > 0 && (
              <div>
                <span className="text-xs text-gray-400 block mb-1">Sezioni</span>
                <div className="flex flex-wrap gap-1">
                  {data.features.map(f => (
                    <span key={f} className="text-[10px] bg-purple-600/20 text-purple-300 rounded-full px-2 py-0.5">{f}</span>
                  ))}
                </div>
              </div>
            )}
            {data.techFeatures.length > 0 && (
              <div>
                <span className="text-xs text-amber-400 block mb-1">Funzionalità tecniche</span>
                <div className="flex flex-wrap gap-1">
                  {data.techFeatures.map(f => (
                    <span key={f} className="text-[10px] bg-amber-600/20 text-amber-300 rounded-full px-2 py-0.5">{f}</span>
                  ))}
                </div>
              </div>
            )}
            {data.websiteAnalysis && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <Globe className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] text-green-400">Sito web analizzato — colori e stile integrati</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      {!analyzingWebsite && (
        <div className="flex gap-3 mt-8 pb-4">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
          )}
          {step < totalSteps - 1 ? (
            <button
              onClick={async () => {
                if (!canProceed()) return;
                // Se step 1, c'è URL e non ancora analizzato → analizza prima di avanzare
                if (step === 1 && data.websiteUrl.trim() && !data.websiteAnalysis) {
                  await analyzeWebsite();
                }
                setStep(step + 1);
              }}
              disabled={!canProceed()}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                canProceed() ? "bg-purple-600 text-white hover:bg-purple-500 active:scale-[0.97]" : "bg-gray-700/50 text-gray-600"
              }`}
            >
              Avanti
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 active:scale-[0.97] transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Genera la mia App
            </button>
          )}
        </div>
      )}
    </div>
  );
}