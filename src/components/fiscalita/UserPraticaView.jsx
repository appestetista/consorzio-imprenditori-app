import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Building2, 
  Zap, 
  FileText,
  Upload,
  Download,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import PraticaStatusBadge from './PraticaStatusBadge';
import PraticaTimeline from './PraticaTimeline';
import { 
  canUploadDocument,
  createHistoryEvent,
  createDocumentUploadEvent
} from './praticaStateMachine';

export default function UserPraticaView({ pratica, userEmail }) {
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canUpload = canUploadDocument(pratica.status, 'user');
  const isWaitingForDocs = pratica.status === 'docs_requested';

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canUpload) {
      toast.error('Non puoi caricare documenti in questo momento');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const newDocument = {
        url: file_url,
        name: file.name,
        uploaded_at: new Date().toISOString(),
        uploaded_by: userEmail,
        uploaded_by_role: 'user',
        type: 'user_doc'
      };

      const uploadEvent = createDocumentUploadEvent(userEmail, 'user', file.name);
      
      // Se era in docs_requested, passa a docs_received
      const newStatus = pratica.status === 'docs_requested' ? 'docs_received' : pratica.status;
      const history = [...(pratica.history || []), uploadEvent];
      
      if (newStatus !== pratica.status) {
        const statusEvent = createHistoryEvent(
          pratica.status,
          newStatus,
          userEmail,
          'user',
          'Documenti caricati'
        );
        history.push(statusEvent);
      }

      await base44.entities.RichiestaFiscalitaEnergetica.update(pratica.id, {
        documents: [...(pratica.documents || []), newDocument],
        history,
        status: newStatus
      });

      toast.success('Documento caricato con successo');
      queryClient.invalidateQueries({ queryKey: ['richiesta-fiscalita'] });
      setUploadDialogOpen(false);
    } catch (error) {
      toast.error('Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con stato */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">La tua pratica</h2>
          <p className="text-slate-400 text-sm">
            Creata il {format(new Date(pratica.created_date), "d MMMM yyyy", { locale: it })}
          </p>
        </div>
        <PraticaStatusBadge status={pratica.status} />
      </div>

      {/* Alert se documenti richiesti */}
      {isWaitingForDocs && (
        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-200 font-medium">Documenti richiesti</p>
              <p className="text-orange-300/80 text-sm mt-1">
                Il consulente ha richiesto documentazione integrativa. 
                Carica i documenti per procedere con l'analisi.
              </p>
              <Button 
                size="sm" 
                className="mt-3 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Carica documenti
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riepilogo dati */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-lime-400" />
            Riepilogo richiesta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Azienda:</span>
              <span className="text-white ml-2">{pratica.ragione_sociale}</span>
            </div>
            <div>
              <span className="text-slate-500">Settore:</span>
              <span className="text-white ml-2">{pratica.settore_attivita}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400">Energia:</span>
            <span className="text-white capitalize">{pratica.tipo_energia}</span>
            {pratica.consumo_elettrico && (
              <span className="text-slate-500 text-xs">• {pratica.consumo_elettrico}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documenti */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Documenti ({pratica.documents?.length || 0})
          </CardTitle>
          {canUpload && !isWaitingForDocs && (
            <Button 
              size="sm" 
              variant="outline" 
              className="border-slate-600 text-slate-300 h-7 text-xs"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="w-3 h-3 mr-1" />
              Carica
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {pratica.documents?.length > 0 ? (
            <div className="space-y-2">
              {pratica.documents.map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{doc.name}</p>
                    <p className="text-slate-500 text-xs">
                      {doc.uploaded_by_role === 'user' ? 'Caricato da te' : 'Dal consulente'} • {format(new Date(doc.uploaded_at), "d MMM", { locale: it })}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">Nessun documento caricato</p>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Storico pratica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PraticaTimeline history={pratica.history} />
        </CardContent>
      </Card>

      {/* Pratica completata */}
      {pratica.status === 'completed' && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-200 font-medium">Pratica completata</p>
              <p className="text-green-300/80 text-sm mt-1">
                L'analisi è stata conclusa. Consulta i documenti caricati per il report finale.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Carica documento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 text-sm mb-4">
              Carica bollette, contratti o altra documentazione richiesta dal consulente.
            </p>
            <Input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="bg-slate-800 border-slate-700 text-white"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            />
            {uploading && (
              <p className="text-slate-400 text-sm mt-2">Caricamento in corso...</p>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUploadDialogOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}