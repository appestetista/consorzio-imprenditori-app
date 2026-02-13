import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      regime,
      fatturato,
      costi_deducibili,
      coefficiente_redditivita,
      aliquota_forfettario,
      distribuzione_dividendi,
      anno,
      nome_scenario,
      gestione_inps,
      compenso_amministratore
    } = await req.json();

    if (!regime || !fatturato || !anno) {
      return Response.json({ error: 'Regime, fatturato e anno sono obbligatori' }, { status: 400 });
    }

    // Carica aliquote dall'entità AliquoteFiscali per l'anno selezionato
    const aliquoteRecords = await base44.asServiceRole.entities.AliquoteFiscali.filter({ anno: anno });

    if (aliquoteRecords.length === 0) {
      return Response.json({ error: `Nessuna aliquota trovata per l'anno ${anno}` }, { status: 400 });
    }

    // Helper per trovare un'aliquota
    const getAliquota = (tipo) => {
      const record = aliquoteRecords.find(a => a.tipo_imposta === tipo);
      if (!record) throw new Error(`Aliquota ${tipo} non trovata per anno ${anno}`);
      return record.aliquota;
    };

    let utile = 0;
    let reddito_imponibile = 0;
    let imposte_totali = 0;
    let netto_finale = 0;
    let imposte_pure = 0;   // solo imposte (IRES, IRAP, IRPEF, sostitutiva, dividendi)
    let contributi_pure = 0; // solo contributi INPS
    const dettaglio = [];

    // ===================== SRL =====================
    if (regime === 'SRL') {
      const costiDed = costi_deducibili || 0;
      const compensoAmm = compenso_amministratore || 0;
      const aliqIres = getAliquota('IRES');
      const aliqIrap = getAliquota('IRAP');
      const aliqDividendi = getAliquota('Dividendi');

      // Il compenso amministratore è costo deducibile per la società
      utile = fatturato - costiDed - compensoAmm;
      reddito_imponibile = utile;
      const ires = Math.round(utile * aliqIres * 100) / 100;
      const irap = Math.round(utile * aliqIrap * 100) / 100;
      const utile_netto_societa = Math.round((utile - ires - irap) * 100) / 100;

      dettaglio.push(`REGIME: SRL`);
      dettaglio.push(`Fatturato: €${fatturato.toLocaleString('it-IT')}`);
      dettaglio.push(`Costi deducibili: €${costiDed.toLocaleString('it-IT')}`);
      if (compensoAmm > 0) {
        dettaglio.push(`Compenso amministratore: €${compensoAmm.toLocaleString('it-IT')}`);
        dettaglio.push(`Utile lordo: €${fatturato.toLocaleString('it-IT')} - €${costiDed.toLocaleString('it-IT')} - €${compensoAmm.toLocaleString('it-IT')} = €${utile.toLocaleString('it-IT')}`);
      } else {
        dettaglio.push(`Utile lordo: €${fatturato.toLocaleString('it-IT')} - €${costiDed.toLocaleString('it-IT')} = €${utile.toLocaleString('it-IT')}`);
      }
      dettaglio.push(`---`);
      dettaglio.push(`TASSE SOCIETÀ:`);
      dettaglio.push(`IRES (${(aliqIres * 100).toFixed(1)}%): €${utile.toLocaleString('it-IT')} × ${aliqIres} = €${ires.toLocaleString('it-IT')}`);
      dettaglio.push(`IRAP (${(aliqIrap * 100).toFixed(1)}%): €${utile.toLocaleString('it-IT')} × ${aliqIrap} = €${irap.toLocaleString('it-IT')}`);
      dettaglio.push(`Utile netto società: €${utile.toLocaleString('it-IT')} - €${ires.toLocaleString('it-IT')} - €${irap.toLocaleString('it-IT')} = €${utile_netto_societa.toLocaleString('it-IT')}`);

      // ---- COMPENSO AMMINISTRATORE: IRPEF + INPS Gestione Separata ----
      let irpef_amministratore = 0;
      let contributi_amministratore = 0;
      let netto_amministratore = 0;

      if (compensoAmm > 0) {
        // Scaglioni IRPEF sul compenso
        const scaglione1 = getAliquota('IRPEF_scaglione1');
        const scaglione2 = getAliquota('IRPEF_scaglione2');
        const scaglione3 = getAliquota('IRPEF_scaglione3');
        const soglia1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.soglia_max || 28000;
        const soglia2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.soglia_max || 50000;

        const dettaglioIrpefAmm = [];
        if (compensoAmm <= soglia1) {
          irpef_amministratore = Math.round(compensoAmm * scaglione1 * 100) / 100;
          dettaglioIrpefAmm.push(`Scaglione 1 (${(scaglione1 * 100).toFixed(0)}% fino €${soglia1.toLocaleString('it-IT')}): €${compensoAmm.toLocaleString('it-IT')} × ${scaglione1} = €${irpef_amministratore.toLocaleString('it-IT')}`);
        } else if (compensoAmm <= soglia2) {
          const p1 = Math.round(soglia1 * scaglione1 * 100) / 100;
          const ecc = compensoAmm - soglia1;
          const p2 = Math.round(ecc * scaglione2 * 100) / 100;
          irpef_amministratore = Math.round((p1 + p2) * 100) / 100;
          dettaglioIrpefAmm.push(`Scaglione 1 (${(scaglione1 * 100).toFixed(0)}%): €${soglia1.toLocaleString('it-IT')} × ${scaglione1} = €${p1.toLocaleString('it-IT')}`);
          dettaglioIrpefAmm.push(`Scaglione 2 (${(scaglione2 * 100).toFixed(0)}%): €${ecc.toLocaleString('it-IT')} × ${scaglione2} = €${p2.toLocaleString('it-IT')}`);
        } else {
          const p1 = Math.round(soglia1 * scaglione1 * 100) / 100;
          const fascia2 = soglia2 - soglia1;
          const p2 = Math.round(fascia2 * scaglione2 * 100) / 100;
          const ecc = compensoAmm - soglia2;
          const p3 = Math.round(ecc * scaglione3 * 100) / 100;
          irpef_amministratore = Math.round((p1 + p2 + p3) * 100) / 100;
          dettaglioIrpefAmm.push(`Scaglione 1 (${(scaglione1 * 100).toFixed(0)}%): €${soglia1.toLocaleString('it-IT')} × ${scaglione1} = €${p1.toLocaleString('it-IT')}`);
          dettaglioIrpefAmm.push(`Scaglione 2 (${(scaglione2 * 100).toFixed(0)}%): €${fascia2.toLocaleString('it-IT')} × ${scaglione2} = €${p2.toLocaleString('it-IT')}`);
          dettaglioIrpefAmm.push(`Scaglione 3 (${(scaglione3 * 100).toFixed(0)}%): €${ecc.toLocaleString('it-IT')} × ${scaglione3} = €${p3.toLocaleString('it-IT')}`);
        }

        // Contributi INPS Gestione Separata AmministratoreSRL
        const inpsRecords = await base44.asServiceRole.entities.ContributiINPS.filter({ anno: anno, gestione: 'AmministratoreSRL' });
        if (inpsRecords.length > 0) {
          const aliqInps = inpsRecords[0].aliquota_percentuale || 0;
          const massimale = inpsRecords[0].massimale_reddito || Infinity;
          const redditoInps = Math.min(compensoAmm, massimale);
          contributi_amministratore = Math.round(redditoInps * aliqInps * 100) / 100;
        }

        netto_amministratore = Math.round((compensoAmm - irpef_amministratore - contributi_amministratore) * 100) / 100;

        dettaglio.push(`---`);
        dettaglio.push(`TASSE PERSONALI AMMINISTRATORE (su compenso €${compensoAmm.toLocaleString('it-IT')}):`);
        dettaglio.push(`IRPEF progressiva:`);
        dettaglioIrpefAmm.forEach(d => dettaglio.push(d));
        dettaglio.push(`IRPEF totale amministratore: €${irpef_amministratore.toLocaleString('it-IT')}`);
        dettaglio.push(`---`);
        dettaglio.push(`CONTRIBUTI INPS Gestione Separata (Amministratore SRL):`);
        if (inpsRecords.length > 0) {
          const aliqInps = inpsRecords[0].aliquota_percentuale || 0;
          dettaglio.push(`Contributi: €${Math.min(compensoAmm, inpsRecords[0].massimale_reddito || compensoAmm).toLocaleString('it-IT')} × ${(aliqInps * 100).toFixed(2)}% = €${contributi_amministratore.toLocaleString('it-IT')}`);
        }
        dettaglio.push(`Netto amministratore: €${compensoAmm.toLocaleString('it-IT')} - €${irpef_amministratore.toLocaleString('it-IT')} - €${contributi_amministratore.toLocaleString('it-IT')} = €${netto_amministratore.toLocaleString('it-IT')}`);
      }

      // ---- DIVIDENDI (opzionali, sull'utile netto società) ----
      let imposta_dividendi = 0;
      let dividendi_netto = 0;

      if (distribuzione_dividendi) {
        imposta_dividendi = Math.round(utile_netto_societa * aliqDividendi * 100) / 100;
        dividendi_netto = Math.round((utile_netto_societa - imposta_dividendi) * 100) / 100;

        dettaglio.push(`---`);
        dettaglio.push(`DISTRIBUZIONE DIVIDENDI`);
        dettaglio.push(`Imposta sostitutiva dividendi (${(aliqDividendi * 100).toFixed(0)}%): €${utile_netto_societa.toLocaleString('it-IT')} × ${aliqDividendi} = €${imposta_dividendi.toLocaleString('it-IT')}`);
        dettaglio.push(`Dividendi netti: €${utile_netto_societa.toLocaleString('it-IT')} - €${imposta_dividendi.toLocaleString('it-IT')} = €${dividendi_netto.toLocaleString('it-IT')}`);
      } else {
        dettaglio.push(`---`);
        dettaglio.push(`Dividendi NON distribuiti`);
      }

      // ---- TOTALI COMBINATI ----
      const tasse_societa = Math.round((ires + irap) * 100) / 100;
      const tasse_personali = Math.round((irpef_amministratore + imposta_dividendi) * 100) / 100;
      imposte_totali = Math.round((tasse_societa + tasse_personali + contributi_amministratore) * 100) / 100;
      imposte_pure = Math.round((tasse_societa + tasse_personali) * 100) / 100;
      contributi_pure = Math.round(contributi_amministratore * 100) / 100;

      // Netto combinato = utile netto società (o dividendi netti se distribuiti) + netto amministratore
      if (distribuzione_dividendi) {
        netto_finale = Math.round((dividendi_netto + netto_amministratore) * 100) / 100;
      } else {
        netto_finale = Math.round((utile_netto_societa + netto_amministratore) * 100) / 100;
      }

      dettaglio.push(`---`);
      dettaglio.push(`RIEPILOGO TOTALE:`);
      dettaglio.push(`Tasse società (IRES + IRAP): €${tasse_societa.toLocaleString('it-IT')}`);
      if (compensoAmm > 0) {
        dettaglio.push(`Tasse personali amministratore (IRPEF): €${irpef_amministratore.toLocaleString('it-IT')}`);
        dettaglio.push(`Contributi INPS amministratore: €${contributi_amministratore.toLocaleString('it-IT')}`);
      }
      if (distribuzione_dividendi) {
        dettaglio.push(`Imposta dividendi: €${imposta_dividendi.toLocaleString('it-IT')}`);
      }
      dettaglio.push(`IMPOSTE + CONTRIBUTI TOTALI: €${imposte_totali.toLocaleString('it-IT')}`);
      dettaglio.push(`NETTO COMBINATO FINALE: €${netto_finale.toLocaleString('it-IT')}`);
    }

    // ===================== FORFETTARIO =====================
    else if (regime === 'Forfettario') {
      const coeff = coefficiente_redditivita || 0.78;
      const tipoAliq = aliquota_forfettario === 'startup' ? 'Forfettario_startup' : 'Forfettario_ordinario';
      const aliq = getAliquota(tipoAliq);

      reddito_imponibile = Math.round(fatturato * coeff * 100) / 100;
      const imposta = Math.round(reddito_imponibile * aliq * 100) / 100;
      utile = reddito_imponibile;

      // ---- CONTRIBUTI INPS ----
      let contributi_inps = 0;
      const dettaglioInps = [];

      if (gestione_inps) {
        const inpsRecords = await base44.asServiceRole.entities.ContributiINPS.filter({ anno: anno, gestione: gestione_inps });
        if (inpsRecords.length > 0) {
          const inps = inpsRecords[0];
          const aliqInps = inps.aliquota_percentuale || 0;
          contributi_inps = Math.round(reddito_imponibile * aliqInps * 100) / 100;

          dettaglioInps.push(`CONTRIBUTI INPS - ${gestione_inps}`);
          dettaglioInps.push(`Contributi: €${reddito_imponibile.toLocaleString('it-IT')} × ${(aliqInps * 100).toFixed(2)}% = €${contributi_inps.toLocaleString('it-IT')}`);
        }
      }

      imposte_totali = Math.round((imposta + contributi_inps) * 100) / 100;
      imposte_pure = Math.round(imposta * 100) / 100;
      contributi_pure = Math.round(contributi_inps * 100) / 100;
      netto_finale = Math.round((fatturato - imposta - contributi_inps) * 100) / 100;

      dettaglio.push(`REGIME: FORFETTARIO (${aliquota_forfettario === 'startup' ? 'Startup 5%' : 'Ordinario 15%'})`);
      dettaglio.push(`Fatturato: €${fatturato.toLocaleString('it-IT')}`);
      dettaglio.push(`Coefficiente di redditività: ${(coeff * 100).toFixed(0)}%`);
      dettaglio.push(`Reddito imponibile: €${fatturato.toLocaleString('it-IT')} × ${coeff} = €${reddito_imponibile.toLocaleString('it-IT')}`);
      dettaglio.push(`---`);
      dettaglio.push(`Imposta sostitutiva (${(aliq * 100).toFixed(0)}%): €${reddito_imponibile.toLocaleString('it-IT')} × ${aliq} = €${imposta.toLocaleString('it-IT')}`);
      if (dettaglioInps.length > 0) {
        dettaglio.push(`---`);
        dettaglioInps.forEach(d => dettaglio.push(d));
      }
      dettaglio.push(`---`);
      dettaglio.push(`IMPOSTE + CONTRIBUTI TOTALI: €${imposte_totali.toLocaleString('it-IT')}`);
      dettaglio.push(`NETTO FINALE (fatturato - imposte - contributi): €${netto_finale.toLocaleString('it-IT')}`);
    }

    // ===================== DITTA ORDINARIA =====================
    else if (regime === 'DittaOrdinaria') {
      const costiDed = costi_deducibili || 0;
      reddito_imponibile = fatturato - costiDed;
      utile = reddito_imponibile;

      // Scaglioni IRPEF progressivi dal DB
      const scaglione1 = getAliquota('IRPEF_scaglione1');
      const scaglione2 = getAliquota('IRPEF_scaglione2');
      const scaglione3 = getAliquota('IRPEF_scaglione3');

      // Soglie
      const soglia1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.soglia_max || 28000;
      const soglia2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.soglia_max || 50000;

      let irpef = 0;
      const dettaglioIrpef = [];

      if (reddito_imponibile <= soglia1) {
        irpef = Math.round(reddito_imponibile * scaglione1 * 100) / 100;
        dettaglioIrpef.push(`Scaglione 1 (${(scaglione1 * 100).toFixed(0)}% fino €${soglia1.toLocaleString('it-IT')}): €${reddito_imponibile.toLocaleString('it-IT')} × ${scaglione1} = €${irpef.toLocaleString('it-IT')}`);
      } else if (reddito_imponibile <= soglia2) {
        const parte1 = Math.round(soglia1 * scaglione1 * 100) / 100;
        const eccedenza = reddito_imponibile - soglia1;
        const parte2 = Math.round(eccedenza * scaglione2 * 100) / 100;
        irpef = Math.round((parte1 + parte2) * 100) / 100;
        dettaglioIrpef.push(`Scaglione 1 (${(scaglione1 * 100).toFixed(0)}% fino €${soglia1.toLocaleString('it-IT')}): €${soglia1.toLocaleString('it-IT')} × ${scaglione1} = €${parte1.toLocaleString('it-IT')}`);
        dettaglioIrpef.push(`Scaglione 2 (${(scaglione2 * 100).toFixed(0)}% da €${(soglia1 + 1).toLocaleString('it-IT')} a €${soglia2.toLocaleString('it-IT')}): €${eccedenza.toLocaleString('it-IT')} × ${scaglione2} = €${parte2.toLocaleString('it-IT')}`);
      } else {
        const parte1 = Math.round(soglia1 * scaglione1 * 100) / 100;
        const fascia2 = soglia2 - soglia1;
        const parte2 = Math.round(fascia2 * scaglione2 * 100) / 100;
        const eccedenza = reddito_imponibile - soglia2;
        const parte3 = Math.round(eccedenza * scaglione3 * 100) / 100;
        irpef = Math.round((parte1 + parte2 + parte3) * 100) / 100;
        dettaglioIrpef.push(`Scaglione 1 (${(scaglione1 * 100).toFixed(0)}% fino €${soglia1.toLocaleString('it-IT')}): €${soglia1.toLocaleString('it-IT')} × ${scaglione1} = €${parte1.toLocaleString('it-IT')}`);
        dettaglioIrpef.push(`Scaglione 2 (${(scaglione2 * 100).toFixed(0)}% da €${(soglia1 + 1).toLocaleString('it-IT')} a €${soglia2.toLocaleString('it-IT')}): €${fascia2.toLocaleString('it-IT')} × ${scaglione2} = €${parte2.toLocaleString('it-IT')}`);
        dettaglioIrpef.push(`Scaglione 3 (${(scaglione3 * 100).toFixed(0)}% oltre €${soglia2.toLocaleString('it-IT')}): €${eccedenza.toLocaleString('it-IT')} × ${scaglione3} = €${parte3.toLocaleString('it-IT')}`);
      }

      // ---- CONTRIBUTI INPS (Artigiani / Commercianti) ----
      let contributi_totali = 0;
      let contributo_fisso = 0;
      let contributo_variabile = 0;
      const dettaglioInps = [];

      if (gestione_inps === 'Artigiani' || gestione_inps === 'Commercianti') {
        const inpsRecords = await base44.asServiceRole.entities.ContributiINPS.filter({ anno: anno, gestione: gestione_inps });
        if (inpsRecords.length > 0) {
          const inps = inpsRecords[0];
          contributo_fisso = Math.round((inps.contributo_fisso_annuo || 0) * 100) / 100;
          const minimale = inps.minimale_annuo || 0;
          const aliqInps = inps.aliquota_percentuale || 0;
          const massimale = inps.massimale_reddito || Infinity;

          // Reddito su cui calcolare la parte variabile (cap al massimale)
          const redditoInps = Math.min(reddito_imponibile, massimale);

          if (redditoInps > minimale) {
            contributo_variabile = Math.round((redditoInps - minimale) * aliqInps * 100) / 100;
          }

          contributi_totali = Math.round((contributo_fisso + contributo_variabile) * 100) / 100;

          dettaglioInps.push(`CONTRIBUTI INPS - Gestione ${gestione_inps}`);
          dettaglioInps.push(`Contributo fisso annuo (sul minimale €${minimale.toLocaleString('it-IT')}): €${contributo_fisso.toLocaleString('it-IT')}`);
          if (redditoInps > minimale) {
            dettaglioInps.push(`Contributo variabile: (€${redditoInps.toLocaleString('it-IT')} - €${minimale.toLocaleString('it-IT')}) × ${(aliqInps * 100).toFixed(2)}% = €${contributo_variabile.toLocaleString('it-IT')}`);
          } else {
            dettaglioInps.push(`Contributo variabile: €0 (reddito ≤ minimale)`);
          }
          dettaglioInps.push(`Contributi INPS totali: €${contributi_totali.toLocaleString('it-IT')}`);
        }
      }

      imposte_totali = Math.round((irpef + contributi_totali) * 100) / 100;
      imposte_pure = Math.round(irpef * 100) / 100;
      contributi_pure = Math.round(contributi_totali * 100) / 100;
      netto_finale = Math.round((reddito_imponibile - irpef - contributi_totali) * 100) / 100;

      dettaglio.push(`REGIME: DITTA INDIVIDUALE ORDINARIA`);
      dettaglio.push(`Fatturato: €${fatturato.toLocaleString('it-IT')}`);
      dettaglio.push(`Costi deducibili: €${costiDed.toLocaleString('it-IT')}`);
      dettaglio.push(`Reddito imponibile: €${fatturato.toLocaleString('it-IT')} - €${costiDed.toLocaleString('it-IT')} = €${reddito_imponibile.toLocaleString('it-IT')}`);
      dettaglio.push(`---`);
      dettaglio.push(`IRPEF PROGRESSIVA:`);
      dettaglioIrpef.forEach(d => dettaglio.push(d));
      dettaglio.push(`IRPEF totale: €${irpef.toLocaleString('it-IT')}`);
      if (dettaglioInps.length > 0) {
        dettaglio.push(`---`);
        dettaglioInps.forEach(d => dettaglio.push(d));
      }
      dettaglio.push(`---`);
      dettaglio.push(`IMPOSTE + CONTRIBUTI TOTALI: €${imposte_totali.toLocaleString('it-IT')}`);
      dettaglio.push(`NETTO FINALE: €${netto_finale.toLocaleString('it-IT')}`);
    } else {
      return Response.json({ error: `Regime "${regime}" non supportato` }, { status: 400 });
    }

    // Pressione fiscale percentuale
    const pressione_fiscale = fatturato > 0 ? Math.round((imposte_totali / fatturato) * 10000) / 100 : 0;
    dettaglio.push(`---`);
    dettaglio.push(`Pressione fiscale: ${pressione_fiscale}% sul fatturato`);

    // Salva la simulazione
    const simulazione = await base44.asServiceRole.entities.SimulazioneFiscale.create({
      user_email: user.email,
      nome_scenario: nome_scenario || `Scenario ${regime} - ${new Date().toLocaleDateString('it-IT')}`,
      regime,
      fatturato,
      costi_deducibili: costi_deducibili || 0,
      coefficiente_redditivita: coefficiente_redditivita || null,
      aliquota_forfettario: aliquota_forfettario || null,
      distribuzione_dividendi: distribuzione_dividendi || false,
      anno,
      utile: Math.round(utile * 100) / 100,
      reddito_imponibile: Math.round(reddito_imponibile * 100) / 100,
      imposte_totali: Math.round(imposte_totali * 100) / 100,
      netto_finale: Math.round(netto_finale * 100) / 100,
      dettaglio_calcolo: dettaglio.join('\n')
    });

    // Tax Rate Effettivo = imposte_totali / utile
    const tax_rate_effettivo = utile > 0 ? Math.round((imposte_totali / utile) * 10000) / 100 : 0;

    return Response.json({
      success: true,
      simulazione_id: simulazione.id,
      utile: Math.round(utile * 100) / 100,
      reddito_imponibile: Math.round(reddito_imponibile * 100) / 100,
      imposte_totali: Math.round(imposte_totali * 100) / 100,
      imposte_pure: Math.round(imposte_pure * 100) / 100,
      contributi_pure: Math.round(contributi_pure * 100) / 100,
      netto_finale: Math.round(netto_finale * 100) / 100,
      pressione_fiscale,
      tax_rate_effettivo,
      dettaglio_calcolo: dettaglio.join('\n')
    });

  } catch (error) {
    console.error('Errore calcolaImposte:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});