import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Building2, MessageCircle, Bell, Save, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function EventNotificationPreferences({ user }) {
  const [prefs, setPrefs] = useState({
    only_my_city: false,
    only_my_zone: true,
    whatsapp_invites: true,
    whatsapp_reminders: true
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user?.event_notification_preferences && typeof user.event_notification_preferences === 'object') {
      setPrefs({
        only_my_city: user.event_notification_preferences.only_my_city ?? false,
        only_my_zone: user.event_notification_preferences.only_my_zone ?? true,
        whatsapp_invites: user.event_notification_preferences.whatsapp_invites ?? true,
        whatsapp_reminders: user.event_notification_preferences.whatsapp_reminders ?? true
      });
    }
  }, [user]);

  // Se user non è disponibile, non renderizzare
  if (!user) {
    return null;
  }

  const handleChange = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        event_notification_preferences: prefs
      });
      toast.success('Preferenze eventi salvate!');
      setHasChanges(false);
    } catch (error) {
      console.error('Errore salvataggio:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const whatsappEnabled = user?.whatsapp_enabled;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-lime-400" />
          Preferenze Notifiche Eventi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-400 text-sm">
          Personalizza quali eventi vuoi ricevere come notifiche.
        </p>

        {/* Filtro per zona */}
        <div className="bg-slate-900 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-lime-400 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="font-medium text-white">Filtro Geografico</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-white text-sm">Solo eventi nella mia zona</p>
                <p className="text-slate-500 text-xs">
                  Ricevi notifiche solo per eventi della tua zona ({user?.zona || 'non impostata'})
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.only_my_zone}
              onCheckedChange={(v) => handleChange('only_my_zone', v)}
              className="data-[state=checked]:bg-lime-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-white text-sm">Solo eventi nel mio comune</p>
                <p className="text-slate-500 text-xs">
                  Ricevi notifiche solo per eventi a {user?.city || 'comune non impostato'}
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.only_my_city}
              onCheckedChange={(v) => handleChange('only_my_city', v)}
              className="data-[state=checked]:bg-lime-400"
            />
          </div>
        </div>

        {/* Notifiche WhatsApp */}
        <div className="bg-slate-900 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium text-white">Notifiche WhatsApp</span>
          </div>

          {!whatsappEnabled && (
            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-300 text-xs">
                Per ricevere notifiche WhatsApp devi prima attivarle dalla sezione sopra.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between opacity-transition" style={{ opacity: whatsappEnabled ? 1 : 0.5 }}>
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-white text-sm">Inviti eventi via WhatsApp</p>
                <p className="text-slate-500 text-xs">
                  Ricevi un messaggio WhatsApp quando vieni invitato a un evento
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.whatsapp_invites}
              onCheckedChange={(v) => handleChange('whatsapp_invites', v)}
              disabled={!whatsappEnabled}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          <div className="flex items-center justify-between" style={{ opacity: whatsappEnabled ? 1 : 0.5 }}>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-white text-sm">Promemoria eventi via WhatsApp</p>
                <p className="text-slate-500 text-xs">
                  Ricevi promemoria 24h prima dell'evento
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.whatsapp_reminders}
              onCheckedChange={(v) => handleChange('whatsapp_reminders', v)}
              disabled={!whatsappEnabled}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>

        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvataggio...' : 'Salva Preferenze'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}