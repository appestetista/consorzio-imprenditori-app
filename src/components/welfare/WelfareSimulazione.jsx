import React, { useState } from 'react';
import { Calculator, Users, Euro, FileText, CreditCard, Upload, ChevronRight, TrendingUp, Lightbulb, ShieldCheck, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function parseEuro(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function fmt(n) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WelfareSimulazione({ valoreBuono, tipo, onProcedi }) {
  const [numPersone, setNumPersone] = useState('');

  const valore = parseEuro(valoreBuono);
  const persone = parseInt(numPersone) || 0;
  const totaleDestinatari = valore * persone;

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

      {/* Risultato simulazione */}
      {persone > 0 && valore > 0 && (
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
            {persone} × € {fmt(valore)} a persona
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
                <span className="text-white font-semibold text-xs">Totale a carico dell'azienda</span>
              </div>
              <span className="text-pink-400 font-bold text-base">€ {fmt(totaleImprenditore)}</span>
            </div>
          </div>

          {/* Riepilogo visuale */}
          <div className="bg-slate-800/50 rounded-lg p-2 mt-1">
            <div className="flex items-center gap-1 text-[10px]">
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
                <span className="text-slate-300 text-[11px]"><strong>1.</strong> Generiamo il contratto che andrà <strong>timbrato e firmato</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CreditCard className="w-2.5 h-2.5 text-pink-400" />
                </div>
                <span className="text-slate-300 text-[11px]"><strong>2.</strong> Dovrai <strong>bonificare l'importo totale</strong> di € {fmt(totaleImprenditore)}</span>
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
            onClick={() => onProcedi && onProcedi({ numPersone: persone, totaleDestinatari, commissione, totaleImprenditore })}
            className="w-full mt-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-white font-bold text-sm"
          >
            Procediamo a creare il contratto
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      )}

      {/* Pannello Risparmio & Strategie — visibile dopo simulazione */}
      {persone > 0 && valore > 0 && (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-cyan-500/30 border p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-cyan-500/10 px-4 py-3 flex items-center gap-2 border-b border-cyan-500/20">
            <Lightbulb className="w-4 h-4 text-cyan-400" />
            <h4 className="text-cyan-400 font-bold text-xs">Lo sapevi? Risparmio & Strategie</h4>
          </div>

          <div className="p-4 space-y-4">
            {/* Confronto: Busta paga vs Welfare */}
            <div>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-2">Confronto: in busta paga vs welfare</p>
              <div className="grid grid-cols-2 gap-2">
                {/* Busta paga */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                  <p className="text-red-400 text-[10px] font-semibold mb-1">💰 In busta paga</p>
                  <p className="text-white text-lg font-bold">€ {fmt(totaleDestinatari)}</p>
                  <div className="my-1.5 border-t border-red-500/20" />
                  <p className="text-red-300 text-[10px]">Tasse + contributi: ~47%</p>
                  <p className="text-red-400 font-bold text-sm mt-1">−€ {fmt(totaleDestinatari * 0.47)}</p>
                  <div className="my-1.5 border-t border-red-500/20" />
                  <p className="text-slate-400 text-[10px]">Al dipendente arriva:</p>
                  <p className="text-white font-bold text-base">€ {fmt(totaleDestinatari * 0.53)}</p>
                </div>
                {/* Welfare */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                  <p className="text-green-400 text-[10px] font-semibold mb-1">🎁 Con Welfare</p>
                  <p className="text-white text-lg font-bold">€ {fmt(totaleDestinatari)}</p>
                  <div className="my-1.5 border-t border-green-500/20" />
                  <p className="text-green-300 text-[10px]">Tasse + contributi: 0%</p>
                  <p className="text-green-400 font-bold text-sm mt-1">€ 0,00</p>
                  <div className="my-1.5 border-t border-green-500/20" />
                  <p className="text-slate-400 text-[10px]">Al dipendente arriva:</p>
                  <p className="text-green-400 font-bold text-base">€ {fmt(totaleDestinatari)}</p>
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 mt-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-green-400 text-xs font-semibold">
                  Risparmi € {fmt(totaleDestinatari * 0.47)} e il dipendente riceve il 100%!
                </p>
              </div>
            </div>

            {/* Utilizzo multiplo */}
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
              <div className="flex items-start gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-white text-xs font-semibold">Puoi usarli più volte all'anno</p>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Non sei limitato a un singolo ordine: puoi emettere buoni <strong className="text-white">più volte nell'arco dell'anno</strong>, 
                purché il totale per ciascun dipendente non superi la soglia di esenzione annuale.
              </p>
              {tipo === 'buoni_spesa' && (
                <div className="mt-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2">
                  <p className="text-cyan-300 text-[11px]">
                    <strong>Soglia Buoni Spesa:</strong> fino a <strong className="text-white">€1.000/anno</strong> per dipendente 
                    (€2.000 per chi ha figli a carico)
                  </p>
                </div>
              )}
              {tipo === 'buoni_omaggio' && (
                <div className="mt-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2">
                  <p className="text-cyan-300 text-[11px]">
                    <strong>Soglia Buoni Omaggio:</strong> fino a <strong className="text-white">€50</strong> per singolo omaggio 
                    per mantenere la piena deducibilità
                  </p>
                </div>
              )}
            </div>

            {/* Combinazione Fringe + Welfare */}
            {(tipo === 'buoni_spesa') && (
              <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl p-3 border border-purple-500/30">
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-white text-xs font-semibold">Strategia: combina Fringe Benefit + Welfare</p>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed mb-3">
                  Puoi <strong className="text-white">sommare</strong> i buoni spesa (fringe benefit) con il welfare aziendale 
                  per massimizzare il vantaggio fiscale per ogni dipendente:
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs flex-1">Fringe Benefit (buoni spesa)</span>
                    <span className="text-pink-400 font-bold text-sm">€ 1.000</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-slate-500 text-lg font-bold">+</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                    <span className="text-slate-300 text-xs flex-1">Welfare aziendale</span>
                    <span className="text-cyan-400 font-bold text-sm">€ 2.000</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-slate-500 text-lg font-bold">=</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-white text-xs font-semibold flex-1">Totale esenzione annua</span>
                    <span className="text-green-400 font-bold text-base">€ 3.000</span>
                  </div>
                </div>
                <p className="text-slate-400 text-[10px] mt-2 leading-relaxed">
                  Totalmente esenti da IRPEF, INPS e INAIL — 100% deducibili per l'azienda.
                  In busta paga dovresti spendere circa <strong className="text-red-400">€ {fmt(3000 / 0.53)}</strong> lordi 
                  per dare lo stesso netto al dipendente!
                </p>
              </div>
            )}

            {/* Deducibilità */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-green-400">100% deducibili:</strong> i buoni sono interamente deducibili dal reddito d'impresa 
                (IRES/IRPEF) e non generano oneri previdenziali né per l'azienda né per il dipendente.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}