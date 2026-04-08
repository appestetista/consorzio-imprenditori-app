import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
      compenso_amministratore,
      base_imponibile_irap,
      regione,
      categoria_irap
    } = await req.json();

    if (!regime || !fatturato || !anno) {
      return Response.json({ error: 'Regime, fatturato e anno sono obbligatori' }, { status: 400 });
    }

    const aliquoteRecords = await base44.asServiceRole.entities.AliquoteFiscali.filter({ anno: anno });
    if (aliquoteRecords.length === 0) {
      return Response.json({ error: `Nessuna aliquota trovata per l'anno ${anno}` }, { status: 400 });
    }

    const getAliquota = (tipo) => {
      const record = aliquoteRecords.find(a => a.tipo_imposta === tipo);
      if (!record) throw new Error(`Aliquota ${tipo} non trovata per anno ${anno}`);
      return record.aliquota;
    };

    const fmt = (n) => `€${Math.round(n).toLocaleString('it-IT')}`;
    const r2 = (n) => Math.round(n * 100) / 100;

    let utile = 0;
    let reddito_imponibile = 0;
    let imposte_totali = 0;
    let netto_finale = 0;
    let imposte_pure = 0;
    let contributi_pure = 0;
    let tasse_societarie = 0;
    let tasse_personali = 0;
    const dettaglio = [];
    const avvisi = []; // alert / warning per il frontend

    // ===================== SRL =====================
    if (regime === 'SRL') {
      const costiDed = costi_deducibili || 0;
      const compensoAmm = compenso_amministratore || 0;
      const aliqIres = getAliquota('IRES');
      const aliqDividendi = getAliquota('Dividendi');

      // IRAP regionale: cerca aliquota specifica per regione/categoria
      let aliqIrap = getAliquota('IRAP'); // fallback nazionale
      let irapRegione = regione || '';
      let irapCategoria = 'Impresa Ordinaria';
      if (regione) {
        const irapRecords = await base44.asServiceRole.entities.AliquoteIRAPRegionali.filter({ anno: anno, regione: regione });
        if (irapRecords.length > 0) {
          let irapRecord = null;
          if (categoria_irap) {
            irapRecord = irapRecords.find(r => r.categoria === categoria_irap);
          }
          if (!irapRecord) {
            irapRecord = irapRecords.find(r => r.categoria === 'Impresa Ordinaria');
          }
          if (irapRecord) {
            aliqIrap = irapRecord.aliquota;
            irapCategoria = irapRecord.categoria;
          }
        }
      }

      // Alert compenso = 0
      if (compensoAmm === 0) {
        avvisi.push('Nessun compenso amministratore considerato. La simulazione non include contributi INPS personali.');
      }

      // --- SEZIONE A: Calcolo utile ---
      utile = fatturato - costiDed - compensoAmm;
      reddito_imponibile = utile;

      // Base IRAP: se specificata dall'utente la usiamo, altrimenti = utile con avviso
      const irapSpecificata = base_imponibile_irap !== undefined && base_imponibile_irap !== null && base_imponibile_irap !== '';
      const baseIrap = irapSpecificata ? parseFloat(base_imponibile_irap) : utile;

      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE A – CALCOLO UTILE`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`Fatturato: ${fmt(fatturato)}`);
      dettaglio.push(`Costi deducibili: ${fmt(costiDed)}`);
      if (compensoAmm > 0) {
        dettaglio.push(`Compenso amministratore: ${fmt(compensoAmm)}`);
        dettaglio.push(`Utile lordo: ${fmt(fatturato)} - ${fmt(costiDed)} - ${fmt(compensoAmm)} = ${fmt(utile)}`);
      } else {
        dettaglio.push(`Utile lordo: ${fmt(fatturato)} - ${fmt(costiDed)} = ${fmt(utile)}`);
      }

      // --- SEZIONE B: Imposte società ---
      const ires = r2(utile * aliqIres);
      const irap = r2(baseIrap * aliqIrap);
      const utile_netto_societa = r2(utile - ires - irap);

      dettaglio.push(``);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE B – IMPOSTE SOCIETÀ`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`IRES (${(aliqIres * 100).toFixed(1)}%): ${fmt(utile)} × ${aliqIres} = ${fmt(ires)}`);
      dettaglio.push(``);
      dettaglio.push(`IRAP (${(aliqIrap * 100).toFixed(2)}%):`);
      if (irapRegione) {
        dettaglio.push(`  Aliquota IRAP applicata per ${irapRegione}: ${(aliqIrap * 100).toFixed(2)}% (${irapCategoria})`);
      }
      dettaglio.push(`  Base imponibile IRAP: ${fmt(baseIrap)}${!irapSpecificata ? ' (stimata = utile)' : ' (inserita manualmente)'}`);
      dettaglio.push(`  IRAP: ${fmt(baseIrap)} × ${(aliqIrap * 100).toFixed(2)}% = ${fmt(irap)}`);
      if (!irapSpecificata) {
        dettaglio.push(`  ⚠️ La base IRAP è stimata e può differire dalla realtà fiscale.`);
        avvisi.push('La base IRAP è stimata (= utile). Nella realtà può differire. Verificare con il consulente.');
      }
      if (irapCategoria !== 'Impresa Ordinaria') {
        avvisi.push(`Aliquota IRAP specifica "${irapCategoria}" applicata. Verificare possesso requisiti normativi per applicazione aliquota specifica.`);
      }
      dettaglio.push(``);
      dettaglio.push(`Tasse società totali: ${fmt(ires)} + ${fmt(irap)} = ${fmt(ires + irap)}`);
      dettaglio.push(`Utile netto società: ${fmt(utile)} - ${fmt(ires)} - ${fmt(irap)} = ${fmt(utile_netto_societa)}`);

      tasse_societarie = r2(ires + irap);

      // --- SEZIONE C: Imposte personali ---
      let irpef_amministratore = 0;
      let contributi_amministratore = 0;
      let netto_amministratore = 0;
      let imposta_dividendi = 0;
      let dividendi_netto = 0;

      const hasPersonali = compensoAmm > 0 || distribuzione_dividendi;

      if (hasPersonali) {
        dettaglio.push(``);
        dettaglio.push(`══════════════════════════════════`);
        dettaglio.push(`SEZIONE C – IMPOSTE PERSONALI`);
        dettaglio.push(`══════════════════════════════════`);
      }

      if (compensoAmm > 0) {
        const scaglione1 = getAliquota('IRPEF_scaglione1');
        const scaglione2 = getAliquota('IRPEF_scaglione2');
        const scaglione3 = getAliquota('IRPEF_scaglione3');
        const soglia1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.soglia_max || 28000;
        const soglia2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.soglia_max || 50000;

        dettaglio.push(`IRPEF su compenso amministratore (${fmt(compensoAmm)}):`);

        // 2026: se reddito complessivo > 200k, lo scaglione 2 resta a 35% (la riduzione a 33% non si applica)
        const scag2Eff = compensoAmm > 200000 ? 0.35 : scaglione2;

        if (compensoAmm <= soglia1) {
          irpef_amministratore = r2(compensoAmm * scaglione1);
          dettaglio.push(`  Scaglione 1 (${(scaglione1 * 100).toFixed(0)}%): ${fmt(compensoAmm)} × ${scaglione1} = ${fmt(irpef_amministratore)}`);
        } else if (compensoAmm <= soglia2) {
          const p1 = r2(soglia1 * scaglione1);
          const ecc = compensoAmm - soglia1;
          const p2 = r2(ecc * scag2Eff);
          irpef_amministratore = r2(p1 + p2);
          dettaglio.push(`  Scaglione 1 (${(scaglione1 * 100).toFixed(0)}%): ${fmt(soglia1)} × ${scaglione1} = ${fmt(p1)}`);
          dettaglio.push(`  Scaglione 2 (${(scag2Eff * 100).toFixed(0)}%): ${fmt(ecc)} × ${scag2Eff} = ${fmt(p2)}`);
        } else {
          const p1 = r2(soglia1 * scaglione1);
          const fascia2 = soglia2 - soglia1;
          const p2 = r2(fascia2 * scag2Eff);
          const ecc = compensoAmm - soglia2;
          const p3 = r2(ecc * scaglione3);
          irpef_amministratore = r2(p1 + p2 + p3);
          dettaglio.push(`  Scaglione 1 (${(scaglione1 * 100).toFixed(0)}%): ${fmt(soglia1)} × ${scaglione1} = ${fmt(p1)}`);
          dettaglio.push(`  Scaglione 2 (${(scag2Eff * 100).toFixed(0)}%): ${fmt(fascia2)} × ${scag2Eff} = ${fmt(p2)}`);
          dettaglio.push(`  Scaglione 3 (${(scaglione3 * 100).toFixed(0)}%): ${fmt(ecc)} × ${scaglione3} = ${fmt(p3)}`);
        }
        dettaglio.push(`  IRPEF totale: ${fmt(irpef_amministratore)}`);

        // Contributi INPS
        const inpsRecords = await base44.asServiceRole.entities.ContributiINPS.filter({ anno: anno, gestione: 'AmministratoreSRL' });
        if (inpsRecords.length > 0) {
          const aliqInps = inpsRecords[0].aliquota_percentuale || 0;
          const massimale = inpsRecords[0].massimale_reddito || Infinity;
          const redditoInps = Math.min(compensoAmm, massimale);
          contributi_amministratore = r2(redditoInps * aliqInps);
          dettaglio.push(``);
          dettaglio.push(`Contributi INPS Gestione Separata:`);
          dettaglio.push(`  ${fmt(redditoInps)} × ${(aliqInps * 100).toFixed(2)}% = ${fmt(contributi_amministratore)}`);
        }

        netto_amministratore = r2(compensoAmm - irpef_amministratore - contributi_amministratore);
        dettaglio.push(``);
        dettaglio.push(`Netto amministratore: ${fmt(compensoAmm)} - ${fmt(irpef_amministratore)} - ${fmt(contributi_amministratore)} = ${fmt(netto_amministratore)}`);
      }

      if (distribuzione_dividendi) {
        imposta_dividendi = r2(utile_netto_societa * aliqDividendi);
        dividendi_netto = r2(utile_netto_societa - imposta_dividendi);
        dettaglio.push(``);
        dettaglio.push(`Distribuzione dividendi:`);
        dettaglio.push(`  Imposta sostitutiva (${(aliqDividendi * 100).toFixed(0)}%): ${fmt(utile_netto_societa)} × ${aliqDividendi} = ${fmt(imposta_dividendi)}`);
        dettaglio.push(`  Dividendi netti: ${fmt(utile_netto_societa)} - ${fmt(imposta_dividendi)} = ${fmt(dividendi_netto)}`);
      } else {
        if (hasPersonali) {
          dettaglio.push(``);
          dettaglio.push(`Dividendi: NON distribuiti – l'utile resta in società senza ulteriore tassazione.`);
          dettaglio.push(`  In caso di distribuzione si applica imposta sostitutiva del 26% in capo al socio.`);
        }
      }

      // Totali
      tasse_personali = r2(irpef_amministratore + imposta_dividendi);
      contributi_pure = r2(contributi_amministratore);
      imposte_pure = r2(tasse_societarie + tasse_personali);
      imposte_totali = r2(imposte_pure + contributi_pure);

      if (distribuzione_dividendi) {
        netto_finale = r2(dividendi_netto + netto_amministratore);
      } else {
        netto_finale = r2(utile_netto_societa + netto_amministratore);
      }

      // --- SEZIONE D: Indicatori fiscali ---
      dettaglio.push(``);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE D – INDICATORI FISCALI`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`IMPOSTE TOTALI SOCIETÀ (IRES + IRAP): ${fmt(tasse_societarie)}`);
      if (tasse_personali > 0 || contributi_pure > 0) {
        dettaglio.push(`Tasse personali socio/amministratore (IRPEF + Dividendi): ${fmt(tasse_personali)}`);
        dettaglio.push(`Contributi INPS socio/amministratore: ${fmt(contributi_pure)}`);
      }
      dettaglio.push(`TOTALE CARICO FISCALE COMPLESSIVO: ${fmt(imposte_totali)}`);
      dettaglio.push(`NETTO COMBINATO FINALE: ${fmt(netto_finale)}`);
      dettaglio.push(``);
      const pressioneFatturato = fatturato > 0 ? r2((imposte_totali / fatturato) * 100) : 0;
      const pressioneUtile = utile > 0 ? r2((imposte_totali / utile) * 100) : 0;
      dettaglio.push(`Pressione fiscale su fatturato: ${pressioneFatturato}%`);
      dettaglio.push(`Pressione fiscale su utile: ${pressioneUtile}%`);
      dettaglio.push(``);
      if (!irapSpecificata) {
        dettaglio.push(`ℹ️ IRAP calcolata in modalità semplificata (base imponibile = utile). L'importo reale può variare in base alla base imponibile effettiva.`);
      }
      if (!distribuzione_dividendi) {
        dettaglio.push(`ℹ️ Dividendi non distribuiti: l'utile trattenuto in società non subisce ulteriore tassazione. In caso di distribuzione si applica imposta sostitutiva del 26% in capo al socio.`);
      }
    }

    // ===================== FORFETTARIO =====================
    else if (regime === 'Forfettario') {
      const coeff = coefficiente_redditivita || 0.78;
      const tipoAliq = aliquota_forfettario === 'startup' ? 'Forfettario_startup' : 'Forfettario_ordinario';
      const aliq = getAliquota(tipoAliq);

      reddito_imponibile = r2(fatturato * coeff);
      const imposta = r2(reddito_imponibile * aliq);
      utile = reddito_imponibile;

      let contributi_inps = 0;
      if (gestione_inps) {
        const inpsRecords = await base44.asServiceRole.entities.ContributiINPS.filter({ anno: anno, gestione: gestione_inps });
        if (inpsRecords.length > 0) {
          const aliqInps = inpsRecords[0].aliquota_percentuale || 0;
          contributi_inps = r2(reddito_imponibile * aliqInps);
        }
      }

      imposte_pure = r2(imposta);
      contributi_pure = r2(contributi_inps);
      imposte_totali = r2(imposta + contributi_inps);
      netto_finale = r2(fatturato - imposta - contributi_inps);
      tasse_societarie = 0;
      tasse_personali = r2(imposta);

      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE A – CALCOLO REDDITO`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`Regime: FORFETTARIO (${aliquota_forfettario === 'startup' ? 'Startup 5%' : 'Ordinario 15%'})`);
      dettaglio.push(`Fatturato: ${fmt(fatturato)}`);
      dettaglio.push(`Coefficiente di redditività: ${(coeff * 100).toFixed(0)}%`);
      dettaglio.push(`Reddito imponibile: ${fmt(fatturato)} × ${coeff} = ${fmt(reddito_imponibile)}`);
      dettaglio.push(``);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE B – IMPOSTE`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`Imposta sostitutiva (${(aliq * 100).toFixed(0)}%): ${fmt(reddito_imponibile)} × ${aliq} = ${fmt(imposta)}`);
      if (contributi_inps > 0 && gestione_inps) {
        dettaglio.push(``);
        dettaglio.push(`Contributi INPS – ${gestione_inps}: ${fmt(contributi_inps)}`);
      }
      dettaglio.push(``);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE D – INDICATORI FISCALI`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`Imposte: ${fmt(imposte_pure)}`);
      dettaglio.push(`Contributi: ${fmt(contributi_pure)}`);
      dettaglio.push(`TOTALE: ${fmt(imposte_totali)}`);
      dettaglio.push(`NETTO FINALE: ${fmt(netto_finale)}`);
      const pressioneFatturato = fatturato > 0 ? r2((imposte_totali / fatturato) * 100) : 0;
      const pressioneUtile = utile > 0 ? r2((imposte_totali / utile) * 100) : 0;
      dettaglio.push(`Pressione fiscale su fatturato: ${pressioneFatturato}%`);
      dettaglio.push(`Pressione fiscale su utile: ${pressioneUtile}%`);
    }

    // ===================== DITTA ORDINARIA =====================
    else if (regime === 'DittaOrdinaria') {
      const costiDed = costi_deducibili || 0;
      reddito_imponibile = fatturato - costiDed;
      utile = reddito_imponibile;

      const scaglione1 = getAliquota('IRPEF_scaglione1');
      const scaglione2 = getAliquota('IRPEF_scaglione2');
      const scaglione3 = getAliquota('IRPEF_scaglione3');
      const soglia1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.soglia_max || 28000;
      const soglia2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.soglia_max || 50000;

      let irpef = 0;
      const dettaglioIrpef = [];

      // 2026: se reddito > 200k, lo scaglione 2 resta a 35%
      const scag2EffDitta = reddito_imponibile > 200000 ? 0.35 : scaglione2;

      if (reddito_imponibile <= soglia1) {
        irpef = r2(reddito_imponibile * scaglione1);
        dettaglioIrpef.push(`  Scaglione 1 (${(scaglione1 * 100).toFixed(0)}%): ${fmt(reddito_imponibile)} × ${scaglione1} = ${fmt(irpef)}`);
      } else if (reddito_imponibile <= soglia2) {
        const p1 = r2(soglia1 * scaglione1);
        const ecc = reddito_imponibile - soglia1;
        const p2 = r2(ecc * scag2EffDitta);
        irpef = r2(p1 + p2);
        dettaglioIrpef.push(`  Scaglione 1 (${(scaglione1 * 100).toFixed(0)}%): ${fmt(soglia1)} × ${scaglione1} = ${fmt(p1)}`);
        dettaglioIrpef.push(`  Scaglione 2 (${(scag2EffDitta * 100).toFixed(0)}%): ${fmt(ecc)} × ${scag2EffDitta} = ${fmt(p2)}`);
      } else {
        const p1 = r2(soglia1 * scaglione1);
        const fascia2 = soglia2 - soglia1;
        const p2 = r2(fascia2 * scag2EffDitta);
        const ecc = reddito_imponibile - soglia2;
        const p3 = r2(ecc * scaglione3);
        irpef = r2(p1 + p2 + p3);
        dettaglioIrpef.push(`  Scaglione 1 (${(scaglione1 * 100).toFixed(0)}%): ${fmt(soglia1)} × ${scaglione1} = ${fmt(p1)}`);
        dettaglioIrpef.push(`  Scaglione 2 (${(scag2EffDitta * 100).toFixed(0)}%): ${fmt(fascia2)} × ${scag2EffDitta} = ${fmt(p2)}`);
        dettaglioIrpef.push(`  Scaglione 3 (${(scaglione3 * 100).toFixed(0)}%): ${fmt(ecc)} × ${scaglione3} = ${fmt(p3)}`);
      }

      let contributi_totali = 0;
      const dettaglioInps = [];

      if (gestione_inps === 'Artigiani' || gestione_inps === 'Commercianti') {
        const inpsRecords = await base44.asServiceRole.entities.ContributiINPS.filter({ anno: anno, gestione: gestione_inps });
        if (inpsRecords.length > 0) {
          const inps = inpsRecords[0];
          const contributo_fisso = r2(inps.contributo_fisso_annuo || 0);
          const minimale = inps.minimale_annuo || 0;
          const aliqInps = inps.aliquota_percentuale || 0;
          const massimale = inps.massimale_reddito || Infinity;
          const redditoInps = Math.min(reddito_imponibile, massimale);
          let contributo_variabile = 0;
          if (redditoInps > minimale) {
            contributo_variabile = r2((redditoInps - minimale) * aliqInps);
          }
          contributi_totali = r2(contributo_fisso + contributo_variabile);
          dettaglioInps.push(`Contributi INPS – Gestione ${gestione_inps}:`);
          dettaglioInps.push(`  Fisso (minimale ${fmt(minimale)}): ${fmt(contributo_fisso)}`);
          dettaglioInps.push(`  Variabile: ${fmt(contributo_variabile)}`);
          dettaglioInps.push(`  Totale INPS: ${fmt(contributi_totali)}`);
        }
      }

      imposte_pure = r2(irpef);
      contributi_pure = r2(contributi_totali);
      imposte_totali = r2(irpef + contributi_totali);
      netto_finale = r2(reddito_imponibile - irpef - contributi_totali);
      tasse_societarie = 0;
      tasse_personali = r2(irpef);

      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE A – CALCOLO REDDITO`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`Regime: DITTA INDIVIDUALE ORDINARIA`);
      dettaglio.push(`Fatturato: ${fmt(fatturato)}`);
      dettaglio.push(`Costi deducibili: ${fmt(costiDed)}`);
      dettaglio.push(`Reddito imponibile: ${fmt(fatturato)} - ${fmt(costiDed)} = ${fmt(reddito_imponibile)}`);
      dettaglio.push(``);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE B – IMPOSTE`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`IRPEF progressiva:`);
      dettaglioIrpef.forEach(d => dettaglio.push(d));
      dettaglio.push(`  IRPEF totale: ${fmt(irpef)}`);
      if (dettaglioInps.length > 0) {
        dettaglio.push(``);
        dettaglioInps.forEach(d => dettaglio.push(d));
      }
      dettaglio.push(``);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`SEZIONE D – INDICATORI FISCALI`);
      dettaglio.push(`══════════════════════════════════`);
      dettaglio.push(`Imposte: ${fmt(imposte_pure)}`);
      dettaglio.push(`Contributi: ${fmt(contributi_pure)}`);
      dettaglio.push(`TOTALE: ${fmt(imposte_totali)}`);
      dettaglio.push(`NETTO FINALE: ${fmt(netto_finale)}`);
      const pressioneFatturato = fatturato > 0 ? r2((imposte_totali / fatturato) * 100) : 0;
      const pressioneUtile = utile > 0 ? r2((imposte_totali / utile) * 100) : 0;
      dettaglio.push(`Pressione fiscale su fatturato: ${pressioneFatturato}%`);
      dettaglio.push(`Pressione fiscale su utile: ${pressioneUtile}%`);
    } else {
      return Response.json({ error: `Regime "${regime}" non supportato` }, { status: 400 });
    }

    // Indicatori
    const pressione_fiscale = fatturato > 0 ? r2((imposte_totali / fatturato) * 100) : 0;
    const tax_rate_effettivo = utile > 0 ? r2((imposte_totali / utile) * 100) : 0;

    // Salva simulazione
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
      utile: r2(utile),
      reddito_imponibile: r2(reddito_imponibile),
      imposte_totali: r2(imposte_totali),
      netto_finale: r2(netto_finale),
      dettaglio_calcolo: dettaglio.join('\n')
    });

    return Response.json({
      success: true,
      simulazione_id: simulazione.id,
      regime,
      fatturato,
      utile: r2(utile),
      reddito_imponibile: r2(reddito_imponibile),
      imposte_totali: r2(imposte_totali),
      imposte_pure: r2(imposte_pure),
      contributi_pure: r2(contributi_pure),
      tasse_societarie: r2(tasse_societarie),
      tasse_personali: r2(tasse_personali),
      netto_finale: r2(netto_finale),
      pressione_fiscale,
      tax_rate_effettivo,
      avvisi,
      dettaglio_calcolo: dettaglio.join('\n')
    });

  } catch (error) {
    console.error('Errore calcolaImposte:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});