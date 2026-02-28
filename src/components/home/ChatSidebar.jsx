import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Folder, FolderPlus, MessageSquare, Search, Pencil, Trash2, Check, MoreVertical, ChevronRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [menuOpen, setMenuOpen] = useState(null); // folder id or conv id
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
      // Scollega conversazioni dalla cartella
      const convs = conversations.filter(c => c.folder_id === id);
      for (const c of convs) {
        await base44.entities.ChatConversation.update(c.id, { folder_id: null });
      }
      return base44.entities.ChatFolder.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatFolders'] });
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
      setMenuOpen(null);
    }
  });

  const deleteConversation = useMutation({
    mutationFn: (id) => base44.entities.ChatConversation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
      setMenuOpen(null);
    }
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

  // Conversazioni senza cartella
  const looseConversations = conversations.filter(c => !c.folder_id);
  // Conversazioni per cartella
  const convsByFolder = {};
  conversations.forEach(c => {
    if (c.folder_id) {
      if (!convsByFolder[c.folder_id]) convsByFolder[c.folder_id] = [];
      convsByFolder[c.folder_id].push(c);
    }
  });

  // Filtro ricerca + categoria
  const matchSearch = (text) => !search || text?.toLowerCase().includes(search.toLowerCase());
  const matchCategory = (conv) => categoryFilter === 'all' || conv.categoria === categoryFilter;
  const matchConv = (conv) => matchSearch(conv.titolo) && matchCategory(conv);
  const filteredLoose = looseConversations.filter(matchConv);
  const filteredFolders = folders.filter(f => {
    return (convsByFolder[f.id] || []).some(matchConv) || (matchSearch(f.nome) && categoryFilter === 'all');
  });

  // Categorie presenti nelle conversazioni
  const availableCategories = [...new Set(conversations.map(c => c.categoria).filter(Boolean))].sort();
  const totalFiltered = filteredLoose.length + filteredFolders.reduce((acc, f) => acc + (convsByFolder[f.id] || []).filter(matchConv).length, 0);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-[300px] flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: '#111827' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-white font-semibold text-base">Chat</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onNewChat(); onClose(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <Pencil className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Contatore */}
        <div className="px-4 pb-1">
          <span className="text-[11px] text-slate-500 font-medium">{totalFiltered} analis{totalFiltered === 1 ? 'i' : 'i'}</span>
        </div>

        {/* Ricerca */}
        <div className="px-3 pb-1.5">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca nelle conversazioni..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="w-4 h-4 flex items-center justify-center">
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* Filtro categoria */}
        {availableCategories.length > 0 && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex-1 bg-transparent text-xs text-slate-300 outline-none appearance-none cursor-pointer"
              >
                <option value="all" className="bg-slate-800">Tutte le categorie</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Nuova chat */}
        <button
          onClick={() => { onNewChat(); onClose(); }}
          className="mx-3 mb-1 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Nuova chat</span>
        </button>

        {/* Nuova cartella */}
        <button
          onClick={() => setNewFolderMode(true)}
          className="mx-3 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <FolderPlus className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Nuova cartella</span>
        </button>

        {/* Input nuova cartella */}
        {newFolderMode && (
          <div className="mx-3 mb-2 flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <Folder className="w-4 h-4 text-[#d4af37]" />
            <input
              ref={newFolderRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName(''); } }}
              placeholder="Nome cartella"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            <button onClick={handleCreateFolder} className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700">
              <Check className="w-3.5 h-3.5 text-[#d4af37]" />
            </button>
            <button onClick={() => { setNewFolderMode(false); setNewFolderName(''); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        )}

        {/* Separatore */}
        <div className="mx-3 border-t border-slate-700/50 mb-1" />

        {/* Lista scrollabile */}
        <div className="flex-1 overflow-y-auto px-1" style={{ scrollbarWidth: 'none' }}>
          
          {/* Cartelle */}
          {filteredFolders.map(folder => {
            const folderConvs = (convsByFolder[folder.id] || []).filter(c => matchSearch(c.titolo));
            const isExpanded = expandedFolders[folder.id];
            const isEditing = editingFolderId === folder.id;

            return (
              <div key={folder.id} className="mb-0.5">
                <div className="flex items-center group">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className={cn("w-3.5 h-3.5 text-slate-500 transition-transform", isExpanded && "rotate-90")} />
                    <Folder className="w-4 h-4 text-[#d4af37]" />
                    {isEditing ? (
                      <input
                        ref={editFolderRef}
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateFolder(); if (e.key === 'Escape') setEditingFolderId(null); }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent text-sm text-white outline-none"
                      />
                    ) : (
                      <span className="text-sm text-slate-300 truncate">{folder.nome}</span>
                    )}
                    {folderConvs.length > 0 && !isEditing && (
                      <span className="text-[10px] text-slate-600 ml-auto">{folderConvs.length}</span>
                    )}
                  </button>
                  
                  {isEditing ? (
                    <button onClick={handleUpdateFolder} className="mr-2 w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700">
                      <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                    </button>
                  ) : (
                    <div className="mr-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.nome); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700">
                        <Pencil className="w-3 h-3 text-slate-500" />
                      </button>
                      <button onClick={() => deleteFolder.mutate(folder.id)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700">
                        <Trash2 className="w-3 h-3 text-slate-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Conversazioni nella cartella */}
                {isExpanded && folderConvs.filter(matchConv).map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === activeConversationId}
                    onSelect={() => { onSelectConversation(conv); onClose(); }}
                    onDelete={() => deleteConversation.mutate(conv.id)}
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
              onDelete={() => deleteConversation.mutate(conv.id)}
            />
          ))}

          {filteredFolders.length === 0 && filteredLoose.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-600">
              {search ? 'Nessun risultato' : 'Nessuna conversazione'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ConversationItem({ conv, isActive, onSelect, onDelete, indent }) {
  const catStyle = conv.categoria ? CATEGORY_COLORS[conv.categoria] : null;

  return (
    <div
      className={cn(
        "flex items-center group rounded-lg mx-1 transition-colors cursor-pointer",
        isActive ? "bg-slate-800" : "hover:bg-slate-800/50",
        indent && "ml-6"
      )}
    >
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 px-3 py-2 min-w-0"
      >
        <MessageSquare className="w-4 h-4 text-slate-600 flex-shrink-0" />
        <span className="text-sm text-slate-400 truncate flex-1">{conv.titolo || 'Chat senza titolo'}</span>
        {catStyle && (
          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 border", catStyle.bg, catStyle.text, catStyle.border)}>
            {conv.categoria}
          </span>
        )}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="mr-2 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-slate-700 transition-all"
      >
        <Trash2 className="w-3 h-3 text-slate-500" />
      </button>
    </div>
  );
}