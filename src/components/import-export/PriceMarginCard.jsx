import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Minus, BarChart3, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getFlagUrl } from './CountrySearchSelect';

function fmtPrice(val, unit) {
  if (val === null || val === undefined) return 'N/D';
  // Precisione adattiva: 4 decimali se < 1, 2 se >= 1
  const decimali = Math.abs(val) < 1 ? 4 : 2;
  return `$${val.toFixed(decimali)}/${unit}`;
}

function fmtPriceEur(val, unit) {
  if (val === null || val === undefined) return null;
  const decimali = Math.abs(val) < 1 ? 4 : 2;
  return `€${val.toFixed(decimali)}/${unit}`;
}

function fmtPriceLocale(val, unit, currencyCode) {
  if (val === null || val === undefined || !currencyCode) return null;
  const decimali = Math.abs(val) < 1 ? 4 : 2;
  // Simboli comuni
  const symbols = { USD: '$', GBP: '£', JPY: '¥', CNY: '¥', CHF: 'CHF ', INR: '₹', BRL: 'R$', KRW: '₩', AUD: 'A$', CAD: 'C$', SEK: 'kr ', NOK: 'kr ', DKK: 'kr ', PLN: 'zł ', CZK: 'Kč ', HUF: 'Ft ', TRY: '₺', MXN: 'MX$', ARS: 'AR$', RUB: '₽', ZAR: 'R ' };
  const sym = symbols[currencyCode] || `${currencyCode} `;
  return `${sym}${val.toFixed(decimali)}/${unit}`;
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

function PriceFitBadge({ index }) {
  if (index === null || index === undefined) return null;
  let label, colorClass;
  if (index < 0.9) {
    label = 'Competitivo';
    colorClass = 'bg-green-500/20 text-green-400 border-green-500/30';
  } else if (index <= 1.2) {
    label = 'Coerente';
    colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  } else if (index <= 2.0) {
    label = 'Premium';
    colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  } else {
    label = 'Molto superiore';
    colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <div className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${colorClass} flex items-center gap-1.5`}>
        <span className="font-mono">{index.toFixed(2)}</span>
        <span className="text-[10px] font-semibold opacity-80">— {label}</span>
      </div>
      {index > 3 && (
        <div className="flex items-start gap-1.5 mt-0.5">
          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-red-300 text-[10px] leading-tight">Prezzo significativamente superiore alla media import.</span>
        </div>
      )}
    </div>
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
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {m.prezzo_partner_usd !== null ? (
                <>
                  <span className="text-slate-400 text-[10px]">
                    Export: {fmtPrice(m.prezzo_partner_usd, m.unita_misura)}
                  </span>
                  <PremiumBadge pct={m.premium_pct} />
                </>
              ) : (
                <span className="text-yellow-400/70 text-[10px]">Prezzo medio non calcolabile</span>
              )}
              {m.query_fallback_world && <span className="text-yellow-400/70 text-[10px]">(World)</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TrendArrow val={m.trend_prezzo_pct} />
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
            {/* Avvisi validazione */}
            {m.avviso_prezzo && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-200 text-xs">{m.avviso_prezzo}</p>
              </div>
            )}
            {m.avviso_unita && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-orange-200 text-xs">{m.avviso_unita}</p>
              </div>
            )}

            {/* Dati Ufficiali */}
            <div>
              <p className="text-lime-400 text-[10px] font-semibold uppercase tracking-wider mb-2">📊 Dati Ufficiali (UN Comtrade)</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700/50 rounded-lg p-2.5">
                  <p className="text-slate-400 text-[10px]">Prezzo medio export = Valore / Quantità</p>
                  <p className="text-white font-bold text-sm">{fmtPrice(m.prezzo_partner_usd, m.unita_misura)}</p>
                  {m.prezzo_partner_eur && <p className="text-slate-500 text-[10px]">{fmtPriceEur(m.prezzo_partner_eur, m.unita_misura)}</p>}
                  {m.prezzo_partner_locale && m.valuta_locale?.codice !== 'EUR' && (
                    <p className="text-cyan-400/80 text-[10px]">{fmtPriceLocale(m.prezzo_partner_locale, m.unita_misura, m.valuta_locale.codice)}</p>
                  )}
                  {m.anno_riferimento && <p className="text-slate-500 text-[9px]">Anno: {m.anno_riferimento}</p>}
                  <p className="text-slate-600 text-[9px]">Unità: {m.unita_misura}</p>
                  {m.query_fallback_world && <p className="text-yellow-400/70 text-[9px]">⚠ dati da Partner=World</p>}
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2.5">
                  <p className="text-slate-400 text-[10px]">Media export globale (World)</p>
                  <p className="text-white font-bold text-sm">{fmtPrice(m.prezzo_world_usd, m.unita_misura)}</p>
                  {m.prezzo_world_eur && <p className="text-slate-500 text-[10px]">{fmtPriceEur(m.prezzo_world_eur, m.unita_misura)}</p>}
                  {m.prezzo_world_locale && m.valuta_locale?.codice !== 'EUR' && (
                    <p className="text-cyan-400/80 text-[10px]">{fmtPriceLocale(m.prezzo_world_locale, m.unita_misura, m.valuta_locale.codice)}</p>
                  )}
                </div>
              </div>

              {/* Tasso di cambio valuta locale */}
              {m.valuta_locale && m.valuta_locale.codice !== 'EUR' && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2 mt-2 flex items-center gap-2">
                  <span className="text-cyan-400 text-xs">💱</span>
                  <div className="text-cyan-200/80 text-[10px]">
                    <span className="font-semibold">1 EUR = {m.valuta_locale.tasso_eur} {m.valuta_locale.codice}</span>
                    {m.valuta_locale.nome && <span className="text-cyan-300/60"> ({m.valuta_locale.nome})</span>}
                    <span className="text-cyan-300/60"> — Anno: {m.valuta_locale.anno}, Fonte: {m.valuta_locale.fonte}</span>
                  </div>
                </div>
              )}

              {/* Valore e quantità export */}
              {(m.trade_value_usd || m.net_weight_kg) && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-700/50 rounded-lg p-2.5">
                    <p className="text-slate-400 text-[10px]">Valore export totale</p>
                    <p className="text-white font-bold text-sm">{m.trade_value_usd ? `$${m.trade_value_usd.toLocaleString('en-US')}` : 'N/D'}</p>
                    {m.trade_value_eur && <p className="text-slate-500 text-[10px]">€{m.trade_value_eur.toLocaleString('it-IT')}</p>}
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-2.5">
                    <p className="text-slate-400 text-[10px]">Quantità ({m.unita_misura})</p>
                    <p className="text-white font-bold text-sm">{m.net_weight_kg ? m.net_weight_kg.toLocaleString('en-US') : 'N/D'}</p>
                  </div>
                </div>
              )}

              {/* Price Fit Index */}
              {m.price_fit_index !== null && m.price_fit_index !== undefined && (
                <div className="bg-slate-700/50 rounded-lg p-2.5 mt-2">
                  <p className="text-slate-400 text-[10px] mb-1.5">Price Fit Index (Prezzo export / Media import mercato)</p>
                  <PriceFitBadge index={m.price_fit_index} />
                </div>
              )}

              {/* Ranking prezzo */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-slate-700/50 rounded-lg p-2.5">
                  <p className="text-slate-400 text-[10px]">Posizionamento prezzo</p>
                  <PremiumBadge pct={m.premium_pct} />
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2.5">
                  <p className="text-slate-400 text-[10px]">Ranking prezzo destinatari</p>
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

              {/* Top destinatari prezzo */}
              {m.top_destinatari?.length > 0 && (
                <div className="mt-2">
                  <p className="text-slate-400 text-[10px] mb-1.5">Confronto prezzo top destinatari ({m.unita_misura}):</p>
                  <div className="space-y-1">
                    {m.top_destinatari.map((f, i) => {
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
                    {/* Linea prezzo verso partner corrente */}
                    {m.prezzo_partner_usd && (
                      <div className="flex items-center gap-2 border-t border-dashed border-slate-600 pt-1 mt-1">
                        <span className="text-lime-400 text-[10px] w-16 truncate font-semibold">Questo mercato</span>
                        <div className="flex-1 h-3 bg-slate-600/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-lime-400 to-green-400 rounded-full"
                            style={{ width: `${m.prezzo_world_usd ? Math.min((m.prezzo_partner_usd / (m.prezzo_world_usd * 2)) * 100, 100) : 50}%` }}
                          />
                        </div>
                        <span className="text-lime-400 text-[10px] font-mono w-20 text-right font-semibold">
                          ${m.prezzo_partner_usd.toFixed(2)}{m.prezzo_partner_eur ? ` (€${m.prezzo_partner_eur})` : ''}
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

function getMarginStyle(pct) {
  if (pct >= 50) return { colorClass: 'text-green-400', label: 'Eccellente', barColor: 'from-green-500 to-emerald-400' };
  if (pct >= 30) return { colorClass: 'text-lime-400', label: 'Buono', barColor: 'from-lime-500 to-green-400' };
  if (pct >= 15) return { colorClass: 'text-yellow-400', label: 'Moderato', barColor: 'from-yellow-500 to-amber-400' };
  if (pct >= 0) return { colorClass: 'text-orange-400', label: 'Basso', barColor: 'from-orange-500 to-red-400' };
  return { colorClass: 'text-red-400', label: 'Negativo', barColor: 'from-red-600 to-red-400' };
}

function MarginBar({ pct, style }) {
  const barWidth = Math.max(0, Math.min(pct, 100));
  return (
    <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${style.barColor} rounded-full transition-all duration-500`}
        style={{ width: `${barWidth}%` }}
      />
    </div>
  );
}

function GrossMarginCard({ userPriceData }) {
  const pv = parseFloat(userPriceData?.prezzo_vendita);
  const cp = parseFloat(userPriceData?.costo_produzione);
  if (!pv || !cp || isNaN(pv) || isNaN(cp) || pv <= 0) return null;

  const unita = userPriceData?.unita || 'unità';

  // Margine Lordo
  const margineLordo = parseFloat((((pv - cp) / pv) * 100).toFixed(1));
  const lordoStyle = getMarginStyle(margineLordo);

  // Margine Netto: solo se almeno un costo aggiuntivo è compilato
  const logistica = parseFloat(userPriceData?.costo_logistica) || 0;
  const commissioni = parseFloat(userPriceData?.commissioni) || 0;
  const dazi = parseFloat(userPriceData?.dazi) || 0;
  const costiExtra = logistica + commissioni + dazi;
  const hasCostiExtra = costiExtra > 0;

  const costiTotali = cp + costiExtra;
  const margineNetto = hasCostiExtra ? parseFloat((((pv - costiTotali) / pv) * 100).toFixed(1)) : null;
  const nettoStyle = margineNetto !== null ? getMarginStyle(margineNetto) : null;

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-4">
        <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-lime-400" />
          Margine Lordo
        </h4>
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className={`text-3xl font-black ${lordoStyle.colorClass}`}>{margineLordo}%</span>
            <span className={`text-sm font-semibold ml-2 ${lordoStyle.colorClass}`}>{lordoStyle.label}</span>
          </div>
        </div>
        <MarginBar pct={margineLordo} style={lordoStyle} />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-slate-700/50 rounded-lg p-2">
            <p className="text-slate-400 text-[10px]">Prezzo vendita</p>
            <p className="text-white font-semibold text-sm">€{pv.toFixed(2)}/{unita}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2">
            <p className="text-slate-400 text-[10px]">Costo produzione</p>
            <p className="text-white font-semibold text-sm">€{cp.toFixed(2)}/{unita}</p>
          </div>
        </div>
        <p className="text-slate-500 text-[9px] mt-2">Formula: (Prezzo vendita – Costo produzione) / Prezzo vendita × 100</p>

        {/* Margine Netto */}
        {hasCostiExtra && margineNetto !== null && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Margine Netto
            </h4>
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className={`text-3xl font-black ${nettoStyle.colorClass}`}>{margineNetto}%</span>
                <span className={`text-sm font-semibold ml-2 ${nettoStyle.colorClass}`}>{nettoStyle.label}</span>
              </div>
            </div>
            <MarginBar pct={margineNetto} style={nettoStyle} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-slate-400 text-[10px]">Costi totali</p>
                <p className="text-white font-semibold text-sm">€{costiTotali.toFixed(2)}/{unita}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-slate-400 text-[10px]">Margine per unità</p>
                <p className={`font-semibold text-sm ${nettoStyle.colorClass}`}>€{(pv - costiTotali).toFixed(2)}/{unita}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded">Produzione: €{cp.toFixed(2)}</span>
              {logistica > 0 && <span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded">Logistica: €{logistica.toFixed(2)}</span>}
              {commissioni > 0 && <span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded">Commissioni: €{commissioni.toFixed(2)}</span>}
              {dazi > 0 && <span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded">Dazi: €{dazi.toFixed(2)}</span>}
            </div>
            <p className="text-slate-500 text-[9px] mt-2">Formula: (Prezzo vendita – Costi totali) / Prezzo vendita × 100</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PriceMarginSection({ priceMetrics, interpretation, userPriceData }) {
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
                <p className="text-indigo-200/70 text-xs">Prezzo unitario export per mercato (UN Comtrade)</p>
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

      {/* Avvisi validazione globali */}
      {priceMetrics.avvisi_validazione?.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-3">
            {priceMetrics.avvisi_validazione.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-200 text-xs">{a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Margine Lordo — dati utente */}
          <GrossMarginCard userPriceData={userPriceData} />

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
            <div><span className="text-slate-600">Tasso cambio:</span> BCE media annuale (ECB)</div>
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