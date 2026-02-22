import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FilePlus, FileText, X, GripVertical, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import FileContextMenu from './FileContextMenu.jsx';

export default function FileStrip({ userEmail, cartelle = [], onFileClick, onFileDragToFolder }) {
  const [draggedFile, setDraggedFile] = useState(null);
  const [dragOverCartella, setDragOverCartella] = useState(null);
  const [dragClonePos, setDragClonePos] = useState(null); // {x, y} per clone visivo
  const [deleteFilePopup, setDeleteFilePopup] = useState(null);
  // Context menu (long press)
  const [contextFile, setContextFile] = useState(null);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });


  const touchStartRef = useRef(null);
  const longPressTimerRef = useRef(null);
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

  const updateFileMutation = useMutation({
    mutationFn: ({ fileId, data }) => base44.entities.FileCartella.update(fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId) => base44.entities.FileCartella.delete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      setDeleteFilePopup(null);
    }
  });

  const handleCreateFile = () => {
    if (!userEmail) return;
    // Apri l'editor con un file temporaneo (non ancora salvato nel DB)
    if (onFileClick) {
      onFileClick({
        _isNew: true,
        user_email: userEmail,
        titolo: '',
        contenuto: '',
        colore: '#06b6d4',
        cartella_id: null
      });
    }
  };

  const hasFolders = cartelle.length > 0;

  // --- Touch drag handlers (solo drag, niente long press per menu) ---
  const handleTouchStart = useCallback((e, file) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, file, moved: false };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    // Inizia drag se si muove abbastanza e ci sono cartelle
    if ((dx > 10 || dy > 10) && hasFolders && !touchStartRef.current.moved) {
      touchStartRef.current.moved = true;
      if (navigator.vibrate) navigator.vibrate(20);
      setDraggedFile(touchStartRef.current.file);
    }

    if (touchStartRef.current.moved) {
      e.preventDefault();
      setDragClonePos({ x: touch.clientX, y: touch.clientY });

      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const cartellaEl = el?.closest('[data-cartella-id]');
      const newId = cartellaEl ? cartellaEl.dataset.cartellaId : null;
      if (newId !== dragOverCartella) {
        setDragOverCartella(newId);
        document.dispatchEvent(new CustomEvent('file-drag-over-folder', { detail: { cartellaId: newId } }));
      }
    }
  }, [hasFolders]);

  const handleTouchEnd = useCallback(() => {
    if (draggedFile && dragOverCartella) {
      moveToFolderMutation.mutate({ fileId: draggedFile.id, cartellaId: dragOverCartella });
      if (onFileDragToFolder) onFileDragToFolder(draggedFile.id, dragOverCartella);
    }
    // Reset folder highlight
    document.dispatchEvent(new CustomEvent('file-drag-over-folder', { detail: { cartellaId: null } }));
    setDraggedFile(null);
    setDragOverCartella(null);
    setDragClonePos(null);
    touchStartRef.current = null;
  }, [draggedFile, dragOverCartella, moveToFolderMutation, onFileDragToFolder]);

  // Context menu save
  const handleContextSave = (data) => {
    if (!contextFile) return;
    updateFileMutation.mutate({ fileId: contextFile.id, data });
    setContextFile(null);
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

        {/* File standalone - stile icona nota */}
        {allFiles.map((file) => {
          const defaultColor = '#06b6d4';
          const hasCustomColor = file.colore && file.colore !== defaultColor;
          const fileColor = hasCustomColor ? file.colore : null;
          const shortName = file.titolo?.length > 7 ? file.titolo.substring(0, 7) : file.titolo;

          return (
            <div
              key={file.id}
              className={cn(
                "flex-shrink-0 relative pt-2",
                draggedFile?.id === file.id && "opacity-30 scale-90 transition-all duration-200"
              )}
            >
              {/* X per eliminare - in alto a destra */}
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
                  className="flex flex-col items-center gap-0 cursor-pointer"
                  onClick={() => {
                    if (!draggedFile && !contextFile) onFileClick?.(file);
                  }}
                  onTouchStart={(e) => handleTouchStart(e, file)}
                >
                  {/* Icona nota - grigio di default, colore personalizzato se impostato */}
                  <div 
                    className="relative w-8 h-9 rounded-sm shadow-md flex items-center justify-center"
                    style={{ 
                      background: fileColor 
                        ? `linear-gradient(160deg, ${fileColor} 0%, ${fileColor}cc 100%)`
                        : 'linear-gradient(160deg, #64748b 0%, #475569 100%)',
                      boxShadow: fileColor 
                        ? `0 2px 6px ${fileColor}40`
                        : '0 2px 6px rgba(71,85,105,0.3)'
                    }}
                  >
                    <div 
                      className="absolute top-0 right-0 w-2 h-2"
                      style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)', borderBottomLeftRadius: '2px' }}
                    />
                    <div className="flex flex-col gap-[2px] items-center">
                      <div className="w-4 h-[1.5px] rounded-full bg-white/40" />
                      <div className="w-3 h-[1.5px] rounded-full bg-white/30" />
                      <div className="w-4 h-[1.5px] rounded-full bg-white/25" />
                    </div>
                    {hasFolders && (
                      <GripVertical className="absolute bottom-0.5 right-0 w-2.5 h-2.5 text-white/30" />
                    )}
                  </div>

                  {/* Nome max 7 */}
                  <span className="text-[9px] text-slate-300 font-medium text-center leading-tight max-w-[40px] truncate">
                    {shortName}
                  </span>

                  {/* Linguetta modifica sotto il nome */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextFile(file);
                    }}
                    className="flex items-center justify-center rounded-b-md shadow-md"
                    style={{
                      width: '24px',
                      height: '12px',
                      background: '#ffffff',
                      borderTop: '1px solid rgba(0,0,0,0.1)',
                      marginTop: '1px',
                    }}
                  >
                    <Pencil className="w-2 h-2 text-black" />
                  </button>
                </div>
            </div>
          );
        })}
      </div>

      {/* Clone visivo durante il drag */}
      {draggedFile && dragClonePos && ReactDOM.createPortal(
        <div
          className="fixed z-[9997] pointer-events-none"
          style={{
            left: `${dragClonePos.x - 16}px`,
            top: `${dragClonePos.y - 18}px`,
            transition: 'none'
          }}
        >
          <div 
            className="w-8 h-9 rounded-sm shadow-2xl flex items-center justify-center opacity-80"
            style={{ 
              background: 'linear-gradient(160deg, #64748b 0%, #475569 100%)',
              boxShadow: '0 8px 25px rgba(71,85,105,0.4)',
              transform: 'scale(1.2) rotate(-5deg)'
            }}
          >
            <div className="flex flex-col gap-[2px] items-center">
              <div className="w-4 h-[1.5px] rounded-full bg-white/40" />
              <div className="w-3 h-[1.5px] rounded-full bg-white/30" />
              <div className="w-4 h-[1.5px] rounded-full bg-white/25" />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Indicatore drag */}
      {draggedFile && !dragOverCartella && (
        <div className="px-2 pb-1">
          <div className="text-[9px] text-cyan-400 text-center animate-pulse">
            ↓ Trascina su una cartella
          </div>
        </div>
      )}

      {/* Pannello modifica file */}
      <FileContextMenu
        file={contextFile}
        cartelle={cartelle}
        onSave={handleContextSave}
        onClose={() => setContextFile(null)}
      />

      {/* Popup conferma eliminazione */}
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