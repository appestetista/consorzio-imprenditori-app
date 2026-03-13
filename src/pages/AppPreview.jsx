import React, { useState, useEffect } from "react";
import { ArrowLeft, Pencil, X, Send, RotateCcw, Mic, MicOff, Clock, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DynamicAppRenderer from "../components/simulatore-app/DynamicAppRenderer";

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
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("simulatore_app_data");
    const pid = sessionStorage.getItem("simulatore_project_id");
    if (stored) setAppData(JSON.parse(stored));
    if (pid) {
      setProjectId(pid);
      // Carica versioni dal DB
      base44.entities.AppProject.filter({ id: pid }).then(res => {
        if (res?.[0]) {
          setVersions(res[0].versions || []);
          setSubmitted(res[0].status === "submitted" || res[0].status === "in_progress");
        }
      }).catch(() => {});
    }
  }, []);

  const handleEdit = async () => {
    if (!editText.trim() || !appData || loading) return;
    setLoading(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un designer Apple Design Awards level. Mockup attuale:
${JSON.stringify(appData, null, 2)}

Modifica richiesta: "${editText.trim()}"

REGOLA: L'utente può modificare SOLO aspetti grafici (colori, testi, layout, sezioni, contenuti). Se la richiesta riguarda struttura tecnica (pagamenti, API, autenticazione), NON modificare il JSON ma aggiungila a features_requested.
Restituisci il JSON completo aggiornato.`,
        response_json_schema: EDIT_SCHEMA,
      });

      if (result?.sections) {
        setAppData(result);
        sessionStorage.setItem("simulatore_app_data", JSON.stringify(result));
        setEditText("");

        // Salva versione
        if (projectId) {
          const newVersion = {
            version: versions.length + 1,
            data: JSON.stringify(result),
            prompt: editText.trim(),
            timestamp: new Date().toISOString(),
            type: "edit",
          };
          const updatedVersions = [...versions, newVersion];
          setVersions(updatedVersions);
          await base44.entities.AppProject.update(projectId, {
            current_data: JSON.stringify(result),
            current_version: updatedVersions.length,
            versions: updatedVersions,
          });
        }
      }
    } catch (err) {
      console.error("Errore modifica:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!projectId || !appData) return;
    await base44.entities.AppProject.update(projectId, { status: "submitted" });
    setSubmitted(true);
  };

  const restoreVersion = async (v) => {
    const data = JSON.parse(v.data);
    setAppData(data);
    sessionStorage.setItem("simulatore_app_data", JSON.stringify(data));
    setShowVersions(false);
    if (projectId) {
      await base44.entities.AppProject.update(projectId, { current_data: v.data });
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
      {/* Versioni drawer */}
      {showVersions && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={() => setShowVersions(false)}>
          <div className="absolute bottom-0 left-0 right-0 max-h-[60vh] bg-[#12121f] rounded-t-3xl border-t border-white/10 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-white mb-3">Versioni ({versions.length})</h3>
            <div className="space-y-2">
              {versions.slice().reverse().map((v, i) => (
                <button key={i} onClick={() => restoreVersion(v)} className="w-full text-left p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Versione {v.version}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px]">{v.prompt}</p>
                    </div>
                    <span className="text-[9px] text-gray-600">{new Date(v.timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* App rendering */}
      <div className="flex-1 overflow-y-auto">
        <DynamicAppRenderer data={appData} />
      </div>

      {/* Barra inferiore */}
      <div className="sticky bottom-0 z-50 bg-[#0a0a14]/95 border-t border-white/[0.06] backdrop-blur-xl">
        {/* Azioni rapide */}
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
          </div>
          {!submitted ? (
            <button onClick={handleSubmit} className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 rounded-full px-3 py-1.5 hover:bg-green-400/20 transition-colors">
              <Check className="w-3.5 h-3.5" />
              Invia all'admin
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 rounded-full px-3 py-1.5">
              <Check className="w-3.5 h-3.5" />
              Inviato!
            </span>
          )}
        </div>
        {/* Input modifica */}
        <div className="px-3 py-2.5 flex items-end gap-2">
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