import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Loader2, Send, Paperclip, Camera, FileText, X, Users } from 'lucide-react';

export default function ExportContactCard({
  contactForm,
  setContactForm,
  contactSent,
  setContactSent,
  sendContactMutation,
  uploadingAttachment,
  handleAttachmentUpload,
  removeAttachment,
  exportManagers,
}) {
  return (
    <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm">
      <CardContent className="p-5">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-lime-400" />
          Contatta un Export Manager
        </h3>
        
        {contactSent ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-green-400 font-medium">Richiesta inviata!</p>
            <p className="text-green-200 text-sm mt-1">L'Export Manager ti contatterà al più presto.</p>
            <Button onClick={() => setContactSent(false)} variant="outline" className="mt-3 border-green-500/50 text-green-400 hover:bg-green-500/20">
              Invia altra richiesta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-amber-400 text-xs font-bold mb-1.5 block">⭐ Seleziona Export Manager</label>
              <Select value={contactForm.exportManagerId} onValueChange={(value) => setContactForm({ ...contactForm, exportManagerId: value })}>
                <SelectTrigger className="bg-slate-900 border-2 border-amber-500/60 text-white ring-amber-500/30 ring-2 h-12 text-sm font-medium">
                  <SelectValue placeholder="Scegli un Export Manager..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 z-[9999]">
                  {exportManagers && exportManagers.length > 0 ? exportManagers.map((em) => (
                    <SelectItem key={em.id} value={em.id} className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white cursor-pointer py-3">
                      <span className="font-semibold">{em.name}</span>
                      {em.city ? <span className="text-slate-400 ml-1">— {em.city}</span> : ''}
                    </SelectItem>
                  )) : (
                    <div className="px-3 py-2 text-slate-400 text-sm">Nessun Export Manager disponibile</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Oggetto (es. Valutazione export USA)" value={contactForm.subject} onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })} className="bg-slate-900 border-slate-700 text-white" />
            <Textarea placeholder="Descrivi la tua richiesta, mercati di interesse, prodotti..." value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} className="bg-slate-900 border-slate-700 text-white min-h-[100px]" />
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                    <Paperclip className="w-4 h-4" />
                    Allega documento
                  </div>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleAttachmentUpload} className="hidden" disabled={uploadingAttachment} />
                </label>
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm h-full">
                    <Camera className="w-4 h-4" />
                    Scatta foto
                  </div>
                  <input type="file" accept="image/*" capture="environment" onChange={handleAttachmentUpload} className="hidden" disabled={uploadingAttachment} />
                </label>
              </div>
              
              {uploadingAttachment && (
                <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Caricamento in corso...</div>
              )}
              
              {contactForm.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {contactForm.attachments.map((att, idx) => (
                    <div key={idx} className="bg-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-lime-400" />
                      <span className="text-white truncate max-w-[120px]">{att.name}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              onClick={() => sendContactMutation.mutate()}
              disabled={!contactForm.exportManagerId || !contactForm.subject || !contactForm.message || sendContactMutation.isPending || uploadingAttachment}
              className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
            >
              {sendContactMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Invio in corso...</>) : (<><Send className="w-4 h-4 mr-2" />Invia Richiesta</>)}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}