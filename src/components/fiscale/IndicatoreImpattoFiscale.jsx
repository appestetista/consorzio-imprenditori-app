import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Gauge } from 'lucide-react';

// Stima rapida lato client delle imposte in base ai parametri inseriti
function stimaImposte({ regime, fatturato, costi_deducibili, coefficiente_redditivita, aliquota_forfettario, compenso_amministratore, distribuzione_dividendi }) {
  if (!regime || !fatturato || fatturato <= 0) return null;

  const costiDed = parseFloat(costi_deducibili) || 0;
  const compensoAmm = parseFloat(compenso_amministratore) || 0;

  if (regime === 'SRL') {
    const utile = fatturato - costiDed - compensoAmm;
    if (utile <= 0) return null;
    const ires = utile * 0.24;
    const irap = utile * 0.039;
    const utileNetto = utile - ires - irap;
    // IRPEF compenso amministratore (2026: 23/33/43, 33% solo se <=200k)
    let irpefAmm = 0;
    if (compensoAmm > 0) {
      const aliq2 = compensoAmm <= 200000 ? 0.33 : 0.35;
      if (compensoAmm <= 28000) irpefAmm = compensoAmm * 0.23;
      else if (compensoAmm <= 50000) irpefAmm = 28000 * 0.23 + (compensoAmm - 28000) * aliq2;
      else irpefAmm = 28000 * 0.23 + 22000 * aliq2 + (compensoAmm - 50000) * 0.43;
    }
    const contribAmm = compensoAmm * 0.3372;
    let imposte = ires + irap + irpefAmm + contribAmm;
    let netto = utileNetto + (compensoAmm - irpefAmm - contribAmm);
    if (distribuzione_dividendi) {
      const impDiv = utileNetto * 0.26;
      imposte += impDiv;
      netto = (utileNetto - impDiv) + (compensoAmm - irpefAmm - contribAmm);
    }
    return { imposte, netto };
  }

  if (regime === 'Forfettario') {
    const coeff = parseFloat(coefficiente_redditivita) || 0.78;
    const aliq = aliquota_forfettario === 'startup' ? 0.05 : 0.15;
    const reddito = fatturato * coeff;
    const imposta = reddito * aliq;
    const contributi = reddito * 0.2607; // media gestione separata
    return { imposte: imposta + contributi, netto: fatturato - imposta - contributi };
  }

  if (regime === 'DittaOrdinaria') {
    const reddito = fatturato - costiDed;
    if (reddito <= 0) return null;
    let irpef = 0;
    const aliq2Ditta = reddito <= 200000 ? 0.33 : 0.35;
    if (reddito <= 28000) irpef = reddito * 0.23;
    else if (reddito <= 50000) irpef = 28000 * 0.23 + (reddito - 28000) * aliq2Ditta;
    else irpef = 28000 * 0.23 + 22000 * aliq2Ditta + (reddito - 50000) * 0.43;
    const contributi = reddito * 0.24; // stima media artigiani/commercianti
    return { imposte: irpef + contributi, netto: reddito - irpef - contributi };
  }

  return null;
}

export default function IndicatoreImpattoFiscale({ form }) {
  const fatturato = parseFloat(form.fatturato) || 0;

  const stima = useMemo(() => stimaImposte({
    ...form,
    fatturato,
    costi_deducibili: parseFloat(form.costi_deducibili) || 0,
    compenso_amministratore: parseFloat(form.compenso_amministratore) || 0,
  }), [form, fatturato]);

  if (!stima || fatturato <= 0) return null;

  const percentualeTasse = Math.round((stima.imposte / fatturato) * 10000) / 100;
  const euroPerEuro = Math.round((stima.netto / fatturato) * 100) / 100;
  const caricoColor = percentualeTasse < 30 ? '#22c55e' : percentualeTasse <= 45 ? '#eab308' : '#ef4444';
  const caricoLabel = percentualeTasse < 30 ? 'Basso' : percentualeTasse <= 45 ? 'Medio' : 'Alto';
  const barWidth = Math.min(percentualeTasse, 100);

  return (
    <Card className="bg-[#0a2540] border-[#1a3a5c] overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#d4af37]" />
          <span className="text-[#d4af37] text-xs font-semibold tracking-wide uppercase">Impatto Fiscale Stimato</span>
        </div>

        {/* Euro per euro */}
        <div className="text-center py-2">
          <p className="text-slate-400 text-xs mb-1">Per ogni €1 fatturato ti restano</p>
          <p className="text-3xl font-bold" style={{ color: caricoColor }}>
            €{euroPerEuro.toFixed(2)}
          </p>
        </div>

        {/* Percentuale carico */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Carico fiscale effettivo</span>
          <span className="text-sm font-bold" style={{ color: caricoColor }}>
            {percentualeTasse}% – {caricoLabel}
          </span>
        </div>

        {/* Barra semaforo */}
        <div className="relative w-full h-3 rounded-full bg-slate-800 overflow-hidden">
          {/* Sfondo gradiente */}
          <div className="absolute inset-0 opacity-20" style={{
            background: 'linear-gradient(to right, #22c55e 0%, #22c55e 30%, #eab308 30%, #eab308 45%, #ef4444 45%, #ef4444 100%)'
          }} />
          {/* Barra riempimento */}
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
            style={{
              width: `${barWidth}%`,
              background: caricoColor,
              boxShadow: `0 0 8px ${caricoColor}60`
            }}
          />
          {/* Tacche soglia */}
          <div className="absolute top-0 left-[30%] w-px h-full bg-slate-600" />
          <div className="absolute top-0 left-[45%] w-px h-full bg-slate-600" />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>0%</span>
          <span>30%</span>
          <span>45%</span>
          <span>100%</span>
        </div>
      </CardContent>
    </Card>
  );
}