import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

export default function AtecoSearchInput({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Chiudi dropdown su click esterno
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Ricerca debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      // Cerca per codice o descrizione
      const allCodes = await base44.entities.CodiceATECO.filter(
        { livello: 'sottocategoria' }, 
        '-codice', 
        50
      );
      const q = query.toLowerCase();
      const filtered = allCodes.filter(c => 
        c.codice.toLowerCase().includes(q) || 
        c.descrizione.toLowerCase().includes(q)
      ).slice(0, 15);
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
    }, 300);
  }, [query]);

  const handleSelect = (code) => {
    setQuery(code.codice);
    setSelectedLabel(`${code.codice} – ${code.descrizione}`);
    setShowDropdown(false);
    onChange(code.codice);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedLabel('');
    setResults([]);
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-slate-400 text-xs font-medium mb-1 block">Codice ATECO</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <Input
          placeholder="Cerca per codice o descrizione..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedLabel('');
            if (!e.target.value) onChange('');
          }}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="bg-slate-800 border-slate-700 text-white pl-9 pr-8 text-sm"
        />
        {query && (
          <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
          </button>
        )}
      </div>
      {selectedLabel && (
        <p className="text-[#d4af37] text-[10px] mt-1 truncate">{selectedLabel}</p>
      )}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800 last:border-0"
            >
              <span className="text-[#d4af37] text-xs font-mono">{c.codice}</span>
              <span className="text-slate-400 text-[10px] ml-2">{c.descrizione}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}