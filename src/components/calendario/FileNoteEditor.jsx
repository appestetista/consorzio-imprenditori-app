import React, { useState, useRef, useEffect } from 'react';
import { Check, Paperclip, X, ChevronDown, Folder, FolderPlus, Trash2, Pencil, FileText, Camera, ListChecks, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChecklistEditor from './ChecklistEditor';
import AttachmentViewer from './AttachmentViewer';
import WhisperDictation from './WhisperDictation';
import AudioRecorder from './AudioRecorder';

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
  const [isDictating, setIsDictating] = useState(false);
  const [fileData, setFileData] = useState(file?.data || '');
  const [fileTime, setFileTime] = useState(file?.time || '');
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
      cartella_id: selectedCartella || null,
      data: fileData || null,
      time: fileTime || null
    });
  };

  const handleFileUpload = async (f) => {
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setAttachments(prev => [...prev, { url: file_url, name: f.name, type: f.type }]);
    setIsUploading(false);
  };

  const toggleChecklist = () => {
    if (!showChecklist && checklistItems.length === 0) {
      setChecklistItems([{ id: Date.now().toString(), text: '', checked: false }]);
    }
    setShowChecklist(!showChecklist);
  };

  const formattedDate = fileData
    ? new Date(fileData + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })
    : 'File senza data';

  const displayColor = fileColore || (() => {
    const cart = selectedCartella ? cartelle.find(c => c.id === selectedCartella) : null;
    return cart?.colore || '#64748b';
  })();

  return (
    <div className="flex flex-col fixed inset-0 z-[60]" style={{ backgroundColor: fileColore ? `color-mix(in srgb, ${fileColore} 15%, #000)` : '#000' }}>
      {/* Riga 1: Info file con pallino colore */}
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="flex items-center justify-center gap-2 text-xs font-mono">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: displayColor }} />
          <span style={{ color: displayColor }}>
            📄 {formattedDate} {fileTime ? `• ${fileTime}` : ''}
          </span>
        </div>
      </div>

      {/* Riga 2: Cestino | Salva | Colore file | X */}
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
          style={{ backgroundColor: isSaving ? '#64748b' : displayColor, color: '#0f172a' }}
        >
          {isSaving ? (
            <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-3 h-3" strokeWidth={3} />
          )}
          SALVA
        </a>

        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0"
          style={{ backgroundColor: fileColore ? fileColore + '30' : '#334155' }}
        >
          <FileText className="w-4 h-4" style={{ color: fileColore || '#64748b' }} />
        </button>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0"
        >
          <X className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Color picker inline */}
      {showColorPicker && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800/50 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => { setFileColore(''); setShowColorPicker(false); }}
            className={cn("w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all", !fileColore ? "border-white" : "border-slate-600")}
            style={{ backgroundColor: '#1e293b' }}
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
          {FILE_EDITOR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setFileColore(c); setShowColorPicker(false); }}
              className={cn("w-7 h-7 rounded-full flex-shrink-0 transition-all", fileColore === c && "ring-2 ring-white ring-offset-1 ring-offset-black scale-110")}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* Riga 3: Barra strumenti */}
      <div className="flex-shrink-0 flex items-center justify-around px-2 py-1.5 border-b border-slate-800/50">
        <button onClick={() => cameraInputRef.current?.click()} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-90">
          <Camera className="w-4 h-4 text-slate-300" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-90">
          <Paperclip className="w-4 h-4 text-slate-300" />
        </button>
        <button
          onClick={toggleChecklist}
          className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-90", showChecklist ? "bg-lime-500/30" : "bg-slate-800 hover:bg-slate-700")}
        >
          <ListChecks className={cn("w-4 h-4", showChecklist ? "text-lime-400" : "text-slate-300")} />
        </button>
        <WhisperDictation
          isDictating={isDictating}
          setIsDictating={setIsDictating}
          onTranscription={(text) => setContent(prev => prev ? prev + ' ' + text : text)}
        />
        <AudioRecorder
          onAudioSaved={(audioAtt) => setAttachments(prev => [...prev, audioAtt])}
        />
      </div>

      {/* Riga 4: Data/Ora picker */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800/50">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-1" style={{ borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
          <CalendarIcon className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
          <input
            type="date"
            value={fileData}
            onChange={(e) => setFileData(e.target.value)}
            className="bg-transparent text-xs font-medium outline-none flex-1 min-w-0"
            style={{ color: fileData ? '#60a5fa' : '#3b82f6', colorScheme: 'dark' }}
          />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-1" style={{ borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <input
            type="time"
            value={fileTime}
            step="300"
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const [h, m] = val.split(':').map(Number);
                const rounded = Math.round(m / 5) * 5;
                const finalM = rounded === 60 ? 0 : rounded;
                const finalH = rounded === 60 ? (h + 1) % 24 : h;
                setFileTime(`${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`);
              } else {
                setFileTime('');
              }
            }}
            className="bg-transparent text-xs font-medium outline-none flex-1 min-w-0"
            style={{ color: fileTime ? '#c084fc' : '#a855f7', colorScheme: 'dark' }}
          />
        </div>
        {fileData && (
          <button onClick={() => { setFileData(''); setFileTime(''); }} className="p-1 rounded-full hover:bg-slate-700 flex-shrink-0">
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
        <Pencil className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
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
            "w-full bg-transparent text-white text-base font-light outline-none mb-2 truncate flex-shrink-0",
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