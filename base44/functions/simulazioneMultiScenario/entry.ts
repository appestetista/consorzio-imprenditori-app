import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function calcolaIRPEF(reddito, scaglione1, scaglione2, scaglione3, soglia1, soglia2) {
  if (reddito <= 0) return 0;
  // 2026: se reddito > 200k, lo scaglione 2 resta a 0.35 (la riduzione a 0.33 non si applica)
  const aliq2 = reddito > 200000 ? 0.35 : scaglione2;
  if (reddito <= soglia1) return reddito * scaglione1;
  if (reddito <= soglia2) return soglia1 * scaglione1 + (reddito - soglia1) * aliq2;
  return soglia1 * scaglione1 + (soglia2 - soglia1) * aliq2 + (reddito - soglia2) * scaglione3;
}

const r2 = (n) => Math.round(n * 100) / 100;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { utile_iniziale, step_simulazione = 1000, limite_massimo_compenso, regione, categoria_irap } = await req.json();

    if (!utile_iniziale || utile_iniziale <= 0) {
      return Response.json({ error: 'utile_iniziale obbligatorio e > 0' }, { status: 400 });
    }

    const anno = 2026;

    const [fiscali, inpsRecords] = await Promise.all([
      base44.asServiceRole.entities.AliquoteFiscali.filter({ anno }),
      base44.asServiceRole.entities.ContributiINPS.filter({ anno, gestione: 'AmministratoreSRL' })
    ]);

    const get = (tipo) => {
      const rec = fiscali.find(a => a.tipo_imposta === tipo);
      if (!rec) throw new Error(`Aliquota ${tipo} non trovata per anno ${anno}`);
      return rec;
    };

    const aliqIres = get('IRES').aliquota;
    let aliqIrap = get('IRAP').aliquota; // fallback nazionale
    let irapLabel = '';
    if (regione) {
      const irapRecords = await base44.asServiceRole.entities.AliquoteIRAPRegionali.filter({ anno, regione });
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
          irapLabel = `${regione} – ${irapRecord.categoria}`;
        }
      }
    }
    const aliqDividendi = get('Dividendi').aliquota;
    const irpef1 = get('IRPEF_scaglione1');
    const irpef2 = get('IRPEF_scaglione2');
    const irpef3 = get('IRPEF_scaglione3');
    const soglia1 = irpef1.soglia_max || 28000;
    const soglia2 = irpef2.soglia_max || 50000;

    const aliqInps = inpsRecords.length > 0 ? inpsRecords[0].aliquota_percentuale : 0;
    const massimaleInps = inpsRecords.length > 0 ? (inpsRecords[0].massimale_reddito || Infinity) : Infinity;

    const maxCompenso = limite_massimo_compenso || utile_iniziale;
    const step = Math.max(step_simulazione, 100);

    const scenari = [];

    for (let compenso = 0; compenso <= maxCompenso; compenso += step) {
      const comp = Math.min(compenso, utile_iniziale);

      // Lato società
      const baseSocieta = r2(utile_iniziale - comp);
      const ires = r2(baseSocieta * aliqIres);
      const irap = r2(baseSocieta * aliqIrap);
      const tasseSocieta = r2(ires + irap);
      const utileNettoSocieta = r2(baseSocieta - ires - irap);

      // Dividendi sul residuo
      const impostaDividendi = r2(utileNettoSocieta > 0 ? utileNettoSocieta * aliqDividendi : 0);
      const dividendiNetti = r2(utileNettoSocieta > 0 ? utileNettoSocieta - impostaDividendi : 0);

      // Lato personale
      const irpef = r2(calcolaIRPEF(comp, irpef1.aliquota, irpef2.aliquota, irpef3.aliquota, soglia1, soglia2));
      const redditoInps = Math.min(comp, massimaleInps);
      const contributiInps = r2(redditoInps * aliqInps);
      const nettoCompenso = r2(comp - irpef - contributiInps);

      // Totali
      const tassePersonali = r2(irpef + impostaDividendi);
      const contributi = contributiInps;
      const tasseTotali = r2(tasseSocieta + tassePersonali + contributi);
      const nettoTotale = r2(dividendiNetti + nettoCompenso);
      const caricoFiscalePerc = utile_iniziale > 0 ? r2((tasseTotali / utile_iniziale) * 100) : 0;

      scenari.push({
        compenso: comp,
        ires,
        irap,
        tasse_societa: tasseSocieta,
        irpef,
        imposta_dividendi: impostaDividendi,
        tasse_personali: tassePersonali,
        contributi,
        tasse_totali: tasseTotali,
        netto_totale: nettoTotale,
        carico_fiscale_perc: caricoFiscalePerc,
        su_100_rimangono: r2(100 - caricoFiscalePerc)
      });
    }

    const scenariOrdinati = [...scenari].sort((a, b) => b.netto_totale - a.netto_totale);
    const migliore = scenariOrdinati[0];
    const scenarioZero = scenari.find(s => s.compenso === 0);
    const diffVsDividendi = migliore && scenarioZero
      ? r2(migliore.netto_totale - scenarioZero.netto_totale)
      : 0;

    return Response.json({
      success: true,
      utile_iniziale,
      step,
      num_scenari: scenari.length,
      aliquote_usate: {
        ires: aliqIres,
        irap: aliqIrap,
        irap_label: irapLabel || undefined,
        dividendi: aliqDividendi,
        irpef_scaglioni: [irpef1.aliquota, irpef2.aliquota, irpef3.aliquota],
        inps_gs: aliqInps,
        inps_massimale: massimaleInps
      },
      migliore: {
        compenso: migliore.compenso,
        netto_totale: migliore.netto_totale,
        carico_fiscale_perc: migliore.carico_fiscale_perc,
        diff_vs_dividendi_puri: diffVsDividendi
      },
      scenari
    });

  } catch (error) {
    console.error('Errore simulazioneMultiScenario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});