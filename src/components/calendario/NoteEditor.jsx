import React, { useState, useRef, useEffect } from 'react';
import { Check, Paperclip, X, ChevronDown, Folder, FolderPlus, Trash2, Pencil, Camera, ListChecks, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChecklistEditor from './ChecklistEditor';
import AttachmentViewer from './AttachmentViewer';
import AudioRecorder from './AudioRecorder';
import FileContextMenu from './FileContextMenu';

export default function NoteEditor({ selectedDate, selectedTime, onClose, onSave, onDelete, inline = false, existingNote = null, onRegisterSave, monthColor }) {
  const [title, setTitle] = useState(existingNote?.title || '');
  const [content, setContent] = useState(existingNote?.content || '');
  const [attachments, setAttachments] = useState(existingNote?.attachments || []);
  const [checklistItems, setChecklistItems] = useState(existingNote?.checklistItems || []);
  const [showChecklist, setShowChecklist] = useState(existingNote?.checklistItems?.length > 0 || false);
  const [isUploading, setIsUploading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [isDictating, setIsDictating] = useState(false);
  const [selectedCartella, setSelectedCartella] = useState(existingNote?.cartella_id || '');
  const [showCartellaDropdown, setShowCartellaDropdown] = useState(false);
  const [showNewFolderInline, setShowNewFolderInline] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#64748b');
  const [editingCartella, setEditingCartella] = useState(null);
  const [editCartellaName, setEditCartellaName] = useState('');
  const [editCartellaColor, setEditCartellaColor] = useState('#64748b');
  const [deleteCartellaConfirm, setDeleteCartellaConfirm] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  // Date/time editable inline
  const [noteDate, setNoteDate] = useState(() => {
    if (existingNote?.data) return existingNote.data;
    if (selectedDate) {
      const d = new Date(selectedDate);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    return '';
  });
  const [noteTime, setNoteTime] = useState(existingNote?.time || selectedTime || '');

  const queryClient = useQueryClient();
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const attachmentsRef = useRef(attachments);
  const checklistItemsRef = useRef(checklistItems);
  const cartellaRef = useRef(selectedCartella);
  const noteDateRef = useRef(noteDate);
  const noteTimeRef = useRef(noteTime);

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

  const FOLDER_COLORS = ['#f59e0b','#3b82f6','#ec4899','#22c55e','#a855f7','#ef4444','#06b6d4','#f97316','#14b8a6','#8b5cf6','#eab308','#64748b'];

  const createFolderMutation = useMutation({
    mutationFn: (data) => base44.entities.Cartella.create(data),
    onSuccess: (newCartella) => {
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
      setSelectedCartella(newCartella.id);
      setShowNewFolderInline(false);
      setShowCartellaDropdown(false);
      setNewFolderName('');
      setNewFolderColor('#f59e0b');
    }
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cartella.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
      setEditingCartella(null);
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id) => {
      const noteCollegate = await base44.entities.Nota.filter({ cartella_id: id, user_email: userEmail });
      for (const nota of noteCollegate) {
        await base44.entities.Nota.update(nota.id, { cartella_id: null });
      }
      const fileCollegati = await base44.entities.FileCartella.filter({ cartella_id: id, user_email: userEmail });
      for (const f of fileCollegati) {
        await base44.entities.FileCartella.delete(f.id);
      }
      return base44.entities.Cartella.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
      queryClient.invalidateQueries({ queryKey: ['note'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      setDeleteCartellaConfirm(null);
      setSelectedCartella('');
    }
  });

  titleRef.current = title;
  contentRef.current = content;
  attachmentsRef.current = attachments;
  checklistItemsRef.current = checklistItems;
  cartellaRef.current = selectedCartella;
  noteDateRef.current = noteDate;
  noteTimeRef.current = noteTime;

  React.useEffect(() => {
    if (onRegisterSave) {
      onRegisterSave(() => {
        if (!titleRef.current.trim()) return;
        if (onSave) {
          onSave({
            title: titleRef.current.trim(),
            content: contentRef.current,
            attachments: attachmentsRef.current,
            checklistItems: checklistItemsRef.current,
            cartella_id: cartellaRef.current || null,
            date: noteDateRef.current || selectedDate,
            time: noteTimeRef.current || '00:00'
          });
        }
      });
    }
  }, [onRegisterSave]);

  // Ascolta eventi strumenti dal popup esterno
  useEffect(() => {
    const handleCamera = () => cameraInputRef.current?.click();
    const handleAttach = () => fileInputRef.current?.click();
    const handleChecklist = () => {
      if (!showChecklist && checklistItems.length === 0) {
        setChecklistItems([{ id: Date.now().toString(), text: '', checked: false }]);
      }
      setShowChecklist(prev => !prev);
    };
    const handleDictation = (e) => {
      setContent(prev => prev ? prev + ' ' + e.detail : e.detail);
    };
    const handleAudio = (e) => {
      setAttachments(prev => [...prev, e.detail]);
    };

    document.addEventListener('calendar-tool-camera', handleCamera);
    document.addEventListener('calendar-tool-attach', handleAttach);
    document.addEventListener('calendar-tool-checklist', handleChecklist);
    document.addEventListener('calendar-tool-dictation', handleDictation);
    document.addEventListener('calendar-tool-audio', handleAudio);
    return () => {
      document.removeEventListener('calendar-tool-camera', handleCamera);
      document.removeEventListener('calendar-tool-attach', handleAttach);
      document.removeEventListener('calendar-tool-checklist', handleChecklist);
      document.removeEventListener('calendar-tool-dictation', handleDictation);
      document.removeEventListener('calendar-tool-audio', handleAudio);
    };
  }, [showChecklist, checklistItems.length]);

  const saveTime = noteTime || '00:00';

  const formattedDate = noteDate
    ? new Date(noteDate + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })
    : selectedDate
      ? new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })
      : '';

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setIsSaving(true);
    if (onSave) {
      onSave({
        title: title.trim(),
        content,
        attachments,
        checklistItems,
        cartella_id: selectedCartella || null,
        date: noteDate || selectedDate,
        time: saveTime
      });
    }
  };

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachments(prev => [...prev, { url: file_url, name: file.name, type: file.type }]);
    setIsUploading(false);
  };

  const toggleChecklist = () => {
    if (!showChecklist && checklistItems.length === 0) {
      setChecklistItems([{ id: Date.now().toString(), text: '', checked: false }]);
    }
    setShowChecklist(!showChecklist);
  };

  const cartColor = (() => {
    const cart = selectedCartella ? cartelle.find(c => c.id === selectedCartella) : null;
    return cart?.colore || '#64748b';
  })();

  return (
    <div className={cn(
      "bg-black flex flex-col",
      inline ? "h-full" : "fixed inset-0 z-[60]"
    )}
    style={{ touchAction: 'manipulation' }}
    >
      {/* Riga 1: Pallino colore + Info nota centrati */}
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="flex items-center justify-center gap-2 text-xs font-mono">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cartColor }} />
          <span style={{ color: cartColor }}>
            📄 {noteDate ? formattedDate : 'Nota senza data'} {noteTime ? `• ${noteTime}` : ''}
          </span>
        </div>
      </div>

      {/* Riga 2: Cestino | Salva | Penna | X */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        {existingNote && (
          <button
            onClick={() => {
              if (onDelete) setShowDeleteConfirm(true);
            }}
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
          style={{ backgroundColor: isSaving ? '#64748b' : cartColor, color: '#0f172a' }}
        >
          {isSaving ? (
            <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-3 h-3" strokeWidth={3} />
          )}
          SALVA
        </a>

        <button
          onClick={() => setShowCartellaDropdown(!showCartellaDropdown)}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0"
          style={{ backgroundColor: cartColor + '30' }}
        >
          <Pencil className="w-4 h-4" style={{ color: cartColor }} />
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        )}
      </div>

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

      {/* Riga 4: Data/Ora picker con ChevronDown */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800/50">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-1" style={{ borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
          <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
          <input
            type="date"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            className="bg-transparent text-xs font-medium outline-none flex-1 min-w-0"
            style={{ color: noteDate ? '#60a5fa' : '#3b82f6', colorScheme: 'dark' }}
          />
          <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: '#3b82f6' }} />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-1" style={{ borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <input
            type="time"
            value={noteTime}
            step="300"
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const [h, m] = val.split(':').map(Number);
                const rounded = Math.round(m / 5) * 5;
                const finalM = rounded === 60 ? 0 : rounded;
                const finalH = rounded === 60 ? (h + 1) % 24 : h;
                setNoteTime(`${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`);
              } else {
                setNoteTime('');
              }
            }}
            className="bg-transparent text-xs font-medium outline-none flex-1 min-w-0"
            style={{ color: noteTime ? '#c084fc' : '#a855f7', colorScheme: 'dark' }}
          />
          <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: '#a855f7' }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2 flex flex-col min-h-0 overflow-hidden">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(false); }}
          placeholder="Titolo"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck="false"
          enterKeyHint="done"
          data-form-type="other"
          data-lpignore="true"
          aria-autocomplete="none"
          className={cn(
            "w-full bg-transparent text-white font-light outline-none mb-2 truncate flex-shrink-0 text-base",
            titleError ? "placeholder:text-red-500 border-b-2 border-red-500" : "placeholder:text-slate-500"
          )}
          autoFocus
        />
        {titleError && (
          <span className="text-red-500 text-[10px] -mt-1 mb-1 block flex-shrink-0">Il titolo è obbligatorio</span>
        )}

        {!showChecklist && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Scrivi qui..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck="false"
            enterKeyHint="done"
            data-form-type="other"
            data-lpignore="true"
            aria-autocomplete="none"
            className="w-full flex-1 min-h-0 bg-transparent text-white text-sm outline-none placeholder:text-slate-600 resize-none overflow-y-auto"
          />
        )}

        {showChecklist && (
          <ChecklistEditor items={checklistItems} onChange={setChecklistItems} />
        )}

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

        {viewingAttachment && (
          <AttachmentViewer attachment={viewingAttachment} onClose={() => setViewingAttachment(null)} />
        )}

        {isUploading && (
          <div className="mt-2 text-xs text-slate-500 animate-pulse">Caricamento...</div>
        )}
      </div>

      {/* Popup conferma eliminazione */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-base mb-2">⚠️ Eliminare nota?</h3>
            <p className="text-slate-300 text-sm mb-1">
              <span className="font-semibold text-lime-400">{title || existingNote?.title}</span>
            </p>
            <p className="text-slate-400 text-xs mb-5">Questa azione non può essere annullata.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm">Annulla</button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  if (onDelete) onDelete(existingNote);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input nascosti per camera e file */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} className="hidden" />
      <input ref={fileInputRef} type="file" accept="*/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} className="hidden" />
    </div>
  );
}