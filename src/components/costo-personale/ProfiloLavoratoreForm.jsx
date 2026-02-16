import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Gift, Info } from 'lucide-react';

export default function ProfiloLavoratoreForm({ profilo, onChange }) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Gift className="w-4 h-4 text-violet-400" />
            Step 6 — Profilo Lavoratore (Incentivi)
          </h3>
          <p className="text-slate-500 text-xs mt-1">Compila per verificare automaticamente gli incentivi contributivi applicabili nel 2026.</p>
        </div>

        <div>
          <label className="text-slate-400 text-sm mb-1 block">Età del lavoratore (opzionale)</label>
          <Input
            type="number"
            min="16"
            max="70"
            placeholder="Es. 27"
            value={profilo.eta}
            onChange={(e) => onChange({ ...profilo, eta: e.target.value })}
            className="bg-slate-900 border-slate-700 text-white"
          />
          <p className="text-slate-600 text-[10px] mt-1">Se under 30: verifica esonero giovani (L. 205/2017)</p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-white text-sm">Donna disoccupata ≥6 mesi?</p>
            <p className="text-slate-600 text-[10px]">Bonus Donne D.L. 60/2024 (Decreto Coesione)</p>
          </div>
          <Switch
            checked={profilo.donna_disoccupata}
            onCheckedChange={(v) => onChange({ ...profilo, donna_disoccupata: v })}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-white text-sm">Percettore NASPI?</p>
            <p className="text-slate-600 text-[10px]">Incentivo L. 92/2012 art. 2 co. 10-bis</p>
          </div>
          <Switch
            checked={profilo.percettore_naspi}
            onCheckedChange={(v) => onChange({ ...profilo, percettore_naspi: v })}
          />
        </div>

        <div className="flex items-start gap-2 bg-slate-700/30 rounded-lg p-2.5">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-slate-500 text-[11px]">
            I campi sono opzionali. La regione ZES viene verificata automaticamente in base alla regione selezionata al passo precedente. Verranno mostrati solo incentivi la cui vigenza è confermata per il 2026.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}