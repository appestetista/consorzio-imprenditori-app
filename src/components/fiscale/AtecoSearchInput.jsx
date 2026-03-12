import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, X, Sparkles } from 'lucide-react';
import AtecoAISuggest from './AtecoAISuggest';

export default function AtecoSearchInput({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [allCodes, setAllCodes] = useState(null);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Carica tutti i codici una volta sola (lazy)
  const loadAllCodes = async () => {
    if (allCodes) return allCodes;
    const batch1 = await base44.entities.CodiceATECO.filter({ livello: 'sottocategoria' }, 'codice', 500);
    const batch2 = await base44.entities.CodiceATECO.filter({ livello: 'sottocategoria' }, '-codice', 500);
    const merged = [...batch1, ...batch2];
    const unique = Array.from(new Map(merged.map(c => [c.id, c])).values());
    setAllCodes(unique);
    return unique;
  };

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

  // Ricerca debounced su tutti i codici
  useEffect(() => {
    if (aiMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const codes = await loadAllCodes();
      const q = query.toLowerCase();
      const filtered = codes.filter(c =>
        c.codice.toLowerCase().includes(q) ||
        c.descrizione.toLowerCase().includes(q)
      ).slice(0, 20);
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
    }, 300);
  }, [query, aiMode]);

  const handleSelect = (codeOrString) => {
    if (typeof codeOrString === 'string') {
      // Proveniente da AI suggest — è solo il codice stringa
      setQuery(codeOrString);
      setSelectedLabel(codeOrString);
      setAiMode(false);
      setShowDropdown(false);
      onChange(codeOrString);
      return;
    }
    setQuery(codeOrString.codice);
    setSelectedLabel(`${codeOrString.codice} – ${codeOrString.descrizione}`);
    setShowDropdown(false);
    onChange(codeOrString.codice);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedLabel('');
    setResults([]);
    onChange('');
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-slate-400 text-xs font-medium">Codice ATECO</label>
        <button
          type="button"
          onClick={() => setAiMode(!aiMode)}
          className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
            aiMode
              ? 'bg-[#d4af37]/20 text-[#d4af37]'
              : 'bg-slate-800 text-slate-400 hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          {aiMode ? 'Cerca per codice' : 'Non ricordo il codice'}
        </button>
      </div>

      {!aiMode ? (
        <>
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
            <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl" style={{ top: '100%' }}>
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
        </>
      ) : (
        <AtecoAISuggest onSelect={handleSelect} />
      )}
    </div>
  );
}