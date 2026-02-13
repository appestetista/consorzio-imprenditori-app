import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      fatturato,
      costi_deducibili,
      anno,
      coefficiente_redditivita,
      aliquota_forfettario,
      distribuzione_dividendi,
      compenso_amministratore,
      gestione_inps
    } = await req.json();

    if (!fatturato || !anno) {
      return Response.json({ error: 'Fatturato e anno sono obbligatori' }, { status: 400 });
    }

    // Carica dati dal DB
    const [aliquoteRecords, inpsRecords] = await Promise.all([
      base44.asServiceRole.entities.AliquoteFiscali.filter({ anno }),
      base44.asServiceRole.entities.ContributiINPS.filter({ anno })
    ]);

    if (aliquoteRecords.length === 0) {
      return Response.json({ error: `Nessuna aliquota trovata per l'anno ${anno}` }, { status: 400 });
    }

    const getAliquota = (tipo) => {
      const record = aliquoteRecords.find(a => a.tipo_imposta === tipo);
      if (!record) throw new Error(`Aliquota ${tipo} non trovata per anno ${anno}`);
      return record.aliquota;
    };

    const getInps = (gestione) => inpsRecords.find(r => r.gestione === gestione);

    const costiDed = costi_deducibili || 0;
    const coeff = coefficiente_redditivita || 0.78;
    const compensoAmm = compenso_amministratore || 0;

    const risultati = [];

    // ===================== 1. SRL =====================
    {
      const aliqIres = getAliquota('IRES');
      const aliqIrap = getAliquota('IRAP');
      const aliqDividendi = getAliquota('Dividendi');

      const utile = fatturato - costiDed - compensoAmm;
      const ires = Math.round(utile * aliqIres * 100) / 100;
      const irap = Math.round(utile * aliqIrap * 100) / 100;
      const utile_netto_soc = Math.round((utile - ires - irap) * 100) / 100;

      let tasse_societa = Math.round((ires + irap) * 100) / 100;
      let irpef_amm = 0;
      let contributi_amm = 0;
      let imposta_div = 0;
      let netto_amm = 0;

      // IRPEF + INPS su compenso amministratore
      if (compensoAmm > 0) {
        irpef_amm = calcolaIRPEF(compensoAmm, aliquoteRecords);
        const inpsAmm = getInps('AmministratoreSRL');
        if (inpsAmm) {
          const massimale = inpsAmm.massimale_reddito || Infinity;
          contributi_amm = Math.round(Math.min(compensoAmm, massimale) * (inpsAmm.aliquota_percentuale || 0) * 100) / 100;
        }
        netto_amm = Math.round((compensoAmm - irpef_amm - contributi_amm) * 100) / 100;
      }

      // Dividendi
      if (distribuzione_dividendi) {
        imposta_div = Math.round(utile_netto_soc * aliqDividendi * 100) / 100;
      }

      const imposte_totali = Math.round((tasse_societa + irpef_amm + contributi_amm + imposta_div) * 100) / 100;
      const netto_dividendi = distribuzione_dividendi ? Math.round((utile_netto_soc - imposta_div) * 100) / 100 : utile_netto_soc;
      const netto_finale = Math.round((netto_dividendi + netto_amm) * 100) / 100;

      const dettagli = [];
      dettagli.push(`IRES: €${ires.toLocaleString('it-IT')}, IRAP: €${irap.toLocaleString('it-IT')}`);
      if (compensoAmm > 0) dettagli.push(`IRPEF amm.: €${irpef_amm.toLocaleString('it-IT')}, INPS amm.: €${contributi_amm.toLocaleString('it-IT')}`);
      if (distribuzione_dividendi) dettagli.push(`Imp. dividendi: €${imposta_div.toLocaleString('it-IT')}`);

      risultati.push({
        regime: 'SRL',
        imposte_totali,
        netto_finale,
        dettaglio: dettagli.join(' | ')
      });
    }

    // ===================== 2. FORFETTARIO =====================
    {
      const tipoAliq = aliquota_forfettario === 'startup' ? 'Forfettario_startup' : 'Forfettario_ordinario';
      const aliq = getAliquota(tipoAliq);
      const reddito = Math.round(fatturato * coeff * 100) / 100;
      const imposta = Math.round(reddito * aliq * 100) / 100;

      let contributi_inps = 0;
      if (gestione_inps) {
        const inps = getInps(gestione_inps);
        if (inps) {
          contributi_inps = Math.round(reddito * (inps.aliquota_percentuale || 0) * 100) / 100;
        }
      }

      const imposte_totali = Math.round((imposta + contributi_inps) * 100) / 100;
      const netto_finale = Math.round((fatturato - imposta - contributi_inps) * 100) / 100;

      const dettagli = [];
      dettagli.push(`Imp. sost.: €${imposta.toLocaleString('it-IT')}`);
      if (contributi_inps > 0) dettagli.push(`INPS: €${contributi_inps.toLocaleString('it-IT')}`);

      risultati.push({
        regime: `Forfettario (${aliquota_forfettario === 'startup' ? '5%' : '15%'})`,
        imposte_totali,
        netto_finale,
        dettaglio: dettagli.join(' | ')
      });
    }

    // ===================== 3. DITTA ORDINARIA =====================
    {
      const reddito = fatturato - costiDed;
      const irpef = calcolaIRPEF(reddito, aliquoteRecords);

      let contributi_totali = 0;
      const gestioneDitta = gestione_inps;
      if (gestioneDitta === 'Artigiani' || gestioneDitta === 'Commercianti') {
        const inps = getInps(gestioneDitta);
        if (inps) {
          const contributo_fisso = inps.contributo_fisso_annuo || 0;
          const minimale = inps.minimale_annuo || 0;
          const aliqInps = inps.aliquota_percentuale || 0;
          const massimale = inps.massimale_reddito || Infinity;
          const redditoInps = Math.min(reddito, massimale);
          const contributo_var = redditoInps > minimale ? Math.round((redditoInps - minimale) * aliqInps * 100) / 100 : 0;
          contributi_totali = Math.round((contributo_fisso + contributo_var) * 100) / 100;
        }
      }

      const imposte_totali = Math.round((irpef + contributi_totali) * 100) / 100;
      const netto_finale = Math.round((reddito - irpef - contributi_totali) * 100) / 100;

      const dettagli = [];
      dettagli.push(`IRPEF: €${irpef.toLocaleString('it-IT')}`);
      if (contributi_totali > 0) dettagli.push(`INPS: €${contributi_totali.toLocaleString('it-IT')}`);

      risultati.push({
        regime: 'Ditta Ordinaria',
        imposte_totali,
        netto_finale,
        dettaglio: dettagli.join(' | ')
      });
    }

    // Ordina per netto maggiore
    risultati.sort((a, b) => b.netto_finale - a.netto_finale);

    // Calcola differenza rispetto al migliore
    const migliorNetto = risultati[0].netto_finale;
    risultati.forEach(r => {
      r.differenza = Math.round((r.netto_finale - migliorNetto) * 100) / 100;
    });

    return Response.json({
      success: true,
      fatturato,
      costi_deducibili: costiDed,
      anno,
      confronto: risultati
    });

  } catch (error) {
    console.error('Errore confrontoRegimi:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper IRPEF progressiva
function calcolaIRPEF(reddito, aliquoteRecords) {
  const scaglione1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.aliquota || 0.23;
  const scaglione2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.aliquota || 0.35;
  const scaglione3 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione3')?.aliquota || 0.43;
  const soglia1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.soglia_max || 28000;
  const soglia2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.soglia_max || 50000;

  if (reddito <= soglia1) {
    return Math.round(reddito * scaglione1 * 100) / 100;
  } else if (reddito <= soglia2) {
    const p1 = Math.round(soglia1 * scaglione1 * 100) / 100;
    const p2 = Math.round((reddito - soglia1) * scaglione2 * 100) / 100;
    return Math.round((p1 + p2) * 100) / 100;
  } else {
    const p1 = Math.round(soglia1 * scaglione1 * 100) / 100;
    const p2 = Math.round((soglia2 - soglia1) * scaglione2 * 100) / 100;
    const p3 = Math.round((reddito - soglia2) * scaglione3 * 100) / 100;
    return Math.round((p1 + p2 + p3) * 100) / 100;
  }
}