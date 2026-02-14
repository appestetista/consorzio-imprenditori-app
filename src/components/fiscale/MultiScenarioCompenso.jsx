import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, TrendingUp, Loader2, Calculator } from 'lucide-react';
import AtecoSearchInput from './AtecoSearchInput';
import CategoriaIRAPBadge from './CategoriaIRAPBadge';
import useRaccordoATECO from './useRaccordoATECO';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const formatEuro = (v) => `€${Math.round(v).toLocaleString('it-IT')}`;

export default function MultiScenarioCompenso() {
  const [utile, setUtile] = useState('');
  const [step, setStep] = useState('5000');
  const [regione, setRegione] = useState('');
  const [codiceAteco, setCodiceAteco] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Raccordo automatico ATECO → IRAP
  const raccordo = useRaccordoATECO({ codiceAteco, regione, anno: 2026 });

  const handleCalcola = async () => {
    const u = parseFloat(utile);
    if (!u || u <= 0) return;
    setLoading(true);
    const res = await base44.functions.invoke('simulazioneMultiScenario', {
      utile_iniziale: u,
      step_simulazione: parseInt(step) || 5000,
      regione: regione || undefined,
      categoria_irap: raccordo.categoriaIrap || undefined
    });
    setResult(res.data);
    setLoading(false);
  };

  const migliore = result?.migliore;
  const scenari = result?.scenari || [];
  const scenarioZero = scenari.find(s => s.compenso === 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-[#d4af37]" />
        <h2 className="text-white font-bold text-lg">Multi-Scenario Compenso</h2>
      </div>
      <p className="text-slate-400 text-xs">
        Simula tutti i livelli di compenso amministratore per trovare il punto ottimale di netto in tasca.
      </p>

      {/* Regione e Codice ATECO */}
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1 block">Regione *</label>
        <Select value={regione} onValueChange={(v) => { setRegione(v); setCodiceAteco(''); }}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Seleziona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Marche">Marche</SelectItem>
            <SelectItem value="Emilia-Romagna">Emilia-Romagna</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {regione && (
        <>
          <AtecoSearchInput value={codiceAteco} onChange={setCodiceAteco} />
          <CategoriaIRAPBadge 
            categoriaIrap={raccordo.categoriaIrap}
            aliquotaIrap={raccordo.aliquotaIrap}
            fonte={raccordo.fonte}
            loading={raccordo.loading}
          />
        </>
      )}

      {/* Input */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Utile iniziale (€) *</label>
          <Input
            type="number"
            placeholder="es. 80000"
            value={utile}
            onChange={(e) => setUtile(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Step (€)</label>
          <Input
            type="number"
            placeholder="5000"
            value={step}
            onChange={(e) => setStep(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      <button
        onClick={handleCalcola}
        disabled={loading || !utile || !regione}
        className="w-full h-11 cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-slate-900 font-bold text-sm rounded-xl"
        style={{
          background: 'linear-gradient(to bottom, #f7d774 0%, #e6b93d 35%, #c6921b 60%, #9e6f0f 100%)',
          boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.6), inset 0 -6px 8px rgba(0,0,0,0.45), 0 10px 22px rgba(0,0,0,0.6)',
        }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
        {loading ? 'Simulazione...' : 'Simula Scenari'}
      </button>

      {/* Risultati */}
      {result?.success && (
        <>
          {/* Migliore */}
          <Card className="bg-green-900/20 border-green-500/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-bold text-sm">Miglior Scenario</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Compenso ottimale</span>
                  <p className="text-white font-bold text-lg">{formatEuro(migliore.compenso)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Netto in tasca</span>
                  <p className="text-green-400 font-bold text-lg">{formatEuro(migliore.netto_totale)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Carico fiscale</span>
                  <p className="text-[#d4af37] font-bold">{migliore.carico_fiscale_perc}%</p>
                </div>
                <div>
                  <span className="text-slate-400">vs dividendi puri</span>
                  <p className={`font-bold ${migliore.diff_vs_dividendi_puri > 0 ? 'text-green-400' : migliore.diff_vs_dividendi_puri < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {migliore.diff_vs_dividendi_puri > 0 ? '+' : ''}{formatEuro(migliore.diff_vs_dividendi_puri)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grafico */}
          <Card className="bg-[#0a2540] border-[#1a3a5c]">
            <CardContent className="p-4">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Netto totale per livello compenso</p>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={scenari} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a3a5c" />
                  <XAxis
                    dataKey="compenso"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    stroke="#64748b"
                    fontSize={10}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    stroke="#64748b"
                    fontSize={10}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0a2540', border: '1px solid #1a3a5c', borderRadius: 8, fontSize: 11 }}
                    labelFormatter={(v) => `Compenso: ${formatEuro(v)}`}
                    formatter={(value, name) => {
                      const labels = {
                        netto_totale: 'Netto totale',
                        tasse_totali: 'Tasse totali',
                        carico_fiscale_perc: 'Carico %'
                      };
                      if (name === 'carico_fiscale_perc') return [`${value}%`, labels[name]];
                      return [formatEuro(value), labels[name] || name];
                    }}
                  />
                  {migliore && (
                    <ReferenceLine
                      x={migliore.compenso}
                      stroke="#22c55e"
                      strokeDasharray="5 5"
                      label={{ value: 'Ottimale', fill: '#22c55e', fontSize: 10, position: 'top' }}
                    />
                  )}
                  <Line type="monotone" dataKey="netto_totale" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
                  <Line type="monotone" dataKey="tasse_totali" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2, fill: '#ef4444' }} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabella completa */}
          <Card className="bg-[#0a2540] border-[#1a3a5c]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 font-medium p-2">Compenso</th>
                      <th className="text-right text-slate-400 font-medium p-2">Tasse Soc.</th>
                      <th className="text-right text-slate-400 font-medium p-2">Tasse Pers.</th>
                      <th className="text-right text-slate-400 font-medium p-2">Contributi</th>
                      <th className="text-right text-slate-400 font-medium p-2">Tasse Tot.</th>
                      <th className="text-right text-slate-400 font-medium p-2">Netto</th>
                      <th className="text-right text-slate-400 font-medium p-2">Carico %</th>
                      <th className="text-right text-slate-400 font-medium p-2">Su 100€</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenari.map((s, i) => {
                      const isBest = migliore && s.compenso === migliore.compenso;
                      const diffVsZero = scenarioZero ? s.netto_totale - scenarioZero.netto_totale : 0;
                      return (
                        <tr key={i} className={`border-b border-slate-800 ${isBest ? 'bg-green-900/20' : ''}`}>
                          <td className="p-2">
                            <span className={`font-semibold ${isBest ? 'text-green-400' : 'text-white'}`}>
                              {formatEuro(s.compenso)}
                            </span>
                          </td>
                          <td className="text-right p-2 text-red-400">{formatEuro(s.tasse_societa)}</td>
                          <td className="text-right p-2 text-red-400">{formatEuro(s.tasse_personali)}</td>
                          <td className="text-right p-2 text-yellow-400">{formatEuro(s.contributi)}</td>
                          <td className="text-right p-2 text-red-300 font-medium">{formatEuro(s.tasse_totali)}</td>
                          <td className="text-right p-2 text-green-400 font-bold">{formatEuro(s.netto_totale)}</td>
                          <td className="text-right p-2">
                            <span className={s.carico_fiscale_perc < 30 ? 'text-green-400' : s.carico_fiscale_perc <= 45 ? 'text-yellow-400' : 'text-red-400'}>
                              {s.carico_fiscale_perc}%
                            </span>
                          </td>
                          <td className="text-right p-2 text-green-300">€{s.su_100_rimangono.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Nota */}
          <p className="text-slate-600 text-[10px] text-center">
            Simulazione matematica iterativa, nessuna AI. Aliquote da database anno {result.aliquote_usate ? 2026 : ''}.
          </p>
        </>
      )}
    </div>
  );
}