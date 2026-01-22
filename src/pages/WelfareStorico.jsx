import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Trash2, RefreshCw, CheckCircle, Upload, Loader2, X, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

const TIPO_BUONO_LABELS = {
  buoni_pasto: { nome: 'Buoni Pasto', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  buoni_spesa: { nome: 'Buoni Spesa', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  buoni_omaggio: { nome: 'Buoni Omaggio', color: 'bg-violet-100 text-violet-700 border-violet-300' }
};

export default function WelfareStorico() {
  const [user, setUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [changeFileDialog, setChangeFileDialog] = useState(null); // {requestId, type: 'contratto' | 'excel'}
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['welfare-requests', user?.email],
    queryFn: () => base44.entities.WelfareRequest.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WelfareRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welfare-requests'] });
      setDeleteDialogOpen(false);
      setSelectedRequest(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WelfareRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['welfare-requests'] });
      setChangeFileDialog(null);
    }
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !changeFileDialog) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const updateData = changeFileDialog.type === 'contratto' 
      ? { contratto_url: file_url, contratto_nome: file.name }
      : { excel_url: file_url, excel_nome: file.name };

    // Invia email con il nuovo file
    const request = requests.find(r => r.id === changeFileDialog.requestId);
    const tipoLabel = TIPO_BUONO_LABELS[request.tipo_buono]?.nome || request.tipo_buono;
    
    await base44.functions.invoke('sendWelfareEmail', {
      to: 'app.consorzio.imprenditori@gmail.com',
      subject: `AGGIORNAMENTO ${changeFileDialog.type === 'contratto' ? 'CONTRATTO' : 'TABELLA EXCEL'} ${tipoLabel.toUpperCase()} - ${user.company_name || user.full_name}`,
      body: `
        <h2>File Aggiornato - ${tipoLabel}</h2>
        <p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Tipo file:</strong> ${changeFileDialog.type === 'contratto' ? 'Contratto' : 'Tabella Excel'}</p>
        <p><strong>Nuovo file:</strong> <a href="${file_url}">${file.name}</a></p>
        <p style="color: red;"><strong>⚠️ Questo file sostituisce il precedente</strong></p>
      `
    });

    await updateMutation.mutateAsync({ id: changeFileDialog.requestId, data: updateData });
    setUploading(false);
    e.target.value = '';
  };

  const confirmDelete = (request) => {
    setSelectedRequest(request);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('WelfareAziendale')} className="text-pink-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Storico Ordini</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">Nessun ordine effettuato</p>
              <Link to={createPageUrl('WelfareOrdina')}>
                <Button className="mt-4 bg-lime-400 text-slate-900">
                  Effettua un ordine
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const tipoInfo = TIPO_BUONO_LABELS[request.tipo_buono] || { nome: request.tipo_buono, color: 'bg-slate-100 text-slate-700' };
              
              return (
                <Card key={request.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${tipoInfo.color}`}>
                          {tipoInfo.nome}
                        </span>
                        <p className="text-slate-400 text-xs mt-2">
                          {new Date(request.created_date).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => confirmDelete(request)}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Contratto */}
                    <div className="bg-slate-900 rounded-lg p-3 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium">Contratto</p>
                            <p className="text-slate-400 text-xs truncate">{request.contratto_nome}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setChangeFileDialog({ requestId: request.id, type: 'contratto' })}
                          className="text-lime-400 hover:text-lime-300 p-2"
                          title="Sostituisci file"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Excel (se presente) */}
                    {request.excel_url && (
                      <div className="bg-slate-900 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium">Tabella Excel</p>
                              <p className="text-slate-400 text-xs truncate">{request.excel_nome}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setChangeFileDialog({ requestId: request.id, type: 'excel' })}
                            className="text-lime-400 hover:text-lime-300 p-2"
                            title="Sostituisci file"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stato */}
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-xs text-slate-400">
                        Stato: <span className="text-lime-400 font-medium">
                          {request.status === 'contratto_inviato' ? 'Contratto inviato' : 
                           request.status === 'excel_inviato' ? 'Completo' : 
                           request.status === 'completato' ? 'Completato' : request.status}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav currentPage="WelfareAziendale" />

      {/* Dialog Conferma Eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Conferma Eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Sei sicuro di voler eliminare questo ordine? <br />
              <span className="text-red-400 font-semibold">Questa azione è irreversibile e l'ordine non sarà più recuperabile.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedRequest?.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Cambio File */}
      <Dialog open={!!changeFileDialog} onOpenChange={() => setChangeFileDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Sostituisci {changeFileDialog?.type === 'contratto' ? 'Contratto' : 'Tabella Excel'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 text-sm mb-4">
              Carica un nuovo file per sostituire quello esistente. Il nuovo file verrà inviato automaticamente.
            </p>
            <label className="cursor-pointer block">
              <div className={`flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 border-dashed transition-colors ${
                uploading 
                  ? 'border-slate-500 bg-slate-700 text-slate-400' 
                  : 'border-lime-400 hover:border-lime-300 bg-lime-400/10 text-lime-400'
              }`}>
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Caricamento e invio...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Seleziona nuovo file</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept={changeFileDialog?.type === 'contratto' ? '.pdf,.jpg,.jpeg,.png' : '.xlsx,.xls,.csv'}
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}