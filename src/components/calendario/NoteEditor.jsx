import React, { useState, useRef } from 'react';
import { Check, Camera, Paperclip, ListChecks, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import ChecklistEditor from './ChecklistEditor';
import AudioRecorder from './AudioRecorder';

export default function NoteEditor({ selectedDate, selectedTime, onClose, onSave, inline = false, existingNote = null, onRegisterSave }) {
  const [title, setTitle] = useState(existingNote?.title || '');
  const [content, setContent] = useState(existingNote?.content || '');
  const [attachments, setAttachments] = useState(existingNote?.attachments || []);
  const [checklistItems, setChecklistItems] = useState(existingNote?.checklistItems || []);
  const [showChecklist, setShowChecklist] = useState(existingNote?.checklistItems?.length > 0 || false);
  const [isUploading, setIsUploading] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef(null);
  const dictationActiveRef = useRef(false);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const attachmentsRef = useRef(attachments);
  const checklistItemsRef = useRef(checklistItems);

  // Tieni aggiornati i ref
  titleRef.current = title;
  contentRef.current = content;
  attachmentsRef.current = attachments;
  checklistItemsRef.current = checklistItems;

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
            date: selectedDate,
            time: selectedTime || '00:00'
          });
        }
      });
    }
  }, [onRegisterSave]);

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

  const toggleDictation = (e) => {
    e.preventDefault();
    if (isDictating) {
      // Stop manuale: disattiva il flag per impedire il riavvio
      dictationActiveRef.current = false;
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Il tuo browser non supporta il riconoscimento vocale');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Testo base prima dell'inizio della dettatura corrente
    let baseText = contentRef.current || '';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        // Aggiorna la base con il testo confermato
        baseText = baseText ? baseText + ' ' + finalText.trim() : finalText.trim();
        setContent(baseText);
      }

      if (interimText) {
        // Mostra provvisorio dopo la base (verrà sostituito dal finale)
        setContent(baseText ? baseText + ' ' + interimText.trim() : interimText.trim());
      }
    };

    recognition.onerror = (ev) => {
      // "no-speech" e "aborted" non sono errori reali, riprova silenziosamente
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      dictationActiveRef.current = false;
      setIsDictating(false);
    };

    recognition.onend = () => {
      // Se l'utente vuole ancora dettare, riavvia senza che l'utente se ne accorga
      if (dictationActiveRef.current) {
        try {
          recognition.start();
        } catch {
          dictationActiveRef.current = false;
          setIsDictating(false);
        }
        return;
      }
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
    dictationActiveRef.current = true;
    recognition.start();
    setIsDictating(true);
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
      <div className="flex items-center justify-center px-3 py-2 border-b border-slate-800">
        <div className="text-slate-400 text-xs font-mono">
          {formattedDate} • {saveTime}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 py-2 overflow-y-auto">
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

        {/* Toolbar strumenti + salva inline */}
        <div className="flex items-center py-2 mb-2 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Camera className="w-5 h-5 text-slate-400" />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Paperclip className="w-5 h-5 text-slate-400" />
            </button>
            <button 
              onClick={toggleChecklist}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ListChecks className={cn("w-5 h-5", showChecklist ? "text-lime-400" : "text-slate-400")} />
            </button>
            <button 
              onTouchEnd={toggleDictation}
              onClick={toggleDictation}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                isDictating ? "bg-cyan-500/20 ring-2 ring-cyan-400" : "hover:bg-slate-800"
              )}
            >
              <Mic className={cn(
                "w-5 h-5 transition-colors",
                isDictating ? "text-cyan-400 animate-pulse" : "text-slate-400"
              )} />
            </button>
          </div>
          <div className="ml-auto pl-2">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); handleSave(); }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs no-underline touch-manipulation select-none",
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
          </div>
        </div>

        {/* Registratore audio */}
        <AudioRecorder
          onAudioSaved={(audioAtt) => {
            setAttachments(prev => [...prev, audioAtt]);
          }}
          onTranscription={(text) => {
            setContent(prev => prev ? prev + '\n' + text : text);
          }}
        />

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