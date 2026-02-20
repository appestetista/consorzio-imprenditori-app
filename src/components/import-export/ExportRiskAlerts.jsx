import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

/**
 * Genera alert basati SOLO su dati reali calcolati. Nessuna stima, nessuna AI.
 * Condizioni:
 * 1. Price Fit Index > 3 per un mercato
 * 2. Margine Lordo o Netto < 5%
 * 3. Mercato in calo ultimi 3 anni (crescita_3_anni < 0)
 * 4. PIL pro capite basso (< 5000 USD) E prezzo premium (premium_pct > 10)
 */
function computeAlerts({ priceMetrics, tradeMetrics, macroData, userPriceData }) {
  const alerts = [];

  // --- 1. Price Fit Index > 3 ---
  if (priceMetrics?.metriche) {
    priceMetrics.metriche.forEach(m => {
      if (typeof m.price_fit_index === 'number' && m.price_fit_index > 3) {
        alerts.push({
          severity: 'high',
          title: `Price Fit Index molto alto: ${m.paese_nome}`,
          detail: `Il tuo prezzo export è ${m.price_fit_index.toFixed(2)}x la media import del mercato. Rischio di non competitività.`,
          source: `Price Fit Index = ${m.price_fit_index.toFixed(2)} (UN Comtrade)`
        });
      }
    });
  }

  // --- 2. Margine < 5% ---
  const pv = parseFloat(userPriceData?.prezzo_vendita);
  const cp = parseFloat(userPriceData?.costo_produzione);
  if (pv > 0 && cp > 0 && !isNaN(pv) && !isNaN(cp)) {
    const margineLordo = ((pv - cp) / pv) * 100;
    if (margineLordo < 5) {
      alerts.push({
        severity: 'high',
        title: `Margine lordo critico: ${margineLordo.toFixed(1)}%`,
        detail: `Con un prezzo di €${pv.toFixed(2)} e costo produzione €${cp.toFixed(2)}, il margine lordo è insufficiente per sostenere l'export.`,
        source: 'Dati utente'
      });
    }

    // Margine Netto
    const logistica = parseFloat(userPriceData?.costo_logistica) || 0;
    const commissioni = parseFloat(userPriceData?.commissioni) || 0;
    const dazi = parseFloat(userPriceData?.dazi) || 0;
    const costiExtra = logistica + commissioni + dazi;
    if (costiExtra > 0) {
      const costiTotali = cp + costiExtra;
      const margineNetto = ((pv - costiTotali) / pv) * 100;
      if (margineNetto < 5 && margineLordo >= 5) {
        alerts.push({
          severity: 'high',
          title: `Margine netto critico: ${margineNetto.toFixed(1)}%`,
          detail: `Considerando costi totali (produzione + logistica + commissioni + dazi) = €${costiTotali.toFixed(2)}, il margine netto è troppo basso.`,
          source: 'Dati utente'
        });
      }
    }
  }

  // --- 3. Mercato in calo ultimi 3 anni ---
  if (tradeMetrics?.metriche) {
    tradeMetrics.metriche.forEach(m => {
      const crescita = parseFloat(m.crescita_3_anni);
      if (!isNaN(crescita) && crescita < 0) {
        alerts.push({
          severity: 'medium',
          title: `Mercato in calo: ${m.paese_nome}`,
          detail: `L'import di questo prodotto è calato del ${Math.abs(crescita).toFixed(1)}% negli ultimi 3 anni.`,
          source: `Crescita 3 anni: ${crescita}% (UN Comtrade)`
        });
      }
    });
  }

  // --- 4. PIL pro capite basso + prezzo premium ---
  if (priceMetrics?.metriche && macroData) {
    priceMetrics.metriche.forEach(m => {
      const macro = macroData[m.paese_code];
      const pilPc = macro?.pil_pro_capite;
      const premium = m.premium_pct;
      if (typeof pilPc === 'number' && pilPc < 5000 && typeof premium === 'number' && premium > 10) {
        alerts.push({
          severity: 'medium',
          title: `Prezzo premium in mercato a basso reddito: ${m.paese_nome}`,
          detail: `PIL pro capite $${Math.round(pilPc).toLocaleString('en-US')} con prezzo +${premium.toFixed(1)}% sopra la media. Il potere d'acquisto locale potrebbe non sostenere il posizionamento premium.`,
          source: `PIL p.c.: World Bank (${macro.pil_pro_capite_anno}), Premium: UN Comtrade`
        });
      }
    });
  }

  // --- 5. Inflazione alta (>10%) ---
  if (macroData) {
    Object.entries(macroData).forEach(([code, macro]) => {
      if (typeof macro?.inflazione === 'number' && macro.inflazione > 10) {
        const nome = macro.nome || code;
        alerts.push({
          severity: 'medium',
          title: `Inflazione elevata: ${nome} (${macro.inflazione}%)`,
          detail: `L'inflazione al ${macro.inflazione}% può erodere il potere d'acquisto e creare instabilità nei prezzi. Valutare clausole di adeguamento prezzo nei contratti.`,
          source: `World Bank, CPI annuo (${macro.inflazione_anno})`
        });
      }
    });
  }

  // --- 6. Volatilità cambio alta (>15%) ---
  if (macroData) {
    Object.entries(macroData).forEach(([code, macro]) => {
      if (typeof macro?.volatilita_cambio === 'number' && macro.volatilita_cambio > 15) {
        const nome = macro.nome || code;
        alerts.push({
          severity: 'medium',
          title: `Volatilità valutaria elevata: ${nome} (${macro.volatilita_cambio}%)`,
          detail: `Il tasso di cambio ha oscillato del ${macro.volatilita_cambio}% negli ultimi 5 anni. Rischio cambio significativo — consigliabile fatturare in EUR o USD.`,
          source: `World Bank, PA.NUS.FCRF serie 5 anni`
        });
      }
    });
  }

  // --- 7. LPI scarso (<2.5) ---
  if (macroData) {
    Object.entries(macroData).forEach(([code, macro]) => {
      if (typeof macro?.lpi_score === 'number' && macro.lpi_score < 2.5) {
        const nome = macro.nome || code;
        alerts.push({
          severity: 'low',
          title: `Logistica carente: ${nome} (LPI ${macro.lpi_score}/5)`,
          detail: `Il Logistics Performance Index è sotto 2.5, indicando infrastrutture logistiche deboli. Possibili ritardi e costi extra di spedizione.`,
          source: `World Bank, LP.LPI.OVRL.XQ (${macro.lpi_anno})`
        });
      }
    });
  }

  return alerts;
}

export default function ExportRiskAlerts({ priceMetrics, tradeMetrics, macroData, userPriceData }) {
  const alerts = computeAlerts({ priceMetrics, tradeMetrics, macroData, userPriceData });

  if (alerts.length === 0) return null;

  const highAlerts = alerts.filter(a => a.severity === 'high');
  const mediumAlerts = alerts.filter(a => a.severity === 'medium');
  const lowAlerts = alerts.filter(a => a.severity === 'low');

  return (
    <Card className="bg-red-500/10 border-red-500/30">
      <CardContent className="p-4">
        <h3 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Alert Rischio ({alerts.length})
        </h3>
        <div className="space-y-2.5">
          {highAlerts.map((a, i) => (
            <div key={`h-${i}`} className="bg-red-500/15 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-xs font-black bg-red-500/30 px-1.5 py-0.5 rounded mt-0.5">!</span>
                <div className="flex-1 min-w-0">
                  <p className="text-red-300 text-xs font-bold">{a.title}</p>
                  <p className="text-red-200/80 text-xs mt-0.5">{a.detail}</p>
                  <p className="text-red-300/50 text-[10px] mt-1">Fonte: {a.source}</p>
                </div>
              </div>
            </div>
          ))}
          {mediumAlerts.map((a, i) => (
            <div key={`m-${i}`} className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 text-xs font-bold bg-amber-500/20 px-1.5 py-0.5 rounded mt-0.5">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-amber-300 text-xs font-bold">{a.title}</p>
                  <p className="text-amber-200/80 text-xs mt-0.5">{a.detail}</p>
                  <p className="text-amber-300/50 text-[10px] mt-1">Fonte: {a.source}</p>
                </div>
              </div>
            </div>
          ))}
          {lowAlerts.map((a, i) => (
            <div key={`l-${i}`} className="bg-blue-500/10 border border-blue-500/25 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 text-xs font-bold bg-blue-500/20 px-1.5 py-0.5 rounded mt-0.5">ℹ</span>
                <div className="flex-1 min-w-0">
                  <p className="text-blue-300 text-xs font-bold">{a.title}</p>
                  <p className="text-blue-200/80 text-xs mt-0.5">{a.detail}</p>
                  <p className="text-blue-300/50 text-[10px] mt-1">Fonte: {a.source}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}