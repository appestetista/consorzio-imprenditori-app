import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowDownUp, Trophy } from 'lucide-react';

function calcolaIRPEF(reddito) {
  if (reddito <= 0) return 0;
  if (reddito <= 28000) return reddito * 0.23;
  if (reddito <= 50000) return 28000 * 0.23 + (reddito - 28000) * 0.35;
  return 28000 * 0.23 + 22000 * 0.35 + (reddito - 50000) * 0.43;
}

function calcolaScenarioA(utile) {
  // Scenario A: tutto come dividendi
  const ires = utile * 0.24;
  const irap = utile * 0.039;
  const tasseSocieta = Math.round((ires + irap) * 100) / 100;
  const utileNetto = utile - ires - irap;
  const impostaDividendi = utileNetto * 0.26;
  const tassePersonali = Math.round(impostaDividendi * 100) / 100;
  const netto = Math.round((utileNetto - impostaDividendi) * 100) / 100;
  return {
    label: 'Solo Dividendi',
    tasseSocieta,
    tassePersonali,
    contributi: 0,
    tasseTotali: Math.round((tasseSocieta + tassePersonali) * 100) / 100,
    netto
  };
}

function calcolaScenarioB(utile, compenso) {
  // Scenario B: compenso amministratore + eventuale residuo come dividendi
  if (compenso > utile) compenso = utile;

  // Tasse società (utile - compenso = base imponibile società)
  const baseImponibile = utile - compenso;
  const ires = baseImponibile * 0.24;
  const irap = baseImponibile * 0.039;
  const tasseSocieta = Math.round((ires + irap) * 100) / 100;

  // IRPEF su compenso
  const irpef = calcolaIRPEF(compenso);

  // Contributi INPS gestione separata su compenso (aliquota ~33.72%)
  const contributiINPS = compenso * 0.3372;

  // Dividendi sul residuo
  const utileNettoSocieta = baseImponibile - ires - irap;
  const impostaDividendi = utileNettoSocieta > 0 ? utileNettoSocieta * 0.26 : 0;
  const dividendiNetti = utileNettoSocieta > 0 ? utileNettoSocieta - impostaDividendi : 0;

  const tassePersonali = Math.round((irpef + impostaDividendi) * 100) / 100;
  const contributi = Math.round(contributiINPS * 100) / 100;
  const nettoCompenso = compenso - irpef - contributiINPS;
  const netto = Math.round((nettoCompenso + dividendiNetti) * 100) / 100;

  return {
    label: `Compenso €${compenso.toLocaleString('it-IT')} + Dividendi`,
    tasseSocieta,
    tassePersonali,
    contributi,
    tasseTotali: Math.round((tasseSocieta + tassePersonali + contributi) * 100) / 100,
    netto
  };
}

const formatEuro = (v) => `€${Math.round(v).toLocaleString('it-IT')}`;

export default function ConfrontoPrelievoSRL() {
  const [utile, setUtile] = useState('');
  const [compenso, setCompenso] = useState('');

  const utileNum = parseFloat(utile) || 0;
  const compensoNum = parseFloat(compenso) || 0;

  const scenari = useMemo(() => {
    if (utileNum <= 0) return null;
    const a = calcolaScenarioA(utileNum);
    const b = compensoNum > 0 ? calcolaScenarioB(utileNum, compensoNum) : null;
    const list = [a];
    if (b) list.push(b);
    // Ordina per netto maggiore
    list.sort((x, y) => y.netto - x.netto);
    return list;
  }, [utileNum, compensoNum]);

  const migliore = scenari?.[0];
  const differenza = scenari && scenari.length === 2
    ? Math.round(Math.abs(scenari[0].netto - scenari[1].netto) * 100) / 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <ArrowDownUp className="w-5 h-5 text-[#d4af37]" />
        <h2 className="text-white font-bold text-lg">Confronto Prelievo SRL</h2>
      </div>
      <p className="text-slate-400 text-xs">
        Confronta: prelevare tutto come dividendi vs. compenso amministratore + dividendi residui.
      </p>

      {/* Input */}
      <div className="space-y-3">
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Utile societario (€) *</label>
          <Input
            type="number"
            placeholder="es. 80000"
            value={utile}
            onChange={(e) => setUtile(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Compenso amministratore ipotetico (€) *</label>
          <Input
            type="number"
            placeholder="es. 30000"
            value={compenso}
            onChange={(e) => setCompenso(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Risultati */}
      {scenari && scenari.length > 0 && (
        <>
          {/* Vincitore */}
          {scenari.length === 2 && differenza > 0 && (
            <Card className="bg-green-900/20 border-green-500/40">
              <CardContent className="p-3 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-400 text-sm font-semibold">
                    {migliore.label}
                  </p>
                  <p className="text-slate-300 text-xs">
                    Ti fa risparmiare {formatEuro(differenza)} in più
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabella comparativa */}
          <Card className="bg-[#0a2540] border-[#1a3a5c]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 font-medium p-3">Modalità</th>
                      <th className="text-right text-slate-400 font-medium p-3">Tasse Tot.</th>
                      <th className="text-right text-slate-400 font-medium p-3">Netto</th>
                      {scenari.length === 2 && (
                        <th className="text-right text-slate-400 font-medium p-3">Diff.</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {scenari.map((s, i) => {
                      const isBest = i === 0 && scenari.length === 2 && differenza > 0;
                      const diff = scenari.length === 2
                        ? Math.round((s.netto - scenari[scenari.length - 1].netto) * 100) / 100
                        : 0;
                      return (
                        <tr key={i} className={`border-b border-slate-800 ${isBest ? 'bg-green-900/10' : ''}`}>
                          <td className="p-3">
                            <span className={`font-semibold ${isBest ? 'text-green-400' : 'text-white'}`}>
                              {s.label}
                            </span>
                          </td>
                          <td className="text-right p-3 text-red-400 font-medium">{formatEuro(s.tasseTotali)}</td>
                          <td className="text-right p-3 text-green-400 font-bold">{formatEuro(s.netto)}</td>
                          {scenari.length === 2 && (
                            <td className="text-right p-3">
                              {diff > 0 ? (
                                <span className="text-green-400 font-medium">+{formatEuro(diff)}</span>
                              ) : diff < 0 ? (
                                <span className="text-red-400 font-medium">{formatEuro(diff)}</span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Dettaglio per scenario */}
          <div className="space-y-3">
            {scenari.map((s, i) => (
              <Card key={i} className="bg-[#0a2540] border-[#1a3a5c]">
                <CardContent className="p-3">
                  <p className="text-white text-sm font-semibold mb-2">{s.label}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Tasse società</span>
                      <p className="text-red-400 font-medium">{formatEuro(s.tasseSocieta)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Tasse personali</span>
                      <p className="text-red-400 font-medium">{formatEuro(s.tassePersonali)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Contributi INPS</span>
                      <p className="text-yellow-400 font-medium">{formatEuro(s.contributi)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Netto in tasca</span>
                      <p className="text-green-400 font-bold">{formatEuro(s.netto)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}