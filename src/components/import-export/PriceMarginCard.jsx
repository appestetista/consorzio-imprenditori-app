import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Minus, BarChart3, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getFlagUrl } from './CountrySearchSelect';

function fmtPrice(val, unit) {
  if (val === null || val === undefined) return 'N/D';
  return `$${val.toFixed(2)}/${unit}`;
}

function fmtPriceEur(val, unit) {
  if (val === null || val === undefined) return null;
  return `€${val.toFixed(2)}/${unit}`;
}

function PremiumBadge({ pct }) {
  if (pct === null || pct === undefined) return <span className="text-slate-500 text-xs">N/D</span>;
  const isPremium = pct > 5;
  const isDiscount = pct < -5;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
      isPremium ? 'bg-blue-500/20 text-blue-400' :
      isDiscount ? 'bg-green-500/20 text-green-400' :
      'bg-slate-600/50 text-slate-300'
    }`}>
      {pct > 0 ? '+' : ''}{pct}%
      {isPremium ? ' Premium' : isDiscount ? ' Discount' : ' Allineato'}
    </span>
  );
}

function TrendArrow({ val }) {
  if (val === null || val === undefined) return <span className="text-slate-500 text-xs">N/D</span>;
  const isUp = val > 3;
  const isDown = val < -3;
  return (
    <div className="flex items-center gap-1">
      {isUp ? <TrendingUp className="w-3.5 h-3.5 text-red-400" /> :
       isDown ? <TrendingDown className="w-3.5 h-3.5 text-green-400" /> :
       <Minus className="w-3.5 h-3.5 text-yellow-400" />}
      <span className={`text-xs font-bold ${isUp ? 'text-red-400' : isDown ? 'text-green-400' : 'text-yellow-400'}`}>
        {val > 0 ? '+' : ''}{val}%
      </span>
    </div>
  );
}

function PriceChart({ serie, unit, tassoCambio }) {
  if (!serie || serie.length < 2) return null;
  const useEur = serie[0]?.prezzo_unitario_eur !== undefined;
  const data = serie.map(s => ({
    anno: s.anno,
    prezzo: useEur ? s.prezzo_unitario_eur : s.prezzo_unitario_usd_kg,
  }));
  const valuta = useEur ? '€' : '$';

  return (
    <div className="h-32 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="anno" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={50}
            tickFormatter={v => `${valuta}${v.toFixed(1)}`} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
            formatter={v => [`${valuta}${v.toFixed(2)}/${unit}`, 'Prezzo']}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Line type="monotone" dataKey="prezzo" stroke="#a3e635" strokeWidth={2} dot={{ r: 3, fill: '#a3e635' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketPriceDetail({ m, interpretation }) {
  const [expanded, setExpanded] = useState(false);
  const flagUrl = getFlagUrl(m.paese_code);
  const interp = interpretation?.mercati?.find(im => im.paese_code === m.paese_code);

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-0">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors"
        >
          {m.paese_code !== 'WLD' ? (
            <img src={flagUrl} alt="" className="w-8 h-5.5 object-cover rounded-sm shadow" />
          ) : (
            <DollarSign className="w-6 h-5 text-lime-400" />
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm font-semibold">{m.paese_nome}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-400 text-[10px]">
                Media: {fmtPrice(m.prezzo_world_usd, m.unita_misura)}
              </span>
              <PremiumBadge pct={m.premium_pct} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TrendArrow val={m.trend_prezzo_pct} />
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
            {/* Dati Ufficiali */}
            <div>
              <p className="text-lime-400 text-[10px] font-semibold uppercase tracking-wider mb-2">📊 Dati Ufficiali (UN Comtrade)</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700/50 rounded-lg p-2.5">
                  <p className="text-slate-400 text-[10px]">Prezzo medio import (World)</p>
                  <p className="text-white font-bold text-sm">{fmtPrice(m.prezzo_world_usd, m.unita_misura)}</p>
                  {m.prezzo_world_eur && <p className="text-slate-500 text-[10px]">{fmtPriceEur(m.prezzo_world_eur, m.unita_misura)}</p>}
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2.5">
                  <p className="text-slate-400 text-[10px]">Prezzo import da esportatore</p>
                  <p className="text-white font-bold text-sm">{fmtPrice(m.prezzo_exporter_usd, m.unita_misura)}</p>
                  {m.prezzo_exporter_eur && <p className="text-slate-500 text-[10px]">{fmtPriceEur(m.prezzo_exporter_eur, m.unita_misura)}</p>}
                </div>
              </div>

              {/* Ranking prezzo */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-slate-700/50 rounded-lg p-2.5">
                  <p className="text-slate-400 text-[10px]">Posizionamento prezzo</p>
                  <PremiumBadge pct={m.premium_pct} />
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2.5">
                  <p className="text-slate-400 text-[10px]">Ranking prezzo fornitori</p>
                  <p className="text-white font-semibold text-sm">
                    {m.ranking_prezzo !== null ? `#${m.ranking_prezzo} / ${m.ranking_totale}` : 'N/D'}
                  </p>
                  <p className="text-slate-500 text-[10px]">{m.ranking_prezzo !== null ? (m.ranking_prezzo <= 2 ? '(tra i più economici)' : m.ranking_prezzo >= m.ranking_totale - 1 ? '(tra i più cari)' : '(fascia intermedia)') : ''}</p>
                </div>
              </div>

              {/* Trend prezzo */}
              <div className="mt-2 bg-slate-700/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-[10px]">Trend prezzo nel periodo</p>
                  <TrendArrow val={m.trend_prezzo_pct} />
                </div>
                <PriceChart serie={m.serie_prezzo_eur?.length > 0 ? m.serie_prezzo_eur : m.serie_prezzo} unit={m.unita_misura} />
              </div>

              {/* Top fornitori prezzo */}
              {m.top_fornitori?.length > 0 && (
                <div className="mt-2">
                  <p className="text-slate-400 text-[10px] mb-1.5">Confronto prezzo fornitori ({m.unita_misura}):</p>
                  <div className="space-y-1">
                    {m.top_fornitori.map((f, i) => {
                      const isExporter = false; // fornitori sono competitor
                      const bar = m.prezzo_world_usd && f.prezzo_unitario_usd_kg
                        ? Math.min((f.prezzo_unitario_usd_kg / (m.prezzo_world_usd * 2)) * 100, 100)
                        : 50;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px] w-16 truncate">{f.paese}</span>
                          <div className="flex-1 h-3 bg-slate-600/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                              style={{ width: `${bar}%` }}
                            />
                          </div>
                          <span className="text-white text-[10px] font-mono w-20 text-right">
                            ${f.prezzo_unitario_usd_kg?.toFixed(2)}{f.prezzo_eur ? ` (€${f.prezzo_eur})` : ''}
                          </span>
                        </div>
                      );
                    })}
                    {/* Linea esportatore */}
                    {m.prezzo_exporter_usd && (
                      <div className="flex items-center gap-2 border-t border-dashed border-slate-600 pt-1 mt-1">
                        <span className="text-lime-400 text-[10px] w-16 truncate font-semibold">Esportatore</span>
                        <div className="flex-1 h-3 bg-slate-600/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-lime-400 to-green-400 rounded-full"
                            style={{ width: `${m.prezzo_world_usd ? Math.min((m.prezzo_exporter_usd / (m.prezzo_world_usd * 2)) * 100, 100) : 50}%` }}
                          />
                        </div>
                        <span className="text-lime-400 text-[10px] font-mono w-20 text-right font-semibold">
                          ${m.prezzo_exporter_usd.toFixed(2)}{m.prezzo_exporter_eur ? ` (€${m.prezzo_exporter_eur})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Separatore: Dati → Interpretazione */}
            {interp && !interp.dati_insufficienti && (
              <div className="border-t border-dashed border-slate-600 pt-3">
                <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-wider mb-2">🤖 Interpretazione AI</p>
                <div className="space-y-2">
                  {interp.analisi_posizionamento && (
                    <div className="bg-slate-700/30 rounded-lg p-2.5">
                      <p className="text-slate-400 text-[10px] mb-0.5">Posizionamento prezzo</p>
                      <p className="text-slate-200 text-xs">{interp.analisi_posizionamento}</p>
                    </div>
                  )}
                  {interp.analisi_competitivita && (
                    <div className="bg-slate-700/30 rounded-lg p-2.5">
                      <p className="text-slate-400 text-[10px] mb-0.5">Competitività</p>
                      <p className="text-slate-200 text-xs">{interp.analisi_competitivita}</p>
                    </div>
                  )}
                  {interp.analisi_trend && (
                    <div className="bg-slate-700/30 rounded-lg p-2.5">
                      <p className="text-slate-400 text-[10px] mb-0.5">Trend prezzo</p>
                      <p className="text-slate-200 text-xs">{interp.analisi_trend}</p>
                    </div>
                  )}
                  {interp.strategia_prezzo && (
                    <div className="bg-lime-400/10 border border-lime-400/20 rounded-lg p-2.5">
                      <p className="text-lime-400 text-[10px] mb-0.5">💡 Strategia consigliata</p>
                      <p className="text-lime-200 text-xs">{interp.strategia_prezzo}</p>
                    </div>
                  )}
                  {interp.rischio_margine && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5">
                      <p className="text-orange-400 text-[10px] mb-0.5">⚠ Rischio margine</p>
                      <p className="text-orange-200 text-xs">{interp.rischio_margine}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {interp?.dati_insufficienti && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-yellow-200 text-xs">Dati insufficienti per un'analisi affidabile di questo mercato.</p>
              </div>
            )}

            {!m.dati_completi && !interp?.dati_insufficienti && (
              <p className="text-slate-500 text-[10px]">⚠ Dati parziali — alcuni valori non disponibili da UN Comtrade per questo Paese/HS.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PriceMarginSection({ priceMetrics, interpretation }) {
  if (!priceMetrics?.metriche || priceMetrics.metriche.length === 0) return null;

  const hasInterpretation = interpretation && !interpretation._api_error;

  return (
    <div className="space-y-3">
      {/* Header sezione */}
      <Card className="bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border-indigo-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Analisi Prezzo & Marginalità</h3>
                <p className="text-indigo-200/70 text-xs">Prezzo unitario medio import per mercato</p>
              </div>
            </div>
            {hasInterpretation && interpretation.punteggio_marginalita && (
              <div className="text-right">
                <div className={`text-2xl font-black ${
                  interpretation.punteggio_marginalita >= 7 ? 'text-green-400' :
                  interpretation.punteggio_marginalita >= 5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {interpretation.punteggio_marginalita}<span className="text-sm text-slate-500">/10</span>
                </div>
                <p className="text-slate-400 text-[10px]">Potenziale marginalità</p>
              </div>
            )}
          </div>
          {hasInterpretation && interpretation.valutazione_generale && (
            <p className="text-indigo-100/80 text-sm mt-3">{interpretation.valutazione_generale}</p>
          )}
        </CardContent>
      </Card>

      {/* Card per mercato */}
      {priceMetrics.metriche.map(m => (
        <MarketPriceDetail key={m.paese_code} m={m} interpretation={interpretation} />
      ))}

      {/* Raccomandazione pricing */}
      {hasInterpretation && interpretation.raccomandazione_pricing && (
        <Card className="bg-lime-400/10 border-lime-400/30">
          <CardContent className="p-4">
            <h4 className="text-lime-400 font-semibold text-sm mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Raccomandazione Pricing
            </h4>
            <p className="text-lime-200/80 text-xs">{interpretation.raccomandazione_pricing}</p>
          </CardContent>
        </Card>
      )}

      {/* Rischi pricing */}
      {hasInterpretation && interpretation.rischi_pricing?.length > 0 && (
        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-4">
            <h4 className="text-orange-400 font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Rischi Pricing
            </h4>
            <ul className="space-y-1">
              {interpretation.rischi_pricing.map((r, i) => (
                <li key={i} className="text-orange-200/80 text-xs flex items-start gap-1.5">
                  <span className="text-orange-400 mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Dati non disponibili */}
      {priceMetrics.dati_non_disponibili?.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <p className="text-slate-500 text-[10px] mb-1">⚠ Dati non reperiti da UN Comtrade:</p>
            {priceMetrics.dati_non_disponibili.map((d, i) => (
              <p key={i} className="text-slate-500 text-[10px]">• {d}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trasparenza fonti */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-3">
          <p className="text-slate-500 text-[10px] mb-1">📚 Fonti dati prezzo</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-slate-500">
            <div><span className="text-slate-600">Prezzo unitario:</span> UN Comtrade (TradeValue/NetWeight)</div>
            <div><span className="text-slate-600">Tasso cambio:</span> BCE (ECB)</div>
            <div><span className="text-slate-600">Calcolo premium:</span> Lato client, nessuna AI</div>
            <div><span className="text-slate-600">Interpretazione:</span> AI su dati verificati</div>
          </div>
          {priceMetrics.tasso_cambio && (
            <p className="text-blue-400/70 text-[10px] mt-1">💱 {priceMetrics.tasso_cambio.nota}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}