import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, FileText, Camera, Paperclip, ListChecks, Check, Calendar as CalendarIcon, ChevronLeft, Trash2, Folder, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChecklistEditor from './ChecklistEditor';
import AttachmentViewer from './AttachmentViewer';
import AudioRecorder from './AudioRecorder';
import WhisperDictation from './WhisperDictation';
import FileContextMenu from './FileContextMenu.jsx';

function FileEditor({ file, cartellaId, cartelle = [], userEmail, onClose, onSaved }) {
  const [titolo, setTitolo] = useState(file?.titolo || '');
  const [contenuto, setContenuto] = useState(file?.contenuto || '');
  const [data, setData] = useState(file?.data || '');
  const [time, setTime] = useState(file?.time || '');
  const [allegati, setAllegati] = useState(file?.allegati || []);
  const [checklistItems, setChecklistItems] = useState(file?.checklist_items || []);
  const [showChecklist, setShowChecklist] = useState((file?.checklist_items || []).length > 0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [isDictating, setIsDictating] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (fileData) => {
      if (file?.id) {
        return base44.entities.FileCartella.update(file.id, fileData);
      } else {
        return base44.entities.FileCartella.create(fileData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileCartella', cartellaId] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella-day'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['file-week'] });
      setIsSaving(false);
      if (onSaved) onSaved();
    }
  });

  const handleSave = () => {
    if (!titolo.trim()) return;
    setIsSaving(true);
    saveMutation.mutate({
      user_email: userEmail,
      cartella_id: cartellaId,
      titolo: titolo.trim(),
      contenuto,
      data: data || null,
      time: time || null,
      allegati,
      checklist_items: checklistItems
    });
  };

  const handleFileUpload = async (f) => {
    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
    setAllegati(prev => [...prev, { url: file_url, name: f.name, type: f.type }]);
    setIsUploading(false);
  };

  const toggleChecklist = () => {
    if (!showChecklist && checklistItems.length === 0) {
      setChecklistItems([{ id: Date.now().toString(), text: '', checked: false }]);
    }
    setShowChecklist(!showChecklist);
  };

  const handleContextSave = (contextData) => {
    if (contextData.titolo) setTitolo(contextData.titolo);
    if (contextData.data !== undefined) setData(contextData.data || '');
    if (contextData.time !== undefined) setTime(contextData.time || '');
    setShowContextMenu(false);
  };

  // Colore del file
  const fileColor = file?.colore && file.colore !== '#06b6d4' ? file.colore : '#64748b';

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Riga 1: Pallino colore + Data e ora centrati */}
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="flex items-center justify-center gap-2 text-xs font-mono">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: fileColor }} />
          <span style={{ color: fileColor }}>
            {data 
              ? new Date(data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })
              : 'File senza data'
            }
            {time ? ` • ${time}` : ''}
          </span>
        </div>
      </div>

      {/* Riga 2: Cestino | Salva | X */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-800/50 flex items-center justify-center active:scale-90 transition-all touch-manipulation flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </button>

        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleSave(); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1 py-2 rounded-full font-bold text-xs no-underline touch-manipulation select-none",
            isSaving && "opacity-60"
          )}
          style={{ 
            backgroundColor: isSaving ? '#64748b' : fileColor,
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

      {/* Riga 3: Data/Ora picker + Penna modifica */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800/50">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border" style={{ borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
          <CalendarIcon className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="bg-transparent text-xs font-medium outline-none"
            style={{ color: data ? '#60a5fa' : '#3b82f6', colorScheme: 'dark' }}
          />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border" style={{ borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <input
            type="time"
            value={time}
            step="300"
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const [h, m] = val.split(':').map(Number);
                const rounded = Math.round(m / 5) * 5;
                const finalM = rounded === 60 ? 0 : rounded;
                const finalH = rounded === 60 ? (h + 1) % 24 : h;
                setTime(`${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`);
              } else {
                setTime('');
              }
            }}
            className="bg-transparent text-xs font-medium outline-none"
            style={{ color: time ? '#c084fc' : '#a855f7', colorScheme: 'dark' }}
          />
        </div>
        {data && (
          <button onClick={() => { setData(''); setTime(''); }} className="p-1 rounded-full hover:bg-slate-700">
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
        {/* Penna per aprire modifica colori/cartella/promemoria */}
        {file?.id && (
          <button
            onClick={() => setShowContextMenu(true)}
            className="ml-auto w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center active:scale-90 transition-all"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-300" />
          </button>
        )}
      </div>

      {/* Titolo */}
      <div className="px-3 pt-2">
        <input
          type="text"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          placeholder="Titolo file *"
          className="w-full bg-transparent text-white font-light text-base outline-none placeholder:text-slate-500 truncate"
          autoFocus
        />
      </div>

      {/* Contenuto */}
      <div className="flex-1 px-3 py-2 overflow-y-auto">
        {!showChecklist && (
          <textarea
            value={contenuto}
            onChange={(e) => setContenuto(e.target.value)}
            placeholder="Scrivi qui..."
            className="w-full min-h-[120px] bg-transparent text-white text-sm outline-none placeholder:text-slate-600 resize-none"
          />
        )}

        {showChecklist && (
          <ChecklistEditor items={checklistItems} onChange={setChecklistItems} />
        )}

        {allegati.length > 0 && (
          <div className="mt-3 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase">Allegati</span>
            {allegati.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
                <button onClick={() => setViewingAttachment(att)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  {att.type?.startsWith('image/') ? (
                    <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-slate-300 truncate">{att.name}</span>
                </button>
                <button onClick={() => setAllegati(prev => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-slate-700 rounded flex-shrink-0">
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

      {/* Barra strumenti in basso - stile calendario inline */}
      <div className="flex-shrink-0 flex items-center justify-around px-2 py-1.5 border-t border-slate-800 bg-black">
        <button onClick={() => cameraRef.current?.click()} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-90">
          <Camera className="w-4 h-4 text-slate-300" />
        </button>
        <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-90">
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
          onTranscription={(text) => setContenuto(prev => prev ? prev + ' ' + text : text)}
        />
        <AudioRecorder
          onAudioSaved={(audioAtt) => setAllegati(prev => [...prev, audioAtt])}
          onTranscription={(text) => setContenuto(prev => prev ? prev + '\n' + text : text)}
        />
      </div>

      {/* FileContextMenu per modifica colore/cartella/promemoria */}
      {showContextMenu && file && (
        <FileContextMenu
          file={{ ...file, titolo, data, time }}
          cartelle={cartelle}
          onSave={handleContextSave}
          onClose={() => setShowContextMenu(false)}
        />
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" />
      <input ref={fileRef} type="file" accept="*/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" />
    </div>
  );
}

const FOLDER_COLORS = [
  '#f59e0b', '#3b82f6', '#ec4899', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#f97316',
  '#14b8a6', '#8b5cf6', '#eab308', '#64748b', '#be185d', '#0ea5e9', '#84cc16', '#78716c',
];

export default function CartellaView({ cartella, userEmail, onClose }) {
  const [editingName, setEditingName] = useState(false);
  const [folderName, setFolderName] = useState(cartella.nome);
  const [folderColor, setFolderColor] = useState(cartella.colore);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [openFile, setOpenFile] = useState(null); // file aperto per modifica
  const [showNewFile, setShowNewFile] = useState(false);
  const [deleteFileConfirm, setDeleteFileConfirm] = useState(null);
  const [openNota, setOpenNota] = useState(null); // nota aperta per visualizzazione
  const queryClient = useQueryClient();

  // Query file della cartella
  const { data: files = [] } = useQuery({
    queryKey: ['fileCartella', cartella.id],
    queryFn: () => base44.entities.FileCartella.filter({ cartella_id: cartella.id, user_email: userEmail }),
    enabled: !!cartella.id && !!userEmail
  });

  // Query note salvate con questa cartella_id
  const { data: noteInCartella = [] } = useQuery({
    queryKey: ['noteCartella', cartella.id],
    queryFn: () => base44.entities.Nota.filter({ cartella_id: cartella.id, user_email: userEmail }),
    enabled: !!cartella.id && !!userEmail
  });

  // Combina file e note in un'unica lista
  const allItems = [
    ...files.map(f => ({ ...f, _type: 'file' })),
    ...noteInCartella.map(n => ({ 
      ...n, 
      _type: 'nota',
      titolo: n.title,
      allegati: n.attachments,
      checklist_items: n.checklist_items
    }))
  ];

  // Mutation aggiorna cartella (nome e/o colore)
  const updateCartellaMutation = useMutation({
    mutationFn: (data) => base44.entities.Cartella.update(cartella.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
      setEditingName(false);
      setShowColorPicker(false);
    }
  });

  // Alias per retrocompatibilità
  const updateNameMutation = { mutate: (nome) => updateCartellaMutation.mutate({ nome }) };

  // Mutation elimina file
  const deleteFileMutation = useMutation({
    mutationFn: (id) => base44.entities.FileCartella.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileCartella', cartella.id] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella-day'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['file-week'] });
      setDeleteFileConfirm(null);
    }
  });

  const handleNameSave = () => {
    if (folderName.trim() && folderName.trim() !== cartella.nome) {
      updateNameMutation.mutate(folderName.trim());
    } else {
      setEditingName(false);
    }
  };

  // Se un file è aperto, mostra l'editor
  if (openFile || showNewFile) {
    return (
      <FileEditor
        file={openFile}
        cartellaId={cartella.id}
        userEmail={userEmail}
        onClose={() => { setOpenFile(null); setShowNewFile(false); }}
        onSaved={() => { setOpenFile(null); setShowNewFile(false); }}
      />
    );
  }

  // Se una nota è aperta, mostra la vista di sola lettura
  if (openNota) {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex items-center px-3 py-2 border-b border-slate-800 gap-2">
          <button onClick={() => setOpenNota(null)} className="p-1">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <span className="text-[9px] text-lime-500 bg-lime-500/10 px-1.5 py-0.5 rounded-full">nota</span>
          <span className="text-white font-light text-base truncate flex-1">{openNota.title}</span>
        </div>
        {/* Data e ora */}
        {openNota.data && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800/50">
            <CalendarIcon className="w-3.5 h-3.5 text-lime-400" />
            <span className="text-xs text-slate-300">
              {new Date(openNota.data).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
              {openNota.time && ` • ${openNota.time}`}
            </span>
          </div>
        )}
        <div className="flex-1 px-3 py-3 overflow-y-auto">
          {/* Contenuto testuale */}
          {openNota.content && (
            <p className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{openNota.content}</p>
          )}
          {/* Checklist */}
          {openNota.checklist_items?.length > 0 && (
            <div className="space-y-1.5 mb-4">
              <span className="text-[10px] text-slate-500 uppercase">Checklist</span>
              {openNota.checklist_items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                    item.checked ? "bg-lime-500 border-lime-500" : "border-slate-600"
                  )}>
                    {item.checked && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                  </div>
                  <span className={cn("text-sm", item.checked ? "text-slate-500 line-through" : "text-slate-300")}>{item.text}</span>
                </div>
              ))}
            </div>
          )}
          {/* Allegati */}
          {openNota.attachments?.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Allegati</span>
              {openNota.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-800 rounded px-2 py-1">
                  {att.type?.startsWith('image/') ? (
                    <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-slate-300 truncate">{att.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header con nome cartella modificabile */}
      <div className="flex items-center px-3 py-3 border-b border-slate-800 gap-2 relative">
        <button onClick={onClose} className="p-1">
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <button 
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="flex-shrink-0 hover:opacity-80 transition-all"
        >
          <Folder className="w-6 h-6" style={{ color: folderColor, fill: folderColor }} />
        </button>
        {editingName ? (
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
            className="flex-1 bg-transparent text-white font-semibold text-lg outline-none border-b border-lime-400"
            autoFocus
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="flex-1 text-left">
            <span className="text-white font-semibold text-lg">{folderName}</span>
          </button>
        )}

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div className="absolute left-10 top-full z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 mt-1">
            <div className="grid grid-cols-8 gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setFolderColor(color);
                    updateCartellaMutation.mutate({ colore: color });
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all",
                    folderColor === color && "ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista file + note */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {allItems.length === 0 && (
          <div className="text-center py-10">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nessun file</p>
            <p className="text-slate-600 text-xs">Premi + per aggiungere</p>
          </div>
        )}

        {allItems.map((item) => {
          const isNota = item._type === 'nota';
          const displayDate = isNota ? item.data : item.data;
          const displayTime = isNota ? item.time : item.time;

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/60 transition-colors mb-1"
            >
              <button 
                onClick={() => isNota ? setOpenNota(item) : setOpenFile(item)} 
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                {isNota ? (
                  <FileText className="w-4 h-4 flex-shrink-0 text-lime-400" />
                ) : (
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: cartella.colore }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-white block truncate">{item.titolo}</span>
                    {isNota && (
                      <span className="text-[9px] text-lime-500 bg-lime-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">nota</span>
                    )}
                  </div>
                  {displayDate && (
                    <span className="text-[10px] text-slate-500">
                      📅 {new Date(displayDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      {displayTime && ` • ${displayTime}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.allegati?.length > 0 && (
                    <Paperclip className="w-3 h-3 text-slate-500" />
                  )}
                  {item.checklist_items?.length > 0 && (
                    <ListChecks className="w-3 h-3 text-slate-500" />
                  )}
                </div>
              </button>
              {!isNota && (
                <button
                  onClick={() => setDeleteFileConfirm(item)}
                  className="p-1.5 rounded-full hover:bg-red-500/20 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pulsante + nuovo file */}
      <div className="px-3 py-3 border-t border-slate-800">
        <button
          onClick={() => setShowNewFile(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors"
          style={{ backgroundColor: `${cartella.colore}20` }}
        >
          <Plus className="w-4 h-4" style={{ color: cartella.colore }} />
          <span className="text-sm font-medium" style={{ color: cartella.colore }}>Nuovo file</span>
        </button>
      </div>

      {/* Popup conferma eliminazione file */}
      {deleteFileConfirm && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={() => setDeleteFileConfirm(null)}>
          <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-base mb-2">⚠️ Eliminare file?</h3>
            <p className="text-slate-300 text-sm mb-1">
              <span className="font-semibold" style={{ color: cartella.colore }}>{deleteFileConfirm.titolo}</span>
            </p>
            <p className="text-slate-400 text-xs mb-5">Questa azione non può essere annullata.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteFileConfirm(null)} className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm">
                Annulla
              </button>
              <button onClick={() => deleteFileMutation.mutate(deleteFileConfirm.id)} className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold">
                Elimina
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}