import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Ship, Loader2, Clock, Package, MapPin, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SearchHistory({ userEmail, onOpenAnalysis }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['search-history', userEmail],
    queryFn: () => base44.entities.UsageLog.filter(
      { user_email: userEmail, action_type: { $in: ['export_analysis', 'import_analysis'] } },
      '-created_date',
      50
    ),
    enabled: !!userEmail,
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
      <Card className="bg-slate-800/50 border-white/5">
        <CardContent className="p-6 text-center">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nessuna ricerca effettuata</p>
          <p className="text-slate-500 text-xs mt-1">Le tue analisi Export e Import appariranno qui</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Link to={createPageUrl('MyProfile') + '?tab=profilo&scrollTo=export'}>
        <div className="flex items-center gap-3 bg-slate-800/60 border border-lime-400/20 rounded-xl px-4 py-3 hover:border-lime-400/40 transition-colors cursor-pointer mb-2">
          <Settings className="w-5 h-5 text-lime-400" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">Gestisci prodotti export</p>
            <p className="text-slate-400 text-[10px]">Aggiungi, modifica o rimuovi i tuoi prodotti nel profilo</p>
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

        return (
          <Card key={log.id} className={`bg-slate-800/50 border-white/5 hover:border-white/10 transition-colors ${hasSnapshot ? 'cursor-pointer' : ''}`}
            onClick={() => { if (hasSnapshot && onOpenAnalysis) onOpenAnalysis(log); }}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isExport ? 'bg-lime-500/10' : 'bg-red-500/10'
                }`}>
                  {isExport 
                    ? <TrendingUp className="w-4 h-4 text-lime-400" />
                    : <Ship className="w-4 h-4 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                      isExport ? 'text-lime-400 border-lime-400/30' : 'text-red-400 border-red-400/30'
                    }`}>
                      {isExport ? 'EXPORT' : 'IMPORT'}
                    </Badge>
                    <span className="text-slate-500 text-[10px]">{formattedDate} · {formattedTime}</span>
                    {hasSnapshot && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-400 border-emerald-400/30">
                        Rivedi
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-white text-sm font-medium truncate">
                    {log.search_label || meta.prodotto || '—'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {meta.hs_code && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                        <Package className="w-3 h-3" /> HS {meta.hs_code}
                      </span>
                    )}
                    {meta.mercati?.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                        <MapPin className="w-3 h-3" /> {meta.mercati.slice(0, 3).join(', ')}{meta.mercati.length > 3 ? ` +${meta.mercati.length - 3}` : ''}
                      </span>
                    )}
                    {meta.settore && (
                      <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                        {meta.settore}
                      </span>
                    )}
                    {meta.tipo_richiesta && (
                      <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                        {meta.tipo_richiesta}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}