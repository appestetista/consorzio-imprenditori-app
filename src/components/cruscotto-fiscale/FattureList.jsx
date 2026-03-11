import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpRight, ArrowDownLeft, Search } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '-';

const STATE_COLORS = {
  DONE: 'bg-green-500/20 text-green-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  RECEIVED: 'bg-blue-500/20 text-blue-400',
  SENT: 'bg-amber-500/20 text-amber-400',
  NEW: 'bg-slate-500/20 text-slate-400',
  ERROR: 'bg-red-500/20 text-red-400'
};

export default function FattureList({ fatture }) {
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState('all');

  const filtered = fatture.filter(f => {
    const matchDir = dirFilter === 'all' || f.direction === dirFilter;
    const matchSearch = !search ||
      (f.mittente_nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.destinatario_nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.numero_documento || '').toLowerCase().includes(search.toLowerCase());
    return matchDir && matchSearch;
  }).sort((a, b) => (b.data_emissione || '').localeCompare(a.data_emissione || ''));

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-white text-sm">Elenco Fatture ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Cerca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 bg-slate-900 border-slate-600 text-white text-xs w-44"
              />
            </div>
            <Select value={dirFilter} onValueChange={setDirFilter}>
              <SelectTrigger className="h-8 w-32 bg-slate-900 border-slate-600 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="outgoing">Emesse</SelectItem>
                <SelectItem value="incoming">Ricevute</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-center py-8 text-sm">Nessuna fattura trovata</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filtered.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors">
                <div className={`p-1.5 rounded-lg ${f.direction === 'outgoing' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                  {f.direction === 'outgoing'
                    ? <ArrowUpRight className="w-4 h-4 text-green-400" />
                    : <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">
                      {f.direction === 'outgoing' ? f.destinatario_nome : f.mittente_nome || 'N/D'}
                    </span>
                    <Badge className={`text-[10px] ${STATE_COLORS[f.sdi_status] || STATE_COLORS[f.state] || STATE_COLORS.NEW}`}>
                      {f.sdi_status || f.state || 'NEW'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-500 text-xs">{f.numero_documento || '-'}</span>
                    <span className="text-slate-600 text-xs">•</span>
                    <span className="text-slate-500 text-xs">{fmtDate(f.data_emissione)}</span>
                    <span className="text-slate-600 text-xs">•</span>
                    <span className="text-slate-500 text-xs">{f.tipo_documento || '-'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">{fmt(f.importo_totale)}</p>
                  <p className="text-slate-500 text-xs">Imp. {fmt(f.imponibile)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}