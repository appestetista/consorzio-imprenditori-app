import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Globe, Mail, TrendingUp, Ship, Eye, Trash2, BarChart3, Clock, Users, ChevronRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';

function MessageCard({ msg, onMarkRead, onDelete }) {
  const isExport = msg.source_reference?.toLowerCase().includes('export');
  return (
    <Card className={`border ${!msg.is_read ? 'bg-lime-400/10 border-lime-400/30' : 'bg-slate-800 border-slate-700'}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isExport ? 'bg-lime-500/20' : 'bg-red-500/20'}`}>
              {isExport ? <TrendingUp className="w-3.5 h-3.5 text-lime-400" /> : <Ship className="w-3.5 h-3.5 text-red-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{msg.from_name || msg.from_email}</p>
              <p className="text-slate-500 text-[10px]">{msg.from_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge className={`text-[9px] ${isExport ? 'bg-lime-500/20 text-lime-400' : 'bg-red-500/20 text-red-400'} border-0`}>
              {isExport ? 'Export' : 'Import'}
            </Badge>
            {!msg.is_read && <Badge className="bg-lime-400 text-slate-900 text-[9px] border-0">NUOVO</Badge>}
          </div>
        </div>
        {msg.to_name && <p className="text-slate-400 text-[10px] mb-1">→ {msg.to_name} ({msg.to_email})</p>}
        <div className="bg-slate-900 rounded-lg p-2 mb-2">
          <p className="text-white text-xs whitespace-pre-wrap line-clamp-4">{msg.content}</p>
        </div>
        {msg.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {msg.attachments.map((att, i) => (
              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="bg-slate-700 text-lime-400 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                📎 {att.name}
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-[10px]">{moment(msg.created_date).format('DD/MM/YYYY HH:mm')}</p>
          <div className="flex gap-1">
            {!msg.is_read && (
              <Button variant="outline" size="sm" className="border-lime-400 text-lime-400 hover:bg-lime-400/20 h-6 text-[10px]" onClick={() => onMarkRead(msg.id)}>
                <Eye className="w-3 h-3 mr-1" /> Letto
              </Button>
            )}
            <Link to={`${createPageUrl('Messaggi')}?contact=${encodeURIComponent(msg.from_email)}`}>
              <Button size="sm" className="bg-lime-400 hover:bg-lime-500 text-slate-900 h-6 text-[10px]">
                <Mail className="w-3 h-3 mr-1" /> Rispondi
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20 h-6 w-6 p-0">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Eliminare questo messaggio?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-700 text-slate-400 border-slate-600">Annulla</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => onDelete(msg.id)}>Elimina</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ImportExportAdmin({ user }) {
  const queryClient = useQueryClient();
  const [msgFilter, setMsgFilter] = useState('all'); // all, import, export, unread

  // Tutti i messaggi import/export
  const { data: allMessages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['admin-ie-messages'],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ source: 'import_export' });
      const users = await base44.entities.User.list();
      const consultants = await base44.entities.Consultant.list();
      return msgs.map(m => {
        const fromUser = users.find(u => u.email === m.from_email);
        const toUser = users.find(u => u.email === m.to_email);
        const fromCons = consultants.find(c => c.email === m.from_email);
        const toCons = consultants.find(c => c.email === m.to_email);
        return {
          ...m,
          from_name: fromUser?.company_name || fromUser?.full_name || fromCons?.name || m.from_email,
          to_name: toUser?.company_name || toUser?.full_name || toCons?.name || m.to_email,
        };
      }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
  });

  // Statistiche utilizzo AI export/import
  const { data: usageLogs = [] } = useQuery({
    queryKey: ['admin-ie-usage'],
    queryFn: async () => {
      const [exportLogs, importLogs] = await Promise.all([
        base44.entities.UsageLog.filter({ action_type: 'export_analysis' }),
        base44.entities.UsageLog.filter({ action_type: 'import_analysis' }),
      ]);
      return [...exportLogs, ...importLogs];
    },
  });

  // Consulenti export
  const { data: exportConsultants = [] } = useQuery({
    queryKey: ['admin-ie-consultants'],
    queryFn: () => base44.entities.Consultant.filter({ category: 'Internazionalizzazione/Export' }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ie-messages'] }),
  });

  const deleteMsgMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ie-messages'] }),
  });

  // Filtra messaggi
  const filteredMsgs = allMessages.filter(m => {
    if (msgFilter === 'unread') return !m.is_read;
    if (msgFilter === 'import') return m.source_reference?.toLowerCase().includes('import');
    if (msgFilter === 'export') return m.source_reference?.toLowerCase().includes('export');
    return true;
  });

  const unreadCount = allMessages.filter(m => !m.is_read).length;
  const importMsgCount = allMessages.filter(m => m.source_reference?.toLowerCase().includes('import')).length;
  const exportMsgCount = allMessages.filter(m => m.source_reference?.toLowerCase().includes('export')).length;

  // Stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const exportUsageThisMonth = usageLogs.filter(l => l.action_type === 'export_analysis' && l.created_date?.startsWith(thisMonth)).length;
  const importUsageThisMonth = usageLogs.filter(l => l.action_type === 'import_analysis' && l.created_date?.startsWith(thisMonth)).length;

  // Utenti unici che hanno usato analisi
  const uniqueExportUsers = [...new Set(usageLogs.filter(l => l.action_type === 'export_analysis').map(l => l.user_email))];
  const uniqueImportUsers = [...new Set(usageLogs.filter(l => l.action_type === 'import_analysis').map(l => l.user_email))];

  return (
    <div className="space-y-4">
      {/* Stats rapide */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-white">{allMessages.length}</p>
            <p className="text-slate-400 text-[9px]">Messaggi</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-red-400">{unreadCount}</p>
            <p className="text-slate-400 text-[9px]">Non letti</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-lime-400">{exportUsageThisMonth}</p>
            <p className="text-slate-400 text-[9px]">Analisi Export</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-red-400">{importUsageThisMonth}</p>
            <p className="text-slate-400 text-[9px]">Analisi Import</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="messaggi" className="w-full">
        <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-3">
          <TabsTrigger value="messaggi" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 relative">
            Messaggi
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="statistiche" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
            Statistiche
          </TabsTrigger>
          <TabsTrigger value="consulenti" className="text-[10px] data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900">
            Consulenti
          </TabsTrigger>
        </TabsList>

        {/* TAB MESSAGGI */}
        <TabsContent value="messaggi" className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            {[
              { val: 'all', label: `Tutti (${allMessages.length})` },
              { val: 'unread', label: `Non letti (${unreadCount})` },
              { val: 'export', label: `Export (${exportMsgCount})` },
              { val: 'import', label: `Import (${importMsgCount})` },
            ].map(f => (
              <Button
                key={f.val}
                variant={msgFilter === f.val ? 'default' : 'outline'}
                size="sm"
                className={`h-6 text-[10px] ${msgFilter === f.val ? 'bg-lime-400 text-slate-900 hover:bg-lime-500' : 'border-slate-600 text-slate-400 hover:bg-slate-800'}`}
                onClick={() => setMsgFilter(f.val)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {loadingMsgs ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-lime-400" /></div>
          ) : filteredMsgs.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-6">Nessun messaggio</p>
          ) : (
            filteredMsgs.map(msg => (
              <MessageCard
                key={msg.id}
                msg={msg}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onDelete={(id) => deleteMsgMutation.mutate(id)}
              />
            ))
          )}
        </TabsContent>

        {/* TAB STATISTICHE */}
        <TabsContent value="statistiche" className="space-y-3">
          <h3 className="text-white font-medium text-sm">Utilizzo Analisi AI — Mese corrente</h3>

          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-lime-500/10 border-lime-500/30">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-lime-400 mx-auto mb-2" />
                <p className="text-2xl font-black text-lime-400">{exportUsageThisMonth}</p>
                <p className="text-slate-400 text-xs">Analisi Export</p>
                <p className="text-slate-500 text-[10px] mt-1">{uniqueExportUsers.length} utenti unici</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4 text-center">
                <Ship className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-black text-red-400">{importUsageThisMonth}</p>
                <p className="text-slate-400 text-xs">Analisi Import</p>
                <p className="text-slate-500 text-[10px] mt-1">{uniqueImportUsers.length} utenti unici</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h4 className="text-white font-medium text-xs mb-3">Totali storici</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-400 text-[10px]">Totale analisi Export</p>
                  <p className="text-white font-bold">{usageLogs.filter(l => l.action_type === 'export_analysis').length}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-400 text-[10px]">Totale analisi Import</p>
                  <p className="text-white font-bold">{usageLogs.filter(l => l.action_type === 'import_analysis').length}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-400 text-[10px]">Utenti Export unici</p>
                  <p className="text-white font-bold">{uniqueExportUsers.length}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-400 text-[10px]">Utenti Import unici</p>
                  <p className="text-white font-bold">{uniqueImportUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top utenti */}
          {uniqueExportUsers.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h4 className="text-white font-medium text-xs mb-3">Top utenti Export</h4>
                <div className="space-y-1.5">
                  {Object.entries(
                    usageLogs.filter(l => l.action_type === 'export_analysis').reduce((acc, l) => {
                      acc[l.user_email] = (acc[l.user_email] || 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([email, count], i) => (
                      <div key={email} className="flex items-center justify-between bg-slate-700/30 rounded px-2 py-1.5">
                        <span className="text-white text-xs truncate">{email}</span>
                        <Badge className="bg-lime-400/20 text-lime-400 border-0 text-[10px]">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB CONSULENTI */}
        <TabsContent value="consulenti" className="space-y-3">
          <h3 className="text-white font-medium text-sm">Consulenti Internazionalizzazione/Export</h3>
          
          {exportConsultants.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-6">Nessun consulente assegnato alla categoria Export</p>
          ) : (
            exportConsultants.map(c => {
              const msgCount = allMessages.filter(m => m.to_email === c.email || m.from_email === c.email).length;
              return (
                <Card key={c.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-lime-400/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-lime-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{c.name}</p>
                        <p className="text-slate-400 text-[10px]">{c.email}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {c.zona && <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px]">{c.zona}</Badge>}
                          {c.zone_assegnate?.map(z => z !== c.zona && (
                            <Badge key={z} className="bg-blue-500/10 text-blue-300 border-0 text-[10px]">{z}</Badge>
                          ))}
                          <Badge className="bg-slate-700 text-slate-300 border-0 text-[10px]">{msgCount} msg</Badge>
                          {c.is_blocked && <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">Bloccato</Badge>}
                        </div>
                      </div>
                      <Link to={`${createPageUrl('Messaggi')}?contact=${encodeURIComponent(c.email)}`}>
                        <Button variant="outline" size="sm" className="border-lime-400 text-lime-400 hover:bg-lime-400/20 h-7 text-[10px]">
                          <Mail className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}