import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, Send, Paperclip, Camera, FileText, X } from 'lucide-react';

export default function ImportLimitPopup({
  open,
  onOpenChange,
  importLimit,
  importContactForm,
  setImportContactForm,
  importContactSent,
  setImportContactSent,
  sendImportContactMutation,
  uploadingImportAttachment,
  handleImportAttachmentUpload,
  removeImportAttachment,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-gradient-to-br from-red-500 to-orange-600 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-4xl">🇨🇳</span>
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Limite analisi raggiunto</h3>
          <p className="text-white/90 text-sm">
            Hai utilizzato tutte le {importLimit} analisi import disponibili questa settimana. 
            Ma non preoccuparti: i nostri <strong>consulenti specializzati con base in Cina</strong> possono aiutarti direttamente!
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-white/5 rounded-xl p-3 space-y-2">
            <p className="text-white font-semibold text-sm text-center">I nostri consulenti ti offrono:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800 rounded-lg p-2 text-center"><p className="text-white/80 text-xs">✓ Ricerca fornitori</p></div>
              <div className="bg-slate-800 rounded-lg p-2 text-center"><p className="text-white/80 text-xs">✓ Controllo qualità</p></div>
              <div className="bg-slate-800 rounded-lg p-2 text-center"><p className="text-white/80 text-xs">✓ Gestione dogana</p></div>
              <div className="bg-slate-800 rounded-lg p-2 text-center"><p className="text-white/80 text-xs">✓ Spedizione in Italia</p></div>
            </div>
          </div>
          <p className="text-slate-400 text-xs text-center">Compila il modulo qui sotto per essere ricontattato</p>

          {importContactSent ? (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-medium">Richiesta inviata!</p>
              <p className="text-green-200 text-sm mt-1">Verrete ricontattati entro 48 ore.</p>
              <Button onClick={() => { setImportContactSent(false); onOpenChange(false); }} variant="outline" className="mt-3 border-green-500/50 text-green-400 hover:bg-green-500/20">
                Chiudi
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input placeholder="Oggetto (es. Richiesta preventivo import)" value={importContactForm.subject} onChange={(e) => setImportContactForm({ ...importContactForm, subject: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
              <Textarea placeholder="Descrivi cosa vuoi importare, quantità, tempistiche..." value={importContactForm.message} onChange={(e) => setImportContactForm({ ...importContactForm, message: e.target.value })} className="bg-slate-800 border-slate-700 text-white min-h-[100px]" />
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 px-3 rounded-lg transition-colors text-sm"><Paperclip className="w-4 h-4" />Allega</div>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleImportAttachmentUpload} className="hidden" disabled={uploadingImportAttachment} />
                </label>
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 px-3 rounded-lg transition-colors text-sm h-full"><Camera className="w-4 h-4" />Foto</div>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImportAttachmentUpload} className="hidden" disabled={uploadingImportAttachment} />
                </label>
              </div>
              {uploadingImportAttachment && (<div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento...</div>)}
              {importContactForm.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {importContactForm.attachments.map((att, idx) => (
                    <div key={idx} className="bg-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-lime-400" />
                      <span className="text-white truncate max-w-[120px]">{att.name}</span>
                      <button onClick={() => removeImportAttachment(idx)} className="text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                onClick={() => sendImportContactMutation.mutate()}
                disabled={!importContactForm.subject || !importContactForm.message || sendImportContactMutation.isPending || uploadingImportAttachment}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold h-12"
              >
                {sendImportContactMutation.isPending ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Invio...</>) : (<><Send className="w-5 h-5 mr-2" /> Richiedi consulenza Import</>)}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}