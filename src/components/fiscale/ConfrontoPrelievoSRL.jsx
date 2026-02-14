import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownUp, Trophy, Loader2, AlertTriangle } from 'lucide-react';

function calcolaIRPEF(reddito) {
  if (reddito <= 0) return 0;
  // 2026: 23% fino a 28k, 33% da 28k a 50k (se reddito <= 200k, altrimenti 35%), 43% oltre 50k
  const aliq2 = reddito <= 200000 ? 0.33 : 0.35;
  if (reddito <= 28000) return reddito * 0.23;
  if (reddito <= 50000) return 28000 * 0.23 + (reddito - 28000) * aliq2;
  return 28000 * 0.23 + 22000 * aliq2 + (reddito - 50000) * 0.43;
}

const r2 = (n) => Math.round(n * 100) / 100;
const formatEuro = (v) => `€${Math.round(v).toLocaleString('it-IT')}`;

export default function ConfrontoPrelievoSRL() {
    const [utile, setUtile] = useState('');
    const [regione, setRegione] = useState('');
    const [categoriaIrap, setCategoriaIrap] = useState('');
    const [categorieDisponibili, setCategorieDisponibili] = useState([]);
    const [aliquote, setAliquote] = useState(null);
    const [loadingAliquote, setLoadingAliquote] = useState(true);

    // Carica aliquote base da DB
    useEffect(() => {
      const load = async () => {
        const [fiscali, inps] = await Promise.all([
          base44.entities.AliquoteFiscali.filter({ anno: 2026 }),
          base44.entities.ContributiINPS.filter({ anno: 2026, gestione: 'AmministratoreSRL' })
        ]);
        const get = (tipo) => fiscali.find(a => a.tipo_imposta === tipo)?.aliquota || 0;
        setAliquote({
          ires: get('IRES'),
          irap: get('IRAP'),
          dividendi: get('Dividendi'),
          inps_gs: inps.length > 0 ? inps[0].aliquota_percentuale : 0.3372,
          inps_massimale: inps.length > 0 ? (inps[0].massimale_reddito || Infinity) : Infinity
        });
        setLoadingAliquote(false);
      };
      load();
    }, []);

    // Carica categorie IRAP regionali
    useEffect(() => {
      if (!regione) { setCategorieDisponibili([]); return; }
      const load = async () => {
        const records = await base44.entities.AliquoteIRAPRegionali.filter({ anno: 2026, regione });
        setCategorieDisponibili(records);
        // Aggiorna aliquota IRAP con ordinaria della regione
        const ordinaria = records.find(r => r.categoria === 'Impresa Ordinaria');
        if (ordinaria && aliquote) {
          setAliquote(prev => ({ ...prev, irap: ordinaria.aliquota }));
        }
      };
      load();
    }, [regione]);

    // Aggiorna aliquota quando cambia categoria
    useEffect(() => {
      if (!categoriaIrap || categorieDisponibili.length === 0) return;
      const record = categorieDisponibili.find(r => r.categoria === categoriaIrap);
      if (record && aliquote) {
        setAliquote(prev => ({ ...prev, irap: record.aliquota }));
      }
    }, [categoriaIrap, categorieDisponibili]);

  const utileNum = parseFloat(utile) || 0;

  const scenari = useMemo(() => {
    if (utileNum <= 0 || !aliquote) return null;

    // SCENARIO A: Tutto dividendi
    const a_ires = r2(utileNum * aliquote.ires);
    const a_irap = r2(utileNum * aliquote.irap);
    const a_tasseSocieta = r2(a_ires + a_irap);
    const a_utileNetto = r2(utileNum - a_ires - a_irap);
    const a_dividendi26 = r2(a_utileNetto * aliquote.dividendi);
    const a_tassePersonali = a_dividendi26;
    const a_netto = r2(a_utileNetto - a_dividendi26);

    const scenarioA = {
      label: 'Solo Dividendi',
      dettaglio: `IRES ${formatEuro(a_ires)} + IRAP ${formatEuro(a_irap)}`,
      tasseSocieta: a_tasseSocieta,
      tassePersonali: a_tassePersonali,
      contributi: 0,
      tasseTotali: r2(a_tasseSocieta + a_tassePersonali),
      netto: a_netto
    };

    // SCENARIO B: Compenso = 100% utile (utile società = 0)
    const compenso = utileNum;
    const b_baseImponibile = 0; // utile - compenso = 0
    const b_ires = 0;
    const b_irap = 0;
    const b_tasseSocieta = 0;

    const b_irpef = r2(calcolaIRPEF(compenso));
    const b_redditoInps = Math.min(compenso, aliquote.inps_massimale);
    const b_inps = r2(b_redditoInps * aliquote.inps_gs);
    const b_tassePersonali = b_irpef;
    const b_netto = r2(compenso - b_irpef - b_inps);

    const scenarioB = {
      label: 'Tutto Compenso Amm.',
      dettaglio: `IRPEF ${formatEuro(b_irpef)} + INPS ${formatEuro(b_inps)}`,
      tasseSocieta: b_tasseSocieta,
      tassePersonali: b_tassePersonali,
      contributi: b_inps,
      tasseTotali: r2(b_tasseSocieta + b_tassePersonali + b_inps),
      netto: b_netto
    };

    return [scenarioA, scenarioB].sort((x, y) => y.netto - x.netto);
  }, [utileNum, aliquote]);

  const differenza = scenari ? Math.round(Math.abs(scenari[0].netto - scenari[1].netto)) : 0;

  if (loadingAliquote) {
    return (
      <div className="flex items-center justify-center py-10 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#d4af37]" />
        <span className="text-slate-400 text-sm">Caricamento aliquote...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ArrowDownUp className="w-5 h-5 text-[#d4af37]" />
        <h2 className="text-white font-bold text-lg">Confronto Prelievo SRL</h2>
      </div>
      <p className="text-slate-400 text-xs">
        Dato lo stesso utile, confronta: prelevare tutto come dividendi vs. tutto come compenso amministratore.
      </p>

      {/* Regione e Categoria IRAP */}
      <div>
        <label className="text-slate-400 text-xs font-medium mb-1 block">Regione *</label>
        <Select value={regione} onValueChange={(v) => { setRegione(v); setCategoriaIrap(''); }}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Seleziona regione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Marche">Marche</SelectItem>
            <SelectItem value="Emilia-Romagna">Emilia-Romagna</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {regione && categorieDisponibili.length > 0 && (
        <div>
          <label className="text-slate-400 text-xs font-medium mb-1 block">Categoria IRAP</label>
          <Select value={categoriaIrap} onValueChange={setCategoriaIrap}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Impresa Ordinaria (default)" />
            </SelectTrigger>
            <SelectContent>
              {categorieDisponibili.map(c => (
                <SelectItem key={c.id} value={c.categoria}>
                  {c.categoria} – {(c.aliquota * 100).toFixed(2)}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoriaIrap && categoriaIrap !== 'Impresa Ordinaria' && (
            <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-yellow-900/20 border border-yellow-600/30">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-300 text-[10px]">Verificare possesso requisiti normativi per applicazione aliquota specifica.</p>
            </div>
          )}
        </div>
      )}

      {/* Aliquote caricate */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-3">
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Aliquote da database (anno 2026){regione ? ` – ${regione}` : ''}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <span>IRES {(aliquote.ires * 100).toFixed(1)}%</span>
            <span>IRAP {(aliquote.irap * 100).toFixed(2)}%{regione ? ` (${categoriaIrap || 'Impresa Ordinaria'})` : ''}</span>
            <span>Dividendi {(aliquote.dividendi * 100).toFixed(0)}%</span>
            <span>INPS GS {(aliquote.inps_gs * 100).toFixed(2)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Input */}
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

      {/* Risultati */}
      {scenari && (
        <>
          {/* Vincitore */}
          {differenza > 0 && (
            <Card className="bg-green-900/20 border-green-500/40">
              <CardContent className="p-3 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-400 text-sm font-semibold">{scenari[0].label}</p>
                  <p className="text-slate-300 text-xs">Risparmio netto: {formatEuro(differenza)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabella */}
          <Card className="bg-[#0a2540] border-[#1a3a5c]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 font-medium p-3">Modalità</th>
                      <th className="text-right text-slate-400 font-medium p-3">Tasse Soc.</th>
                      <th className="text-right text-slate-400 font-medium p-3">Tasse Pers.</th>
                      <th className="text-right text-slate-400 font-medium p-3">Contributi</th>
                      <th className="text-right text-slate-400 font-medium p-3">Netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenari.map((s, i) => {
                      const isBest = i === 0 && differenza > 0;
                      return (
                        <tr key={i} className={`border-b border-slate-800 ${isBest ? 'bg-green-900/10' : ''}`}>
                          <td className="p-3">
                            <span className={`font-semibold ${isBest ? 'text-green-400' : 'text-white'}`}>{s.label}</span>
                          </td>
                          <td className="text-right p-3 text-red-400">{formatEuro(s.tasseSocieta)}</td>
                          <td className="text-right p-3 text-red-400">{formatEuro(s.tassePersonali)}</td>
                          <td className="text-right p-3 text-yellow-400">{formatEuro(s.contributi)}</td>
                          <td className="text-right p-3 text-green-400 font-bold">{formatEuro(s.netto)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Differenza */}
          {differenza > 0 && (
            <Card className="bg-[#0a2540] border-[#d4af37]/30">
              <CardContent className="p-3 text-center">
                <p className="text-slate-400 text-xs">Differenza netta tra le due modalità</p>
                <p className="text-[#d4af37] font-bold text-xl mt-1">{formatEuro(differenza)}</p>
                <p className="text-slate-500 text-[10px] mt-1">a favore di "{scenari[0].label}"</p>
              </CardContent>
            </Card>
          )}

          {/* Dettaglio */}
          <div className="space-y-3">
            {scenari.map((s, i) => {
              const caricoTotale = r2(s.tasseSocieta + s.tassePersonali + s.contributi);
              const caricoPerc = utileNum > 0 ? r2((caricoTotale / utileNum) * 100) : 0;
              const rimaneSu100 = r2(100 - caricoPerc);
              const semaforoColor = caricoPerc < 30 ? 'text-green-400' : caricoPerc <= 45 ? 'text-yellow-400' : 'text-red-400';
              return (
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
                    <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Carico fiscale effettivo</p>
                        <p className={`font-bold text-lg ${semaforoColor}`}>{caricoPerc}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Su 100€ di utile rimangono</p>
                        <p className="text-green-400 font-bold text-lg">€{rimaneSu100.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}