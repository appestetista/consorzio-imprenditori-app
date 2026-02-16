import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

export default function LandedCostTable({ landedCost, importData }) {
  if (!landedCost) return null;

  const taric = importData?.taric;
  const iva = importData?.iva;

  const rischioConfig = {
    alto: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', label: 'Rischio Alto' },
    medio: { icon: Shield, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', label: 'Rischio Medio' },
    basso: { icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', label: 'Rischio Basso' },
  };
  const rischio = rischioConfig[landedCost.livello_rischio] || rischioConfig.basso;
  const RischioIcon = rischio.icon;

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardContent className="p-4">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          💰 Landed Cost — Tabella Dettagliata
        </h3>

        {/* Livello Rischio Import */}
        {landedCost.livello_rischio && (
          <div className={`border rounded-lg p-3 mb-3 ${rischio.bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <RischioIcon className={`w-4 h-4 ${rischio.color}`} />
              <span className={`text-xs font-bold ${rischio.color}`}>{rischio.label}</span>
            </div>
            {landedCost.dettagli_rischio?.map((r, i) => (
              <p key={i} className="text-slate-300 text-[11px]">• {r}</p>
            ))}
          </div>
        )}

        {/* Aliquote ufficiali */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
          <p className="text-amber-400 text-xs font-semibold mb-2">🏛️ Aliquote ufficiali (TARIC — Commissione Europea)</p>
          <div className="space-y-1.5">
            <Row 
              label="Dazio MFN" 
              value={landedCost.dazio_mfn_perc !== null ? `${landedCost.dazio_mfn_perc}%` : 'Dazio non disponibile nel database TARIC per origine Cina.'}
              fonte={landedCost.fonti.dazio}
              highlight={landedCost.dazio_mfn_perc === null}
            />
            {landedCost.anti_dumping_perc !== null && (
              <Row 
                label="Anti-dumping" 
                value={`${landedCost.anti_dumping_perc}%`}
                fonte={taric?.anti_dumping_regolamento || 'TARIC'}
                isWarning
              />
            )}
            {landedCost.misure_compensative_perc !== null && (
              <Row 
                label="Misure compensative" 
                value={`${landedCost.misure_compensative_perc}%`}
                fonte={taric?.misure_compensative_regolamento || 'TARIC'}
                isWarning
              />
            )}
            {landedCost.dazio_totale_perc !== null && (landedCost.anti_dumping_perc > 0 || landedCost.misure_compensative_perc > 0) && (
              <Row 
                label="Dazio totale (MFN + AD + MC)" 
                value={`${landedCost.dazio_totale_perc}%`}
                isBold
              />
            )}
            <Row 
              label="IVA" 
              value={landedCost.iva_perc !== null ? `${landedCost.iva_perc}%` : 'Non disponibile'}
              fonte={landedCost.fonti.iva}
              highlight={landedCost.iva_perc === null}
            />
            {iva?.aliquota_ridotta && iva.aliquota_ridotta !== 'null' && (
              <Row 
                label="IVA ridotta (se applicabile)" 
                value={`${iva.aliquota_ridotta}%`}
                fonte={iva.base_normativa}
                isNote
              />
            )}
          </div>
        </div>

        {/* Esempio di calcolo */}
        {landedCost.calcolo_possibile && landedCost.esempio_calcolo && (
          <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
            <p className="text-lime-400 text-xs font-semibold mb-2">📊 Esempio su €10.000 di merce FOB</p>
            <div className="space-y-1.5">
              <Row label="Valore merce (FOB)" value={`€${formatNum(landedCost.esempio_calcolo.valore_merce)}`} />
              <div className="border-t border-slate-600 my-1" />
              <Row label="+ Trasporto" value="Da richiedere preventivo" isNote />
              <Row label={`+ Dazio (${landedCost.dazio_totale_perc}%)`} value={`€${formatNum(landedCost.esempio_calcolo.dazio)}`} />
              <div className="border-t border-slate-600 my-1" />
              <Row label="= Base imponibile IVA" value={`€${formatNum(landedCost.esempio_calcolo.base_imponibile_iva)}`} isSubtotal />
              <Row label={`+ IVA (${landedCost.iva_perc}%)`} value={`€${formatNum(landedCost.esempio_calcolo.iva)}`} />
              <Row label="+ Sdoganamento" value={`€${landedCost.costi_sdoganamento_range.min}–${landedCost.costi_sdoganamento_range.max}`} fonte={landedCost.fonti.sdoganamento} />
              <div className="border-t-2 border-lime-400/30 my-1.5" />
              <Row 
                label="TOTALE (escluso trasporto)" 
                value={`€${formatNum(landedCost.esempio_calcolo.totale_senza_trasporto)}`} 
                isBold 
                isTotal
              />
            </div>
            <p className="text-slate-500 text-[10px] mt-2 italic">
              ⚠ Trasporto escluso — richiedere preventivo a spedizioniere per costo effettivo FCL/LCL.
              L'IVA è calcolata su (Valore merce + Trasporto + Dazio). Senza il trasporto, il totale IVA è indicativo.
            </p>
          </div>
        )}

        {!landedCost.calcolo_possibile && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-xs font-semibold">Calcolo Landed Cost non possibile</p>
                <p className="text-red-200/70 text-[11px] mt-1">
                  Dati insufficienti per calcolare il costo totale. Verificare dazio e IVA su TARIC.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Restrizioni */}
        {taric?.restrizioni?.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <p className="text-orange-400 text-xs font-semibold mb-1.5">🔒 Restrizioni / Obblighi normativi</p>
            <div className="space-y-1">
              {taric.restrizioni.map((r, i) => (
                <p key={i} className="text-orange-200/80 text-xs">• {r}</p>
              ))}
            </div>
          </div>
        )}

        {taric?.contingenti && taric.contingenti !== 'null' && (
          <p className="text-slate-400 text-[10px] mt-2">📋 Contingenti: {taric.contingenti}</p>
        )}

        {/* Nota conversione valuta */}
        {landedCost.tasso_cambio && (
          <div className="mt-3 pt-2 border-t border-slate-600">
            <p className="text-blue-400/70 text-[10px]">
              💱 {landedCost.tasso_cambio.nota} (1 EUR = {landedCost.tasso_cambio.tasso} USD, {landedCost.tasso_cambio.fonte})
            </p>
          </div>
        )}

        {/* Trasparenza Report */}
        <div className="mt-3 pt-2 border-t border-slate-600">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500">
            <div><span className="text-slate-600">Fonte dati:</span> TARIC (Commissione Europea)</div>
            <div><span className="text-slate-600">Origine merce:</span> Cina</div>
            <div><span className="text-slate-600">Destinazione:</span> UE (Italia)</div>
            <div><span className="text-slate-600">Data recupero:</span> {importData?._timestamp_recupero ? new Date(importData._timestamp_recupero).toLocaleString('it-IT') : 'N/D'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, fonte, isBold, isTotal, isSubtotal, isNote, isWarning, highlight }) {
  return (
    <div className={`flex items-center justify-between text-xs ${isTotal ? 'py-1' : ''}`}>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {isWarning && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
        <span className={`${isBold || isTotal ? 'text-white font-bold' : isSubtotal ? 'text-slate-300 font-medium' : isNote ? 'text-slate-500 italic' : highlight ? 'text-red-300' : 'text-slate-400'} ${isTotal ? 'text-sm' : ''}`}>
          {label}
        </span>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <span className={`${isBold || isTotal ? 'text-lime-400 font-bold' : isSubtotal ? 'text-white font-medium' : isNote ? 'text-slate-500' : isWarning ? 'text-red-400 font-semibold' : highlight ? 'text-red-300' : 'text-white'} ${isTotal ? 'text-sm' : ''}`}>
          {value}
        </span>
        {fonte && <p className="text-slate-600 text-[9px]">{fonte}</p>}
      </div>
    </div>
  );
}

function formatNum(n) {
  if (n === null || n === undefined) return 'N/D';
  return Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}