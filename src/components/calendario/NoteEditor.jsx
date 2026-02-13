import React, { useState, useRef, useEffect } from 'react';
import { Check, Paperclip, X, ChevronDown, Folder, FolderPlus, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChecklistEditor from './ChecklistEditor';
import AttachmentViewer from './AttachmentViewer';

export default function NoteEditor({ selectedDate, selectedTime, onClose, onSave, onDelete, inline = false, existingNote = null, onRegisterSave }) {
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
  const [selectedCartella, setSelectedCartella] = useState(existingNote?.cartella_id || '');
  const [showCartellaDropdown, setShowCartellaDropdown] = useState(false);
  const [showNewFolderInline, setShowNewFolderInline] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#f59e0b');
  const [editingCartella, setEditingCartella] = useState(null); // { id, nome, colore }
  const [editCartellaName, setEditCartellaName] = useState('');
  const [editCartellaColor, setEditCartellaColor] = useState('#f59e0b');
  const [deleteCartellaConfirm, setDeleteCartellaConfirm] = useState(null); // cartella id
  const [userEmail, setUserEmail] = useState(null);
  const queryClient = useQueryClient();
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const attachmentsRef = useRef(attachments);
  const checklistItemsRef = useRef(checklistItems);
  const cartellaRef = useRef(selectedCartella);

  // Carica utente
  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setUserEmail(user?.email);
    };
    loadUser();
  }, []);

  // Query cartelle
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

  // Tieni aggiornati i ref
  titleRef.current = title;
  contentRef.current = content;
  attachmentsRef.current = attachments;
  checklistItemsRef.current = checklistItems;
  cartellaRef.current = selectedCartella;

  // Registra la funzione di salvataggio per il parent
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
            date: selectedDate,
            time: selectedTime || '00:00'
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

  // L'orario da usare: quello selezionato dallo slot
  const saveTime = selectedTime || '00:00';

  const formattedDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('it-IT', { 
        weekday: 'short',
        day: 'numeric', 
        month: 'long' 
      })
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
        date: selectedDate,
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

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };



  return (
    <div className={cn(
      "bg-black flex flex-col",
      inline ? "h-full" : "fixed inset-0 z-[60]"
    )}>
      {/* Riga 1: Data e ora centrati */}
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="text-slate-400 text-xs font-mono text-center">
          {formattedDate} • {saveTime}
        </div>
      </div>

      {/* Riga 2: Cestino | Salva | X */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        {/* Cestino - sempre visibile a sinistra */}
        <button
          onClick={() => {
            if (existingNote && onDelete) setShowDeleteConfirm(true);
          }}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0",
            existingNote ? "bg-red-500/20 hover:bg-red-500/40" : "bg-slate-800/50"
          )}
        >
          <Trash2 className={cn("w-4 h-4", existingNote ? "text-red-400" : "text-slate-600")} />
        </button>

        {/* Salva - al centro, occupa tutto lo spazio */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleSave(); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-2 rounded-full font-bold text-xs no-underline touch-manipulation select-none",
            isSaving ? "bg-slate-500 text-slate-300" : "bg-lime-500 text-slate-900 active:bg-lime-400"
          )}
        >
          {isSaving ? (
            <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-3 h-3" strokeWidth={3} />
          )}
          SALVA
        </a>

        {/* X chiudi - a destra */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        )}
      </div>

      {/* Riga 3: Selettore cartella */}
      <div className="px-3 py-1 border-b border-slate-800/50 relative">
        <button
          onClick={() => setShowCartellaDropdown(!showCartellaDropdown)}
          className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors w-full"
        >
          {selectedCartella && cartelle.find(c => c.id === selectedCartella) ? (
            <>
              <div 
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: cartelle.find(c => c.id === selectedCartella)?.colore || '#64748b' }}
              />
              <span className="text-sm text-slate-200 truncate font-medium">
                {cartelle.find(c => c.id === selectedCartella)?.nome || 'Cartella'}
              </span>
            </>
          ) : (
            <>
              <Folder className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500">Nessuna cartella</span>
            </>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-slate-500 ml-auto transition-transform flex-shrink-0",
            showCartellaDropdown && "rotate-180"
          )} />
        </button>

        {showCartellaDropdown && (
          <div className="absolute left-3 right-3 top-full z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={() => { setSelectedCartella(''); setShowCartellaDropdown(false); setShowNewFolderInline(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-700 transition-colors",
                !selectedCartella ? "text-white" : "text-slate-400"
              )}
            >
              <X className="w-4 h-4" />
              Nessuna cartella
            </button>
            {cartelle.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCartella(c.id); setShowCartellaDropdown(false); setShowNewFolderInline(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-700 transition-colors",
                  selectedCartella === c.id ? "text-white" : "text-slate-400"
                )}
              >
                <div 
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: c.colore }}
                />
                {c.nome}
              </button>
            ))}
            {!showNewFolderInline ? (
              <button
                onClick={() => setShowNewFolderInline(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-lime-400 hover:bg-slate-700 transition-colors border-t border-slate-700"
              >
                <FolderPlus className="w-4 h-4" />
                Crea nuova cartella
              </button>
            ) : (
              <div className="px-3 py-2.5 border-t border-slate-700 space-y-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome cartella"
                  className="w-full bg-slate-700 text-white text-xs rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-lime-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFolderName.trim() && userEmail) {
                      createFolderMutation.mutate({ user_email: userEmail, nome: newFolderName.trim(), colore: newFolderColor });
                    }
                  }}
                />
                <div className="flex gap-1.5 flex-wrap">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewFolderColor(color)}
                      className={cn("w-5 h-5 rounded-full transition-all", newFolderColor === color && "ring-2 ring-white ring-offset-1 ring-offset-slate-800 scale-110")}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowNewFolderInline(false)} className="flex-1 text-[10px] py-1 rounded bg-slate-600 text-white">Annulla</button>
                  <button
                    onClick={() => {
                      if (newFolderName.trim() && userEmail) {
                        createFolderMutation.mutate({ user_email: userEmail, nome: newFolderName.trim(), colore: newFolderColor });
                      }
                    }}
                    disabled={!newFolderName.trim()}
                    className="flex-1 text-[10px] py-1 rounded bg-lime-500 text-slate-900 font-bold disabled:opacity-40"
                  >
                    Crea
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2 overflow-y-auto">
        {/* Titolo */}
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(false); }}
          placeholder="Titolo *"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          className={cn(
            "w-full bg-transparent text-white font-light outline-none mb-2 truncate",
            inline ? "text-base" : "text-3xl",
            titleError 
              ? "placeholder:text-red-500 border-b-2 border-red-500" 
              : "placeholder:text-slate-500"
          )}
          autoFocus
        />
        {titleError && (
          <span className="text-red-500 text-[10px] -mt-1 mb-1 block">Il titolo è obbligatorio</span>
        )}

        {/* Area testo libero */}
        {!showChecklist && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Scrivi qui..."
            className="w-full min-h-[120px] bg-transparent text-white text-sm outline-none placeholder:text-slate-600 resize-none"
          />
        )}

        {/* Checklist */}
        {showChecklist && (
          <ChecklistEditor items={checklistItems} onChange={setChecklistItems} />
        )}

        {/* Allegati */}
        {attachments.length > 0 && (
          <div className="mt-3 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase">Allegati</span>
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
                <button
                  onClick={() => setViewingAttachment(att)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  {att.type?.startsWith('image/') ? (
                    <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-slate-300 truncate">{att.name}</span>
                </button>
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 hover:bg-slate-700 rounded flex-shrink-0"
                >
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Viewer allegato a schermo intero */}
        {viewingAttachment && (
          <AttachmentViewer 
            attachment={viewingAttachment} 
            onClose={() => setViewingAttachment(null)} 
          />
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
            <p className="text-slate-400 text-xs mb-5">
              Questa azione non può essere annullata.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
              >
                Annulla
              </button>
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileAttach}
        className="hidden"
      />
    </div>
  );
}