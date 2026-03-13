import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2, Clock, ChevronRight } from "lucide-react";

export default function ProjectHistory({ userEmail, onSelectProject, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    base44.entities.AppProject.filter({ user_email: userEmail }, "-created_date", 50)
      .then(setProjects)
      .finally(() => setLoading(false));
  }, [userEmail]);

  const statusLabels = {
    draft: { label: "Bozza", color: "bg-gray-500" },
    submitted: { label: "Inviato", color: "bg-blue-500" },
    in_progress: { label: "In lavorazione", color: "bg-amber-500" },
    completed: { label: "Completato", color: "bg-green-500" },
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 max-w-lg mx-auto w-full py-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-white">I tuoi progetti</h2>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Nessun progetto ancora. Inizia a creare!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const st = statusLabels[p.status] || statusLabels.draft;
            return (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="w-full text-left rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/20 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white truncate">{p.app_name}</p>
                      <span className={`w-2 h-2 rounded-full ${st.color}`} />
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider">{st.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(p.created_date).toLocaleDateString("it-IT")}
                      <span>· v{p.current_version || 1}</span>
                      {p.features_requested?.length > 0 && (
                        <span className="text-purple-400">· {p.features_requested.length} funzionalità</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}