import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Trash2, ChevronRight, Loader2, Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0';

const TIPO_LABELS = {
  dipendente: { label: 'Dipendente', color: 'bg-lime-500/20 text-lime-400 border-lime-500/30' },
  amministratore: { label: 'Amministratore', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  socio_lavoratore: { label: 'Socio Lavoratore', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  gestione_separata: { label: 'Gest. Separata', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
};

const CONTRATTO_LABELS = {
  'indeterminato_fulltime': 'Indet. FT',
  'indeterminato_parttime': 'Indet. PT',
  'determinato_fulltime': 'Det. FT',
  'determinato_parttime': 'Det. PT',
  'apprendistato': 'Appr.',
};

export default function StoricoCalcoli({ onLoadSimulazione }) {
  const [selectedId, setSelectedId] = useState(null);

  const { data: storico, isLoading, refetch } = useQuery({
    queryKey: ['storico-simulazioni-costo'],
    queryFn: () => base44.entities.StoricoSimulazioneCosto.list('-created_date', 50),
    initialData: [],
  });

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await base44.entities.StoricoSimulazioneCosto.delete(id);
    toast.success('Simulazione eliminata');
    setSelectedId(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
        <span className="text-slate-400 text-sm">Caricamento storico...</span>
      </div>
    );
  }

  // Detail view
  if (selectedId) {
    const sim = storico.find(s => s.id === selectedId);
    if (!sim) { setSelectedId(null); return null; }
    const tipo = TIPO_LABELS[sim.tipo_simulazione] || TIPO_LABELS.dipendente;
    const res = sim.risultato_completo || {};

    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          className="text-slate-400 hover:text-white p-0 h-auto"
          onClick={() => setSelectedId(null)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Torna alla lista
        </Button>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white font-bold text-lg">{sim.etichetta}</p>
                <Badge variant="outline" className={tipo.color + ' text-xs mt-1'}>
                  {tipo.label}
                </Badge>
              </div>
              <span className="text-slate-500 text-xs">
                {new Date(sim.created_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Parametri input */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-700 pt-3">
              {sim.ccnl && <div><span className="text-slate-500">CCNL:</span> <span className="text-white">{sim.ccnl}</span></div>}
              {sim.livello && <div><span className="text-slate-500">Livello:</span> <span className="text-white">{sim.livello}</span></div>}
              {sim.tipo_contratto && <div><span className="text-slate-500">Contratto:</span> <span className="text-white">{CONTRATTO_LABELS[sim.tipo_contratto] || sim.tipo_contratto}</span></div>}
              {sim.regione && <div><span className="text-slate-500">Regione:</span> <span className="text-white">{sim.regione}</span></div>}
              <div><span className="text-slate-500">RAL/Compenso:</span> <span className="text-white">€{fmt(sim.ral)}</span></div>
              {sim.mensilita > 0 && <div><span className="text-slate-500">Mensilità:</span> <span className="text-white">{sim.mensilita}</span></div>}
              <div><span className="text-slate-500">Anno norm.:</span> <span className="text-white">{sim.anno_normativo}</span></div>
            </div>

            {/* Risultati chiave */}
            <div className="border-t border-slate-700 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-red-400 font-semibold">Costo totale annuo</span>
                <span className="text-red-400 font-bold">€{fmt(sim.costo_totale_annuo)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Costo mensile</span>
                <span className="text-white">€{fmt(sim.costo_mensile)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-400 font-semibold">Netto annuo</span>
                <span className="text-green-400 font-bold">€{fmt(sim.netto_annuo)}</span>
              </div>
              {sim.netto_mensile > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Netto mensile</span>
                  <span className="text-white">€{fmt(sim.netto_mensile)}</span>
                </div>
              )}
            </div>

            {/* Profilo lavoratore */}
            {sim.profilo_lavoratore && (sim.profilo_lavoratore.eta || sim.profilo_lavoratore.donna_disoccupata || sim.profilo_lavoratore.percettore_naspi) && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-slate-500 text-xs font-semibold mb-1">Profilo lavoratore</p>
                <div className="flex flex-wrap gap-1">
                  {sim.profilo_lavoratore.eta && <Badge variant="outline" className="text-slate-300 border-slate-600 text-xs">Età: {sim.profilo_lavoratore.eta}</Badge>}
                  {sim.profilo_lavoratore.donna_disoccupata && <Badge variant="outline" className="text-pink-300 border-pink-500/30 text-xs">Donna disoccupata</Badge>}
                  {sim.profilo_lavoratore.percettore_naspi && <Badge variant="outline" className="text-blue-300 border-blue-500/30 text-xs">Percettore NASpI</Badge>}
                </div>
              </div>
            )}

            {/* Note */}
            {sim.note && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-slate-500 text-xs font-semibold mb-1">Note</p>
                <p className="text-slate-300 text-sm">{sim.note}</p>
              </div>
            )}

            {/* Azioni */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={(e) => handleDelete(sim.id, e)}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Elimina
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  if (!storico || storico.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 text-center">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nessuna simulazione salvata</p>
          <p className="text-slate-500 text-xs mt-1">Esegui una simulazione e clicca "Salva nello storico"</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-slate-400 text-xs">{storico.length} simulazion{storico.length === 1 ? 'e' : 'i'} salvat{storico.length === 1 ? 'a' : 'e'}</p>
      {storico.map(sim => {
        const tipo = TIPO_LABELS[sim.tipo_simulazione] || TIPO_LABELS.dipendente;
        return (
          <button
            key={sim.id}
            onClick={() => setSelectedId(sim.id)}
            className="w-full text-left p-3 bg-slate-800 border border-slate-700 rounded-lg hover:border-lime-500/50 hover:bg-slate-700/50 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate group-hover:text-lime-300">
                  {sim.etichetta}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={tipo.color + ' text-[10px] px-1.5 py-0'}>
                    {tipo.label}
                  </Badge>
                  {sim.tipo_contratto && (
                    <span className="text-slate-500 text-[10px]">
                      {CONTRATTO_LABELS[sim.tipo_contratto] || sim.tipo_contratto}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-red-400 font-bold text-sm">€{fmt(sim.costo_totale_annuo)}</span>
                <span className="text-slate-500 text-[10px]">
                  {new Date(sim.created_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}