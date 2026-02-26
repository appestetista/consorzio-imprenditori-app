import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function ContactExportManagerPopup({ open, onClose, exportManagers = [], user }) {
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const manager = exportManagers.find(m => m.id === selectedManagerId);
    if (!manager || !subject.trim() || !message.trim()) return;
    setSending(true);
    await base44.entities.Message.create({
      from_email: user.email,
      to_email: manager.email,
      content: `**Richiesta Export Manager**\n\nOggetto: ${subject}\n\n${message}\n\n---\nInviato da: ${user.company_name || user.full_name}\nEmail: ${user.email}`,
      source: 'import_export',
      source_reference: 'Export Manager'
    });
    await base44.integrations.Core.SendEmail({
      to: manager.email,
      subject: `Nuova richiesta: ${subject}`,
      body: `Hai ricevuto una nuova richiesta.\n\nDa: ${user.company_name || user.full_name} (${user.email})\n\nOggetto: ${subject}\n\n${message}`
    });
    setSending(false);
    setSent(true);
  };

  const handleClose = () => {
    setSelectedManagerId('');
    setSubject('');
    setMessage('');
    setSent(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-base">Contatta i nostri Export Manager</DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-semibold">Messaggio inviato!</p>
            <p className="text-slate-400 text-sm mt-1">L'Export Manager ti risponderà al più presto.</p>
            <Button onClick={handleClose} className="mt-4 bg-white/10 hover:bg-white/20 text-white">Chiudi</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Scegli Export Manager</label>
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  {exportManagers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}{m.referente ? ` — ${m.referente}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Oggetto</label>
              <Input placeholder="Es. Info export verso Germania" value={subject} onChange={e => setSubject(e.target.value)}
                className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium mb-1.5 block">Messaggio</label>
              <Textarea placeholder="Descrivi la tua richiesta..." value={message} onChange={e => setMessage(e.target.value)}
                className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]" />
            </div>
            <Button onClick={handleSend} disabled={!selectedManagerId || !subject.trim() || !message.trim() || sending}
              className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-900 font-bold h-11 rounded-xl">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Invia
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}