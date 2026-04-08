import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// simulateFiscal v2 — ZERO AI, SOLO DATI REALI DA DB
//
// Tutti i dati da: AliquoteFiscali, ContributiINPS, CoefficienteRedditivita
// Nessun LLM coinvolto. Calcoli deterministici e verificabili.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      fatturato_annuo,
      costi_deducibili,
      regime_fiscale,
      forma_giuridica,
      numero_dipendenti,
      regione,
      codice_ateco
    } = body;

    if (!fatturato_annuo || !regime_fiscale || !forma_giuridica) {
      return Response.json({ error: 'Fatturato, regime fiscale e forma giuridica sono obbligatori' }, { status: 400 });
    }

    const anno = 2026;
    const r2 = (n) => Math.round(n * 100) / 100;

    // Determina regime
    let regime;
    if (regime_fiscale === 'forfettario' || regime_fiscale === 'Forfettario') {
      regime = 'Forfettario';
    } else if (['SRL', 'SRLU', 'SPA', 'SAPA'].includes(forma_giuridica)) {
      regime = 'SRL';
    } else {
      regime = 'DittaOrdinaria';
    }

    // === Carica dati dal DB ===
    const [aliquoteRecords, inpsRecords, coeffRecords] = await Promise.all([
      base44.asServiceRole.entities.AliquoteFiscali.filter({ anno }),
      base44.asServiceRole.entities.ContributiINPS.filter({ anno }),
      base44.asServiceRole.entities.CoefficienteRedditivita.filter({})
    ]);

    if (aliquoteRecords.length === 0) {
      return Response.json({ error: `Nessuna aliquota trovata per anno ${anno}` }, { status: 400 });
    }

    const getAliquota = (tipo) => {
      const rec = aliquoteRecords.find(a => a.tipo_imposta === tipo);
      if (!rec) throw new Error(`Aliquota ${tipo} non trovata per anno ${anno}`);
      return rec.aliquota;
    };

    const getInps = (gestione) => inpsRecords.find(r => r.gestione === gestione);

    // === Lookup coefficiente da DB ===
    let coefficiente = 0.78;
    let settoreCoeff = 'Non determinato';
    let fonteNormativa = 'Allegato 4, art.1 comma 64, L.190/2014';

    if (codice_ateco && coeffRecords.length > 0) {
      const parts = codice_ateco.replace(/\s/g, '').split('.');
      const divisione = parts[0];
      const gruppo = parts.length > 1 ? `${parts[0]}.${parts[1]}` : null;
      let matched = null;

      for (const g of coeffRecords) {
        for (const spec of (g.codici_specifici || [])) {
          if (codice_ateco.startsWith(spec) || (gruppo && gruppo.startsWith(spec))) {
            matched = g; break;
          }
        }
        if (matched) break;
      }
      if (!matched) {
        for (const g of coeffRecords) {
          if ((g.codici_divisione || []).includes(divisione)) { matched = g; break; }
        }
      }
      if (!matched) matched = coeffRecords.find(g => g.gruppo === 9);

      if (matched) {
        coefficiente = matched.coefficiente;
        settoreCoeff = matched.settore;
        fonteNormativa = matched.fonte_normativa || fonteNormativa;
      }
    }

    // === Determina gestione INPS ===
    let gestione_inps = null;
    if (regime === 'Forfettario' || regime === 'DittaOrdinaria') {
      if (codice_ateco) {
        const divNum = parseInt(codice_ateco.split('.')[0]);
        if ((divNum >= 10 && divNum <= 33) || (divNum >= 41 && divNum <= 43) || divNum === 95) {
          gestione_inps = 'Artigiani';
        } else if ((divNum >= 45 && divNum <= 47) || (divNum >= 55 && divNum <= 56) || divNum === 68) {
          gestione_inps = 'Commercianti';
        } else if (divNum >= 64 && divNum <= 75) {
          gestione_inps = 'GestioneSeparata';
        } else {
          gestione_inps = 'Commercianti';
        }
      }
    }

    // === CALCOLI ===
    let reddito_imponibile = 0;
    let imposte_totali = 0;
    let contributi_totali = 0;
    let netto_finale = 0;
    const imposte = [];
    let contributi_inps_detail = null;
    let dettaglio_reddito = '';

    if (regime === 'Forfettario') {
      reddito_imponibile = r2(fatturato_annuo * coefficiente);
      dettaglio_reddito = `€${fatturato_annuo} × ${(coefficiente * 100).toFixed(0)}% (${settoreCoeff}) = €${reddito_imponibile}`;

      const aliqForf = getAliquota('Forfettario_ordinario');
      const imposta_sost = r2(reddito_imponibile * aliqForf);
      imposte.push({
        nome: 'Imposta sostitutiva',
        base_imponibile: reddito_imponibile,
        aliquota_info: `${(aliqForf * 100).toFixed(0)}% (da AliquoteFiscali DB, anno ${anno})`,
        importo: imposta_sost,
        note: 'Aliquota 5% per startup nei primi 5 anni, 15% ordinaria.'
      });
      imposte_totali = imposta_sost;

      if (gestione_inps) {
        const inps = getInps(gestione_inps);
        if (inps) {
          const aliqInps = inps.aliquota_percentuale || 0;
          if (gestione_inps === 'Artigiani' || gestione_inps === 'Commercianti') {
            const fisso = inps.contributo_fisso_annuo || 0;
            const minimale = inps.minimale_annuo || 0;
            const massimale = inps.massimale_reddito || Infinity;
            const redditoInps = Math.min(reddito_imponibile, massimale);
            const variabile = redditoInps > minimale ? r2((redditoInps - minimale) * aliqInps) : 0;
            contributi_totali = r2(fisso + variabile);
            contributi_inps_detail = {
              tipo_gestione: `Gestione ${gestione_inps}`,
              base_imponibile: reddito_imponibile,
              aliquota: `${(aliqInps * 100).toFixed(2)}% (ContributiINPS DB, anno ${anno})`,
              importo: contributi_totali,
              note: `Fisso: €${fisso}, Variabile: €${variabile}. Minimale: €${minimale}, Massimale: €${massimale}`
            };
          } else {
            contributi_totali = r2(reddito_imponibile * aliqInps);
            contributi_inps_detail = {
              tipo_gestione: `Gestione Separata`,
              base_imponibile: reddito_imponibile,
              aliquota: `${(aliqInps * 100).toFixed(2)}% (ContributiINPS DB, anno ${anno})`,
              importo: contributi_totali,
              note: ''
            };
          }
        }
      }

      netto_finale = r2(fatturato_annuo - imposta_sost - contributi_totali);

    } else if (regime === 'SRL') {
      const costiDed = costi_deducibili || 0;
      reddito_imponibile = r2(fatturato_annuo - costiDed);
      dettaglio_reddito = `€${fatturato_annuo} - €${costiDed} = €${reddito_imponibile}`;

      const aliqIres = getAliquota('IRES');
      const aliqIrap = getAliquota('IRAP');

      const ires = r2(reddito_imponibile * aliqIres);
      const irap = r2(reddito_imponibile * aliqIrap);

      imposte.push({
        nome: 'IRES', base_imponibile: reddito_imponibile,
        aliquota_info: `${(aliqIres * 100).toFixed(0)}% (AliquoteFiscali DB, anno ${anno})`,
        importo: ires, note: ''
      });
      imposte.push({
        nome: 'IRAP', base_imponibile: reddito_imponibile,
        aliquota_info: `${(aliqIrap * 100).toFixed(2)}% (AliquoteFiscali DB, anno ${anno})`,
        importo: irap, note: 'Base IRAP stimata = utile. Può differire.'
      });

      imposte_totali = r2(ires + irap);
      netto_finale = r2(reddito_imponibile - ires - irap);

    } else {
      // DittaOrdinaria
      const costiDed = costi_deducibili || 0;
      reddito_imponibile = r2(fatturato_annuo - costiDed);
      dettaglio_reddito = `€${fatturato_annuo} - €${costiDed} = €${reddito_imponibile}`;

      // IRPEF progressiva
      const scag1 = getAliquota('IRPEF_scaglione1');
      const scag2 = getAliquota('IRPEF_scaglione2');
      const scag3 = getAliquota('IRPEF_scaglione3');
      const soglia1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.soglia_max || 28000;
      const soglia2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.soglia_max || 50000;
      const scag2Eff = reddito_imponibile > 200000 ? 0.35 : scag2;

      let irpef = 0;
      if (reddito_imponibile <= soglia1) {
        irpef = r2(reddito_imponibile * scag1);
      } else if (reddito_imponibile <= soglia2) {
        irpef = r2(soglia1 * scag1 + (reddito_imponibile - soglia1) * scag2Eff);
      } else {
        irpef = r2(soglia1 * scag1 + (soglia2 - soglia1) * scag2Eff + (reddito_imponibile - soglia2) * scag3);
      }

      imposte.push({
        nome: 'IRPEF', base_imponibile: reddito_imponibile,
        aliquota_info: `Scaglioni ${anno}: ${(scag1*100).toFixed(0)}%/${(scag2Eff*100).toFixed(0)}%/${(scag3*100).toFixed(0)}% (AliquoteFiscali DB)`,
        importo: irpef, note: `Soglie: €${soglia1} / €${soglia2}`
      });
      imposte_totali = irpef;

      if (gestione_inps) {
        const inps = getInps(gestione_inps);
        if (inps) {
          const fisso = inps.contributo_fisso_annuo || 0;
          const minimale = inps.minimale_annuo || 0;
          const aliqInps = inps.aliquota_percentuale || 0;
          const massimale = inps.massimale_reddito || Infinity;
          const redditoInps = Math.min(reddito_imponibile, massimale);
          const variabile = redditoInps > minimale ? r2((redditoInps - minimale) * aliqInps) : 0;
          contributi_totali = r2(fisso + variabile);
          contributi_inps_detail = {
            tipo_gestione: `Gestione ${gestione_inps}`,
            base_imponibile: reddito_imponibile,
            aliquota: `${(aliqInps * 100).toFixed(2)}% (ContributiINPS DB, anno ${anno})`,
            importo: contributi_totali,
            note: `Fisso: €${fisso}, Variabile: €${variabile}`
          };
        }
      }

      netto_finale = r2(reddito_imponibile - irpef - contributi_totali);
    }

    const pressione = fatturato_annuo > 0 ? r2(((imposte_totali + contributi_totali) / fatturato_annuo) * 100) : 0;

    return Response.json({
      success: true,
      simulazione: {
        reddito_imponibile,
        dettaglio_calcolo_reddito: dettaglio_reddito,
        imposte,
        contributi_inps: contributi_inps_detail,
        totale_imposte: imposte_totali,
        totale_contributi: contributi_totali,
        totale_carico_fiscale: r2(imposte_totali + contributi_totali),
        pressione_fiscale_percentuale: pressione,
        reddito_netto_stimato: netto_finale,
        suggerimenti: [
          'Calcoli basati su aliquote ufficiali caricate nel database.',
          regime === 'Forfettario' ? `Coefficiente ${(coefficiente * 100).toFixed(0)}% per ATECO ${codice_ateco || 'non specificato'} (${settoreCoeff}). Fonte: ${fonteNormativa}` : null,
          gestione_inps ? `Gestione INPS: ${gestione_inps} (determinata dal codice ATECO)` : null,
        ].filter(Boolean),
        avvertenze: [
          'Calcoli deterministici da dati normativi reali. Nessuna stima AI.',
          'Per una valutazione personalizzata consultare un commercialista.'
        ]
      }
    });

  } catch (error) {
    console.error('Errore simulateFiscal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});