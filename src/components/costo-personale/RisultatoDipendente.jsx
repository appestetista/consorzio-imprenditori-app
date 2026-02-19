import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import IncentiviFiscali2026 from './IncentiviFiscali2026';
import FooterNormativo from './FooterNormativo';
import KPIGrid from './KPIGrid';

const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';

function Row({ label, value, bold, negative, green }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`${bold ? 'font-semibold text-white' : ''} ${negative ? 'text-red-300' : ''} ${green ? 'text-green-400' : ''} ${!bold && !negative && !green ? 'text-white' : ''}`}>
        {negative ? '-' : ''}€{value}
      </span>
    </div>
  );
}

export default function RisultatoDipendente({ result, profiloLavoratore, onReset }) {
  if (!result) {
    return (
      <Card className="bg-red-500/20 border-red-500/50">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">Tabelle incomplete per la qualifica selezionata. Verificare i dati normativi.</span>
        </CardContent>
      </Card>
    );
  }

  const tipoLabel = {
    'indeterminato_fulltime': 'T. Indeterminato — Full-time',
    'indeterminato_parttime': 'T. Indeterminato — Part-time',
    'determinato_fulltime': 'T. Determinato — Full-time',
    'determinato_parttime': 'T. Determinato — Part-time',
    'apprendistato': 'Apprendistato',
  };

  const contributiTotali = result.inps_datore + result.inail + result.tfr_annuo + (result.tfr_fondo_garanzia_costo || 0) + result.inps_dipendente + (result.contributo_td_importo || 0);
  const imposteTotali = result.irpef + result.addizionali - (result.trattamento_integrativo || 0);

  return (
    <div className="space-y-4">
      {/* Riepilogo input */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">CCNL:</span> <span className="text-white">{result.ccnl}</span></div>
            <div><span className="text-slate-500">Livello:</span> <span className="text-white">{result.livello}</span></div>
            <div><span className="text-slate-500">Contratto:</span> <span className="text-white">{tipoLabel[result.tipo_contratto] || result.tipo_contratto}</span></div>
            <div><span className="text-slate-500">Regione:</span> <span className="text-white">{result.regione}</span></div>
            {result.isPartTime && <div><span className="text-slate-500">Part-time:</span> <span className="text-white">{result.percentuale_parttime}%</span></div>}
            {result.minimo_tabellare > 0 && <div><span className="text-slate-500">Min. tab.:</span> <span className="text-white">€{fmt(result.minimo_tabellare)}/m</span></div>}
          </div>
        </CardContent>
      </Card>

      {/* Costo Datore */}
      <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/10 border-red-500/30">
        <CardContent className="p-4">
          <h3 className="text-red-400 font-bold mb-3 text-sm">🏢 Costo per il Datore di Lavoro</h3>
          <div className="space-y-2 text-sm">
            <Row label="RAL" value={fmt(result.ral)} bold />
            <Row label={`${result.label_inps_datore || 'INPS datore'} (${(result.aliquota_inps_datore * 100).toFixed(2)}%)`} value={fmt(result.inps_datore)} />
            <Row label={`INAIL (${(result.aliquota_inail * 100).toFixed(2)}%)`} value={fmt(result.inail)} />
            <Row label={`TFR (RAL / ${result.tfr_divisore})`} value={fmt(result.tfr_annuo)} />
            {result.tfr_fondo_garanzia_costo > 0 && (
              <Row label={`Fondo garanzia TFR (${(result.fondo_garanzia * 100).toFixed(2)}%)`} value={fmt(result.tfr_fondo_garanzia_costo)} />
            )}
            {result.contributo_td_importo > 0 && (
              <Row label={`Contributo addiz. TD (${(result.aliquota_contributo_td * 100).toFixed(1)}%)`} value={fmt(result.contributo_td_importo)} />
            )}
            <div className="border-t border-red-500/30 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-red-400 font-bold">COSTO TOTALE ANNUO</span>
                <span className="text-red-400 font-bold text-lg">€{fmt(result.costo_totale_annuo)}</span>
              </div>
              <Row label="Costo mensile (su 12 mesi)" value={fmt(result.costo_mensile_datore)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Area Contributiva */}
      <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30">
        <CardContent className="p-4">
          <h3 className="text-amber-400 font-bold mb-3 text-sm">🏛️ Area Contributiva</h3>
          <div className="space-y-2 text-sm">
            <Row label={`INPS datore (${(result.aliquota_inps_datore * 100).toFixed(2)}%)`} value={fmt(result.inps_datore)} />
            <Row label={`INPS dipendente (${(result.aliquota_inps_dip * 100).toFixed(2)}%)`} value={fmt(result.inps_dipendente)} />
            <Row label={`INAIL (${(result.aliquota_inail * 100).toFixed(2)}%)`} value={fmt(result.inail)} />
            <Row label={`TFR annuo`} value={fmt(result.tfr_annuo)} />
            <div className="flex justify-between text-xs mt-1 pt-1 border-t border-amber-500/20">
              <span className="text-slate-500">Incidenza contributiva totale</span>
              <span className="text-amber-400 font-bold">{result.ral > 0 ? ((contributiTotali / result.ral) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Area Fiscale */}
      <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <h3 className="text-green-400 font-bold mb-3 text-sm">🧾 Area Fiscale — IRPEF {result.anno}</h3>
          <div className="space-y-2 text-sm">
            <Row label="RAL" value={fmt(result.ral)} />
            <Row label={`- INPS dipendente (${(result.aliquota_inps_dip * 100).toFixed(2)}%)`} value={fmt(result.inps_dipendente)} negative />
            <Row label="= Imponibile IRPEF" value={fmt(result.ral - result.inps_dipendente)} bold />
            <Row label="IRPEF lorda (scaglioni 23/33/43%)" value={fmt(result.irpef_lorda)} />
            <Row label={`- Detrazione lavoro dipendente (art. 13 TUIR)`} value={fmt(result.detrazione_lavoro)} green />
            <Row label="= IRPEF netta" value={fmt(result.irpef)} negative />
            <Row label={`- Addiz. regionale (${(result.aliquota_regionale * 100).toFixed(2)}%)`} value={fmt(result.addiz_regionale)} negative />
            <Row label={`- Addiz. comunale media (${(result.aliquota_comunale * 100).toFixed(2)}%)`} value={fmt(result.addiz_comunale)} negative />
            {result.trattamento_integrativo > 0 && (
              <Row label="+ Trattamento integrativo (bonus €100/mese)" value={fmt(result.trattamento_integrativo)} green />
            )}
            <div className="flex justify-between text-xs mt-1 pt-1 border-t border-green-500/20">
              <span className="text-slate-500">Incidenza fiscale netta</span>
              <span className="text-green-400 font-bold">{result.ral > 0 ? (((result.irpef + result.addizionali - result.trattamento_integrativo) / result.ral) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Netto Dipendente */}
      <Card className="bg-gradient-to-br from-emerald-600/20 to-green-500/10 border-emerald-500/40">
        <CardContent className="p-4">
          <h3 className="text-green-400 font-bold mb-3 text-sm">💰 Netto Finale</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-400 font-bold text-base">NETTO DISPONIBILE</span>
              <span className="text-green-400 font-bold text-xl">€{fmt(result.netto_annuo)}</span>
            </div>
            <Row label={`Netto mensile (${result.mensilita} mensilità)`} value={fmt(result.netto_mensile)} green />
          </div>
        </CardContent>
      </Card>

      {/* KPI */}
      <KPIGrid
        costoTotale={result.costo_totale_annuo}
        nettoAnnuo={result.netto_annuo}
        contributiTotali={contributiTotali}
        imposteTotali={imposteTotali}
        compensoLordo={result.ral}
        anno={result.anno}
      />

      {/* Incentivi Assunzione 2026 */}
      <IncentiviFiscali2026 result={result} profiloLavoratore={profiloLavoratore} />

      {/* Footer normativo */}
      <FooterNormativo
        anno={result.anno}
        fonti={result.fonti}
        fonteCcnl={result.fonte_ccnl}
        dataAggiornamento={result.dataAggiornamento}
      />

      <Button onClick={onReset} variant="outline" className="w-full border-slate-600 text-slate-400 hover:bg-slate-800">
        Nuova Simulazione
      </Button>
    </div>
  );
}