import React, { useMemo } from 'react';
import { Search, X, MapPin, Briefcase, Building2, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function MemberFilters({ members, searchTerm, onSearchChange, filters, onFiltersChange, showFilters, onToggleFilters, mode }) {
  // Estrai valori unici dai membri
  const regions = useMemo(() => {
    const set = new Set();
    members.forEach(m => { if (m.region) set.add(m.region); });
    return [...set].sort();
  }, [members]);

  const cities = useMemo(() => {
    const set = new Set();
    members.forEach(m => { if (m.city) set.add(m.city); });
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

  const specializations = useMemo(() => {
    const set = new Set();
    members.forEach(m => { if (m.specializzazione) set.add(m.specializzazione); });
    return [...set].sort();
  }, [members]);

  const hasActiveFilters = filters.region || filters.sector || filters.size || filters.city || filters.specializzazione;

  const placeholderText = mode === 'nearby'
    ? 'Cerca per città, provincia, regione...'
    : 'Cerca per settore, specializzazione, nome...';

  return (
    <div className="space-y-3">
      {/* Barra ricerca + toggle filtri */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder={placeholderText}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white pl-10 h-11 rounded-xl text-sm"
          />
          {searchTerm && (
            <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
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

      {/* Filtri espandibili — cambiano in base alla modalità */}
      {showFilters && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 space-y-3">
          {mode === 'nearby' ? (
            <>
              {/* MODALITÀ VICINO A ME: filtri geografici */}
              <FilterSelect
                label="Regione" icon={<MapPin className="w-3 h-3" />}
                value={filters.region} options={regions} placeholder="Tutte le regioni"
                onChange={(v) => onFiltersChange({ ...filters, region: v })}
              />
              <FilterSelect
                label="Città" icon={<MapPin className="w-3 h-3" />}
                value={filters.city} options={cities} placeholder="Tutte le città"
                onChange={(v) => onFiltersChange({ ...filters, city: v })}
              />
            </>
          ) : (
            <>
              {/* MODALITÀ UTILE: filtri per competenza */}
              <FilterSelect
                label="Settore" icon={<Briefcase className="w-3 h-3" />}
                value={filters.sector} options={sectors} placeholder="Tutti i settori"
                onChange={(v) => onFiltersChange({ ...filters, sector: v })}
              />
              {specializations.length > 0 && (
                <FilterSelect
                  label="Specializzazione" icon={<Briefcase className="w-3 h-3" />}
                  value={filters.specializzazione} options={specializations} placeholder="Tutte"
                  onChange={(v) => onFiltersChange({ ...filters, specializzazione: v })}
                />
              )}
              <FilterSelect
                label="Dimensione" icon={<Building2 className="w-3 h-3" />}
                value={filters.size}
                options={['Micro', 'Piccola', 'Media', 'Grande']}
                placeholder="Tutte le dimensioni"
                onChange={(v) => onFiltersChange({ ...filters, size: v })}
              />
            </>
          )}

          {hasActiveFilters && (
            <button
              onClick={() => onFiltersChange({ region: null, sector: null, size: null, city: null, specializzazione: null })}
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

function FilterSelect({ label, icon, value, options, placeholder, onChange }) {
  return (
    <div>
      <label className="text-slate-500 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1 mb-1.5">
        {icon} {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-slate-700 border-slate-600 text-white text-sm rounded-lg px-3 py-2"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}