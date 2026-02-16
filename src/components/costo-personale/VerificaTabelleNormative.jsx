import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Shield } from 'lucide-react';

const ANNO = 2026;

/**
 * Tipi obbligatori che devono esistere in TabellaContributiva per anno 2026.
 * Raggruppati per categoria di verifica.
 */
const VERIFICHE = [
  {
    id: 'inps',
    label: 'Aliquote INPS',
    errore: 'Aliquote INPS non aggiornate al 2026, impossibile procedere.',
    tipi_richiesti: [
      'inps_datore_dipendente',
      'inps_dipendente',
      'inps_gestione_separata_totale',
      'inps_gestione_separata_quota_datore',
      'inps_gestione_separata_quota_iscritto',
    ],
    entity_extra: 'ContributiINPS', // verifica anche questa entity
  },
  {
    id: 'inail',
    label: 'Tassi INAIL',
    errore: 'Tassi INAIL mancanti o non aggiornati al 2026, aggiornare tabelle prima.',
    tipi_richiesti: [
      'inail_operaio_generico',
      'inail_impiegato',
      'inail_quadro',
      'inail_amministratore',
    ],
  },
  {
    id: 'irpef',
    label: 'Scaglioni IRPEF e detrazioni',
    errore: 'IRPEF 2026 non disponibile, aggiornare tabelle.',
    tipi_richiesti: [
      'irpef_scaglione_1',
      'irpef_scaglione_2',
      'irpef_scaglione_3',
      'irpef_soglia_1',
      'irpef_soglia_2',
      'addizionali_media',
    ],
  },
  {
    id: 'agevolazioni',
    label: 'Agevolazioni e parametri fiscali',
    errore: 'Agevolazioni non verificate o non aggiornate al 2026, controllare la fonte normativa.',
    tipi_richiesti: [
      'tfr_divisore',
      'fondo_garanzia_tfr',
      'ires',
      'irap_media',
    ],
  },
];

/**
 * Mapping da id verifica → tabella versioning corrispondente
 */
const VERSIONING_MAP = {
  inps: 'inps_aliquote',
  inail: 'inail_tassi',
  irpef: 'irpef_scaglioni',
  agevolazioni: 'agevolazioni_2026',
};

function eseguiVerifica(tabelleMap, contributiINPS, versioningRecords) {
  const risultati = VERIFICHE.map(v => {
    const mancanti = [];
    v.tipi_richiesti.forEach(tipo => {
      if (!tabelleMap[tipo] || tabelleMap[tipo].valore === null || tabelleMap[tipo].valore === undefined) {
        mancanti.push(tipo);
      }
    });

    // Verifica extra entity ContributiINPS
    let extraOk = true;
    let extraNote = null;
    if (v.entity_extra === 'ContributiINPS') {
      const hasArtigiani = contributiINPS?.some(c => c.gestione === 'Artigiani');
      const hasCommercianti = contributiINPS?.some(c => c.gestione === 'Commercianti');
      if (!hasArtigiani || !hasCommercianti) {
        extraOk = false;
        extraNote = `ContributiINPS 2026: mancano ${!hasArtigiani ? 'Artigiani' : ''}${!hasArtigiani && !hasCommercianti ? ' e ' : ''}${!hasCommercianti ? 'Commercianti' : ''}`;
      }
    }

    // Verifica versioning: deve esistere un record con esito "successo" per anno 2026
    let versioningOk = true;
    let versioningNote = null;
    const versioningTabella = VERSIONING_MAP[v.id];
    if (versioningTabella && versioningRecords?.length > 0) {
      const vRecord = versioningRecords.find(
        vr => vr.tabella === versioningTabella && vr.anno_normativo === ANNO && vr.esito === 'successo'
      );
      if (!vRecord) {
        versioningOk = false;
        versioningNote = `Nessun import verificato (VersioningNormativo) per "${versioningTabella}" anno ${ANNO}.`;
      }
    }
    // Se non ci sono record versioning affatto, non blocchiamo (retrocompatibilità),
    // ma segnaliamo come warning se i dati nella tabella esistono
    if (!versioningRecords || versioningRecords.length === 0) {
      versioningOk = true; // non bloccare, ma lo segnaliamo sotto
      versioningNote = 'Nessun record di versioning trovato — verifica manuale consigliata.';
    }

    const ok = mancanti.length === 0 && extraOk && versioningOk;

    // Raccogli fonti dei record trovati
    const fonti = v.tipi_richiesti
      .filter(tipo => tabelleMap[tipo]?.fonte_normativa)
      .map(tipo => tabelleMap[tipo].fonte_normativa);
    const fontiUniche = [...new Set(fonti)];

    return {
      ...v,
      ok,
      mancanti,
      extraOk,
      extraNote,
      versioningOk,
      versioningNote,
      fonti: fontiUniche,
    };
  });

  const tuttoOk = risultati.every(r => r.ok);
  return { risultati, tuttoOk };
}

/**
 * Componente che verifica la presenza e completezza delle 4 tabelle normative
 * obbligatorie prima di consentire la simulazione.
 * 
 * Props:
 * - children: contenuto della simulazione (reso solo se verifica OK)
 */
export default function VerificaTabelleNormative({ children }) {
  // Carica TabellaContributiva 2026
  const { data: tabelleRaw, isLoading: loadingTabelle, error: errorTabelle } = useQuery({
    queryKey: ['verifica-tabelle', ANNO],
    queryFn: async () => {
      const records = await base44.entities.TabellaContributiva.filter({ anno: ANNO });
      const map = {};
      records.forEach(r => {
        map[r.tipo] = {
          valore: r.valore,
          descrizione: r.descrizione,
          fonte_normativa: r.fonte_normativa,
        };
      });
      return map;
    },
  });

  // Carica ContributiINPS 2026
  const { data: contributiINPS, isLoading: loadingContributi, error: errorContributi } = useQuery({
    queryKey: ['verifica-contributi-inps', ANNO],
    queryFn: () => base44.entities.ContributiINPS.filter({ anno: ANNO }),
    initialData: [],
  });

  // Carica VersioningNormativo 2026
  const { data: versioningRecords, isLoading: loadingVersioning, error: errorVersioning } = useQuery({
    queryKey: ['verifica-versioning', ANNO],
    queryFn: () => base44.entities.VersioningNormativo.filter({ anno_normativo: ANNO }),
    initialData: [],
  });

  const isLoading = loadingTabelle || loadingContributi || loadingVersioning;
  const hasError = errorTabelle || errorContributi;

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-slate-400 text-sm">Verifica tabelle normative {ANNO} in corso...</span>
        </CardContent>
      </Card>
    );
  }

  if (hasError || !tabelleRaw) {
    return (
      <Card className="bg-red-500/20 border-red-500/50">
        <CardContent className="p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">Impossibile caricare le tabelle normative {ANNO}. Contattare l'amministratore.</span>
        </CardContent>
      </Card>
    );
  }

  const { risultati, tuttoOk } = eseguiVerifica(tabelleRaw, contributiINPS, versioningRecords);

  if (!tuttoOk) {
    return (
      <div className="space-y-3">
        <Card className="bg-red-500/15 border-red-500/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-red-400 font-bold text-sm">Simulazione bloccata — Tabelle normative incomplete</h3>
            </div>
            <p className="text-red-400/80 text-xs">
              Una o più tabelle obbligatorie non sono aggiornate al {ANNO}. Correggere prima di procedere.
            </p>
          </CardContent>
        </Card>

        {risultati.map(r => (
          <Card key={r.id} className={r.ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                {r.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
                <span className={`font-semibold text-sm ${r.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {r.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {r.ok ? 'OK' : 'ERRORE'}
                </span>
              </div>

              {!r.ok && (
                <div className="pl-6 space-y-1">
                  <p className="text-red-400 text-xs font-medium">{r.errore}</p>
                  {r.mancanti.length > 0 && (
                    <div className="text-red-400/70 text-[10px]">
                      Parametri mancanti: {r.mancanti.join(', ')}
                    </div>
                  )}
                  {r.extraNote && (
                    <div className="text-red-400/70 text-[10px]">{r.extraNote}</div>
                  )}
                  {!r.versioningOk && r.versioningNote && (
                    <div className="text-red-400/70 text-[10px]">{r.versioningNote}</div>
                  )}
                </div>
              )}

              {r.ok && r.versioningNote && (
                <div className="pl-6">
                  <span className="text-yellow-400/70 text-[9px]">⚠ {r.versioningNote}</span>
                </div>
              )}

              {r.ok && r.fonti.length > 0 && (
                <div className="pl-6 flex flex-wrap gap-1">
                  {r.fonti.map((f, i) => (
                    <span key={i} className="bg-green-500/10 text-green-400/80 text-[9px] px-1.5 py-0.5 rounded">{f}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Tutto OK → mostra report sintetico + children
  return (
    <div className="space-y-4">
      <Card className="bg-green-500/10 border-green-500/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-xs font-bold">Tabelle normative {ANNO} verificate</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {risultati.map(r => (
              <div key={r.id} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-slate-400 text-[10px]">{r.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}