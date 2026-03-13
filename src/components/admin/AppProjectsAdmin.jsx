import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Clock, ChevronRight, Loader2, ArrowLeft, CheckCircle, AlertCircle, FileCode, Trash2, Globe, CreditCard, Bell, MessageSquare, Copy, Download, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import DynamicAppRenderer from "../simulatore-app/DynamicAppRenderer";

const STATUS_CONFIG = {
  draft: { label: "Bozza", color: "bg-gray-500", textColor: "text-gray-400" },
  submitted: { label: "Inviato", color: "bg-blue-500", textColor: "text-blue-400" },
  in_progress: { label: "In lavorazione", color: "bg-amber-500", textColor: "text-amber-400" },
  completed: { label: "Completato", color: "bg-green-500", textColor: "text-green-400" },
};

export default function AppProjectsAdmin({ onBack }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPreview, setShowPreview] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["admin-app-projects"],
    queryFn: () => base44.entities.AppProject.list("-created_date"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.AppProject.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-app-projects"] });
      if (selectedProject) {
        setSelectedProject(prev => ({ ...prev, status: updateStatusMutation.variables.status }));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-app-projects"] });
      setSelectedProject(null);
    },
  });

  const filteredProjects = statusFilter === "all" ? projects : projects.filter(p => p.status === statusFilter);
  const submittedCount = projects.filter(p => p.status === "submitted").length;

  const handleSaveNotes = async () => {
    if (!selectedProject) return;
    setSavingNotes(true);
    await base44.entities.AppProject.update(selectedProject.id, { admin_notes: adminNotes });
    setSelectedProject(prev => ({ ...prev, admin_notes: adminNotes }));
    setSavingNotes(false);
  };

  const copyJsonToClipboard = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const downloadJson = (data, name) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "app"}_config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>;
  }

  // Detail view
  if (selectedProject) {
    let appData = null;
    try { appData = JSON.parse(selectedProject.current_data); } catch {}

    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedProject(null); setShowPreview(false); setShowJson(false); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Torna alla lista
        </button>

        {/* Info progetto */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-white font-bold text-lg">{selectedProject.app_name}</h3>
              <p className="text-slate-400 text-xs">{selectedProject.user_email}</p>
              <p className="text-slate-500 text-[10px] mt-1">
                Creato: {new Date(selectedProject.created_date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })} · v{selectedProject.current_version || 1}
              </p>
            </div>
            <Badge className={`${STATUS_CONFIG[selectedProject.status]?.color || "bg-gray-500"} text-white text-xs`}>
              {STATUS_CONFIG[selectedProject.status]?.label || selectedProject.status}
            </Badge>
          </div>

          {selectedProject.description && (
            <div className="bg-slate-900 rounded-lg p-3 mb-3">
              <p className="text-slate-300 text-xs">{selectedProject.description}</p>
            </div>
          )}

          {/* Cambio stato */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
            <span className="text-xs text-slate-400">Stato:</span>
            <Select value={selectedProject.status} onValueChange={(v) => updateStatusMutation.mutate({ id: selectedProject.id, status: v })}>
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="submitted">Inviato</SelectItem>
                <SelectItem value="in_progress">In lavorazione</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20 h-8 w-8 p-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border-slate-700">
                <AlertDialogHeader><AlertDialogTitle className="text-white">Eliminare questo progetto?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(selectedProject.id)}>Elimina</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Specifiche cliente */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
          <h4 className="text-white font-bold text-sm">📋 Specifiche del cliente</h4>

          {/* Dominio */}
          {selectedProject.dominio_richiesto && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900">
              <Globe className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Dominio richiesto</p>
                <p className="text-sm text-white font-semibold">{selectedProject.dominio_richiesto}</p>
              </div>
            </div>
          )}

          {/* Funzionalità richieste */}
          {selectedProject.features_requested?.length > 0 && (
            <div>
              <p className="text-xs text-amber-400 font-bold mb-2">⚙️ Funzionalità richieste:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedProject.features_requested.map((f, i) => (
                  <Badge key={i} className="bg-amber-500/20 text-amber-400 border-0 text-xs py-1 px-2.5">{f.replace(/_/g, " ")}</Badge>
                ))}
              </div>
            </div>
          )}

          {selectedProject.requires_payments && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2.5">
              <CreditCard className="w-4 h-4" /> Richiede integrazione pagamenti
            </div>
          )}
          {selectedProject.requires_api && (
            <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 rounded-lg p-2.5">
              <FileCode className="w-4 h-4" /> Richiede integrazione API esterne
            </div>
          )}

          {/* Note del cliente */}
          {selectedProject.note_cliente && (
            <div className="p-3 rounded-xl bg-slate-900">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Note del cliente</p>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedProject.note_cliente}</p>
            </div>
          )}

          {!selectedProject.dominio_richiesto && !selectedProject.features_requested?.length && !selectedProject.note_cliente && (
            <p className="text-xs text-slate-500 italic">Nessuna specifica aggiuntiva fornita dal cliente.</p>
          )}
        </div>

        {/* Azioni anteprima + JSON */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowPreview(!showPreview); setShowJson(false); }}
            className={`flex-1 border-purple-500 text-purple-400 hover:bg-purple-500/20 h-9 text-xs ${showPreview ? "bg-purple-500/20" : ""}`}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            {showPreview ? "Nascondi anteprima" : "Anteprima grafica"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowJson(!showJson); setShowPreview(false); }}
            className={`flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 h-9 text-xs ${showJson ? "bg-cyan-500/20" : ""}`}
          >
            <FileCode className="w-3.5 h-3.5 mr-1.5" />
            {showJson ? "Nascondi JSON" : "Vedi JSON"}
          </Button>
        </div>

        {/* Anteprima grafica */}
        {showPreview && appData && (
          <div className="rounded-2xl border border-slate-700 overflow-hidden" style={{ height: 500 }}>
            <div className="h-full overflow-y-auto">
              <DynamicAppRenderer data={appData} />
            </div>
          </div>
        )}

        {/* JSON viewer */}
        {showJson && appData && (
          <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
              <span className="text-xs text-slate-400">JSON configurazione app</span>
              <div className="flex gap-1.5">
                <button onClick={() => copyJsonToClipboard(appData)} className="text-[10px] text-cyan-400 bg-cyan-400/10 rounded-full px-2.5 py-1 hover:bg-cyan-400/20 flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Copia
                </button>
                <button onClick={() => downloadJson(appData, selectedProject.app_name)} className="text-[10px] text-green-400 bg-green-400/10 rounded-full px-2.5 py-1 hover:bg-green-400/20 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Scarica
                </button>
              </div>
            </div>
            <pre className="p-3 text-[10px] text-slate-300 overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
              {JSON.stringify(appData, null, 2)}
            </pre>
          </div>
        )}

        {/* Note admin */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h4 className="text-white font-bold text-sm mb-2">📝 Note admin</h4>
          <textarea
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            placeholder="Note interne sul progetto..."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/30 resize-none"
          />
          <Button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            size="sm"
            className="mt-2 bg-slate-700 hover:bg-slate-600 text-white h-8 text-xs"
          >
            {savingNotes ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
            Salva note
          </Button>
        </div>

        {/* Chat history */}
        {selectedProject.messages?.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h4 className="text-white font-bold text-sm mb-3">💬 Chat ({selectedProject.messages.length} messaggi)</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedProject.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                    msg.role === "user" ? "bg-purple-600/30 text-purple-200" : "bg-slate-700 text-slate-300"
                  }`}>
                    <p className="text-[11px]">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Progetti App</h3>
          <p className="text-slate-400 text-[10px]">{projects.length} totali · {submittedCount} da gestire</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="submitted">Inviati ({submittedCount})</SelectItem>
            <SelectItem value="in_progress">In lavorazione</SelectItem>
            <SelectItem value="completed">Completati</SelectItem>
            <SelectItem value="draft">Bozze</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-8"><p className="text-slate-500 text-sm">Nessun progetto</p></div>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map(p => {
            const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
            return (
              <button
                key={p.id}
                onClick={() => { setSelectedProject(p); setAdminNotes(p.admin_notes || ""); }}
                className="w-full text-left bg-slate-800 border border-slate-700 rounded-xl p-3 hover:bg-slate-700 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white truncate">{p.app_name}</p>
                      <span className={`w-2 h-2 rounded-full ${st.color}`} />
                    </div>
                    <p className="text-slate-400 text-[10px] truncate">{p.user_email}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                      <Clock className="w-3 h-3" />
                      {new Date(p.created_date).toLocaleDateString("it-IT")}
                      <span>· v{p.current_version || 1}</span>
                      {p.features_requested?.length > 0 && (
                        <span className="text-amber-400">· ⚙️ {p.features_requested.length}</span>
                      )}
                      {p.dominio_richiesto && (
                        <span className="text-blue-400">· 🌐</span>
                      )}
                      {p.note_cliente && (
                        <span className="text-purple-400">· 💬</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}