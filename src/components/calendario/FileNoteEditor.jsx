import React, { useState, useRef, useEffect } from 'react';
import { Check, Paperclip, X, ChevronDown, Folder, FolderPlus, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChecklistEditor from './ChecklistEditor';
import AttachmentViewer from './AttachmentViewer';

export default function FileNoteEditor({ file, onClose, onSave, onDelete, monthColor }) {
  const [title, setTitle] = useState(file?.titolo || '');
  const [content, setContent] = useState(file?.contenuto || '');
  const [attachments, setAttachments] = useState(file?.allegati || []);
  const [checklistItems, setChecklistItems] = useState(file?.checklist_items || []);
  const [showChecklist, setShowChecklist] = useState(file?.checklist_items?.length > 0 || false);
  const [isUploading, setIsUploading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [selectedCartella, setSelectedCartella] = useState(file?.cartella_id || '');
  const [showCartellaDropdown, setShowCartellaDropdown] = useState(false);
  const [fileColore, setFileColore] = useState(file?.colore || '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const queryClient = useQueryClient();
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setUserEmail(user?.email);
    };
    loadUser();
  }, []);

  const { data: cartelle = [] } = useQuery({
    queryKey: ['cartelle', userEmail],
    queryFn: () => base44.entities.Cartella.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const isNewFile = file?._isNew === true;

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isNewFile) {
        return base44.entities.FileCartella.create({ ...data, user_email: file.user_email });
      }
      return base44.entities.FileCartella.update(file.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella-day'] });
      queryClient.invalidateQueries({ queryKey: ['file-week'] });
      setIsSaving(false);
      if (onSave) onSave();
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.FileCartella.delete(file.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['file-week'] });
      if (onDelete) onDelete();
      onClose();
    }
  });

  const FILE_EDITOR_COLORS = [
    '#e8c4b0', '#c2185b', '#e65100', '#b8860b', '#1565c0', '#00838f',
    '#00897b', '#2e7d32', '#9c27b0', '#ad1457', '#827717', '#546e7a',
  ];

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setIsSaving(true);
    saveMutation.mutate({
      titolo: title.trim(),
      contenuto: content,
      colore: fileColore || null,
      allegati: attachments,
      checklist_items: checklistItems,
      cartella_id: selectedCartella || null
    });
  };

  const handleFileUpload = async (f) => {
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setAttachments(prev => [...prev, { url: file_url, name: f.name, type: f.type }]);
    setIsUploading(false);
  };

  const formattedDate = file?.data
    ? new Date(file.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })
    : 'File senza data';

  return (
    <div className="bg-black flex flex-col fixed inset-0 z-[60]">
      {/* Riga 1: Info file con pallino colore */}
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="flex items-center justify-center gap-2 text-xs font-mono">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: (() => {
              if (file?.colore && file.colore !== '#06b6d4') return file.colore;
              const cart = selectedCartella ? cartelle.find(c => c.id === selectedCartella) : null;
              return cart?.colore || '#64748b';
            })() }}
          />
          <span style={{ color: (() => {
            if (file?.colore && file.colore !== '#06b6d4') return file.colore;
            const cart = selectedCartella ? cartelle.find(c => c.id === selectedCartella) : null;
            return cart?.colore || '#64748b';
          })() }}>
            📄 {formattedDate} {file?.time ? `• ${file.time}` : ''}
          </span>
        </div>
      </div>

      {/* Riga 2: Cestino | Salva | X */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        {!isNewFile && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        )}

        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleSave(); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-2 rounded-full font-bold text-xs no-underline touch-manipulation select-none",
            isSaving && "opacity-60"
          )}
          style={{
            backgroundColor: isSaving ? '#64748b' : (() => {
              if (file?.colore && file.colore !== '#06b6d4') return file.colore;
              const cart = selectedCartella ? cartelle.find(c => c.id === selectedCartella) : null;
              return cart?.colore || '#64748b';
            })(),
            color: '#0f172a'
          }}
        >
          {isSaving ? (
            <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-3 h-3" strokeWidth={3} />
          )}
          SALVA
        </a>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0"
        >
          <X className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Riga 3: Selettore cartella */}
      <div className="px-3 py-1 border-b border-slate-800/50 relative">
        <button
          onClick={() => setShowCartellaDropdown(!showCartellaDropdown)}
          className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors w-full"
        >
          {selectedCartella && cartelle.find(c => c.id === selectedCartella) ? (
            <>
              <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: cartelle.find(c => c.id === selectedCartella)?.colore || '#64748b' }} />
              <span className="text-sm text-slate-200 truncate font-medium">
                {cartelle.find(c => c.id === selectedCartella)?.nome || 'Cartella'}
              </span>
            </>
          ) : (
            <>
              <Folder className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500">Nessuna cartella (standalone)</span>
            </>
          )}
          <ChevronDown className={cn("w-4 h-4 text-slate-500 ml-auto transition-transform flex-shrink-0", showCartellaDropdown && "rotate-180")} />
        </button>

        {showCartellaDropdown && (
          <div className="absolute left-3 right-3 top-full z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => { setSelectedCartella(''); setShowCartellaDropdown(false); }}
              className={cn("w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-700 transition-colors", !selectedCartella ? "text-white" : "text-slate-400")}
            >
              <X className="w-4 h-4" /> Nessuna cartella
            </button>
            {cartelle.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCartella(c.id); setShowCartellaDropdown(false); }}
                className={cn("w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-700 transition-colors", selectedCartella === c.id ? "text-white" : "text-slate-400")}
              >
                <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: c.colore }} />
                <span className="truncate">{c.nome}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2 flex flex-col min-h-0 overflow-hidden">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(false); }}
          placeholder="Titolo"
          autoComplete="off"
          className={cn(
            "w-full bg-transparent text-white text-3xl font-light outline-none mb-2 truncate flex-shrink-0",
            titleError ? "placeholder:text-red-500 border-b-2 border-red-500" : "placeholder:text-slate-500"
          )}
          autoFocus
        />
        {titleError && <span className="text-red-500 text-[10px] -mt-1 mb-1 block flex-shrink-0">Il titolo è obbligatorio</span>}

        {!showChecklist && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Scrivi qui..."
            className="w-full flex-1 min-h-0 bg-transparent text-white text-sm outline-none placeholder:text-slate-600 resize-none overflow-y-auto"
          />
        )}

        {showChecklist && <ChecklistEditor items={checklistItems} onChange={setChecklistItems} />}

        {attachments.length > 0 && (
          <div className="mt-3 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase">Allegati</span>
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
                <button onClick={() => setViewingAttachment(att)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  {att.type?.startsWith('image/') ? (
                    <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-slate-300 truncate">{att.name}</span>
                </button>
                <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-slate-700 rounded flex-shrink-0">
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {viewingAttachment && <AttachmentViewer attachment={viewingAttachment} onClose={() => setViewingAttachment(null)} />}
        {isUploading && <div className="mt-2 text-xs text-slate-500 animate-pulse">Caricamento...</div>}
      </div>

      {/* Popup conferma eliminazione */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-base mb-2">⚠️ Eliminare file?</h3>
            <p className="text-slate-300 text-sm mb-1">
              <span className="font-semibold text-cyan-400">{title || file?.titolo}</span>
            </p>
            <p className="text-slate-400 text-xs mb-5">Questa azione non può essere annullata.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm">Annulla</button>
              <button onClick={() => deleteMutation.mutate()} className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold">Elimina</button>
            </div>
          </div>
        </div>
      )}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} className="hidden" />
      <input ref={fileInputRef} type="file" accept="*/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} className="hidden" />
    </div>
  );
}