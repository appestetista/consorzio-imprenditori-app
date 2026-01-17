import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, FileText, TrendingDown, Euro, Upload, Loader2, CheckCircle, Clock, Eye, ExternalLink, X } from 'lucide-react';

const CATEGORIE = ["Assicurazioni", "Luce", "Gas", "Efficientamento Energetico", "Fotovoltaico", "Spesa Telefonica", "Internet"];

export default function RisparmioRequestsAdmin() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    costo_precedente: '',
    nuovo_costo: '',
    note_admin: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [newDocs, setNewDocs] = useState([]);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: richieste = [] } = useQuery({
    queryKey: ['richieste-risparmio-admin'],
    queryFn: () => base44.entities.RichiestaRisparmio.list('-created_date'),
  });

  const pendingCount = richieste.filter(r => r.status === 'pending').length;

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.RichiestaRisparmio.update(id, data);
      
      // Se completata, notifica l'utente
      if (data.status === 'completed' && data.costo_precedente && data.nuovo_costo) {
        const risparmioMensile = data.costo_precedente - data.nuovo_costo;
        const risparmioAnnuo = risparmioMensile * 12;
        
        await base44.entities.Notification.create({
          user_email: selectedRequest.user_email,
          type: 'message',
          title: `Analisi ${selectedRequest.categoria} completata`,
          content: `Ottima notizia! Abbiamo trovato un risparmio di €${risparmioAnnuo.toFixed(0)}/anno per te.`,
          reference_id: selectedRequest.categoria
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['richieste-risparmio-admin'] });
      setShowDialog(false);
      setSelectedRequest(null);
      setNewDocs([]);
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const result = await base44.integrations.Core.UploadFile({ file });
          return result.file_url;
        })
      );
      setNewDocs(prev => [...prev, ...uploadedUrls]);
    } finally {
      setIsUploading(false);
    }
  };

  const openEditDialog = (request) => {
    setSelectedRequest(request);
    setFormData({
      status: request.status,
      costo_precedente: request.costo_precedente || '',
      nuovo_costo: request.nuovo_costo || '',
      note_admin: request.note_admin || ''
    });
    setNewDocs(request.documenti_allegati || []);
    setShowDialog(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: selectedRequest.id,
      data: {
        status: formData.status,
        costo_precedente: formData.costo_precedente ? parseFloat(formData.costo_precedente) : null,
        nuovo_costo: formData.nuovo_costo ? parseFloat(formData.nuovo_costo) : null,
        note_admin: formData.note_admin,
        documenti_allegati: newDocs
      }
    });
  };

  const risparmioCalcolato = formData.costo_precedente && formData.nuovo_costo
    ? (parseFloat(formData.costo_precedente) - parseFloat(formData.nuovo_costo)) * 12
    : null;

  return (
    <div className="mb-6 space-y-4">
      <h2 className="text-white text-lg font-bold flex items-center gap-2">
        <div className="relative">
          <Zap className={`w-5 h-5 ${pendingCount > 0 ? 'text-lime-400' : 'text-slate-400'}`} />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {pendingCount}
            </span>
          )}
        </div>
        Richieste Risparmio ({richieste.length})
      </h2>

      {richieste.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nessuna richiesta di risparmio</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {richieste.slice(0, 5).map((richiesta) => (
            <Card 
              key={richiesta.id} 
              className={`border cursor-pointer hover:border-lime-400/50 transition-colors ${
                richiesta.status === 'pending' ? 'bg-lime-400/10 border-lime-400/30' : 
                richiesta.status === 'in_review' ? 'bg-yellow-400/10 border-yellow-400/30' :
                'bg-slate-800 border-slate-700'
              }`}
              onClick={() => openEditDialog(richiesta)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lime-400 font-semibold text-sm">{richiesta.categoria}</span>
                      {richiesta.status === 'pending' && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">NUOVO</span>
                      )}
                      {richiesta.status === 'in_review' && (
                        <span className="bg-yellow-500 text-slate-900 text-xs px-1.5 py-0.5 rounded">IN ANALISI</span>
                      )}
                      {richiesta.status === 'completed' && (
                        <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">COMPLETATO</span>
                      )}
                    </div>
                    <p className="text-white font-medium truncate">{richiesta.user_name}</p>
                    <p className="text-slate-400 text-xs">{richiesta.user_email}</p>
                    
                    {/* Mostra risparmio se completato */}
                    {richiesta.status === 'completed' && richiesta.costo_precedente && richiesta.nuovo_costo && (
                      <div className="mt-2 bg-green-500/20 rounded-lg p-2 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-bold">
                          Risparmio: €{((richiesta.costo_precedente - richiesta.nuovo_costo) * 12).toFixed(0)}/anno
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {richiesta.foto_bolletta_url && (
                      <a 
                        href={richiesta.foto_bolletta_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-lime-400 hover:text-lime-300"
                      >
                        <FileText className="w-5 h-5" />
                      </a>
                    )}
                    <Eye className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {richieste.length > 5 && (
            <p className="text-slate-400 text-sm text-center">
              + altre {richieste.length - 5} richieste
            </p>
          )}
        </div>
      )}

      {/* Dialog Modifica Richiesta */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedRequest?.categoria} - {selectedRequest?.user_name}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 mt-4">
              {/* Info utente */}
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-slate-400 text-xs">Contatti</p>
                <p className="text-white">{selectedRequest.user_email}</p>
                {selectedRequest.user_phone && (
                  <p className="text-lime-400">{selectedRequest.user_phone}</p>
                )}
                {selectedRequest.note && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <p className="text-slate-400 text-xs">Note utente:</p>
                    <p className="text-white text-sm">{selectedRequest.note}</p>
                  </div>
                )}
              </div>

              {/* Bolletta allegata */}
              {selectedRequest.foto_bolletta_url && (
                <div>
                  <p className="text-slate-400 text-xs mb-2">Bolletta allegata dall'utente</p>
                  <a 
                    href={selectedRequest.foto_bolletta_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-lime-400/20 text-lime-400 rounded-lg p-3 hover:bg-lime-400/30 transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Visualizza documento</span>
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </a>
                </div>
              )}

              {/* Stato */}
              <div>
                <p className="text-slate-400 text-xs mb-2">Stato richiesta</p>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">In attesa</SelectItem>
                    <SelectItem value="in_review">In analisi</SelectItem>
                    <SelectItem value="completed">Completato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Costi Prima/Dopo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-400 text-xs mb-2">Costo precedente (€/mese)</p>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      value={formData.costo_precedente}
                      onChange={(e) => setFormData({...formData, costo_precedente: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white pl-9"
                      placeholder="150"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-2">Nuovo costo (€/mese)</p>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      value={formData.nuovo_costo}
                      onChange={(e) => setFormData({...formData, nuovo_costo: e.target.value})}
                      className="bg-slate-900 border-slate-700 text-white pl-9"
                      placeholder="95"
                    />
                  </div>
                </div>
              </div>

              {/* Risparmio calcolato */}
              {risparmioCalcolato !== null && risparmioCalcolato > 0 && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-green-400 font-bold text-xl">€{risparmioCalcolato.toFixed(0)}/anno</p>
                      <p className="text-green-400/80 text-sm">Risparmio stimato</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Note admin */}
              <div>
                <p className="text-slate-400 text-xs mb-2">Note per l'utente</p>
                <Textarea
                  value={formData.note_admin}
                  onChange={(e) => setFormData({...formData, note_admin: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Descrivi il risparmio ottenuto..."
                  rows={3}
                />
              </div>

              {/* Documenti allegati */}
              <div>
                <p className="text-slate-400 text-xs mb-2">Documenti allegati (contratti, preventivi...)</p>
                
                {newDocs.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {newDocs.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2">
                        <FileText className="w-4 h-4 text-lime-400" />
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-lime-400 text-sm flex-1 truncate hover:underline"
                        >
                          Documento {idx + 1}
                        </a>
                        <button 
                          onClick={() => setNewDocs(newDocs.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                  accept="image/*,application/pdf"
                />
                <Button
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Caricamento...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Allega documenti</>
                  )}
                </Button>
              </div>

              {/* Salva */}
              <Button
                className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvataggio...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Salva modifiche</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}