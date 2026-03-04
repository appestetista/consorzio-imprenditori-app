import React, { useState, useEffect, useRef } from 'react';
import { Pencil, FolderInput, Pin, PinOff, Trash2, X, Check, Folder, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Popup contestuale stile ChatGPT per una conversazione.
 * Azioni: Rinomina, Aggiungi a cartella, Fissa/Sfissa chat, Elimina.
 */
export default function ConversationContextMenu({
  conv,
  folders = [],
  onRename,
  onMoveToFolder,
  onTogglePin,
  onDelete,
  onClose,
  anchorRef,
}) {
  const [mode, setMode] = useState('menu'); // 'menu' | 'rename' | 'folders' | 'confirmDelete'
  const [renameValue, setRenameValue] = useState(conv.titolo || '');
  const menuRef = useRef(null);
  const renameRef = useRef(null);

  // Posizionamento e click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (mode === 'rename' && renameRef.current) renameRef.current.focus();
  }, [mode]);

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== conv.titolo) {
      onRename(conv.id, renameValue.trim());
    }
    onClose();
  };

  const isPinned = !!conv.is_pinned;

  if (mode === 'rename') {
    return (
      <div ref={menuRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6">
        <div className="w-full max-w-xs bg-[#1e293b] rounded-2xl border border-slate-700/60 p-4 space-y-3 shadow-xl">
          <p className="text-sm font-semibold text-white">Rinomina chat</p>
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') onClose(); }}
            className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#d4af37]/50"
            placeholder="Nome della chat..."
          />
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 rounded-lg hover:bg-slate-700 transition-colors">
              Annulla
            </button>
            <button
              onClick={handleRename}
              disabled={!renameValue.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: '#d4af37', color: '#0a0f1a' }}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'folders') {
    return (
      <div ref={menuRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6">
        <div className="w-full max-w-xs bg-[#1e293b] rounded-2xl border border-slate-700/60 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <p className="text-sm font-semibold text-white">Aggiungi a cartella</p>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-700">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto px-2 pb-3" style={{ scrollbarWidth: 'none' }}>
            {/* Opzione "Nessuna cartella" per rimuovere dalla cartella */}
            {conv.folder_id && (
              <button
                onClick={() => { onMoveToFolder(conv.id, null); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-left"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">Rimuovi dalla cartella</span>
              </button>
            )}
            {folders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Nessuna cartella creata</p>
            ) : (
              folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => { onMoveToFolder(conv.id, folder.id); onClose(); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-left",
                    conv.folder_id === folder.id && "bg-slate-800"
                  )}
                >
                  <Folder className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-sm text-slate-300 truncate">{folder.nome}</span>
                  {conv.folder_id === folder.id && (
                    <Check className="w-3.5 h-3.5 text-[#d4af37] ml-auto flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'confirmDelete') {
    return (
      <div ref={menuRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6">
        <div className="w-full max-w-xs bg-[#1e293b] rounded-2xl border border-slate-700/60 p-4 space-y-3 shadow-xl">
          <p className="text-sm font-semibold text-white">Eliminare questa chat?</p>
          <p className="text-xs text-slate-400 leading-relaxed">Non potrai più ripristinarla.</p>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 rounded-lg hover:bg-slate-700 transition-colors">
              Annulla
            </button>
            <button
              onClick={() => { onDelete(conv.id); onClose(); }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Elimina
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Menu principale
  return (
    <div ref={menuRef} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-xs bg-[#1e293b] rounded-2xl border border-slate-700/60 shadow-xl overflow-hidden pt-1 pb-2">
        {/* X chiudi */}
        <div className="flex justify-end px-3 pt-1 pb-0.5">
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        {/* Rinomina */}
        <button
          onClick={() => setMode('rename')}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
        >
          <Pencil className="w-4.5 h-4.5 text-slate-400" />
          <span className="text-sm text-slate-200">Rinomina</span>
        </button>

        {/* Aggiungi a cartella */}
        <button
          onClick={() => setMode('folders')}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
        >
          <FolderInput className="w-4.5 h-4.5 text-slate-400" />
          <span className="text-sm text-slate-200 flex-1">Aggiungi a cartella</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Fissa / Sfissa chat */}
        <button
          onClick={() => { onTogglePin(conv.id, !isPinned); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
        >
          {isPinned ? (
            <PinOff className="w-4.5 h-4.5 text-slate-400" />
          ) : (
            <Pin className="w-4.5 h-4.5 text-slate-400" />
          )}
          <span className="text-sm text-slate-200">{isPinned ? 'Sfissa chat' : 'Fissa chat'}</span>
        </button>

        {/* Separatore */}
        <div className="mx-4 my-1 border-t border-slate-700/50" />

        {/* Elimina */}
        <button
          onClick={() => setMode('confirmDelete')}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left"
        >
          <Trash2 className="w-4.5 h-4.5 text-red-400" />
          <span className="text-sm text-red-400">Elimina</span>
        </button>
      </div>
    </div>
  );
}