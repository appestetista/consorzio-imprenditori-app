import React, { useState } from 'react';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import SUPPLIER_CATEGORIES from './supplierCategories';

export default function CategorySelector({ onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSector, setExpandedSector] = useState(null);

  // Flat search across all items (items are now objects with {name, example})
  const searchResults = searchTerm.trim().length >= 2
    ? SUPPLIER_CATEGORIES.flatMap(cat =>
        cat.subcategories.flatMap(sub =>
          sub.items
            .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(item => ({
              item: item.name,
              example: item.example,
              group: sub.group,
              macro: cat.label,
              macroId: cat.id,
              color: cat.color
            }))
        )
      )
    : [];

  // Expanded sector view
  if (expandedSector) {
    const sector = SUPPLIER_CATEGORIES.find(c => c.id === expandedSector);
    if (!sector) return null;
    const Icon = sector.icon;

    return (
      <div className="space-y-3">
        <button
          onClick={() => setExpandedSector(null)}
          className="flex items-center gap-2 text-lime-400 text-sm hover:underline"
        >
          <ChevronLeft className="w-4 h-4" /> Torna ai settori
        </button>

        <div className={`flex items-center gap-3 p-3 rounded-xl ${sector.bgColor} border ${sector.borderColor}`}>
          <Icon className={`w-6 h-6 ${sector.color}`} />
          <h3 className="text-white font-semibold text-sm">{sector.label}</h3>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {sector.subcategories.map((sub, si) => (
            <div key={si}>
              {sub.group && (
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1.5 px-1">
                  {sub.group}
                </p>
              )}
              <div className="grid grid-cols-1 gap-1">
                {sub.items.map(item => (
                  <button
                    key={item.name}
                    onClick={() => onSelect({ 
                      category: item.name, 
                      example: item.example,
                      subcategory: sub.group || '', 
                      macro_sector: sector.label, 
                      macro_id: sector.id 
                    })}
                    className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-lime-500/50 hover:bg-slate-700/50 transition-all text-white text-sm flex items-center justify-between group"
                  >
                    <span className="group-hover:text-lime-300">{item.name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-lime-400" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Cerca categoria fornitore..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Search results */}
      {searchTerm.trim().length >= 2 ? (
        <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
          {searchResults.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Nessun risultato per "{searchTerm}"</p>
          ) : (
            searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => onSelect({ 
                  category: r.item, 
                  example: r.example,
                  subcategory: r.group || '', 
                  macro_sector: r.macro, 
                  macro_id: r.macroId 
                })}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-lime-500/50 hover:bg-slate-700/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="text-white text-sm group-hover:text-lime-300">{r.item}</span>
                  <span className="text-slate-500 text-xs block">{r.macro}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-lime-400" />
              </button>
            ))
          )}
        </div>
      ) : (
        /* Macro sectors grid */
        <div className="grid grid-cols-1 gap-2 max-h-[55vh] overflow-y-auto pr-1">
          {SUPPLIER_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const totalItems = cat.subcategories.reduce((acc, s) => acc + s.items.length, 0);
            return (
              <button
                key={cat.id}
                onClick={() => setExpandedSector(cat.id)}
                className={`w-full text-left p-3 rounded-xl border ${cat.borderColor} ${cat.bgColor} hover:brightness-125 transition-all flex items-center gap-3 group`}
              >
                <div className={`w-10 h-10 rounded-lg ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate group-hover:text-lime-300">{cat.label}</p>
                  <p className="text-slate-500 text-xs">{totalItems} categorie</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-lime-400 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}