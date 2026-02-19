import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronLeft, Search, Loader2, FileCheck, CheckCircle } from 'lucide-react';
import { useCCNLList } from './useCCNL';

export default function StepIdentificazioneCCNL({ onComplete, onBack }) {
  const { ccnlList, isLoading } = useCCNLList();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCCNL, setSelectedCCNL] = useState(null);

  // Filter CCNLs based on search term
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return ccnlList;
    const terms = searchTerm.toLowerCase().split(/\s+/);
    return ccnlList.filter(c => {
      const searchable = `${c.categoria} ${c.ccnl_nome} ${c.settore} ${c.codice_cnel}`.toLowerCase();
      return terms.every(t => searchable.includes(t));
    });
  }, [ccnlList, searchTerm]);

  // Group by sector
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(c => {
      const sector = c.settore || 'Altro';
      if (!groups[sector]) groups[sector] = [];
      groups[sector].push(c);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
          <span className="text-slate-400 text-sm">Caricamento CCNL dal database...</span>
        </CardContent>
      </Card>
    );
  }

  // Confirm step
  if (selectedCCNL) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-lime-400" />
            Conferma CCNL selezionato
          </h3>

          <Card className="bg-slate-700/50 border-lime-500/30">
            <CardContent className="p-4 space-y-2">
              <p className="text-white font-semibold text-lg">{selectedCCNL.categoria || selectedCCNL.ccnl_nome}</p>
              {selectedCCNL.codice_cnel && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lime-400 border-lime-400/30 text-xs">
                    {selectedCCNL.codice_cnel}
                  </Badge>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div>
                  <span className="text-slate-400 text-xs">Settore</span>
                  <p className="text-slate-200">{selectedCCNL.settore || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Data tabella</span>
                  <p className="text-slate-200">{selectedCCNL.data_tabella || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 flex-1"
              onClick={() => setSelectedCCNL(null)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Cambia
            </Button>
            <Button 
              className="bg-lime-500 hover:bg-lime-600 text-black flex-1"
              onClick={() => onComplete(selectedCCNL.ccnl_nome)}
            >
              Conferma e prosegui <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-white font-semibold">Step 1 — Seleziona CCNL</h3>
        <p className="text-slate-400 text-xs">
          {ccnlList.length} CCNL disponibili con tabelle retributive ufficiali
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cerca per nome, settore, codice CNEL..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
          {filtered.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Nessun CCNL trovato per "{searchTerm}"</p>
          ) : searchTerm.trim() ? (
            // Flat list when searching
            filtered.map(c => (
              <CCNLItem key={c.ccnl_nome} ccnl={c} onSelect={setSelectedCCNL} />
            ))
          ) : (
            // Grouped by sector when not searching
            grouped.map(([sector, items]) => (
              <div key={sector}>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 sticky top-0 bg-slate-800 py-1 z-10">
                  {sector} ({items.length})
                </p>
                {items.map(c => (
                  <CCNLItem key={c.ccnl_nome} ccnl={c} onSelect={setSelectedCCNL} />
                ))}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CCNLItem({ ccnl, onSelect }) {
  return (
    <button
      onClick={() => onSelect(ccnl)}
      className="w-full text-left p-3 rounded-lg border border-slate-700 hover:border-lime-500/50 hover:bg-slate-700/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate group-hover:text-lime-300">
            {ccnl.categoria || ccnl.ccnl_nome}
          </p>
          <p className="text-slate-400 text-xs truncate mt-0.5">{ccnl.settore}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {ccnl.codice_cnel && (
            <Badge variant="outline" className="text-slate-400 border-slate-600 text-[10px]">
              {ccnl.codice_cnel}
            </Badge>
          )}
          {ccnl.data_tabella && (
            <span className="text-slate-500 text-[10px]">{ccnl.data_tabella}</span>
          )}
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-lime-400" />
        </div>
      </div>
    </button>
  );
}