/**
 * Genera il riepilogo dati analisi da allegare al messaggio consulente EXPORT
 */
export function buildExportSummary({ confirmedHS, tradeData, tradeMetrics, analysisResult, exportForm, MERCATI_TARGET }) {
  const lines = [];
  lines.push('═══════════════════════════════════');
  lines.push('📊 RIEPILOGO ANALISI EXPORT (allegato automatico)');
  lines.push('═══════════════════════════════════');

  // Codice HS
  if (confirmedHS) {
    lines.push(`\n📦 CODICE HS CONFERMATO: ${confirmedHS.hs_code}`);
    lines.push(`Descrizione: ${confirmedHS.descrizione_ufficiale}`);
  }

  // Profilo azienda
  lines.push('\n🏢 PROFILO AZIENDA:');
  lines.push(`- Settore: ${exportForm.settore}`);
  lines.push(`- Prodotto: ${exportForm.prodotto}`);
  if (exportForm.fatturato_annuo) lines.push(`- Fatturato: ${exportForm.fatturato_annuo}`);
  if (exportForm.esperienza_export) lines.push(`- Esperienza export: ${exportForm.esperienza_export}`);
  if (exportForm.certificazioni) lines.push(`- Certificazioni: ${exportForm.certificazioni}`);

  // Mercati analizzati
  const mercatiNomi = exportForm.mercati_interesse.map(code => {
    const m = MERCATI_TARGET.find(mt => mt.code === code);
    return m ? `${m.flag} ${m.name}` : code;
  });
  lines.push(`\n🌍 MERCATI ANALIZZATI: ${mercatiNomi.join(', ')}`);

  // Dataset fonti
  lines.push('\n📚 FONTE DATI:');
  lines.push('- UN Comtrade (comtradeplus.un.org)');
  lines.push('- Eurostat Comext (ec.europa.eu/eurostat)');
  lines.push('- TARIC (ec.europa.eu/taxation_customs)');
  if (tradeData?.data_retrieval_date) {
    lines.push(`- Data recupero: ${tradeData.data_retrieval_date}`);
  }
  if (tradeMetrics?.tasso_cambio) {
    lines.push(`- Tasso cambio: 1 EUR = ${tradeMetrics.tasso_cambio.tasso} USD (${tradeMetrics.tasso_cambio.fonte}, ${tradeMetrics.tasso_cambio.anno})`);
  }

  // Anomalie
  if (tradeMetrics?.anomalie_presenti) {
    lines.push('\n⚠️ ANOMALIE DATASET:');
    tradeMetrics.anomalie.forEach(a => lines.push(`- ${a}`));
  }

  // Ranking mercati
  if (analysisResult?.classifica_mercati?.length > 0) {
    lines.push('\n🎯 RANKING MERCATI:');
    analysisResult.classifica_mercati.forEach(m => {
      lines.push(`${m.posizione}. ${m.paese} — ${m.motivazione}`);
    });
  } else if (analysisResult?.mercati_prioritari?.length > 0) {
    lines.push(`\n🎯 MERCATI PRIORITARI: ${analysisResult.mercati_prioritari.join(', ')}`);
  }

  // Readiness
  if (analysisResult?.readiness_score != null) {
    lines.push(`\n📈 EXPORT READINESS: ${analysisResult.readiness_score}/10`);
    if (analysisResult.readiness_commento) lines.push(analysisResult.readiness_commento);
  }

  // Metriche per mercato
  if (tradeMetrics?.metriche?.length > 0) {
    lines.push('\n📊 METRICHE CALCOLATE PER MERCATO:');
    tradeMetrics.metriche.forEach(m => {
      const parts = [`${m.paese_nome}`];
      if (m.import_totale_eur) parts.push(`Import tot: €${m.import_totale_eur.toLocaleString('it-IT')}`);
      if (m.export_italia_eur) parts.push(`Export ITA: €${m.export_italia_eur.toLocaleString('it-IT')}`);
      if (m.cagr) parts.push(`CAGR: ${m.cagr}%`);
      if (m.crescita_3_anni) parts.push(`Crescita 3a: ${m.crescita_3_anni}%`);
      if (m.volatilita) parts.push(`Volatilità: ${m.volatilita}%`);
      if (!m.dati_completi) parts.push('⚠ dati parziali');
      lines.push(`- ${parts.join(' | ')}`);
    });
  }

  // Dati non disponibili
  if (tradeData?.dati_non_disponibili?.length > 0) {
    lines.push('\n⚠ DATI NON DISPONIBILI:');
    tradeData.dati_non_disponibili.forEach(d => lines.push(`- ${d}`));
  }

  lines.push('\n═══════════════════════════════════');
  lines.push('Analisi basata esclusivamente su dati ufficiali.');

  return lines.join('\n');
}

/**
 * Genera il riepilogo dati analisi da allegare al messaggio consulente IMPORT
 */
export function buildImportSummary({ confirmedHS, importRawData, importLandedCost, importResult, importForm }) {
  const lines = [];
  lines.push('═══════════════════════════════════');
  lines.push('📊 RIEPILOGO ANALISI IMPORT (allegato automatico)');
  lines.push('═══════════════════════════════════');

  // Codice HS
  if (confirmedHS) {
    lines.push(`\n📦 CODICE HS CONFERMATO: ${confirmedHS.hs_code}`);
    lines.push(`Descrizione: ${confirmedHS.descrizione_ufficiale}`);
  }

  // Richiesta utente
  lines.push('\n📋 DETTAGLI RICHIESTA:');
  lines.push(`- Tipo: ${importForm.tipo_richiesta === 'produzione_custom' ? 'Produzione su misura' : 'Prodotto esistente'}`);
  lines.push(`- Prodotto: ${importForm.descrizione_prodotto}`);
  lines.push(`- Quantità: ${importForm.quantita}`);
  if (importForm.frequenza) lines.push(`- Frequenza: ${importForm.frequenza}`);
  if (importForm.budget) lines.push(`- Budget: ${importForm.budget}`);
  if (importForm.tempo_attesa) lines.push(`- Tempo attesa max: ${importForm.tempo_attesa}`);
  if (importForm.esperienza_import) lines.push(`- Esperienza import: ${importForm.esperienza_import}`);
  if (importForm.requisiti) lines.push(`- Requisiti: ${importForm.requisiti}`);

  // Fonti
  lines.push('\n📚 FONTE DATI:');
  if (importRawData?.taric?.fonte) lines.push(`- ${importRawData.taric.fonte}`);
  if (importRawData?.flussi_comtrade?.fonte) lines.push(`- ${importRawData.flussi_comtrade.fonte}`);
  if (importRawData?.iva?.base_normativa) lines.push(`- ${importRawData.iva.base_normativa}`);
  if (importLandedCost?.tasso_cambio) {
    lines.push(`- Tasso cambio: 1 EUR = ${importLandedCost.tasso_cambio.tasso} USD (${importLandedCost.tasso_cambio.fonte}, ${importLandedCost.tasso_cambio.anno})`);
  }

  // Dati TARIC
  const taric = importRawData?.taric;
  if (taric) {
    lines.push('\n🏛️ DATI TARIC (Commissione Europea):');
    lines.push(`- Dazio MFN: ${taric.dazio_mfn_percentuale || 'N/D'}%`);
    lines.push(`- Anti-dumping: ${taric.anti_dumping_percentuale || 'Nessuno'}${taric.anti_dumping_regolamento ? ' (' + taric.anti_dumping_regolamento + ')' : ''}`);
    lines.push(`- Misure compensative: ${taric.misure_compensative_percentuale || 'Nessuna'}${taric.misure_compensative_regolamento ? ' (' + taric.misure_compensative_regolamento + ')' : ''}`);
    if (taric.restrizioni?.length > 0) lines.push(`- Restrizioni: ${taric.restrizioni.join(', ')}`);
    if (taric.licenze_richieste && taric.licenze_richieste !== 'null') lines.push(`- Licenze richieste: ${taric.licenze_richieste}`);
  }

  // Livello Rischio
  if (importLandedCost?.livello_rischio) {
    const rischioLabel = { alto: 'ALTO', medio: 'MEDIO', basso: 'BASSO' };
    lines.push(`\n⚠️ LIVELLO RISCHIO IMPORT: ${rischioLabel[importLandedCost.livello_rischio] || importLandedCost.livello_rischio}`);
    if (importLandedCost.dettagli_rischio?.length > 0) {
      importLandedCost.dettagli_rischio.forEach(r => lines.push(`- ${r}`));
    }
  }

  // Simulazione Landed Cost
  if (importLandedCost?.calcolo_possibile && importLandedCost.esempio_calcolo) {
    const calc = importLandedCost.esempio_calcolo;
    lines.push('\n💰 SIMULAZIONE LANDED COST (su €10.000 FOB):');
    lines.push(`- Dazio: €${calc.dazio} (${importLandedCost.dazio_totale_perc}%)`);
    lines.push(`- Base IVA: €${calc.base_imponibile_iva}`);
    lines.push(`- IVA: €${calc.iva} (${importLandedCost.iva_perc}%)`);
    lines.push(`- Sdoganamento: ~€${calc.sdoganamento}`);
    lines.push(`- TOTALE (escluso trasporto): €${calc.totale_senza_trasporto}`);
  } else {
    lines.push('\n💰 LANDED COST: Non calcolabile — dati insufficienti');
  }

  // Flussi commerciali
  const flussi = importRawData?.flussi_comtrade;
  if (flussi?.import_italia_da_cina_usd) {
    lines.push('\n📊 FLUSSI COMMERCIALI CN→IT:');
    const eurVal = importLandedCost?.flussi_convertiti_eur?.import_italia_da_cina_eur;
    lines.push(`- Import ITA da CN: ${eurVal ? '€' + eurVal.toLocaleString('it-IT') + ' (' + flussi.import_italia_da_cina_usd + ' USD)' : flussi.import_italia_da_cina_usd} (${flussi.anno || 'N/D'})`);
  }

  // Anomalie
  if (importLandedCost?.anomalie_presenti) {
    lines.push('\n⚠️ ANOMALIE DATASET:');
    importLandedCost.anomalie.forEach(a => lines.push(`- ${a}`));
  }

  // Punteggio AI
  if (importResult?.punteggio_fattibilita != null) {
    lines.push(`\n📈 PUNTEGGIO FATTIBILITÀ: ${importResult.punteggio_fattibilita}/10`);
    lines.push(`Consigliato: ${importResult.consigliato ? 'SÌ' : 'NO'}`);
  }

  // Dati non disponibili
  if (importRawData?.dati_non_disponibili?.length > 0) {
    lines.push('\n⚠ DATI NON DISPONIBILI:');
    importRawData.dati_non_disponibili.forEach(d => lines.push(`- ${d}`));
  }

  lines.push('\n═══════════════════════════════════');
  lines.push('Analisi basata esclusivamente su dati ufficiali.');

  return lines.join('\n');
}