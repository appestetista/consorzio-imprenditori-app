import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Zap, Filter, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function GrantFilters({ filters, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);

  // Conta filtri attivi
  const activeFiltersCount = [
    filters.easyAccess,
    filters.grantType !== 'all',
    filters.fundingType !== 'all',
    filters.status !== 'all',
    filters.accessMode !== 'all',
    filters.noCofinancing
  ].filter(Boolean).length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header con toggle */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-lime-400" />
              <span className="text-white font-medium text-sm">Ordina e Filtra</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-xs">
                {filters.sortBy === 'created_date_desc' ? 'Più recenti' : 
                 filters.sortBy === 'created_date_asc' ? 'Meno recenti' :
                 filters.sortBy === 'deadline_asc' ? 'Scadenza ↑' :
                 filters.sortBy === 'deadline_desc' ? 'Scadenza ↓' :
                 filters.sortBy === 'max_amount_desc' ? 'Importo ↓' :
                 filters.sortBy === 'max_amount_asc' ? 'Importo ↑' :
                 filters.sortBy === 'coverage_desc' ? 'Copertura ↓' :
                 filters.sortBy === 'coverage_asc' ? 'Copertura ↑' : 'Più recenti'}
              </span>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Contenuto espandibile */}
        <CollapsibleContent className="pt-3 mt-3 border-t border-slate-700 space-y-3">
          {/* Ordinamento */}
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs flex items-center gap-1.5">
              <ArrowUpDown className="w-3 h-3" />
              Ordina per
            </Label>
            <Select
              value={filters.sortBy || 'created_date_desc'}
              onValueChange={(value) => onFilterChange('sortBy', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9 text-sm">
                <SelectValue placeholder="Ordina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date_desc">Più recenti</SelectItem>
                <SelectItem value="created_date_asc">Meno recenti</SelectItem>
                <SelectItem value="deadline_asc">Scadenza (prima i più urgenti)</SelectItem>
                <SelectItem value="deadline_desc">Scadenza (prima i più lontani)</SelectItem>
                <SelectItem value="max_amount_desc">Importo (dal più alto)</SelectItem>
                <SelectItem value="max_amount_asc">Importo (dal più basso)</SelectItem>
                <SelectItem value="coverage_desc">Copertura % (dal più alto)</SelectItem>
                <SelectItem value="coverage_asc">Copertura % (dal più basso)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Switches */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-lime-400/10 rounded-lg px-3 py-1.5 border border-lime-400/30">
              <Zap className="w-4 h-4 text-lime-400" />
              <Label className="text-lime-400 text-xs font-bold cursor-pointer" htmlFor="easy-access">
                Solo Attivabili Subito
              </Label>
              <Switch
                id="easy-access"
                checked={filters.easyAccess}
                onCheckedChange={(checked) => onFilterChange('easyAccess', checked)}
                className="scale-75"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-1.5">
              <Label className="text-slate-300 text-xs cursor-pointer" htmlFor="no-cofinancing">
                Senza cofinanziamento
              </Label>
              <Switch
                id="no-cofinancing"
                checked={filters.noCofinancing}
                onCheckedChange={(checked) => onFilterChange('noCofinancing', checked)}
                className="scale-75"
              />
            </div>
          </div>

          {/* Grid filtri */}
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={filters.grantType}
              onValueChange={(value) => onFilterChange('grantType', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-8 text-xs">
                <SelectValue placeholder="Tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte tipologie</SelectItem>
                <SelectItem value="Digitalizzazione">Digitalizzazione</SelectItem>
                <SelectItem value="Innovazione">Innovazione</SelectItem>
                <SelectItem value="Ricerca e Sviluppo">R&S</SelectItem>
                <SelectItem value="Energia/Sostenibilità">Energia</SelectItem>
                <SelectItem value="Internazionalizzazione">Export</SelectItem>
                <SelectItem value="Altro">Altro</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.fundingType}
              onValueChange={(value) => onFilterChange('fundingType', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-8 text-xs">
                <SelectValue placeholder="Agevolazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte forme</SelectItem>
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
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-8 text-xs">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti stati</SelectItem>
                <SelectItem value="Aperto">Aperto</SelectItem>
                <SelectItem value="In apertura">In apertura</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.accessMode}
              onValueChange={(value) => onFilterChange('accessMode', value)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-8 text-xs">
                <SelectValue placeholder="Accesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte modalità</SelectItem>
                <SelectItem value="Sportello">Sportello</SelectItem>
                <SelectItem value="Graduatoria">Graduatoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}