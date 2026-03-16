import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Folder, FolderPlus, MessageSquare, Search, Pencil, Trash2, Check, MoreVertical, ChevronRight, Filter, ListChecks, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConversationContextMenu from './ConversationContextMenu.jsx';

const CATEGORY_COLORS = {
  'Fiscale': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'Legale': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  'Marketing': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
  'Personale/HR': { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
  'Investimenti': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  'Operativa': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'Strategica': { bg: 'bg-[#d4af37]/20', text: 'text-[#d4af37]', border: 'border-[#d4af37]/30' },
};

export default function ChatSidebar({ open, onClose, userEmail, activeConversationId, onSelectConversation, onNewChat }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [contextMenuConv, setContextMenuConv] = useState(null);
  const newFolderRef = useRef(null);
  const editFolderRef = useRef(null);

  const { data: folders = [] } = useQuery({
    queryKey: ['chatFolders', userEmail],
    queryFn: () => base44.entities.ChatFolder.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['chatConversations', userEmail],
    queryFn: () => base44.entities.ChatConversation.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  const createFolder = useMutation({
    mutationFn: (data) => base44.entities.ChatFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatFolders'] });
      setNewFolderMode(false);
      setNewFolderName('');
    }
  });

  const updateFolder = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatFolder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatFolders'] });
      setEditingFolderId(null);
    }
  });

  const deleteFolder = useMutation({
    mutationFn: async (id) => {
      const convs = conversations.filter(c => c.folder_id === id);
      for (const c of convs) {
        await base44.entities.ChatConversation.update(c.id, { folder_id: null });
      }
      return base44.entities.ChatFolder.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatFolders'] });
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
    }
  });

  const updateConversation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatConversation.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatConversations'] })
  });

  const deleteConversation = useMutation({
    mutationFn: (id) => base44.entities.ChatConversation.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chatConversations'] })
  });

  useEffect(() => {
    if (newFolderMode && newFolderRef.current) newFolderRef.current.focus();
  }, [newFolderMode]);

  useEffect(() => {
    if (editingFolderId && editFolderRef.current) editFolderRef.current.focus();
  }, [editingFolderId]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate({ user_email: userEmail, nome: newFolderName.trim() });
  };

  const handleUpdateFolder = () => {
    if (!editingFolderName.trim() || !editingFolderId) return;
    updateFolder.mutate({ id: editingFolderId, data: { nome: editingFolderName.trim() } });
  };

  const toggleFolder = (id) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Context menu actions
  const handleRename = (convId, newTitle) => {
    updateConversation.mutate({ id: convId, data: { titolo: newTitle } });
  };

  const handleMoveToFolder = (convId, folderId) => {
    updateConversation.mutate({ id: convId, data: { folder_id: folderId || null } });
  };

  const handleTogglePin = (convId, pinned) => {
    updateConversation.mutate({ id: convId, data: { is_pinned: pinned } });
  };

  const handleDelete = (convId) => {
    deleteConversation.mutate(convId);
  };

  // Sort: pinned first, then by date
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const looseConversations = sortedConversations.filter(c => !c.folder_id);
  const convsByFolder = {};
  sortedConversations.forEach(c => {
    if (c.folder_id) {
      if (!convsByFolder[c.folder_id]) convsByFolder[c.folder_id] = [];
      convsByFolder[c.folder_id].push(c);
    }
  });

  const matchSearch = (text) => !search || text?.toLowerCase().includes(search.toLowerCase());
  const matchCategory = (conv) => categoryFilter === 'all' || conv.categoria === categoryFilter;
  const matchConv = (conv) => matchSearch(conv.titolo) && matchCategory(conv);
  const filteredLoose = looseConversations.filter(matchConv);
  const filteredFolders = folders.filter(f => {
    return (convsByFolder[f.id] || []).some(matchConv) || (matchSearch(f.nome) && categoryFilter === 'all');
  });

  const availableCategories = [...new Set(conversations.map(c => c.categoria).filter(Boolean))].sort();
  const totalFiltered = filteredLoose.length + filteredFolders.reduce((acc, f) => acc + (convsByFolder[f.id] || []).filter(matchConv).length, 0);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />}

      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-[300px] flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: '#fef200' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-black font-semibold text-base">Chat</span>
          <div className="flex items-center gap-2">
            <button onClick={() => { onNewChat(); onClose(); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors">
              <Pencil className="w-4 h-4 text-black" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors">
              <X className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-1">
          <span className="text-[11px] text-black/60 font-medium">{totalFiltered} analisi</span>
        </div>

        {/* Ricerca */}
        <div className="px-3 pb-1.5">
          <div className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-black/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca nelle conversazioni..."
              className="flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="w-4 h-4 flex items-center justify-center">
                <X className="w-3 h-3 text-black/50" />
              </button>
            )}
          </div>
        </div>

        {/* Filtro categoria */}
        {availableCategories.length > 0 && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-black/50 flex-shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 bg-transparent text-xs text-black outline-none appearance-none cursor-pointer"
              >
                <option value="all" className="bg-yellow-200">Tutte le categorie</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-yellow-200">{cat}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Nuova chat */}
        <button
          onClick={() => { onNewChat(); onClose(); }}
          className="mx-3 mb-1 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/10 transition-colors"
        >
          <Plus className="w-4 h-4 text-black" />
          <span className="text-sm text-black">Nuova chat</span>
        </button>

        {/* Nuova cartella */}
        <button
          onClick={() => setNewFolderMode(true)}
          className="mx-3 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/10 transition-colors"
        >
          <FolderPlus className="w-4 h-4 text-black" />
          <span className="text-sm text-black">Nuova cartella</span>
        </button>

        {/* Input nuova cartella */}
        {newFolderMode && (
          <div className="mx-3 mb-2 flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2">
            <Folder className="w-4 h-4 text-black" />
            <input
              ref={newFolderRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName(''); } }}
              placeholder="Nome cartella"
              className="flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/40"
            />
            <button onClick={handleCreateFolder} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/10">
              <Check className="w-3.5 h-3.5 text-black" />
            </button>
            <button onClick={() => { setNewFolderMode(false); setNewFolderName(''); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/10">
              <X className="w-3.5 h-3.5 text-black/50" />
            </button>
          </div>
        )}

        <div className="mx-3 border-t border-black/15 mb-1" />

        {/* Lista scrollabile */}
        <div className="flex-1 overflow-y-auto px-1" style={{ scrollbarWidth: 'none' }}>
          
          {/* Cartelle */}
          {filteredFolders.map(folder => {
            const folderConvs = (convsByFolder[folder.id] || []).filter(matchConv);
            const isExpanded = expandedFolders[folder.id];
            const isEditing = editingFolderId === folder.id;

            return (
              <div key={folder.id} className="mb-0.5">
                <div className="flex items-center group">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-black/10 transition-colors"
                  >
                    <ChevronRight className={cn("w-3.5 h-3.5 text-black/50 transition-transform", isExpanded && "rotate-90")} />
                    <Folder className="w-4 h-4 text-black" />
                    {isEditing ? (
                      <input
                        ref={editFolderRef}
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateFolder(); if (e.key === 'Escape') setEditingFolderId(null); }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent text-sm text-black outline-none"
                      />
                    ) : (
                      <span className="text-sm text-black truncate">{folder.nome}</span>
                    )}
                    {folderConvs.length > 0 && !isEditing && (
                      <span className="text-[10px] text-black/50 ml-auto">{folderConvs.length}</span>
                    )}
                  </button>
                  
                  {isEditing ? (
                    <button onClick={handleUpdateFolder} className="mr-2 w-6 h-6 rounded flex items-center justify-center hover:bg-black/10">
                      <Check className="w-3.5 h-3.5 text-black" />
                    </button>
                  ) : (
                    <div className="mr-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.nome); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/10">
                        <Pencil className="w-3 h-3 text-black/50" />
                      </button>
                      <button onClick={() => deleteFolder.mutate(folder.id)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/10">
                        <Trash2 className="w-3 h-3 text-black/50" />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && folderConvs.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === activeConversationId}
                    onSelect={() => { onSelectConversation(conv); onClose(); }}
                    onOpenMenu={() => setContextMenuConv(conv)}
                    indent
                  />
                ))}
              </div>
            );
          })}

          {/* Conversazioni senza cartella */}
          {filteredLoose.map(conv => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === activeConversationId}
              onSelect={() => { onSelectConversation(conv); onClose(); }}
              onOpenMenu={() => setContextMenuConv(conv)}
            />
          ))}

          {filteredFolders.length === 0 && filteredLoose.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-black/40">
              {search ? 'Nessun risultato' : 'Nessuna conversazione'}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenuConv && (
        <ConversationContextMenu
          conv={contextMenuConv}
          folders={folders}
          onRename={handleRename}
          onMoveToFolder={handleMoveToFolder}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
          onClose={() => setContextMenuConv(null)}
        />
      )}
    </>
  );
}

function formatConvDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const convDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (convDay.getTime() === today.getTime()) return 'Oggi';
  if (convDay.getTime() === yesterday.getTime()) return 'Ieri';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function ConversationItem({ conv, isActive, onSelect, onOpenMenu, indent }) {
  const catStyle = conv.categoria ? CATEGORY_COLORS[conv.categoria] : null;
  const longPressRef = useRef(null);

  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => {
      onOpenMenu();
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressRef.current);
  };

  return (
    <div
      className={cn(
        "flex items-start group rounded-lg mx-1 transition-colors cursor-pointer",
        isActive ? "bg-black/15" : "hover:bg-black/10",
        indent && "ml-6"
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <button
        onClick={onSelect}
        className="flex-1 flex items-start gap-2 px-3 py-2 min-w-0"
      >
        <MessageSquare className="w-4 h-4 text-black/40 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {conv.is_pinned && <Pin className="w-3 h-3 text-black flex-shrink-0" />}
            <span className="text-sm text-black truncate block">{conv.titolo || 'Chat senza titolo'}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {catStyle && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-black/10 text-black border-black/20">
                {conv.categoria}
              </span>
            )}
            {conv.ha_piano && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-black/10 text-black border border-black/20 flex items-center gap-0.5">
                <ListChecks className="w-2.5 h-2.5" />Piano
              </span>
            )}
            <span className="text-[10px] text-black/50 ml-auto">{formatConvDate(conv.created_date)}</span>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onOpenMenu(); }}
        className="mr-2 mt-2 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-all flex-shrink-0"
      >
        <MoreVertical className="w-3.5 h-3.5 text-black/50" />
      </button>
    </div>
  );
}