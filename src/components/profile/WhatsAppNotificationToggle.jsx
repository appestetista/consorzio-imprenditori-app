import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppNotificationToggle({ user }) {
  const [loading, setLoading] = useState(false);
  const isEnabled = user?.whatsapp_enabled;
  
  // Verifica se la funzione esiste prima di chiamarla
  const whatsappUrl = base44.agents?.getWhatsAppConnectURL 
    ? base44.agents.getWhatsAppConnectURL('event_notifier') 
    : null;

  const handleDisable = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({
        whatsapp_enabled: false,
        whatsapp_conversation_id: null
      });
      toast.success('Notifiche WhatsApp disabilitate');
      window.location.reload();
    } catch (error) {
      toast.error('Errore durante la disabilitazione');
    } finally {
      setLoading(false);
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
      <CardContent>
        {isEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-green-500/20 rounded-lg p-3">
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-green-300">Notifiche WhatsApp attive</span>
            </div>
            <p className="text-slate-400 text-sm">
              Riceverai una notifica su WhatsApp quando ci saranno nuovi eventi nella tua zona.
            </p>
            <Button
              variant="outline"
              onClick={handleDisable}
              disabled={loading}
              className="border-red-600 text-red-400 hover:bg-red-500/20"
            >
              Disabilita notifiche WhatsApp
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Attiva le notifiche WhatsApp per ricevere avvisi sui nuovi eventi del Consorzio direttamente sul tuo telefono.
            </p>
            <p className="text-slate-400 text-xs">
              Cliccando il pulsante verrai reindirizzato a WhatsApp. Invia il messaggio pre-compilato per attivare le notifiche.
            </p>
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Attiva Notifiche WhatsApp
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}