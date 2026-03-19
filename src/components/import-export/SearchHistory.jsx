import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Ship, Loader2, Clock, Package, MapPin, Trash2, Eye, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SearchHistory({ userEmail, onOpenAnalysis, filterType }) {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['search-history', userEmail, filterType],
    queryFn: () => base44.entities.UsageLog.filter(
      { user_email: userEmail, action_type: filterType || { $in: ['export_analysis', 'import_analysis'] } },
      '-created_date',
      50
    ),
    enabled: !!userEmail,
  });

  const deleteMutation = useMutation({
    mutationFn: (logId) => base44.entities.UsageLog.delete(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history', userEmail] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(10, 15, 26, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-white/70 text-sm">Nessuna ricerca effettuata</p>
        <p className="text-white/40 text-xs mt-1">Le tue analisi Export e Import appariranno qui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Link to={createPageUrl('MyProfile') + '?tab=profilo&scrollTo=export'}>
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 hover:border-lime-400/40 transition-colors cursor-pointer mb-2"
          style={{ background: 'rgba(10, 15, 26, 0.95)', border: '1px solid rgba(132, 255, 0, 0.15)' }}>
          <Settings className="w-5 h-5 text-lime-400" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Gestisci prodotti export</p>
            <p className="text-white/40 text-[10px]">Aggiungi, modifica o rimuovi i tuoi prodotti nel profilo</p>
          </div>
          <span className="text-lime-400 text-xs">→</span>
        </div>
      </Link>

      {logs.map((log) => {
        const isExport = log.action_type === 'export_analysis';
        const meta = log.search_meta || {};
        const date = new Date(log.created_date);
        const formattedDate = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const hasSnapshot = !!log.analysis_snapshot?.analysisResult;
        const title = log.search_label || meta.prodotto || 'Analisi senza titolo';

        return (
          <div key={log.id}
            onClick={() => { if (hasSnapshot && onOpenAnalysis) onOpenAnalysis(log); }}
            className={`rounded-xl overflow-hidden transition-all ${hasSnapshot ? 'cursor-pointer active:scale-[0.98]' : ''}`}
            style={{ background: 'rgba(10, 15, 26, 0.95)', border: hasSnapshot ? '1px solid rgba(132, 255, 0, 0.15)' : '1px solid rgba(255,255,255,0.08)' }}>

            {/* Data in alto */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-white/50 text-[10px] font-medium">{formattedDate} · {formattedTime}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${
                isExport ? 'text-lime-400 border-lime-400/30' : 'text-red-400 border-red-400/30'
              }`}>
                {isExport ? 'EXPORT' : 'IMPORT'}
              </Badge>
            </div>

            {/* Riga principale */}
            <div className="px-4 pb-3">
              {/* Titolo prodotto */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isExport ? 'bg-lime-500/15' : 'bg-red-500/15'
                }`}>
                  {isExport
                    ? <TrendingUp className="w-3.5 h-3.5 text-lime-400" />
                    : <Ship className="w-3.5 h-3.5 text-red-400" />
                  }
                </div>
                <p className="text-white font-semibold text-sm flex-1">
                  {title}
                </p>
              </div>

              {/* Info chips: HS code, settore, mercati */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {meta.hs_code && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-white/70 bg-white/8 px-2 py-0.5 rounded-full">
                    <Package className="w-3 h-3" /> HS {meta.hs_code}
                  </span>
                )}
                {meta.settore && (
                  <span className="text-[10px] text-white/60 bg-white/8 px-2 py-0.5 rounded-full">
                    {meta.settore}
                  </span>
                )}
                {meta.mercati?.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-white/70 bg-white/8 px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3" /> {meta.mercati.slice(0, 3).join(', ')}{meta.mercati.length > 3 ? ` +${meta.mercati.length - 3}` : ''}
                  </span>
                )}
                {meta.tipo_richiesta && (
                  <span className="text-[10px] text-white/60 bg-white/8 px-2 py-0.5 rounded-full">
                    {meta.tipo_richiesta}
                  </span>
                )}
              </div>

              {/* Azioni */}
              <div className="flex items-center justify-between">
                {hasSnapshot ? (
                  <span className="text-lime-400 text-[11px] font-semibold flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Tocca per rivedere
                  </span>
                ) : (
                  <span className="text-white/30 text-[10px]">Nessuno snapshot disponibile</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Eliminare questa ricerca dallo storico?')) {
                      deleteMutation.mutate(log.id);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95"
                  style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}