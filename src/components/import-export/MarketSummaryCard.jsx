import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ChevronDown, ChevronUp, Users, DollarSign, BarChart3 } from 'lucide-react';
import { getFlagUrl } from './CountrySearchSelect';

function fmtNum(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return 'N/D';
  return val.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtBig(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/D';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)} T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)} B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)} M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)} K`;
  return `$${val.toFixed(0)}`;
}

function fmtPop(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/D';
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)} mld`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)} mln`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)} K`;
  return val.toFixed(0);
}

function getMarginStyle(pct) {
  if (pct >= 50) return { color: 'text-green-400', bg: 'bg-green-500/20' };
  if (pct >= 30) return { color: 'text-lime-400', bg: 'bg-lime-500/20' };
  if (pct >= 15) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  if (pct >= 0) return { color: 'text-orange-400', bg: 'bg-orange-500/20' };
  return { color: 'text-red-400', bg: 'bg-red-500/20' };
}

function getPFIStyle(index) {
  if (index < 0.9) return { label: 'Competitivo', color: 'text-green-400', bg: 'bg-green-500/15' };
  if (index <= 1.2) return { label: 'Coerente', color: 'text-blue-400', bg: 'bg-blue-500/15' };
  if (index <= 2.0) return { label: 'Premium', color: 'text-amber-400', bg: 'bg-amber-500/15' };
  return { label: 'Molto alto', color: 'text-red-400', bg: 'bg-red-500/15' };
}

/**
 * Genera conclusione sintetica basata SOLO su dati reali. Nessuna AI.
 */
function buildConclusion(priceM, tradeM, macro, margineLordo, margineNetto) {
  const points = [];

  // PFI
  if (typeof priceM?.price_fit_index === 'number') {
    if (priceM.price_fit_index < 0.9) points.push('Prezzo competitivo rispetto alla media import.');
    else if (priceM.price_fit_index <= 1.2) points.push('Prezzo coerente con la media import del mercato.');
    else if (priceM.price_fit_index <= 2.0) points.push('Posizionamento premium: prezzo sopra la media import.');
    else points.push('Prezzo molto superiore alla media import — rischio di scarsa competitività.');
  }

  // Margine
  if (typeof margineLordo === 'number') {
    if (margineLordo < 5) points.push(`Margine lordo critico (${margineLordo}%).`);
    else if (margineLordo < 15) points.push(`Margine lordo contenuto (${margineLordo}%).`);
  }
  if (typeof margineNetto === 'number' && margineNetto < 5) {
    points.push(`Margine netto insufficiente (${margineNetto}%) includendo tutti i costi.`);
  }

  // Crescita mercato
  const crescita = tradeM?.crescita_3_anni ? parseFloat(tradeM.crescita_3_anni) : null;
  if (typeof crescita === 'number' && !isNaN(crescita)) {
    if (crescita < -5) points.push(`Mercato in contrazione (${crescita}% ultimi 3 anni).`);
    else if (crescita > 10) points.push(`Mercato in forte crescita (+${crescita}% ultimi 3 anni).`);
  }

  // PIL pro capite basso + premium
  const pilPc = macro?.pil_pro_capite;
  const premium = priceM?.premium_pct;
  if (typeof pilPc === 'number' && pilPc < 5000 && typeof premium === 'number' && premium > 10) {
    points.push(`PIL pro capite basso ($${Math.round(pilPc).toLocaleString('en-US')}) con prezzo premium — potere d'acquisto limitato.`);
  }

  if (points.length === 0) return null;
  return points;
}

function DataRow({ label, value, sub, warn }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-slate-400 text-[11px]">{label}</span>
      <div className="text-right">
        <span className={`text-white text-xs font-semibold ${warn ? 'text-red-400' : ''}`}>{value}</span>
        {sub && <span className="text-slate-500 text-[10px] ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export default function MarketSummaryCard({ priceM, tradeM, macro, userPriceData }) {
  const [expanded, setExpanded] = useState(false);
  const code = priceM?.paese_code || tradeM?.paese_code;
  const nome = priceM?.paese_nome || tradeM?.paese_nome || code;
  if (!code) return null;

  const flagUrl = getFlagUrl(code);

  // Dati prezzo
  const prezzoMedioImport = priceM?.prezzo_world_eur;
  const prezzoPartnerEur = priceM?.prezzo_partner_eur;
  const pfi = priceM?.price_fit_index;
  const unita = priceM?.unita_misura || 'kg';

  // Prezzo utente convertito nella valuta locale
  const pv = parseFloat(userPriceData?.prezzo_vendita);
  const cp = parseFloat(userPriceData?.costo_produzione);
  const unitaUtente = userPriceData?.unita || 'unità';
  const hasUserPrice = pv > 0 && !isNaN(pv);

  // Margini
  let margineLordo = null;
  let margineNetto = null;
  if (hasUserPrice && cp > 0 && !isNaN(cp)) {
    margineLordo = parseFloat((((pv - cp) / pv) * 100).toFixed(1));
    const logistica = parseFloat(userPriceData?.costo_logistica) || 0;
    const commissioni = parseFloat(userPriceData?.commissioni) || 0;
    const dazi = parseFloat(userPriceData?.dazi) || 0;
    const costiExtra = logistica + commissioni + dazi;
    if (costiExtra > 0) {
      margineNetto = parseFloat((((pv - cp - costiExtra) / pv) * 100).toFixed(1));
    }
  }

  // Macro
  const pop = macro?.popolazione;
  const pil = macro?.pil_nominale;
  const pilPc = macro?.pil_pro_capite;

  // Conclusione
  const conclusionPoints = buildConclusion(priceM, tradeM, macro, margineLordo, margineNetto);

  const pfiStyle = typeof pfi === 'number' ? getPFIStyle(pfi) : null;
  const lordoStyle = typeof margineLordo === 'number' ? getMarginStyle(margineLordo) : null;
  const nettoStyle = typeof margineNetto === 'number' ? getMarginStyle(margineNetto) : null;

  const hasAnyData = prezzoMedioImport || prezzoPartnerEur || pfi || margineLordo || pop || pil;
  if (!hasAnyData) return null;

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors"
        >
          {code !== 'WLD' ? (
            <img src={flagUrl} alt="" className="w-8 h-5.5 object-cover rounded-sm shadow" />
          ) : (
            <DollarSign className="w-6 h-5 text-lime-400" />
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm font-semibold">{nome}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {pfiStyle && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pfiStyle.bg} ${pfiStyle.color}`}>
                  PFI {pfi.toFixed(2)} — {pfiStyle.label}
                </span>
              )}
              {lordoStyle && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lordoStyle.bg} ${lordoStyle.color}`}>
                  ML {margineLordo}%
                </span>
              )}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
            {/* BLOCCO 1: Dati Numerici */}
            <div>
              <p className="text-lime-400 text-[10px] font-semibold uppercase tracking-wider mb-2">📊 Dati numerici</p>
              <div className="bg-slate-700/30 rounded-lg px-3 py-1 divide-y divide-slate-700/50">
                {prezzoMedioImport !== null && prezzoMedioImport !== undefined && (
                  <DataRow label="Prezzo medio import (World)" value={`€${fmtNum(prezzoMedioImport)}/${unita}`} sub="UN Comtrade" />
                )}
                {prezzoPartnerEur !== null && prezzoPartnerEur !== undefined && (
                  <DataRow label="Prezzo export verso mercato" value={`€${fmtNum(prezzoPartnerEur)}/${unita}`} sub="UN Comtrade" />
                )}
                {hasUserPrice && (
                  <DataRow label="Prezzo utente" value={`€${fmtNum(pv)}/${unitaUtente}`} sub="Dati utente" />
                )}
                {typeof pfi === 'number' && (
                  <DataRow label="Price Fit Index" value={pfi.toFixed(2)} sub={pfiStyle.label} warn={pfi > 3} />
                )}
                {typeof margineLordo === 'number' && (
                  <DataRow label="Margine Lordo" value={`${margineLordo}%`} sub={lordoStyle.color.includes('red') || lordoStyle.color.includes('orange') ? '⚠' : '✓'} warn={margineLordo < 5} />
                )}
                {typeof margineNetto === 'number' && (
                  <DataRow label="Margine Netto" value={`${margineNetto}%`} sub={nettoStyle.color.includes('red') || nettoStyle.color.includes('orange') ? '⚠' : '✓'} warn={margineNetto < 5} />
                )}
                {typeof pop === 'number' && (
                  <DataRow label="Popolazione" value={fmtPop(pop)} sub={macro?.popolazione_anno ? `(${macro.popolazione_anno})` : 'World Bank'} />
                )}
                {typeof pil === 'number' && (
                  <DataRow label="PIL nominale" value={fmtBig(pil)} sub={macro?.pil_nominale_anno ? `(${macro.pil_nominale_anno})` : 'World Bank'} />
                )}
                {typeof pilPc === 'number' && (
                  <DataRow label="PIL pro capite" value={`$${Math.round(pilPc).toLocaleString('en-US')}`} sub={macro?.pil_pro_capite_anno ? `(${macro.pil_pro_capite_anno})` : 'World Bank'} warn={pilPc < 5000} />
                )}
              </div>
            </div>

            {/* BLOCCO 2: Conclusione sintetica */}
            {conclusionPoints && conclusionPoints.length > 0 && (
              <div>
                <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-wider mb-2">📝 Conclusione (basata su dati)</p>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-1.5">
                  {conclusionPoints.map((p, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-400/80 text-xs mt-0.5">•</span>
                      <p className="text-amber-100/80 text-xs leading-relaxed">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}