import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FilePlus, FileText, X, GripVertical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function FileStrip({ userEmail, cartelle = [], onFileClick, onFileDragToFolder }) {
  const [draggedFile, setDraggedFile] = useState(null);
  const [dragOverCartella, setDragOverCartella] = useState(null);
  const [deleteFilePopup, setDeleteFilePopup] = useState(null); // file da eliminare
  const touchStartRef = useRef(null);
  const queryClient = useQueryClient();

  // Query tutti i file standalone (senza cartella) dell'utente
  const { data: allFiles = [] } = useQuery({
    queryKey: ['standalone-files', userEmail],
    queryFn: async () => {
      const files = await base44.entities.FileCartella.filter({ user_email: userEmail });
      return files.filter(f => !f.cartella_id || f.cartella_id === '' || f.cartella_id === 'standalone');
    },
    enabled: !!userEmail
  });

  // Mutation crea file standalone (senza titolo, si apre subito l'editor)
  const createFileMutation = useMutation({
    mutationFn: (data) => base44.entities.FileCartella.create(data),
    onSuccess: (newFile) => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['file-week'] });
      // Apri subito l'editor sul file appena creato
      if (onFileClick) onFileClick(newFile);
    }
  });

  // Mutation sposta file in cartella
  const moveToFolderMutation = useMutation({
    mutationFn: ({ fileId, cartellaId }) => base44.entities.FileCartella.update(fileId, { cartella_id: cartellaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['cartelle'] });
    }
  });

  // Mutation elimina file
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
      cartella_id: null
    });
  };

  // Touch drag handlers - solo se ci sono cartelle
  const hasFolders = cartelle.length > 0;

  const handleTouchStart = (e, file) => {
    if (!hasFolders) return; // No drag se non ci sono cartelle
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
        className="flex items-center gap-2 px-2 pt-1 pb-1 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pulsante crea file - apre direttamente l'editor */}
        <button
          onClick={handleCreateFile}
          disabled={createFileMutation.isPending}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          <FilePlus className="w-5 h-5 text-cyan-400" />
          <span className="text-[10px] text-slate-300 font-medium">
            {createFileMutation.isPending ? '...' : 'File'}
          </span>
        </button>

        {/* File standalone */}
        {allFiles.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex-shrink-0 relative pt-3",
              draggedFile?.id === file.id && "opacity-40 scale-95"
            )}
          >
            {/* X per eliminare - sopra il file */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteFilePopup(file);
              }}
              className="absolute -top-0.5 right-0 z-10 w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg"
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>

            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                "bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700"
              )}
              onClick={() => {
                if (!draggedFile) onFileClick?.(file);
              }}
              onTouchStart={(e) => handleTouchStart(e, file)}
            >
              {hasFolders && <GripVertical className="w-3 h-3 text-slate-600 flex-shrink-0" />}
              <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-200 font-medium whitespace-nowrap max-w-[80px] truncate">
                {file.titolo}
              </span>
            </div>
          </div>
        ))}
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