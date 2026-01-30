import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Bell, Volume2, Calendar, Video, Briefcase, Sparkles, User, Euro, ShoppingBag, BookOpen, Handshake, Truck, Heart, FileSearch, Globe, Shield, Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import WhatsAppNotificationToggle from './WhatsAppNotificationToggle';
import EventNotificationPreferences from './EventNotificationPreferences';

// Lista delle sezioni con notifiche
const NOTIFICATION_SECTIONS = [
  { key: 'calendario', label: 'Calendario Incontri', icon: Calendar, description: 'Nuovi eventi e inviti' },
  { key: 'video_interviste', label: 'Video Interviste', icon: Video, description: 'Nuovi video pubblicati' },
  { key: 'cultura_aziendale', label: 'Academy', icon: BookOpen, description: 'Nuovi contenuti formativi' },
  { key: 'consulenze', label: 'Consulenze', icon: Briefcase, description: 'Richieste e messaggi consulenza' },
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

export default function NotificationPreferences({ user }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sectionPrefs, setSectionPrefs] = useState({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carica preferenze salvate
  useEffect(() => {
    // Suono dalle localStorage
    const soundChoice = localStorage.getItem('soundNotificationsEnabled');
    setSoundEnabled(soundChoice === 'true');

    // Preferenze sezioni dall'utente
    if (user?.notification_preferences) {
      setSectionPrefs(user.notification_preferences);
    } else {
      // Default: tutte le sezioni attive
      const defaultPrefs = {};
      NOTIFICATION_SECTIONS.forEach(s => {
        defaultPrefs[s.key] = true;
      });
      setSectionPrefs(defaultPrefs);
    }
  }, [user]);

  const handleSoundToggle = (checked) => {
    setSoundEnabled(checked);
    localStorage.setItem('soundNotificationsEnabled', checked ? 'true' : 'false');
    
    // Sblocca AudioContext se attivato
    if (checked) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        // Suono di conferma
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch (e) {
        console.log('[AUDIO] Errore test:', e);
      }
    }
    
    toast.success(checked ? 'Notifiche sonore attivate!' : 'Notifiche sonore disattivate');
  };

  const handleSectionToggle = (key, checked) => {
    setSectionPrefs(prev => ({
      ...prev,
      [key]: checked
    }));
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    const newPrefs = {};
    NOTIFICATION_SECTIONS.forEach(s => {
      newPrefs[s.key] = true;
    });
    setSectionPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleDeselectAll = () => {
    const newPrefs = {};
    NOTIFICATION_SECTIONS.forEach(s => {
      newPrefs[s.key] = false;
    });
    setSectionPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        notification_preferences: sectionPrefs
      });
      toast.success('Preferenze notifiche salvate!');
      setHasChanges(false);
    } catch (error) {
      console.error('Errore salvataggio preferenze:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(sectionPrefs).filter(v => v).length;

  return (
    <div className="space-y-4">
      {/* Card Notifiche WhatsApp */}
      <WhatsAppNotificationToggle user={user} />

      {/* Card Preferenze Notifiche Eventi */}
      <EventNotificationPreferences user={user} />

      {/* Card Notifiche Sonore */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-lime-400" />
            Notifiche Sonore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between bg-slate-900 rounded-lg p-4">
            <div>
              <p className="text-white font-medium">Attiva suoni notifiche</p>
              <p className="text-slate-400 text-sm">Ricevi un suono quando arrivano nuove notifiche</p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
              className="data-[state=checked]:bg-lime-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Card Notifiche per Sezione */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-lime-400" />
              Notifiche per Sezione
            </CardTitle>
            <span className="text-lime-400 text-sm font-medium">
              {enabledCount}/{NOTIFICATION_SECTIONS.length} attive
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-slate-400 text-sm mb-4">
            Scegli da quali sezioni vuoi ricevere notifiche. Le notifiche disattivate non verranno mostrate né suoneranno.
          </p>

          {/* Pulsanti Seleziona/Deseleziona tutto */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Attiva tutte
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Disattiva tutte
            </Button>
          </div>

          {/* Lista sezioni */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {NOTIFICATION_SECTIONS.map(section => {
              const Icon = section.icon;
              const isEnabled = sectionPrefs[section.key] !== false; // default true
              
              return (
                <div 
                  key={section.key}
                  className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                    isEnabled ? 'bg-slate-900' : 'bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isEnabled ? 'bg-lime-400/20' : 'bg-slate-700'
                    }`}>
                      <Icon className={`w-4 h-4 ${isEnabled ? 'text-lime-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-slate-500'}`}>
                        {section.label}
                      </p>
                      <p className="text-slate-500 text-xs">{section.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleSectionToggle(section.key, checked)}
                    className="data-[state=checked]:bg-lime-400"
                  />
                </div>
              );
            })}
          </div>

          {/* Pulsante Salva */}
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-4 bg-lime-400 hover:bg-lime-500 text-slate-900"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvataggio...' : 'Salva Preferenze'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}