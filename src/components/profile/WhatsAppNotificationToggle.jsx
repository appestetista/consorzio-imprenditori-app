import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MessageCircle, Check, Save, Phone, Lock, Calendar, Video, Briefcase, Sparkles, User, Euro, ShoppingBag, BookOpen, Handshake, Truck, Heart, FileSearch, Globe, Shield } from 'lucide-react';
import { toast } from 'sonner';

const WA_SECTIONS = [
  { key: 'consulenze', label: 'Consulenze', icon: Briefcase, description: 'Messaggi e prenotazioni consulenti', locked: true },
  { key: 'calendario', label: 'Calendario Incontri', icon: Calendar, description: 'Nuovi eventi e inviti' },
  { key: 'video_interviste', label: 'Video Interviste', icon: Video, description: 'Nuovi video pubblicati' },
  { key: 'cultura_aziendale', label: 'Academy', icon: BookOpen, description: 'Nuovi contenuti formativi' },
  { key: 'finanziamenti', label: 'Finanziamenti Agevolati', icon: Sparkles, description: 'Nuovi bandi disponibili' },
  { key: 'contatta_membri', label: 'Contatta Imprenditori', icon: User, description: 'Messaggi da altri membri' },
  { key: 'risparmio_energetico', label: 'Risparmio', icon: Euro, description: 'Aggiornamenti risparmio' },
  { key: 'marketplace', label: 'Marketplace', icon: ShoppingBag, description: 'Nuovi annunci e risposte' },
  { key: 'imprenditori', label: 'Consigli da Imprenditori', icon: Handshake, description: 'Nuovi sondaggi e post' },
  { key: 'fornitori', label: 'Ricerca Fornitori', icon: Truck, description: 'Richieste e candidature' },
  { key: 'welfare_aziendale', label: 'Welfare Aziendale', icon: Heart, description: 'Aggiornamenti welfare' },
  { key: 'analisi_contratti', label: 'Analisi Contratti', icon: FileSearch, description: 'Risposte analisi' },
  { key: 'import_export', label: 'Import / Export', icon: Globe, description: 'Messaggi import/export' },
  { key: 'compliance', label: 'Compliance Aziendale', icon: Shield, description: 'Scadenze e avvisi' },
];

export default function WhatsAppNotificationToggle({ user }) {
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number || '');
  const [enabled, setEnabled] = useState(!!user?.whatsapp_number);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sectionPrefs, setSectionPrefs] = useState({});

  useEffect(() => {
    if (user?.whatsapp_notification_sections && typeof user.whatsapp_notification_sections === 'object') {
      // Forza consulenze sempre true
      setSectionPrefs({ ...user.whatsapp_notification_sections, consulenze: true });
    } else {
      // Default: tutte attive
      const defaults = {};
      WA_SECTIONS.forEach(s => { defaults[s.key] = true; });
      setSectionPrefs(defaults);
    }
  }, [user]);

  if (!user) return null;

  const handleSectionToggle = (key, checked) => {
    setSectionPrefs(prev => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    if (enabled && !whatsappNumber.trim()) {
      toast.error('Inserisci un numero WhatsApp valido');
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({
        whatsapp_number: enabled ? whatsappNumber.trim() : '',
        whatsapp_enabled: enabled,
        whatsapp_notification_sections: { ...sectionPrefs, consulenze: true }
      });
      toast.success(enabled ? 'Preferenze WhatsApp salvate!' : 'Notifiche WhatsApp disattivate');
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

  const enabledCount = Object.values(sectionPrefs).filter(v => v).length;

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
          Ricevi notifiche su WhatsApp per le sezioni che preferisci.
        </p>

        {/* Toggle attivazione globale */}
        <div className="flex items-center justify-between bg-slate-900 rounded-lg p-4">
          <div>
            <p className="text-white font-medium">Attiva notifiche WhatsApp</p>
            <p className="text-slate-400 text-xs">Abilita la ricezione di messaggi WhatsApp</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        {enabled && (
          <div className="space-y-4">
            {/* Campo numero */}
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

            {user?.whatsapp_number && (
              <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-2 border border-green-500/30">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-xs">Numero attivo: {user.whatsapp_number}</span>
              </div>
            )}

            {/* Sezioni con toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">Notifiche per sezione</p>
                <span className="text-green-400 text-xs">{enabledCount}/{WA_SECTIONS.length} attive</span>
              </div>
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                {WA_SECTIONS.map(section => {
                  const Icon = section.icon;
                  const isEnabled = sectionPrefs[section.key] !== false;
                  const isLocked = section.locked;

                  return (
                    <div
                      key={section.key}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                        isEnabled ? 'bg-slate-900' : 'bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                          isEnabled ? 'bg-green-500/20' : 'bg-slate-700'
                        }`}>
                          <Icon className={`w-3.5 h-3.5 ${isEnabled ? 'text-green-400' : 'text-slate-500'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-medium truncate ${isEnabled ? 'text-white' : 'text-slate-500'}`}>
                              {section.label}
                            </p>
                            {isLocked && (
                              <Lock className="w-3 h-3 text-green-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-slate-500 text-[10px] truncate">{section.description}</p>
                        </div>
                      </div>
                      {isLocked ? (
                        <span className="text-green-400 text-[10px] font-medium flex-shrink-0 ml-2">Sempre attivo</span>
                      ) : (
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleSectionToggle(section.key, checked)}
                          className="data-[state=checked]:bg-green-500 flex-shrink-0 ml-2"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pulsanti */}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvataggio...' : 'Salva Preferenze'}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}