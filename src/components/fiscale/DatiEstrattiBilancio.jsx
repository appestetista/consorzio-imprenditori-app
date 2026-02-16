import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const formatEuro = (v) => {
  if (v === null || v === undefined) return null;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
};

const SEZIONI = [
  {
    titolo: 'Stato Patrimoniale',
    chiave: 'stato_patrimoniale',
    campi: [
      { key: 'totale_attivo', label: 'Totale Attivo' },
      { key: 'totale_passivo', label: 'Totale Passivo' },
      { key: 'patrimonio_netto', label: 'Patrimonio Netto' },
      { key: 'debiti', label: 'Debiti' },
      { key: 'disponibilita_liquide', label: 'Disponibilità liquide' },
    ]
  },
  {
    titolo: 'Conto Economico',
    chiave: 'conto_economico',
    campi: [
      { key: 'ricavi', label: 'Ricavi' },
      { key: 'costi_totali', label: 'Costi totali' },
      { key: 'ebitda', label: 'EBITDA' },
      { key: 'ammortamenti', label: 'Ammortamenti' },
      { key: 'utile_perdita', label: 'Utile / Perdita' },
    ]
  },
  {
    titolo: 'Imposte',
    chiave: 'imposte',
    campi: [
      { key: 'ires', label: 'IRES' },
      { key: 'irap', label: 'IRAP' },
    ]
  }
];

export default function DatiEstrattiBilancio({ dati }) {
  if (!dati) return null;

  const mancanti = dati.dati_mancanti || [];

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Dati estratti dal bilancio</p>

      {SEZIONI.map(sezione => {
        const sezDati = dati[sezione.chiave];
        if (!sezDati) return null;

        return (
          <Card key={sezione.chiave} className="bg-[#0a2540] border-[#1a3a5c]">
            <CardContent className="p-4">
              <p className="text-[#d4af37] text-xs font-semibold mb-3">{sezione.titolo}</p>
              <div className="space-y-2">
                {sezione.campi.map(campo => {
                  const val = sezDati[campo.key];
                  const disponibile = val !== null && val !== undefined;
                  const formattato = formatEuro(val);
                  const isNegativo = disponibile && val < 0;

                  return (
                    <div key={campo.key} className="flex justify-between items-center">
                      <span className="text-slate-300 text-xs">{campo.label}</span>
                      {disponibile ? (
                        <span className={`text-sm font-medium ${isNegativo ? 'text-red-400' : 'text-white'}`}>
                          {formattato}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs italic">non disponibile</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {mancanti.length > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-600/40">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 text-xs font-medium mb-1">Dati non trovati nel documento</p>
                <ul className="text-yellow-300/70 text-[10px] space-y-0.5">
                  {mancanti.map((m, i) => (
                    <li key={i}>• {m}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}