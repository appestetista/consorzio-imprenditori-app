import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FilePlus, FileText, X, GripVertical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const FILE_COLORS = [
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#f97316', // orange
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#eab308', // yellow
  '#64748b', // slate
];

export default function FileStrip({ userEmail, cartelle = [], onFileClick, onFileDragToFolder }) {
  const [draggedFile, setDraggedFile] = useState(null);
  const [dragOverCartella, setDragOverCartella] = useState(null);
  const [deleteFilePopup, setDeleteFilePopup] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null); // file id per cui scegliere colore
  const touchStartRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allFiles = [] } = useQuery({
    queryKey: ['standalone-files', userEmail],
    queryFn: async () => {
      const files = await base44.entities.FileCartella.filter({ user_email: userEmail });
      return files.filter(f => !f.cartella_id || f.cartella_id === '' || f.cartella_id === 'standalone');
    },
    enabled: !!userEmail
  });

  const createFileMutation = useMutation({
    mutationFn: (data) => base44.entities.FileCartella.create(data),
    onSuccess: (newFile) => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['file-week'] });
      if (onFileClick) onFileClick(newFile);
    }
  });

  const moveToFolderMutation = useMutation({
    mutationFn: ({ fileId, cartellaId }) => base44.entities.FileCartella.update(fileId, { cartella_id: cartellaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
    }
  });

  const updateColorMutation = useMutation({
    mutationFn: ({ fileId, colore }) => base44.entities.FileCartella.update(fileId, { colore }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      setShowColorPicker(null);
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId) => base44.entities.FileCartella.delete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['file-week'] });
      setDeleteFilePopup(null);
    }
  });

  const handleCreateFile = () => {
    if (!userEmail || createFileMutation.isPending) return;
    createFileMutation.mutate({
      user_email: userEmail,
      titolo: 'Nuovo file',
      contenuto: '',
      colore: '#06b6d4',
      cartella_id: null
    });
  };

  const hasFolders = cartelle.length > 0;

  const handleTouchStart = (e, file) => {
    if (!hasFolders) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, file, moved: false };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !hasFolders) return;
    const touch = e.touches[0];
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    if (dy > 15 && !touchStartRef.current.moved) {
      touchStartRef.current.moved = true;
      setDraggedFile(touchStartRef.current.file);
    }

    if (touchStartRef.current.moved) {
      e.preventDefault();
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const cartellaEl = el?.closest('[data-cartella-id]');
      if (cartellaEl) {
        setDragOverCartella(cartellaEl.dataset.cartellaId);
      } else {
        setDragOverCartella(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedFile && dragOverCartella) {
      moveToFolderMutation.mutate({ fileId: draggedFile.id, cartellaId: dragOverCartella });
      if (onFileDragToFolder) onFileDragToFolder(draggedFile.id, dragOverCartella);
    }
    setDraggedFile(null);
    setDragOverCartella(null);
    touchStartRef.current = null;
  };

  if (!userEmail) return null;

  return (
    <>
      {/* Fascia file orizzontale */}
      <div 
        className="flex items-center gap-3 px-2 pt-1 pb-1 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pulsante crea file */}
        <button
          onClick={handleCreateFile}
          disabled={createFileMutation.isPending}
          className="flex-shrink-0 flex flex-col items-center gap-0.5 px-1 py-0.5 transition-colors disabled:opacity-50"
        >
          <FilePlus className="w-6 h-6 text-cyan-400" />
          <span className="text-[9px] text-slate-400 font-medium">Nuovo</span>
        </button>

        {/* File standalone - stile icona nota con colore */}
        {allFiles.map((file) => {
          const fileColor = file.colore || '#06b6d4';
          const shortName = file.titolo?.length > 7 ? file.titolo.substring(0, 7) : file.titolo;

          return (
            <div
              key={file.id}
              className={cn(
                "flex-shrink-0 relative pt-2",
                draggedFile?.id === file.id && "opacity-40 scale-95"
              )}
            >
              {/* X per eliminare - sopra */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteFilePopup(file);
                }}
                className="absolute -top-0.5 -right-0.5 z-10 w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>

              <div
                className="flex flex-col items-center gap-0.5 cursor-pointer"
                onClick={() => {
                  if (!draggedFile) onFileClick?.(file);
                }}
                onTouchStart={(e) => handleTouchStart(e, file)}
              >
                {/* Icona nota colorata */}
                <div 
                  className="relative w-8 h-9 rounded-sm shadow-md flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(160deg, ${fileColor} 0%, ${fileColor}cc 100%)`,
                    boxShadow: `0 2px 6px ${fileColor}44`
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowColorPicker(file.id);
                  }}
                >
                  {/* Angolo piegato */}
                  <div 
                    className="absolute top-0 right-0 w-2 h-2"
                    style={{
                      background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)',
                      borderBottomLeftRadius: '2px'
                    }}
                  />
                  {/* Linee testo finte */}
                  <div className="flex flex-col gap-[2px] items-center">
                    <div className="w-4 h-[1.5px] rounded-full bg-white/40" />
                    <div className="w-3 h-[1.5px] rounded-full bg-white/30" />
                    <div className="w-4 h-[1.5px] rounded-full bg-white/25" />
                  </div>
                  {hasFolders && (
                    <GripVertical className="absolute bottom-0.5 right-0 w-2.5 h-2.5 text-white/30" />
                  )}
                </div>

                {/* Nome file - max 7 lettere */}
                <span className="text-[9px] text-slate-300 font-medium text-center leading-tight max-w-[40px] truncate">
                  {shortName}
                </span>
              </div>

              {/* Color picker inline */}
              {showColorPicker === file.id && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg p-2 shadow-xl">
                  <div className="grid grid-cols-4 gap-1.5">
                    {FILE_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateColorMutation.mutate({ fileId: file.id, colore: c });
                        }}
                        className={cn(
                          "w-5 h-5 rounded-full transition-all",
                          fileColor === c && "ring-2 ring-white ring-offset-1 ring-offset-slate-800 scale-110"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowColorPicker(null); }}
                    className="mt-1.5 w-full text-[9px] text-slate-400 text-center"
                  >
                    Chiudi
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Indicatore drag attivo */}
      {draggedFile && (
        <div className="px-2 pb-1">
          <div className="text-[9px] text-cyan-400 text-center animate-pulse">
            ↓ Trascina su una cartella per spostare "{draggedFile.titolo}"
          </div>
        </div>
      )}

      {/* Popup conferma eliminazione file */}
      {deleteFilePopup && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={() => setDeleteFilePopup(null)}>
          <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-base mb-2">⚠️ Eliminare file?</h3>
            <p className="text-slate-300 text-sm mb-1">
              <span className="font-semibold text-cyan-400">{deleteFilePopup.titolo}</span>
            </p>
            <p className="text-slate-400 text-xs mb-5">Questa azione non può essere annullata.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteFilePopup(null)} 
                className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
              >
                Annulla
              </button>
              <button 
                onClick={() => deleteFileMutation.mutate(deleteFilePopup.id)} 
                disabled={deleteFileMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-semibold disabled:opacity-50"
              >
                {deleteFileMutation.isPending ? 'Elimino...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}