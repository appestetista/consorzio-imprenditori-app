import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Sparkles, Globe, Loader2, Check, Upload, FileText, X, ImageIcon, PenLine, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StyleTemplates from "./StyleTemplates";
import ExtractedMenuPreview from "./ExtractedMenuPreview";
import ContentDescriptionStep from "./ContentDescriptionStep";

// Categorie per cui ha senso caricare un PDF menu/listino
const PDF_CATEGORIES = ["ristorazione", "beauty", "ecommerce", "fitness"];

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
  const wizardRef = useRef(null);
  const [data, setData] = useState({
    businessType: "",
    businessName: "",
    description: "",
    websiteUrl: "",
    websiteAnalysis: null,
    selectedTemplate: null,
    features: [],
    techFeatures: [],
    pdfMenuData: null,
    logoUrl: null,
    contentDescription: "", // testo libero per categorie senza PDF
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisPhase, setAnalysisPhase] = useState("");
  const [analyzingPdf, setAnalyzingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfPhase, setPdfPhase] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const progressInterval = useRef(null);
  const pdfProgressInterval = useRef(null);
  const pdfInputRef = useRef(null);

  const totalSteps = 5; // categoria, info+sito, logo+pdf, template, funzionalità

  useEffect(() => {
    wizardRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [step]);

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
    return new Promise(resolve => setTimeout(() => { setAnalyzingWebsite(false); resolve(); }, 800));
  };

  const startPdfProgress = () => {
    setPdfProgress(0);
    setPdfPhase("Caricamento file...");
    const phases = [
      { at: 8, text: "Lettura del documento..." },
      { at: 18, text: "Primo passaggio di estrazione..." },
      { at: 32, text: "Scansione con AI avanzata..." },
      { at: 48, text: "Estrazione completa in corso..." },
      { at: 62, text: "Verifica voci mancanti..." },
      { at: 75, text: "Unione e deduplicazione..." },
      { at: 88, text: "Finalizzazione..." },
    ];
    let current = 0;
    pdfProgressInterval.current = setInterval(() => {
      const remaining = 92 - current;
      const increment = Math.max(0.15, remaining * 0.02 + Math.random() * 0.4);
      current = Math.min(current + increment, 92);
      setPdfProgress(current);
      const phase = [...phases].reverse().find(p => current >= p.at);
      if (phase) setPdfPhase(phase.text);
    }, 500);
  };

  const stopPdfProgress = () => {
    clearInterval(pdfProgressInterval.current);
    setPdfProgress(100);
    setPdfPhase("Completato!");
    return new Promise(resolve => setTimeout(() => { setAnalyzingPdf(false); resolve(); }, 600));
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFileName(file.name);
    setAnalyzingPdf(true);
    startPdfProgress();
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      console.log("[Wizard] File caricato:", file_url);

      // STRATEGIA DOPPIO PASSAGGIO: estrai con entrambi i metodi e unisci
      const menuSchema = {
        type: "object",
        properties: {
          sections: {
            type: "array",
            description: "TUTTE le sezioni del menu con TUTTE le voci, senza omettere nulla",
            items: {
              type: "object",
              properties: {
                section_title: { type: "string", description: "Nome della sezione/categoria" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nome del prodotto/piatto/servizio" },
                      description: { type: "string", description: "Descrizione o ingredienti" },
                      price: { type: "string", description: "Prezzo (es. 12.00, €15, 8.50)" },
                    },
                  },
                },
              },
            },
          },
        },
      };

      // Passaggio 1: ExtractDataFromUploadedFile (veloce)
      let sectionsPass1 = [];
      try {
        const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: menuSchema,
        });
        console.log("[Wizard] Pass1 ExtractData:", (extraction?.output?.sections || []).reduce((n, s) => n + (s.items?.length || 0), 0), "voci");
        if (extraction?.status === "success" && extraction.output?.sections?.length > 0) {
          sectionsPass1 = extraction.output.sections;
        }
      } catch (extractErr) {
        console.warn("[Wizard] Pass1 ExtractData fallito:", extractErr);
      }

      // Passaggio 2: InvokeLLM con gemini_3_pro (più potente, estrae anche da immagini)
      let sectionsPass2 = [];
      try {
        console.log("[Wizard] Pass2 LLM estrazione completa...");
        const llmResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Sei un sistema di estrazione dati COMPLETA da menu/listini. Analizza OGNI pagina di questo documento e restituisci un JSON.

REGOLE TASSATIVE:
- Estrai il 100% delle voci. NON troncare, NON riassumere, NON omettere NESSUNA voce.
- Ogni sezione/categoria → un oggetto con section_title e items.
- Per ogni voce: name (esatto), description (ingredienti se presenti, altrimenti ""), price (esatto, es. "12.00", "€8", "8,50" — se assente "").
- Mantieni l'ordine originale. Processa TUTTE le pagine.
- Se vedi varianti (es. piccola/media/grande), crea un item per ogni variante.`,
          file_urls: [file_url],
          response_json_schema: menuSchema,
          model: "gemini_3_pro",
        });
        console.log("[Wizard] Pass2 LLM:", (llmResult?.sections || []).reduce((n, s) => n + (s.items?.length || 0), 0), "voci");
        if (llmResult?.sections?.length > 0) {
          sectionsPass2 = llmResult.sections;
        }
      } catch (llmErr) {
        console.warn("[Wizard] Pass2 LLM fallito:", llmErr);
      }

      // Unione intelligente: prendi il passaggio con più voci come base, poi aggiungi le mancanti dall'altro
      const countItems = (secs) => secs.reduce((n, s) => n + (s.items?.length || 0), 0);
      let baseSections, extraSections;
      if (countItems(sectionsPass2) >= countItems(sectionsPass1)) {
        baseSections = sectionsPass2;
        extraSections = sectionsPass1;
      } else {
        baseSections = sectionsPass1;
        extraSections = sectionsPass2;
      }

      let sections = baseSections;
      // Merge: aggiungi voci dall'extra che non esistono nella base
      if (extraSections.length > 0 && baseSections.length > 0) {
        const baseNames = new Set();
        baseSections.forEach(s => (s.items || []).forEach(it => baseNames.add((it.name || "").toLowerCase().trim())));
        
        extraSections.forEach(extraSec => {
          const matchingSec = baseSections.find(bs => 
            (bs.section_title || "").toLowerCase().trim() === (extraSec.section_title || "").toLowerCase().trim()
          );
          (extraSec.items || []).forEach(extraItem => {
            const name = (extraItem.name || "").toLowerCase().trim();
            if (name && !baseNames.has(name)) {
              if (matchingSec) {
                matchingSec.items = [...(matchingSec.items || []), extraItem];
              } else {
                // Sezione nuova non presente nella base
                const existingSec = sections.find(s => (s.section_title || "").toLowerCase().trim() === (extraSec.section_title || "").toLowerCase().trim());
                if (!existingSec) {
                  sections.push({ section_title: extraSec.section_title, items: [extraItem] });
                } else {
                  existingSec.items = [...(existingSec.items || []), extraItem];
                }
              }
              baseNames.add(name);
            }
          });
        });
        console.log("[Wizard] Merge completato: totale", countItems(sections), "voci da", sections.length, "sezioni");
      }

      if (sections.length > 0) {
        const categories = sections.map(s => s.section_title).filter(Boolean);
        const items = [];
        sections.forEach(sec => {
          (sec.items || []).forEach(it => {
            items.push({ ...it, category: sec.section_title || "Altro" });
          });
        });
        setData(prev => ({ ...prev, pdfMenuData: { items, sections, categories, fileName: file.name, itemsCount: items.length } }));
      } else {
        setData(prev => ({ ...prev, pdfMenuData: { items: [], categories: [], fileName: file.name, itemsCount: 0, error: true } }));
      }
    } catch (err) {
      console.error("[Wizard] Errore analisi PDF:", err);
      setData(prev => ({ ...prev, pdfMenuData: { items: [], categories: [], fileName: file.name, itemsCount: 0, error: true } }));
    } finally {
      await stopPdfProgress();
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setData(prev => ({ ...prev, logoUrl: file_url }));
    } catch (err) {
      console.error("[Wizard] Errore upload logo:", err);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const analyzeWebsite = async () => {
    if (!data.websiteUrl.trim()) return;
    setAnalyzingWebsite(true);
    startFakeProgress();

    let siteUrl = data.websiteUrl.trim();
    if (!siteUrl.startsWith("http")) siteUrl = "https://" + siteUrl;
    let baseUrl = "";
    try { baseUrl = new URL(siteUrl).origin; } catch { baseUrl = siteUrl; }

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Stai analizzando il sito web: ${siteUrl} (dominio base: ${baseUrl}).
Il contenuto della pagina ti viene fornito come allegato. Analizzalo in dettaglio.

ESTRAI CON PRECISIONE:
1. Nome dell'attività
2. Colore primario HEX
3. Colore secondario HEX
4. Stile grafico
5. Descrizione dell'attività
6. Tipo di attività
7. Ordine delle sezioni della pagina
8. Prodotti/servizi/piatti con nome, descrizione, prezzo, categoria
9. URL ASSOLUTO del logo
10. Indirizzo, telefono, orari se presenti
11. TUTTE le URL ASSOLUTE delle immagini
12. Link a file PDF menu/catalogo

REGOLE IMMAGINI:
- Estrai OGNI tag <img src="...">, ogni background-image url(...), ogni <source srcset="...">
- Converti TUTTE le URL relative in assolute con ${baseUrl}
- NON inventare URL.`,
        file_urls: [siteUrl],
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            primaryColor: { type: "string" },
            secondaryColor: { type: "string" },
            style: { type: "string" },
            description: { type: "string" },
            businessType: { type: "string" },
            sectionsOrder: { type: "array", items: { type: "string" } },
            menuItems: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, price: { type: "string" }, category: { type: "string" }, image_url: { type: "string" } } } },
            categories: { type: "array", items: { type: "string" } },
            siteImages: { type: "array", items: { type: "object", properties: { url: { type: "string" }, context: { type: "string" } } } },
            address: { type: "string" },
            phone: { type: "string" },
            hours: { type: "string" },
            logoUrl: { type: "string" },
            pdfMenuUrl: { type: "string" },
          },
        },
        model: "gemini_3_flash",
      });

      let finalResult = { ...result };

      if (result.pdfMenuUrl && result.pdfMenuUrl.trim().length > 5) {
        try {
          let pdfUrl = result.pdfMenuUrl.trim();
          if (!pdfUrl.startsWith("http")) pdfUrl = baseUrl + (pdfUrl.startsWith("/") ? "" : "/") + pdfUrl;
          const pdfExtraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: pdfUrl,
            json_schema: {
              type: "object",
              properties: {
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      section_title: { type: "string" },
                      items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, price: { type: "string" } } } },
                    },
                  },
                },
              },
            },
          });
          if (pdfExtraction?.status === "success" && pdfExtraction.output?.sections?.length > 0) {
            const pdfSections = pdfExtraction.output.sections;
            const pdfItems = [];
            pdfSections.forEach(sec => {
              (sec.items || []).forEach(it => {
                pdfItems.push({ name: it.name || "", description: it.description || "", price: it.price || "", category: sec.section_title || "", image_url: "" });
              });
            });
            if (!finalResult.menuItems || finalResult.menuItems.length < pdfItems.length) {
              finalResult.menuItems = pdfItems;
            } else {
              const existingNames = new Set((finalResult.menuItems || []).map(i => i.name?.toLowerCase()));
              pdfItems.forEach(pi => {
                if (!existingNames.has(pi.name?.toLowerCase())) finalResult.menuItems.push(pi);
              });
            }
            const pdfCategories = pdfSections.map(s => s.section_title).filter(Boolean);
            if (pdfCategories.length > 0) {
              finalResult.categories = [...new Set([...(finalResult.categories || []), ...pdfCategories])];
            }
            finalResult.pdfAnalyzed = true;
            finalResult.pdfItemsCount = pdfItems.length;
            finalResult.pdfSections = pdfSections;
          }
        } catch (pdfErr) {
          console.warn("[Wizard] Errore analisi PDF:", pdfErr);
        }
      }

      return finalResult;
    } catch (err) {
      console.error("Errore analisi sito:", err);
      return null;
    } finally {
      await stopFakeProgress();
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
    if (step === 2) return true;
    if (step === 3) return !!data.selectedTemplate;
    return true;
  };

  const buildAndComplete = (wizardData, template, featuresList, techFeaturesList, wa) => {
    let siteInfo = "";
    const isTemplateMode = template._mode === "template";
    const hasCustomizedApp = !!template._customizedAppData;

    if (wizardData.pdfMenuData?.sections?.length > 0) {
      siteInfo += `\n--- DATI ESTRATTI DAL PDF MENU/LISTINO ---\n`;
      siteInfo += `File: ${wizardData.pdfMenuData.fileName}. ${wizardData.pdfMenuData.itemsCount} voci totali in ${wizardData.pdfMenuData.sections.length} sezioni.\n`;
      siteInfo += `SEZIONI TROVATE: ${wizardData.pdfMenuData.categories.join(", ")}.\n`;
      siteInfo += `REGOLA ASSOLUTA: DEVI creare una sezione "menu_nav" con pulsanti per ogni sezione, seguita da una sezione "menu_list" per OGNUNA delle ${wizardData.pdfMenuData.sections.length} sezioni, con TUTTE le voci. NON omettere NESSUNA sezione e NESSUNA voce.\n\n`;
      wizardData.pdfMenuData.sections.forEach(sec => {
        siteInfo += `=== SEZIONE: "${sec.section_title}" (${(sec.items || []).length} voci) ===\n`;
        (sec.items || []).forEach(item => {
          siteInfo += `  - ${item.name}${item.price ? ` — ${item.price}` : ""}${item.description ? ` — ${item.description}` : ""}\n`;
        });
      });
      siteInfo += `--- FINE DATI PDF ---\n`;
    } else if (wizardData.pdfMenuData?.items?.length > 0) {
      siteInfo += `\n--- DATI ESTRATTI DAL PDF MENU/LISTINO ---\n`;
      siteInfo += `File: ${wizardData.pdfMenuData.fileName}. ${wizardData.pdfMenuData.itemsCount} voci.\n`;
      siteInfo += `Categorie: ${wizardData.pdfMenuData.categories.join(", ")}.\n`;
      wizardData.pdfMenuData.items.forEach(item => {
        siteInfo += `- ${item.name}${item.price ? ` — ${item.price}` : ""}${item.description ? ` — ${item.description}` : ""}${item.category ? ` [${item.category}]` : ""}\n`;
      });
      siteInfo += `--- FINE DATI PDF ---\n`;
    }

    if (wizardData.logoUrl && !wa) {
      siteInfo += `\nLOGO URL CARICATO DALL'UTENTE: ${wizardData.logoUrl}\n`;
    }

    if (wa) {
      siteInfo += `\n--- DATI ESTRATTI DAL SITO WEB ---\n`;
      if (!isTemplateMode) {
        siteInfo += `Colori dal sito: primario ${wa.primaryColor}, secondario ${wa.secondaryColor}. Stile: ${wa.style}.\n`;
      }
      if (wizardData.logoUrl) siteInfo += `LOGO URL CARICATO DALL'UTENTE (PRIORITÀ MASSIMA): ${wizardData.logoUrl}\n`;
      else if (wa.logoUrl) siteInfo += `LOGO URL: ${wa.logoUrl}\n`;
      if (wa.sectionsOrder?.length > 0) {
        siteInfo += `ORDINE SEZIONI DAL SITO: ${wa.sectionsOrder.join(" → ")}.\n`;
      }
      if (wa.menuItems?.length > 0) {
        siteInfo += `PRODOTTI/SERVIZI REALI DAL SITO:\n`;
        wa.menuItems.forEach(item => {
          siteInfo += `- ${item.name}${item.price ? ` — ${item.price}` : ""}${item.description ? ` — ${item.description}` : ""}${item.category ? ` [${item.category}]` : ""}${item.image_url ? ` | image_url: ${item.image_url}` : ""}\n`;
        });
      }
      if (wa.siteImages?.length > 0) {
        siteInfo += `\nIMMAGINI ORIGINALI DAL SITO:\n`;
        wa.siteImages.forEach(img => {
          siteInfo += `- ${img.context}: ${img.url}\n`;
        });
      }
      if (wa.categories?.length > 0) siteInfo += `Categorie: ${wa.categories.join(", ")}.\n`;
      if (wa.address) siteInfo += `Indirizzo: ${wa.address}.\n`;
      if (wa.phone) siteInfo += `Telefono: ${wa.phone}.\n`;
      if (wa.hours) siteInfo += `Orari: ${wa.hours}.\n`;
      siteInfo += `--- FINE DATI SITO ---\n`;
    }

    const logoLine = wizardData.logoUrl
      ? `\nLOGO URL (OBBLIGATORIO — inserisci come "logoUrl" nel JSON radice): ${wizardData.logoUrl}`
      : (wa?.logoUrl ? `\nLOGO URL DAL SITO (OBBLIGATORIO — inserisci come "logoUrl" nel JSON radice): ${wa.logoUrl}` : "");

    let styleInstructions = "";
    if (isTemplateMode && hasCustomizedApp) {
      styleInstructions = `
MODALITÀ TEMPLATE PERSONALIZZATO — L'utente ha personalizzato il template "${template.name}":
- Colore primario: ${template.primaryColor}, secondario: ${template.secondaryColor}, accento: ${template.accentColor}.
- Dark mode: ${template.darkMode}. Font: ${template.fontStyle}.
- L'utente ha già personalizzato colori, testi e immagini nella preview interattiva.
- USA ESATTAMENTE la struttura JSON fornita sotto come base, aggiungendo i dati reali dell'attività (piatti, prezzi, ecc.) se disponibili.
- MANTIENI le personalizzazioni dell'utente (colori, testi modificati, immagini cambiate).

STRUTTURA BASE PERSONALIZZATA DALL'UTENTE:
${JSON.stringify(template._customizedAppData, null, 2)}

REGOLA: Parti da questa struttura e ARRICCHISCILA con i dati reali. Non cambiarla radicalmente.`;
    } else if (isTemplateMode) {
      styleInstructions = `
MODALITÀ TEMPLATE — RISPETTA RIGOROSAMENTE IL TEMPLATE "${template.name}":
- Colore primario: ${template.primaryColor}, secondario: ${template.secondaryColor}, accento: ${template.accentColor}.
- Dark mode: ${template.darkMode}. Font: ${template.fontStyle}.
- DEVI rispettare ESATTAMENTE il layout del template scelto: header, hero image, card layout, bottom nav, tipografia, spaziature.
- I contenuti (nomi piatti, prezzi, descrizioni) devono essere adattati al template mantenendo il design identico.
- NON cambiare i colori del template, NON cambiare il layout — adatta solo i testi e le immagini.
${template.previewItems ? `- Items di riferimento del template: ${template.previewItems.join(", ")} — sostituisci con i dati reali dell'attività.` : ""}
${template.heroImage ? `- Hero image di riferimento del template: ${template.heroImage}` : ""}`;
    } else {
      styleInstructions = `
MODALITÀ AI — DESIGN LIBERO:
- Colore primario: ${template.primaryColor}, secondario: ${template.secondaryColor}, accento: ${template.accentColor || template.secondaryColor}.
- Dark mode: ${template.darkMode}. Font: ${template.fontStyle}.
- Genera una struttura originale e unica, ispirata ai colori e allo stile del sito web dell'utente.`;
    }

    const prompt = `Crea un'app per "${wizardData.businessName}" — settore: ${wizardData.businessType}.
${wizardData.description ? `Descrizione: ${wizardData.description}.` : ""}
${siteInfo}
${logoLine}
${styleInstructions}
Sezioni richieste: ${featuresList.join(", ") || "automatiche per il settore"}.
${techFeaturesList.length > 0 ? `Funzionalità tecniche (features_requested): ${techFeaturesList.join(", ")}.` : ""}

REGOLE IMPORTANTI:
- Usa ESATTAMENTE i colori indicati.
- Il campo "logoUrl" nel JSON radice è OBBLIGATORIO se fornito sopra.
- REGOLA CRITICA MENU: Se ci sono dati dal PDF o dal sito web, DEVI inserire il 100% delle voci nel JSON. NON troncare, NON omettere NESSUNA voce e NESSUNA sezione.
- STRUTTURA MENU OBBLIGATORIA:
  1. Subito dopo l'hero_banner, inserisci una sezione "menu_nav" con items = array di oggetti {label: "NomeSezione"} per OGNI sezione del menu.
  2. Poi inserisci una sezione "menu_list" separata per OGNI sezione/categoria con TUTTE le voci.
- Per ogni piatto: nome ESATTO, prezzo ESATTO, descrizione ESATTA dal menu originale.
- Per ogni item, aggiungi "image_url". PRIORITÀ: 1) immagini ORIGINALI dal sito 2) solo se non ci sono, usa Unsplash.
- Non inventare prodotti/piatti se ci sono quelli reali dal sito o PDF.`;

    onComplete(prompt, { ...wizardData, selectedTemplate: template, features: featuresList, techFeatures: techFeaturesList });
  };

  const handleComplete = () => {
    buildAndComplete(data, data.selectedTemplate, data.features, data.techFeatures, data.websiteAnalysis);
  };

  return (
    <div ref={wizardRef} className="flex-1 flex flex-col px-4 max-w-lg mx-auto w-full overflow-hidden">
      {/* Progress bar */}
      <div className="flex gap-1 pt-4 pb-3 shrink-0">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-1 rounded-full flex-1 transition-all ${i <= step ? "bg-purple-500" : "bg-white/10"}`} />
        ))}
      </div>

      {/* Contenuto step — scrollabile */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-2">

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
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nome dell'attività *</label>
            <input
              value={data.businessName}
              onChange={e => setData(prev => ({ ...prev, businessName: e.target.value }))}
              placeholder="Es. Ristorante Da Mario"
              className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
            />
          </div>
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
                <Sparkles className="w-3 h-3" /> Premendo Avanti analizzeremo il sito e genereremo la tua app
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
              <h3 className="text-base font-bold text-white">Stiamo creando la tua app</h3>
              <p className="text-xs text-gray-400 mt-1">Analizziamo il sito e generiamo la tua app personalizzata</p>
            </div>
            <div className="space-y-3">
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${analysisProgress}%`, background: "linear-gradient(90deg, #a855f7, #6366f1)" }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{analysisPhase}</span>
                <span className="text-[10px] text-purple-400 font-bold">{Math.round(analysisProgress)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup analisi PDF */}
      {analyzingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#12122a] border border-white/10 rounded-2xl p-6 mx-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-purple-400 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white">Analizzo il tuo menu</h3>
              <p className="text-xs text-gray-400 mt-1">Sto estraendo piatti, prezzi e categorie dal PDF</p>
            </div>
            <div className="space-y-3">
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${pdfProgress}%`, background: "linear-gradient(90deg, #a855f7, #6366f1)" }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{pdfPhase}</span>
                <span className="text-[10px] text-purple-400 font-bold">{Math.round(pdfProgress)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Carica Logo + Menu PDF */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-lg font-black text-white">Personalizza la tua app</h2>
            <p className="text-xs text-gray-400 mt-1">Carica il logo e/o il menu PDF (opzionale)</p>
          </div>

          {/* Logo Upload */}
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Logo della tua attività</p>
            {!data.logoUrl ? (
              <div>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-purple-500/30 hover:bg-purple-500/5 transition-all active:scale-[0.98]"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Carica logo</p>
                        <p className="text-[10px] text-gray-500">PNG, JPG o SVG</p>
                      </div>
                    </>
                  )}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-green-500/10 border border-green-500/20 p-3">
                <img src={data.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white/10" />
                <p className="text-sm font-bold text-green-400 flex-1">Logo caricato!</p>
                <button onClick={() => setData(prev => ({ ...prev, logoUrl: null }))} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          <div className="border-t border-white/5" />

          {/* PDF Menu Upload */}
          <div>
            <p className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Menu / Listino prezzi</p>
            {!data.pdfMenuData ? (
              <div>
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={analyzingPdf}
                  className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-purple-500/30 hover:bg-purple-500/5 transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Carica Menu</p>
                    <p className="text-[10px] text-gray-500">PDF, immagine del menu o listino</p>
                  </div>
                </button>
                <input ref={pdfInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handlePdfUpload} className="hidden" />
              </div>
            ) : data.pdfMenuData.error ? (
              <div className="space-y-2">
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                  <p className="text-sm text-red-400 font-bold">Errore nell'estrazione</p>
                </div>
                <button onClick={() => setData(prev => ({ ...prev, pdfMenuData: null }))} className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white">Riprova</button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-green-500/10 border border-green-500/20 p-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-green-400">Menu caricato!</p>
                  <p className="text-[10px] text-gray-400 truncate">{data.pdfMenuData.fileName}</p>
                  <p className="text-[10px] text-green-400/70">{data.pdfMenuData.itemsCount} voci in {data.pdfMenuData.categories?.length || 0} sezioni</p>
                </div>
                <button onClick={() => setData(prev => ({ ...prev, pdfMenuData: null }))} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            )}
            {/* Anteprima navigabile delle sezioni estratte */}
            {data.pdfMenuData && !data.pdfMenuData.error && data.pdfMenuData.sections?.length > 0 && (
              <ExtractedMenuPreview pdfMenuData={data.pdfMenuData} />
            )}
          </div>

          <p className="text-center text-[10px] text-gray-500">Questi passaggi sono opzionali — puoi saltarli</p>
        </div>
      )}

      {/* Step 3: Template con anteprima */}
      {step === 3 && (
        <StyleTemplates
        businessType={data.businessType}
        websiteAnalysis={data.websiteAnalysis}
        selected={data.selectedTemplate}
        onSelect={(template) => setData(prev => ({ ...prev, selectedTemplate: template }))}
        pdfMenuData={data.pdfMenuData}
        />
      )}

      {/* Step 4: Funzionalità */}
      {step === 4 && (
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

      </div>

      {/* Navigation */}
      {!analyzingWebsite && !analyzingPdf && (
        <div className="flex gap-3 pt-3 pb-4 shrink-0">
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
                if (step === 1 && data.websiteUrl.trim() && !data.websiteAnalysis) {
                  const analysisResult = await analyzeWebsite();
                  if (analysisResult) {
                    const updatedData = {
                      ...data,
                      websiteAnalysis: analysisResult,
                      businessName: data.businessName || analysisResult.name || "",
                      description: data.description || analysisResult.description || "",
                    };
                    setData(updatedData);
                    const autoTemplate = {
                      id: "from_scratch",
                      name: "Basata sul sito web",
                      primaryColor: analysisResult.primaryColor || "#6366F1",
                      secondaryColor: analysisResult.secondaryColor || "#1a1a2e",
                      accentColor: analysisResult.secondaryColor || "#818CF8",
                      darkMode: true,
                      fontStyle: "sans-serif",
                      _mode: "ai",
                    };
                    const feats = FEATURES_BY_CATEGORY[updatedData.businessType] || FEATURES_BY_CATEGORY._default;
                    const autoFeatures = feats.map(f => f.id);
                    buildAndComplete(updatedData, autoTemplate, autoFeatures, [], analysisResult);
                    return;
                  }
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