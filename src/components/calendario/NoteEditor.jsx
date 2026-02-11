import React, { useState, useRef } from 'react';
import { ChevronLeft, Check, Camera, Paperclip, ListChecks, AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import ChecklistEditor from './ChecklistEditor';

export default function NoteEditor({ selectedDate, selectedTime, onClose, onSave, inline = false, existingNote = null }) {
  const [title, setTitle] = useState(existingNote?.title || '');
  const [content, setContent] = useState(existingNote?.content || '');
  const [attachments, setAttachments] = useState(existingNote?.attachments || []);
  const [checklistItems, setChecklistItems] = useState(existingNote?.checklistItems || []);
  const [showChecklist, setShowChecklist] = useState(existingNote?.checklistItems?.length > 0 || false);
  const [isUploading, setIsUploading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const toggleChecklist = () => {
    if (!showChecklist && checklistItems.length === 0) {
      setChecklistItems([{ id: Date.now().toString(), text: '', checked: false }]);
    }
    setShowChecklist(!showChecklist);
  };

  return (
    <div className={cn(
      "bg-black flex flex-col",
      inline ? "h-full" : "fixed inset-0 z-[60]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <button onClick={onClose} className="p-1">
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="text-slate-400 text-xs font-mono">
          {formattedDate} • {currentTime}
        </div>
        <button 
          onTouchEnd={(e) => { e.preventDefault(); handleSave(); }}
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all touch-manipulation",
            isSaving ? "bg-slate-500 animate-pulse" : "bg-lime-500 active:bg-lime-600 active:scale-90"
          )}
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5 text-slate-900" strokeWidth={3} />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2 overflow-y-auto">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(false); }}
          placeholder="Titolo *"
          className={cn(
            "w-full bg-transparent text-white font-light outline-none mb-2",
            inline ? "text-xl" : "text-3xl",
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
                {att.type?.startsWith('image/') ? (
                  <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <Paperclip className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs text-slate-300 truncate flex-1">{att.name}</span>
              </div>
            ))}
          </div>
        )}

        {isUploading && (
          <div className="mt-2 text-xs text-slate-500 animate-pulse">Caricamento...</div>
        )}
      </div>

      {/* Footer - 4 pulsanti */}
      <div className="flex items-center justify-center gap-6 py-2 border-t border-slate-800">
        {/* Fotocamera */}
        <button 
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center gap-0.5"
        >
          <Camera className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] text-slate-400">Foto</span>
        </button>
        
        {/* Allega */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-0.5"
        >
          <Paperclip className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] text-slate-400">Allega</span>
        </button>

        {/* Elenco */}
        <button 
          onClick={toggleChecklist}
          className="flex flex-col items-center gap-0.5"
        >
          <ListChecks className={cn("w-5 h-5", showChecklist ? "text-lime-400" : "text-slate-400")} />
          <span className={cn("text-[10px]", showChecklist ? "text-lime-400" : "text-slate-400")}>Elenco</span>
        </button>
        
        {/* Registra */}
        <button className="flex flex-col items-center gap-0.5">
          <AudioLines className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] text-slate-400">Registra</span>
        </button>
      </div>

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