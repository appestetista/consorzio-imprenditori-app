import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Zap, SlidersHorizontal, X } from 'lucide-react';

export default function GrantFilters({ filters, onFilterChange }) {
  const [showFilters, setShowFilters] = useState(false);

  // Conta filtri attivi
  const activeFiltersCount = [
    filters.easyAccess,
    filters.grantType !== 'all',
    filters.fundingType !== 'all',
    filters.status !== 'all',
    filters.noCofinancing
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFilterChange('easyAccess', false);
    onFilterChange('grantType', 'all');
    onFilterChange('fundingType', 'all');
    onFilterChange('status', 'all');
    onFilterChange('noCofinancing', false);
    onFilterChange('sortBy', 'deadline_asc');
  };

  return (
    <div className="space-y-3">
      {/* Barra principale: ordinamento + toggle filtri */}
      <div className="flex items-center gap-2">
        {/* Ordinamento sempre visibile */}
        <Select
          value={filters.sortBy || 'deadline_asc'}
          onValueChange={(value) => onFilterChange('sortBy', value)}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9 text-xs flex-1">
            <SelectValue placeholder="Ordina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline_asc">⏰ Scadenza vicina</SelectItem>
            <SelectItem value="created_date_desc">🆕 Più recenti</SelectItem>
            <SelectItem value="max_amount_desc">💰 Importo alto</SelectItem>
            <SelectItem value="coverage_desc">📈 Copertura alta</SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle filtri */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-9 px-3 border-slate-700 ${showFilters || activeFiltersCount > 0 ? 'bg-lime-400/20 border-lime-400 text-lime-400' : 'text-slate-400'}`}
        >
          <SlidersHorizontal className="w-4 h-4 mr-1.5" />
          Filtri
          {activeFiltersCount > 0 && (
            <span className="ml-1.5 bg-lime-400 text-slate-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filtri rapidi (chips) sempre visibili */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange('easyAccess', !filters.easyAccess)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filters.easyAccess 
              ? 'bg-lime-400 text-slate-900' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Attivabili subito
        </button>
        
        <button
          onClick={() => onFilterChange('noCofinancing', !filters.noCofinancing)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filters.noCofinancing 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Senza cofinanziamento
        </button>

        <button
          onClick={() => onFilterChange('fundingType', filters.fundingType === 'Contributo a fondo perduto' ? 'all' : 'Contributo a fondo perduto')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filters.fundingType === 'Contributo a fondo perduto' 
              ? 'bg-blue-500 text-white' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Fondo perduto
        </button>
      </div>

      {/* Pannello filtri avanzati */}
      {showFilters && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">Filtri avanzati</span>
            {activeFiltersCount > 0 && (
              <button 
                onClick={resetFilters}
                className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={filters.grantType}
              onValueChange={(value) => onFilterChange('grantType', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9 text-xs">
                <SelectValue placeholder="Tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte tipologie</SelectItem>
                <SelectItem value="Digitalizzazione">💻 Digitalizzazione</SelectItem>
                <SelectItem value="Innovazione">💡 Innovazione</SelectItem>
                <SelectItem value="Ricerca e Sviluppo">🔬 R&S</SelectItem>
                <SelectItem value="Energia/Sostenibilità">🌱 Energia</SelectItem>
                <SelectItem value="Internazionalizzazione">🌍 Export</SelectItem>
                <SelectItem value="Altro">📋 Altro</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.fundingType}
              onValueChange={(value) => onFilterChange('fundingType', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9 text-xs">
                <SelectValue placeholder="Tipo contributo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="Contributo a fondo perduto">Fondo perduto</SelectItem>
                <SelectItem value="Finanziamento agevolato">Finanz. agevolato</SelectItem>
                <SelectItem value="Credito d'imposta">Credito imposta</SelectItem>
                <SelectItem value="Misto">Misto</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => onFilterChange('status', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9 text-xs">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="Aperto">🟢 Aperto</SelectItem>
                <SelectItem value="In apertura">🟡 In apertura</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.accessMode || 'all'}
              onValueChange={(value) => onFilterChange('accessMode', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9 text-xs">
                <SelectValue placeholder="Modalità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="Sportello">Sportello</SelectItem>
                <SelectItem value="Graduatoria">Graduatoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}