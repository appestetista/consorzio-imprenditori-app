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
      gestione_inps,
      compenso_amministratore
    } = await req.json();

    if (!regime || !fatturato || !anno) {
      return Response.json({ error: 'Regime, fatturato e anno sono obbligatori' }, { status: 400 });
    }

    const aliquoteRecords = await base44.asServiceRole.entities.AliquoteFiscali.filter({ anno });
    if (aliquoteRecords.length === 0) {
      return Response.json({ error: `Nessuna aliquota trovata per l'anno ${anno}` }, { status: 400 });
    }

    const getAliquota = (tipo) => {
      const r = aliquoteRecords.find(a => a.tipo_imposta === tipo);
      if (!r) throw new Error(`Aliquota ${tipo} non trovata per anno ${anno}`);
      return r.aliquota;
    };

    const soglia1 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione1')?.soglia_max || 28000;
    const soglia2 = aliquoteRecords.find(a => a.tipo_imposta === 'IRPEF_scaglione2')?.soglia_max || 50000;

    const calcolaIRPEF = (reddito) => {
      const s1 = getAliquota('IRPEF_scaglione1');
      const s2 = getAliquota('IRPEF_scaglione2');
      const s3 = getAliquota('IRPEF_scaglione3');
      // 2026: se reddito > 200k, lo scaglione 2 resta a 35%
      const aliq2 = reddito > 200000 ? 0.35 : s2;
      if (reddito <= soglia1) return Math.round(reddito * s1 * 100) / 100;
      if (reddito <= soglia2) return Math.round((soglia1 * s1 + (reddito - soglia1) * aliq2) * 100) / 100;
      return Math.round((soglia1 * s1 + (soglia2 - soglia1) * aliq2 + (reddito - soglia2) * s3) * 100) / 100;
    };

    // Funzione di calcolo netto per un dato scenario
    const calcolaNetto = async (fatt, costi, extraContribPct) => {
      const costiDed = costi || 0;
      const compensoAmm = compenso_amministratore || 0;

      if (regime === 'SRL') {
        const aliqIres = getAliquota('IRES');
        const aliqIrap = getAliquota('IRAP');
        const aliqDiv = getAliquota('Dividendi');
        const utile = fatt - costiDed - compensoAmm;
        const ires = Math.round(utile * aliqIres * 100) / 100;
        const irap = Math.round(utile * aliqIrap * 100) / 100;
        const utileNetto = Math.round((utile - ires - irap) * 100) / 100;

        let irpefAmm = 0;
        let contribAmm = 0;
        if (compensoAmm > 0) {
          irpefAmm = calcolaIRPEF(compensoAmm);
          const inpsRec = await base44.asServiceRole.entities.ContributiINPS.filter({ anno, gestione: 'AmministratoreSRL' });
          if (inpsRec.length > 0) {
            const aliqInps = (inpsRec[0].aliquota_percentuale || 0) + extraContribPct;
            const mass = inpsRec[0].massimale_reddito || Infinity;
            contribAmm = Math.round(Math.min(compensoAmm, mass) * aliqInps * 100) / 100;
          }
        }
        const nettoAmm = compensoAmm - irpefAmm - contribAmm;

        let nettoFinale;
        if (distribuzione_dividendi) {
          const impDiv = Math.round(utileNetto * aliqDiv * 100) / 100;
          nettoFinale = Math.round((utileNetto - impDiv + nettoAmm) * 100) / 100;
        } else {
          nettoFinale = Math.round((utileNetto + nettoAmm) * 100) / 100;
        }
        return nettoFinale;

      } else if (regime === 'Forfettario') {
        const coeff = coefficiente_redditivita || 0.78;
        const tipoAliq = aliquota_forfettario === 'startup' ? 'Forfettario_startup' : 'Forfettario_ordinario';
        const aliq = getAliquota(tipoAliq);
        const reddImp = Math.round(fatt * coeff * 100) / 100;
        const imposta = Math.round(reddImp * aliq * 100) / 100;

        let contribInps = 0;
        if (gestione_inps) {
          const inpsRec = await base44.asServiceRole.entities.ContributiINPS.filter({ anno, gestione: gestione_inps });
          if (inpsRec.length > 0) {
            const aliqInps = (inpsRec[0].aliquota_percentuale || 0) + extraContribPct;
            contribInps = Math.round(reddImp * aliqInps * 100) / 100;
          }
        }
        return Math.round((fatt - imposta - contribInps) * 100) / 100;

      } else if (regime === 'DittaOrdinaria') {
        const reddImp = fatt - costiDed;
        const irpef = calcolaIRPEF(reddImp);

        let contribTotali = 0;
        if (gestione_inps === 'Artigiani' || gestione_inps === 'Commercianti') {
          const inpsRec = await base44.asServiceRole.entities.ContributiINPS.filter({ anno, gestione: gestione_inps });
          if (inpsRec.length > 0) {
            const inps = inpsRec[0];
            const contribFisso = inps.contributo_fisso_annuo || 0;
            const minimale = inps.minimale_annuo || 0;
            const aliqInps = (inps.aliquota_percentuale || 0) + extraContribPct;
            const mass = inps.massimale_reddito || Infinity;
            const redditoInps = Math.min(reddImp, mass);
            let contribVar = 0;
            if (redditoInps > minimale) {
              contribVar = Math.round((redditoInps - minimale) * aliqInps * 100) / 100;
            }
            contribTotali = Math.round((contribFisso + contribVar) * 100) / 100;
          }
        }
        return Math.round((reddImp - irpef - contribTotali) * 100) / 100;
      }

      return 0;
    };

    // Scenario BASE
    const costiBase = costi_deducibili || 0;
    const nettoBase = await calcolaNetto(fatturato, costiBase, 0);

    // Scenario 1: -10% fatturato
    const netto1 = await calcolaNetto(Math.round(fatturato * 0.9 * 100) / 100, costiBase, 0);

    // Scenario 2: +20% costi
    const netto2 = await calcolaNetto(fatturato, Math.round(costiBase * 1.2 * 100) / 100, 0);

    // Scenario 3: +2% contributi
    const netto3 = await calcolaNetto(fatturato, costiBase, 0.02);

    const variazionePct = (nuovo) => {
      if (nettoBase === 0) return 0;
      return Math.round(((nuovo - nettoBase) / nettoBase) * 10000) / 100;
    };

    return Response.json({
      success: true,
      regime,
      fatturato,
      anno,
      netto_base: nettoBase,
      scenari: [
        {
          nome: 'Fatturato -10%',
          descrizione: `Fatturato ridotto a €${Math.round(fatturato * 0.9).toLocaleString('it-IT')}`,
          netto_finale: netto1,
          variazione_pct: variazionePct(netto1)
        },
        {
          nome: 'Costi +20%',
          descrizione: `Costi aumentati a €${Math.round(costiBase * 1.2).toLocaleString('it-IT')}`,
          netto_finale: netto2,
          variazione_pct: variazionePct(netto2)
        },
        {
          nome: 'Contributi +2%',
          descrizione: 'Aliquota contributiva aumentata di 2 punti percentuali',
          netto_finale: netto3,
          variazione_pct: variazionePct(netto3)
        }
      ]
    });

  } catch (error) {
    console.error('Errore stressTest:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});