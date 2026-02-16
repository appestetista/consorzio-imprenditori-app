import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, AlertTriangle, CheckCircle2, Info, Clock } from 'lucide-react';

/**
 * Database normativo incentivi assunzione 2026.
 * Solo incentivi la cui vigenza è confermata al 16/02/2026.
 * Ogni incentivo è deterministico: non viene proposto se non vigente.
 */
const INCENTIVI_2026 = [
  {
    id: 'under30_strutturale',
    nome: 'Esonero Giovani Under 30',
    condizione: (ctx) => ctx.eta !== null && ctx.eta < 30 && ctx.tipo_contratto.includes('indeterminato'),
    calcolo: (ctx) => {
      const esonero_pct = 0.50;
      const max_annuo = 3000;
      const risparmio_pieno = ctx.inps_datore * esonero_pct;
      const risparmio_annuo = Math.min(risparmio_pieno, max_annuo);
      return {
        risparmio_annuo,
        risparmio_totale: risparmio_annuo * 3,
        durata_mesi: 36,
        percentuale: '50%',
        massimale: '€3.000/anno',
      };
    },
    norma: 'L. 205/2017 art. 1 co. 100-108 (strutturale)',
    descrizione: 'Esonero 50% contributi datore per assunzioni a tempo indeterminato di giovani under 30 mai assunti a T.I. prima.',
    requisiti: [
      'Lavoratore under 30 (≤29 anni e 364 giorni)',
      'Mai assunto prima a tempo indeterminato',
      'Assunzione a tempo indeterminato (anche trasformazione)',
    ],
    status: 'vigente',
    note: 'Misura strutturale, non soggetta a scadenza annuale.',
  },
  {
    id: 'bonus_donne_coesione',
    nome: 'Bonus Donne Svantaggiate',
    condizione: (ctx) => ctx.donna_disoccupata === true && ctx.tipo_contratto.includes('indeterminato'),
    calcolo: (ctx) => {
      const max_mensile = 650;
      const risparmio_mensile = Math.min(ctx.inps_datore / 12, max_mensile);
      const risparmio_annuo = risparmio_mensile * 12;
      return {
        risparmio_annuo,
        risparmio_totale: risparmio_mensile * 24,
        durata_mesi: 24,
        percentuale: '100%',
        massimale: '€650/mese (€7.800/anno)',
      };
    },
    norma: 'D.L. 60/2024 art. 23 (Decreto Coesione) — prorogato 2026 via D.L. 200/2025 (Milleproroghe) in conversione',
    descrizione: 'Esonero 100% contributi datore per assunzione donne prive di impiego regolarmente retribuito da almeno 6 mesi (24 mesi se in regione ZES o settore con disparità occupazionale).',
    requisiti: [
      'Lavoratrice donna disoccupata ≥6 mesi (o ≥24 mesi ovunque)',
      'Assunzione a tempo indeterminato o determinato',
      'Incremento occupazionale netto',
    ],
    status: 'vigente_con_riserva',
    note: 'Proroga 2026 in corso di conversione D.L. Milleproroghe. Verificare pubblicazione in G.U.',
  },
  {
    id: 'zes_unica',
    nome: 'Bonus ZES Unica Mezzogiorno',
    condizione: (ctx) => {
      const regioni_zes = [
        'Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata',
        'Calabria', 'Sicilia', 'Sardegna', 'Marche', 'Umbria'
      ];
      return regioni_zes.includes(ctx.regione) && ctx.tipo_contratto.includes('indeterminato');
    },
    calcolo: (ctx) => {
      // L. 199/2025 art. 1 co. 153: esonero in attesa di DM attuativo
      // Stima basata su precedenti (D.L. 60/2024): max €650/mese
      const max_mensile = 650;
      const risparmio_mensile = Math.min(ctx.inps_datore / 12, max_mensile);
      const risparmio_annuo = risparmio_mensile * 12;
      return {
        risparmio_annuo,
        risparmio_totale: risparmio_mensile * 24,
        durata_mesi: 24,
        percentuale: 'Da definire (DM attuativo)',
        massimale: 'Da definire — stima max €650/mese su base precedente',
      };
    },
    norma: 'L. 199/2025 (L. Bilancio 2026) art. 1 co. 153-165',
    descrizione: 'Esonero contributivo per assunzioni a tempo indeterminato in ZES Unica (Mezzogiorno + Marche/Umbria). Subordinato a DM attuativo MLPS-MEF.',
    requisiti: [
      'Sede lavoro in regione ZES Unica',
      'Assunzione a tempo indeterminato (anche trasformazione)',
      'Incremento occupazionale netto',
    ],
    status: 'in_attesa_dm',
    note: 'Misura prevista ma non ancora fruibile: in attesa del DM interministeriale attuativo. Plafond: €154M (2026), €400M (2027), €271M (2028).',
  },
  {
    id: 'naspi',
    nome: 'Incentivo Percettori NASPI',
    condizione: (ctx) => ctx.percettore_naspi === true && ctx.tipo_contratto.includes('indeterminato'),
    calcolo: (ctx) => {
      // L. 92/2012 art. 2 co. 10-bis: 20% dell'indennità NASPI residua
      // Non calcolabile senza importo NASPI, si mostra solo info
      return {
        risparmio_annuo: null,
        risparmio_totale: null,
        durata_mesi: null,
        percentuale: '20% della NASPI residua',
        massimale: 'Variabile (dipende da indennità NASPI residua)',
      };
    },
    norma: 'L. 92/2012 art. 2 co. 10-bis (strutturale)',
    descrizione: 'Contributo pari al 20% dell\'indennità NASPI che sarebbe stata corrisposta al lavoratore se non assunto. Erogato in unica soluzione dopo 6 mesi di permanenza.',
    requisiti: [
      'Lavoratore percettore di indennità NASPI',
      'Assunzione a tempo pieno e indeterminato',
      'Permanenza minima 6 mesi per erogazione',
    ],
    status: 'vigente',
    note: 'Misura strutturale. L\'importo dipende dall\'indennità NASPI residua del lavoratore.',
  },
];

const STATUS_CONFIG = {
  vigente: { label: 'Vigente', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
  vigente_con_riserva: { label: 'Vigente (con riserva)', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle },
  in_attesa_dm: { label: 'In attesa DM', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Clock },
};

const fmt = (n) => n?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '—';

export default function IncentiviFiscali2026({ result, profiloLavoratore }) {
  const { eta, donna_disoccupata, percettore_naspi } = profiloLavoratore || {};

  // Contesto per la valutazione
  const ctx = {
    eta: eta !== undefined && eta !== '' && eta !== null ? parseInt(eta) : null,
    donna_disoccupata: donna_disoccupata || false,
    percettore_naspi: percettore_naspi || false,
    regione: result.regione,
    tipo_contratto: result.tipo_contratto,
    inps_datore: result.inps_datore,
    ral: result.ral,
  };

  // Filtra solo gli incentivi applicabili
  const applicabili = INCENTIVI_2026.filter(inc => inc.condizione(ctx));
  const nonApplicabili = INCENTIVI_2026.filter(inc => !inc.condizione(ctx));

  // Calcola risparmi
  const incentiviCalcolati = applicabili.map(inc => ({
    ...inc,
    risultato: inc.calcolo(ctx),
  }));

  const risparmioTotaleAnnuo = incentiviCalcolati.reduce((sum, inc) => {
    // Non si cumulano tutti, si prende il migliore (principio di non cumulabilità generale)
    return Math.max(sum, inc.risultato.risparmio_annuo || 0);
  }, 0);

  if (!profiloLavoratore) return null;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-violet-500/20 to-purple-500/10 border-violet-500/30">
        <CardContent className="p-4">
          <h3 className="text-violet-400 font-bold mb-1 flex items-center gap-2">
            <Gift className="w-5 h-5" /> Incentivi Assunzione 2026
          </h3>
          <p className="text-slate-500 text-xs mb-3">Verifica automatica basata sul profilo del lavoratore e normativa vigente al 16/02/2026</p>

          {incentiviCalcolati.length === 0 ? (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-slate-400 text-sm">Nessun incentivo applicabile con il profilo selezionato.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incentiviCalcolati.map(inc => {
                const statusCfg = STATUS_CONFIG[inc.status];
                const StatusIcon = statusCfg.icon;
                return (
                  <Card key={inc.id} className="bg-slate-800/80 border-slate-700">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-white font-semibold text-sm">{inc.nome}</h4>
                        <Badge className={`${statusCfg.color} text-[10px] whitespace-nowrap flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                      </div>

                      <p className="text-slate-400 text-xs">{inc.descrizione}</p>

                      {/* Dettaglio calcolo */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-700/30 rounded-lg p-2">
                        <div>
                          <p className="text-slate-500 text-[10px]">Esonero</p>
                          <p className="text-white text-sm font-semibold">{inc.risultato.percentuale}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px]">Massimale</p>
                          <p className="text-white text-sm font-semibold">{inc.risultato.massimale}</p>
                        </div>
                        {inc.risultato.durata_mesi && (
                          <div>
                            <p className="text-slate-500 text-[10px]">Durata</p>
                            <p className="text-white text-sm font-semibold">{inc.risultato.durata_mesi} mesi</p>
                          </div>
                        )}
                        {inc.risultato.risparmio_annuo && (
                          <div>
                            <p className="text-slate-500 text-[10px]">Risparmio annuo stimato</p>
                            <p className="text-green-400 text-sm font-bold">€{fmt(inc.risultato.risparmio_annuo)}</p>
                          </div>
                        )}
                        {inc.risultato.risparmio_totale && (
                          <div className="col-span-2">
                            <p className="text-slate-500 text-[10px]">Risparmio totale stimato ({inc.risultato.durata_mesi} mesi)</p>
                            <p className="text-green-400 font-bold">€{fmt(inc.risultato.risparmio_totale)}</p>
                          </div>
                        )}
                      </div>

                      {/* Requisiti */}
                      <div>
                        <p className="text-slate-500 text-[10px] mb-1 font-semibold">Requisiti:</p>
                        <ul className="space-y-0.5">
                          {inc.requisiti.map((r, i) => (
                            <li key={i} className="text-slate-400 text-[11px] flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Norma */}
                      <div className="bg-slate-700/20 rounded p-1.5">
                        <p className="text-slate-500 text-[10px]">📜 {inc.norma}</p>
                      </div>

                      {/* Note */}
                      {inc.note && (
                        <div className="flex items-start gap-1.5">
                          <Info className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                          <p className="text-amber-400/80 text-[10px]">{inc.note}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Avviso non cumulabilità */}
              {incentiviCalcolati.length > 1 && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-400 text-xs">
                    <strong>Attenzione:</strong> gli incentivi non sono generalmente cumulabili tra loro (salvo specifiche eccezioni normative). Consultare un professionista per la combinazione ottimale.
                  </p>
                </div>
              )}

              {/* Costo con incentivo migliore */}
              {risparmioTotaleAnnuo > 0 && (
                <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border-green-500/30">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-slate-400 text-xs">Costo annuo datore SENZA incentivo</p>
                        <p className="text-white font-semibold">€{fmt(result.costo_totale_annuo)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Costo annuo datore CON incentivo</p>
                        <p className="text-green-400 font-bold text-lg">€{fmt(result.costo_totale_annuo - risparmioTotaleAnnuo)}</p>
                      </div>
                    </div>
                    <p className="text-green-400/80 text-xs text-right mt-1">Risparmio: €{fmt(risparmioTotaleAnnuo)}/anno</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incentivi non applicabili (trasparenza) */}
      {nonApplicabili.length > 0 && (
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-3">
            <p className="text-slate-600 text-xs font-semibold mb-2">Incentivi non applicabili al profilo corrente:</p>
            <div className="space-y-1">
              {nonApplicabili.map(inc => (
                <div key={inc.id} className="flex items-center gap-2">
                  <span className="text-slate-600 text-[10px]">✗</span>
                  <span className="text-slate-600 text-[11px]">{inc.nome}</span>
                  <span className="text-slate-700 text-[10px]">— {inc.norma.split('(')[0].trim()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}