import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  Building2, 
  Zap, 
  Phone, 
  Mail,
  FileText,
  Upload,
  Download,
  Clock,
  AlertCircle
} from 'lucide-react';
import PraticaStatusBadge from './PraticaStatusBadge';
import PraticaTimeline from './PraticaTimeline';
import { 
  canTransition, 
  getAvailableTransitions, 
  canUploadDocument,
  createHistoryEvent,
  createDocumentUploadEvent,
  TRANSITION_LABELS 
} from './praticaStateMachine';

export default function ConsultantPraticaView({ pratica, onBack, consultantEmail }) {
  const queryClient = useQueryClient();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const availableActions = getAvailableTransitions(pratica.status, 'consultant');
  const canUpload = canUploadDocument(pratica.status, 'consultant');

  const updateMutation = useMutation({
    mutationFn: async ({ newStatus, note }) => {
      const validation = canTransition(pratica.status, newStatus, 'consultant');
      if (!validation.valid) {
        throw new Error(validation.reason);
      }

      const historyEvent = createHistoryEvent(
        pratica.status,
        newStatus,
        consultantEmail,
        'consultant',
        note || null
      );

      const updatedHistory = [...(pratica.history || []), historyEvent];

      await base44.entities.RichiestaFiscalitaEnergetica.update(pratica.id, {
        status: newStatus,
        history: updatedHistory
      });
    },
    onSuccess: () => {
      toast.success('Stato pratica aggiornato');
      queryClient.invalidateQueries({ queryKey: ['fiscalita-pratiche'] });
      setActionDialogOpen(false);
      setActionNote('');
      onBack();
    },
    onError: (error) => {
      toast.error(error.message || 'Errore durante l\'aggiornamento');
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canUpload) {
      toast.error('Non puoi caricare documenti in questo stato');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const newDocument = {
        url: file_url,
        name: file.name,
        uploaded_at: new Date().toISOString(),
        uploaded_by: consultantEmail,
        uploaded_by_role: 'consultant',
        type: pratica.status === 'report_ready' ? 'report' : 'other'
      };

      const uploadEvent = createDocumentUploadEvent(consultantEmail, 'consultant', file.name);

      await base44.entities.RichiestaFiscalitaEnergetica.update(pratica.id, {
        documents: [...(pratica.documents || []), newDocument],
        history: [...(pratica.history || []), uploadEvent]
      });

      toast.success('Documento caricato');
      queryClient.invalidateQueries({ queryKey: ['fiscalita-pratiche'] });
      setUploadDialogOpen(false);
    } catch (error) {
      toast.error('Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  const openActionDialog = (action) => {
    setSelectedAction(action);
    setActionNote('');
    setActionDialogOpen(true);
  };

  const confirmAction = () => {
    if (!selectedAction) return;
    updateMutation.mutate({ 
      newStatus: selectedAction, 
      note: actionNote 
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="text-slate-400"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-white font-bold text-lg">{pratica.ragione_sociale}</h2>
          <p className="text-slate-400 text-sm">
            Richiesta del {format(new Date(pratica.created_date), "d MMM yyyy", { locale: it })}
          </p>
        </div>
        <PraticaStatusBadge status={pratica.status} />
      </div>

      {/* Dati Azienda */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-lime-400" />
            Dati Azienda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">P.IVA:</span>
              <span className="text-white ml-2">{pratica.partita_iva || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500">ATECO:</span>
              <span className="text-white ml-2">{pratica.codice_ateco || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500">Settore:</span>
              <span className="text-white ml-2">{pratica.settore_attivita}</span>
            </div>
            <div>
              <span className="text-slate-500">Ciclo:</span>
              <span className="text-white ml-2">{pratica.ciclo_produttivo || '-'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dati Energia */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Profilo Energetico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Tipo:</span>
              <span className="text-white ml-2 capitalize">{pratica.tipo_energia}</span>
            </div>
            <div>
              <span className="text-slate-500">Impianti:</span>
              <span className="text-white ml-2">{pratica.ha_impianti_produttivi || '-'}</span>
            </div>
            {pratica.consumo_elettrico && (
              <div>
                <span className="text-slate-500">Elettrico:</span>
                <span className="text-white ml-2">{pratica.consumo_elettrico}</span>
              </div>
            )}
            {pratica.consumo_gas && (
              <div>
                <span className="text-slate-500">Gas:</span>
                <span className="text-white ml-2">{pratica.consumo_gas}</span>
              </div>
            )}
            {pratica.percentuale_produzione && (
              <div>
                <span className="text-slate-500">% Produzione:</span>
                <span className="text-white ml-2">{pratica.percentuale_produzione}%</span>
              </div>
            )}
            {pratica.ha_fotovoltaico && (
              <div>
                <span className="text-slate-500">Fotovoltaico:</span>
                <span className="text-white ml-2">{pratica.ha_fotovoltaico}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contatti */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-400" />
            Referente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-white font-medium">{pratica.nome_referente}</p>
          {pratica.ruolo_referente && (
            <p className="text-slate-400">{pratica.ruolo_referente}</p>
          )}
          <div className="flex items-center gap-4 pt-2">
            <a 
              href={`tel:${pratica.telefono_referente}`}
              className="flex items-center gap-1 text-lime-400 hover:text-lime-300"
            >
              <Phone className="w-4 h-4" />
              {pratica.telefono_referente}
            </a>
            {pratica.email_referente && (
              <a 
                href={`mailto:${pratica.email_referente}`}
                className="flex items-center gap-1 text-lime-400 hover:text-lime-300"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
          </div>
          {pratica.preferenza_contatto && (
            <p className="text-slate-500 text-xs pt-2">
              Preferenza: {pratica.preferenza_contatto} • {pratica.disponibilita_oraria}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Documenti */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Documenti ({pratica.documents?.length || 0})
          </CardTitle>
          {canUpload && (
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
                      {doc.uploaded_by_role === 'user' ? 'Utente' : 'Consulente'} • {format(new Date(doc.uploaded_at), "d MMM", { locale: it })}
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">Nessun documento</p>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Storico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PraticaTimeline history={pratica.history} />
        </CardContent>
      </Card>

      {/* Azioni disponibili */}
      {availableActions.length > 0 && (
        <Card className="bg-slate-800/50 border-lime-700/50">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs mb-3">Azioni disponibili:</p>
            <div className="flex flex-wrap gap-2">
              {availableActions.map(action => (
                <Button
                  key={action}
                  size="sm"
                  variant={action === 'cancelled' ? 'destructive' : 'default'}
                  className={action !== 'cancelled' ? 'bg-lime-600 hover:bg-lime-700' : ''}
                  onClick={() => openActionDialog(action)}
                >
                  {TRANSITION_LABELS[action]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Azione */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedAction ? TRANSITION_LABELS[selectedAction] : 'Conferma azione'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-slate-400 text-sm">Nota (opzionale)</label>
            <Textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Aggiungi una nota per lo storico..."
              className="mt-2 bg-slate-800 border-slate-700 text-white"
            />
            {selectedAction === 'cancelled' && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-red-900/20 rounded-lg border border-red-800">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <p className="text-red-300 text-sm">
                  L'annullamento è irreversibile. La pratica non potrà essere riaperta.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialogOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              Annulla
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updateMutation.isPending}
              className={selectedAction === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : 'bg-lime-600 hover:bg-lime-700'}
            >
              {updateMutation.isPending ? 'Salvataggio...' : 'Conferma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Carica documento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="bg-slate-800 border-slate-700 text-white"
            />
            {uploading && (
              <p className="text-slate-400 text-sm mt-2">Caricamento in corso...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}