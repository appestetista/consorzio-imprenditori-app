import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ChecklistEditor({ items, onChange }) {
  const [newItemText, setNewItemText] = useState('');
  const [focusItemId, setFocusItemId] = useState(null);
  const itemRefs = useRef({});

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    const newItem = { id: Date.now().toString(), text: newItemText.trim(), checked: false };
    onChange([...items, newItem]);
    setNewItemText('');
  };

  const handleToggle = (id) => {
    onChange(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleTextChange = (id, text) => {
    onChange(items.map(item => item.id === id ? { ...item, text } : item));
  };

  const handleRemove = (id) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onChange(reordered);
  };

  // Quando un focusItemId cambia, metti il focus sull'input corrispondente
  useEffect(() => {
    if (focusItemId && itemRefs.current[focusItemId]) {
      itemRefs.current[focusItemId].focus();
      setFocusItemId(null);
    }
  }, [focusItemId, items]);

  const handleItemKeyDown = (e, item, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newId = Date.now().toString();
      const newItem = { id: newId, text: '', checked: false };
      const updated = [...items];
      updated.splice(index + 1, 0, newItem);
      onChange(updated);
      setFocusItemId(newId);
    }
  };

  const handleNewItemKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className="mt-2">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="checklist">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "flex items-center gap-1 group rounded px-1 py-0.5",
                        snapshot.isDragging && "bg-slate-700/50"
                      )}
                    >
                      {/* Grip per trascinare */}
                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5">
                        <GripVertical className="w-3 h-3 text-slate-600" />
                      </div>

                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggle(item.id)}
                        className={cn(
                          "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all",
                          item.checked 
                            ? "bg-lime-500 border-lime-500" 
                            : "border-slate-500 hover:border-slate-400"
                        )}
                      >
                        {item.checked && (
                          <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Testo */}
                      <input
                        ref={(el) => { itemRefs.current[item.id] = el; }}
                        type="text"
                        value={item.text}
                        onChange={(e) => handleTextChange(item.id, e.target.value)}
                        onKeyDown={(e) => handleItemKeyDown(e, item, index)}
                        className={cn(
                          "flex-1 bg-transparent text-sm outline-none min-w-0",
                          item.checked 
                            ? "text-slate-500 line-through" 
                            : "text-white"
                        )}
                      />

                      {/* Rimuovi */}
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-slate-500" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Input nuova voce */}
      <div className="flex items-center gap-1 mt-1 px-1">
        <Plus className="w-3 h-3 text-slate-600 flex-shrink-0 ml-4" />
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleNewItemKeyDown}
          placeholder="Aggiungi voce..."
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}