import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Mic, MicOff, Loader2, Eye, History, Upload, ImagePlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DynamicAppRenderer from "../components/simulatore-app/DynamicAppRenderer";
import ProjectHistory from "../components/simulatore-app/ProjectHistory";
import CreationWizard from "../components/simulatore-app/CreationWizard";

const SYSTEM_DESIGN_PROMPT = `Sei un designer-developer di livello mondiale. Crei applicazioni mobile con qualità visiva al livello delle app premiate da Apple Design Awards.

REGOLE ASSOLUTE DI DESIGN:
- Non importa quanto sia breve la descrizione dell'utente. Tu produci SEMPRE un risultato completo, dettagliato e visivamente spettacolare.
- Non usare MAI testo segnaposto. Inventa nomi, prezzi, descrizioni realistici e coerenti per il settore e mercato italiano.
- Ogni app DEVE avere un nome proprio professionale, palette cromatica forte e riconoscibile.

PALETTE COLORI PER SETTORE:
- Ristorazione: toni scuri con accenti caldi (ambra, arancio, bordeaux)
- Beauty/Wellness: rosa, lilla, colori morbidi e desaturati
- Fitness: sfondo nero con accenti neon (lime, cyan)
- E-commerce: sfondo pulito con colore accento forte
- Gestionali: sidebar scura con indigo o blu
- Premium/Lifestyle: sfondi scuri atmosferici, colori desaturati, stile editoriale

CONTENUTI:
- Almeno 5-8 items per ogni lista/griglia
- Prezzi plausibili per il mercato italiano
- Descrizioni brevi, specifiche, evocative
- Nomi di attività che suonano autentici
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
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  const generateApp = async (promptText) => {
    if (loading) return;
    setLoading(true);

    const userMsg = addMessage("user", promptText);
    const isFirstMessage = !appData;

    const prompt = isFirstMessage
      ? `${SYSTEM_DESIGN_PROMPT}\n\nL'utente descrive così la sua app: "${promptText}"\n\nGenera il JSON completo dell'app. Includi 5-7 sezioni. Se l'utente menziona funzionalità come pagamenti, API, notifiche push, login ecc., inseriscile nel campo features_requested come array di stringhe.\nLe sezioni disponibili: "hero_banner", "menu_list", "product_grid", "service_list", "stats_grid", "activity_feed", "gallery", "cta_banner", "booking", "contact", "pricing", "testimonials", "features".\nRispondi SOLO con il JSON.`
      : `${SYSTEM_DESIGN_PROMPT}\n\nEcco il mockup JSON attuale dell'app:\n${JSON.stringify(appData, null, 2)}\n\nL'utente chiede: "${promptText}"\n\nREGOLA IMPORTANTE: L'utente può modificare SOLO aspetti grafici/estetici (colori, testi, layout, sezioni, contenuti, immagini). Se la modifica riguarda struttura tecnica (pagamenti, API, database, autenticazione), NON applicarla al JSON ma aggiungila a features_requested.\n\nApplica le modifiche grafiche e restituisci il JSON completo aggiornato. Rispondi SOLO con il JSON.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: JSON_SCHEMA,
      });

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
            ? `Ho creato ${result.appName}! ${result.tagline}\n\nPremi 👁️ per vedere l'anteprima completa, oppure scrivimi per modificare colori, testi, sezioni...${featureMsg}`
            : `Modifica applicata! Controlla l'anteprima.${featureMsg}`
        );

        const allMsgs = [...messages, userMsg, assistantMsg];
        await saveProject(result, allMsgs, versions, promptText);
      }
    } catch (err) {
      console.error("Errore:", err);
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
    generateApp(prompt);
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
    sessionStorage.setItem("simulatore_app_data", JSON.stringify(appData));
    sessionStorage.setItem("simulatore_project_id", projectId || "");
    sessionStorage.setItem("simulatore_versions", JSON.stringify(versions));
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
          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-4 max-w-lg mx-auto w-full">
            {messages.length === 0 && !loading && (
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