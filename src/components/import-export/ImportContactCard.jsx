import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, Send, Paperclip, Camera, FileText, X } from 'lucide-react';

export default function ImportContactCard({
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
    <Card id="import-contact-section" className="bg-gradient-to-br from-red-500 to-orange-600 border-0 shadow-xl shadow-red-500/20 mt-6">
      <CardContent className="p-5">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-4xl">🇨🇳</span>
          </div>
          <h3 className="text-white font-bold text-xl mb-2">Vuoi procedere con l'import?</h3>
          <p className="text-white/90 text-sm mb-4">
            La nostra agenzia di import ti segue in ogni fase: fino alla consegna in Italia.
          </p>
        </div>
        <div className="bg-white/10 rounded-xl p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/10 rounded-lg p-2"><p className="text-white/80 text-xs">✓ Ricerca fornitori</p></div>
            <div className="bg-white/10 rounded-lg p-2"><p className="text-white/80 text-xs">✓ Controllo qualità</p></div>
            <div className="bg-white/10 rounded-lg p-2"><p className="text-white/80 text-xs">✓ Gestione dogana</p></div>
            <div className="bg-white/10 rounded-lg p-2"><p className="text-white/80 text-xs">✓ Spedizione inclusa</p></div>
          </div>
        </div>
        
        {importContactSent ? (
          <div className="bg-white/20 rounded-xl p-4 text-center">
            <CheckCircle className="w-10 h-10 text-white mx-auto mb-2" />
            <p className="text-white font-bold text-lg">Abbiamo preso in carico la vostra richiesta</p>
            <p className="text-white/80 text-sm mt-1">Nell'arco di 48 ore verrete ricontattati.</p>
            <Button onClick={() => setImportContactSent(false)} variant="outline" className="mt-3 border-white/50 text-white hover:bg-white/20">
              Invia altra richiesta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Oggetto (es. Richiesta preventivo import gadget)"
              value={importContactForm.subject}
              onChange={(e) => setImportContactForm({ ...importContactForm, subject: e.target.value })}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
            <Textarea
              placeholder="Descrivi la tua richiesta: che prodotto vuoi importare, quantità, tempistiche desiderate..."
              value={importContactForm.message}
              onChange={(e) => setImportContactForm({ ...importContactForm, message: e.target.value })}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
            />
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                    <Paperclip className="w-4 h-4" />
                    Allega documento
                  </div>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleImportAttachmentUpload} className="hidden" disabled={uploadingImportAttachment} />
                </label>
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 px-3 rounded-lg transition-colors text-sm h-full">
                    <Camera className="w-4 h-4" />
                    Scatta foto
                  </div>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImportAttachmentUpload} className="hidden" disabled={uploadingImportAttachment} />
                </label>
              </div>
              
              {uploadingImportAttachment && (
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Caricamento in corso...
                </div>
              )}
              
              {importContactForm.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {importContactForm.attachments.map((att, idx) => (
                    <div key={idx} className="bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-white" />
                      <span className="text-white truncate max-w-[120px]">{att.name}</span>
                      <button onClick={() => removeImportAttachment(idx)} className="text-white/70 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              onClick={() => sendImportContactMutation.mutate()}
              disabled={!importContactForm.subject || !importContactForm.message || sendImportContactMutation.isPending || uploadingImportAttachment}
              className="w-full bg-white hover:bg-white/90 text-red-600 font-bold h-12 text-base"
            >
              {sendImportContactMutation.isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Invio in corso...</>
              ) : (
                <><Send className="w-5 h-5 mr-2" />Richiedi Import</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}