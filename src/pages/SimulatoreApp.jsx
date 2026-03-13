import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Mic, MicOff, Loader2, Eye, History, Upload, ImagePlus, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DynamicAppRenderer from "../components/simulatore-app/DynamicAppRenderer";
import ProjectHistory from "../components/simulatore-app/ProjectHistory";
import CreationWizard from "../components/simulatore-app/CreationWizard";
import useDisablePullToRefresh from "../components/simulatore-app/useDisablePullToRefresh";

const SYSTEM_DESIGN_PROMPT = `Sei un designer-developer di livello mondiale. Crei applicazioni mobile con qualità visiva al livello delle app premiate da Apple Design Awards.

REGOLE ASSOLUTE DI DESIGN:
- Non importa quanto sia breve la descrizione dell'utente. Tu produci SEMPRE un risultato completo, dettagliato e visivamente spettacolare.
- Non usare MAI testo segnaposto. Inventa nomi, prezzi, descrizioni realistici e coerenti per il settore e mercato italiano.
- Ogni app DEVE avere un nome proprio professionale, palette cromatica forte e riconoscibile.

IMMAGINI — REGOLA FONDAMENTALE:
- OGNI item DEVE avere un campo "image_url".
- PRIORITÀ IMMAGINI: 1) Se l'utente ha fornito un sito web e sono state estratte immagini originali, USA QUELLE (sono di proprietà dell'utente). 2) Solo se non ci sono immagini dal sito, usa Unsplash.
- Formato URL Unsplash: https://images.unsplash.com/photo-XXXXXXXXX?w=400&h=300&fit=crop
- Usa SOLO photo ID che conosci esistere su Unsplash. Ecco ID sicuri per categoria:
  RISTORAZIONE: photo-1504674900247-0877df9cc836 (pasta), photo-1565299624946-b28f40a0ae38 (pizza), photo-1555939594-58d7cb561ad1 (carne), photo-1546069901-ba9599a7e63c (dessert), photo-1551782450-a2132b4ba21d (hamburger), photo-1414235077428-338989a2e8c0 (pesce), photo-1563379091339-03b21ab4a4f4 (cocktail), photo-1517248135467-4c7edcad34c4 (ristorante interno), photo-1552566626-52f8b828add9 (ristorante elegante)
  BEAUTY: photo-1560066984-138dadb4c035 (salone), photo-1522335789203-aabd1fc54bc9 (manicure), photo-1487412947147-5cebf100ffc2 (capelli), photo-1570172619644-dfd03ed5d881 (spa), photo-1616394584738-fc6e612e71b9 (trattamento viso)
  FITNESS: photo-1534438327276-14e5300c3a48 (palestra), photo-1571019613454-1cb2f99b2d8b (workout), photo-1517836357463-d25dfeac3438 (pesi), photo-1574680096145-d05b474e2155 (yoga)
  ECOMMERCE: photo-1441986300917-64674bd600d8 (shopping), photo-1556742049-0cfed4f6a45d (vestiti), photo-1523275335684-37898b6baf30 (prodotto)
  HERO/BANNER: photo-1517248135467-4c7edcad34c4 (ristorante), photo-1600891964599-f94d51f96eca (beauty), photo-1534438327276-14e5300c3a48 (fitness)
- Per l'hero_banner: usa sempre un image_url nel primo item.
- Se ci sono dati dal sito web dell'utente, RISPETTA l'ordine delle sezioni e usa i contenuti reali.

CONTENUTI:
- Almeno 5-8 items per ogni lista/griglia
- Prezzi plausibili per il mercato italiano
- Descrizioni brevi, specifiche, evocative
- Badge realistici: "Popolare", "Nuovo", "Consigliato", "Ultimi posti", "Sconto"

FUNZIONALITÀ AVANZATE:
Quando l'utente menziona pagamenti, API, notifiche, login, o simili, aggiungile al campo features_requested nella risposta.`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    appName: { type: "string" },
    tagline: { type: "string" },
    primaryColor: { type: "string" },
    secondaryColor: { type: "string" },
    accentColor: { type: "string" },
    headerStyle: { type: "string" },
    darkMode: { type: "boolean" },
    fontStyle: { type: "string" },
    features_requested: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string" },
          items: { type: "array", items: { type: "object" } },
        },
      },
    },
    bottomNav: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          icon: { type: "string" },
          active: { type: "boolean" },
        },
      },
    },
  },
};

export default function SimulatoreApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appData, setAppData] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [user, setUser] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showWizard, setShowWizard] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isFirstGeneration, setIsFirstGeneration] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genPhase, setGenPhase] = useState("");
  const genProgressRef = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useDisablePullToRefresh();

  // Scroll to top all'apertura della pagina
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startGenProgress = () => {
    setGenProgress(0);
    setGenPhase("Preparazione del progetto...");
    const phases = [
      { at: 10, text: "Analisi dei requisiti..." },
      { at: 25, text: "Creazione struttura app..." },
      { at: 40, text: "Generazione sezioni e contenuti..." },
      { at: 55, text: "Inserimento prodotti e prezzi..." },
      { at: 70, text: "Applicazione stile grafico..." },
      { at: 85, text: "Rifinitura finale..." },
    ];
    let current = 0;
    genProgressRef.current = setInterval(() => {
      current += Math.random() * 2.5 + 0.3;
      if (current > 92) current = 92;
      setGenProgress(current);
      const phase = [...phases].reverse().find(p => current >= p.at);
      if (phase) setGenPhase(phase.text);
    }, 400);
  };

  const stopGenProgress = () => {
    clearInterval(genProgressRef.current);
    setGenProgress(100);
    setGenPhase("App pronta!");
    return new Promise(resolve => setTimeout(() => { setIsFirstGeneration(false); resolve(); }, 800));
  };

  const addMessage = (role, content) => {
    const msg = { role, content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const saveProject = async (data, allMessages, allVersions, promptUsed) => {
    const newVersion = {
      version: allVersions.length + 1,
      data: JSON.stringify(data),
      prompt: promptUsed,
      timestamp: new Date().toISOString(),
      type: allVersions.length === 0 ? "creation" : "edit",
    };
    const updatedVersions = [...allVersions, newVersion];

    const features = data.features_requested || [];
    const projectData = {
      user_email: user?.email || "",
      app_name: data.appName || "App senza nome",
      category: data.category || "",
      description: allMessages[0]?.content || "",
      current_version: updatedVersions.length,
      current_data: JSON.stringify(data),
      versions: updatedVersions,
      messages: allMessages,
      requires_payments: features.some(f => /pagament|stripe|carta|checkout/i.test(f)),
      requires_api: features.some(f => /api|integrazion|webhook/i.test(f)),
      features_requested: features,
    };

    if (projectId) {
      await base44.entities.AppProject.update(projectId, projectData);
    } else {
      const created = await base44.entities.AppProject.create(projectData);
      setProjectId(created.id);
    }
    setVersions(updatedVersions);
    return updatedVersions;
  };

  const generateApp = async (promptText, isFromWizard = false) => {
    if (loading) return;
    setLoading(true);

    const isFirstMessage = !appData;

    // Se è la prima generazione dal wizard, mostra popup progresso (no messaggi visibili)
    if (isFromWizard && isFirstMessage) {
      setIsFirstGeneration(true);
      startGenProgress();
    }

    // Non mostrare il prompt dell'utente nella chat se è la prima generazione
    if (!isFromWizard || !isFirstMessage) {
      addMessage("user", promptText);
    }

    const prompt = isFirstMessage
      ? `${SYSTEM_DESIGN_PROMPT}\n\nL'utente descrive così la sua app: "${promptText}"\n\nGenera il JSON completo dell'app. Includi 5-7 sezioni. Se l'utente menziona funzionalità come pagamenti, API, notifiche push, login ecc., inseriscile nel campo features_requested come array di stringhe.\nLe sezioni disponibili: "hero_banner", "menu_list", "product_grid", "service_list", "stats_grid", "activity_feed", "gallery", "cta_banner", "booking", "contact", "pricing", "testimonials", "features".\nRispondi SOLO con il JSON.`
      : `${SYSTEM_DESIGN_PROMPT}\n\nEcco il mockup JSON attuale dell'app:\n${JSON.stringify(appData, null, 2)}\n\nL'utente chiede: "${promptText}"\n\nREGOLA IMPORTANTE: L'utente può modificare SOLO aspetti grafici/estetici (colori, testi, layout, sezioni, contenuti, immagini). Se la modifica riguarda struttura tecnica (pagamenti, API, database, autenticazione), NON applicarla al JSON ma aggiungila a features_requested.\n\nApplica le modifiche grafiche e restituisci il JSON completo aggiornato. Rispondi SOLO con il JSON.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: JSON_SCHEMA,
      });

      if (isFirstGeneration || (isFromWizard && isFirstMessage)) {
        await stopGenProgress();
      }

      if (!result?.sections) {
        addMessage("assistant", "Non sono riuscito a generare il risultato. Riprova con una descrizione diversa.");
      } else {
        setAppData(result);

        const newFeatures = result.features_requested || [];
        const featureMsg = newFeatures.length > 0
          ? `\n\n📋 Funzionalità richieste (verranno configurate dall'admin): ${newFeatures.join(", ")}`
          : "";

        const assistantMsg = addMessage("assistant",
          isFirstMessage
            ? `Ho creato ${result.appName}! ${result.tagline}${featureMsg}`
            : `Modifica applicata! Controlla l'anteprima.${featureMsg}`
        );

        const hiddenUserMsg = { role: "user", content: "[Generazione automatica dal wizard]", timestamp: new Date().toISOString() };
        const allMsgs = isFromWizard && isFirstMessage
          ? [hiddenUserMsg, assistantMsg]
          : [...messages, { role: "user", content: promptText, timestamp: new Date().toISOString() }, assistantMsg];
        await saveProject(result, allMsgs, versions, promptText);

        // Dopo la prima generazione, vai direttamente all'anteprima fullscreen
        if (isFirstMessage) {
          const dataStr = JSON.stringify(result);
          sessionStorage.setItem("simulatore_app_data", dataStr);
          localStorage.setItem("simulatore_app_data", dataStr);
          sessionStorage.setItem("simulatore_project_id", projectId || "");
          localStorage.setItem("simulatore_project_id", projectId || "");
          const versStr = JSON.stringify(versions);
          sessionStorage.setItem("simulatore_versions", versStr);
          localStorage.setItem("simulatore_versions", versStr);
          navigate("/AppPreview");
          return;
        }
      }
    } catch (err) {
      console.error("Errore:", err);
      if (isFirstGeneration || (isFromWizard && isFirstMessage)) {
        await stopGenProgress();
      }
      addMessage("assistant", "Si è verificato un errore. Riprova tra qualche secondo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    generateApp(text);
  };

  const handleWizardComplete = (prompt, wizardData) => {
    setShowWizard(false);
    // Passa il template scelto per poterlo usare nella preview
    if (wizardData?.selectedTemplate) {
      sessionStorage.setItem("simulatore_template", JSON.stringify(wizardData.selectedTemplate));
    }
    generateApp(prompt, true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setInput(prev => prev + (prev ? " " : "") + `[Immagine caricata: ${file_url}]`);
      addMessage("assistant", `📎 Immagine caricata! Ora dimmi come vuoi usarla (es. "usa questa come logo", "metti questa immagine nella gallery").`);
    } catch (err) {
      console.error("Upload error:", err);
      addMessage("assistant", "Errore durante il caricamento dell'immagine.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addMessage("assistant", "Il tuo browser non supporta la dettatura vocale.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "it-IT";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (e) => setInput(prev => prev + e.results[0][0].transcript);
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
  };

  const openPreview = () => {
    if (!appData) return;
    const dataStr = JSON.stringify(appData);
    const versStr = JSON.stringify(versions);
    // Salva su entrambi gli storage per sopravvivere al refresh
    sessionStorage.setItem("simulatore_app_data", dataStr);
    localStorage.setItem("simulatore_app_data", dataStr);
    sessionStorage.setItem("simulatore_project_id", projectId || "");
    localStorage.setItem("simulatore_project_id", projectId || "");
    sessionStorage.setItem("simulatore_versions", versStr);
    localStorage.setItem("simulatore_versions", versStr);
    navigate("/AppPreview");
  };

  const loadProject = (project) => {
    setProjectId(project.id);
    setMessages(project.messages || []);
    setVersions(project.versions || []);
    setAppData(project.current_data ? JSON.parse(project.current_data) : null);
    setShowHistory(false);
    setShowWizard(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/Esplora" className="back-arrow-tap text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-base font-bold">Crea la tua App</h1>
          </div>
          <div className="flex items-center gap-2">
            {appData && (
              <button onClick={openPreview} className="p-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => { setShowHistory(!showHistory); setShowWizard(false); }} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors">
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showHistory ? (
        <ProjectHistory userEmail={user?.email} onSelectProject={loadProject} onClose={() => setShowHistory(false)} />
      ) : showWizard && !appData && messages.length === 0 ? (
        <CreationWizard onComplete={handleWizardComplete} />
      ) : (
        <>
          {/* Popup generazione prima app — fullscreen */}
          {isFirstGeneration && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f1a]">
              <div className="max-w-sm w-full mx-6 text-center">
                <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
                </div>
                <h2 className="text-xl font-black text-white mb-2">Stiamo creando la tua app</h2>
                <p className="text-sm text-gray-400 mb-8">Il nostro AI sta progettando un'app su misura per te</p>
                <div className="space-y-3">
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${genProgress}%`, background: "linear-gradient(90deg, #a855f7, #6366f1, #a855f7)" }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">{genPhase}</span>
                    <span className="text-xs text-purple-400 font-bold">{Math.round(genProgress)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-4 max-w-lg mx-auto w-full">
            {messages.length === 0 && !loading && !isFirstGeneration && (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-sm text-gray-400 mt-3">Generazione in corso...</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`mb-4 ${msg.role === "user" ? "flex justify-end" : "flex justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-white/[0.05] border border-white/[0.06] text-gray-300"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white/[0.05] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-sm text-gray-400">Sto progettando...</span>
                </div>
              </div>
            )}

            {/* Mini preview */}
            {appData && !loading && messages.length > 0 && (
              <div className="mb-4 flex justify-center">
                <div className="w-[180px]">
                  <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl cursor-pointer hover:border-purple-500/30 transition-colors" onClick={openPreview}>
                    <div className="h-[280px] overflow-hidden">
                      <div className="transform scale-[0.6] origin-top-left" style={{ width: "300px" }}>
                        <DynamicAppRenderer data={appData} />
                      </div>
                    </div>
                    <div className="bg-[#12121f] border-t border-white/5 py-2 text-center">
                      <span className="text-[10px] text-purple-400 font-semibold">👁️ Tocca per anteprima completa</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="sticky bottom-0 z-50 bg-[#0a0a14] border-t border-white/[0.06] px-3 py-3">
            <div className="max-w-lg mx-auto flex items-end gap-2">
              {/* Upload image button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-white transition-colors shrink-0"
              >
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={appData ? "Modifica colori, testi, sezioni..." : "Descrivi la tua app..."}
                  rows={1}
                  className="w-full bg-[#1a1a2e] border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 resize-none transition-colors"
                  style={{ minHeight: 44, maxHeight: 120 }}
                />
                <button
                  onClick={handleVoice}
                  className={`absolute right-2 bottom-2 p-1.5 rounded-full transition-all ${
                    isRecording ? "bg-red-500 text-white animate-pulse" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`p-3 rounded-2xl shrink-0 transition-all active:scale-95 ${
                  loading || !input.trim() ? "bg-gray-700/50 text-gray-600" : "bg-purple-600 text-white hover:bg-purple-500"
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}