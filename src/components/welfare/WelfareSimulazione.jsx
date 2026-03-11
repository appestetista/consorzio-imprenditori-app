import React, { useState } from 'react';
import { Calculator, Users, Euro, FileText, CreditCard, Upload, ChevronRight, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import WelfareInfoPanel from './WelfareInfoPanel';

function parseEuro(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function fmt(n) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WelfareSimulazione({ valoreBuono, tipo, onProcedi, userEmail }) {
  const [numPersone, setNumPersone] = useState('');
  const [quantitaPerPersona, setQuantitaPerPersona] = useState(tipo === 'buoni_pasto' ? '22' : '');

  const valore = parseEuro(valoreBuono);
  const persone = parseInt(numPersone) || 0;
  const qta = tipo === 'buoni_pasto' ? (parseInt(quantitaPerPersona) || 0) : 1;

  // Per buoni pasto: totale = valore_buono × quantità × n_dipendenti
  // Per spesa/omaggio: totale = valore_buono × n_persone
  const totaleDestinatari = valore * persone * qta;

  // Commissione: 5% fino a 30.000€, poi 3% sulla parte eccedente
  let commissione = 0;
  if (totaleDestinatari <= 30000) {
    commissione = totaleDestinatari * 0.05;
  } else {
    commissione = 30000 * 0.05 + (totaleDestinatari - 30000) * 0.03;
  }

  const totaleImprenditore = totaleDestinatari + commissione;
  const percEffettiva = totaleDestinatari > 0 ? (commissione / totaleDestinatari * 100) : 0;

  const labels = {
    buoni_pasto: 'dipendenti',
    buoni_spesa: 'dipendenti',
    buoni_omaggio: 'destinatari',
  };

  if (!valoreBuono) return null;

  const showResults = persone > 0 && valore > 0 && (tipo !== 'buoni_pasto' || qta > 0);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="w-4 h-4 text-cyan-400" />
        <h4 className="text-white font-bold text-xs">Simulazione costi</h4>
      </div>

      {/* Input numero persone */}
      <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-3 py-2">
        <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-slate-400 text-xs flex-shrink-0">N° {labels[tipo] || 'persone'}</span>
        <Input
          type="number"
          min="1"
          value={numPersone}
          onChange={e => setNumPersone(e.target.value)}
          placeholder="Es. 20"
          className="bg-slate-800 border-slate-600 text-white text-xs h-7 w-24"
        />
      </div>

      {/* Input quantità buoni per persona (solo buoni pasto) */}
      {tipo === 'buoni_pasto' && (
        <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-3 py-2">
          <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-slate-400 text-xs flex-shrink-0">Buoni per dipendente</span>
          <Input
            type="number"
            min="1"
            value={quantitaPerPersona}
            onChange={e => setQuantitaPerPersona(e.target.value)}
            placeholder="Es. 22"
            className="bg-slate-800 border-slate-600 text-white text-xs h-7 w-24"
          />
          <span className="text-slate-500 text-[10px]">(~22/mese)</span>
        </div>
      )}

      {/* Risultato simulazione */}
      {showResults && (
        <Card className="bg-slate-900/80 border-slate-700 p-3 space-y-2.5">
          {/* Riga: valore ai dipendenti */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-slate-300 text-xs">Valore ai {labels[tipo] || 'destinatari'}</span>
            </div>
            <span className="text-green-400 font-bold text-sm">€ {fmt(totaleDestinatari)}</span>
          </div>
          <div className="text-slate-500 text-[10px] pl-4">
            {tipo === 'buoni_pasto' ? (
              <span>{persone} dipendenti × {qta} buoni × € {fmt(valore)}</span>
            ) : (
              <span>{persone} × € {fmt(valore)} a persona</span>
            )}
          </div>

          {/* Riga: costo servizio */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-300 text-xs">Costo servizio</span>
            </div>
            <span className="text-amber-400 font-bold text-sm">€ {fmt(commissione)}</span>
          </div>
          <div className="text-slate-500 text-[10px] pl-4">
            {totaleDestinatari <= 30000 ? (
              <span>5% su € {fmt(totaleDestinatari)}</span>
            ) : (
              <span>5% su primi € 30.000 + 3% su € {fmt(totaleDestinatari - 30000)}</span>
            )}
            <span className="ml-1">(media: {fmt(percEffettiva)}%)</span>
          </div>

          {/* Separatore */}
          <div className="border-t border-slate-700 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Euro className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-white font-semibold text-xs">Totale a carico dell&#39;azienda</span>
              </div>
              <span className="text-pink-400 font-bold text-base">€ {fmt(totaleImprenditore)}</span>
            </div>
          </div>

          {/* Riepilogo visuale */}
          <div className="bg-slate-800/50 rounded-lg p-2 mt-1">
            <div className="flex items-center gap-1 text-[10px] flex-wrap">
              <span className="text-pink-400 font-semibold">€ {fmt(totaleImprenditore)}</span>
              <span className="text-slate-500">=</span>
              <span className="text-green-400">€ {fmt(totaleDestinatari)}</span>
              <span className="text-slate-500">({labels[tipo] || 'destinatari'})</span>
              <span className="text-slate-500">+</span>
              <span className="text-amber-400">€ {fmt(commissione)}</span>
              <span className="text-slate-500">(servizio)</span>
            </div>
          </div>

          {/* Prossimi passi */}
          <div className="border-t border-slate-700 pt-3 mt-2 space-y-2">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">Prossimi passi</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-2.5 h-2.5 text-pink-400" />
                </div>
                <span className="text-slate-300 text-[11px]"><strong>1.</strong> Generiamo il contratto che va <strong>timbrato e firmato</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CreditCard className="w-2.5 h-2.5 text-pink-400" />
                </div>
                <span className="text-slate-300 text-[11px]"><strong>2.</strong> Dovrai <strong>bonificare l&#39;importo totale</strong> di € {fmt(totaleImprenditore)}</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Upload className="w-2.5 h-2.5 text-pink-400" />
                </div>
                <span className="text-slate-300 text-[11px]"><strong>3.</strong> Carica i <strong>dati delle persone</strong> che usufruiranno del benefit</span>
              </div>
            </div>
          </div>

          {/* Bottone Procedi */}
          <Button
            onClick={() => onProcedi && onProcedi({ numPersone: persone, totaleDestinatari, commissione, totaleImprenditore, quantitaPerPersona: qta })}
            className="w-full mt-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-white font-bold text-sm"
          >
            Procediamo a creare il contratto
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      )}

      {/* Pannello informativo specifico per tipo */}
      {showResults && (
        <WelfareInfoPanel tipo={tipo} valore={valore} persone={persone} userEmail={userEmail} />
      )}
    </div>
  );
}