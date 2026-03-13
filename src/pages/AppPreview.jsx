import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Mic, MicOff, Clock, Check, Loader2, Sliders, Layers, ImagePlus, Save, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DynamicAppRenderer from "../components/simulatore-app/DynamicAppRenderer";
import QuickEditor from "../components/simulatore-app/QuickEditor";
import VersionCompare from "../components/simulatore-app/VersionCompare";
import ColorPickerPanel from "../components/simulatore-app/ColorPickerPanel";
import useDisablePullToRefresh from "../components/simulatore-app/useDisablePullToRefresh";

const EDIT_SCHEMA = {
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
    sections: { type: "array", items: { type: "object", properties: { type: { type: "string" }, title: { type: "string" }, subtitle: { type: "string" }, items: { type: "array", items: { type: "object" } } } } },
    bottomNav: { type: "array", items: { type: "object", properties: { label: { type: "string" }, icon: { type: "string" }, active: { type: "boolean" } } } },
  },
};

export default function AppPreview() {
  const [appData, setAppData] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showQuickEditor, setShowQuickEditor] = useState(false);
  const [versions, setVersions] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Priorità: sessionStorage (navigazione interna) > localStorage (refresh)
    const stored = sessionStorage.getItem("simulatore_app_data") || localStorage.getItem("simulatore_app_data");
    const pid = sessionStorage.getItem("simulatore_project_id") || localStorage.getItem("simulatore_project_id");
    const storedVersions = sessionStorage.getItem("simulatore_versions") || localStorage.getItem("simulatore_versions");
    if (stored) setAppData(JSON.parse(stored));
    if (storedVersions) setVersions(JSON.parse(storedVersions));
    if (pid) {
      setProjectId(pid);
      base44.entities.AppProject.filter({ id: pid }).then(res => {
        if (res?.[0]) {
          const dbVersions = res[0].versions || [];
          setVersions(dbVersions);
          // Sincronizza localStorage con i dati dal DB
          if (res[0].current_data) {
            const dbData = JSON.parse(res[0].current_data);
            setAppData(dbData);
            persist(dbData, dbVersions, pid);
          }
          setSubmitted(res[0].status === "submitted" || res[0].status === "in_progress");
        }
      }).catch(() => {});
    }
  }, []);

  // Salva su entrambi i storage
  const persist = (data, vers, pid) => {
    const dataStr = JSON.stringify(data);
    const versStr = JSON.stringify(vers);
    sessionStorage.setItem("simulatore_app_data", dataStr);
    localStorage.setItem("simulatore_app_data", dataStr);
    if (pid) {
      sessionStorage.setItem("simulatore_project_id", pid);
      localStorage.setItem("simulatore_project_id", pid);
    }
    sessionStorage.setItem("simulatore_versions", versStr);
    localStorage.setItem("simulatore_versions", versStr);
  };

  const saveVersion = async (data, prompt) => {
    persist(data, versions, projectId);
    if (!projectId) return;
    const newVersion = {
      version: versions.length + 1,
      data: JSON.stringify(data),
      prompt: prompt || "Modifica rapida",
      timestamp: new Date().toISOString(),
      type: "edit",
    };
    const updatedVersions = [...versions, newVersion];
    setVersions(updatedVersions);
    persist(data, updatedVersions, projectId);
    await base44.entities.AppProject.update(projectId, {
      current_data: JSON.stringify(data),
      current_version: updatedVersions.length,
      versions: updatedVersions,
    });
  };

  // Salvataggio esplicito versione (pulsante)
  const handleManualSave = async () => {
    if (!appData || saving) return;
    setSaving(true);
    await saveVersion(appData, "Salvataggio manuale");
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editText.trim() || !appData || loading) return;
    setLoading(true);
    const promptText = editText.trim();
    setEditText("");

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un designer Apple Design Awards level. Mockup attuale:\n${JSON.stringify(appData, null, 2)}\n\nModifica richiesta: "${promptText}"\n\nREGOLA: L'utente può modificare SOLO aspetti grafici (colori, testi, layout, sezioni, contenuti). Se la richiesta riguarda struttura tecnica (pagamenti, API, autenticazione), NON modificare il JSON ma aggiungila a features_requested.\nRestituisci il JSON completo aggiornato.`,
        response_json_schema: EDIT_SCHEMA,
      });

      if (result?.sections) {
        setAppData(result);
        await saveVersion(result, promptText);
      }
    } catch (err) {
      console.error("Errore modifica:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUpdate = async (newData) => {
    setAppData(newData);
    await saveVersion(newData, "Modifica rapida (colori/sezioni)");
  };

  const handleSubmit = async () => {
    if (!projectId || !appData) return;
    await base44.entities.AppProject.update(projectId, { status: "submitted" });
    setSubmitted(true);
    // Notifica admin via email
    try {
      const user = await base44.auth.me();
      await base44.integrations.Core.SendEmail({
        to: "admin@consorzioimprenditori.it",
        subject: `Nuovo progetto app inviato: ${appData.appName || "App"}`,
        body: `<h2>Nuovo progetto app pronto per la revisione</h2>
<p><strong>App:</strong> ${appData.appName || "N/D"}</p>
<p><strong>Utente:</strong> ${user?.full_name || user?.email || "N/D"}</p>
<p><strong>Funzionalità richieste:</strong> ${(appData.features_requested || []).join(", ") || "Nessuna"}</p>
<p>Vai al pannello admin per gestire il progetto.</p>`,
      });
    } catch {}
  };

  const restoreVersion = async (v) => {
    const data = JSON.parse(v.data);
    setAppData(data);
    persist(data, versions, projectId);
    setShowVersions(false);
    if (projectId) {
      await base44.entities.AppProject.update(projectId, { current_data: v.data });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditText(prev => prev + (prev ? " " : "") + `[Immagine: ${file_url}]`);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "it-IT";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (e) => setEditText(prev => prev + e.results[0][0].transcript);
    recognition.onerror = () => setIsRecording(false);
    recognition.start();
  };

  if (!appData) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Nessuna anteprima disponibile.</p>
          <Link to="/SimulatoreApp" className="text-purple-400 underline text-sm">Torna al creatore</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Version compare overlay */}
      {showVersions && (
        <VersionCompare
          versions={versions}
          currentData={appData}
          onRestore={restoreVersion}
          onClose={() => setShowVersions(false)}
        />
      )}

      {/* Quick editor overlay */}
      {showQuickEditor && (
        <QuickEditor
          appData={appData}
          onUpdate={handleQuickUpdate}
          onClose={() => setShowQuickEditor(false)}
        />
      )}

      {/* App rendering */}
      <div className="flex-1 overflow-y-auto">
        <DynamicAppRenderer data={appData} />
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 z-50 bg-[#0a0a14]/95 border-t border-white/[0.06] backdrop-blur-xl">
        {/* Quick actions */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Link to="/SimulatoreApp" className="p-1.5 text-gray-500 hover:text-gray-300">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            {versions.length > 0 && (
              <button onClick={() => setShowVersions(true)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 bg-white/5 rounded-full px-2 py-1">
                <Clock className="w-3 h-3" />
                v{versions.length}
              </button>
            )}
            <button onClick={() => setShowQuickEditor(true)} className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 bg-purple-600/10 rounded-full px-2 py-1">
              <Sliders className="w-3 h-3" />
              Modifica rapida
            </button>
            <ColorPickerPanel appData={appData} onUpdate={handleQuickUpdate} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-400 bg-blue-400/10 rounded-full px-3 py-1.5 hover:bg-blue-400/20 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salva
            </button>
            {!submitted ? (
              <button onClick={handleSubmit} className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 rounded-full px-3 py-1.5 hover:bg-green-400/20 transition-colors">
                <Rocket className="w-3.5 h-3.5" />
                Invia al nostro team
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 rounded-full px-3 py-1.5">
                <Check className="w-3.5 h-3.5" />
                Inviato!
              </span>
            )}
          </div>
        </div>
        {/* Edit input */}
        <div className="px-3 py-2.5 flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          <div className="flex-1 relative">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEdit(); } }}
              placeholder="Modifica colori, testi, sezioni..."
              rows={1}
              className="w-full bg-[#1a1a2e] border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 resize-none transition-colors"
              style={{ minHeight: 44, maxHeight: 100 }}
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
            onClick={handleEdit}
            disabled={loading || !editText.trim()}
            className={`p-3 rounded-2xl shrink-0 transition-all active:scale-95 ${
              loading || !editText.trim() ? "bg-gray-700/50 text-gray-600" : "bg-purple-600 text-white hover:bg-purple-500"
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}