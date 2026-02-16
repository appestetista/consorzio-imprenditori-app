import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

const OP_CONFIG = {
  creazione: { icon: Plus, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Creazione' },
  modifica: { icon: Edit, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Modifica' },
  eliminazione: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Eliminazione' }
};

export default function LogAliquoteViewer() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['log-modifiche-aliquote'],
    queryFn: () => base44.entities.LogModificaAliquota.list('-created_date', 50),
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-slate-400 text-center py-8 text-sm">Nessuna modifica registrata</p>;
  }

  return (
    <div className="space-y-2 mt-2">
      {logs.map(log => {
        const config = OP_CONFIG[log.tipo_operazione] || OP_CONFIG.modifica;
        const Icon = config.icon;
        return (
          <Card key={log.id} className="bg-slate-800 border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${config.bg} ${config.color} border-0 text-[10px]`}>{config.label}</Badge>
                    {log.regione && <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px]">{log.regione}</Badge>}
                  </div>
                  {log.note && <p className="text-slate-300 text-xs mt-1">{log.note}</p>}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                    <span>{log.user_name || log.user_email}</span>
                    <span>•</span>
                    <span>{log.created_date ? new Date(log.created_date).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
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