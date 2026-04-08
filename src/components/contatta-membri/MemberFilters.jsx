import React, { useMemo } from 'react';
import { Search, X, MapPin, Briefcase, Building2, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function MemberFilters({ members, searchTerm, onSearchChange, filters, onFiltersChange, showFilters, onToggleFilters }) {
  // Estrai regioni e settori unici dai membri
  const regions = useMemo(() => {
    const set = new Set();
    members.forEach(m => { if (m.region) set.add(m.region); });
    return [...set].sort();
  }, [members]);

  const sectors = useMemo(() => {
    const set = new Set();
    members.forEach(m => {
      if (m.settore) set.add(m.settore);
      else if (m.sector) set.add(m.sector);
    });
    return [...set].sort();
  }, [members]);

  const cities = useMemo(() => {
    const set = new Set();
    members.forEach(m => { if (m.city) set.add(m.city); });
    return [...set].sort();
  }, [members]);

  const hasActiveFilters = filters.region || filters.sector || filters.size || filters.city;

  return (
    <div className="space-y-3">
      {/* Barra ricerca + toggle filtri */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Cerca azienda, nome, settore..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white pl-10 h-11 rounded-xl text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onToggleFilters}
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors relative ${
            showFilters || hasActiveFilters ? 'bg-lime-400 text-slate-900' : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {hasActiveFilters && !showFilters && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Filtri espandibili */}
      {showFilters && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 space-y-3">
          {/* Regione */}
          <div>
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1 mb-1.5">
              <MapPin className="w-3 h-3" /> Regione
            </label>
            <select
              value={filters.region || ''}
              onChange={(e) => onFiltersChange({ ...filters, region: e.target.value || null })}
              className="w-full bg-slate-700 border-slate-600 text-white text-sm rounded-lg px-3 py-2"
            >
              <option value="">Tutte le regioni</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Città */}
          {cities.length > 0 && (
            <div>
              <label className="text-slate-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1 mb-1.5">
                <MapPin className="w-3 h-3" /> Città
              </label>
              <select
                value={filters.city || ''}
                onChange={(e) => onFiltersChange({ ...filters, city: e.target.value || null })}
                className="w-full bg-slate-700 border-slate-600 text-white text-sm rounded-lg px-3 py-2"
              >
                <option value="">Tutte le città</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Settore */}
          <div>
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1 mb-1.5">
              <Briefcase className="w-3 h-3" /> Settore
            </label>
            <select
              value={filters.sector || ''}
              onChange={(e) => onFiltersChange({ ...filters, sector: e.target.value || null })}
              className="w-full bg-slate-700 border-slate-600 text-white text-sm rounded-lg px-3 py-2"
            >
              <option value="">Tutti i settori</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Dimensione */}
          <div>
            <label className="text-slate-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1 mb-1.5">
              <Building2 className="w-3 h-3" /> Dimensione
            </label>
            <select
              value={filters.size || ''}
              onChange={(e) => onFiltersChange({ ...filters, size: e.target.value || null })}
              className="w-full bg-slate-700 border-slate-600 text-white text-sm rounded-lg px-3 py-2"
            >
              <option value="">Tutte le dimensioni</option>
              <option value="Micro">Micro</option>
              <option value="Piccola">Piccola</option>
              <option value="Media">Media</option>
              <option value="Grande">Grande</option>
            </select>
          </div>

          {/* Reset filtri */}
          {hasActiveFilters && (
            <button
              onClick={() => onFiltersChange({ region: null, sector: null, size: null, city: null })}
              className="text-red-400 text-xs font-medium flex items-center gap-1 hover:text-red-300"
            >
              <X className="w-3 h-3" /> Resetta filtri
            </button>
          )}
        </div>
      )}
    </div>
  );
}