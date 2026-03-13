import React, { useState, useEffect } from "react";
import { ArrowLeft, Pencil, X, Send, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import DynamicAppRenderer from "../components/simulatore-app/DynamicAppRenderer";

export default function AppPreview() {
  const [appData, setAppData] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("simulatore_app_data");
      if (stored) setAppData(JSON.parse(stored));
    } catch {}
  }, []);

  const handleEdit = async () => {
    if (!editText.trim() || !appData) return;
    setLoading(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un designer-developer di livello mondiale, Apple Design Awards level. Hai generato questo mockup JSON:
${JSON.stringify(appData, null, 2)}

L'utente chiede questa modifica: "${editText.trim()}"

Applica la modifica mantenendo la stessa qualità premium. Contenuti sempre realistici per il mercato italiano. Palette cromatica coerente. Le sezioni disponibili sono: "hero_banner", "menu_list", "product_grid", "service_list", "stats_grid", "activity_feed", "gallery", "cta_banner", "booking", "contact", "pricing", "testimonials", "features". Restituisci il JSON completo aggiornato.`,
        response_json_schema: {
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
            sections: { type: "array", items: { type: "object", properties: { type: { type: "string" }, title: { type: "string" }, subtitle: { type: "string" }, items: { type: "array", items: { type: "object" } } } } },
            bottomNav: { type: "array", items: { type: "object", properties: { label: { type: "string" }, icon: { type: "string" }, active: { type: "boolean" } } } },
          },
        },
      });

      if (result?.sections) {
        setAppData(result);
        sessionStorage.setItem("simulatore_app_data", JSON.stringify(result));
        setEditText("");
        setEditOpen(false);
      }
    } catch (err) {
      console.error("Errore modifica:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!appData) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Nessuna anteprima disponibile.</p>
          <Link to="/SimulatoreApp" className="text-purple-400 underline text-sm">Torna al simulatore</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* App rendering fullscreen */}
      <div className="flex-1 overflow-y-auto">
        <DynamicAppRenderer data={appData} />
      </div>

      {/* Barra di modifica fissa in basso */}
      <div className="sticky bottom-0 z-50 bg-[#0a0a14] border-t border-white/10 backdrop-blur-xl">
        {editOpen ? (
          <div className="px-3 py-3 flex items-end gap-2">
            <button onClick={() => setEditOpen(false)} className="p-2 text-gray-500 hover:text-gray-300 shrink-0">
              <X className="w-5 h-5" />
            </button>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              placeholder="Descrivi la modifica... es: Aggiungi una sezione contatti, cambia colore in blu..."
              rows={2}
              className="flex-1 bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
              autoFocus
            />
            <button
              onClick={handleEdit}
              disabled={loading || !editText.trim()}
              className={`p-2.5 rounded-xl shrink-0 transition-all ${
                loading || !editText.trim() ? "bg-gray-700 text-gray-500" : "bg-purple-600 text-white hover:bg-purple-500"
              }`}
            >
              {loading ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        ) : (
          <div className="px-3 py-2.5 flex items-center gap-2">
            <Link to="/SimulatoreApp" className="p-2 text-gray-500 hover:text-gray-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setEditOpen(true)}
              className="flex-1 flex items-center gap-2 bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:border-purple-500/30 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Modifica il design...
            </button>
          </div>
        )}
      </div>
    </div>
  );
}