import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FilePlus, FileText, X, GripVertical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function FileStrip({ userEmail, cartelle = [], onFileClick, onFileDragToFolder }) {
  const [showNewFilePopup, setShowNewFilePopup] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [draggedFile, setDraggedFile] = useState(null);
  const [dragOverCartella, setDragOverCartella] = useState(null);
  const touchStartRef = useRef(null);
  const dragCloneRef = useRef(null);
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

  // Mutation crea file standalone
  const createFileMutation = useMutation({
    mutationFn: (data) => base44.entities.FileCartella.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standalone-files'] });
      queryClient.invalidateQueries({ queryKey: ['allFileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['fileCartella'] });
      queryClient.invalidateQueries({ queryKey: ['file-week'] });
      setShowNewFilePopup(false);
      setNewFileName('');
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

  const handleCreateFile = () => {
    if (!newFileName.trim() || !userEmail) return;
    createFileMutation.mutate({
      user_email: userEmail,
      titolo: newFileName.trim(),
      contenuto: '',
      cartella_id: null
    });
  };

  // Touch drag handlers
  const handleTouchStart = (e, file) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, file, moved: false };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    // Inizia drag solo se ha mosso abbastanza verticalmente (verso le cartelle sotto)
    if (dy > 15 && !touchStartRef.current.moved) {
      touchStartRef.current.moved = true;
      setDraggedFile(touchStartRef.current.file);
    }

    if (touchStartRef.current.moved) {
      e.preventDefault();
      // Trova l'elemento cartella sotto il dito
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
        {/* Pulsante crea file */}
        <button
          onClick={() => setShowNewFilePopup(true)}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-600 transition-colors"
        >
          <FilePlus className="w-5 h-5 text-cyan-400" />
          <span className="text-[10px] text-slate-300 font-medium">File</span>
        </button>

        {/* File standalone */}
        {allFiles.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
              "bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700",
              draggedFile?.id === file.id && "opacity-40 scale-95"
            )}
            onClick={() => {
              if (!draggedFile) onFileClick?.(file);
            }}
            onTouchStart={(e) => handleTouchStart(e, file)}
          >
            <GripVertical className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-200 font-medium whitespace-nowrap max-w-[80px] truncate">
              {file.titolo}
            </span>
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

      {/* Popup crea file */}
      {showNewFilePopup && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-black/60" onClick={() => setShowNewFilePopup(false)}>
          <div className="bg-slate-800 rounded-xl p-5 w-80 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowNewFilePopup(false)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
            
            <h3 className="text-white font-semibold text-base mb-4">Nuovo File</h3>
            
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Nome file"
              className="w-full bg-slate-700 text-white text-sm rounded-lg px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-cyan-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
              }}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewFilePopup(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateFile}
                disabled={!newFileName.trim() || createFileMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-sm font-semibold disabled:opacity-50"
              >
                {createFileMutation.isPending ? 'Creo...' : 'Crea File'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}