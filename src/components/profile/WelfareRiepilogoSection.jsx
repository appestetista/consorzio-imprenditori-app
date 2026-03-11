import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileText, FileSpreadsheet, Download, ChevronDown, ChevronUp, ShieldCheck, Package, UtensilsCrossed, ShoppingBag, Users, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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

function RequestCard({ request }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TIPO_ICONS[request.tipo_buono] || Package;
  const color = TIPO_COLORS[request.tipo_buono] || 'text-slate-400';

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-3 text-left">
        <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{TIPO_LABELS[request.tipo_buono]}</p>
          <p className="text-slate-500 text-[10px]">{moment(request.created_date).format('DD/MM/YYYY HH:mm')}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          request.status === 'completato' ? 'bg-green-500/20 text-green-400' :
          request.status === 'excel_inviato' ? 'bg-cyan-500/20 text-cyan-400' :
          'bg-amber-500/20 text-amber-400'
        }`}>
          {request.status === 'completato' ? 'Completato' : request.status === 'excel_inviato' ? 'Excel inviato' : 'Contratto inviato'}
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
          {request.user_name && <p className="text-slate-500 text-[10px]">Azienda: {request.user_name}</p>}
        </div>
      )}
    </div>
  );
}

function EmployeeAlertCard({ employee }) {
  const [expanded, setExpanded] = useState(false);
  const hasAlerts = employee.alerts.length > 0;

  return (
    <div className={`rounded-lg border overflow-hidden ${hasAlerts ? 'bg-red-500/5 border-red-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 p-2 text-left">
        {hasAlerts && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
        <span className={`text-xs font-medium flex-1 truncate ${hasAlerts ? 'text-red-300' : 'text-white'}`}>
          {employee.nome}
        </span>
        {employee.totale_buoni_spesa > 0 && (
          <span className="text-pink-400 text-[10px] font-mono">Spesa: €{employee.totale_buoni_spesa.toLocaleString('it-IT', {minimumFractionDigits:2})}</span>
        )}
        {employee.totale_buoni_omaggio > 0 && (
          <span className="text-purple-400 text-[10px] font-mono ml-1">Omaggio: €{employee.totale_buoni_omaggio.toLocaleString('it-IT', {minimumFractionDigits:2})}</span>
        )}
        {expanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1 border-t border-slate-700/50 pt-1.5">
          {employee.codice_fiscale && <p className="text-slate-500 text-[9px]">CF: {employee.codice_fiscale}</p>}
          {employee.email && <p className="text-slate-500 text-[9px]">Email: {employee.email}</p>}
          {employee.alerts.map((alert, i) => (
            <div key={i} className={`rounded-md px-2 py-1.5 ${alert.severity === 'critical' ? 'bg-red-500/20 border border-red-500/40' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              <p className={`text-[10px] leading-relaxed ${alert.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                {alert.messaggio}
              </p>
            </div>
          ))}
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

  // Analisi Excel dipendenti
  const { data: analysis, isLoading: analyzing, refetch: refetchAnalysis } = useQuery({
    queryKey: ['welfare-analysis', userEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('analyzeWelfareExcel', { user_email: userEmail });
      return res.data;
    },
    enabled: !!userEmail && requests.some(r => r.excel_url),
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const grouped = useMemo(() => {
    const groups = { buoni_pasto: [], buoni_spesa: [], buoni_omaggio: [] };
    requests.forEach(r => { if (groups[r.tipo_buono]) groups[r.tipo_buono].push(r); });
    return groups;
  }, [requests]);

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

  const hasExcel = requests.some(r => r.excel_url);
  const alertCount = analysis?.alerts?.length || 0;
  const employeesWithAlerts = (analysis?.employees || []).filter(e => e.alerts.length > 0);
  const employeesOk = (analysis?.employees || []).filter(e => e.alerts.length === 0);

  return (
    <Card className="bg-slate-800 border-pink-500/30 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <ShieldCheck className="w-5 h-5 text-pink-400" />
          Riepilogo Welfare Aziendale
          {alertCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {alertCount} {alertCount === 1 ? 'avviso' : 'avvisi'}
            </span>
          )}
        </CardTitle>
        <p className="text-slate-500 text-[10px]">Storico ordini, documenti e controllo soglie per dipendente</p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ALERT GLOBALI per superamento soglie */}
        {alertCount > 0 && (
          <Alert className="bg-red-500/10 border-red-500/40">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300 text-xs">
              <strong className="text-red-400">⚠️ Soglie superate per {employeesWithAlerts.length} dipendenti!</strong>
              <br />
              Verifica i dettagli qui sotto. Il superamento comporta la perdita dell'esenzione fiscale sull'intero importo (art. 51, c.3 TUIR).
            </AlertDescription>
          </Alert>
        )}

        {/* SEZIONE DIPENDENTI con alert */}
        {employeesWithAlerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h4 className="text-red-400 text-sm font-semibold">Dipendenti con superamento soglia</h4>
            </div>
            <div className="space-y-1.5">
              {employeesWithAlerts.map((emp, i) => <EmployeeAlertCard key={i} employee={emp} />)}
            </div>
          </div>
        )}

        {/* SEZIONE DIPENDENTI ok */}
        {employeesOk.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-green-400" />
              <h4 className="text-green-400 text-sm font-semibold">Dipendenti entro le soglie ({employeesOk.length})</h4>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {employeesOk.map((emp, i) => <EmployeeAlertCard key={i} employee={emp} />)}
            </div>
          </div>
        )}

        {/* Loading analisi */}
        {hasExcel && analyzing && (
          <div className="flex items-center gap-2 py-3 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
            <span className="text-slate-400 text-xs">Analisi Excel dipendenti in corso...</span>
          </div>
        )}

        {/* Pulsante rianalizza */}
        {hasExcel && !analyzing && analysis && (
          <Button onClick={() => refetchAnalysis()} variant="outline" size="sm" className="w-full border-slate-700 text-slate-400 hover:text-white text-xs">
            <RefreshCw className="w-3 h-3 mr-2" />
            Rianalizza Excel ({analysis.total_employees_found} dipendenti trovati)
          </Button>
        )}

        {/* Riepilogo ordini per tipo */}
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
            📜 Soglie fringe benefit (buoni spesa/regalo): €1.000 annui (€2.000 con figli a carico) — Art. 51, c.3 TUIR, L. 207/2024. Buoni pasto: €10/giorno elettronici, €4/giorno cartacei — Art. 51, c.2 lett. c) TUIR. Buoni omaggio: €50/singolo — Art. 108, c.2 TUIR. Superamento soglia fringe benefit = tassazione sull'intero importo (effetto "tutto o niente").
          </p>
        </div>
      </CardContent>
    </Card>
  );
}