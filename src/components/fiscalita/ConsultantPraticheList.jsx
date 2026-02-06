import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  ChevronRight, 
  Inbox,
  Filter
} from 'lucide-react';
import PraticaStatusBadge from './PraticaStatusBadge';
import ConsultantPraticaView from './ConsultantPraticaView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS } from './praticaStateMachine';

export default function ConsultantPraticheList({ consultantId, consultantEmail }) {
  const [selectedPratica, setSelectedPratica] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: pratiche = [], isLoading } = useQuery({
    queryKey: ['fiscalita-pratiche', consultantId],
    queryFn: () => base44.entities.RichiestaFiscalitaEnergetica.filter({
      consultant_id: consultantId
    }, '-created_date'),
    enabled: !!consultantId
  });

  const filteredPratiche = statusFilter === 'all' 
    ? pratiche 
    : pratiche.filter(p => p.status === statusFilter);

  // Conteggi per filtri rapidi
  const counts = {
    all: pratiche.length,
    pending: pratiche.filter(p => p.status === 'pending').length,
    assigned: pratiche.filter(p => p.status === 'assigned').length,
    in_analysis: pratiche.filter(p => p.status === 'in_analysis').length,
    docs_requested: pratiche.filter(p => p.status === 'docs_requested').length,
    docs_received: pratiche.filter(p => p.status === 'docs_received').length,
    in_progress: pratiche.filter(p => ['report_ready', 'in_progress'].includes(p.status)).length,
    completed: pratiche.filter(p => p.status === 'completed').length
  };

  if (selectedPratica) {
    // Trova la pratica aggiornata dai dati
    const praticaAggiornata = pratiche.find(p => p.id === selectedPratica.id) || selectedPratica;
    return (
      <ConsultantPraticaView 
        pratica={praticaAggiornata}
        onBack={() => setSelectedPratica(null)}
        consultantEmail={consultantEmail}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header e Filtri */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">
          Pratiche Fiscalità Energetica
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">
                Tutte ({counts.all})
              </SelectItem>
              <SelectItem value="assigned" className="text-white">
                Assegnate ({counts.assigned})
              </SelectItem>
              <SelectItem value="in_analysis" className="text-white">
                In analisi ({counts.in_analysis})
              </SelectItem>
              <SelectItem value="docs_requested" className="text-white">
                Attesa doc. ({counts.docs_requested})
              </SelectItem>
              <SelectItem value="docs_received" className="text-white">
                Doc. ricevuti ({counts.docs_received})
              </SelectItem>
              <SelectItem value="in_progress" className="text-white">
                In corso ({counts.in_progress})
              </SelectItem>
              <SelectItem value="completed" className="text-white">
                Completate ({counts.completed})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-blue-900/30 border-blue-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{counts.assigned}</p>
            <p className="text-blue-300 text-xs">Nuove</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-900/30 border-yellow-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{counts.in_analysis}</p>
            <p className="text-yellow-300 text-xs">In analisi</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-900/30 border-orange-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{counts.docs_requested + counts.docs_received}</p>
            <p className="text-orange-300 text-xs">Documenti</p>
          </CardContent>
        </Card>
        <Card className="bg-lime-900/30 border-lime-800">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-lime-400">{counts.in_progress}</p>
            <p className="text-lime-300 text-xs">In corso</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista Pratiche */}
      {filteredPratiche.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              {statusFilter === 'all' 
                ? 'Nessuna pratica assegnata' 
                : `Nessuna pratica con stato "${STATUS_LABELS[statusFilter]}"`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPratiche.map(pratica => (
            <Card 
              key={pratica.id}
              className="bg-slate-800/50 border-slate-700 hover:border-slate-600 cursor-pointer transition-colors"
              onClick={() => setSelectedPratica(pratica)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {pratica.ragione_sociale}
                    </p>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <span>{pratica.settore_attivita}</span>
                      <span>•</span>
                      <span>{format(new Date(pratica.created_date), "d MMM", { locale: it })}</span>
                    </div>
                  </div>
                  <PraticaStatusBadge status={pratica.status} size="small" />
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}