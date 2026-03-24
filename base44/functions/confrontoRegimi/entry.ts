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
      gestione_inps,
      costo_dipendente_annuo,
      investimento_beni
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
    const costoDip = costo_dipendente_annuo || 0;
    const investBeni = investimento_beni || 0;

    const risultati = [];

    // ===== HELPER: calcola imposte per un singolo regime =====
    function calcolaSRL(costiTotali) {
      const aliqIres = getAliquota('IRES');
      const aliqIrap = getAliquota('IRAP');
      const aliqDividendi = getAliquota('Dividendi');

      const utile = fatturato - costiTotali - compensoAmm;
      const ires = Math.round(utile * aliqIres * 100) / 100;
      const irap = Math.round(utile * aliqIrap * 100) / 100;
      const utile_netto_soc = Math.round((utile - ires - irap) * 100) / 100;

      let irpef_amm = 0, contributi_amm = 0, netto_amm = 0;
      if (compensoAmm > 0) {
        irpef_amm = calcolaIRPEF(compensoAmm, aliquoteRecords);
        const inpsAmm = getInps('AmministratoreSRL');
        if (inpsAmm) {
          const massimale = inpsAmm.massimale_reddito || Infinity;
          contributi_amm = Math.round(Math.min(compensoAmm, massimale) * (inpsAmm.aliquota_percentuale || 0) * 100) / 100;
        }
        netto_amm = Math.round((compensoAmm - irpef_amm - contributi_amm) * 100) / 100;
      }

      let imposta_div = 0;
      if (distribuzione_dividendi) {
        imposta_div = Math.round(utile_netto_soc * aliqDividendi * 100) / 100;
      }

      const tasse_societa = Math.round((ires + irap) * 100) / 100;
      const imposte_totali = Math.round((tasse_societa + irpef_amm + contributi_amm + imposta_div) * 100) / 100;
      const netto_dividendi = distribuzione_dividendi ? Math.round((utile_netto_soc - imposta_div) * 100) / 100 : utile_netto_soc;
      const netto_finale = Math.round((netto_dividendi + netto_amm) * 100) / 100;

      const dettagli = [];
      dettagli.push(`IRES: €${ires.toLocaleString('it-IT')}, IRAP: €${irap.toLocaleString('it-IT')}`);
      if (compensoAmm > 0) dettagli.push(`IRPEF amm.: €${irpef_amm.toLocaleString('it-IT')}, INPS amm.: €${contributi_amm.toLocaleString('it-IT')}`);
      if (distribuzione_dividendi) dettagli.push(`Imp. dividendi: €${imposta_div.toLocaleString('it-IT')}`);

      return { regime: 'SRL', imposte_totali, netto_finale, dettaglio: dettagli.join(' | ') };
    }

    function calcolaForfettario() {
      // Forfettario: il costo dipendente NON riduce la base imponibile (reddito = fatturato * coeff)
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

      return { regime: `Forfettario (${aliquota_forfettario === 'startup' ? '5%' : '15%'})`, imposte_totali, netto_finale, dettaglio: dettagli.join(' | ') };
    }

    function calcolaDittaOrdinaria(costiTotali) {
      const reddito = fatturato - costiTotali;
      const irpef = calcolaIRPEF(reddito, aliquoteRecords);

      let contributi_totali = 0;
      if (gestione_inps === 'Artigiani' || gestione_inps === 'Commercianti') {
        const inps = getInps(gestione_inps);
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

      return { regime: 'Ditta Ordinaria', imposte_totali, netto_finale, dettaglio: dettagli.join(' | ') };
    }

    // ===== CALCOLO BASE =====
    risultati.push(calcolaSRL(costiDed));
    risultati.push(calcolaForfettario());
    risultati.push(calcolaDittaOrdinaria(costiDed));

    // Ordina per netto maggiore
    risultati.sort((a, b) => b.netto_finale - a.netto_finale);

    // Calcola differenza rispetto al migliore
    const migliorNetto = risultati[0].netto_finale;
    risultati.forEach(r => {
      r.differenza = Math.round((r.netto_finale - migliorNetto) * 100) / 100;
    });

    // ===== ANALISI DIPENDENTE (se valorizzato) =====
    let analisi_dipendente = null;

    if (costoDip > 0) {
      const costiConDip = costiDed + costoDip;

      // Ricalcola con dipendente (SRL e Ditta: costo deducibile; Forfettario: invariato)
      const srl_senza = calcolaSRL(costiDed);
      const srl_con = calcolaSRL(costiConDip);

      const forf_senza = calcolaForfettario(); // invariato
      const forf_con = calcolaForfettario();   // invariato (nel forfettario il costo dipendente non è deducibile)

      const ditta_senza = calcolaDittaOrdinaria(costiDed);
      const ditta_con = calcolaDittaOrdinaria(costiConDip);

      const buildAnalisi = (label, senza, con, costoDeducibile) => {
        const risparmio_fiscale = Math.round((senza.imposte_totali - con.imposte_totali) * 100) / 100;
        const costo_netto_reale = Math.round((costoDip - risparmio_fiscale) * 100) / 100;
        // Se il costo è deducibile, con.netto_finale già lo include; altrimenti sottraiamo il costo lordo
        const netto_con_dip = costoDeducibile
          ? con.netto_finale
          : Math.round((con.netto_finale - costoDip) * 100) / 100;
        return {
          regime: label,
          imposte_senza_dip: senza.imposte_totali,
          imposte_con_dip: con.imposte_totali,
          netto_senza_dip: senza.netto_finale,
          netto_con_dip,
          risparmio_fiscale,
          costo_netto_reale
        };
      };

      analisi_dipendente = {
        costo_dipendente_annuo: costoDip,
        dettaglio: [
          buildAnalisi('SRL', srl_senza, srl_con, true),
          buildAnalisi('Forfettario', forf_senza, forf_con, false),
          buildAnalisi('Ditta Ordinaria', ditta_senza, ditta_con, true)
        ]
      };
    }

    // ===== ANALISI INVESTIMENTO BENI (se valorizzato) =====
    let analisi_investimento = null;

    if (investBeni > 0) {
      const costiConInvest = costiDed + investBeni;

      const srl_senza = calcolaSRL(costiDed);
      const srl_con = calcolaSRL(costiConInvest);

      const forf_senza = calcolaForfettario();
      const forf_con = calcolaForfettario(); // invariato

      const ditta_senza = calcolaDittaOrdinaria(costiDed);
      const ditta_con = calcolaDittaOrdinaria(costiConInvest);

      const buildAnalisiInvest = (label, senza, con, deducibile) => {
        const risparmio_fiscale = Math.round((senza.imposte_totali - con.imposte_totali) * 100) / 100;
        const costo_reale_investimento = Math.round((investBeni - risparmio_fiscale) * 100) / 100;
        return {
          regime: label,
          imposte_senza_invest: senza.imposte_totali,
          imposte_con_invest: con.imposte_totali,
          risparmio_fiscale,
          costo_reale_investimento
        };
      };

      analisi_investimento = {
        investimento_beni: investBeni,
        dettaglio: [
          buildAnalisiInvest('SRL', srl_senza, srl_con, true),
          buildAnalisiInvest('Forfettario', forf_senza, forf_con, false),
          buildAnalisiInvest('Ditta Ordinaria', ditta_senza, ditta_con, true)
        ]
      };
    }

    return Response.json({
      success: true,
      fatturato,
      costi_deducibili: costiDed,
      anno,
      confronto: risultati,
      analisi_dipendente,
      analisi_investimento
    });

  } catch (error) {
    console.error('Errore confrontoRegimi:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper IRPEF progressiva
function calcolaIRPEF(reddito, aliquoteRecords) {
  const scaglione1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.aliquota || 0.23;
  const scaglione2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.aliquota || 0.33;
  const scaglione3 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione3')?.aliquota || 0.43;
  const soglia1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.soglia_max || 28000;
  const soglia2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.soglia_max || 50000;

  // 2026: se reddito > 200k, la riduzione al 33% non si applica → resta 35%
  const aliq2 = reddito > 200000 ? 0.35 : scaglione2;

  if (reddito <= soglia1) {
    return Math.round(reddito * scaglione1 * 100) / 100;
  } else if (reddito <= soglia2) {
    const p1 = Math.round(soglia1 * scaglione1 * 100) / 100;
    const p2 = Math.round((reddito - soglia1) * aliq2 * 100) / 100;
    return Math.round((p1 + p2) * 100) / 100;
  } else {
    const p1 = Math.round(soglia1 * scaglione1 * 100) / 100;
    const p2 = Math.round((soglia2 - soglia1) * aliq2 * 100) / 100;
    const p3 = Math.round((reddito - soglia2) * scaglione3 * 100) / 100;
    return Math.round((p1 + p2 + p3) * 100) / 100;
  }
}