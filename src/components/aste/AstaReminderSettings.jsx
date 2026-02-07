import React, { useState } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const OPZIONI_GIORNI = [
  { value: 30, label: '30 giorni prima' },
  { value: 14, label: '14 giorni prima' },
  { value: 7, label: '7 giorni prima' },
  { value: 3, label: '3 giorni prima' },
  { value: 1, label: '1 giorno prima' },
];

export default function AstaReminderSettings({ 
  astaSalvata, 
  onUpdate, 
  isPending = false 
}) {
  const [open, setOpen] = useState(false);
  const [promemoriaAttivo, setPromemoriaAttivo] = useState(astaSalvata?.promemoria_attivo ?? true);
  const [giorniSelezionati, setGiorniSelezionati] = useState(
    astaSalvata?.giorni_promemoria || [7, 3, 1]
  );

  const handleToggleGiorno = (giorno) => {
    if (giorniSelezionati.includes(giorno)) {
      setGiorniSelezionati(giorniSelezionati.filter(g => g !== giorno));
    } else {
      setGiorniSelezionati([...giorniSelezionati, giorno].sort((a, b) => b - a));
    }
  };

  const handleSave = () => {
    onUpdate({
      promemoria_attivo: promemoriaAttivo,
      giorni_promemoria: giorniSelezionati
    });
    setOpen(false);
  };

  const isActive = astaSalvata?.promemoria_attivo ?? true;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`p-2 rounded-lg transition-colors ${
          isActive 
            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
            : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
        }`}
        title="Imposta promemoria"
      >
        {isActive ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Promemoria Scadenza
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Toggle attivo/disattivo */}
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Promemoria attivi</p>
                <p className="text-slate-400 text-xs">Ricevi notifiche prima della scadenza</p>
              </div>
              <button
                onClick={() => setPromemoriaAttivo(!promemoriaAttivo)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  promemoriaAttivo ? 'bg-blue-500' : 'bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  promemoriaAttivo ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Selezione giorni */}
            {promemoriaAttivo && (
              <div className="space-y-2">
                <p className="text-slate-400 text-sm">Quando vuoi essere avvisato?</p>
                <div className="space-y-2">
                  {OPZIONI_GIORNI.map(opzione => (
                    <label
                      key={opzione.value}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        giorniSelezionati.includes(opzione.value)
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'bg-slate-900/50 border border-transparent hover:bg-slate-700'
                      }`}
                    >
                      <Checkbox
                        checked={giorniSelezionati.includes(opzione.value)}
                        onCheckedChange={() => handleToggleGiorno(opzione.value)}
                        className="border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                      <span className="text-white text-sm">{opzione.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Riepilogo */}
            {promemoriaAttivo && giorniSelezionati.length > 0 && (
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-blue-400 text-xs">
                  Riceverai {giorniSelezionati.length} notifiche prima della scadenza dell'asta
                </p>
              </div>
            )}

            {/* Bottoni */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 border-slate-600 text-slate-300"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isPending ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}