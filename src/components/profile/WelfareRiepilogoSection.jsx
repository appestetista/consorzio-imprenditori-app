import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileText, FileSpreadsheet, Download, ChevronDown, ChevronUp, ShieldCheck, Package, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import moment from 'moment';

const TIPO_LABELS = {
  buoni_pasto: 'Buoni Pasto',
  buoni_spesa: 'Buoni Spesa',
  buoni_omaggio: 'Buoni Omaggio',
};

const TIPO_ICONS = {
  buoni_pasto: UtensilsCrossed,
  buoni_spesa: ShoppingBag,
  buoni_omaggio: Package,
};

const TIPO_COLORS = {
  buoni_pasto: 'text-orange-400',
  buoni_spesa: 'text-pink-400',
  buoni_omaggio: 'text-purple-400',
};

// Soglie fringe benefit 2025-2027 (art. 51 c.3 TUIR, L. 207/2024)
const SOGLIA_SENZA_FIGLI = 1000;
const SOGLIA_CON_FIGLI = 2000;

function RequestCard({ request }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TIPO_ICONS[request.tipo_buono] || Package;
  const color = TIPO_COLORS[request.tipo_buono] || 'text-slate-400';

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {TIPO_LABELS[request.tipo_buono]}
          </p>
          <p className="text-slate-500 text-[10px]">
            {moment(request.created_date).format('DD/MM/YYYY HH:mm')}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          request.status === 'completato' ? 'bg-green-500/20 text-green-400' :
          request.status === 'excel_inviato' ? 'bg-cyan-500/20 text-cyan-400' :
          'bg-amber-500/20 text-amber-400'
        }`}>
          {request.status === 'completato' ? 'Completato' :
           request.status === 'excel_inviato' ? 'Excel inviato' : 'Contratto inviato'}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
          {request.contratto_url && (
            <a href={request.contratto_url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 hover:bg-slate-800 transition-colors">
              <FileText className="w-4 h-4 text-pink-400 flex-shrink-0" />
              <span className="text-slate-300 text-xs flex-1 truncate">{request.contratto_nome || 'Contratto firmato'}</span>
              <Download className="w-3 h-3 text-slate-500" />
            </a>
          )}
          {request.excel_url && (
            <a href={request.excel_url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 hover:bg-slate-800 transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300 text-xs flex-1 truncate">{request.excel_nome || 'Tabella dipendenti'}</span>
              <Download className="w-3 h-3 text-slate-500" />
            </a>
          )}
          {request.user_name && (
            <p className="text-slate-500 text-[10px]">Azienda: {request.user_name}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function WelfareRiepilogoSection({ userEmail }) {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['welfare-requests', userEmail],
    queryFn: () => base44.entities.WelfareRequest.filter({ user_email: userEmail }, '-created_date'),
    enabled: !!userEmail,
  });

  // Raggruppa per tipo
  const grouped = useMemo(() => {
    const groups = { buoni_pasto: [], buoni_spesa: [], buoni_omaggio: [] };
    requests.forEach(r => {
      if (groups[r.tipo_buono]) groups[r.tipo_buono].push(r);
    });
    return groups;
  }, [requests]);

  // Analizza Excel caricati per individuare dipendenti con superamento soglia
  // Per ora mostra un avviso generico basato sul numero di ordini buoni spesa
  const buoniSpesaCount = grouped.buoni_spesa.length;
  const buoniOmaggioCount = grouped.buoni_omaggio.length;

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700 mb-4">
        <CardContent className="p-4 flex items-center justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full mr-2" />
          <span className="text-slate-400 text-sm">Caricamento ordini welfare...</span>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) return null;

  return (
    <Card className="bg-slate-800 border-pink-500/30 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <ShieldCheck className="w-5 h-5 text-pink-400" />
          Riepilogo Welfare Aziendale
        </CardTitle>
        <p className="text-slate-500 text-[10px]">Storico ordini: contratti firmati, tabelle dipendenti e avvisi sui limiti</p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Avvisi soglie */}
        {buoniSpesaCount > 1 && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-slate-300 text-xs">
              <strong className="text-amber-400">Attenzione soglie fringe benefit:</strong> hai {buoniSpesaCount} ordini di Buoni Spesa quest'anno. Verifica che il totale annuo per ciascun dipendente non superi <strong className="text-white">€{SOGLIA_SENZA_FIGLI.toLocaleString('it-IT')}</strong> (o <strong className="text-white">€{SOGLIA_CON_FIGLI.toLocaleString('it-IT')}</strong> con figli a carico), altrimenti perdi <strong className="text-red-400">tutta</strong> l'esenzione fiscale sull'intero importo (art. 51, c.3 TUIR).
            </AlertDescription>
          </Alert>
        )}

        {buoniOmaggioCount > 1 && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-slate-300 text-xs">
              <strong className="text-amber-400">Attenzione omaggi:</strong> hai {buoniOmaggioCount} ordini di Buoni Omaggio. Verifica che ogni singolo omaggio allo stesso destinatario resti entro <strong className="text-white">€50</strong> per mantenere la piena deducibilità (art. 108, c.2 TUIR + DM 19/11/2008).
            </AlertDescription>
          </Alert>
        )}

        {/* Riepilogo per tipo */}
        {Object.entries(grouped).map(([tipo, items]) => {
          if (items.length === 0) return null;
          const Icon = TIPO_ICONS[tipo];
          const color = TIPO_COLORS[tipo];
          return (
            <div key={tipo}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <h4 className="text-white text-sm font-semibold">{TIPO_LABELS[tipo]}</h4>
                <span className="text-slate-500 text-[10px]">({items.length} ordini)</span>
              </div>
              <div className="space-y-2">
                {items.map(r => <RequestCard key={r.id} request={r} />)}
              </div>
            </div>
          );
        })}

        {/* Info normativa */}
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-500 text-[9px] leading-relaxed">
            📜 Soglie fringe benefit (buoni spesa/regalo): €1.000 annui (€2.000 con figli a carico) — Art. 51, c.3 TUIR, L. 207/2024. Buoni pasto: €10/giorno elettronici, €4/giorno cartacei — Art. 51, c.2 lett. c) TUIR. Buoni omaggio: €50/singolo omaggio — Art. 108, c.2 TUIR.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}