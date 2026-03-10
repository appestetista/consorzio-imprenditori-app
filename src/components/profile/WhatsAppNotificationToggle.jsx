import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MessageCircle, Check, Save, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppNotificationToggle({ user }) {
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number || '');
  const [enabled, setEnabled] = useState(!!user?.whatsapp_number);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    if (enabled && !whatsappNumber.trim()) {
      toast.error('Inserisci un numero WhatsApp valido');
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        whatsapp_number: enabled ? whatsappNumber.trim() : '',
        whatsapp_enabled: enabled
      });
      toast.success(enabled ? 'Notifiche WhatsApp attivate!' : 'Notifiche WhatsApp disattivate');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Inserisci prima un numero WhatsApp');
      return;
    }
    setTesting(true);
    try {
      const res = await base44.functions.invoke('sendWhatsApp', {
        to: whatsappNumber.trim(),
        message: '✅ *Test notifica WhatsApp*\n\nSe ricevi questo messaggio, le notifiche WhatsApp sono configurate correttamente!'
      });
      if (res.data?.success) {
        toast.success('Messaggio di test inviato! Controlla WhatsApp.');
      } else {
        toast.error(res.data?.error || 'Errore invio test');
      }
    } catch (error) {
      toast.error('Errore durante il test');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          Notifiche WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-400 text-sm">
          Ricevi notifiche su WhatsApp quando ti arrivano nuovi messaggi, prenotazioni consulenze e aggiornamenti importanti.
        </p>

        {/* Toggle attivazione */}
        <div className="flex items-center justify-between bg-slate-900 rounded-lg p-4">
          <div>
            <p className="text-white font-medium">Attiva notifiche WhatsApp</p>
            <p className="text-slate-400 text-xs">Ricevi un messaggio WhatsApp per ogni notifica importante</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        {/* Campo numero */}
        {enabled && (
          <div className="space-y-3">
            <div>
              <Label className="text-green-400 text-sm font-medium mb-1 block">
                <Phone className="w-3.5 h-3.5 inline mr-1" />
                Numero WhatsApp
              </Label>
              <Input
                placeholder="Es: +393291234567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
              />
              <p className="text-slate-500 text-xs mt-1">
                Formato internazionale con prefisso (es: +39 per l'Italia)
              </p>
            </div>

            {/* Pulsanti */}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvataggio...' : 'Salva'}
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !whatsappNumber.trim()}
                className="border-green-600 text-green-400 hover:bg-green-500/20"
              >
                {testing ? '...' : '📲 Test'}
              </Button>
            </div>

            {user?.whatsapp_number && (
              <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-2 border border-green-500/30">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-xs">Numero attivo: {user.whatsapp_number}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}